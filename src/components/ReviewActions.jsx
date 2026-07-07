import { ArrowLeft, CheckCircle2, ListPlus } from "lucide-react";

export default function ReviewActions({
  canValidate = true,
  isBusy,
  isValid,
  onBack,
  onStay,
  onValidate,
  primaryLabel = "Validar",
  secondaryLabel = "Voltar",
}) {
  return (
    <div className="review-actions">
      <button className="button ghost" type="button" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true" />
        Voltar
      </button>
      {onStay ? (
        <button className="button secondary" type="button" onClick={onStay} disabled={isBusy}>
          <ListPlus size={17} aria-hidden="true" />
          {secondaryLabel}
        </button>
      ) : null}
      <button
        className="button success"
        type="button"
        onClick={onValidate}
        disabled={isBusy || isValid || !canValidate}
      >
        <CheckCircle2 size={17} aria-hidden="true" />
        {primaryLabel}
      </button>
    </div>
  );
}
