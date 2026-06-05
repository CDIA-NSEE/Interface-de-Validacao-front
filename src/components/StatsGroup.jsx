export default function StatsGroup({ title, summary, summaryTone = "neutral", children, footer }) {
  return (
    <section className="stats-group" aria-label={title}>
      <div className="stats-group-header">
        <h3>{title}</h3>
        {summary ? <p className={`stats-group-summary summary-${summaryTone}`}>{summary}</p> : null}
      </div>
      <div className="stats-group-grid">{children}</div>
      {footer ? <div className="stats-group-footer">{footer}</div> : null}
    </section>
  );
}
