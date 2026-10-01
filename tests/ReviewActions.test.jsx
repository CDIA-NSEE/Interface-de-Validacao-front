import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ReviewActions from "../src/components/ReviewActions.jsx";
import { TooltipProvider } from "../src/components/ui/tooltip.jsx";

describe("ReviewActions", () => {
  it("mostra só a ação principal, sem Voltar", () => {
    const onValidate = vi.fn();

    render(
      <ReviewActions
        className="ml-auto"
        isBusy={false}
        isValid={false}
        onValidate={onValidate}
        primaryLabel="Salvar e próximo"
      />,
    );

    const primaryButton = screen.getByRole("button", { name: "Salvar e próximo" });
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Voltar" })).not.toBeInTheDocument();
    expect(primaryButton).toHaveClass("h-10", "ml-auto", "bg-success", "text-success-foreground");
    expect(primaryButton.querySelector("svg")).toBeInTheDocument();

    fireEvent.click(primaryButton);
    expect(onValidate).toHaveBeenCalledOnce();
  });

  it("desabilita com a página ocupada, com o exame já válido ou sem a decisão obrigatória", () => {
    const sharedProps = { onValidate: vi.fn(), primaryLabel: "Validar exame" };
    const { rerender } = render(<ReviewActions {...sharedProps} isBusy isValid={false} />);

    const primaryButton = screen.getByRole("button", { name: "Validar exame" });
    expect(primaryButton).toBeDisabled();
    expect(primaryButton).toHaveClass(
      "disabled:border-border",
      "disabled:bg-muted",
      "disabled:text-muted-foreground",
      "disabled:opacity-100",
      "disabled:shadow-none",
    );

    rerender(<ReviewActions {...sharedProps} isBusy={false} isValid />);
    expect(screen.getByRole("button", { name: "Validar exame" })).toBeDisabled();

    rerender(<ReviewActions {...sharedProps} canValidate={false} isBusy={false} isValid={false} />);
    expect(screen.getByRole("button", { name: "Validar exame" })).toBeDisabled();

    rerender(<ReviewActions {...sharedProps} canValidate isBusy={false} isValid={false} />);
    expect(screen.getByRole("button", { name: "Validar exame" })).toBeEnabled();
  });

  it("explica o motivo quando a ação principal está desabilitada", () => {
    render(
      <TooltipProvider>
        <ReviewActions
          canValidate={false}
          className="w-full"
          isBusy={false}
          isValid={false}
          onValidate={vi.fn()}
          primaryDisabledReason="Defina Concordo ou Discordo para continuar."
          primaryLabel="Salvar e próximo"
        />
      </TooltipProvider>,
    );

    const tooltipTrigger = screen.getByRole("button", { name: "Salvar e próximo" }).parentElement;
    expect(tooltipTrigger).toHaveAttribute(
      "aria-label",
      "Salvar e próximo indisponível: Defina Concordo ou Discordo para continuar.",
    );
    expect(tooltipTrigger).toHaveClass("w-full");
  });
});
