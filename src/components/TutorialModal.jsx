import { CheckCircle2, ListChecks, MousePointerClick, X } from "lucide-react";

import { Button } from "@/components/ui/button.jsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item.jsx";

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
    text: "Abra a seção Opcionais e adicionar para revisar outros diagnósticos.",
  },
];

export default function TutorialModal({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader className="pr-10">
          <span className="text-xs font-medium tracking-wide text-primary uppercase">
            Tutorial rápido
          </span>
          <DialogTitle>Validação de ECG</DialogTitle>
          <DialogDescription>
            Três passos para revisar a fila com segurança.
          </DialogDescription>
        </DialogHeader>
        <DialogClose
          render={
            <Button
              aria-label="Fechar"
              className="absolute top-3 right-3"
              size="icon-sm"
              variant="ghost"
            />
          }
        >
          <X aria-hidden="true" />
        </DialogClose>

        <ItemGroup className="gap-2">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <Item key={step.title} variant="outline">
                <ItemMedia variant="icon" className="text-primary">
                  <Icon aria-hidden="true" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{step.title}</ItemTitle>
                  <span className="text-sm text-muted-foreground">{step.text}</span>
                </ItemContent>
              </Item>
            );
          })}
        </ItemGroup>
      </DialogContent>
    </Dialog>
  );
}
