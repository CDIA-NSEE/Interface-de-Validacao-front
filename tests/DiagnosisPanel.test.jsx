import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DiagnosisPanel from "../src/components/DiagnosisPanel.jsx";

const baseProps = {
  diagnosisReferences: {},
  isBusy: false,
  isSecondaryOpen: true,
  onAdd: vi.fn(),
  onEditRegion: vi.fn(),
  onRegionConsumed: vi.fn(),
  onRemove: vi.fn(),
  onRemoveRegion: vi.fn(),
  onReview: vi.fn(),
  onDisagreementPreviewChange: vi.fn(),
  onSecondaryToggle: vi.fn(),
  onStartRegion: vi.fn(),
  options: ["Fibrilação atrial"],
};

function originalDiagnosis(id, standardText, extra = {}) {
  return {
    id,
    name: standardText,
    original_text: standardText,
    regions: [],
    review_status: "pending",
    source: "original",
    standard_text: standardText,
    ...extra,
  };
}

describe("DiagnosisPanel", () => {
  it("encapsula somente o diagnóstico do dia em um painel estático", () => {
    const { container } = render(
      <DiagnosisPanel
        {...baseProps}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          originalDiagnosis(2, "Bloqueio de ramo direito"),
        ]}
        isGeneralReviewDay={false}
      />,
    );

    const dailyPanel = container.querySelector(".diagnosis-primary-panel");

    expect(dailyPanel).not.toBeNull();
    expect(dailyPanel.tagName).toBe("SECTION");
    expect(dailyPanel.querySelector("summary")).toBeNull();
    expect(dailyPanel.querySelectorAll(".diagnosis-item")).toHaveLength(1);
    expect(dailyPanel.querySelector(".diagnosis-primary-heading")).toHaveTextContent(
      "Diagnóstico do dia",
    );
    expect(dailyPanel.querySelector(".diagnosis-title")).toHaveTextContent("Ritmo sinusal");
    expect(within(dailyPanel).queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Selecionar um diagnóstico" })).toBeVisible();
  });

  it("preserva a estrutura da revalidação geral com todos os diagnósticos originais", () => {
    const { container } = render(
      <DiagnosisPanel
        {...baseProps}
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          originalDiagnosis(2, "Bloqueio de ramo direito"),
        ]}
        isGeneralReviewDay
        options={[]}
      />,
    );

    expect(container.querySelector(".diagnosis-primary-panel")).toBeNull();
    expect(screen.getByText("Revalidação geral")).toBeVisible();
    expect(container.querySelectorAll(".required-diagnosis")).toHaveLength(2);
  });
});
