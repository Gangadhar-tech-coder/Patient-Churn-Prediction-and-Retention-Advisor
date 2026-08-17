"""
API Routes — Patient Churn & Retention Advisor
"""

import io
import re
import logging
import numpy as np
import pandas as pd
from typing import List, Set
from fastapi import APIRouter, UploadFile, File, HTTPException

from models.predictor import predictor
from schemas.patient import (
    PatientInput,
    PredictionResponse,
    BatchPredictionResponse,
    BatchPredictionRow,
    HealthResponse,
)

router = APIRouter(prefix="/api", tags=["prediction"])
logger = logging.getLogger(__name__)

# ── Alias map: expected column → list of accepted variants (lowercase, stripped) ─
ALIASES = {
    "Age": ["age", "patient_age", "patient age"],
    "Gender": ["gender", "patient_gender", "patient gender", "sex"],
    "State": ["state", "patient_state", "patient state", "location"],
    "Specialty": ["specialty", "medical_specialty", "medical specialty", "dept", "department"],
    "Insurance_Type": ["insurance_type", "insurance type", "insurance", "payer", "payer_type"],
    "Tenure_Months": ["tenure_months", "tenure months", "tenure", "months_enrolled", "months enrolled"],
    "Referrals_Made": ["referrals_made", "referrals made", "referrals", "num_referrals"],
    "Visits_Last_Year": ["visits_last_year", "visits last year", "annual_visits", "annual visits", "visit_count"],
    "Missed_Appointments": ["missed_appointments", "missed appointments", "missed", "no_shows", "no shows", "no-shows"],
    "Days_Since_Last_Visit": ["days_since_last_visit", "days since last visit", "days_since_visit", "recency_days", "recency"],
    "Portal_Usage": ["portal_usage", "portal usage", "portal", "uses_portal", "uses portal", "digital_engagement"],
    "Overall_Satisfaction": ["overall_satisfaction", "overall satisfaction", "satisfaction", "overall_score"],
    "Wait_Time_Satisfaction": ["wait_time_satisfaction", "wait time satisfaction", "wait_satisfaction", "wait_score"],
    "Staff_Satisfaction": ["staff_satisfaction", "staff satisfaction", "staff_score"],
    "Provider_Rating": ["provider_rating", "provider rating", "doctor_rating", "doctor rating", "physician_rating"],
    "Avg_Out_Of_Pocket_Cost": ["avg_out_of_pocket_cost", "average out of pocket cost", "out_of_pocket_cost",
                                "out of pocket cost", "avg_oop_cost", "oop_cost", "cost"],
    "Distance_To_Facility_Miles": ["distance_to_facility_miles", "distance to facility miles",
                                    "distance_to_facility", "distance", "distance_miles", "miles"],
    "Billing_Issues": ["billing_issues", "billing issues", "billing", "has_billing_issues"],
    "PatientID": ["patientid", "patient_id", "patient id", "id", "member_id", "member id"],
}

# Expected columns the model needs (excluding PatientID which is optional metadata)
EXPECTED_MODEL_COLS = [k for k in ALIASES if k != "PatientID"]

# Numeric columns that should be coerced to float
NUMERIC_COLS = [
    "Age", "Tenure_Months", "Visits_Last_Year", "Missed_Appointments",
    "Days_Since_Last_Visit", "Overall_Satisfaction", "Wait_Time_Satisfaction",
    "Staff_Satisfaction", "Provider_Rating", "Avg_Out_Of_Pocket_Cost",
    "Billing_Issues", "Portal_Usage", "Referrals_Made", "Distance_To_Facility_Miles",
]

ROW_CAP = 50_000


def _normalize_header(h: str) -> str:
    """Lowercase, strip, replace spaces/dashes with underscores."""
    return re.sub(r"[\s\-]+", "_", h.strip().lower())


def _build_alias_lookup():
    """Build reverse lookup: normalized_alias → expected column name."""
    lookup = {}
    for expected, variants in ALIASES.items():
        for v in variants:
            lookup[_normalize_header(v)] = expected
    return lookup


