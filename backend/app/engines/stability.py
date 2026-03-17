from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageEnhance


@dataclass(frozen=True)
class StabilityResult:
    stability_score: float
    prediction_variance: float
    instability_flag: bool
    baseline_prob: float
    perturbed_probs: list[float]


def _add_gaussian_noise(img: Image.Image, std: float) -> Image.Image:
    arr = np.array(img).astype(np.float32) / 255.0
    noise = np.random.normal(0.0, std, size=arr.shape).astype(np.float32)
    out = np.clip(arr + noise, 0.0, 1.0)
    return Image.fromarray((out * 255.0).astype(np.uint8))


def _rotate(img: Image.Image, degrees: float) -> Image.Image:
    return img.rotate(degrees, resample=Image.BILINEAR, expand=False)


def _brightness(img: Image.Image, delta: float) -> Image.Image:
    # factor in [1-delta, 1+delta]
    factor = float(1.0 + np.random.uniform(-delta, delta))
    return ImageEnhance.Brightness(img).enhance(factor)


def stability_score_from_probs(probs: list[float]) -> tuple[float, float, bool]:
    if len(probs) <= 1:
        return 1.0, 0.0, False
    var = float(np.var(np.array(probs, dtype=np.float32)))
    # Map variance to [0..1] stability (heuristic)
    score = float(np.exp(-12.0 * var))
    score = max(0.0, min(1.0, score))
    instability_flag = score < 0.65 or var > 0.02
    return score, var, instability_flag


def build_perturbations(
    img: Image.Image,
    *,
    runs: int,
    noise_std: float,
    rotation_degrees: float,
    brightness_delta: float,
) -> list[Image.Image]:
    out: list[Image.Image] = []
    for i in range(max(0, int(runs))):
        choice = i % 3
        if choice == 0:
            out.append(_add_gaussian_noise(img, noise_std))
        elif choice == 1:
            deg = float(np.random.uniform(-rotation_degrees, rotation_degrees))
            out.append(_rotate(img, deg))
        else:
            out.append(_brightness(img, brightness_delta))
    return out

