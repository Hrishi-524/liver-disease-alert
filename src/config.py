"""Configuration and constants for the Liver Disease Risk Predictor."""
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_RAW_DIR = BASE_DIR / "data" / "raw"
DATA_PROCESSED_DIR = BASE_DIR / "data" / "processed"
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "reports"
FIGURES_DIR = REPORTS_DIR / "figures"

RAW_DATA_PATH = DATA_RAW_DIR / "indian_liver_patient.csv"
MODEL_PATH = MODELS_DIR / "liver_model.joblib"
METRICS_PATH = REPORTS_DIR / "metrics.json"
CV_RESULTS_PATH = REPORTS_DIR / "cv_results.csv"

# Random state
RANDOM_SEED = 42

# Column mapping (UCI & Kaggle raw variants -> canonical names)
COLUMN_MAP = {
    # UCI variants
    "Age": "age",
    "Gender": "gender",
    "TB": "total_bilirubin",
    "DB": "direct_bilirubin",
    "Alkphos": "alk_phos",
    "Sgpt": "alt",
    "Sgot": "ast",
    "TP": "total_protein",
    "ALB": "albumin",
    "A/G Ratio": "ag_ratio",
    "Selector": "target",
    # Kaggle variants
    "Total_Bilirubin": "total_bilirubin",
    "Direct_Bilirubin": "direct_bilirubin",
    "Alkaline_Phosphotase": "alk_phos",
    "Alamine_Aminotransferase": "alt",
    "Aspartate_Aminotransferase": "ast",
    "Total_Protiens": "total_protein",
    "Albumin": "albumin",
    "Albumin_and_Globulin_Ratio": "ag_ratio",
    "Dataset": "target",
}

CANONICAL_COLUMNS = [
    "age",
    "gender",
    "total_bilirubin",
    "direct_bilirubin",
    "alk_phos",
    "alt",
    "ast",
    "total_protein",
    "albumin",
    "ag_ratio",
    "target",
]

FEATURE_COLUMNS = [c for c in CANONICAL_COLUMNS if c != "target"]

# Features with right-skewed distributions needing log1p transform
LOG_COLS = ["total_bilirubin", "direct_bilirubin", "alk_phos", "alt", "ast"]

# Standard numeric features
PLAIN_COLS = ["age", "total_protein", "albumin", "ag_ratio"]

# Categorical features
CAT_COLS = ["gender"]

NUM_COLS = LOG_COLS + PLAIN_COLS

# Reference clinical ranges (approximate adult normal ranges, for UI hints & guidance only)
REFERENCE_RANGES = {
    "total_bilirubin": {"min": 0.1, "max": 1.2, "unit": "mg/dL", "label": "Total Bilirubin"},
    "direct_bilirubin": {"min": 0.0, "max": 0.3, "unit": "mg/dL", "label": "Direct Bilirubin"},
    "alk_phos": {"min": 44, "max": 147, "unit": "IU/L", "label": "Alkaline Phosphatase (ALP)"},
    "alt": {"min": 7, "max": 56, "unit": "IU/L", "label": "Alanine Aminotransferase (ALT/SGPT)"},
    "ast": {"min": 10, "max": 40, "unit": "IU/L", "label": "Aspartate Aminotransferase (AST/SGOT)"},
    "total_protein": {"min": 6.0, "max": 8.3, "unit": "g/dL", "label": "Total Protein"},
    "albumin": {"min": 3.5, "max": 5.0, "unit": "g/dL", "label": "Albumin"},
    "ag_ratio": {"min": 1.1, "max": 2.5, "unit": "ratio", "label": "Albumin/Globulin Ratio"},
    "age": {"min": 18, "max": 80, "unit": "years", "label": "Age"},
}
