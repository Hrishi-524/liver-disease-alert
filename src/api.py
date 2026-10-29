"""FastAPI backend providing REST endpoints for prediction, explainability,

reference ranges, presets, and batch screening.
"""
from __future__ import annotations

import io
import json
import logging
import warnings
from typing import Optional

import joblib
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from src.config import (
    BASE_DIR,
    FEATURE_COLUMNS,
    METRICS_PATH,
    MODEL_PATH,
    REFERENCE_RANGES,
)
from src.data import standardise, validate
from src.explain import explain_single_patient

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Initialize FastAPI application
app = FastAPI(
    title="Liver Disease Risk Decision Support API",
    description="Machine Learning Decision Support API for routine Liver Function Tests (LFTs)",
    version="1.0.0",
)

# Enable CORS for local Next.js / React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load saved model artifact and evaluation metrics
try:
    artifact = joblib.load(MODEL_PATH)
    pipeline = artifact["pipeline"]
    t_low = artifact["t_low"]
    t_high = artifact["t_high"]
    feature_ranges = artifact["feature_ranges"]
    logger.info("Loaded model artifact successfully. t_low=%.4f, t_high=%.4f", t_low, t_high)
except Exception as e:
    logger.error("Failed to load model artifact: %s", e)
    artifact = None
    pipeline = None
    t_low = 0.3094
    t_high = 0.4683
    feature_ranges = {}

metrics_cache = {}
if METRICS_PATH.exists():
    try:
        with open(METRICS_PATH, "r") as f:
            metrics_cache = json.load(f)
    except Exception as e:
        logger.warning("Could not read metrics JSON: %s", e)


class PatientInput(BaseModel):
    age: float = Field(..., ge=1, le=120, description="Age in years")
    gender: str = Field(..., description="'Male' or 'Female'")
    total_bilirubin: float = Field(..., ge=0.0, le=100.0, description="Total Bilirubin (mg/dL)")
    direct_bilirubin: float = Field(..., ge=0.0, le=50.0, description="Direct Bilirubin (mg/dL)")
    alk_phos: float = Field(..., ge=0.0, le=5000.0, description="Alkaline Phosphatase (IU/L)")
    alt: float = Field(..., ge=0.0, le=5000.0, description="Alanine Aminotransferase / SGPT (IU/L)")
    ast: float = Field(..., ge=0.0, le=6000.0, description="Aspartate Aminotransferase / SGOT (IU/L)")
    total_protein: float = Field(..., ge=0.0, le=20.0, description="Total Protein (g/dL)")
    albumin: float = Field(..., ge=0.0, le=10.0, description="Albumin (g/dL)")
    ag_ratio: Optional[float] = Field(None, ge=0.0, le=10.0, description="A/G Ratio (optional, imputed if missing)")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "model_loaded": pipeline is not None}


@app.get("/api/info")
def get_info():
    return {
        "model_name": artifact.get("best_model_name", "Logistic Regression") if artifact else "Logistic Regression",
        "t_low": t_low,
        "t_high": t_high,
        "reference_ranges": REFERENCE_RANGES,
        "feature_ranges": feature_ranges,
        "metadata": artifact.get("metadata", {}) if artifact else {},
        "disclaimer": (
            "Educational and research decision-support tool only. Not a medical diagnostic device. "
            "Output reflects statistical similarity to dataset profiles, not true real-world risk."
        ),
    }


@app.get("/api/presets")
def get_presets():
    return {
        "normal": {
            "name": "Healthy Normal Profile",
            "description": "Routine checkup values within normal clinical laboratory ranges",
            "data": {
                "age": 32, "gender": "Female", "total_bilirubin": 0.6, "direct_bilirubin": 0.1,
                "alk_phos": 85, "alt": 22, "ast": 24, "total_protein": 7.4, "albumin": 4.5, "ag_ratio": 1.6,
            },
        },
        "borderline": {
            "name": "Borderline / Mildly Elevated",
            "description": "Mild enzyme elevation and slight hyperbilirubinemia requiring monitoring",
            "data": {
                "age": 52, "gender": "Male", "total_bilirubin": 1.4, "direct_bilirubin": 0.5,
                "alk_phos": 180, "alt": 48, "ast": 55, "total_protein": 6.4, "albumin": 3.4, "ag_ratio": 1.1,
            },
        },
        "severe": {
            "name": "High-Risk Hepatic Impairment",
            "description": "Marked jaundice (elevated bilirubin) and profound transaminase/ALP elevation",
            "data": {
                "age": 62, "gender": "Male", "total_bilirubin": 10.9, "direct_bilirubin": 5.5,
                "alk_phos": 699, "alt": 164, "ast": 200, "total_protein": 6.0, "albumin": 2.2, "ag_ratio": 0.6,
            },
        },
    }


