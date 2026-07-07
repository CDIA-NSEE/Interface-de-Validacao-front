import api from "./api.js";

export async function getValidationContext() {
  const { data } = await api.get("/validation/context");
  return data;
}

export async function getValidationQueue() {
  const { data } = await api.get("/validation/queue");
  return data;
}

export async function getNextValidationExam() {
  const { data } = await api.get("/validation/next");
  return data;
}

export async function reviewDailyDiagnosis(diagnosisId, reviewStatus, notes = "") {
  const { data } = await api.post(`/validation/diagnoses/${diagnosisId}/review`, {
    review_status: reviewStatus,
    notes,
  });
  return data;
}
