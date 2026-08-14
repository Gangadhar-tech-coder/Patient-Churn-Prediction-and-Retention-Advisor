import "./Footer.css";

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-text">
            Patient Churn Predictor & Retention Advisor <span className="footer-version">v2.0 Enriched</span>
          </span>
        </div>
        <div className="footer-divider" />
        <div className="footer-meta">
          <span>Random Forest (AUC 0.6065)</span>
          <span className="footer-sep">•</span>
          <span>FastAPI + React</span>
        </div>
      </div>
    </footer>
  );
}
