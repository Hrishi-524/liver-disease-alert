"""Final evaluation module on the untouched test set.

Computes metrics, 95% bootstrap confidence intervals, and publication figures.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    average_precision_score,
    balanced_accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)

from src.config import (
    DATA_PROCESSED_DIR,
    FEATURE_COLUMNS,
    FIGURES_DIR,
    METRICS_PATH,
    MODEL_PATH,
    RANDOM_SEED,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def compute_metrics_at_threshold(y_true: np.ndarray, y_prob: np.ndarray, threshold: float) -> dict:
    """Compute classification metrics at a given decision threshold."""
    y_pred = (y_prob >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0

    return {
        "threshold": float(threshold),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "specificity": float(specificity),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def compute_bootstrap_cis(
    y_true: pd.Series, y_prob: np.ndarray, threshold: float, n_bootstraps: int = 1000
) -> dict[str, dict]:
    """Compute 95% bootstrap confidence intervals for primary metrics."""
    rng = np.random.default_rng(RANDOM_SEED)
    n = len(y_true)

    boot_auc, boot_ap, boot_rec, boot_spec, boot_bal_acc = [], [], [], [], []

    for _ in range(n_bootstraps):
        idx = rng.integers(0, n, n)
        y_samp = y_true.iloc[idx]
        p_samp = y_prob[idx]

        if y_samp.nunique() < 2:
            continue

        boot_auc.append(roc_auc_score(y_samp, p_samp))
        boot_ap.append(average_precision_score(y_samp, p_samp))

        pred_samp = (p_samp >= threshold).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_samp, pred_samp, labels=[0, 1]).ravel()

        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        bal = (rec + spec) / 2.0

        boot_rec.append(rec)
        boot_spec.append(spec)
        boot_bal_acc.append(bal)

    def ci_dict(values):
        return {
            "mean": float(np.mean(values)),
            "ci_95_low": float(np.percentile(values, 2.5)),
            "ci_95_high": float(np.percentile(values, 97.5)),
        }

    return {
        "roc_auc": ci_dict(boot_auc),
        "average_precision": ci_dict(boot_ap),
        "recall_at_t_low": ci_dict(boot_rec),
        "specificity_at_t_low": ci_dict(boot_spec),
        "balanced_accuracy_at_t_low": ci_dict(boot_bal_acc),
    }


def plot_roc_curve(y_true: np.ndarray, y_prob: np.ndarray, auc_score: float, out_path: Path) -> None:
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, color="#2563eb", lw=2, label=f"Model (AUC = {auc_score:.3f})")
    plt.plot([0, 1], [0, 1], color="#9ca3af", lw=1.5, linestyle="--", label="Chance (AUC = 0.500)")
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("False Positive Rate (1 - Specificity)")
    plt.ylabel("True Positive Rate (Recall / Sensitivity)")
    plt.title("Test Set ROC Curve")
    plt.legend(loc="lower right")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(out_path, dpi=300)
    plt.close()


def plot_pr_curve(y_true: np.ndarray, y_prob: np.ndarray, ap_score: float, out_path: Path) -> None:
    prec, rec, _ = precision_recall_curve(y_true, y_prob)
    pos_rate = np.mean(y_true)
    plt.figure(figsize=(6, 5))
    plt.plot(rec, prec, color="#059669", lw=2, label=f"Model (AP = {ap_score:.3f})")
    plt.axhline(y=pos_rate, color="#9ca3af", linestyle="--", label=f"Prevalence ({pos_rate:.1%})")
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("Recall")
    plt.ylabel("Precision")
    plt.title("Test Set Precision-Recall Curve")
    plt.legend(loc="lower left")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(out_path, dpi=300)
    plt.close()


def plot_confusion_matrix(cm_dict: dict, out_path: Path) -> None:
    matrix = np.array([[cm_dict["tn"], cm_dict["fp"]], [cm_dict["fn"], cm_dict["tp"]]])
    plt.figure(figsize=(5, 4))
    plt.imshow(matrix, cmap="Blues", interpolation="nearest")
    plt.title("Confusion Matrix (at t_low)")
    plt.colorbar()
    classes = ["Non-Liver (0)", "Liver (1)"]
    tick_marks = np.arange(len(classes))
    plt.xticks(tick_marks, classes)
    plt.yticks(tick_marks, classes)

    thresh = matrix.max() / 2.0
    for i in range(2):
        for j in range(2):
            plt.text(j, i, format(matrix[i, j], "d"),
                     ha="center", va="center",
                     color="white" if matrix[i, j] > thresh else "black",
                     fontsize=14, fontweight="bold")

    plt.ylabel("True Label")
    plt.xlabel("Predicted Label")
    plt.tight_layout()
    plt.savefig(out_path, dpi=300)
    plt.close()


def plot_calibration_curve(y_true: np.ndarray, y_prob: np.ndarray, brier: float, out_path: Path) -> None:
    prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=5, strategy="uniform")
    plt.figure(figsize=(6, 5))
    plt.plot(prob_pred, prob_true, "s-", color="#d97706", label=f"Model (Brier = {brier:.3f})")
    plt.plot([0, 1], [0, 1], "k--", label="Perfect calibration")
    plt.xlabel("Mean Predicted Probability")
    plt.ylabel("Fraction of Positives")
    plt.title("Reliability / Calibration Curve")
    plt.legend(loc="lower right")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(out_path, dpi=300)
    plt.close()


def run_evaluation() -> dict:
    """Execute final evaluation on the test set."""
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    test_path = DATA_PROCESSED_DIR / "test.csv"
    if not test_path.exists():
        raise FileNotFoundError(f"Processed test set not found at {test_path}. Run src.train first.")

    test_df = pd.read_csv(test_path)
    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df["target"]

    artifact = joblib.load(MODEL_PATH)
    pipeline = artifact["pipeline"]
    t_low = artifact["t_low"]
    t_high = artifact["t_high"]

    # Single evaluation on test set
    p_test = pipeline.predict_proba(X_test)[:, 1]

    roc_auc = float(roc_auc_score(y_test, p_test))
    avg_prec = float(average_precision_score(y_test, p_test))
    brier = float(brier_score_loss(y_test, p_test))

    metrics_t_low = compute_metrics_at_threshold(y_test, p_test, t_low)
    metrics_t_high = compute_metrics_at_threshold(y_test, p_test, t_high)
    metrics_default = compute_metrics_at_threshold(y_test, p_test, 0.50)

    # Confidence intervals
    cis = compute_bootstrap_cis(y_test, p_test, t_low, n_bootstraps=1000)

    # Generate figures
    plot_roc_curve(y_test.values, p_test, roc_auc, FIGURES_DIR / "roc_curve.png")
    plot_pr_curve(y_test.values, p_test, avg_prec, FIGURES_DIR / "precision_recall_curve.png")
    plot_confusion_matrix(metrics_t_low["confusion_matrix"], FIGURES_DIR / "confusion_matrix_t_low.png")
    plot_calibration_curve(y_test.values, p_test, brier, FIGURES_DIR / "calibration_curve.png")

    report = {
        "model_name": artifact.get("best_model_name", "Logistic Regression"),
        "test_size": len(y_test),
        "disease_prevalence_test": float(y_test.mean()),
        "roc_auc": roc_auc,
        "average_precision": avg_prec,
        "brier_score": brier,
        "thresholds": {"t_low": t_low, "t_high": t_high},
        "metrics_at_t_low": metrics_t_low,
        "metrics_at_t_high": metrics_t_high,
        "metrics_at_default_0_5": metrics_default,
        "confidence_intervals_95": cis,
        "baseline_comparison": {
            "dummy_majority_class_accuracy": float(y_test.mean()),
            "dummy_majority_class_auc": 0.50,
            "dummy_balanced_accuracy": 0.50,
        },
    }

    with open(METRICS_PATH, "w") as f:
        json.dump(report, f, indent=2)

    logger.info("Test Evaluation Complete!")
    logger.info("ROC-AUC: %.4f (95%% CI: %.4f - %.4f)", roc_auc, cis["roc_auc"]["ci_95_low"], cis["roc_auc"]["ci_95_high"])
    logger.info("Recall @ t_low (%.3f): %.4f (95%% CI: %.4f - %.4f)", t_low, metrics_t_low["recall"], cis["recall_at_t_low"]["ci_95_low"], cis["recall_at_t_low"]["ci_95_high"])
    logger.info("Specificity @ t_low (%.3f): %.4f (95%% CI: %.4f - %.4f)", t_low, metrics_t_low["specificity"], cis["specificity_at_t_low"]["ci_95_low"], cis["specificity_at_t_low"]["ci_95_high"])
    logger.info("Balanced Accuracy @ t_low: %.4f", metrics_t_low["balanced_accuracy"])
    logger.info("Saved report to %s and figures to %s", METRICS_PATH, FIGURES_DIR)

    return report


if __name__ == "__main__":
    run_evaluation()
