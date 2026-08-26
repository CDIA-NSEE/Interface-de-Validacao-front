import { ToggleGroupItem } from "@/components/ui/toggle-group";

export default function QuickMetricItem({
  label,
  value,
  count,
  title,
  ariaLabel,
}) {
  return (
    <ToggleGroupItem
      className="h-auto min-h-9 flex-1 justify-between gap-3"
      value={value}
      title={title}
      aria-label={ariaLabel || title || label}
    >
      <span>{label}</span>
      <strong className="tabular-nums">{count}</strong>
    </ToggleGroupItem>
  );
}
