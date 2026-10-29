"""Explainability module providing global & local SHAP explanations and permutation importance."""
from __future__ import annotations

import logging
import warnings
from pathlib import Path
from typing import Any

warnings.filterwarnings("ignore")

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from sklearn.inspection import permutation_importance

from src.config import (
    DATA_PROCESSED_DIR,
    FEATURE_COLUMNS,
    FIGURES_DIR,
    MODEL_PATH,
    RANDOM_SEED,
)
from src.features import get_feature_names

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Feature metadata for mapping transformed features back to raw inputs
FEATURE_METADATA = {
    "total_bilirubin": {"label": "Total Bilirubin", "unit": "mg/dL", "raw_key": "total_bilirubin"},
    "direct_bilirubin": {"label": "Direct Bilirubin", "unit": "mg/dL", "raw_key": "direct_bilirubin"},
    "alk_phos": {"label": "Alkaline Phosphatase (ALP)", "unit": "IU/L", "raw_key": "alk_phos"},
    "alt": {"label": "Alanine Aminotransferase (ALT)", "unit": "IU/L", "raw_key": "alt"},
    "ast": {"label": "Aspartate Aminotransferase (AST)", "unit": "IU/L", "raw_key": "ast"},
    "age": {"label": "Age", "unit": "years", "raw_key": "age"},
    "total_protein": {"label": "Total Protein", "unit": "g/dL", "raw_key": "total_protein"},
    "albumin": {"label": "Albumin", "unit": "g/dL", "raw_key": "albumin"},
    "ag_ratio": {"label": "A/G Ratio", "unit": "ratio", "raw_key": "ag_ratio"},
    "gender_Male": {"label": "Gender", "unit": "", "raw_key": "gender"},
}

_explainer_cache: Any = None


def get_cached_explainer(pipeline: Any) -> Any:
    """Initialize and cache SHAP LinearExplainer using preprocessed training data background."""
    global _explainer_cache
    if _explainer_cache is not None:
        return _explainer_cache

    prep = pipeline.named_steps["prep"]
    clf = pipeline.named_steps["clf"]

    train_path = DATA_PROCESSED_DIR / "train.csv"
    if train_path.exists():
        train_df = pd.read_csv(train_path)
        X_train_prep = prep.transform(train_df[FEATURE_COLUMNS])
    else:
        # Fallback reference
        n_features = len(prep.get_feature_names_out())
        X_train_prep = np.zeros((20, n_features))

    if hasattr(clf, "coef_"):
        _explainer_cache = shap.LinearExplainer(clf, X_train_prep)
    else:
        _explainer_cache = shap.TreeExplainer(clf)

    return _explainer_cache


def compute_permutation_importance(
    pipeline: Any, X_test: pd.DataFrame, y_test: pd.Series, n_repeats: int = 30
) -> pd.DataFrame:
    """Compute permutation feature importance on test set scored with ROC-AUC."""
    perm_res = permutation_importance(
        pipeline,
        X_test,
        y_test,
        n_repeats=n_repeats,
        random_state=RANDOM_SEED,
        scoring="roc_auc",
        n_jobs=-1,
    )

    df_perm = pd.DataFrame({
        "feature": FEATURE_COLUMNS,
        "importance_mean": perm_res.importances_mean,
        "importance_std": perm_res.importances_std,
    }).sort_values("importance_mean", ascending=False).reset_index(drop=True)

    return df_perm


def plot_permutation_importance(df_perm: pd.DataFrame, out_path: Path) -> None:
    plt.figure(figsize=(8, 5))
    df_sorted = df_perm.sort_values("importance_mean", ascending=True)
    plt.barh(df_sorted["feature"], df_sorted["importance_mean"],
             xerr=df_sorted["importance_std"], color="#3b82f6", alpha=0.85, capsize=4)
    plt.xlabel("Drop in ROC-AUC upon Permutation")
    plt.title("Permutation Feature Importance (Test Set)")
    plt.grid(axis="x", alpha=0.3)
    plt.tight_layout()
    plt.savefig(out_path, dpi=300)
    plt.close()
    logger.info("Saved permutation importance plot to %s", out_path)


def run_shap_analysis(
    pipeline: Any, X_train: pd.DataFrame, X_test: pd.DataFrame
) -> tuple[np.ndarray, list[str], Any]:
    """Run SHAP analysis using preprocessed features."""
    preprocessor = pipeline.named_steps["prep"]
    X_test_prep = preprocessor.transform(X_test)
    feature_names = get_feature_names(preprocessor)
    explainer = get_cached_explainer(pipeline)
    shap_values = explainer.shap_values(X_test_prep)
    return shap_values, feature_names, X_test_prep


