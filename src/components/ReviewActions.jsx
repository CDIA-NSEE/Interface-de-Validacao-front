import { ArrowLeft, CheckCircle2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function ReviewActions({
  canValidate = true,
  isBusy,
  isValid,
  onBack,
  onSave,
  onValidate,
  primaryDisabledReason,
  saveLabel = "Salvar",
  primaryLabel = "Validar",
}) {
  const primaryButton = (
    <Button
      className="h-[42px] w-full min-w-0 @min-[24rem]/actions:text-xs"
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
          className="h-[42px] w-full min-w-0 @min-[24rem]/actions:text-xs"
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
            className="h-[42px] w-full min-w-0 @min-[24rem]/actions:text-xs"
            disabled={isBusy}
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
                  className="block w-full rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
