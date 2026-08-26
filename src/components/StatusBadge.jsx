import { Badge } from "@/components/ui/badge.jsx";
import { getQueueStateKey, getQueueStateMeta } from "@/utils/queueSemantics.js";
import { getReviewResultMeta } from "@/utils/statusLabels.js";

const QUEUE_BADGE_VARIANTS = {
  all: "secondary",
  start: "info",
  validated: "warning",
  completed: "success",
};

const REVIEW_BADGE_VARIANTS = {
  alterado: "warning",
  sem_alteracao: "success",
};

export default function StatusBadge({ status, queueState, reviewResult }) {
  const queueStateKey = getQueueStateKey(queueState, status);
  const statusMeta = getQueueStateMeta(queueState, status);
  const reviewMeta = status === "valido" ? getReviewResultMeta(reviewResult) : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={QUEUE_BADGE_VARIANTS[queueStateKey] || "secondary"}>
        {statusMeta.label}
      </Badge>
      {reviewMeta ? (
        <Badge variant={REVIEW_BADGE_VARIANTS[reviewResult] || "secondary"}>
          {reviewMeta.label}
        </Badge>
      ) : null}
    </div>
  );
}
