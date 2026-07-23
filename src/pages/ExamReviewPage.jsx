import { ArrowLeft, HelpCircle, House, LifeBuoy, Moon, Sun, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import DiagnosisPanel from "../components/DiagnosisPanel.jsx";
import EcgViewer from "../components/EcgViewer.jsx";
import EmptyState from "../components/EmptyState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import PatientInfo from "../components/PatientInfo.jsx";
import ReviewActions from "../components/ReviewActions.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SupportContactModal from "../components/SupportContactModal.jsx";
import TutorialModal from "../components/TutorialModal.jsx";
import UnsavedChangesModal from "../components/UnsavedChangesModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import {
  addDiagnosis,
  addDiagnosisRegion,
  getDiagnosisOptions,
  getExamById,
  removeDiagnosis,
  removeDiagnosisRegion,
  saveExamDraft,
  updateExamStatus,
  updateDiagnosisRegion,
  validateExam,
} from "../services/examsService.js";
import { getSupportContact } from "../services/supportService.js";
import {
  getNextValidationExam,
  getValidationContext,
  reviewDailyDiagnosis,
} from "../services/validationService.js";
import { formatDate } from "../utils/dateUtils.js";
import { getDiagnosisRegionVisual, getDiagnosisReviewStatus } from "../utils/diagnosisRegionVisuals.js";
import {
  createDiagnosisReferences,
  getActiveRegionReference,
  getDiagnosisDisplayGroups,
  getDiagnosisReference,
  getRegionReference,
} from "../utils/diagnosisReferences.js";

function getAutomaticReviewResult(exam) {
  const hasDivergence = exam?.diagnoses?.some(
    (diagnosis) =>
      getDiagnosisReviewStatus(diagnosis) === "rejected" || diagnosis.source === "doctor_added",
  );

  return hasDivergence ? "alterado" : "sem_alteracao";
}

function replaceDiagnosis(exam, updatedDiagnosis) {
  return {
    ...exam,
    diagnoses: (exam?.diagnoses || []).map((diagnosis) =>
      diagnosis.id === updatedDiagnosis.id ? updatedDiagnosis : diagnosis,
    ),
  };
}

function regionLabelFor(diagnosis) {
  return diagnosis?.standard_text || diagnosis?.name || "diagnóstico";
}

