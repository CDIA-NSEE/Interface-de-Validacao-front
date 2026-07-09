import { PanelRightClose, PanelRightOpen } from "lucide-react";

import QuickMetricItem from "./QuickMetricItem.jsx";

function safeNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export default function ValidationSummaryPanel({
  stats,
  collapsed,
  quickFilter,
  onToggleCollapsed,
  onQuickFilter,
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

  const pending = safeNumber(stats?.pending_total);
  const inValidation = safeNumber(stats?.in_validation_total);
  const reviewed = safeNumber(stats?.reviewed_total);
  const openQueue = pending + inValidation;

  return (
    <aside className="validation-summary-panel" id="validation-summary-panel">
      <header className="summary-panel-header">
        <div>
          <h2>Resumo</h2>
          <p>Atalhos da fila</p>
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

      <section className="summary-action-block">
        <div className="summary-block-heading">
          <h3>Fila aberta</h3>
          <span className="summary-pending">
            {openQueue > 0
              ? `${openQueue} exames aguardam revisao`
              : "Nenhum exame aguardando revisao"}
          </span>
        </div>
      </section>

      <section className="summary-block">
        <div className="summary-block-heading">
          <h3>Filtros rapidos</h3>
        </div>
        <div className="quick-metric-grid summary-quick-grid">
          <QuickMetricItem
            label="Pendentes"
            value={pending}
            tone="pending"
            active={quickFilter?.key === "pending"}
            onClick={() => onQuickFilter("pending")}
          />
          <QuickMetricItem
            label="Em validacao"
            value={inValidation}
            tone="in-validation"
            active={quickFilter?.key === "in_validation"}
            onClick={() => onQuickFilter("in_validation")}
          />
          <QuickMetricItem
            label="Revisados"
            value={reviewed}
            tone="productivity"
            active={quickFilter?.key === "reviewed_total"}
            onClick={() => onQuickFilter("reviewed_total")}
          />
        </div>
      </section>
    </aside>
  );
}
