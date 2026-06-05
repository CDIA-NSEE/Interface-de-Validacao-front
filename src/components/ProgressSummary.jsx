function safeNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function LegendItem({ label, value, dotClass, active, onClick }) {
  const content = (
    <>
      <i className={`legend-dot ${dotClass}`} aria-hidden="true" />
      {label}: {value}
    </>
  );

  if (!onClick) {
    return <span>{content}</span>;
  }

  return (
    <button className="progress-legend-button" type="button" onClick={onClick} aria-pressed={active}>
      {content}
    </button>
  );
}

export default function ProgressSummary({ stats, activeKey, onQuickFilter, compact = false }) {
  const reviewedTotal = safeNumber(stats?.reviewed_total);
  const pendingTotal = safeNumber(stats?.pending_total);
  const inValidationTotal = safeNumber(stats?.in_validation_total);
  const totalFlow = reviewedTotal + pendingTotal + inValidationTotal;

  const reviewedPercent = percent(reviewedTotal, totalFlow);
  const inValidationPercent = percent(inValidationTotal, totalFlow);
  const pendingPercent = percent(pendingTotal, totalFlow);

  return (
    <section className={`progress-summary${compact ? " compact-progress-summary" : ""}`} aria-label="Fluxo de revisão">
      <div className="progress-summary-copy">
        <span className="eyebrow">Fluxo de revisão</span>
        <strong>
          {reviewedTotal} de {totalFlow} exames revisados — {reviewedPercent}%
        </strong>
        <span>Total no fluxo: {totalFlow} exames</span>
      </div>

      <div
        className="segmented-progress"
        role="img"
        aria-label={`${pendingPercent}% pendentes, ${inValidationPercent}% em validação e ${reviewedPercent}% revisados`}
      >
        <span
          className="progress-segment progress-pending"
          style={{ width: `${pendingPercent}%` }}
        />
        <span
          className="progress-segment progress-in-validation"
          style={{ width: `${inValidationPercent}%` }}
        />
        <span
          className="progress-segment progress-reviewed"
          style={{ width: `${reviewedPercent}%` }}
        />
      </div>

      <div className="progress-legend" aria-label="Legenda do progresso">
        <LegendItem
          label="Pendentes"
          value={pendingTotal}
          dotClass="pending-dot"
          active={activeKey === "pending"}
          onClick={onQuickFilter ? () => onQuickFilter("pending") : null}
        />
        <LegendItem
          label="Em validação"
          value={inValidationTotal}
          dotClass="in-validation-dot"
          active={activeKey === "in_validation"}
          onClick={onQuickFilter ? () => onQuickFilter("in_validation") : null}
        />
        <LegendItem
          label="Revisados"
          value={reviewedTotal}
          dotClass="reviewed-dot"
          active={activeKey === "reviewed_total"}
          onClick={onQuickFilter ? () => onQuickFilter("reviewed_total") : null}
        />
      </div>
    </section>
  );
}
