import { useState } from "react";
import { predictChurn } from "../utils/api";
import "./views.css";

export default function ReportsView() {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateSample = async () => {
    setLoading(true);
    try {
      const result = await predictChurn({
        age: 58, gender: "Female", state: "CA", specialty: "General Practice",
        insurance_type: "Private", tenure_months: 24, referrals_made: 1,
        visits_last_year: 2, missed_appointments: 3, days_since_last_visit: 190,
        portal_usage: 0, overall_satisfaction: 2.1, wait_time_satisfaction: 1.8,
        staff_satisfaction: 2.5, provider_rating: 3.0, avg_out_of_pocket_cost: 1450,
        distance_to_facility: 28.5, billing_issues: 1,
      });
      setPrediction(result);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handlePrint = () => window.print();

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" });

  return (
    <div className="view-container">
      <div className="reports-header">
        <div>
          <h1 className="view-title">Reports</h1>
          <p className="view-desc">Generate formal patient prediction documents and dataset analytics reports.</p>
        </div>
      </div>

      {!prediction ? (
        <div className="report-empty">
          <p>Generate a patient report to view it here.</p>
          <button className="predict-btn" onClick={generateSample} disabled={loading}>
            {loading ? "Generating..." : "📄 Generate Sample Report"}
          </button>
        </div>
      ) : (
        <>
          <div className="report-toolbar">
            <span className="report-doc-label">📄 Individual Patient Report Document</span>
            <button className="print-btn" onClick={handlePrint}>🖨️ Print / Download Report</button>
          </div>

          <div className="report-document" id="printable-report">
            <div className="report-doc-header">
              <div>
                <h2>Patient Churn Prediction</h2>
                <p className="report-sub">Patient Retention Advisor • Clinical Report</p>
              </div>
              <div className="report-meta">
                <div>Report Date: {today}</div>
                <div>Patient ID: P-1001</div>
              </div>
            </div>

            <hr />

            <h3 className="report-section-title">1. PATIENT PROFILE SUMMARY</h3>
            <div className="report-profile-grid">
              <div className="rp-item"><span className="rp-label">AGE / GENDER</span><span>58 yrs • Female</span></div>
              <div className="rp-item"><span className="rp-label">SPECIALTY</span><span>General Practice</span></div>
              <div className="rp-item"><span className="rp-label">INSURANCE</span><span>Private</span></div>
              <div className="rp-item"><span className="rp-label">TENURE</span><span>24 months</span></div>
              <div className="rp-item"><span className="rp-label">VISITS LAST YEAR</span><span>2 visits</span></div>
              <div className="rp-item"><span className="rp-label">DAYS SINCE LAST VISIT</span><span>190 days</span></div>
            </div>

            <h3 className="report-section-title">2. CHURN RISK & PREDICTION</h3>
            <div className="report-risk-box">
              <span className="report-pct">{prediction.percentage}%</span>
              <div>
                <span className={`report-risk-badge ${prediction.risk_level.toLowerCase()}`}>
                  {prediction.risk_level} RISK
                </span>
                <p>Prediction: <strong>{prediction.percentage >= 50 ? "Likely to Churn" : "Predicted Retained"}</strong></p>
              </div>
            </div>

            <h3 className="report-section-title">3. PRIMARY RISK FACTOR</h3>
            <div className="report-highlight yellow">
              <span className="rp-label">MAIN RISK DRIVER:</span>
              <p>{prediction.primary_churn_reason}</p>
            </div>

            <h3 className="report-section-title">4. RECOMMENDED STRATEGY</h3>
            <div className="report-highlight blue">
              <span className="rp-label">RECOMMENDED INTERVENTION:</span>
              <p>{prediction.retention_advice}</p>
            </div>

            <div className="report-footer">
              <span>Patient Churn Prediction AI Engine v2.0 • Decision Support Output</span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
