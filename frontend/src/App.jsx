import { useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import RiskCard from "./components/RiskCard";
import GaugeChart from "./components/GaugeChart";
import RetentionAdviceCard from "./components/RetentionAdviceCard";
import MetricCard from "./components/MetricCard";
import FeatureChart from "./components/FeatureChart";
import Interventions from "./components/Interventions";
import BatchUpload from "./components/BatchUpload";
import Footer from "./components/Footer";
import { predictChurn } from "./utils/api";
import "./App.css";

const TABS = [
  { id: "risk", label: "Risk & Retention Overview" },
  { id: "analysis", label: "Detailed Analysis" },
  { id: "interventions", label: "Retention Action Plan" },
  { id: "batch", label: "Cohort Batch Predict" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("risk");
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePredict = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await predictChurn(formData);
      setPrediction(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar onPredict={handlePredict} loading={loading} />
      <main className="main-content">
        <Header />

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="error-dismiss">
              ✕
            </button>
          </div>
        )}

        {!prediction ? (
          <EmptyState />
        ) : (
          <>
            <nav className="tab-nav">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="tab-label">{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="tab-content">
              {activeTab === "risk" && (
                <RiskOverviewTab prediction={prediction} />
              )}
              {activeTab === "analysis" && (
                <FeatureChart
                  contributions={prediction.feature_contributions}
                />
              )}
              {activeTab === "interventions" && (
                <Interventions
                  interventions={prediction.interventions}
                  retentionAdvice={prediction.retention_advice}
                />
              )}
              {activeTab === "batch" && <BatchUpload />}
            </div>
          </>
        )}

        <Footer />
      </main>
    </div>
  );
}

function RiskOverviewTab({ prediction }) {
  const { percentage, risk_level, primary_churn_reason, retention_advice, metrics } = prediction;
  return (
    <div className="risk-tab">
      <div className="risk-tab-top">
        <div className="risk-tab-left">
          <RiskCard riskLevel={risk_level} percentage={percentage} />
        </div>
        <div className="risk-tab-right">
          <GaugeChart percentage={percentage} riskLevel={risk_level} />
        </div>
      </div>

      {/* Primary Reason & Retention Advice Hero Banner */}
      <RetentionAdviceCard
        primaryReason={primary_churn_reason}
        retentionAdvice={retention_advice}
        riskLevel={risk_level}
      />

      <div className="metrics-grid">
        <MetricCard
          label="Engagement Score"
          value={metrics.engagement_score}
          accentColor="var(--accent-primary)"
        />
        <MetricCard
          label="Avg Satisfaction"
          value={`${metrics.satisfaction_avg}/5.0`}
          accentColor="var(--risk-medium)"
        />
        <MetricCard
          label="Cost per Visit"
          value={`$${Math.round(metrics.cost_per_visit)}`}
          accentColor="var(--accent-cyan)"
        />
        <MetricCard
          label="Visit Frequency"
          value={`${metrics.visit_frequency}/yr`}
          accentColor="var(--risk-low)"
        />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-inner">
        <div className="empty-icon-wrapper">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <h2 className="empty-title">Ready for Patient Assessment</h2>
        <p className="empty-desc">
          Complete the patient parameters on the left and click
          <strong> "Diagnose Risk & Advice"</strong> to generate predicted churn %, root-cause reason, and tailored retention advice.
        </p>
        <div className="empty-features">
          <div className="empty-feature">
            <span>Churn Risk %</span>
          </div>
          <div className="empty-feature">
            <span>Diagnosed Reason</span>
          </div>
          <div className="empty-feature">
            <span>Retention Advice</span>
          </div>
        </div>
      </div>
    </div>
  );
}
