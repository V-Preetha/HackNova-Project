from __future__ import annotations

import math
from typing import Any


def _pct(x01: float) -> float:
    x01 = float(x01)
    if math.isnan(x01) or math.isinf(x01):
        x01 = 0.0
    return max(0.0, min(100.0, x01 * 100.0))


def _level_3(x01: float, *, low: float, high: float) -> str:
    if x01 < low:
        return "LOW"
    if x01 < high:
        return "MODERATE"
    return "HIGH"


def confidence_block(conf01: float) -> dict[str, Any]:
    p = _pct(conf01)
    level = _level_3(conf01, low=0.55, high=0.80)
    if level == "HIGH":
        summary = "Model confidence is high."
        explanation = "The model assigns a strong probability to the top class compared to alternatives."
        implication = "This supports the prediction, but reliability also depends on stability and input integrity."
    elif level == "MODERATE":
        summary = "Model confidence is moderate."
        explanation = "The model leans toward the top class, but competing patterns may still be present."
        implication = "Use the heatmap and stability checks to judge whether this is reliable."
    else:
        summary = "Model confidence is low."
        explanation = "The model does not strongly favor one class; multiple alternatives may look similar."
        implication = "Treat this as uncertain and prioritize clinical review."
    return {"value": f"{p:.1f}%", "level": level, "summary": summary, "explanation": explanation, "implication": implication}


def entropy_block(entropy: float, uncertainty_level: str) -> dict[str, Any]:
    ul = str(uncertainty_level or "").upper()
    if ul not in {"LOW", "MEDIUM", "HIGH"}:
        ul = "MEDIUM"
    if ul == "LOW":
        summary = "Uncertainty is low."
        explanation = "The probability mass is concentrated in a single class."
        implication = "This supports a clear decision boundary for the model."
    elif ul == "MEDIUM":
        summary = "Uncertainty is moderate."
        explanation = "The model favors one class but keeps noticeable probability on alternatives."
        implication = "Interpret alongside stability and explainability before drawing conclusions."
    else:
        summary = "Uncertainty is high."
        explanation = "Probability is spread across multiple classes rather than a single dominant explanation."
        implication = "This output is less reliable and should be treated cautiously."
    return {
        "value": float(entropy),
        "level": ul,
        "summary": summary,
        "explanation": explanation,
        "implication": implication,
    }


def class_probability_block(class_probabilities: dict[str, float], *, top_k: int = 4) -> dict[str, Any]:
    items = sorted(((k, float(v)) for k, v in class_probabilities.items()), key=lambda kv: kv[1], reverse=True)
    if not items:
        return {
            "dominant_class": None,
            "competing_classes": [],
            "summary": "No probability distribution available.",
            "explanation": "The model did not return class probabilities for this inference.",
            "implication": "Confidence and uncertainty cannot be interpreted without the full distribution.",
        }

    dominant = items[0]
    competing = items[1 : max(1, int(top_k))]
    dominance_gap = dominant[1] - (competing[0][1] if competing else 0.0)
    dominance_level = _level_3(dominance_gap, low=0.10, high=0.30)

    if dominance_level == "HIGH":
        summary = f"Strong dominance for {dominant[0]}."
        explanation = "The top class clearly exceeds the next alternatives."
        implication = "This typically aligns with clearer patterns, but still validate with stability and heatmap."
    elif dominance_level == "MODERATE":
        summary = f"Moderate dominance for {dominant[0]} with competing alternatives."
        explanation = "Other classes retain non-trivial probability, suggesting partial overlap in patterns."
        implication = "This is a plausible prediction but should be interpreted with caution."
    else:
        summary = f"Weak dominance for {dominant[0]} (competition is close)."
        explanation = "Several classes have similar probability, indicating ambiguous evidence."
        implication = "Do not over-trust this single prediction; clinical review is recommended."

    comp_list = [{"class": k, "value": f"{_pct(v):.1f}%"} for k, v in competing]
    return {
        "dominant_class": {"class": dominant[0], "value": f"{_pct(dominant[1]):.1f}%"},
        "competing_classes": comp_list,
        "level": dominance_level,
        "summary": summary,
        "explanation": explanation,
        "implication": implication,
    }


