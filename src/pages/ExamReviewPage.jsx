import { ArrowLeft, HelpCircle, LifeBuoy, Moon, Sun, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import DiagnosisPanel from "../components/DiagnosisPanel.jsx";
import EcgViewer from "../components/EcgViewer.jsx";
import EmptyState from "../components/EmptyState.jsx";
import FloatingSupportButton from "../components/FloatingSupportButton.jsx";
import LoadingState from "../components/LoadingState.jsx";
import PatientInfo from "../components/PatientInfo.jsx";
import ReviewActions from "../components/ReviewActions.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SupportContactModal from "../components/SupportContactModal.jsx";
import TutorialModal from "../components/TutorialModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import {
  addDiagnosis,
  addDiagnosisRegion,
  getDiagnosisOptions,
  getExamById,
  removeDiagnosis,
  removeDiagnosisRegion,
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

function getDiagnosisStatus(diagnosis) {
  return diagnosis.validation_status || diagnosis.review_status || "pending";
}

function getAutomaticReviewResult(exam) {
  const hasDivergence = exam?.diagnoses?.some(
    (diagnosis) =>
      getDiagnosisStatus(diagnosis) === "rejected" || diagnosis.source === "doctor_added",
  );

  return hasDivergence ? "alterado" : "sem_alteracao";
}

function normalize(value = "") {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase();
}

function requiredDiagnosesFor(exam, context) {
  const originalDiagnoses = exam?.diagnoses?.filter((diagnosis) => diagnosis.source === "original") || [];
  if (!context?.is_configured) return [];
  if (context.is_general_review_day) return originalDiagnoses;

  return originalDiagnoses.filter((diagnosis) => {
    if (diagnosis.daily_required) return true;
    return normalize(diagnosis.standard_text || diagnosis.name) === normalize(context.active_standard_diagnosis);
  });
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
  return diagnosis?.standard_text || diagnosis?.name || "diagnostico";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      setSupportContact(contextData.support_contact || null);
      setActiveRegionTarget(null);
      setSelectedRegion(null);
      if (examData.status_validation === "nao_validado") {
        const updatedExam = await updateExamStatus(id, "em_validacao");
        setExam(updatedExam);
      } else {
        setExam(examData);
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          "Nao foi possivel carregar o exame selecionado.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  async function runAction(action, successMessage) {
    setIsBusy(true);
    setError("");
    setMessage("");
    try {
      const updatedExam = await action();
      if (updatedExam) {
        setExam(updatedExam);
      }
      if (successMessage) {
        setMessage(successMessage);
      }
      return true;
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "Nao foi possivel concluir a acao.");
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
    setMessage(region ? "Redesenhe a area deste diagnostico no ECG." : "Desenhe a area deste diagnostico no ECG.");
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
      return;
    }

    const target = activeRegionTarget;
    const wasSaved = await runAction(
      async () => {
        const updatedDiagnosis = target.regionId
          ? await updateDiagnosisRegion(target.diagnosisId, target.regionId, region)
          : await addDiagnosisRegion(target.diagnosisId, region);
        return replaceDiagnosis(exam, updatedDiagnosis);
      },
      target.regionId ? "Area atualizada." : "Area vinculada ao diagnostico.",
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
      "Area removida.",
    );
  }

  async function handleReviewDiagnosis(diagnosisId, reviewStatus, reviewNotes = "") {
    const diagnosis = exam?.diagnoses?.find((item) => item.id === diagnosisId);
    if (reviewStatus === "confirmed" && diagnosis?.region_required_missing) {
      setError("Marque ao menos uma area do ECG antes de confirmar este diagnostico.");
      handleStartRegion(diagnosis);
      return false;
    }

    return runAction(
      () => reviewDailyDiagnosis(diagnosisId, reviewStatus, reviewNotes),
      reviewStatus === "confirmed" ? "Diagnostico confirmado." : "Diagnostico discordado.",
    );
  }

  async function validateCurrentExam() {
    const reviewResult = getAutomaticReviewResult(exam);
    return runAction(
      () =>
        validateExam(id, {
          review_result: reviewResult,
          notes,
        }),
      reviewResult === "alterado"
        ? "Exame validado como alterado."
        : "Exame validado sem alteracao.",
    );
  }

  async function goToNextDailyExam() {
    const nextData = await getNextValidationExam();
    if (nextData.exam && String(nextData.exam.id) !== String(id)) {
      navigate(`/exams/${nextData.exam.id}`);
      return;
    }
    navigate("/");
  }

  async function handlePrimaryAction() {
    if (validationContext?.is_configured && !validationContext.is_general_review_day) {
      if (!requiredDecisionComplete) {
        setError("Valide o diagnostico obrigatorio antes de avancar.");
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

  function handleStayOnExam() {
    setMessage("Voce pode validar os diagnosticos opcionais deste ECG.");
  }

  const requiredDiagnoses = useMemo(
    () => requiredDiagnosesFor(exam, validationContext),
    [exam, validationContext],
  );
  const viewerRegions = useMemo(
    () =>
      (exam?.diagnoses || []).flatMap((diagnosis) =>
        (diagnosis.regions || []).map((region) => ({
          ...region,
          diagnosisId: diagnosis.id,
          isActive: activeRegionTarget?.diagnosisId === diagnosis.id,
          label: regionLabelFor(diagnosis),
        })),
      ),
    [activeRegionTarget, exam],
  );
  const activeSelectionLabel = activeRegionTarget
    ? `Marcando area: ${activeRegionTarget.label}`
    : "";
  const requiredDecisionComplete =
    !validationContext?.is_configured ||
    requiredDiagnoses.some(
      (diagnosis) => getDiagnosisStatus(diagnosis) !== "pending" && !diagnosis.region_required_missing,
    );
  const hasDiagnosisDivergence = getAutomaticReviewResult(exam) === "alterado";
  const doctorName = user?.full_name || "Usuario";
  const dailyLabel = validationContext?.is_general_review_day
    ? "Dia 30 - revalidacao geral"
    : validationContext?.active_standard_diagnosis || "Agenda nao configurada";
  const usesDailyFlow = Boolean(validationContext?.is_configured && !validationContext.is_general_review_day);

  if (isLoading) {
    return <LoadingState message="Abrindo exame..." />;
  }

  if (error && !exam) {
    return (
      <div className="page-shell narrow-shell">
        <EmptyState title="Exame indisponivel" message={error} />
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
          <span className="eyebrow">Validacao medica</span>
          <h1>Exame {exam.exam_code}</h1>
        </div>
        <dl className="review-context-strip">
          <div>
            <dt>Diagnostico do dia</dt>
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
          <div className="header-tools compact-review-tools" aria-label="Acoes globais">
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
          <div className="review-session-chip" title={`Sessao ativa: ${doctorName}`}>
            <UserRound size={15} aria-hidden="true" />
            <span>{doctorName}</span>
          </div>
        </div>
      </header>

      <main className="review-layout">
        <aside className="review-sidebar">
          <div className="review-sidebar-scroll">
            {message ? <div className="feedback success-feedback">{message}</div> : null}
            {error ? <div className="feedback error-feedback">{error}</div> : null}

            <section className="sidebar-section review-decision-section">
              <DiagnosisPanel
                activeRegionTarget={activeRegionTarget}
                dailyStandardDiagnosis={validationContext?.active_standard_diagnosis}
                diagnoses={exam.diagnoses}
                options={diagnosisOptions}
                onAdd={handleAddDiagnosis}
                onEditRegion={handleStartRegion}
                onRemove={handleRemoveDiagnosis}
                onRemoveRegion={handleRemoveRegion}
                onReview={handleReviewDiagnosis}
                onStartRegion={handleStartRegion}
                isBusy={isBusy}
                isGeneralReviewDay={validationContext?.is_general_review_day}
                selectedRegion={selectedRegion}
                onRegionConsumed={() => setSelectedRegion(null)}
              />
            </section>

            <details className="review-details">
              <summary>Dados clinicos completos</summary>
              <PatientInfo patient={exam.patient} />
            </details>

            {exam.comments || exam.source_notes ? (
              <details className="review-details">
                <summary>Informacoes do laudo original</summary>
                {exam.comments ? (
                  <div className="source-text-block">
                    <strong>Comentarios</strong>
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

            <section className="review-notes-section">
              <h2>Observacoes gerais da revisao</h2>
              <textarea
                className="notes-field"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Registre comentarios gerais sobre o exame"
                rows={3}
              />
            </section>
          </div>

          <div className="review-sidebar-actions">
            {hasDiagnosisDivergence ? (
              <div className="diagnosis-divergence-alert">
                Ha divergencia ou diagnostico medico adicionado. Ao validar, o exame sera
                classificado como alterado.
              </div>
            ) : null}

            <section className="sidebar-section review-status-section">
              <h2>Status atual</h2>
              <StatusBadge status={exam.status_validation} reviewResult={exam.review_result} />
            </section>

            <ReviewActions
              onBack={() => navigate("/")}
              onStay={usesDailyFlow ? handleStayOnExam : undefined}
              onValidate={handlePrimaryAction}
              canValidate={requiredDecisionComplete}
              isBusy={isBusy}
              isValid={!validationContext?.is_configured && exam.status_validation === "valido"}
              primaryLabel={usesDailyFlow ? "Salvar e proximo" : "Validar exame"}
              secondaryLabel="Ficar no ECG"
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
          />
        </section>
      </main>

      <SupportContactModal
        contact={supportContact}
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
      <FloatingSupportButton onClick={openSupport} />
    </div>
  );
}
