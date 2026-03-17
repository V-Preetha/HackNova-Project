from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any, AsyncIterator
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse

from app.core.config import get_settings
from app.core.pipeline import MedTracePipeline, sse_event

router = APIRouter()


@router.get("/health")
def health() -> dict[str, Any]:
    settings = get_settings()
    ok = True
    details: dict[str, Any] = {}
    details["model_path_exists"] = settings.model_path.exists()
    details["sqlite_path"] = str(settings.sqlite_path)
    details["data_dir"] = str(settings.data_dir)
    details["model_version"] = settings.model_version
    if not details["model_path_exists"]:
        ok = False
    return {"ok": ok, "details": details}


@router.post("/analyze")
async def analyze(image: UploadFile = File(...)) -> JSONResponse:
    pipeline = MedTracePipeline.from_settings(get_settings())
    try:
        result = await pipeline.run(image)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return JSONResponse(result)


@router.post("/analyze/stream")
async def analyze_stream(image: UploadFile = File(...)) -> StreamingResponse:
    pipeline = MedTracePipeline.from_settings(get_settings())

    async def gen() -> AsyncIterator[bytes]:
        try:
            async for ev in pipeline.run_stream(image):
                yield sse_event(ev["stage"], ev)
                await asyncio.sleep(0)  # allow flush
        except ValueError as e:
            yield sse_event("error", {"stage": "error", "message": str(e)})

    return StreamingResponse(gen(), media_type="text/event-stream")


@router.get("/logs")
def logs(limit: int = 100) -> dict[str, Any]:
    pipeline = MedTracePipeline.from_settings(get_settings())
    return {"items": pipeline.db.get_logs(limit=limit)}


@router.get("/logs/{log_id}")
def log_by_id(log_id: str) -> dict[str, Any]:
    pipeline = MedTracePipeline.from_settings(get_settings())
    row = pipeline.db.get_case(log_id)
    if row is None:
        raise HTTPException(status_code=404, detail="log_id not found")

    chain_ok, first_bad = pipeline.ledger.verify_chain()
    row["ledger_ok"] = chain_ok
    row["ledger_first_bad_hash"] = first_bad
    return row

