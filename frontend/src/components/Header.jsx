import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { checkHealth } from "../utils/api";
import "./Header.css";

export default function Header() {
  const { user } = useAuth();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    checkHealth().then(setHealth).catch(() => {});
  }, []);

  return (
    <header className="app-header-bar">
      <div className="header-left">
        <div className="header-brand">
          <div className="header-brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <span className="header-brand-name">Patient Churn Prediction</span>
            <span className="header-brand-sub">Patient Retention Advisor</span>
          </div>
        </div>
        {health && health.model_loaded && (
          <span className="health-badge">
            <span className="health-dot" /> Model Service Connected
          </span>
        )}
      </div>

      <div className="header-right">
        {user && (
          <div className="header-user-welcome">
            <span className="user-greeting">Welcome, {user.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
