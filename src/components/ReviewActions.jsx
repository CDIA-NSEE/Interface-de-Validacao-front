import { ArrowLeft, CheckCircle2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ReviewActions({
  canValidate = true,
  isBusy,
  isValid,
  onBack,
  onSave,
  onValidate,
  saveLabel = "Salvar",
  primaryLabel = "Validar",
}) {
  return (
    <div
      aria-label="Ações da validação"
      className={cn(
        "grid w-full grid-cols-1 gap-2 min-[28rem]:grid-cols-2",
        onSave && "xl:grid-cols-3",
      )}
      role="group"
    >
      <Button
        className="h-[42px] w-full min-w-0"
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
          className="h-[42px] w-full min-w-0"
          disabled={isBusy}
          onClick={onSave}
          type="button"
          variant="secondary"
        >
          <Save aria-hidden="true" data-icon="inline-start" />
          {saveLabel}
        </Button>
      ) : null}
      <Button
        className="h-[42px] w-full min-w-0"
        disabled={isBusy || isValid || !canValidate}
        onClick={onValidate}
        type="button"
        variant="success"
      >
        <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
        {primaryLabel}
      </Button>
    </div>
  );
}
