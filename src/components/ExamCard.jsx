import { ArrowRight, CalendarDays, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { formatDate } from "../utils/dateUtils.js";
import StatusBadge from "./StatusBadge.jsx";

export default function ExamCard({ exam }) {
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
          {formatDate(exam.exam_date)}
        </span>
        <span>
          <UserRound size={16} aria-hidden="true" />
          {exam.patient?.name || "Paciente não informado"}
        </span>
      </div>

      <div className="exam-card-footer">
        <span>{exam.category}</span>
        <span>{exam.exam_type}</span>
        <Link className="button secondary compact-button" to={`/exams/${exam.id}`}>
          Abrir
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

