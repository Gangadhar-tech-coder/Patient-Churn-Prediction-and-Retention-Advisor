import { useState } from "react";
import "./Sidebar.css";

const STATES = ["CA", "FL", "GA", "IL", "MI", "NC", "NY", "OH", "PA", "TX"];
const SPECIALTIES = [
  "Cardiology", "Family Medicine", "General Practice",
  "Internal Medicine", "Neurology", "Orthopedics", "Pediatrics",
];
const INSURANCE_TYPES = ["Medicaid", "Medicare", "Private", "Self-Pay"];

const DEFAULT_VALUES = {
  age: 41,
  gender: "Female",
  state: "PA",
  specialty: "Pediatrics",
  insurance_type: "Medicaid",
  tenure_months: 62,
  referrals_made: 3,
  visits_last_year: 1,
  missed_appointments: 0,
  days_since_last_visit: 564,
  portal_usage: 0,
  overall_satisfaction: 3.5,
  wait_time_satisfaction: 4.9,
  staff_satisfaction: 3.8,
  provider_rating: 4.2,
  avg_out_of_pocket_cost: 306,
  distance_to_facility: 21.4,
  billing_issues: 0,
};

export default function Sidebar({ onPredict, loading }) {
  const [form, setForm] = useState(DEFAULT_VALUES);
  const [expandedSections, setExpandedSections] = useState({
    demographics: true,
    clinical: true,
    engagement: true,
    satisfaction: true,
    financial: true,
  });

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Clean payload: ensure empty fields fall back to sensible numeric defaults
    const payload = {
      ...form,
      age: form.age === "" ? 41 : Number(form.age),
      tenure_months: form.tenure_months === "" ? 62 : Number(form.tenure_months),
      referrals_made: form.referrals_made === "" ? 0 : Number(form.referrals_made),
      visits_last_year: form.visits_last_year === "" ? 0 : Number(form.visits_last_year),
      missed_appointments: form.missed_appointments === "" ? 0 : Number(form.missed_appointments),
      days_since_last_visit: form.days_since_last_visit === "" ? 90 : Number(form.days_since_last_visit),
      avg_out_of_pocket_cost: form.avg_out_of_pocket_cost === "" ? 300 : Number(form.avg_out_of_pocket_cost),
      distance_to_facility: form.distance_to_facility === "" ? 10 : Number(form.distance_to_facility),
      overall_satisfaction: Number(form.overall_satisfaction),
      wait_time_satisfaction: Number(form.wait_time_satisfaction),
      staff_satisfaction: Number(form.staff_satisfaction),
      provider_rating: Number(form.provider_rating),
    };

    onPredict(payload);
  };

  const handleNumChange = (field, val, parser = parseInt) => {
    if (val === "") {
      update(field, "");
    } else {
      const parsed = parser(val);
      update(field, isNaN(parsed) ? "" : parsed);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <h2 className="sidebar-title">Patient Profile Input</h2>
        </div>
        <p className="sidebar-desc">
          Enter clinical & behavioral signals to predict churn & retention advice
        </p>
      </div>

      <form onSubmit={handleSubmit} className="sidebar-form">
        {/* Demographics */}
        <SidebarSection
          title="Demographics"
          expanded={expandedSections.demographics}
          onToggle={() => toggleSection("demographics")}
        >
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="age">Age</label>
              <input
                id="age"
                type="number"
                min={18}
                max={90}
                value={form.age}
                onChange={(e) => handleNumChange("age", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                value={form.gender}
                onChange={(e) => update("gender", e.target.value)}
              >
                <option>Female</option>
                <option>Male</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="state">State</label>
            <select
              id="state"
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
            >
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </SidebarSection>

        {/* Clinical */}
        <SidebarSection
          title="Clinical Information"
          expanded={expandedSections.clinical}
          onToggle={() => toggleSection("clinical")}
        >
          <div className="form-group">
            <label htmlFor="specialty">Specialty</label>
            <select
              id="specialty"
              value={form.specialty}
              onChange={(e) => update("specialty", e.target.value)}
            >
              {SPECIALTIES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="insurance">Insurance Type</label>
            <select
              id="insurance"
              value={form.insurance_type}
              onChange={(e) => update("insurance_type", e.target.value)}
            >
              {INSURANCE_TYPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tenure">Tenure (Months)</label>
              <input
                id="tenure"
                type="number"
                min={1}
                max={120}
                value={form.tenure_months}
                onChange={(e) => handleNumChange("tenure_months", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="referrals">Referrals Made</label>
              <input
                id="referrals"
                type="number"
                min={0}
                max={5}
                value={form.referrals_made}
                onChange={(e) => handleNumChange("referrals_made", e.target.value)}
              />
            </div>
          </div>
        </SidebarSection>

        {/* Engagement */}
        <SidebarSection
          title="Engagement Metrics"
          expanded={expandedSections.engagement}
          onToggle={() => toggleSection("engagement")}
        >
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="visits">Visits Last Year</label>
              <input
                id="visits"
                type="number"
                min={0}
                max={20}
                value={form.visits_last_year}
                onChange={(e) => handleNumChange("visits_last_year", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="missed">Missed Appts</label>
              <input
                id="missed"
                type="number"
                min={0}
                max={10}
                value={form.missed_appointments}
                onChange={(e) => handleNumChange("missed_appointments", e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="days-since">
              Days Since Last Visit:{" "}
              <span className="slider-value">{form.days_since_last_visit || 0}</span>
            </label>
            <input
              id="days-since"
              type="range"
              min={1}
              max={730}
              value={form.days_since_last_visit}
              onChange={(e) => handleNumChange("days_since_last_visit", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="portal">Uses Patient Portal</label>
            <select
              id="portal"
              value={form.portal_usage === 1 ? "Yes" : "No"}
              onChange={(e) =>
                update("portal_usage", e.target.value === "Yes" ? 1 : 0)
              }
            >
              <option>Yes</option>
              <option>No</option>
            </select>
          </div>
        </SidebarSection>

        {/* Satisfaction */}
        <SidebarSection
          title="Satisfaction Scores"
          expanded={expandedSections.satisfaction}
          onToggle={() => toggleSection("satisfaction")}
        >
          <SliderField
            id="overall-sat"
            label="Overall Satisfaction"
            value={Number(form.overall_satisfaction) || 1}
            min={1}
            max={5}
            step={0.1}
            onChange={(v) => update("overall_satisfaction", v)}
          />
          <SliderField
            id="wait-sat"
            label="Wait Time Satisfaction"
            value={Number(form.wait_time_satisfaction) || 1}
            min={1}
            max={5}
            step={0.1}
            onChange={(v) => update("wait_time_satisfaction", v)}
          />
          <SliderField
            id="staff-sat"
            label="Staff Satisfaction"
            value={Number(form.staff_satisfaction) || 1}
            min={1}
            max={5}
            step={0.1}
            onChange={(v) => update("staff_satisfaction", v)}
          />
          <SliderField
            id="provider-rating"
            label="Provider Rating"
            value={Number(form.provider_rating) || 1}
            min={1}
            max={5}
            step={0.1}
            onChange={(v) => update("provider_rating", v)}
          />
        </SidebarSection>

        {/* Financial */}
        <SidebarSection
          title="Financial Information"
          expanded={expandedSections.financial}
          onToggle={() => toggleSection("financial")}
        >
          <div className="form-group">
            <label htmlFor="oop">Avg Out-of-Pocket Cost ($)</label>
            <input
              id="oop"
              type="number"
              min={20}
              max={2000}
              value={form.avg_out_of_pocket_cost}
              onChange={(e) => handleNumChange("avg_out_of_pocket_cost", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="distance">
              Distance to Facility:{" "}
              <span className="slider-value">
                {form.distance_to_facility || 0} mi
              </span>
            </label>
            <input
              id="distance"
              type="range"
              min={0.5}
              max={50}
              step={0.5}
              value={form.distance_to_facility}
              onChange={(e) => handleNumChange("distance_to_facility", e.target.value, parseFloat)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="billing">Has Billing Issues</label>
            <select
              id="billing"
              value={form.billing_issues === 1 ? "Yes" : "No"}
              onChange={(e) =>
                update("billing_issues", e.target.value === "Yes" ? 1 : 0)
              }
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </div>
        </SidebarSection>

        <button type="submit" className="predict-button" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" />
              Analyzing Patient Risk...
            </>
          ) : (
            "Diagnose Risk & Advice"
          )}
        </button>
      </form>
    </aside>
  );
}

function SidebarSection({ title, expanded, onToggle, children }) {
  return (
    <div className={`sidebar-section ${expanded ? "expanded" : ""}`}>
      <button
        type="button"
        className="section-toggle"
        onClick={onToggle}
      >
        <span className="section-toggle-title">{title}</span>
        <span className={`section-chevron ${expanded ? "open" : ""}`}>▾</span>
      </button>
      {expanded && <div className="section-content">{children}</div>}
    </div>
  );
}

function SliderField({ id, label, value, min, max, step, onChange }) {
  return (
    <div className="form-group">
      <label htmlFor={id}>
        {label}: <span className="slider-value">{value.toFixed(1)}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
