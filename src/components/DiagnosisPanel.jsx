import { Check, MapPinned, Sparkles, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

const REVIEW_LABELS = {
  pending: "Aguardando decisao",
  confirmed: "Concordo",
  rejected: "Discordo",
};

function statusOf(diagnosis) {
  return diagnosis.validation_status || diagnosis.review_status || "pending";
}

function normalize(value = "") {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase();
}

function isDailyDiagnosis(diagnosis, dailyStandardDiagnosis) {
  if (!dailyStandardDiagnosis) return Boolean(diagnosis.daily_required);
  return normalize(diagnosis.standard_text || diagnosis.name) === normalize(dailyStandardDiagnosis);
}

function DiagnosisCard({ diagnosis, isBusy, isRequired, onReview }) {
  const status = statusOf(diagnosis);
  const standardText = diagnosis.standard_text || diagnosis.name;
  const originalText = diagnosis.original_text || diagnosis.name;

  return (
    <article
      className={`diagnosis-item original-diagnosis ${status} ${
        isRequired ? "required-diagnosis" : "optional-diagnosis"
      }`}
    >
      <div className="diagnosis-content">
        <span className="diagnosis-kicker">{isRequired ? "Obrigatorio hoje" : "Opcional"}</span>
        <div className="diagnosis-text-pair">
          <span>Texto Padrao</span>
          <strong>{standardText}</strong>
        </div>
        <div className="diagnosis-text-pair original-text-pair">
          <span>Texto Original</span>
          <p>{originalText}</p>
        </div>
        <span className="diagnosis-review-label">{REVIEW_LABELS[status] || REVIEW_LABELS.pending}</span>
        {diagnosis.region_width && diagnosis.region_height ? (
          <span className="diagnosis-region" title="Regiao ECG vinculada">
            <MapPinned size={14} aria-hidden="true" />
            Regiao vinculada
          </span>
        ) : null}
      </div>
      <div className="diagnosis-review-actions">
        <button
          className={`button compact-button review-toggle agree ${
            status === "confirmed" ? "is-active" : "is-muted"
          }`}
          type="button"
          onClick={() => onReview(diagnosis.id, "confirmed")}
          disabled={isBusy}
          aria-pressed={status === "confirmed"}
          aria-label="Concordar com diagnostico"
          title="Concordar"
        >
          <Check size={21} aria-hidden="true" />
        </button>
        <button
          className={`button compact-button review-toggle disagree ${
            status === "rejected" ? "is-active" : "is-muted"
          }`}
          type="button"
          onClick={() => onReview(diagnosis.id, "rejected")}
          disabled={isBusy}
          aria-pressed={status === "rejected"}
          aria-label="Discordar do diagnostico"
          title="Discordar"
        >
          <X size={21} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export default function DiagnosisPanel({
  dailyStandardDiagnosis,
  diagnoses = [],
  isBusy,
  isGeneralReviewDay,
  onAdd,
  onRegionConsumed,
  onRemove,
  onReview,
  options = [],
  selectedRegion,
}) {
  const [name, setName] = useState("");
  const originalDiagnoses = diagnoses.filter((diagnosis) => diagnosis.source === "original");
  const doctorDiagnoses = diagnoses.filter((diagnosis) => diagnosis.source === "doctor_added");

  const { optionalDiagnoses, requiredDiagnoses } = useMemo(() => {
    if (isGeneralReviewDay) {
      return { requiredDiagnoses: originalDiagnoses, optionalDiagnoses: [] };
    }

    const required = originalDiagnoses.filter((diagnosis) =>
      isDailyDiagnosis(diagnosis, dailyStandardDiagnosis),
    );
    const optional = originalDiagnoses.filter(
      (diagnosis) => !isDailyDiagnosis(diagnosis, dailyStandardDiagnosis),
    );
    return { requiredDiagnoses: required, optionalDiagnoses: optional };
  }, [dailyStandardDiagnosis, isGeneralReviewDay, originalDiagnoses]);

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
      <section className="ai-recommendation-box" aria-label="Recomendacao da IA">
        <Sparkles size={17} aria-hidden="true" />
        <div>
          <strong>Recomendacao da IA</strong>
          <p>
            Apoio visual inicial baseado nos dados extraidos. A decisao final permanece manual.
          </p>
        </div>
      </section>

      <section className="diagnosis-group">
        <div className="diagnosis-group-heading">
          <strong>{isGeneralReviewDay ? "Revalidacao geral" : "Diagnostico obrigatorio"}</strong>
        </div>

        <div className="diagnosis-list">
          {requiredDiagnoses.length ? (
            requiredDiagnoses.map((diagnosis) => (
              <DiagnosisCard
                diagnosis={diagnosis}
                isBusy={isBusy}
                isRequired
                key={diagnosis.id}
                onReview={onReview}
              />
            ))
          ) : (
            <span className="muted-text">Nenhum diagnostico obrigatorio configurado para este ECG.</span>
          )}
        </div>
      </section>

      {optionalDiagnoses.length ? (
        <section className="diagnosis-group">
          <div className="diagnosis-group-heading">
            <strong>Diagnosticos opcionais do ECG</strong>
          </div>
          <div className="diagnosis-list">
            {optionalDiagnoses.map((diagnosis) => (
              <DiagnosisCard
                diagnosis={diagnosis}
                isBusy={isBusy}
                isRequired={false}
                key={diagnosis.id}
                onReview={onReview}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="diagnosis-group">
        <div className="diagnosis-group-heading">
          <strong>Adicionar novo diagnostico</strong>
        </div>

        <div className="diagnosis-form">
          <label className="visually-hidden" htmlFor="new-diagnosis-select">
            Selecionar um diagnostico
          </label>
          <select
            id="new-diagnosis-select"
            value={name}
            onChange={handleSelectDiagnosis}
            disabled={isBusy}
            aria-label="Selecionar um diagnostico"
          >
            <option value="">Selecionar um diagnostico</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {selectedRegion ? (
            <div className="region-ready">
              <MapPinned size={16} aria-hidden="true" />
              Regiao selecionada para o proximo diagnostico
            </div>
          ) : null}
        </div>

        {doctorDiagnoses.length ? (
          <div className="diagnosis-list doctor-diagnosis-list">
            {doctorDiagnoses.map((diagnosis) => (
              <article className="diagnosis-item doctor-diagnosis" key={diagnosis.id}>
                <div className="diagnosis-content">
                  <strong>{diagnosis.name}</strong>
                  <span>Adicionado pelo medico</span>
                  {diagnosis.region_width && diagnosis.region_height ? (
                    <span className="diagnosis-region">
                      <MapPinned size={14} aria-hidden="true" />
                      Regiao vinculada
                    </span>
                  ) : null}
                </div>
                <button
                  className="icon-button danger-icon"
                  type="button"
                  onClick={() => onRemove(diagnosis.id)}
                  disabled={isBusy}
                  aria-label={`Remover ${diagnosis.name}`}
                  title="Remover diagnostico medico"
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
