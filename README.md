# MedTrace (MVP)

MedTrace is an AI safety + observability layer for medical AI. This MVP provides:

- `POST /analyze` and `POST /analyze/stream` (progressive staged output)
- Grad-CAM heatmaps + overlay artifacts
- Stability + trust scoring
- Adversarial/tampering heuristics
- Append-only hash-chained ledger + replay via logs

## Backend (FastAPI)

### Setup

From the repo root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

### Run

```powershell
uvicorn app.main:app --app-dir backend --reload --port 8001
```

Open:
- Health: `http://localhost:8001/health`
- Docs: `http://localhost:8001/docs`

Artifacts are served under `/static` (e.g. `/static/heatmaps/...`).

### Model

Default path is `backend/model/model.pth`.

- Best: TorchScript (`torch.jit.save`) or a full saved `nn.Module` (`torch.save(model, ...)`).
- If you only have a `state_dict`, you must provide the model architecture code (not included in this MVP).

## Frontend (React)

The frontend is in `frontend/` and connects to `http://localhost:8001` by default.\n+\n+To override, set `VITE_API_BASE` (example: `http://localhost:8000`).

```powershell
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173`.

"# HackNova-Project" 
