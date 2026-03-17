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

