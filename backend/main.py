"""
Patient Churn Prediction — FastAPI Server
==========================================
Run: uvicorn main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models.predictor import predictor
from routes.predict import router as predict_router
from routes.auth import router as auth_router
import database  # noqa: F401 — triggers init_db() on import


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model artifacts on startup."""
    predictor.load()
    print("[OK] Patient Churn Prediction Model loaded successfully")
    yield
    print("[STOP] Shutting down")


app = FastAPI(
    title="Patient Churn Prediction API",
    description="AI-powered churn probability %, churn reason diagnosis, and retention advice engine",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)
app.include_router(auth_router)
