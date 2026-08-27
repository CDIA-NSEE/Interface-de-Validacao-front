import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import DiagnosisPanel from "../src/components/DiagnosisPanel.jsx";
import { TooltipProvider } from "../src/components/ui/tooltip.jsx";

beforeAll(() => {
  Object.defineProperty(Element.prototype, "getAnimations", {
    configurable: true,
    value: () => [],
  });
});

afterAll(() => {
  delete Element.prototype.getAnimations;
});

function DiagnosisPanelHarness(props) {
  const [reviewDrafts, setReviewDrafts] = useState({});

  function handleReviewDraftChange(diagnosisId, draft) {
    const key = String(diagnosisId);
    setReviewDrafts((current) => {
      if (!draft) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: draft };
    });
  }

  return (
    <TooltipProvider>
      <DiagnosisPanel
        {...props}
        onReviewDraftChange={handleReviewDraftChange}
        reviewDrafts={reviewDrafts}
      />
    </TooltipProvider>
  );
}

function AutoRevealHarness(props) {
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(false);

  return (
    <TooltipProvider>
      <DiagnosisPanel
        {...props}
        isSecondaryOpen={isSecondaryOpen}
        onSecondaryToggle={setIsSecondaryOpen}
      />
    </TooltipProvider>
  );
}

