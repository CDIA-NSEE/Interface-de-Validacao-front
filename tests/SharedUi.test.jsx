import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import SupportContactModal from "@/components/SupportContactModal.jsx";
import TutorialModal from "@/components/TutorialModal.jsx";
import UnsavedChangesModal from "@/components/UnsavedChangesModal.jsx";

function SupportHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Abrir suporte
      </button>
      <SupportContactModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        contact={{
          title: "Contato BP/NSEE",
          description: "Fale com a equipe.",
          channels: [{ type: "email", label: "E-mail", value: "nsee@example.com" }],
        }}
      />
    </>
  );
}

describe("shared overlays", () => {
  it("closes the support dialog with Escape and restores trigger focus", async () => {
    const user = userEvent.setup();
    render(<SupportHarness />);

    const trigger = screen.getByRole("button", { name: "Abrir suporte" });
    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "Contato BP/NSEE" })).toBeInTheDocument();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Contato BP/NSEE" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("renders the tutorial as an accessible dialog", () => {
    render(<TutorialModal isOpen onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Validação de ECG" })).toBeInTheDocument();
    expect(screen.getByText("Fila do dia")).toBeInTheDocument();
    expect(screen.getByText("Decisão obrigatória")).toBeInTheDocument();
  });

  it("keeps or discards pending changes through the alert dialog actions", async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    const onStay = vi.fn();

    render(
      <UnsavedChangesModal
        isOpen
        onDiscard={onDiscard}
        onStay={onStay}
      />,
    );

    expect(screen.getByRole("alertdialog", { name: "Sair sem salvar?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar no ECG" }));
    expect(onStay).toHaveBeenCalledOnce();
    expect(onDiscard).not.toHaveBeenCalled();
  });
});
