import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ItemGroup } from "@/components/ui/item";

import { getQueueStateKey, QUEUE_STATE_META, QUEUE_STATE_ORDER } from "../utils/queueSemantics.js";
import EmptyState from "./EmptyState.jsx";
import ExamCard from "./ExamCard.jsx";

const PAGE_SIZE = 4;

const groupVariants = {
  start: "warning",
  validated: "info",
  completed: "success",
};

export default function ExamList({
  exams = [],
  emptyTitle = "Nenhum exame encontrado",
  emptyMessage = "Ajuste os filtros ou a busca para ampliar a lista.",
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageCount = Math.max(Math.ceil(exams.length / PAGE_SIZE), 1);
  const effectivePage = Math.min(currentPage, pageCount);

  useEffect(() => {
    setCurrentPage(1);
  }, [exams]);

  const totalsByState = useMemo(
    () =>
      exams.reduce(
        (totals, exam) => {
          const queueState = getQueueStateKey(exam);
          totals[queueState] = (totals[queueState] || 0) + 1;
          return totals;
        },
        {},
      ),
    [exams],
  );

  const groups = useMemo(() => {
    const firstVisibleIndex = (effectivePage - 1) * PAGE_SIZE;
    const visibleExams = exams.slice(firstVisibleIndex, firstVisibleIndex + PAGE_SIZE);

    return QUEUE_STATE_ORDER
      .map((queueState) => ({
        queueState,
        ...QUEUE_STATE_META[queueState],
        total: totalsByState[queueState] || 0,
        exams: visibleExams.filter((exam) => getQueueStateKey(exam) === queueState),
      }))
      .filter((group) => group.exams.length > 0);
  }, [effectivePage, exams, totalsByState]);

  if (!exams?.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Lista de exames">
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <Card key={group.queueState} size="sm" variant={groupVariants[group.queueState] || "default"}>
            <CardHeader>
              <CardTitle>
                <h3 id={`group-${group.queueState}`}>{group.label}</h3>
              </CardTitle>
              <CardDescription>{group.description}</CardDescription>
              <CardAction>
                <Badge variant={groupVariants[group.queueState] || "secondary"}>
                  {group.total}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ItemGroup aria-labelledby={`group-${group.queueState}`} className="gap-2">
                {group.exams.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} />
                ))}
              </ItemGroup>
            </CardContent>
          </Card>
        ))}
      </div>

      {pageCount > 1 ? (
        <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Paginação de exames">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={effectivePage === 1}
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            aria-label="Página anterior"
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            Página {effectivePage} de {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={effectivePage === pageCount}
            onClick={() => setCurrentPage((page) => Math.min(page + 1, pageCount))}
            aria-label="Próxima página"
          >
            Próxima
          </Button>
        </nav>
      ) : null}
    </section>
  );
}
