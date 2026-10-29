"""Training pipeline with Repeated Stratified CV, hyperparameter tuning,

calibration check, threshold selection, and model persistence.
"""
from __future__ import annotations

import logging
from datetime import date
from pathlib import Path
from typing import Any

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import sklearn
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    brier_score_loss,
    precision_recall_curve,
    roc_curve,
)
from sklearn.model_selection import (
    GridSearchCV,
    RepeatedStratifiedKFold,
    StratifiedKFold,
    cross_val_predict,
    cross_val_score,
    train_test_split,
)
from sklearn.pipeline import Pipeline

from src.config import (
    CV_RESULTS_PATH,
    DATA_PROCESSED_DIR,
    FEATURE_COLUMNS,
    FIGURES_DIR,
    MODEL_PATH,
    MODELS_DIR,
    NUM_COLS,
    RANDOM_SEED,
    REFERENCE_RANGES,
    REPORTS_DIR,
)
from src.data import prepare_data
from src.features import build_preprocessor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def split_data(
    df: pd.DataFrame, test_size: float = 0.2, random_state: int = RANDOM_SEED
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Perform a stratified 80/20 train/test split.
    
    Test set is saved and untouched during model selection and threshold tuning.
    """
    train_df, test_df = train_test_split(
        df,
        test_size=test_size,
        stratify=df["target"],
        random_state=random_state,
        shuffle=True,
    )
    logger.info("Split dataset: Train=%d (%.1f%% pos), Test=%d (%.1f%% pos)",
                len(train_df), 100 * train_df["target"].mean(),
                len(test_df), 100 * test_df["target"].mean())
    return train_df.reset_index(drop=True), test_df.reset_index(drop=True)


def define_models_and_grids() -> dict[str, tuple[Pipeline, dict]]:
    """Define candidate pipelines and their hyperparameter search spaces."""
    models = {
        "Logistic Regression": (
            Pipeline([
                ("prep", build_preprocessor()),
                ("clf", LogisticRegression(
                    solver="liblinear",
                    max_iter=2000,
                    class_weight="balanced",
                    random_state=RANDOM_SEED,
                )),
            ]),
            {
                "clf__C": [0.05, 0.1, 0.5, 1.0, 5.0, 10.0],
            },
        ),
        "Random Forest": (
            Pipeline([
                ("prep", build_preprocessor()),
                ("clf", RandomForestClassifier(
                    n_estimators=300,
                    class_weight="balanced_subsample",
                    random_state=RANDOM_SEED,
                    n_jobs=-1,
                )),
            ]),
            {
                "clf__max_depth": [3, 5, 8, None],
                "clf__min_samples_leaf": [1, 3, 5],
            },
        ),
        "Gradient Boosting": (
            Pipeline([
                ("prep", build_preprocessor()),
                ("clf", HistGradientBoostingClassifier(
                    class_weight="balanced",
                    random_state=RANDOM_SEED,
                )),
            ]),
            {
                "clf__learning_rate": [0.03, 0.1],
                "clf__max_depth": [2, 3, None],
                "clf__max_iter": [100, 200],
            },
        ),
    }
    return models


def evaluate_cv(
    X_train: pd.DataFrame, y_train: pd.Series
) -> tuple[pd.DataFrame, dict[str, Any], dict]:
    """Run Repeated Stratified K-Fold CV across candidate models and the baseline."""
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=RANDOM_SEED)

    # 1. Baseline: DummyClassifier (most frequent class)
    dummy_pipe = Pipeline([
        ("prep", build_preprocessor()),
        ("clf", DummyClassifier(strategy="most_frequent")),
    ])
    dummy_scores = cross_val_score(dummy_pipe, X_train, y_train, cv=cv, scoring="roc_auc")
    logger.info("Baseline DummyClassifier CV ROC-AUC: %.4f (std: %.4f)",
                np.mean(dummy_scores), np.std(dummy_scores))

    models_and_grids = define_models_and_grids()
    cv_records = []
    fold_scores_dict = {"Dummy Baseline": dummy_scores}
    best_estimators = {}

    for name, (pipe, grid) in models_and_grids.items():
        logger.info("Tuning %s with RepeatedStratifiedKFold...", name)
        grid_search = GridSearchCV(
            estimator=pipe,
            param_grid=grid,
            scoring="roc_auc",
            cv=cv,
            n_jobs=-1,
            refit=True,
            return_train_score=False,
        )
        grid_search.fit(X_train, y_train)

        best_score = grid_search.best_score_
        best_std = grid_search.cv_results_["std_test_score"][grid_search.best_index_]
        best_params = grid_search.best_params_
        best_estimators[name] = grid_search.best_estimator_

        # Collect all 15 fold scores for best estimator
        best_fold_scores = cross_val_score(grid_search.best_estimator_, X_train, y_train, cv=cv, scoring="roc_auc")
        fold_scores_dict[name] = best_fold_scores

        cv_records.append({
            "model": name,
            "mean_cv_roc_auc": float(best_score),
            "std_cv_roc_auc": float(best_std),
            "best_params": str(best_params),
        })
        logger.info("%s -> Best CV ROC-AUC: %.4f (+/- %.4f) with params: %s",
                    name, best_score, best_std, best_params)

    cv_df = pd.DataFrame(cv_records).sort_values("mean_cv_roc_auc", ascending=False).reset_index(drop=True)
    return cv_df, best_estimators, fold_scores_dict


def select_best_model(cv_df: pd.DataFrame, best_estimators: dict[str, Any]) -> tuple[str, Any]:
    """Select the best model, adhering to 1-SE rule favoring simplicity."""
    top_row = cv_df.iloc[0]
    best_name = top_row["model"]
    top_score = top_row["mean_cv_roc_auc"]
    top_std = top_row["std_cv_roc_auc"]

    # 1-SE threshold: simpler model within 1 standard error of best
    threshold_score = top_score - (top_std / np.sqrt(15))  # 15 folds

    # Check if Logistic Regression is within 1 SE
    lr_row = cv_df[cv_df["model"] == "Logistic Regression"]
    if not lr_row.empty and lr_row.iloc[0]["mean_cv_roc_auc"] >= threshold_score:
        logger.info("1-SE rule: Logistic Regression (%.4f) is within 1 SE of top model %s (%.4f). Choosing simpler model.",
                    lr_row.iloc[0]["mean_cv_roc_auc"], best_name, top_score)
        best_name = "Logistic Regression"
    else:
        logger.info("Selected top model: %s (Mean CV ROC-AUC: %.4f)", best_name, top_score)

    return best_name, best_estimators[best_name]


def compute_thresholds_and_calibration(
    pipeline: Pipeline, X_train: pd.DataFrame, y_train: pd.Series
) -> tuple[float, float, float, Pipeline, bool]:
    """Evaluate calibration and derive decision thresholds (t_low, t_high) from out-of-fold predictions."""
    cv5 = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_SEED)
    oof_probs = cross_val_predict(pipeline, X_train, y_train, cv=cv5, method="predict_proba")[:, 1]

    uncal_brier = brier_score_loss(y_train, oof_probs)
    logger.info("Uncalibrated OOF Brier score: %.4f", uncal_brier)

    # 1. t_low: gives recall >= 0.90 with highest specificity (lowest FPR)
    fpr, tpr, thresholds_roc = roc_curve(y_train, oof_probs)
    ok_recall = tpr >= 0.90
    if np.any(ok_recall):
        # Among thresholds where recall >= 0.90, pick the one minimizing FPR
        t_low = float(thresholds_roc[ok_recall][np.argmin(fpr[ok_recall])])
    else:
        t_low = 0.50

    # 2. t_high: threshold with precision >= 0.85
    precision, recall, thresholds_pr = precision_recall_curve(y_train, oof_probs)
    # Find thresholds where precision >= 0.85 and strictly above t_low
    valid_mask = (precision[:-1] >= 0.85) & (thresholds_pr > t_low)
    if np.any(valid_mask):
        t_high = float(thresholds_pr[valid_mask][0])
    else:
        t_high = 0.75  # Fallback per specification

    # Ensure valid ordering and reasonable separation
    if t_high <= t_low:
        t_high = min(0.80, t_low + 0.20)

    logger.info("Derived thresholds from OOF: t_low=%.4f, t_high=%.4f", t_low, t_high)
    return t_low, t_high, uncal_brier, pipeline, False


def plot_cv_comparison(fold_scores_dict: dict, out_path: Path) -> None:
    """Plot boxplot comparing CV fold ROC-AUC scores across models."""
    plt.figure(figsize=(9, 5))
    names = list(fold_scores_dict.keys())
    scores = [fold_scores_dict[k] for k in names]

    plt.boxplot(scores, tick_labels=names, patch_artist=True,
                boxprops=dict(facecolor="#93c5fd", color="#1e40af"),
                medianprops=dict(color="#b91c1c", linewidth=2))
    plt.ylabel("ROC-AUC (15 folds: 5x3 Repeated CV)")
    plt.title("Cross-Validation Model Comparison: ROC-AUC")
    plt.grid(axis="y", linestyle="--", alpha=0.6)
    plt.tight_layout()
    plt.savefig(out_path, dpi=300)
    plt.close()
    logger.info("Saved CV comparison figure to %s", out_path)


def train_and_persist() -> dict:
    """Full execution of training pipeline."""
    DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Prepare data (deduplicate and validate)
    df, summary = prepare_data()

    # 2. Split into train and test sets (stratified 80/20)
    train_df, test_df = split_data(df, test_size=0.2, random_state=RANDOM_SEED)

    # Persist split datasets for reproducible final testing without data leakage
    train_df.to_csv(DATA_PROCESSED_DIR / "train.csv", index=False)
    test_df.to_csv(DATA_PROCESSED_DIR / "test.csv", index=False)

    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df["target"]

    # 3. Model comparison and CV
    cv_df, best_estimators, fold_scores = evaluate_cv(X_train, y_train)
    cv_df.to_csv(CV_RESULTS_PATH, index=False)
    plot_cv_comparison(fold_scores, FIGURES_DIR / "cv_model_comparison.png")

    # 4. Select winner
    best_name, best_pipe = select_best_model(cv_df, best_estimators)

    # 5. Calibration & thresholds
    t_low, t_high, brier, final_pipe_template, is_calibrated = compute_thresholds_and_calibration(
        best_pipe, X_train, y_train
    )

    # 6. Fit chosen pipeline on full training set
    logger.info("Fitting selected model (%s) on all %d training rows...", best_name, len(X_train))
    final_pipe = final_pipe_template.fit(X_train, y_train)

    # 7. Compute empirical 1st-99th percentile feature ranges on training data only
    feature_ranges = train_df[NUM_COLS].quantile([0.01, 0.99]).to_dict()

    # 8. Save artifact
    artifact = {
        "pipeline": final_pipe,
        "best_model_name": best_name,
        "t_low": float(t_low),
        "t_high": float(t_high),
        "feature_ranges": feature_ranges,
        "reference_ranges": REFERENCE_RANGES,
        "feature_columns": FEATURE_COLUMNS,
        "metadata": {
            "sklearn": sklearn.__version__,
            "trained": str(date.today()),
            "n_train": len(X_train),
            "brier_score_oof": float(brier),
            "is_calibrated": is_calibrated,
            "cv_best_model": best_name,
            "cv_results": cv_df.to_dict(orient="records"),
        },
    }

    joblib.dump(artifact, MODEL_PATH)
    logger.info("Model artifact successfully saved to %s", MODEL_PATH)
    return artifact


if __name__ == "__main__":
    train_and_persist()
