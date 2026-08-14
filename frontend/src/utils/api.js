/**
 * API Client Utility for Patient Churn Predictor & Retention Advisor 2
 */

const API_BASE = "https://patient-churn-prediction-and-retention.onrender.com/api";

export async function predictChurn(patientData) {
  const response = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patientData),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Prediction failed");
  }
  return response.json();
}

export async function batchPredict(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/batch-predict`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Batch prediction failed");
  }
  return response.json();
}

export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}
