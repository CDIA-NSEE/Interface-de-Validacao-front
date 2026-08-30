import {
  ArrowLeft,
  ChevronDown,
  Info,
  NotebookPen,
  PanelRightOpen,
  Stethoscope,
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
import ValidationSidebar from "../components/ValidationSidebar.jsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Field, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  const reviewLayoutRef = useRef(null);
  const sidebarTriggerRef = useRef(null);
  const shouldRestoreSidebarFocusRef = useRef(true);
  const validationWorkspaceRef = useRef(null);
  const wasSidebarExpandedRef = useRef(false);
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
  const [isMoreInformationOpen, setIsMoreInformationOpen] = useState(false);
  const [isReviewSheetOpen, setIsReviewSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [saveFeedback, setSaveFeedback] = useState("");
  const [diagnosisReviewDrafts, setDiagnosisReviewDrafts] = useState({});
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(DEFAULT_ECG_ASPECT_RATIO);
  const [sidebarWidth, setSidebarWidth] = useState(null);
  const [ecgControlsTarget, setEcgControlsTarget] = useState(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

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
      setIsMoreInformationOpen(false);
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
    const workspace = validationWorkspaceRef.current;
    if (workspace) {
      workspace.inert = isSidebarExpanded;
    }

    let focusTimer;
    if (
      wasSidebarExpandedRef.current &&
      !isSidebarExpanded &&
      shouldRestoreSidebarFocusRef.current
    ) {
      focusTimer = window.setTimeout(() => sidebarTriggerRef.current?.focus(), 0);
    }
    if (!isSidebarExpanded) shouldRestoreSidebarFocusRef.current = true;
    wasSidebarExpandedRef.current = isSidebarExpanded;

    return () => {
      if (focusTimer) window.clearTimeout(focusTimer);
      if (workspace) workspace.inert = false;
    };
  }, [isSidebarExpanded]);

  useEffect(() => {
    const layout = reviewLayoutRef.current;
    if (!layout || isCompactLayout) return undefined;

    function updateSidebarWidth() {
      const usesIntermediateLayout = layout.clientWidth <= 920;
      const nextWidth = getReviewSidebarWidth({
        imageAspectRatio,
        layoutHeight: layout.clientHeight,
        layoutWidth: layout.clientWidth,
        maximumSidebarRatio: usesIntermediateLayout ? 0.42 : 0.32,
        minimumSidebarWidth: usesIntermediateLayout
          ? 300
          : Math.round(layout.clientWidth * 0.3),
        viewerHorizontalChrome: 24,
        viewerVerticalChrome: 150,
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
  const usesDailyFlow = Boolean(validationContext?.is_configured && !validationContext.is_general_review_day);
  const primaryDisabledReason = usesDailyFlow && !requiredDecisionComplete
    ? requiredDiagnoses.some(
      (diagnosis) =>
        getDiagnosisReviewStatus(diagnosis) !== "pending" && diagnosis.region_required_missing,
    )
      ? "Marque a área obrigatória no ECG para continuar."
      : "Defina Concordo ou Discordo para continuar."
    : null;

  function blockValidationInteraction(event) {
    if (!isSidebarExpanded) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function handleSidebarOpenChange(open, options = {}) {
    if (!open) {
      shouldRestoreSidebarFocusRef.current = options.restoreFocus ?? true;
    }
    setIsSidebarExpanded(open);
  }

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

  const clinicalInformation = (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope aria-hidden="true" data-icon="inline-start" />
          <h2>Dados clínicos</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PatientInfo patient={exam.patient} />
      </CardContent>
    </Card>
  );

  const moreInformation = (
    <Collapsible onOpenChange={setIsMoreInformationOpen} open={isMoreInformationOpen}>
      <Card className="gap-0 overflow-hidden" size="sm">
        <CardHeader className="p-0">
          <CollapsibleTrigger
            render={
              <Button
                className="h-auto w-full justify-between rounded-none px-3 py-3"
                type="button"
                variant="ghost"
              />
            }
          >
            <span className="flex items-center gap-2">
              <Info aria-hidden="true" data-icon="inline-start" />
              Mais informações
            </span>
            <ChevronDown
              aria-hidden="true"
              className={isMoreInformationOpen ? "rotate-180 transition-transform" : "transition-transform"}
              data-icon="inline-end"
            />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <Separator />
          <CardContent className="flex flex-col gap-3 pt-3">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-muted/50 p-3">
                <dt className="text-xs font-medium text-muted-foreground">Data e hora</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {formatDate(exam.exam_date)}
                  {exam.exam_time ? ` as ${exam.exam_time}` : ""}
                </dd>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <dt className="text-xs font-medium text-muted-foreground">Tipo</dt>
                <dd className="mt-1 font-medium text-foreground">{exam.exam_type}</dd>
              </div>
            </dl>

            {exam.comments || exam.source_notes ? (
              <div className="rounded-lg bg-muted/50 p-3">
                <strong className="text-xs font-medium text-muted-foreground">Notas</strong>
                <div className="mt-1 flex flex-col gap-2">
                  {exam.comments ? (
                    <p className="break-words text-sm text-foreground">{exam.comments}</p>
                  ) : null}
                  {exam.source_notes ? (
                    <p className="break-words text-sm text-foreground">{exam.source_notes}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
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
      {clinicalInformation}
      {moreInformation}
    </div>
  );

  const reviewFooter = (
    <div className="flex flex-col gap-3">
      <Card size="sm" variant="highlight">
        <CardHeader className="flex flex-row items-center justify-between gap-3" data-testid="current-status">
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
        primaryDisabledReason={primaryDisabledReason}
        primaryLabel={usesDailyFlow ? "Salvar e próximo" : "Validar exame"}
      />
    </div>
  );

  return (
    <TooltipProvider>
      <div className="grid h-svh min-h-0 grid-cols-[4rem_minmax(0,1fr)] overflow-hidden bg-secondary/40">
        <ValidationSidebar
          expanded={isSidebarExpanded}
          isBusy={isBusy}
          onHome={handleReturnHome}
          onOpenChange={handleSidebarOpenChange}
          onSupport={openSupport}
          onTutorial={() => setIsTutorialOpen(true)}
          triggerRef={sidebarTriggerRef}
        />

        <div
          className="flex min-h-0 min-w-0 flex-col overflow-hidden"
          onClickCapture={blockValidationInteraction}
          onKeyDownCapture={blockValidationInteraction}
          onPointerDownCapture={blockValidationInteraction}
          ref={validationWorkspaceRef}
        >
          <h1 className="sr-only">Exame {exam.exam_code}</h1>
          <main
            className="relative flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[var(--review-sidebar-width)_minmax(0,1fr)]"
            ref={reviewLayoutRef}
            style={{ "--review-sidebar-width": `${sidebarWidth || 360}px` }}
          >
            {!isCompactLayout ? (
              <aside
                aria-label="Diagnósticos e ações"
                className="flex min-h-0 min-w-0 flex-col border-r bg-background"
              >
                <ScrollArea className="min-h-0 flex-1">
                  <div className="p-4">{reviewBody}</div>
                </ScrollArea>
                <div className="shrink-0 border-t bg-background p-4">{reviewFooter}</div>
              </aside>
            ) : null}

            <section
              aria-label="Visualizador de ECG"
              className="flex min-h-0 min-w-0 flex-1 overflow-y-auto p-2 pb-20 md:p-3 md:pb-3"
            >
              <div className="flex min-h-full w-full flex-col gap-2">
                <EcgViewer
                  controlsTarget={ecgControlsTarget}
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
                <Field className="shrink-0 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
                  <div
                    className="flex flex-wrap items-center justify-between gap-2"
                    data-testid="general-observations-header"
                  >
                    <div className="flex items-center gap-2">
                      <FieldLabel className="flex items-center gap-2" htmlFor="general-observations">
                        <NotebookPen aria-hidden="true" data-icon="inline-start" />
                        Observações gerais
                      </FieldLabel>
                      <Badge variant="outline">Opcional</Badge>
                    </div>
                    <div className="ml-auto" ref={setEcgControlsTarget} />
                  </div>
                  <Textarea
                    aria-label="Observações gerais"
                    id="general-observations"
                    value={notes}
                    onChange={(event) => {
                      setNotes(event.target.value);
                      setSaveFeedback("");
                    }}
                    placeholder="Registre comentários gerais sobre o exame"
                    rows={2}
                  />
                </Field>
              </div>
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
                <SheetFooter className="shrink-0 border-t bg-background">
                  {reviewFooter}
                </SheetFooter>
              </SheetContent>
            </Sheet>
          ) : null}
        </div>

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
