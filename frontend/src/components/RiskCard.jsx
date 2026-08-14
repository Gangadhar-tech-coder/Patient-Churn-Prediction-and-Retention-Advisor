import "./RiskCard.css";

const RISK_CONFIG = {
  High: { desc: "Immediate retention intervention required", className: "risk-high" },
  Medium: { desc: "Proactive retention monitoring advised", className: "risk-medium" },
  Low: { desc: "Patient engaged & satisfied", className: "risk-low" },
};

export default function RiskCard({ riskLevel, percentage }) {
  const config = RISK_CONFIG[riskLevel] || RISK_CONFIG.Low;

  return (
    <div className={`risk-card ${config.className}`}>
      <div className="risk-card-inner">
        <span className="risk-label">
          {riskLevel} CHURN RISK
        </span>
        <div className="risk-pct">
          {percentage}
          <span className="risk-pct-symbol">%</span>
        </div>
        <p className="risk-desc">{config.desc}</p>
      </div>
    </div>
  );
}