def stability_block(stability_score: float, stability_tests: list[dict[str, Any]]) -> dict[str, Any]:
    s = float(stability_score)
    level = _level_3(s, low=0.70, high=0.88)
    if level == "HIGH":
        summary = "Model is stable under small input variations."
        explanation = "Perturbation tests produced only minor confidence changes."
        implication = "This increases reliability: the decision is less sensitive to small noise/rotation/brightness shifts."
    elif level == "MODERATE":
        summary = "Model shows moderate stability."
        explanation = "Some perturbations meaningfully changed confidence, but the decision remained fairly consistent."
        implication = "Interpret with care; borderline cases may flip under slight input changes."
    else:
        summary = "Model is unstable under small input variations."
        explanation = "Perturbations caused large confidence shifts, suggesting brittle decision-making."
        implication = "Reliability is reduced; treat this output as high-risk without additional validation."

    # Summarize tests without raw dumps
    test_summaries: list[dict[str, Any]] = []
    for t in stability_tests[:10]:
        name = str(t.get("test") or "").replace("_", " ").title()
        delta = float(t.get("confidence_change") or 0.0)
        test_summaries.append(
            {
                "test": name,
                "impact": _level_3(abs(delta), low=0.01, high=0.05),
                "summary": f"Confidence changed by {delta*100:.2f}%.",
            }
        )

    return {
        "value": f"{s:.3f}",
        "level": level,
        "summary": summary,
        "explanation": explanation,
        "implication": implication,
        "tests": test_summaries,
    }


def tampering_block(adversarial_score: float, tampering_flag: bool) -> dict[str, Any]:
    a = float(adversarial_score)
    status = "WARNING" if bool(tampering_flag) else "SAFE"
    if status == "SAFE":
        summary = "No strong signs of adversarial or tampering artifacts."
        explanation = "Integrity checks did not detect unusual high-frequency artifacts or extreme sensitivity patterns."
        implication = "Input appears reasonably clean for interpretation (still follow standard clinical QA)."
    else:
        summary = "Possible tampering or adversarial artifacts detected."
        explanation = "The input shows signals consistent with manipulation or abnormal artifact patterns."
        implication = "Do not rely on this output without verifying image provenance and quality."
    return {"value": f"{a:.3f}", "status": status, "summary": summary, "explanation": explanation, "implication": implication}


def trust_block(trust_score: int, risk_level: str, *, confidence_level: str, stability_level: str, uncertainty_level: str) -> dict[str, Any]:
    ts = int(trust_score)
    rl = str(risk_level or "").upper()
    if rl not in {"LOW", "MEDIUM", "HIGH"}:
        rl = "MEDIUM"

    level = "HIGH" if ts >= 75 else "MODERATE" if ts >= 50 else "LOW"
    summary = f"Overall reliability is {level.lower()}."
    explanation = (
        f"Trust combines model confidence ({confidence_level}), stability ({stability_level}), and uncertainty ({uncertainty_level})."
    )
    if level == "HIGH":
        recommendation = "This output can be used as supportive evidence, alongside clinical judgment."
    elif level == "MODERATE":
        recommendation = "Use with caution and cross-check with additional clinical context."
    else:
        recommendation = "Treat as uncertain; prioritize human review and/or additional testing."

    return {
        "value": ts,
        "level": level,
        "risk_level": rl,
        "summary": summary,
        "explanation": explanation,
        "recommendation": recommendation,
    }


