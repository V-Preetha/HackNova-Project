from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from PIL import Image


@dataclass(frozen=True)
class AdversarialResult:
    adversarial_score: float  # 0..1
    tampering_flag: bool
    signals: dict[str, float]


def _laplacian_energy(gray01: np.ndarray) -> float:
    # Simple 2D Laplacian kernel
    k = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float32)
    g = gray01.astype(np.float32)
    padded = np.pad(g, ((1, 1), (1, 1)), mode="reflect")
    out = (
        k[0, 0] * padded[:-2, :-2]
        + k[0, 1] * padded[:-2, 1:-1]
        + k[0, 2] * padded[:-2, 2:]
        + k[1, 0] * padded[1:-1, :-2]
        + k[1, 1] * padded[1:-1, 1:-1]
        + k[1, 2] * padded[1:-1, 2:]
        + k[2, 0] * padded[2:, :-2]
        + k[2, 1] * padded[2:, 1:-1]
        + k[2, 2] * padded[2:, 2:]
    )
    return float(np.mean(np.abs(out)))


def analyze_tampering(
    *,
    image_rgb: Image.Image,
    stability_variance: float,
    baseline_confidence: float,
) -> AdversarialResult:
    img = image_rgb.convert("RGB")
    arr = np.array(img).astype(np.float32) / 255.0
    gray = (0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]).astype(np.float32)

    lap_e = _laplacian_energy(gray)
    sat_low = float(np.mean(gray < 0.02))
    sat_high = float(np.mean(gray > 0.98))
    sat = sat_low + sat_high

    # Normalize heuristic signals into 0..1-ish ranges
    lap_n = max(0.0, min(1.0, (lap_e - 0.01) / 0.08))
    sat_n = max(0.0, min(1.0, sat / 0.25))
    var_n = max(0.0, min(1.0, stability_variance / 0.04))
    conf_n = max(0.0, min(1.0, baseline_confidence))

    # More suspicious when high-frequency energy/saturation/variance are high,
    # especially if confidence is also high (classic overconfident brittle output).
    score = 0.40 * lap_n + 0.25 * sat_n + 0.25 * var_n + 0.10 * conf_n
    score = max(0.0, min(1.0, float(score)))

    tampering_flag = score > 0.62 or (var_n > 0.7 and conf_n > 0.85)

    return AdversarialResult(
        adversarial_score=score,
        tampering_flag=bool(tampering_flag),
        signals={
            "laplacian_energy": float(lap_e),
            "saturation_ratio": float(sat),
            "variance_norm": float(var_n),
        },
    )

