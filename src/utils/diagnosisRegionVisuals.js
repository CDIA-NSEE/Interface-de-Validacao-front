const PENDING_REGION_VISUAL = {
  color: "#52677b",
  fill: "rgba(82, 103, 123, 0.16)",
  draftFill: "rgba(82, 103, 123, 0.1)",
};

const REGION_VISUAL_PALETTES = {
  confirmed: [
    { color: "#147d64", fill: "rgba(20, 125, 100, 0.18)", draftFill: "rgba(20, 125, 100, 0.1)" },
    { color: "#167c4b", fill: "rgba(22, 124, 75, 0.18)", draftFill: "rgba(22, 124, 75, 0.1)" },
    { color: "#0b7c85", fill: "rgba(11, 124, 133, 0.18)", draftFill: "rgba(11, 124, 133, 0.1)" },
    { color: "#2d7a45", fill: "rgba(45, 122, 69, 0.18)", draftFill: "rgba(45, 122, 69, 0.1)" },
    { color: "#08756a", fill: "rgba(8, 117, 106, 0.18)", draftFill: "rgba(8, 117, 106, 0.1)" },
    { color: "#25845a", fill: "rgba(37, 132, 90, 0.18)", draftFill: "rgba(37, 132, 90, 0.1)" },
  ],
  rejected: [
    { color: "#bd4050", fill: "rgba(189, 64, 80, 0.18)", draftFill: "rgba(189, 64, 80, 0.1)" },
    { color: "#c04762", fill: "rgba(192, 71, 98, 0.18)", draftFill: "rgba(192, 71, 98, 0.1)" },
    { color: "#b54565", fill: "rgba(181, 69, 101, 0.18)", draftFill: "rgba(181, 69, 101, 0.1)" },
    { color: "#c14b3b", fill: "rgba(193, 75, 59, 0.18)", draftFill: "rgba(193, 75, 59, 0.1)" },
    { color: "#ad3e4e", fill: "rgba(173, 62, 78, 0.18)", draftFill: "rgba(173, 62, 78, 0.1)" },
    { color: "#bd3560", fill: "rgba(189, 53, 96, 0.18)", draftFill: "rgba(189, 53, 96, 0.1)" },
  ],
};

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

export function getDiagnosisRegionVisual(diagnosis, previewStatus = null) {
  const status = getDiagnosisVisualStatus(diagnosis, previewStatus);
  if (status === "pending") {
    return { status, ...PENDING_REGION_VISUAL };
  }

  const palette = REGION_VISUAL_PALETTES[status];
  const identity =
    diagnosis?.id ?? diagnosis?.metadata_id ?? diagnosis?.standard_text ?? diagnosis?.name ?? "diagnosis";
  const visual = palette[stablePaletteIndex(identity, palette.length)];

  return { status, ...visual };
}
