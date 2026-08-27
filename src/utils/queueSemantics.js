export const QUEUE_STATE_META = {
  all: {
    key: "all",
    label: "Todos",
    description: "Todos os exames.",
    tooltip: "Mostra todos os exames.",
  },
  start: {
    key: "start",
    label: "Iniciar",
    description: "Exames do dia sem ação concluída.",
    tooltip: "Exames do dia ainda sem ação concluída.",
  },
  validated: {
    key: "validated",
    label: "Em Validação",
    description: "Diagnóstico do dia já concordado ou discordado.",
    tooltip: "Diagnóstico do dia já concordado ou discordado.",
  },
  completed: {
    key: "completed",
    label: "Concluídos",
    description: "Exames finalizados.",
    tooltip: "Exames finalizados.",
  },
};

export const REFINEMENT_META = {
  confirmed: {
    key: "confirmed",
    label: "Concordou",
    tooltip: "Mostra exames em que o diagnóstico foi confirmado.",
  },
  rejected: {
    key: "rejected",
    label: "Discordou",
    tooltip: "Mostra exames em que o diagnóstico foi rejeitado.",
  },
  with_region: {
    key: "with_region",
    label: "Mapeado",
    tooltip: "Mostra exames mapeados no ECG.",
  },
  without_region: {
    key: "without_region",
    label: "Não mapeado",
    tooltip: "Mostra exames não mapeados no ECG.",
  },
};

const LEGACY_STATUS_QUEUE_STATE = {
  nao_validado: "start",
  em_validacao: "start",
  valido: "completed",
};

export const QUEUE_STATE_ORDER = ["start", "validated", "completed"];

export function getQueueStateKey(examOrQueueState, fallbackStatus) {
  if (typeof examOrQueueState === "string" && QUEUE_STATE_META[examOrQueueState]) {
    return examOrQueueState;
  }

  const queueState = examOrQueueState?.queue_state;
  if (queueState && QUEUE_STATE_META[queueState]) {
    return queueState;
  }

  const status = examOrQueueState?.status_validation || fallbackStatus;
  return LEGACY_STATUS_QUEUE_STATE[status] || "start";
}

export function getQueueStateMeta(examOrQueueState, fallbackStatus) {
  return QUEUE_STATE_META[getQueueStateKey(examOrQueueState, fallbackStatus)] || QUEUE_STATE_META.start;
}
