import { Check, ChevronDown, ClipboardList, MapPinned, MessageSquareText, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useEffectEvent, useId, useMemo, useRef, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertTitle } from "@/components/ui/alert";
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
import { InputGroupAddon } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { getDiagnosisReviewStatus, getDiagnosisVisualStatus } from "../utils/diagnosisRegionVisuals.js";
import { normalizeReviewNote } from "../utils/disagreementReview.js";
import {
  getDiagnosisDisplayGroups,
  getDiagnosisReference,
  getRegionReference,
  normalizeDiagnosisText,
} from "../utils/diagnosisReferences.js";
import { runViewTransition } from "../utils/viewTransition.js";
import OptionalTag from "./OptionalTag.jsx";
import ValidationPanelIconLabel from "./ValidationPanelIconLabel.jsx";

const REVIEW_LABELS = {
  pending: "Aguardando decisão",
  confirmed: "Concordo",
  rejected: "Discordo",
};

const AI_AGREEMENT_DESCRIPTION =
  "Sugestão informativa; a decisão permanece médica.";

// Altura e superfície partilhadas pelos toggles de decisão e pelo "Marcar área" na mesma linha (todos os layouts).
// `disabled:opacity-100` evita o "apagão" da linha durante o salvamento; o pointer-events-none continua bloqueando duplo envio.
const INLINE_DECISION_CONTROL_CLASS =
  "h-10 bg-card transition-colors duration-150 disabled:opacity-100 motion-reduce:transition-none dark:bg-card";

// Linha única "Concordo | Discordo | Marcar área" (DiagnosisActionRow), a mesma no diagnóstico do dia, na revalidação
// geral e nos adicionais, para que a decisão tenha a mesma forma, o mesmo lugar e o mesmo alvo em todos os cartões.
// Nos adicionais a linha fica na barra fixa do item e, no adicionado pelo médico, "Remover diagnóstico" ocupa o slot
// da decisão. Regra de posição da tela inteira: à esquerda a identidade/o veredito, à direita a ação — por isso
// "Marcar área" fecha a linha (`ml-auto`), no mesmo x em qualquer tipo de diagnóstico, e é um slot fixo: o mesmo
// botão, no mesmo lugar, com 0 ou N áreas e com área obrigatória pendente.
const INLINE_DECISION_ROW_STYLES = {
  decisionItem: cn("gap-1.5 border-input", INLINE_DECISION_CONTROL_CLASS),
  // Utilitário secundário: borda e texto mais leves que os toggles de decisão, mesma altura para alinhar a linha.
  markAreaButton: cn("ml-auto shrink-0 border-border text-muted-foreground hover:border-input hover:text-foreground active:translate-y-0", INLINE_DECISION_CONTROL_CLASS),
  // Marcando área: mesma tinta "info" que o cartão recebe, mantendo a borda para não mudar de forma.
  markAreaButtonActive: "ml-auto h-10 shrink-0 border-info/60 bg-info/10 text-info-subtle-foreground hover:bg-info/14 hover:text-info-subtle-foreground active:translate-y-0",
  // "Remover diagnóstico" no slot do veredito: a mesma borda neutra e o mesmo texto do "Marcar área" do outro extremo,
  // para a barra do item ter duas caixas delimitadas em repouso — não uma caixa e um texto solto. A tinta destrutiva
  // entra só no hover/foco: o hover acrescenta cor, não revela que ali havia um botão.
  // `aria-expanded:*` neutraliza a variante outline: o gatilho do AlertDialog marca `aria-expanded` enquanto o diálogo
  // está aberto e pintaria bg-muted/text-foreground por baixo do overlay — a caixa não pode trocar de cor durante a
  // confirmação. A constante vem por último no `cn()`: é o que garante h-10, bg-card e disabled:opacity-100 vencendo a
  // variante (inverter a ordem quebra o dark mode em silêncio).
  removeButton: cn(
    "shrink-0 border-border text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive aria-expanded:bg-card aria-expanded:text-muted-foreground dark:hover:bg-destructive/20",
    INLINE_DECISION_CONTROL_CLASS,
  ),
};

const ENTER_ANIMATION_CLASS = "animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none";

// Grupo recolhível do cartão ("N áreas marcadas" e "Justificativa"): um contorno que envolve a barra e o conteúdo, e a
// barra que o abre e fecha (contagem ou rótulo à esquerda, chevron à direita, na largura toda). Os dois grupos usam as
// mesmas classes para terem a mesma forma — o médico aprende um e reconhece o outro. Ver o comentário da barra de áreas.
const GROUP_OUTLINE_CLASS = "overflow-hidden rounded-lg border border-input";
const GROUP_BAR_CLASS =
  "h-8 w-full min-w-0 cursor-pointer justify-between gap-2 rounded-none border-0 bg-muted/60 px-2 text-muted-foreground transition-colors focus-visible:ring-inset active:translate-y-0 motion-reduce:transition-none dark:bg-muted/40 dark:hover:bg-muted/60";
// O campo da justificativa não tem moldura própria: com foco nele, o contorno do grupo faz o papel da borda do campo.
const JUSTIFICATION_FOCUS_CLASS =
  "has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-3 has-[textarea:focus-visible]:ring-ring/50";
// Troca do texto entre o campo e a barra: ao recolher, a prévia (e os dois-pontos do rótulo) entra 50ms depois e termina
// junto com o painel (200ms) — o texto não aparece em dois lugares ao mesmo tempo; ao abrir, sai em 100ms, antes de o
// campo crescer. A transição em si vem de `justificationFade` (só nos layouts que animam).
const JUSTIFICATION_PREVIEW_IN_CLASS = "opacity-100 delay-50 duration-150";
const JUSTIFICATION_PREVIEW_OUT_CLASS = "opacity-0 duration-100";

// Painel do Collapsible (Base UI) com altura e opacidade animadas na entrada e na saída — 200ms ease-out, como o painel
// do acordeão. Usado pela lista de áreas e pelo bloco "Original + ações" da barra fixa do item adicional, para que tudo o
// que se revela no cartão abra e feche com a mesma transição.
const COLLAPSIBLE_PANEL_CLASS = "h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-200 ease-out data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0 motion-reduce:transition-none";

