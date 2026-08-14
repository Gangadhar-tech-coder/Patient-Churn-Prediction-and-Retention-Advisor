import "./RetentionAdviceCard.css";

export default function RetentionAdviceCard({ primaryReason, retentionAdvice, riskLevel }) {
  const isAtRisk = riskLevel === "High" || riskLevel === "Medium";
  const riskTag = riskLevel ? `${riskLevel.toUpperCase()} RISK` : "DIAGNOSIS";

  return (
    <div className={`retention-hero-card ${isAtRisk ? "at-risk" : "satisfied"}`}>
      <div className="retention-accent-bar" />
      <div className="retention-card-content">
        <div className="hero-section reason-section">
          <div className="hero-meta-row">
            <span className="hero-category-tag">DIAGNOSED ROOT CAUSE</span>
            <span className={`hero-risk-pill ${riskLevel ? `pill-${riskLevel.toLowerCase()}` : ""}`}>
              {riskTag}
            </span>
          </div>
          <h2 className="hero-reason-text">{primaryReason}</h2>
        </div>

        <div className="hero-section advice-section">
          <div className="hero-advice-header">
            <span className="hero-advice-tag">ACTIONABLE RETENTION STRATEGY</span>
          </div>
          <div className="hero-advice-box">
            <p className="hero-advice-body">{retentionAdvice}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
