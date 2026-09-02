import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EcgViewer from "../src/components/EcgViewer.jsx";
import { TooltipProvider } from "../src/components/ui/tooltip.jsx";

function renderWithTooltips(component) {
  return render(<TooltipProvider>{component}</TooltipProvider>);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EcgViewer", () => {
  it("mantém a toolbar compacta dentro do viewer sem alterar sua altura", () => {
    const { container } = renderWithTooltips(<EcgViewer imageUrl="/ecg-real.png" />);

    const canvas = container.querySelector(".ecg-canvas");
    const toolbar = screen.getByRole("toolbar", { name: "Controles do ECG" });

    expect(canvas.parentElement).toContainElement(toolbar);
    expect(toolbar).toHaveClass("absolute", "grid", "grid-cols-2");
    expect(toolbar).not.toHaveTextContent("Controles do ECG");
    expect(canvas.parentElement).toHaveClass("min-h-72", "sm:min-h-88");
    expect(screen.getAllByRole("button")).toHaveLength(4);
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

    const zoomIn = screen.getByRole("button", { name: "Aumentar zoom" });

    expect(screen.getByRole("button", { name: "Restaurar escala" })).toHaveTextContent("100%");
    fireEvent.click(zoomIn);
    expect(document.querySelector(".ecg-image-stage")).toHaveStyle({ width: "115%" });
    fireEvent.click(screen.getByRole("button", { name: "Restaurar escala" }));
    expect(document.querySelector(".ecg-image-stage")).toHaveStyle({ width: "100%" });
    fireEvent.click(zoomIn);

    for (let index = 0; index < 20; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Aumentar zoom" }));
    }
    expect(document.querySelector(".ecg-image-stage")).toHaveStyle({ width: "240%" });
    expect(screen.getByRole("button", { name: "Aumentar zoom" })).toBeDisabled();

    for (let index = 0; index < 20; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Diminuir zoom" }));
    }
    expect(document.querySelector(".ecg-image-stage")).toHaveStyle({ width: "60%" });
    expect(screen.getByRole("button", { name: "Diminuir zoom" })).toBeDisabled();
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

    fireEvent.click(screen.getByRole("button", { name: "Cancelar edição" }));
    expect(onRegionCancel).toHaveBeenCalledOnce();
    expect(onRegionChange).toHaveBeenCalledWith(null);
  });

  it("oculta e restaura as marcações sem apagar dados", () => {
    const { container } = renderWithTooltips(
      <EcgViewer
        imageUrl="/ecg-real.png"
        regions={[{ id: 7, x: 10, y: 10, width: 20, height: 20, label: "D1.1" }]}
      />,
    );

    expect(container.querySelector(".saved-region-box")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ocultar marcações" }));
    expect(container.querySelector(".saved-region-box")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar marcações" }));
    expect(container.querySelector(".saved-region-box")).toBeInTheDocument();
  });

  it("desabilita a visão limpa e oferece cancelamento contextual durante marcação", () => {
    const onRegionCancel = vi.fn();
    renderWithTooltips(
      <EcgViewer
        imageUrl="/ecg-real.png"
        onRegionCancel={onRegionCancel}
        selectionLabel="Marcando área para D2"
        selectionDescription="Arraste sobre o ECG · Esc para cancelar"
      />,
    );

    expect(screen.getByRole("button", { name: "Ocultar marcações" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Marcando área para D2")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar marcação" }));
    expect(onRegionCancel).toHaveBeenCalledOnce();
  });

  it("cancela marcação e edição com Escape sem alterar a região persistida", () => {
    const onRegionCancel = vi.fn();
    const onRegionChange = vi.fn();
    const { rerender } = renderWithTooltips(
      <EcgViewer
        imageUrl="/ecg-real.png"
        onRegionCancel={onRegionCancel}
        onRegionChange={onRegionChange}
        selectionLabel="Marcando área para D1"
      />,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onRegionCancel).toHaveBeenCalledOnce();
    expect(onRegionChange).toHaveBeenLastCalledWith(null);

    rerender(
      <TooltipProvider>
        <EcgViewer
          imageUrl="/ecg-real.png"
          onRegionCancel={onRegionCancel}
          onRegionChange={onRegionChange}
          regions={[{ id: 4, x: 10, y: 10, width: 20, height: 20, label: "D1.1" }]}
          selectedRegion={{ id: 4, x: 10, y: 10, width: 20, height: 20 }}
          selectionLabel="Editando D1.1"
        />
      </TooltipProvider>,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onRegionCancel).toHaveBeenCalledTimes(2);
    expect(onRegionChange).toHaveBeenLastCalledWith(null);

    rerender(
      <TooltipProvider>
        <EcgViewer
          imageUrl="/ecg-real.png"
          onRegionCancel={onRegionCancel}
          onRegionChange={onRegionChange}
          regions={[{ id: 4, x: 10, y: 10, width: 20, height: 20, label: "D1.1" }]}
        />
      </TooltipProvider>,
    );
    expect(screen.getByRole("button", { name: "D1.1" })).toBeInTheDocument();
  });

  it("aplica atalhos somente com contexto do viewer e ignora campos de texto", () => {
    renderWithTooltips(
      <div>
        <textarea aria-label="Campo externo" />
        <EcgViewer imageUrl="/ecg-real.png" />
      </div>,
    );
    const viewer = screen.getByRole("region", { name: "Visualizador do traçado de ECG" });
    const textarea = screen.getByRole("textbox", { name: "Campo externo" });

    fireEvent.keyDown(window, { key: "+" });
    expect(document.querySelector(".ecg-image-stage")).toHaveStyle({ width: "100%" });

    fireEvent.pointerEnter(viewer);
    fireEvent.keyDown(window, { key: "+" });
    expect(document.querySelector(".ecg-image-stage")).toHaveStyle({ width: "115%" });
    fireEvent.keyDown(window, { key: "v" });
    expect(screen.getByRole("button", { name: "Mostrar marcações" })).toBeVisible();
    fireEvent.keyDown(window, { key: "0" });
    expect(document.querySelector(".ecg-image-stage")).toHaveStyle({ width: "100%" });

    textarea.focus();
    fireEvent.keyDown(textarea, { key: "+" });
    expect(document.querySelector(".ecg-image-stage")).toHaveStyle({ width: "100%" });
  });

  it("faz zoom pelo wheel em torno do cursor e pan apenas no modo normal", async () => {
    const { container } = renderWithTooltips(<EcgViewer imageUrl="/ecg-real.png" />);
    const canvas = container.querySelector(".ecg-canvas");
    const stage = container.querySelector(".ecg-image-stage");
    stage.setPointerCapture = vi.fn();
    Object.defineProperty(canvas, "scrollLeft", { configurable: true, writable: true, value: 30 });
    Object.defineProperty(canvas, "scrollTop", { configurable: true, writable: true, value: 20 });

    const wheelEvent = new WheelEvent("wheel", { bubbles: true, cancelable: true, clientX: 40, clientY: 30, deltaY: -100 });
    canvas.dispatchEvent(wheelEvent);
    expect(wheelEvent.defaultPrevented).toBe(true);
    await waitFor(() => expect(container.querySelector(".ecg-image-stage")).toHaveStyle({ width: "115%" }));

    canvas.scrollLeft = 30;
    canvas.scrollTop = 20;
    fireEvent.pointerDown(stage, { button: 0, clientX: 50, clientY: 50, pointerId: 2 });
    fireEvent.pointerMove(stage, { clientX: 35, clientY: 30, pointerId: 2 });
    expect(canvas.scrollLeft).toBe(45);
    expect(canvas.scrollTop).toBe(40);
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
