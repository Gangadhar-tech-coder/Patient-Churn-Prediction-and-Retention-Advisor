# Patient Churn Prediction and Retention Advisor

An end-to-end Machine Learning web application for predicting patient churn risk %, diagnosing the primary churn reason, and prescribing actionable retention advice.

---

## Features

- **Churn Probability % & Risk Level**: Predicts percentage likelihood to churn (0–100%) and categorizes risk into High, Medium, or Low tiers.
- **Diagnosed Primary Churn Reason**: Identifies root-cause reasons (e.g. *Frequently missed appointments*, *High out-of-pocket cost burden*, *Long appointment wait times*, *Low provider rating*, *Unresolved billing issues*).
- **Targeted Retention Advice**: Maps diagnosed churn reasons directly to actionable retention strategies.
- **Detailed Feature Analysis**: Visual breakdown of risk-impact contributions per clinical & engagement factor.
- **Cohort Batch Analysis**: Drag-and-drop CSV upload for cohort-wide predictions with individual churn %, reason, and advice mapping.

---

## Tech Stack

- **Backend**: FastAPI, Uvicorn, Scikit-Learn (Random Forest), Pandas, NumPy, Pydantic
- **Frontend**: React (Vite), Vanilla CSS (MedVault Dark Theme v2 design system)

---

## Running the Application

### Run the application

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

The FastAPI server serves the frontend and API together. Access the application at
**http://localhost:8000**. The trained model artifacts are already included in
`backend/ml_model`; run `python train_model.py` only when retraining is needed.

### Frontend pages

- `/frontend/login.html` — sign in or create an account
- `/frontend/dashboard.html` — user dashboard and recent predictions
- `/frontend/predict.html` — individual patient assessment
- `/frontend/cohort.html` — CSV/Excel cohort analysis
- `/frontend/history.html` — private prediction history for the signed-in user
- `/frontend/analytics.html` — private prediction totals and cohort upload analytics

All protected pages require the token created by the authentication API. Prediction
history and analytics are loaded from `/api/history` and `/api/user/analytics` for
the current registered user only.
