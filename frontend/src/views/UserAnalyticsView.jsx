import { useState, useEffect } from "react";
import { getUserAnalytics, getHistory } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./views.css";

export default function UserAnalyticsView() {
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

  if (!user) {
    return (
      <div className="view-container">
        <div className="analytics-empty">
          <h3>Authentication Required</h3>
          <p>Please sign in to view your analytics and prediction history.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="view-container">
        <p>Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className="view-container">
      <h1 className="view-title">User Analytics Dashboard</h1>
      <p className="view-desc">Track your patient prediction history, cohort uploads, and risk distribution metrics.</p>

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
  );
}
