"""Preprocessing and feature engineering pipelines for liver risk prediction."""
from __future__ import annotations

import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder, StandardScaler

from src.config import CAT_COLS, LOG_COLS, PLAIN_COLS


def build_preprocessor() -> ColumnTransformer:
    """Build ColumnTransformer preprocessing pipeline.
    
    Transforms:
    - LOG_COLS: median imputation -> log1p -> StandardScaler
    - PLAIN_COLS: median imputation -> StandardScaler
    - CAT_COLS: OneHotEncoder(drop='if_binary', handle_unknown='ignore')
    
    All imputers and scalers are fitted ONLY on training data folds.
    """
    log_pipe = Pipeline([
        ("imp", SimpleImputer(strategy="median")),
        ("log", FunctionTransformer(np.log1p, feature_names_out="one-to-one")),
        ("sc", StandardScaler()),
    ])

    plain_pipe = Pipeline([
        ("imp", SimpleImputer(strategy="median")),
        ("sc", StandardScaler()),
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("log", log_pipe, LOG_COLS),
            ("num", plain_pipe, PLAIN_COLS),
            ("cat", OneHotEncoder(drop="if_binary", handle_unknown="ignore"), CAT_COLS),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )
    return preprocessor


def get_feature_names(preprocessor: ColumnTransformer) -> list[str]:
    """Retrieve human-readable output feature names from a fitted preprocessor."""
    try:
        return list(preprocessor.get_feature_names_out())
    except Exception:
        # Fallback if get_feature_names_out fails
        cat_encoder = preprocessor.named_transformers_["cat"]
        cat_features = list(cat_encoder.get_feature_names_out(CAT_COLS))
        return LOG_COLS + PLAIN_COLS + cat_features
