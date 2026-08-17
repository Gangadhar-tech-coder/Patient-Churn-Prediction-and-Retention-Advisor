import "./ProbabilityGauge.css";

export default function ProbabilityGauge({ percentage, riskLevel }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = riskLevel === "High" ? "#ef4444" : riskLevel === "Medium" ? "#f59e0b" : "#22c55e";

  return (
    <div className="prob-gauge">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        <circle
          cx="90" cy="90" r={radius} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 90 90)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="gauge-center">
        <span className="gauge-value" style={{ color }}>{percentage}%</span>
        <span className="gauge-label">Churn Risk</span>
      </div>
      <div className="gauge-badge" style={{ background: color }}>
        {riskLevel} Risk
      </div>
    </div>
  );
}
