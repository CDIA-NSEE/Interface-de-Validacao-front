import { Check, ChevronDown, MapPinned, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  return count === 1 ? "1 área" : `${count} áreas`;
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
  onDisagreementPreviewChange,
  onStartRegion,
}) {
  const status = getDiagnosisReviewStatus(diagnosis);
  const standardText = diagnosis.standard_text || diagnosis.name;
  const originalText = diagnosis.original_text || diagnosis.name;
  const regions = diagnosis.regions || [];
  const isRegionTarget = activeRegionTarget?.diagnosisId === diagnosis.id;
  const originalPreview = getOriginalTextPreview(originalText);
  const shouldShowOriginal = diagnosis.source === "original" && Boolean(originalText);
  const [isDisagreementOpen, setIsDisagreementOpen] = useState(false);
  const [reviewNoteDraft, setReviewNoteDraft] = useState(diagnosis.review_notes || "");
  const visualStatus = getDiagnosisVisualStatus(diagnosis, isDisagreementOpen ? "rejected" : null);
  const canSaveDisagreement = hasDisagreementNote(reviewNoteDraft);
  const decisionValue = visualStatus === "pending" ? [] : [visualStatus];

  useEffect(() => {
    setReviewNoteDraft(diagnosis.review_notes || "");
  }, [diagnosis.review_notes]);

  useEffect(() => {
    const hasUnsavedNote = isDisagreementOpen && reviewNoteDraft !== (diagnosis.review_notes || "");
    onReviewDraftChange?.(diagnosis.id, hasUnsavedNote);
    return () => onReviewDraftChange?.(diagnosis.id, false);
  }, [diagnosis.id, diagnosis.review_notes, isDisagreementOpen, onReviewDraftChange, reviewNoteDraft]);

  useEffect(
    () => () => onDisagreementPreviewChange?.(diagnosis.id, false),
    [diagnosis.id, onDisagreementPreviewChange],
  );

  function setDisagreementPanelOpen(isOpen) {
    setIsDisagreementOpen(isOpen);
    onDisagreementPreviewChange?.(diagnosis.id, isOpen);
  }

  function openDisagreementPanel() {
    setReviewNoteDraft(diagnosis.review_notes || "");
    setDisagreementPanelOpen(true);
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
    <Card
      className={cn(
        "gap-3 overflow-visible",
        visualStatus === "confirmed" && "ring-success/35",
        visualStatus === "rejected" && "ring-destructive/35",
        isRegionTarget && "ring-2 ring-info/50",
      )}
      data-testid="diagnosis-card"
      size="sm"
    >
      <CardHeader>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {isRequired ? <Badge variant="info">Diagnóstico do dia</Badge> : null}
          {diagnosis.source === "doctor_added" ? <Badge variant="secondary">Adicionado</Badge> : null}
          {diagnosis.is_grouped ? <Badge variant="outline">Agrupado</Badge> : null}
          {diagnosis.region_required_missing ? <Badge variant="warning">Área obrigatória</Badge> : null}
        </div>
        <CardTitle className="flex min-w-0 items-start gap-2">
          {diagnosisReference ? <Badge className="mt-0.5" variant="outline">{diagnosisReference}</Badge> : null}
          <span className="min-w-0 break-words" title={`Texto padrão: ${standardText}`}>{standardText}</span>
        </CardTitle>
        <CardDescription>
          {isDisagreementOpen ? "Discordância em edição" : REVIEW_LABELS[status] || REVIEW_LABELS.pending}
        </CardDescription>
        {diagnosis.source === "doctor_added" ? (
          <CardAction>
            <Tooltip>
              <TooltipTrigger
                render={<Button aria-label={`Remover ${diagnosis.name}`} disabled={isBusy} onClick={() => onRemove(diagnosis.id)} size="icon-sm" type="button" variant="destructive" />}
              >
                <Trash2 aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>Remover diagnóstico médico</TooltipContent>
            </Tooltip>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
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
          <Alert variant="warning">
            <AlertTitle>Observação</AlertTitle>
            <AlertDescription className="break-words">{diagnosis.review_notes}</AlertDescription>
            <Button className="mt-2 w-fit" disabled={isBusy} onClick={openDisagreementPanel} size="sm" type="button" variant="ghost">Editar observação</Button>
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

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button aria-pressed={isRegionTarget} className="sm:w-auto" disabled={isBusy} onClick={() => onStartRegion(diagnosis)} size="sm" type="button" variant={isRegionTarget ? "secondary" : "outline"}>
            <MapPinned aria-hidden="true" data-icon="inline-start" />
            Marcar área
          </Button>
          <ToggleGroup aria-label={`Revisão de ${standardText}`} className="grid flex-1 grid-cols-2" disabled={isBusy || diagnosis.source === "doctor_added"} onValueChange={handleDecisionChange} spacing={1} value={decisionValue} variant="outline">
            <ToggleGroupItem className="w-full" value="confirmed"><Check aria-hidden="true" data-icon="inline-start" />Concordo</ToggleGroupItem>
            <ToggleGroupItem className="w-full" value="rejected"><X aria-hidden="true" data-icon="inline-start" />Discordo</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {status === "rejected" && !diagnosis.review_notes && !isDisagreementOpen && diagnosis.source !== "doctor_added" ? (
          <Button className="w-fit" disabled={isBusy} onClick={openDisagreementPanel} size="sm" type="button" variant="ghost">Adicionar observação</Button>
        ) : null}

        {isDisagreementOpen ? (
          <Alert variant="warning">
            <AlertTitle className="flex items-center justify-between gap-2">
              Observação da discordância
              <Button aria-label="Cancelar observação" disabled={isBusy} onClick={() => setDisagreementPanelOpen(false)} size="icon-sm" type="button" variant="ghost"><X aria-hidden="true" /></Button>
            </AlertTitle>
            <AlertDescription className="mt-2 flex flex-col gap-2">
              <Field>
                <FieldLabel htmlFor={`disagreement-note-${diagnosis.id}`}>Motivo <span className="font-normal text-muted-foreground">(opcional)</span></FieldLabel>
                <Textarea id={`disagreement-note-${diagnosis.id}`} onChange={(event) => setReviewNoteDraft(event.target.value)} placeholder="Registre o motivo da discordância, se necessário" rows={3} value={reviewNoteDraft} />
              </Field>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button disabled={isBusy || !canSaveDisagreement} onClick={() => submitDisagreement(reviewNoteDraft)} size="sm" type="button">Salvar discordância</Button>
                <Button disabled={isBusy} onClick={() => submitDisagreement("")} size="sm" type="button" variant="outline">Discordar sem observação</Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
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
  onDisagreementPreviewChange,
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
    () => getDiagnosisDisplayGroups(diagnoses, { dailyStandardDiagnosis, isGeneralReviewDay }),
    [dailyStandardDiagnosis, diagnoses, isGeneralReviewDay],
  );
  const selectItems = useMemo(() => options.map((option) => ({ label: option, value: option })), [options]);

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

  const hasSecondaryContent = optionalDiagnoses.length > 0 || doctorDiagnoses.length > 0 || options.length > 0 || selectedRegion;
  const secondarySummary = `${optionalDiagnoses.length} no ECG · ${doctorDiagnoses.length} adicionados`;
  const sharedCardProps = {
    activeRegionTarget,
    isBusy,
    onEditRegion,
    onRemove,
    onRemoveRegion,
    onReview,
    onReviewDraftChange: handleReviewDraftChange,
    onDisagreementPreviewChange,
    onStartRegion,
  };

  return (
    <div className="flex flex-col gap-4">
      {aiRecommendationText ? (
        <Alert variant="info"><Sparkles aria-hidden="true" /><AlertTitle>Recomendação da IA</AlertTitle><AlertDescription>{aiRecommendationText}</AlertDescription></Alert>
      ) : null}

      <Card
        aria-label={isGeneralReviewDay ? "Revalidação geral" : "Diagnóstico do dia"}
        role="region"
      >
        <CardHeader className="border-b">
          <CardTitle>{isGeneralReviewDay ? "Revalidação geral" : "Diagnóstico do dia"}</CardTitle>
          <CardDescription>{isGeneralReviewDay ? "Revise todos os diagnósticos originais deste exame." : "Um único diagnóstico obrigatório para esta validação."}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {requiredDiagnoses.length ? requiredDiagnoses.map((diagnosis) => (
            <DiagnosisCard {...sharedCardProps} diagnosis={diagnosis} diagnosisReference={getDiagnosisReference(diagnosisReferences, diagnosis.id)} isRequired key={diagnosis.id} />
          )) : <p className="text-sm text-muted-foreground">Nenhum diagnóstico do dia configurado para este ECG.</p>}
        </CardContent>
      </Card>

      {hasSecondaryContent ? (
        <Collapsible onOpenChange={onSecondaryToggle} open={Boolean(isSecondaryOpen)}>
          <Card>
            <CardHeader>
              <CardTitle>Opcionais e adicionar</CardTitle>
              <CardDescription>{secondarySummary}</CardDescription>
              <CardAction>
                <CollapsibleTrigger render={<Button aria-label={isSecondaryOpen ? "Recolher opcionais" : "Expandir opcionais"} size="icon-sm" type="button" variant="ghost" />}>
                  <ChevronDown aria-hidden="true" className={cn("transition-transform", isSecondaryOpen && "rotate-180")} />
                </CollapsibleTrigger>
              </CardAction>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="flex flex-col gap-3 border-t pt-4">
                {optionalDiagnoses.map((diagnosis) => <DiagnosisCard {...sharedCardProps} diagnosis={diagnosis} diagnosisReference={getDiagnosisReference(diagnosisReferences, diagnosis.id)} isRequired={false} key={diagnosis.id} />)}
                {options.length ? (
                  <Field>
                    <FieldLabel htmlFor="new-diagnosis-select">Adicionar diagnóstico</FieldLabel>
                    <Select disabled={isBusy} items={selectItems} onValueChange={handleSelectDiagnosis} value={name || null}>
                      <SelectTrigger className="w-full" id="new-diagnosis-select"><SelectValue placeholder="Selecione um diagnóstico" /></SelectTrigger>
                      <SelectContent align="start"><SelectGroup>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                  </Field>
                ) : null}
                {selectedRegion ? <Alert variant="info"><MapPinned aria-hidden="true" /><AlertTitle>Região selecionada</AlertTitle><AlertDescription>O próximo diagnóstico adicionado será associado a esta área.</AlertDescription></Alert> : null}
                {doctorDiagnoses.map((diagnosis) => <DiagnosisCard {...sharedCardProps} diagnosis={diagnosis} diagnosisReference={getDiagnosisReference(diagnosisReferences, diagnosis.id)} isRequired={false} key={diagnosis.id} />)}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ) : null}
    </div>
  );
}
