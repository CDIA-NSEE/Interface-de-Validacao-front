export const STATUS_OPTIONS = [
  { value: "nao_validado", label: "Iniciar" },
  { value: "em_validacao", label: "Iniciar" },
  { value: "valido", label: "Concluidos" },
];

export const REVIEW_RESULT_OPTIONS = [
  { value: "sem_alteracao", label: "Sem alteracao" },
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
    label: "Concluidos",
    className: "status-state-completed",
  },
};

export const REVIEW_RESULT_META = {
  sem_alteracao: {
    label: "Sem alteracao",
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
