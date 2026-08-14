# Patient Churn & Retention Advisor 2

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

### 1. Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
python train_model.py # (Already trained and artifacts saved)
uvicorn main:app --reload --port 8000
```

### 2. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Access the frontend app at **http://localhost:5173**
