from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence

import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms
from torchvision import models


CHEXNET_LABELS_14: list[str] = [
    "Atelectasis",
    "Cardiomegaly",
    "Effusion",
    "Infiltration",
    "Mass",
    "Nodule",
    "Pneumonia",
    "Pneumothorax",
    "Consolidation",
    "Edema",
    "Emphysema",
    "Fibrosis",
    "Pleural_Thickening",
    "Hernia",
]


@dataclass(frozen=True)
class InferenceResult:
    prediction: str
    confidence: float
    logits: list[float]
    probs: list[float]


class InferenceEngine:
    def __init__(self, model_path: Path, device: torch.device):
        self.model_path = model_path
        self.device = device
        self.model = self._load_model(model_path).to(device)
        self.model.eval()

        self.preprocess = transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )

    def _load_model(self, model_path: Path) -> nn.Module:
        if not model_path.exists():
            raise ValueError(f"Model file not found at {model_path}")

        # Try TorchScript first (common for portable deployment)
        try:
            return torch.jit.load(str(model_path), map_location="cpu")
        except Exception:
            pass

        obj: Any = torch.load(str(model_path), map_location="cpu")
        if isinstance(obj, nn.Module):
            return obj

        # Common hackathon format: training checkpoint dict with `arch` + `state_dict`
        if isinstance(obj, dict) and "state_dict" in obj:
            arch = str(obj.get("arch") or "").lower()
            state_dict = obj["state_dict"]
            if not isinstance(state_dict, dict):
                raise ValueError("Checkpoint has state_dict, but it is not a dict.")

            # Strip DataParallel prefix
            cleaned = {}
            for k, v in state_dict.items():
                k2 = k[7:] if k.startswith("module.") else k
                # Some checkpoints use older naming like `norm.1` / `conv.2` inside DenseLayer.
                # Map those to torchvision's `norm1` / `conv2`.
                k2 = (
                    k2.replace(".norm.1.", ".norm1.")
                    .replace(".conv.1.", ".conv1.")
                    .replace(".norm.2.", ".norm2.")
                    .replace(".conv.2.", ".conv2.")
                )
                cleaned[k2] = v

            # This workspace model appears to be a wrapper with attribute `densenet121`
            # whose classifier outputs 14 labels.
            if "densenet121" in arch or any(k.startswith("densenet121.") for k in cleaned.keys()):
                base = models.densenet121(weights=None)
                # Replace classifier to match checkpoint output shape if needed
                out_features = 14
                # Attempt to infer out_features from checkpoint tensor
                for kk, vv in cleaned.items():
                    if kk.endswith("classifier.0.weight") and hasattr(vv, "shape"):
                        try:
                            out_features = int(vv.shape[0])
                        except Exception:
                            pass
                        break
                    if kk.endswith("classifier.weight") and hasattr(vv, "shape"):
                        try:
                            out_features = int(vv.shape[0])
                        except Exception:
                            pass
                        break

                base.classifier = nn.Sequential(nn.Linear(1024, out_features))

                class Wrapper(nn.Module):
                    def __init__(self, densenet121: nn.Module):
                        super().__init__()
                        self.densenet121 = densenet121

                    def forward(self, x):
                        return self.densenet121(x)

                model = Wrapper(base)
                missing, _unexpected = model.load_state_dict(cleaned, strict=False)
                if missing:
                    core_missing = [m for m in missing if m.startswith("densenet121.")]
                    # If still missing many core keys, fail loudly
                    if len(core_missing) > 10:
                        raise ValueError(f"Checkpoint missing model keys (sample): {core_missing[:12]}")
                return model

            raise ValueError(f"Unsupported checkpoint architecture: {arch or 'unknown'}")

        raise ValueError("Unsupported .pth format. Expected TorchScript, nn.Module, or a checkpoint with state_dict.")

    @torch.inference_mode()
    def predict(self, image: Image.Image, labels: Sequence[str] | None = None) -> InferenceResult:
        if image.mode != "RGB":
            image = image.convert("RGB")
        x = self.preprocess(image).unsqueeze(0).to(self.device)

        logits_t = self.model(x)
        if isinstance(logits_t, (tuple, list)):
            logits_t = logits_t[0]
        logits_t = logits_t.squeeze(0)

        # Handle binary / multi-class / multi-label-ish outputs
        if logits_t.ndim != 1:
            logits_t = logits_t.flatten()

        logits = logits_t.detach().float().cpu().tolist()

        if len(logits) == 1:
            # Binary logit
            prob_pos = float(torch.sigmoid(logits_t).item())
            probs = [1.0 - prob_pos, prob_pos]
            pred_idx = 1 if prob_pos >= 0.5 else 0
            default_labels = ["Negative", "Positive"]
            label_list = list(labels) if labels is not None else default_labels
            prediction = label_list[pred_idx] if pred_idx < len(label_list) else str(pred_idx)
            confidence = probs[pred_idx]
            return InferenceResult(prediction=prediction, confidence=confidence, logits=logits, probs=probs)

        # Multi-class
        probs_t = torch.softmax(logits_t, dim=0)
        probs = probs_t.detach().float().cpu().tolist()
        pred_idx = int(torch.argmax(probs_t).item())

        label_list: list[str]
        if labels is not None:
            label_list = list(labels)
        elif len(probs) == 14:
            label_list = CHEXNET_LABELS_14
        else:
            label_list = [f"class_{i}" for i in range(len(probs))]

        prediction = label_list[pred_idx] if pred_idx < len(label_list) else str(pred_idx)
        confidence = float(probs[pred_idx]) if pred_idx < len(probs) else 0.0
        confidence = max(0.0, min(1.0, confidence))
        if math.isnan(confidence):
            confidence = 0.0

        return InferenceResult(prediction=prediction, confidence=confidence, logits=logits, probs=probs)

