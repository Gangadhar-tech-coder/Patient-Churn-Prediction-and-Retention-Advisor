import { useEffect, useRef } from "react";
import "./FeatureChart.css";

function getBarColor(value) {
  if (value > 60) return "var(--risk-high)";
  if (value > 30) return "var(--risk-medium)";
  return "var(--risk-low)";
}

export default function FeatureChart({ contributions }) {
  if (!contributions || contributions.length === 0) return null;
  const sorted = [...contributions].sort((a, b) => b.risk_impact - a.risk_impact);

  return (
    <div className="feature-chart">
      <div className="chart-header">
        <h3 className="chart-title">Feature Risk Contribution Breakdown</h3>
      </div>
      <div className="chart-bars">
        {sorted.map((item, idx) => {
          const pct = Math.round(item.risk_impact * 100);
          const color = getBarColor(pct);
          return (
            <FeatureBar
              key={item.factor}
              label={item.factor}
              value={pct}
              color={color}
              delay={idx * 0.08}
            />
          );
        })}
      </div>
    </div>
  );
}

function FeatureBar({ label, value, color, delay }) {
  const barRef = useRef(null);

  useEffect(() => {
    const el = barRef.current;
    if (el) {
      el.style.width = "0%";
      const timer = setTimeout(() => {
        el.style.transition = "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
        el.style.width = `${value}%`;
      }, delay * 1000 + 150);
      return () => clearTimeout(timer);
    }
  }, [value, delay]);

  return (
    <div className="feature-bar-row">
      <div className="bar-label">{label}</div>
      <div className="bar-track">
        <div
          ref={barRef}
          className="bar-fill"
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}40` }}
        />
      </div>
      <div className="bar-value" style={{ color }}>{value}%</div>
    </div>
  );
}