def explainability_block(*, focus_regions: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Turn CAM-derived focus boxes into human-readable spatial hints.
    """
    if not focus_regions:
        return {
            "summary": "No explainability focus regions available.",
            "explanation": "The system could not extract stable high-activation regions from the heatmap.",
            "implication": "Interpretability is limited for this case; rely more on stability and uncertainty signals.",
            "regions": [],
        }

    def quadrant(x: float, y: float) -> str:
        horiz = "left" if x < 0.45 else "right" if x > 0.55 else "center"
        vert = "upper" if y < 0.45 else "lower" if y > 0.55 else "middle"
        if vert == "middle" and horiz == "center":
            return "central region"
        return f"{vert} {horiz} region".replace("middle ", "").replace(" center", "central")

    regions_ui: list[dict[str, Any]] = []
    for r in focus_regions[:3]:
        peak = r.get("peak_norm") or {}
        x = float(peak.get("x") or 0.5)
        y = float(peak.get("y") or 0.5)
        imp = float(r.get("importance") or 0.0)
        regions_ui.append(
            {
                "region": quadrant(x, y),
                "importance": {"value": f"{_pct(imp):.1f}%", "level": _level_3(imp, low=0.45, high=0.75)},
                "summary": "High model attention detected in this area.",
            }
        )

    top = regions_ui[0]
    summary = f"Model attention is concentrated in the {top['region']}."
    explanation = "The heatmap highlights where internal features most influenced the predicted class."
    implication = "This suggests the model relied on patterns in these highlighted zones when forming its decision."

    return {"summary": summary, "explanation": explanation, "implication": implication, "regions": regions_ui}


def decision_trace_block(steps: list[str]) -> list[dict[str, str]]:
    descriptions = {
        "Input received": "The image was received and validated as a readable medical scan.",
        "Preprocessing completed": "The scan was normalized and resized to the model’s expected input format.",
        "Model inference executed": "The neural network extracted features and produced class probabilities.",
        "Grad-CAM generated": "An explanation heatmap was computed to show influential image regions.",
        "Stability tests executed": "The same image was re-tested under small perturbations to measure robustness.",
        "Adversarial check executed": "Integrity signals were analyzed to detect possible manipulation/artifacts.",
        "Trust score computed": "Confidence, stability, and uncertainty signals were combined into a reliability score.",
        "Decision logged": "An immutable record was stored for audit and replay.",
    }
    out: list[dict[str, str]] = []
    for s in steps:
        title = str(s)
        out.append({"step": title, "description": descriptions.get(title, "Step executed as part of the analysis pipeline.")})
    return out


def introspection_summary(introspection: dict[str, Any]) -> dict[str, Any]:
    complexity_level = str(introspection.get("complexity_level") or "").upper()
    complexity_score = float(introspection.get("complexity_score") or 0.0)
    grad = introspection.get("gradient_sensitivity") or {}
    grad_mean = float(grad.get("grad_mean_abs") or 0.0)
    grad_level = _level_3(grad_mean, low=0.0006, high=0.0014)

    layer_behavior = "The model builds from low-level textures to higher-level disease patterns through deeper layers."
    if complexity_level == "LOW":
        complexity_text = "The decision path looks relatively simple, suggesting a clearer pattern match."
    elif complexity_level == "MODERATE":
        complexity_text = "The decision required multiple feature refinements, suggesting moderate complexity."
    else:
        complexity_text = "The decision required complex feature refinement, suggesting ambiguous or competing patterns."

    instability_text = "Sensitivity signals are within a typical range for this model."
    if grad_level == "HIGH":
        instability_text = "The model appears sensitive to small input changes at the pixel level, which can reduce reliability on borderline cases."

    return {
        "layer_behavior_summary": layer_behavior,
        "sensitivity_summary": {
            "level": grad_level,
            "summary": "Input sensitivity is " + ("high." if grad_level == "HIGH" else "moderate." if grad_level == "MODERATE" else "low."),
            "explanation": instability_text,
        },
        "complexity": {
            "value": f"{complexity_score:.3f}",
            "level": complexity_level if complexity_level in {"LOW", "MODERATE", "HIGH"} else "MODERATE",
            "summary": complexity_text,
        },
    }

