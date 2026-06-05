import api from "./api.js";

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

export async function validateExam(examId, payload) {
  const { data } = await api.post(`/exams/${examId}/validate`, payload);
  return data;
}

