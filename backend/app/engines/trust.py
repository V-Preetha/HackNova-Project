from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TrustResult:
    trust_score: int  # 0..100
    risk_level: str  # Low/Medium/High
    breakdown: dict[str, float]


def compute_trust(
    *,
    confidence: float,
    stability_score: float,
    adversarial_score: float,
    w_confidence: float,
    w_stability: float,
    w_adversarial: float,
) -> TrustResult:
    c = max(0.0, min(1.0, float(confidence)))
    s = max(0.0, min(1.0, float(stability_score)))
    a = max(0.0, min(1.0, float(adversarial_score)))

    # Trust rewards confidence + stability, penalizes adversarial suspicion.
    raw = w_confidence * c + w_stability * s - w_adversarial * a
    raw = max(0.0, min(1.0, raw))
    score = int(round(raw * 100))

    if score >= 75:
        risk = "Low"
    elif score >= 50:
        risk = "Medium"
    else:
        risk = "High"

    breakdown = {
        "confidence": w_confidence * c,
        "stability": w_stability * s,
        "adversarial_penalty": w_adversarial * a,
    }

    return TrustResult(trust_score=score, risk_level=risk, breakdown=breakdown)

