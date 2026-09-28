import api from "./api.js";

// O traçado pesa ~0,7 MB (gzip) e passaria do timeout global de 12 s, pensado para JSON, em rede lenta.
const EXAM_IMAGE_TIMEOUT_MS = 60000;

function cleanFilters(filters = {}) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value && value !== "all"),
  );
}

export async function getExams(filters) {
  const { data } = await api.get("/exams", {
    params: cleanFilters(filters),
  });
  return data;
}

export async function getExamById(id) {
  const { data } = await api.get(`/exams/${id}`);
  return data;
}

// Baixa com o token e só devolve a URL depois de decodificar: o traçado pinta assim que é exibido, e um arquivo
// corrompido vira erro em vez de imagem quebrada. Quem recebe a URL a libera com URL.revokeObjectURL.
export async function getExamImage(id, { signal } = {}) {
  const { data } = await api.get(`/exams/${id}/image`, {
    responseType: "blob",
    signal,
    timeout: EXAM_IMAGE_TIMEOUT_MS,
  });
  const src = URL.createObjectURL(data);
  try {
    const image = new Image();
    image.src = src;
    await image.decode();
    return src;
  } catch (error) {
    URL.revokeObjectURL(src);
    throw error;
  }
}

export async function getDiagnosisOptions() {
  const { data } = await api.get("/diagnosis-options");
  return data;
}

export async function updateExamStatus(id, status) {
  const { data } = await api.patch(`/exams/${id}/status`, {
    status_validation: status,
  });
  return data;
}

export async function addDiagnosis(examId, diagnosis) {
  const { data } = await api.post(`/exams/${examId}/diagnoses`, diagnosis);
  return data;
}

export async function removeDiagnosis(examId, diagnosisId) {
  const { data } = await api.delete(`/exams/${examId}/diagnoses/${diagnosisId}`);
  return data;
}

export async function addDiagnosisRegion(diagnosisId, region) {
  const { data } = await api.post(`/diagnoses/${diagnosisId}/regions`, region);
  return data;
}

export async function updateDiagnosisRegion(diagnosisId, regionId, region) {
  const { data } = await api.patch(`/diagnoses/${diagnosisId}/regions/${regionId}`, region);
  return data;
}

export async function removeDiagnosisRegion(diagnosisId, regionId) {
  const { data } = await api.delete(`/diagnoses/${diagnosisId}/regions/${regionId}`);
  return data;
}

export async function reviewDiagnosis(examId, diagnosisId, reviewStatus) {
  const { data } = await api.patch(`/exams/${examId}/diagnoses/${diagnosisId}/review`, {
    review_status: reviewStatus,
  });
  return data;
}

export async function validateExam(examId, payload) {
  const { data } = await api.post(`/exams/${examId}/validate`, payload);
  return data;
}

export async function saveExamDraft(examId, payload) {
  const { data } = await api.put(`/exams/${examId}/draft`, payload);
  return data;
}
