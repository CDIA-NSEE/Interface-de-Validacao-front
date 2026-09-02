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
    const pendingStatus = within(dailyPanel).getByText("Aguardando decisão");

    expect(aiBadge).toBeVisible();
    expect(pendingStatus.closest("[data-slot='card-title']")).toBeTruthy();
    expect(pendingStatus).toHaveAttribute("data-variant", "pending");
    expect(aiBadge).toHaveAccessibleName("IA concordou");
    expect(aiBadge).toHaveAttribute("data-variant", "ai");
    expect(aiBadge.querySelector(".lucide-sparkles")).toBeTruthy();
    expect(aiBadge).toHaveAccessibleDescription(
      "Sugestão informativa; a decisão permanece médica.",
    );
    expect(within(dailyPanel).getByRole("button", { name: "Concordo" })).toHaveAttribute("aria-pressed", "false");
    expect(within(dailyPanel).getByRole("button", { name: "Discordo" })).toHaveAttribute("aria-pressed", "false");
    expect(onReview).not.toHaveBeenCalled();
    expect(screen.queryByText("Recomendação da IA")).not.toBeInTheDocument();

    fireEvent.focus(aiBadge);
    await waitFor(() => {
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent(
        "Sugestão informativa; a decisão permanece médica.",
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

  it("preserva badges clínicos no conteúdo do diagnóstico opcional expandido", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          originalDiagnosis(2, "Bloqueio de ramo direito", {
            is_grouped: true,
            region_required_missing: true,
          }),
        ]}
        isGeneralReviewDay={false}
      />,
    );

    const trigger = screen.getByRole("button", { name: /Bloqueio de ramo direito/ });
    fireEvent.click(trigger);
    const content = document.getElementById(trigger.getAttribute("aria-controls"));

    expect(within(content).getByText("Agrupado")).toBeVisible();
    expect(within(content).getByText("Área necessária")).toBeVisible();
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
    const markAreaButton = screen.getByRole("button", { name: "Marcar área" });
    expect(markAreaButton).toHaveClass("border-x-0", "px-0");
    const markAreaIconSlot = markAreaButton.querySelector('[data-slot="validation-panel-icon"]');
    expect(markAreaIconSlot).toHaveClass(
      "size-5",
      "shrink-0",
    );
    expect(markAreaIconSlot.querySelector("svg")).toHaveClass("size-[18px]");
    expect(markAreaButton.querySelector('[data-slot="validation-panel-icon-label"]')).toHaveClass(
      "gap-2",
      "items-center",
    );
    expect(screen.getByTestId("optional-diagnoses-scroll-boundary")).toHaveClass("max-h-[min(32svh,20rem)]", "grid-rows-[minmax(0,1fr)]");
    expect(screen.getByTestId("optional-diagnoses-scroll")).toHaveClass("min-h-0");

    const firstOptionalTrigger = screen.getByRole("button", { name: /Bloqueio de ramo direito/ });
    fireEvent.click(within(firstOptionalTrigger).getByText("Aguardando decisão"));
    expect(screen.getAllByRole("button", { name: "Concordo" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Marcar área" })).toHaveLength(2);
    expect(firstOptionalTrigger).toHaveAttribute("aria-expanded", "true");

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
    const onReviewInteractionBlocked = vi.fn();
    render(
      <AutoRevealHarness
        {...createProps({ onReviewInteractionBlocked, options: [] })}
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
    expect(onReviewInteractionBlocked).toHaveBeenCalledWith(2);
  });

  it("preserva decisões, regiões e remoção nos diagnósticos secundários", async () => {
    const onEditRegion = vi.fn();
    const onRemove = vi.fn();
    const onRemoveRegion = vi.fn();
    const onReview = vi.fn().mockResolvedValue(true);
    const optional = originalDiagnosis(2, "Bloqueio de ramo direito", {
      regions: [
        { id: 9, x: 10, y: 20, width: 30, height: 15 },
        { id: 10, x: 50, y: 35, width: 20, height: 10 },
      ],
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
    expect(screen.getByText("2 áreas marcadas")).toBeVisible();
    expect(screen.getByLabelText("2 áreas marcadas")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Adicionar área" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("2 áreas marcadas"));
    const addAreaButton = screen.getByRole("button", { name: "Adicionar área" });
    expect(addAreaButton).toBeVisible();
    expect(addAreaButton).toHaveClass("border-x-0", "px-0");
    expect(addAreaButton.querySelector('[data-slot="validation-panel-icon"]')).toHaveClass(
      "size-5",
      "shrink-0",
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Concordo" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Editar Área 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover Área 1" }));

    await waitFor(() => expect(onReview).toHaveBeenCalledWith(2, "confirmed"));
    expect(onEditRegion).toHaveBeenCalledWith(optional, optional.regions[0]);
    expect(onRemoveRegion).toHaveBeenCalledWith(2, 9);

    fireEvent.click(screen.getByRole("button", { name: /Fibrilação atrial/ }));
    expect(screen.queryByRole("group", { name: "Revisão de Fibrilação atrial" })).not.toBeInTheDocument();
    expect(screen.getByText("Adicionado", { selector: '[data-slot="badge"]' })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(screen.getByRole("alertdialog", { name: "Remover diagnóstico?" })).toHaveTextContent("Fibrilação atrial e 0 áreas associadas serão removidos juntos.");
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remover" }));
    expect(onRemove).toHaveBeenCalledWith(3);
  });

  it("expõe o nome acessível singular da região marcada", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal", {
            regions: [{ id: 9, x: 10, y: 20, width: 30, height: 15 }],
          }),
        ]}
        isGeneralReviewDay={false}
      />,
    );

    expect(screen.getByLabelText("1 área marcada")).toBeVisible();
    expect(screen.getByText("1 área marcada")).toBeVisible();
  });

  it("mantém o texto original legível com hierarquia visual secundária", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal", {
            original_text: "RITMO SINUSAL DO TRAÇADO ORIGINAL",
          }),
        ]}
        isGeneralReviewDay={false}
      />,
    );

    const original = screen.getByRole("button", {
      name: "Original: RITMO SINUSAL DO TRAÇADO ORIGINAL",
    });
    expect(within(original).getByText("Original:")).toHaveClass(
      "text-[0.7rem]",
      "text-muted-foreground/80",
    );
    expect(original.firstElementChild).toHaveClass(
      "text-xs",
      "font-normal",
      "text-muted-foreground",
    );
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

    expect(within(dailyPanel).queryByRole("heading", { name: "Diagnóstico do dia" })).not.toBeInTheDocument();
    expect(within(dailyPanel).queryByText("Um único diagnóstico obrigatório para esta validação.")).not.toBeInTheDocument();
    expect(within(dailyPanel).getByText("Diagnóstico do dia")).toBeVisible();
    expect(within(dailyPanel).getAllByTestId("diagnosis-card")).toHaveLength(1);
    expect(
      within(dailyPanel).getByTitle("Ritmo sinusal"),
    ).toBeVisible();
    expect(within(dailyPanel).queryByRole("combobox")).not.toBeInTheDocument();
    const secondaryTitle = screen.getByText("Diagnósticos adicionais");
    const secondaryCard = secondaryTitle.closest('[data-slot="card"]');
    const secondaryHeader = secondaryTitle.closest('[data-slot="card-header"]');

    expect(secondaryTitle).toBeVisible();
    expect(secondaryCard).toHaveClass("py-0");
    expect(secondaryHeader).toHaveClass("py-3");
    const secondaryToggle = screen.getByRole("button", { name: "Recolher opcionais" });
    const secondaryContent = document.getElementById(secondaryToggle.getAttribute("aria-controls"));
    expect(secondaryContent).toHaveClass(
      "h-(--collapsible-panel-height)",
      "overflow-hidden",
      "transition-[height]",
      "duration-200",
      "data-ending-style:h-0",
      "data-starting-style:h-0",
    );
    expect(secondaryToggle.querySelector("svg")).toHaveClass(
      "text-muted-foreground",
      "transition-transform",
      "duration-[180ms]",
      "rotate-180",
    );
    const addDiagnosisButton = screen.getByRole("button", { name: "Adicionar diagnóstico" });
    expect(addDiagnosisButton).toBeVisible();
    expect(addDiagnosisButton).toHaveTextContent("Adicionar");
    expect(addDiagnosisButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("1 no ECG · 0 adicionados")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Adicionar diagnóstico" })).not.toBeInTheDocument();
  });

  it("comunica a decisão pelo badge padronizado e pelo botão selecionado", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", {
          region_required_missing: true,
          review_status: "confirmed",
        })]}
        isGeneralReviewDay={false}
      />,
    );

    const dailyPanel = screen.getByRole("region", { name: "Diagnóstico do dia" });
    expect(within(dailyPanel).getByRole("button", { name: "Concordo" })).toHaveAttribute("aria-pressed", "true");
    expect(within(dailyPanel).getByRole("button", { name: "Discordo" })).toHaveAttribute("aria-pressed", "false");
    expect(within(dailyPanel).getByText("Concordo", { selector: '[data-slot="badge"]' })).toBeVisible();
    expect(within(dailyPanel).getByText("Área no ECG")).toBeVisible();
    expect(within(dailyPanel).getByText("Obrigatória para este diagnóstico.")).toBeVisible();
  });

  it("usa o mesmo badge para estados rejeitado e confirmado", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal", { review_status: "rejected" }),
          originalDiagnosis(2, "Bloqueio de ramo direito", { review_status: "confirmed" }),
        ]}
        isGeneralReviewDay={false}
      />,
    );

    const dailyPanel = screen.getByRole("region", { name: "Diagnóstico do dia" });
    expect(within(dailyPanel).getByRole("button", { name: "Concordo" })).toHaveAttribute("aria-pressed", "false");
    expect(within(dailyPanel).getByRole("button", { name: "Discordo" })).toHaveAttribute("aria-pressed", "true");
    expect(within(dailyPanel).getByText("Discordo", { selector: '[data-slot="badge"]' })).toHaveAttribute(
      "data-variant",
      "destructive",
    );

    const optionalTrigger = screen.getByRole("button", { name: /Bloqueio de ramo direito/ });
    expect(within(optionalTrigger).getByText("Concordo", { selector: '[data-slot="badge"]' })).toHaveAttribute(
      "data-variant",
      "success",
    );
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
    expect(within(generalPanel).getByRole("heading", { name: "Revalidação geral" })).toBeVisible();
    expect(within(generalPanel).getByText("Revise todos os diagnósticos originais deste exame.")).toBeVisible();
    expect(within(generalPanel).getAllByTestId("diagnosis-card")).toHaveLength(2);
    expect(
      within(generalPanel).getByTitle("Ritmo sinusal"),
    ).toBeVisible();
    expect(
      within(generalPanel).getByTitle("Bloqueio de ramo direito"),
    ).toBeVisible();
  });

  it("persiste a discordância imediatamente e mantém a justificativa opcional", async () => {
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
    await waitFor(() => expect(onReview).toHaveBeenCalledWith(1, "rejected", "", "decision"));
    expect(screen.queryByLabelText(/Justificativa/)).not.toBeInTheDocument();
  });

  it("exibe uma única identificação da justificativa no diagnóstico adicional", () => {
    const onReview = vi.fn().mockResolvedValue(true);
    render(
      <DiagnosisPanelHarness
        {...createProps({ onReview, options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          originalDiagnosis(2, "Bloqueio de ramo direito", { review_status: "rejected" }),
        ]}
        isGeneralReviewDay={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Bloqueio de ramo direito/ }));
    fireEvent.click(screen.getByRole("button", { name: "Justificativa (opcional)" }));

    const disagreementAlert = screen.getByRole("alert");
    expect(disagreementAlert.textContent.match(/Justificativa \(opcional\)/g)).toHaveLength(1);
    expect(within(disagreementAlert).getByLabelText("Justificativa (opcional)")).toBeVisible();
    fireEvent.change(within(disagreementAlert).getByLabelText("Justificativa (opcional)"), { target: { value: "Traçado incompatível" } });
    fireEvent.click(within(disagreementAlert).getByRole("button", { name: "Salvar justificativa" }));
    expect(onReview).toHaveBeenCalledWith(2, "rejected", "Traçado incompatível", "justification");
  });

  it("adiciona o diagnóstico sem reutilizar uma região em edição", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Adicionar diagnóstico" }));
    const select = screen.getByRole("combobox", { name: "Adicionar diagnóstico" });
    fireEvent.click(select);
    fireEvent.click(await screen.findByRole("option", { name: "Fibrilação atrial" }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({
        name: "Fibrilação atrial",
        is_abnormal: true,
        region_x: null,
        region_y: null,
        region_width: null,
        region_height: null,
      });
      expect(onRegionConsumed).not.toHaveBeenCalled();
    });
  });

  it("mostra Área necessária sem decisões para diagnóstico criado pelo médico", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          { ...originalDiagnosis(7, "Fibrilação atrial"), source: "doctor_added", region_required_missing: true },
        ]}
        isGeneralReviewDay={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Fibrilação atrial/ }));
    expect(screen.getByText("Área necessária", { selector: '[data-slot="badge"]' })).toHaveAttribute(
      "data-variant",
      "warning",
    );
    expect(screen.queryByRole("group", { name: "Revisão de Fibrilação atrial" })).not.toBeInTheDocument();
  });

  it("seleciona uma área pelo teclado e mantém sua lista recolhida até interação", () => {
    const onRegionHover = vi.fn();
    const onRegionSelect = vi.fn();
    render(
      <DiagnosisPanelHarness
        {...createProps({ onRegionHover, onRegionSelect, options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", {
          regions: [{ id: 9, x: 10, y: 20, width: 30, height: 15 }],
        })]}
        isGeneralReviewDay={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "Área 1" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("1 área marcada"));
    const area = screen.getByRole("button", { name: "Área 1" });
    fireEvent.focus(area);
    fireEvent.click(area);
    expect(onRegionHover).toHaveBeenCalledWith("1:9");
    expect(onRegionSelect).toHaveBeenCalledWith("1:9");
  });

  it("fecha o seletor e abre o diagnóstico recém-adicionado sem iniciar marcação", async () => {
    const onAdd = vi.fn().mockResolvedValue({
      ...originalDiagnosis(8, "Fibrilação atrial"),
      source: "doctor_added",
    });
    const onStartRegion = vi.fn();
    const { rerender } = render(
      <DiagnosisPanelHarness
        {...createProps({ onAdd, onStartRegion })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal")]}
        isGeneralReviewDay={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Adicionar diagnóstico" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Adicionar diagnóstico" }));
    fireEvent.click(await screen.findByRole("option", { name: "Fibrilação atrial" }));
    await waitFor(() => expect(screen.queryByRole("combobox", { name: "Adicionar diagnóstico" })).not.toBeInTheDocument());
    expect(onStartRegion).not.toHaveBeenCalled();

    rerender(
      <DiagnosisPanelHarness
        {...createProps({ onAdd, onStartRegion })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          { ...originalDiagnosis(8, "Fibrilação atrial"), source: "doctor_added" },
        ]}
        isGeneralReviewDay={false}
      />,
    );
    expect(screen.getByRole("button", { name: /Fibrilação atrial/ })).toHaveAttribute("aria-expanded", "true");
  });
});
