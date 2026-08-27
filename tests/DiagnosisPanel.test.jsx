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
  it("destaca a sugestão da IA no diagnóstico diário sem tomar a decisão médica", async () => {
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
    const aiBadge = within(dailyPanel).getByLabelText("Sugerido pela IA");

    expect(aiBadge).toBeVisible();
    expect(aiBadge).toHaveAccessibleName("Sugerido pela IA");
    expect(aiBadge).toHaveAccessibleDescription(
      "A IA sugeriu este diagnóstico. A avaliação médica continua obrigatória",
    );
    expect(within(dailyPanel).getByRole("button", { name: "Concordo" })).toHaveAttribute("aria-pressed", "false");
    expect(within(dailyPanel).getByRole("button", { name: "Discordo" })).toHaveAttribute("aria-pressed", "false");
    expect(onReview).not.toHaveBeenCalled();
    expect(screen.queryByText("Recomendação da IA")).not.toBeInTheDocument();

    fireEvent.focus(aiBadge);
    await waitFor(() => {
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent(
        "A IA sugeriu este diagnóstico. A avaliação médica continua obrigatória",
      );
    });
  });

  it("oculta sugestões quando o modo está desligado ou o campo não é verdadeiro", () => {
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

    expect(screen.queryByText("Sugerido pela IA")).not.toBeInTheDocument();

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

    expect(screen.queryByText("Sugerido pela IA")).not.toBeInTheDocument();
  });

  it("exibe sugestões em diagnósticos opcionais e na revalidação geral", () => {
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

    expect(screen.getAllByText("Sugerido pela IA")).toHaveLength(1);
    expect(screen.getByText("Bloqueio de ramo direito").closest('[data-slot="card"]')).toHaveTextContent("Sugerido pela IA");

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
    expect(within(generalPanel).getAllByText("Sugerido pela IA")).toHaveLength(2);
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
