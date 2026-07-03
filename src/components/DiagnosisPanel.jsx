import { Check, MapPinned, Trash2, X } from "lucide-react";
import { useState } from "react";

const REVIEW_LABELS = {
  pending: "Aguardando confirmação",
  confirmed: "Confirmado pelo médico",
  rejected: "Discordado pelo médico",
};

export default function DiagnosisPanel({
  diagnoses = [],
  options = [],
  onAdd,
  onRemove,
  onReview,
  isBusy,
  selectedRegion,
  onRegionConsumed,
}) {
  const [name, setName] = useState("");
  const originalDiagnoses = diagnoses.filter((diagnosis) => diagnosis.source === "original");
  const doctorDiagnoses = diagnoses.filter((diagnosis) => diagnosis.source === "doctor_added");

  async function handleSelectDiagnosis(event) {
    const diagnosisName = event.target.value;
    setName(diagnosisName);
    if (!diagnosisName) return;

    const wasAdded = await onAdd({
      name: diagnosisName,
      is_abnormal: true,
      region_x: selectedRegion?.x ?? null,
      region_y: selectedRegion?.y ?? null,
      region_width: selectedRegion?.width ?? null,
      region_height: selectedRegion?.height ?? null,
    });

    if (wasAdded) {
      setName("");
      onRegionConsumed?.();
    }
  }

  return (
    <div className="diagnosis-panel">
      <section className="diagnosis-group">
        <div className="diagnosis-group-heading">
          <strong>Diagnóstico do ECG</strong>
        </div>

        <div className="diagnosis-list">
          {originalDiagnoses.length ? (
            originalDiagnoses.map((diagnosis) => (
              <article
                className={`diagnosis-item original-diagnosis ${diagnosis.review_status}`}
                key={diagnosis.id}
              >
                <div className="diagnosis-content">
                  <strong>{diagnosis.name}</strong>
                  <span className="diagnosis-review-label">
                    {REVIEW_LABELS[diagnosis.review_status]}
                  </span>
                  {diagnosis.region_width && diagnosis.region_height ? (
                    <span className="diagnosis-region">
                      <MapPinned size={14} aria-hidden="true" />
                      Região ECG vinculada
                    </span>
                  ) : null}
                </div>
                <div className="diagnosis-review-actions">
                  <button
                    className="button compact-button success"
                    type="button"
                    onClick={() => onReview(diagnosis.id, "confirmed")}
                    disabled={isBusy}
                    aria-pressed={diagnosis.review_status === "confirmed"}
                    aria-label="Concordar com diagnóstico"
                    title="Concordar com diagnóstico"
                  >
                    <Check size={21} aria-hidden="true" />
                  </button>
                  <button
                    className="button compact-button danger"
                    type="button"
                    onClick={() => onReview(diagnosis.id, "rejected")}
                    disabled={isBusy}
                    aria-pressed={diagnosis.review_status === "rejected"}
                    aria-label="Discordar do diagnóstico"
                    title="Discordar do diagnóstico"
                  >
                    <X size={21} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <span className="muted-text">Nenhuma conclusão original registrada.</span>
          )}
        </div>
      </section>

      <section className="diagnosis-group">
        <div className="diagnosis-group-heading">
          <strong>Adicionar novo diagnóstico</strong>
        </div>

        <div className="diagnosis-form">
          <label className="visually-hidden" htmlFor="new-diagnosis-select">
            Selecionar um diagnóstico
          </label>
          <select
            id="new-diagnosis-select"
            value={name}
            onChange={handleSelectDiagnosis}
            disabled={isBusy}
            aria-label="Selecionar um diagnóstico"
          >
              <option value="">Selecionar um diagnóstico</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
          </select>
          {selectedRegion ? (
            <div className="region-ready">
              <MapPinned size={16} aria-hidden="true" />
              Região selecionada para o próximo diagnóstico
            </div>
          ) : null}
        </div>

        {doctorDiagnoses.length ? (
          <div className="diagnosis-list doctor-diagnosis-list">
            {doctorDiagnoses.map((diagnosis) => (
              <article className="diagnosis-item doctor-diagnosis" key={diagnosis.id}>
                <div className="diagnosis-content">
                  <strong>{diagnosis.name}</strong>
                  <span>Adicionado pelo médico</span>
                  {diagnosis.region_width && diagnosis.region_height ? (
                    <span className="diagnosis-region">
                      <MapPinned size={14} aria-hidden="true" />
                      Região ECG vinculada
                    </span>
                  ) : null}
                </div>
                <button
                  className="icon-button danger-icon"
                  type="button"
                  onClick={() => onRemove(diagnosis.id)}
                  disabled={isBusy}
                  aria-label={`Remover ${diagnosis.name}`}
                  title="Remover diagnóstico médico"
                >
                  <Trash2 size={17} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
