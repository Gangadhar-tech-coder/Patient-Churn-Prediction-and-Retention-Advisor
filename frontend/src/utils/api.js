/**
 * API Client Utility for Patient Churn Predictor & Retention Advisor 2
 * Smart Dual-URL configuration: Tries local backend first (50ms fast response),
 * falls back to Render cloud deployment.
 */

const LOCAL_API = "http://localhost:8000/api";
const CLOUD_API = "https://patient-churn-prediction-and-retention.onrender.com/api";

let activeApiBase = null;

async function getApiBase() {
  if (activeApiBase) return activeApiBase;

  // Quick 1.5s timeout check for fast local server
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${LOCAL_API}/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      activeApiBase = LOCAL_API;
      return LOCAL_API;
    }
  } catch (e) {
    // Local server not running, fall back to cloud deployment
  }

  activeApiBase = CLOUD_API;
  return CLOUD_API;
}

export async function predictChurn(patientData) {
  const base = await getApiBase();
  const response = await fetch(`${base}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patientData),
  });

  // If local failed unexpectedly, switch to cloud
  if (!response.ok && base === LOCAL_API) {
    activeApiBase = CLOUD_API;
    return predictChurn(patientData);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Prediction failed");
  }
  return response.json();
}

export async function batchPredict(file) {
  const base = await getApiBase();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${base}/batch-predict`, {
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
  const base = await getApiBase();
  const response = await fetch(`${base}/health`);
  return response.json();
}
