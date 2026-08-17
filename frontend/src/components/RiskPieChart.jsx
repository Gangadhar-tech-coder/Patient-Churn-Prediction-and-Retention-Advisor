import "./RiskPieChart.css";

export default function RiskPieChart({ high, medium, low }) {
  const total = high + medium + low;
  if (total === 0) return null;

  const slices = [
    { value: high, color: "#ef4444", label: "High Risk" },
    { value: medium, color: "#f59e0b", label: "Medium Risk" },
    { value: low, color: "#22c55e", label: "Low Risk" },
  ].filter((s) => s.value > 0);

  const radius = 60;
  const cx = 80, cy = 80;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="risk-pie">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {slices.map((s, i) => {
          const dashLen = (s.value / total) * circumference;
          const el = (
            <circle
              key={i} cx={cx} cy={cy} r={radius} fill="none"
              stroke={s.color} strokeWidth="20"
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += dashLen;
          return el;
        })}
        <circle cx={cx} cy={cy} r="46" fill="#fff" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="800" fill="#0f172a">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#64748b">Patients</text>
      </svg>
      <div className="pie-legend">
        {slices.map((s, i) => (
          <div key={i} className="pie-legend-item">
            <span className="pie-dot" style={{ background: s.color }} />
            <span className="pie-label">{s.label}</span>
            <span className="pie-val">{s.value} ({Math.round((s.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
