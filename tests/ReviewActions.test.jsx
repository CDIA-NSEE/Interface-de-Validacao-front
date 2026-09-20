import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ReviewActions from "../src/components/ReviewActions.jsx";

describe("ReviewActions", () => {
  it("usa o mesmo dimensionamento nos três botões e em seus ícones", () => {
    const onBack = vi.fn();
    const onSave = vi.fn();
    const onValidate = vi.fn();

    const { rerender } = render(
      <ReviewActions
        isBusy={false}
        isValid={false}
        onBack={onBack}
        onSave={onSave}
        onValidate={onValidate}
        primaryLabel="Salvar e próximo"
      />,
    );

    const actions = screen.getByRole("group", { name: "Ações da validação" });
    const buttons = screen.getAllByRole("button");

    expect(buttons).toHaveLength(3);
    expect(actions).toHaveClass("@min-[24rem]/actions:grid-cols-3");
    buttons.forEach((button) => {
      expect(button).toHaveClass("h-[42px]", "w-full", "@min-[24rem]/actions:text-xs");
      expect(button.querySelector("svg")).toBeInTheDocument();
    });
    expect(actions).toContainElement(screen.getByRole("button", { name: "Salvar e próximo" }));
    // Com três botões, no grid de duas colunas a primária ocupa a linha inteira (e volta a uma coluna nas três).
    expect(screen.getByRole("button", { name: "Salvar e próximo" })).toHaveClass(
      "@min-[18rem]/actions:col-span-2",
      "@min-[24rem]/actions:col-span-1",
    );

    buttons.forEach((button) => fireEvent.click(button));

    expect(onBack).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledOnce();
    expect(onValidate).toHaveBeenCalledOnce();

    rerender(
      <ReviewActions
        isBusy
        isValid={false}
        onBack={onBack}
        onSave={onSave}
        onValidate={onValidate}
        primaryLabel="Salvar e próximo"
      />,
    );

    screen.getAllByRole("button").forEach((button) => {
      expect(button).toBeDisabled();
      expect(button).toHaveClass(
        "disabled:bg-muted",
        "disabled:text-muted-foreground",
        "disabled:opacity-100",
      );
    });
  });

  it("preserva ações, bloqueios e o rótulo alternativo", () => {
    const onBack = vi.fn();
    const onValidate = vi.fn();

    const { rerender } = render(
      <ReviewActions
        canValidate
        isBusy={false}
        isValid={false}
        onBack={onBack}
        onValidate={onValidate}
        primaryLabel="Validar exame"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    fireEvent.click(screen.getByRole("button", { name: "Validar exame" }));

    expect(onBack).toHaveBeenCalledOnce();
    expect(onValidate).toHaveBeenCalledOnce();
    // Com dois botões eles dividem a linha: a primária não ocupa as duas colunas.
    expect(screen.getByRole("button", { name: "Validar exame" })).not.toHaveClass("@min-[18rem]/actions:col-span-2");

    rerender(
      <ReviewActions
        canValidate={false}
        isBusy={false}
        isValid={false}
        onBack={onBack}
        onValidate={onValidate}
        primaryLabel="Validar exame"
      />,
    );

    expect(screen.getByRole("button", { name: "Validar exame" })).toBeDisabled();
  });

  it("neutraliza visualmente as ações desabilitadas sem afetar a ação primária habilitada", () => {
    const sharedProps = {
      isBusy: false,
      isValid: false,
      onBack: vi.fn(),
      onSave: vi.fn(),
      onValidate: vi.fn(),
      primaryLabel: "Salvar e próximo",
      saveLabel: "Salvar observações",
    };

    const { rerender } = render(
      <ReviewActions {...sharedProps} canValidate={false} saveDisabled />,
    );

    const saveButton = screen.getByRole("button", { name: "Salvar observações" });
    const primaryButton = screen.getByRole("button", { name: "Salvar e próximo" });

    [saveButton, primaryButton].forEach((button) => {
      expect(button).toBeDisabled();
      expect(button).toHaveClass(
        "disabled:border-border",
        "disabled:bg-muted",
        "disabled:text-muted-foreground",
        "disabled:opacity-100",
        "disabled:shadow-none",
      );
    });

    rerender(<ReviewActions {...sharedProps} canValidate saveDisabled={false} />);

    expect(screen.getByRole("button", { name: "Salvar observações" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Salvar e próximo" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Salvar e próximo" })).toHaveClass(
      "bg-success",
      "text-success-foreground",
    );
  });
});