export default function ExamReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [exam, setExam] = useState(null);
  const [notes, setNotes] = useState("");
  const [activeRegionTarget, setActiveRegionTarget] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [diagnosisOptions, setDiagnosisOptions] = useState([]);
  const [validationContext, setValidationContext] = useState(null);
  const [supportContact, setSupportContact] = useState(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isSecondaryPanelOpen, setIsSecondaryPanelOpen] = useState(true);
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [saveFeedback, setSaveFeedback] = useState("");
  const [hasUnsavedDiagnosisReview, setHasUnsavedDiagnosisReview] = useState(false);
  const [disagreementPreviewIds, setDisagreementPreviewIds] = useState(() => new Set());
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  const loadExam = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [examData, options, contextData] = await Promise.all([
        getExamById(id),
        getDiagnosisOptions(),
        getValidationContext(),
      ]);
      setDiagnosisOptions(options);
      setValidationContext(contextData);
      setNotes(examData.draft_notes || "");
      setSupportContact(contextData.support_contact || null);
      setActiveRegionTarget(null);
      setSelectedRegion(null);
      setIsSecondaryPanelOpen(true);
      setIsNotesOpen(true);
      setHasUnsavedDiagnosisReview(false);
      setDisagreementPreviewIds(new Set());
      setIsExitConfirmOpen(false);
      setSaveFeedback("");
      if (examData.status_validation === "nao_validado") {
        const updatedExam = await updateExamStatus(id, "em_validacao");
        setExam(updatedExam);
      } else {
        setExam(examData);
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          "Não foi possível carregar o exame selecionado.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  const handleDisagreementPreviewChange = useCallback((diagnosisId, isOpen) => {
    const key = String(diagnosisId);

    setDisagreementPreviewIds((current) => {
      if (current.has(key) === isOpen) return current;

      const next = new Set(current);
      if (isOpen) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  async function runAction(action) {
    setIsBusy(true);
    setError("");
    setSaveFeedback("");
    try {
      const updatedExam = await action();
      if (updatedExam) {
        setExam(updatedExam);
      }
      return true;
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "Não foi possível concluir a ação.");
      return false;
    } finally {
      setIsBusy(false);
    }
  }

  async function openSupport() {
    if (!supportContact) {
      try {
        setSupportContact(await getSupportContact());
      } catch {
        setSupportContact(null);
      }
    }
    setIsSupportOpen(true);
  }

  async function handleAddDiagnosis(payload) {
    let addedDiagnosis = null;
    const wasAdded = await runAction(async () => {
      addedDiagnosis = await addDiagnosis(id, payload);
      return {
        ...exam,
        diagnoses: [...(exam?.diagnoses || []), addedDiagnosis],
      };
    });

    if (wasAdded && addedDiagnosis?.region_required_missing) {
      handleStartRegion(addedDiagnosis);
    }

    return wasAdded;
  }

  async function handleRemoveDiagnosis(diagnosisId) {
    await runAction(async () => {
      await removeDiagnosis(id, diagnosisId);
      return {
        ...exam,
        diagnoses: exam.diagnoses.filter((diagnosis) => diagnosis.id !== diagnosisId),
      };
    });
  }

  function handleStartRegion(diagnosis, region = null) {
    setError("");
    setActiveRegionTarget({
      diagnosisId: diagnosis.id,
      regionId: region?.id || null,
      label: regionLabelFor(diagnosis),
      region,
    });
    setSelectedRegion(region || null);
  }

  function handleCancelRegionSelection() {
    setActiveRegionTarget(null);
    setSelectedRegion(null);
  }

  async function handleRegionChange(region) {
    if (!region) {
      setSelectedRegion(null);
      return;
    }

    if (!activeRegionTarget) {
      setSelectedRegion(region);
      setIsSecondaryPanelOpen(true);
      return;
    }

    const target = activeRegionTarget;
    const wasSaved = await runAction(
      async () => {
        const updatedDiagnosis = target.regionId
          ? await updateDiagnosisRegion(target.diagnosisId, target.regionId, region)
          : await addDiagnosisRegion(target.diagnosisId, region);
        return replaceDiagnosis(exam, updatedDiagnosis);
      }
    );

    if (wasSaved) {
      setActiveRegionTarget(null);
      setSelectedRegion(null);
    }
  }

  async function handleRemoveRegion(diagnosisId, regionId) {
    if (!regionId) return;

    await runAction(
      async () => {
        const updatedDiagnosis = await removeDiagnosisRegion(diagnosisId, regionId);
        return replaceDiagnosis(exam, updatedDiagnosis);
      },
      "Área removida.",
    );
  }

  async function handleReviewDiagnosis(diagnosisId, reviewStatus, reviewNotes = "") {
    const diagnosis = exam?.diagnoses?.find((item) => item.id === diagnosisId);
    if (reviewStatus === "confirmed" && diagnosis?.region_required_missing) {
      setError("Marque ao menos uma área do ECG antes de confirmar este diagnóstico.");
      handleStartRegion(diagnosis);
      return false;
    }

    return runAction(
      () => reviewDailyDiagnosis(diagnosisId, reviewStatus, reviewNotes),
    );
  }

  function pendingSaveError() {
    if (selectedRegion && !activeRegionTarget) {
      return "Associe a área marcada a um diagnóstico antes de salvar.";
    }
    if (hasUnsavedDiagnosisReview) {
      return "Salve ou cancele a observação da discordância antes de continuar.";
    }
    return null;
  }

  async function saveCurrentDraft() {
    const pendingError = pendingSaveError();
    if (pendingError) {
      setError(pendingError);
      return false;
    }

    return runAction(() => saveExamDraft(id, { notes }));
  }

  async function handleSave() {
    const wasSaved = await saveCurrentDraft();
    if (wasSaved) {
      setSaveFeedback("Alterações salvas.");
    }
  }

  function handleReturnHome() {
    if (hasUnsavedChanges) {
      setIsExitConfirmOpen(true);
      return;
    }
    navigate("/");
  }

  function handleDiscardAndBack() {
    setIsExitConfirmOpen(false);
    navigate("/");
  }

  async function validateCurrentExam() {
    const pendingError = pendingSaveError();
    if (pendingError) {
      setError(pendingError);
      return false;
    }

    const reviewResult = getAutomaticReviewResult(exam);
    return runAction(
      () =>
        validateExam(id, {
          review_result: reviewResult,
          notes,
        }),
    );
  }

  async function goToNextDailyExam() {
    return runAction(async () => {
      const nextData = await getNextValidationExam();
      if (nextData.exam && String(nextData.exam.id) !== String(id)) {
        navigate(`/exams/${nextData.exam.id}`);
        return null;
      }
      navigate("/");
      return null;
    });
  }

  async function handlePrimaryAction() {
    if (validationContext?.is_configured && !validationContext.is_general_review_day) {
      const wasSaved = await saveCurrentDraft();
      if (!wasSaved) return;
      if (!requiredDecisionComplete) {
        setError("Conclua o diagnóstico do dia antes de avançar.");
        return;
      }
      await goToNextDailyExam();
      return;
    }

    const wasValidated = await validateCurrentExam();
    if (wasValidated && validationContext?.is_general_review_day) {
      await goToNextDailyExam();
    }
  }

  const diagnosisGroups = useMemo(
    () =>
      getDiagnosisDisplayGroups(exam?.diagnoses || [], {
        dailyStandardDiagnosis: validationContext?.active_standard_diagnosis,
        isGeneralReviewDay: validationContext?.is_general_review_day,
      }),
    [
      exam?.diagnoses,
      validationContext?.active_standard_diagnosis,
      validationContext?.is_general_review_day,
    ],
  );
  const diagnosisReferences = useMemo(
    () => createDiagnosisReferences(diagnosisGroups.displayOrder),
    [diagnosisGroups],
  );
  const requiredDiagnoses = diagnosisGroups.requiredDiagnoses;
  const viewerRegions = useMemo(
    () =>
      diagnosisGroups.displayOrder.flatMap((diagnosis) => {
        const diagnosisReference = getDiagnosisReference(diagnosisReferences, diagnosis.id);

        return (diagnosis.regions || []).map((region, index) => {
          const regionReference = getRegionReference(diagnosisReference, index);
          const diagnosisLabel = regionLabelFor(diagnosis);

          return {
            ...region,
            ...getDiagnosisRegionVisual(
              diagnosis,
              disagreementPreviewIds.has(String(diagnosis.id)) ? "rejected" : null,
            ),
            diagnosisId: diagnosis.id,
            diagnosisReference,
            isActive: activeRegionTarget?.diagnosisId === diagnosis.id,
            label: regionReference ? `${regionReference} · ${diagnosisLabel}` : diagnosisLabel,
            regionReference,
          };
        });
      }),
    [
      activeRegionTarget?.diagnosisId,
      diagnosisGroups,
      diagnosisReferences,
      disagreementPreviewIds,
    ],
  );
  const activeRegionDiagnosis = useMemo(
    () =>
      (exam?.diagnoses || []).find(
        (diagnosis) => String(diagnosis.id) === String(activeRegionTarget?.diagnosisId),
      ) || null,
    [activeRegionTarget?.diagnosisId, exam],
  );
  const activeRegionVisual = activeRegionDiagnosis
    ? getDiagnosisRegionVisual(
        activeRegionDiagnosis,
        disagreementPreviewIds.has(String(activeRegionDiagnosis.id)) ? "rejected" : null,
      )
    : null;
  const activeRegionReference = useMemo(() => {
    if (!activeRegionTarget || !activeRegionDiagnosis) return null;

    const diagnosisReference = getDiagnosisReference(diagnosisReferences, activeRegionDiagnosis.id);
    return getActiveRegionReference(
      diagnosisReference,
      activeRegionDiagnosis.regions || [],
      activeRegionTarget,
    );
  }, [activeRegionDiagnosis, activeRegionTarget, diagnosisReferences]);
  const activeSelectionLabel = activeRegionTarget
    ? `Marcando ${activeRegionReference || "área"}: ${activeRegionTarget.label}`
    : "";
  const requiredDecisionComplete =
    !validationContext?.is_configured ||
    requiredDiagnoses.some(
      (diagnosis) =>
        getDiagnosisReviewStatus(diagnosis) !== "pending" && !diagnosis.region_required_missing,
    );
  const hasUnassignedRegion = Boolean(selectedRegion && !activeRegionTarget);
  const hasUnsavedChanges =
    notes !== (exam?.draft_notes || "") || hasUnassignedRegion || hasUnsavedDiagnosisReview;
  const doctorName = user?.full_name || "Usuário";
  const dailyLabel = validationContext?.is_general_review_day
    ? "Dia 30 - revalidação geral"
    : validationContext?.active_standard_diagnosis || "Agenda não configurada";
  const usesDailyFlow = Boolean(validationContext?.is_configured && !validationContext.is_general_review_day);

  if (isLoading) {
    return <LoadingState message="Abrindo exame..." />;
  }

  if (error && !exam) {
    return (
      <div className="page-shell narrow-shell">
        <EmptyState title="Exame indisponível" message={error} />
        <button className="button secondary" type="button" onClick={() => navigate("/")}>
          <ArrowLeft size={17} aria-hidden="true" />
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="review-page">
      <header className="review-topbar">
        <div className="review-title-block">
          <span className="eyebrow">Validação médica</span>
          <h1>Exame {exam.exam_code}</h1>
        </div>
        <dl className="review-context-strip">
          <div>
            <dt>Diagnóstico do dia</dt>
            <dd>{dailyLabel}</dd>
          </div>
          <div>
            <dt>Data e hora</dt>
            <dd>
              {formatDate(exam.exam_date)}
              {exam.exam_time ? ` as ${exam.exam_time}` : ""}
            </dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>{exam.exam_type}</dd>
          </div>
          {exam.patient?.age ? (
            <div>
              <dt>Idade</dt>
              <dd>{exam.patient.age} anos</dd>
            </div>
          ) : null}
          {exam.patient?.sex ? (
            <div>
              <dt>Sexo</dt>
              <dd>{exam.patient.sex}</dd>
            </div>
          ) : null}
        </dl>
        <div className="review-topbar-meta">
          <div className="review-utility-tools" role="group" aria-label="Ações globais">
            <button
              className="icon-button compact-icon-button"
              type="button"
              onClick={handleReturnHome}
              disabled={isBusy}
              aria-label="Ir para o início"
              title="Início"
            >
              <House size={17} aria-hidden="true" />
            </button>
            <button
              className="icon-button compact-icon-button"
              type="button"
              onClick={() => setIsTutorialOpen(true)}
              aria-label="Tutorial"
              title="Tutorial"
            >
              <HelpCircle size={17} aria-hidden="true" />
            </button>
            <button
              className="icon-button compact-icon-button"
              type="button"
              onClick={openSupport}
              aria-label="Contato"
              title="Contato"
            >
              <LifeBuoy size={17} aria-hidden="true" />
            </button>
            <button
              className="icon-button compact-icon-button"
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
              title={isDark ? "Modo claro" : "Modo escuro"}
            >
              {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
            </button>
          </div>
          <div
            className="review-session-chip"
            aria-label={`Sessão ativa: ${doctorName}`}
            title={`Sessão ativa: ${doctorName}`}
          >
            <UserRound size={15} aria-hidden="true" />
            <span>{doctorName}</span>
          </div>
        </div>
      </header>

      <main className="review-layout">
        <aside className="review-sidebar">
          <div className="review-sidebar-scroll">
            {error ? <div className="feedback error-feedback">{error}</div> : null}
            {saveFeedback ? (
              <div className="feedback success-feedback" role="status">
                {saveFeedback}
              </div>
            ) : null}

            <section className="sidebar-section review-decision-section">
              <DiagnosisPanel
                activeRegionTarget={activeRegionTarget}
                dailyStandardDiagnosis={validationContext?.active_standard_diagnosis}
                diagnoses={exam.diagnoses}
                diagnosisReferences={diagnosisReferences}
                options={diagnosisOptions}
                onAdd={handleAddDiagnosis}
                onEditRegion={handleStartRegion}
                onRemove={handleRemoveDiagnosis}
                onRemoveRegion={handleRemoveRegion}
                onReview={handleReviewDiagnosis}
                onDisagreementPreviewChange={handleDisagreementPreviewChange}
                onUnsavedChange={setHasUnsavedDiagnosisReview}
                onStartRegion={handleStartRegion}
                isBusy={isBusy}
                isGeneralReviewDay={validationContext?.is_general_review_day}
                isSecondaryOpen={isSecondaryPanelOpen}
                onSecondaryToggle={setIsSecondaryPanelOpen}
                selectedRegion={selectedRegion}
                onRegionConsumed={() => setSelectedRegion(null)}
              />
            </section>

            <details className="review-details">
              <summary>Dados clínicos completos</summary>
              <PatientInfo patient={exam.patient} />
            </details>

            {exam.comments || exam.source_notes ? (
              <details className="review-details">
                <summary>Informações do laudo original</summary>
                {exam.comments ? (
                  <div className="source-text-block">
                    <strong>Comentários</strong>
                    <p>{exam.comments}</p>
                  </div>
                ) : null}
                {exam.source_notes ? (
                  <div className="source-text-block">
                    <strong>Notas</strong>
                    <p>{exam.source_notes}</p>
                  </div>
                ) : null}
              </details>
            ) : null}

            <details
              className="review-details review-notes-details"
              open={isNotesOpen}
              onToggle={(event) => setIsNotesOpen(event.currentTarget.open)}
            >
              <summary>Observações gerais</summary>
              <textarea
                className="notes-field"
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setSaveFeedback("");
                }}
                placeholder="Registre comentários gerais sobre o exame"
                rows={2}
              />
            </details>
          </div>

          <div className="review-sidebar-actions">
            <section className="sidebar-section review-status-section" aria-label="Status atual">
              <StatusBadge
                status={exam.status_validation}
                queueState={exam.queue_state}
                reviewResult={exam.review_result}
              />
            </section>

          <ReviewActions
            onBack={handleReturnHome}
            onSave={usesDailyFlow ? handleSave : undefined}
              onValidate={handlePrimaryAction}
              canValidate={requiredDecisionComplete}
              isBusy={isBusy}
              isValid={!validationContext?.is_configured && exam.status_validation === "valido"}
              primaryLabel={usesDailyFlow ? "Salvar e próximo" : "Validar exame"}
            />
          </div>
        </aside>

        <section className="review-viewer" aria-label="Visualizador de ECG">
          <EcgViewer
            imageUrl={exam.image_endpoint || exam.image_url}
            onRegionCancel={handleCancelRegionSelection}
            selectedRegion={selectedRegion}
            onRegionChange={handleRegionChange}
            regions={viewerRegions}
            selectionLabel={activeSelectionLabel}
            selectionReference={activeRegionReference}
            selectionVisual={activeRegionVisual}
          />
        </section>
      </main>

      <SupportContactModal
        contact={supportContact}
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
      <UnsavedChangesModal
        isOpen={isExitConfirmOpen}
        onDiscard={handleDiscardAndBack}
        onStay={() => setIsExitConfirmOpen(false)}
      />
    </div>
  );
}
