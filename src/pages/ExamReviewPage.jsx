import {
  ArrowLeft,
  FileText,
  HelpCircle,
  House,
  LifeBuoy,
  Moon,
  NotebookPen,
  PanelRightOpen,
  Stethoscope,
  Sun,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import TooltipIconButton from "@/components/TooltipIconButton.jsx";
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
  DEFAULT_ECG_ASPECT_RATIO,
  REVIEW_MOBILE_BREAKPOINT,
  getReviewSidebarWidth,
} from "../utils/reviewLayout.js";
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

function useCompactReviewLayout() {
  const compactMediaQuery = `(max-width: ${REVIEW_MOBILE_BREAKPOINT - 1}px)`;
  const [isCompact, setIsCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.(compactMediaQuery).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(compactMediaQuery);
    if (!mediaQuery) return undefined;

    const handleChange = (event) => setIsCompact(event.matches);
    setIsCompact(mediaQuery.matches);
    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, [compactMediaQuery]);

  return isCompact;
}

export default function ExamReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const reviewLayoutRef = useRef(null);
  const isCompactLayout = useCompactReviewLayout();
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
  const [openDetailSections, setOpenDetailSections] = useState(["notes"]);
  const [isReviewSheetOpen, setIsReviewSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [saveFeedback, setSaveFeedback] = useState("");
  const [diagnosisReviewDrafts, setDiagnosisReviewDrafts] = useState({});
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(DEFAULT_ECG_ASPECT_RATIO);
  const [sidebarWidth, setSidebarWidth] = useState(null);

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
      setOpenDetailSections(["notes"]);
      setIsReviewSheetOpen(false);
      setDiagnosisReviewDrafts({});
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

  useEffect(() => {
    const layout = reviewLayoutRef.current;
    if (!layout || isCompactLayout) return undefined;

    function updateSidebarWidth() {
      const usesIntermediateLayout = layout.clientWidth <= 920;
      const nextWidth = getReviewSidebarWidth({
        imageAspectRatio,
        layoutHeight: layout.clientHeight,
        layoutWidth: layout.clientWidth,
        maximumSidebarRatio: usesIntermediateLayout ? 0.46 : 0.5,
        minimumSidebarWidth: usesIntermediateLayout ? 300 : 340,
        viewerHorizontalChrome: 30,
        viewerVerticalChrome: 72,
      });

      setSidebarWidth((current) => (current === nextWidth ? current : nextWidth));
    }

    updateSidebarWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSidebarWidth);
      return () => window.removeEventListener("resize", updateSidebarWidth);
    }

    const observer = new ResizeObserver(updateSidebarWidth);
    observer.observe(layout);
    return () => observer.disconnect();
  }, [imageAspectRatio, isCompactLayout]);

  const handleDiagnosisReviewDraftChange = useCallback((diagnosisId, draft) => {
    const key = String(diagnosisId);

    setDiagnosisReviewDrafts((current) => {
      if (!draft) {
        if (!(key in current)) return current;
        const next = { ...current };
        delete next[key];
        return next;
      }

      const currentDraft = current[key];
      if (currentDraft?.isOpen === draft.isOpen && currentDraft?.note === draft.note) {
        return current;
      }
      return { ...current, [key]: draft };
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
    if (isCompactLayout) {
      setIsReviewSheetOpen(false);
    }
  }

  function handleCancelRegionSelection() {
    setActiveRegionTarget(null);
    setSelectedRegion(null);
    if (isCompactLayout) {
      setIsReviewSheetOpen(true);
    }
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

    if (isCompactLayout) {
      setIsReviewSheetOpen(true);
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
              diagnosisReviewDrafts[String(diagnosis.id)]?.isOpen ? "rejected" : null,
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
      diagnosisReviewDrafts,
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
        diagnosisReviewDrafts[String(activeRegionDiagnosis.id)]?.isOpen ? "rejected" : null,
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
  const hasUnsavedDiagnosisReview = Object.entries(diagnosisReviewDrafts).some(
    ([diagnosisId, draft]) => {
      if (!draft?.isOpen) return false;
      const diagnosis = (exam?.diagnoses || []).find(
        (item) => String(item.id) === diagnosisId,
      );
      return (draft.note || "") !== (diagnosis?.review_notes || "");
    },
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
      <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col justify-center gap-4 p-4 sm:p-6">
        <EmptyState title="Exame indisponível" message={error} />
        <Button className="self-start" type="button" onClick={() => navigate("/")} variant="outline">
          <ArrowLeft aria-hidden="true" data-icon="inline-start" />
          Voltar
        </Button>
      </div>
    );
  }

  const diagnosisPanel = (
    <DiagnosisPanel
      activeRegionTarget={activeRegionTarget}
      aiModeEnabled={Boolean(validationContext?.ai_mode_enabled)}
      dailyStandardDiagnosis={validationContext?.active_standard_diagnosis}
      diagnoses={exam.diagnoses}
      diagnosisReferences={diagnosisReferences}
      options={diagnosisOptions}
      reviewDrafts={diagnosisReviewDrafts}
      onAdd={handleAddDiagnosis}
      onEditRegion={handleStartRegion}
      onRemove={handleRemoveDiagnosis}
      onRemoveRegion={handleRemoveRegion}
      onReview={handleReviewDiagnosis}
      onReviewDraftChange={handleDiagnosisReviewDraftChange}
      onStartRegion={handleStartRegion}
      isBusy={isBusy}
      isGeneralReviewDay={validationContext?.is_general_review_day}
      isSecondaryOpen={isSecondaryPanelOpen}
      onSecondaryToggle={setIsSecondaryPanelOpen}
      selectedRegion={selectedRegion}
      onRegionConsumed={() => setSelectedRegion(null)}
    />
  );

  const detailSections = (
    <Accordion
      className="rounded-xl bg-card px-4 ring-1 ring-foreground/10"
      multiple
      onValueChange={setOpenDetailSections}
      value={openDetailSections}
    >
      <AccordionItem value="clinical">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <Stethoscope aria-hidden="true" data-icon="inline-start" />
            Dados clínicos completos
          </span>
        </AccordionTrigger>
        <AccordionContent><PatientInfo patient={exam.patient} /></AccordionContent>
      </AccordionItem>
      {exam.comments || exam.source_notes ? (
        <AccordionItem value="report">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <FileText aria-hidden="true" data-icon="inline-start" />
              Informações do laudo original
            </span>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3">
            {exam.comments ? (
              <div className="rounded-lg bg-muted/50 p-3">
                <strong className="text-xs font-medium text-muted-foreground">Comentários</strong>
                <p className="mt-1 break-words text-sm text-foreground">{exam.comments}</p>
              </div>
            ) : null}
            {exam.source_notes ? (
              <div className="rounded-lg bg-muted/50 p-3">
                <strong className="text-xs font-medium text-muted-foreground">Notas</strong>
                <p className="mt-1 break-words text-sm text-foreground">{exam.source_notes}</p>
              </div>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      ) : null}
      <AccordionItem value="notes">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <NotebookPen aria-hidden="true" data-icon="inline-start" />
            Observações gerais
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <Textarea
            aria-label="Observações gerais"
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              setSaveFeedback("");
            }}
            placeholder="Registre comentários gerais sobre o exame"
            rows={3}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const reviewBody = (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível concluir a ação</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {saveFeedback ? (
        <Alert role="status" variant="success">
          <AlertTitle>Exame atualizado</AlertTitle>
          <AlertDescription>{saveFeedback}</AlertDescription>
        </Alert>
      ) : null}
      {diagnosisPanel}
      {detailSections}
    </div>
  );

  const reviewFooter = (
    <div className="flex flex-col gap-3">
      <Card size="sm" variant="highlight">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-sm">Status atual</CardTitle>
          <StatusBadge
            status={exam.status_validation}
            queueState={exam.queue_state}
            reviewResult={exam.review_result}
          />
        </CardHeader>
      </Card>
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
  );

  return (
    <TooltipProvider>
      <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-secondary/40">
      <header className="shrink-0 border-b border-brand bg-brand text-brand-foreground shadow-sm">
        <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Button aria-label="Ir para o início" disabled={isBusy} onClick={handleReturnHome} size="icon-sm" type="button" variant="brandGhost">
              <House aria-hidden="true" />
            </Button>
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-brand-foreground/70 uppercase">Validação médica</p>
              <h1 className="truncate font-heading text-base font-medium sm:text-lg">Exame {exam.exam_code}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1" role="group" aria-label="Ações globais">
            <TooltipIconButton label="Tutorial" onClick={() => setIsTutorialOpen(true)} size="icon-sm" variant="brandGhost"><HelpCircle aria-hidden="true" /></TooltipIconButton>
            <TooltipIconButton label="Contato" onClick={openSupport} size="icon-sm" variant="brandGhost"><LifeBuoy aria-hidden="true" /></TooltipIconButton>
            <TooltipIconButton label={isDark ? "Ativar modo claro" : "Ativar modo escuro"} onClick={toggleTheme} size="icon-sm" variant="brandGhost">
              {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </TooltipIconButton>
            <div className="hidden items-center gap-1.5 rounded-lg bg-brand-foreground/10 px-2.5 py-1.5 text-xs text-brand-foreground/80 sm:flex" aria-label={`Sessão ativa: ${doctorName}`} title={`Sessão ativa: ${doctorName}`}>
              <UserRound aria-hidden="true" />
              <span className="max-w-36 truncate">{doctorName}</span>
            </div>
          </div>
        </div>
        <dl className="hidden grid-cols-3 gap-px border-t border-brand-foreground/15 bg-brand-foreground/15 *:bg-brand *:px-4 *:py-2 [&_dd]:mt-0.5 [&_dd]:truncate [&_dd]:text-sm [&_dd]:font-medium [&_dt]:text-xs [&_dt]:text-brand-foreground/65 md:grid md:grid-cols-5">
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
      </header>

      <main
        className="relative flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[var(--review-sidebar-width)_minmax(0,1fr)]"
        ref={reviewLayoutRef}
        style={{ "--review-sidebar-width": `${sidebarWidth || 360}px` }}
      >
        {!isCompactLayout ? (
          <aside className="flex min-h-0 min-w-0 flex-col border-r bg-background" aria-label="Diagnósticos e ações">
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-4">{reviewBody}</div>
            </ScrollArea>
            <div className="shrink-0 border-t bg-background p-4">{reviewFooter}</div>
          </aside>
        ) : null}

        <section className="flex min-h-0 min-w-0 flex-1 p-2 pb-20 md:p-4" aria-label="Visualizador de ECG">
          <EcgViewer
            imageUrl={exam.image_endpoint || exam.image_url}
            onImageAspectRatioChange={setImageAspectRatio}
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

      {isCompactLayout ? (
        <Sheet open={isReviewSheetOpen} onOpenChange={setIsReviewSheetOpen}>
          <div className="fixed inset-x-0 bottom-0 flex justify-center border-t bg-background/95 p-3 backdrop-blur">
            <SheetTrigger render={<Button className="w-full max-w-sm" size="lg" type="button" />}>
              <PanelRightOpen aria-hidden="true" data-icon="inline-start" />
              Diagnósticos e ações
            </SheetTrigger>
          </div>
          <SheetContent
            className="gap-0 data-[side=right]:w-[min(94vw,30rem)] data-[side=right]:sm:max-w-none"
            side="right"
          >
            <SheetHeader className="border-b bg-accent/60 pr-12">
              <SheetTitle>Diagnósticos e ações</SheetTitle>
              <SheetDescription>Revise os achados e conclua este ECG.</SheetDescription>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-4">{reviewBody}</div>
            </ScrollArea>
            <SheetFooter className="shrink-0 border-t bg-background">{reviewFooter}</SheetFooter>
          </SheetContent>
        </Sheet>
      ) : null}

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
    </TooltipProvider>
  );
}
