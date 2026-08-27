import { CheckCircle2, ListChecks, MousePointerClick } from "lucide-react";

import {
  Dialog,
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
    text: "Expanda um diagnóstico opcional para decidir ou marcar uma área no ECG.",
  },
];

export default function TutorialModal({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pr-10">
          <span className="text-xs font-medium tracking-wide text-primary uppercase">
            Tutorial rápido
          </span>
          <DialogTitle>Validação de ECG</DialogTitle>
          <DialogDescription>
            Três passos para revisar a fila com segurança.
          </DialogDescription>
        </DialogHeader>
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
