"""
SQLite Database Module — Patient Churn Prediction
==================================================
Manages users, predictions, and cohort datasets.
"""

import os
import sqlite3
import hashlib
import uuid
from datetime import datetime
from contextlib import contextmanager

DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "patient_churn_prediction.db"
)


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Create tables if they don't exist."""
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                patient_data TEXT,
                probability REAL,
                risk_level TEXT,
                primary_reason TEXT,
                retention_advice TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS cohort_datasets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                filename TEXT,
                total_patients INTEGER,
                high_risk INTEGER,
                medium_risk INTEGER,
                low_risk INTEGER,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        """)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_user(name: str, email: str, password: str) -> dict:
    user_id = str(uuid.uuid4())
    pw_hash = hash_password(password)
    with get_db() as conn:
        try:
            conn.execute(
                "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
                (user_id, name, email, pw_hash),
            )
        except sqlite3.IntegrityError:
            return None
    return {"id": user_id, "name": name, "email": email}


def authenticate_user(email: str, password: str) -> dict:
    pw_hash = hash_password(password)
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, name, email FROM users WHERE email = ? AND password_hash = ?",
            (email, pw_hash),
        ).fetchone()
    if row:
        return {"id": row["id"], "name": row["name"], "email": row["email"]}
    return None


def get_user_by_id(user_id: str) -> dict:
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, name, email FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    if row:
        return {"id": row["id"], "name": row["name"], "email": row["email"]}
    return None


def save_prediction(user_id: str, patient_data: str, probability: float,
                    risk_level: str, primary_reason: str, retention_advice: str):
    with get_db() as conn:
        conn.execute(
            """INSERT INTO predictions 
               (user_id, patient_data, probability, risk_level, primary_reason, retention_advice) 
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, patient_data, probability, risk_level, primary_reason, retention_advice),
        )


def save_cohort(user_id: str, filename: str, total: int, high: int, med: int, low: int):
    with get_db() as conn:
        conn.execute(
            """INSERT INTO cohort_datasets 
               (user_id, filename, total_patients, high_risk, medium_risk, low_risk) 
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, filename, total, high, med, low),
        )


def get_user_predictions(user_id: str, limit: int = 50) -> list:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM predictions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def get_user_analytics(user_id: str) -> dict:
    with get_db() as conn:
        preds = conn.execute(
            "SELECT probability, risk_level FROM predictions WHERE user_id = ?",
            (user_id,),
        ).fetchall()
        cohorts = conn.execute(
            "SELECT * FROM cohort_datasets WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
            (user_id,),
        ).fetchall()

    if not preds:
        return {
            "total_evaluated": 0,
            "avg_churn": 0,
            "high_risk_count": 0,
            "medium_risk_count": 0,
            "low_risk_count": 0,
            "cohort_uploads": [],
        }

    probabilities = [r["probability"] for r in preds]
    return {
        "total_evaluated": len(preds),
        "avg_churn": round(sum(probabilities) / len(probabilities) * 100, 1),
        "high_risk_count": sum(1 for r in preds if r["risk_level"] == "High"),
        "medium_risk_count": sum(1 for r in preds if r["risk_level"] == "Medium"),
        "low_risk_count": sum(1 for r in preds if r["risk_level"] == "Low"),
        "cohort_uploads": [dict(c) for c in cohorts],
    }


# Auto-init
init_db()
