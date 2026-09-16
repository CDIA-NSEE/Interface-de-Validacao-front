import { Check, ChevronDown, MapPinned, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import ValidationPanelIconLabel from "./ValidationPanelIconLabel.jsx";
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
  ORIGINAL_TEXT_PREVIEW_LIMIT,
  getDiagnosisDisplayGroups,
  getDiagnosisReference,
  getOriginalTextPreview,
  getRegionReference,
  normalizeDiagnosisText,
} from "../utils/diagnosisReferences.js";

const REVIEW_LABELS = {
  pending: "Aguardando decisão",
  confirmed: "Concordo",
  rejected: "Discordo",
};

const AI_AGREEMENT_DESCRIPTION =
  "Sugestão informativa; a decisão permanece médica.";

// Altura e superfície partilhadas pelos toggles de decisão e pelo "Marcar área" na mesma linha do diagnóstico do dia.
// `disabled:opacity-100` evita o "apagão" da linha durante o salvamento; o pointer-events-none continua bloqueando duplo envio.
const DAILY_DECISION_CONTROL_CLASS =
  "h-10 bg-card transition-colors duration-150 disabled:opacity-100 motion-reduce:transition-none dark:bg-card";

const ENTER_ANIMATION_CLASS = "animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none";

// Estilos que variam por layout de DiagnosisDetails. "plain" é a revalidação geral,
// "additional" o acordeão de diagnósticos adicionais e "daily" o cartão do diagnóstico do dia.
const REFINED_DETAILS_STYLES = {
  areaCollapsible: "",
  areaPanel: "h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-200 ease-out data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0 motion-reduce:transition-none",
  areaRow: "border-input bg-background p-1.5 duration-150 motion-reduce:transition-none",
  areaRowHovered: "border-info/50 bg-info/5",
  areaRowSelected: "border-info/70 bg-info/10 ring-1 ring-inset ring-info/30",
  areaSelectButton: "min-h-7 cursor-pointer rounded-md font-medium focus-visible:ring-2 focus-visible:ring-ring/50",
  areaReferenceBadge: "border-info/30 bg-info/10 text-info-subtle-foreground",
  areaActions: "border-l border-border pl-1.5",
  // `disabled:opacity-100` evita o "apagão" durante "Salvando…" (como no diário); bg-card mantém o toggle no mesmo plano do cartão no escuro.
  decisionItem: "bg-card disabled:opacity-100 dark:bg-card",
  markAreaButton: "w-fit border-x-0 px-0 disabled:opacity-100",
  // Marcando área: mesma tinta "info" do diário; -ml-2 mantém o ícone alinhado à margem como no estado inativo.
  markAreaButtonActive: "-ml-2 w-fit bg-info/10 px-2 text-info-subtle-foreground hover:bg-info/14 hover:text-info-subtle-foreground",
  markAreaSize: "sm",
  markAreaVariant: "ghost",
  originalTrigger: "",
  originalLabel: "",
  originalPreview: "text-foreground/75",
  savedJustificationVariant: "default",
  editorVariant: "default",
  editorClass: ENTER_ANIMATION_CLASS,
  editorTextarea: "bg-background text-foreground dark:bg-background",
  optionalLabel: "Opcional",
  enterAnimation: ENTER_ANIMATION_CLASS,
};

