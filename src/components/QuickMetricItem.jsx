export default function QuickMetricItem({ label, value, tone = "neutral", active, onClick }) {
  return (
    <button
      className={`quick-metric quick-metric-${tone}${active ? " is-active" : ""}`}
      type="button"
      onClick={onClick}
      aria-pressed={active}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}

