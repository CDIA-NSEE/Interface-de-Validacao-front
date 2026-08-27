import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Spinner } from "@/components/ui/spinner.jsx";

export default function LoadingState({ message = "Carregando..." }) {
  return (
    <div
      className="flex min-h-32 w-full items-center justify-center gap-2 text-sm text-muted-foreground"
      role="status"
    >
      <Skeleton className="grid size-8 place-items-center rounded-full" aria-hidden="true">
        <Spinner />
      </Skeleton>
      <span>{message}</span>
    </div>
  );
}
