import { useMemo } from "react";
import GaugeChart from "./GaugeChart";
import DriverBars from "./DriverBars";
import "./BatchUpload.css";

const TIERS = ["All", "High", "Medium", "Low"];

export default function CohortView({
  results,
  search,
  onSearchChange,
  tierFilter,
  onTierFilterChange,
  selectedPatient,
  onSelectPatient,
  categoricalFeatures,
}) {
  const filtered = useMemo(() => {
    if (!results?.results) return [];
    return results.results
      .filter((r) => tierFilter === "All" || r.risk_level === tierFilter)
      .filter((r) =>
        (r.patient_id || "").toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => b.probability - a.probability);
  }, [results, search, tierFilter]);

  const handleDownloadCSV = () => {
    if (!filtered.length) return;
    const headers = ["patient_id", "probability", "percentage", "risk_level", "top_driver", "shap_value", "program", "action"];
    const rows = filtered.map((r) => {
      const top = r.drivers?.[0] || {};
      return [
        r.patient_id || `P-${r.index + 1}`,
        r.probability,
        r.percentage,
        r.risk_level,
        top.feature || "",
        top.shap_value ?? "",
        top.advice?.program || "",
        top.advice?.action || "",
      ];
    });
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cohort_churn_predictions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cohort-view">
      {results.warnings?.length > 0 && (
        <div className="warnings-banner">
          <strong>Parsing Warnings:</strong>
          <ul>
            {results.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <div className="cohort-toolbar-inner">
        <input
          type="text"
          className="search-input"
          placeholder="Search by Patient ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="tier-chips">
          {TIERS.map((t) => (
            <button
              key={t}
              className={`tier-chip ${tierFilter === t ? "active" : ""} tier-${t.toLowerCase()}`}
              onClick={() => onTierFilterChange(t)}
            >
              {t}
              {t !== "All" && (
                <span className="chip-count">
                  {results.results.filter((r) => r.risk_level === t).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <button className="download-btn" onClick={handleDownloadCSV}>
          ↓ Download CSV
        </button>
      </div>

      <div className="batch-table-wrapper">
        <table className="batch-table">
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Churn %</th>
              <th>Risk Tier</th>
              <th>Top Driver</th>
              <th>Advice</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((row) => {
              const topDriver = row.drivers?.[0] || {};
              const isSelected = selectedPatient?.index === row.index;
              return (
                <tr
                  key={row.index}
                  className={`clickable-row ${isSelected ? "selected-row" : ""}`}
                  onClick={() => onSelectPatient(row)}
                >
                  <td className="patient-id-col">{row.patient_id || `P-${row.index + 1}`}</td>
                  <td className="churn-pct-col">{row.percentage}%</td>
                  <td>
                    <span className={`risk-badge risk-badge-${row.risk_level.toLowerCase()}`}>
                      {row.risk_level}
                    </span>
                  </td>
                  <td className="driver-col">{topDriver.feature || "—"}</td>
                  <td className="advice-col">{topDriver.advice?.action || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > 50 && (
        <p className="batch-truncated">
          Showing first 50 of {filtered.length} matching patients
        </p>
      )}

      {selectedPatient && (
        <div className="detail-panel">
          <div className="detail-panel-header">
            <h3>Patient Detail — {selectedPatient.patient_id || `P-${selectedPatient.index + 1}`}</h3>
          </div>
          <div className="detail-panel-body">
            <div className="detail-gauge">
              <GaugeChart percentage={selectedPatient.percentage} riskLevel={selectedPatient.risk_level} />
            </div>
            <div className="detail-drivers">
              <h4>Top 3 SHAP Drivers</h4>
              <DriverBars
                drivers={selectedPatient.drivers}
                categoricalFeatures={categoricalFeatures}
                signed
              />
            </div>
            <div className="detail-advice">
              <h4>Retention Advice</h4>
              {selectedPatient.drivers.map((d, i) => (
                <div key={i} className="advice-item">
                  <strong>{d.feature}</strong>: {d.advice?.action || "—"}
                  <span className="advice-program">({d.advice?.program || ""})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
