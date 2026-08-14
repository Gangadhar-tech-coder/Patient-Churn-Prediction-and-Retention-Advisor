import GaugeChart from "./GaugeChart";
import "./UnifiedRiskSummaryCard.css";

const RISK_CONFIG = {
  High: {
    title: "HIGH CHURN RISK",
    desc: "Immediate retention intervention required to prevent patient disengagement",
    className: "risk-high",
    pillClass: "pill-high",
  },
  Medium: {
    title: "MEDIUM CHURN RISK",
    desc: "Proactive retention monitoring and engagement outreach recommended",
    className: "risk-medium",
    pillClass: "pill-medium",
  },
  Low: {
    title: "LOW CHURN RISK",
    desc: "Patient is well-engaged and satisfied with current care services",
    className: "risk-low",
    pillClass: "pill-low",
  },
};

export default function UnifiedRiskSummaryCard({ percentage, riskLevel, primaryReason }) {
  const config = RISK_CONFIG[riskLevel] || RISK_CONFIG.Low;

  return (
    <div className={`unified-risk-summary-card ${config.className}`}>
      <div className="unified-card-grid">
        {/* Gauge & Percentage Column */}
        <div className="unified-gauge-col">
          <GaugeChart percentage={percentage} riskLevel={riskLevel} />
          <div className="unified-risk-badge-wrapper">
            <span className={`unified-risk-pill ${config.pillClass}`}>
              {config.title}
            </span>
          </div>
        </div>

        {/* Diagnosed Root Cause Panel */}
        <div className="unified-cause-col">
          <div className="cause-panel-header">
            <span className="cause-tag">DIAGNOSED ROOT CAUSE</span>
            <span className="cause-status-indicator">Verified by ML Model</span>
          </div>

          <h2 className="cause-title-text">{primaryReason}</h2>
          <p className="cause-description-text">{config.desc}</p>

          <div className="cause-metrics-row">
            <div className="cause-mini-stat">
              <span className="mini-stat-label">Prediction Confidence</span>
              <span className="mini-stat-val">High (Random Forest)</span>
            </div>
            <div className="cause-mini-stat">
              <span className="mini-stat-label">Calculated Score</span>
              <span className="mini-stat-val">{percentage}% Churn Prob</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
