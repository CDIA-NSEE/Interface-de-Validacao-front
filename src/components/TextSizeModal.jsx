import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { TEXT_SIZE_OPTIONS, useTextSize } from "@/context/TextSizeContext.jsx";

// Amostra "Aa" em px fixos, fora da escala de propósito: não muda com o nível escolhido e mostra a proporção entre eles
// (corpo de 14, 16 e 18px, desenhado a 1,5×).
const SAMPLE_FONT_SIZE = {
  default: "21px",
  large: "24px",
  "extra-large": "27px",
};

// Vale na hora, sem "Salvar": o fundo do diálogo só escurece 10% e ele fica sobre o ECG, então o painel muda à vista.
export default function TextSizeModal({ isOpen, onClose }) {
  const { setTextSize, textSize } = useTextSize();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* 448px: "Muito grande" cabe numa linha no próprio nível de 18px (a 384px quebrava em duas). */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-10">
          <DialogTitle>Tamanho do texto</DialogTitle>
          <DialogDescription>
            Aumenta o texto desta tela. O traçado do ECG mantém o tamanho e tem zoom próprio.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup
          aria-label="Tamanho do texto"
          className="grid grid-cols-3 gap-2"
          onValueChange={setTextSize}
          value={textSize}
        >
          {TEXT_SIZE_OPTIONS.map((option) => (
            <Radio.Root
              className="flex min-w-0 flex-col items-center justify-end gap-1 rounded-lg border border-input bg-card px-2 pt-3 pb-2 text-sm font-medium text-foreground outline-none transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-primary data-checked:inset-ring-1 data-checked:inset-ring-primary motion-reduce:transition-none"
              key={option.value}
              nativeButton
              render={<button type="button" />}
              value={option.value}
            >
              <span aria-hidden="true" className="leading-none font-semibold" style={{ fontSize: SAMPLE_FONT_SIZE[option.value] }}>
                Aa
              </span>
              <span className="max-w-full text-center">{option.label}</span>
            </Radio.Root>
          ))}
        </RadioGroup>
      </DialogContent>
    </Dialog>
  );
}
