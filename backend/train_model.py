"""
ML Model Training Script — Patient Churn & Retention Advisor
============================================================
Trains the best model from a 3-model gradient boosting bakeoff:
  - HistGradientBoostingClassifier (sklearn)
  - XGBClassifier (xgboost, optional)
  - LGBMClassifier (lightgbm, optional)

Saves artifacts to backend/ml_model/:
  - churn_model.pkl       — winning fitted model (RAW, for SHAP TreeExplainer)
  - calibrated_model.pkl  — CalibratedClassifierCV wrapper (for predict_proba)
  - model_columns.pkl     — {"features": [...], "categorical": [...]}
  - model_meta.pkl        — {"model_name": ..., "cv_auc": ..., "test_auc": ...}
  - advice_map.pkl        — hand-written retention advice keyed by feature name

DEVIATION from ARCHITECTURE.md:
  Two-model artifact split (churn_model.pkl + calibrated_model.pkl).
  The architecture doc specified a single churn_model.pkl. However, SHAP's
  TreeExplainer requires the raw tree ensemble structure and does not support
  CalibratedClassifierCV as an input model type. Solution: save the raw model
  for SHAP (churn_model.pkl) and a separate calibrated wrapper for probability
  prediction (calibrated_model.pkl). The predictor loads both — raw for SHAP,
  calibrated for predict_proba. This is a necessary deviation, not an optional
  enhancement: without it, either SHAP explanations break or probability outputs
  remain uncalibrated.

  NaN-categorical sentinel: training data has zero NaN in categorical columns,
  so the model's internal OrdinalEncoder never learned NaN as a valid category.
  At inference, missing categorical values from messy CSVs caused ValueError.
  Fix: replace NaN with sentinel string "__MISSING__" via fillna() at both train
  and inference time. This is a sentinel category, not imputation — no values
  are invented, NaN is explicitly represented as a distinct category.
"""

import os
import warnings
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import roc_auc_score
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False
    warnings.warn("xgboost not installed — excluding from bakeoff")

try:
    from lightgbm import LGBMClassifier
    HAS_LGBM = True
except ImportError:
    HAS_LGBM = False
    warnings.warn("lightgbm not installed — excluding from bakeoff")


CATEGORICAL_COLS = ["Gender", "State", "Specialty", "Insurance_Type"]

FEATURE_COLS = [
    "Age", "Tenure_Months", "Visits_Last_Year", "Missed_Appointments",
    "Days_Since_Last_Visit", "Overall_Satisfaction", "Wait_Time_Satisfaction",
    "Staff_Satisfaction", "Provider_Rating", "Avg_Out_Of_Pocket_Cost",
    "Billing_Issues", "Portal_Usage", "Referrals_Made", "Distance_To_Facility_Miles",
    "Engagement_Score", "Cost_Per_Visit", "Satisfaction_Avg",
    "Gender", "State", "Specialty", "Insurance_Type",
]

