import { Check, MapPinned, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getDiagnosisRegionVisual, getDiagnosisReviewStatus } from "../utils/diagnosisRegionVisuals.js";
import { hasDisagreementNote } from "../utils/disagreementReview.js";
import {
  getDiagnosisDisplayGroups,
  getDiagnosisReference,
  getOriginalTextPreview,
  getRegionReference,
} from "../utils/diagnosisReferences.js";

const REVIEW_LABELS = {
  pending: "Aguardando decisão",
  confirmed: "Concordo",
  rejected: "Discordo",
};

function regionCountLabel(count) {
  if (count === 1) return "1 área";
  return `${count} áreas`;
}

function DiagnosisCard({
  activeRegionTarget,
  diagnosis,
  diagnosisReference,
  isBusy,
  isRequired,
  onEditRegion,
  onRemove,
  onRemoveRegion,
  onReview,
  onReviewDraftChange,
  onStartRegion,
}) {
  const status = getDiagnosisReviewStatus(diagnosis);
  const regionVisual = getDiagnosisRegionVisual(diagnosis);
  const standardText = diagnosis.standard_text || diagnosis.name;
  const originalText = diagnosis.original_text || diagnosis.name;
  const regions = diagnosis.regions || [];
  const isRegionTarget = activeRegionTarget?.diagnosisId === diagnosis.id;
  const originalPreview = getOriginalTextPreview(originalText);
  const shouldShowOriginal = diagnosis.source === "original" && Boolean(originalText);
  const [isDisagreementOpen, setIsDisagreementOpen] = useState(false);
  const [reviewNoteDraft, setReviewNoteDraft] = useState(diagnosis.review_notes || "");
  const canSaveDisagreement = hasDisagreementNote(reviewNoteDraft);
  const kickerLabel = isRequired ? "Diagnóstico do dia" : diagnosis.source === "doctor_added" ? "Adicionado" : "";
  const hasChipRow = Boolean(kickerLabel || diagnosis.is_grouped || diagnosis.region_required_missing);

  useEffect(() => {
    setReviewNoteDraft(diagnosis.review_notes || "");
  }, [diagnosis.review_notes]);

  useEffect(() => {
    const hasUnsavedNote = isDisagreementOpen && reviewNoteDraft !== (diagnosis.review_notes || "");
    onReviewDraftChange?.(diagnosis.id, hasUnsavedNote);
    return () => onReviewDraftChange?.(diagnosis.id, false);
  }, [diagnosis.id, diagnosis.review_notes, isDisagreementOpen, onReviewDraftChange, reviewNoteDraft]);

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
      style={{ "--diagnosis-region-color": regionVisual.color }}
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
        <div className="diagnosis-title-row">
          <span
            aria-hidden="true"
            className="diagnosis-region-marker"
          />
          {diagnosisReference ? (
            <span className="diagnosis-reference-chip">{diagnosisReference}</span>
          ) : null}
          <strong className="diagnosis-title" title={`Texto padrão: ${standardText}`}>
            {standardText}
          </strong>
        </div>
        {shouldShowOriginal ? (
          <p className="diagnosis-original-text">
            <span
              aria-label={`Texto original completo: ${originalText}`}
              className="diagnosis-original-preview"
              tabIndex={0}
              title={`Texto original: ${originalText}`}
            >
              Original: {originalPreview}
            </span>
            <span aria-hidden="true" className="diagnosis-original-tooltip">
              {originalText}
            </span>
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
            {regions.map((region, index) => {
              const regionReference = getRegionReference(diagnosisReference, index);
              const areaLabel = `Área ${index + 1}`;

              return (
                <div className="diagnosis-region-row" key={region.id || `legacy-${index}`}>
                  <span className="diagnosis-region-reference">
                    {regionReference ? (
                      <strong className="diagnosis-region-code">{regionReference}</strong>
                    ) : null}
                    <span>{areaLabel}</span>
                  </span>
                  <div className="region-row-actions">
                    <button
                      className="icon-button mini-icon-button"
                      type="button"
                      onClick={() => onEditRegion(diagnosis, region)}
                      disabled={isBusy}
                      aria-label={`Editar ${regionReference || areaLabel}`}
                      title={`Editar ${regionReference || areaLabel}`}
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    <button
                      className="icon-button mini-icon-button danger-icon"
                      type="button"
                      onClick={() => onRemoveRegion(diagnosis.id, region.id)}
                      disabled={isBusy || !region.id}
                      aria-label={`Remover ${regionReference || areaLabel}`}
                      title={region.id ? `Remover ${regionReference || areaLabel}` : "Área legada sem id"}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
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
          <div className="diagnosis-disagreement-header">
            <label htmlFor={`disagreement-note-${diagnosis.id}`}>
              Observação da discordância <span>(opcional)</span>
            </label>
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
          <textarea
            id={`disagreement-note-${diagnosis.id}`}
            value={reviewNoteDraft}
            onChange={(event) => setReviewNoteDraft(event.target.value)}
            placeholder="Registre o motivo da discordância, se necessário"
            rows={3}
          />
          <div className="disagreement-actions">
            <button
              className="button compact-button disagreement-save-button"
              type="button"
              onClick={() => submitDisagreement(reviewNoteDraft)}
              disabled={isBusy || !canSaveDisagreement}
            >
              Salvar discordância
            </button>
            <div className="disagreement-separator" aria-hidden="true">
              <span>ou</span>
            </div>
            <button
              className="button ghost compact-button disagreement-no-note-button"
              type="button"
              onClick={() => submitDisagreement("")}
              disabled={isBusy}
            >
              Discordar sem observação
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
  diagnosisReferences = {},
  isBusy,
  isGeneralReviewDay,
  isSecondaryOpen,
  onAdd,
  onEditRegion,
  onRegionConsumed,
  onRemove,
  onRemoveRegion,
  onReview,
  onUnsavedChange,
  onSecondaryToggle,
  onStartRegion,
  options = [],
  selectedRegion,
}) {
  const [name, setName] = useState("");
  const [unsavedReviewNotes, setUnsavedReviewNotes] = useState({});
  const aiRecommendationText = typeof aiRecommendation === "string" ? aiRecommendation.trim() : "";

  useEffect(() => {
    onUnsavedChange?.(Object.values(unsavedReviewNotes).some(Boolean));
  }, [onUnsavedChange, unsavedReviewNotes]);

  const handleReviewDraftChange = useCallback((diagnosisId, isDirty) => {
    setUnsavedReviewNotes((current) => {
      if (current[diagnosisId] === isDirty) return current;
      return { ...current, [diagnosisId]: isDirty };
    });
  }, []);

  const { doctorDiagnoses, optionalDiagnoses, requiredDiagnoses } = useMemo(
    () =>
      getDiagnosisDisplayGroups(diagnoses, {
        dailyStandardDiagnosis,
        isGeneralReviewDay,
      }),
    [dailyStandardDiagnosis, diagnoses, isGeneralReviewDay],
  );

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
  const secondaryTitle = "Opcionais e adicionar";
  const secondarySummary = `${optionalDiagnoses.length} no ECG | ${doctorDiagnoses.length} adicionados`;

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
                diagnosisReference={getDiagnosisReference(diagnosisReferences, diagnosis.id)}
                activeRegionTarget={activeRegionTarget}
                isBusy={isBusy}
                isRequired
                key={diagnosis.id}
                onEditRegion={onEditRegion}
                onRemove={onRemove}
                onRemoveRegion={onRemoveRegion}
                onReview={onReview}
                onReviewDraftChange={handleReviewDraftChange}
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

          <div className="diagnosis-secondary-content">
            {optionalDiagnoses.length ? (
              <div className="diagnosis-list">
                {optionalDiagnoses.map((diagnosis) => (
                  <DiagnosisCard
                    diagnosis={diagnosis}
                    diagnosisReference={getDiagnosisReference(diagnosisReferences, diagnosis.id)}
                    activeRegionTarget={activeRegionTarget}
                    isBusy={isBusy}
                    isRequired={false}
                    key={diagnosis.id}
                    onEditRegion={onEditRegion}
                    onRemove={onRemove}
                    onRemoveRegion={onRemoveRegion}
                    onReview={onReview}
                    onReviewDraftChange={handleReviewDraftChange}
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
                    diagnosisReference={getDiagnosisReference(diagnosisReferences, diagnosis.id)}
                    isBusy={isBusy}
                    isRequired={false}
                    key={diagnosis.id}
                    onEditRegion={onEditRegion}
                    onRemove={onRemove}
                    onRemoveRegion={onRemoveRegion}
                    onReview={onReview}
                    onReviewDraftChange={handleReviewDraftChange}
                    onStartRegion={onStartRegion}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