function createProps(overrides = {}) {
  return {
    diagnosisReferences: {},
    isBusy: false,
    isSecondaryOpen: true,
    onAdd: vi.fn().mockResolvedValue(true),
    onEditRegion: vi.fn(),
    onRegionConsumed: vi.fn(),
    onRemove: vi.fn(),
    onRemoveRegion: vi.fn(),
    onReview: vi.fn().mockResolvedValue(true),
    onSecondaryToggle: vi.fn(),
    onStartRegion: vi.fn(),
    options: ["Fibrilação atrial"],
    ...overrides,
  };
}

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
  it("destaca a concordância da IA no diagnóstico diário sem tomar a decisão médica", async () => {
    const onReview = vi.fn().mockResolvedValue(true);
    render(
      <DiagnosisPanelHarness
        {...createProps({ onReview, options: [] })}
        aiModeEnabled
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", { ai_suggested: true })]}
        isGeneralReviewDay={false}
      />,
    );

    const dailyPanel = screen.getByRole("region", { name: "Diagnóstico do dia" });
    const aiBadge = within(dailyPanel).getByLabelText("IA concordou");

    expect(aiBadge).toBeVisible();
    expect(aiBadge).toHaveAccessibleName("IA concordou");
    expect(aiBadge).toHaveAccessibleDescription(
      "A IA concordou com este diagnóstico. A avaliação médica continua obrigatória.",
    );
    expect(within(dailyPanel).getByRole("button", { name: "Concordo" })).toHaveAttribute("aria-pressed", "false");
    expect(within(dailyPanel).getByRole("button", { name: "Discordo" })).toHaveAttribute("aria-pressed", "false");
    expect(onReview).not.toHaveBeenCalled();
    expect(screen.queryByText("Recomendação da IA")).not.toBeInTheDocument();

    fireEvent.focus(aiBadge);
    await waitFor(() => {
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent(
        "A IA concordou com este diagnóstico. A avaliação médica continua obrigatória.",
      );
    });
  });

  it("oculta concordâncias quando o modo está desligado ou o campo não é verdadeiro", () => {
    const { rerender } = render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        aiModeEnabled={false}
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal", { ai_suggested: true }),
          originalDiagnosis(2, "Bloqueio de ramo direito"),
        ]}
        isGeneralReviewDay
      />,
    );

    expect(screen.queryByText("IA concordou")).not.toBeInTheDocument();

    rerender(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        aiModeEnabled
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal", { ai_suggested: false }),
          originalDiagnosis(2, "Bloqueio de ramo direito"),
        ]}
        isGeneralReviewDay
      />,
    );

    expect(screen.queryByText("IA concordou")).not.toBeInTheDocument();
  });

  it("exibe concordâncias em diagnósticos opcionais e na revalidação geral", async () => {
    const { rerender } = render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        aiModeEnabled
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          originalDiagnosis(2, "Bloqueio de ramo direito", { ai_suggested: true }),
        ]}
        isGeneralReviewDay={false}
      />,
    );

    expect(screen.queryByText("IA concordou")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Bloqueio de ramo direito/ }));
    expect(await screen.findByText("IA concordou")).toBeVisible();

    rerender(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        aiModeEnabled
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal", { ai_suggested: true }),
          originalDiagnosis(2, "Bloqueio de ramo direito", { ai_suggested: true }),
        ]}
        isGeneralReviewDay
      />,
    );

    const generalPanel = screen.getByRole("region", { name: "Revalidação geral" });
    expect(within(generalPanel).getAllByText("IA concordou")).toHaveLength(2);
  });

  it("mantém os opcionais recolhidos e abre somente um diagnóstico por vez", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          originalDiagnosis(2, "Bloqueio de ramo direito"),
          originalDiagnosis(3, "Sobrecarga atrial esquerda"),
          originalDiagnosis(4, "Extrassístoles ventriculares"),
        ]}
        isGeneralReviewDay={false}
      />,
    );

    expect(screen.getAllByRole("button", { name: "Concordo" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Marcar área" })).toHaveLength(1);
    expect(screen.getByTestId("optional-diagnoses-scroll-boundary")).toHaveClass("max-h-[min(32svh,20rem)]", "grid-rows-[minmax(0,1fr)]");
    expect(screen.getByTestId("optional-diagnoses-scroll")).toHaveClass("min-h-0");

    fireEvent.click(screen.getByRole("button", { name: /Bloqueio de ramo direito/ }));
    expect(screen.getAllByRole("button", { name: "Concordo" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Marcar área" })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /Sobrecarga atrial esquerda/ }));
    expect(screen.getAllByRole("button", { name: "Concordo" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Bloqueio de ramo direito/ })).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getAllByRole("button", { name: /Sobrecarga atrial esquerda/ })
        .find((button) => button.hasAttribute("aria-controls")),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("reabre e expande o diagnóstico opcional com marcação ativa", async () => {
    render(
      <AutoRevealHarness
        {...createProps({ options: [] })}
        activeRegionTarget={{ diagnosisId: 2 }}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          originalDiagnosis(2, "Bloqueio de ramo direito"),
        ]}
        isGeneralReviewDay={false}
      />,
    );

    const optionalDiagnosis = (await screen.findAllByRole("button", { name: /Bloqueio de ramo direito/ }))
      .find((button) => button.hasAttribute("aria-controls"));
    expect(screen.getByRole("button", { name: "Recolher opcionais" })).toBeVisible();
    expect(optionalDiagnosis).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("button", { name: "Marcar área" })).toHaveLength(2);
  });

  it("reabre o diagnóstico opcional com discordância em edição após remontar", async () => {
    render(
      <AutoRevealHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          originalDiagnosis(2, "Bloqueio de ramo direito"),
          originalDiagnosis(3, "Sobrecarga atrial esquerda"),
        ]}
        isGeneralReviewDay={false}
        reviewDrafts={{ 2: { isOpen: true, note: "Revisar morfologia" } }}
      />,
    );

    expect(await screen.findByDisplayValue("Revisar morfologia")).toBeVisible();
    const optionalDiagnosis = screen.getAllByRole("button", { name: /Bloqueio de ramo direito/ })
      .find((button) => button.hasAttribute("aria-controls"));
    expect(optionalDiagnosis).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: /Sobrecarga atrial esquerda/ }));
    expect(optionalDiagnosis).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Sobrecarga atrial esquerda/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("preserva decisões, regiões e remoção nos diagnósticos secundários", async () => {
    const onEditRegion = vi.fn();
    const onRemove = vi.fn();
    const onRemoveRegion = vi.fn();
    const onReview = vi.fn().mockResolvedValue(true);
    const optional = originalDiagnosis(2, "Bloqueio de ramo direito", {
      regions: [{ id: 9, x: 10, y: 20, width: 30, height: 15 }],
    });
    const doctorAdded = {
      ...originalDiagnosis(3, "Fibrilação atrial"),
      source: "doctor_added",
    };

    render(
      <DiagnosisPanelHarness
        {...createProps({ onEditRegion, onRemove, onRemoveRegion, onReview, options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal"), optional, doctorAdded]}
        isGeneralReviewDay={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Bloqueio de ramo direito/ }));
    fireEvent.click(screen.getAllByRole("button", { name: "Concordo" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Editar Área 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover Área 1" }));

    await waitFor(() => expect(onReview).toHaveBeenCalledWith(2, "confirmed"));
    expect(onEditRegion).toHaveBeenCalledWith(optional, optional.regions[0]);
    expect(onRemoveRegion).toHaveBeenCalledWith(2, 9);

    fireEvent.click(screen.getByRole("button", { name: /Fibrilação atrial/ }));
    const doctorDecision = screen.getByRole("group", { name: "Revisão de Fibrilação atrial" });
    within(doctorDecision).getAllByRole("button").forEach((button) => expect(button).toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Remover diagnóstico" }));
    expect(onRemove).toHaveBeenCalledWith(3);
  });

  it("encapsula um único diagnóstico do dia em Card estático, sem seletor de adição", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps()}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          originalDiagnosis(2, "Bloqueio de ramo direito"),
        ]}
        isGeneralReviewDay={false}
      />,
    );

    const dailyPanel = screen.getByRole("region", { name: "Diagnóstico do dia" });

    expect(within(dailyPanel).getAllByTestId("diagnosis-card")).toHaveLength(1);
    expect(within(dailyPanel).getByText("Ritmo sinusal")).toBeVisible();
    expect(within(dailyPanel).queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Adicionar diagnóstico" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Adicionar diagnóstico" })).not.toBeInTheDocument();
  });

  it("preserva todos os diagnósticos originais na revalidação geral", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          originalDiagnosis(2, "Bloqueio de ramo direito"),
        ]}
        isGeneralReviewDay
      />,
    );

    const generalPanel = screen.getByRole("region", { name: "Revalidação geral" });
    expect(within(generalPanel).getAllByTestId("diagnosis-card")).toHaveLength(2);
    expect(within(generalPanel).getByText("Ritmo sinusal")).toBeVisible();
    expect(within(generalPanel).getByText("Bloqueio de ramo direito")).toBeVisible();
  });

  it("mantém decisões em ToggleGroup controlado e exige salvar a discordância", async () => {
    const onReview = vi.fn().mockResolvedValue(true);
    render(
      <DiagnosisPanelHarness
        {...createProps({ onReview, options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal")]}
        isGeneralReviewDay={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Concordo" }));
    await waitFor(() => expect(onReview).toHaveBeenCalledWith(1, "confirmed"));

    fireEvent.click(screen.getByRole("button", { name: "Discordo" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Observação da discordância");
    expect(screen.getByRole("button", { name: "Salvar discordância" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: "Traçado incompatível" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar discordância" }));

    await waitFor(() => expect(onReview).toHaveBeenCalledWith(1, "rejected", "Traçado incompatível"));
  });

  it("preserva o payload da adição e consome a região selecionada", async () => {
    const onAdd = vi.fn().mockResolvedValue(true);
    const onRegionConsumed = vi.fn();
    render(
      <DiagnosisPanelHarness
        {...createProps({ onAdd, onRegionConsumed })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal")]}
        isGeneralReviewDay={false}
        selectedRegion={{ x: 10, y: 20, width: 30, height: 40 }}
      />,
    );

    const select = screen.getByRole("combobox", { name: "Adicionar diagnóstico" });
    fireEvent.click(select);
    fireEvent.click(await screen.findByRole("option", { name: "Fibrilação atrial" }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({
        name: "Fibrilação atrial",
        is_abnormal: true,
        region_x: 10,
        region_y: 20,
        region_width: 30,
        region_height: 40,
      });
      expect(onRegionConsumed).toHaveBeenCalledOnce();
    });
  });
});
