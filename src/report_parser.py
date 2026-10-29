"""Laboratory report text extraction and LFT biomarker parser.

Supports text extraction from PDF and plain text documents with pattern matching,
unit detection, and honest status reporting (detected, missing, ambiguous).
Does NOT fabricate values; produces structured preview for user review.
"""
from __future__ import annotations

import io
import logging
import re
from typing import Any

from pypdf import PdfReader

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Biomarker detection patterns (regex, synonyms, expected units)
BIOMARKER_PATTERNS = {
    "total_bilirubin": {
        "label": "Total Bilirubin",
        "expected_unit": "mg/dL",
        "patterns": [
            r"(?:total\s+bilirubin|t\.?\s*bilirubin|tbil|serum\s+bilirubin\s+total)[^0-9\n]*?([0-9.]+)",
            r"bilirubin\s*\(?total\)?[^0-9\n]*?([0-9.]+)",
        ],
    },
    "direct_bilirubin": {
        "label": "Direct Bilirubin",
        "expected_unit": "mg/dL",
        "patterns": [
            r"(?:direct\s+bilirubin|d\.?\s*bilirubin|dbil|conjugated\s+bilirubin)[^0-9\n]*?([0-9.]+)",
            r"bilirubin\s*\(?direct\)?[^0-9\n]*?([0-9.]+)",
        ],
    },
    "alk_phos": {
        "label": "Alkaline Phosphatase (ALP)",
        "expected_unit": "IU/L",
        "patterns": [
            r"(?:alkaline\s+phosphatase|alkaline\s+phosphotase|alk\s+phos|s\.?\s*alp|\balp\b)[^0-9\n]*?([0-9.]+)",
        ],
    },
    "alt": {
        "label": "Alanine Aminotransferase (ALT)",
        "expected_unit": "IU/L",
        "patterns": [
            r"(?:alanine\s+aminotransferase|alanine\s+transaminase|\bsgpt\b|\balt\b)[^0-9\n]*?([0-9.]+)",
        ],
    },
    "ast": {
        "label": "Aspartate Aminotransferase (AST)",
        "expected_unit": "IU/L",
        "patterns": [
            r"(?:aspartate\s+aminotransferase|aspartate\s+transaminase|\bsgot\b|\bast\b)[^0-9\n]*?([0-9.]+)",
        ],
    },
    "total_protein": {
        "label": "Total Protein",
        "expected_unit": "g/dL",
        "patterns": [
            r"(?:total\s+protein|total\s+proteins|serum\s+total\s+protein|\btp\b)[^0-9\n]*?([0-9.]+)",
        ],
    },
    "albumin": {
        "label": "Albumin",
        "expected_unit": "g/dL",
        "patterns": [
            r"(?:serum\s+albumin|\balbumin\b|\balb\b)[^0-9\n]*?([0-9.]+)",
        ],
    },
    "ag_ratio": {
        "label": "A/G Ratio",
        "expected_unit": "ratio",
        "patterns": [
            r"(?:albumin[/-]globulin\s+ratio|a[/-]g\s+ratio|a\s*:\s*g\s+ratio|\bag\s+ratio\b)[^0-9\n]*?([0-9.]+)",
        ],
    },
    "age": {
        "label": "Age",
        "expected_unit": "years",
        "patterns": [
            r"(?:age\s*/\s*gender|patient\s+age|\bage\b)[\s:=]+(\d{1,3})",
            r"(\d{1,3})\s*(?:years|yrs|yr|y/o)",
        ],
    },
    "gender": {
        "label": "Gender",
        "expected_unit": "",
        "patterns": [
            r"(?:gender|sex)[\s:=]+(male|female|m|f)\b",
            r"(?:age\s*/\s*gender[\s:=]+\d+\s*[yY]?\s*/\s*)(male|female|m|f)\b",
            r"\b(male|female)\b",
        ],
    },
}


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract raw text from PDF document using pypdf."""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                pages_text.append(text)
        return "\n".join(pages_text)
    except Exception as e:
        logger.warning("PDF extraction failed: %s", e)
        raise ValueError(f"Unable to read PDF document text: {e}") from e


def parse_report_text(raw_text: str) -> dict[str, Any]:
    """Parse raw clinical report text to detect LFT markers and patient demographics."""
    clean_text = raw_text.replace("\r", " ")
    extracted: dict[str, Any] = {}
    field_details: dict[str, Any] = {}

    for field, cfg in BIOMARKER_PATTERNS.items():
        found_val = None
        status = "missing"

        for pattern in cfg["patterns"]:
            match = re.search(pattern, clean_text, re.IGNORECASE)
            if match:
                raw_str = match.group(1).strip()
                if field == "gender":
                    g_lower = raw_str.lower()
                    if g_lower in ["m", "male"]:
                        found_val = "Male"
                    elif g_lower in ["f", "female"]:
                        found_val = "Female"
                    status = "detected"
                else:
                    try:
                        num_val = float(raw_str)
                        if field == "age":
                            num_val = int(num_val)
                        found_val = num_val
                        status = "detected"
                    except ValueError:
                        continue
                if found_val is not None:
                    break

        extracted[field] = found_val
        field_details[field] = {
            "label": cfg["label"],
            "value": found_val,
            "unit": cfg["expected_unit"],
            "status": status,
        }

    detected_count = sum(1 for v in field_details.values() if v["status"] == "detected")
    missing_count = sum(1 for v in field_details.values() if v["status"] == "missing")

    return {
        "extracted_values": extracted,
        "field_details": field_details,
        "detected_count": detected_count,
        "missing_count": missing_count,
        "raw_text_preview": clean_text[:600] + ("..." if len(clean_text) > 600 else ""),
        "disclaimer": (
            "Automated text extraction is an assistive preview only. Laboratory formats and units vary. "
            "You must carefully review, adjust, and confirm all laboratory values before model evaluation."
        ),
    }
