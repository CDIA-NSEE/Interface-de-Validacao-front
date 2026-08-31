const REQUIRED_REGION_COLOR = "#0f7490";
const REGION_COLORS = ["#4338ca", "#7c3aed", "#a21caf", "#0369a1", "#6b21a8", "#475569"];

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

export function getDiagnosisRegionVisual(diagnosis, previewStatus = null, { isRequired = false } = {}) {
  const status = getDiagnosisVisualStatus(diagnosis, previewStatus);
  const identity =
    diagnosis?.id ?? diagnosis?.metadata_id ?? diagnosis?.standard_text ?? diagnosis?.name ?? "diagnosis";
  const color = isRequired
    ? REQUIRED_REGION_COLOR
    : REGION_COLORS[stablePaletteIndex(identity, REGION_COLORS.length)];

  return {
    status,
    color,
    fill: `color-mix(in oklab, ${color} 10%, transparent)`,
    draftFill: `color-mix(in oklab, ${color} 10%, transparent)`,
  };
}
