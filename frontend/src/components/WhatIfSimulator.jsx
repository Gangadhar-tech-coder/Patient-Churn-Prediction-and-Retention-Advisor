import { useState, useCallback } from "react";
import ProbabilityGauge from "./ProbabilityGauge";
import { predictChurn } from "../utils/api";
import "./WhatIfSimulator.css";

const SLIDERS = [
  { key: "overall_satisfaction", label: "Overall Satisfaction", min: 1, max: 5, step: 0.1, default: 3.5 },
  { key: "missed_appointments", label: "Missed Appointments", min: 0, max: 10, step: 1, default: 0 },
  { key: "days_since_last_visit", label: "Days Since Last Visit", min: 1, max: 730, step: 1, default: 90 },
  { key: "avg_out_of_pocket_cost", label: "Out-of-Pocket Cost ($)", min: 20, max: 2000, step: 10, default: 400 },
];

const BASE_PATIENT = {
  age: 50, gender: "Female", state: "CA", specialty: "General Practice",
  insurance_type: "Private", tenure_months: 36, referrals_made: 1,
  visits_last_year: 3, missed_appointments: 0, days_since_last_visit: 90,
  portal_usage: 1, overall_satisfaction: 3.5, wait_time_satisfaction: 3.5,
  staff_satisfaction: 3.5, provider_rating: 3.5, avg_out_of_pocket_cost: 400,
  distance_to_facility: 10, billing_issues: 0,
};

export default function WhatIfSimulator() {
  const [values, setValues] = useState(
    Object.fromEntries(SLIDERS.map((s) => [s.key, s.default]))
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const simulate = useCallback(async (newValues) => {
    setLoading(true);
    try {
      const patient = { ...BASE_PATIENT, ...newValues };
      const res = await predictChurn(patient);
      setResult(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (key, val) => {
    const newValues = { ...values, [key]: Number(val) };
    setValues(newValues);
  };

  const handleSimulate = () => simulate(values);

  return (
    <div className="whatif-card">
      <div className="whatif-header">
        <span className="whatif-icon">🔬</span>
        <div>
          <h3>What-If Risk Simulator</h3>
          <p>Adjust parameters to see how they affect churn risk in real-time</p>
        </div>
      </div>

      <div className="whatif-body">
        <div className="whatif-sliders">
          {SLIDERS.map((s) => (
            <div key={s.key} className="whatif-slider">
              <div className="whatif-slider-header">
                <label>{s.label}</label>
                <span className="whatif-val">
                  {s.step < 1 ? Number(values[s.key]).toFixed(1) : values[s.key]}
                </span>
              </div>
              <input
                type="range" min={s.min} max={s.max} step={s.step}
                value={values[s.key]}
                onChange={(e) => handleChange(s.key, e.target.value)}
              />
              <div className="whatif-range">
                <span>{s.min}</span><span>{s.max}</span>
              </div>
            </div>
          ))}
          <button className="whatif-btn" onClick={handleSimulate} disabled={loading}>
            {loading ? "Simulating..." : "⚡ Run Simulation"}
          </button>
        </div>

        <div className="whatif-result">
          {result ? (
            <>
              <ProbabilityGauge percentage={result.percentage} riskLevel={result.risk_level} />
              <div className="whatif-reason">
                <strong>Primary Risk Factor:</strong>
                <p>{result.primary_churn_reason}</p>
              </div>
            </>
          ) : (
            <div className="whatif-placeholder">
              <span>🎯</span>
              <p>Adjust the sliders and click <strong>Run Simulation</strong> to see predicted churn risk</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
