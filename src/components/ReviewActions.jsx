import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ReviewActions({ onBack, onValidate, isBusy, isValid }) {
  return (
    <div className="review-actions">
      <button className="button ghost" type="button" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true" />
        Voltar
      </button>
      <button
        className="button success"
        type="button"
        onClick={onValidate}
        disabled={isBusy || isValid}
      >
        <CheckCircle2 size={17} aria-hidden="true" />
        Validar
      </button>
    </div>
  );
}
