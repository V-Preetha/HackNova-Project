# MedTrace: AI Safety Layer for Medical AI
---

## What is MedTrace?
MedTrace is NOT just another dashboard. It is a live, dynamic **AI Observability System**. 

While traditional AI models behave like unpredictable "black boxes"—spitting out predictions with no explanation—MedTrace serves as an **AI Safety Layer**. It sits directly on top of complex medical AI models (like CheXNet for thoracic disease detection) and actively monitors, explains, and validates every decision the API makes in real-time.

---

## Why did we build it?
In the medical field, a simple "Prediction: 94% Pneumonia" is not enough. Doctors need to know *why* the AI made that decision and whether the AI is robust against edge cases or adversarial attacks. 

We built MedTrace to solve the "Black Box" problem in healthcare AI by providing:
1. **Explainability:** Showing exactly where the AI is looking (Focus Regions & Saliency Maps).
2. **Stability Checking:** Testing if the AI changes its mind when the image is slightly altered (Adversarial Robustness).
3. **Quantifiable Trust:** Generating a comprehensive "Trust Score" so doctors know exactly how reliable a specific prediction is.

---

## Technical Highlights
MedTrace is built with a clear separation of concerns, providing a highly polished, production-grade frontend that consumes live backend metrics:

### The Frontend (React + Vite + Tailwind CSS + Framer Motion)
- **Glassmorphism & Neon Aesthetic:** Designed to feel like a high-end, intelligent observability system rather than a generic admin panel. Deep dark backgrounds (#02040A) paired with neon green (#00ff88) alerts create a heads-up display (HUD) feel.
- **Dynamic Data Rendering:** The UI dynamically reads streaming pipeline states. Stages sequentially update (Input -> Heatmap -> Integrity Check) to visually simulate the exact status of the backend compute layer.
- **Trust Score Weighting:** Mathematical breakdown of model confidence, stability tests, anomaly checks, and input quality into a single, digestible "Reliability Metric" out of 100.
- **Model Introspection:** Advanced UI components visualizing layer-wise activation flows, decision trace maps, and focus zones (e.g., Infiltration Zone, Pleural Boundary) mapped directly to anatomical features.

### The Backend (Python + PyTorch)
*(Note: Integrated conceptually in this project repository)*
- **Model Backbone:** Utilizes `DenseNet121` (CheXNet) modified to predict 14 distinct thoracic diseases from chest X-rays.
- **Processing Pipeline:** `preprocess.py` dynamically normalizes DICOM/image data into tensors ready for inference. 
- **Safety Testing:** Evaluates resistance to perturbation (FGSM/PGD attacks) to measure true stability.

---

## The Workflow Experience

1. **Dashboard:** Upload an X-ray scan. Immediately watch the scanning animation simulate feature extraction. View the top prediction alongside an initial confidence percentage.
2. **Deep Analysis:** Jump into the Introspection view. Toggle the heatmap overlay to see exactly *where* the AI found anomalies (e.g., fluid in alveolar spaces).
3. **Safety & Stability:** Review the adversarial resilience table. Did the model fail when slight digital noise was added? MedTrace flags it.
4. **Trust Score:** The ultimate verdict. Should the clinician trust this scan? MedTrace calculates a weighted final score explaining its recommendation.
