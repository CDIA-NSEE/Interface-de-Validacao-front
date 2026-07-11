import { getQueueStateMeta } from "../utils/queueSemantics.js";
import { getReviewResultMeta } from "../utils/statusLabels.js";

export default function StatusBadge({ status, queueState, reviewResult }) {
  const statusMeta = getQueueStateMeta(queueState, status);
  const reviewMeta = status === "valido" ? getReviewResultMeta(reviewResult) : null;

  return (
    <div className="badge-row">
      <span className={`status-badge ${statusMeta.statusClassName || statusMeta.className}`}>
        {statusMeta.label}
      </span>
      {reviewMeta ? (
        <span className={`status-badge ${reviewMeta.className}`}>{reviewMeta.label}</span>
      ) : null}
    </div>
  );
}
