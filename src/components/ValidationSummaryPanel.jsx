import { PanelRightClose, PanelRightOpen } from "lucide-react";

import ClinicalResultBar from "./ClinicalResultBar.jsx";
import ProgressSummary from "./ProgressSummary.jsx";
import QuickMetricItem from "./QuickMetricItem.jsx";

function safeNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
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
  const reviewedToday = safeNumber(stats?.reviewed_today);
  const reviewedWeek = safeNumber(stats?.reviewed_week);
  const withoutChange = safeNumber(stats?.valid_without_change);
  const withChange = safeNumber(stats?.valid_with_change);
  const openQueue = pending + inValidation;
  const alteredPercent = percent(withChange, reviewed);

  return (
    <aside className="validation-summary-panel" id="validation-summary-panel">
      <header className="summary-panel-header">
        <div>
          <h2>Resumo da validação</h2>
          <p>Base dos indicadores: todos os exames</p>
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
          <h3>Fila de trabalho</h3>
          <span className="summary-pending">
            {openQueue > 0
              ? `${openQueue} exames aguardam revisão`
              : "Nenhum exame aguardando revisão"}
          </span>
        </div>
      </section>

      <section className="summary-block">
        <div className="summary-block-heading">
          <h3>Filtros rápidos</h3>
        </div>
        <div className="quick-metric-grid">
          <QuickMetricItem
            label="Pendentes"
            value={pending}
            tone="pending"
            active={quickFilter?.key === "pending"}
            onClick={() => onQuickFilter("pending")}
          />
          <QuickMetricItem
            label="Em validação"
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
          <QuickMetricItem
            label="Sem alteração"
            value={withoutChange}
            tone="success"
            active={quickFilter?.key === "without_change"}
            onClick={() => onQuickFilter("without_change")}
          />
          <QuickMetricItem
            label="Alterados"
            value={withChange}
            tone="clinical-alert"
            active={quickFilter?.key === "altered"}
            onClick={() => onQuickFilter("altered")}
          />
        </div>
      </section>

      <ProgressSummary stats={stats} compact />

      <section className="summary-block">
        <div className="summary-block-heading">
          <h3>Resultado clínico</h3>
          <p>
            {reviewed > 0
              ? `${withChange}/${reviewed} alterados — ${alteredPercent}%`
              : "Sem exames revisados para análise"}
          </p>
        </div>
        <ClinicalResultBar
          withoutChange={withoutChange}
          withChange={withChange}
          reviewedTotal={reviewed}
        />
      </section>

      <section className="productivity-summary" aria-label="Produtividade">
        <strong>Produtividade</strong>
        <span>Hoje {reviewedToday} · Semana {reviewedWeek} · Total {reviewed}</span>
      </section>
    </aside>
  );
}
