# Liver Disease Risk Predictor: Technical Implementation Guide
AI/ML in healthcare mini project. An educational decision-support tool, not a diagnostic device.

## 1. Project summary
- **Goal**: Train and rigorously evaluate a binary classifier that predicts whether a patient is a liver patient from routine blood-test values, then wrap it in an interactive web application (React/Next.js frontend + FastAPI backend, plus Streamlit app) that shows the prediction, the reasons behind it, and the model's limits.
- **Deliverables**:
  1. A reproducible Python package and notebooks (`01_eda.ipynb`, `02_modeling.ipynb`).
  2. A saved model pipeline with thresholds and metadata (`models/liver_model.joblib`).
  3. An evaluation report with figures (`reports/figures/`, `reports/metrics.json`, `reports/cv_results.csv`).
  4. A modern React / Next.js web application with interactive blood test form, reference range hints, SHAP-based feature importance, batch CSV prediction, and model card modal/tab.
  5. Streamlit app (`app.py`).
  6. README, model card (`MODEL_CARD.md`), test suite (`tests/`), Dockerfile.
- **Non-goals**: No diagnosis, no collection of real patient data, no user accounts, no database.
- **Success criteria**: The model beats the majority-class baseline on AUC and balanced accuracy, recall and specificity are reported with confidence intervals, all tests pass, and the live app works end to end.

## 2. Dataset: Indian Liver Patient Dataset (ILPD)
- Source: UCI Machine Learning Repository (ILPD), also mirrored on Kaggle as `indian_liver_patient.csv`. Records come from patients in north-east Andhra Pradesh, India.
- Key facts: 583 rows; 416 liver patients (71.4%) and 167 non-liver patients (28.6%); 441 male and 142 female; 4 missing values, all in the A/G ratio; ages above 89 are recorded as 90; a handful of exact duplicate rows; label coded 1 = liver patient, 2 = non-liver patient.

### Canonical Schema & Reference Ranges
| Canonical name | UCI / Kaggle name | Unit | Typical adult range (approximate, varies by lab) |
|---|---|---|---|
| `age` | Age | years | - |
| `gender` | Gender | Male / Female | - |
| `total_bilirubin` | TB / Total_Bilirubin | mg/dL | 0.1-1.2 |
| `direct_bilirubin` | DB / Direct_Bilirubin | mg/dL | 0.0-0.3 |
| `alk_phos` | Alkphos / Alkaline_Phosphotase | IU/L | 44-147 |
| `alt` | Sgpt / Alamine_Aminotransferase | IU/L | 7-56 |
| `ast` | Sgot / Aspartate_Aminotransferase | IU/L | 10-40 |
| `total_protein` | TP / Total_Protiens (sic) | g/dL | 6.0-8.3 |
| `albumin` | ALB / Albumin | g/dL | 3.5-5.0 |
| `ag_ratio` | A/G Ratio / Albumin_and_Globulin_Ratio | ratio | 1.1-2.5 |
| `target` | Selector / Dataset | 1 = liver, 2 = non-liver | recode to 1 / 0 |

Caveats:
(a) Small, single-region sample.
(b) The non-liver group is other patients, not healthy volunteers.
(c) The 71% disease rate is the dataset's rate, not the population's, so predicted probabilities are not real-world risk.

## 3. Technology Stack
- Backend/ML: Python 3.9+, pandas, numpy, scikit-learn, shap, matplotlib, seaborn, joblib, fastapi, uvicorn, pytest, ruff.
- Frontend: Modern React/Next.js UI (Tailwind CSS, Lucide icons, interactive charts & visual gauges).
- Optional: Streamlit app (`app.py`), Dockerfile.
