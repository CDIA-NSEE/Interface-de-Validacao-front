import { useEffect, useMemo, useState } from "react";

import EmptyState from "./EmptyState.jsx";
import ExamCard from "./ExamCard.jsx";

const PAGE_SIZE = 4;

const groupMeta = {
  em_validacao: {
    label: "Em validação",
    description: "Exames já iniciados que aguardam conclusão.",
  },
  nao_validado: {
    label: "Pendentes",
    description: "Exames ainda não iniciados.",
  },
  valido: {
    label: "Revisados",
    description: "Exames com análise concluída.",
  },
};

export default function ExamList({
  exams,
  emptyTitle = "Nenhum exame encontrado",
  emptyMessage = "Ajuste os filtros ou a busca para ampliar a lista.",
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [exams]);

  const { visibleExams, groups } = useMemo(() => {
    const nextVisibleExams = exams.slice(0, visibleCount);
    const nextGroups = Object.keys(groupMeta)
        .map((status) => ({
          status,
          ...groupMeta[status],
          total: exams.filter((exam) => exam.status_validation === status).length,
          exams: nextVisibleExams.filter((exam) => exam.status_validation === status),
        }))
        .filter((group) => group.exams.length > 0);

    return { visibleExams: nextVisibleExams, groups: nextGroups };
  }, [exams, visibleCount]);

  if (!exams?.length) {
    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
      />
    );
  }

  return (
    <section className="exam-list-shell" aria-label="Lista de exames">
      <div className="exam-groups">
        {groups.map((group) => (
          <section className="exam-group" key={group.status} aria-labelledby={`group-${group.status}`}>
            <header className="exam-group-header">
              <div>
                <h3 id={`group-${group.status}`}>{group.label}</h3>
                <p>{group.description}</p>
              </div>
              <span>{group.total}</span>
            </header>
            <div className="exam-list">
              {group.exams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {visibleExams.length < exams.length ? (
        <button
          className="button secondary load-more-button"
          type="button"
          onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
        >
          Carregar mais exames
        </button>
      ) : null}
    </section>
  );
}
