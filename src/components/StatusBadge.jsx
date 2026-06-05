import { getReviewResultMeta, getStatusMeta } from "../utils/statusLabels.js";

export default function StatusBadge({ status, reviewResult }) {
  const statusMeta = getStatusMeta(status);
  const reviewMeta = status === "valido" ? getReviewResultMeta(reviewResult) : null;

  return (
    <div className="badge-row">
      <span className={`status-badge ${statusMeta.className}`}>{statusMeta.label}</span>
      {reviewMeta ? (
        <span className={`status-badge ${reviewMeta.className}`}>{reviewMeta.label}</span>
      ) : null}
    </div>
  );
}

