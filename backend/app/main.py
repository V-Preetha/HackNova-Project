from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.core.config import get_settings
from app.core.pipeline import MedTracePipeline


def create_app() -> FastAPI:
    settings = get_settings()

    # Ensure runtime dirs exist
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    settings.heatmaps_dir.mkdir(parents=True, exist_ok=True)

    app = FastAPI(title="MedTrace", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Serve artifacts
    app.mount("/static", StaticFiles(directory=str(settings.data_dir), html=False), name="static")

    # Initialize schema early (fast) so /health can validate quickly later
    MedTracePipeline.from_settings(settings)

    app.include_router(router)
    return app


app = create_app()

