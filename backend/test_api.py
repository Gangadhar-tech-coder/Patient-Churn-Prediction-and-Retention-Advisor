"""
End-to-End Test Suite — Patient Churn Prediction
=================================================
Tests all backend features: health, auth, prediction, batch (CSV+Excel),
feature validation, history, and analytics.
"""

import io
import sys
import pandas as pd
from fastapi.testclient import TestClient
from main import app

client = TestClient(app, raise_server_exceptions=True)
auth_token = None

# Ensure model is loaded
from models.predictor import predictor
if not predictor.is_loaded:
    predictor.load()


def test_health():
    print("\n[TEST 1] GET /api/health")
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    print(f"  -> Health Status: {data['status']}")
    print(f"  -> Model Loaded: {data['model_loaded']}")
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    print("  ✓ PASS: Health endpoint healthy & ML models loaded")


def test_auth():
    global auth_token
    print("\n[TEST 2] POST /api/auth/signup & POST /api/auth/signin")

    # Signup
    r = client.post("/api/auth/signup", json={
        "name": "Dr. Alex Taylor",
        "email": "dr.alex.test@hospital.com",
        "password": "securepass123"
    })
    if r.status_code == 400:
        # User already exists, sign in instead
        r = client.post("/api/auth/signin", json={
            "email": "dr.alex.test@hospital.com",
            "password": "securepass123"
        })
    assert r.status_code == 200
    data = r.json()
    auth_token = data["token"]
    print(f"  -> User Authenticated: {data['user']['name']}")
    print("  ✓ PASS: Authentication & session token generated")

    # Verify /me
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {auth_token}"})
    assert r.status_code == 200
    assert r.json()["user"]["name"] == "Dr. Alex Taylor"
    print("  ✓ PASS: GET /api/auth/me returns correct user")


def test_single_prediction():
    print("\n[TEST 3] POST /api/predict (Single Patient Assessment)")
    payload = {
        "age": 58, "gender": "Female", "state": "CA",
        "specialty": "General Practice", "insurance_type": "Private",
        "tenure_months": 24, "referrals_made": 1,
        "visits_last_year": 2, "missed_appointments": 3,
        "days_since_last_visit": 190, "portal_usage": 0,
        "overall_satisfaction": 2.1, "wait_time_satisfaction": 1.8,
        "staff_satisfaction": 2.5, "provider_rating": 3.0,
        "avg_out_of_pocket_cost": 1450, "distance_to_facility": 28.5,
        "billing_issues": 1,
    }
    headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
    r = client.post("/api/predict", json=payload, headers=headers)
    assert r.status_code == 200
    data = r.json()
    print(f"  -> Predicted Churn Probability: {data['percentage']}% ({data['risk_level']} Risk)")
    print(f"  -> Primary Reason: {data['primary_churn_reason']}")
    print(f"  -> Retention Advice: {data['retention_advice'][:60]}...")
    assert "probability" in data
    assert "risk_level" in data
    assert "interventions" in data
    print("  ✓ PASS: Prediction engine and risk diagnosis working correctly")


