"""FastAPI backend for HepatoRisk AI: Clinical Decision Support Platform.

Provides REST endpoints for:
- Deterministic model inference and risk stratification
- Validated local SHAP feature attributions
- Lab report document extraction and interactive review
- Plain-language Groq-powered narrative explanations
- Evidence, dataset provenance, and evaluation metrics
"""
from __future__ import annotations

import io
import json
import logging
import os
import warnings
from pathlib import Path
from typing import Any, Optional

import joblib
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

from src.config import (
    BASE_DIR,
    FEATURE_COLUMNS,
    METRICS_PATH,
    MODEL_PATH,
    REFERENCE_RANGES,
)
from src.data import standardise, validate
from src.explain import explain_single_patient
from src.report_parser import extract_text_from_pdf, parse_report_text

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Load .env searching current directory, BASE_DIR, and parent directories
env_candidates = [
    Path.cwd() / ".env",
    BASE_DIR / ".env",
    BASE_DIR.parent / ".env",
]
env_loaded_from = None
for p in env_candidates:
    if p.exists():
        load_dotenv(p)
        env_loaded_from = str(p)
        logger.info("Loaded .env from: %s", p)
        break

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

# Configure CORS allowlist
raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000,http://localhost:5173",
)
allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app = FastAPI(
    title="HepatoRisk AI - Clinical Decision Support API",
    description="Educational Liver Health Screening & Decision Support API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Load persisted model artifact safely
artifact: Optional[dict[str, Any]] = None
pipeline = None
t_low: Optional[float] = None
t_high: Optional[float] = None
feature_ranges: dict[str, Any] = {}

if MODEL_PATH.exists():
    try:
        artifact = joblib.load(MODEL_PATH)
        pipeline = artifact["pipeline"]
        t_low = float(artifact["t_low"])
        t_high = float(artifact["t_high"])
        feature_ranges = artifact.get("feature_ranges", {})
        logger.info("Successfully loaded model artifact. Cutoffs: t_low=%.4f, t_high=%.4f", t_low, t_high)
    except Exception as e:
        logger.error("Failed to load model artifact from %s: %s", MODEL_PATH, e)
        artifact = None
        pipeline = None
else:
    logger.warning("Model artifact not found at %s. Train using `python -m src.train`.", MODEL_PATH)

metrics_cache: dict[str, Any] = {}
if METRICS_PATH.exists():
    try:
        with open(METRICS_PATH, "r") as f:
            metrics_cache = json.load(f)
    except Exception as e:
        logger.warning("Could not read metrics JSON: %s", e)


class PatientInput(BaseModel):
    age: float = Field(..., ge=1, le=120, description="Patient age in years")
    gender: str = Field(..., description="'Male' or 'Female'")
    total_bilirubin: float = Field(..., ge=0.0, le=100.0, description="Total Bilirubin (mg/dL)")
    direct_bilirubin: float = Field(..., ge=0.0, le=50.0, description="Direct Bilirubin (mg/dL)")
    alk_phos: float = Field(..., ge=0.0, le=5000.0, description="Alkaline Phosphatase (IU/L)")
    alt: float = Field(..., ge=0.0, le=5000.0, description="Alanine Aminotransferase / SGPT (IU/L)")
    ast: float = Field(..., ge=0.0, le=6000.0, description="Aspartate Aminotransferase / SGOT (IU/L)")
    total_protein: float = Field(..., ge=0.0, le=20.0, description="Total Protein (g/dL)")
    albumin: float = Field(..., ge=0.0, le=10.0, description="Albumin (g/dL)")
    ag_ratio: Optional[float] = Field(None, ge=0.0, le=10.0, description="A/G Ratio (imputed with median if missing)")

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        clean = v.strip().capitalize()
        if clean not in ["Male", "Female"]:
            raise ValueError("Gender must be 'Male' or 'Female'")
        return clean


class ExplanationRequest(BaseModel):
    patient_values: dict[str, Any]
    model_score: float
    risk_band: str
    feature_explanations: list[dict[str, Any]]
    out_of_bounds_warnings: list[dict[str, Any]] = []


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "model_loaded": pipeline is not None,
        "groq_configured": bool(GROQ_API_KEY),
        "groq_model": GROQ_MODEL,
        "env_loaded_from": env_loaded_from is not None,
    }