@app.get("/api/metrics")
def get_metrics():
    return metrics_cache


@app.post("/api/predict")
def predict_risk(patient: PatientInput):
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Model pipeline is not loaded.")

    data_dict = patient.model_dump()
    df = pd.DataFrame([data_dict])
    validate(df, require_target=False)

    # 1. Model inference
    proba = float(pipeline.predict_proba(df)[0, 1])

    # 2. Risk band categorization
    if proba >= t_high:
        risk_band = "High"
        summary = f"High similarity to liver-patient cohort (score: {proba:.1%}, exceeds high-specificity cutoff of {t_high:.1%})."
        badge_variant = "danger"
    elif proba >= t_low:
        risk_band = "Medium"
        summary = f"Moderate similarity to liver-patient cohort (score: {proba:.1%}, between {t_low:.1%} and {t_high:.1%})."
        badge_variant = "warning"
    else:
        risk_band = "Low"
        summary = f"Low similarity to liver-patient cohort (score: {proba:.1%}, below screening cutoff of {t_low:.1%})."
        badge_variant = "success"

    # 3. Check out-of-distribution inputs (outside 1st-99th percentile)
    out_of_bounds = []
    if feature_ranges:
        for col, percentiles in feature_ranges.items():
            val = data_dict.get(col)
            if val is not None:
                p01 = percentiles.get(0.01) or percentiles.get("0.01")
                p99 = percentiles.get(0.99) or percentiles.get("0.99")
                if p01 is not None and p99 is not None and (val < p01 or val > p99):
                    ref_info = REFERENCE_RANGES.get(col, {})
                    unit = ref_info.get("unit", "")
                    out_of_bounds.append({
                        "feature": col,
                        "value": val,
                        "p01": float(p01),
                        "p99": float(p99),
                        "unit": unit,
                        "message": f"Value {val} {unit} is outside the training data 1st-99th percentile range [{p01:.1f}, {p99:.1f}].",
                    })

    # 4. Local SHAP explanations
    explanations = explain_single_patient(pipeline, df, top_k=6)

    return {
        "model_score": proba,
        "model_score_pct": f"{proba * 100:.1f}%",
        "risk_band": risk_band,
        "badge_variant": badge_variant,
        "thresholds": {"t_low": t_low, "t_high": t_high},
        "summary": summary,
        "out_of_bounds_warnings": out_of_bounds,
        "feature_explanations": explanations,
    }


@app.post("/api/batch")
async def batch_screening(file: UploadFile = File(...)):
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Model pipeline is not loaded.")

    contents = await file.read()
    try:
        raw_df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV file format: {e}")

    try:
        std_df = standardise(raw_df)
        missing_cols = [c for c in FEATURE_COLUMNS if c not in std_df.columns]
        if missing_cols:
            raise HTTPException(
                status_code=422,
                detail=f"Uploaded CSV missing required feature columns: {missing_cols}",
            )

        X_batch = std_df[FEATURE_COLUMNS]
        scores = pipeline.predict_proba(X_batch)[:, 1]

        results = []
        for idx, score in enumerate(scores):
            band = "High" if score >= t_high else "Medium" if score >= t_low else "Low"
            row_dict = X_batch.iloc[idx].to_dict()
            results.append({
                "patient_id": idx + 1,
                "score": round(float(score), 4),
                "risk_band": band,
                **row_dict,
            })

        return {
            "total_records": len(results),
            "high_risk_count": sum(1 for r in results if r["risk_band"] == "High"),
            "medium_risk_count": sum(1 for r in results if r["risk_band"] == "Medium"),
            "low_risk_count": sum(1 for r in results if r["risk_band"] == "Low"),
            "records": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed batch prediction: {e}")


# Serve static React frontend files if built
frontend_dist = BASE_DIR / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
