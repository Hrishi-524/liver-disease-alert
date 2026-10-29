"""Data loading, standardization, validation, and deduplication module."""
from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from src.config import (
    CANONICAL_COLUMNS,
    COLUMN_MAP,
    FEATURE_COLUMNS,
    NUM_COLS,
    RAW_DATA_PATH,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def load_raw(path: Path | None = None) -> pd.DataFrame:
    """Load raw dataset from CSV file."""
    csv_path = path or RAW_DATA_PATH
    if not Path(csv_path).exists():
        raise FileNotFoundError(f"Raw dataset file not found at: {csv_path}")
    logger.info("Loading raw data from %s", csv_path)
    return pd.read_csv(csv_path)


def standardise(df: pd.DataFrame) -> pd.DataFrame:
    """Rename columns to canonical names and recode target variable."""
    df_clean = df.copy()

    # Rename known variants
    rename_dict = {col: COLUMN_MAP[col] for col in df_clean.columns if col in COLUMN_MAP}
    df_clean = df_clean.rename(columns=rename_dict)

    # Standardize string gender values
    if "gender" in df_clean.columns:
        df_clean["gender"] = df_clean["gender"].astype(str).str.strip().str.capitalize()

    # Recode target: 1 = liver patient, 2 = non-liver patient -> recode to 1 (liver) / 0 (non-liver)
    if "target" in df_clean.columns:
        # Check if original encoding is {1, 2}
        unique_targets = set(df_clean["target"].dropna().unique())
        if unique_targets == {1, 2}:
            df_clean["target"] = (df_clean["target"] == 1).astype(int)
        elif unique_targets.issubset({0, 1}):
            df_clean["target"] = df_clean["target"].astype(int)
        else:
            raise ValueError(f"Unexpected target values: {unique_targets}")

    return df_clean


def validate(df: pd.DataFrame, require_target: bool = True) -> None:
    """Validate DataFrame against ILPD schema and clinical domain rules."""
    required_cols = CANONICAL_COLUMNS if require_target else FEATURE_COLUMNS
    missing_cols = [c for c in required_cols if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Schema violation: missing required columns: {missing_cols}")

    # Check gender values
    invalid_genders = df[~df["gender"].isin(["Male", "Female"])]["gender"].unique()
    if len(invalid_genders) > 0:
        raise ValueError(f"Invalid gender values found: {invalid_genders}. Expected 'Male' or 'Female'.")

    # Check age range [0, 120]
    if (df["age"] < 0).any() or (df["age"] > 120).any():
        bad_ages = df[(df["age"] < 0) | (df["age"] > 120)]["age"].tolist()
        raise ValueError(f"Age violation (must be 0-120): {bad_ages[:5]}")

    # Check non-negative numeric columns
    check_num_cols = [c for c in NUM_COLS if c in df.columns]
    for col in check_num_cols:
        if (df[col].dropna() < 0).any():
            bad_vals = df[df[col] < 0][col].tolist()
            raise ValueError(f"Non-negative numeric violation in column '{col}': {bad_vals[:5]}")

    # Check target values if present
    if require_target and "target" in df.columns:
        invalid_targets = df[~df["target"].isin([0, 1])]["target"].unique()
        if len(invalid_targets) > 0:
            raise ValueError(f"Invalid target values found: {invalid_targets}. Expected 0 or 1.")


def deduplicate(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Remove exact duplicate rows before train/test split to prevent data leakage."""
    n_before = len(df)
    df_dedup = df.drop_duplicates().reset_index(drop=True)
    n_removed = n_before - len(df_dedup)
    logger.info("Deduplication: removed %d exact duplicate row(s) (%d -> %d)", n_removed, n_before, len(df_dedup))
    return df_dedup, n_removed


def get_data_summary(df: pd.DataFrame) -> dict:
    """Compute data quality summary statistics."""
    return {
        "n_rows": len(df),
        "n_columns": len(df.columns),
        "columns": list(df.columns),
        "missing_values": df.isnull().sum().to_dict(),
        "gender_counts": df["gender"].value_counts().to_dict() if "gender" in df.columns else {},
        "target_distribution": (
            df["target"].value_counts(normalize=True).to_dict() if "target" in df.columns else {}
        ),
        "target_counts": df["target"].value_counts().to_dict() if "target" in df.columns else {},
    }


def prepare_data(path: Path | None = None) -> tuple[pd.DataFrame, dict]:
    """Complete data preparation: load, standardise, validate, deduplicate."""
    raw = load_raw(path)
    std = standardise(raw)
    validate(std, require_target=True)
    dedup, n_dups = deduplicate(std)
    summary = get_data_summary(dedup)
    summary["n_duplicates_removed"] = n_dups
    logger.info("Data prepared successfully. Total rows: %d, Duplicates removed: %d", len(dedup), n_dups)
    return dedup, summary
