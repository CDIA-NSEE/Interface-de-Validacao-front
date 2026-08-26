import { Spinner } from "@/components/ui/spinner.jsx";

export default function LoadingState({ message = "Carregando..." }) {
  return (
    <div
      className="flex min-h-32 w-full items-center justify-center gap-2 text-sm text-muted-foreground"
      role="status"
    >
      <Spinner aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
