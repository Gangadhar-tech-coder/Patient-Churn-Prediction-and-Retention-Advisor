import { useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import UnifiedRiskSummaryCard from "./components/UnifiedRiskSummaryCard";
import RetentionStrategyCard from "./components/RetentionStrategyCard";
import MetricCardRow from "./components/MetricCardRow";
import FeatureChart from "./components/FeatureChart";
import Interventions from "./components/Interventions";
import BatchUpload from "./components/BatchUpload";
import Footer from "./components/Footer";
import ActionToast from "./components/ActionToast";
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
  const [toastMessage, setToastMessage] = useState(null);

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

  const handleActionTriggered = (actionName) => {
    setToastMessage(`Outreach Action Triggered: ${actionName} logged for patient.`);
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
                <RiskOverviewTab
                  prediction={prediction}
                  onActionTriggered={handleActionTriggered}
                />
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

      <ActionToast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}

function RiskOverviewTab({ prediction, onActionTriggered }) {
  const { percentage, risk_level, primary_churn_reason, retention_advice, metrics } = prediction;
  return (
    <div className="risk-tab">
      {/* Unified Risk Summary Card combining percentage gauge and Diagnosed Root Cause */}
      <UnifiedRiskSummaryCard
        percentage={percentage}
        riskLevel={risk_level}
        primaryReason={primary_churn_reason}
      />

      {/* Interactive Actionable Retention Strategy Card with CTA outreach buttons */}
      <RetentionStrategyCard
        retentionAdvice={retention_advice}
        onActionTriggered={onActionTriggered}
      />

      {/* Bottom Row of 4 Sleek Metric Cards */}
      <MetricCardRow metrics={metrics} />
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
