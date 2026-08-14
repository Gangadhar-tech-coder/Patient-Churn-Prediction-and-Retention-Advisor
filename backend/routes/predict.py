"""
API Routes — Patient Churn & Retention Advisor 2
"""

import io
import pandas as pd
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


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy" if predictor.is_loaded else "unhealthy",
        model_loaded=predictor.is_loaded,
        model_type="Random Forest + Multi-Class Reason Classifier",
        auc=0.6065,
    )


@router.post("/predict", response_model=PredictionResponse)
async def predict_churn(patient: PatientInput):
    """Predict churn risk %, primary reason, and retention advice for a single patient."""
    if not predictor.is_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    result = predictor.predict(patient)
    return PredictionResponse(**result)


@router.post("/batch-predict", response_model=BatchPredictionResponse)
async def batch_predict(file: UploadFile = File(...)):
    """Batch predict from CSV file."""
    if not predictor.is_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {str(e)}")

    column_map = {
        "Age": "age",
        "Gender": "gender",
        "State": "state",
        "Specialty": "specialty",
        "Insurance_Type": "insurance_type",
        "Tenure_Months": "tenure_months",
        "Referrals_Made": "referrals_made",
        "Visits_Last_Year": "visits_last_year",
        "Missed_Appointments": "missed_appointments",
        "Days_Since_Last_Visit": "days_since_last_visit",
        "Portal_Usage": "portal_usage",
        "Overall_Satisfaction": "overall_satisfaction",
        "Wait_Time_Satisfaction": "wait_time_satisfaction",
        "Staff_Satisfaction": "staff_satisfaction",
        "Provider_Rating": "provider_rating",
        "Avg_Out_Of_Pocket_Cost": "avg_out_of_pocket_cost",
        "Distance_To_Facility_Miles": "distance_to_facility",
        "Billing_Issues": "billing_issues",
    }

    batch_results = predictor.predict_batch(df)

    results = []
    high = medium = low = 0

    for item in batch_results:
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
    )
