import { ArrowLeft, X } from "lucide-react";

export default function UnsavedChangesModal({ isOpen, onDiscard, onStay }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-labelledby="unsaved-changes-modal-title"
        aria-modal="true"
        className="modal-panel unsaved-changes-modal"
        role="dialog"
      >
        <header className="modal-header">
          <div>
            <span className="eyebrow">Alterações pendentes</span>
            <h2 id="unsaved-changes-modal-title">Sair sem salvar?</h2>
          </div>
          <button className="icon-button" type="button" onClick={onStay} aria-label="Continuar no ECG">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <p className="modal-copy">
          Há informações que ainda não foram salvas neste ECG. Você pode continuar revisando ou
          descartar essas alterações e voltar à lista.
        </p>

        <div className="modal-actions">
          <button className="button secondary" type="button" onClick={onStay}>
            Continuar no ECG
          </button>
          <button className="button ghost" type="button" onClick={onDiscard}>
            <ArrowLeft size={17} aria-hidden="true" />
            Descartar e voltar
          </button>
        </div>
      </section>
    </div>
  );
}
