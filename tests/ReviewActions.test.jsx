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

    screen.getAllByRole("button").forEach((button) => expect(button).toBeDisabled());
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
});
