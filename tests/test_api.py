"""Tests for FastAPI backend endpoints."""
from fastapi.testclient import TestClient

from src.api import app

client = TestClient(app)


def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["model_loaded"] is True


def test_api_info():
    response = client.get("/api/info")
    assert response.status_code == 200
    data = response.json()
    assert "t_low" in data
    assert "t_high" in data
    assert "reference_ranges" in data
    assert data["t_low"] < data["t_high"]


def test_api_presets():
    response = client.get("/api/presets")
    assert response.status_code == 200
    presets = response.json()
    assert "normal" in presets
    assert "severe" in presets


def test_api_predict_healthy():
    payload = {
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
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "model_score" in data
    assert "risk_band" in data
    assert "feature_explanations" in data
    assert data["risk_band"] in ["Low", "Medium"]


def test_api_predict_severe():
    payload = {
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
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_band"] == "High"
    assert data["model_score"] >= 0.46


def test_api_batch_csv():
    csv_content = """Age,Gender,Total_Bilirubin,Direct_Bilirubin,Alkaline_Phosphotase,Alamine_Aminotransferase,Aspartate_Aminotransferase,Total_Protiens,Albumin,Albumin_and_Globulin_Ratio
30,Female,0.6,0.1,80,20,22,7.2,4.5,1.6
62,Male,10.9,5.5,699,164,200,6.0,2.2,0.6
"""
    files = {"file": ("patients.csv", csv_content, "text/csv")}
    response = client.post("/api/batch", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 2
    assert len(data["records"]) == 2


def test_static_frontend_served():
    response = client.get("/")
    assert response.status_code == 200
    assert "<!doctype html>" in response.text.lower()


def test_api_predict_invalid_gender():
    """Gender must be exactly 'Male' or 'Female'; anything else returns 422."""
    payload = {
        "age": 40,
        "gender": "Unknown",
        "total_bilirubin": 1.0,
        "direct_bilirubin": 0.3,
        "alk_phos": 100,
        "alt": 30,
        "ast": 35,
        "total_protein": 7.0,
        "albumin": 4.0,
        "ag_ratio": 1.3,
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 422


def test_api_predict_direct_exceeds_total():
    """Direct bilirubin > total bilirubin triggers a physiological warning but still returns 200."""
    payload = {
        "age": 40,
        "gender": "Male",
        "total_bilirubin": 0.5,
        "direct_bilirubin": 0.9,  # intentionally > total
        "alk_phos": 100,
        "alt": 30,
        "ast": 35,
        "total_protein": 7.0,
        "albumin": 4.0,
        "ag_ratio": 1.3,
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    warnings = data.get("out_of_bounds_warnings", [])
    assert any("bilirubin" in w.get("feature", "").lower() for w in warnings), (
        "Expected a bilirubin-related warning; got: " + str(warnings)
    )


def test_api_health_fields():
    """Health endpoint must expose groq_configured and model_loaded fields."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "groq_configured" in data
    assert "model_loaded" in data


def test_api_extract_report_unsupported_format():
    """Uploading an unsupported file type must return 415."""
    files = {"file": ("report.xlsx", b"fake xlsx content", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    response = client.post("/api/extract-report", files=files)
    assert response.status_code == 415


def test_api_extract_report_text():
    """Uploading a plain-text lab report returns detected fields."""
    sample_text = (
        b"Patient: Jane Doe\n"
        b"Age: 35  Gender: Female\n"
        b"Total Bilirubin: 1.2 mg/dL\n"
        b"Direct Bilirubin: 0.4 mg/dL\n"
        b"Alkaline Phosphatase: 95 U/L\n"
        b"SGPT (ALT): 28 U/L\n"
        b"SGOT (AST): 31 U/L\n"
        b"Total Protein: 7.1 g/dL\n"
        b"Albumin: 4.2 g/dL\n"
        b"A/G Ratio: 1.5\n"
    )
    files = {"file": ("report.txt", sample_text, "text/plain")}
    response = client.post("/api/extract-report", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "extracted_values" in data
    assert data["detected_count"] > 0
    assert "disclaimer" in data


def test_api_explain_no_key(monkeypatch):
    """When GROQ_API_KEY is absent the explain endpoint returns 503."""
    import src.api as api_module
    monkeypatch.setattr(api_module, "GROQ_API_KEY", None)
    payload = {
        "patient_values": {"age": 40, "gender": "Male"},
        "model_score": 0.38,
        "risk_band": "Medium",
        "feature_explanations": [],
    }
    response = client.post("/api/explain", json=payload)
    assert response.status_code == 503
