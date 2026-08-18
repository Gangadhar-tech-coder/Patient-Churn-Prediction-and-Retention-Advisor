import { useState, useRef, useEffect } from "react";
import { batchPredict } from "../utils/api";
import RiskPieChart from "../components/RiskPieChart";
import PatientDetailsModal from "../components/PatientDetailsModal";
import "./views.css";

const PAGE_SIZE = 15;

export default function CohortAnalysisView({ onNavigate }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const savedResults = localStorage.getItem("cohortResults");
    const savedFile = localStorage.getItem("cohortFile");
    const savedPreview = localStorage.getItem("cohortPreview");
    if (savedResults && savedFile) {
      setResults(JSON.parse(savedResults));
      setFile(JSON.parse(savedFile));
      if (savedPreview) setPreview(JSON.parse(savedPreview));
    }
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const processFile = (f) => {
    const ext = f.name.toLowerCase();
    if (!ext.endsWith(".csv") && !ext.endsWith(".xlsx") && !ext.endsWith(".xls")) {
      setError("Please upload a valid CSV or Excel (.xlsx, .xls) file");
      return;
    }
    setFile(f);
    setError(null);
    setResults(null);
    setCurrentPage(1);

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
      setPreview({ headers: ["Excel file loaded"], rows: [], totalRows: "Excel", totalCols: "Multiple" });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) processFile(e.target.files[0]);
  };

  const handleClearDataset = () => {
    setFile(null);
    setPreview(null);
    setResults(null);
    setError(null);
    setCurrentPage(1);
    setSelectedPatient(null);
    localStorage.removeItem("cohortResults");
    localStorage.removeItem("cohortFile");
    localStorage.removeItem("cohortPreview");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const data = await batchPredict(file);
      setResults(data);
      localStorage.setItem("cohortResults", JSON.stringify(data));
      localStorage.setItem("cohortFile", JSON.stringify({ name: file.name, size: file.size }));
      localStorage.setItem("cohortPreview", JSON.stringify(preview));
      setCurrentPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  // Filtered patient list
  const filteredResults =
    results?.results?.filter((r) => {
      const matchFilter = filter === "all" ? true : r.risk_level.toLowerCase() === filter;
      const matchSearch = searchTerm === "" ? true : (r.patient_id || `P-${r.index + 1}`).toLowerCase().includes(searchTerm.toLowerCase());
      return matchFilter && matchSearch;
    }) || [];

  // Pagination calculation
  const totalPages = Math.ceil(filteredResults.length / PAGE_SIZE) || 1;
  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Histogram calculation
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
      <div className="view-header-row">
        <div>
          <h1 className="view-title">Analyze Patient Cohort</h1>
          <p className="view-desc">
            Upload a patient CSV or Excel file to evaluate churn risk across multiple patients and prioritize retention actions.
          </p>
        </div>
        {file && (
          <button className="clear-dataset-btn" onClick={handleClearDataset}>
            Clear Dataset & Upload New
          </button>
        )}
      </div>

      {/* Drop Zone */}
      {!file && (
        <div
          className={`cohort-drop ${dragActive ? "active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            hidden
          />
          <div className="drop-icon-box">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p>
            <strong>Drag & drop your patient CSV or Excel file here</strong>
          </p>
          <p className="drop-hint">or click to browse from your device</p>
          <button
            type="button"
            className="browse-btn"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Browse Files
          </button>
          <p className="drop-hint">Supported formats: CSV, Excel (.xlsx, .xls)</p>
        </div>
      )}

      {file && (
        <div className="cohort-file-card">
          <div className="file-info-left">
            <div className="file-type-badge">DATASET</div>
            <div>
              <span className="file-name">{file.name}</span>
              <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          </div>
          <div className="file-actions">
            <span className="file-status-tag">Dataset Uploaded</span>
            <button className="clear-link-btn" onClick={handleClearDataset}>
              Remove & Change File
            </button>
          </div>
        </div>
      )}

      {error && <div className="view-error">{error}</div>}

      {/* Dataset Preview */}
      {preview && preview.rows.length > 0 && !results && (
        <div className="cohort-preview">
          <div className="preview-header">
            <span>Dataset Preview — {file?.name}</span>
            <span>
              {preview.totalRows} rows • {preview.totalCols} columns
            </span>
          </div>
          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead>
                <tr>
                  {preview.headers.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((c, j) => (
                      <td key={j}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {file && !results && (
        <div className="cohort-analyze-row">
          <button className="predict-btn" onClick={handleAnalyze} disabled={loading}>
            {loading ? "Analyzing Cohort Dataset..." : "Analyze Dataset"}
          </button>
        </div>
      )}

      {/* Results Section */}
      {results && (
        <>
          <div className="cohort-results-header">
            <div>
              <h2>Cohort Results Summary</h2>
              <span className="cohort-count">{results.total} patients analyzed</span>
            </div>
            <div className="results-actions">
              <button className="clear-dataset-btn secondary" onClick={handleClearDataset}>
                Upload Another Dataset
              </button>
              <button className="print-btn" onClick={handleDownloadPDF}>
                Download Cohort Report PDF
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="cohort-summary">
            <div className="cs-card total">
              <span className="cs-label">TOTAL PATIENTS</span>
              <span className="cs-val">{results.total}</span>
            </div>
            <div className="cs-card high">
              <span className="cs-label">HIGH RISK</span>
              <span className="cs-val">
                {results.high_risk}{" "}
                <small>({Math.round((results.high_risk / results.total) * 100)}%)</small>
              </span>
            </div>
            <div className="cs-card medium">
              <span className="cs-label">MEDIUM RISK</span>
              <span className="cs-val">
                {results.medium_risk}{" "}
                <small>({Math.round((results.medium_risk / results.total) * 100)}%)</small>
              </span>
            </div>
            <div className="cs-card low">
              <span className="cs-label">LOW RISK / RETAINED</span>
              <span className="cs-val">
                {results.low_risk}{" "}
                <small>({Math.round((results.low_risk / results.total) * 100)}%)</small>
              </span>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="charts-row">
            <div className="chart-card">
              <h3>Patient Risk Distribution</h3>
              <div className="bar-chart">
                {[
                  { label: "High Risk", value: results.high_risk, color: "#ef4444" },
                  { label: "Medium Risk", value: results.medium_risk, color: "#f59e0b" },
                  { label: "Low Risk", value: results.low_risk, color: "#22c55e" },
                ].map((b, i) => (
                  <div key={i} className="bar-item">
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          height: `${
                            (b.value / Math.max(results.high_risk, results.medium_risk, results.low_risk, 1)) * 100
                          }%`,
                          background: b.color,
                        }}
                      />
                    </div>
                    <span className="bar-label">{b.label}</span>
                    <span className="bar-value">{b.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-card">
              <h3>Churn Probability Distribution</h3>
              <div className="histogram">
                {["0-20%", "21-40%", "41-60%", "61-80%", "81-100%"].map((label, i) => (
                  <div key={i} className="hist-bar">
                    <div className="hist-track">
                      <div
                        className="hist-fill"
                        style={{ height: `${(histogram[i] / histMax) * 100}%` }}
                      />
                    </div>
                    <span className="hist-label">{label}</span>
                    <span className="hist-value">{histogram[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="chart-card" style={{ marginTop: 20 }}>
            <h3>Risk Proportion</h3>
            <RiskPieChart high={results.high_risk} medium={results.medium_risk} low={results.low_risk} />
          </div>

          {/* Filter Pills */}
          <div className="filter-pills" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3>Patients Cohort List</h3>
              <div className="pills-row" style={{ marginTop: 10 }}>
                {[
                  { key: "all", label: `All (${results.total})` },
                  { key: "high", label: `High Risk (${results.high_risk})` },
                  { key: "medium", label: `Medium Risk (${results.medium_risk})` },
                  { key: "low", label: `Low Risk (${results.low_risk})` },
                ].map((p) => (
                  <button
                    key={p.key}
                    className={`pill ${filter === p.key ? "active" : ""}`}
                    onClick={() => {
                      setFilter(p.key);
                      setCurrentPage(1);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <input
                type="text"
                placeholder="Search Patient ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc", minWidth: "250px" }}
              />
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedResults.map((r) => (
                  <tr key={r.index}>
                    <td className="mono">{r.patient_id || `P-${r.index + 1}`}</td>
                    <td>
                      <strong>{r.percentage}%</strong>
                    </td>
                    <td>{r.percentage >= 50 ? "Likely to Churn" : "Likely Retained"}</td>
                    <td>
                      <span className={`risk-tag ${r.risk_level.toLowerCase()}`}>{r.risk_level} RISK</span>
                    </td>
                    <td className="reason-cell">{r.primary_churn_reason}</td>
                    <td>
                      <button className="view-patient-btn" onClick={() => {
                        localStorage.setItem("selectedPatientDetails", JSON.stringify(r));
                        onNavigate("advisor");
                      }}>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                Previous
              </button>

              <span className="page-info">
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredResults.length} records)
              </span>

              <button
                className="page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Details Modal was here, now redirected */}
    </div>
  );
}
