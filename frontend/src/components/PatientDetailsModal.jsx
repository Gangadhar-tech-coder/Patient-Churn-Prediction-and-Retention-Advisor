import "./PatientDetailsModal.css";

export default function PatientDetailsModal({ patient, onClose }) {
  if (!patient) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="patient-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          ✕
        </button>

        <div className="modal-header">
          <div className="patient-avatar-badge">
            {patient.patient_id ? patient.patient_id[0] : "P"}
          </div>
          <div>
            <h2>Patient Details — {patient.patient_id || `P-${patient.index + 1}`}</h2>
            <p className="modal-subtitle">Comprehensive Profile & Churn Assessment</p>
          </div>
        </div>

        <div className="modal-body">
          {/* Key Summary Bar */}
          <div className="modal-summary-bar">
            <div className="summary-item">
              <span className="summary-label">Churn Probability</span>
              <span className="summary-val prob-val">{patient.percentage}%</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Risk Tier</span>
              <span className={`risk-badge risk-${patient.risk_level?.toLowerCase()}`}>
                {patient.risk_level} Risk
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Prediction Status</span>
              <span className="summary-val">
                {patient.percentage >= 50 ? "Likely to Churn" : "Likely Retained"}
              </span>
            </div>
          </div>

          {/* Diagnosis & Strategy */}
          <div className="modal-diagnosis-section">
            <div className="diag-card yellow-card">
              <span className="card-tag">PRIMARY CHURN REASON</span>
              <p>{patient.primary_churn_reason}</p>
            </div>
            <div className="diag-card blue-card">
              <span className="card-tag">RECOMMENDED RETENTION ADVICE</span>
              <p>{patient.retention_advice}</p>
            </div>
          </div>

          {/* Full Patient Attributes Grid */}
          <h3 className="attributes-title">Patient Profile Attributes</h3>
          <div className="attributes-grid">
            <AttrItem label="Age" value={patient.Age ?? patient.age ?? "N/A"} />
            <AttrItem label="Gender" value={patient.Gender ?? patient.gender ?? "N/A"} />
            <AttrItem label="State" value={patient.State ?? patient.state ?? "N/A"} />
            <AttrItem label="Specialty" value={patient.Specialty ?? patient.specialty ?? "N/A"} />
            <AttrItem label="Insurance Type" value={patient.Insurance_Type ?? patient.insurance_type ?? "N/A"} />
            <AttrItem label="Tenure (Months)" value={patient.Tenure_Months ?? patient.tenure_months ?? "N/A"} />
            <AttrItem label="Visits Last Year" value={patient.Visits_Last_Year ?? patient.visits_last_year ?? "N/A"} />
            <AttrItem label="Missed Appointments" value={patient.Missed_Appointments ?? patient.missed_appointments ?? "N/A"} />
            <AttrItem label="Days Since Last Visit" value={patient.Days_Since_Last_Visit ?? patient.days_since_last_visit ?? "N/A"} />
            <AttrItem label="Portal Activity" value={patient.Portal_Usage === 1 ? "Active" : "Inactive"} />
            <AttrItem label="Referrals Made" value={patient.Referrals_Made ?? patient.referrals_made ?? "N/A"} />
            <AttrItem label="Overall Satisfaction" value={patient.Overall_Satisfaction ?? patient.overall_satisfaction ?? "N/A"} />
            <AttrItem label="Wait Time Sat." value={patient.Wait_Time_Satisfaction ?? patient.wait_time_satisfaction ?? "N/A"} />
            <AttrItem label="Staff Sat." value={patient.Staff_Satisfaction ?? patient.staff_satisfaction ?? "N/A"} />
            <AttrItem label="Provider Rating" value={patient.Provider_Rating ?? patient.provider_rating ?? "N/A"} />
            <AttrItem label="Out-of-Pocket Cost" value={patient.Avg_Out_Of_Pocket_Cost ? `$${patient.Avg_Out_Of_Pocket_Cost}` : "N/A"} />
            <AttrItem label="Billing Issues" value={patient.Billing_Issues === 1 ? "Active Dispute" : "None"} />
            <AttrItem label="Distance" value={patient.Distance_To_Facility_Miles ? `${patient.Distance_To_Facility_Miles} mi` : "N/A"} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn-close" onClick={onClose}>
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}

function AttrItem({ label, value }) {
  return (
    <div className="attr-item">
      <span className="attr-label">{label}</span>
      <span className="attr-val">{value}</span>
    </div>
  );
}
