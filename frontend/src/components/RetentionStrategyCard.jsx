import { useState } from "react";
import "./RetentionStrategyCard.css";

export default function RetentionStrategyCard({ retentionAdvice, onActionTriggered }) {
  const [activeAction, setActiveAction] = useState(null);

  const handleAction = (actionName) => {
    setActiveAction(actionName);
    if (onActionTriggered) {
      onActionTriggered(actionName);
    }
    setTimeout(() => setActiveAction(null), 3000);
  };

  return (
    <div className="retention-strategy-card glass-card">
      <div className="strategy-header">
        <div className="strategy-title-group">
          <span className="strategy-tag font-bold">ACTIONABLE RETENTION STRATEGY</span>
          <h3 className="strategy-heading font-bold text-white">Recommended Intervention Plan</h3>
        </div>
        {activeAction && (
          <span className="action-active-badge animate-pulse">
            ✓ Action Logged: {activeAction}
          </span>
        )}
      </div>

      <div className="strategy-body">
        <p className="strategy-text">{retentionAdvice}</p>
      </div>

      <div className="strategy-cta-section">
        <span className="cta-section-label">DIRECT RETENTION ACTIONS</span>
        <div className="cta-buttons-grid">
          <button
            type="button"
            className={`cta-btn cta-btn-primary ${activeAction === "Outreach Call" ? "triggered" : ""}`}
            onClick={() => handleAction("Outreach Call")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>Trigger Outreach Call</span>
          </button>

          <button
            type="button"
            className={`cta-btn cta-btn-cyan ${activeAction === "Rebooking SMS" ? "triggered" : ""}`}
            onClick={() => handleAction("Rebooking SMS")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Send Rebooking SMS</span>
          </button>

          <button
            type="button"
            className={`cta-btn cta-btn-secondary ${activeAction === "Patient Advocate" ? "triggered" : ""}`}
            onClick={() => handleAction("Patient Advocate")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Assign Patient Advocate</span>
          </button>

          <button
            type="button"
            className={`cta-btn cta-btn-emerald ${activeAction === "Schedule Telehealth" ? "triggered" : ""}`}
            onClick={() => handleAction("Schedule Telehealth")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Schedule Telehealth</span>
          </button>
        </div>
      </div>
    </div>
  );
}
