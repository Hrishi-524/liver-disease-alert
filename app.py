"""Streamlit Web Application for Liver Disease Risk Prediction."""
import warnings

warnings.filterwarnings("ignore")

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import streamlit as st

from src.config import FEATURE_COLUMNS, MODEL_PATH
from src.explain import explain_single_patient

st.set_page_config(
    page_title="Liver Disease Risk Decision-Support Tool",
    page_icon="🩺",
    layout="wide",
    initial_sidebar_state="expanded",
)


@st.cache_resource
def load_artifact():
    return joblib.load(MODEL_PATH)


artifact = load_artifact()
pipeline = artifact["pipeline"]
t_low = artifact["t_low"]
t_high = artifact["t_high"]
feat_ranges = artifact["feature_ranges"]

# Header and Clinical Disclaimer Banner
st.title("🩺 Liver Disease Risk Decision-Support Tool")
st.warning(
    "⚠️ **Educational and Research Decision-Support Tool Only.** "
    "This tool is NOT a medical diagnostic device. It outputs a statistical similarity score based on the "
    "Indian Liver Patient Dataset (ILPD), not an individual's actual clinical risk. "
    "Never make clinical treatment decisions without a certified medical professional."
)

tab_single, tab_batch, tab_card = st.tabs(["Patient Assessment", "Batch CSV Screening", "Model Card & Evidence"])

with tab_single:
    col_input, col_result = st.columns([1, 1.2], gap="large")

    with col_input:
        st.subheader("📋 Routine Blood Test & Patient Values")
        
        # Quick Presets
        st.write("**Quick Example Presets:**")
        c1, c2, c3 = st.columns(3)
        preset = None
        if c1.button("🟢 Normal Profile", use_container_width=True):
            preset = "normal"
        if c2.button("🟡 Borderline", use_container_width=True):
            preset = "borderline"
        if c3.button("🔴 Severe Profile", use_container_width=True):
            preset = "severe"

        # Preset values
        default_vals = {
            "age": 45, "gender": "Male", "tb": 0.8, "db": 0.2, "alp": 120,
            "alt": 28, "ast": 32, "tp": 7.0, "alb": 4.0, "ag": 1.3
        }
        if preset == "normal":
            default_vals = {
                "age": 32, "gender": "Female", "tb": 0.6, "db": 0.1, "alp": 85,
                "alt": 22, "ast": 24, "tp": 7.4, "alb": 4.5, "ag": 1.6
            }
        elif preset == "borderline":
            default_vals = {
                "age": 52, "gender": "Male", "tb": 1.4, "db": 0.5, "alp": 180,
                "alt": 48, "ast": 55, "tp": 6.4, "alb": 3.4, "ag": 1.1
            }
        elif preset == "severe":
            default_vals = {
                "age": 62, "gender": "Male", "tb": 10.9, "db": 5.5, "alp": 699,
                "alt": 164, "ast": 200, "tp": 6.0, "alb": 2.2, "ag": 0.6
            }

        with st.form("patient_form"):
            f_col1, f_col2 = st.columns(2)
            with f_col1:
                age = st.number_input("Age (years)", 1, 110, default_vals["age"], help="Typical adult age: 18-80")
                gender = st.selectbox("Gender", ["Male", "Female"], index=0 if default_vals["gender"] == "Male" else 1)
                tb = st.number_input("Total Bilirubin (mg/dL)", 0.0, 80.0, float(default_vals["tb"]), step=0.1, help="Normal: 0.1 - 1.2 mg/dL")
                db = st.number_input("Direct Bilirubin (mg/dL)", 0.0, 30.0, float(default_vals["db"]), step=0.1, help="Normal: 0.0 - 0.3 mg/dL")
                alp = st.number_input("Alkaline Phosphatase (IU/L)", 10, 3000, int(default_vals["alp"]), help="Normal: 44 - 147 IU/L")
            with f_col2:
                alt = st.number_input("ALT / SGPT (IU/L)", 5, 3000, int(default_vals["alt"]), help="Normal: 7 - 56 IU/L")
                ast = st.number_input("AST / SGOT (IU/L)", 5, 5000, int(default_vals["ast"]), help="Normal: 10 - 40 IU/L")
                tp = st.number_input("Total Protein (g/dL)", 1.0, 15.0, float(default_vals["tp"]), step=0.1, help="Normal: 6.0 - 8.3 g/dL")
                alb = st.number_input("Albumin (g/dL)", 0.5, 8.0, float(default_vals["alb"]), step=0.1, help="Normal: 3.5 - 5.0 g/dL")
                ag = st.number_input("A/G Ratio", 0.1, 5.0, float(default_vals["ag"]), step=0.05, help="Normal: 1.1 - 2.5")

            submit = st.form_submit_button("Analyze Profile", use_container_width=True)

    with col_result:
        st.subheader("📊 Model Assessment & Explainability")
        
        # Build patient input DataFrame
        patient_df = pd.DataFrame([{
            "age": age,
            "gender": gender,
            "total_bilirubin": tb,
            "direct_bilirubin": db,
            "alk_phos": alp,
            "alt": alt,
            "ast": ast,
            "total_protein": tp,
            "albumin": alb,
            "ag_ratio": ag,
        }])

        p_score = float(pipeline.predict_proba(patient_df)[0, 1])

        # Risk band determination based on calibrated thresholds
        if p_score >= t_high:
            band = "High"
            band_color = "red"
            band_desc = f"Score exceeds high-specificity threshold ({t_high:.1%}). Profile matches typical liver patient presentations."
        elif p_score >= t_low:
            band = "Medium"
            band_color = "orange"
            band_desc = f"Score falls between sensitivity threshold ({t_low:.1%}) and high-specificity threshold ({t_high:.1%})."
        else:
            band = "Low"
            band_color = "green"
            band_desc = f"Score is below the screening threshold ({t_low:.1%}). Resembles non-liver reference profiles in dataset."

        st.metric(
            label="Model Score (Dataset-Based Similarity)",
            value=f"{p_score:.1%}",
            delta=f"{band} Risk Band",
            delta_color="inverse" if band == "High" else "normal",
        )
        st.progress(min(max(p_score, 0.0), 1.0))
        st.caption(band_desc)

        # Check empirical 1st-99th percentile bounds from training data
        out_of_range_warnings = []
        for col_name in feat_ranges:
            val = patient_df.iloc[0][col_name]
            p01 = feat_ranges[col_name][0.01]
            p99 = feat_ranges[col_name][0.99]
            if val < p01 or val > p99:
                out_of_range_warnings.append(
                    f"**{col_name}** ({val}) is outside the training data 1st-99th percentile range [{p01:.1f}, {p99:.1f}]."
                )

        if out_of_range_warnings:
            with st.expander("⚠️ Out-of-Distribution Warning", expanded=True):
                st.write("Some inputs are unusual compared to the training cohort (predictions may be less reliable):")
                for w in out_of_range_warnings:
                    st.markdown(f"- {w}")

        # Local SHAP Explainability
        st.markdown("#### Top Contributing Features (SHAP Attribution)")
        explanations = explain_single_patient(pipeline, patient_df, top_k=5)
        
        feat_labels = [f"{item['feature']} ({item['raw_value']})" for item in explanations]
        shap_vals = [item["shap_value"] for item in explanations]
        colors = ["#ef4444" if v > 0 else "#10b981" for v in shap_vals]

        fig, ax = plt.subplots(figsize=(6, 3))
        y_pos = np.arange(len(feat_labels))
        ax.barh(y_pos, shap_vals, color=colors, align="center")
        ax.set_yticks(y_pos)
        ax.set_yticklabels(feat_labels)
        ax.invert_yaxis()
        ax.axvline(0, color="gray", linestyle="--", linewidth=0.8)
        ax.set_xlabel("Attribution on Score (Red = increased risk, Green = protective)")
        plt.tight_layout()
        st.pyplot(fig)
        plt.close()

        for item in explanations[:3]:
            st.markdown(f"- **{item['feature']}**: {item['direction']} (SHAP: {item['shap_value']:+.3f})")

