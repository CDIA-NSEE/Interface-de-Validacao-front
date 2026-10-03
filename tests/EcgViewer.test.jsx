import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    // A altura mínima é do encaixe; o cartão acompanha o papel dentro dele.
    expect(canvas.parentElement.parentElement).toHaveClass("min-h-72", "sm:min-h-88");
    const [grip, ...controls] = screen.getAllByRole("button");
    // A alça é uma aba fora da grade (absoluta), oculta em repouso: a barra segue 2×2.
    expect(grip).toHaveAccessibleName("Mover controles");
    expect(grip).toHaveClass("absolute", "opacity-0", "pointer-events-none", "right-full");
    expect(controls).toHaveLength(4);
    controls.forEach((control) => expect(control).toHaveClass("size-8"));
    expect(screen.getByRole("button", { name: "Restaurar visualização" })).not.toHaveTextContent("100%");
  });

  it("deixa arrastar a barra de controles, guarda a posição e volta ao canto no clique duplo", () => {
    window.localStorage.removeItem("medpage.ecgControlsPosition");
    const { unmount } = renderWithTooltips(<EcgViewer imageUrl="/ecg-real.png" />);
    const viewer = screen.getByRole("region", { name: "Visualizador do traçado de ECG" });
    const toolbar = screen.getByRole("toolbar", { name: "Controles do ECG" });
    const grip = screen.getByRole("button", { name: "Mover controles" });
    grip.setPointerCapture = vi.fn();
    // left/top = calc(4px + fração × (100% − 8px)): a fração é a posição no espaço livre.
    const fraction = (value) => Number(value.match(/\+ ([\d.]+) \*/)[1]);
    const expectHome = (element) => {
      expect(element.style.right).toBe("12px");
      expect(element.style.bottom).toBe("12px");
      expect(element.style.left).toBe("");
    };
    // Visualizador de 908×508 e barra de 100×100: sobram 800×400 para mover (4px de margem de cada lado).
    Object.defineProperty(viewer, "clientWidth", { configurable: true, value: 908 });
    Object.defineProperty(viewer, "clientHeight", { configurable: true, value: 508 });
    Object.defineProperty(toolbar, "offsetWidth", { configurable: true, value: 100 });
    Object.defineProperty(toolbar, "offsetHeight", { configurable: true, value: 100 });

    // Nasce no canto inferior direito, a 12px das bordas (sobre a tarja), e não a 4px do extremo.
    expectHome(toolbar);

    // Parte de onde está: 8px antes do extremo (792 de 800, 392 de 400).
    fireEvent.pointerDown(grip, { button: 0, clientX: 900, clientY: 450, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientX: 508, clientY: 258, pointerId: 1 });
    fireEvent.pointerUp(grip, { clientX: 508, clientY: 258, pointerId: 1 });
    expect(fraction(toolbar.style.left)).toBe(0.5);
    expect(fraction(toolbar.style.top)).toBe(0.5);
    expect(JSON.parse(window.localStorage.getItem("medpage.ecgControlsPosition"))).toEqual({ x: 0.5, y: 0.5 });

    // Não sai do visualizador, mas chega a 4px da borda.
    fireEvent.pointerDown(grip, { button: 0, clientX: 500, clientY: 300, pointerId: 2 });
    fireEvent.pointerMove(grip, { clientX: -2000, clientY: -2000, pointerId: 2 });
    fireEvent.pointerUp(grip, { clientX: -2000, clientY: -2000, pointerId: 2 });
    expect(fraction(toolbar.style.left)).toBe(0);
    expect(toolbar.style.left).toMatch(/^calc\(4px/);

    // Pelo teclado, setas na alça movem a barra (e não o traçado).
    fireEvent.keyDown(grip, { key: "ArrowRight", shiftKey: true });
    expect(fraction(toolbar.style.left)).toBe(0.08);

    // A posição vale para o próximo exame.
    unmount();
    renderWithTooltips(<EcgViewer imageUrl="/ecg-real.png" />);
    const nextToolbar = screen.getByRole("toolbar", { name: "Controles do ECG" });
    expect(fraction(nextToolbar.style.left)).toBe(0.08);
    expect(fraction(nextToolbar.style.top)).toBe(0);

    // O extremo inferior direito (a 4px) é guardado; a posição inicial (a 12px) não.
    const nextGrip = screen.getByRole("button", { name: "Mover controles" });
    nextGrip.setPointerCapture = vi.fn();
    const nextViewer = screen.getByRole("region", { name: "Visualizador do traçado de ECG" });
    Object.defineProperty(nextViewer, "clientWidth", { configurable: true, value: 908 });
    Object.defineProperty(nextViewer, "clientHeight", { configurable: true, value: 508 });
    Object.defineProperty(nextToolbar, "offsetWidth", { configurable: true, value: 100 });
    Object.defineProperty(nextToolbar, "offsetHeight", { configurable: true, value: 100 });
    fireEvent.pointerDown(nextGrip, { button: 0, clientX: 0, clientY: 0, pointerId: 3 });
    fireEvent.pointerMove(nextGrip, { clientX: 2000, clientY: 2000, pointerId: 3 });
    fireEvent.pointerUp(nextGrip, { clientX: 2000, clientY: 2000, pointerId: 3 });
    expect(fraction(nextToolbar.style.left)).toBe(1);
    expect(fraction(nextToolbar.style.top)).toBe(1);
    expect(JSON.parse(window.localStorage.getItem("medpage.ecgControlsPosition"))).toEqual({ x: 1, y: 1 });

    fireEvent.doubleClick(nextGrip);
    expectHome(nextToolbar);
    expect(window.localStorage.getItem("medpage.ecgControlsPosition")).toBeNull();
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
    canvas.parentElement.parentElement.getBoundingClientRect = () => ({ width: 1000, height: 600 });

    const image = screen.getByRole("img", { name: "Traçado do ECG" });
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 1200 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 600 });

    fireEvent.load(image);
    // Em `act`, como nos outros testes: fora dele a medida nova só era desenhada depois, e a checagem do estilo abaixo
    // (o `waitFor` passa na hora, porque o aviso da proporção é síncrono) falhava quando a suíte rodava com carga.
    act(() => resizeCallback());

    await waitFor(() => expect(onImageAspectRatioChange).toHaveBeenCalledWith(2));
    expect(container.querySelector(".ecg-image-stage")).toHaveStyle({
      aspectRatio: "2",
      height: "500px",
      width: "1000px",
    });
  });

  it("não refaz o ajuste menor quando as barras de rolagem aparecem com o zoom", async () => {
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
    canvas.parentElement.parentElement.getBoundingClientRect = () => ({ width: 1000, height: 600 });
    Object.defineProperty(canvas, "clientWidth", { configurable: true, value: 1000 });
    Object.defineProperty(canvas, "clientHeight", { configurable: true, value: 600 });
    const image = screen.getByRole("img", { name: "Traçado do ECG" });
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 1200 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 600 });
    fireEvent.load(image);
    act(() => resizeCallback());
    const stage = container.querySelector(".ecg-image-stage");
    await waitFor(() => expect(stage).toHaveStyle({ width: "1000px" }));

    fireEvent.click(screen.getByRole("button", { name: "Aumentar zoom" }));
    // As barras de rolagem tomam 10px da área interna do canvas; o ajuste vem do encaixe, que não muda.
    Object.defineProperty(canvas, "clientWidth", { configurable: true, value: 990 });
    Object.defineProperty(canvas, "clientHeight", { configurable: true, value: 590 });
    act(() => resizeCallback());
    expect(stage).toHaveStyle({ width: "1250px", height: "625px" });
  });

  it("ajusta o cartão à altura do papel e deixa a sobra fora dele", async () => {
    let resizeCallback;
    vi.stubGlobal("ResizeObserver", class ResizeObserver {
      constructor(callback) {
        resizeCallback = callback;
      }
      observe() {}
      disconnect() {}
    });
    const onRegionSelect = vi.fn();

    const { container } = renderWithTooltips(<EcgViewer imageUrl="/ecg-real.png" onRegionSelect={onRegionSelect} />);
    const viewer = screen.getByRole("region", { name: "Visualizador do traçado de ECG" });
    const slot = viewer.parentElement;
    // Encaixe de 1000×800 e papel 2:1: o papel tem 1000×500, e o cartão, 500 de altura (não os 800 do encaixe).
    slot.getBoundingClientRect = () => ({ width: 1000, height: 800 });
    const image = screen.getByRole("img", { name: "Traçado do ECG" });
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 1200 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 600 });
    fireEvent.load(image);
    act(() => resizeCallback());

    await waitFor(() => expect(viewer).toHaveStyle({ height: "500px" }));
    expect(viewer).not.toHaveClass("flex-1");
    expect(slot).toHaveClass("flex-1");

    // O fundo do canvas fora do papel (numa janela baixa, a faixa lateral) também desmarca.
    fireEvent.click(container.querySelector(".ecg-canvas"));
    expect(onRegionSelect).toHaveBeenCalledWith(null);
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
    canvas.parentElement.parentElement.getBoundingClientRect = () => ({ width: 1000, height: 400 });

    const image = screen.getByRole("img", { name: "Traçado do ECG" });
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 1200 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 600 });

    fireEvent.load(image);
    act(() => resizeCallback());

    await waitFor(() => {
      expect(container.querySelector(".ecg-image-stage")).toHaveStyle({
        aspectRatio: "2",
        height: "400px",
        width: "800px",
      });
    });
  });

  it("desce a etiqueta Dn.i para dentro da caixa quando ela não cabe acima", async () => {
    let resizeCallback;
    vi.stubGlobal("ResizeObserver", class ResizeObserver {
      constructor(callback) {
        resizeCallback = callback;
      }
      observe() {}
      disconnect() {}
    });

    const { container } = renderWithTooltips(
      <EcgViewer
        imageUrl="/ecg-real.png"
        regions={[
          { id: 1, x: 10, y: 2, width: 10, height: 10, label: "D2.1", regionReference: "D2.1" },
          { id: 2, x: 40, y: 10, width: 10, height: 10, label: "D2.2", regionReference: "D2.2" },
        ]}
      />,
    );
    const canvas = container.querySelector(".ecg-canvas");
    canvas.parentElement.parentElement.getBoundingClientRect = () => ({ width: 1000, height: 500 });
    const image = screen.getByRole("img", { name: "Traçado do ECG" });
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 1200 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 600 });
    fireEvent.load(image);
    act(() => resizeCallback());

    // Traçado de 1000×500 sem folga acima: a 2% (10px) a etiqueta não cabe; a 10% (50px), cabe.
    const nearTop = screen.getByRole("button", { name: "D2.1" });
    const lower = screen.getByRole("button", { name: "D2.2" });
    await waitFor(() => expect(nearTop).toHaveAttribute("data-label-inside"));
    expect(lower).not.toHaveAttribute("data-label-inside");

    // Com zoom, a mesma área fica mais longe do topo: a 2,4× são 24px, e a etiqueta volta para cima.
    const zoomIn = screen.getByRole("button", { name: "Aumentar zoom" });
    for (let index = 0; index < 4; index += 1) fireEvent.click(zoomIn);
    expect(nearTop).not.toHaveAttribute("data-label-inside");
  });

  it("sem o traçado, mostra o carregamento no lugar dele, sem áreas nem controles", () => {
    renderWithTooltips(
      <EcgViewer regions={[{ id: 1, x: 10, y: 10, width: 20, height: 20, regionReference: "D2.1" }]} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Carregando traçado do ECG…");
    expect(screen.queryByRole("img", { name: "Traçado do ECG" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "D2.1" })).not.toBeInTheDocument();
    expect(screen.queryByRole("toolbar", { name: "Controles do ECG" })).not.toBeInTheDocument();
  });

  it("na falha do traçado, explica o bloqueio e oferece tentar de novo", () => {
    const onImageRetry = vi.fn();
    renderWithTooltips(
      <EcgViewer imageError="Não foi possível carregar o traçado do ECG." onImageRetry={onImageRetry} />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível carregar o traçado do ECG.");
    expect(alert).toHaveTextContent("As decisões ficam bloqueadas até o traçado aparecer.");
    expect(screen.queryByRole("img", { name: "Traçado do ECG" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onImageRetry).toHaveBeenCalledTimes(1);
  });

  it("amplia em passos de 25% entre caber na tela (1×) e 2,4×", () => {
    renderWithTooltips(<EcgViewer imageUrl="/ecg-real.png" />);

    const stage = document.querySelector(".ecg-image-stage");
    const zoomIn = screen.getByRole("button", { name: "Aumentar zoom" });
    const zoomOut = screen.getByRole("button", { name: "Diminuir zoom" });
    const reset = screen.getByRole("button", { name: "Restaurar visualização" });
    expect(zoomOut).toBeDisabled();
    expect(reset).toBeDisabled();

    fireEvent.click(zoomIn);
    expect(stage).toHaveStyle({ width: "125%" });
    expect(reset).toBeEnabled();
    fireEvent.click(reset);
    expect(stage).toHaveStyle({ width: "100%" });
    expect(reset).toBeDisabled();

    const widths = [];
    for (let index = 0; index < 6; index += 1) {
      fireEvent.click(zoomIn);
      widths.push(stage.style.width);
    }
    expect(widths).toEqual(["125%", "156.25%", "195.31%", "240%", "240%", "240%"]);
    expect(zoomIn).toBeDisabled();

    // Da ponta de cima, volta pelos mesmos degraus.
    fireEvent.click(zoomOut);
    expect(stage).toHaveStyle({ width: "195.31%" });
    for (let index = 0; index < 6; index += 1) fireEvent.click(zoomOut);
    expect(stage).toHaveStyle({ width: "100%" });
    expect(zoomOut).toBeDisabled();
  });

  it("amplia pelos botões e pelo teclado em torno do centro da vista", () => {
    const { container } = renderWithTooltips(<EcgViewer imageUrl="/ecg-real.png" />);
    const viewer = screen.getByRole("region", { name: "Visualizador do traçado de ECG" });
    const canvas = container.querySelector(".ecg-canvas");
    const stage = container.querySelector(".ecg-image-stage");
    Object.defineProperty(canvas, "scrollLeft", { configurable: true, writable: true, value: 0 });
    Object.defineProperty(canvas, "scrollTop", { configurable: true, writable: true, value: 0 });
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 500 });
    stage.getBoundingClientRect = () => {
      const scale = Number.parseFloat(stage.style.width) / 100;
      return { left: -canvas.scrollLeft, top: -canvas.scrollTop, width: 1000 * scale, height: 500 * scale };
    };
    const centerRatio = () => {
      const rect = stage.getBoundingClientRect();
      return [(500 - rect.left) / rect.width, (250 - rect.top) / rect.height];
    };

    fireEvent.click(screen.getByRole("button", { name: "Aumentar zoom" }));
    expect(canvas.scrollLeft).toBe(125);
    expect(canvas.scrollTop).toBe(62.5);
    expect(centerRatio()).toEqual([0.5, 0.5]);

    fireEvent.pointerEnter(viewer);
    fireEvent.keyDown(window, { key: "+" });
    expect(stage).toHaveStyle({ width: "156.25%" });
    expect(centerRatio()).toEqual([0.5, 0.5]);
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

  it("isola os eventos da toolbar das interações do visualizador", () => {
    const onClick = vi.fn();
    const onMouseDown = vi.fn();
    const onPointerDown = vi.fn();
    const onWheel = vi.fn();
    const onRegionChange = vi.fn();
    renderWithTooltips(
      <div
        onClick={onClick}
        onMouseDown={onMouseDown}
        onPointerDown={onPointerDown}
        onWheel={onWheel}
      >
        <EcgViewer
          imageUrl="/ecg-real.png"
          onRegionChange={onRegionChange}
          selectionLabel="Marcando área para D1"
        />
      </div>,
    );

    const zoomIn = screen.getByRole("button", { name: "Aumentar zoom" });
    const toolbar = screen.getByRole("toolbar", { name: "Controles do ECG" });
    fireEvent.pointerDown(zoomIn, { button: 0, pointerId: 1 });
    fireEvent.mouseDown(zoomIn, { button: 0 });
    fireEvent.click(zoomIn);
    fireEvent.wheel(toolbar, { deltaY: -100 });

    expect(onPointerDown).not.toHaveBeenCalled();
    expect(onMouseDown).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
    expect(onWheel).not.toHaveBeenCalled();
    expect(onRegionChange).not.toHaveBeenCalled();
  });

  it("desabilita a visão limpa e oferece cancelamento contextual durante marcação", () => {
    const onRegionCancel = vi.fn();
    renderWithTooltips(
      <EcgViewer
        imageUrl="/ecg-real.png"
        onRegionCancel={onRegionCancel}
        selectionLabel="Marcando área para D2"
        selectionDescription="Arraste ou clique em dois cantos · Esc para cancelar"
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
    expect(document.querySelector(".ecg-image-stage")).toHaveStyle({ width: "125%" });
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
    await waitFor(() => expect(container.querySelector(".ecg-image-stage")).toHaveStyle({ width: "125%" }));

    canvas.scrollLeft = 30;
    canvas.scrollTop = 20;
    fireEvent.pointerDown(stage, { button: 0, clientX: 50, clientY: 50, pointerId: 2 });
    fireEvent.pointerMove(stage, { clientX: 35, clientY: 30, pointerId: 2 });
    expect(canvas.scrollLeft).toBe(45);
    expect(canvas.scrollTop).toBe(40);
  });

  it("mantém sob o cursor o mesmo ponto do traçado numa rajada da roda que chega ao zoom máximo", () => {
    const { container } = renderWithTooltips(<EcgViewer imageUrl="/ecg-real.png" />);
    const canvas = container.querySelector(".ecg-canvas");
    const stage = container.querySelector(".ecg-image-stage");
    Object.defineProperty(canvas, "scrollLeft", { configurable: true, writable: true, value: 0 });
    Object.defineProperty(canvas, "scrollTop", { configurable: true, writable: true, value: 0 });
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 500 });
    stage.getBoundingClientRect = () => {
      const scale = Number.parseFloat(stage.style.width) / 100;
      return { left: -canvas.scrollLeft, top: -canvas.scrollTop, width: 1000 * scale, height: 500 * scale };
    };
    // Cursor parado sobre um ponto do traçado (51,5% × 61% do papel), como sobre "V3".
    const cursor = { clientX: 515, clientY: 305 };

    // Girar rápido manda vários eventos antes do redesenho: quatro dentes chegam a 2,4× e o quinto já não muda nada —
    // e não pode apagar a âncora dos quatro primeiros.
    act(() => {
      for (let index = 0; index < 5; index += 1) {
        canvas.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100, ...cursor }));
      }
    });

    expect(stage).toHaveStyle({ width: "240%" });
    const rect = stage.getBoundingClientRect();
    expect((cursor.clientX - rect.left) / rect.width).toBeCloseTo(0.515, 3);
    expect((cursor.clientY - rect.top) / rect.height).toBeCloseTo(0.61, 3);
  });

  it("amplia pela roda na proporção do gesto e não reage ao deslizar para o lado", async () => {
    const { container } = renderWithTooltips(<EcgViewer imageUrl="/ecg-real.png" />);
    const canvas = container.querySelector(".ecg-canvas");
    const stage = container.querySelector(".ecg-image-stage");
    const wheel = (init) => {
      const event = new WheelEvent("wheel", { bubbles: true, cancelable: true, ...init });
      canvas.dispatchEvent(event);
      return event;
    };

    // Um gesto leve de touchpad: oito eventos pequenos somam um terço de dente da roda.
    for (let index = 0; index < 8; index += 1) wheel({ deltaY: -4 });
    await waitFor(() => expect(Number.parseFloat(stage.style.width)).toBeCloseTo(100 * 1.25 ** 0.32, 1));

    // Deslizar para o lado fica com o navegador (rola o traçado ampliado), sem mexer no zoom.
    const sideways = wheel({ deltaX: 60, deltaY: 0 });
    expect(sideways.defaultPrevented).toBe(false);
    expect(Number.parseFloat(stage.style.width)).toBeCloseTo(100 * 1.25 ** 0.32, 1);

    // Firefox conta em linhas: três linhas (um dente) valem 0,75 de passo — e o zoom não passa de caber na tela.
    wheel({ deltaMode: 1, deltaY: 3 });
    await waitFor(() => expect(stage).toHaveStyle({ width: "100%" }));

    // A pinça chega como roda com Ctrl e deltas pequenos.
    const pinch = wheel({ ctrlKey: true, deltaY: -10 });
    expect(pinch.defaultPrevented).toBe(true);
    await waitFor(() => expect(stage).toHaveStyle({ width: "125%" }));
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
      const pointerDown = new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: 10,
        clientY: 10,
        pointerId,
      });
      fireEvent(activeStage, pointerDown);
      // Native dragging of selected page content would cancel the drawing gesture.
      expect(pointerDown.defaultPrevented).toBe(true);
      fireEvent.pointerUp(activeStage, { button: 0, clientX: 40, clientY: 40, pointerId });
    }
    expect(onRegionChange).toHaveBeenCalledTimes(2);
    expect(onRegionChange).toHaveBeenLastCalledWith({ x: 10, y: 10, width: 30, height: 30 });
  });

  it("move o traçado ampliado pelas setas, com passo maior no Shift", () => {
    const { container } = renderWithTooltips(
      <div>
        <button type="button">Concordo</button>
        <EcgViewer imageUrl="/ecg-real.png" />
      </div>,
    );
    const viewer = screen.getByRole("region", { name: "Visualizador do traçado de ECG" });
    const canvas = container.querySelector(".ecg-canvas");
    Object.defineProperty(canvas, "clientWidth", { configurable: true, value: 1000 });
    Object.defineProperty(canvas, "clientHeight", { configurable: true, value: 500 });
    Object.defineProperty(canvas, "scrollLeft", { configurable: true, writable: true, value: 0 });
    Object.defineProperty(canvas, "scrollTop", { configurable: true, writable: true, value: 0 });

    // Em 1× não há o que mover: a seta segue para a página.
    viewer.focus();
    const idleArrow = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" });
    viewer.dispatchEvent(idleArrow);
    expect(idleArrow.defaultPrevented).toBe(false);
    expect(canvas.scrollLeft).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Aumentar zoom" }));
    canvas.scrollLeft = 0;
    canvas.scrollTop = 0;
    viewer.focus();
    fireEvent.keyDown(viewer, { key: "ArrowRight" });
    fireEvent.keyDown(viewer, { key: "ArrowDown" });
    expect(canvas.scrollLeft).toBe(100);
    expect(canvas.scrollTop).toBe(50);
    fireEvent.keyDown(viewer, { key: "ArrowRight", shiftKey: true });
    expect(canvas.scrollLeft).toBe(600);

    // Com o foco num botão do painel, as setas são dele, mesmo com o ponteiro sobre o ECG.
    const panelButton = screen.getByRole("button", { name: "Concordo" });
    panelButton.focus();
    fireEvent.pointerEnter(viewer);
    fireEvent.keyDown(panelButton, { key: "ArrowLeft" });
    expect(canvas.scrollLeft).toBe(600);
  });

  it("durante a marcação, segurar Espaço e arrastar move o traçado sem desenhar", () => {
    const onRegionChange = vi.fn();
    const { container } = renderWithTooltips(
      <EcgViewer imageUrl="/ecg-real.png" onRegionChange={onRegionChange} selectionLabel="Marcando área para D2" />,
    );
    const viewer = screen.getByRole("region", { name: "Visualizador do traçado de ECG" });
    const canvas = container.querySelector(".ecg-canvas");
    const stage = container.querySelector(".ecg-image-stage");
    stage.setPointerCapture = vi.fn();
    Object.defineProperty(canvas, "scrollLeft", { configurable: true, writable: true, value: 0 });
    Object.defineProperty(canvas, "scrollTop", { configurable: true, writable: true, value: 0 });
    const pressSpace = () => {
      const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, code: "Space", key: " " });
      act(() => {
        window.dispatchEvent(event);
      });
      return event;
    };
    fireEvent.pointerEnter(viewer);

    // Em 1× não há o que mover: o Espaço segue para o botão em foco.
    expect(pressSpace().defaultPrevented).toBe(false);
    expect(stage).toHaveClass("cursor-crosshair");

    fireEvent.click(screen.getByRole("button", { name: "Aumentar zoom" }));
    canvas.scrollLeft = 100;
    canvas.scrollTop = 50;
    expect(pressSpace().defaultPrevented).toBe(true);
    expect(stage).toHaveClass("cursor-grab");
    fireEvent.pointerDown(stage, { button: 0, clientX: 300, clientY: 200, pointerId: 1 });
    expect(stage).toHaveClass("cursor-grabbing");
    fireEvent.pointerMove(stage, { clientX: 260, clientY: 180, pointerId: 1 });
    fireEvent.pointerUp(stage, { button: 0, clientX: 260, clientY: 180, pointerId: 1 });
    expect(canvas.scrollLeft).toBe(140);
    expect(canvas.scrollTop).toBe(70);
    expect(onRegionChange).not.toHaveBeenCalled();

    fireEvent.keyUp(window, { code: "Space", key: " " });
    expect(stage).toHaveClass("cursor-crosshair");
  });

  it("não deixa o traçado virar seleção nem arrasto nativo do navegador", () => {
    const { container, rerender } = renderWithTooltips(<EcgViewer imageUrl="/ecg-real.png" />);
    const stage = container.querySelector(".ecg-image-stage");

    // Clique duplo não seleciona a imagem, e o arrastar nativo (a cópia translúcida) é cancelado ao começar.
    expect(stage).toHaveClass("select-none");
    expect(fireEvent.dragStart(stage)).toBe(false);

    // Sem o traçado, o texto do erro continua selecionável (para copiar ao suporte).
    rerender(<TooltipProvider><EcgViewer imageError="Imagem do ECG não encontrada." /></TooltipProvider>);
    expect(container.querySelector(".ecg-image-stage")).not.toHaveClass("select-none");
  });

  it("arrastar com a rodinha move o traçado em qualquer modo, inclusive durante a marcação", () => {
    const onRegionChange = vi.fn();
    const onRegionSelect = vi.fn();
    const { container } = renderWithTooltips(
      <EcgViewer
        imageUrl="/ecg-real.png"
        onRegionChange={onRegionChange}
        onRegionSelect={onRegionSelect}
        selectionLabel="Marcando área para D2"
      />,
    );
    const canvas = container.querySelector(".ecg-canvas");
    const stage = container.querySelector(".ecg-image-stage");
    stage.setPointerCapture = vi.fn();
    Object.defineProperty(canvas, "scrollLeft", { configurable: true, writable: true, value: 0 });
    Object.defineProperty(canvas, "scrollTop", { configurable: true, writable: true, value: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Aumentar zoom" }));
    canvas.scrollLeft = 100;
    canvas.scrollTop = 50;

    // A rolagem automática do navegador (clique na rodinha) é cancelada no apertar.
    const middleDown = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      button: 1,
      clientX: 300,
      clientY: 200,
      pointerId: 1,
    });
    fireEvent(stage, middleDown);
    expect(middleDown.defaultPrevented).toBe(true);
    expect(fireEvent.mouseDown(stage, { button: 1 })).toBe(false);
    expect(stage).toHaveClass("cursor-grabbing");

    fireEvent.pointerMove(stage, { clientX: 260, clientY: 180, pointerId: 1 });
    fireEvent.pointerUp(stage, { button: 1, clientX: 260, clientY: 180, pointerId: 1 });
    expect(canvas.scrollLeft).toBe(140);
    expect(canvas.scrollTop).toBe(70);
    // Não desenhou, não desmarcou, e a marcação continua com a mira.
    expect(container.querySelector(".active-selection-box")).not.toBeInTheDocument();
    expect(onRegionChange).not.toHaveBeenCalled();
    expect(onRegionSelect).not.toHaveBeenCalled();
    expect(stage).toHaveClass("cursor-crosshair");
  });

  it("mostra a mão de arrastar só com o traçado ampliado", () => {
    const { container } = renderWithTooltips(<EcgViewer imageUrl="/ecg-real.png" />);
    const stage = container.querySelector(".ecg-image-stage");
    stage.setPointerCapture = vi.fn();

    expect(stage).not.toHaveClass("cursor-grab");
    fireEvent.click(screen.getByRole("button", { name: "Aumentar zoom" }));
    expect(stage).toHaveClass("cursor-grab");
    fireEvent.pointerDown(stage, { button: 0, clientX: 300, clientY: 200, pointerId: 1 });
    expect(stage).toHaveClass("cursor-grabbing");
    fireEvent.pointerUp(stage, { button: 0, clientX: 280, clientY: 200, pointerId: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Restaurar visualização" }));
    expect(stage).not.toHaveClass("cursor-grab");
  });

  it("arrastar começando sobre uma área move o traçado sem selecioná-la; parado, o clique seleciona", () => {
    const onRegionSelect = vi.fn();
    const { container } = renderWithTooltips(
      <EcgViewer
        imageUrl="/ecg-real.png"
        onRegionSelect={onRegionSelect}
        regions={[{ id: 9, x: 10, y: 10, width: 40, height: 40, label: "D2.1" }]}
      />,
    );
    const canvas = container.querySelector(".ecg-canvas");
    const stage = container.querySelector(".ecg-image-stage");
    stage.setPointerCapture = vi.fn();
    Object.defineProperty(canvas, "scrollLeft", { configurable: true, writable: true, value: 0 });
    Object.defineProperty(canvas, "scrollTop", { configurable: true, writable: true, value: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Aumentar zoom" }));
    canvas.scrollLeft = 200;
    canvas.scrollTop = 100;
    const region = screen.getByRole("button", { name: "D2.1" });

    fireEvent.pointerDown(region, { button: 0, clientX: 300, clientY: 200, pointerId: 1 });
    // A captura só vem com o movimento: parado, o clique ainda é da área.
    expect(stage.setPointerCapture).not.toHaveBeenCalled();
    fireEvent.pointerMove(stage, { clientX: 250, clientY: 180, pointerId: 1 });
    expect(stage.setPointerCapture).toHaveBeenCalledWith(1);
    expect(stage).toHaveClass("cursor-grabbing");
    fireEvent.pointerUp(stage, { button: 0, clientX: 250, clientY: 180, pointerId: 1 });
    fireEvent.click(region, { detail: 1 });
    expect(canvas.scrollLeft).toBe(250);
    expect(canvas.scrollTop).toBe(120);
    expect(onRegionSelect).not.toHaveBeenCalled();

    // Enter/Espaço na área (clique com detail 0) seleciona mesmo logo depois de um pan.
    fireEvent.click(region, { detail: 0 });
    expect(onRegionSelect).toHaveBeenCalledTimes(1);

    // Clique parado na área: seleciona (e não é tomado por "desmarcar" do vazio).
    fireEvent.pointerDown(region, { button: 0, clientX: 300, clientY: 200, pointerId: 2 });
    fireEvent.pointerUp(region, { button: 0, clientX: 301, clientY: 200, pointerId: 2 });
    fireEvent.click(region, { detail: 1 });
    expect(onRegionSelect).toHaveBeenCalledTimes(2);
    expect(onRegionSelect).not.toHaveBeenCalledWith(null);
  });

  it("desmarca a área só no clique no vazio, não ao arrastar o traçado", () => {
    const onRegionSelect = vi.fn();
    const { container } = renderWithTooltips(
      <EcgViewer
        imageUrl="/ecg-real.png"
        onRegionSelect={onRegionSelect}
        regions={[{ id: 9, x: 10, y: 10, width: 20, height: 20, label: "D1.1", isSelected: true }]}
      />,
    );
    const stage = container.querySelector(".ecg-image-stage");
    stage.setPointerCapture = vi.fn();

    fireEvent.pointerDown(stage, { button: 0, clientX: 300, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(stage, { clientX: 260, clientY: 190, pointerId: 1 });
    fireEvent.pointerUp(stage, { button: 0, clientX: 260, clientY: 190, pointerId: 1 });
    expect(onRegionSelect).not.toHaveBeenCalled();

    // Um tremor de até 3px ainda é clique.
    fireEvent.pointerDown(stage, { button: 0, clientX: 300, clientY: 200, pointerId: 2 });
    fireEvent.pointerMove(stage, { clientX: 302, clientY: 201, pointerId: 2 });
    fireEvent.pointerUp(stage, { button: 0, clientX: 302, clientY: 201, pointerId: 2 });
    expect(onRegionSelect).toHaveBeenCalledOnce();
    expect(onRegionSelect).toHaveBeenCalledWith(null);
  });

  it("marca a área também com dois cliques, sem arrastar", () => {
    const onRegionChange = vi.fn();
    const { container, rerender } = renderWithTooltips(
      <EcgViewer imageUrl="/ecg-real.png" onRegionChange={onRegionChange} selectionLabel="Marcando área para D2" />,
    );
    const stage = container.querySelector(".ecg-image-stage");
    stage.setPointerCapture = vi.fn();
    vi.spyOn(stage, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 100, height: 100 });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback();
      return 1;
    });
    const click = (x, y, pointerId) => {
      fireEvent.pointerDown(stage, { button: 0, clientX: x, clientY: y, pointerId });
      fireEvent.pointerUp(stage, { button: 0, clientX: x + 1, clientY: y, pointerId });
    };

    // Primeiro canto: nada salvo; o rascunho segue o ponteiro até o segundo clique.
    click(10, 20, 1);
    expect(onRegionChange).not.toHaveBeenCalled();
    fireEvent.pointerMove(stage, { clientX: 30, clientY: 50 });
    expect(container.querySelector(".active-selection-box.is-draft")).toHaveStyle({
      left: "10%",
      top: "20%",
      width: "20%",
      height: "30%",
    });

    click(40, 60, 2);
    expect(onRegionChange).toHaveBeenCalledWith({ x: 10, y: 20, width: 31, height: 40 });
    expect(container.querySelector(".active-selection-box")).not.toBeInTheDocument();

    // Um canto pendente some ao sair da marcação.
    click(50, 50, 3);
    expect(container.querySelector(".active-selection-box.is-draft")).toBeInTheDocument();
    rerender(<TooltipProvider><EcgViewer imageUrl="/ecg-real.png" onRegionChange={onRegionChange} /></TooltipProvider>);
    expect(container.querySelector(".active-selection-box")).not.toBeInTheDocument();
    vi.restoreAllMocks();
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
