const REVIEW_RESULT_LABELS = {
  sem_alteracao: "Sem alteração",
  alterado: "Alterado",
};

export function getReviewResultMeta(reviewResult) {
  const label = REVIEW_RESULT_LABELS[reviewResult];
  return label ? { label } : null;
}
