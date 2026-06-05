import { Eye, EyeOff, PlayCircle } from "lucide-react";

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
  onOpenNextExam,
}) {
  if (collapsed) {
    return (
      <button
        className="summary-collapsed-button"
        type="button"
        onClick={onToggleCollapsed}
        aria-expanded="false"
        aria-controls="validation-summary-panel"
      >
        <Eye size={16} aria-hidden="true" />
        Mostrar resumo
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
          className="button ghost compact-button"
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded="true"
          aria-controls="validation-summary-panel"
        >
          <EyeOff size={16} aria-hidden="true" />
          Ocultar resumo
        </button>
      </header>

      <ProgressSummary
        stats={stats}
        activeKey={quickFilter?.key}
        onQuickFilter={onQuickFilter}
        compact
      />

      <section className="summary-block">
        <div className="summary-block-heading">
          <h3>Fila de trabalho</h3>
          <span className="summary-pending">
            {openQueue > 0
              ? `${openQueue} exames aguardam finalização`
              : "Nenhum exame aguardando finalização"}
          </span>
        </div>
        <button
          className="button secondary full-width-button"
          type="button"
          onClick={onOpenNextExam}
          disabled={!openQueue}
        >
          <PlayCircle size={17} aria-hidden="true" />
          Abrir próximo exame
        </button>
        <div className="quick-metric-list">
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
        </div>
      </section>

      <section className="summary-block">
        <div className="summary-block-heading">
          <h3>Produtividade</h3>
          <p>Hoje e semana atual</p>
        </div>
        <div className="quick-metric-list">
          <QuickMetricItem
            label="Hoje"
            value={reviewedToday}
            tone="productivity"
            active={quickFilter?.key === "reviewed_today"}
            onClick={() => onQuickFilter("reviewed_today")}
          />
          <QuickMetricItem
            label="Semana"
            value={reviewedWeek}
            tone="productivity"
            active={quickFilter?.key === "reviewed_week"}
            onClick={() => onQuickFilter("reviewed_week")}
          />
          <QuickMetricItem
            label="Total"
            value={reviewed}
            tone="productivity"
            active={quickFilter?.key === "reviewed_total"}
            onClick={() => onQuickFilter("reviewed_total")}
          />
        </div>
      </section>

      <section className="summary-block">
        <div className="summary-block-heading">
          <h3>Resultado dos revisados</h3>
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
        <div className="quick-metric-list">
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
    </aside>
  );
}