def plot_shap_summary(shap_values: np.ndarray, feature_names: list[str], X_test_prep: np.ndarray, out_path: Path) -> None:
    plt.figure(figsize=(9, 6))
    shap.summary_plot(shap_values, X_test_prep, feature_names=feature_names, show=False)
    plt.title("SHAP Global Summary (Impact on Liver Disease Score)")
    plt.tight_layout()
    plt.savefig(out_path, dpi=300)
    plt.close()
    logger.info("Saved SHAP summary plot to %s", out_path)


def sanity_check_feature_directions(pipeline: Any) -> dict[str, Any]:
    """Sanity check: higher bilirubin, ALT, AST, ALP and lower albumin

    must increase the predicted log-odds / risk of liver patient.
    """
    clf = pipeline.named_steps["clf"]
    prep = pipeline.named_steps["prep"]
    feature_names = get_feature_names(prep)

    findings = {}
    if hasattr(clf, "coef_"):
        coefs = clf.coef_[0]
        coef_dict = dict(zip(feature_names, coefs))

        findings["coefficients"] = {k: float(v) for k, v in coef_dict.items()}
        findings["total_bilirubin_positive"] = bool(coef_dict.get("total_bilirubin", 0) > 0)
        findings["alt_positive"] = bool(coef_dict.get("alt", 0) > 0)
        findings["ast_positive"] = bool(coef_dict.get("ast", 0) > 0)
        findings["alk_phos_positive"] = bool(coef_dict.get("alk_phos", 0) > 0)
        findings["albumin_negative"] = bool(coef_dict.get("albumin", 0) < 0)

        logger.info("Feature Direction Sanity Check: %s", findings)
    return findings


def explain_single_patient(pipeline: Any, patient_df: pd.DataFrame, top_k: int = 6) -> list[dict]:
    """Generate local SHAP feature attribution for a single patient profile.
    
    Uses SHAP LinearExplainer fitted against preprocessed training background data.
    Maps transformed features accurately back to raw input values and formats
    attributions using neutral, non-causal clinical language.
    """
    prep = pipeline.named_steps["prep"]
    x_prep = prep.transform(patient_df)
    feat_names = get_feature_names(prep)

    explainer = get_cached_explainer(pipeline)
    shap_vals = explainer.shap_values(x_prep)

    if isinstance(shap_vals, list):
        contributions = shap_vals[1][0] if len(shap_vals) > 1 else shap_vals[0][0]
    else:
        contributions = shap_vals[0]

    items = []
    first_row = patient_df.iloc[0]

    for name, contrib in zip(feat_names, contributions):
        meta = FEATURE_METADATA.get(name, {"label": name, "unit": "", "raw_key": name})
        raw_key = meta["raw_key"]

        raw_val = first_row.get(raw_key, None)
        if raw_val is not None and hasattr(raw_val, "item"):
            raw_val = raw_val.item()

        contrib_float = float(contrib)
        abs_contrib = abs(contrib_float)

        if contrib_float > 0.001:
            direction_desc = "increased the model output"
            impact_badge = "increased"
        elif contrib_float < -0.001:
            direction_desc = "decreased the model output"
            impact_badge = "decreased"
        else:
            direction_desc = "neutral influence on model output"
            impact_badge = "neutral"

        items.append({
            "feature": raw_key,
            "label": meta["label"],
            "raw_value": raw_val,
            "unit": meta["unit"],
            "shap_value": round(contrib_float, 4),
            "abs_impact": round(abs_contrib, 4),
            "direction": direction_desc,
            "impact": impact_badge,
            "statement": f"{meta['label']} ({raw_val} {meta['unit']}) {direction_desc}",
        })

    items.sort(key=lambda x: x["abs_impact"], reverse=True)
    return items[:top_k]


def run_explanations() -> None:
    """Execute complete explainability workflow."""
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    artifact = joblib.load(MODEL_PATH)
    pipeline = artifact["pipeline"]

    train_df = pd.read_csv(DATA_PROCESSED_DIR / "train.csv")
    test_df = pd.read_csv(DATA_PROCESSED_DIR / "test.csv")

    X_train = train_df[FEATURE_COLUMNS]
    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df["target"]

    # 1. Permutation Importance
    df_perm = compute_permutation_importance(pipeline, X_test, y_test)
    plot_permutation_importance(df_perm, FIGURES_DIR / "permutation_importance.png")
    df_perm.to_csv(FIGURES_DIR.parent / "permutation_importance.csv", index=False)

    # 2. SHAP Analysis
    shap_vals, feat_names, X_test_prep = run_shap_analysis(pipeline, X_train, X_test)
    plot_shap_summary(shap_vals, feat_names, X_test_prep, FIGURES_DIR / "shap_summary.png")

    # 3. Sanity check
    sanity = sanity_check_feature_directions(pipeline)
    with open(FIGURES_DIR.parent / "sanity_check.json", "w") as f:
        import json
        json.dump(sanity, f, indent=2)

    logger.info("Explainability analysis complete!")


if __name__ == "__main__":
    run_explanations()