with tab_batch:
    st.subheader("📁 Batch Patient CSV Screening")
    uploaded_file = st.file_uploader("Upload CSV containing patient blood tests", type=["csv"])
    if uploaded_file is not None:
        batch_df = pd.read_csv(uploaded_file)
        st.write(f"Loaded {len(batch_df)} patient records.")
        try:
            from src.data import standardise
            std_batch = standardise(batch_df)
            req = [c for c in FEATURE_COLUMNS if c in std_batch.columns]
            if len(req) == len(FEATURE_COLUMNS):
                preds = pipeline.predict_proba(std_batch[FEATURE_COLUMNS])[:, 1]
                std_batch["model_score"] = np.round(preds, 4)
                std_batch["risk_band"] = [
                    "High" if p >= t_high else "Medium" if p >= t_low else "Low" for p in preds
                ]
                st.dataframe(std_batch[["age", "gender", "total_bilirubin", "alt", "ast", "model_score", "risk_band"]])
                csv_bytes = std_batch.to_csv(index=False).encode("utf-8")
                st.download_button("Download Annotated Results", csv_bytes, "liver_screened_results.csv", "text/csv")
            else:
                st.error(f"Missing required columns. Expected: {FEATURE_COLUMNS}")
        except Exception as e:
            st.error(f"Failed to process CSV: {e!s}")

with tab_card:
    st.subheader("📖 Model Card & Scientific Documentation")
    st.markdown("""
    ### Intended Use
    This application is an educational decision-support demonstration tool designed to illustrate how machine learning
    models can interpret routine liver function tests (LFTs).
    
    ### Dataset & Limitations
    - **Dataset**: Indian Liver Patient Dataset (ILPD) from North-East Andhra Pradesh, India (583 records).
    - **Class Balance**: 71.4% liver patients, 28.6% non-liver patients (patients with non-liver illnesses).
    - **Prevalence Warning**: The 71% disease rate reflects the hospital collection cohort, not general population prevalence.
    - **Demographic Scope**: Single geographic region; may not generalize across different populations without local recalibration.
    
    ### Test Metrics (Untouched Test Holdout)
    - **ROC-AUC**: 0.8085 (95% Bootstrap CI: 0.7271 - 0.8855)
    - **Average Precision**: 0.9288 (95% CI: 0.8851 - 0.9617)
    - **Sensitivity / Recall @ t_low**: 86.4% (95% CI: 78.9% - 94.0%)
    - **Brier Score**: 0.1758
    """)
