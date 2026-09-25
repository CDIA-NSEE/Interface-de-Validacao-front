import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import DiagnosisPanel from "../src/components/DiagnosisPanel.jsx";
import { ScrollArea } from "../src/components/ui/scroll-area.jsx";
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
  it("preserva a expansão das áreas ao recolher o diagnóstico e separa a ação de marcar", async () => {
    const user = userEvent.setup();
    const diagnosis = originalDiagnosis(2, "Bloqueio de ramo direito", {
      regions: [{ id: 9, x: 10, y: 20, width: 30, height: 15 }],
      review_status: "rejected",
      review_notes: "Justificativa salva",
    });
    const props = createProps({
      dailyStandardDiagnosis: "Ritmo sinusal", isGeneralReviewDay: false,
      diagnoses: [originalDiagnosis(1, "Ritmo sinusal"), diagnosis],
    });
    render(<AutoRevealHarness {...props} />);
    const section = screen.getByRole("button", { name: "Diagnósticos adicionais (opcional)" });
    await user.click(section);
    const diagnosisTrigger = () => screen.getAllByRole("button", { name: /Bloqueio de ramo direito/ })
      .find((button) => button.getAttribute("data-slot") === "accordion-trigger");
    await user.click(diagnosisTrigger());
    const areas = await screen.findByRole("button", { name: "1 área marcada" });
    areas.focus();
    await user.keyboard("{Enter}");
    expect(areas).toHaveAttribute("aria-expanded", "true");
    // "Marcar área" é o mesmo botão de quando não havia área (barra fixa do item), não um controle do cabeçalho da lista:
    // acioná-lo não mexe na lista. O cartão do dia tem o seu, por isso o escopo no item.
    await user.click(within(areas.closest('[data-diagnosis-id="2"]')).getByRole("button", { name: "Marcar área" }));
    expect(props.onStartRegion).toHaveBeenCalledWith(diagnosis, undefined);
    expect(areas).toHaveAttribute("aria-expanded", "true");
    await user.click(diagnosisTrigger());
    await user.click(diagnosisTrigger());
    expect(screen.getByRole("button", { name: "1 área marcada" })).toHaveAttribute("aria-expanded", "true");
    await user.click(section);
    await user.click(section);
    expect(diagnosisTrigger()).toHaveAttribute("aria-expanded", "true");
    const reopenedAreas = screen.getByRole("button", { name: "1 área marcada" });
    expect(reopenedAreas).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("group", { name: "Justificativa" })).toBeVisible();
    // Recolhida, a barra da justificativa mostra o começo do texto salvo.
    expect(screen.getByText("Justificativa salva")).toBeVisible();
    reopenedAreas.focus();
    await user.keyboard(" ");
    expect(reopenedAreas).toHaveAttribute("aria-expanded", "false");
    expect(props.onReview).not.toHaveBeenCalled();
  });

  it.each([true, false])("permite marcar outra área com a lista recolhida (diário: %s)", (isDaily) => {
    const diagnosis = originalDiagnosis(2, "Bloqueio de ramo direito", {
      regions: [{ id: 9, x: 10, y: 20, width: 30, height: 15 }],
    });
    const onStartRegion = vi.fn();
    render(<DiagnosisPanelHarness {...createProps({ onStartRegion, options: [] })}
      dailyStandardDiagnosis={isDaily ? diagnosis.name : "Ritmo sinusal"}
      diagnoses={[originalDiagnosis(1, "Ritmo sinusal"), diagnosis]} isGeneralReviewDay={false} />);
    if (!isDaily) fireEvent.click(screen.getByRole("button", { name: /Bloqueio de ramo direito/ }));
    expect(screen.getByRole("button", { name: "1 área marcada" })).toHaveAttribute("aria-expanded", "false");
    const item = screen.getByRole("button", { name: "1 área marcada" }).closest('[data-diagnosis-id="2"]');
    fireEvent.click(within(item).getByRole("button", { name: "Marcar área" }));
    expect(onStartRegion).toHaveBeenCalledWith(diagnosis, undefined);
  });

  it("mantém a lista de áreas e o item recolhidos quando o exame é atualizado com a mesma área selecionada", async () => {
    const additional = originalDiagnosis(2, "Bloqueio de ramo direito", { regions: [{ id: 9 }, { id: 10 }] });
    const props = createProps({
      options: [], dailyStandardDiagnosis: "Ritmo sinusal", isGeneralReviewDay: false,
      diagnoses: [originalDiagnosis(1, "Ritmo sinusal"), additional], selectedRegionKey: "2:9",
    });
    const { rerender } = render(<DiagnosisPanelHarness {...props} />);
    const diagnosisTrigger = () => screen.getAllByRole("button", { name: /Bloqueio de ramo direito/ })
      .find((button) => button.getAttribute("data-slot") === "accordion-trigger");
    // A seleção inicial abre o item e a lista de áreas (comportamento existente).
    const areas = await screen.findByRole("button", { name: "2 áreas marcadas" });
    expect(areas).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(areas);
    expect(areas).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(diagnosisTrigger());
    expect(diagnosisTrigger()).toHaveAttribute("aria-expanded", "false");
    // Decisão no diagnóstico do dia: o exame volta do servidor como um array novo, com a mesma área ainda selecionada.
    rerender(<DiagnosisPanelHarness {...props} diagnoses={[originalDiagnosis(1, "Ritmo sinusal", { review_status: "confirmed" }), additional]} />);
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    expect(diagnosisTrigger()).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(diagnosisTrigger());
    expect(await screen.findByRole("button", { name: "2 áreas marcadas" })).toHaveAttribute("aria-expanded", "false");
  });

  it("ignora um segundo clique na decisão enquanto a anterior não resolve", async () => {
    let resolveReview;
    const onReview = vi.fn().mockReturnValueOnce(new Promise((resolve) => {
      resolveReview = resolve;
    }));
    render(<DiagnosisPanelHarness {...createProps({ onReview, options: [] })}
      dailyStandardDiagnosis="Ritmo sinusal" diagnoses={[originalDiagnosis(1, "Ritmo sinusal")]} isGeneralReviewDay={false} />);
    const agree = screen.getByRole("button", { name: "Concordo" });
    const disagree = screen.getByRole("button", { name: "Discordo" });

    // Os toggles seguem habilitados numa requisição rápida (o `disabled` da página só chega se ela demorar).
    fireEvent.click(agree);
    fireEvent.click(disagree);
    expect(onReview).toHaveBeenCalledTimes(1);
    expect(onReview).toHaveBeenCalledWith(1, "confirmed");
    expect(agree).toHaveAttribute("aria-pressed", "true");
    expect(disagree).toHaveAttribute("aria-pressed", "false");

    await act(async () => {
      resolveReview(true);
    });
    fireEvent.click(disagree);
    expect(onReview).toHaveBeenCalledTimes(2);
    expect(onReview).toHaveBeenLastCalledWith(1, "rejected", "", "decision");
  });

  it("rola apenas o painel quando a barra do item está cortada e preserva a posição ao trocar áreas", async () => {
    const props = createProps({
      options: [], dailyStandardDiagnosis: "Ritmo sinusal", isGeneralReviewDay: false,
      diagnoses: [originalDiagnosis(1, "Ritmo sinusal"), originalDiagnosis(2, "Bloqueio de ramo direito", {
        regions: [{ id: 9 }, { id: 10 }],
      })],
    });
    // A lista não tem scroll próprio: quem rola é o ScrollArea do painel que a envolve (na página, o do aside ou o do Sheet).
    const inPanel = (ui) => <ScrollArea>{ui}</ScrollArea>;
    const { rerender } = render(inPanel(<DiagnosisPanelHarness {...props} />));
    const viewport = document.querySelector('[data-slot="scroll-area-viewport"]');
    const header = screen.getByRole("button", { name: /Bloqueio de ramo direito/ });
    // O que é revelado é a barra fixa do item (título + linha de ações), não só o gatilho.
    const itemBar = header.closest('[data-slot="diagnosis-item-bar"]');
    const bounds = vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ top: 100, bottom: 400 });
    const target = vi.spyOn(itemBar, "getBoundingClientRect").mockReturnValue({ top: 420, bottom: 480 });
    fireEvent.click(header);
    await waitFor(() => expect(viewport.scrollTop).toBe(80));
    target.mockReturnValue({ top: 100, bottom: 160 });
    rerender(inPanel(<DiagnosisPanelHarness {...props} selectedRegionKey="2:9" />));
    await waitFor(() => expect(screen.getByRole("button", { name: "Área 1" })).toHaveAttribute("aria-pressed", "true"));
    rerender(inPanel(<DiagnosisPanelHarness {...props} selectedRegionKey="2:10" />));
    await waitFor(() => expect(screen.getByRole("button", { name: "Área 2" })).toHaveAttribute("aria-pressed", "true"));
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    expect(viewport.scrollTop).toBe(80);
    bounds.mockRestore();
    target.mockRestore();
  });

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
    expect(pendingStatus.closest("[data-slot='card-header']")).toBeTruthy();
    expect(pendingStatus).toHaveAttribute("data-variant", "pending");
    expect(aiBadge).toHaveAccessibleName("IA concordou");
    expect(aiBadge).toHaveAttribute("data-variant", "ai");
    expect(within(dailyPanel).getByText("Diagnóstico do dia")).toHaveAttribute("data-variant", "info");
    expect(aiBadge.querySelector(".lucide-sparkles")).toBeTruthy();
    expect(aiBadge).toHaveAccessibleDescription(
      "Sugestão informativa; a decisão permanece médica.",
    );
    expect(within(dailyPanel).getByRole("button", { name: "Concordo" })).toHaveAttribute("aria-pressed", "false");
    expect(within(dailyPanel).getByRole("button", { name: "Discordo" })).toHaveAttribute("aria-pressed", "false");
    expect(onReview).not.toHaveBeenCalled();
    expect(screen.queryByText("Recomendação da IA")).not.toBeInTheDocument();

    // O badge é apenas informativo: não entra na ordem de Tab nem abre tooltip sobre o título.
    expect(aiBadge).not.toHaveAttribute("tabindex");
    expect(document.querySelector('[data-slot="tooltip-content"]')).not.toBeInTheDocument();
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

  it("mostra os badges clínicos do opcional expandido antes do Original e da decisão", () => {
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
    // Na barra do item, abaixo da divisória e antes do "Original:" e de Concordo/Discordo — a ordem do cartão do dia.
    const bar = trigger.closest('[data-slot="diagnosis-item-bar"]');
    const grouped = within(bar).getByText("Agrupado");
    const original = bar.querySelector('[data-slot="diagnosis-original-text"]');

    expect(grouped).toBeVisible();
    expect(within(bar).getByText("Área necessária")).toBeVisible();
    expect(grouped.compareDocumentPosition(original)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(original.compareDocumentPosition(within(bar).getByRole("group", { name: "Revisão de Bloqueio de ramo direito" }))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
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
    // No diagnóstico do dia, "Marcar área" divide a linha com as decisões.
    expect(markAreaButton.parentElement).toContainElement(screen.getByRole("group", { name: "Revisão de Ritmo sinusal" }));
    expect(markAreaButton.querySelector("svg")).toBeTruthy();
    expect(screen.getByTestId("optional-diagnoses-list")).toBeVisible();

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
    expect(screen.getByRole("button", { name: "Diagnósticos adicionais (opcional)" })).toHaveAttribute("aria-expanded", "true");
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
    const optionalItem = screen.getByLabelText("2 áreas marcadas").closest('[data-diagnosis-id="2"]');
    // Com áreas marcadas o "Marcar área" segue no item, na barra fixa: o mesmo botão e o mesmo lugar de quando não
    // havia área. O cabeçalho da lista é só o gatilho (contagem + chevron), sem um segundo botão de área.
    const markAreaButton = within(optionalItem).getByRole("button", { name: "Marcar área" });
    expect(markAreaButton).toBeVisible();
    expect(markAreaButton).toHaveAttribute("data-diagnosis-action", "mark-area");
    expect(markAreaButton.closest('[data-slot="diagnosis-item-bar"]')).not.toBeNull();
    expect(markAreaButton.closest('[data-slot="accordion-content"]')).toBeNull();
    fireEvent.click(screen.getByLabelText("2 áreas marcadas"));
    expect(within(optionalItem).getAllByRole("button", { name: "Marcar área" })).toHaveLength(1);
    expect(within(optionalItem).queryByRole("button", { name: "Adicionar área" })).not.toBeInTheDocument();
    const optionalAgreeButton = screen.getAllByRole("button", { name: "Concordo" })[1];
    // A decisão do original fica na barra fixa do item (título + ações), fora do painel rolável — o mesmo lugar em que
    // o adicionado tem "Remover diagnóstico"; a lista de áreas rola por baixo dela. "Marcar área" fecha a linha.
    expect(optionalAgreeButton.closest('[data-slot="diagnosis-item-bar"]')).not.toBeNull();
    expect(optionalAgreeButton.closest('[data-slot="accordion-content"]')).toBeNull();
    expect(optionalAgreeButton.compareDocumentPosition(markAreaButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(optionalAgreeButton.parentElement.parentElement).toBe(markAreaButton.parentElement);
    fireEvent.click(optionalAgreeButton);
    fireEvent.click(screen.getByRole("button", { name: "Editar Área 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover Área 1" }));

    await waitFor(() => expect(onReview).toHaveBeenCalledWith(2, "confirmed"));
    expect(onEditRegion).toHaveBeenCalledWith(optional, optional.regions[0]);
    expect(onRemoveRegion).toHaveBeenCalledWith(2, 9);

    // Fechado, o adicionado não expõe o gatilho de remoção; só o item aberto tem rodapé.
    expect(screen.queryByRole("button", { name: "Remover diagnóstico" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Fibrilação atrial/ }));
    expect(screen.queryByRole("group", { name: "Revisão de Fibrilação atrial" })).not.toBeInTheDocument();
    expect(screen.getByText("Adicionado", { selector: '[data-slot="badge"]' })).toBeVisible();
    const removeButton = screen.getByRole("button", { name: "Remover diagnóstico" });
    // Barra fixa do item (título + ações), fora do painel animado (é o que permite o sticky): "Marcar área" e
    // "Remover diagnóstico" dividem a mesma linha, no lugar em que os originais têm Concordo/Discordo.
    const doctorAddedItem = removeButton.closest('[data-diagnosis-id="3"]');
    expect(doctorAddedItem).not.toBeNull();
    expect(removeButton.closest('[data-slot="accordion-content"]')).toBeNull();
    expect(removeButton.closest('[data-slot="diagnosis-item-bar"]')).not.toBeNull();
    expect(within(doctorAddedItem).getByRole("button", { name: "Marcar área" }).parentElement).toBe(removeButton.parentElement);
    fireEvent.click(removeButton);
    expect(screen.getByRole("alertdialog", { name: "Remover diagnóstico?" })).toHaveTextContent("O diagnóstico Fibrilação atrial será removido deste exame.");
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remover" }));
    expect(onRemove).toHaveBeenCalledWith(3);
  });

  it("mantém Marcar área e Remover diagnóstico na barra fixa do item adicionado, antes das áreas", () => {
    const onRemove = vi.fn();
    const doctorAdded = {
      ...originalDiagnosis(3, "Fibrilação atrial", {
        regions: [
          { id: 9, x: 10, y: 20, width: 30, height: 15 },
          { id: 10, x: 50, y: 35, width: 20, height: 10 },
          { id: 11, x: 70, y: 55, width: 15, height: 10 },
        ],
      }),
      source: "doctor_added",
    };

    render(
      <DiagnosisPanelHarness
        {...createProps({ onRemove, options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal"), doctorAdded]}
        isGeneralReviewDay={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Fibrilação atrial/ }));
    fireEvent.click(screen.getByLabelText("3 áreas marcadas"));
    const removeButton = screen.getByRole("button", { name: "Remover diagnóstico" });
    const doctorAddedItem = removeButton.closest('[data-diagnosis-id="3"]');
    expect(doctorAddedItem).not.toBeNull();
    const markAreaButton = within(doctorAddedItem).getByRole("button", { name: "Marcar área" });
    const lastAreaRemoveButton = screen.getByRole("button", { name: "Remover Área 3" });

    // Ordem de leitura: as ações do diagnóstico inteiro vêm na barra fixa (logo após o título) — o Remover no slot do
    // veredito, à esquerda, onde os originais têm Concordo/Discordo, e "Marcar área" fechando a linha à direita, no mesmo
    // lugar dos originais — e só depois a gestão das áreas (editar/remover área), que rola por baixo da barra.
    expect(removeButton.compareDocumentPosition(markAreaButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(markAreaButton.parentElement.lastElementChild).toBe(markAreaButton);
    expect(removeButton.compareDocumentPosition(lastAreaRemoveButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(removeButton.closest('[data-slot="accordion-content"]')).toBeNull();
    expect(removeButton.closest('[data-slot="diagnosis-item-bar"]')).not.toBeNull();
    // Com áreas marcadas o "Marcar área" segue na linha ao lado do Remover: sem slot vazio e sem um segundo botão na lista.
    expect(markAreaButton.parentElement).toBe(removeButton.parentElement);
    expect(within(doctorAddedItem).getAllByRole("button", { name: "Marcar área" })).toHaveLength(1);
    expect(within(doctorAddedItem).queryByRole("button", { name: "Adicionar área" })).not.toBeInTheDocument();

    fireEvent.click(removeButton);
    expect(screen.getByRole("alertdialog", { name: "Remover diagnóstico?" })).toHaveTextContent("O diagnóstico Fibrilação atrial e 3 áreas marcadas serão removidos deste exame.");
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

    // Texto curto: texto simples, sem botão/tooltip (nenhuma parada de Tab antes da decisão) — como todo texto original.
    const original = screen.getByText("RITMO SINUSAL DO TRAÇADO ORIGINAL");
    expect(screen.getByText("Original:")).toBeVisible();
    expect(original).toBeVisible();
    expect(original.closest("button")).toBeNull();
    expect(screen.queryByRole("button", { name: /Original:/ })).not.toBeInTheDocument();
  });

  it("exibe o texto original longo por completo, sem truncar nem tooltip", () => {
    const longText = "RITMO SINUSAL COM ALTERAÇÕES INESPECÍFICAS DA REPOLARIZAÇÃO VENTRICULAR";
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", { original_text: longText })]}
        isGeneralReviewDay={false}
      />,
    );

    // Nada escondido: o texto que o médico compara com o título aparece inteiro, quebrando linha, e não é botão nem tooltip.
    const original = screen.getByText(longText);
    expect(original).toBeVisible();
    expect(original.parentElement).toHaveTextContent(`Original: ${longText}`);
    expect(original.parentElement).not.toHaveTextContent("…");
    expect(original.closest("button")).toBeNull();
    expect(screen.queryByRole("button", { name: /Original:/ })).not.toBeInTheDocument();
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
    // Título localizado pelo texto dentro do card-title (a linha "Original:" repete o mesmo texto); sem tooltip nativo redundante.
    const dailyTitle = within(dailyPanel).getByText("Ritmo sinusal", { selector: '[data-slot="card-title"] span' });
    expect(dailyTitle).toBeVisible();
    expect(dailyTitle).not.toHaveAttribute("title");
    expect(within(dailyPanel).queryByRole("combobox")).not.toBeInTheDocument();
    const secondaryTitle = screen.getByText("Diagnósticos adicionais");

    expect(secondaryTitle).toBeVisible();
    expect(secondaryTitle.closest('[data-slot="card-header"]')).toBeTruthy();
    const secondaryToggle = screen.getByRole("button", { name: "Diagnósticos adicionais (opcional)" });
    // Título da seção (h2) com o gatilho dentro; os itens (h3 do acordeão) ficam abaixo dele na árvore de títulos.
    expect(screen.getByRole("heading", { level: 2, name: "Diagnósticos adicionais (opcional)" })).toContainElement(secondaryToggle);
    expect(secondaryToggle).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(secondaryToggle.getAttribute("aria-controls"))).toBeVisible();
    const addDiagnosisButton = screen.getByRole("button", { name: "Adicionar diagnóstico" });
    expect(addDiagnosisButton).toBeVisible();
    expect(addDiagnosisButton).toHaveTextContent("Adicionar");
    expect(addDiagnosisButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("1 no ECG · 0 adicionados")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Adicionar diagnóstico" })).not.toBeInTheDocument();
  });

  it("expande diagnósticos adicionais pelo cabeçalho sem misturar a ação de adicionar", async () => {
    const user = userEvent.setup();
    render(
      <AutoRevealHarness
        {...createProps()}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          originalDiagnosis(2, "Bloqueio de ramo direito"),
        ]}
        isGeneralReviewDay={false}
      />,
    );

    const headerToggle = screen.getByRole("button", { name: "Diagnósticos adicionais (opcional)" });
    const addDiagnosisButton = screen.getByRole("button", { name: "Adicionar diagnóstico" });

    expect(headerToggle).toHaveAttribute("aria-expanded", "false");
    // O cabeçalho só recolhe/expande; a ação de adicionar fica no rodapé fixo do cartão, fora do cabeçalho.
    const header = headerToggle.closest('[data-slot="card-header"]');
    expect(within(header).getAllByRole("button")).toHaveLength(1);
    expect(headerToggle.querySelector("button")).not.toBeInTheDocument();
    expect(addDiagnosisButton.closest('[data-slot="card-header"]')).toBeNull();
    expect(addDiagnosisButton.parentElement.closest("button")).toBeNull();

    await user.click(headerToggle);
    expect(headerToggle).toHaveAttribute("aria-expanded", "true");

    const addDiagnosisFooter = addDiagnosisButton.parentElement;
    await user.click(addDiagnosisButton);
    const addDiagnosisSearch = screen.getByRole("combobox", { name: "Adicionar diagnóstico" });
    expect(addDiagnosisSearch).toBeVisible();
    // O rodapé é o mesmo nó nos dois estados: a troca botão ↔ campo não remonta a linha (sem "piscada" da borda).
    expect(addDiagnosisFooter).toContainElement(addDiagnosisSearch);
    expect(headerToggle).toHaveAttribute("aria-expanded", "true");

    // O seletor ocupa o lugar do botão; Escape fecha só a lista (o resto do cartão fica aria-hidden enquanto ela está aberta)
    // e cancelar devolve o botão e o foco a ele.
    await user.keyboard("{Escape}");
    expect(screen.getByRole("combobox", { name: "Adicionar diagnóstico" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancelar adição" }));
    expect(screen.queryByRole("combobox", { name: "Adicionar diagnóstico" })).not.toBeInTheDocument();
    expect(headerToggle).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(screen.getByRole("button", { name: "Adicionar diagnóstico" })).toHaveFocus());

    await user.click(headerToggle.querySelector("svg"));
    expect(headerToggle).toHaveAttribute("aria-expanded", "false");

    headerToggle.focus();
    await user.keyboard("{Enter}");
    expect(headerToggle).toHaveAttribute("aria-expanded", "true");

    await user.keyboard(" ");
    expect(headerToggle).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button", { name: "Adicionar diagnóstico" }));
    expect(headerToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("combobox", { name: "Adicionar diagnóstico" })).toBeVisible();
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
    // Área obrigatória pendente: o aviso é só a mensagem (uma linha) e o "Marcar área" é o de sempre, na linha de ações.
    const requiredAlert = within(dailyPanel).getByText("Área obrigatória no ECG").closest('[data-slot="alert"]');
    expect(requiredAlert).toBeVisible();
    expect(within(requiredAlert).queryByRole("button")).not.toBeInTheDocument();
    const markAreaButton = within(dailyPanel).getByRole("button", { name: "Marcar área" });
    expect(markAreaButton.closest('[data-slot="diagnosis-action-row"]')).not.toBeNull();
    expect(markAreaButton.parentElement).toContainElement(within(dailyPanel).getByRole("button", { name: "Concordo" }));
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
      within(generalPanel).getByText("Ritmo sinusal", { selector: '[data-slot="card-title"] span' }),
    ).toBeVisible();
    expect(
      within(generalPanel).getByText("Bloqueio de ramo direito", { selector: '[data-slot="card-title"] span' }),
    ).toBeVisible();
  });

  it("persiste a discordância imediatamente e já abre a justificativa opcional, sem tirar o foco do Discordo", async () => {
    const user = userEvent.setup();
    const onReview = vi.fn().mockResolvedValue(true);
    render(
      <DiagnosisPanelHarness
        {...createProps({ onReview, options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal")]}
        isGeneralReviewDay={false}
      />,
    );
    const justification = () => screen.queryByRole("textbox", { name: "Justificativa (opcional)" });

    await user.click(screen.getByRole("button", { name: "Concordo" }));
    await waitFor(() => expect(onReview).toHaveBeenCalledWith(1, "confirmed"));
    expect(justification()).not.toBeInTheDocument();

    const disagree = screen.getByRole("button", { name: "Discordo" });
    await user.click(disagree);
    await waitFor(() => expect(onReview).toHaveBeenCalledWith(1, "rejected", "", "decision"));
    await waitFor(() => expect(justification()).toHaveValue(""));
    expect(screen.queryByRole("button", { name: "Adicionar justificativa" })).not.toBeInTheDocument();
    expect(disagree).toHaveFocus();

    // Vazio, o editor não bloqueia nada: Concordo segue valendo e o fecha.
    onReview.mockClear();
    await user.click(screen.getByRole("button", { name: "Concordo" }));
    await waitFor(() => expect(onReview).toHaveBeenCalledWith(1, "confirmed"));
    await waitFor(() => expect(justification()).not.toBeInTheDocument());
  });

  it("não abre a justificativa se a discordância não foi salva", async () => {
    const onReview = vi.fn().mockResolvedValue(false);
    render(
      <DiagnosisPanelHarness
        {...createProps({ onReview, options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal")]}
        isGeneralReviewDay={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Discordo" }));
    await waitFor(() => expect(onReview).toHaveBeenCalledWith(1, "rejected", "", "decision"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Discordo" })).toHaveAttribute("aria-pressed", "false"));
    expect(screen.queryByRole("textbox", { name: "Justificativa (opcional)" })).not.toBeInTheDocument();
  });

  it("abre a justificativa do adicional no lugar, sem reabrir o item se o médico já abriu outro", async () => {
    let resolveReview;
    const onReview = vi.fn().mockReturnValueOnce(new Promise((resolve) => {
      resolveReview = resolve;
    }));
    render(
      <DiagnosisPanelHarness
        {...createProps({ onReview, options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          originalDiagnosis(2, "Bloqueio de ramo direito"),
          originalDiagnosis(3, "Extrassistolia ventricular"),
        ]}
        isGeneralReviewDay={false}
      />,
    );
    const firstTrigger = () => screen.getByRole("button", { name: /Bloqueio de ramo direito/ });
    const secondTrigger = () => screen.getByRole("button", { name: /Extrassistolia ventricular/ });

    fireEvent.click(firstTrigger());
    const firstItem = firstTrigger().closest('[data-diagnosis-id="2"]');
    fireEvent.click(within(firstItem).getByRole("button", { name: "Discordo" }));
    // A resposta chega depois de o médico já ter passado ao item seguinte.
    fireEvent.click(secondTrigger());
    await act(async () => {
      resolveReview(true);
    });

    expect(secondTrigger()).toHaveAttribute("aria-expanded", "true");
    expect(firstTrigger()).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(firstTrigger());
    expect(await within(firstItem).findByRole("textbox", { name: "Justificativa (opcional)" })).toHaveValue("");
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

    expect(screen.getAllByRole("group", { name: "Justificativa" })).toHaveLength(1);
    const justificationGroup = screen.getByRole("group", { name: "Justificativa" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const field = within(justificationGroup).getByRole("textbox", { name: "Justificativa (opcional)" });
    expect(field).toBeVisible();
    fireEvent.change(field, { target: { value: "Traçado incompatível" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar justificativa" }));
    expect(onReview).toHaveBeenCalledWith(2, "rejected", "Traçado incompatível", "justification");
  });

  it("filtra os diagnósticos ao digitar, ignorando acentos e caixa", async () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: ["Bloqueio de ramo direito", "Fibrilação atrial"] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal")]}
        isGeneralReviewDay={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Adicionar diagnóstico" }));
    const search = screen.getByRole("combobox", { name: "Adicionar diagnóstico" });
    expect(screen.getAllByRole("option")).toHaveLength(2);

    fireEvent.change(search, { target: { value: "FIBRI" } });
    await waitFor(() => expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Fibrilação atrial"]));

    fireEvent.change(search, { target: { value: "zzz" } });
    await waitFor(() => expect(screen.queryByRole("option")).not.toBeInTheDocument());
    expect(screen.getByText("Nenhum diagnóstico encontrado.")).toBeInTheDocument();
  });

  it("oculta diagnósticos já presentes no exame e ordena as opções alfabeticamente", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: ["Fibrilação atrial", "Bloqueio de ramo direito", "RITMO SINUSAL", "Extrassistolia ventricular"] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          { ...originalDiagnosis(7, "EXTRASSÍSTOLIA VENTRICULAR"), standard_text: null, source: "doctor_added" },
        ]}
        isGeneralReviewDay={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Adicionar diagnóstico" }));
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Bloqueio de ramo direito",
      "Fibrilação atrial",
    ]);
  });

  it("esconde a ação de adicionar quando todos os diagnósticos já estão no exame", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: ["Ritmo sinusal"] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal")]}
        isGeneralReviewDay={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "Adicionar diagnóstico" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Diagnósticos adicionais (opcional)" })).not.toBeInTheDocument();
  });

  it("mostra a lista vazia como título estático e frase de status, com a ação de adicionar", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps()}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal")]}
        isGeneralReviewDay={false}
      />,
    );

    // Recolher uma lista vazia não faz nada: o título segue sendo h2, mas sem gatilho.
    const heading = screen.getByRole("heading", { level: 2, name: "Diagnósticos adicionais (opcional)" });
    expect(within(heading).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Nenhum diagnóstico adicional neste ECG.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Adicionar diagnóstico" })).toBeVisible();
  });

  it("adiciona o diagnóstico sem região associada", async () => {
    const onAdd = vi.fn().mockResolvedValue(true);
    render(
      <DiagnosisPanelHarness
        {...createProps({ onAdd })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal")]}
        isGeneralReviewDay={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Adicionar diagnóstico" }));
    // A lista abre sozinha junto com o seletor (defaultOpen): nenhum clique extra no combobox.
    expect(screen.getByRole("combobox", { name: "Adicionar diagnóstico" })).toBeVisible();
    const option = await screen.findByRole("option", { name: "Fibrilação atrial" });
    // Base UI só aceita clique de mouse iniciado no item (pointerdown antes do click).
    fireEvent.pointerDown(option);
    fireEvent.click(option);

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({
        name: "Fibrilação atrial",
        is_abnormal: true,
        region_x: null,
        region_y: null,
        region_width: null,
        region_height: null,
      });
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
    const option = await screen.findByRole("option", { name: "Fibrilação atrial" });
    // Base UI só aceita clique de mouse iniciado no item (pointerdown antes do click).
    fireEvent.pointerDown(option);
    fireEvent.click(option);
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
    const addedTrigger = screen.getByRole("button", { name: /Fibrilação atrial/ });
    expect(addedTrigger).toHaveAttribute("aria-expanded", "true");
    // O campo desmontou: o foco não fica perdido no body, vai para o gatilho do item recém-adicionado.
    await waitFor(() => expect(addedTrigger).toHaveFocus());
  });

  it("mantém as decisões antes das áreas e da justificativa no diagnóstico do dia", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", {
          regions: [
            { id: 9, x: 10, y: 20, width: 30, height: 15 },
            { id: 10, x: 45, y: 25, width: 20, height: 10 },
          ],
          review_notes: "Alteração confirmada no traçado.",
          review_status: "rejected",
        })]}
        isGeneralReviewDay={false}
      />,
    );

    const original = screen.getByText("Original:").parentElement;
    const decisions = screen.getByRole("group", { name: "Revisão de Ritmo sinusal" });
    const areaSummary = screen.getByRole("button", { name: "2 áreas marcadas" });
    const savedJustification = screen.getByRole("group", { name: "Justificativa" });

    expect(original.compareDocumentPosition(decisions)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(decisions.compareDocumentPosition(areaSummary)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(areaSummary.compareDocumentPosition(savedJustification)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.queryByRole("button", { name: "Área 1" })).not.toBeInTheDocument();

    fireEvent.click(areaSummary);
    expect(screen.getByRole("button", { name: "Área 1" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Área 2" })).toBeVisible();
    // Com áreas, "Marcar área" continua na linha da decisão (slot fixo), não no cabeçalho da lista.
    const markAreaButton = screen.getByRole("button", { name: "Marcar área" });
    expect(markAreaButton.parentElement).toContainElement(decisions);
    expect(markAreaButton.compareDocumentPosition(areaSummary)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.queryByRole("button", { name: "Adicionar área" })).not.toBeInTheDocument();
  });

  it.each([
    ["sem área", {}],
    ["com áreas", { regions: [{ id: 9, x: 10, y: 10, width: 20, height: 20 }, { id: 10, x: 40, y: 40, width: 10, height: 10 }] }],
    ["com área obrigatória pendente", { region_required_missing: true }],
  ])("mantém um único Marcar área no mesmo slot da linha de ações (%s)", (_label, extra) => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", extra)]}
        isGeneralReviewDay={false}
      />,
    );

    const markAreaButtons = screen.getAllByRole("button", { name: "Marcar área" });
    expect(markAreaButtons).toHaveLength(1);
    expect(markAreaButtons[0]).toHaveAttribute("data-diagnosis-action", "mark-area");
    expect(markAreaButtons[0].closest('[data-slot="diagnosis-action-row"]')).not.toBeNull();
    expect(markAreaButtons[0].parentElement).toContainElement(screen.getByRole("group", { name: "Revisão de Ritmo sinusal" }));
    expect(screen.queryByRole("button", { name: "Adicionar área" })).not.toBeInTheDocument();
  });

  it("na revalidação geral usa a mesma linha Concordo | Discordo | Marcar área do diário, antes da lista de áreas", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          originalDiagnosis(2, "Bloqueio de ramo direito", { regions: [{ id: 9, x: 10, y: 10, width: 20, height: 20 }] }),
          originalDiagnosis(3, "Sobrecarga atrial esquerda", { region_required_missing: true }),
          originalDiagnosis(4, "Extrassístoles ventriculares", { review_status: "rejected", review_notes: "Artefato de movimento." }),
        ]}
        isGeneralReviewDay
      />,
    );

    const cards = screen.getAllByTestId("diagnosis-card");
    ["Ritmo sinusal", "Bloqueio de ramo direito", "Sobrecarga atrial esquerda", "Extrassístoles ventriculares"].forEach((title, index) => {
      const decisions = within(cards[index]).getByRole("group", { name: `Revisão de ${title}` });
      const markAreaButton = within(cards[index]).getByRole("button", { name: "Marcar área" });
      // Mesma linha de ações dos outros layouts: decisão à esquerda, "Marcar área" fechando a linha à direita.
      const row = markAreaButton.closest('[data-slot="diagnosis-action-row"]');
      expect(row).not.toBeNull();
      expect(row).toContainElement(decisions);
      expect(row.lastElementChild).toBe(markAreaButton);
      expect(markAreaButton).toHaveClass("h-10", "ml-auto");
    });
    const areas = within(cards[1]).getByRole("button", { name: "1 área marcada" });
    expect(within(cards[1]).getByRole("button", { name: "Marcar área" }).compareDocumentPosition(areas)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(within(cards[2]).getByText("Área obrigatória no ECG")).toBeVisible();
    expect(within(within(cards[2]).getByText("Área obrigatória no ECG").closest('[data-slot="alert"]')).queryByRole("button")).not.toBeInTheDocument();
    // Justificativa salva: o mesmo grupo do diário — recolhida, a barra resume o texto; aberta, o próprio campo com ele.
    const justificationGroup = within(cards[3]).getByRole("group", { name: "Justificativa" });
    const justificationBar = within(justificationGroup).getByRole("button", { name: "Justificativa" });
    expect(justificationBar).toHaveAttribute("aria-expanded", "false");
    expect(justificationBar).toHaveTextContent("Artefato de movimento.");
    fireEvent.click(justificationBar);
    expect(within(justificationGroup).getByRole("textbox", { name: "Justificativa (opcional)" })).toHaveValue("Artefato de movimento.");
  });

  it("edita a justificativa diária no próprio campo, com Cancelar │ Salvar só quando há alteração", () => {
    const onReview = vi.fn().mockResolvedValue(true);
    render(
      <DiagnosisPanelHarness
        {...createProps({ onReview, options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", { review_status: "rejected" })]}
        isGeneralReviewDay={false}
      />,
    );

    expect(screen.queryByText("Discordância em edição")).not.toBeInTheDocument();
    // A barra do grupo substitui o "Adicionar justificativa".
    expect(screen.queryByRole("button", { name: "Adicionar justificativa" })).not.toBeInTheDocument();
    const bar = screen.getByRole("button", { name: "Justificativa (opcional)" });
    expect(bar).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(bar);

    const textarea = screen.getByRole("textbox", { name: "Justificativa (opcional)" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(textarea).toHaveAttribute("placeholder", "Registre o motivo da discordância");
    // Sem alteração, não há o que salvar nem cancelar.
    expect(screen.queryByRole("button", { name: "Salvar justificativa" })).not.toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: "Traçado incompatível" } });
    const save = screen.getByRole("button", { name: "Salvar justificativa" });
    const cancel = screen.getByRole("button", { name: "Cancelar" });
    // Dentro do contorno do grupo, no fim do campo — as ações pertencem ao texto. O rótulo visível é só "Salvar" (como
    // nas observações); o nome acessível mantém o objeto.
    expect(screen.getByRole("group", { name: "Justificativa" })).toContainElement(save);
    expect(save.textContent).toBe("Salvar");
    // Dispensar à esquerda, confirmar à direita — a ordem dos diálogos e do rodapé.
    expect(cancel.compareDocumentPosition(save)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(save.parentElement).toHaveClass("sm:justify-end");
    expect(save.parentElement.lastElementChild).toBe(save);
    fireEvent.click(save);
    expect(onReview).toHaveBeenCalledWith(1, "rejected", "Traçado incompatível", "justification");
  });

  it("leva o cursor ao campo ao abrir a justificativa vazia e devolve o foco à barra ao salvar ou cancelar", async () => {
    const user = userEvent.setup();
    const onReview = vi.fn().mockResolvedValue(true);
    render(
      <DiagnosisPanelHarness
        {...createProps({ onReview, options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", { review_status: "rejected" })]}
        isGeneralReviewDay={false}
      />,
    );
    const justification = () => screen.getByRole("textbox", { name: "Justificativa (opcional)" });
    const bar = () => screen.getByRole("button", { name: "Justificativa (opcional)" });

    await user.click(bar());
    await waitFor(() => expect(justification()).toHaveFocus());
    await user.keyboard("Rascunho");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    // Cancelar volta ao texto salvo (aqui, nenhum) e mantém o grupo aberto.
    expect(justification()).toHaveValue("");
    await waitFor(() => expect(bar()).toHaveFocus());

    await user.click(justification());
    await user.keyboard("Traçado incompatível");
    await user.click(screen.getByRole("button", { name: "Salvar justificativa" }));
    expect(onReview).toHaveBeenCalledWith(1, "rejected", "Traçado incompatível", "justification");
    // Salvo, o grupo continua aberto e o foco volta à barra.
    await waitFor(() => expect(bar()).toHaveFocus());
    expect(bar()).toHaveAttribute("aria-expanded", "true");
  });

  it("salva a justificativa com Ctrl+Enter sem tirar o foco do campo", async () => {
    const user = userEvent.setup();
    const onReview = vi.fn().mockResolvedValue(true);
    render(
      <DiagnosisPanelHarness
        {...createProps({ onReview, options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", { review_status: "rejected" })]}
        isGeneralReviewDay={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Justificativa (opcional)" }));
    const justification = screen.getByRole("textbox", { name: "Justificativa (opcional)" });
    await waitFor(() => expect(justification).toHaveFocus());
    // Sem alteração, não há o que salvar.
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onReview).not.toHaveBeenCalled();
    // Enter sozinho quebra linha.
    await user.keyboard("Traçado incompatível{Enter}Repetir ECG");
    expect(justification).toHaveValue("Traçado incompatível\nRepetir ECG");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onReview).toHaveBeenCalledWith(1, "rejected", "Traçado incompatível\nRepetir ECG", "justification");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Salvar justificativa" })).not.toBeInTheDocument());
    expect(justification).toHaveFocus();
  });

  it("mostra o começo da justificativa salva na barra recolhida e abre para ler sem tirar o foco da barra", async () => {
    const user = userEvent.setup();
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", { review_notes: "Traçado incompatível", review_status: "rejected" })]}
        isGeneralReviewDay={false}
      />,
    );

    // Recolhida ao abrir o exame (como as áreas), a barra mostra o começo do texto — e o leitor de tela o ouve como
    // descrição da barra, cujo nome continua "Justificativa".
    const bar = screen.getByRole("button", { name: "Justificativa" });
    expect(bar).toHaveAttribute("aria-expanded", "false");
    expect(bar).toHaveTextContent("Traçado incompatível");
    expect(bar).toHaveAccessibleDescription("Traçado incompatível");
    await user.click(bar);
    expect(bar).toHaveAttribute("aria-expanded", "true");
    // Aberta, a prévia continua montada (para esmaecer), mas oculta e fora da descrição: o texto está no campo.
    expect(bar.querySelector('[data-slot="justification-preview"]')).toHaveAttribute("aria-hidden", "true");
    expect(bar).not.toHaveAccessibleDescription();
    expect(screen.getByRole("textbox", { name: "Justificativa (opcional)" })).toHaveValue("Traçado incompatível");
    // Abriu para ler: o foco fica na barra (só o grupo vazio leva o cursor ao campo).
    expect(bar).toHaveFocus();
    await user.click(bar);
    expect(bar).toHaveAttribute("aria-expanded", "false");
  });

  it("salva a justificativa limpa e não conta espaços ou enters nas bordas como alteração", async () => {
    const onReview = vi.fn().mockResolvedValue(true);
    const { unmount } = render(
      <DiagnosisPanelHarness
        {...createProps({ onReview, options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", { review_status: "rejected" })]}
        isGeneralReviewDay={false}
      />,
    );
    const justification = () => screen.getByRole("textbox", { name: "Justificativa (opcional)" });
    const save = () => screen.getByRole("button", { name: "Salvar justificativa" });

    fireEvent.click(screen.getByRole("button", { name: "Justificativa (opcional)" }));
    // Só espaços e enters: não há justificativa, então não há o que salvar.
    fireEvent.change(justification(), { target: { value: "  \n\n  " } });
    expect(screen.queryByRole("button", { name: "Salvar justificativa" })).not.toBeInTheDocument();
    fireEvent.change(justification(), { target: { value: "\n\nTraçado incompatível.   \n\n\n\nRitmo irregular.\n\n" } });
    fireEvent.click(save());
    expect(onReview).toHaveBeenCalledWith(1, "rejected", "Traçado incompatível.\n\nRitmo irregular.", "justification");
    unmount();

    // Justificativa já salva: um enter a mais no fim não habilita o Salvar nem bloqueia a decisão.
    onReview.mockClear();
    render(
      <DiagnosisPanelHarness
        {...createProps({ onReview, onReviewInteractionBlocked: vi.fn(), options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", { review_notes: "Traçado incompatível.", review_status: "rejected" })]}
        isGeneralReviewDay={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Justificativa" }));
    fireEvent.change(justification(), { target: { value: "Traçado incompatível.\n\n" } });
    expect(screen.queryByRole("button", { name: "Salvar justificativa" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Concordo" }));
    await waitFor(() => expect(onReview).toHaveBeenCalledWith(1, "confirmed"));
  });

  it("mostra a justificativa salva no próprio campo, com as quebras de linha digitadas, num grupo com a forma do de áreas", async () => {
    const user = userEvent.setup();
    const note = "Traçado não sustenta o achado.\n\nRitmo irregular em D2 longo.";
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", { review_notes: note, review_status: "rejected" })]}
        isGeneralReviewDay={false}
      />,
    );

    const group = screen.getByRole("group", { name: "Justificativa" });
    const bar = within(group).getByRole("button", { name: "Justificativa" });
    // Mesma forma do grupo "N áreas marcadas": contorno e barra.
    expect(group).toHaveClass("overflow-hidden", "rounded-lg", "border", "border-input");
    expect(bar).toHaveClass("h-8", "bg-muted/60");
    // Recolhida, a barra resume o texto numa linha.
    expect(within(bar).getByText("Traçado não sustenta o achado. Ritmo irregular em D2 longo.")).toHaveClass("truncate");

    await user.click(bar);
    // O texto salvo é o próprio campo, com as quebras de linha: clicou, escreveu — sem "Editar".
    const field = within(group).getByRole("textbox", { name: "Justificativa (opcional)" });
    expect(field).toHaveValue(note);
    expect(field).toHaveClass("resize-none", "border-0");
    expect(screen.queryByRole("button", { name: /^Editar/ })).not.toBeInTheDocument();
  });

  it("mantém decisões antes das áreas e reabre a justificativa salva do adicional", async () => {
    const user = userEvent.setup();
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          originalDiagnosis(2, "Bloqueio de ramo direito", {
            review_status: "rejected", review_notes: "Justificativa salva",
            regions: [{ id: 9, x: 10, y: 10, width: 20, height: 20 }],
          }),
        ]}
        decisionFeedbacks={{ "2": { type: "success", message: "✓ Decisão salva" } }}
        isGeneralReviewDay={false}
      />,
    );
    const header = screen.getByRole("button", { name: /Bloqueio de ramo direito/ });
    expect(within(header).getByRole("status")).toHaveTextContent("✓ Salvo");
    await user.click(header);
    const decisions = screen.getByRole("group", { name: "Revisão de Bloqueio de ramo direito" });
    const areas = screen.getByRole("button", { name: "1 área marcada" });
    expect(decisions.compareDocumentPosition(areas)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(areas).toHaveAttribute("aria-expanded", "false");
    const justificationBar = screen.getByRole("button", { name: "Justificativa" });
    expect(areas.compareDocumentPosition(justificationBar)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    await user.click(justificationBar);
    expect(screen.getByRole("textbox", { name: "Justificativa (opcional)" })).toHaveValue("Justificativa salva");
    await user.click(justificationBar);
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Justificativa (opcional)" })).not.toBeInTheDocument());
  });

  it("reserva o feedback compacto junto ao status sem deslocar o cabeçalho", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        decisionFeedbacks={{ "1": { message: "✓ Decisão salva", type: "success" } }}
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", { review_status: "confirmed" })]}
        isGeneralReviewDay={false}
      />,
    );

    const feedback = screen.getByLabelText("✓ Decisão salva");
    expect(feedback).toHaveTextContent("✓ Salvo");
    expect(feedback).toHaveAttribute("role", "status");
    expect(feedback.closest('[data-slot="card-header"]')).toBeTruthy();
    // A mensagem completa não é repetida no corpo do cartão.
    expect(screen.queryByText("✓ Decisão salva")).not.toBeInTheDocument();
  });

  it("não desfaz a decisão ao clicar no toggle já pressionado", async () => {
    const onReview = vi.fn().mockResolvedValue(true);
    render(
      <DiagnosisPanelHarness
        {...createProps({ onReview, options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", { review_status: "confirmed" })]}
        isGeneralReviewDay={false}
      />,
    );

    const agree = screen.getByRole("button", { name: "Concordo" });
    expect(agree).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(agree);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(onReview).not.toHaveBeenCalled();
    expect(agree).toHaveAttribute("aria-pressed", "true");
  });

  it("bloqueia a troca de decisão enquanto a justificativa do diário está suja", () => {
    const onReview = vi.fn().mockResolvedValue(true);
    const onReviewInteractionBlocked = vi.fn();
    render(
      <DiagnosisPanelHarness
        {...createProps({ onReview, onReviewInteractionBlocked, options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", { review_status: "rejected" })]}
        isGeneralReviewDay={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Justificativa (opcional)" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Justificativa (opcional)" }), { target: { value: "Rascunho" } });
    fireEvent.click(screen.getByRole("button", { name: "Concordo" }));

    expect(onReviewInteractionBlocked).toHaveBeenCalledWith(1);
    expect(onReview).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toHaveValue("Rascunho");
  });

  it("mantém o editor aberto quando a revisão falha", async () => {
    const onReview = vi.fn().mockResolvedValue(false);
    render(
      <DiagnosisPanelHarness
        {...createProps({ onReview, options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", { review_status: "rejected" })]}
        isGeneralReviewDay={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Justificativa (opcional)" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Justificativa (opcional)" }), { target: { value: "Falhou" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar justificativa" }));

    await waitFor(() => expect(onReview).toHaveBeenCalledWith(1, "rejected", "Falhou", "justification"));
    expect(screen.getByRole("textbox")).toHaveValue("Falhou");
    // A alteração continua pendente: o par de botões segue à vista para tentar de novo.
    expect(screen.getByRole("button", { name: "Salvar justificativa" })).toBeVisible();
  });

  it("anuncia o erro de salvamento uma única vez e mostra o resumo no cabeçalho", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        decisionFeedbacks={{ "1": { message: "Não foi possível salvar a decisão. Tente novamente.", type: "error" } }}
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal")]}
        isGeneralReviewDay={false}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível salvar a decisão. Tente novamente.");
    const summary = screen.getByText("Falha ao salvar");
    expect(summary).toHaveAttribute("aria-hidden", "true");
    expect(summary.closest('[data-slot="card-header"]')).toBeTruthy();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("expõe a justificativa salva e o editor como grupos, não como alertas", async () => {
    const user = userEvent.setup();
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal", { review_status: "rejected", review_notes: "Nota" })]}
        isGeneralReviewDay={false}
      />,
    );

    expect(screen.getByRole("group", { name: "Justificativa" })).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Justificativa" }));
    const group = screen.getByRole("group", { name: "Justificativa" });
    expect(within(group).getByRole("textbox")).toHaveValue("Nota");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mostra o texto original também no adicionado pelo médico, sob o título e antes de Remover diagnóstico", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          { ...originalDiagnosis(7, "Fibrilação atrial"), source: "doctor_added" },
        ]}
        isGeneralReviewDay={false}
      />,
    );

    // Fechado: só o cartão do dia tem a linha.
    expect(screen.getAllByText("Original:")).toHaveLength(1);

    const trigger = screen.getByRole("button", { name: /Fibrilação atrial/ });
    fireEvent.click(trigger);

    const originalLabels = screen.getAllByText("Original:");
    expect(originalLabels).toHaveLength(2);
    const original = originalLabels[1].parentElement;
    expect(original).toHaveTextContent("Original: Fibrilação atrial");
    expect(original.closest('[data-slot="diagnosis-item-bar"]')).not.toBeNull();
    expect(original.closest('[data-slot="accordion-trigger"]')).toBeNull();
    expect(trigger).not.toHaveAccessibleName(/Original/);
    // Ordem: título → Original → Remover diagnóstico (a única ação do adicionado, na mesma barra).
    const removeButton = screen.getByRole("button", { name: "Remover diagnóstico" });
    expect(trigger.compareDocumentPosition(original)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(original.compareDocumentPosition(removeButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("mostra o texto original do adicional aberto sob o título, antes das decisões, mesmo quando igual a ele", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[originalDiagnosis(1, "Ritmo sinusal"), originalDiagnosis(2, "Bloqueio de ramo direito")]}
        isGeneralReviewDay={false}
      />,
    );

    // Fechado: só o cartão do dia tem a linha (nada de texto extra na lista).
    expect(screen.getAllByText("Original:")).toHaveLength(1);

    const trigger = screen.getByRole("button", { name: /Bloqueio de ramo direito/ });
    fireEvent.click(trigger);

    const originalLabels = screen.getAllByText("Original:");
    expect(originalLabels).toHaveLength(2);
    const original = originalLabels[1].parentElement;
    expect(original).toHaveTextContent("Original: Bloqueio de ramo direito");
    expect(original).toBeVisible();
    // Na barra fixa (rola junto com o título), mas fora do gatilho: o nome acessível do item não muda.
    expect(original.closest('[data-slot="diagnosis-item-bar"]')).not.toBeNull();
    expect(original.closest('[data-slot="accordion-trigger"]')).toBeNull();
    expect(trigger).not.toHaveAccessibleName(/Original/);
    // Título aberto aparece inteiro: sem tooltip nativo (`title`) repetindo o texto por cima da linha Original.
    expect(within(trigger).getByText("Bloqueio de ramo direito")).not.toHaveAttribute("title");
    // Ordem: título → Original → Concordo | Discordo.
    const decisions = screen.getByRole("group", { name: "Revisão de Bloqueio de ramo direito" });
    expect(trigger.compareDocumentPosition(original)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(original.compareDocumentPosition(decisions)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("mostra o texto original do adicional quando ele difere do título só na caixa", () => {
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          originalDiagnosis(2, "Sobrecarga ventricular esquerda", { original_text: "SOBRECARGA VENTRICULAR ESQUERDA" }),
        ]}
        isGeneralReviewDay={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Sobrecarga ventricular esquerda/ }));
    const original = screen.getByText("SOBRECARGA VENTRICULAR ESQUERDA");
    expect(original.parentElement).toHaveTextContent("Original: SOBRECARGA VENTRICULAR ESQUERDA");
    expect(original.closest("button")).toBeNull();
  });

  it("exibe o texto original longo por completo na barra fixa do adicional", () => {
    const longText = "ALTERAÇÃO DA REPOLARIZAÇÃO VENTRICULAR EM PAREDE ANTERIOR, PRINCIPALMENTE EM V4 E V5, COM ONDA T INVERTIDA";
    render(
      <DiagnosisPanelHarness
        {...createProps({ options: [] })}
        dailyStandardDiagnosis="Ritmo sinusal"
        diagnoses={[
          originalDiagnosis(1, "Ritmo sinusal"),
          originalDiagnosis(2, "Onda T invertida parede inferior", { is_grouped: true, original_text: longText }),
        ]}
        isGeneralReviewDay={false}
      />,
    );

    const trigger = screen.getByRole("button", { name: /Onda T invertida parede inferior/ });
    fireEvent.click(trigger);
    // O laudo diz "parede ANTERIOR" sob um título "parede inferior": a divergência precisa estar visível, não atrás de um corte.
    const original = screen.getByText(longText);
    expect(original).toBeVisible();
    expect(original.parentElement).toHaveTextContent(`Original: ${longText}`);
    expect(original.parentElement).not.toHaveTextContent("…");
    expect(original.closest("button")).toBeNull();
    expect(original.closest('[data-slot="diagnosis-item-bar"]')).not.toBeNull();
    expect(original.closest('[data-slot="accordion-trigger"]')).toBeNull();
    expect(trigger).not.toHaveAccessibleName(/Original/);
  });
});
