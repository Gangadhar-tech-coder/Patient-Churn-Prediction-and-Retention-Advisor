import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

export default function Sidebar({ activeView, onNavigate }) {
  const { user, signout } = useAuth();

  const NAV_ITEMS = [
    {
      id: "home",
      label: "Home",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
    },
    {
      id: "advisor",
      label: "Retention Advisor",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
    },
    {
      id: "cohort",
      label: "Cohort Analysis",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      ),
    },
    {
      id: "analytics",
      label: "My Analytics",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
          <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
      ),
    },
  ];

  return (
    <aside className="app-nav-sidebar">
      <div className="nav-brand">
        <div className="nav-brand-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
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
          <div className="nav-user-left">
            <div className="nav-user-avatar">{user.name?.[0] || "U"}</div>
            <div className="nav-user-info">
              <span className="nav-user-name">{user.name}</span>
              <span className="nav-user-email">{user.email}</span>
            </div>
          </div>
          <button className="sidebar-signout-btn" onClick={signout} title="Sign Out">
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
