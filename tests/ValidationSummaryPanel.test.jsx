import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import ValidationSummaryPanel from "../src/components/ValidationSummaryPanel.jsx";
import { QUEUE_STATE_META, REFINEMENT_META } from "../src/utils/queueSemantics.js";

const stats = {
  queue_state_counts: { all: 10, start: 4, validated: 3, completed: 3 },
  decision_counts: { confirmed: 2, rejected: 1 },
  region_counts: { with_region: 1, without_region: 2 },
};

function SummaryHarness() {
  const [collapsed, setCollapsed] = useState(false);
  const [quickFilter, setQuickFilter] = useState(QUEUE_STATE_META.all);
  const [refinementFilters, setRefinementFilters] = useState({
    decision: null,
    region: null,
  });

  return (
    <ValidationSummaryPanel
      stats={stats}
      collapsed={collapsed}
      quickFilter={quickFilter}
      refinementFilters={refinementFilters}
      onToggleCollapsed={() => setCollapsed((current) => !current)}
      onQuickFilter={(key) => setQuickFilter(QUEUE_STATE_META[key])}
      onRefinementFilter={(type, key) => {
        setRefinementFilters((current) => ({
          ...current,
          [type]: current[type]?.key === key ? null : REFINEMENT_META[key],
        }));
      }}
    />
  );
}

describe("ValidationSummaryPanel", () => {
  it("mantém seleções independentes de estado, decisão e região", async () => {
    const user = userEvent.setup();
    render(<SummaryHarness />);

    await user.click(screen.getByRole("button", { name: /em validação:/i }));
    await user.click(screen.getByRole("button", { name: /concordou:/i }));
    await user.click(screen.getByRole("button", { name: /^mapeado:/i }));

    expect(screen.getByRole("button", { name: /em validação:/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /concordou:/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /^mapeado:/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("preserva a seleção quando o resumo é ocultado e reaberto", async () => {
    const user = userEvent.setup();
    render(<SummaryHarness />);

    await user.click(screen.getByRole("button", { name: /concluídos:/i }));
    await user.click(screen.getByRole("button", { name: "Ocultar resumo" }));

    expect(screen.queryByRole("heading", { name: "Resumo" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mostrar resumo" }));
    expect(screen.getByRole("heading", { name: "Resumo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /concluídos:/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("encaminha as chaves clínicas sem acoplar o componente aos filtros HTTP", async () => {
    const user = userEvent.setup();
    const onQuickFilter = vi.fn();
    const onRefinementFilter = vi.fn();

    render(
      <ValidationSummaryPanel
        stats={stats}
        collapsed={false}
        quickFilter={QUEUE_STATE_META.all}
        refinementFilters={{ decision: null, region: null }}
        onToggleCollapsed={vi.fn()}
        onQuickFilter={onQuickFilter}
        onRefinementFilter={onRefinementFilter}
      />,
    );

    await user.click(screen.getByRole("button", { name: /iniciar:/i }));
    await user.click(screen.getByRole("button", { name: /discordou:/i }));

    expect(onQuickFilter).toHaveBeenCalledWith("start");
    expect(onRefinementFilter).toHaveBeenCalledWith("decision", "rejected");
  });
});
