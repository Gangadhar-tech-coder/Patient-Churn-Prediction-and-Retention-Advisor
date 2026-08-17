import { useState, useRef } from "react";
import { batchPredict } from "../utils/api";
import "./BatchUpload.css";

export default function BatchUpload({ onResults, onError }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
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
    } else {
      onError?.("Please upload a valid CSV file");
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const data = await batchPredict(file);
      onResults?.(data);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="batch-upload">
      <div className="batch-header">
        <h3 className="batch-title">Upload Patient Cohort CSV</h3>
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
              Drag & drop patient cohort CSV, or <span className="drop-link">browse</span>
            </p>
            <p className="drop-hint">Supports variant column headers, NaN-tolerant parsing</p>
          </div>
        )}
      </div>

      {file && (
        <button className="batch-button" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" /> Processing Cohort Batch...
            </>
          ) : (
            "Run Cohort Prediction & SHAP Analysis"
          )}
        </button>
      )}
    </div>
  );
}
