import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AppErrorBoundary from "../src/components/AppErrorBoundary.jsx";

function BrokenRoute() {
  throw new Error("chunk indisponível");
}

describe("AppErrorBoundary", () => {
  it("oferece recuperação quando uma rota lazy falha", () => {
    const retry = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AppErrorBoundary onRetry={retry}>
        <BrokenRoute />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar esta tela");
    fireEvent.click(screen.getByRole("button", { name: "Recarregar aplicação" }));
    expect(retry).toHaveBeenCalledOnce();

    consoleError.mockRestore();
  });
});
