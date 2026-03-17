# MedTrace - AI Safety Layer for Medical AI
*(HackNova Project)*

## What is MedTrace?
MedTrace is NOT just another dashboard. It is a live, dynamic **AI Observability System**. 

While traditional AI models behave like unpredictable "black boxes"—spitting out predictions with no explanation—MedTrace serves as an **AI Safety Layer**. It sits directly on top of complex medical AI models (like CheXNet for thoracic disease detection) and actively monitors, explains, and validates every decision the API makes in real-time.

## Why did we build it?
In the medical field, a simple "Prediction: 94% Pneumonia" is not enough. Doctors need to know *why* the AI made that decision and whether the AI is robust against edge cases or adversarial attacks. 

We built MedTrace to solve the "Black Box" problem in healthcare AI by providing:
1. **Explainability:** Showing exactly where the AI is looking (Focus Regions & Saliency Maps).
2. **Stability Checking:** Testing if the AI changes its mind when the image is slightly altered (Adversarial Robustness).
3. **Quantifiable Trust:** Generating a comprehensive "Trust Score" so doctors know exactly how reliable a specific prediction is.

---

## Technical Highlights
MedTrace is built with a clear separation of concerns, providing a highly polished, production-grade frontend that consumes live backend metrics.

### The Frontend (React + Vite + Tailwind CSS)
- **Glassmorphism & Neon Aesthetic:** Designed to feel like a high-end, intelligent observability system.
- **Dynamic Data Rendering:** The UI dynamically reads streaming pipeline states.
- **Trust Score Weighting:** Mathematical breakdown of model confidence, stability tests, anomaly checks.

### The Backend (Python + PyTorch)
- **Model Backbone:** Utilizes `DenseNet121` (CheXNet) modified to predict 14 distinct thoracic diseases from chest X-rays.
- **Processing Pipeline:** Dynamically normalizes DICOM/image data into tensors ready for inference.
- **Safety Testing:** Evaluates resistance to perturbation to measure true stability.

---

## Setup & Running Locally

### Backend (FastAPI)

From the repo root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

**Run:**

```powershell
uvicorn app.main:app --app-dir backend --reload --port 8001
```

Open:
- Health: `http://localhost:8001/health`
- Docs: `http://localhost:8001/docs`

Artifacts are served under `/static` (e.g. `/static/heatmaps/...`).

### Frontend (React)

The frontend is in `frontend/` and connects to `http://localhost:8001` by default.

```powershell
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173`.
