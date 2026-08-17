/**
 * API Client — Patient Churn Prediction
 * Handles auth, predictions, batch uploads, history, analytics.
 */

const LOCAL_API = "http://localhost:8000/api";
const CLOUD_API = "https://patient-churn-prediction-and-retention.onrender.com/api";

let activeApiBase = null;
const TOKEN_KEY = "patient_churn_token";

async function getApiBase() {
  if (activeApiBase) return activeApiBase;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${LOCAL_API}/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) { activeApiBase = LOCAL_API; return LOCAL_API; }
  } catch (e) { /* local not available */ }
  activeApiBase = CLOUD_API;
  return CLOUD_API;
}

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Auth ────────────────────────────────────────────
export async function signup(name, email, password) {
  const base = await getApiBase();
  const r = await fetch(`${base}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || "Signup failed");
  }
  const data = await r.json();
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function signin(email, password) {
  const base = await getApiBase();
  const r = await fetch(`${base}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || "Sign in failed");
  }
  const data = await r.json();
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function signout() {
  const base = await getApiBase();
  await fetch(`${base}/auth/signout`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
  }).catch(() => {});
  localStorage.removeItem(TOKEN_KEY);
}

export async function getMe() {
  const base = await getApiBase();
  const r = await fetch(`${base}/auth/me`, { headers: { ...getAuthHeaders() } });
  if (!r.ok) throw new Error("Not authenticated");
  return r.json();
}

// ─── Predictions ─────────────────────────────────────
export async function predictChurn(patientData) {
  const base = await getApiBase();
  const r = await fetch(`${base}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(patientData),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || "Prediction failed");
  }
  return r.json();
}

export async function batchPredict(file) {
  const base = await getApiBase();
  const formData = new FormData();
  formData.append("file", file);
  const r = await fetch(`${base}/batch-predict`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || "Batch prediction failed");
  }
  return r.json();
}

// ─── History & Analytics ─────────────────────────────
export async function getHistory() {
  const base = await getApiBase();
  const r = await fetch(`${base}/history`, { headers: { ...getAuthHeaders() } });
  if (!r.ok) throw new Error("Failed to fetch history");
  return r.json();
}

export async function getUserAnalytics() {
  const base = await getApiBase();
  const r = await fetch(`${base}/user/analytics`, { headers: { ...getAuthHeaders() } });
  if (!r.ok) throw new Error("Failed to fetch analytics");
  return r.json();
}

export async function checkHealth() {
  const base = await getApiBase();
  const r = await fetch(`${base}/health`);
  return r.json();
}
