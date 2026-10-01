import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { TextSizeProvider, useApplyTextSize, useTextSize } from "@/context/TextSizeContext.jsx";

function TextSizeProbe() {
  const { setTextSize, textSize } = useTextSize();

  return (
    <>
      <p>{textSize}</p>
      <button type="button" onClick={() => setTextSize("large")}>Grande</button>
      <button type="button" onClick={() => setTextSize("default")}>Padrão</button>
      <button type="button" onClick={() => setTextSize("huge")}>Inválido</button>
    </>
  );
}

function ScreenWithTextSize() {
  useApplyTextSize();
  return <TextSizeProbe />;
}

describe("TextSizeContext", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-text-size");
  });

  it("restaura o tamanho guardado e ignora valores desconhecidos", () => {
    window.localStorage.setItem("medpage.textSize", "extra-large");
    const { unmount } = render(
      <TextSizeProvider>
        <TextSizeProbe />
      </TextSizeProvider>,
    );
    expect(screen.getByText("extra-large")).toBeInTheDocument();
    unmount();

    window.localStorage.setItem("medpage.textSize", "enorme");
    render(
      <TextSizeProvider>
        <TextSizeProbe />
      </TextSizeProvider>,
    );
    expect(screen.getByText("default")).toBeInTheDocument();
  });

  it("guarda a escolha, mas só a tela que aplica o tamanho muda a raiz", async () => {
    const user = userEvent.setup();
    render(
      <TextSizeProvider>
        <TextSizeProbe />
      </TextSizeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Grande" }));
    await user.click(screen.getByRole("button", { name: "Inválido" }));

    expect(screen.getByText("large")).toBeInTheDocument();
    expect(window.localStorage.getItem("medpage.textSize")).toBe("large");
    expect(document.documentElement).not.toHaveAttribute("data-text-size");
  });

  it("aplica o tamanho na raiz enquanto a tela está aberta e o tira ao sair", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("medpage.textSize", "large");
    const { unmount } = render(
      <TextSizeProvider>
        <ScreenWithTextSize />
      </TextSizeProvider>,
    );

    expect(document.documentElement).toHaveAttribute("data-text-size", "large");

    await user.click(screen.getByRole("button", { name: "Padrão" }));
    expect(document.documentElement).not.toHaveAttribute("data-text-size");

    await user.click(screen.getByRole("button", { name: "Grande" }));
    unmount();
    expect(document.documentElement).not.toHaveAttribute("data-text-size");
  });
});
