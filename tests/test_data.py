"""Tests for data loading, standardization, validation, and deduplication."""
import numpy as np
import pandas as pd
import pytest

from src.data import deduplicate, load_raw, standardise, validate


def test_load_raw():
    df = load_raw()
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 583


def test_standardise_recode_target():
    sample = pd.DataFrame({
        "Age": [45, 50],
        "Gender": ["Male", "Female"],
        "Total_Bilirubin": [0.8, 1.5],
        "Direct_Bilirubin": [0.2, 0.6],
        "Alkaline_Phosphotase": [180, 250],
        "Alamine_Aminotransferase": [25, 40],
        "Aspartate_Aminotransferase": [30, 45],
        "Total_Protiens": [6.5, 7.0],
        "Albumin": [3.2, 3.8],
        "Albumin_and_Globulin_Ratio": [0.9, 1.2],
        "Dataset": [1, 2],  # 1 = liver, 2 = non-liver
    })
    clean = standardise(sample)
    assert "target" in clean.columns
    assert "total_bilirubin" in clean.columns
    assert clean["target"].tolist() == [1, 0]


def test_validate_success():
    valid_df = pd.DataFrame({
        "age": [45],
        "gender": ["Male"],
        "total_bilirubin": [0.8],
        "direct_bilirubin": [0.2],
        "alk_phos": [180],
        "alt": [25],
        "ast": [30],
        "total_protein": [6.5],
        "albumin": [3.2],
        "ag_ratio": [0.9],
        "target": [1],
    })
    validate(valid_df)  # Should not raise


def test_validate_negative_numeric():
    bad_df = pd.DataFrame({
        "age": [45],
        "gender": ["Male"],
        "total_bilirubin": [-0.5],  # Invalid negative
        "direct_bilirubin": [0.2],
        "alk_phos": [180],
        "alt": [25],
        "ast": [30],
        "total_protein": [6.5],
        "albumin": [3.2],
        "ag_ratio": [0.9],
        "target": [1],
    })
    with pytest.raises(ValueError, match="Non-negative numeric violation"):
        validate(bad_df)


def test_validate_invalid_gender():
    bad_df = pd.DataFrame({
        "age": [45],
        "gender": ["Unknown"],
        "total_bilirubin": [0.8],
        "direct_bilirubin": [0.2],
        "alk_phos": [180],
        "alt": [25],
        "ast": [30],
        "total_protein": [6.5],
        "albumin": [3.2],
        "ag_ratio": [0.9],
        "target": [1],
    })
    with pytest.raises(ValueError, match="Invalid gender"):
        validate(bad_df)


def test_validate_age_out_of_bounds():
    bad_df = pd.DataFrame({
        "age": [150],  # Invalid age
        "gender": ["Female"],
        "total_bilirubin": [0.8],
        "direct_bilirubin": [0.2],
        "alk_phos": [180],
        "alt": [25],
        "ast": [30],
        "total_protein": [6.5],
        "albumin": [3.2],
        "ag_ratio": [0.9],
        "target": [0],
    })
    with pytest.raises(ValueError, match="Age violation"):
        validate(bad_df)


def test_deduplicate():
    df = pd.DataFrame({
        "a": [1, 2, 2, 3],
        "b": ["x", "y", "y", "z"],
    })
    dedup, n_removed = deduplicate(df)
    assert n_removed == 1
    assert len(dedup) == 3


def test_missing_values_preserved():
    df = pd.DataFrame({
        "age": [45],
        "gender": ["Male"],
        "total_bilirubin": [0.8],
        "direct_bilirubin": [0.2],
        "alk_phos": [180],
        "alt": [25],
        "ast": [30],
        "total_protein": [6.5],
        "albumin": [3.2],
        "ag_ratio": [np.nan],  # Missing value
        "target": [1],
    })
    validate(df)
    assert df["ag_ratio"].isna().iloc[0]
