"""
ML Model Predictor Service — Patient Churn & Retention Advisor
==============================================================
SHAP-driven churn prediction with driver extraction and retention advice lookup.

DEVIATION from ARCHITECTURE.md:
  Two-model loading: loads churn_model.pkl (raw, for SHAP TreeExplainer) and
  calibrated_model.pkl (CalibratedClassifierCV, for predict_proba). SHAP's
  TreeExplainer does not support CalibratedClassifierCV as input, so the raw
  tree model must be kept separately. See train_model.py for full rationale.
"""

import os
import joblib
import numpy as np
import pandas as pd
import shap
from typing import Dict, List, Tuple, Optional

from schemas.patient import (
    PatientInput,
    FeatureContribution,
    Intervention,
    EngineeredMetrics,
)


class ChurnPredictor:
    """Service to predict patient churn probability, extract SHAP drivers, and map retention advice."""

    def __init__(self):
        self.churn_model = None      # Raw model for SHAP TreeExplainer
        self.calibrated_model = None # Calibrated model for predictions
        self.explainer = None
        self.model_columns = None  # {"features": [...], "categorical": [...]}
        self.model_meta = None     # {"model_name": ..., "cv_auc": ..., "test_auc": ...}
        self.advice_map = {}
        self._loaded = False

    def load(self, model_dir: str = None):
        """Load pickled artifacts and build SHAP explainer."""
        if model_dir is None:
            model_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "ml_model",
            )

        self.churn_model = joblib.load(os.path.join(model_dir, "churn_model.pkl"))
        self.model_columns = joblib.load(os.path.join(model_dir, "model_columns.pkl"))
        self.model_meta = joblib.load(os.path.join(model_dir, "model_meta.pkl"))
        self.advice_map = joblib.load(os.path.join(model_dir, "advice_map.pkl"))

        # Load calibrated model for predictions (if available, else fall back to raw)
        calibrated_path = os.path.join(model_dir, "calibrated_model.pkl")
        if os.path.exists(calibrated_path):
            self.calibrated_model = joblib.load(calibrated_path)
        else:
            self.calibrated_model = self.churn_model

        # Build SHAP explainer once at startup — works for HGB/XGB/LGBM (raw model only)
        self.explainer = shap.TreeExplainer(self.churn_model)

        self._loaded = True

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def feature_names(self) -> List[str]:
        return self.model_columns["features"]

    @property
    def categorical_cols(self) -> List[str]:
        return self.model_columns["categorical"]

    def _cast_categories(self, df: pd.DataFrame) -> pd.DataFrame:
        """Cast categorical columns to pandas category dtype, consistent with training.
        Replaces NaN with sentinel '__MISSING__' matching train-time encoding.
        """
        df = df.copy()
        for col in self.categorical_cols:
            if col in df.columns:
                df[col] = df[col].fillna("__MISSING__").astype("category")
        return df

    def _encode_for_shap(self, df: pd.DataFrame) -> pd.DataFrame:
        """Encode category columns as integer codes for SHAP (which needs numpy-compatible input)."""
        df_enc = df.copy()
        for col in self.categorical_cols:
            if col in df_enc.columns and df_enc[col].dtype.name == "category":
                df_enc[col] = df_enc[col].cat.codes
        return df_enc

    def _build_dataframe(self, patient: PatientInput) -> pd.DataFrame:
        """Convert PatientInput into model feature vector."""
        engagement_score = patient.visits_last_year - patient.missed_appointments
        cost_per_visit = patient.avg_out_of_pocket_cost / (patient.visits_last_year + 1)
        satisfaction_avg = (
            patient.overall_satisfaction
            + patient.wait_time_satisfaction
            + patient.staff_satisfaction
        ) / 3

        row = {
            "Age": patient.age,
            "Tenure_Months": patient.tenure_months,
            "Visits_Last_Year": patient.visits_last_year,
            "Missed_Appointments": patient.missed_appointments,
            "Days_Since_Last_Visit": patient.days_since_last_visit,
            "Overall_Satisfaction": patient.overall_satisfaction,
            "Wait_Time_Satisfaction": patient.wait_time_satisfaction,
            "Staff_Satisfaction": patient.staff_satisfaction,
            "Provider_Rating": patient.provider_rating,
            "Avg_Out_Of_Pocket_Cost": patient.avg_out_of_pocket_cost,
            "Billing_Issues": patient.billing_issues,
            "Portal_Usage": patient.portal_usage,
            "Referrals_Made": patient.referrals_made,
            "Distance_To_Facility_Miles": patient.distance_to_facility,
            "Engagement_Score": engagement_score,
            "Cost_Per_Visit": cost_per_visit,
            "Satisfaction_Avg": satisfaction_avg,
            "Gender": patient.gender,
            "State": patient.state,
            "Specialty": patient.specialty,
            "Insurance_Type": patient.insurance_type,
        }
        df = pd.DataFrame([row])
        df = df.reindex(columns=self.feature_names, fill_value=0)
        return self._cast_categories(df)

    @staticmethod
    def _classify_risk(probability: float) -> Tuple[str, str]:
        """Classify into High / Medium / Low risk tier."""
        if probability >= 0.65:
            return "High", "risk-high"
        elif probability >= 0.45:
            return "Medium", "risk-medium"
        else:
            return "Low", "risk-low"

    def compute_shap_drivers(self, X_row: pd.DataFrame) -> List[Dict]:
        """Compute top-3 SHAP drivers for a single row. Returns list of {feature, shap_value}."""
        X_enc = self._encode_for_shap(X_row)
        shap_values = self.explainer.shap_values(X_enc)
        # shap_values shape: (1, n_features) for single row
        vals = shap_values[0] if shap_values.ndim > 1 else shap_values
        top3 = sorted(zip(self.feature_names, vals), key=lambda x: -abs(x[1]))[:3]
        return [{"feature": f, "shap_value": round(float(v), 4)} for f, v in top3]

    def _get_advice_for_driver(self, feature_name: str) -> Dict:
        """Look up retention advice for a SHAP driver feature."""
        return self.advice_map.get(feature_name, self.advice_map.get("DEFAULT", {
            "program": "General Retention",
            "action": "Personalized retention outreach",
            "detail": "Conduct a personalized outreach to understand the patient's specific concerns.",
        }))

    def _enrich_drivers_with_advice(self, drivers: List[Dict]) -> List[Dict]:
        """Attach retention advice to each SHAP driver."""
        enriched = []
        for d in drivers:
            advice = self._get_advice_for_driver(d["feature"])
            enriched.append({**d, "advice": advice})
        return enriched

    def predict(self, patient: PatientInput) -> Dict:
        """Run complete prediction pipeline for a single patient."""
        df = self._build_dataframe(patient)
        probability = float(self.calibrated_model.predict_proba(df)[0][1])
        percentage = round(probability * 100, 1)
        risk_level, risk_class = self._classify_risk(probability)
        drivers = self._enrich_drivers_with_advice(self.compute_shap_drivers(df))

        return {
            "probability": round(probability, 4),
            "percentage": percentage,
            "risk_level": risk_level,
            "risk_class": risk_class,
            "drivers": drivers,
            "metrics": self.compute_metrics(patient),
            "feature_contributions": self.compute_feature_contributions(patient),
            "interventions": self.compute_interventions(patient),
        }

    def predict_batch(self, df_raw: pd.DataFrame) -> Dict:
        """Batch prediction with SHAP driver extraction.

        For <= 2000 rows: full per-row SHAP.
        For > 2000 rows: SHAP top-500 by probability + random 500; rest get global_top_driver.
        Returns dict with results, sampled flag, sample_size.
        """
        df = df_raw.copy()

        # Feature engineering
        df["Engagement_Score"] = df["Visits_Last_Year"] - df["Missed_Appointments"]
        df["Cost_Per_Visit"] = df["Avg_Out_Of_Pocket_Cost"] / (df["Visits_Last_Year"] + 1)
        df["Satisfaction_Avg"] = (
            df["Overall_Satisfaction"]
            + df["Wait_Time_Satisfaction"]
            + df["Staff_Satisfaction"]
        ) / 3

        X = df.reindex(columns=self.feature_names, fill_value=0)
        X = self._cast_categories(X)

        # Predict probabilities (model handles category dtype natively)
        probabilities = self.calibrated_model.predict_proba(X)[:, 1]

        # Encode categories as int codes for SHAP (needs numpy-compatible input)
        X_enc = self._encode_for_shap(X)

        n_rows = len(df)
        sampled = False
        sample_size = None

        if n_rows <= 2000:
            # Full SHAP for every row
            all_shap = self.explainer.shap_values(X_enc)
            row_drivers = []
            for i in range(n_rows):
                vals = all_shap[i] if all_shap.ndim > 1 else all_shap
                top3 = sorted(zip(self.feature_names, vals), key=lambda x: -abs(x[1]))[:3]
                row_drivers.append([{"feature": f, "shap_value": round(float(v), 4)} for f, v in top3])
        else:
            # Stratified sampling: top 500 by probability + random 500 from rest
            sampled = True
            sample_size = 1000

            prob_indices = np.argsort(probabilities)[::-1]  # descending by probability
            top_500 = prob_indices[:500]
            remaining = prob_indices[500:]
            random_500 = np.random.RandomState(42).choice(
                remaining, size=min(500, len(remaining)), replace=False
            )
            sample_indices = np.concatenate([top_500, random_500])

            X_sample = X_enc.iloc[sample_indices]
            shap_sample = self.explainer.shap_values(X_sample)

            # Compute global top driver from sample (mean abs SHAP)
            mean_abs = np.mean(np.abs(shap_sample), axis=0)
            global_top_idx = np.argmax(mean_abs)
            global_top_driver = {
                "feature": self.feature_names[global_top_idx],
                "shap_value": round(float(mean_abs[global_top_idx]), 4),
            }

            # Build per-row drivers for sampled rows
            sample_drivers = {}
            for i, idx in enumerate(sample_indices):
                vals = shap_sample[i] if shap_sample.ndim > 1 else shap_sample
                top3 = sorted(zip(self.feature_names, vals), key=lambda x: -abs(x[1]))[:3]
                sample_drivers[idx] = [{"feature": f, "shap_value": round(float(v), 4)} for f, v in top3]

            # Assign drivers to all rows
            row_drivers = []
            for i in range(n_rows):
                if i in sample_drivers:
                    row_drivers.append(sample_drivers[i])
                else:
                    row_drivers.append([global_top_driver])

        # Build results
        results = []
        for idx in range(n_rows):
            prob = float(probabilities[idx])
            pct = round(prob * 100, 1)
            risk_level, _ = self._classify_risk(prob)

            patient_id = str(df_raw.iloc[idx].get("PatientID", f"P-{idx+1}")) if "PatientID" in df_raw.columns else f"P-{idx+1}"

            enriched_drivers = self._enrich_drivers_with_advice(row_drivers[idx])

            results.append({
                "index": idx,
                "patient_id": patient_id,
                "probability": round(prob, 4),
                "percentage": pct,
                "risk_level": risk_level,
                "drivers": enriched_drivers,
            })

        return {
            "results": results,
            "sampled": sampled,
            "sample_size": sample_size,
        }

    @staticmethod
    def compute_feature_contributions(patient: PatientInput) -> List[FeatureContribution]:
        """Compute relative risk contributions (legacy compatibility — SHAP drivers replace this)."""
        vals = {
            "Days Since Last Visit": min(patient.days_since_last_visit / 730, 1),
            "Low Satisfaction": 1 - min((patient.overall_satisfaction - 1) / 4, 1),
            "Distance (miles)": min(patient.distance_to_facility / 50, 1),
            "High Out-of-Pocket": min(patient.avg_out_of_pocket_cost / 1999, 1),
            "Short Tenure": 1 - min(patient.tenure_months / 120, 1),
            "Missed Appointments": min(patient.missed_appointments / 8, 1),
        }
        return [
            FeatureContribution(factor=k, risk_impact=round(v, 4))
            for k, v in sorted(vals.items(), key=lambda x: x[1])
        ]

    @staticmethod
    def compute_interventions(patient: PatientInput) -> List[Intervention]:
        """Contextual interventions."""
        items: List[Intervention] = []
        if patient.days_since_last_visit > 180:
            items.append(Intervention(icon="📞", text="Schedule proactive outreach call", priority="high"))
        if patient.overall_satisfaction < 2.5:
            items.append(Intervention(icon="🎧", text="Assign patient advocate", priority="high"))
        if patient.billing_issues == 1:
            items.append(Intervention(icon="💰", text="Connect with financial counseling", priority="high"))
        if patient.missed_appointments > 3:
            items.append(Intervention(icon="📱", text="Offer telehealth options", priority="high"))
        if patient.portal_usage == 0:
            items.append(Intervention(icon="🖥️", text="Promote patient portal enrollment", priority="medium"))
        if patient.distance_to_facility > 25:
            items.append(Intervention(icon="🚗", text="Suggest closer satellite facility", priority="medium"))
        if patient.visits_last_year < 2:
            items.append(Intervention(icon="📅", text="Send preventive care reminders", priority="medium"))
        if not items:
            items.append(Intervention(icon="✅", text="Continue standard engagement protocols", priority="low"))
        return items

    @staticmethod
    def compute_metrics(patient: PatientInput) -> EngineeredMetrics:
        """Compute engineered metrics."""
        return EngineeredMetrics(
            engagement_score=patient.visits_last_year - patient.missed_appointments,
            satisfaction_avg=round(
                (patient.overall_satisfaction + patient.wait_time_satisfaction + patient.staff_satisfaction) / 3, 2
            ),
            cost_per_visit=round(patient.avg_out_of_pocket_cost / (patient.visits_last_year + 1), 2),
            visit_frequency=patient.visits_last_year,
        )


predictor = ChurnPredictor()
