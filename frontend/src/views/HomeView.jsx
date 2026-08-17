import "./views.css";

export default function HomeView({ onNavigate }) {
  return (
    <div className="view-container">
      <div className="view-badge">Patient Retention Advisor</div>
      <h1 className="view-title">Welcome to Patient Churn Prediction</h1>
      <p className="view-subtitle-blue">Patient Retention & Risk Management Platform</p>
      <p className="view-desc">
        Identify churn risk, understand patient needs, and take targeted retention actions.
      </p>

      <div className="home-cards">
        <div className="home-card">
          <div className="home-card-icon" style={{ background: "#eff6ff" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3>Predict a Patient</h3>
          <p>
            Enter individual patient details to predict churn risk and receive a personalized retention recommendation.
          </p>
          <button className="home-card-btn primary" onClick={() => onNavigate("advisor")}>
            Predict Patient
          </button>
        </div>

        <div className="home-card">
          <div className="home-card-icon" style={{ background: "#f0fdf4" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <h3>Analyze Patient Dataset</h3>
          <p>
            Upload a CSV or Excel dataset to evaluate churn risk across multiple patients, identify at-risk patients, and prioritize retention actions.
          </p>
          <button className="home-card-btn outline" onClick={() => onNavigate("cohort")}>
            Upload Dataset
          </button>
        </div>
      </div>

      <div className="how-it-works">
        <h4>HOW PATIENT CHURN PREDICTION WORKS</h4>
        <div className="steps-row">
          {[
            { step: "STEP 1", label: "Enter Patient Data" },
            { step: "STEP 2", label: "Predict Churn Risk" },
            { step: "STEP 3", label: "Get Retention Advice" },
            { step: "STEP 4", label: "Take Action" },
          ].map((s, i) => (
            <div key={i} className="step-item">
              {i > 0 && <span className="step-arrow">&rarr;</span>}
              <div className="step-box">
                <span className="step-num">{s.step}</span>
                <span className="step-label">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
