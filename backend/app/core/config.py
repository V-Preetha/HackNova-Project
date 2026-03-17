from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    project_root: Path
    data_dir: Path
    uploads_dir: Path
    heatmaps_dir: Path
    sqlite_path: Path
    model_path: Path
    model_version: str

    # Trust formula weights (tunable)
    w_confidence: float = 0.45
    w_stability: float = 0.40
    w_adversarial: float = 0.15

    # Stability / adversarial knobs (tunable)
    stability_runs: int = 6
    rotation_degrees: float = 6.0
    noise_std: float = 0.03
    brightness_delta: float = 0.10

    # Explainability
    gradcam_overlay_alpha: float = 0.35


def get_settings() -> Settings:
    project_root = Path(__file__).resolve().parents[3]  # .../backend
    data_dir = project_root / "data"
    uploads_dir = data_dir / "uploads"
    heatmaps_dir = data_dir / "heatmaps"
    sqlite_path = data_dir / "medtrace.sqlite3"
    model_path = project_root / "backend" / "model" / "model.pth"

    # model_version: stable identifier for logs
    model_version = f"{model_path.name}"

    return Settings(
        project_root=project_root,
        data_dir=data_dir,
        uploads_dir=uploads_dir,
        heatmaps_dir=heatmaps_dir,
        sqlite_path=sqlite_path,
        model_path=model_path,
        model_version=model_version,
    )
