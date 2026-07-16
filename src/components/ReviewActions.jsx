import { ArrowLeft, CheckCircle2, Save } from "lucide-react";

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
    <div className="review-actions">
      <button className="button ghost" type="button" onClick={onBack} disabled={isBusy}>
        <ArrowLeft size={17} aria-hidden="true" />
        Voltar
      </button>
      {onSave ? (
        <button className="button secondary" type="button" onClick={onSave} disabled={isBusy}>
          <Save size={17} aria-hidden="true" />
          {saveLabel}
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
