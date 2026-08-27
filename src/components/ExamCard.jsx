import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from "@/components/ui/item";

import { formatDate, formatDateTime } from "../utils/dateUtils.js";
import StatusBadge from "./StatusBadge.jsx";

function getFlowDate(exam) {
  if (exam.status_validation === "valido") {
    return { label: "Concluído em", value: exam.completed_at };
  }
  if (exam.status_validation === "em_validacao") {
    return { label: "Iniciado em", value: exam.started_at };
  }
  return null;
}

export default function ExamCard({ exam }) {
  const flowDate = getFlowDate(exam);
  const titleId = `exam-${exam.id}-title`;

  return (
    <Item
      render={<article />}
      role="listitem"
      aria-labelledby={titleId}
      variant="outline"
      className="items-start sm:items-center"
    >
      <ItemContent className="min-w-0 gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ItemTitle>
            <h4 id={titleId} aria-label={`Exame ${exam.exam_code}`}>
              <span className="text-muted-foreground">Exame</span>{" "}
              <strong>{exam.exam_code}</strong>
            </h4>
          </ItemTitle>
          <StatusBadge
            status={exam.status_validation}
            queueState={exam.queue_state}
            reviewResult={exam.review_result}
          />
        </div>

        <dl className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            <dt className="font-medium text-foreground">Data do exame:</dt>
            <dd>{formatDate(exam.exam_date)}</dd>
          </div>
          {flowDate?.value ? (
            <div className="flex items-center gap-1.5">
              <Clock3 className="size-4 shrink-0" aria-hidden="true" />
              <dt className="font-medium text-foreground">{flowDate.label}:</dt>
              <dd>{formatDateTime(flowDate.value)}</dd>
            </div>
          ) : null}
        </dl>
      </ItemContent>

      <ItemActions className="basis-full justify-end sm:basis-auto">
        <Link
          className={buttonVariants({ variant: "outline", size: "sm" })}
          to={`/exams/${exam.id}`}
        >
          Abrir
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </ItemActions>
    </Item>
  );
}