# ── Hand-written retention advice keyed by feature name (SHAP driver) ────────
DRIVER_ADVICE = {
    "Avg_Out_Of_Pocket_Cost": {
        "program": "Financial Counseling",
        "action": "Offer payment plan / cost review",
        "detail": "Schedule a financial counseling session to review out-of-pocket costs, explore payment plan options, and check eligibility for financial assistance or lower-cost insurance plans.",
    },
    "Cost_Per_Visit": {
        "program": "Financial Counseling",
        "action": "Review per-visit cost burden",
        "detail": "Analyze cost-per-visit trends and offer bundled visit pricing, reduced co-pay programs, or sliding-scale fee arrangements.",
    },
    "Overall_Satisfaction": {
        "program": "Care Outreach",
        "action": "Trigger satisfaction-recovery call",
        "detail": "A care coordinator should reach out to review recent visit notes, identify service gaps, and offer a recovery gesture (e.g., fee waiver, priority booking).",
    },
    "Wait_Time_Satisfaction": {
        "program": "Access Improvement",
        "action": "Offer priority scheduling / telehealth",
        "detail": "Address wait-time frustration by offering early-morning, late-evening, or same-day appointment slots, or redirect to telehealth visits.",
    },
    "Staff_Satisfaction": {
        "program": "Service Recovery",
        "action": "Staff feedback review and follow-up",
        "detail": "Review patient feedback about staff interactions, share with the care team, and schedule a follow-up with a senior staff member to rebuild trust.",
    },
    "Provider_Rating": {
        "program": "Provider Matching",
        "action": "Offer provider switch or second opinion",
        "detail": "If the patient rates their provider low, offer the option to switch to a different provider or schedule a second-opinion consultation.",
    },
    "Missed_Appointments": {
        "program": "Adherence Support",
        "action": "Enroll in appointment reminders + transport assist",
        "detail": "Set up automated multi-channel reminders (SMS, email, phone), investigate barriers to attendance, and offer transportation assistance if needed.",
    },
    "Billing_Issues": {
        "program": "Billing Resolution",
        "action": "Proactive billing audit and resolution",
        "detail": "Audit the patient's recent bills for errors, resolve any open disputes, and provide a clear itemized statement with a direct billing contact.",
    },
    "Portal_Usage": {
        "program": "Digital Engagement",
        "action": "Portal onboarding / re-engagement",
        "detail": "Offer a guided portal walkthrough, highlight self-scheduling and messaging features, and send periodic tips to increase digital engagement.",
    },
    "Days_Since_Last_Visit": {
        "program": "Re-Engagement",
        "action": "Outreach call for lapsed patients",
        "detail": "For patients with increasing recency gaps, trigger a personalized outreach call or email with relevant health reminders and easy rebooking links.",
    },
    "Distance_To_Facility_Miles": {
        "program": "Access Expansion",
        "action": "Offer telehealth or closer satellite clinic",
        "detail": "For patients far from the facility, promote telehealth visits or redirect to a nearer satellite clinic or partner location.",
    },
    "Visits_Last_Year": {
        "program": "Utilization Monitoring",
        "action": "Review visit frequency pattern",
        "detail": "Monitor whether visit frequency is declining and proactively schedule wellness or follow-up visits to maintain engagement.",
    },
    "Tenure_Months": {
        "program": "Loyalty Program",
        "action": "Acknowledge long-term patients",
        "detail": "Recognize long-tenure patients with loyalty gestures (e.g., annual wellness gift, priority scheduling) to reinforce commitment.",
    },
    "Age": {
        "program": "Age-Appropriate Care",
        "action": "Tailor outreach to age group",
        "detail": "Customize communication and service offerings based on the patient's age group (e.g., pediatric, adult, geriatric programs).",
    },
    "Engagement_Score": {
        "program": "Adherence Support",
        "action": "Address engagement decline",
        "detail": "Low engagement scores predict churn — investigate root causes (access, satisfaction, cost) and deploy targeted re-engagement campaigns.",
    },
    "Satisfaction_Avg": {
        "program": "Care Outreach",
        "action": "Composite satisfaction review",
        "detail": "When overall composite satisfaction is the top driver, schedule a comprehensive care review covering clinical, staff, and experience dimensions.",
    },
    "Referrals_Made": {
        "program": "Continuity of Care",
        "action": "Follow up on open referrals",
        "detail": "Check whether referrals were completed and provide assistance scheduling specialist visits to prevent gaps in care continuity.",
    },
    "Gender": {
        "program": "Personalized Outreach",
        "action": "Gender-appropriate health campaigns",
        "detail": "Ensure the patient receives relevant health campaigns and screenings aligned with their gender-specific preventive care guidelines.",
    },
    "State": {
        "program": "Regional Programs",
        "action": "Connect to local health initiatives",
        "detail": "Link the patient to state or regional health programs, community resources, and local wellness initiatives relevant to their area.",
    },
    "Specialty": {
        "program": "Specialty Navigation",
        "action": "Ensure specialty care access",
        "detail": "Verify the patient has adequate access to their needed specialty and offer alternative specialty providers if wait times are excessive.",
    },
    "Insurance_Type": {
        "program": "Coverage Optimization",
        "action": "Review insurance plan fit",
        "detail": "Assess whether the patient's insurance plan adequately covers their utilized services and guide them toward better-fitting plan options during open enrollment.",
    },
    "DEFAULT": {
        "program": "General Retention",
        "action": "Personalized retention outreach",
        "detail": "Conduct a personalized outreach to understand the patient's specific concerns and deploy a tailored retention strategy based on their care profile.",
    },
}


