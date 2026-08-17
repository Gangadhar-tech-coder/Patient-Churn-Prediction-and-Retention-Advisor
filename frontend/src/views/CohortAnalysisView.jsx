import { useState, useRef } from "react";
import { batchPredict } from "../utils/api";
import RiskPieChart from "../components/RiskPieChart";
import "./views.css";

export default function CohortAnalysisView() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const processFile = (f) => {
    const ext = f.name.toLowerCase();
    if (!ext.endsWith(".csv") && !ext.endsWith(".xlsx") && !ext.endsWith(".xls")) {
      setError("Please upload a CSV or Excel (.xlsx, .xls) file");
      return;
    }
    setFile(f); setError(null); setResults(null);
    // CSV preview
    if (ext.endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const lines = e.target.result.split("\n").filter(Boolean);
        const headers = lines[0].split(",");
        const rows = lines.slice(1, 6).map((l) => l.split(","));
        setPreview({ headers, rows, totalRows: lines.length - 1, totalCols: headers.length });
      };
      reader.readAsText(f);
    } else {
      setPreview({ headers: ["Excel file"], rows: [], totalRows: "?", totalCols: "?" });
    }
  };

  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); };
  const handleFileChange = (e) => { if (e.target.files[0]) processFile(e.target.files[0]); };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const data = await batchPredict(file);
      setResults(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDownloadPDF = () => {
    const printArea = document.getElementById("cohort-print-area");
    if (printArea) { window.print(); }
  };

  const filteredResults = results?.results?.filter((r) =>
    filter === "all" ? true : r.risk_level.toLowerCase() === filter
  ) || [];

  // Histogram data
  const histogram = [0, 0, 0, 0, 0];
  results?.results?.forEach((r) => {
    if (r.percentage <= 20) histogram[0]++;
    else if (r.percentage <= 40) histogram[1]++;
    else if (r.percentage <= 60) histogram[2]++;
    else if (r.percentage <= 80) histogram[3]++;
    else histogram[4]++;
  });
  const histMax = Math.max(...histogram, 1);

  return (
    <div className="view-container" id="cohort-print-area">
      <h1 className="view-title">Analyze Patient Cohort</h1>
      <p className="view-desc">Upload a patient CSV to evaluate churn risk across multiple patients and prioritize retention actions.</p>

      {/* Drop Zone */}
      <div
        className={`cohort-drop ${dragActive ? "active" : ""} ${file ? "has-file" : ""}`}
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag}
        onDrop={handleDrop} onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} hidden />
        {file ? (
          <div className="cohort-file-info">
            <span className="file-icon">📄</span>
            <div>
              <strong>{file.name}</strong>
              <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
            <span className="file-status">✅ Dataset Uploaded</span>
          </div>
        ) : (
          <>
            <div className="drop-cloud">☁️</div>
            <p><strong>Drag & drop your patient CSV here</strong></p>
            <p className="drop-hint">or click to browse from your device</p>
            <button className="browse-btn" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>Browse Files</button>
            <p className="drop-hint">Supported formats: CSV, Excel (.xlsx, .xls)</p>
          </>
        )}
      </div>

      {error && <div className="view-error">{error}</div>}

      {/* Preview */}
      {preview && preview.rows.length > 0 && (
        <div className="cohort-preview">
          <div className="preview-header">
            <span>📊 {file?.name}</span>
            <span>{preview.totalRows} rows • {preview.totalCols} columns</span>
          </div>
          <p className="preview-label">DATASET PREVIEW (FIRST 5 ROWS)</p>
          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead><tr>{preview.headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
              <tbody>{preview.rows.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {file && !results && (
        <div className="cohort-analyze-row">
          <button className="predict-btn" onClick={handleAnalyze} disabled={loading}>
            {loading ? "Analyzing..." : "⚡ Analyze Dataset"}
          </button>
        </div>
      )}

      {/* Results */}
      {results && (
        <>
          <div className="cohort-results-header">
            <h2>Cohort Results</h2>
            <span className="cohort-count">{results.total} patients analyzed</span>
            <button className="print-btn" onClick={handleDownloadPDF}>📥 Download Cohort PDF</button>
          </div>

          {/* Summary Cards */}
          <div className="cohort-summary">
            <div className="cs-card total"><span className="cs-label">TOTAL PATIENTS</span><span className="cs-val">{results.total}</span></div>
            <div className="cs-card high"><span className="cs-label">HIGH RISK</span><span className="cs-val">{results.high_risk} <small>{Math.round((results.high_risk / results.total) * 100)}%</small></span></div>
            <div className="cs-card medium"><span className="cs-label">MEDIUM RISK</span><span className="cs-val">{results.medium_risk} <small>{Math.round((results.medium_risk / results.total) * 100)}%</small></span></div>
            <div className="cs-card low"><span className="cs-label">LOW RISK / RETAINED</span><span className="cs-val">{results.low_risk} <small>{Math.round((results.low_risk / results.total) * 100)}%</small></span></div>
          </div>

          {/* Charts Row */}
          <div className="charts-row">
            <div className="chart-card">
              <h3>📊 Patient Risk Distribution</h3>
              <div className="bar-chart">
                {[
                  { label: "High Risk", value: results.high_risk, color: "#ef4444" },
                  { label: "Medium Risk", value: results.medium_risk, color: "#f59e0b" },
                  { label: "Low Risk", value: results.low_risk, color: "#22c55e" },
                ].map((b, i) => (
                  <div key={i} className="bar-item">
                    <div className="bar-track">
                      <div className="bar-fill" style={{ height: `${(b.value / Math.max(results.high_risk, results.medium_risk, results.low_risk, 1)) * 100}%`, background: b.color }} />
                    </div>
                    <span className="bar-label">{b.label}</span>
                    <span className="bar-value">{b.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-card">
              <h3>📈 Churn Probability Distribution</h3>
              <div className="histogram">
                {["0-20%", "21-40%", "41-60%", "61-80%", "81-100%"].map((label, i) => (
                  <div key={i} className="hist-bar">
                    <div className="hist-track">
                      <div className="hist-fill" style={{ height: `${(histogram[i] / histMax) * 100}%` }} />
                    </div>
                    <span className="hist-label">{label}</span>
                    <span className="hist-value">{histogram[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="chart-card" style={{ marginTop: 20 }}>
            <h3>🥧 Risk Proportion</h3>
            <RiskPieChart high={results.high_risk} medium={results.medium_risk} low={results.low_risk} />
          </div>

          {/* Filter Pills */}
          <div className="filter-pills">
            <h3>Patients Needing Attention</h3>
            <div className="pills-row">
              {[
                { key: "all", label: "All" },
                { key: "high", label: "High Risk" },
                { key: "medium", label: "Medium Risk" },
                { key: "low", label: "Low Risk" },
              ].map((p) => (
                <button
                  key={p.key}
                  className={`pill ${filter === p.key ? "active" : ""}`}
                  onClick={() => setFilter(p.key)}
                >{p.label}</button>
              ))}
            </div>
          </div>

          {/* Results Table */}
          <div className="cohort-table-wrap">
            <table className="cohort-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Churn Probability</th>
                  <th>Prediction</th>
                  <th>Risk Level</th>
                  <th>Main Risk Factor</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.slice(0, 50).map((r) => (
                  <tr key={r.index}>
                    <td className="mono">{r.patient_id}</td>
                    <td><strong>{r.percentage}%</strong></td>
                    <td>{r.percentage >= 50 ? "Likely to Churn" : "Predicted Retained"}</td>
                    <td><span className={`risk-tag ${r.risk_level.toLowerCase()}`}>{r.risk_level} RISK</span></td>
                    <td className="reason-cell">{r.primary_churn_reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
