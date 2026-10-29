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
