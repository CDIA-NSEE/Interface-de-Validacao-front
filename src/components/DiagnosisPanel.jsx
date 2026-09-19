import { Check, ChevronDown, MapPinned, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useEffectEvent, useId, useMemo, useRef, useState } from "react";

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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroupAddon } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { getDiagnosisReviewStatus, getDiagnosisVisualStatus } from "../utils/diagnosisRegionVisuals.js";
import {
  getDiagnosisDisplayGroups,
  getDiagnosisReference,
  getRegionReference,
  normalizeDiagnosisText,
} from "../utils/diagnosisReferences.js";
import { runViewTransition } from "../utils/viewTransition.js";

const REVIEW_LABELS = {
  pending: "Aguardando decisão",
  confirmed: "Concordo",
  rejected: "Discordo",
};

const AI_AGREEMENT_DESCRIPTION =
  "Sugestão informativa; a decisão permanece médica.";

// Altura e superfície partilhadas pelos toggles de decisão e pelo "Marcar área" na mesma linha (diário e adicionais).
// `disabled:opacity-100` evita o "apagão" da linha durante o salvamento; o pointer-events-none continua bloqueando duplo envio.
const INLINE_DECISION_CONTROL_CLASS =
  "h-10 bg-card transition-colors duration-150 disabled:opacity-100 motion-reduce:transition-none dark:bg-card";

// Linha única "Concordo | Discordo | Marcar área" (DiagnosisActionRow): o mesmo bloco no diagnóstico do dia e nos
// adicionais, para que a decisão tenha a mesma forma, o mesmo lugar e o mesmo alvo nos dois cartões. Nos adicionais
// a linha fica na barra fixa do item e, no adicionado pelo médico, "Remover diagnóstico" ocupa o lugar da decisão.
const INLINE_DECISION_ROW_STYLES = {
  decisionItem: cn("gap-1.5 border-input", INLINE_DECISION_CONTROL_CLASS),
  // Utilitário secundário: borda e texto mais leves que os toggles de decisão, mesma altura para alinhar a linha.
  markAreaButton: cn("shrink-0 border-border text-muted-foreground hover:border-input hover:text-foreground active:translate-y-0", INLINE_DECISION_CONTROL_CLASS),
  // Marcando área: mesma tinta "info" que o cartão recebe, mantendo a borda para não mudar de forma.
  markAreaButtonActive: "h-10 shrink-0 border-info/60 bg-info/10 text-info-subtle-foreground hover:bg-info/14 hover:text-info-subtle-foreground active:translate-y-0",
  markAreaSize: "lg",
  markAreaVariant: "outline",
};

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
  // "Adicionar área" marcando: a mesma tinta info do "Marcar área" ativo — um só visual para "marcando área", com ou sem área.
  addAreaButtonActive: "border-info/60 bg-info/10 text-info-subtle-foreground hover:bg-info/14 hover:text-info-subtle-foreground",
  ...INLINE_DECISION_ROW_STYLES,
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
    addAreaButtonActive: "",
    decisionItem: "",
    markAreaButton: "w-fit border-x-0 px-0",
    markAreaButtonActive: "w-fit border-x-0 px-0",
    markAreaSize: "sm",
    markAreaVariant: "ghost",
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

