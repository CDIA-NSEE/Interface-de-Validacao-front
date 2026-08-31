import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";

import EcgViewer from "../src/components/EcgViewer.jsx";
import { TooltipProvider } from "../src/components/ui/tooltip.jsx";

function renderWithTooltips(component) {
  return render(<TooltipProvider>{component}</TooltipProvider>);
}

function ViewerHarness(props) {
  const [controlsTarget, setControlsTarget] = useState(null);

  return (
    <>
      <div data-testid="ecg-controls-target" ref={setControlsTarget} />
      <EcgViewer {...props} controlsTarget={controlsTarget} />
    </>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EcgViewer", () => {
  it("renderiza os controles no alvo externo sem faixa ou rótulo visível", () => {
    const { container } = renderWithTooltips(<ViewerHarness imageUrl="/ecg-real.png" />);

    const canvas = container.querySelector(".ecg-canvas");
    const controlsTarget = screen.getByTestId("ecg-controls-target");
    const toolbar = screen.getByRole("toolbar", { name: "Controles do ECG" });

    expect(container.querySelector("[data-testid='ecg-controls-dock']")).not.toBeInTheDocument();
    expect(controlsTarget).toContainElement(toolbar);
    expect(toolbar).not.toHaveTextContent("Controles do ECG");
    expect(canvas.parentElement).toHaveClass("min-h-72", "sm:min-h-88");
  });

  it("usa a proporção natural da imagem e a informa ao layout", async () => {
    const onImageAspectRatioChange = vi.fn();
    let resizeCallback;
    vi.stubGlobal("ResizeObserver", class ResizeObserver {
      constructor(callback) {
        resizeCallback = callback;
      }
      observe() {}
      disconnect() {}
    });

    const { container } = renderWithTooltips(
      <EcgViewer imageUrl="/ecg-real.png" onImageAspectRatioChange={onImageAspectRatioChange} />,
    );

    const canvas = container.querySelector(".ecg-canvas");
    Object.defineProperty(canvas, "clientWidth", { configurable: true, value: 1000 });
    Object.defineProperty(canvas, "clientHeight", { configurable: true, value: 600 });

    const image = screen.getByRole("img", { name: "Traçado do ECG" });
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 1200 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 600 });

    fireEvent.load(image);
    resizeCallback();

    await waitFor(() => expect(onImageAspectRatioChange).toHaveBeenCalledWith(2));
    expect(container.querySelector(".ecg-image-stage")).toHaveStyle({
      aspectRatio: "2",
      height: "500px",
      width: "1000px",
    });
  });

  it("limita a imagem pela altura disponível sem deformar o ECG", async () => {
    let resizeCallback;
    vi.stubGlobal("ResizeObserver", class ResizeObserver {
      constructor(callback) {
        resizeCallback = callback;
      }
      observe() {}
      disconnect() {}
    });

    const { container } = renderWithTooltips(<EcgViewer imageUrl="/ecg-real.png" />);
    const canvas = container.querySelector(".ecg-canvas");
    Object.defineProperty(canvas, "clientWidth", { configurable: true, value: 1000 });
    Object.defineProperty(canvas, "clientHeight", { configurable: true, value: 400 });

    const image = screen.getByRole("img", { name: "Traçado do ECG" });
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 1200 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 600 });

    fireEvent.load(image);
    resizeCallback();

    await waitFor(() => {
      expect(container.querySelector(".ecg-image-stage")).toHaveStyle({
        aspectRatio: "2",
        height: "400px",
        width: "800px",
      });
    });
  });

  it("preserva a faixa de zoom de 0,6 a 2,4 e o passo de 0,15", () => {
    renderWithTooltips(<EcgViewer imageUrl="/ecg-real.png" />);

    const zoomIn = screen.getByRole("button", { name: "Zoom mais" });

    expect(screen.getByText("100%")).toBeVisible();
    fireEvent.click(zoomIn);
    expect(screen.getByText("115%")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Resetar zoom" }));
    expect(screen.getByText("100%")).toBeVisible();
    fireEvent.click(zoomIn);
    fireEvent.click(screen.getByRole("button", { name: "Ajustar à tela" }));
    expect(screen.getByText("100%")).toBeVisible();
    fireEvent.click(zoomIn);

    for (let index = 0; index < 20; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Zoom mais" }));
    }
    expect(screen.getByText("240%")).toBeVisible();
    expect(screen.getByRole("button", { name: "Zoom mais" })).toBeDisabled();

    for (let index = 0; index < 20; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Zoom menos" }));
    }
    expect(screen.getByText("60%")).toBeVisible();
    expect(screen.getByRole("button", { name: "Zoom menos" })).toBeDisabled();
  });

  it("mantém as regiões em coordenadas percentuais e permite limpar a seleção", () => {
    const onRegionCancel = vi.fn();
    const onRegionChange = vi.fn();
    const { container } = renderWithTooltips(
      <EcgViewer
        imageUrl="/ecg-real.png"
        onRegionCancel={onRegionCancel}
        onRegionChange={onRegionChange}
        regions={[
          {
            id: 7,
            diagnosisId: 3,
            x: 12.5,
            y: 20,
            width: 18,
            height: 9.5,
            label: "D1 · Ritmo sinusal",
            regionReference: "D1-A1",
          },
        ]}
        selectedRegion={{ x: 40, y: 30, width: 10, height: 12 }}
        selectionLabel="Marcando D2-A1"
        selectionReference="D2-A1"
      />,
    );

    expect(container.querySelector(".saved-region-box")).toHaveStyle({
      left: "12.5%",
      top: "20%",
      width: "18%",
      height: "9.5%",
    });
    expect(container.querySelector(".active-selection-box")).toHaveStyle({
      left: "40%",
      top: "30%",
      width: "10%",
      height: "12%",
    });

    fireEvent.click(screen.getByRole("button", { name: "Limpar seleção" }));
    expect(onRegionCancel).toHaveBeenCalledOnce();
    expect(onRegionChange).toHaveBeenCalledWith(null);
  });

  it("só desenha após ativar Marcar área e permite ciclos consecutivos", () => {
    const onRegionChange = vi.fn();
    const { container, rerender } = renderWithTooltips(
      <EcgViewer imageUrl="/ecg-real.png" onRegionChange={onRegionChange} />,
    );
    const stage = container.querySelector(".ecg-image-stage");
    stage.setPointerCapture = vi.fn();
    vi.spyOn(stage, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 100, height: 100 });

    fireEvent.pointerDown(stage, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(stage, { button: 0, clientX: 40, clientY: 40, pointerId: 1 });
    expect(onRegionChange).not.toHaveBeenCalled();
    expect(stage).not.toHaveClass("touch-none", "cursor-crosshair");

    rerender(<TooltipProvider><EcgViewer imageUrl="/ecg-real.png" onRegionChange={onRegionChange} selectionLabel="Marcando área para D1" /></TooltipProvider>);
    const activeStage = container.querySelector(".ecg-image-stage");
    activeStage.setPointerCapture = vi.fn();
    vi.spyOn(activeStage, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 100, height: 100 });
    expect(activeStage).toHaveClass("touch-none", "cursor-crosshair");

    for (const pointerId of [2, 3]) {
      fireEvent.pointerDown(activeStage, { button: 0, clientX: 10, clientY: 10, pointerId });
      fireEvent.pointerUp(activeStage, { button: 0, clientX: 40, clientY: 40, pointerId });
    }
    expect(onRegionChange).toHaveBeenCalledTimes(2);
  });

  it("sincroniza hover, foco e seleção das regiões salvas", () => {
    const onRegionHover = vi.fn();
    const onRegionSelect = vi.fn();
    renderWithTooltips(
      <EcgViewer
        imageUrl="/ecg-real.png"
        onRegionHover={onRegionHover}
        onRegionSelect={onRegionSelect}
        regions={[{ id: 9, diagnosisId: 1, regionKey: "1:9", x: 10, y: 10, width: 20, height: 20, label: "D1.1 · Ritmo sinusal" }]}
      />,
    );

    const region = screen.getByRole("button", { name: "D1.1 · Ritmo sinusal" });
    fireEvent.mouseEnter(region);
    fireEvent.focus(region);
    fireEvent.click(region);
    expect(onRegionHover).toHaveBeenCalledWith(expect.objectContaining({ regionKey: "1:9" }));
    expect(onRegionSelect).toHaveBeenCalledWith(expect.objectContaining({ regionKey: "1:9" }));
  });
});
