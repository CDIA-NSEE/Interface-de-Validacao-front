import { useEffect, useMemo, useState } from "react";

import EmptyState from "./EmptyState.jsx";
import ExamCard from "./ExamCard.jsx";
import { getQueueStateKey, QUEUE_STATE_META, QUEUE_STATE_ORDER } from "../utils/queueSemantics.js";

const PAGE_SIZE = 4;

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
    const nextGroups = QUEUE_STATE_ORDER
        .map((queueState) => ({
          queueState,
          ...QUEUE_STATE_META[queueState],
          total: exams.filter((exam) => getQueueStateKey(exam) === queueState).length,
          exams: nextVisibleExams.filter((exam) => getQueueStateKey(exam) === queueState),
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
          <section
            className={`exam-group ${group.groupClassName}${groups.length === 1 ? " single-group" : ""}`}
            key={group.queueState}
            aria-labelledby={`group-${group.queueState}`}
          >
            <header className="exam-group-header">
              <div>
                <h3 id={`group-${group.queueState}`}>{group.label}</h3>
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
