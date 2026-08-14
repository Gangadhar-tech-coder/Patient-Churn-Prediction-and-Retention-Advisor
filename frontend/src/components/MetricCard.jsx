import "./MetricCard.css";

export default function MetricCard({ label, value, accentColor }) {
  return (
    <div
      className="metric-card glass-card"
      style={{ "--metric-accent": accentColor || "var(--accent-primary)" }}
    >
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}
