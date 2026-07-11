export default function QuickMetricItem({
  label,
  value,
  tone = "neutral",
  active,
  onClick,
  title,
  ariaLabel,
}) {
  return (
    <button
      className={`quick-metric quick-metric-${tone}${active ? " is-active" : ""}`}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel || title || label}
      title={title}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}
