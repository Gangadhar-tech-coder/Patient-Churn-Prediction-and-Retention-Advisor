import { useEffect, useRef } from "react";
import "./GaugeChart.css";

const COLORS = {
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#10b981",
};

export default function GaugeChart({ percentage, riskLevel }) {
  const circleRef = useRef(null);
  const color = COLORS[riskLevel] || COLORS.Low;

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    const el = circleRef.current;
    if (el) {
      el.style.strokeDashoffset = circumference;
      requestAnimationFrame(() => {
        el.style.transition = "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)";
        el.style.strokeDashoffset = strokeDashoffset;
      });
    }
  }, [percentage, strokeDashoffset, circumference]);

  return (
    <div className="gauge-container">
      <svg className="gauge-svg" viewBox="0 0 200 200">
        <circle
          cx="100" cy="100" r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12"
          strokeLinecap="round" transform="rotate(-90 100 100)"
          strokeDasharray={circumference}
        />
        <circle
          ref={circleRef}
          cx="100" cy="100" r={radius}
          fill="none" stroke={color} strokeWidth="12"
          strokeLinecap="round" transform="rotate(-90 100 100)"
          strokeDasharray={circumference} strokeDashoffset={circumference}
          style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
        />
      </svg>
      <div className="gauge-center">
        <div className="gauge-value" style={{ color }}>{percentage}%</div>
        <div className="gauge-label">Churn Risk</div>
      </div>
      <div className="gauge-scale">
        <span className="scale-low">0%</span>
        <span className="scale-mid">50%</span>
        <span className="scale-high">100%</span>
      </div>
    </div>
  );
}
