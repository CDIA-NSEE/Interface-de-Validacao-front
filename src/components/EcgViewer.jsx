import { Eye, EyeOff, GripVertical, Minus, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import TooltipIconButton from "@/components/TooltipIconButton.jsx";
import { DEFAULT_ECG_ASPECT_RATIO } from "../utils/reviewLayout.js";

// De caber na tela (1×) até 2,4×. Abaixo de 1× o traçado só encolhia dentro do espaço vazio.
const MIN_ZOOM = 1;
const MAX_ZOOM = 2.4;
// Passo multiplicativo: cada "+" amplia 25% do que está na tela, do começo ao fim da faixa (1 → 1,25 → 1,56 → 1,95 →
// 2,4). O passo fixo de 0,15 valia +25% no começo e +6% no fim.
const ZOOM_FACTOR = 1.25;
// Setas movem o traçado ampliado: 10% da vista por toque, meia vista com Shift.
const ARROW_PAN_DIRECTIONS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};
// Altura que a etiqueta Dn.i ocupa acima da caixa (1,375rem).
const REGION_LABEL_SPACE = 22;
const MIDDLE_BUTTON = 1;
// Até 3px entre apertar e soltar ainda é clique, não arrasto (a mão treme um pouco no clique).
const CLICK_TOLERANCE = 3;
// Dicas à esquerda da barra, 3px além da borda dela: a coluna da direita desconta um botão (32px) e o vão (4px); com
// a alça aparente à esquerda (16px), todas se afastam mais 16px para não cobri-la.
const TOOLBAR_TOOLTIP_OFFSET = { left: 8, right: 48 };
const CONTROLS_GRIP_WIDTH = 16;
// A barra nasce no canto inferior direito, sobre a tarja preta do traçado (área morta), e o médico pode arrastá-la
// para onde preferir. A posição é a fração do espaço livre (0 = encostada à esquerda/no topo, 1 = à direita/na base),
// então acompanha o visualizador quando a janela muda; fica guardada neste navegador.
const CONTROLS_POSITION_KEY = "medpage.ecgControlsPosition";
const DEFAULT_CONTROLS_POSITION = { x: 1, y: 1 };
// Margem da barra até a borda do visualizador (a do antigo right-3/bottom-3).
const CONTROLS_INSET = 12;
// Setas na alça: 16px por toque, 64px com Shift.
const CONTROLS_KEY_STEP = 16;

function readControlsPosition() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(CONTROLS_POSITION_KEY));
    if (Number.isFinite(stored?.x) && Number.isFinite(stored?.y)) {
      return { x: clamp(stored.x, 0, 1), y: clamp(stored.y, 0, 1) };
    }
  } catch {
    // Sem armazenamento (janela privada, dados bloqueados): fica no canto.
  }
  return DEFAULT_CONTROLS_POSITION;
}

function saveControlsPosition(position) {
  try {
    if (position.x === DEFAULT_CONTROLS_POSITION.x && position.y === DEFAULT_CONTROLS_POSITION.y) {
      window.localStorage.removeItem(CONTROLS_POSITION_KEY);
    } else {
      window.localStorage.setItem(CONTROLS_POSITION_KEY, JSON.stringify(position));
    }
  } catch {
    // Sem armazenamento: a posição vale só nesta tela.
  }
}

// Um clique duplo (ou Ctrl+A) punha a imagem na seleção da página, e seleção é arrastável: o arrasto seguinte virava o
// arrastar nativo do navegador — uma cópia translúcida do traçado —, que cancela o ponteiro e parava o pan em ~15px.
// `select-none` impede a seleção pelo clique; cancelar o `dragstart` cobre a que vem de fora (Ctrl+A), e aí o
// arrastar nativo não acontece (HTML Standard, processamento do drag-and-drop).
function preventNativeDrag(event) {
  event.preventDefault();
}

// Onde o apertar do ponteiro não suprime o mousedown (fora do Chromium), é ele que dispara a rolagem automática.
function preventMiddleButtonAutoscroll(event) {
  if (event.button === MIDDLE_BUTTON) event.preventDefault();
}

function stopToolbarEvent(event) {
  event.stopPropagation();
}

