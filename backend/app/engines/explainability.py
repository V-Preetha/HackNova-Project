from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import torch
import torch.nn as nn
from PIL import Image


@dataclass(frozen=True)
class HeatmapResult:
    heatmap_path: str
    overlay_path: str


def focus_regions_from_cam(
    cam_01: np.ndarray,
    *,
    top_k: int = 3,
    peak_suppression: float = 0.15,
    box_radius: float = 0.18,
) -> list[dict[str, Any]]:
    """
    Derive focus regions from the *real* activation map.
    We do not attempt anatomical naming. Regions are peak-centered boxes in normalized coordinates.
    """
    if cam_01.ndim != 2:
        cam = cam_01.squeeze()
    else:
        cam = cam_01
    cam = cam.astype(np.float32)
    h, w = cam.shape
    if h <= 1 or w <= 1:
        return []

    work = cam.copy()
    regions: list[dict[str, Any]] = []
    for i in range(max(0, int(top_k))):
        idx = int(np.argmax(work))
        y, x = divmod(idx, w)
        peak = float(work[y, x])
        if peak <= 1e-6:
            break

        # Box around peak (normalized)
        rx = max(1, int(round(box_radius * w)))
        ry = max(1, int(round(box_radius * h)))
        x0 = max(0, x - rx)
        x1 = min(w - 1, x + rx)
        y0 = max(0, y - ry)
        y1 = min(h - 1, y + ry)

        patch = cam[y0 : y1 + 1, x0 : x1 + 1]
        importance = float(np.mean(patch)) if patch.size else peak

        regions.append(
            {
                "region": f"focus_{i+1}",
                "importance": float(max(0.0, min(1.0, importance))),
                "bbox_norm": {
                    "x0": float(x0 / (w - 1)),
                    "y0": float(y0 / (h - 1)),
                    "x1": float(x1 / (w - 1)),
                    "y1": float(y1 / (h - 1)),
                },
                "peak_norm": {"x": float(x / (w - 1)), "y": float(y / (h - 1)), "value": peak},
            }
        )

        # Suppress around peak so next region is different
        sx = max(1, int(round(peak_suppression * w)))
        sy = max(1, int(round(peak_suppression * h)))
        sx0 = max(0, x - sx)
        sx1 = min(w - 1, x + sx)
        sy0 = max(0, y - sy)
        sy1 = min(h - 1, y + sy)
        work[sy0 : sy1 + 1, sx0 : sx1 + 1] = 0.0

    return regions


def _find_last_conv(model: nn.Module) -> nn.Module:
    last = None
    for m in model.modules():
        if isinstance(m, nn.Conv2d):
            last = m
    if last is None:
        raise ValueError("No Conv2d layer found for Grad-CAM.")
    return last


class GradCAM:
    def __init__(self, model: nn.Module, target_layer: nn.Module | None = None):
        self.model = model
        self.target_layer = target_layer or _find_last_conv(model)
        self._acts: torch.Tensor | None = None
        self._grads: torch.Tensor | None = None
        self._hooks: list[Any] = []
        self._register()

    def _register(self) -> None:
        def fwd_hook(_m, _inp, out):
            self._acts = out

        def bwd_hook(_m, _gin, gout):
            self._grads = gout[0]

        self._hooks.append(self.target_layer.register_forward_hook(fwd_hook))
        self._hooks.append(self.target_layer.register_full_backward_hook(bwd_hook))

    def close(self) -> None:
        for h in self._hooks:
            try:
                h.remove()
            except Exception:
                pass
        self._hooks = []

    def __call__(self, x: torch.Tensor, class_idx: int) -> np.ndarray:
        self.model.zero_grad(set_to_none=True)
        logits = self.model(x)
        if isinstance(logits, (tuple, list)):
            logits = logits[0]
        score = logits[:, class_idx].sum()
        score.backward(retain_graph=False)

        if self._acts is None or self._grads is None:
            raise RuntimeError("Grad-CAM hooks did not capture activations/gradients.")

        acts = self._acts.detach()
        grads = self._grads.detach()

        weights = grads.mean(dim=(2, 3), keepdim=True)  # (N,C,1,1)
        cam = (weights * acts).sum(dim=1, keepdim=True)  # (N,1,H,W)
        cam = torch.relu(cam)
        cam = cam.squeeze(0).squeeze(0)
        cam -= cam.min()
        cam /= (cam.max() + 1e-8)
        return cam.cpu().numpy()


def _to_uint8(img: np.ndarray) -> np.ndarray:
    img = np.clip(img, 0.0, 1.0)
    return (img * 255.0).astype(np.uint8)


def write_heatmap_overlay(
    *,
    original_rgb: Image.Image,
    cam_01: np.ndarray,
    out_dir: Path,
    stem: str,
    alpha: float = 0.35,
) -> HeatmapResult:
    out_dir.mkdir(parents=True, exist_ok=True)

    # Resize cam to original image size
    cam_img = Image.fromarray(_to_uint8(cam_01), mode="L").resize(original_rgb.size, resample=Image.BILINEAR)
    cam_arr = np.array(cam_img).astype(np.float32) / 255.0

    # Simple "jet-like" colormap without requiring cv2
    heat = np.stack(
        [
            np.clip(1.5 * (cam_arr - 0.33), 0, 1),  # R
            np.clip(1.5 - np.abs(3.0 * cam_arr - 1.5), 0, 1),  # G
            np.clip(1.5 * (0.66 - cam_arr), 0, 1),  # B
        ],
        axis=-1,
    )

    orig = np.array(original_rgb.convert("RGB")).astype(np.float32) / 255.0
    overlay = (1 - alpha) * orig + alpha * heat

    heatmap_path = out_dir / f"{stem}_heatmap.png"
    overlay_path = out_dir / f"{stem}_overlay.png"

    Image.fromarray(_to_uint8(heat)).save(heatmap_path)
    Image.fromarray(_to_uint8(overlay)).save(overlay_path)

    return HeatmapResult(heatmap_path=str(heatmap_path), overlay_path=str(overlay_path))

