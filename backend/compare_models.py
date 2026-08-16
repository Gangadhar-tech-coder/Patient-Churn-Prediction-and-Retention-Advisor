"""
Model Comparison & Accuracy Benchmark Script — Patient Churn Predictor
=======================================================================
Compares Random Forest performance against multiple alternative ML models:
1. Random Forest Classifier (Current Model)
2. Gradient Boosting Classifier
3. Extra Trees Classifier
4. Decision Tree Classifier
5. Logistic Regression
6. K-Nearest Neighbors (KNN)
7. Gaussian Naive Bayes
8. Support Vector Classifier (SVC)

Evaluates: ROC-AUC, Accuracy, Precision, Recall, F1-Score, and Execution Latency.
"""

import os
import time
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    roc_auc_score,
    precision_score,
    recall_score,
    f1_score,
)

# ML Model Algorithms
from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    ExtraTreesClassifier,
)
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler


def run_comparison():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(
        os.path.dirname(base_dir), "data", "patient_churn_dataset_enriched.csv"
    )

    print("=" * 80)
    print("PATIENT CHURN PREDICTION — MULTI-MODEL ACCURACY & PERFORMANCE BENCHMARK")
    print("=" * 80)

    print(f"\n[1] Loading dataset from: {data_path}")
    df = pd.read_csv(data_path)
    print(f"    Dataset Shape: {df.shape[0]} rows, {df.shape[1]} columns")

    # Feature Engineering (Same as train_model.py)
    df["Engagement_Score"] = df["Visits_Last_Year"] - df["Missed_Appointments"]
    df["Cost_Per_Visit"] = df["Avg_Out_Of_Pocket_Cost"] / (df["Visits_Last_Year"] + 1)
    df["Satisfaction_Avg"] = (
        df["Overall_Satisfaction"]
        + df["Wait_Time_Satisfaction"]
        + df["Staff_Satisfaction"]
    ) / 3

    feature_cols = [
        "Age",
        "Tenure_Months",
        "Visits_Last_Year",
        "Missed_Appointments",
        "Days_Since_Last_Visit",
        "Overall_Satisfaction",
        "Wait_Time_Satisfaction",
        "Staff_Satisfaction",
        "Provider_Rating",
        "Avg_Out_Of_Pocket_Cost",
        "Billing_Issues",
        "Portal_Usage",
        "Referrals_Made",
        "Distance_To_Facility_Miles",
        "Engagement_Score",
        "Cost_Per_Visit",
        "Satisfaction_Avg",
        "Gender",
        "State",
        "Specialty",
        "Insurance_Type",
    ]

    X_raw = df[feature_cols]
    y = df["Churned"]

    # One-Hot Encoding
    X_encoded = pd.get_dummies(X_raw)

    # Train/Test Split (80% Train, 20% Test)
    X_train, X_test, y_train, y_test = train_test_split(
        X_encoded, y, test_size=0.2, random_state=42, stratify=y
    )

    # Scale data for distance-sensitive models (Logistic Regression, KNN, SVC)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    print(f"    Train size: {len(X_train)} samples  |  Test size: {len(X_test)} samples\n")

    # Define Candidate Models
    models = {
        "Random Forest (Current)": (
            RandomForestClassifier(
                n_estimators=300, max_depth=12, min_samples_split=4, random_state=42
            ),
            False,
        ),
        "Gradient Boosting": (
            GradientBoostingClassifier(
                n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42
            ),
            False,
        ),
        "Extra Trees": (
            ExtraTreesClassifier(n_estimators=300, max_depth=12, random_state=42),
            False,
        ),
        "Decision Tree": (
            DecisionTreeClassifier(max_depth=8, random_state=42),
            False,
        ),
        "Logistic Regression": (
            LogisticRegression(max_iter=1000, random_state=42),
            True,
        ),
        "K-Nearest Neighbors (KNN)": (
            KNeighborsClassifier(n_neighbors=7),
            True,
        ),
        "Gaussian Naive Bayes": (
            GaussianNB(),
            False,
        ),
        "Support Vector Machine (SVC)": (
            SVC(probability=True, random_state=42),
            True,
        ),
    }

    results = []

    print("-" * 80)
    print(f"{'Model Name':<28} | {'ROC-AUC':<8} | {'Accuracy':<8} | {'Precision':<9} | {'Recall':<6} | {'F1-Score':<8} | {'Time (ms)':<9}")
    print("-" * 80)

    for name, (model, requires_scaling) in models.items():
        X_tr = X_train_scaled if requires_scaling else X_train
        X_te = X_test_scaled if requires_scaling else X_test

        # Measure training & inference latency
        t0 = time.time()
        model.fit(X_tr, y_train)
        
        # Predictions
        y_pred = model.predict(X_te)
        if hasattr(model, "predict_proba"):
            y_prob = model.predict_proba(X_te)[:, 1]
        else:
            y_prob = model.decision_function(X_te)

        t1 = time.time()
        latency_ms = (t1 - t0) * 1000

        # Calculate Evaluation Metrics
        acc = accuracy_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_prob)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)

        results.append({
            "Model": name,
            "ROC-AUC": round(auc, 4),
            "Accuracy": round(acc, 4),
            "Precision": round(prec, 4),
            "Recall": round(rec, 4),
            "F1-Score": round(f1, 4),
            "Latency (ms)": round(latency_ms, 2),
        })

        print(f"{name:<28} | {auc:<8.4f} | {acc:<8.4f} | {prec:<9.4f} | {rec:<6.4f} | {f1:<8.4f} | {latency_ms:<9.2f}")

    print("-" * 80)

    # Convert to DataFrame & Sort by ROC-AUC
    results_df = pd.DataFrame(results).sort_values(by="ROC-AUC", ascending=False)
    
    output_csv = os.path.join(os.path.dirname(base_dir), "data", "model_comparison_benchmark.csv")
    results_df.to_csv(output_csv, index=False)

    print(f"\n[OK] Benchmark completed successfully! Results saved to:\n     {output_csv}\n")
    print("TOP PERFORMING MODEL BY ROC-AUC:")
    top_model = results_df.iloc[0]
    print(f"[TOP MODEL] {top_model['Model']} - ROC-AUC: {top_model['ROC-AUC']:.4f} | Accuracy: {top_model['Accuracy']*100:.2f}%\n")


if __name__ == "__main__":
    run_comparison()
