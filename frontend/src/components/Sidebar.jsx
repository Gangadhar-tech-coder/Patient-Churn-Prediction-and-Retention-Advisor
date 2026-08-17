import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "advisor", label: "Retention Advisor", icon: "🔬" },
  { id: "cohort", label: "Cohort Analysis", icon: "📊" },
  { id: "reports", label: "Reports", icon: "📄" },
  { id: "analytics", label: "My Analytics", icon: "📈" },
];

export default function Sidebar({ activeView, onNavigate }) {
  const { user } = useAuth();

  return (
    <aside className="app-nav-sidebar">
      <div className="nav-brand">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        <div>
          <span className="nav-brand-name">Patient Churn</span>
          <span className="nav-brand-sub">Prediction</span>
        </div>
      </div>

      <nav className="nav-links">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-link ${activeView === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {user && (
        <div className="nav-user-card">
          <div className="nav-user-avatar">{user.name?.[0] || "U"}</div>
          <div className="nav-user-info">
            <span className="nav-user-name">{user.name}</span>
            <span className="nav-user-email">{user.email}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
