import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ACTION_CLASS_NAME =
  "h-10 min-w-0 px-3 disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none";

// A ação principal da revisão ("Salvar e próximo" / "Validar exame"). Desde 2026-09-30 fica no cartão do exame, sobre o
// ECG, no canto direito (na gaveta compacta, no rodapé dela); o "Voltar" saiu — o "Início" do trilho faz o mesmo, com a
// mesma confirmação. Desabilitada por decisão incompleta, o motivo é lido: tooltip e nome acessível "{label} indisponível:
// {motivo}"; habilitada, sem tooltip.
export default function ReviewActions({
  canValidate = true,
  className,
  isBusy,
  isValid,
  onValidate,
  primaryDisabledReason,
  primaryLabel = "Validar",
}) {
  const primaryButton = (
    <Button
      className={cn(ACTION_CLASS_NAME, className)}
      disabled={isBusy || isValid || !canValidate}
      onClick={onValidate}
      type="button"
      variant="success"
    >
      <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
      {primaryLabel}
    </Button>
  );

  if (canValidate || !primaryDisabledReason) return primaryButton;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            aria-label={`${primaryLabel} indisponível: ${primaryDisabledReason}`}
            className={cn("inline-flex rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}
            tabIndex={0}
          />
        }
      >
        {primaryButton}
      </TooltipTrigger>
      <TooltipContent side="bottom">{primaryDisabledReason}</TooltipContent>
    </Tooltip>
  );
}
