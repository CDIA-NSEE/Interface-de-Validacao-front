import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

// Largura do painel sem arrastar (WCAG 2.2, 2.5.7 Dragging Movements): os mesmos pontos que a divisória alcança —
// o mínimo, a largura automática e o máximo da tela atual.
export const PANEL_WIDTH_OPTIONS = [
  { label: "Estreito", sample: "w-3.5", value: "narrow" },
  { label: "Automático", sample: "w-5", value: "automatic" },
  { label: "Largo", sample: "w-7", value: "wide" },
];

// Vale na hora, sem "Salvar", como o Tamanho do texto: o fundo só escurece 10% e o painel muda à vista. `value` é
// `null` quando a largura atual foi ajustada na divisória e não coincide com nenhuma das três. `narrowDisabled`: nesta
// janela o "Estreito" não aumentaria o ECG; `wideDisabled`: o painel já está na largura máxima (ver
// PANEL_PRESET_MIN_CHANGE em ExamReviewPage). A opção fica indisponível, com o motivo abaixo das opções, ligado a ela
// pelo `aria-describedby`.
const DISABLED_REASON = {
  narrow: { id: "panel-width-narrow-disabled", text: "Nesta janela o ECG já ocupa toda a altura; um painel mais estreito não o aumentaria." },
  wide: { id: "panel-width-wide-disabled", text: "Nesta janela o painel já está na largura máxima." },
};

export default function PanelWidthModal({
  isOpen,
  narrowDisabled = false,
  onClose,
  onValueChange,
  value,
  wideDisabled = false,
}) {
  const disabledOptions = { narrow: narrowDisabled, wide: wideDisabled };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-10">
          <DialogTitle>Largura do painel</DialogTitle>
          <DialogDescription>
            Ajusta a largura do painel de diagnósticos ao lado do ECG. Também dá para arrastar a divisória entre os
            dois; clique duplo nela volta à automática.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup
          aria-label="Largura do painel"
          className="grid grid-cols-3 gap-2"
          onValueChange={onValueChange}
          value={value ?? ""}
        >
          {PANEL_WIDTH_OPTIONS.map((option) => (
            <Radio.Root
              aria-describedby={disabledOptions[option.value] ? DISABLED_REASON[option.value].id : undefined}
              className="flex min-w-0 flex-col items-center justify-end gap-2 rounded-lg border border-input bg-card px-2 pt-3 pb-2 text-sm font-medium text-foreground outline-none transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-primary data-checked:inset-ring-1 data-checked:inset-ring-primary data-disabled:cursor-not-allowed data-disabled:bg-muted/40 data-disabled:text-muted-foreground data-disabled:hover:bg-muted/40 motion-reduce:transition-none"
              disabled={Boolean(disabledOptions[option.value])}
              key={option.value}
              nativeButton
              render={<button type="button" />}
              value={option.value}
            >
              {/* Miniatura da tela: o painel à esquerda, na proporção de cada opção, e o ECG ao lado. */}
              <span aria-hidden="true" className="flex h-6 w-14 overflow-hidden rounded-sm border border-muted-foreground/40">
                <span className={`${option.sample} shrink-0 border-r border-muted-foreground/40 bg-muted-foreground/20`} />
                <span className="flex-1 bg-background" />
              </span>
              <span className="max-w-full text-center">{option.label}</span>
            </Radio.Root>
          ))}
        </RadioGroup>
        {value === null ? (
          <p className="text-sm text-muted-foreground">Agora: largura ajustada na divisória.</p>
        ) : null}
        {["narrow", "wide"].map((option) =>
          disabledOptions[option] ? (
            <p className="text-sm text-muted-foreground" id={DISABLED_REASON[option].id} key={option}>
              {DISABLED_REASON[option].text}
            </p>
          ) : null,
        )}
      </DialogContent>
    </Dialog>
  );
}
