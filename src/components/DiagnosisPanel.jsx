import { Check, ChevronDown, MapPinned, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getDiagnosisReviewStatus, getDiagnosisVisualStatus } from "../utils/diagnosisRegionVisuals.js";
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

const AI_AGREEMENT_DESCRIPTION =
  "A IA concordou com este diagnóstico. A avaliação médica continua obrigatória.";

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
              variant="info"
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

function regionCountLabel(count) {
  return count === 1 ? "1 área" : `${count} áreas`;
}

function reviewBadgeVariant(status) {
  if (status === "confirmed") return "success";
  if (status === "rejected") return "destructive";
  return "secondary";
}

function diagnosisCardVariant({ isRegionTarget, isRequired }) {
  if (isRegionTarget) return "info";
  if (isRequired) return "highlight";
  return "default";
}

function DiagnosisBadges({ aiModeEnabled, diagnosis, isRequired }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {isRequired ? <Badge variant="info">Diagnóstico do dia</Badge> : null}
      {aiModeEnabled && diagnosis.ai_suggested ? <AiAgreementBadge /> : null}
      {diagnosis.source === "doctor_added" ? <Badge variant="secondary">Adicionado</Badge> : null}
      {diagnosis.is_grouped ? <Badge variant="outline">Agrupado</Badge> : null}
      {diagnosis.region_required_missing ? <Badge variant="warning">Área obrigatória</Badge> : null}
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
  onReview,
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
  const reviewNoteDraft = reviewDraft?.note ?? diagnosis.review_notes ?? "";
  const visualStatus = getDiagnosisVisualStatus(diagnosis, isDisagreementOpen ? "rejected" : null);
  const canSaveDisagreement = hasDisagreementNote(reviewNoteDraft);
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

  async function submitDisagreement(note) {
    const wasReviewed = await onReview(diagnosis.id, "rejected", note);
    if (wasReviewed) setDisagreementPanelOpen(false);
  }

  async function submitAgreement() {
    const wasReviewed = await onReview(diagnosis.id, "confirmed");
    if (wasReviewed) setDisagreementPanelOpen(false);
  }

  function handleDecisionChange(nextValue) {
    const nextDecision = nextValue.at(-1);
    if (nextDecision === "confirmed") submitAgreement();
    if (nextDecision === "rejected") openDisagreementPanel();
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
            Original: {originalPreview}
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
        <div className="flex flex-col gap-2" aria-label={regionCountLabel(regions.length)}>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MapPinned aria-hidden="true" data-icon="inline-start" />
            {regionCountLabel(regions.length)} no ECG
          </div>
          {regions.map((region, index) => {
            const regionReference = getRegionReference(diagnosisReference, index);
            const areaLabel = `Área ${index + 1}`;
            const accessibleAreaLabel = regionReference || areaLabel;
            return (
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-2" key={region.id || `legacy-${index}`}>
                <span className="flex min-w-0 items-center gap-2 text-xs">
                  {regionReference ? <Badge variant="outline">{regionReference}</Badge> : null}
                  <span>{areaLabel}</span>
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button aria-label={`Editar ${accessibleAreaLabel}`} disabled={isBusy} onClick={() => onEditRegion(diagnosis, region)} size="icon-sm" title={`Editar ${accessibleAreaLabel}`} type="button" variant="ghost"><Pencil aria-hidden="true" /></Button>
                  <Button aria-label={`Remover ${accessibleAreaLabel}`} disabled={isBusy || !region.id} onClick={() => onRemoveRegion(diagnosis.id, region.id)} size="icon-sm" title={region.id ? `Remover ${accessibleAreaLabel}` : "Área legada sem id"} type="button" variant="destructive"><Trash2 aria-hidden="true" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <ToggleGroup aria-label={`Revisão de ${standardText}`} className="grid w-full grid-cols-2" disabled={isBusy || diagnosis.source === "doctor_added"} onValueChange={handleDecisionChange} spacing={1} value={decisionValue}>
        <ToggleGroupItem className="w-full min-w-0 px-1.5" value="confirmed" variant="decisionSuccess"><Check aria-hidden="true" data-icon="inline-start" />Concordo</ToggleGroupItem>
        <ToggleGroupItem className="w-full min-w-0 px-1.5" value="rejected" variant="decisionDestructive"><X aria-hidden="true" data-icon="inline-start" />Discordo</ToggleGroupItem>
      </ToggleGroup>

      {diagnosis.region_required_missing ? (
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
      ) : (
        <Button aria-pressed={isRegionTarget} className="w-fit" disabled={isBusy} onClick={() => onStartRegion(diagnosis)} size="sm" type="button" variant={isRegionTarget ? "secondary" : "ghost"}>
          <MapPinned aria-hidden="true" data-icon="inline-start" />
          Marcar área
        </Button>
      )}

      {diagnosis.source === "doctor_added" ? (
        <Button className="w-full" disabled={isBusy} onClick={() => onRemove(diagnosis.id)} size="sm" type="button" variant="destructive">
          <Trash2 aria-hidden="true" data-icon="inline-start" />
          Remover diagnóstico
        </Button>
      ) : null}

      {status === "rejected" && !diagnosis.review_notes && !isDisagreementOpen && diagnosis.source !== "doctor_added" ? (
        <Button className="w-fit" disabled={isBusy} onClick={openDisagreementPanel} size="sm" type="button" variant="ghost">Justificativa (opcional)</Button>
      ) : null}

      {isDisagreementOpen ? (
        <Alert variant="destructive">
          <AlertTitle className="flex items-center justify-between gap-2">
            Justificativa (opcional)
            <Button aria-label="Cancelar justificativa" disabled={isBusy} onClick={() => setDisagreementPanelOpen(false)} size="icon-sm" type="button" variant="ghost"><X aria-hidden="true" /></Button>
          </AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-2">
            <Field>
              <FieldLabel htmlFor={`disagreement-note-${diagnosis.id}`}>Justificativa <span className="font-normal text-muted-foreground">(opcional)</span></FieldLabel>
              <Textarea id={`disagreement-note-${diagnosis.id}`} onChange={(event) => onReviewDraftChange?.(diagnosis.id, { isOpen: true, note: event.target.value })} placeholder="Registre o motivo da discordância, se necessário" rows={3} value={reviewNoteDraft} />
            </Field>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button disabled={isBusy || !canSaveDisagreement} onClick={() => submitDisagreement(reviewNoteDraft)} size="sm" type="button">Salvar discordância</Button>
              <Button disabled={isBusy} onClick={() => submitDisagreement("")} size="sm" type="button" variant="outline">Discordar sem justificativa</Button>
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
  onReview,
  reviewDraft,
  onReviewDraftChange,
  onStartRegion,
}) {
  const status = getDiagnosisReviewStatus(diagnosis);
  const standardText = diagnosis.standard_text || diagnosis.name;
  const isRegionTarget = activeRegionTarget?.diagnosisId === diagnosis.id;
  const isDisagreementOpen = Boolean(reviewDraft?.isOpen);
  const cardVariant = diagnosisCardVariant({ isRegionTarget, isRequired });
  const statusDescription = isDisagreementOpen
    ? "Discordância em edição"
    : status === "pending"
      ? REVIEW_LABELS.pending
      : null;

  return (
    <Card className={cn("gap-3 overflow-visible", isRegionTarget && "ring-2")} data-testid="diagnosis-card" size="sm" variant={cardVariant}>
      <CardHeader>
        <DiagnosisBadges aiModeEnabled={aiModeEnabled} diagnosis={diagnosis} isRequired={isRequired} />
        <CardTitle className="flex min-w-0 items-start gap-2">
          {diagnosisReference ? <Badge className="mt-0.5" variant="outline">{diagnosisReference}</Badge> : null}
          <span className="min-w-0 break-words" title={`Texto padrão: ${standardText}`}>{standardText}</span>
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
          onReview={onReview}
          onReviewDraftChange={onReviewDraftChange}
          onStartRegion={onStartRegion}
          reviewDraft={reviewDraft}
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
  onRegionConsumed,
  onRemove,
  onRemoveRegion,
  onReview,
  onReviewDraftChange,
  onSecondaryToggle,
  onStartRegion,
  options = [],
  reviewDrafts = {},
  selectedRegion,
}) {
  const [name, setName] = useState("");
  const [isAddDiagnosisOpen, setIsAddDiagnosisOpen] = useState(false);
  const [expandedDiagnosisId, setExpandedDiagnosisId] = useState(null);

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
  const openReviewDraftDiagnosisId = secondaryDiagnoses.find(
    (diagnosis) => reviewDrafts[String(diagnosis.id)]?.isOpen,
  )?.id;
  const activeSecondaryDiagnosisId = secondaryDiagnosisIds.has(String(activeRegionTarget?.diagnosisId ?? ""))
    ? activeRegionTarget.diagnosisId
    : null;
  const forcedExpandedDiagnosisId = activeSecondaryDiagnosisId ?? openReviewDraftDiagnosisId;
  const selectItems = useMemo(() => options.map((option) => ({ label: option, value: option })), [options]);

  const revealSecondaryDiagnosis = useCallback((diagnosisId) => {
    const normalizedDiagnosisId = String(diagnosisId);
    if (!secondaryDiagnosisIds.has(normalizedDiagnosisId)) return;
    setExpandedDiagnosisId((current) => current === normalizedDiagnosisId ? current : normalizedDiagnosisId);
    if (!isSecondaryOpen) onSecondaryToggle?.(true);
  }, [isSecondaryOpen, onSecondaryToggle, secondaryDiagnosisIds]);

  useEffect(() => {
    revealSecondaryDiagnosis(forcedExpandedDiagnosisId);
  }, [forcedExpandedDiagnosisId, revealSecondaryDiagnosis]);

  function handlePanelStartRegion(diagnosis, region) {
    revealSecondaryDiagnosis(diagnosis.id);
    onStartRegion(diagnosis, region);
  }

  function handlePanelReviewDraftChange(diagnosisId, draft) {
    if (draft?.isOpen) revealSecondaryDiagnosis(diagnosisId);
    onReviewDraftChange?.(diagnosisId, draft);
  }

  async function handleSelectDiagnosis(diagnosisName) {
    setName(diagnosisName || "");
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

  const secondarySummary = `${optionalDiagnoses.length} no ECG · ${doctorDiagnoses.length} adicionados`;
  const sharedCardProps = {
    activeRegionTarget,
    aiModeEnabled,
    isBusy,
    onEditRegion,
    onRemove,
    onRemoveRegion,
    onReview,
    onReviewDraftChange: handlePanelReviewDraftChange,
    onStartRegion: handlePanelStartRegion,
  };

  return (
    <div className="flex flex-col gap-3">
      <section aria-label={isGeneralReviewDay ? "Revalidação geral" : "Diagnóstico do dia"} className="flex flex-col gap-2" role="region">
        {isGeneralReviewDay ? (
          <div className="px-0.5">
            <h2 className="font-heading text-base font-medium">Revalidação geral</h2>
            <p className="text-xs text-muted-foreground">Revise todos os diagnósticos originais deste exame.</p>
          </div>
        ) : null}
        {requiredDiagnoses.length ? requiredDiagnoses.map((diagnosis) => (
          <DiagnosisCard {...sharedCardProps} diagnosis={diagnosis} diagnosisReference={getDiagnosisReference(diagnosisReferences, diagnosis.id)} isRequired key={diagnosis.id} reviewDraft={reviewDrafts[String(diagnosis.id)]} />
        )) : <p className="text-sm text-muted-foreground">Nenhum diagnóstico do dia configurado para este ECG.</p>}
      </section>

      {secondaryDiagnoses.length || options.length ? (
        <Collapsible onOpenChange={onSecondaryToggle} open={Boolean(isSecondaryOpen)}>
          <Card className="gap-0 overflow-hidden" size="sm">
            <CardHeader>
              <CardTitle>Diagnósticos adicionais</CardTitle>
              <CardDescription>{secondarySummary}</CardDescription>
              <CardAction>
                <CollapsibleTrigger render={<Button aria-label={isSecondaryOpen ? "Recolher opcionais" : "Expandir opcionais"} size="icon-sm" type="button" variant="ghost" />}>
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
                        onValueChange={(values) => setExpandedDiagnosisId(values.at(-1) || null)}
                        value={(forcedExpandedDiagnosisId ?? expandedDiagnosisId) ? [String(forcedExpandedDiagnosisId ?? expandedDiagnosisId)] : []}
                      >
                      {secondaryDiagnoses.map((diagnosis) => {
                        const diagnosisId = String(diagnosis.id);
                        const diagnosisReference = getDiagnosisReference(diagnosisReferences, diagnosis.id);
                        const status = getDiagnosisReviewStatus(diagnosis);
                        const standardText = diagnosis.standard_text || diagnosis.name;
                        return (
                          <AccordionItem className="px-3" key={diagnosis.id} value={diagnosisId}>
                            <AccordionTrigger className="gap-2 py-3 hover:no-underline">
                              <span className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="flex min-w-0 items-start gap-2">
                                  {diagnosisReference ? <Badge variant="outline">{diagnosisReference}</Badge> : null}
                                  <span className="min-w-0 break-words text-left">{standardText}</span>
                                </span>
                                <Badge className="w-fit" variant={reviewBadgeVariant(status)}>{REVIEW_LABELS[status] || REVIEW_LABELS.pending}</Badge>
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="flex flex-col gap-3 border-t pt-3">
                              <DiagnosisBadges aiModeEnabled={aiModeEnabled} diagnosis={diagnosis} isRequired={false} />
                              <DiagnosisDetails {...sharedCardProps} diagnosis={diagnosis} diagnosisReference={diagnosisReference} reviewDraft={reviewDrafts[diagnosisId]} />
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                      </Accordion>
                    </ScrollArea>
                  </div>
                ) : null}

                {secondaryDiagnoses.length && options.length ? <Separator /> : null}

                {options.length ? (
                  <Collapsible onOpenChange={setIsAddDiagnosisOpen} open={isAddDiagnosisOpen}>
                    <div className="p-2">
                      <CollapsibleTrigger render={<Button aria-label="Adicionar diagnóstico" className="w-fit" size="sm" type="button" variant="ghost" />}>
                        <Plus aria-hidden="true" data-icon="inline-start" />
                        Adicionar diagnóstico
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Field className="pt-2">
                          <FieldLabel className="sr-only" htmlFor="new-diagnosis-select">Adicionar diagnóstico</FieldLabel>
                          <Select disabled={isBusy} items={selectItems} onValueChange={handleSelectDiagnosis} value={name || null}>
                            <SelectTrigger className="w-full" id="new-diagnosis-select"><SelectValue placeholder="Selecione um diagnóstico padronizado" /></SelectTrigger>
                            <SelectContent align="start"><SelectGroup>{selectItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
                          </Select>
                        </Field>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ) : null}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ) : null}

      {selectedRegion ? <Alert variant="info"><MapPinned aria-hidden="true" /><AlertTitle>Região selecionada</AlertTitle><AlertDescription>O próximo diagnóstico adicionado será associado a esta área.</AlertDescription></Alert> : null}
    </div>
  );
}
