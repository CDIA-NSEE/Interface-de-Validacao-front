export default function LoadingState({ message = "Carregando..." }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

