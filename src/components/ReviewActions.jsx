import { AlertTriangle, ArrowLeft, CheckCircle2, Save } from "lucide-react";

export default function ReviewActions({
  onBack,
  onSave,
  onValidateWithoutChange,
  onValidateChanged,
  isBusy,
  isValid,
}) {
  return (
    <div className="review-actions">
      <button className="button ghost" type="button" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true" />
        Voltar
      </button>
      <button className="button secondary" type="button" onClick={onSave} disabled={isBusy || isValid}>
        <Save size={17} aria-hidden="true" />
        Em validação
      </button>
      <button className="button success" type="button" onClick={onValidateWithoutChange} disabled={isBusy}>
        <CheckCircle2 size={17} aria-hidden="true" />
        Validar sem alteração
      </button>
      <button className="button warning" type="button" onClick={onValidateChanged} disabled={isBusy}>
        <AlertTriangle size={17} aria-hidden="true" />
        Validar alterado
      </button>
    </div>
  );
}