ALIAS_LOOKUP = _build_alias_lookup()


def _normalize_columns(df: pd.DataFrame) -> tuple:
    """Normalize CSV headers and return (df_with_normalized_cols, warnings).

    Returns (df, missing_columns, dropped_columns, coerced_counts).
    """
    warnings: List[str] = []
    coerced_counts: dict = {}

    # Step 1: Normalize all headers
    original_to_normalized = {}
    for col in df.columns:
        norm = _normalize_header(col)
        original_to_normalized[col] = norm

    df = df.rename(columns=original_to_normalized)

    # Step 2: Map normalized names to expected column names
    rename_map = {}
    for col in df.columns:
        if col in ALIAS_LOOKUP:
            rename_map[col] = ALIAS_LOOKUP[col]
    df = df.rename(columns=rename_map)

    # Step 3: Drop unknown columns (keep only expected + PatientID)
    expected_set = set(EXPECTED_MODEL_COLS) | {"PatientID"}
    unknown_cols = [c for c in df.columns if c not in expected_set]
    if unknown_cols:
        logger.info(f"Dropping {len(unknown_cols)} unknown columns: {unknown_cols[:5]}...")
        df = df[[c for c in df.columns if c in expected_set]]

    # Step 4: Add missing expected columns as NaN
    missing = [c for c in EXPECTED_MODEL_COLS if c not in df.columns]
    for col in missing:
        df[col] = np.nan
        warnings.append(f"Missing column '{col}' — filled with NaN")

    # Step 5: Coerce numeric columns
    for col in NUMERIC_COLS:
        if col in df.columns:
            before_null = df[col].isna().sum()
            df[col] = pd.to_numeric(df[col], errors="coerce")
            after_null = df[col].isna().sum()
            coerced = after_null - before_null
            if coerced > 0:
                coerced_counts[col] = int(coerced)

    if coerced_counts:
        total_coerced = sum(coerced_counts.values())
        warnings.append(f"Coerced {total_coerced} unparseable cell(s) to NaN across columns: {coerced_counts}")

    return df, warnings


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint — reads real model metadata."""
    if predictor.is_loaded and predictor.model_meta:
        meta = predictor.model_meta
        return HealthResponse(
            status="healthy",
            model_loaded=True,
            model_type=meta.get("model_type", meta.get("model_name", "Unknown")),
            auc=meta.get("cv_auc", 0.0),
        )
    return HealthResponse(
        status="unhealthy",
        model_loaded=False,
        model_type="None",
        auc=0.0,
    )


@router.post("/predict", response_model=PredictionResponse)
async def predict_churn(patient: PatientInput):
    """Predict churn risk %, drivers, and retention advice for a single patient."""
    if not predictor.is_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    result = predictor.predict(patient)
    return PredictionResponse(**result)


@router.post("/batch-predict", response_model=BatchPredictionResponse)
async def batch_predict(file: UploadFile = File(...)):
    """Batch predict from CSV file with NaN-tolerant parsing."""
    if not predictor.is_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {str(e)}")

    # Row cap
    if len(df) > ROW_CAP:
        raise HTTPException(
            status_code=400,
            detail=f"CSV exceeds maximum of {ROW_CAP:,} rows ({len(df):,} rows provided)",
        )

    # Normalize columns and collect warnings
    df, parse_warnings = _normalize_columns(df)

    # Run prediction
    batch_result = predictor.predict_batch(df)

    # Assemble response
    results = []
    high = medium = low = 0

    for item in batch_result["results"]:
        risk = item["risk_level"]
        if risk == "High":
            high += 1
        elif risk == "Medium":
            medium += 1
        else:
            low += 1

        results.append(BatchPredictionRow(**item))

    return BatchPredictionResponse(
        total=len(results),
        high_risk=high,
        medium_risk=medium,
        low_risk=low,
        results=results,
        warnings=parse_warnings,
        sampled=batch_result.get("sampled", False),
        sample_size=batch_result.get("sample_size"),
    )
