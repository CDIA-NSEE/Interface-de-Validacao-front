import { CheckCircle2, ListChecks, MousePointerClick, X } from "lucide-react";

const STEPS = [
  {
    icon: ListChecks,
    title: "Fila do dia",
    text: "Comece pelo diagnóstico ativo exibido na home.",
  },
  {
    icon: MousePointerClick,
    title: "Decisão obrigatória",
    text: "Valide o diagnóstico em destaque antes de avançar.",
  },
  {
    icon: CheckCircle2,
    title: "Opcionais",
    text: "Use ficar no exame quando quiser revisar outros diagnósticos.",
  },
];

export default function TutorialModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-labelledby="tutorial-modal-title"
        aria-modal="true"
        className="modal-panel tutorial-modal"
        role="dialog"
      >
        <header className="modal-header">
          <div>
            <span className="eyebrow">Tutorial rápido</span>
            <h2 id="tutorial-modal-title">Validação de ECG</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="tutorial-steps">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <article className="tutorial-step" key={step.title}>
                <span className="tutorial-step-icon">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
