export const STATUS_OPTIONS = [
  { value: "nao_validado", label: "Não validado" },
  { value: "em_validacao", label: "Em validação" },
  { value: "valido", label: "Válido" },
];

export const REVIEW_RESULT_OPTIONS = [
  { value: "sem_alteracao", label: "Sem alteração" },
  { value: "alterado", label: "Alterado" },
];

export const STATUS_META = {
  nao_validado: {
    label: "Não validado",
    className: "status-neutral",
  },
  em_validacao: {
    label: "Em validação",
    className: "status-info",
  },
  valido: {
    label: "Válido",
    className: "status-success",
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

