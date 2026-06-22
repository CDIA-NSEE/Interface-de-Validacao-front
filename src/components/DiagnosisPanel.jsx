import { Check, MapPinned, Plus, Trash2, X } from "lucide-react";
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
  const [isAbnormal, setIsAbnormal] = useState(false);
  const originalDiagnoses = diagnoses.filter((diagnosis) => diagnosis.source === "original");
  const doctorDiagnoses = diagnoses.filter((diagnosis) => diagnosis.source === "doctor_added");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!name) return;

    const wasAdded = await onAdd({
      name,
      is_abnormal: isAbnormal,
      region_x: selectedRegion?.x ?? null,
      region_y: selectedRegion?.y ?? null,
      region_width: selectedRegion?.width ?? null,
      region_height: selectedRegion?.height ?? null,
    });

    if (wasAdded) {
      setName("");
      setIsAbnormal(false);
      onRegionConsumed?.();
    }
  }

  return (
    <div className="diagnosis-panel">
      <section className="diagnosis-group">
        <div className="diagnosis-group-heading">
          <strong>Diagnóstico original do ECG</strong>
          <span>Preservado do laudo de origem</span>
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
                  >
                    <Check size={15} aria-hidden="true" />
                    Concordo
                  </button>
                  <button
                    className="button compact-button danger"
                    type="button"
                    onClick={() => onReview(diagnosis.id, "rejected")}
                    disabled={isBusy}
                    aria-pressed={diagnosis.review_status === "rejected"}
                  >
                    <X size={15} aria-hidden="true" />
                    Discordo
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
          <strong>Diagnóstico médico final</strong>
          <span>Selecionado durante a revisão</span>
        </div>

        <div className="diagnosis-list">
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

        <form className="diagnosis-form" onSubmit={handleSubmit}>
          <label>
            Selecionar diagnóstico
            <select value={name} onChange={(event) => setName(event.target.value)} required>
              <option value="">Selecione uma opção</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isAbnormal}
              onChange={(event) => setIsAbnormal(event.target.checked)}
            />
            Marcar como alteração
          </label>
          {selectedRegion ? (
            <div className="region-ready">
              <MapPinned size={16} aria-hidden="true" />
              Região selecionada para o próximo diagnóstico
            </div>
          ) : null}
          <button
            className="button secondary full-width-button"
            type="submit"
            disabled={isBusy || !name}
          >
            <Plus size={17} aria-hidden="true" />
            Adicionar diagnóstico
          </button>
        </form>
      </section>
    </div>
  );
}
