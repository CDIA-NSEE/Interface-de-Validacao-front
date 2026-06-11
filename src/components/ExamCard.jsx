import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";

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

  return (
    <article className="exam-card">
      <div className="exam-card-main">
        <div>
          <span className="eyebrow">Exame</span>
          <strong>{exam.exam_code}</strong>
        </div>
        <StatusBadge status={exam.status_validation} reviewResult={exam.review_result} />
      </div>

      <div className="exam-meta">
        <span>
          <CalendarDays size={16} aria-hidden="true" />
          <span>
            <b>Data do exame:</b> {formatDate(exam.exam_date)}
          </span>
        </span>
        {flowDate?.value ? (
          <span>
            <Clock3 size={16} aria-hidden="true" />
            <span>
              <b>{flowDate.label}:</b> {formatDateTime(flowDate.value)}
            </span>
          </span>
        ) : null}
      </div>

      <div className="exam-card-footer">
        <Link className="button secondary compact-button" to={`/exams/${exam.id}`}>
          Abrir
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
