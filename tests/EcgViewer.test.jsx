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
});