function clamp(value, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

// Próximo degrau da escala 1,25ⁿ na direção pedida; de um zoom fora dos degraus, vai ao degrau vizinho.
function getSteppedZoom(current, direction) {
  const level = Math.log(current) / Math.log(ZOOM_FACTOR);
  const nextLevel = direction > 0 ? Math.floor(level + 1e-6) + 1 : Math.ceil(level - 1e-6) - 1;
  return clamp(ZOOM_FACTOR ** nextLevel, MIN_ZOOM, MAX_ZOOM);
}

// Zoom proporcional ao gesto, medido em passos do "+": um dente da roda (100px) vale um passo; o touchpad manda
// dezenas de eventos pequenos por gesto e cada um vale a sua fração — antes cada evento valia um passo inteiro, e um
// gesto leve ia de 1× a 2,2×. Linhas e páginas convertidas como no d3-zoom (25px e 500px); a pinça (Ctrl) manda deltas
// ~10× menores.
function getWheelZoomExponent(event) {
  const unit = event.deltaMode === 1 ? 25 : event.deltaMode === 2 ? 500 : 1;
  return (-event.deltaY * unit * (event.ctrlKey ? 10 : 1)) / 100;
}

function roundRegion(region) {
  return {
    x: Number(region.x.toFixed(2)),
    y: Number(region.y.toFixed(2)),
    width: Number(region.width.toFixed(2)),
    height: Number(region.height.toFixed(2)),
  };
}

function regionFromPoints(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(start.x - end.x),
    height: Math.abs(start.y - end.y),
  };
}