const DETAILS_STYLES = {
  plain: {
    areaCollapsible: "",
    areaPanel: "",
    areaRow: "",
    areaRowHovered: "bg-accent/60",
    areaRowSelected: "bg-accent ring-2 ring-ring/30",
    areaSelectButton: "",
    areaReferenceBadge: "",
    areaActions: "",
    decisionItem: "",
    markAreaButton: "w-fit border-x-0 px-0",
    markAreaButtonActive: "w-fit border-x-0 px-0",
    markAreaSize: "sm",
    markAreaVariant: "ghost",
    originalTrigger: "",
    originalLabel: "",
    originalPreview: "",
    savedJustificationVariant: "default",
    editorVariant: "destructive",
    editorClass: "",
    editorTextarea: "",
    optionalLabel: "(opcional)",
    enterAnimation: "",
  },
  additional: REFINED_DETAILS_STYLES,
  daily: {
    ...REFINED_DETAILS_STYLES,
    areaCollapsible: "border-t pt-1.5",
    decisionItem: cn("gap-1.5 border-input", DAILY_DECISION_CONTROL_CLASS),
    // Utilitário secundário: borda e texto mais leves que os toggles de decisão, mesma altura para alinhar a linha.
    markAreaButton: cn("shrink-0 border-border text-muted-foreground hover:border-input hover:text-foreground active:translate-y-0", DAILY_DECISION_CONTROL_CLASS),
    // Marcando área: mesma tinta "info" que o cartão recebe, mantendo a borda para não mudar de forma.
    markAreaButtonActive: "h-10 shrink-0 border-info/60 bg-info/10 text-info-subtle-foreground hover:bg-info/14 hover:text-info-subtle-foreground active:translate-y-0",
    markAreaSize: "lg",
    markAreaVariant: "outline",
    originalTrigger: "active:translate-y-0 motion-reduce:transition-none",
    savedJustificationVariant: "default",
    editorVariant: "default",
    editorClass: ENTER_ANIMATION_CLASS,
  },
};