@app.get("/api/info")
def get_info():
    if pipeline is None or artifact is None:
        return {
            "model_loaded": False,
            "error": "Model artifact is not loaded. Please train the model with `python -m src.train`.",
            "reference_ranges": REFERENCE_RANGES,
        }

    return {
        "model_loaded": True,
        "model_name": artifact.get("best_model_name", "Logistic Regression"),
        "t_low": t_low,
        "t_high": t_high,
        "reference_ranges": REFERENCE_RANGES,
        "feature_ranges": feature_ranges,
        "metadata": artifact.get("metadata", {}),
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
            "description": "Mild transaminase and bilirubin elevation warranting repeat testing",
            "data": {
                "age": 52, "gender": "Male", "total_bilirubin": 1.4, "direct_bilirubin": 0.5,
                "alk_phos": 180, "alt": 48, "ast": 55, "total_protein": 6.4, "albumin": 3.4, "ag_ratio": 1.1,
            },
        },
        "severe": {
            "name": "High-Risk Hepatic Impairment",
            "description": "Marked jaundice (elevated bilirubin) and transaminase/ALP elevations",
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
    if pipeline is None or t_low is None or t_high is None:
        raise HTTPException(status_code=503, detail="Model pipeline is not loaded. Train the model first.")

    data_dict = patient.model_dump()
    df = pd.DataFrame([data_dict])
    validate(df, require_target=False)

    # 1. Deterministic Model Prediction
    proba = float(pipeline.predict_proba(df)[0, 1])

    # 2. Risk Band Categorization
    if proba >= t_high:
        risk_band = "High"
        summary = (
            f"The submitted measurements exhibit a high similarity to liver-patient profiles in the reference dataset "
            f"(Model output: {proba:.1%}, at or above the high-specificity threshold of {t_high:.1%})."
        )
        badge_variant = "danger"
    elif proba >= t_low:
        risk_band = "Medium"
        summary = (
            f"The submitted measurements exhibit an intermediate similarity to liver-patient profiles in the reference dataset "
            f"(Model output: {proba:.1%}, between the screening threshold of {t_low:.1%} and {t_high:.1%})."
        )
        badge_variant = "warning"
    else:
        risk_band = "Low"
        summary = (
            f"The submitted measurements exhibit low similarity to liver-patient profiles in the reference dataset "
            f"(Model output: {proba:.1%}, below the screening threshold of {t_low:.1%})."
        )
        badge_variant = "success"

    # 3. Check Out-of-Distribution Inputs (empirical 1st-99th percentile of training cohort)
    out_of_bounds = []
    if feature_ranges:
        for col, percentiles in feature_ranges.items():
            val = data_dict.get(col)
            if val is not None:
                p01 = percentiles.get(0.01) or percentiles.get("0.01")
                p99 = percentiles.get(0.99) or percentiles.get("0.99")
                if p01 is not None and p99 is not None and (val < p01 or val > p99):
                    ref_info = REFERENCE_RANGES.get(col, {})
                    label = ref_info.get("label", col)
                    unit = ref_info.get("unit", "")
                    out_of_bounds.append({
                        "feature": col,
                        "label": label,
                        "value": val,
                        "p01": float(p01),
                        "p99": float(p99),
                        "unit": unit,
                        "message": (
                            f"{label} ({val} {unit}) is outside the training dataset's observed 1st-99th percentile "
                            f"range [{p01:.1f}, {p99:.1f}]. Model reliability is diminished for atypical values."
                        ),
                    })

    # Physiological check
    if data_dict["direct_bilirubin"] > data_dict["total_bilirubin"]:
        out_of_bounds.append({
            "feature": "direct_bilirubin",
            "label": "Direct Bilirubin",
            "value": data_dict["direct_bilirubin"],
            "unit": "mg/dL",
            "message": "Direct Bilirubin exceeds Total Bilirubin. Please check submitted values for laboratory reporting error.",
        })

    # 4. Validated Local SHAP Explanations
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
        "imputed_fields": ["ag_ratio"] if data_dict.get("ag_ratio") is None else [],
        "statement": "Model contributions describe statistical associations learned from the research dataset, not medical causation.",
    }


