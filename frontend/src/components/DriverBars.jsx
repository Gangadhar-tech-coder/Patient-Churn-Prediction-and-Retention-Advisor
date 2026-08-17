import { useEffect, useRef } from "react";
import "./DriverBars.css";

function getBarColor(shapValue, isCategorical) {
  if (isCategorical) return "var(--text-muted)";
  return shapValue > 0 ? "var(--risk-high)" : "var(--risk-low)";
}

function getMaxAbs(drivers) {
  if (!drivers || drivers.length === 0) return 1;
  return Math.max(...drivers.map((d) => Math.abs(d.shap_value)), 0.01);
}

export default function DriverBars({ drivers, categoricalFeatures = [], signed = false }) {
  if (!drivers || drivers.length === 0) return null;

  const maxAbs = getMaxAbs(drivers);

  if (!signed) {
    const sorted = [...drivers].sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value));
    return (
      <div className="driver-bars">
        {sorted.map((d, idx) => {
          const pct = (Math.abs(d.shap_value) / maxAbs) * 100;
          const isCat = categoricalFeatures.includes(d.feature);
          const color = isCat ? "var(--text-muted)" : d.shap_value > 0 ? "var(--risk-high)" : "var(--risk-low)";
          return (
            <DriverBarRow
              key={d.feature}
              label={d.feature}
              value={Math.abs(d.shap_value)}
              pct={pct}
              color={color}
              isCategorical={isCat}
              delay={idx * 0.08}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="driver-bars signed">
      {drivers.map((d, idx) => {
        const pct = (Math.abs(d.shap_value) / maxAbs) * 100;
        const isCat = categoricalFeatures.includes(d.feature);
        const color = getBarColor(d.shap_value, isCat);
        return (
          <SignedBarRow
            key={d.feature}
            label={d.feature}
            shapValue={d.shap_value}
            pct={pct}
            color={color}
            isCategorical={isCat}
            delay={idx * 0.08}
          />
        );
      })}
    </div>
  );
}

function DriverBarRow({ label, value, pct, color, isCategorical, delay }) {
  const barRef = useRef(null);

  useEffect(() => {
    const el = barRef.current;
    if (el) {
      el.style.width = "0%";
      const timer = setTimeout(() => {
        el.style.transition = "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
        el.style.width = `${pct}%`;
      }, delay * 1000 + 150);
      return () => clearTimeout(timer);
    }
  }, [pct, delay]);

  return (
    <div className="driver-bar-row">
      <div className="bar-label">
        {label}
        {isCategorical && <span className="cat-badge" title="Categorical — magnitude only">C</span>}
      </div>
      <div className="bar-track">
        <div
          ref={barRef}
          className="bar-fill"
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}40` }}
        />
      </div>
      <div className="bar-value" style={{ color }}>
        {value.toFixed(4)}
      </div>
    </div>
  );
}

function SignedBarRow({ label, shapValue, pct, color, isCategorical, delay }) {
  const barRef = useRef(null);
  const isPositive = shapValue > 0;

  useEffect(() => {
    const el = barRef.current;
    if (el) {
      el.style.width = "0%";
      const timer = setTimeout(() => {
        el.style.transition = "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
        el.style.width = `${pct}%`;
      }, delay * 1000 + 150);
      return () => clearTimeout(timer);
    }
  }, [pct, delay]);

  return (
    <div className="signed-bar-row">
      <div className="bar-label">
        {label}
        {isCategorical && <span className="cat-badge" title="Categorical — magnitude only, direction not meaningful">C</span>}
      </div>
      <div className="bar-track-center">
        <div
          ref={barRef}
          className={`bar-fill-signed ${isPositive ? "positive" : "negative"}`}
          style={{
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}40`,
            width: `${pct}%`,
          }}
        />
      </div>
      <div className="bar-value" style={{ color }}>
        {shapValue > 0 ? "+" : ""}{shapValue.toFixed(4)}
      </div>
    </div>
  );
}
