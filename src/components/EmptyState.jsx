export default function EmptyState({ title = "Nenhum registro encontrado", message }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {message ? <span>{message}</span> : null}
    </div>
  );
}

