import { Bot, Check, ChevronDown, MapPinned, Pencil, Trash2, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

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
          <Bot aria-hidden="true" data-icon="inline-start" />
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
  const cardVariant = isRegionTarget
    ? "info"
    : visualStatus === "confirmed"
      ? "success"
      : visualStatus === "rejected"
        ? "destructive"
        : "default";

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
    <Card
      className={cn("gap-3 overflow-visible", isRegionTarget && "ring-2")}
      data-testid="diagnosis-card"
      size="sm"
      variant={cardVariant}
    >
      <CardHeader>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {isRequired ? <Badge variant="info">Diagnóstico do dia</Badge> : null}
          {aiModeEnabled && diagnosis.ai_suggested ? <AiAgreementBadge /> : null}
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
          <Alert variant="destructive">
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

        <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11.5rem),1fr))]">
          <Button aria-pressed={isRegionTarget} className="w-full" disabled={isBusy} onClick={() => onStartRegion(diagnosis)} size="sm" type="button" variant={isRegionTarget ? "secondary" : "outline"}>
            <MapPinned aria-hidden="true" data-icon="inline-start" />
            Marcar área
          </Button>
          <ToggleGroup aria-label={`Revisão de ${standardText}`} className="grid w-full grid-cols-2" disabled={isBusy || diagnosis.source === "doctor_added"} onValueChange={handleDecisionChange} spacing={1} value={decisionValue}>
            <ToggleGroupItem className="w-full min-w-0 px-1.5" value="confirmed" variant="success"><Check aria-hidden="true" data-icon="inline-start" />Concordo</ToggleGroupItem>
            <ToggleGroupItem className="w-full min-w-0 px-1.5" value="rejected" variant="destructive"><X aria-hidden="true" data-icon="inline-start" />Discordo</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {status === "rejected" && !diagnosis.review_notes && !isDisagreementOpen && diagnosis.source !== "doctor_added" ? (
          <Button className="w-fit" disabled={isBusy} onClick={openDisagreementPanel} size="sm" type="button" variant="ghost">Adicionar observação</Button>
        ) : null}

        {isDisagreementOpen ? (
          <Alert variant="destructive">
            <AlertTitle className="flex items-center justify-between gap-2">
              Observação da discordância
              <Button aria-label="Cancelar observação" disabled={isBusy} onClick={() => setDisagreementPanelOpen(false)} size="icon-sm" type="button" variant="ghost"><X aria-hidden="true" /></Button>
            </AlertTitle>
            <AlertDescription className="mt-2 flex flex-col gap-2">
              <Field>
                <FieldLabel htmlFor={`disagreement-note-${diagnosis.id}`}>Motivo <span className="font-normal text-muted-foreground">(opcional)</span></FieldLabel>
                <Textarea id={`disagreement-note-${diagnosis.id}`} onChange={(event) => onReviewDraftChange?.(diagnosis.id, { isOpen: true, note: event.target.value })} placeholder="Registre o motivo da discordância, se necessário" rows={3} value={reviewNoteDraft} />
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
    aiModeEnabled,
    isBusy,
    onEditRegion,
    onRemove,
    onRemoveRegion,
    onReview,
    onReviewDraftChange,
    onStartRegion,
  };

  return (
    <div className="flex flex-col gap-4">
      <Card
        aria-label={isGeneralReviewDay ? "Revalidação geral" : "Diagnóstico do dia"}
        role="region"
        variant="highlight"
      >
        <CardHeader className="border-b">
          <CardTitle>{isGeneralReviewDay ? "Revalidação geral" : "Diagnóstico do dia"}</CardTitle>
          <CardDescription>{isGeneralReviewDay ? "Revise todos os diagnósticos originais deste exame." : "Um único diagnóstico obrigatório para esta validação."}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {requiredDiagnoses.length ? requiredDiagnoses.map((diagnosis) => (
            <DiagnosisCard {...sharedCardProps} diagnosis={diagnosis} diagnosisReference={getDiagnosisReference(diagnosisReferences, diagnosis.id)} isRequired key={diagnosis.id} reviewDraft={reviewDrafts[String(diagnosis.id)]} />
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
                {optionalDiagnoses.map((diagnosis) => <DiagnosisCard {...sharedCardProps} diagnosis={diagnosis} diagnosisReference={getDiagnosisReference(diagnosisReferences, diagnosis.id)} isRequired={false} key={diagnosis.id} reviewDraft={reviewDrafts[String(diagnosis.id)]} />)}
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
                {doctorDiagnoses.map((diagnosis) => <DiagnosisCard {...sharedCardProps} diagnosis={diagnosis} diagnosisReference={getDiagnosisReference(diagnosisReferences, diagnosis.id)} isRequired={false} key={diagnosis.id} reviewDraft={reviewDrafts[String(diagnosis.id)]} />)}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ) : null}
    </div>
  );
}
