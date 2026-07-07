import { CalendarCheck, X } from "lucide-react";

function contextLabel(context) {
  if (!context) return "Carregando diagnostico";
  if (context.is_general_review_day) return "Dia 30 - revalidacao geral";
  if (context.active_standard_diagnosis) return context.active_standard_diagnosis;
  return "Agenda de diagnostico nao configurada";
}

export default function DailyDiagnosisModal({ context, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop daily-modal-backdrop" role="presentation">
      <section
        aria-labelledby="daily-diagnosis-title"
        aria-modal="true"
        className="modal-panel daily-diagnosis-modal"
        role="dialog"
      >
        <header className="modal-header">
          <div className="daily-modal-title">
            <span className="brand-icon" aria-hidden="true">
              <CalendarCheck size={24} />
            </span>
            <div>
              <span className="eyebrow">Diagnostico do dia</span>
              <h2 id="daily-diagnosis-title">{contextLabel(context)}</h2>
            </div>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="daily-modal-body">
          {context?.is_configured ? (
            <p>
              Dia {context.day_index || "-"} do ciclo. A fila prioriza ECGs com esse diagnostico
              padronizado pendente.
            </p>
          ) : (
            <p>
              Configure `back/app/config/validation_calendar.json` ou a variavel
              `VALIDATION_ACTIVE_DIAGNOSIS` para ativar a fila guiada.
            </p>
          )}
        </div>

        <button className="button primary-action full-width-button" type="button" onClick={onClose}>
          Continuar
        </button>
      </section>
    </div>
  );
}
