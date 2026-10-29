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

warnings.filterwarnings("ignore", category=RuntimeWarning)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


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
    classifier = pipeline.named_steps["clf"]

    X_train_prep = preprocessor.transform(X_train)
    X_test_prep = preprocessor.transform(X_test)
    feature_names = get_feature_names(preprocessor)

    # Use LinearExplainer for LogisticRegression or TreeExplainer for trees
    if hasattr(classifier, "coef_"):
        explainer = shap.LinearExplainer(classifier, X_train_prep)
        shap_values = explainer.shap_values(X_test_prep)
    else:
        explainer = shap.TreeExplainer(classifier)
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

        # Verify key clinical relationships:
        # 1. Total Bilirubin should be positive (elevated -> higher risk)
        findings["total_bilirubin_positive"] = bool(coef_dict.get("total_bilirubin", 0) > 0)
        # 2. ALT / AST should be positive (elevated -> higher risk)
        findings["alt_positive"] = bool(coef_dict.get("alt", 0) > 0)
        findings["ast_positive"] = bool(coef_dict.get("ast", 0) > 0)
        # 3. Alk Phos should be positive (elevated -> higher risk)
        findings["alk_phos_positive"] = bool(coef_dict.get("alk_phos", 0) > 0)
        # 4. Albumin should be negative (depleted -> higher risk)
        findings["albumin_negative"] = bool(coef_dict.get("albumin", 0) < 0)

        logger.info("Feature Direction Sanity Check: %s", findings)
    return findings


def explain_single_patient(pipeline: Any, patient_df: pd.DataFrame, top_k: int = 5) -> list[dict]:
    """Generate local SHAP feature attribution for a single patient profile."""
    prep = pipeline.named_steps["prep"]
    clf = pipeline.named_steps["clf"]
    feat_names = get_feature_names(prep)

    x_prep = prep.transform(patient_df)

    if hasattr(clf, "coef_"):
        coefs = clf.coef_[0]
        # Linear SHAP: contribution = (x - mean_x) * w
        # For simplicity and exactness in linear models:
        contributions = x_prep[0] * coefs
    else:
        explainer = shap.TreeExplainer(clf)
        contributions = explainer.shap_values(x_prep)[0]

    items = []
    for name, contrib in zip(feat_names, contributions):
        raw_val = patient_df.iloc[0].get(name, None)
        items.append({
            "feature": name,
            "raw_value": raw_val,
            "shap_value": float(contrib),
            "direction": "Pushed score higher (risk factor)" if contrib > 0 else "Pushed score lower (protective/normal)",
        })

    items.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
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
