import "./Header.css";

export default function Header() {
  return (
    <header className="app-header">
      <div className="header-glow" />
      <div className="header-content">
        <div className="header-title-row">
          <div className="header-logo-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="header-title">Patient Churn & Retention Advisor</h1>
        </div>
        <p className="header-subtitle">
          AI-powered churn probability %, diagnostic root-cause reason, and tailored retention advice
        </p>
        <div className="header-badges">
          <span className="header-badge">
            <span className="badge-dot badge-dot--purple" />
            ROC-AUC 0.6065
          </span>
          <span className="header-badge">
            <span className="badge-dot badge-dot--cyan" />
            Random Forest Classifier
          </span>
          <span className="header-badge">
            <span className="badge-dot badge-dot--green" />
            2,000 Enriched Records
          </span>
        </div>
      </div>
    </header>
  );
}