function isTextEntryElement(target) {
  return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function hasOpenDialog() {
  return Boolean(document.querySelector("[role='dialog'][data-open], [role='alertdialog'][data-open]"));
}

// Ocupa o lugar do traçado, no mesmo tamanho: a página não salta quando o ECG chega.
function EcgImageUnavailable({ error, onRetry }) {
  return (
    <div className="absolute inset-0 grid place-items-center rounded-lg bg-muted/50 p-6">
      {error ? (
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <div className="flex flex-col gap-1" role="alert">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="text-sm text-muted-foreground">As decisões ficam bloqueadas até o traçado aparecer.</p>
          </div>
          {onRetry ? (
            <Button onClick={onRetry} size="sm" type="button" variant="outline">
              <RotateCcw aria-hidden="true" data-icon="inline-start" />
              Tentar novamente
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Spinner aria-hidden="true" />
          Carregando traçado do ECG…
        </div>
      )}
    </div>
  );
}

// `imageUrl` só chega pronto para exibir (a página baixa e decodifica o traçado). Sem ele, o viewer mostra o carregamento
// ou o `imageError` no lugar do traçado — nunca um ECG de exemplo, que o médico poderia tomar pelo do paciente.
export default function EcgViewer({
  imageError,
  imageUrl,
  onImageAspectRatioChange,
  onImageRetry,
  onRegionCancel,
  onRegionChange,
  onRegionHover,
  onRegionSelect,
  regions = [],
  selectedRegion,
  selectionLabel,
  selectionDescription,
  selectionReference,
  selectionVisual,
}) {
  const [zoom, setZoom] = useState(1);
  const [isCleanView, setIsCleanView] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [controlsPosition, setControlsPosition] = useState(readControlsPosition);
  // Posição da barra quando o arrasto começou (null fora do arrasto).
  const [controlsDragStart, setControlsDragStart] = useState(null);
  const [selectionStart, setSelectionStart] = useState(null);
  // Primeiro canto de uma marcação por dois cliques, à espera do canto oposto.
  const [firstCorner, setFirstCorner] = useState(null);
  const [draftRegion, setDraftRegion] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [canvasPadding, setCanvasPadding] = useState({ vertical: 0 });
  const [imageAspectRatio, setImageAspectRatio] = useState(DEFAULT_ECG_ASPECT_RATIO);
  const canvasRef = useRef(null);
  const slotRef = useRef(null);
  const stageRef = useRef(null);
  const viewerRef = useRef(null);
  const isPointerInsideRef = useRef(false);
  const panStartRef = useRef(null);
  const drawPressRef = useRef(null);
  // O último pan começou numa área e se moveu: o clique que o navegador ainda mande a ela não a seleciona.
  const regionPanMovedRef = useRef(false);
  const controlsRef = useRef(null);
  const controlsDragRef = useRef(null);
  const draftFrameRef = useRef(null);
  const draftPointRef = useRef(null);
  const zoomAnchorRef = useRef(null);
  const isImageReady = Boolean(imageUrl);
  const isSelectionActive = Boolean(selectionLabel);
  const isEditing = isSelectionActive && Boolean(selectedRegion);
  // Em 1× o traçado cabe inteiro: não há o que arrastar, e a mão de "agarrar" prometia um movimento que não vinha.
  const canPan = zoom > MIN_ZOOM;
  // Durante a marcação arrastar desenha; segurando Espaço (como no Photoshop e no Figma), arrastar move o traçado.
  const isSpacePanning = isSelectionActive && canPan && isSpaceHeld;
  const activeRegion = draftRegion || selectedRegion;
  const hasSelectedSavedRegion = regions.some((region) => region.isSelected);
  const visibleRegions = useMemo(
    () => regions.filter((region) => !(activeRegion?.id && region.id === activeRegion.id)),
    [activeRegion, regions],
  );
  const fittedSize = useMemo(() => {
    if (!canvasSize.width || !canvasSize.height) return null;

    const widthByHeight = canvasSize.height * imageAspectRatio;
    const width = Math.min(canvasSize.width, widthByHeight);
    return {
      width,
      height: width / imageAspectRatio,
    };
  }, [canvasSize, imageAspectRatio]);
  const stageStyle = fittedSize
    ? {
        width: `${fittedSize.width * zoom}px`,
        height: `${fittedSize.height * zoom}px`,
      }
    : { width: `${Number((zoom * 100).toFixed(2))}%` };
  const cardHeight = fittedSize ? fittedSize.height + canvasPadding.vertical : 0;
  // A etiqueta Dn.i fica acima da caixa; perto do topo do traçado (ou com zoom, rolado até o topo) ela era cortada pela
  // borda do visualizador, e então desce para dentro da caixa. Conta a folga que o traçado centralizado deixa acima dele.
  const minTopForLabelAbove = fittedSize
    ? REGION_LABEL_SPACE - Math.max(0, (canvasSize.height - fittedSize.height * zoom) / 2)
    : 0;
  const hasLabelInside = (region) =>
    Boolean(fittedSize) && (region.y / 100) * fittedSize.height * zoom < minTopForLabelAbove;

  // O espaço disponível é o do encaixe (a coluna acima das observações), não o do cartão: o cartão acompanha a altura
  // do papel, então medi-lo seria circular.
  useEffect(() => {
    const canvas = canvasRef.current;
    const slot = slotRef.current;
    if (!canvas || !slot) return undefined;

    function updateCanvasSize() {
      const canvasStyles = window.getComputedStyle(canvas);
      const horizontalPadding =
        Number.parseFloat(canvasStyles.paddingLeft) + Number.parseFloat(canvasStyles.paddingRight);
      const verticalPadding =
        Number.parseFloat(canvasStyles.paddingTop) + Number.parseFloat(canvasStyles.paddingBottom);

      // Pela caixa inteira, não pela área interna: com zoom surgem as barras de rolagem (10px cada no Windows), a área
      // interna encolhe, e o ajuste era refeito menor — o passo de zoom caía para ~1,24× e o ponto ancorado deslizava.
      const width = Math.max(0, slot.offsetWidth - horizontalPadding);
      const height = Math.max(0, slot.offsetHeight - verticalPadding);
      setCanvasSize((current) =>
        current.width === width && current.height === height ? current : { width, height },
      );
      setCanvasPadding((current) => (current.vertical === verticalPadding ? current : { vertical: verticalPadding }));
    }

    updateCanvasSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateCanvasSize);
      return () => window.removeEventListener("resize", updateCanvasSize);
    }

    const observer = new ResizeObserver(updateCanvasSize);
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

  function handleImageLoad(event) {
    const { naturalHeight, naturalWidth } = event.currentTarget;
    if (!naturalHeight || !naturalWidth) return;

    const nextAspectRatio = naturalWidth / naturalHeight;
    setImageAspectRatio(nextAspectRatio);
    onImageAspectRatioChange?.(nextAspectRatio);
  }

  // Sem âncora (botões e teclado), amplia em torno do centro da vista; antes o traçado crescia a partir do canto
  // superior esquerdo e o que o médico olhava saía da tela.
  const applyZoom = useCallback((getNextZoom, anchor = null) => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (stage && canvas) {
      const stageRect = stage.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const clientX = anchor ? anchor.clientX : canvasRect.left + canvasRect.width / 2;
      const clientY = anchor ? anchor.clientY : canvasRect.top + canvasRect.height / 2;
      zoomAnchorRef.current = {
        clientX,
        clientY,
        xRatio: stageRect.width ? (clientX - stageRect.left) / stageRect.width : 0.5,
        yRatio: stageRect.height ? (clientY - stageRect.top) / stageRect.height : 0.5,
      };
    }
    setZoom((current) => {
      const nextZoom = getNextZoom(current);
      if (nextZoom === current) zoomAnchorRef.current = null;
      return nextZoom;
    });
  }, []);

  const changeZoom = useCallback(
    (direction) => applyZoom((current) => getSteppedZoom(current, direction)),
    [applyZoom],
  );

  const resetView = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.scrollLeft = 0;
      canvas.scrollTop = 0;
    }
    zoomAnchorRef.current = { reset: true };
    setZoom(1);
  }, []);

  useLayoutEffect(() => {
    const anchor = zoomAnchorRef.current;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!anchor || !canvas || !stage) return;

    if (anchor.reset) {
      canvas.scrollLeft = Math.max(0, (canvas.scrollWidth - canvas.clientWidth) / 2);
      canvas.scrollTop = Math.max(0, (canvas.scrollHeight - canvas.clientHeight) / 2);
    } else {
      const stageRect = stage.getBoundingClientRect();
      canvas.scrollLeft += stageRect.left + (stageRect.width * anchor.xRatio) - anchor.clientX;
      canvas.scrollTop += stageRect.top + (stageRect.height * anchor.yRatio) - anchor.clientY;
    }
    zoomAnchorRef.current = null;
  }, [zoom]);

  const cancelDraftFrame = useCallback(() => {
    if (draftFrameRef.current !== null) {
      window.cancelAnimationFrame(draftFrameRef.current);
      draftFrameRef.current = null;
    }
    draftPointRef.current = null;
  }, []);

  function getPoint(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100),
    };
  }

  function handlePointerDown(event) {
    if (!isImageReady) return;
    if (event.button === MIDDLE_BUTTON) {
      // Arrastar com a rodinha move o traçado em qualquer modo — inclusive na marcação, onde o botão esquerdo desenha —,
      // como no Figma. Cancelar o apertar evita a rolagem automática do navegador (o ícone de setas do clique na rodinha).
      event.preventDefault();
      const canvas = canvasRef.current;
      panStartRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        fromRegion: false,
        // Soltar a rodinha nunca desmarca nada.
        moved: true,
        pointerId: event.pointerId,
        scrollLeft: canvas?.scrollLeft || 0,
        scrollTop: canvas?.scrollTop || 0,
      };
      setIsPanning(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }
    if (event.button !== 0) return;
    regionPanMovedRef.current = false;
    if (!isSelectionActive || isSpacePanning) {
      // Começar sobre uma área também move o traçado: com zoom, as áreas cobrem boa parte da vista. Parado, é o clique
      // que seleciona a área; por isso a captura do ponteiro só vem quando o movimento começa (ver handlePointerMove) —
      // capturado já no apertar, o clique iria para o palco e a área não seria selecionada.
      const fromRegion = !isSpacePanning && Boolean(event.target.closest?.(".saved-region-box"));
      // Desmarcar a área fica para o soltar, e só num clique: arrastar para mover o traçado mantém a seleção.
      const canvas = canvasRef.current;
      panStartRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        fromRegion,
        // Na marcação, soltar sem ter movido não desmarca nada (a seleção é a própria marcação).
        moved: isSpacePanning,
        pointerId: event.pointerId,
        scrollLeft: canvas?.scrollLeft || 0,
        scrollTop: canvas?.scrollTop || 0,
      };
      if (fromRegion) return;
      setIsPanning(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }
    // Prevent native dragging of selected page content from cancelling the gesture.
    event.preventDefault();
    const point = getPoint(event);
    // Com o primeiro canto já clicado, este gesto fecha o retângulo a partir dele.
    const start = firstCorner || point;
    drawPressRef.current = { clientX: event.clientX, clientY: event.clientY };
    setSelectionStart(start);
    setDraftRegion(regionFromPoints(start, point));
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (panStartRef.current) {
      const panStart = panStartRef.current;
      const deltaX = event.clientX - panStart.clientX;
      const deltaY = event.clientY - panStart.clientY;
      if (!panStart.moved && Math.hypot(deltaX, deltaY) >= CLICK_TOLERANCE) {
        panStart.moved = true;
        if (panStart.fromRegion) {
          event.currentTarget.setPointerCapture?.(panStart.pointerId);
          setIsPanning(true);
        }
      }
      if (panStart.fromRegion && !panStart.moved) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.scrollLeft = panStart.scrollLeft - deltaX;
      canvas.scrollTop = panStart.scrollTop - deltaY;
      return;
    }
    // Arrastando, ou entre os dois cliques: o rascunho segue o ponteiro a partir do primeiro canto.
    const start = selectionStart || firstCorner;
    if (!start) return;
    draftPointRef.current = getPoint(event);
    if (draftFrameRef.current !== null) return;
    draftFrameRef.current = window.requestAnimationFrame(() => {
      draftFrameRef.current = null;
      if (draftPointRef.current) {
        setDraftRegion(regionFromPoints(start, draftPointRef.current));
      }
    });
  }

  function handlePointerUp(event) {
    if (panStartRef.current) {
      const { fromRegion, moved } = panStartRef.current;
      panStartRef.current = null;
      setIsPanning(false);
      if (fromRegion) regionPanMovedRef.current = moved;
      // Clique parado: no vazio desmarca; numa área, quem seleciona é o clique dela.
      else if (!moved) onRegionSelect?.(null);
      return;
    }
    if (!selectionStart) return;

    cancelDraftFrame();
    const press = drawPressRef.current;
    drawPressRef.current = null;
    const isClick = Boolean(press)
      && Math.hypot(event.clientX - press.clientX, event.clientY - press.clientY) < CLICK_TOLERANCE;
    // Um clique sem arrastar marca o primeiro canto; o próximo clique (ou arrasto) marca o oposto. É a alternativa ao
    // arrasto para quem não consegue manter o botão apertado (WCAG 2.5.7).
    if (isClick && !firstCorner) {
      setFirstCorner(selectionStart);
      setSelectionStart(null);
      return;
    }

    const region = roundRegion(regionFromPoints(selectionStart, getPoint(event)));
    if (region.width >= 0.8 && region.height >= 0.8) {
      onRegionChange?.(region);
    }

    setFirstCorner(null);
    setSelectionStart(null);
    setDraftRegion(null);
  }

  function handlePointerCancel() {
    cancelDraftFrame();
    panStartRef.current = null;
    drawPressRef.current = null;
    setIsPanning(false);
    setFirstCorner(null);
    setSelectionStart(null);
    setDraftRegion(null);
  }

  function handleCanvasBackgroundClick(event) {
    if (event.target !== event.currentTarget || isSelectionActive) return;
    onRegionSelect?.(null);
  }

  const clearSelection = useCallback(() => {
    if (isSelectionActive || selectedRegion) {
      onRegionCancel?.();
      onRegionChange?.(null);
    }
    onRegionSelect?.(null);
  }, [isSelectionActive, onRegionCancel, onRegionChange, onRegionSelect, selectedRegion]);

  useEffect(() => {
    if (isSelectionActive) {
      setIsCleanView(false);
      return;
    }
    // Saindo da marcação (Esc, cancelar, salvar), some o canto pendente e o rascunho dele.
    cancelDraftFrame();
    setFirstCorner(null);
    setSelectionStart(null);
    setDraftRegion(null);
  }, [cancelDraftFrame, isSelectionActive]);

  useEffect(() => {
    if (!isImageReady || !isSelectionActive || !canPan) {
      setIsSpaceHeld(false);
      return undefined;
    }

    // Só com o ponteiro sobre o ECG: aí o Espaço é do traçado, mesmo com o foco no "Marcar área" do painel — cancelar a
    // tecla impede que ela acione o botão (o que encerraria a marcação).
    function handleKeyDown(event) {
      if (event.code !== "Space" || !isPointerInsideRef.current) return;
      if (isTextEntryElement(event.target) || hasOpenDialog()) return;
      event.preventDefault();
      setIsSpaceHeld(true);
    }

    function handleKeyUp(event) {
      if (event.code === "Space") setIsSpaceHeld(false);
    }

    function handleBlur() {
      setIsSpaceHeld(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [canPan, isImageReady, isSelectionActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isImageReady) return undefined;

    function handleWheel(event) {
      // Deslizar para o lado no touchpad rola o traçado ampliado, como em qualquer área rolável; antes, com deltaY 0,
      // cada evento lateral diminuía o zoom. A pinça chega como roda com Ctrl e continua ampliando.
      if (!event.ctrlKey && Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      const exponent = getWheelZoomExponent(event);
      if (!exponent) return;
      applyZoom((current) => clamp(current * ZOOM_FACTOR ** exponent, MIN_ZOOM, MAX_ZOOM), event);
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [applyZoom, isImageReady]);

  useEffect(() => () => cancelDraftFrame(), [cancelDraftFrame]);

  useEffect(() => {
    if (!isImageReady) return undefined;

    function handleShortcut(event) {
      const isEscape = event.key === "Escape";
      if (isTextEntryElement(event.target) && !(isEscape && isSelectionActive)) return;
      if (hasOpenDialog()) return;

      if (isEscape) {
        if (!isSelectionActive && !selectedRegion && !hasSelectedSavedRegion) return;
        event.preventDefault();
        clearSelection();
        return;
      }

      const isFocusInViewer = Boolean(viewerRef.current?.contains(document.activeElement));
      const panDirection = ARROW_PAN_DIRECTIONS[event.key];
      if (panDirection) {
        // As setas também navegam em grupos do painel (Concordo/Discordo, itens): só movem o traçado com o foco nele
        // (clicar no ECG o foca) ou, com o ponteiro sobre ele, sem nada em foco.
        const nothingFocused = !document.activeElement || document.activeElement === document.body;
        if (!canPan || event.defaultPrevented) return;
        if (!isFocusInViewer && !(isPointerInsideRef.current && nothingFocused)) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        event.preventDefault();
        const share = event.shiftKey ? 0.5 : 0.1;
        canvas.scrollLeft += panDirection[0] * canvas.clientWidth * share;
        canvas.scrollTop += panDirection[1] * canvas.clientHeight * share;
        return;
      }

      const viewerHasContext = isPointerInsideRef.current || isFocusInViewer;
      if (!viewerHasContext) return;

      if (event.key === "+" || event.code === "NumpadAdd") {
        event.preventDefault();
        changeZoom(1);
      } else if (event.key === "-" || event.code === "NumpadSubtract") {
        event.preventDefault();
        changeZoom(-1);
      } else if (event.key === "0" || event.code === "Numpad0") {
        event.preventDefault();
        resetView();
      } else if ((event.key === "v" || event.key === "V") && !isSelectionActive) {
        event.preventDefault();
        setIsCleanView((current) => !current);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [
    canPan,
    changeZoom,
    clearSelection,
    hasSelectedSavedRegion,
    isImageReady,
    isSelectionActive,
    resetView,
    selectedRegion,
  ]);

  const isDraggingControls = Boolean(controlsDragStart);

  useEffect(() => {
    if (!isDraggingControls) saveControlsPosition(controlsPosition);
  }, [controlsPosition, isDraggingControls]);

  // Desloca a barra em px a partir de `from`, sem sair do visualizador.
  function moveControls(from, deltaX, deltaY) {
    const viewer = viewerRef.current;
    const toolbar = controlsRef.current;
    if (!viewer || !toolbar) return from;
    const freeWidth = viewer.clientWidth - CONTROLS_INSET * 2 - toolbar.offsetWidth;
    const freeHeight = viewer.clientHeight - CONTROLS_INSET * 2 - toolbar.offsetHeight;
    return {
      x: freeWidth > 0 ? clamp(from.x + deltaX / freeWidth, 0, 1) : from.x,
      y: freeHeight > 0 ? clamp(from.y + deltaY / freeHeight, 0, 1) : from.y,
    };
  }

  function handleControlsGripPointerDown(event) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    controlsDragRef.current = { clientX: event.clientX, clientY: event.clientY, position: controlsPosition };
    setControlsDragStart(controlsPosition);
  }

  function handleControlsGripPointerMove(event) {
    const drag = controlsDragRef.current;
    if (!drag) return;
    setControlsPosition(moveControls(drag.position, event.clientX - drag.clientX, event.clientY - drag.clientY));
  }

  function handleControlsGripPointerUp() {
    if (!controlsDragRef.current) return;
    controlsDragRef.current = null;
    setControlsDragStart(null);
  }

  function handleControlsGripKeyDown(event) {
    const direction = ARROW_PAN_DIRECTIONS[event.key];
    if (!direction) return;
    // As setas movem a barra, não o traçado (o atalho do visualizador ignora teclas já tratadas).
    event.preventDefault();
    const step = event.shiftKey ? CONTROLS_KEY_STEP * 4 : CONTROLS_KEY_STEP;
    setControlsPosition(moveControls(controlsPosition, direction[0] * step, direction[1] * step));
  }

  // A alça é uma aba presa à lateral da barra, fora dela: em repouso a barra ocupa só os 78×78px de sempre (sobre a
  // tarja preta). Fica do lado que tem espaço — à esquerda com a barra na metade direita, à direita na outra metade.
  // Durante o arrasto, o lado é o do início: a alça não troca de lado embaixo do ponteiro ao cruzar o meio.
  const isGripOnLeft = (controlsDragStart || controlsPosition).x > 0.5;
  const tooltipGripAllowance = isGripOnLeft ? CONTROLS_GRIP_WIDTH : 0;
  const leftColumnTooltipProps = { side: "left", sideOffset: TOOLBAR_TOOLTIP_OFFSET.left + tooltipGripAllowance };
  const rightColumnTooltipProps = { side: "left", sideOffset: TOOLBAR_TOOLTIP_OFFSET.right + tooltipGripAllowance };
  // `left` perto da borda direita encolheria a barra ao espaço que sobra à direita dela; `w-max` a mantém inteira.
  const controlsStyle = {
    left: `calc(${CONTROLS_INSET}px + (100% - ${CONTROLS_INSET * 2}px) * ${controlsPosition.x})`,
    top: `calc(${CONTROLS_INSET}px + (100% - ${CONTROLS_INSET * 2}px) * ${controlsPosition.y})`,
    transform: `translate(${-controlsPosition.x * 100}%, ${-controlsPosition.y * 100}%)`,
  };

  let stageCursorClass = "";
  if (isImageReady) {
    // Movendo (botão esquerdo, Espaço ou rodinha), a mão fechada vale em qualquer modo.
    if (isPanning && canPan) stageCursorClass = isSelectionActive ? "touch-none cursor-grabbing" : "cursor-grabbing";
    else if (isSpacePanning) stageCursorClass = "touch-none cursor-grab";
    else if (isSelectionActive) stageCursorClass = "touch-none cursor-crosshair";
    else if (canPan) stageCursorClass = "cursor-grab";
  }

  const cleanViewTooltip = isSelectionActive
    ? isEditing
      ? "Conclua ou cancele a edição para ocultar as marcações."
      : "Conclua ou cancele a marcação para ocultar as marcações."
    : isCleanView
      ? "Mostrar marcações (V)"
      : "Ocultar marcações (V)";
  const controls = (
    <div
      aria-label="Controles do ECG"
      className="group/controls absolute z-10 grid w-max grid-cols-2 gap-1 rounded-lg border bg-background/95 p-1"
      onClick={stopToolbarEvent}
      onMouseDown={stopToolbarEvent}
      onPointerDown={stopToolbarEvent}
      onWheel={stopToolbarEvent}
      ref={controlsRef}
      role="toolbar"
      style={controlsStyle}
    >
      {/* Aparece com o ponteiro sobre a barra ou o foco de teclado nela (na hora; some em 200ms, como os hovers da tela) e,
          oculta, não intercepta o ponteiro — por baixo dela está o traçado. */}
      <TooltipIconButton
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
        className={cn(
          "absolute -inset-y-px h-auto w-4 border-border bg-background/95 text-muted-foreground",
          "transition-opacity duration-200 ease-out motion-reduce:transition-none",
          isDraggingControls
            ? "cursor-grabbing opacity-100"
            : "pointer-events-none cursor-grab opacity-0 group-hover/controls:pointer-events-auto group-hover/controls:opacity-100 group-hover/controls:duration-0 group-has-[:focus-visible]/controls:pointer-events-auto group-has-[:focus-visible]/controls:opacity-100",
          isGripOnLeft ? "right-full rounded-r-none border-r-0" : "left-full rounded-l-none border-l-0",
        )}
        data-controls-grip=""
        label="Mover controles"
        onDoubleClick={() => setControlsPosition(DEFAULT_CONTROLS_POSITION)}
        onKeyDown={handleControlsGripKeyDown}
        onLostPointerCapture={handleControlsGripPointerUp}
        onPointerCancel={handleControlsGripPointerUp}
        onPointerDown={handleControlsGripPointerDown}
        onPointerMove={handleControlsGripPointerMove}
        onPointerUp={handleControlsGripPointerUp}
        size="icon"
        tooltip="Arraste para mover · clique duplo volta ao canto"
        tooltipContentProps={{ side: isGripOnLeft ? "left" : "right", sideOffset: 8 }}
        variant="ghost"
      >
        <GripVertical aria-hidden="true" data-icon="inline-start" />
      </TooltipIconButton>
      <TooltipIconButton
        disabled={zoom >= MAX_ZOOM}
        label="Aumentar zoom"
        onClick={() => changeZoom(1)}
        size="icon"
        tooltip="Aumentar zoom (+)"
        tooltipContentProps={leftColumnTooltipProps}
        variant="outline"
      >
        <Plus aria-hidden="true" data-icon="inline-start" />
      </TooltipIconButton>
      <TooltipIconButton
        disabled={zoom <= MIN_ZOOM}
        label="Diminuir zoom"
        onClick={() => changeZoom(-1)}
        size="icon"
        tooltip="Diminuir zoom (-)"
        tooltipContentProps={rightColumnTooltipProps}
        variant="outline"
      >
        <Minus aria-hidden="true" data-icon="inline-start" />
      </TooltipIconButton>
      <TooltipIconButton
        aria-disabled={isSelectionActive}
        className={isSelectionActive ? "aria-disabled:opacity-50" : undefined}
        label={isCleanView ? "Mostrar marcações" : "Ocultar marcações"}
        onClick={() => {
          if (!isSelectionActive) setIsCleanView((current) => !current);
        }}
        size="icon"
        tooltip={cleanViewTooltip}
        tooltipContentProps={leftColumnTooltipProps}
        variant="outline"
      >
        {isCleanView
          ? <Eye aria-hidden="true" data-icon="inline-start" />
          : <EyeOff aria-hidden="true" data-icon="inline-start" />}
      </TooltipIconButton>
      <TooltipIconButton
        disabled={zoom === 1}
        label="Restaurar visualização"
        onClick={resetView}
        size="icon"
        tooltip="Restaurar visualização (0)"
        tooltipContentProps={rightColumnTooltipProps}
        variant="outline"
      >
        <RotateCcw aria-hidden="true" data-icon="inline-start" />
      </TooltipIconButton>
    </div>
  );

  return (
    <TooltipProvider delay={400}>
      {/* O cartão acompanha a altura do papel: a sobra da proporção (o papel é mais largo que o espaço numa tela 16:9)
          fica fora dele, como fundo da página entre o ECG e as observações. Dentro do cartão ela era uma faixa branca
          acima e abaixo do papel — 79px a 1920×1080 — que se confundia com o papel e não reagia a clique. */}
      <div className="flex min-h-72 flex-1 flex-col sm:min-h-88" ref={slotRef}>
        <div
          aria-label="Visualizador do traçado de ECG"
          className={cn(
            "relative flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-primary/25 outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !cardHeight && "flex-1",
          )}
          onPointerEnter={() => { isPointerInsideRef.current = true; }}
          onPointerLeave={() => { isPointerInsideRef.current = false; }}
          ref={viewerRef}
          role="region"
          style={cardHeight ? { height: `${cardHeight}px` } : undefined}
          tabIndex={0}
        >
          {/* Clicar no fundo do canvas fora do papel (a faixa lateral que sobra numa janela baixa) também desmarca. */}
          <div className="ecg-canvas" onClick={handleCanvasBackgroundClick} ref={canvasRef}>
            <div
              className={`ecg-image-stage ${isImageReady ? "select-none" : ""} ${stageCursorClass}`}
              onDragStart={preventNativeDrag}
              onMouseDown={preventMiddleButtonAutoscroll}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              ref={stageRef}
              style={{ ...stageStyle, aspectRatio: imageAspectRatio }}
            >
            {isImageReady ? (
              <img
                src={imageUrl}
                alt="Traçado do ECG"
                draggable="false"
                onLoad={handleImageLoad}
              />
            ) : (
              <EcgImageUnavailable error={imageError} onRetry={onImageRetry} />
            )}
            {isImageReady && !isCleanView ? visibleRegions.map((region, index) => (
              <button
                aria-label={region.label || region.regionReference || "Área vinculada"}
                aria-pressed={Boolean(region.isSelected)}
                className={`saved-region-box ${region.isHovered ? "is-hovered" : ""} ${region.isSelected ? "is-selected" : ""} ${region.isDimmed ? "is-dimmed" : ""}`}
                data-label-inside={hasLabelInside(region) || undefined}
                key={`${region.diagnosisId || "region"}-${region.id || `legacy-${index}`}`}
                onBlur={() => onRegionHover?.(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  // Soltar um pan que começou nesta área não a seleciona; Enter/Espaço (detail 0) sempre selecionam.
                  if (regionPanMovedRef.current && event.detail !== 0) return;
                  onRegionSelect?.(region);
                }}
                onFocus={() => onRegionHover?.(region)}
                onMouseEnter={() => onRegionHover?.(region)}
                onMouseLeave={() => onRegionHover?.(null)}
                style={{
                  "--region-color": region.color,
                  "--region-fill": region.fill,
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  width: `${region.width}%`,
                  height: `${region.height}%`,
                }}
                title={region.label || region.regionReference || "Área vinculada"}
              >
                {region.regionReference ? (
                  <span className="region-reference-label">{region.regionReference}</span>
                ) : null}
              </button>
            )) : null}
            {isImageReady && !isCleanView && activeRegion ? (
              <span
                className={`selection-box active-selection-box ${draftRegion ? "is-draft" : ""}`}
                data-label-inside={hasLabelInside(activeRegion) || undefined}
                style={{
                  "--region-color": selectionVisual?.color,
                  "--region-fill": selectionVisual?.fill,
                  "--region-draft-fill": selectionVisual?.draftFill,
                  left: `${activeRegion.x}%`,
                  top: `${activeRegion.y}%`,
                  width: `${activeRegion.width}%`,
                  height: `${activeRegion.height}%`,
                }}
                title={selectionReference || "Área sem diagnóstico associado"}
              >
                {selectionReference ? (
                  <span className="region-reference-label">{selectionReference}</span>
                ) : null}
              </span>
            ) : null}
            </div>
          </div>
          {/* No canto inferior esquerdo, sobre a faixa de papel sem traçado abaixo da tira longa de DII (y 591–639 de 645 em
              todos os exames da fonte); no alto ele cobria o rótulo "DI". A largura deixa livre o canto da barra de
              controles (78px + margens): estado à esquerda, controles à direita. O fundo é a tinta info a 14% sobre o fundo
              do tema, opaca: translúcido, no escuro ele pegava o branco do papel e o texto claro ficava a 1,8:1. */}
          {isSelectionActive ? (
            <Badge
              className="absolute bottom-3 left-3 z-10 h-7 max-w-[calc(100%-7rem)] gap-1 bg-[color-mix(in_oklab,var(--info)_14%,var(--background))] pr-1 pl-2"
              variant="info"
            >
              {isEditing
                ? <Pencil aria-hidden="true" data-icon="inline-start" />
                : <Plus aria-hidden="true" data-icon="inline-start" />}
              <Tooltip>
                <TooltipTrigger render={<span className="truncate" />}>{selectionLabel}</TooltipTrigger>
                <TooltipContent>{selectionDescription}</TooltipContent>
              </Tooltip>
              <TooltipIconButton
                className="size-5 rounded-full border-0 bg-transparent hover:bg-info/20"
                label={isEditing ? "Cancelar edição" : "Cancelar marcação"}
                onClick={clearSelection}
                tooltip={isEditing ? "Cancelar edição (Esc)" : "Cancelar marcação (Esc)"}
                variant="ghost"
              >
                <X aria-hidden="true" data-icon="inline-start" />
              </TooltipIconButton>
            </Badge>
          ) : null}
          {isImageReady ? controls : null}
        </div>
      </div>
    </TooltipProvider>
  );
}