// Rascunho de justificativa aberto e diferente do salvo: bloqueia novas decisões e a troca de item até salvar/cancelar.
function hasDirtyReviewDraft(diagnosis, reviewDraft) {
  if (!reviewDraft?.isOpen) return false;
  return (reviewDraft.note ?? diagnosis.review_notes ?? "") !== (diagnosis.review_notes || "");
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

// "Original: …" — o texto do laudo antes da padronização, completo e quebrando linha como o título. Nada fica escondido:
// é o que o médico compara com o título para decidir (um corte esconderia justamente a palavra divergente, ex.: "parede
// ANTERIOR" sob um título "parede inferior"), e hover/tooltip não é descobrível nem funciona em touch/leitor de tela.
// Logo sob o título em todos os layouts (mesmo quando igual a ele: o médico vê o que o laudo dizia sem precisar
// comparar). Em todo item com texto: no adicionado pelo médico é o nome escolhido (já padronizado), igual ao título — a
// linha existe pela paridade com os originais da lista. No diário/plain é o primeiro filho de DiagnosisDetails; nos
// adicionais fica na barra fixa do item (1–2 linhas nos textos reais, máx. 106 caracteres). Texto simples, sem parada de Tab.
function DiagnosisOriginalText({ className, diagnosis, layout }) {
  const styles = DETAILS_STYLES[layout];
  const originalText = diagnosis.original_text || diagnosis.name;

  if (!originalText) return null;

  return (
    <div className={cn("min-w-0 max-w-full break-words text-xs font-normal text-muted-foreground", className)} data-slot="diagnosis-original-text">
      <span className={styles.originalLabel}>Original:</span>{" "}
      <span className={styles.originalPreview}>{originalText}</span>
    </div>
  );
}

// "Marcar área" (sem área marcada e sem área obrigatória pendente). Na linha única (diário/adicionais) segue a altura dos
// toggles; na revalidação geral (plain) é ghost, abaixo da decisão. `data-diagnosis-action` permite devolver o foco a ele
// quando a última área é removida — nos adicionais ele vive na barra fixa do item, fora de DiagnosisDetails.
function MarkAreaButton({ diagnosis, isBusy, isRegionTarget, layout, onStartRegion }) {
  const styles = DETAILS_STYLES[layout];
  const isPlain = layout === "plain";

  return (
    <Button
      aria-pressed={isRegionTarget}
      className={isRegionTarget ? styles.markAreaButtonActive : styles.markAreaButton}
      data-diagnosis-action="mark-area"
      disabled={isBusy}
      onClick={() => onStartRegion(diagnosis)}
      size={styles.markAreaSize}
      type="button"
      variant={isRegionTarget && isPlain ? "secondary" : styles.markAreaVariant}
    >
      {/* Na linha única o ícone segue o tamanho/gap dos toggles (16px) para alinhar com Check/X. */}
      {isPlain
        ? <ValidationPanelIconLabel icon={MapPinned}>Marcar área</ValidationPanelIconLabel>
        : <><MapPinned aria-hidden="true" data-icon="inline-start" />Marcar área</>}
    </Button>
  );
}

// Linha de ações do diagnóstico inteiro, logo abaixo do título, com a mesma gramática em todos os layouts: o veredito
// à esquerda (Concordo | Discordo nos originais; o adicionado pelo médico não tem decisão), "Marcar área" em seguida e,
// por último, `trailing` — o "Remover diagnóstico" dos adicionados, encostado à direita (destrutivo e raro: fica longe
// da posição primária). No diário/plain a linha é renderizada por DiagnosisDetails; nos adicionais, pela barra fixa do
// item (DiagnosisPanel), fora do painel rolável.
function DiagnosisActionRow({
  className,
  diagnosis,
  isBusy,
  isRegionTarget,
  layout,
  onReview,
  onReviewDraftChange,
  onReviewInteractionBlocked,
  onStartRegion,
  reviewDraft,
  showMarkArea = false,
  trailing = null,
}) {
  const styles = DETAILS_STYLES[layout];
  // Diário e adicionais compartilham a linha única "Concordo | Discordo | Marcar área" (mesma forma e mesmo lugar).
  const usesInlineDecisionRow = layout !== "plain";
  const standardText = diagnosis.standard_text || diagnosis.name;
  const isDisagreementOpen = Boolean(reviewDraft?.isOpen);
  const visualStatus = getDiagnosisVisualStatus(diagnosis, isDisagreementOpen ? "rejected" : null);
  // Decisão otimista: o toggle fica pressionado no clique e volta ao status do servidor se o salvamento falhar.
  const [pendingDecision, setPendingDecision] = useState(null);
  const decisionValue = pendingDecision ? [pendingDecision] : visualStatus === "pending" ? [] : [visualStatus];

  async function submitDecision(decision) {
    const wasReviewed = decision === "confirmed"
      ? await onReview(diagnosis.id, "confirmed")
      : await onReview(diagnosis.id, "rejected", diagnosis.review_notes || "", "decision");
    // Decisão salva: o rascunho de justificativa (se aberto) fecha.
    if (wasReviewed) onReviewDraftChange?.(diagnosis.id, null);
  }

  function handleDecisionChange(nextValue) {
    if (hasDirtyReviewDraft(diagnosis, reviewDraft)) {
      onReviewInteractionBlocked?.(diagnosis.id);
      return;
    }
    // Decisão desta linha ainda em voo (os toggles só ficam `disabled` se a requisição demorar): evita segundo envio
    // e o toggle "saltando" entre valores.
    if (pendingDecision) return;
    const nextDecision = nextValue.at(-1);
    if (nextDecision !== "confirmed" && nextDecision !== "rejected") return;
    setPendingDecision(nextDecision);
    submitDecision(nextDecision).finally(() => setPendingDecision(null));
  }

  const decisionToggle = diagnosis.source !== "doctor_added" ? (
    <ToggleGroup aria-label={`Revisão de ${standardText}`} className="grid w-full min-w-0 flex-1 grid-cols-2" disabled={isBusy} onValueChange={handleDecisionChange} size={usesInlineDecisionRow ? "lg" : undefined} spacing={usesInlineDecisionRow ? 2 : 1} value={decisionValue}>
      <ToggleGroupItem className={cn("w-full min-w-0 px-1.5", styles.decisionItem)} value="confirmed" variant="decisionSuccess"><Check aria-hidden="true" data-icon="inline-start" />Concordo</ToggleGroupItem>
      <ToggleGroupItem className={cn("w-full min-w-0 px-1.5", styles.decisionItem)} value="rejected" variant="decisionDestructive"><X aria-hidden="true" data-icon="inline-start" />Discordo</ToggleGroupItem>
    </ToggleGroup>
  ) : null;
  // Na revalidação geral (plain) o "Marcar área" fica abaixo da decisão (DiagnosisDetails), não na linha.
  const markAreaButton = usesInlineDecisionRow && showMarkArea ? (
    <MarkAreaButton diagnosis={diagnosis} isBusy={isBusy} isRegionTarget={isRegionTarget} layout={layout} onStartRegion={onStartRegion} />
  ) : null;

  if (!decisionToggle && !markAreaButton && !trailing) return null;

  return (
    <div className={cn("flex items-center gap-2", className)} data-slot="diagnosis-action-row">
      {decisionToggle}
      {markAreaButton}
      {trailing}
    </div>
  );
}

function DiagnosisDetails({
  activeRegionTarget,
  diagnosis,
  diagnosisReference,
  isBusy,
  onEditRegion,
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
  const regions = diagnosis.regions || [];
  const isRegionTarget = activeRegionTarget?.diagnosisId === diagnosis.id;
  const isDisagreementOpen = Boolean(reviewDraft?.isOpen);
  const reviewNoteDraft = reviewDraft?.note ?? diagnosis.review_notes ?? "";
  const isReviewDraftDirty = hasDirtyReviewDraft(diagnosis, reviewDraft);
  const rootRef = useRef(null);
  const areaListTriggerRef = useRef(null);

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

  async function handleRemoveRegionClick(region) {
    await onRemoveRegion(diagnosis.id, region.id);
    // A linha desmonta com a área: foco no gatilho da lista ou, se era a última, no "Marcar área" que a substitui.
    // O botão é procurado no DOM do diagnóstico porque, nos adicionais, ele fica na barra fixa do item (fora daqui).
    // Em falha a linha permanece e o foco segue no botão, então nada muda.
    window.setTimeout(() => {
      if (document.activeElement !== document.body) return;
      const markAreaButton = rootRef.current?.closest("[data-diagnosis-id]")?.querySelector('[data-diagnosis-action="mark-area"]');
      (areaListTriggerRef.current ?? markAreaButton)?.focus();
    }, 0);
  }

  // Nos adicionais a linha "Original:" fica na barra fixa do item (DiagnosisPanel), sob o título.
  const originalLine = !isAdditional ? <DiagnosisOriginalText diagnosis={diagnosis} layout={layout} /> : null;

  const savedJustificationContent = !isPlain && !isDisagreementOpen && status === "rejected" && diagnosis.review_notes ? (
    <Alert aria-label="Justificativa adicionada" className={cn("grid-cols-[minmax(0,1fr)_auto] items-center gap-2", styles.enterAnimation)} role="group" variant={styles.savedJustificationVariant}>
      <AlertTitle className="min-w-0 truncate">Justificativa adicionada</AlertTitle>
      <Button disabled={isBusy} onClick={openDisagreementPanel} size="sm" type="button" variant="ghost">Editar</Button>
    </Alert>
  ) : null;

  const regionListContent = regions.length ? (
    <Collapsible className={styles.areaCollapsible} onOpenChange={onAreaListOpenChange} open={isAreaListOpen}>
      {/* Gatilho e botão compartilham o mesmo state layer (hover da variante ghost) e a mesma altura (size sm);
          a divisória é curta e centralizada, com respiro simétrico, para nenhum hover encostar nela. */}
      <div className="flex items-center gap-1.5">
      <CollapsibleTrigger
        aria-label={markedRegionCountLabel(regions.length)}
        className="flex h-7 min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-md px-2 text-left text-[0.8rem] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 motion-reduce:transition-none dark:hover:bg-muted/50"
        ref={areaListTriggerRef}
      >
        <span>{markedRegionCountLabel(regions.length)}</span>
        <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center [&_svg]:size-4">
          <ChevronDown className={cn("transition-transform duration-200 ease-out motion-reduce:transition-none", isAreaListOpen && "rotate-180")} />
        </span>
      </CollapsibleTrigger>
        <Separator className="data-vertical:h-4 data-vertical:self-center" orientation="vertical" />
        {/* Na revalidação geral (plain) o ativo segue "secondary", convenção daquele layout. */}
        <Button aria-pressed={isRegionTarget} className={isRegionTarget ? styles.addAreaButtonActive : undefined} disabled={isBusy} onClick={() => onStartRegion(diagnosis)} size="sm" type="button" variant={isRegionTarget ? (isPlain ? "secondary" : "outline") : "ghost"}>
          <ValidationPanelIconLabel icon={Plus}>Adicionar área</ValidationPanelIconLabel>
        </Button>
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
              <Button className="text-muted-foreground hover:text-destructive focus-visible:text-destructive" aria-label={`Remover ${accessibleAreaLabel}`} disabled={isBusy || !region.id} onClick={() => handleRemoveRegionClick(region)} size="icon-sm" title={region.id ? `Remover ${accessibleAreaLabel}` : "Área legada sem id"} type="button" variant="ghost"><Trash2 aria-hidden="true" /></Button>
            </div>
          </div>
        );
      })}
      </div>
      </CollapsibleContent>
    </Collapsible>
  ) : null;

  const showMarkArea = !regions.length && !diagnosis.region_required_missing;
  // Nos adicionais a linha de ações fica na barra fixa do item (DiagnosisPanel), fora do painel rolável.
  const actionRow = !isAdditional ? (
    <DiagnosisActionRow diagnosis={diagnosis} isBusy={isBusy} isRegionTarget={isRegionTarget} layout={layout} onReview={onReview} onReviewDraftChange={onReviewDraftChange} onReviewInteractionBlocked={onReviewInteractionBlocked} onStartRegion={onStartRegion} reviewDraft={reviewDraft} showMarkArea={showMarkArea} />
  ) : null;

  return (
    <div className="flex flex-col gap-2" ref={rootRef}>
      {originalLine}

      {isPlain && status === "rejected" && diagnosis.review_notes ? (
        <Alert>
          <AlertTitle>Justificativa registrada</AlertTitle>
          <AlertDescription className="break-words">{diagnosis.review_notes}</AlertDescription>
          <Button className="mt-2 w-fit" disabled={isBusy} onClick={openDisagreementPanel} size="sm" type="button" variant="ghost">Editar justificativa</Button>
        </Alert>
      ) : null}

      {isPlain ? regionListContent : null}

      {actionRow}

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
      ) : isPlain && showMarkArea ? (
        // Na revalidação geral o botão de área fica abaixo da decisão; no diário e nos adicionais divide a linha com ela.
        <MarkAreaButton diagnosis={diagnosis} isBusy={isBusy} isRegionTarget={isRegionTarget} layout={layout} onStartRegion={onStartRegion} />
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

// Única ação do diagnóstico adicionado pelo médico (originais nunca são removidos). Ocupa o fim da linha de ações
// (`ml-auto`), no lugar em que os originais têm a decisão, com a mesma altura dos toggles (h-10) para a linha ter o mesmo
// respiro nos dois tipos. Ghost como as lixeiras das áreas, mas com rótulo e tinta destrutiva só no hover/foco: é a ação
// do diagnóstico inteiro, rara e destrutiva — ganha alvo, não o peso de Concordo/Discordo.
function RemoveDiagnosisAction({ diagnosis, isBusy, onRemove }) {
  const standardText = diagnosis.standard_text || diagnosis.name;
  const regionCount = diagnosis.regions?.length ?? 0;
  // Controlado para fechar na confirmação: o item só desmonta quando o DELETE resolve e, em falha, o erro da página ficaria escondido atrás do overlay.
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  return (
    <AlertDialog onOpenChange={setIsRemoveDialogOpen} open={isRemoveDialogOpen}>
      <AlertDialogTrigger render={<Button className="ml-auto h-10 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive dark:hover:bg-destructive/20" disabled={isBusy} size="lg" type="button" variant="ghost" />}>
        <Trash2 aria-hidden="true" data-icon="inline-start" />
        Remover diagnóstico
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover diagnóstico?</AlertDialogTitle>
          <AlertDialogDescription>
            O diagnóstico <span className="font-medium text-foreground">{standardText}</span>
            {regionCount ? <> e {markedRegionCountLabel(regionCount)} serão removidos</> : " será removido"} deste exame.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {/* Fecha antes de disparar: o item some quando o DELETE resolve; em falha, o Alert da página fica visível. */}
          <AlertDialogAction disabled={isBusy} onClick={() => { setIsRemoveDialogOpen(false); onRemove(diagnosis.id); }} variant="destructive">Remover</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
          {/* Sem clamp nem `title`: o rótulo padronizado aparece inteiro (é o que o médico compara com o Original) e um tooltip
              nativo só repetiria o visível — e não chega a teclado, touch nem leitor de tela. */}
          <span className={cn("min-w-0 break-words", isPrimaryDaily && "font-semibold")}>{standardText}</span>
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
  const addDiagnosisAnchorRef = useRef(null);
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
    (diagnosis) => hasDirtyReviewDraft(diagnosis, reviewDrafts[String(diagnosis.id)]),
  )?.id;
  const dirtySecondaryReviewDraftDiagnosisId = secondaryDiagnosisIds.has(String(dirtyReviewDraftDiagnosisId ?? ""))
    ? dirtyReviewDraftDiagnosisId
    : null;
  const activeSecondaryDiagnosisId = secondaryDiagnosisIds.has(String(activeRegionTarget?.diagnosisId ?? ""))
    ? activeRegionTarget.diagnosisId
    : null;
  const forcedExpandedDiagnosisId = activeSecondaryDiagnosisId ?? dirtySecondaryReviewDraftDiagnosisId;
  // Item aberto do acordeão (valor controlado): o forçado vence o escolhido pelo médico.
  const openSecondaryDiagnosisId = forcedExpandedDiagnosisId ?? expandedDiagnosisId;
  const openSecondaryDiagnosisKey = openSecondaryDiagnosisId === null || openSecondaryDiagnosisId === undefined
    ? null
    : String(openSecondaryDiagnosisId);
  // Só o que ainda pode ser adicionado (sem repetir o que já está no exame), em ordem alfabética.
  const availableOptions = useMemo(() => {
    const present = new Set(diagnoses.map((diagnosis) => normalizeDiagnosisText(diagnosis.standard_text || diagnosis.name)));
    return options
      .filter((option) => !present.has(normalizeDiagnosisText(option)))
      .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  }, [diagnoses, options]);

  const revealSecondaryDiagnosis = useCallback((diagnosisId) => {
    const normalizedDiagnosisId = String(diagnosisId);
    if (!secondaryDiagnosisIds.has(normalizedDiagnosisId)) return;
    setExpandedDiagnosisId((current) => current === normalizedDiagnosisId ? current : normalizedDiagnosisId);
    if (!isSecondaryOpen) onSecondaryToggle?.(true);
  }, [isSecondaryOpen, onSecondaryToggle, secondaryDiagnosisIds]);

  const scrollDiagnosisIntoView = useCallback((diagnosisId) => {
    const scrollTimer = window.setTimeout(() => {
      const viewport = secondaryScrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
      // A barra (título + linha de ações): revelar só o gatilho podia deixar a linha cortada abaixo do viewport.
      const header = viewport?.querySelector(`[data-diagnosis-id="${diagnosisId}"] [data-slot="diagnosis-item-bar"]`);
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

  // Reage só à troca de área selecionada. As callbacks ficam fora das dependências: `revealSecondaryDiagnosis`
  // muda de identidade a cada atualização do exame (ex.: decisão no diagnóstico do dia) e o efeito não pode
  // reabrir uma lista de áreas / item do acordeão que o médico recolheu.
  const revealSelectedRegion = useEffectEvent((diagnosisId) => {
    setOpenAreaDiagnosisIds((current) => new Set(current).add(diagnosisId));
    revealSecondaryDiagnosis(diagnosisId);
    return scrollDiagnosisIntoView(diagnosisId);
  });

  useEffect(() => {
    if (!selectedRegionKey) return;
    return revealSelectedRegion(selectedRegionKey.split(":")[0]);
  }, [selectedRegionKey]);

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

  // O gatilho "Remover diagnóstico" desmonta junto com o item; o foco segue para "Adicionar diagnóstico"
  // (o diagnóstico removido volta às opções, então o botão existe) em vez de cair no body.
  async function handlePanelRemove(diagnosisId) {
    const wasRemoved = await onRemove(diagnosisId);
    if (wasRemoved) window.setTimeout(() => addDiagnosisTriggerRef.current?.focus(), 0);
    return wasRemoved;
  }

  // A troca botão ↔ campo é um morph (View Transition): o rótulo vira o placeholder e o "+" vira a lupa no lugar.
  function handleAddDiagnosisToggle(open) {
    if (open && isInteractionBlocked()) return;
    runViewTransition(() => {
      setIsAddDiagnosisOpen(open);
      if (open && !isSecondaryOpen) onSecondaryToggle?.(true);
    });
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
      runViewTransition(() => {
        setName("");
        setIsAddDiagnosisOpen(false);
        setPendingExpandedDiagnosisId(String(addedDiagnosis.id));
      });
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

      {secondaryDiagnoses.length || availableOptions.length ? (
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
                        value={openSecondaryDiagnosisKey ? [openSecondaryDiagnosisKey] : []}
                      >
                      {secondaryDiagnoses.map((diagnosis) => {
                        const diagnosisId = String(diagnosis.id);
                        const diagnosisReference = getDiagnosisReference(diagnosisReferences, diagnosis.id);
                        const status = getDiagnosisReviewStatus(diagnosis);
                        const standardText = diagnosis.standard_text || diagnosis.name;
                        const isOpen = openSecondaryDiagnosisKey === diagnosisId;
                        const hasRegions = Boolean(diagnosis.regions?.length);
                        return (
                          // Item aberto: fundo muted/40 no item e opaco equivalente na barra fixa (abaixo).
                          <AccordionItem className="px-3 data-open:bg-muted/40" data-diagnosis-id={diagnosis.id} key={diagnosis.id} value={diagnosisId}>
                            {/* Barra fixa do item: título + "Original:" + linha de ações do diagnóstico inteiro (Concordo |
                                Discordo nos originais, "Remover diagnóstico" nos adicionados, "Marcar área" em ambos) num só bloco sticky — o
                                mesmo lugar para os dois tipos, visível com qualquer quantidade de áreas e sem depender da altura do h3 (1–3
                                linhas) nem da do Original (1–2). Irmã do painel (o overflow-hidden dele anularia o sticky); Original e linha só existem no item aberto
                                (nada de gatilho oculto nos fechados). Fundo opaco = mesma mistura do item aberto, para as linhas de área rolarem
                                por baixo sem vazar; -mx-3 dá largura total à barra e à sua borda inferior (separador título+ações / conteúdo). */}
                            <div
                              className={cn(
                                "sticky top-0 z-10 -mx-3 bg-card",
                                // O separador barra/conteúdo só existe quando o painel tem conteúdo (único filho vazio = só o DiagnosisDetails
                                // sem nada a mostrar); do contrário encostaria na borda do item seguinte e viraria uma linha dupla.
                                isOpen && "border-b bg-[color-mix(in_oklch,var(--muted)_40%,var(--card))] [&:has(+[data-slot=accordion-content]>*>:empty:only-child)]:border-b-0",
                              )}
                              data-slot="diagnosis-item-bar"
                            >
                              <AccordionTrigger className={cn(
                                "cursor-pointer items-center gap-2 rounded-none border-0 px-3 py-2 transition-colors duration-150 hover:bg-muted/50 hover:no-underline focus-visible:ring-inset motion-reduce:transition-none [&>[data-slot=accordion-trigger-indicator]]:h-5",
                                // Aberto, com a linha "Original:" logo abaixo, o padding inferior cai de 8px para 4px: a folga do título centralizado
                                // (min-h-8) completa os 10px do cartão do dia sem a linha invadir a caixa do gatilho — hover, anel de área e
                                // "marcando área" terminam exatamente onde a linha começa. O título não se move (padding superior segue 8px).
                                isOpen && "pb-1",
                                hoveredRegionKey?.startsWith(`${diagnosis.id}:`) && !selectedRegionKey?.startsWith(`${diagnosis.id}:`) && "bg-accent/60",
                                selectedRegionKey?.startsWith(`${diagnosis.id}:`) && "bg-muted/40 ring-1 ring-inset ring-ring/30",
                                // Marcando área: a barra é sticky, então o sinal fica visível mesmo com a lista rolada.
                                activeRegionTarget?.diagnosisId === diagnosis.id && "bg-info/5 ring-1 ring-inset ring-info/40",
                              )}>
                                <span className="grid min-h-8 min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                                  {diagnosisReference ? <Badge className="rounded-md" variant="outline">{diagnosisReference}</Badge> : null}
                                  {/* Fechado: 2 linhas (lista compacta; abrir revela tudo e o nome acessível do gatilho já é o texto inteiro).
                                      Aberto: sem clamp. Sem `title`: repetiria o visível e o tooltip nativo cobria a linha "Original:" logo abaixo. */}
                                  <span className="line-clamp-2 min-w-0 break-words text-left font-medium group-aria-expanded/accordion-trigger:line-clamp-none group-aria-expanded/accordion-trigger:font-semibold">{standardText}</span>
                                  <DiagnosisStatusSummary className="pb-0" compact diagnosis={diagnosis} status={status} feedback={decisionFeedbacks[diagnosisId]} />
                                </span>
                              </AccordionTrigger>
                              {isOpen ? (
                                <div className={ENTER_ANIMATION_CLASS}>
                                  {/* Sob o título, como no Diagnóstico do dia (título → Original → decisão). Fora do gatilho: não entra no nome
                                      acessível do item nem na área de hover/clique dele. Sem margem negativa: a caixa começa onde a do gatilho
                                      termina (o pb-1 dele fecha os 10px acima), senão o hover do gatilho cobria o topo do texto; pb-2.5 repete
                                      os 10px abaixo, antes da divisória. */}
                                  <DiagnosisOriginalText className="px-3 pb-2.5" diagnosis={diagnosis} layout="additional" />
                                  {/* Divisória entre o bloco título (gatilho clicável, com hover) + Original e a linha de ações, com respiro igual
                                      (12px) da linha para as duas divisórias: sem isso o título em negrito encostava na caixa dos toggles enquanto
                                      sobrava ar abaixo. Todos os controles da linha têm h-10 (toggles, Marcar área, Remover); min-h-10 garante o
                                      slot, então a barra tem a mesma altura nos dois tipos. */}
                                  <div className="border-t px-3 py-3">
                                  <DiagnosisActionRow
                                    className="min-h-10"
                                    diagnosis={diagnosis}
                                    isBusy={isBusy}
                                    isRegionTarget={activeRegionTarget?.diagnosisId === diagnosis.id}
                                    layout="additional"
                                    onReview={onReview}
                                    onReviewDraftChange={handlePanelReviewDraftChange}
                                    onReviewInteractionBlocked={onReviewInteractionBlocked}
                                    onStartRegion={handlePanelStartRegion}
                                    reviewDraft={reviewDrafts[diagnosisId]}
                                    showMarkArea={!hasRegions && !diagnosis.region_required_missing}
                                    trailing={diagnosis.source === "doctor_added" ? <RemoveDiagnosisAction diagnosis={diagnosis} isBusy={isBusy} onRemove={handlePanelRemove} /> : null}
                                  />
                                  </div>
                                </div>
                              ) : null}
                            </div>
                            {/* Sem badges nem detalhes (ex.: adicionado recém-criado — tudo está na barra), o painel não deixa uma faixa vazia. */}
                            <AccordionContent className="flex flex-col gap-3 pt-2 [&:has(>:empty:only-child)]:py-0">
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
              {availableOptions.length ? (
                // Rodapé persistente: border-t e altura ficam no contêiner, que não é remontado ao alternar botão ↔ campo.
                // Sem animação de entrada no contêiner: um fade a partir de 0 deixava a linha invisível por um frame ("piscada")
                // e movia o anchor do popup; a troca é um morph via View Transition (handleAddDiagnosisToggle).
                // rounded-[inherit] rounded-t-none: cantos inferiores do card (o rodapé é o último filho), topo reto na border-t —
                // hover, anel de foco e tinta seguem o formato da região. Aberto: tinta do item aberto do acordeão (bg-muted/40),
                // continuando o hover do botão no momento do clique.
                <div className={cn("flex h-10 items-center rounded-[inherit] rounded-t-none border-t", isAddDiagnosisOpen && "bg-muted/40")} id={addDiagnosisContentId}>
                  {isAddDiagnosisOpen ? (
                    // aria-label em vez de <label>: com a lista aberta o Base UI marca o resto da página como aria-hidden e um label externo deixaria o campo sem nome.
                    <Combobox autoHighlight defaultOpen disabled={isBusy} items={availableOptions} locale="pt-BR" onValueChange={handleSelectDiagnosis} value={name || null}>
                      {/* Campo full-bleed: assume a linha do botão com as mesmas colunas (lupa no lugar do "+", texto na coluna do rótulo,
                          X na coluna dos chevrons). Anel de foco interno como os gatilhos do card; o grupo tem a largura do card, então
                          o anel contorna a linha inteira e o popup (largura do anchor) alinha às bordas do card. */}
                      <ComboboxInput
                        anchorRef={addDiagnosisAnchorRef}
                        aria-label="Adicionar diagnóstico"
                        className="h-10 rounded-[inherit] border-0 has-[[data-slot=combobox-input]:focus-visible]:ring-inset dark:bg-transparent"
                        id="new-diagnosis-search"
                        placeholder="Buscar diagnóstico…"
                        ref={addDiagnosisSelectRef}
                      >
                        {/* Mesmo view-transition-name do "+": a View Transition troca os ícones no lugar (fade + escala, global.css). */}
                        <InputGroupAddon align="inline-start" className="pl-3"><Search aria-hidden="true" className="[view-transition-name:add-diagnosis-icon]" /></InputGroupAddon>
                        <InputGroupAddon align="inline-end" className="pr-3 has-[>button]:mr-0">
                          <Button aria-label="Cancelar adição" onClick={() => handleAddDiagnosisToggle(false)} size="icon-sm" title="Cancelar" type="button" variant="ghost"><X aria-hidden="true" /></Button>
                        </InputGroupAddon>
                      </ComboboxInput>
                      <ComboboxContent anchor={addDiagnosisAnchorRef}>
                        <ComboboxEmpty>Nenhum diagnóstico encontrado.</ComboboxEmpty>
                        <ComboboxList className="max-h-[min(40svh,18rem)]">
                          {(option) => <ComboboxItem className="whitespace-normal break-words" key={option} value={option}>{option}</ComboboxItem>}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  ) : (
                    // size default (text-sm, svg size-4, gap-1.5): mesmas métricas do campo, para o rótulo e o "+" ficarem nas colunas
                    // do placeholder e da lupa. ring-inset: o anel externo era cortado pelo overflow-hidden do card.
                    <Button
                      aria-controls={addDiagnosisContentId}
                      aria-expanded={false}
                      aria-label="Adicionar diagnóstico"
                      className="h-10 w-full cursor-pointer justify-start rounded-[inherit] border-0 px-3 text-muted-foreground transition-colors duration-150 hover:bg-muted/50 hover:text-foreground focus-visible:ring-inset has-data-[icon=inline-start]:pl-3 active:translate-y-0 motion-reduce:transition-none"
                      onClick={() => handleAddDiagnosisToggle(true)}
                      ref={addDiagnosisTriggerRef}
                      type="button"
                      variant="ghost"
                    >
                      <Plus aria-hidden="true" className="[view-transition-name:add-diagnosis-icon]" data-icon="inline-start" />
                      Adicionar diagnóstico
                    </Button>
                  )}
                </div>
              ) : null}
            </Card>
        </Collapsible>
      ) : null}
    </div>
  );
}
