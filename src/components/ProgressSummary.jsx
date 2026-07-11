function safeNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function LegendItem({ label, value, dotClass }) {
  return (
    <span>
      <i className={`legend-dot ${dotClass}`} aria-hidden="true" />
      {label} {value}
    </span>
  );
}

export default function ProgressSummary({ stats, compact = false }) {
  const stateCounts = stats?.queue_state_counts || {};
  const startTotal = safeNumber(stateCounts.start ?? safeNumber(stats?.pending_total) + safeNumber(stats?.in_validation_total));
  const validatedTotal = safeNumber(stateCounts.validated);
  const completedTotal = safeNumber(stateCounts.completed ?? stats?.reviewed_total);
  const totalFlow = safeNumber(stateCounts.all ?? startTotal + validatedTotal + completedTotal);

  const startPercent = percent(startTotal, totalFlow);
  const validatedPercent = percent(validatedTotal, totalFlow);
  const completedPercent = percent(completedTotal, totalFlow);

  return (
    <section className={`progress-summary${compact ? " compact-progress-summary" : ""}`} aria-label="Fluxo de validação">
      <div className="progress-summary-copy">
        <span className="eyebrow">Fluxo de validação</span>
        <strong>
          {completedTotal}/{totalFlow} concluídos - {completedPercent}%
        </strong>
      </div>

      <div
        className="segmented-progress"
        role="img"
        aria-label={`${startPercent}% iniciar, ${validatedPercent}% validados e ${completedPercent}% concluídos`}
      >
        <span
          className="progress-segment progress-start"
          style={{ width: `${startPercent}%` }}
        />
        <span
          className="progress-segment progress-validated"
          style={{ width: `${validatedPercent}%` }}
        />
        <span
          className="progress-segment progress-completed"
          style={{ width: `${completedPercent}%` }}
        />
      </div>

      <div className="progress-legend" aria-label="Legenda do progresso">
        <LegendItem
          label="Iniciar"
          value={startTotal}
          dotClass="start-dot"
        />
        <LegendItem
          label="Validados"
          value={validatedTotal}
          dotClass="validated-dot"
        />
        <LegendItem
          label="Concluídos"
          value={completedTotal}
          dotClass="completed-dot"
        />
      </div>
    </section>
  );
}
