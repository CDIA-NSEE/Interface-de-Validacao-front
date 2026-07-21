export function normalizeDiagnosisText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase();
}

export const ORIGINAL_TEXT_PREVIEW_LIMIT = 48;

export function getOriginalTextPreview(value, limit = ORIGINAL_TEXT_PREVIEW_LIMIT) {
  const normalizedText = String(value || "").replace(/\s+/g, " ").trim();
  const characters = Array.from(normalizedText);
  const maxLength = Math.max(1, Math.floor(Number(limit) || ORIGINAL_TEXT_PREVIEW_LIMIT));

  if (characters.length <= maxLength) return normalizedText;
  if (maxLength === 1) return "\u2026";

  return `${characters.slice(0, maxLength - 1).join("")}\u2026`;
}

export function isDailyDiagnosis(diagnosis, dailyStandardDiagnosis) {
  if (!dailyStandardDiagnosis) return Boolean(diagnosis.daily_required);
  return (
    normalizeDiagnosisText(diagnosis.standard_text || diagnosis.name) ===
    normalizeDiagnosisText(dailyStandardDiagnosis)
  );
}

export function getDiagnosisDisplayGroups(
  diagnoses = [],
  { dailyStandardDiagnosis, isGeneralReviewDay = false } = {},
) {
  const originalDiagnoses = diagnoses.filter((diagnosis) => diagnosis.source === "original");
  const doctorDiagnoses = diagnoses.filter((diagnosis) => diagnosis.source === "doctor_added");

  if (isGeneralReviewDay) {
    return {
      requiredDiagnoses: originalDiagnoses,
      optionalDiagnoses: [],
      doctorDiagnoses,
      displayOrder: [...originalDiagnoses, ...doctorDiagnoses],
    };
  }

  const requiredDiagnoses = originalDiagnoses.filter((diagnosis) =>
    isDailyDiagnosis(diagnosis, dailyStandardDiagnosis),
  );
  const optionalDiagnoses = originalDiagnoses.filter(
    (diagnosis) => !isDailyDiagnosis(diagnosis, dailyStandardDiagnosis),
  );

  return {
    requiredDiagnoses,
    optionalDiagnoses,
    doctorDiagnoses,
    displayOrder: [...requiredDiagnoses, ...optionalDiagnoses, ...doctorDiagnoses],
  };
}

export function createDiagnosisReferences(displayOrder = []) {
  const references = {};
  let position = 1;

  for (const diagnosis of displayOrder) {
    if (diagnosis?.id === null || diagnosis?.id === undefined) continue;
    references[String(diagnosis.id)] = `D${position}`;
    position += 1;
  }

  return references;
}

export function getDiagnosisReference(references, diagnosisId) {
  if (diagnosisId === null || diagnosisId === undefined) return null;
  return references[String(diagnosisId)] || null;
}

export function getRegionReference(diagnosisReference, regionIndex) {
  if (!diagnosisReference || !Number.isInteger(regionIndex) || regionIndex < 0) return null;
  return `${diagnosisReference}.${regionIndex + 1}`;
}

export function getActiveRegionReference(diagnosisReference, regions = [], target) {
  if (!diagnosisReference || !target) return null;

  let regionIndex = -1;

  if (target.regionId !== null && target.regionId !== undefined) {
    regionIndex = regions.findIndex((region) => String(region.id) === String(target.regionId));
  }

  if (regionIndex < 0 && target.region) {
    regionIndex = regions.indexOf(target.region);
  }

  return getRegionReference(diagnosisReference, regionIndex >= 0 ? regionIndex : regions.length);
}
