import MetricCard from "./MetricCard";
import "./MetricCardRow.css";

export default function MetricCardRow({ metrics }) {
  if (!metrics) return null;

  return (
    <div className="metric-cards-row-grid">
      <MetricCard
        label="Engagement Score"
        value={metrics.engagement_score}
        accentColor="var(--accent-primary)"
      />
      <MetricCard
        label="Avg Satisfaction"
        value={`${metrics.satisfaction_avg}/5.0`}
        accentColor="var(--risk-medium)"
      />
      <MetricCard
        label="Cost per Visit"
        value={`$${Math.round(metrics.cost_per_visit)}`}
        accentColor="var(--accent-cyan)"
      />
      <MetricCard
        label="Visit Frequency"
        value={`${metrics.visit_frequency}/yr`}
        accentColor="var(--risk-low)"
      />
    </div>
  );
}
