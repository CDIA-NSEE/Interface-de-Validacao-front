const REQUIRED_REGION_COLOR = "#0f7490";
// Marrom, violeta, azul, oliva e magenta, nesta ordem (D2…D6): fora do vermelho, âmbar e verde (papéis clínicos) e
// do petróleo do D1; escuras o bastante para o texto branco da etiqueta Dn.i (≥ 4,6:1). Validadas em todos os pares,
// com o D1: ΔE OKLab ≥ 8 em protanopia/deuteranopia e ≥ 15 em visão normal. A anterior, quase toda roxa, tinha pares
// indistinguíveis (azul × fúcsia 2,5 em deuteranopia; azul × petróleo 4,9 em visão normal).
const REGION_COLORS = ["#7b3c09", "#6a59f2", "#113fbb", "#747812", "#821287"];

export function getDiagnosisReviewStatus(diagnosis) {
  const status = diagnosis?.validation_status || diagnosis?.review_status;
  return status === "confirmed" || status === "rejected" ? status : "pending";
}

export function getDiagnosisVisualStatus(diagnosis, previewStatus = null) {
  if (
    previewStatus === "pending" ||
    previewStatus === "confirmed" ||
    previewStatus === "rejected"
  ) {
    return previewStatus;
  }

  return getDiagnosisReviewStatus(diagnosis);
}

function stablePaletteIndex(value, paletteSize) {
  let hash = 0;
  const key = String(value);

  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }

  return hash % paletteSize;
}

// A cor segue a referência Dn: D1 na cor fixa do diagnóstico do dia e D2, D3… na ordem da paleta, então dois
// diagnósticos do exame só repetem cor depois de a paleta acabar. Por hash do id, dois diagnósticos do mesmo exame
// caíam na mesma cor com frequência (com 3 adicionais com área, ~44% dos exames).
export function getDiagnosisRegionVisual(diagnosis, previewStatus = null, { diagnosisReference = null } = {}) {
  const status = getDiagnosisVisualStatus(diagnosis, previewStatus);
  const position = Number(/^D(\d+)$/.exec(diagnosisReference ?? "")?.[1]);
  const identity =
    diagnosis?.id ?? diagnosis?.metadata_id ?? diagnosis?.standard_text ?? diagnosis?.name ?? "diagnosis";
  const color = position === 1
    ? REQUIRED_REGION_COLOR
    : position > 1
      ? REGION_COLORS[(position - 2) % REGION_COLORS.length]
      : REGION_COLORS[stablePaletteIndex(identity, REGION_COLORS.length)];

  return {
    status,
    color,
    fill: `color-mix(in oklab, ${color} 10%, transparent)`,
    draftFill: `color-mix(in oklab, ${color} 10%, transparent)`,
  };
}
