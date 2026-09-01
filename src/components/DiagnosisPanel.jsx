import { Check, ChevronDown, MapPinned, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Field, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getDiagnosisReviewStatus, getDiagnosisVisualStatus } from "../utils/diagnosisRegionVisuals.js";
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

const AI_AGREEMENT_DESCRIPTION =
  "Sugestão informativa; a decisão permanece médica.";

function AiAgreementBadge() {
  const descriptionId = useId();

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Badge
              aria-describedby={descriptionId}
              aria-label="IA concordou"
              tabIndex={0}
              variant="ai"
            />
          }
        >
          <Sparkles aria-hidden="true" data-icon="inline-start" />
          IA concordou
        </TooltipTrigger>
        <TooltipContent>{AI_AGREEMENT_DESCRIPTION}</TooltipContent>
      </Tooltip>
      <span className="sr-only" id={descriptionId}>{AI_AGREEMENT_DESCRIPTION}</span>
    </>
  );
}

function markedRegionCountLabel(count) {
  return count === 1 ? "1 área marcada" : `${count} áreas marcadas`;
}

function reviewBadgeVariant(status) {
  if (status === "confirmed") return "success";
  if (status === "rejected") return "destructive";
  return "pending";
}

function DiagnosisStatusBadge({ diagnosis, status }) {
  if (diagnosis?.source === "doctor_added") {
    return (
      <Badge className="shrink-0" variant={diagnosis.region_required_missing ? "warning" : "secondary"}>
        {diagnosis.region_required_missing ? "Área necessária" : "Adicionado"}
      </Badge>
    );
  }

  return (
    <Badge className="shrink-0" variant={reviewBadgeVariant(status)}>
      {REVIEW_LABELS[status]}
    </Badge>
  );
}

function diagnosisCardVariant({ isRegionTarget, isRequired }) {
  if (isRegionTarget) return "info";
  if (isRequired) return "highlight";
  return "default";
}

function DiagnosisBadges({ aiModeEnabled, diagnosis, isRequired }) {
  const hasBadges = isRequired
    || (aiModeEnabled && diagnosis.ai_suggested)
    || diagnosis.is_grouped
    || (diagnosis.source !== "doctor_added" && diagnosis.region_required_missing);

  if (!hasBadges) return null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {isRequired ? <Badge variant="info">Diagnóstico do dia</Badge> : null}
      {aiModeEnabled && diagnosis.ai_suggested ? <AiAgreementBadge /> : null}
      {diagnosis.is_grouped ? <Badge variant="outline">Agrupado</Badge> : null}
      {diagnosis.source !== "doctor_added" && diagnosis.region_required_missing ? <Badge variant="warning">Área necessária</Badge> : null}
    </div>
  );
}

