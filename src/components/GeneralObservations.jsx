import { Check, ChevronDown, NotebookPen } from "lucide-react";
import { useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import OptionalTag from "./OptionalTag.jsx";
import ValidationPanelIconLabel from "./ValidationPanelIconLabel.jsx";

// "Observações gerais": último cartão do painel, recolhível, com o comportamento do grupo da justificativa — o campo é o
// conteúdo (sem moldura própria; com foco, o cartão acende), cresce de uma a cinco linhas, Cancelar │ Salvar só com
// alteração não salva, Ctrl/Cmd+Enter salva. A barra é a dos cartões de seção do painel ("Diagnósticos adicionais",
// "Dados do exame"). Recolhido com texto, mostra "Observações gerais:" e o começo dele, para o médico reconhecer o que
// escreveu sem abrir. Até 2026-09-30 o campo ficava sob o ECG, com o "Salvar" sempre à vista (desabilitado sem alteração).
export default function GeneralObservations({
  canSave,
  cardRef,
  isBusy,
  isOpen,
  notes,
  onCancel,
  onNotesChange,
  onOpenChange,
  onSave,
  saveState,
  savedNotes,
}) {
  const rootRef = useRef(null);
  const previewId = useId();
  const isDirty = notes !== savedNotes;
  // Com "Salvar" no campo (fluxo diário), a barra recolhida mostra o texto salvo; nos outros modos não há salvar próprio
  // (o texto vai com "Validar exame"), e ela mostra o texto do campo.
  const previewText = (canSave ? savedNotes : notes).trim().replace(/\s+/g, " ");
  const hasPreviewText = Boolean(previewText);
  const isPreviewShown = hasPreviewText && !isOpen;
  const isFeedbackShown = saveState.status === "saving" || saveState.status === "saved";

  // Abrir o cartão vazio leva o cursor ao campo (abriu para escrever); com texto, o foco fica na barra (abriu para ler).
  // Salvar ou cancelar desmonta os botões: o foco volta à barra, e só se ele se perdeu.
  function focusControl(target) {
    window.setTimeout(() => {
      const root = rootRef.current;
      if (target === "field") {
        const textarea = root?.querySelector("textarea");
        textarea?.focus();
        textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
        return;
      }
      if (document.activeElement && document.activeElement !== document.body) return;
      root?.querySelector('[data-observations-action="toggle"]')?.focus();
    }, 0);
  }

  // Com alteração não salva, não recolhe: o texto sumiria da vista sem estar salvo. Só no fluxo diário, em que o campo
  // tem Cancelar │ Salvar para resolver a alteração; nos outros modos ela vai com "Validar exame".
  function handleOpenChange(open) {
    if (!open && canSave && isDirty) {
      focusControl("field");
      return;
    }
    onOpenChange(open);
    if (open && !hasPreviewText) focusControl("field");
  }

  async function handleSave() {
    const wasSaved = await onSave();
    if (wasSaved) focusControl("toggle");
  }

  function handleCancel() {
    onCancel();
    focusControl("toggle");
  }

  // Ctrl/Cmd+Enter salva (como nos comentários do GitHub); Enter sozinho quebra linha.
  function handleKeyDown(event) {
    if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    if (canSave && isDirty && !isBusy) handleSave();
  }

  return (
    <Collapsible onOpenChange={handleOpenChange} open={isOpen}>
      <Card
        className="gap-0 overflow-hidden py-0 has-[textarea:focus-visible]:ring-3 has-[textarea:focus-visible]:ring-ring/50"
        data-testid="general-observations"
        ref={(node) => {
          rootRef.current = node;
          if (cardRef) cardRef.current = node;
        }}
        size="sm"
      >
        <CardHeader className="p-0">
          {/* Botão dentro do h2, como em "Dados do exame". O "Opcional" desce para uma 2ª linha no painel estreito; a prévia
              não quebra: corta com "…" (base 0, sem largura mínima — senão o texto alargava o painel). */}
          <h2>
            <CollapsibleTrigger
              aria-describedby={isPreviewShown ? previewId : undefined}
              aria-label={hasPreviewText ? "Observações gerais" : "Observações gerais (opcional)"}
              data-observations-action="toggle"
              render={
                <Button
                  className="h-auto min-h-11 w-full min-w-0 justify-between gap-2 border-0 px-3 py-2 text-left whitespace-normal transition-colors duration-200 ease-out hover:duration-0 group-hover/panel:duration-0 hover:bg-muted/50 focus-visible:ring-inset active:not-aria-[haspopup]:translate-y-0 motion-reduce:transition-none"
                  type="button"
                  variant="collapsible"
                />
              }
            >
              <ValidationPanelIconLabel className="flex-1 items-start" icon={NotebookPen}>
                <span className="flex min-w-0 flex-wrap items-center gap-y-1">
                  <span className="mr-1 shrink-0">
                    Observações gerais
                    {hasPreviewText ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "transition-opacity ease-out motion-reduce:transition-none",
                          isPreviewShown ? "opacity-100 delay-50 duration-150" : "opacity-0 duration-100",
                        )}
                      >
                        :
                      </span>
                    ) : null}
                  </span>
                  {hasPreviewText ? (
                    // A coluna `minmax(0,1fr)` tira a prévia da largura mínima do cabeçalho (como na justificativa): sem
                    // ela, o texto sem quebra virava a largura mínima e empurrava o chevron para fora do cartão.
                    <span className="grid min-w-0 flex-1 basis-0 grid-cols-[minmax(0,1fr)]">
                      <span
                        aria-hidden={isPreviewShown ? undefined : "true"}
                        className={cn(
                          "truncate text-sm font-normal text-foreground transition-opacity ease-out motion-reduce:transition-none",
                          isPreviewShown ? "opacity-100 delay-50 duration-150" : "opacity-0 duration-100",
                        )}
                        data-slot="observations-preview"
                        id={previewId}
                      >
                        {previewText}
                      </span>
                    </span>
                  ) : (
                    <OptionalTag />
                  )}
                </span>
              </ValidationPanelIconLabel>
              {/* Feedback visual na barra, antes do chevron; o leitor de tela o ouve pelo status fora do botão. */}
              {isFeedbackShown ? (
                <span aria-hidden="true" className="flex shrink-0 items-center gap-0.5 text-xs font-normal text-muted-foreground">
                  {saveState.status === "saved" ? <Check className="size-3" /> : null}
                  {saveState.message}
                </span>
              ) : null}
              <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
                <ChevronDown
                  className={cn(
                    "text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none",
                    isOpen && "rotate-180",
                  )}
                />
              </span>
            </CollapsibleTrigger>
          </h2>
          {isFeedbackShown ? (
            <span className="sr-only" role="status">
              {saveState.status === "saved" ? `✓ ${saveState.message}` : saveState.message}
            </span>
          ) : null}
        </CardHeader>
        <CollapsibleContent className="h-(--collapsible-panel-height) overflow-clip transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
          {/* Mesmo campo da justificativa: sem moldura (o cartão é a moldura), sem alça, uma linha vazio e até cinco com
              texto (117px), depois rola por dentro. `wrap-anywhere`: uma palavra longa sem espaço não alarga o painel. */}
          <Textarea
            aria-keyshortcuts={canSave ? "Control+Enter Meta+Enter" : undefined}
            aria-label="Observações gerais (opcional)"
            className="subtle-scrollbar max-h-[117px] min-h-0 resize-none overflow-y-auto rounded-none border-0 border-t border-border bg-background px-3 py-2 text-foreground shadow-none wrap-anywhere focus-visible:border-border focus-visible:ring-0 dark:bg-background"
            id="general-observations"
            onChange={(event) => onNotesChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Registre comentários gerais sobre o exame"
            value={notes}
          />
          {/* Só com alteração não salva e só no fluxo diário (nos outros modos as observações vão com "Validar exame").
              Dispensar à esquerda, confirmar à direita, no fim do campo; "Salvar observações" é o nome acessível. */}
          {canSave && isDirty ? (
            <div className="flex flex-col-reverse gap-2 bg-background px-2 pb-2 sm:flex-row sm:justify-end">
              <Button disabled={isBusy} onClick={handleCancel} size="sm" type="button" variant="outline">Cancelar</Button>
              <Button aria-label="Salvar observações" disabled={isBusy} onClick={handleSave} size="sm" type="button">Salvar</Button>
            </div>
          ) : null}
          {saveState.status === "error" ? (
            <p className="bg-background px-3 pb-2 text-xs text-destructive" role="alert">
              {saveState.message}
            </p>
          ) : null}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
