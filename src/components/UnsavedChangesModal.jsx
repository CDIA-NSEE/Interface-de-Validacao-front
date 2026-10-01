import { ArrowLeft, LogOut, TriangleAlert, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.jsx";

const EXIT_COPY = {
  home: { destination: "voltar à lista", discardLabel: "Descartar e voltar", icon: ArrowLeft },
  logout: { destination: "sair da sessão", discardLabel: "Descartar e sair", icon: LogOut },
};

export default function UnsavedChangesModal({ intent = "home", isOpen, onDiscard, onStay }) {
  const { destination, discardLabel, icon: DiscardIcon } = EXIT_COPY[intent];

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onStay()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="text-warning-foreground">
            <TriangleAlert aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
          <AlertDialogDescription>
            Há informações que ainda não foram salvas neste ECG. Você pode continuar revisando ou
            descartar essas alterações e {destination}.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogCancel
          aria-label="Fechar e continuar no ECG"
          className="absolute top-3 right-3"
          size="icon-sm"
          variant="ghost"
        >
          <X aria-hidden="true" />
        </AlertDialogCancel>

        {/* Dispensar à esquerda, confirmar à direita — a mesma ordem de "Remover diagnóstico?" (Cancelar | Remover) e do
            cartão do exame (identificação … ação). O foco inicial segue no X (primeiro focável), então Enter nunca
            descarta por engano. */}
        <AlertDialogFooter>
          <AlertDialogCancel>Continuar no ECG</AlertDialogCancel>
          <AlertDialogAction onClick={onDiscard} variant="destructive">
            <DiscardIcon data-icon="inline-start" aria-hidden="true" />
            {discardLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
