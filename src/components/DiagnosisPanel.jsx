import { Check, MapPinned, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const REVIEW_LABELS = {
  pending: "Aguardando decisão",
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

function regionCountLabel(count) {
  if (count === 1) return "1 área";
  return `${count} áreas`;
}

function sameDiagnosisText(left, right) {
  return normalize(left) === normalize(right);
}

function DiagnosisCard({
  activeRegionTarget,
  diagnosis,
  isBusy,
  isRequired,
  onEditRegion,
  onRemove,
  onRemoveRegion,
  onReview,
  onStartRegion,
}) {
  const status = statusOf(diagnosis);
  const standardText = diagnosis.standard_text || diagnosis.name;
  const originalText = diagnosis.original_text || diagnosis.name;
  const regions = diagnosis.regions || [];
  const isRegionTarget = activeRegionTarget?.diagnosisId === diagnosis.id;
  const hasDistinctOriginal = Boolean(originalText && !sameDiagnosisText(standardText, originalText));
  const [isDisagreementOpen, setIsDisagreementOpen] = useState(false);
  const [reviewNoteDraft, setReviewNoteDraft] = useState(diagnosis.review_notes || "");
  const kickerLabel = isRequired ? "Diagnóstico do dia" : diagnosis.source === "doctor_added" ? "Adicionado" : "";
  const hasChipRow = Boolean(kickerLabel || diagnosis.is_grouped || diagnosis.region_required_missing);

  useEffect(() => {
    setReviewNoteDraft(diagnosis.review_notes || "");
  }, [diagnosis.review_notes]);

  function openDisagreementPanel() {
    setReviewNoteDraft(diagnosis.review_notes || "");
    setIsDisagreementOpen(true);
  }

  async function submitDisagreement(note) {
    const wasReviewed = await onReview(diagnosis.id, "rejected", note);
    if (wasReviewed) {
      setIsDisagreementOpen(false);
    }
  }

  async function submitAgreement() {
    const wasReviewed = await onReview(diagnosis.id, "confirmed");
    if (wasReviewed) {
      setIsDisagreementOpen(false);
    }
  }

  return (
    <article
      className={`diagnosis-item original-diagnosis ${status} ${
        isRequired ? "required-diagnosis" : "optional-diagnosis"
      }`}
    >
      <div className="diagnosis-content">
        {hasChipRow ? (
          <div className="diagnosis-chip-row">
            {kickerLabel ? <span className="diagnosis-kicker">{kickerLabel}</span> : null}
            {diagnosis.is_grouped ? <span className="grouped-diagnosis-chip">Agrupado</span> : null}
            {diagnosis.region_required_missing ? (
              <span className="region-required-chip">Área obrigatória</span>
            ) : null}
          </div>
        ) : null}
        <strong className="diagnosis-title" title={`Texto padrão: ${standardText}`}>
          {standardText}
        </strong>
        {hasDistinctOriginal ? (
          <p className="diagnosis-original-text" title={`Texto original: ${originalText}`}>
            Original: {originalText}
          </p>
        ) : null}
        <span className="diagnosis-review-label">{REVIEW_LABELS[status] || REVIEW_LABELS.pending}</span>
        {status === "rejected" && diagnosis.review_notes ? (
          <div className="diagnosis-note-preview">
            <strong>Observação</strong>
            <p>{diagnosis.review_notes}</p>
            <button
              className="button text-button"
              type="button"
              onClick={openDisagreementPanel}
              disabled={isBusy}
            >
              Editar observação
            </button>
          </div>
        ) : null}
        {status === "rejected" && !diagnosis.review_notes && diagnosis.source !== "doctor_added" ? (
          <button
            className="button text-button add-note-button"
            type="button"
            onClick={openDisagreementPanel}
            disabled={isBusy}
          >
            Adicionar observação
          </button>
        ) : null}
        {regions.length ? (
          <span className="diagnosis-region" title="Região ECG vinculada">
            <MapPinned size={14} aria-hidden="true" />
            {regionCountLabel(regions.length)}
          </span>
        ) : null}
        {regions.length ? (
          <div className="diagnosis-region-list">
            {regions.map((region, index) => (
              <div className="diagnosis-region-row" key={region.id || `legacy-${index}`}>
                <span>Área {index + 1}</span>
                <div className="region-row-actions">
                  <button
                    className="icon-button mini-icon-button"
                    type="button"
                    onClick={() => onEditRegion(diagnosis, region)}
                    disabled={isBusy}
                    aria-label={`Editar área ${index + 1}`}
                    title="Editar área"
                  >
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                  <button
                    className="icon-button mini-icon-button danger-icon"
                    type="button"
                    onClick={() => onRemoveRegion(diagnosis.id, region.id)}
                    disabled={isBusy || !region.id}
                    aria-label={`Remover área ${index + 1}`}
                    title={region.id ? "Remover área" : "Área legada sem id"}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="diagnosis-review-actions">
        <button
          className={`button compact-button region-link-button ${isRegionTarget ? "is-active" : ""}`}
          type="button"
          onClick={() => onStartRegion(diagnosis)}
          disabled={isBusy}
          aria-pressed={isRegionTarget}
          aria-label="Marcar área do ECG"
          title="Marcar área"
        >
          <MapPinned size={20} aria-hidden="true" />
        </button>
        <button
          className={`button compact-button review-toggle agree ${
            status === "confirmed" ? "is-active" : "is-muted"
          }`}
          type="button"
          onClick={submitAgreement}
          disabled={isBusy || diagnosis.source === "doctor_added"}
          aria-pressed={status === "confirmed"}
          aria-label="Concordar com diagnóstico"
          title="Concordar"
        >
          <Check size={21} aria-hidden="true" />
        </button>
        <button
          className={`button compact-button review-toggle disagree ${
            status === "rejected" ? "is-active" : "is-muted"
          }`}
          type="button"
          onClick={openDisagreementPanel}
          disabled={isBusy || diagnosis.source === "doctor_added"}
          aria-pressed={status === "rejected"}
          aria-label="Discordar do diagnóstico"
          title="Discordar"
        >
          <X size={21} aria-hidden="true" />
        </button>
        {diagnosis.source === "doctor_added" ? (
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
        ) : null}
      </div>
      {isDisagreementOpen ? (
        <div className="diagnosis-disagreement-panel">
          <label htmlFor={`disagreement-note-${diagnosis.id}`}>Observação da discordância</label>
          <textarea
            id={`disagreement-note-${diagnosis.id}`}
            value={reviewNoteDraft}
            onChange={(event) => setReviewNoteDraft(event.target.value)}
            placeholder="Registre o motivo da discordância, se necessário"
            rows={3}
          />
          <div className="disagreement-actions">
            <button
              className="button compact-button"
              type="button"
              onClick={() => submitDisagreement(reviewNoteDraft)}
              disabled={isBusy}
            >
              Salvar discordância
            </button>
            <button
              className="button ghost compact-button"
              type="button"
              onClick={() => submitDisagreement("")}
              disabled={isBusy}
            >
              Discordar sem observação
            </button>
            <button
              className="icon-button compact-icon-button"
              type="button"
              onClick={() => setIsDisagreementOpen(false)}
              disabled={isBusy}
              aria-label="Cancelar observação"
              title="Cancelar"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function DiagnosisPanel({
  activeRegionTarget,
  aiRecommendation,
  dailyStandardDiagnosis,
  diagnoses = [],
  isBusy,
  isGeneralReviewDay,
  isSecondaryOpen,
  onAdd,
  onEditRegion,
  onRegionConsumed,
  onRemove,
  onRemoveRegion,
  onReview,
  onSecondaryToggle,
  onStartRegion,
  options = [],
  selectedRegion,
}) {
  const [name, setName] = useState("");
  const aiRecommendationText = typeof aiRecommendation === "string" ? aiRecommendation.trim() : "";

  const { doctorDiagnoses, optionalDiagnoses, requiredDiagnoses } = useMemo(() => {
    const originalDiagnoses = diagnoses.filter((diagnosis) => diagnosis.source === "original");
    const addedDiagnoses = diagnoses.filter((diagnosis) => diagnosis.source === "doctor_added");

    if (isGeneralReviewDay) {
      return {
        doctorDiagnoses: addedDiagnoses,
        requiredDiagnoses: originalDiagnoses,
        optionalDiagnoses: [],
      };
    }

    const required = originalDiagnoses.filter((diagnosis) =>
      isDailyDiagnosis(diagnosis, dailyStandardDiagnosis),
    );
    const optional = originalDiagnoses.filter(
      (diagnosis) => !isDailyDiagnosis(diagnosis, dailyStandardDiagnosis),
    );
    return {
      doctorDiagnoses: addedDiagnoses,
      requiredDiagnoses: required,
      optionalDiagnoses: optional,
    };
  }, [dailyStandardDiagnosis, diagnoses, isGeneralReviewDay]);

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

  const hasSecondaryContent =
    optionalDiagnoses.length > 0 || doctorDiagnoses.length > 0 || options.length > 0 || selectedRegion;
  const hasOptionalOrAddedDiagnoses = optionalDiagnoses.length > 0 || doctorDiagnoses.length > 0;
  const secondaryTitle = hasOptionalOrAddedDiagnoses ? "Opcionais" : "Adicionar diagnóstico";
  const secondarySummary = hasOptionalOrAddedDiagnoses
    ? `${optionalDiagnoses.length} ECG / ${doctorDiagnoses.length} adicionados`
    : "Novo diagnóstico";

  return (
    <div className="diagnosis-panel">
      {aiRecommendationText ? (
        <section className="ai-recommendation-box" aria-label="Recomendação da IA">
          <Sparkles size={17} aria-hidden="true" />
          <div>
            <strong>Recomendação da IA</strong>
            <p>{aiRecommendationText}</p>
          </div>
        </section>
      ) : null}

      <section className="diagnosis-group">
        <div className="diagnosis-group-heading">
          <strong>{isGeneralReviewDay ? "Revalidação geral" : "Diagnóstico do dia"}</strong>
        </div>

        <div className="diagnosis-list">
          {requiredDiagnoses.length ? (
            requiredDiagnoses.map((diagnosis) => (
              <DiagnosisCard
                diagnosis={diagnosis}
                activeRegionTarget={activeRegionTarget}
                isBusy={isBusy}
                isRequired
                key={diagnosis.id}
                onEditRegion={onEditRegion}
                onRemove={onRemove}
                onRemoveRegion={onRemoveRegion}
                onReview={onReview}
                onStartRegion={onStartRegion}
              />
            ))
          ) : (
            <span className="muted-text">Nenhum diagnóstico do dia configurado para este ECG.</span>
          )}
        </div>
      </section>

      {hasSecondaryContent ? (
        <details
          className="diagnosis-group diagnosis-secondary-panel"
          open={Boolean(isSecondaryOpen)}
          onToggle={(event) => onSecondaryToggle?.(event.currentTarget.open)}
        >
          <summary className="diagnosis-secondary-summary">
            <strong>{secondaryTitle}</strong>
            <span>{secondarySummary}</span>
          </summary>

          {optionalDiagnoses.length ? (
            <div className="diagnosis-list">
              {optionalDiagnoses.map((diagnosis) => (
                <DiagnosisCard
                  diagnosis={diagnosis}
                  activeRegionTarget={activeRegionTarget}
                  isBusy={isBusy}
                  isRequired={false}
                  key={diagnosis.id}
                  onEditRegion={onEditRegion}
                  onRemove={onRemove}
                  onRemoveRegion={onRemoveRegion}
                  onReview={onReview}
                  onStartRegion={onStartRegion}
                />
              ))}
            </div>
          ) : null}

          <div className="diagnosis-form compact-diagnosis-form">
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
              <option value="">Adicionar diagnóstico</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {selectedRegion ? (
              <div className="region-ready">
                <MapPinned size={16} aria-hidden="true" />
                Região selecionada
              </div>
            ) : null}
          </div>

          {doctorDiagnoses.length ? (
            <div className="diagnosis-list doctor-diagnosis-list">
              {doctorDiagnoses.map((diagnosis) => (
                <DiagnosisCard
                  activeRegionTarget={activeRegionTarget}
                  diagnosis={diagnosis}
                  isBusy={isBusy}
                  isRequired={false}
                  key={diagnosis.id}
                  onEditRegion={onEditRegion}
                  onRemove={onRemove}
                  onRemoveRegion={onRemoveRegion}
                  onReview={onReview}
                  onStartRegion={onStartRegion}
                />
              ))}
            </div>
          ) : null}
        </details>
      ) : null}
    </div>
  );
}
