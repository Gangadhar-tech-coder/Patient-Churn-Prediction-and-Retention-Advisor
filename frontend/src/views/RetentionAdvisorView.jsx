import { useState, useEffect } from "react";
import "./views.css";

export default function RetentionAdvisorView() {
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("selectedPatientDetails");
    if (saved) {
      setPatient(JSON.parse(saved));
    }
  }, []);

  if (!patient) {
    return (
      <div className="view-container">
        <h1 className="view-title">Retention Advisor</h1>
        <p className="view-desc">
          No patient selected. Please navigate to Cohort Analysis, upload a dataset, and click "View Details" on a patient.
        </p>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div
        className="patient-details-card"
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "24px",
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: "16px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                background: "#2563eb",
                color: "white",
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "24px",
              }}
            >
              {patient.patient_id ? patient.patient_id.charAt(0).toUpperCase() : "P"}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "22px", color: "#111827" }}>
                Patient Details — {patient.patient_id || "Unknown"}
              </h2>
              <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
                Comprehensive Profile & Churn Assessment
              </p>
            </div>
          </div>
        </div>

        {/* Top Cards: Probability, Risk, Status */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "16px",
            background: "#f8fafc",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "16px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                color: "#64748b",
                letterSpacing: "0.5px",
                marginBottom: "8px",
              }}
            >
              CHURN PROBABILITY
            </div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#2563eb" }}>
              {patient.percentage}%
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                color: "#64748b",
                letterSpacing: "0.5px",
                marginBottom: "8px",
              }}
            >
              RISK TIER
            </div>
            <div>
              <span
                style={{
                  background:
                    patient.risk_level === "High"
                      ? "#ef4444"
                      : patient.risk_level === "Medium"
                      ? "#f59e0b"
                      : "#22c55e",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                {patient.risk_level} Risk
              </span>
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                color: "#64748b",
                letterSpacing: "0.5px",
                marginBottom: "8px",
              }}
            >
              PREDICTION STATUS
            </div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#111827" }}>
              {patient.percentage >= 50 ? "Likely to Churn" : "Likely Retained"}
            </div>
          </div>
        </div>

        {/* Primary Reason */}
        <div
          style={{
            background: "#fef9c3",
            border: "1px solid #fde047",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: "bold",
              color: "#854d0e",
              letterSpacing: "0.5px",
              marginBottom: "8px",
            }}
          >
            PRIMARY CHURN REASON
          </div>
          <div style={{ fontSize: "16px", color: "#111827" }}>
            {patient.primary_churn_reason}
          </div>
        </div>

        {/* Retention Advice */}
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: "bold",
              color: "#1e40af",
              letterSpacing: "0.5px",
              marginBottom: "8px",
            }}
          >
            RECOMMENDED RETENTION ADVICE
          </div>
          <div style={{ fontSize: "18px", color: "#1e3a8a", lineHeight: "1.6" }}>
            {patient.retention_advice}
          </div>
        </div>

        {/* Profile Attributes */}
        <h3
          style={{
            fontSize: "18px",
            marginBottom: "16px",
            color: "#111827",
            fontWeight: "bold",
          }}
        >
          Patient Profile Attributes
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "16px" }}>
          {patient.attributes && Object.keys(patient.attributes).length > 0 ? (
            Object.entries(patient.attributes).map(([key, val]) => (
              <AttributeCard 
                key={key} 
                label={key.toUpperCase()} 
                value={val !== null && val !== undefined ? val.toString() : "N/A"} 
              />
            ))
          ) : (
            <p>No profile attributes available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AttributeCard({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px",
        background: "#fafafa",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: "bold",
          color: "#6b7280",
          marginBottom: "6px",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "15px", fontWeight: "bold", color: "#111827" }}>
        {value}
      </div>
    </div>
  );
}
