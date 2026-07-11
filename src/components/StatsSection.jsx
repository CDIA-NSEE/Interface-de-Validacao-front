import ProgressSummary from "./ProgressSummary.jsx";
import StatsCards from "./StatsCards.jsx";

export default function StatsSection({ stats }) {
  return (
    <section className="stats-section" aria-labelledby="stats-section-title">
      <div className="section-heading">
        <h2 id="stats-section-title">Resumo da validacao</h2>
        <p>Acompanhe o andamento dos exames no fluxo.</p>
        <span>Base dos indicadores: todos os exames</span>
      </div>

      <ProgressSummary stats={stats} />
      <StatsCards stats={stats} />
    </section>
  );
}
