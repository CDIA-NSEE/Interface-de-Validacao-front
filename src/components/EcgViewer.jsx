import { Eye, EyeOff, Minus, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TooltipIconButton from "@/components/TooltipIconButton.jsx";
import api from "../services/api.js";
import { DEFAULT_ECG_ASPECT_RATIO } from "../utils/reviewLayout.js";

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.4;
const ZOOM_STEP = 0.15;
const TOOLBAR_LEFT_TOOLTIP_PROPS = { side: "left", sideOffset: 8 };
const TOOLBAR_RIGHT_TOOLTIP_PROPS = { side: "left", sideOffset: 48 };

function stopToolbarEvent(event) {
  event.stopPropagation();
}

function clamp(value, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
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

export default function EcgViewer({
  imageUrl,
  onImageAspectRatioChange,
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
  const [selectionStart, setSelectionStart] = useState(null);
  const [draftRegion, setDraftRegion] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [imageAspectRatio, setImageAspectRatio] = useState(DEFAULT_ECG_ASPECT_RATIO);
  const [resolvedSource, setResolvedSource] = useState("/sample-ecg.svg");
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const viewerRef = useRef(null);
  const isPointerInsideRef = useRef(false);
  const panStartRef = useRef(null);
  const draftFrameRef = useRef(null);
  const draftPointRef = useRef(null);
  const zoomAnchorRef = useRef(null);
  const source = useMemo(() => imageUrl || "/sample-ecg.svg", [imageUrl]);
  const isSelectionActive = Boolean(selectionLabel);
  const isEditing = isSelectionActive && Boolean(selectedRegion);
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

  useEffect(() => {
    let objectUrl = null;
    let isCurrent = true;

    if (!source.startsWith("/exams/")) {
      setResolvedSource(source);
      return undefined;
    }

    api
      .get(source, { responseType: "blob" })
      .then((response) => {
        if (!isCurrent) return;
        objectUrl = URL.createObjectURL(response.data);
        setResolvedSource(objectUrl);
      })
      .catch(() => {
        if (isCurrent) setResolvedSource("/sample-ecg.svg");
      });

    return () => {
      isCurrent = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [source]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    function updateCanvasSize() {
      const canvasStyles = window.getComputedStyle(canvas);
      const horizontalPadding =
        Number.parseFloat(canvasStyles.paddingLeft) + Number.parseFloat(canvasStyles.paddingRight);
      const verticalPadding =
        Number.parseFloat(canvasStyles.paddingTop) + Number.parseFloat(canvasStyles.paddingBottom);

      const width = Math.max(0, canvas.clientWidth - horizontalPadding);
      const height = Math.max(0, canvas.clientHeight - verticalPadding);
      setCanvasSize((current) =>
        current.width === width && current.height === height ? current : { width, height },
      );
    }

    updateCanvasSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateCanvasSize);
      return () => window.removeEventListener("resize", updateCanvasSize);
    }

    const observer = new ResizeObserver(updateCanvasSize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  function handleImageLoad(event) {
    const { naturalHeight, naturalWidth } = event.currentTarget;
    if (!naturalHeight || !naturalWidth) return;

    const nextAspectRatio = naturalWidth / naturalHeight;
    setImageAspectRatio(nextAspectRatio);
    onImageAspectRatioChange?.(nextAspectRatio);
  }

  const changeZoom = useCallback((amount, anchor = null) => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (anchor && stage && canvas) {
      const stageRect = stage.getBoundingClientRect();
      zoomAnchorRef.current = {
        clientX: anchor.clientX,
        clientY: anchor.clientY,
        xRatio: stageRect.width ? (anchor.clientX - stageRect.left) / stageRect.width : 0.5,
        yRatio: stageRect.height ? (anchor.clientY - stageRect.top) / stageRect.height : 0.5,
      };
    }
    setZoom((current) => {
      const nextZoom = clamp(Number((current + amount).toFixed(2)), MIN_ZOOM, MAX_ZOOM);
      if (nextZoom === current) zoomAnchorRef.current = null;
      return nextZoom;
    });
  }, []);

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
    if (event.button !== 0) return;
    if (!isSelectionActive) {
      if (event.target.closest?.(".saved-region-box")) return;
      onRegionSelect?.(null);
      const canvas = canvasRef.current;
      panStartRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        scrollLeft: canvas?.scrollLeft || 0,
        scrollTop: canvas?.scrollTop || 0,
      };
      setIsPanning(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }
    const point = getPoint(event);
    setSelectionStart(point);
    setDraftRegion({ x: point.x, y: point.y, width: 0, height: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (panStartRef.current && !isSelectionActive) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.scrollLeft = panStartRef.current.scrollLeft - (event.clientX - panStartRef.current.clientX);
      canvas.scrollTop = panStartRef.current.scrollTop - (event.clientY - panStartRef.current.clientY);
      return;
    }
    if (!selectionStart) return;
    draftPointRef.current = getPoint(event);
    if (draftFrameRef.current !== null) return;
    draftFrameRef.current = window.requestAnimationFrame(() => {
      draftFrameRef.current = null;
      if (draftPointRef.current) {
        setDraftRegion(regionFromPoints(selectionStart, draftPointRef.current));
      }
    });
  }

  function handlePointerUp(event) {
    if (panStartRef.current) {
      panStartRef.current = null;
      setIsPanning(false);
      return;
    }
    if (!selectionStart) return;

    cancelDraftFrame();
    const region = roundRegion(regionFromPoints(selectionStart, getPoint(event)));
    if (region.width >= 0.8 && region.height >= 0.8) {
      onRegionChange?.(region);
    }

    setSelectionStart(null);
    setDraftRegion(null);
  }

  function handlePointerCancel() {
    cancelDraftFrame();
    panStartRef.current = null;
    setIsPanning(false);
    setSelectionStart(null);
    setDraftRegion(null);
  }

  const clearSelection = useCallback(() => {
    if (isSelectionActive || selectedRegion) {
      onRegionCancel?.();
      onRegionChange?.(null);
    }
    onRegionSelect?.(null);
  }, [isSelectionActive, onRegionCancel, onRegionChange, onRegionSelect, selectedRegion]);

  useEffect(() => {
    if (isSelectionActive) setIsCleanView(false);
  }, [isSelectionActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    function handleWheel(event) {
      event.preventDefault();
      changeZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP, event);
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [changeZoom]);

  useEffect(() => () => cancelDraftFrame(), [cancelDraftFrame]);

  useEffect(() => {
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

      const viewerHasContext = isPointerInsideRef.current || viewerRef.current?.contains(document.activeElement);
      if (!viewerHasContext) return;

      if (event.key === "+" || event.code === "NumpadAdd") {
        event.preventDefault();
        changeZoom(ZOOM_STEP);
      } else if (event.key === "-" || event.code === "NumpadSubtract") {
        event.preventDefault();
        changeZoom(-ZOOM_STEP);
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
  }, [changeZoom, clearSelection, hasSelectedSavedRegion, isSelectionActive, resetView, selectedRegion]);

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
      className="absolute right-3 bottom-3 z-10 grid grid-cols-2 gap-1 rounded-lg border bg-background/95 p-1"
      onClick={stopToolbarEvent}
      onMouseDown={stopToolbarEvent}
      onPointerDown={stopToolbarEvent}
      onWheel={stopToolbarEvent}
      role="toolbar"
    >
      <TooltipIconButton
        disabled={zoom >= MAX_ZOOM}
        label="Aumentar zoom"
        onClick={() => changeZoom(ZOOM_STEP)}
        size="icon"
        tooltip="Aumentar zoom (+)"
        tooltipContentProps={TOOLBAR_LEFT_TOOLTIP_PROPS}
        variant="outline"
      >
        <Plus aria-hidden="true" data-icon="inline-start" />
      </TooltipIconButton>
      <TooltipIconButton
        disabled={zoom <= MIN_ZOOM}
        label="Diminuir zoom"
        onClick={() => changeZoom(-ZOOM_STEP)}
        size="icon"
        tooltip="Diminuir zoom (-)"
        tooltipContentProps={TOOLBAR_RIGHT_TOOLTIP_PROPS}
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
        tooltipContentProps={TOOLBAR_LEFT_TOOLTIP_PROPS}
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
        tooltipContentProps={TOOLBAR_RIGHT_TOOLTIP_PROPS}
        variant="outline"
      >
        <RotateCcw aria-hidden="true" data-icon="inline-start" />
      </TooltipIconButton>
    </div>
  );

  return (
    <TooltipProvider delay={400}>
      <div
        aria-label="Visualizador do traçado de ECG"
        className="relative flex min-h-72 flex-1 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-primary/25 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-88"
        onPointerEnter={() => { isPointerInsideRef.current = true; }}
        onPointerLeave={() => { isPointerInsideRef.current = false; }}
        ref={viewerRef}
        role="region"
        tabIndex={0}
      >
        <div className="ecg-canvas" ref={canvasRef}>
          <div
            className={`ecg-image-stage ${isSelectionActive ? "touch-none cursor-crosshair" : isPanning ? "cursor-grabbing" : "cursor-grab"}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            ref={stageRef}
            style={{ ...stageStyle, aspectRatio: imageAspectRatio }}
          >
          <img
            src={resolvedSource}
            alt="Traçado do ECG"
            draggable="false"
            onLoad={handleImageLoad}
          />
          {!isCleanView ? visibleRegions.map((region, index) => (
            <button
              aria-label={region.label || region.regionReference || "Área vinculada"}
              aria-pressed={Boolean(region.isSelected)}
              className={`saved-region-box ${region.isHovered ? "is-hovered" : ""} ${region.isSelected ? "is-selected" : ""} ${region.isDimmed ? "is-dimmed" : ""}`}
              key={`${region.diagnosisId || "region"}-${region.id || `legacy-${index}`}`}
              onBlur={() => onRegionHover?.(null)}
              onClick={(event) => {
                event.stopPropagation();
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
          {!isCleanView && activeRegion ? (
            <span
              className={`selection-box active-selection-box ${draftRegion ? "is-draft" : ""}`}
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
        {isSelectionActive ? (
          <Badge className="absolute top-3 left-3 z-10 h-7 max-w-[calc(100%-6rem)] gap-1 pr-1 pl-2" variant="info">
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
        {controls}
      </div>
    </TooltipProvider>
  );
}
