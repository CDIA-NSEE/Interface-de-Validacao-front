export const STATUS_OPTIONS = [
  { value: "nao_validado", label: "Iniciar" },
  { value: "em_validacao", label: "Iniciar" },
  { value: "valido", label: "Concluídos" },
];

export const REVIEW_RESULT_OPTIONS = [
  { value: "sem_alteracao", label: "Sem alteração" },
  { value: "alterado", label: "Alterado" },
];

export const STATUS_META = {
  nao_validado: {
    label: "Iniciar",
    className: "status-state-start",
  },
  em_validacao: {
    label: "Iniciar",
    className: "status-state-start",
  },
  valido: {
    label: "Concluídos",
    className: "status-state-completed",
  },
};

export const REVIEW_RESULT_META = {
  sem_alteracao: {
    label: "Sem alteração",
    className: "status-success",
  },
  alterado: {
    label: "Alterado",
    className: "status-warning",
  },
};

export function getStatusMeta(status) {
  return STATUS_META[status] ?? {
    label: status || "Indefinido",
    className: "status-neutral",
  };
}

export function getReviewResultMeta(reviewResult) {
  return REVIEW_RESULT_META[reviewResult] ?? null;
}
