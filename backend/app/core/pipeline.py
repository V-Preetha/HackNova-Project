from __future__ import annotations

import hashlib
import json
from functools import lru_cache
from pathlib import Path
from typing import Any, AsyncIterator
from uuid import uuid4

import torch
from PIL import Image

from app.core.config import Settings
from app.db.db import Database
from app.engines.adversarial import analyze_tampering
from app.engines.explainability import GradCAM, write_heatmap_overlay
from app.engines.inference import InferenceEngine
from app.engines.introspection import build_introspection, introspect_activations
from app.engines.stability import build_perturbations, stability_score_from_probs
from app.engines.trust import compute_trust
from app.logging.ledger import Ledger


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sse_event(event: str, data: dict[str, Any]) -> bytes:
    payload = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n".encode("utf-8")


class MedTracePipeline:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.db = Database(settings.sqlite_path)
        self.db.init_schema(settings.project_root / "backend" / "app" / "db" / "schema.sql")
        self.ledger = Ledger(self.db)

        device = torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")
        self.device = device
        self.infer = InferenceEngine(settings.model_path, device=device)

    @classmethod
    @lru_cache(maxsize=1)
    def from_settings(cls, settings: Settings) -> "MedTracePipeline":
        return cls(settings)

    async def run(self, image_upload) -> dict[str, Any]:
        out: dict[str, Any] = {}
        async for ev in self.run_stream(image_upload):
            out = ev if ev.get("stage") == "done" else out
        if not out:
            raise ValueError("No output produced.")
        return out["result"]

    async def run_stream(self, image_upload) -> AsyncIterator[dict[str, Any]]:
        if not getattr(image_upload, "filename", ""):
            raise ValueError("Missing filename.")

        content_type = (getattr(image_upload, "content_type", "") or "").lower()
        if not content_type.startswith("image/"):
            raise ValueError("Invalid content type; expected an image.")

        data = await image_upload.read()
        if not data:
            raise ValueError("Empty file.")
        if len(data) > 12 * 1024 * 1024:
            raise ValueError("File too large (max 12MB).")

        log_id = str(uuid4())
        image_hash = sha256_hex(data)
        yield {"stage": "upload_validated", "log_id": log_id, "image_hash": image_hash}

        from io import BytesIO

        try:
            img = Image.open(BytesIO(data))
        except Exception as e:
            raise ValueError("Could not decode image.") from e

        try:
            img = img.convert("RGB")
        except Exception as e:
            raise ValueError("Could not decode image.") from e

        # Save upload for replay (can be toggled later; MVP stores it)
        self.settings.uploads_dir.mkdir(parents=True, exist_ok=True)
        upload_path = self.settings.uploads_dir / f"{log_id}.png"
        img.save(upload_path)

        yield {"stage": "preprocessed", "log_id": log_id}

        # Inference
        inf = self.infer.predict(img)
        yield {
            "stage": "predicted",
            "log_id": log_id,
            "prediction": inf.prediction,
            "confidence": inf.confidence,
        }

        # Explainability (Grad-CAM)
        # For class index: use argmax of probs if available
        class_idx = int(max(range(len(inf.probs)), key=lambda i: inf.probs[i])) if inf.probs else 0
        x = self.infer.preprocess(img).unsqueeze(0).to(self.device)
        cam = GradCAM(self.infer.model)
        try:
            cam01 = cam(x, class_idx=class_idx)
        finally:
            cam.close()

        self.settings.heatmaps_dir.mkdir(parents=True, exist_ok=True)
        hm = write_heatmap_overlay(
            original_rgb=img,
            cam_01=cam01,
            out_dir=self.settings.heatmaps_dir,
            stem=log_id,
            alpha=self.settings.gradcam_overlay_alpha,
        )

        heatmap_url = f"/static/heatmaps/{Path(hm.heatmap_path).name}"
        overlay_url = f"/static/heatmaps/{Path(hm.overlay_path).name}"
        yield {"stage": "explained", "log_id": log_id, "heatmap_url": heatmap_url, "overlay_url": overlay_url}

        # Stability (perturb + measure baseline label probability changes)
        perts = build_perturbations(
            img,
            runs=self.settings.stability_runs,
            noise_std=self.settings.noise_std,
            rotation_degrees=self.settings.rotation_degrees,
            brightness_delta=self.settings.brightness_delta,
        )

        baseline_prob = float(inf.confidence)
        pert_probs: list[float] = []
        for p in perts:
            p_inf = self.infer.predict(p, labels=None)
            # Track probability of *baseline predicted class index* if possible
            if p_inf.probs and class_idx < len(p_inf.probs):
                pert_probs.append(float(p_inf.probs[class_idx]))
            else:
                pert_probs.append(float(p_inf.confidence))

        all_probs = [baseline_prob] + pert_probs
        stability_score, pred_var, instability_flag = stability_score_from_probs(all_probs)

        yield {
            "stage": "stability_tested",
            "log_id": log_id,
            "stability_score": stability_score,
            "prediction_variance": pred_var,
            "instability_flag": instability_flag,
        }

        # Adversarial / tampering detector
        adv = analyze_tampering(image_rgb=img, stability_variance=pred_var, baseline_confidence=baseline_prob)
        yield {
            "stage": "adversarial_checked",
            "log_id": log_id,
            "adversarial_score": adv.adversarial_score,
            "tampering_flag": adv.tampering_flag,
            "adversarial_signals": adv.signals,
        }

        # Trust
        trust = compute_trust(
            confidence=baseline_prob,
            stability_score=stability_score,
            adversarial_score=adv.adversarial_score,
            w_confidence=self.settings.w_confidence,
            w_stability=self.settings.w_stability,
            w_adversarial=self.settings.w_adversarial,
        )
        yield {
            "stage": "trust_evaluated",
            "log_id": log_id,
            "trust_score": trust.trust_score,
            "risk_level": trust.risk_level,
            "trust_breakdown": trust.breakdown,
        }

        # Introspection (lightweight)
        act_strength = introspect_activations(self.infer.model, x, max_layers=6)
        introspection = build_introspection(
            confidence_evolution=all_probs,
            activation_strength=act_strength,
            stability_variance=pred_var,
        ).to_dict()

        yield {"stage": "introspected", "log_id": log_id, "introspection": introspection}

        decision_trace = [
            {"step": "Input processed"},
            {"step": "Features extracted"},
            {"step": "Prediction generated"},
            {"step": "Heatmap computed"},
            {"step": "Stability tested"},
            {"step": "Adversarial checked"},
            {"step": "Trust evaluated"},
            {"step": "Decision logged"},
        ]

        # Persist (case + ledger append)
        self.db.insert_case(
            log_id=log_id,
            image_hash=image_hash,
            image_path=str(upload_path),
            model_version=self.settings.model_version,
            prediction=inf.prediction,
            confidence=baseline_prob,
            stability_score=stability_score,
            prediction_variance=pred_var,
            instability_flag=instability_flag,
            adversarial_score=adv.adversarial_score,
            tampering_flag=adv.tampering_flag,
            trust_score=trust.trust_score,
            risk_level=trust.risk_level,
            decision_trace=decision_trace,
            introspection=introspection,
        )
        self.db.insert_artifacts(log_id=log_id, heatmap_path=hm.heatmap_path, overlay_path=hm.overlay_path)

        ledger_hash = self.ledger.append(
            {
                "log_id": log_id,
                "image_hash": image_hash,
                "prediction": inf.prediction,
                "confidence": baseline_prob,
                "trust_score": trust.trust_score,
                "risk_level": trust.risk_level,
            }
        )

        yield {"stage": "logged", "log_id": log_id, "ledger_hash": ledger_hash}

        result = {
            "prediction": inf.prediction,
            "confidence": baseline_prob,
            "trust_score": trust.trust_score,
            "risk_level": trust.risk_level,
            "stability_score": stability_score,
            "prediction_variance": pred_var,
            "instability_flag": instability_flag,
            "adversarial_score": adv.adversarial_score,
            "tampering_flag": adv.tampering_flag,
            "heatmap_url": heatmap_url,
            "overlay_url": overlay_url,
            "decision_trace": decision_trace,
            "introspection": introspection,
            "log_id": log_id,
        }

        yield {"stage": "done", "log_id": log_id, "result": result}