def train():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(
        os.path.dirname(base_dir), "data", "patient_churn_dataset_enriched.csv"
    )
    ml_model_dir = os.path.join(base_dir, "ml_model")
    os.makedirs(ml_model_dir, exist_ok=True)

    print(f"[1/5] Loading dataset from: {data_path}")
    df = pd.read_csv(data_path)
    print(f"       Dataset shape: {df.shape}")

    # Feature Engineering
    df["Engagement_Score"] = df["Visits_Last_Year"] - df["Missed_Appointments"]
    df["Cost_Per_Visit"] = df["Avg_Out_Of_Pocket_Cost"] / (df["Visits_Last_Year"] + 1)
    df["Satisfaction_Avg"] = (
        df["Overall_Satisfaction"]
        + df["Wait_Time_Satisfaction"]
        + df["Staff_Satisfaction"]
    ) / 3

    X_raw = df[FEATURE_COLS].copy()
    y = df["Churned"]

    # Cast categorical columns to pandas category dtype — no one-hot encoding
    # Replace NaN with sentinel so model learns to handle missing categoricals
    for col in CATEGORICAL_COLS:
        X_raw[col] = X_raw[col].fillna("__MISSING__").astype("category")

    # Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X_raw, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"[2/5] Train: {len(X_train)} | Test: {len(X_test)}")

    # ── 3-model bakeoff ──────────────────────────────────────────────────────
    models = {
        "HistGradientBoosting": HistGradientBoostingClassifier(
            max_iter=300, learning_rate=0.05, max_depth=6, random_state=42,
        ),
    }
    if HAS_XGB:
        models["XGBoost"] = XGBClassifier(
            n_estimators=300, learning_rate=0.05, max_depth=6, random_state=42,
            enable_categorical=True, tree_method="hist", eval_metric="auc",
        )
    if HAS_LGBM:
        models["LightGBM"] = LGBMClassifier(
            n_estimators=300, learning_rate=0.05, max_depth=6, random_state=42,
            verbose=-1,
        )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_results = {}

    print(f"\n[3/5] Running {len(models)}-model bakeoff...")
    print(f"{'Model':<25} | {'Mean CV AUC':<12} | {'Test AUC':<10}")
    print("-" * 55)

    for name, model in models.items():
        cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="roc_auc")
        mean_cv_auc = cv_scores.mean()
        model.fit(X_train, y_train)
        test_auc = roc_auc_score(y_test, model.predict_proba(X_test)[:, 1])
        cv_results[name] = {"model": model, "cv_auc": mean_cv_auc, "test_auc": test_auc}
        print(f"{name:<25} | {mean_cv_auc:<12.4f} | {test_auc:<10.4f}")

    # Pick winner: max(cv_auc), ties broken by test_auc
    winner_name = max(cv_results, key=lambda k: (cv_results[k]["cv_auc"], cv_results[k]["test_auc"]))
    winner = cv_results[winner_name]
    print(f"\n  WINNER: {winner_name} (CV AUC={winner['cv_auc']:.4f}, Test AUC={winner['test_auc']:.4f})")

    # ── Train winner on FULL dataset, calibrate, and save ──────────────────────
    print(f"\n[4/5] Training {winner_name} on full dataset ({len(X_raw)} rows)...")
    winner["model"].fit(X_raw, y)

    # Save raw model for SHAP (TreeExplainer requires the raw tree model)
    joblib.dump(winner["model"], os.path.join(ml_model_dir, "churn_model.pkl"))

    # Wrap with CalibratedClassifierCV for well-calibrated probability output
    print(f"       Calibrating probabilities with CalibratedClassifierCV (ensemble=True)...")
    calibrated_model = CalibratedClassifierCV(winner["model"], method="isotonic", cv=5, ensemble=True)
    calibrated_model.fit(X_raw, y)

    # Verify calibration improved distribution
    cal_probs = calibrated_model.predict_proba(X_raw)[:, 1]
    print(f"       Post-calibration probability distribution:")
    print(f"         Mean:   {np.mean(cal_probs):.3f}")
    print(f"         Median: {np.median(cal_probs):.3f}")
    print(f"         P25:    {np.percentile(cal_probs, 25):.3f}")
    print(f"         P75:    {np.percentile(cal_probs, 75):.3f}")

    # Save calibrated model separately for prediction (SHAP uses churn_model.pkl)
    joblib.dump(calibrated_model, os.path.join(ml_model_dir, "calibrated_model.pkl"))

    # Save model columns as dict: features + categorical list
    model_columns = {"features": FEATURE_COLS, "categorical": CATEGORICAL_COLS}
    joblib.dump(model_columns, os.path.join(ml_model_dir, "model_columns.pkl"))

    # Save model metadata
    model_meta = {
        "model_name": f"{winner_name} (Calibrated)",
        "cv_auc": round(winner["cv_auc"], 4),
        "test_auc": round(winner["test_auc"], 4),
    }
    joblib.dump(model_meta, os.path.join(ml_model_dir, "model_meta.pkl"))

    # Save re-keyed advice map (keyed by feature name, not Churn_Reason string)
    joblib.dump(DRIVER_ADVICE, os.path.join(ml_model_dir, "advice_map.pkl"))

    # Delete old reason model artifacts if they exist
    for old_file in ["reason_model.pkl", "reason_encoder.pkl"]:
        old_path = os.path.join(ml_model_dir, old_file)
        if os.path.exists(old_path):
            os.remove(old_path)
            print(f"       Deleted old artifact: {old_file}")

    print(f"\n[5/5] Artifacts saved to: {ml_model_dir}")
    print(f"       churn_model.pkl    — {winner_name}")
    print(f"       model_columns.pkl  — {len(FEATURE_COLS)} features, {len(CATEGORICAL_COLS)} categorical")
    print(f"       model_meta.pkl     — cv_auc={model_meta['cv_auc']}, test_auc={model_meta['test_auc']}")
    print(f"       advice_map.pkl     — {len(DRIVER_ADVICE)} entries (feature-keyed)")
    print(f"\n[OK] Training complete.")


if __name__ == "__main__":
    train()
