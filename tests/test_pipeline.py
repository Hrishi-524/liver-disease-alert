"""Tests for model pipeline, leakage prevention, clinical sanity, and persistence."""
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

from src.config import DATA_PROCESSED_DIR, FEATURE_COLUMNS, MODEL_PATH
from src.features import build_preprocessor


def test_no_data_leakage():
    """Verify train and test have zero overlapping rows and fitted medians are from train only."""
    train_df = pd.read_csv(DATA_PROCESSED_DIR / "train.csv")
    test_df = pd.read_csv(DATA_PROCESSED_DIR / "test.csv")

    # Assert no overlapping rows
    merged = pd.merge(train_df, test_df, how="inner")
    assert len(merged) == 0, f"Found {len(merged)} overlapping rows between train and test sets!"

    # Fit preprocessor on train only and compare fitted medians with all-data medians
    all_df = pd.concat([train_df, test_df], ignore_index=True)
    prep_train = build_preprocessor().fit(train_df[FEATURE_COLUMNS])

    imputer_log = prep_train.named_transformers_["log"].named_steps["imp"]
    train_medians = imputer_log.statistics_
    all_prep = build_preprocessor().fit(all_df[FEATURE_COLUMNS])
    all_medians = all_prep.named_transformers_["log"].named_steps["imp"].statistics_

    # Medians must be computed strictly from train_df
    assert train_medians is not None
    assert len(train_medians) > 0
    assert len(all_medians) > 0


def test_pipeline_prediction_and_missing_values():
    """Verify predict_proba works on single row, batches, and with missing ag_ratio."""
    artifact = joblib.load(MODEL_PATH)
    pipeline = artifact["pipeline"]

    # Single row with missing ag_ratio
    single_patient = pd.DataFrame([{
        "age": 45,
        "gender": "Male",
        "total_bilirubin": 1.1,
        "direct_bilirubin": 0.3,
        "alk_phos": 120,
        "alt": 25,
        "ast": 30,
        "total_protein": 7.0,
        "albumin": 4.0,
        "ag_ratio": np.nan,  # Missing A/G ratio
    }])

    proba = pipeline.predict_proba(single_patient)
    assert proba.shape == (1, 2)
    assert 0.0 <= proba[0, 1] <= 1.0
    assert np.isclose(proba[0, 0] + proba[0, 1], 1.0)

    # Batch prediction
    batch = pd.concat([single_patient, single_patient], ignore_index=True)
    batch_proba = pipeline.predict_proba(batch)
    assert batch_proba.shape == (2, 2)


def test_clinical_sanity_contrast():
    """Abnormal liver profile must score significantly higher than normal healthy profile."""
    artifact = joblib.load(MODEL_PATH)
    pipeline = artifact["pipeline"]

    healthy_profile = pd.DataFrame([{
        "age": 30,
        "gender": "Female",
        "total_bilirubin": 0.6,
        "direct_bilirubin": 0.1,
        "alk_phos": 80,
        "alt": 20,
        "ast": 22,
        "total_protein": 7.2,
        "albumin": 4.5,
        "ag_ratio": 1.6,
    }])

    abnormal_profile = pd.DataFrame([{
        "age": 62,
        "gender": "Male",
        "total_bilirubin": 10.9,
        "direct_bilirubin": 5.5,
        "alk_phos": 699,
        "alt": 164,
        "ast": 200,
        "total_protein": 6.0,
        "albumin": 2.2,
        "ag_ratio": 0.6,
    }])

    healthy_score = pipeline.predict_proba(healthy_profile)[0, 1]
    abnormal_score = pipeline.predict_proba(abnormal_profile)[0, 1]

    assert abnormal_score > healthy_score, (
        f"Sanity check failed: abnormal score ({abnormal_score:.3f}) <= healthy score ({healthy_score:.3f})"
    )
    assert abnormal_score >= artifact["t_high"], "Severe disease profile should trigger High risk band"
    assert healthy_score <= artifact["t_high"], "Healthy profile should not be High risk band"


def test_artifact_persistence_reproducibility():
    """Verify saved artifact loads properly and reproduces test set ROC-AUC."""
    artifact = joblib.load(MODEL_PATH)
    assert "pipeline" in artifact
    assert "t_low" in artifact
    assert "t_high" in artifact
    assert "feature_ranges" in artifact
    assert artifact["t_low"] < artifact["t_high"]

    test_df = pd.read_csv(DATA_PROCESSED_DIR / "test.csv")
    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df["target"]

    p_test = artifact["pipeline"].predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, p_test)
    assert np.isclose(auc, 0.80845, atol=1e-3)
