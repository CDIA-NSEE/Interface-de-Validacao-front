import { Mail, MessageCircle, Phone, X } from "lucide-react";

const CHANNEL_ICONS = {
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  text: MessageCircle,
};

export default function SupportContactModal({ contact, isOpen, onClose }) {
  if (!isOpen) return null;

  const channels = contact?.channels || [];

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-labelledby="support-modal-title"
        aria-modal="true"
        className="modal-panel support-modal"
        role="dialog"
      >
        <header className="modal-header">
          <div>
            <span className="eyebrow">Contato direto</span>
            <h2 id="support-modal-title">{contact?.title || "Contato BP/NSEE"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {contact?.description ? <p className="modal-copy">{contact.description}</p> : null}

        <div className="support-channel-list">
          {channels.length ? (
            channels.map((channel) => {
              const Icon = CHANNEL_ICONS[channel.type] || MessageCircle;
              return (
                <article className="support-channel" key={`${channel.label}-${channel.value}`}>
                  <Icon size={20} aria-hidden="true" />
                  <div>
                    <strong>{channel.label}</strong>
                    <span>{channel.value}</span>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="feedback login-info-feedback">Canal oficial pendente de configuracao.</div>
          )}
        </div>
      </section>
    </div>
  );
}
