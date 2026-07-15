export const QUEUE_STATE_META = {
  all: {
    key: "all",
    label: "Todos",
    description: "Todos os exames.",
    tooltip: "Mostra todos os exames.",
    tone: "state-all",
    statusClassName: "status-state-all",
    groupClassName: "exam-group-state-all",
  },
  start: {
    key: "start",
    label: "Iniciar",
    description: "Exames do dia sem ação concluída.",
    tooltip: "Exames do dia ainda sem ação concluída.",
    tone: "state-start",
    statusClassName: "status-state-start",
    groupClassName: "exam-group-state-start",
  },
  validated: {
    key: "validated",
    label: "Validados",
    description: "Diagnóstico do dia já concordado ou discordado.",
    tooltip: "Diagnóstico do dia já concordado ou discordado.",
    tone: "state-validated",
    statusClassName: "status-state-validated",
    groupClassName: "exam-group-state-validated",
  },
  completed: {
    key: "completed",
    label: "Concluídos",
    description: "Exames finalizados.",
    tooltip: "Exames finalizados.",
    tone: "state-completed",
    statusClassName: "status-state-completed",
    groupClassName: "exam-group-state-completed",
  },
};

export const REFINEMENT_META = {
  confirmed: {
    key: "confirmed",
    label: "Concordou",
    tooltip: "Mostra exames em que o diagnóstico foi confirmado.",
    tone: "refinement-confirmed",
  },
  rejected: {
    key: "rejected",
    label: "Discordou",
    tooltip: "Mostra exames em que o diagnóstico foi rejeitado.",
    tone: "refinement-rejected",
  },
  with_region: {
    key: "with_region",
    label: "Mapeado",
    tooltip: "Mostra exames mapeados no ECG.",
    tone: "refinement-with-region",
  },
  without_region: {
    key: "without_region",
    label: "Não mapeado",
    tooltip: "Mostra exames não mapeados no ECG.",
    tone: "refinement-without-region",
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
