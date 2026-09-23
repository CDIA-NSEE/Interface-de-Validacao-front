import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Etiqueta neutra de campo/seção opcional: fundo `muted`, cantos da referência `Dn`, sem contorno (não é clicável) e
// sem pílula (não é status). O leitor de tela ouve "(opcional)", e o nome acessível fica "Justificativa (opcional)",
// não "Justificativa Opcional".
export default function OptionalTag({ className }) {
  return (
    <>
      <Badge aria-hidden="true" className={cn("rounded-md bg-muted px-1.5 text-muted-foreground", className)} variant="secondary">Opcional</Badge>
      <span className="sr-only">(opcional)</span>
    </>
  );
}