@app.post("/api/explain")
def generate_plain_language_explanation(req: ExplanationRequest):
    """Generate accessible, plain-language explanation of assessment result using Groq."""
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Groq API key is not configured on the server. Model assessment results remain fully functional.",
        )

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        logger.error("Failed to initialize Groq client: %s", e)
        raise HTTPException(status_code=503, detail="Groq client could not be initialized.") from e

    system_prompt = (
        "You are an insight-oriented AI clinical decision-support assistant for HepatoRisk AI. "
        "Your objective is to provide a clear, concise, objective explanation of a mathematical liver health screening assessment.\n\n"
        "CRITICAL EDITORIAL PRINCIPLES:\n"
        "1. Be insightful, not defensive. Do not start with or repeat disclaimers. The UI already displays fixed clinical notices.\n"
        "2. Explain what the model score indicates directly and objectively based on the supplied data.\n"
        "3. Focus on verified feature contributions provided to you. Explain the strongest factors first.\n"
        "4. For key factors, distinguish between mathematical model-output direction ('Increased model output' vs 'Decreased model output') "
        "and clinical causality. Never claim a measurement is 'protective', 'causes disease', or is definitively abnormal unless reflected in the provided data.\n"
        "5. Do not invent missing laboratory values, units, patient history, or clinical diagnoses.\n"
        "6. Provide 2-3 specific, non-prescriptive next steps (e.g. verifying transcriptions against original lab reports, discussing findings with a physician).\n\n"
        "REQUIRED JSON RESPONSE SCHEMA:\n"
        "{\n"
        '  "summary": "2-4 concise sentences starting directly with the model band/score and how the submitted measurements shaped it.",\n'
        '  "key_factors": [\n'
        '    {\n'
        '      "label": "Biomarker name",\n'
        '      "value_with_unit": "submitted value with unit",\n'
        '      "direction": "Increased model output" | "Decreased model output",\n'
        '      "explanation": "One short sentence explaining how this value aligns with patterns learned by the model from the research cohort."\n'
        '    }\n'
        '  ],\n'
        '  "key_takeaway": "1-2 sentences capturing the dominant pattern across all submitted markers.",\n'
        '  "suggested_next_steps": [\n'
        '    "Specific practical step 1",\n'
        '    "Specific practical step 2",\n'
        '    "Specific practical step 3"\n'
        '  ]\n'
        "}"
    )

    verified_factors = []
    for f in req.feature_explanations[:5]:
        val = f.get("raw_value")
        unit = f.get("unit", "")
        val_str = f"{val} {unit}".strip() if val is not None else "Not reported"
        direction = "Increased model output" if f.get("impact") == "increased" or "increased" in str(f.get("direction")).lower() else "Decreased model output"
        verified_factors.append({
            "label": f.get("label", f.get("feature")),
            "value_with_unit": val_str,
            "direction": direction,
            "impact_magnitude": f.get("abs_impact"),
        })

    prompt_data = {
        "model_score": req.model_score,
        "model_score_pct": f"{round(req.model_score * 100, 1)}%",
        "score_band": req.risk_band,
        "patient_measurements": req.patient_values,
        "verified_feature_influences": verified_factors,
        "data_warnings": [w.get("message") for w in req.out_of_bounds_warnings if isinstance(w, dict)],
    }

    user_message = (
        f"Explain this liver health screening result with concise, insight-oriented observations:\n"
        f"Data: {json.dumps(prompt_data)}"
    )

    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            timeout=20.0,
        )

        content = completion.choices[0].message.content
        if not content:
            raise ValueError("Empty response received from Groq.")

        parsed = json.loads(content)
        parsed["model_used"] = GROQ_MODEL
        return parsed

    except json.JSONDecodeError as e:
        logger.warning("Groq response was not valid JSON: %s", e)
        raise HTTPException(
            status_code=502,
            detail="The explanation service produced an unexpected format. Please try again.",
        ) from e
    except Exception as e:
        logger.error("Groq explanation request failed: %s", e)
        error_msg = str(e)
        if "401" in error_msg or "invalid_api_key" in error_msg:
            detail = "The configured Groq API key is invalid or expired."
        elif "rate_limit" in error_msg:
            detail = "The explanation service is temporarily rate-limited. Please wait a moment and try again."
        elif "timeout" in error_msg.lower():
            detail = "The explanation service timed out. Please try again."
        else:
            detail = "Could not generate AI plain-language explanation at this time. Standard model assessment remains active."

        raise HTTPException(status_code=502, detail=detail) from e


@app.post("/api/extract-report")
async def extract_lab_report(file: UploadFile = File(...)):
    """Extract clinical biomarkers from an uploaded laboratory report (PDF or TXT).
    
    Returns extracted fields, status indicators (detected/missing), and review prompts.
    Does NOT fabricate missing values.
    """
    contents = await file.read()
    filename = file.filename or ""

    raw_text = ""
    if filename.lower().endswith(".pdf"):
        try:
            raw_text = extract_text_from_pdf(contents)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read PDF document: {e}") from e
    elif filename.lower().endswith((".txt", ".csv", ".tsv")):
        try:
            raw_text = contents.decode("utf-8", errors="ignore")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to decode text file: {e}") from e
    else:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file format. Please upload a PDF (.pdf) or text (.txt) laboratory report.",
        )

    if not raw_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No readable text could be extracted from the uploaded document. It may be an image scan requiring OCR.",
        )

    parsed = parse_report_text(raw_text)
    return {
        "filename": filename,
        **parsed,
    }


@app.post("/api/batch")
async def batch_screening(file: UploadFile = File(...)):
    if pipeline is None or t_low is None or t_high is None:
        raise HTTPException(status_code=503, detail="Model pipeline is not loaded.")

    contents = await file.read()
    try:
        raw_df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV file format: {e}") from e

    try:
        std_df = standardise(raw_df)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error standardizing CSV columns: {e}") from e

    missing_cols = [c for c in FEATURE_COLUMNS if c not in std_df.columns]
    if missing_cols:
        raise HTTPException(
            status_code=422,
            detail=f"Uploaded CSV missing required feature columns: {missing_cols}",
        )

    try:
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
        logger.error("Failed batch prediction: %s", e)
        raise HTTPException(status_code=500, detail="Failed batch prediction processing.") from e


# Serve static React frontend files if built
frontend_dist = BASE_DIR / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
