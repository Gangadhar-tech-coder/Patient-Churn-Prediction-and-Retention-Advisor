import { useState, useRef } from "react";
import { batchPredict } from "../utils/api";
import "./BatchUpload.css";

export default function BatchUpload() {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError("Please upload a valid CSV file");
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const data = await batchPredict(file);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="batch-upload">
      <div className="batch-header">
        <h3 className="batch-title">Batch Churn Risk & Retention Advisor Analytics</h3>
      </div>

      <div
        className={`drop-zone ${dragActive ? "drag-active" : ""} ${file ? "has-file" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="file-input-hidden"
        />
        {file ? (
          <div className="file-info">
            <span className="file-name">{file.name}</span>
            <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        ) : (
          <div className="drop-prompt">
            <p className="drop-text">
              Drag & drop patient cohort CSV file, or <span className="drop-link">browse</span>
            </p>
            <p className="drop-hint">Supports full enriched dataset schemas</p>
          </div>
        )}
      </div>

      {error && <div className="batch-error">{error}</div>}

      {file && !results && (
        <button className="batch-button" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" /> Processing Cohort Batch...
            </>
          ) : (
            "Run Cohort Prediction & Advice Mapping"
          )}
        </button>
      )}

      {results && (
        <div className="batch-results">
          <div className="batch-summary">
            <div className="batch-stat">
              <div className="batch-stat-value">{results.total}</div>
              <div className="batch-stat-label">Total Cohort</div>
            </div>
            <div className="batch-stat batch-stat-high">
              <div className="batch-stat-value">{results.high_risk}</div>
              <div className="batch-stat-label">High Risk</div>
            </div>
            <div className="batch-stat batch-stat-medium">
              <div className="batch-stat-value">{results.medium_risk}</div>
              <div className="batch-stat-label">Medium Risk</div>
            </div>
            <div className="batch-stat batch-stat-low">
              <div className="batch-stat-value">{results.low_risk}</div>
              <div className="batch-stat-label">Low Risk</div>
            </div>
          </div>

          <div className="batch-table-wrapper">
            <table className="batch-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Churn %</th>
                  <th>Risk Tier</th>
                  <th>Diagnosed Churn Reason</th>
                  <th>Targeted Retention Advice</th>
                </tr>
              </thead>
              <tbody>
                {results.results.slice(0, 50).map((row) => (
                  <tr key={row.index}>
                    <td className="patient-id-col">{row.patient_id || `P-${row.index + 1}`}</td>
                    <td className="churn-pct-col">{row.percentage}%</td>
                    <td>
                      <span className={`risk-badge risk-badge-${row.risk_level.toLowerCase()}`}>
                        {row.risk_level}
                      </span>
                    </td>
                    <td className="reason-col">{row.primary_churn_reason}</td>
                    <td className="advice-col">{row.retention_advice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {results.results.length > 50 && (
            <p className="batch-truncated">Showing first 50 of {results.results.length} patient records</p>
          )}
        </div>
      )}
    </div>
  );
}
