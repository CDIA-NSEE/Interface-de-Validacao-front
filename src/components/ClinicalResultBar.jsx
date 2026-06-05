function safeNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default function ClinicalResultBar({ withoutChange, withChange, reviewedTotal }) {
  const withoutChangeTotal = safeNumber(withoutChange);
  const withChangeTotal = safeNumber(withChange);
  const totalReviewed = safeNumber(reviewedTotal);

  if (!totalReviewed) return null;

  const withoutChangePercent = percent(withoutChangeTotal, totalReviewed);
  const withChangePercent = percent(withChangeTotal, totalReviewed);

  return (
    <div className="clinical-result-bar" aria-label="Distribuição dos resultados revisados">
      <div
        className="clinical-segmented-progress"
        role="img"
        aria-label={`${withoutChangePercent}% sem alteração e ${withChangePercent}% alterados`}
      >
        <span
          className="clinical-segment clinical-without-change"
          style={{ width: `${withoutChangePercent}%` }}
        />
        <span
          className="clinical-segment clinical-with-change"
          style={{ width: `${withChangePercent}%` }}
        />
      </div>

      <div className="clinical-legend">
        <span>
          <i className="legend-dot clinical-without-change-dot" aria-hidden="true" />
          Sem alteração: {withoutChangeTotal}
        </span>
        <span>
          <i className="legend-dot clinical-with-change-dot" aria-hidden="true" />
          Alterados: {withChangeTotal}
        </span>
      </div>
    </div>
  );
}

