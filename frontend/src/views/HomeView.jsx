import { useState, useEffect } from "react";
import { getUserAnalytics, getHistory } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./views.css";

export default function HomeView({ onNavigate }) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([getUserAnalytics(), getHistory()])
      .then(([a, h]) => {
        setAnalytics(a);
        setHistory(h.history || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="view-container">
      <div className="view-badge">Patient Retention Advisor</div>
      <h1 className="view-title">Welcome to Patient Churn Prediction</h1>
      <p className="view-subtitle-blue">Patient Retention & Risk Management Platform</p>
      <p className="view-desc">
        Identify churn risk, understand patient needs, and take targeted retention actions.
      </p>

      <div className="home-cards">
        <div className="home-card">
          <div className="home-card-icon" style={{ background: "#eff6ff" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3>Predict a Patient</h3>
          <p>
            Enter individual patient details to predict churn risk and receive a personalized retention recommendation.
          </p>
          <button className="home-card-btn primary" onClick={() => onNavigate("advisor")}>
            Predict Patient
          </button>
        </div>

        <div className="home-card">
          <div className="home-card-icon" style={{ background: "#f0fdf4" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <h3>Analyze Patient Dataset</h3>
          <p>
            Upload a CSV or Excel dataset to evaluate churn risk across multiple patients, identify at-risk patients, and prioritize retention actions.
          </p>
          <button className="home-card-btn outline" onClick={() => onNavigate("cohort")}>
            Upload Dataset
          </button>
        </div>
      </div>

      <div className="how-it-works">
        <h4>HOW PATIENT CHURN PREDICTION WORKS</h4>
        <div className="steps-row">
          {[
            { step: "STEP 1", label: "Enter Patient Data" },
            { step: "STEP 2", label: "Predict Churn Risk" },
            { step: "STEP 3", label: "Get Retention Advice" },
            { step: "STEP 4", label: "Take Action" },
          ].map((s, i) => (
            <div key={i} className="step-item">
              {i > 0 && <span className="step-arrow">&rarr;</span>}
              <div className="step-box">
                <span className="step-num">{s.step}</span>
                <span className="step-label">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics integrated into Home */}
      {user && !loading && (
        <div style={{ marginTop: "40px", borderTop: "1px solid #e5e7eb", paddingTop: "40px" }}>
          <h2 className="view-title" style={{ fontSize: "24px" }}>My Analytics Dashboard</h2>
          <p className="view-desc" style={{ marginBottom: "24px" }}>Track your patient prediction history, cohort uploads, and risk distribution metrics.</p>

          {analytics && (
            <div className="analytics-cards">
              <div className="an-card">
                <span className="an-val">{analytics.total_evaluated}</span>
                <span className="an-label">Total Evaluated</span>
              </div>
              <div className="an-card">
                <span className="an-val">{analytics.avg_churn}%</span>
                <span className="an-label">Avg Churn Risk</span>
              </div>
              <div className="an-card danger">
                <span className="an-val">{analytics.high_risk_count}</span>
                <span className="an-label">High Risk</span>
              </div>
              <div className="an-card warning">
                <span className="an-val">{analytics.medium_risk_count}</span>
                <span className="an-label">Medium Risk</span>
              </div>
              <div className="an-card success">
                <span className="an-val">{analytics.low_risk_count}</span>
                <span className="an-label">Low Risk</span>
              </div>
            </div>
          )}

          {/* Cohort Upload History */}
          {analytics?.cohort_uploads?.length > 0 && (
            <div className="analytics-section">
              <h3>Cohort Upload History</h3>
              <div className="cohort-history-grid">
                {analytics.cohort_uploads.map((c, i) => (
                  <div key={i} className="cohort-history-card">
                    <span className="ch-filename">{c.filename}</span>
                    <div className="ch-stats">
                      <span>Total: {c.total_patients}</span>
                      <span className="ch-high">High: {c.high_risk}</span>
                      <span className="ch-med">Med: {c.medium_risk}</span>
                      <span className="ch-low">Low: {c.low_risk}</span>
                    </div>
                    <span className="ch-date">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prediction History */}
          <div className="analytics-section">
            <h3>Recent Prediction History</h3>
            {history.length === 0 ? (
              <p className="analytics-empty-text">No prediction records found yet. Start by assessing a patient.</p>
            ) : (
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Churn Risk</th>
                      <th>Risk Level</th>
                      <th>Primary Reason</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 20).map((h, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>
                          <strong>{(h.probability * 100).toFixed(1)}%</strong>
                        </td>
                        <td>
                          <span className={`risk-tag ${h.risk_level.toLowerCase()}`}>{h.risk_level}</span>
                        </td>
                        <td className="reason-cell">{h.primary_reason}</td>
                        <td>{new Date(h.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
