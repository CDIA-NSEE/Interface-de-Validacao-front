import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { clampReviewSidebarWidth } from "../utils/reviewLayout.js";

// Setas na divisória: 16px por toque, 64px com Shift — o mesmo passo da alça dos controles do ECG.
const KEYBOARD_STEP = 16;
const KEYBOARD_STEP_LARGE = 64;

// Posição pela largura, não pela variável do layout: ela não é herdada (ver global.css), então não chega aqui.
function separatorLeft(width) {
  return `${width - 2}px`;
}

// Divisória entre o painel de diagnósticos e o ECG (padrão Window Splitter do WAI-ARIA APG): arrastar ajusta a largura
// do painel entre `minimum` e `maximum`; com o foco nela, as setas movem 16px (64px com Shift) e Home/End levam ao
// mínimo e ao máximo. Em repouso só existe o filete de 1px do painel (Apple HIG: divisória fina); passando o ponteiro,
// em foco pelo teclado ou arrastando, uma linha de 3px na cor do foco marca o que se move.
// O arrasto escreve a largura direto na variável CSS do layout, quadro a quadro, sem renderizar a página: o painel e o
// ECG reagem pelo CSS, e a largura só vai para o estado (`onChange`) ao soltar.
// Clique duplo volta à largura automática (`onChange(null)`), como nos painéis do GitHub (Primer) e no
// react-resizable-panels. A área de pegar tem 10px: 2px sobre o painel (a barra de rolagem dele fica logo antes do
// filete) e 8px sobre a margem de 12px da coluna do ECG.
export default function ReviewPanelSeparator({
  compactBelow,
  controlsId,
  isAutomatic,
  layoutRef,
  maximum,
  minimum,
  onChange,
  width,
}) {
  const separatorRef = useRef(null);
  const dragRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // A página pode renderizar no meio do arrasto (o cartão do exame quebra em duas linhas e a largura automática muda) e
  // reescrever a variável com a largura de antes: devolve a do arrasto antes da pintura, sem piscar.
  useLayoutEffect(() => {
    if (dragRef.current) writeLiveWidth(dragRef.current.lastWidth);
  });

  useEffect(
    () => () => {
      // Desmontar no meio de um arrasto (troca para a gaveta compacta) não deixa o cursor preso.
      if (dragRef.current) {
        window.cancelAnimationFrame(dragRef.current.frame);
        document.documentElement.removeAttribute("data-panel-resizing");
      }
    },
    [],
  );

  const bounds = { maximum, minimum };

  function writeLiveWidth(nextWidth) {
    const layout = layoutRef.current;
    layout?.style.setProperty("--review-sidebar-width", `${nextWidth}px`);
    // A barra do exame compacta entra e sai no meio do arrasto, como no fim dele (ver ExamReviewPage).
    layout?.toggleAttribute("data-compact-bar", nextWidth < compactBelow);
    const separator = separatorRef.current;
    if (!separator) return;
    separator.style.left = separatorLeft(nextWidth);
    separator.setAttribute("aria-valuenow", String(nextWidth));
  }

  function handlePointerDown(event) {
    if (event.button !== 0 || !event.isPrimary) return;
    // Sem `preventDefault`: o clique foca a divisória como foco de ponteiro (sem a linha de foco do teclado), e as setas
    // continuam dali. A seleção de texto no caminho fica bloqueada pelo `data-panel-resizing` na raiz.
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { frame: 0, lastWidth: width, pointerId: event.pointerId, startWidth: width, startX: event.clientX };
    document.documentElement.setAttribute("data-panel-resizing", "");
    setIsDragging(true);
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const nextWidth = clampReviewSidebarWidth(drag.startWidth + event.clientX - drag.startX, bounds);
    if (nextWidth === drag.lastWidth) return;
    drag.lastWidth = nextWidth;
    if (drag.frame) return;
    drag.frame = window.requestAnimationFrame(() => {
      drag.frame = 0;
      writeLiveWidth(drag.lastWidth);
    });
  }

  function finishDrag(event) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    window.cancelAnimationFrame(drag.frame);
    document.documentElement.removeAttribute("data-panel-resizing");
    setIsDragging(false);
    writeLiveWidth(drag.lastWidth);
    if (drag.lastWidth !== drag.startWidth) onChange(drag.lastWidth);
  }

  function handleKeyDown(event) {
    const step = event.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
    let nextWidth;
    if (event.key === "ArrowLeft") nextWidth = width - step;
    else if (event.key === "ArrowRight") nextWidth = width + step;
    else if (event.key === "Home") nextWidth = minimum;
    else if (event.key === "End") nextWidth = maximum;
    else return;
    // Cancelada, a seta não chega ao ECG (que move o traçado pelas setas).
    event.preventDefault();
    nextWidth = clampReviewSidebarWidth(nextWidth, bounds);
    if (nextWidth !== width) onChange(nextWidth);
  }

  return (
    <div
      aria-controls={controlsId}
      aria-label="Largura do painel de diagnósticos"
      aria-orientation="vertical"
      aria-valuemax={maximum}
      aria-valuemin={minimum}
      aria-valuenow={width}
      aria-valuetext={isAutomatic ? `${width} pixels, automática` : `${width} pixels`}
      className="group/separator absolute inset-y-0 z-20 w-2.5 cursor-col-resize touch-none outline-none select-none"
      data-dragging={isDragging ? "" : undefined}
      onDoubleClick={() => {
        if (!isAutomatic) onChange(null);
      }}
      onKeyDown={handleKeyDown}
      onLostPointerCapture={finishDrag}
      onPointerCancel={finishDrag}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      ref={separatorRef}
      role="separator"
      style={{ left: separatorLeft(width) }}
      tabIndex={0}
    >
      {/* Sobre o filete do painel (o último pixel dele). Ao passar o ponteiro, aparece depois de 150ms: atravessar a
          divisória a caminho do ECG não pisca a linha. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-[3px] bg-ring opacity-0 transition-opacity duration-200 ease-out motion-reduce:transition-none",
          "group-hover/separator:opacity-100 group-hover/separator:delay-150",
          "group-focus-visible/separator:opacity-100 group-focus-visible/separator:delay-0",
          "group-data-dragging/separator:opacity-100 group-data-dragging/separator:delay-0",
        )}
      />
    </div>
  );
}