// Estilos que variam por layout de DiagnosisDetails. "plain" é a revalidação geral,
// "additional" o acordeão de diagnósticos adicionais e "daily" o cartão do diagnóstico do dia.
const REFINED_DETAILS_STYLES = {
  // Sem divisória própria: o contorno do grupo "N áreas marcadas" é o que separa a lista do que vem acima — um border-t
  // aqui somaria uma segunda horizontal a poucos pixels dele.
  areaCollapsible: "",
  areaPanel: COLLAPSIBLE_PANEL_CLASS,
  areaRow: "bg-background p-1.5 duration-150 motion-reduce:transition-none",
  areaRowHovered: "bg-info/5",
  areaRowSelected: "bg-info/10 ring-1 ring-inset ring-info/70",
  areaSelectButton: "min-h-7 cursor-pointer rounded-md font-medium focus-visible:ring-2 focus-visible:ring-ring/50",
  areaReferenceBadge: "border-info/30 bg-info/10 text-info-subtle-foreground",
  areaActions: "border-l border-border pl-1.5",
  originalLabel: "",
  originalPreview: "text-foreground/75",
  enterAnimation: ENTER_ANIMATION_CLASS,
  justificationFade: "transition-opacity ease-out motion-reduce:transition-none",
};

const DETAILS_STYLES = {
  plain: {
    areaCollapsible: "",
    areaPanel: "",
    areaRow: "",
    areaRowHovered: "bg-accent/60",
    areaRowSelected: "bg-accent ring-2 ring-inset ring-ring/30",
    areaSelectButton: "",
    areaReferenceBadge: "",
    areaActions: "",
    originalLabel: "",
    originalPreview: "",
    enterAnimation: "",
    justificationFade: "",
  },
  additional: REFINED_DETAILS_STYLES,
  daily: REFINED_DETAILS_STYLES,
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
// Compara o texto já limpo: um enter ou espaço a mais nas bordas não é alteração (não habilita "Salvar" nem bloqueia).
function hasDirtyReviewDraft(diagnosis, reviewDraft) {
  if (!reviewDraft?.isOpen) return false;
  return normalizeReviewNote(reviewDraft.note ?? diagnosis.review_notes) !== normalizeReviewNote(diagnosis.review_notes);
}

function reviewBadgeVariant(status) {
  if (status === "confirmed") return "success";
  if (status === "rejected") return "destructive";
  return "pending";
}

// Status neutro (nada a decidir nem a corrigir): texto cinza, sem pílula. A pílula fica para o que carrega informação de
// decisão (Concordo/Discordo) ou pede atenção (Área necessária) — uma coluna de pílulas iguais não destacaria nada.
const NEUTRAL_STATUS_CLASS = "border-transparent bg-transparent font-normal text-muted-foreground";

// `compact` encurta o pendente para "Pendente" nas linhas da lista (libera ~75px para o título); o nome acessível segue completo.
function DiagnosisStatusBadge({ compact = false, diagnosis, status, useRefinedLayout = false }) {
  if (diagnosis?.source === "doctor_added") {
    // "Adicionado" é a origem do item, não um veredito: neutro como "Pendente".
    return (
      <Badge className={cn("shrink-0", useRefinedLayout && !diagnosis.region_required_missing && NEUTRAL_STATUS_CLASS)} variant={diagnosis.region_required_missing ? "warning" : "secondary"}>
        {diagnosis.region_required_missing ? "Área necessária" : "Adicionado"}
      </Badge>
    );
  }

  return (
    <Badge className={cn(
      "shrink-0",
      useRefinedLayout && status === "pending" && NEUTRAL_STATUS_CLASS,
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
// adicionais fica na barra fixa do item, abaixo da divisória, abrindo o bloco da linha de ações (1–2 linhas nos textos
// reais, máx. 106 caracteres). Texto simples, sem parada de Tab.
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

// "Marcar área": inicia a marcação de uma área nova em qualquer estado do diagnóstico (sem área, com N áreas, área
// obrigatória pendente) — sempre o mesmo botão, no mesmo lugar (fim da linha de ações, em todos os layouts), para o
// médico não precisar reencontrá-lo. Segue a altura dos toggles. `data-diagnosis-action` permite devolver o foco a
// ele quando a última área é removida — nos adicionais ele vive na barra fixa do item, fora de DiagnosisDetails.
function MarkAreaButton({ diagnosis, isBusy, isRegionTarget, onStartRegion }) {
  return (
    <Button
      aria-pressed={isRegionTarget}
      className={isRegionTarget ? INLINE_DECISION_ROW_STYLES.markAreaButtonActive : INLINE_DECISION_ROW_STYLES.markAreaButton}
      data-diagnosis-action="mark-area"
      disabled={isBusy}
      onClick={() => onStartRegion(diagnosis)}
      size="lg"
      type="button"
      variant="outline"
    >
      {/* O ícone segue o tamanho/gap dos toggles (16px) para alinhar com Check/X. */}
      <MapPinned aria-hidden="true" data-icon="inline-start" />
      Marcar área
    </Button>
  );
}

// Linha de ações do diagnóstico inteiro, logo abaixo do título, com a mesma gramática em todos os layouts: à esquerda
// o slot do veredito (Concordo | Discordo nos originais; `leading` — o "Remover diagnóstico" — no adicionado pelo
// médico, que não tem decisão) e, fechando a linha à direita, "Marcar área" (slot fixo: presente com qualquer
// quantidade de áreas, no mesmo x em todos os tipos). No diário/revalidação a linha é renderizada por
// DiagnosisDetails; nos adicionais, pela barra fixa do item (DiagnosisPanel), fora do painel rolável.
function DiagnosisActionRow({
  className,
  diagnosis,
  isBusy,
  isRegionTarget,
  leading = null,
  onReview,
  onReviewDraftChange,
  onReviewInteractionBlocked,
  onStartRegion,
  reviewDraft,
}) {
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
    if (!wasReviewed) return;
    // Decisão salva. Discordo sem justificativa salva já abre o editor (vazio, então não bloqueia nada): antes era preciso
    // clicar "Adicionar justificativa" para chegar ao campo. O foco fica no Discordo — mover o foco ao alternar um toggle
    // é mudança de contexto (WCAG 3.2.2) e, com o foco no campo, os atalhos do ECG (+ − 0 V) virariam texto da
    // justificativa. Concordo fecha o rascunho, se aberto. `reveal: false`: a resposta chega depois do clique e o médico
    // pode já ter aberto outro item dos adicionais — o editor abre no lugar, sem puxar a lista de volta.
    if (decision === "rejected" && !diagnosis.review_notes) {
      onReviewDraftChange?.(diagnosis.id, { isOpen: true, note: "" }, { reveal: false });
    } else {
      onReviewDraftChange?.(diagnosis.id, null);
    }
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
    <ToggleGroup aria-label={`Revisão de ${standardText}`} className="grid w-full min-w-0 flex-1 grid-cols-2" disabled={isBusy} onValueChange={handleDecisionChange} size="lg" spacing={2} value={decisionValue}>
      <ToggleGroupItem className={cn("w-full min-w-0 px-1.5", INLINE_DECISION_ROW_STYLES.decisionItem)} value="confirmed" variant="decisionSuccess"><Check aria-hidden="true" data-icon="inline-start" />Concordo</ToggleGroupItem>
      <ToggleGroupItem className={cn("w-full min-w-0 px-1.5", INLINE_DECISION_ROW_STYLES.decisionItem)} value="rejected" variant="decisionDestructive"><X aria-hidden="true" data-icon="inline-start" />Discordo</ToggleGroupItem>
    </ToggleGroup>
  ) : null;

  return (
    <div className={cn("flex items-center gap-2", className)} data-slot="diagnosis-action-row">
      {decisionToggle ?? leading}
      <MarkAreaButton diagnosis={diagnosis} isBusy={isBusy} isRegionTarget={isRegionTarget} onStartRegion={onStartRegion} />
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
  const status = getDiagnosisReviewStatus(diagnosis);
  const regions = diagnosis.regions || [];
  const isRegionTarget = activeRegionTarget?.diagnosisId === diagnosis.id;
  const isDisagreementOpen = Boolean(reviewDraft?.isOpen);
  const reviewNoteDraft = reviewDraft?.note ?? diagnosis.review_notes ?? "";
  const isReviewDraftDirty = hasDirtyReviewDraft(diagnosis, reviewDraft);
  const savedReviewNote = normalizeReviewNote(diagnosis.review_notes);
  // Só originais em Discordo têm justificativa (o rascunho aberto cobre a prévia de Discordo antes da resposta).
  const hasJustificationGroup = isDisagreementOpen || (status === "rejected" && diagnosis.source !== "doctor_added");
  // Recolhida com texto salvo, a barra mostra o começo dele — e o leitor de tela o ouve como descrição da barra.
  const isJustificationPreviewShown = Boolean(savedReviewNote) && !isDisagreementOpen;
  const justificationPreviewId = useId();
  const rootRef = useRef(null);
  const areaListTriggerRef = useRef(null);

  // Abrir o grupo vazio pela barra leva o cursor ao campo (abriu para escrever). Salvar ou cancelar desmonta os botões:
  // o foco volta à barra do grupo, e só se ele se perdeu (o médico pode já ter clicado em outro lugar).
  function focusJustificationControl(target) {
    window.setTimeout(() => {
      if (target === "field") {
        const textarea = rootRef.current?.querySelector(`#disagreement-note-${diagnosis.id}`);
        textarea?.focus();
        textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
        return;
      }
      if (document.activeElement && document.activeElement !== document.body) return;
      rootRef.current?.querySelector('[data-justification-action="toggle"]')?.focus();
    }, 0);
  }

  // Grupo aberto = rascunho aberto (`isOpen`); sem `note` próprio, o campo mostra o texto salvo. Recolher descarta o
  // rascunho, por isso não recolhe com alteração não salva — vale o bloqueio "Salve ou cancele a justificativa…".
  function handleJustificationOpenChange(open) {
    if (open) {
      onReviewDraftChange?.(diagnosis.id, { isOpen: true });
      if (!savedReviewNote) focusJustificationControl("field");
      return;
    }
    if (isReviewDraftDirty) {
      onReviewInteractionBlocked?.(diagnosis.id);
      return;
    }
    onReviewDraftChange?.(diagnosis.id, null);
  }

  // Cancelar volta ao texto salvo e mantém o grupo aberto; salvar também o mantém aberto, agora com o texto salvo (já
  // limpo). `reveal: false`: a resposta pode chegar quando o médico já abriu outro item dos adicionais.
  function discardJustificationChanges() {
    onReviewDraftChange?.(diagnosis.id, { isOpen: true }, { reveal: false });
    focusJustificationControl("toggle");
  }

  async function submitJustification(note) {
    const wasReviewed = await onReview(diagnosis.id, "rejected", note, "justification");
    if (!wasReviewed) return;
    onReviewDraftChange?.(diagnosis.id, { isOpen: true }, { reveal: false });
    focusJustificationControl("toggle");
  }

  // Ctrl/Cmd+Enter salva (como nos comentários do GitHub) e o foco fica no campo. Esc não cancela: com o foco no campo,
  // ele ainda cancela a marcação de área no ECG.
  function handleJustificationKeyDown(event) {
    if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    if (isReviewDraftDirty && !isBusy) submitJustification(normalizeReviewNote(reviewNoteDraft));
  }

  async function handleRemoveRegionClick(region) {
    await onRemoveRegion(diagnosis.id, region.id);
    // A linha desmonta com a área: foco no gatilho da lista ou, se era a última (a lista some junto), no "Marcar área",
    // que segue no seu lugar na linha de ações. O botão é procurado no DOM do diagnóstico porque, nos adicionais, ele
    // fica na barra fixa do item (fora daqui). Em falha a linha permanece e o foco segue no botão, então nada muda.
    window.setTimeout(() => {
      if (document.activeElement !== document.body) return;
      const markAreaButton = rootRef.current?.closest("[data-diagnosis-id]")?.querySelector('[data-diagnosis-action="mark-area"]');
      (areaListTriggerRef.current ?? markAreaButton)?.focus();
    }, 0);
  }

  // Nos adicionais a linha "Original:" fica na barra fixa do item (DiagnosisPanel), abrindo o bloco abaixo da divisória.
  const originalLine = !isAdditional ? <DiagnosisOriginalText diagnosis={diagnosis} layout={layout} /> : null;


  const regionListContent = regions.length ? (
    // Um só contorno para o grupo inteiro (lista agrupada): fechado ele é só a barra; aberto, a mesma borda cresce até a
    // última área, então fica claro que todas as linhas pertencem a "N áreas marcadas". Antes a barra fechava a própria
    // borda e as linhas eram caixas soltas com o mesmo espaço entre si e até a barra — a cabeça lia como mais um irmão
    // da lista. `overflow-hidden` recorta os fundos da barra e das linhas nos cantos arredondados.
    <Collapsible className={cn(GROUP_OUTLINE_CLASS, styles.areaCollapsible)} onOpenChange={onAreaListOpenChange} open={isAreaListOpen}>
      {/* Cabeçalho do grupo de áreas: continua sendo só a contagem e o chevron na largura toda (marcar outra área é o
          "Marcar área" da linha de ações — um botão só, no mesmo lugar, com ou sem área), no Button do DS em `outline`,
          mas sem borda nem raio próprios: quem a delimita é o contorno do grupo, do qual ela é o topo. A largura toda
          mantém o alvo grande. Tom `muted` acima das linhas de área (bg-background nos layouts refinados, bg-muted/30 na
          revalidação) para a cabeça do grupo não sumir dentro da própria lista — e `dark:bg-muted/*` explícito porque a
          variante traz bg-input/30 no escuro. Aberta, a variante escurece sozinha pelo `aria-expanded` do Collapsible.
          `focus-visible:ring-inset` porque o grupo recorta (overflow-hidden) qualquer anel externo;
          `active:translate-y-0` porque o afundar de 1px do Button, numa faixa dessa largura, saltaria sobre a lista que
          ela acabou de abrir. O ícone é o mesmo de "Marcar área": amarra a barra ao contexto de áreas do cartão. */}
      <CollapsibleTrigger
        aria-label={markedRegionCountLabel(regions.length)}
        ref={areaListTriggerRef}
        render={
          <Button
            className={GROUP_BAR_CLASS}
            size="sm"
            type="button"
            variant="outline"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <MapPinned aria-hidden="true" />
          <span className="truncate">{markedRegionCountLabel(regions.length)}</span>
        </span>
        <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center [&_svg]:size-4">
          <ChevronDown className={cn("transition-transform duration-200 ease-out motion-reduce:transition-none", isAreaListOpen && "rotate-180")} />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className={styles.areaPanel}>
      {/* Linhas coladas, separadas por filetes (sem espaço entre elas), dentro do contorno do grupo. O filete sob a barra
          fica dentro do painel para entrar na altura animada e sumir junto com ela. */}
      <div className="flex flex-col divide-y divide-border border-t border-border">
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
              // `last:rounded-b-md` acompanha o canto interno do grupo (6px − 1px de borda), para o anel da última linha
              // selecionada não ser cortado pelo recorte do contorno.
              "flex items-center justify-between gap-2 bg-muted/30 p-2 transition-colors last:rounded-b-md",
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

  // Nos adicionais a linha de ações fica na barra fixa do item (DiagnosisPanel), fora do painel rolável.
  const actionRow = !isAdditional ? (
    <DiagnosisActionRow diagnosis={diagnosis} isBusy={isBusy} isRegionTarget={isRegionTarget} onReview={onReview} onReviewDraftChange={onReviewDraftChange} onReviewInteractionBlocked={onReviewInteractionBlocked} onStartRegion={onStartRegion} reviewDraft={reviewDraft} />
  ) : null;

  return (
    <div className="flex flex-col gap-2" ref={rootRef}>
      {originalLine}

      {actionRow}

      {decisionFeedback && (isPlain || decisionFeedback.type === "error") ? (
        <p className={cn("text-xs", decisionFeedback.type === "error" ? "text-destructive" : "text-muted-foreground")} role={decisionFeedback.type === "error" ? "alert" : "status"}>
          {decisionFeedback.message}
        </p>
      ) : null}

      {regionListContent}

      {!regions.length && diagnosis.region_required_missing ? (
        // Só o aviso, numa linha: a ação é o "Marcar área" da linha de ações (o de sempre, no mesmo lugar) e o badge
        // "Área necessária" já sinaliza no título. O ícone vai num span para não acionar o grid de duas linhas do Alert (has-[>svg]).
        <Alert className="grid-cols-[auto_minmax(0,1fr)] items-center gap-2" variant="warning">
          <span aria-hidden="true" className="flex size-4 items-center justify-center [&_svg]:size-4"><MapPinned /></span>
          <AlertTitle className="min-w-0">Área obrigatória no ECG</AlertTitle>
        </Alert>
      ) : null}

      {regionError ? <p className="text-xs text-destructive" role="alert">{regionError}</p> : null}

      {/* Justificativa (só originais em Discordo), na mesma posição em todos os layouts (depois da decisão e das áreas): um
          grupo como o de "N áreas marcadas" — mesmo contorno, mesma barra com chevron, mesma animação —, com o próprio
          campo dentro. O contorno diz de quem é cada coisa (um "Editar" solto abaixo das áreas lia como ação delas) e a
          barra recolhe o texto quando o médico não precisa mais dele. O campo é sempre o campo: clicou, escreveu — sem
          "Editar" nem "Adicionar justificativa", como em "Observações gerais". Recolhido, a barra mostra o começo do texto;
          vazio, a etiqueta "Opcional". O grupo nasce recolhido ao abrir o exame (como as áreas), abre com o Discordo e
          continua aberto depois de salvar. */}
      {hasJustificationGroup ? (
        <Collapsible aria-label="Justificativa" className={cn(GROUP_OUTLINE_CLASS, JUSTIFICATION_FOCUS_CLASS, styles.enterAnimation)} data-slot="justification" onOpenChange={handleJustificationOpenChange} open={isDisagreementOpen} role="group">
          <CollapsibleTrigger
            aria-describedby={isJustificationPreviewShown ? justificationPreviewId : undefined}
            aria-label={savedReviewNote ? "Justificativa" : "Justificativa (opcional)"}
            data-justification-action="toggle"
            render={<Button className={GROUP_BAR_CLASS} size="sm" type="button" variant="outline" />}
          >
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <MessageSquareText aria-hidden="true" />
              {/* Rótulo e valor na mesma linha levam dois-pontos, como "Original:"; aberto, o rótulo fica acima do campo e
                  os perde. */}
              <span className="shrink-0">
                Justificativa
                {savedReviewNote ? (
                  <span aria-hidden="true" className={cn(styles.justificationFade, isJustificationPreviewShown ? JUSTIFICATION_PREVIEW_IN_CLASS : JUSTIFICATION_PREVIEW_OUT_CLASS)}>:</span>
                ) : null}
              </span>
              {/* Etiqueta e prévia dividem a mesma célula e só trocam de opacidade: nada anda na barra. Cada uma tem a sua
                  forma — a etiqueta, fundo invertido (o `muted` dela sumia na barra `muted`: 1,00:1 no hover e aberta); a
                  prévia, a letra do texto no campo (14px, `foreground`), para não se ler como parte do rótulo. A coluna
                  `minmax(0,1fr)` tira a prévia da largura mínima do cartão: o conteúdo do ScrollArea do painel tem
                  `min-width: fit-content`, e o texto sem quebra alargava o cartão em vez de cortar com "…". */}
              <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] items-center text-left *:col-start-1 *:row-start-1">
                <OptionalTag className={cn("justify-self-start bg-card dark:bg-background", styles.justificationFade, "duration-150", savedReviewNote && "opacity-0")} />
                {savedReviewNote ? (
                  <span
                    aria-hidden={isJustificationPreviewShown ? undefined : "true"}
                    className={cn("truncate text-sm font-normal text-foreground", styles.justificationFade, isJustificationPreviewShown ? JUSTIFICATION_PREVIEW_IN_CLASS : JUSTIFICATION_PREVIEW_OUT_CLASS)}
                    data-slot="justification-preview"
                    id={justificationPreviewId}
                  >
                    {savedReviewNote.replace(/\s+/g, " ")}
                  </span>
                ) : null}
              </span>
            </span>
            <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center [&_svg]:size-4">
              <ChevronDown className={cn("transition-transform duration-200 ease-out motion-reduce:transition-none", isDisagreementOpen && "rotate-180")} />
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className={styles.areaPanel}>
            {/* Sem moldura própria (o contorno do grupo é a do campo; com foco, o grupo inteiro acende) e sem alça de
                redimensionar: o campo cresce com o texto (`field-sizing-content`). A divisória sob a barra é a da lista de áreas.
                `wrap-anywhere`: com `field-sizing-content`, a palavra mais longa vira a largura mínima do campo, e o conteúdo
                do ScrollArea do painel (`min-width: fit-content`) cresce junto — uma palavra longa sem espaço alargava o
                painel inteiro. Assim ela quebra dentro do campo e o campo só cresce para baixo. Começa com uma linha (uma
                segunda linha vazia lia como uma quebra digitada, que o médico tentaria apagar) e cresce até cinco (117px:
                5 × 20 de linha + 16 de padding + 1 da divisória); depois rola por dentro — sem teto, o campo empurrava o
                resto do painel para longe. Cinco linhas aqui comportam o mesmo texto que as duas das observações.
                Ctrl/Cmd+Enter salva; Enter quebra linha. */}
            <Textarea
              aria-keyshortcuts="Control+Enter Meta+Enter"
              aria-label="Justificativa (opcional)"
              className="subtle-scrollbar max-h-[117px] min-h-0 resize-none overflow-y-auto rounded-none border-0 border-t border-border bg-background px-2.5 py-2 text-foreground shadow-none wrap-anywhere focus-visible:border-border focus-visible:ring-0 dark:bg-background"
              id={`disagreement-note-${diagnosis.id}`}
              onChange={(event) => onReviewDraftChange?.(diagnosis.id, { isOpen: true, note: event.target.value })}
              onKeyDown={handleJustificationKeyDown}
              placeholder="Registre o motivo da discordância"
              value={reviewNoteDraft}
            />
            {/* Só com alteração não salva. Dentro do contorno, no fim do campo (canto inferior direito), como ao editar
                uma mensagem: as ações pertencem ao texto, e o anel de foco do grupo as envolve. Dispensar à esquerda,
                confirmar à direita — a ordem dos diálogos e do rodapé; abaixo de `sm` empilha com "Salvar" em cima, como o
                AlertDialogFooter. Só "Salvar", como nas observações: dentro do grupo, "justificativa" seria redundante; o
                nome acessível mantém o objeto ("Salvar justificativa"). */}
            {isReviewDraftDirty ? (
              <div className={cn("flex flex-col-reverse gap-2 bg-background px-2 pb-2 sm:flex-row sm:justify-end", styles.enterAnimation)}>
                <Button disabled={isBusy} onClick={discardJustificationChanges} size="sm" type="button" variant="outline">Cancelar</Button>
                <Button aria-label="Salvar justificativa" disabled={isBusy} onClick={() => submitJustification(normalizeReviewNote(reviewNoteDraft))} size="sm" type="button">Salvar</Button>
              </div>
            ) : null}
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}

// Única ação do diagnóstico adicionado pelo médico (originais nunca são removidos). Ocupa o slot do veredito, à esquerda
// da linha de ações — onde os originais têm Concordo/Discordo — com a mesma altura dos toggles (h-10) para a linha ter o
// mesmo respiro nos dois tipos; "Marcar área" fecha a linha à direita, no mesmo x dos originais. Outline neutro, a mesma
// forma do "Marcar área" do outro extremo: todo controle clicável do cartão tem fronteira em repouso, e a assimetria
// "texto solto à esquerda, botão delimitado à direita" era a única da barra. O que separa as duas ações é a tinta
// destrutiva no hover/foco e a confirmação em diálogo: é a ação do diagnóstico inteiro, rara e destrutiva — ganha alvo
// e fronteira, não o peso de Concordo/Discordo.
function RemoveDiagnosisAction({ diagnosis, isBusy, onRemove }) {
  const standardText = diagnosis.standard_text || diagnosis.name;
  const regionCount = diagnosis.regions?.length ?? 0;
  // Controlado para fechar na confirmação: o item só desmonta quando o DELETE resolve e, em falha, o erro da página ficaria escondido atrás do overlay.
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  return (
    <AlertDialog onOpenChange={setIsRemoveDialogOpen} open={isRemoveDialogOpen}>
      <AlertDialogTrigger render={<Button className={INLINE_DECISION_ROW_STYLES.removeButton} disabled={isBusy} size="lg" type="button" variant="outline" />}>
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
  const cardVariant = isPrimaryDaily && !isRegionTarget ? "default" : diagnosisCardVariant({ isRegionTarget, isRequired });
  // Só com texto não salvo: o Discordo já abre o editor vazio com a decisão salva, e aí não há nada "em edição".
  const statusDescription = hasDirtyReviewDraft(diagnosis, reviewDraft) && !isPrimaryDaily ? "Discordância em edição" : null;
  const isRegionConnected = [hoveredRegionKey, selectedRegionKey].some((key) => key?.startsWith(`${diagnosis.id}:`));

  return (
    // Diagnóstico do dia: filete superior na cor de destaque + elevação. Sem eles o cartão era um branco igual aos outros
    // três do painel ("Diagnósticos adicionais", "Dados clínicos", "Mais informações") e só o badge o distinguia. O filete
    // fica no eixo horizontal — o do item aberto da lista é lateral —, então os dois sinais não se confundem, e a sombra
    // soma profundidade à cor (sombra sozinha some em telas de baixo contraste). Só aqui: na revalidação geral todos os
    // originais são obrigatórios e marcá-los todos não destacaria nada.
    <Card className={cn("gap-2.5 overflow-visible transition-shadow duration-150 motion-reduce:transition-none", isPrimaryDaily && "border-t-[3px] border-t-primary shadow-md", (isRegionTarget || isRegionConnected) && "ring-2 ring-ring/60")} data-diagnosis-id={diagnosis.id} data-testid="diagnosis-card" size="sm" variant={cardVariant}>
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
  const secondaryListRef = useRef(null);

  const { doctorDiagnoses, optionalDiagnoses, requiredDiagnoses } = useMemo(
    () => getDiagnosisDisplayGroups(diagnoses, { dailyStandardDiagnosis, isGeneralReviewDay }),
    [dailyStandardDiagnosis, diagnoses, isGeneralReviewDay],
  );
  const secondaryDiagnoses = useMemo(
    () => [...optionalDiagnoses, ...doctorDiagnoses],
    [doctorDiagnoses, optionalDiagnoses],
  );
  const hasSecondaryDiagnoses = secondaryDiagnoses.length > 0;
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
    let frame = 0;
    // Teto de segurança para o acompanhamento (a transição da barra dura 200ms).
    const deadline = performance.now() + 400;
    const reveal = () => {
      // A barra (título + linha de ações): revelar só o gatilho podia deixar a linha cortada abaixo do viewport.
      const header = secondaryListRef.current?.querySelector(`[data-diagnosis-id="${diagnosisId}"] [data-slot="diagnosis-item-bar"]`);
      // A lista não tem scroll próprio: o viewport é o do painel (ScrollArea da página no desktop, do Sheet no compacto).
      const viewport = header?.closest('[data-slot="scroll-area-viewport"]');
      if (!header || !viewport) return;
      const bounds = viewport.getBoundingClientRect();
      const target = header.getBoundingClientRect();
      // O bloco "Original + ações" da barra abre em transição de altura: mede pela altura final (com overflow-hidden,
      // scrollHeight já é a do conteúdo enquanto o painel ainda está em 0; sem painel, 0).
      const barPanel = header.querySelector('[data-slot="collapsible-content"]');
      const pendingBarHeight = barPanel ? Math.max(0, barPanel.scrollHeight - barPanel.getBoundingClientRect().height) : 0;
      const targetBottom = target.bottom + pendingBarHeight;
      // Rola o painel só o necessário para revelar a barra cortada (nunca a página).
      if (target.top < bounds.top) viewport.scrollTop += target.top - bounds.top;
      else if (targetBottom > bounds.bottom) viewport.scrollTop += Math.min(target.top - bounds.top, targetBottom - bounds.bottom);
      // Enquanto a barra cresce o viewport ainda não tem esse overflow (o scrollTop é limitado ao conteúdo atual), então
      // o acompanhamento segue frame a frame até a transição terminar — a lista rola junto com a barra, sem salto no fim.
      if (pendingBarHeight > 0.5 && performance.now() < deadline) frame = window.requestAnimationFrame(reveal);
    };
    const scrollTimer = window.setTimeout(reveal, 0);
    return () => {
      window.clearTimeout(scrollTimer);
      window.cancelAnimationFrame(frame);
    };
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
    const addedDiagnosisId = pendingExpandedDiagnosisId;
    revealSecondaryDiagnosis(addedDiagnosisId);
    scrollDiagnosisIntoView(addedDiagnosisId);
    setPendingExpandedDiagnosisId(null);
    // O campo de busca desmonta ao adicionar e o foco cairia no body: vai para o gatilho do item novo (anuncia o que foi
    // adicionado; o Tab seguinte chega a "Remover diagnóstico" e "Marcar área"). Sem cleanup: o próprio efeito re-roda ao
    // zerar o pendente e cancelaria o timer. preventScroll: a rolagem é do scrollDiagnosisIntoView, que acompanha a barra
    // crescendo; só age se o foco ainda estiver perdido (o médico pode ter clicado em outro lugar).
    window.setTimeout(() => {
      if (document.activeElement && document.activeElement !== document.body) return;
      secondaryListRef.current
        ?.querySelector(`[data-diagnosis-id="${addedDiagnosisId}"] [data-slot="accordion-trigger"]`)
        ?.focus({ preventScroll: true });
    }, 0);
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

  function handlePanelReviewDraftChange(diagnosisId, draft, { reveal = true } = {}) {
    if (draft?.isOpen && reveal) revealSecondaryDiagnosis(diagnosisId);
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
          {/* overflow-clip (não hidden) no card e no painel recolhível: `hidden` faz o elemento contar como scroll container e
              prenderia nele o sticky da barra fixa do item; `clip` recorta igual (cantos, animação de altura) sem criar scroll
              container, então a barra adere ao viewport rolável do painel (ScrollArea da página / do Sheet). */}
          <Card className="gap-0 overflow-clip py-0" size="sm">
              <CardHeader className="items-center gap-0 p-0">
                {/* Título da seção: h2, como "Dados clínicos", com os itens (h3 do acordeão) abaixo dele na árvore de títulos — o
                    botão do cabeçalho dentro de um heading (padrão de acordeão do APG). Ícone + rótulo na composição de "Mais
                    informações", o cartão de seção vizinho; o ícone é aria-hidden, então o nome do gatilho segue sendo o rótulo.
                    O chevron fecha a linha com px-3 e size-7: mesma coluna dos indicadores dos itens abaixo.
                    Lista vazia: título estático, sem chevron nem hover — recolher uma lista vazia não faz nada, e um controle
                    que não controla nada só confunde. Mesma caixa (h-11, px-3) e mesma tipografia do gatilho. */}
                <h2>
                  {hasSecondaryDiagnoses ? (
                    <CollapsibleTrigger
                      render={
                        <Button
                          className="h-11 min-w-0 w-full cursor-pointer justify-between gap-2 rounded-none border-0 px-3 text-left font-heading text-sm transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-inset active:translate-y-0 motion-reduce:transition-none"
                          type="button"
                          variant="collapsible"
                        />
                      }
                    >
                      <ValidationPanelIconLabel icon={ClipboardList}>Diagnósticos adicionais <OptionalTag className="ml-1" /></ValidationPanelIconLabel>
                      <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
                        <ChevronDown className={cn("text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none", isSecondaryOpen && "rotate-180")} />
                      </span>
                    </CollapsibleTrigger>
                  ) : (
                    <span className="flex h-11 items-center px-3 font-heading text-sm font-medium">
                      <ValidationPanelIconLabel icon={ClipboardList}>Diagnósticos adicionais <OptionalTag className="ml-1" /></ValidationPanelIconLabel>
                    </span>
                  )}
                </h2>
              </CardHeader>
              {/* Lista vazia (só o diagnóstico do dia no laudo e nada adicionado): uma frase de status no lugar da lista — sem
                  ela o cartão não diz se está vazio, carregando ou com erro. Linha com a altura do rodapé (40px), mesma margem. */}
              {hasSecondaryDiagnoses ? (
              <CollapsibleContent className="h-(--collapsible-panel-height) overflow-clip transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
                <CardContent className="border-t px-0 py-0">
                {(
                  // Sem teto de altura nem scroll próprio: a lista tem a altura do conteúdo e rola com o painel (um só scroll, na
                  // borda do painel). Um teto criava um segundo scroll dentro do painel — ambíguo para a roda do mouse, com a barra
                  // sobreposta aos itens — e espremia áreas e justificativa sob a barra fixa do item aberto.
                  <Accordion
                    data-testid="optional-diagnoses-list"
                    onValueChange={handleExpandedDiagnosisChange}
                    ref={secondaryListRef}
                    value={openSecondaryDiagnosisKey ? [openSecondaryDiagnosisKey] : []}
                  >
                      {secondaryDiagnoses.map((diagnosis) => {
                        const diagnosisId = String(diagnosis.id);
                        const diagnosisReference = getDiagnosisReference(diagnosisReferences, diagnosis.id);
                        const status = getDiagnosisReviewStatus(diagnosis);
                        const standardText = diagnosis.standard_text || diagnosis.name;
                        const isOpen = openSecondaryDiagnosisKey === diagnosisId;
                        return (
                          // Item aberto: filete de 3px em `primary` na borda esquerda (a barra fixa, abaixo, repete o filete), sem tinta de
                          // fundo. Um canal por estado: linha = aberto, preenchimento = hover (muted/50 nos gatilhos) — o hover é o único
                          // preenchimento da lista. A tinta primary/4 que acompanhava o filete saiu: medida no app, era indistinguível do
                          // hover (ΔE OKLab ≈ 0,004 no claro e 0,012 no escuro; o muted também é azulado) e mais fraca que ele, então um
                          // vizinho em hover parecia o item aberto. O filete corre do topo da barra ao fim do conteúdo (áreas, justificativa)
                          // e para onde o item para; entra e sai em fade (150ms) para acompanhar a transição de altura.
                          <AccordionItem className="px-3 transition-[box-shadow] duration-150 data-open:shadow-[inset_3px_0_0_var(--primary)] motion-reduce:transition-none" data-diagnosis-id={diagnosis.id} key={diagnosis.id} value={diagnosisId}>
                            {/* Barra fixa do item: título + "Original:" + linha de ações do diagnóstico inteiro (Concordo |
                                Discordo nos originais, "Remover diagnóstico" nos adicionados, "Marcar área" em ambos) num só bloco sticky, que
                                adere ao topo do viewport do painel enquanto o item rola (a lista não tem scroll próprio) — o
                                mesmo lugar para os dois tipos, visível com qualquer quantidade de áreas e sem depender da altura do h3 (1–3
                                linhas) nem da do Original (1–2). Duas zonas, separadas pela divisória interna: acima dela o gatilho (sempre
                                visível, sempre clicável, é o que o hover sombreia); abaixo, o que a abertura revela — Original, linha de ações e,
                                no painel, as áreas — nada clicável como bloco. A divisória é a fronteira do clicável: o sombreamento termina
                                exatamente nela, então não há faixa que pareça gatilho e não seja. Irmã do painel (o overflow-hidden dele anularia
                                o sticky); o bloco revelado vive num Collapsible controlado pelo item: abre e fecha com a mesma transição de altura
                                do painel de baixo e desmonta ao fechar (nada de gatilho oculto nos fechados). Fundo opaco (card) para as linhas
                                de área rolarem por baixo sem vazar; -mx-3 dá largura total à barra e à sua borda inferior (separador barra /
                                conteúdo). */}
                            <div
                              className={cn(
                                "sticky top-0 z-10 -mx-3 bg-card transition-[box-shadow] duration-150 motion-reduce:transition-none",
                                // Aberta: o mesmo filete do item — a barra, opaca, cobre o dele.
                                // O separador barra/conteúdo só existe quando o painel tem conteúdo (único filho vazio = só o DiagnosisDetails
                                // sem nada a mostrar); do contrário encostaria na borda do item seguinte e viraria uma linha dupla.
                                isOpen && "border-b shadow-[inset_3px_0_0_var(--primary)] [&:has(+[data-slot=accordion-content]>*>:empty:only-child)]:border-b-0",
                              )}
                              data-slot="diagnosis-item-bar"
                            >
                              <AccordionTrigger className={cn(
                                // O padding não muda com o estado: o cabeçalho tem a mesma caixa aberto e fechado (8+6+20+6+8 = 48px com o título
                                // numa linha) e o que a abertura revela começa depois da divisória. Sem troca de padding também não há o
                                // solavanco de 4px no primeiro frame que a transição antiga precisava compensar.
                                "cursor-pointer items-center gap-2 rounded-none border-0 px-3 py-2 transition-colors duration-150 hover:bg-muted/50 hover:no-underline focus-visible:ring-inset motion-reduce:transition-none [&>[data-slot=accordion-trigger-indicator]]:h-5",
                                hoveredRegionKey?.startsWith(`${diagnosis.id}:`) && !selectedRegionKey?.startsWith(`${diagnosis.id}:`) && "bg-accent/60",
                                selectedRegionKey?.startsWith(`${diagnosis.id}:`) && "bg-muted/40 ring-1 ring-inset ring-ring/30",
                                // Marcando área: a barra é sticky, então o sinal fica visível mesmo com a lista rolada.
                                activeRegionTarget?.diagnosisId === diagnosis.id && "bg-info/5 ring-1 ring-inset ring-info/40",
                              )}>
                                {/* py-1.5 em vez de min-h-8: o respiro do título é padding fixo (6px), não a folga da centralização — que
                                    some quando o título quebra em 2–3 linhas e encostava o título na divisória. Com 1 linha a caixa
                                    segue 32px (6+20+6) e a linha fechada, 48px; com mais linhas o item cresce 12px e ganha o mesmo respiro. */}
                                <span className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 py-1.5">
                                  {diagnosisReference ? <Badge className="rounded-md" variant="outline">{diagnosisReference}</Badge> : null}
                                  {/* Fechado: 2 linhas (lista compacta; abrir revela tudo e o nome acessível do gatilho já é o texto inteiro).
                                      Aberto: sem clamp, mesmo peso (o item aberto já se distingue pelo filete, pelo chevron e pelo que revela;
                                      engrossar o texto refluía o título e "gritava" em CAIXA ALTA). Sem `title`: repetiria o visível e o
                                      tooltip nativo cobria o que vem logo abaixo (divisória e linha "Original:"). */}
                                  <span className="line-clamp-2 min-w-0 break-words text-left font-medium group-aria-expanded/accordion-trigger:line-clamp-none">{standardText}</span>
                                  <DiagnosisStatusSummary className="pb-0" compact diagnosis={diagnosis} status={status} feedback={decisionFeedbacks[diagnosisId]} />
                                </span>
                              </AccordionTrigger>
                              {/* Sempre montado (só o painel entra/sai) para a saída também animar: o Collapsible sem gatilho segue o item —
                                  altura e opacidade em 200ms, sincronizadas com o painel de baixo, e o conteúdo desmonta ao terminar de fechar. */}
                              <Collapsible open={isOpen}>
                                <CollapsibleContent className={COLLAPSIBLE_PANEL_CLASS}>
                                  {/* Tudo o que a abertura revela na barra, abaixo da divisória: marcadores, "Original:" e a linha de ações. A
                                      divisória fecha a zona clicável (o hover do gatilho termina nela) e daqui para baixo é conteúdo — passar o
                                      mouse ou clicar no texto original não mexe no item, como em qualquer outro conteúdo revelado. Ordem e respiro
                                      iguais aos do Diagnóstico do dia (marcadores → título → Original → ações, gap-2 de 8px): o contexto vem antes
                                      da decisão — "Agrupado" explica por que o título difere do Original e ficava abaixo de Concordo/Discordo.
                                      Sem marcadores, DiagnosisBadges não renderiza nada. py-3 dá os mesmos 12px da linha de ações para
                                      as duas divisórias. Todos os controles da linha têm h-10 (toggles, Marcar área, Remover); min-h-10 garante o
                                      slot, então a barra tem a mesma altura nos dois tipos. O px-3 também guarda o anel de foco (3px) dos
                                      controles do overflow-hidden do painel. */}
                                  <div className="flex flex-col gap-2 border-t px-3 py-3">
                                    <DiagnosisBadges aiModeEnabled={aiModeEnabled} diagnosis={diagnosis} isRequired={false} />
                                    <DiagnosisOriginalText diagnosis={diagnosis} layout="additional" />
                                    <DiagnosisActionRow
                                      className="min-h-10"
                                      diagnosis={diagnosis}
                                      isBusy={isBusy}
                                      isRegionTarget={activeRegionTarget?.diagnosisId === diagnosis.id}
                                      leading={diagnosis.source === "doctor_added" ? <RemoveDiagnosisAction diagnosis={diagnosis} isBusy={isBusy} onRemove={handlePanelRemove} /> : null}
                                      onReview={onReview}
                                      onReviewDraftChange={handlePanelReviewDraftChange}
                                      onReviewInteractionBlocked={onReviewInteractionBlocked}
                                      onStartRegion={handlePanelStartRegion}
                                      reviewDraft={reviewDrafts[diagnosisId]}
                                    />
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                            {/* Sem detalhes (ex.: sem áreas nem justificativa — tudo está na barra), o painel não deixa uma faixa vazia. */}
                            <AccordionContent className="flex flex-col gap-3 pt-2 [&:has(>:empty:only-child)]:py-0">
                              <DiagnosisDetails {...sharedCardProps} isAdditional decisionFeedback={decisionFeedbacks[diagnosisId]} diagnosis={diagnosis} diagnosisReference={diagnosisReference} hoveredRegionKey={hoveredRegionKey} isAreaListOpen={openAreaDiagnosisIds.has(diagnosisId)} onAreaListOpenChange={(open) => handleAreaListOpenChange(diagnosis.id, open)} regionError={regionErrors[diagnosisId]} reviewDraft={reviewDrafts[diagnosisId]} selectedRegionKey={selectedRegionKey} />
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                  </Accordion>
                )}
                </CardContent>
              </CollapsibleContent>
              ) : (
                <CardContent className="border-t px-3 py-2.5">
                  <p className="text-sm text-muted-foreground">Nenhum diagnóstico adicional neste ECG.</p>
                </CardContent>
              )}
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
