# Model Card: HepatoRisk AI Liver Disease Classifier

## 1. Model Details
- **Model Name**: HepatoRisk AI - Logistic Regression LFT Classifier
- **Version**: 1.0.0
- **Model Type**: Penalized Logistic Regression (`C=0.05`, `class_weight='balanced'`, `solver='liblinear'`) wrapped in a scikit-learn `Pipeline` and `ColumnTransformer`.
- **License**: MIT
- **Primary Framework**: scikit-learn 1.6.1, Python 3.9+
- **Artifact Path**: `models/liver_model.joblib`

## 2. Intended Use
- **Primary Use**: Educational and research decision-support tool to assist medical students, clinicians, and researchers in understanding multivariate patterns across routine Liver Function Tests (LFTs).
- **Intended Users**: Clinicians, medical researchers, students, and healthcare AI evaluators.
- **Out-of-Scope Uses**: 
  - **Not a diagnostic device**: Cannot be used as an autonomous diagnostic tool or standalone basis for clinical intervention.
  - **Not emergency triage**: Not validated for acute acute-on-chronic liver failure (ACLF) emergency triage.
  - **No clinical guarantees**: Predicted scores represent similarity to hospital cohort data, not true absolute population risk.

## 3. Training & Evaluation Data
- **Dataset**: Indian Liver Patient Dataset (ILPD), UCI Machine Learning Repository (ID 225) / Kaggle.
- **Geographic Origin**: North-East Andhra Pradesh, India.
- **Sample Size**: 583 records originally; **570 records** after strict deduplication (13 exact duplicates removed prior to split to prevent data leakage).
- **Train / Test Split**: 80/20 Stratified Split (`random_state=42`):
  - **Training Set**: 456 patients (71.3% liver patients, 28.7% non-liver patients)
  - **Test Holdout Set**: 114 patients (71.1% liver patients, 28.9% non-liver patients, held untouched until final evaluation).
- **Features (10)**:
  - Age, Gender
  - Total Bilirubin, Direct Bilirubin
  - Alkaline Phosphatase (ALP)
  - Alanine Aminotransferase (ALT / SGPT)
  - Aspartate Aminotransferase (AST / SGOT)
  - Total Protein, Albumin, Albumin/Globulin (A/G) Ratio

## 4. Evaluation Metrics (Independent Test Set Holdout, n=114)
*All metrics computed on the untouched holdout test set with 1,000 bootstrap iterations for 95% Confidence Intervals:*

| Metric | Model Performance | 95% Bootstrap Confidence Interval | Baseline (Dummy Classifier) |
|---|---|---|---|
| **ROC-AUC** | **0.8085** | [0.7271, 0.8855] | 0.5000 |
| **Average Precision (PR-AUC)** | **0.9288** | [0.8851, 0.9617] | 0.7105 (prevalence) |
| **Brier Score** | **0.1758** | - | 0.2057 |
| **Sensitivity / Recall (@ t_low = 0.309)** | **86.4%** | [78.9%, 94.0%] | 100.0% (all positive) |
| **Specificity (@ t_low = 0.309)** | **30.3%** | [14.3%, 47.1%] | 0.0% |
| **Sensitivity (@ t_high = 0.468)** | **70.4%** | [59.7%, 80.2%] | - |
| **Specificity (@ t_high = 0.468)** | **78.8%** | [63.6%, 90.9%] | - |
| **Precision (@ t_high = 0.468)** | **89.1%** | [80.6%, 95.7%] | 71.1% |
| **Balanced Accuracy (@ threshold 0.50)** | **77.6%** | [69.2%, 85.1%] | 50.0% |

### Decision Threshold Bands
- **Low Risk Band (`score < 0.3094`)**: High sensitivity screening zone; resembles non-liver patient profiles.
- **Medium Risk Band (`0.3094 <= score < 0.4683`)**: Intermediate zone warranting follow-up and clinical monitoring.
- **High Risk Band (`score >= 0.4683`)**: High specificity zone (89.1% precision, 78.8% specificity); matches acute liver patient presentations.

## 5. Explainability & Clinical Sanity
- **Permutation Importance**: Transaminases (ALT, AST) and Direct Bilirubin demonstrate highest ROC-AUC degradation upon feature disruption.
- **SHAP Feature Attributions**:
  - Elevated Total Bilirubin, Direct Bilirubin, ALT, AST, and Alk Phos consistently push model log-odds higher (risk factors).
  - Normal/high Albumin and A/G ratio push log-odds lower (protective indicators).
  - Sanity check confirms 100% concordance with clinical pathophysiology.

## 6. Known Biases & Limitations
1. **Regional Cohort**: Collected from a regional patient demographic in India. Biological normal baselines and etiology (e.g. viral hepatitis vs. alcoholic liver disease vs. NAFLD) vary regionally.
2. **Hospital-Derived Controls**: The negative control cohort consists of hospital patients presenting with non-liver complaints, not disease-free community volunteers.
3. **Dataset Prevalence**: 71.4% disease prevalence in the dataset is significantly higher than general population incidence (~5-15%). The output score must be interpreted as a similarity metric relative to hospital cohorts.
