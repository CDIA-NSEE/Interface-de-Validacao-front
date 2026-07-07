import { Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import api from "../services/api.js";

const ECG_SIZE = {
  width: 1125,
  height: 645,
};

const ECG_ASPECT_RATIO = ECG_SIZE.width / ECG_SIZE.height;

function clamp(value) {
  return Math.min(100, Math.max(0, value));
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

export default function EcgViewer({ imageUrl, selectedRegion, onRegionChange }) {
  const [zoom, setZoom] = useState(1);
  const [selectionStart, setSelectionStart] = useState(null);
  const [draftRegion, setDraftRegion] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [resolvedSource, setResolvedSource] = useState("/sample-ecg.svg");
  const canvasRef = useRef(null);
  const source = useMemo(() => imageUrl || "/sample-ecg.svg", [imageUrl]);
  const activeRegion = draftRegion || selectedRegion;
  const fittedSize = useMemo(() => {
    if (!canvasSize.width || !canvasSize.height) return null;

    const widthByHeight = canvasSize.height * ECG_ASPECT_RATIO;
    const width = Math.min(canvasSize.width, widthByHeight);
    return {
      width,
      height: width / ECG_ASPECT_RATIO,
    };
  }, [canvasSize]);
  const stageStyle = fittedSize
    ? {
        width: `${fittedSize.width * zoom}px`,
        height: `${fittedSize.height * zoom}px`,
      }
    : { width: `${zoom * 100}%` };

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

      setCanvasSize({
        width: Math.max(0, canvas.clientWidth - horizontalPadding),
        height: Math.max(0, canvas.clientHeight - verticalPadding),
      });
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

  function changeZoom(amount) {
    setZoom((current) => Math.min(2.4, Math.max(0.6, Number((current + amount).toFixed(2)))));
  }

  function getPoint(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100),
    };
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    const point = getPoint(event);
    setSelectionStart(point);
    setDraftRegion({ x: point.x, y: point.y, width: 0, height: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!selectionStart) return;
    setDraftRegion(regionFromPoints(selectionStart, getPoint(event)));
  }

  function handlePointerUp(event) {
    if (!selectionStart) return;

    const region = roundRegion(regionFromPoints(selectionStart, getPoint(event)));
    if (region.width >= 0.8 && region.height >= 0.8) {
      onRegionChange?.(region);
    }

    setSelectionStart(null);
    setDraftRegion(null);
  }

  function handlePointerCancel() {
    setSelectionStart(null);
    setDraftRegion(null);
  }

  return (
    <div className="ecg-viewer">
      <div className="viewer-toolbar" aria-label="Controles do ECG">
        <button
          className="icon-button"
          type="button"
          onClick={() => changeZoom(0.15)}
          aria-label="Zoom mais"
          title="Zoom mais"
        >
          <Plus size={18} aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={() => changeZoom(-0.15)}
          aria-label="Zoom menos"
          title="Zoom menos"
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={() => setZoom(1)}
          aria-label="Resetar zoom"
          title="Resetar zoom"
        >
          <RotateCcw size={18} aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={() => setZoom(1)}
          aria-label="Ajustar à tela"
          title="Ajustar à tela"
        >
          <Maximize2 size={18} aria-hidden="true" />
        </button>
        {selectedRegion ? (
          <button
            className="icon-button"
            type="button"
            onClick={() => onRegionChange?.(null)}
            aria-label="Limpar seleção"
            title="Limpar seleção"
          >
            <X size={18} aria-hidden="true" />
          </button>
        ) : null}
        <span className="zoom-value">{Math.round(zoom * 100)}%</span>
      </div>

      <div className="ecg-canvas" ref={canvasRef}>
        <div
          className="ecg-image-stage"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          style={stageStyle}
        >
          <img src={resolvedSource} alt="Traçado do ECG" draggable="false" />
          {activeRegion ? (
            <span
              className="selection-box"
              style={{
                left: `${activeRegion.x}%`,
                top: `${activeRegion.y}%`,
                width: `${activeRegion.width}%`,
                height: `${activeRegion.height}%`,
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
