# 🩺 HepatoRisk AI: Liver Disease Risk Predictor

[![CI Pipeline](https://github.com/hrishisunilpatil/liver-risk-predictor/actions/workflows/ci.yml/badge.svg)](https://github.com/hrishisunilpatil/liver-risk-predictor/actions)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/frontend-React%2018%20%2B%20Tailwind-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/API-FastAPI%20%2B%20Uvicorn-009688.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An end-to-end user-centered Clinical Decision-Support platform that evaluates patient similarity to liver-disease presentations from routine Liver Function Test (LFT) panels. Features a **redesigned healthcare-oriented React dashboard**, a **FastAPI inference & explainability engine**, automated SHAP feature attribution, **Groq-powered plain-language clinical summaries**, lab report PDF/text extraction, out-of-distribution alerts, session-only history, and batch cohort screening.

> ⚠️ **Clinical Disclaimer**: Educational screening prototype only. Not a medical diagnostic tool or certified clinical device. Output scores reflect statistical pattern similarity to historical research cohorts (ILPD), not an individual's definitive clinical diagnosis. Always consult a qualified healthcare provider.

---

## 🌟 Key Highlights & Architecture

- **User-Centered Multi-Tab Dashboard**: Clean, accessible clinical design separated from ML jargon:
  - **Overview**: Plain-language introduction, what the system does and does not do, quick assessment entry.
  - **New Assessment**: Two input options—manual entry with reference range guides, or lab report upload (PDF/Text) with extracted-value review.
  - **Assessment Result**: Low / Medium / High similarity bands, neutral language ("increased/decreased model output"), physiological cross-checks, and Groq-powered plain-language explanations.
  - **Session History**: In-memory local history for comparing runs within the current session (no remote database required).
  - **Model & Evidence**: Dedicated tab housing technical transparency: dataset provenance, 15-fold CV results, holdout metrics, SHAP mechanics, and clinical caveats.
  - **Batch Screening**: Preserved CSV cohort processing with summary statistics and downloadable results.
- **Groq LLM Integration (`POST /api/explain`)**: Safe, structured plain-language explanations using fast inference (`qwen/qwen3.8-27b`) formatted strictly in JSON without clinical hallucination.
- **Lab Report Extraction (`POST /api/extract-report`)**: Honest PDF and text extraction with a review-and-confirm form before scoring.
- **Mathematically Sound Local SHAP**: Uses `shap.LinearExplainer` against the true training background distribution rather than raw uncentered coefficient products.
- **Strict Data Validation & Physiological Checks**: Validates gender inputs strictly, flags direct bilirubin exceeding total bilirubin, and detects out-of-distribution biomarker values.
- **Two Evidence-Based Decision Cutoffs**:
  - `t_low = 0.3094`: Sensitive screening cutoff (86.4% recall on test holdout).
  - `t_high = 0.4683`: High-specificity cutoff (89.1% precision, 78.8% specificity).

---

## 📊 Test Set Holdout Results (n = 114)

*Evaluated strictly once on the 20% holdout test set with 1,000 bootstrap resamples for 95% Confidence Intervals:*

| Metric | Model Score | 95% Bootstrap CI | Baseline (Majority Class) |
|---|---|---|---|
| **ROC-AUC** | **0.8085** | **[0.7271, 0.8855]** | 0.5000 (+30.8% gain) |
| **Average Precision (PR-AUC)** | **0.9288** | **[0.8851, 0.9617]** | 0.7105 (prevalence) |
| **Sensitivity / Recall (@ t_low)** | **86.4%** | **[78.9%, 94.0%]** | 100.0% (all positive) |
| **Specificity (@ t_low)** | **30.3%** | **[14.3%, 47.1%]** | 0.0% |
| **Specificity (@ t_high)** | **78.8%** | **[63.6%, 90.9%]** | 0.0% |
| **Precision (@ t_high)** | **89.1%** | **[80.6%, 95.7%]** | 71.1% |
| **Balanced Accuracy (@ 0.50)** | **77.6%** | **[69.2%, 85.1%]** | 50.0% |
| **Brier Score (Calibration)** | **0.1758** | - | 0.2057 |

---

## 📁 Repository Layout

```text
liver-risk-predictor/
├── data/
│   ├── raw/                      # Original Indian Liver Patient Dataset (ILPD)
│   └── processed/                # Deduplicated train.csv (456) and test.csv (114)
├── frontend/                     # Modern React / Vite / Tailwind CSS Application
│   ├── src/                      # React components, forms, gauges, SHAP waterfall
│   ├── dist/                     # Production build served directly by FastAPI
│   └── package.json
├── models/
│   └── liver_model.joblib        # Scikit-learn pipeline, thresholds, feature percentiles
├── notebooks/
│   ├── 01_eda.ipynb              # Exploratory data analysis, distributions, and findings
│   └── 02_modeling.ipynb         # Narrative notebook executing src/ pipeline
├── reports/
│   ├── cv_results.csv            # 15-fold cross-validation metrics across models
│   ├── metrics.json              # Final test set metrics with bootstrap 95% CIs
│   └── figures/                  # Publication-ready plots (ROC, PR, CM, SHAP, etc.)
├── src/
│   ├── __init__.py
│   ├── api.py                   # FastAPI REST backend & static React hosting
│   ├── config.py                # Schema, paths, reference ranges, column mappings
│   ├── data.py                  # Loading, recoding, schema validation, deduplication
│   ├── features.py              # Scikit-learn ColumnTransformer preprocessor
│   ├── train.py                 # Repeated CV, model selection, threshold calibration
│   ├── evaluate.py              # Test set evaluation, bootstrap CIs, plot generation
│   └── explain.py               # Permutation importance and local/global SHAP
├── tests/                       # 20 Pytest unit, pipeline, app, and API tests
│   ├── test_api.py              # FastAPI endpoint & batch upload tests
│   ├── test_app.py              # Streamlit AppTest smoke test
│   ├── test_data.py             # Schema, recoding, negative value validation
│   └── test_pipeline.py         # Leakage prevention & clinical sanity tests
├── app.py                       # Streamlit fallback application
├── Dockerfile                   # Production container definition
├── requirements.txt             # Pinned Python package dependencies
├── MODEL_CARD.md                # Scientific model card and clinical caveats
└── README.md
```

---

## 🚀 Quickstart Guide

### 1. Setup Environment
```bash
cd liver-risk-predictor
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure environment variables (Groq API key & CORS)
cp .env.example .env
# Edit .env and supply your GROQ_API_KEY
```

### 2. Reproduce Pipeline from Scratch
```bash
# 1. Train models, run 15-fold CV, and persist best model artifact
python -m src.train

# 2. Evaluate on untouched test holdout (produces metrics.json and plots)
python -m src.evaluate

# 3. Generate SHAP explainability plots and verify clinical direction
python -m src.explain
```

### 3. Launch React + FastAPI Application (Recommended)
FastAPI serves the pre-built React frontend and all REST endpoints simultaneously on port 8000:
```bash
uvicorn src.api:app --host 0.0.0.0 --port 8000 --reload
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser!

*(Optional: For live React frontend development with hot-reloading)*:
```bash
cd frontend
npm install
npm run dev
# React dev server starts on http://localhost:3000 (proxies /api to FastAPI on 8000)
```

---

## 🧪 Running the Test Suite
Run the 26 automated unit, pipeline, app, and API tests:
```bash
pytest -v
```

Lint with Ruff:
```bash
ruff check src/ tests/ app.py
```

---

## 🐳 Docker Deployment
```bash
# Build Docker image
docker build -t hepatorisk-ai .

# Run container on port 8000
docker run -p 8000:8000 hepatorisk-ai
```
Visit **`http://localhost:8000`** to interact with the live application.
