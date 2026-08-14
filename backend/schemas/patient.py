"""
Pydantic Schemas for Patient Churn Predictor & Retention Advisor 2
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class PatientInput(BaseModel):
    """Schema for single patient prediction input."""

    age: int = Field(..., ge=18, le=90, description="Patient age")
    gender: str = Field(..., description="Patient gender (Female/Male)")
    state: str = Field(..., description="Patient state abbreviation")
    specialty: str = Field(..., description="Medical specialty")
    insurance_type: str = Field(..., description="Insurance type")
    tenure_months: int = Field(..., ge=1, le=120, description="Tenure in months")
    referrals_made: int = Field(
        ..., ge=0, le=5, description="Number of referrals made"
    )
    visits_last_year: int = Field(
        ..., ge=0, le=20, description="Visits in the last year"
    )
    missed_appointments: int = Field(
        ..., ge=0, le=10, description="Missed appointments count"
    )
    days_since_last_visit: int = Field(
        ..., ge=1, le=730, description="Days since last visit"
    )
    portal_usage: int = Field(..., ge=0, le=1, description="Uses patient portal (0/1)")
    overall_satisfaction: float = Field(
        ..., ge=1.0, le=5.0, description="Overall satisfaction score"
    )
    wait_time_satisfaction: float = Field(
        ..., ge=1.0, le=5.0, description="Wait time satisfaction"
    )
    staff_satisfaction: float = Field(
        ..., ge=1.0, le=5.0, description="Staff satisfaction score"
    )
    provider_rating: float = Field(
        ..., ge=1.0, le=5.0, description="Provider rating"
    )
    avg_out_of_pocket_cost: float = Field(
        ..., ge=20, le=2000, description="Average out-of-pocket cost"
    )
    distance_to_facility: float = Field(
        ..., ge=0.5, le=50.0, description="Distance in miles"
    )
    billing_issues: int = Field(
        ..., ge=0, le=1, description="Has billing issues (0/1)"
    )


class FeatureContribution(BaseModel):
    """Risk impact score per factor."""

    factor: str
    risk_impact: float


class Intervention(BaseModel):
    """Recommended intervention action item."""

    icon: str
    text: str
    priority: str  # "high", "medium", "low"


class EngineeredMetrics(BaseModel):
    """Engineered metrics derived from patient inputs."""

    engagement_score: int
    satisfaction_avg: float
    cost_per_visit: float
    visit_frequency: int


class PredictionResponse(BaseModel):
    """Prediction output containing churn probability %, primary churn reason, and retention advice."""

    probability: float
    percentage: float
    risk_level: str
    risk_class: str
    primary_churn_reason: str
    retention_advice: str
    metrics: EngineeredMetrics
    feature_contributions: List[FeatureContribution]
    interventions: List[Intervention]


class BatchPredictionRow(BaseModel):
    """Single row result for batch processing."""

    index: int
    patient_id: Optional[str] = None
    probability: float
    percentage: float
    risk_level: str
    primary_churn_reason: str
    retention_advice: str


class BatchPredictionResponse(BaseModel):
    """Batch prediction response summary."""

    total: int
    high_risk: int
    medium_risk: int
    low_risk: int
    results: List[BatchPredictionRow]


class HealthResponse(BaseModel):
    """Health check status."""

    status: str
    model_loaded: bool
    model_type: str
    auc: float