// Sem tooltip nem foco: o badge é autoexplicativo e o tooltip cobria o título (o cartão encosta no topo do viewport).
// A descrição segue disponível para leitores de tela.
function AiAgreementBadge() {
  const descriptionId = useId();

  return (
    <>
      <Badge aria-describedby={descriptionId} aria-label="IA concordou" variant="ai">
        <Sparkles aria-hidden="true" data-icon="inline-start" />
        IA concordou
      </Badge>
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

// `compact` encurta o pendente para "Pendente" nas linhas da lista (libera ~75px para o título); o nome acessível segue completo.
function DiagnosisStatusBadge({ compact = false, diagnosis, status, useRefinedLayout = false }) {
  if (diagnosis?.source === "doctor_added") {
    return (
      <Badge className="shrink-0" variant={diagnosis.region_required_missing ? "warning" : "secondary"}>
        {diagnosis.region_required_missing ? "Área necessária" : "Adicionado"}
      </Badge>
    );
  }

  return (
    <Badge className={cn(
      "shrink-0",
      useRefinedLayout && status === "pending" && "border-transparent bg-transparent font-normal text-muted-foreground",
      useRefinedLayout && status !== "pending" && "font-semibold",
      useRefinedLayout && status === "confirmed" && "border-success/50 bg-success/10",
      useRefinedLayout && status === "rejected" && "border-destructive/50",
    )} variant={reviewBadgeVariant(status)}>
      {compact && status === "pending"
        ? <><span aria-hidden="true">Pendente</span><span className="sr-only">{REVIEW_LABELS.pending}</span></>
        : REVIEW_LABELS[status]}
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
  isPrimaryDaily,
  isAdditional = false,
  isAreaListOpen,
  onAreaListOpenChange,
  decisionFeedback,
  reviewDraft,
  onReviewDraftChange,
  onStartRegion,
}) {
  const layout = isPrimaryDaily ? "daily" : isAdditional ? "additional" : "plain";
  const styles = DETAILS_STYLES[layout];
  const isPlain = layout === "plain";
  const disagreementLabelId = useId();
  const status = getDiagnosisReviewStatus(diagnosis);
  const standardText = diagnosis.standard_text || diagnosis.name;
  const originalText = diagnosis.original_text || diagnosis.name;
  const regions = diagnosis.regions || [];
  const isRegionTarget = activeRegionTarget?.diagnosisId === diagnosis.id;
  const originalPreview = getOriginalTextPreview(originalText);
  // No adicional, "Original:" igual ao título (ignorando caixa/acentos) não ajuda a decisão e só ocupa uma linha.
  const isOriginalRedundant = isAdditional && normalizeDiagnosisText(originalText) === normalizeDiagnosisText(standardText);
  const shouldShowOriginal = diagnosis.source === "original" && Boolean(originalText) && !isOriginalRedundant;
  // Só vira botão com tooltip quando o preview realmente esconde parte do texto; caso contrário é texto simples (sem parada de Tab).
  const isOriginalTruncated = Array.from(originalText.replace(/\s+/g, " ").trim()).length > ORIGINAL_TEXT_PREVIEW_LIMIT;
  const isDisagreementOpen = Boolean(reviewDraft?.isOpen);
  const savedReviewNote = diagnosis.review_notes || "";
  const reviewNoteDraft = reviewDraft?.note ?? diagnosis.review_notes ?? "";
  const isReviewDraftDirty = isDisagreementOpen && reviewNoteDraft !== savedReviewNote;
  const visualStatus = getDiagnosisVisualStatus(diagnosis, isDisagreementOpen ? "rejected" : null);
  // Decisão otimista: o toggle fica pressionado no clique e volta ao status do servidor se o salvamento falhar.
  const [pendingDecision, setPendingDecision] = useState(null);
  const decisionValue = pendingDecision ? [pendingDecision] : visualStatus === "pending" ? [] : [visualStatus];

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
    if (nextDecision !== "confirmed" && nextDecision !== "rejected") return;
    setPendingDecision(nextDecision);
    const submit = nextDecision === "confirmed" ? submitAgreement() : submitDisagreement(savedReviewNote);
    submit.finally(() => setPendingDecision(null));
  }

  const originalContent = shouldShowOriginal ? (
    <span className="min-w-0 truncate text-xs font-normal text-muted-foreground">
      <span className={styles.originalLabel}>Original:</span>{" "}
      <span className={styles.originalPreview}>{originalPreview}</span>
    </span>
  ) : null;
  const originalLine = !originalContent ? null : !isOriginalTruncated ? (
    <span className="flex min-w-0 max-w-full">{originalContent}</span>
  ) : (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            className={cn("h-auto w-fit max-w-full cursor-help justify-start truncate px-0 py-0 hover:bg-transparent hover:text-foreground", styles.originalTrigger)}
            size="sm"
            type="button"
            variant="ghost"
          />
        }
      >
        {originalContent}
      </TooltipTrigger>
      <TooltipContent>{originalText}</TooltipContent>
    </Tooltip>
  );

  const savedJustificationContent = !isPlain && !isDisagreementOpen && status === "rejected" && diagnosis.review_notes ? (
    <Alert aria-label="Justificativa adicionada" className={cn("grid-cols-[minmax(0,1fr)_auto] items-center gap-2", styles.enterAnimation)} role="group" variant={styles.savedJustificationVariant}>
      <AlertTitle className="min-w-0 truncate">Justificativa adicionada</AlertTitle>
      <Button disabled={isBusy} onClick={openDisagreementPanel} size="sm" type="button" variant="ghost">Editar</Button>
    </Alert>
  ) : null;

  const regionListContent = regions.length ? (
    <Collapsible className={styles.areaCollapsible} onOpenChange={onAreaListOpenChange} open={isAreaListOpen}>
      <div className="flex items-center">
      <CollapsibleTrigger
        aria-label={markedRegionCountLabel(regions.length)}
        className="flex min-h-8 min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-[0.8rem] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 motion-reduce:transition-none"
      >
        <span>{markedRegionCountLabel(regions.length)}</span>
        <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center [&_svg]:size-4">
          <ChevronDown className={cn("transition-transform duration-200 ease-out motion-reduce:transition-none", isAreaListOpen && "rotate-180")} />
        </span>
      </CollapsibleTrigger>
        <div className="flex shrink-0 items-center border-l px-2">
        <Button aria-pressed={isRegionTarget} disabled={isBusy} onClick={() => onStartRegion(diagnosis)} size="sm" type="button" variant={isRegionTarget ? "secondary" : "ghost"}>
          <ValidationPanelIconLabel icon={Plus}>Adicionar área</ValidationPanelIconLabel>
        </Button>
        </div>
      </div>
      <CollapsibleContent className={styles.areaPanel}>
      {/* O espaçamento fica dentro do painel para entrar na altura animada e sumir junto com ela. */}
      <div className="flex flex-col gap-2 pt-2">
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
              styles.areaRow,
              isHovered && !isSelected && styles.areaRowHovered,
              isSelected && styles.areaRowSelected,
            )}
            key={regionKey}
            onBlur={() => onRegionHover?.(null)}
            onFocus={() => onRegionHover?.(regionKey)}
            onMouseEnter={() => onRegionHover?.(regionKey)}
            onMouseLeave={() => onRegionHover?.(null)}
          >
            <button
              aria-pressed={isSelected}
              className={cn("flex min-w-0 flex-1 items-center gap-2 text-left text-xs outline-none", styles.areaSelectButton)}
              onClick={() => onRegionSelect?.(regionKey)}
              type="button"
            >
              {regionReference ? <Badge className={cn("rounded-md", styles.areaReferenceBadge)} variant="outline">{regionReference}</Badge> : null}
              <span>{areaLabel}</span>
            </button>
            <div className={cn("flex shrink-0 items-center gap-1", styles.areaActions)}>
              <Button aria-label={`Editar ${accessibleAreaLabel}`} disabled={isBusy} onClick={() => onEditRegion(diagnosis, region)} size="icon-sm" title={`Editar ${accessibleAreaLabel}`} type="button" variant="ghost"><Pencil aria-hidden="true" /></Button>
              <Button className="text-muted-foreground hover:text-destructive focus-visible:text-destructive" aria-label={`Remover ${accessibleAreaLabel}`} disabled={isBusy || !region.id} onClick={() => onRemoveRegion(diagnosis.id, region.id)} size="icon-sm" title={region.id ? `Remover ${accessibleAreaLabel}` : "Área legada sem id"} type="button" variant="ghost"><Trash2 aria-hidden="true" /></Button>
            </div>
          </div>
        );
      })}
      </div>
      </CollapsibleContent>
    </Collapsible>
  ) : null;

  const decisionToggle = diagnosis.source !== "doctor_added" ? (
    <ToggleGroup aria-label={`Revisão de ${standardText}`} className="grid w-full min-w-0 flex-1 grid-cols-2" disabled={isBusy} onValueChange={handleDecisionChange} size={isPrimaryDaily ? "lg" : undefined} spacing={isPrimaryDaily ? 2 : 1} value={decisionValue}>
      <ToggleGroupItem className={cn("w-full min-w-0 px-1.5", styles.decisionItem)} value="confirmed" variant="decisionSuccess"><Check aria-hidden="true" data-icon="inline-start" />Concordo</ToggleGroupItem>
      <ToggleGroupItem className={cn("w-full min-w-0 px-1.5", styles.decisionItem)} value="rejected" variant="decisionDestructive"><X aria-hidden="true" data-icon="inline-start" />Discordo</ToggleGroupItem>
    </ToggleGroup>
  ) : null;

  const showPlainMarkAreaButton = !regions.length && !diagnosis.region_required_missing;
  const plainMarkAreaButton = showPlainMarkAreaButton ? (
    <Button
      aria-pressed={isRegionTarget}
      className={isRegionTarget ? styles.markAreaButtonActive : styles.markAreaButton}
      disabled={isBusy}
      onClick={() => onStartRegion(diagnosis)}
      size={styles.markAreaSize}
      type="button"
      variant={isRegionTarget && isPlain ? "secondary" : styles.markAreaVariant}
    >
      {/* No cartão do dia o ícone segue o tamanho/gap dos toggles (16px) para alinhar com Check/X na mesma linha. */}
      {isPrimaryDaily
        ? <><MapPinned aria-hidden="true" data-icon="inline-start" />Marcar área</>
        : <ValidationPanelIconLabel icon={MapPinned}>Marcar área</ValidationPanelIconLabel>}
    </Button>
  ) : null;
  // No diagnóstico do dia, o botão de área divide a linha com a decisão; nos demais fica abaixo.
  const inlineMarkAreaButton = isPrimaryDaily ? plainMarkAreaButton : null;

  return (
    <div className="flex flex-col gap-2">
      {originalLine}

      {isPlain && status === "rejected" && diagnosis.review_notes ? (
        <Alert>
          <AlertTitle>Justificativa registrada</AlertTitle>
          <AlertDescription className="break-words">{diagnosis.review_notes}</AlertDescription>
          <Button className="mt-2 w-fit" disabled={isBusy} onClick={openDisagreementPanel} size="sm" type="button" variant="ghost">Editar justificativa</Button>
        </Alert>
      ) : null}

      {isPlain ? regionListContent : null}

      {decisionToggle && inlineMarkAreaButton ? (
        <div className="flex items-center gap-2">
          {decisionToggle}
          {inlineMarkAreaButton}
        </div>
      ) : decisionToggle}

      {decisionFeedback && (isPlain || decisionFeedback.type === "error") ? (
        <p className={cn("text-xs", decisionFeedback.type === "error" ? "text-destructive" : "text-muted-foreground")} role={decisionFeedback.type === "error" ? "alert" : "status"}>
          {decisionFeedback.message}
        </p>
      ) : null}

      {!isPlain ? regionListContent : null}

      {!regions.length && diagnosis.region_required_missing ? (
        isAdditional ? (
          // Uma linha: o badge "Área necessária" já explica; aqui só o aviso curto e a ação.
          // O ícone vai num span para não acionar o grid de duas linhas do Alert (has-[>svg]).
          <Alert className="grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2" variant="warning">
            <span aria-hidden="true" className="flex size-4 items-center justify-center [&_svg]:size-4"><MapPinned /></span>
            <AlertTitle className="min-w-0 truncate">Área obrigatória no ECG</AlertTitle>
            <Button aria-pressed={isRegionTarget} disabled={isBusy} onClick={() => onStartRegion(diagnosis)} size="sm" type="button" variant={isRegionTarget ? "secondary" : "outline"}>
              <ValidationPanelIconLabel icon={MapPinned}>Marcar área</ValidationPanelIconLabel>
            </Button>
          </Alert>
        ) : (
          <Alert variant="warning">
            <MapPinned aria-hidden="true" />
            <AlertTitle>Área no ECG</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>Obrigatória para este diagnóstico.</span>
              <Button aria-pressed={isRegionTarget} disabled={isBusy} onClick={() => onStartRegion(diagnosis)} size="sm" type="button" variant={isRegionTarget ? "secondary" : "outline"}>
                <ValidationPanelIconLabel icon={MapPinned}>Marcar área</ValidationPanelIconLabel>
              </Button>
            </AlertDescription>
          </Alert>
        )
      ) : !inlineMarkAreaButton ? plainMarkAreaButton : null}

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

      {savedJustificationContent}

      {status === "rejected" && !diagnosis.review_notes && !isDisagreementOpen && diagnosis.source !== "doctor_added" ? (
        <Button className={cn("w-fit", styles.enterAnimation)} disabled={isBusy} onClick={openDisagreementPanel} size="sm" type="button" variant="ghost">
          {isPlain ? "Justificativa (opcional)" : <><Plus aria-hidden="true" data-icon="inline-start" />Adicionar justificativa</>}
        </Button>
      ) : null}

      {isDisagreementOpen ? (
        <Alert aria-labelledby={disagreementLabelId} className={styles.editorClass} role="group" variant={styles.editorVariant}>
          <AlertDescription className="flex flex-col gap-2">
            <Field>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor={`disagreement-note-${diagnosis.id}`} id={disagreementLabelId}>Justificativa <span className="font-normal text-muted-foreground">{styles.optionalLabel}</span></FieldLabel>
                {isPlain ? <Button aria-label="Cancelar justificativa" disabled={isBusy} onClick={() => setDisagreementPanelOpen(false)} size="icon-sm" type="button" variant="ghost"><X aria-hidden="true" /></Button> : null}
              </div>
              <Textarea className={styles.editorTextarea} id={`disagreement-note-${diagnosis.id}`} onChange={(event) => onReviewDraftChange?.(diagnosis.id, { isOpen: true, note: event.target.value })} placeholder="Registre o motivo da discordância, se necessário" rows={3} value={reviewNoteDraft} />
            </Field>
            <div className="flex flex-col gap-2 sm:flex-row">
              {!isPlain ? (
                <>
                  <Button disabled={isBusy || !isReviewDraftDirty} onClick={() => submitDisagreement(reviewNoteDraft, "justification")} size="sm" type="button">Salvar justificativa</Button>
                  <Button disabled={isBusy} onClick={() => setDisagreementPanelOpen(false)} size="sm" type="button" variant="outline">Cancelar</Button>
                </>
              ) : isReviewDraftDirty ? (
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

function DiagnosisStatusSummary({ className, compact = false, diagnosis, status, feedback }) {
  // pb-2 reserva só o necessário para o micro-feedback absoluto abaixo do badge sem tocar a linha do título.
  return (
    <span className={cn("flex shrink-0 flex-col items-end pb-2", className)}>
      {/* A key remonta o badge a cada troca de status para repetir a entrada usada no resto do cartão. */}
      {/* `flex` tira o badge da baseline do texto (evitava um desvio de ~1px em relação ao título). */}
      <span className="relative flex animate-in fade-in-0 duration-200 motion-reduce:animate-none" key={status}>
        <DiagnosisStatusBadge compact={compact} diagnosis={diagnosis} status={status} useRefinedLayout />
        {/* Posicionado sob o badge e centralizado na largura dele; a folga lateral evita truncar "Falha ao salvar". */}
        <span className="absolute top-full -inset-x-6 mt-0.5 h-3 truncate text-center text-xs leading-3 font-normal text-muted-foreground">
          {feedback?.type === "error" ? (
            // A mensagem completa já é anunciada pelo parágrafo role="alert" abaixo das decisões.
            <span aria-hidden="true" className="text-destructive" title={feedback.message}>Falha ao salvar</span>
          ) : feedback ? (
            <span aria-label={feedback.message} title={feedback.message} role="status">
              {feedback.type === "success" ? "✓ Salvo" : feedback.message}
            </span>
          ) : null}
        </span>
      </span>
    </span>
  );
}

function DiagnosisCard({
  activeRegionTarget,
  aiModeEnabled,
  diagnosis,
  diagnosisReference,
  isBusy,
  isPrimaryDaily,
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
  const cardVariant = isPrimaryDaily && !isRegionTarget ? "default" : diagnosisCardVariant({ isRegionTarget, isRequired });
  const statusDescription = isDisagreementOpen && !isPrimaryDaily ? "Discordância em edição" : null;
  const isRegionConnected = [hoveredRegionKey, selectedRegionKey].some((key) => key?.startsWith(`${diagnosis.id}:`));

  return (
    <Card className={cn("gap-2.5 overflow-visible transition-shadow duration-150 motion-reduce:transition-none", (isRegionTarget || isRegionConnected) && "ring-2 ring-ring/60")} data-diagnosis-id={diagnosis.id} data-testid="diagnosis-card" size="sm" variant={cardVariant}>
      <CardHeader className="gap-1.5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <DiagnosisBadges aiModeEnabled={aiModeEnabled} diagnosis={diagnosis} isRequired={isRequired} />
          {isPrimaryDaily ? <DiagnosisStatusSummary diagnosis={diagnosis} status={status} feedback={decisionFeedback} /> : null}
        </div>
        <CardTitle className={cn(
          "grid min-w-0 gap-2",
          isPrimaryDaily ? "grid-cols-[auto_minmax(0,1fr)] items-start group-data-[size=sm]/card:text-base" : "grid-cols-[auto_minmax(0,1fr)_auto] items-center",
        )}>
          {diagnosisReference ? <Badge className={cn("rounded-md", isPrimaryDaily && "mt-0.5")} variant="outline">{diagnosisReference}</Badge> : null}
          <span className={cn("min-w-0 break-words", isPrimaryDaily ? "font-semibold" : "line-clamp-2")} title={standardText}>{standardText}</span>
          {!isPrimaryDaily ? <DiagnosisStatusBadge diagnosis={diagnosis} status={status} /> : null}
        </CardTitle>
        {statusDescription ? <CardDescription>{statusDescription}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <DiagnosisDetails
          activeRegionTarget={activeRegionTarget}
          diagnosis={diagnosis}
          diagnosisReference={diagnosisReference}
          isBusy={isBusy}
          isPrimaryDaily={isPrimaryDaily}
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
  const secondaryScrollRef = useRef(null);

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
      const viewport = secondaryScrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
      const header = viewport?.querySelector(`[data-diagnosis-id="${diagnosisId}"] [data-slot="accordion-trigger"]`);
      if (!header || !viewport) return;
      const bounds = viewport.getBoundingClientRect();
      const target = header.getBoundingClientRect();
      // Reveal only a clipped header, without scrolling the surrounding panel or page.
      if (target.top < bounds.top) viewport.scrollTop += target.top - bounds.top;
      else if (target.bottom > bounds.bottom) viewport.scrollTop += Math.min(target.top - bounds.top, target.bottom - bounds.bottom);
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
    <div className="flex flex-col gap-3">
      <section aria-label={isGeneralReviewDay ? "Revalidação geral" : "Diagnóstico do dia"} className="flex flex-col gap-2" role="region">
        {isGeneralReviewDay ? (
          <div className="px-0.5">
            <h2 className="font-heading text-base font-medium">Revalidação geral</h2>
            <p className="text-xs text-muted-foreground">Revise todos os diagnósticos originais deste exame.</p>
          </div>
        ) : null}
        {requiredDiagnoses.length ? requiredDiagnoses.map((diagnosis) => (
          <DiagnosisCard {...sharedCardProps} decisionFeedback={decisionFeedbacks[String(diagnosis.id)]} diagnosis={diagnosis} diagnosisReference={getDiagnosisReference(diagnosisReferences, diagnosis.id)} isAreaListOpen={openAreaDiagnosisIds.has(String(diagnosis.id))} isPrimaryDaily={!isGeneralReviewDay} isRequired key={diagnosis.id} onAreaListOpenChange={(open) => handleAreaListOpenChange(diagnosis.id, open)} regionError={regionErrors[String(diagnosis.id)]} reviewDraft={reviewDrafts[String(diagnosis.id)]} />
        )) : <p className="text-sm text-muted-foreground">Nenhum diagnóstico do dia configurado para este ECG.</p>}
      </section>

      {secondaryDiagnoses.length || options.length ? (
        <Collapsible onOpenChange={handleSecondaryToggle} open={Boolean(isSecondaryOpen)}>
          <Card className="gap-0 overflow-hidden py-0" size="sm">
              <CardHeader className="items-center gap-0 p-0">
                {/* O chevron fecha a linha com px-3 e size-7: mesma coluna dos indicadores dos itens abaixo. */}
                <CollapsibleTrigger
                  render={
                    <Button
                      className="h-11 min-w-0 w-full cursor-pointer justify-between gap-2 rounded-none border-0 px-3 text-left font-heading text-sm transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-inset active:translate-y-0 motion-reduce:transition-none"
                      type="button"
                      variant="collapsible"
                    />
                  }
                >
                  Diagnósticos adicionais
                  <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
                    <ChevronDown className={cn("text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none", isSecondaryOpen && "rotate-180")} />
                  </span>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
                <CardContent className="border-t px-0 py-0">
                {secondaryDiagnoses.length ? (
                  <div className="grid min-w-0 max-h-[min(32svh,20rem)] grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)]" data-testid="optional-diagnoses-scroll-boundary">
                    <ScrollArea className="min-h-0 min-w-0 [&_[data-slot=scroll-area-viewport]]:overscroll-contain" data-testid="optional-diagnoses-scroll" ref={secondaryScrollRef}>
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
                          // Item aberto: fundo muted/40 no item e opaco equivalente no h3 sticky; o separador título/conteúdo vai no h3 para ter largura total e acompanhar o sticky.
                          <AccordionItem className="px-3 data-open:bg-muted/40 [&>h3]:sticky [&>h3]:top-0 [&>h3]:z-10 [&>h3]:-mx-3 [&>h3]:bg-card [&>h3]:data-open:border-b [&>h3]:data-open:bg-[color-mix(in_oklch,var(--muted)_40%,var(--card))]" data-diagnosis-id={diagnosis.id} key={diagnosis.id} value={diagnosisId}>
                            <AccordionTrigger className={cn(
                              "cursor-pointer items-center gap-2 rounded-none border-0 px-3 py-2 transition-colors duration-150 hover:bg-muted/50 hover:no-underline focus-visible:ring-inset motion-reduce:transition-none [&>[data-slot=accordion-trigger-indicator]]:h-5",
                              hoveredRegionKey?.startsWith(`${diagnosis.id}:`) && !selectedRegionKey?.startsWith(`${diagnosis.id}:`) && "bg-accent/60",
                              selectedRegionKey?.startsWith(`${diagnosis.id}:`) && "bg-muted/40 ring-1 ring-inset ring-ring/30",
                            )}>
                              <span className="grid min-h-8 min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                                {diagnosisReference ? <Badge className="rounded-md" variant="outline">{diagnosisReference}</Badge> : null}
                                <span className="line-clamp-2 min-w-0 break-words text-left font-medium group-aria-expanded/accordion-trigger:line-clamp-none group-aria-expanded/accordion-trigger:font-semibold" title={standardText}>{standardText}</span>
                                <DiagnosisStatusSummary className="pb-0" compact diagnosis={diagnosis} status={status} feedback={decisionFeedbacks[diagnosisId]} />
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="flex flex-col gap-3 pt-2">
                              <DiagnosisBadges aiModeEnabled={aiModeEnabled} diagnosis={diagnosis} isRequired={false} />
                              <DiagnosisDetails {...sharedCardProps} isAdditional decisionFeedback={decisionFeedbacks[diagnosisId]} diagnosis={diagnosis} diagnosisReference={diagnosisReference} hoveredRegionKey={hoveredRegionKey} isAreaListOpen={openAreaDiagnosisIds.has(diagnosisId)} onAreaListOpenChange={(open) => handleAreaListOpenChange(diagnosis.id, open)} regionError={regionErrors[diagnosisId]} reviewDraft={reviewDrafts[diagnosisId]} selectedRegionKey={selectedRegionKey} />
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                      </Accordion>
                    </ScrollArea>
                  </div>
                ) : null}
                </CardContent>
              </CollapsibleContent>
              {/* Rodapé fixo (fora do conteúdo recolhível): a ação fica sempre visível e o seletor abre no mesmo lugar do botão. */}
              {options.length ? (
                isAddDiagnosisOpen ? (
                  <div className="flex items-start gap-2 border-t p-2" id={addDiagnosisContentId}>
                    <Field>
                      <FieldLabel className="sr-only" htmlFor="new-diagnosis-select">Adicionar diagnóstico</FieldLabel>
                      <Select disabled={isBusy} items={selectItems} onValueChange={handleSelectDiagnosis} value={name || null}>
                        <SelectTrigger className="w-full" id="new-diagnosis-select" ref={addDiagnosisSelectRef}><SelectValue placeholder="Selecione um diagnóstico padronizado" /></SelectTrigger>
                        <SelectContent align="start"><SelectGroup>{selectItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
                      </Select>
                    </Field>
                    <Button aria-label="Cancelar adição" onClick={() => handleAddDiagnosisToggle(false)} size="icon-sm" type="button" variant="ghost"><X aria-hidden="true" /></Button>
                  </div>
                ) : (
                  <Button
                    aria-controls={addDiagnosisContentId}
                    aria-expanded={false}
                    aria-label="Adicionar diagnóstico"
                    className="h-10 w-full cursor-pointer justify-start gap-2 rounded-none border-0 border-t border-border px-3 text-muted-foreground transition-colors duration-150 hover:bg-muted/50 hover:text-foreground active:translate-y-0 motion-reduce:transition-none"
                    onClick={() => handleAddDiagnosisToggle(true)}
                    ref={addDiagnosisTriggerRef}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Plus aria-hidden="true" data-icon="inline-start" />
                    Adicionar diagnóstico
                  </Button>
                )
              ) : null}
            </Card>
        </Collapsible>
      ) : null}
    </div>
  );
}
