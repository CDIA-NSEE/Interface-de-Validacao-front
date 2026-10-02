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
    text: "Comece pelo diagnóstico ativo exibido no Início.",
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
          <DialogTitle>Tutorial rápido</DialogTitle>
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
        {/* Dica fora dos passos: ajustar o painel não é parte da revisão, mas sem ela a divisória só se descobre pelo
            cursor ao passar sobre o filete. */}
        <p className="text-sm text-muted-foreground">
          Na revisão, arraste a divisória entre o painel e o ECG para ajustar a largura do painel; clique duplo nela
          volta à largura automática.
        </p>
      </DialogContent>
    </Dialog>
  );
}
