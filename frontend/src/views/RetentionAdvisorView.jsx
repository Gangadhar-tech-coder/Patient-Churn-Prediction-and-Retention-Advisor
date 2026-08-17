import { useState } from "react";
import { predictChurn } from "../utils/api";
import ProbabilityGauge from "../components/ProbabilityGauge";
import WhatIfSimulator from "../components/WhatIfSimulator";
import "./views.css";

const STATES = ["CA", "FL", "GA", "IL", "MI", "NC", "NY", "OH", "PA", "TX"];
const SPECIALTIES = ["Cardiology", "Family Medicine", "General Practice", "Internal Medicine", "Neurology", "Orthopedics", "Pediatrics"];
const INSURANCE_TYPES = ["Medicaid", "Medicare", "Private", "Self-Pay"];

const DEFAULT_FORM = {
  age: 58, gender: "Female", state: "CA", specialty: "General Practice",
  insurance_type: "Private", tenure_months: 24, referrals_made: 1,
  visits_last_year: 2, missed_appointments: 3, days_since_last_visit: 190,
  portal_usage: 0, overall_satisfaction: 2.1, wait_time_satisfaction: 1.8,
  staff_satisfaction: 2.5, provider_rating: 3.0, avg_out_of_pocket_cost: 1450,
  distance_to_facility: 28.5, billing_issues: 1,
};

