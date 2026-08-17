import { useState } from "react";
import Header from "./components/Header";
import BatchUpload from "./components/BatchUpload";
import CohortView from "./components/CohortView";
import GaugeChart from "./components/GaugeChart";
import DriverBars from "./components/DriverBars";
import Footer from "./components/Footer";
import "./App.css";

const TABS = [
  { id: "overview", label: "Risk & Retention Overview" },
  { id: "analysis", label: "Detailed Analysis" },
  { id: "plan", label: "Retention Action Plan" },
  { id: "cohort", label: "Cohort Results" },
];

const CATEGORICAL_FEATURES = [
  "Insurance_Type", "Gender", "State", "Specialty",
];

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [cohortResults, setCohortResults] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("All");
  const [error, setError] = useState(null);

  const handleClear = () => {
    setCohortResults(null);
    setSelectedPatient(null);
    setSearch("");
    setTierFilter("All");
    setActiveTab("overview");
  };

  const handleCohortResults = (data) => {
    setCohortResults(data);
    setError(null);
    setActiveTab("overview");
  };

  return (
    <div className="app-layout">
      <main className="main-content main-content-full">
        <Header />

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="error-dismiss">✕</button>
          </div>
        )}

        {!cohortResults ? (
          <div className="upload-first">
            <BatchUpload
              onResults={handleCohortResults}
              onError={setError}
            />
          </div>
        ) : (
          <>
            <div className="cohort-toolbar">
              <button className="clear-btn" onClick={handleClear}>
                ← New Upload
              </button>
              {cohortResults.sampled && (
                <span className="sampled-notice">
                  Showing SHAP drivers for {cohortResults.sample_size} of {cohortResults.total} patients
                </span>
              )}
            </div>

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
              {activeTab === "overview" && (
                <OverviewTab
                  results={cohortResults}
                  selectedPatient={selectedPatient}
                  onSelectPatient={setSelectedPatient}
                  categoricalFeatures={CATEGORICAL_FEATURES}
                />
              )}
              {activeTab === "analysis" && selectedPatient && (
                <AnalysisTab
                  patient={selectedPatient}
                  categoricalFeatures={CATEGORICAL_FEATURES}
                />
              )}
              {activeTab === "analysis" && !selectedPatient && (
                <div className="empty-tab">
                  <p>Select a patient from the Cohort Results tab to view detailed SHAP analysis.</p>
                </div>
              )}
              {activeTab === "plan" && selectedPatient && (
                <PlanTab patient={selectedPatient} />
              )}
              {activeTab === "plan" && !selectedPatient && (
                <div className="empty-tab">
                  <p>Select a patient from the Cohort Results tab to view their retention action plan.</p>
                </div>
              )}
              {activeTab === "cohort" && (
                <CohortView
                  results={cohortResults}
                  search={search}
                  onSearchChange={setSearch}
                  tierFilter={tierFilter}
                  onTierFilterChange={setTierFilter}
                  selectedPatient={selectedPatient}
                  onSelectPatient={setSelectedPatient}
                  categoricalFeatures={CATEGORICAL_FEATURES}
                />
              )}
            </div>
          </>
        )}

        <Footer />
      </main>
    </div>
  );
}

function OverviewTab({ results, selectedPatient, categoricalFeatures }) {
  const { total, high_risk, medium_risk, low_risk } = results;
  const topDrivers = getTopGlobalDrivers(results.results);

  return (
    <div className="overview-tab">
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-value">{total}</div>
          <div className="kpi-label">Total Patients</div>
        </div>
        <div className="kpi-card kpi-high">
          <div className="kpi-value">{high_risk}</div>
          <div className="kpi-label">High Risk</div>
        </div>
        <div className="kpi-card kpi-medium">
          <div className="kpi-value">{medium_risk}</div>
          <div className="kpi-label">Medium Risk</div>
        </div>
        <div className="kpi-card kpi-low">
          <div className="kpi-value">{low_risk}</div>
          <div className="kpi-label">Low Risk</div>
        </div>
      </div>

      <div className="overview-section">
        <h3 className="section-title">Top Churn Drivers (Cohort)</h3>
        <DriverBars drivers={topDrivers} categoricalFeatures={categoricalFeatures} />
      </div>

      {selectedPatient && (
        <div className="overview-section">
          <h3 className="section-title">Selected Patient</h3>
          <div className="selected-patient-card">
            <div className="selected-patient-gauge">
              <GaugeChart percentage={selectedPatient.percentage} riskLevel={selectedPatient.risk_level} />
            </div>
            <div className="selected-patient-drivers">
              <DriverBars drivers={selectedPatient.drivers} categoricalFeatures={categoricalFeatures} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisTab({ patient, categoricalFeatures }) {
  return (
    <div className="analysis-tab">
      <div className="analysis-header">
        <GaugeChart percentage={patient.percentage} riskLevel={patient.risk_level} />
        <div className="analysis-patient-info">
          <h3>{patient.patient_id || "Patient"}</h3>
          <p className="risk-tier-badge">{patient.risk_level} Risk</p>
        </div>
      </div>
      <div className="overview-section">
        <h3 className="section-title">SHAP Feature Drivers (Signed)</h3>
        <p className="section-hint">
          Red bars push churn risk up. Green bars push churn risk down.
          {categoricalFeatures.length > 0 && " Categorical features show magnitude only (direction not meaningful)."}
        </p>
        <DriverBars drivers={patient.drivers} categoricalFeatures={categoricalFeatures} signed />
      </div>
    </div>
  );
}

function PlanTab({ patient }) {
  return (
    <div className="plan-tab">
      <h3 className="section-title">Retention Action Plan — {patient.patient_id || "Patient"}</h3>
      <div className="plan-cards">
        {patient.drivers.map((driver, idx) => (
          <div key={idx} className="plan-card">
            <div className="plan-card-header">
              <span className="plan-feature">{driver.feature}</span>
              <span className="plan-shap">SHAP: {driver.shap_value > 0 ? "+" : ""}{driver.shap_value}</span>
            </div>
            {driver.advice && (
              <div className="plan-advice">
                <div className="plan-program">{driver.advice.program}</div>
                <div className="plan-action">{driver.advice.action}</div>
                <div className="plan-detail">{driver.advice.detail}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function getTopGlobalDrivers(results) {
  const driverMap = {};
  for (const row of results) {
    for (const d of row.drivers) {
      const key = d.feature;
      if (!driverMap[key]) driverMap[key] = { feature: key, total_abs: 0, count: 0, sum: 0 };
      driverMap[key].total_abs += Math.abs(d.shap_value);
      driverMap[key].sum += d.shap_value;
      driverMap[key].count += 1;
    }
  }
  return Object.values(driverMap)
    .map((d) => ({
      feature: d.feature,
      shap_value: d.sum / d.count,
      count: d.count,
    }))
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
    .slice(0, 8);
}


