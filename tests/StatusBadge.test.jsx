import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import StatusBadge from "../src/components/StatusBadge.jsx";

describe("StatusBadge", () => {
  it("mantém os tons clínicos de cada etapa da fila", () => {
    const { rerender } = render(<StatusBadge queueState="start" />);
    expect(screen.getByText("Iniciar")).toHaveAttribute("data-variant", "warning");

    rerender(<StatusBadge queueState="validated" />);
    expect(screen.getByText("Em Validação")).toHaveAttribute("data-variant", "info");

    rerender(<StatusBadge queueState="completed" />);
    expect(screen.getByText("Concluídos")).toHaveAttribute("data-variant", "success");
  });
});
