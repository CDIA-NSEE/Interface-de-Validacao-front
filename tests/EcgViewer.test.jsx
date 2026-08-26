import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import EcgViewer from "../src/components/EcgViewer.jsx";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EcgViewer", () => {
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

    const { container } = render(
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

    const { container } = render(<EcgViewer imageUrl="/ecg-real.png" />);
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
    render(<EcgViewer imageUrl="/ecg-real.png" />);

    const zoomIn = screen.getByRole("button", { name: "Zoom mais" });

    expect(screen.getByText("100%")).toBeVisible();
    fireEvent.click(zoomIn);
    expect(screen.getByText("115%")).toBeVisible();

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
    const { container } = render(
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
});
