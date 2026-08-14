import "./Interventions.css";

const PRIORITY_CONFIG = {
  high: { className: "intervention-high", badge: "URGENT" },
  medium: { className: "intervention-medium", badge: "MODERATE" },
  low: { className: "intervention-low", badge: "STANDARD" },
};

export default function Interventions({ interventions, retentionAdvice }) {
  return (
    <div className="interventions">
      <div className="interventions-header">
        <h3 className="interventions-title">Targeted Retention Action Plan</h3>
      </div>

      {retentionAdvice && (
        <div className="primary-advice-banner">
          <div className="banner-title">PRIMARY RETENTION ADVICE</div>
          <div className="banner-text">{retentionAdvice}</div>
        </div>
      )}

      <div className="interventions-list">
        {interventions && interventions.map((item, idx) => {
          const config = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.low;
          return (
            <div key={idx} className={`intervention-item ${config.className}`}>
              <span className="intervention-text">{item.text}</span>
              <span className={`intervention-badge ${config.className}`}>
                {config.badge}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
