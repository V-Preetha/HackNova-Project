from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import torch
import torch.nn as nn


@dataclass(frozen=True)
class IntrospectionResult:
    layer_confidence: list[float]
    activation_strength: list[float]
    feature_sensitivity: list[float]
    internal_instability: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "layer_confidence": self.layer_confidence,
            "activation_strength": self.activation_strength,
            "feature_sensitivity": self.feature_sensitivity,
            "internal_instability": self.internal_instability,
        }


def _pick_modules(model: nn.Module, max_layers: int) -> list[nn.Module]:
    picked: list[nn.Module] = []
    for m in model.modules():
        if isinstance(m, (nn.Conv2d, nn.Linear)):
            picked.append(m)
    if not picked:
        return []
    # Take a spread: early, mid, late
    idxs = np.linspace(0, len(picked) - 1, num=min(max_layers, len(picked))).astype(int).tolist()
    return [picked[i] for i in idxs]


def _pick_named_modules(model: nn.Module, max_layers: int) -> list[tuple[str, nn.Module]]:
    picked: list[tuple[str, nn.Module]] = []
    for name, m in model.named_modules():
        if isinstance(m, (nn.Conv2d, nn.Linear)):
            picked.append((name, m))
    if not picked:
        return []
    idxs = np.linspace(0, len(picked) - 1, num=min(max_layers, len(picked))).astype(int).tolist()
    return [picked[i] for i in idxs]


@torch.inference_mode()
def introspect_activations(model: nn.Module, x: torch.Tensor, *, max_layers: int = 6) -> list[float]:
    mods = _pick_modules(model, max_layers)
    if not mods:
        return []

    strengths: list[float] = []
    handles = []

    def make_hook():
        def hook(_m, _inp, out):
            try:
                t = out
                if isinstance(t, (tuple, list)):
                    t = t[0]
                if not torch.is_tensor(t):
                    strengths.append(0.0)
                    return
                strengths.append(float(t.detach().abs().mean().cpu().item()))
            except Exception:
                strengths.append(0.0)

        return hook

    for m in mods:
        handles.append(m.register_forward_hook(make_hook()))

    try:
        _ = model(x)
    finally:
        for h in handles:
            try:
                h.remove()
            except Exception:
                pass

    return strengths[: len(mods)]


@torch.inference_mode()
def introspect_named_layer_activations(model: nn.Module, x: torch.Tensor, *, max_layers: int = 8) -> list[dict[str, Any]]:
    mods = _pick_named_modules(model, max_layers)
    if not mods:
        return []

    out: list[dict[str, Any]] = []
    handles = []

    def make_hook(layer_name: str):
        def hook(_m, _inp, out_t):
            t = out_t[0] if isinstance(out_t, (tuple, list)) else out_t
            if not torch.is_tensor(t):
                out.append({"layer": layer_name, "activation": 0.0})
                return
            out.append({"layer": layer_name, "activation": float(t.detach().abs().mean().cpu().item())})

        return hook

    for name, m in mods:
        handles.append(m.register_forward_hook(make_hook(name)))

    try:
        _ = model(x)
    finally:
        for h in handles:
            try:
                h.remove()
            except Exception:
                pass

    return out[: len(mods)]


def input_gradient_metrics(model: nn.Module, x: torch.Tensor, class_idx: int) -> dict[str, float]:
    """
    Real sensitivity signal: gradient of predicted-class score w.r.t. input.
    Returns mean/std of absolute gradient.
    """
    model.eval()
    x2 = x.detach().clone().requires_grad_(True)
    logits = model(x2)
    if isinstance(logits, (tuple, list)):
        logits = logits[0]
    score = logits[:, int(class_idx)].sum()
    score.backward()
    g = x2.grad
    if g is None:
        return {"grad_mean_abs": 0.0, "grad_std_abs": 0.0}
    g_abs = g.detach().abs()
    return {
        "grad_mean_abs": float(g_abs.mean().cpu().item()),
        "grad_std_abs": float(g_abs.std().cpu().item()),
    }


def decision_complexity(
    *,
    entropy: float,
    num_classes: int,
    probs: list[float],
    grad_std_abs: float,
) -> dict[str, Any]:
    if num_classes <= 1:
        return {"complexity_score": 0.0, "level": "LOW"}

    max_ent = float(np.log(float(num_classes)))
    ent_n = 0.0 if max_ent <= 0 else float(max(0.0, min(1.0, entropy / max_ent)))

    p = np.array(probs, dtype=np.float32)
    pmax = float(p.max()) if p.size else 0.0
    competing = int(np.sum(p >= (0.5 * pmax))) - 1
    competing_n = float(max(0.0, min(1.0, competing / 3.0)))

    grad_n = float(1.0 - np.exp(-250.0 * float(max(0.0, grad_std_abs))))
    grad_n = float(max(0.0, min(1.0, grad_n)))

    score = 0.50 * ent_n + 0.30 * competing_n + 0.20 * grad_n
    score = float(max(0.0, min(1.0, score)))

    if score < 0.34:
        level = "LOW"
    elif score < 0.67:
        level = "MODERATE"
    else:
        level = "HIGH"

    return {"complexity_score": score, "level": level}


def build_introspection(
    *,
    confidence_evolution: list[float],
    activation_strength: list[float],
    stability_variance: float,
) -> IntrospectionResult:
    layer_confidence = [float(x) for x in confidence_evolution]
    activation_strength = [float(x) for x in activation_strength]

    # Feature sensitivity proxy: absolute differences between consecutive confidence points.
    if len(layer_confidence) >= 2:
        diffs = np.abs(np.diff(np.array(layer_confidence, dtype=np.float32))).tolist()
        feature_sensitivity = [float(x) for x in diffs]
    else:
        feature_sensitivity = []

    return IntrospectionResult(
        layer_confidence=layer_confidence,
        activation_strength=activation_strength,
        feature_sensitivity=feature_sensitivity,
        internal_instability=float(stability_variance),
    )