export default function RetentionAdvisorView() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const numChange = (field, val, parser = parseInt) => {
    if (val === "") update(field, "");
    else { const p = parser(val); update(field, isNaN(p) ? "" : p); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const payload = {
        ...form,
        age: Number(form.age) || 41,
        tenure_months: Number(form.tenure_months) || 24,
        referrals_made: Number(form.referrals_made) || 0,
        visits_last_year: Number(form.visits_last_year) || 1,
        missed_appointments: Number(form.missed_appointments) || 0,
        days_since_last_visit: Number(form.days_since_last_visit) || 90,
        avg_out_of_pocket_cost: Number(form.avg_out_of_pocket_cost) || 300,
        distance_to_facility: Number(form.distance_to_facility) || 10,
        overall_satisfaction: Number(form.overall_satisfaction),
        wait_time_satisfaction: Number(form.wait_time_satisfaction),
        staff_satisfaction: Number(form.staff_satisfaction),
        provider_rating: Number(form.provider_rating),
      };
      const result = await predictChurn(payload);
      setPrediction(result);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="view-container">
      <h1 className="view-title">Individual Patient Churn Assessment</h1>
      <p className="view-desc">
        Evaluate churn probability, uncover underlying risk factors, and generate a personalized retention plan.
      </p>

      {error && <div className="view-error">{error}</div>}

      <form onSubmit={handleSubmit} className="assessment-form">
        {/* Section 1: Demographics */}
        <div className="form-section">
          <h3><span className="section-icon">👤</span> 1. Patient Demographics & Profile</h3>
          <div className="form-grid-4">
            <Field label="Age (years)" required hint="18–90 years">
              <input type="number" min={18} max={90} value={form.age} onChange={(e) => numChange("age", e.target.value)} />
            </Field>
            <Field label="Gender" required>
              <select value={form.gender} onChange={(e) => update("gender", e.target.value)}>
                <option>Female</option><option>Male</option>
              </select>
            </Field>
            <Field label="State" required>
              <select value={form.state} onChange={(e) => update("state", e.target.value)}>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Medical Specialty" required>
              <select value={form.specialty} onChange={(e) => update("specialty", e.target.value)}>
                {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="form-grid-2">
            <Field label="Insurance Type" required>
              <select value={form.insurance_type} onChange={(e) => update("insurance_type", e.target.value)}>
                {INSURANCE_TYPES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* Section 2: Clinical */}
        <div className="form-section">
          <h3><span className="section-icon">📋</span> 2. Clinical Engagement & Recency</h3>
          <div className="form-grid-4">
            <Field label="Tenure (Months)" required hint="1–120 months">
              <input type="number" min={1} max={120} value={form.tenure_months} onChange={(e) => numChange("tenure_months", e.target.value)} />
            </Field>
            <Field label="Visits Last Year" required hint="0–20 visits">
              <input type="number" min={0} max={20} value={form.visits_last_year} onChange={(e) => numChange("visits_last_year", e.target.value)} />
            </Field>
            <Field label="Missed Appointments" required hint="0–10 missed">
              <input type="number" min={0} max={10} value={form.missed_appointments} onChange={(e) => numChange("missed_appointments", e.target.value)} />
            </Field>
            <Field label="Days Since Last Visit" required hint="1–730 days">
              <input type="number" min={1} max={730} value={form.days_since_last_visit} onChange={(e) => numChange("days_since_last_visit", e.target.value)} />
            </Field>
          </div>
          <div className="form-grid-2">
            <Field label="Patient Portal Activity" required>
              <select value={form.portal_usage} onChange={(e) => update("portal_usage", Number(e.target.value))}>
                <option value={0}>0 — Inactive / Not Enrolled</option>
                <option value={1}>1 — Active User</option>
              </select>
            </Field>
            <Field label="Referrals Made" required>
              <input type="number" min={0} max={5} value={form.referrals_made} onChange={(e) => numChange("referrals_made", e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Section 3: Satisfaction */}
        <div className="form-section">
          <h3>
            <span className="section-icon">⭐</span> 3. Patient Satisfaction
            <span className="section-badge">Valid Range: 1.0 – 5.0</span>
          </h3>
          <div className="form-grid-4">
            <Field label="Overall Satisfaction" required>
              <input type="number" min={1} max={5} step={0.1} value={form.overall_satisfaction} onChange={(e) => numChange("overall_satisfaction", e.target.value, parseFloat)} />
            </Field>
            <Field label="Wait Time Satisfaction" required>
              <input type="number" min={1} max={5} step={0.1} value={form.wait_time_satisfaction} onChange={(e) => numChange("wait_time_satisfaction", e.target.value, parseFloat)} />
            </Field>
            <Field label="Staff Satisfaction" required>
              <input type="number" min={1} max={5} step={0.1} value={form.staff_satisfaction} onChange={(e) => numChange("staff_satisfaction", e.target.value, parseFloat)} />
            </Field>
            <Field label="Provider Rating" required>
              <input type="number" min={1} max={5} step={0.1} value={form.provider_rating} onChange={(e) => numChange("provider_rating", e.target.value, parseFloat)} />
            </Field>
          </div>
        </div>

        {/* Section 4: Cost & Accessibility */}
        <div className="form-section">
          <h3><span className="section-icon">💰</span> 4. Cost & Accessibility</h3>
          <div className="form-grid-3">
            <Field label="Average Out-of-Pocket Cost ($)" required hint="$20–$2,000">
              <input type="number" min={20} max={2000} value={form.avg_out_of_pocket_cost} onChange={(e) => numChange("avg_out_of_pocket_cost", e.target.value)} />
            </Field>
            <Field label="Unresolved Billing Issues" required>
              <select value={form.billing_issues} onChange={(e) => update("billing_issues", Number(e.target.value))}>
                <option value={0}>0 — No billing issues</option>
                <option value={1}>1 — Yes (Active billing dispute/issue)</option>
              </select>
            </Field>
            <Field label="Distance to Facility (miles)" required hint="0.5–50 miles">
              <input type="number" min={0.5} max={50} step={0.5} value={form.distance_to_facility} onChange={(e) => numChange("distance_to_facility", e.target.value, parseFloat)} />
            </Field>
          </div>
        </div>

        <div className="form-submit-row">
          <button type="submit" className="predict-btn" disabled={loading}>
            {loading ? "Analyzing..." : "⚡ Predict Churn"}
          </button>
        </div>
      </form>

      {/* Prediction Results */}
      {prediction && (
        <div className="prediction-results">
          <h2 className="results-title">Prediction Results</h2>
          <div className="results-grid">
            <div className="results-gauge-card">
              <ProbabilityGauge percentage={prediction.percentage} riskLevel={prediction.risk_level} />
              <div className="prediction-label">
                Prediction: <strong>{prediction.percentage >= 50 ? "Likely to Churn" : "Likely Retained"}</strong>
              </div>
            </div>
            <div className="results-info-card">
              <div className="result-block reason-block">
                <span className="result-block-label">PRIMARY RISK FACTOR</span>
                <p>{prediction.primary_churn_reason}</p>
              </div>
              <div className="result-block advice-block">
                <span className="result-block-label">RECOMMENDED STRATEGY</span>
                <p>{prediction.retention_advice}</p>
              </div>
            </div>
          </div>

          {/* Interventions */}
          {prediction.interventions && prediction.interventions.length > 0 && (
            <div className="interventions-section">
              <h3>🎯 Recommended Interventions</h3>
              <div className="interventions-grid">
                {prediction.interventions.map((item, i) => (
                  <div key={i} className={`intervention-chip ${item.priority}`}>
                    <span className="intervention-icon">{item.icon}</span>
                    <span>{item.text}</span>
                    <span className={`priority-dot ${item.priority}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feature Contributions */}
          {prediction.feature_contributions && (
            <div className="contributions-section">
              <h3>📊 Risk Factor Analysis</h3>
              <div className="contribution-bars">
                {prediction.feature_contributions.map((c, i) => (
                  <div key={i} className="contribution-row">
                    <span className="contrib-label">{c.factor}</span>
                    <div className="contrib-bar-track">
                      <div
                        className="contrib-bar-fill"
                        style={{
                          width: `${Math.round(c.risk_impact * 100)}%`,
                          background: c.risk_impact > 0.6 ? "#ef4444" : c.risk_impact > 0.3 ? "#f59e0b" : "#22c55e",
                        }}
                      />
                    </div>
                    <span className="contrib-val">{Math.round(c.risk_impact * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* What-If Simulator */}
      <div style={{ marginTop: 32 }}>
        <WhatIfSimulator />
      </div>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div className="form-field">
      <label>{label} {required && <span className="req">*</span>}</label>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