function DiagnosisDetails({
  activeRegionTarget,
  diagnosis,
  diagnosisReference,
  isBusy,
  onEditRegion,
  onRemove,
  onRemoveRegion,
  onRegionHover,
  onRegionSelect,
  onReview,
  onReviewInteractionBlocked,
  regionError,
  selectedRegionKey,
  hoveredRegionKey,
  isAreaListOpen,
  onAreaListOpenChange,
  decisionFeedback,
  reviewDraft,
  onReviewDraftChange,
  onStartRegion,
}) {
  const status = getDiagnosisReviewStatus(diagnosis);
  const standardText = diagnosis.standard_text || diagnosis.name;
  const originalText = diagnosis.original_text || diagnosis.name;
  const regions = diagnosis.regions || [];
  const isRegionTarget = activeRegionTarget?.diagnosisId === diagnosis.id;
  const originalPreview = getOriginalTextPreview(originalText);
  const shouldShowOriginal = diagnosis.source === "original" && Boolean(originalText);
  const isDisagreementOpen = Boolean(reviewDraft?.isOpen);
  const savedReviewNote = diagnosis.review_notes || "";
  const reviewNoteDraft = reviewDraft?.note ?? diagnosis.review_notes ?? "";
  const isReviewDraftDirty = isDisagreementOpen && reviewNoteDraft !== savedReviewNote;
  const visualStatus = getDiagnosisVisualStatus(diagnosis, isDisagreementOpen ? "rejected" : null);
  const decisionValue = visualStatus === "pending" ? [] : [visualStatus];

  function setDisagreementPanelOpen(isOpen) {
    onReviewDraftChange?.(
      diagnosis.id,
      isOpen ? { isOpen: true, note: reviewNoteDraft } : null,
    );
  }

  function openDisagreementPanel() {
    onReviewDraftChange?.(diagnosis.id, {
      isOpen: true,
      note: diagnosis.review_notes || "",
    });
  }

  async function submitDisagreement(note, feedbackKind = "decision") {
    const wasReviewed = await onReview(diagnosis.id, "rejected", note, feedbackKind);
    if (wasReviewed) setDisagreementPanelOpen(false);
  }

  async function submitAgreement() {
    const wasReviewed = await onReview(diagnosis.id, "confirmed");
    if (wasReviewed) setDisagreementPanelOpen(false);
  }

  function handleDecisionChange(nextValue) {
    if (isReviewDraftDirty) {
      onReviewInteractionBlocked?.(diagnosis.id);
      return;
    }
    const nextDecision = nextValue.at(-1);
    if (nextDecision === "confirmed") submitAgreement();
    if (nextDecision === "rejected") submitDisagreement(savedReviewNote);
  }

  return (
    <div className="flex flex-col gap-2.5">
      {shouldShowOriginal ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                className="h-auto w-fit max-w-full justify-start truncate px-0 py-0"
                size="sm"
                type="button"
                variant="ghost"
              />
            }
          >
            <span className="min-w-0 truncate text-xs font-normal text-muted-foreground">
              <span className="text-[0.7rem] text-muted-foreground/80">Original:</span>{" "}
              {originalPreview}
            </span>
          </TooltipTrigger>
          <TooltipContent>{originalText}</TooltipContent>
        </Tooltip>
      ) : null}

      {status === "rejected" && diagnosis.review_notes ? (
        <Alert>
          <AlertTitle>Justificativa registrada</AlertTitle>
          <AlertDescription className="break-words">{diagnosis.review_notes}</AlertDescription>
          <Button className="mt-2 w-fit" disabled={isBusy} onClick={openDisagreementPanel} size="sm" type="button" variant="ghost">Editar justificativa</Button>
        </Alert>
      ) : null}

      {regions.length ? (
        <Collapsible onOpenChange={onAreaListOpenChange} open={isAreaListOpen}>
          <CollapsibleTrigger
            aria-label={markedRegionCountLabel(regions.length)}
            className="flex w-fit items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Check aria-hidden="true" data-icon="inline-start" />
            <span>{markedRegionCountLabel(regions.length)}</span>
            <ChevronDown aria-hidden="true" className={cn("transition-transform", isAreaListOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 flex flex-col gap-2" aria-label={markedRegionCountLabel(regions.length)}>
          {regions.map((region, index) => {
            const regionReference = getRegionReference(diagnosisReference, index);
            const areaLabel = `Área ${index + 1}`;
            const accessibleAreaLabel = regionReference || areaLabel;
            const regionKey = `${diagnosis.id}:${region.id ?? `legacy-${index}`}`;
            const isSelected = selectedRegionKey === regionKey;
            const isHovered = hoveredRegionKey === regionKey;
            return (
              <div
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-2 transition-colors",
                  isHovered && !isSelected && "bg-accent/60",
                  isSelected && "bg-accent ring-2 ring-ring/30",
                )}
                key={regionKey}
                onBlur={() => onRegionHover?.(null)}
                onFocus={() => onRegionHover?.(regionKey)}
                onMouseEnter={() => onRegionHover?.(regionKey)}
                onMouseLeave={() => onRegionHover?.(null)}
              >
                <button
                  aria-pressed={isSelected}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs outline-none"
                  onClick={() => onRegionSelect?.(regionKey)}
                  type="button"
                >
                  {regionReference ? <Badge variant="outline">{regionReference}</Badge> : null}
                  <span>{areaLabel}</span>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <Button aria-label={`Editar ${accessibleAreaLabel}`} disabled={isBusy} onClick={() => onEditRegion(diagnosis, region)} size="icon-sm" title={`Editar ${accessibleAreaLabel}`} type="button" variant="ghost"><Pencil aria-hidden="true" /></Button>
                  <Button className="text-muted-foreground hover:text-destructive focus-visible:text-destructive" aria-label={`Remover ${accessibleAreaLabel}`} disabled={isBusy || !region.id} onClick={() => onRemoveRegion(diagnosis.id, region.id)} size="icon-sm" title={region.id ? `Remover ${accessibleAreaLabel}` : "Área legada sem id"} type="button" variant="ghost"><Trash2 aria-hidden="true" /></Button>
                </div>
              </div>
            );
          })}
            <Button aria-pressed={isRegionTarget} className="w-fit" disabled={isBusy} onClick={() => onStartRegion(diagnosis)} size="sm" type="button" variant={isRegionTarget ? "secondary" : "ghost"}>
              <Plus aria-hidden="true" data-icon="inline-start" />
              Adicionar área
            </Button>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {diagnosis.source !== "doctor_added" ? <ToggleGroup aria-label={`Revisão de ${standardText}`} className="grid w-full grid-cols-2" disabled={isBusy} onValueChange={handleDecisionChange} spacing={1} value={decisionValue}>
        <ToggleGroupItem className="w-full min-w-0 px-1.5" value="confirmed" variant="decisionSuccess"><Check aria-hidden="true" data-icon="inline-start" />Concordo</ToggleGroupItem>
        <ToggleGroupItem className="w-full min-w-0 px-1.5" value="rejected" variant="decisionDestructive"><X aria-hidden="true" data-icon="inline-start" />Discordo</ToggleGroupItem>
      </ToggleGroup> : null}

      {decisionFeedback ? (
        <p className={cn("text-xs", decisionFeedback.type === "error" ? "text-destructive" : "text-muted-foreground")} role={decisionFeedback.type === "error" ? "alert" : "status"}>
          {decisionFeedback.message}
        </p>
      ) : null}

      {!regions.length && diagnosis.region_required_missing ? (
        <Alert variant="warning">
          <MapPinned aria-hidden="true" />
          <AlertTitle>Área no ECG</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>Obrigatória para este diagnóstico.</span>
            <Button aria-pressed={isRegionTarget} disabled={isBusy} onClick={() => onStartRegion(diagnosis)} size="sm" type="button" variant={isRegionTarget ? "secondary" : "outline"}>
              <MapPinned aria-hidden="true" data-icon="inline-start" />
              Marcar área
            </Button>
          </AlertDescription>
        </Alert>
      ) : !regions.length ? (
        <Button aria-pressed={isRegionTarget} className="w-fit" disabled={isBusy} onClick={() => onStartRegion(diagnosis)} size="sm" type="button" variant={isRegionTarget ? "secondary" : "ghost"}>
          <MapPinned aria-hidden="true" data-icon="inline-start" />
          Marcar área
        </Button>
      ) : null}

      {diagnosis.source === "doctor_added" ? (
        <AlertDialog>
          <AlertDialogTrigger render={<Button className="w-fit text-muted-foreground hover:text-destructive focus-visible:text-destructive" disabled={isBusy} size="sm" type="button" variant="ghost" />}>
            <Trash2 aria-hidden="true" data-icon="inline-start" />
            Remover
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover diagnóstico?</AlertDialogTitle>
              <AlertDialogDescription>
                {standardText} e {regions.length === 1 ? "1 área associada" : `${regions.length} áreas associadas`} serão removidos juntos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onRemove(diagnosis.id)} variant="destructive">Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {regionError ? <p className="text-xs text-destructive" role="alert">{regionError}</p> : null}

      {status === "rejected" && !diagnosis.review_notes && !isDisagreementOpen && diagnosis.source !== "doctor_added" ? (
        <Button className="w-fit" disabled={isBusy} onClick={openDisagreementPanel} size="sm" type="button" variant="ghost">Justificativa (opcional)</Button>
      ) : null}

      {isDisagreementOpen ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-2">
            <Field>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor={`disagreement-note-${diagnosis.id}`}>Justificativa <span className="font-normal text-muted-foreground">(opcional)</span></FieldLabel>
                <Button aria-label="Cancelar justificativa" disabled={isBusy} onClick={() => setDisagreementPanelOpen(false)} size="icon-sm" type="button" variant="ghost"><X aria-hidden="true" /></Button>
              </div>
              <Textarea id={`disagreement-note-${diagnosis.id}`} onChange={(event) => onReviewDraftChange?.(diagnosis.id, { isOpen: true, note: event.target.value })} placeholder="Registre o motivo da discordância, se necessário" rows={3} value={reviewNoteDraft} />
            </Field>
            <div className="flex flex-col gap-2 sm:flex-row">
              {isReviewDraftDirty ? (
                <>
                  <Button disabled={isBusy} onClick={() => submitDisagreement(reviewNoteDraft, "justification")} size="sm" type="button">Salvar justificativa</Button>
                  <Button disabled={isBusy} onClick={() => setDisagreementPanelOpen(false)} size="sm" type="button" variant="outline">Cancelar</Button>
                </>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function DiagnosisCard({
  activeRegionTarget,
  aiModeEnabled,
  diagnosis,
  diagnosisReference,
  isBusy,
  isRequired,
  onEditRegion,
  onRemove,
  onRemoveRegion,
  onRegionHover,
  onRegionSelect,
  onReview,
  onReviewInteractionBlocked,
  reviewDraft,
  onReviewDraftChange,
  onStartRegion,
  regionError,
  selectedRegionKey,
  hoveredRegionKey,
  isAreaListOpen,
  onAreaListOpenChange,
  decisionFeedback,
}) {
  const status = getDiagnosisReviewStatus(diagnosis);
  const standardText = diagnosis.standard_text || diagnosis.name;
  const isRegionTarget = activeRegionTarget?.diagnosisId === diagnosis.id;
  const isDisagreementOpen = Boolean(reviewDraft?.isOpen);
  const cardVariant = diagnosisCardVariant({ isRegionTarget, isRequired });
  const statusDescription = isDisagreementOpen ? "Discordância em edição" : null;
  const isRegionConnected = [hoveredRegionKey, selectedRegionKey].some((key) => key?.startsWith(`${diagnosis.id}:`));

  return (
    <Card className={cn("gap-2.5 overflow-visible", (isRegionTarget || isRegionConnected) && "ring-2 ring-ring/40")} data-diagnosis-id={diagnosis.id} data-testid="diagnosis-card" size="sm" variant={cardVariant}>
      <CardHeader className="gap-1.5">
        <DiagnosisBadges aiModeEnabled={aiModeEnabled} diagnosis={diagnosis} isRequired={isRequired} />
        <CardTitle className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          {diagnosisReference ? <Badge variant="outline">{diagnosisReference}</Badge> : null}
          <span className="line-clamp-2 min-w-0 break-words" title={standardText}>{standardText}</span>
          <DiagnosisStatusBadge diagnosis={diagnosis} status={status} />
        </CardTitle>
        {statusDescription ? <CardDescription>{statusDescription}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <DiagnosisDetails
          activeRegionTarget={activeRegionTarget}
          diagnosis={diagnosis}
          diagnosisReference={diagnosisReference}
          isBusy={isBusy}
          onEditRegion={onEditRegion}
          onRemove={onRemove}
          onRemoveRegion={onRemoveRegion}
          onRegionHover={onRegionHover}
          onRegionSelect={onRegionSelect}
          onReview={onReview}
          onReviewInteractionBlocked={onReviewInteractionBlocked}
          onReviewDraftChange={onReviewDraftChange}
          onStartRegion={onStartRegion}
          reviewDraft={reviewDraft}
          regionError={regionError}
          selectedRegionKey={selectedRegionKey}
          hoveredRegionKey={hoveredRegionKey}
          isAreaListOpen={isAreaListOpen}
          onAreaListOpenChange={onAreaListOpenChange}
          decisionFeedback={decisionFeedback}
        />
      </CardContent>
    </Card>
  );
}

export default function DiagnosisPanel({
  activeRegionTarget,
  aiModeEnabled = false,
  dailyStandardDiagnosis,
  diagnoses = [],
  diagnosisReferences = {},
  isBusy,
  isGeneralReviewDay,
  isSecondaryOpen,
  onAdd,
  onEditRegion,
  onRemove,
  onRemoveRegion,
  onRegionHover,
  onRegionSelect,
  onReview,
  onReviewInteractionBlocked,
  onReviewDraftChange,
  onSecondaryToggle,
  onStartRegion,
  options = [],
  reviewDrafts = {},
  decisionFeedbacks = {},
  regionErrors = {},
  hoveredRegionKey = null,
  selectedRegionKey = null,
}) {
  const addDiagnosisContentId = useId();
  const [name, setName] = useState("");
  const [isAddDiagnosisOpen, setIsAddDiagnosisOpen] = useState(false);
  const [expandedDiagnosisId, setExpandedDiagnosisId] = useState(null);
  const [pendingExpandedDiagnosisId, setPendingExpandedDiagnosisId] = useState(null);
  const [openAreaDiagnosisIds, setOpenAreaDiagnosisIds] = useState(() => new Set());
  const addDiagnosisTriggerRef = useRef(null);
  const addDiagnosisSelectRef = useRef(null);

  const { doctorDiagnoses, optionalDiagnoses, requiredDiagnoses } = useMemo(
    () => getDiagnosisDisplayGroups(diagnoses, { dailyStandardDiagnosis, isGeneralReviewDay }),
    [dailyStandardDiagnosis, diagnoses, isGeneralReviewDay],
  );
  const secondaryDiagnoses = useMemo(
    () => [...optionalDiagnoses, ...doctorDiagnoses],
    [doctorDiagnoses, optionalDiagnoses],
  );
  const secondaryDiagnosisIds = useMemo(
    () => new Set(secondaryDiagnoses.map((diagnosis) => String(diagnosis.id))),
    [secondaryDiagnoses],
  );
  const dirtyReviewDraftDiagnosisId = diagnoses.find(
    (diagnosis) => {
      const draft = reviewDrafts[String(diagnosis.id)];
      return draft?.isOpen && (draft.note || "") !== (diagnosis.review_notes || "");
    },
  )?.id;
  const dirtySecondaryReviewDraftDiagnosisId = secondaryDiagnosisIds.has(String(dirtyReviewDraftDiagnosisId ?? ""))
    ? dirtyReviewDraftDiagnosisId
    : null;
  const activeSecondaryDiagnosisId = secondaryDiagnosisIds.has(String(activeRegionTarget?.diagnosisId ?? ""))
    ? activeRegionTarget.diagnosisId
    : null;
  const forcedExpandedDiagnosisId = activeSecondaryDiagnosisId ?? dirtySecondaryReviewDraftDiagnosisId;
  const selectItems = useMemo(() => options.map((option) => ({ label: option, value: option })), [options]);

  const revealSecondaryDiagnosis = useCallback((diagnosisId) => {
    const normalizedDiagnosisId = String(diagnosisId);
    if (!secondaryDiagnosisIds.has(normalizedDiagnosisId)) return;
    setExpandedDiagnosisId((current) => current === normalizedDiagnosisId ? current : normalizedDiagnosisId);
    if (!isSecondaryOpen) onSecondaryToggle?.(true);
  }, [isSecondaryOpen, onSecondaryToggle, secondaryDiagnosisIds]);

  const scrollDiagnosisIntoView = useCallback((diagnosisId) => {
    const scrollTimer = window.setTimeout(() => {
      document.querySelector(`[data-diagnosis-id="${diagnosisId}"]`)?.scrollIntoView?.({ block: "nearest" });
    }, 0);
    return () => window.clearTimeout(scrollTimer);
  }, []);

  function isInteractionBlocked(nextDiagnosisId = null) {
    if (!dirtyReviewDraftDiagnosisId) return false;
    if (nextDiagnosisId && String(nextDiagnosisId) === String(dirtyReviewDraftDiagnosisId)) return false;
    onReviewInteractionBlocked?.(dirtyReviewDraftDiagnosisId);
    return true;
  }

  useEffect(() => {
    revealSecondaryDiagnosis(forcedExpandedDiagnosisId);
  }, [forcedExpandedDiagnosisId, revealSecondaryDiagnosis]);

  useEffect(() => {
    if (!pendingExpandedDiagnosisId || !secondaryDiagnosisIds.has(pendingExpandedDiagnosisId)) return;
    revealSecondaryDiagnosis(pendingExpandedDiagnosisId);
    scrollDiagnosisIntoView(pendingExpandedDiagnosisId);
    setPendingExpandedDiagnosisId(null);
  }, [pendingExpandedDiagnosisId, revealSecondaryDiagnosis, scrollDiagnosisIntoView, secondaryDiagnosisIds]);

  useEffect(() => {
    if (!selectedRegionKey) return;
    const diagnosisId = selectedRegionKey.split(":")[0];
    setOpenAreaDiagnosisIds((current) => new Set(current).add(diagnosisId));
    revealSecondaryDiagnosis(diagnosisId);
    return scrollDiagnosisIntoView(diagnosisId);
  }, [revealSecondaryDiagnosis, scrollDiagnosisIntoView, selectedRegionKey]);

  useEffect(() => {
    if (!isAddDiagnosisOpen) return undefined;
    addDiagnosisSelectRef.current?.focus();
    return undefined;
  }, [isAddDiagnosisOpen]);

  function handlePanelStartRegion(diagnosis, region) {
    if (isInteractionBlocked(diagnosis.id)) return;
    revealSecondaryDiagnosis(diagnosis.id);
    if (region) handleAreaListOpenChange(diagnosis.id, true);
    onStartRegion(diagnosis, region);
  }

  function handlePanelReviewDraftChange(diagnosisId, draft) {
    if (draft?.isOpen) revealSecondaryDiagnosis(diagnosisId);
    onReviewDraftChange?.(diagnosisId, draft);
  }

  function handleAddDiagnosisToggle(open) {
    if (open && isInteractionBlocked()) return;
    setIsAddDiagnosisOpen(open);
    if (open && !isSecondaryOpen) onSecondaryToggle?.(true);
    if (!open) window.setTimeout(() => addDiagnosisTriggerRef.current?.focus(), 0);
  }

  async function handleSelectDiagnosis(diagnosisName) {
    if (isInteractionBlocked()) return;
    setName(diagnosisName || "");
    if (!diagnosisName) return;
    const addedDiagnosis = await onAdd({
      name: diagnosisName,
      is_abnormal: true,
      region_x: null,
      region_y: null,
      region_width: null,
      region_height: null,
    });
    if (addedDiagnosis) {
      setName("");
      setIsAddDiagnosisOpen(false);
      setPendingExpandedDiagnosisId(String(addedDiagnosis.id));
    }
  }

  function handleSecondaryToggle(open) {
    if (isInteractionBlocked()) return;
    onSecondaryToggle?.(open);
  }

  function handleExpandedDiagnosisChange(values) {
    const nextDiagnosisId = values.at(-1) || null;
    if (isInteractionBlocked(nextDiagnosisId)) return;
    setExpandedDiagnosisId(nextDiagnosisId);
    if (nextDiagnosisId) scrollDiagnosisIntoView(nextDiagnosisId);
  }

  function handleAreaListOpenChange(diagnosisId, open) {
    const key = String(diagnosisId);
    setOpenAreaDiagnosisIds((current) => {
      const next = new Set(current);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  const sharedCardProps = {
    activeRegionTarget,
    aiModeEnabled,
    isBusy,
    onEditRegion,
    onRemove,
    onRemoveRegion,
    onRegionHover,
    onRegionSelect,
    onReview,
    onReviewInteractionBlocked,
    onReviewDraftChange: handlePanelReviewDraftChange,
    onStartRegion: handlePanelStartRegion,
    hoveredRegionKey,
    selectedRegionKey,
  };

  return (
    <div className="flex flex-col gap-4">
      <section aria-label={isGeneralReviewDay ? "Revalidação geral" : "Diagnóstico do dia"} className="flex flex-col gap-2" role="region">
        {isGeneralReviewDay ? (
          <div className="px-0.5">
            <h2 className="font-heading text-base font-medium">Revalidação geral</h2>
            <p className="text-xs text-muted-foreground">Revise todos os diagnósticos originais deste exame.</p>
          </div>
        ) : null}
        {requiredDiagnoses.length ? requiredDiagnoses.map((diagnosis) => (
          <DiagnosisCard {...sharedCardProps} decisionFeedback={decisionFeedbacks[String(diagnosis.id)]} diagnosis={diagnosis} diagnosisReference={getDiagnosisReference(diagnosisReferences, diagnosis.id)} isAreaListOpen={openAreaDiagnosisIds.has(String(diagnosis.id))} isRequired key={diagnosis.id} onAreaListOpenChange={(open) => handleAreaListOpenChange(diagnosis.id, open)} regionError={regionErrors[String(diagnosis.id)]} reviewDraft={reviewDrafts[String(diagnosis.id)]} />
        )) : <p className="text-sm text-muted-foreground">Nenhum diagnóstico do dia configurado para este ECG.</p>}
      </section>

      {secondaryDiagnoses.length || options.length ? (
        <Collapsible onOpenChange={handleSecondaryToggle} open={Boolean(isSecondaryOpen)}>
          <Card className="gap-0 overflow-hidden" size="sm">
              <CardHeader className="items-center">
                <CardTitle>Diagnósticos adicionais</CardTitle>
                <CardAction className="row-span-1 flex items-center gap-1 self-center">
                  {options.length ? (
                    <Button
                      aria-controls={addDiagnosisContentId}
                      aria-expanded={isAddDiagnosisOpen}
                      aria-label="Adicionar diagnóstico"
                      onClick={() => handleAddDiagnosisToggle(!isAddDiagnosisOpen)}
                      size="sm"
                      type="button"
                      variant="ghost"
                      ref={addDiagnosisTriggerRef}
                    >
                      <Plus aria-hidden="true" data-icon="inline-start" />
                      Adicionar
                    </Button>
                  ) : null}
                  <CollapsibleTrigger render={<Button aria-label={isSecondaryOpen ? "Recolher opcionais" : "Expandir opcionais"} className="mr-px" size="icon-sm" type="button" variant="ghost" />}>
                    <ChevronDown aria-hidden="true" className={cn("transition-transform", isSecondaryOpen && "rotate-180")} />
                  </CollapsibleTrigger>
                </CardAction>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="border-t px-0 py-0">
                {secondaryDiagnoses.length ? (
                  <div className="grid max-h-[min(32svh,20rem)] grid-rows-[minmax(0,1fr)]" data-testid="optional-diagnoses-scroll-boundary">
                    <ScrollArea className="min-h-0" data-testid="optional-diagnoses-scroll">
                      <Accordion
                        onValueChange={handleExpandedDiagnosisChange}
                        value={(forcedExpandedDiagnosisId ?? expandedDiagnosisId) ? [String(forcedExpandedDiagnosisId ?? expandedDiagnosisId)] : []}
                      >
                      {secondaryDiagnoses.map((diagnosis) => {
                        const diagnosisId = String(diagnosis.id);
                        const diagnosisReference = getDiagnosisReference(diagnosisReferences, diagnosis.id);
                        const status = getDiagnosisReviewStatus(diagnosis);
                        const standardText = diagnosis.standard_text || diagnosis.name;
                        return (
                          <AccordionItem className="px-3" data-diagnosis-id={diagnosis.id} key={diagnosis.id} value={diagnosisId}>
                            <AccordionTrigger className={cn(
                              "cursor-pointer gap-2 py-2.5 hover:bg-muted/50 hover:no-underline",
                              hoveredRegionKey?.startsWith(`${diagnosis.id}:`) && !selectedRegionKey?.startsWith(`${diagnosis.id}:`) && "bg-accent/60",
                              selectedRegionKey?.startsWith(`${diagnosis.id}:`) && "bg-accent ring-2 ring-inset ring-ring/30",
                            )}>
                              <span className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                                {diagnosisReference ? <Badge variant="outline">{diagnosisReference}</Badge> : null}
                                <span className="line-clamp-2 min-w-0 break-words text-left" title={standardText}>{standardText}</span>
                                <DiagnosisStatusBadge diagnosis={diagnosis} status={status} />
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="flex flex-col gap-3 border-t pt-2">
                              <DiagnosisBadges aiModeEnabled={aiModeEnabled} diagnosis={diagnosis} isRequired={false} />
                              <DiagnosisDetails {...sharedCardProps} decisionFeedback={decisionFeedbacks[diagnosisId]} diagnosis={diagnosis} diagnosisReference={diagnosisReference} hoveredRegionKey={hoveredRegionKey} isAreaListOpen={openAreaDiagnosisIds.has(diagnosisId)} onAreaListOpenChange={(open) => handleAreaListOpenChange(diagnosis.id, open)} regionError={regionErrors[diagnosisId]} reviewDraft={reviewDrafts[diagnosisId]} selectedRegionKey={selectedRegionKey} />
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                      </Accordion>
                    </ScrollArea>
                  </div>
                ) : null}

                {options.length ? (
                  <Collapsible onOpenChange={handleAddDiagnosisToggle} open={isAddDiagnosisOpen}>
                    <CollapsibleContent id={addDiagnosisContentId}>
                      <div className="flex items-start gap-2 border-t p-2">
                        <Field>
                          <FieldLabel className="sr-only" htmlFor="new-diagnosis-select">Adicionar diagnóstico</FieldLabel>
                          <Select disabled={isBusy} items={selectItems} onValueChange={handleSelectDiagnosis} value={name || null}>
                            <SelectTrigger className="w-full" id="new-diagnosis-select" ref={addDiagnosisSelectRef}><SelectValue placeholder="Selecione um diagnóstico padronizado" /></SelectTrigger>
                            <SelectContent align="start"><SelectGroup>{selectItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
                          </Select>
                        </Field>
                        <Button aria-label="Cancelar adição" onClick={() => handleAddDiagnosisToggle(false)} size="icon-sm" type="button" variant="ghost"><X aria-hidden="true" /></Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ) : null}
                </CardContent>
              </CollapsibleContent>
            </Card>
        </Collapsible>
      ) : null}
    </div>
  );
}
