import { ArrowLeft, CheckCircle2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ACTION_CLASS_NAME =
  "h-[42px] w-full min-w-0 @min-[24rem]/actions:text-xs disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none";

// Com três botões no grid de duas colunas (18–24rem, ex.: a gaveta compacta) a primária sobrava sozinha no canto inferior
// esquerdo com metade da largura; ocupando a linha inteira ela fica onde a ação principal sempre está: por último, larga.
const PRIMARY_SLOT_CLASS_NAME = "@min-[18rem]/actions:col-span-2 @min-[24rem]/actions:col-span-1";

export default function ReviewActions({
  canValidate = true,
  isBusy,
  isValid,
  onBack,
  onSave,
  onValidate,
  primaryDisabledReason,
  saveDisabled = false,
  saveLabel = "Salvar",
  primaryLabel = "Validar",
}) {
  const primarySlotClassName = onSave ? PRIMARY_SLOT_CLASS_NAME : undefined;
  const primaryButton = (
    <Button
      className={cn(ACTION_CLASS_NAME, primarySlotClassName)}
      disabled={isBusy || isValid || !canValidate}
      onClick={onValidate}
      type="button"
      variant="success"
    >
      <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
      {primaryLabel}
    </Button>
  );
  const shouldExplainPrimaryBlock = !canValidate && Boolean(primaryDisabledReason);

  return (
    <div className="@container/actions w-full">
      <div
        aria-label="Ações da validação"
        className={cn(
          "grid w-full grid-cols-1 gap-2 @min-[18rem]/actions:grid-cols-2",
          onSave && "@min-[24rem]/actions:grid-cols-3",
        )}
        role="group"
      >
        <Button
          className={ACTION_CLASS_NAME}
          disabled={isBusy}
          onClick={onBack}
          type="button"
          variant="outline"
        >
          <ArrowLeft aria-hidden="true" data-icon="inline-start" />
          Voltar
        </Button>
        {onSave ? (
          <Button
            className={ACTION_CLASS_NAME}
            disabled={isBusy || saveDisabled}
            onClick={onSave}
            type="button"
            variant="secondary"
          >
            <Save aria-hidden="true" data-icon="inline-start" />
            {saveLabel}
          </Button>
        ) : null}
        {shouldExplainPrimaryBlock ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  aria-label={`${primaryLabel} indisponível: ${primaryDisabledReason}`}
                  className={cn("block w-full rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50", primarySlotClassName)}
                  tabIndex={0}
                />
              }
            >
              {primaryButton}
            </TooltipTrigger>
            <TooltipContent>{primaryDisabledReason}</TooltipContent>
          </Tooltip>
        ) : primaryButton}
      </div>
    </div>
  );
}
