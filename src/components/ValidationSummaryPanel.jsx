import { PanelRightClose, PanelRightOpen } from "lucide-react";

import QuickMetricItem from "./QuickMetricItem.jsx";
import { QUEUE_STATE_META, REFINEMENT_META } from "../utils/queueSemantics.js";

function safeNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export default function ValidationSummaryPanel({
  stats,
  collapsed,
  quickFilter,
  refinementFilters,
  onToggleCollapsed,
  onQuickFilter,
  onRefinementFilter,
}) {
  if (collapsed) {
    return (
      <button
        className="summary-collapsed-button"
        type="button"
        onClick={onToggleCollapsed}
        aria-label="Mostrar resumo"
        aria-expanded="false"
        aria-controls="validation-summary-panel"
      >
        <PanelRightOpen size={18} aria-hidden="true" />
      </button>
    );
  }

  const stateCounts = stats?.queue_state_counts || {};
  const decisionCounts = stats?.decision_counts || {};
  const regionCounts = stats?.region_counts || {};
  const allCount = safeNumber(stateCounts.all ?? stats?.pending_total + stats?.in_validation_total + stats?.reviewed_total);
  const startCount = safeNumber(stateCounts.start);
  const validatedCount = safeNumber(stateCounts.validated);
  const completedCount = safeNumber(stateCounts.completed ?? stats?.reviewed_total);
  const stateItems = [
    [QUEUE_STATE_META.all, allCount],
    [QUEUE_STATE_META.start, startCount],
    [QUEUE_STATE_META.validated, validatedCount],
    [QUEUE_STATE_META.completed, completedCount],
  ];
  const refinementItems = [
    [REFINEMENT_META.confirmed, safeNumber(decisionCounts.confirmed), "decision", "confirmed"],
    [REFINEMENT_META.rejected, safeNumber(decisionCounts.rejected), "decision", "rejected"],
    [REFINEMENT_META.with_region, safeNumber(regionCounts.with_region), "region", "with_region"],
    [REFINEMENT_META.without_region, safeNumber(regionCounts.without_region), "region", "without_region"],
  ];

  return (
    <aside className="validation-summary-panel" id="validation-summary-panel">
      <header className="summary-panel-header">
        <div>
          <h2>Resumo</h2>
        </div>
        <button
          className="summary-toggle-button"
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Ocultar resumo"
          aria-expanded="true"
          aria-controls="validation-summary-panel"
        >
          <PanelRightClose size={18} aria-hidden="true" />
        </button>
      </header>

      <section className="summary-block">
        <div className="summary-block-heading">
          <h3>Estados</h3>
        </div>
        <div className="quick-metric-grid summary-quick-grid">
          {stateItems.map(([item, value]) => (
            <QuickMetricItem
              key={item.key}
              label={item.label}
              value={value}
              tone={item.tone}
              active={quickFilter?.key === item.key}
              title={item.tooltip}
              ariaLabel={`${item.label}: ${item.tooltip}`}
              onClick={() => onQuickFilter(item.key)}
            />
          ))}
        </div>
      </section>

      <section className="summary-block">
        <div className="summary-block-heading">
          <h3>Refinamentos</h3>
        </div>
        <div className="quick-metric-grid summary-quick-grid">
          {refinementItems.map(([item, value, type, key]) => (
            <QuickMetricItem
              key={item.key}
              label={item.label}
              value={value}
              tone={item.tone}
              active={refinementFilters?.[type]?.key === key}
              title={item.tooltip}
              ariaLabel={`${item.label}: ${item.tooltip}`}
              onClick={() => onRefinementFilter(type, key)}
            />
          ))}
        </div>
      </section>
    </aside>
  );
}
