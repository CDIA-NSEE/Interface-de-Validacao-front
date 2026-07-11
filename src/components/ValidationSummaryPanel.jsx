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
          <QuickMetricItem
            label={QUEUE_STATE_META.all.label}
            value={allCount}
            tone={QUEUE_STATE_META.all.tone}
            active={quickFilter?.key === "all"}
            onClick={() => onQuickFilter("all")}
          />
          <QuickMetricItem
            label={QUEUE_STATE_META.start.label}
            value={startCount}
            tone={QUEUE_STATE_META.start.tone}
            active={quickFilter?.key === "start"}
            onClick={() => onQuickFilter("start")}
          />
          <QuickMetricItem
            label={QUEUE_STATE_META.validated.label}
            value={validatedCount}
            tone={QUEUE_STATE_META.validated.tone}
            active={quickFilter?.key === "validated"}
            onClick={() => onQuickFilter("validated")}
          />
          <QuickMetricItem
            label={QUEUE_STATE_META.completed.label}
            value={completedCount}
            tone={QUEUE_STATE_META.completed.tone}
            active={quickFilter?.key === "completed"}
            onClick={() => onQuickFilter("completed")}
          />
        </div>
      </section>

      <section className="summary-block">
        <div className="summary-block-heading">
          <h3>Refinamentos</h3>
        </div>
        <div className="quick-metric-grid summary-quick-grid">
          <QuickMetricItem
            label={REFINEMENT_META.confirmed.label}
            value={safeNumber(decisionCounts.confirmed)}
            tone={REFINEMENT_META.confirmed.tone}
            active={refinementFilters?.decision?.key === "confirmed"}
            onClick={() => onRefinementFilter("decision", "confirmed")}
          />
          <QuickMetricItem
            label={REFINEMENT_META.rejected.label}
            value={safeNumber(decisionCounts.rejected)}
            tone={REFINEMENT_META.rejected.tone}
            active={refinementFilters?.decision?.key === "rejected"}
            onClick={() => onRefinementFilter("decision", "rejected")}
          />
          <QuickMetricItem
            label={REFINEMENT_META.with_region.label}
            value={safeNumber(regionCounts.with_region)}
            tone={REFINEMENT_META.with_region.tone}
            active={refinementFilters?.region?.key === "with_region"}
            onClick={() => onRefinementFilter("region", "with_region")}
          />
          <QuickMetricItem
            label={REFINEMENT_META.without_region.label}
            value={safeNumber(regionCounts.without_region)}
            tone={REFINEMENT_META.without_region.tone}
            active={refinementFilters?.region?.key === "without_region"}
            onClick={() => onRefinementFilter("region", "without_region")}
          />
        </div>
      </section>
    </aside>
  );
}
