from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(frozen=True)
class CaseRow:
    log_id: str
    created_at: str
    image_hash: str
    image_path: str | None
    model_version: str
    prediction: str
    confidence: float
    stability_score: float
    prediction_variance: float
    instability_flag: int
    adversarial_score: float
    tampering_flag: int
    trust_score: int
    risk_level: str
    decision_trace_json: str
    introspection_json: str


class Database:
    def __init__(self, sqlite_path: Path):
        self.sqlite_path = sqlite_path

    def connect(self) -> sqlite3.Connection:
        self.sqlite_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self.sqlite_path), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def init_schema(self, schema_sql_path: Path) -> None:
        sql = schema_sql_path.read_text(encoding="utf-8")
        with self.connect() as conn:
            conn.executescript(sql)

    def insert_case(
        self,
        *,
        log_id: str,
        image_hash: str,
        image_path: str | None,
        model_version: str,
        prediction: str,
        confidence: float,
        stability_score: float,
        prediction_variance: float,
        instability_flag: bool,
        adversarial_score: float,
        tampering_flag: bool,
        trust_score: int,
        risk_level: str,
        decision_trace: list[Any],
        introspection: dict[str, Any],
    ) -> None:
        created_at = utc_now_iso()
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO cases (
                    log_id, created_at, image_hash, image_path, model_version,
                    prediction, confidence,
                    stability_score, prediction_variance, instability_flag,
                    adversarial_score, tampering_flag,
                    trust_score, risk_level,
                    decision_trace_json, introspection_json
                ) VALUES (
                    :log_id, :created_at, :image_hash, :image_path, :model_version,
                    :prediction, :confidence,
                    :stability_score, :prediction_variance, :instability_flag,
                    :adversarial_score, :tampering_flag,
                    :trust_score, :risk_level,
                    :decision_trace_json, :introspection_json
                )
                """,
                {
                    "log_id": log_id,
                    "created_at": created_at,
                    "image_hash": image_hash,
                    "image_path": image_path,
                    "model_version": model_version,
                    "prediction": prediction,
                    "confidence": float(confidence),
                    "stability_score": float(stability_score),
                    "prediction_variance": float(prediction_variance),
                    "instability_flag": 1 if instability_flag else 0,
                    "adversarial_score": float(adversarial_score),
                    "tampering_flag": 1 if tampering_flag else 0,
                    "trust_score": int(trust_score),
                    "risk_level": risk_level,
                    "decision_trace_json": json.dumps(decision_trace, separators=(",", ":"), ensure_ascii=False),
                    "introspection_json": json.dumps(introspection, separators=(",", ":"), ensure_ascii=False),
                },
            )

    def insert_artifacts(self, *, log_id: str, heatmap_path: str | None, overlay_path: str | None) -> None:
        # Append-only: insert once; ignore if already present.
        with self.connect() as conn:
            conn.execute(
                """
                INSERT OR IGNORE INTO artifacts (log_id, heatmap_path, overlay_path)
                VALUES (:log_id, :heatmap_path, :overlay_path)
                """,
                {"log_id": log_id, "heatmap_path": heatmap_path, "overlay_path": overlay_path},
            )

    def get_logs(self, *, limit: int = 100) -> list[dict[str, Any]]:
        with self.connect() as conn:
            rows = conn.execute(
                """
                SELECT log_id, created_at, prediction, confidence, trust_score, risk_level, image_hash
                FROM cases
                ORDER BY created_at DESC
                LIMIT :limit
                """,
                {"limit": int(limit)},
            ).fetchall()
        return [dict(r) for r in rows]

    def get_case(self, log_id: str) -> dict[str, Any] | None:
        with self.connect() as conn:
            case = conn.execute("SELECT * FROM cases WHERE log_id = :log_id", {"log_id": log_id}).fetchone()
            if case is None:
                return None
            artifacts = conn.execute(
                "SELECT heatmap_path, overlay_path FROM artifacts WHERE log_id = :log_id", {"log_id": log_id}
            ).fetchone()
        out = dict(case)
        if artifacts is not None:
            out.update(dict(artifacts))
        else:
            out.update({"heatmap_path": None, "overlay_path": None})
        return out

    def get_ledger_entries(self) -> list[dict[str, Any]]:
        with self.connect() as conn:
            rows = conn.execute("SELECT id, created_at, prev_hash, entry_hash, payload_json FROM ledger ORDER BY id").fetchall()
        return [dict(r) for r in rows]

    def insert_ledger_entry(self, *, prev_hash: str | None, entry_hash: str, payload: dict[str, Any]) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO ledger (created_at, prev_hash, entry_hash, payload_json)
                VALUES (:created_at, :prev_hash, :entry_hash, :payload_json)
                """,
                {
                    "created_at": utc_now_iso(),
                    "prev_hash": prev_hash,
                    "entry_hash": entry_hash,
                    "payload_json": json.dumps(payload, separators=(",", ":"), ensure_ascii=False),
                },
            )

    def get_last_ledger_hash(self) -> str | None:
        with self.connect() as conn:
            row = conn.execute("SELECT entry_hash FROM ledger ORDER BY id DESC LIMIT 1").fetchone()
        return None if row is None else str(row["entry_hash"])