def test_batch_predict():
    print("\n[TEST 4] POST /api/batch-predict (Valid & Invalid Datasets)")

    # Valid CSV
    df = pd.DataFrame([
        {"Age": 41, "Gender": "Female", "State": "PA", "Specialty": "Pediatrics",
         "Insurance_Type": "Medicaid", "Tenure_Months": 62, "Visits_Last_Year": 1,
         "Missed_Appointments": 0, "Days_Since_Last_Visit": 564, "Portal_Usage": 0,
         "Overall_Satisfaction": 3.5, "Wait_Time_Satisfaction": 4.9,
         "Staff_Satisfaction": 3.8, "Provider_Rating": 4.2,
         "Avg_Out_Of_Pocket_Cost": 306, "Distance_To_Facility_Miles": 21.4,
         "Billing_Issues": 0, "Referrals_Made": 3},
        {"Age": 63, "Gender": "Female", "State": "GA", "Specialty": "Internal Medicine",
         "Insurance_Type": "Self-Pay", "Tenure_Months": 44, "Visits_Last_Year": 7,
         "Missed_Appointments": 4, "Days_Since_Last_Visit": 754, "Portal_Usage": 0,
         "Overall_Satisfaction": 2.1, "Wait_Time_Satisfaction": 1.5,
         "Staff_Satisfaction": 2.3, "Provider_Rating": 2.0,
         "Avg_Out_Of_Pocket_Cost": 1550, "Distance_To_Facility_Miles": 35.2,
         "Billing_Issues": 1, "Referrals_Made": 0},
        {"Age": 29, "Gender": "Male", "State": "TX", "Specialty": "Cardiology",
         "Insurance_Type": "Private", "Tenure_Months": 18, "Visits_Last_Year": 12,
         "Missed_Appointments": 2, "Days_Since_Last_Visit": 89, "Portal_Usage": 1,
         "Overall_Satisfaction": 4.5, "Wait_Time_Satisfaction": 4.2,
         "Staff_Satisfaction": 4.8, "Provider_Rating": 4.7,
         "Avg_Out_Of_Pocket_Cost": 200, "Distance_To_Facility_Miles": 5.0,
         "Billing_Issues": 0, "Referrals_Made": 2},
    ])

    csv_buf = io.BytesIO()
    df.to_csv(csv_buf, index=False)
    csv_buf.seek(0)

    headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
    r = client.post(
        "/api/batch-predict",
        files={"file": ("test_cohort.csv", csv_buf, "text/csv")},
        headers=headers,
    )
    assert r.status_code == 200
    data = r.json()
    print(f"  -> Batch Processed: Total={data['total']}, High Risk={data['high_risk']}, "
          f"Med Risk={data['medium_risk']}, Low Risk={data['low_risk']}")
    print("  ✓ PASS: CSV batch prediction succeeded")

    # Invalid file (less than 5 features)
    bad_df = pd.DataFrame([{"Name": "John", "City": "NYC", "ZipCode": "10001"}])
    bad_buf = io.BytesIO()
    bad_df.to_csv(bad_buf, index=False)
    bad_buf.seek(0)

    r = client.post(
        "/api/batch-predict",
        files={"file": ("bad_data.csv", bad_buf, "text/csv")},
        headers=headers,
    )
    assert r.status_code == 400
    assert "Please upload the correct file" in r.json()["detail"]
    print("  ✓ PASS: Invalid file rejected with 'Please upload the correct file' error")

    # Excel file test
    excel_buf = io.BytesIO()
    df.to_excel(excel_buf, index=False, engine="openpyxl")
    excel_buf.seek(0)

    r = client.post(
        "/api/batch-predict",
        files={"file": ("test_cohort.xlsx", excel_buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=headers,
    )
    assert r.status_code == 200
    print(f"  ✓ PASS: Excel (.xlsx) batch prediction succeeded (Total={r.json()['total']})")


def test_history_and_analytics():
    print("\n[TEST 5] GET /api/history & GET /api/user/analytics")
    headers = {"Authorization": f"Bearer {auth_token}"}

    r = client.get("/api/history", headers=headers)
    assert r.status_code == 200
    history = r.json()["history"]
    print(f"  -> Saved History Records: {len(history)} items")

    r = client.get("/api/user/analytics", headers=headers)
    assert r.status_code == 200
    analytics = r.json()
    print(f"  -> User Analytics: Total Evaluated={analytics['total_evaluated']}, "
          f"Avg Churn={analytics['avg_churn']}%")
    print("  ✓ PASS: SQLite persistence & user analytics endpoints working")


def test_signout():
    print("\n[TEST 6] POST /api/auth/signout")
    headers = {"Authorization": f"Bearer {auth_token}"}
    r = client.post("/api/auth/signout", headers=headers)
    assert r.status_code == 200
    print("  ✓ PASS: Signout successful")

    # Verify token is invalidated
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 401
    print("  ✓ PASS: Token invalidated after signout")


if __name__ == "__main__":
    print("=" * 60)
    print("RUNNING PATIENT CHURN PREDICTION END-TO-END TESTS")
    print("=" * 60)

    try:
        test_health()
        test_auth()
        test_single_prediction()
        test_batch_predict()
        test_history_and_analytics()
        test_signout()

        print("\n" + "=" * 60)
        print("ALL TESTS PASSED SUCCESSFULLY (100% OPERATIONAL)")
        print("=" * 60)
    except Exception as e:
        print(f"\n✗ FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
