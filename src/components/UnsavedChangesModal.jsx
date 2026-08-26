import { ArrowLeft, TriangleAlert, X } from "lucide-react";

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

export default function UnsavedChangesModal({ isOpen, onDiscard, onStay }) {
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
            descartar essas alterações e voltar à lista.
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

        <AlertDialogFooter>
          <AlertDialogAction onClick={onDiscard} variant="destructive">
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Descartar e voltar
          </AlertDialogAction>
          <AlertDialogCancel>Continuar no ECG</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
