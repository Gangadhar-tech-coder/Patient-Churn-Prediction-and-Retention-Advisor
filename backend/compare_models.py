"""
Model Comparison & Accuracy Benchmark Script — Patient Churn Predictor
=======================================================================
Compares exactly 3 gradient-boosting models that support native categoricals + NaN:
1. HistGradientBoostingClassifier (sklearn)
2. XGBClassifier (xgboost)
3. LGBMClassifier (lightgbm)

Evaluates: 5-fold StratifiedKFold CV AUC + held-out test AUC.
Winner = max(mean_cv_auc), ties broken by held-out AUC.
Results saved to data/model_comparison_benchmark.csv.
"""

import os
import time
import warnings
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import roc_auc_score
from sklearn.ensemble import HistGradientBoostingClassifier

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False
    warnings.warn("xgboost not installed — skipping XGBClassifier in benchmark")

try:
    from lightgbm import LGBMClassifier
    HAS_LGBM = True
except ImportError:
    HAS_LGBM = False
    warnings.warn("lightgbm not installed — skipping LGBMClassifier in benchmark")


CATEGORICAL_COLS = ["Gender", "State", "Specialty", "Insurance_Type"]

FEATURE_COLS = [
    "Age", "Tenure_Months", "Visits_Last_Year", "Missed_Appointments",
    "Days_Since_Last_Visit", "Overall_Satisfaction", "Wait_Time_Satisfaction",
    "Staff_Satisfaction", "Provider_Rating", "Avg_Out_Of_Pocket_Cost",
    "Billing_Issues", "Portal_Usage", "Referrals_Made", "Distance_To_Facility_Miles",
    "Engagement_Score", "Cost_Per_Visit", "Satisfaction_Avg",
    "Gender", "State", "Specialty", "Insurance_Type",
]


def prepare_data():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(
        os.path.dirname(base_dir), "data", "patient_churn_dataset_enriched.csv"
    )

    print(f"\n[1] Loading dataset from: {data_path}")
    df = pd.read_csv(data_path)
    print(f"    Dataset Shape: {df.shape[0]} rows, {df.shape[1]} columns")

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

    # Cast object columns to pandas category dtype — no one-hot encoding
    # Replace NaN with sentinel so model learns to handle missing categoricals
    for col in CATEGORICAL_COLS:
        X_raw[col] = X_raw[col].fillna("__MISSING__").astype("category")

    return X_raw, y


def run_comparison():
    X_raw, y = prepare_data()

    # Single identical split for all models
    X_train, X_test, y_train, y_test = train_test_split(
        X_raw, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"    Train size: {len(X_train)} samples  |  Test size: {len(X_test)} samples\n")

    # Build candidate model dict — only include installed libs
    models = {
        "HistGradientBoosting": HistGradientBoostingClassifier(
            max_iter=300, learning_rate=0.05, max_depth=6, random_state=42,
        ),
    }
    if HAS_XGB:
        models["XGBoost"] = XGBClassifier(
            n_estimators=300, learning_rate=0.05, max_depth=6, random_state=42,
            enable_categorical=True, tree_method="hist",
            eval_metric="auc",
        )
    if HAS_LGBM:
        models["LightGBM"] = LGBMClassifier(
            n_estimators=300, learning_rate=0.05, max_depth=6, random_state=42,
            verbose=-1,
        )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    results = []

    print("=" * 80)
    print("PATIENT CHURN PREDICTION — 3-MODEL GRADIENT BOOSTING BENCHMARK")
    print("=" * 80)
    print(f"\n{'Model':<25} | {'Mean CV AUC':<12} | {'Test AUC':<10} | {'Latency (ms)':<12}")
    print("-" * 80)

    for name, model in models.items():
        # 5-fold Stratified CV AUC
        cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="roc_auc")
        mean_cv_auc = cv_scores.mean()

        # Train on full train set, score on held-out test
        t0 = time.time()
        model.fit(X_train, y_train)
        y_prob = model.predict_proba(X_test)[:, 1]
        test_auc = roc_auc_score(y_test, y_prob)
        latency_ms = (time.time() - t0) * 1000

        results.append({
            "Model": name,
            "Mean_CV_AUC": round(mean_cv_auc, 4),
            "Test_AUC": round(test_auc, 4),
            "Latency_ms": round(latency_ms, 2),
        })
        print(f"{name:<25} | {mean_cv_auc:<12.4f} | {test_auc:<10.4f} | {latency_ms:<12.2f}")

    print("-" * 80)

    # Pick winner: max(mean_cv_auc), ties broken by test_auc
    results_df = pd.DataFrame(results).sort_values(
        by=["Mean_CV_AUC", "Test_AUC"], ascending=[False, False]
    )
    winner = results_df.iloc[0]

    # Save benchmark table
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_csv = os.path.join(os.path.dirname(base_dir), "data", "model_comparison_benchmark.csv")
    results_df.to_csv(output_csv, index=False)

    print(f"\n[OK] Benchmark completed. Results saved to: {output_csv}")
    print(f"\n  WINNER: {winner['Model']}")
    print(f"    CV AUC:   {winner['Mean_CV_AUC']:.4f}")
    print(f"    Test AUC: {winner['Test_AUC']:.4f}")

    return winner, results_df


if __name__ == "__main__":
    run_comparison()
