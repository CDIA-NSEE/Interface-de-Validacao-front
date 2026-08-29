import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import ExamReviewPage from "../src/pages/ExamReviewPage.jsx";
import {
  addDiagnosisRegion,
  getDiagnosisOptions,
  getExamById,
  saveExamDraft,
} from "../src/services/examsService.js";
import {
  getValidationContext,
  reviewDailyDiagnosis,
} from "../src/services/validationService.js";

const navigate = vi.fn();
const logout = vi.fn();

beforeAll(() => {
  Object.defineProperty(Element.prototype, "getAnimations", {
    configurable: true,
    value: () => [],
  });
});

afterAll(() => {
  delete Element.prototype.getAnimations;
});

afterEach(() => {
  vi.useRealTimers();
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ id: "42" }),
  };
});

vi.mock("../src/context/AuthContext.jsx", () => ({
  useAuth: () => ({ logout, user: { full_name: "Dra. Ana", role: "doctor" } }),
}));

vi.mock("../src/context/ThemeContext.jsx", () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }),
}));

vi.mock("../src/services/examsService.js", () => ({
  addDiagnosis: vi.fn(),
  addDiagnosisRegion: vi.fn(),
  getDiagnosisOptions: vi.fn(),
  getExamById: vi.fn(),
  removeDiagnosis: vi.fn(),
  removeDiagnosisRegion: vi.fn(),
  saveExamDraft: vi.fn(),
  updateDiagnosisRegion: vi.fn(),
  updateExamStatus: vi.fn(),
  validateExam: vi.fn(),
}));

vi.mock("../src/services/validationService.js", () => ({
  getNextValidationExam: vi.fn(),
  getValidationContext: vi.fn(),
  reviewDailyDiagnosis: vi.fn(),
}));

vi.mock("../src/services/supportService.js", () => ({
  getSupportContact: vi.fn(),
}));

function stubViewport(initialCompact) {
  let isCompact = initialCompact;
  const listeners = new Set();
  const mediaQuery = {
    get matches() {
      return isCompact;
    },
    addEventListener: (_event, listener) => listeners.add(listener),
    removeEventListener: (_event, listener) => listeners.delete(listener),
  };
  window.matchMedia = vi.fn().mockImplementation(() => mediaQuery);

  return {
    setCompact(nextCompact) {
      isCompact = nextCompact;
      listeners.forEach((listener) => listener({ matches: isCompact }));
    },
  };
}

const exam = {
  diagnoses: [
    {
      id: 1,
      name: "Ritmo sinusal",
      original_text: "Ritmo sinusal",
      regions: [],
      review_status: "pending",
      source: "original",
      standard_text: "Ritmo sinusal",
    },
  ],
  draft_notes: "",
  exam_code: "ECG-42",
  exam_date: "2026-08-26",
  exam_time: "08:30",
  exam_type: "ECG 12 derivações",
  image_url: "/sample-ecg.svg",
  patient: { age: 58, sex: "Feminino" },
  queue_state: "start",
  status_validation: "em_validacao",
};

beforeEach(() => {
  navigate.mockReset();
  logout.mockReset();
  vi.stubGlobal("ResizeObserver", class ResizeObserver {
    observe() {}
    disconnect() {}
  });
  getExamById.mockResolvedValue(exam);
  getDiagnosisOptions.mockResolvedValue(["Fibrilação atrial"]);
  getValidationContext.mockResolvedValue({
    active_standard_diagnosis: "Ritmo sinusal",
    is_configured: true,
    is_general_review_day: false,
  });
  addDiagnosisRegion.mockResolvedValue({
    ...exam.diagnoses[0],
    region_required_missing: false,
    regions: [{ id: 7, x: 10, y: 10, width: 30, height: 20 }],
  });
  saveExamDraft.mockResolvedValue(exam);
});

describe("ExamReviewPage", () => {
  it("mantém a revisão compacta e o ECG lado a lado no desktop", async () => {
    stubViewport(false);
    const { container } = render(<ExamReviewPage />);

    expect(await screen.findByRole("heading", { name: "Exame ECG-42" })).toBeVisible();
    expect(screen.getByRole("complementary", { name: "Diagnósticos e ações" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Visualizador de ECG" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Diagnóstico do dia" })).toBeVisible();
    expect(container.querySelector("header dl")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mais informações" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("textbox", { name: "Observações gerais" })).toBeVisible();
    const ecgToolbar = screen.getByRole("toolbar", { name: "Controles do ECG" });
    expect(screen.getByTestId("general-observations-header")).toContainElement(ecgToolbar);
    expect(ecgToolbar).not.toHaveTextContent("Controles do ECG");
    expect(screen.queryByTestId("ecg-controls-dock")).not.toBeInTheDocument();
    expect(screen.getByTestId("current-status")).toHaveClass("flex-row");
    expect(screen.getByText("Iniciar")).toBeVisible();
  });

  it("expande e recolhe a navegação somente após a intenção de hover", async () => {
    stubViewport(false);
    render(<ExamReviewPage />);

    const agreeButton = await screen.findByRole("button", { name: "Concordo" });
    agreeButton.focus();
    const collapsedNavigation = screen.getByRole("navigation", { name: "Navegação recolhida" });
    expect(collapsedNavigation).toBeVisible();
    const collapsedBrand = collapsedNavigation.querySelector('[data-navigation-item="brand"]');
    expect(collapsedBrand).toHaveAttribute("aria-hidden", "true");
    expect(collapsedBrand.tagName).toBe("DIV");
    expect(screen.queryByRole("button", { name: "Expandir navegação" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Validação médica" })).not.toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(
      [...collapsedNavigation.querySelectorAll("[data-navigation-item]")].map(
        (item) => item.dataset.navigationItem,
      ),
    ).toEqual(["brand", "home", "tutorial", "support", "theme", "account", "logout"]);

    vi.useFakeTimers();
    fireEvent.pointerEnter(collapsedNavigation);
    expect(screen.queryByRole("dialog", { name: "Validação médica" })).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="sheet-overlay"]')).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(100));
    fireEvent.pointerLeave(collapsedNavigation);
    act(() => vi.advanceTimersByTime(100));
    expect(screen.queryByRole("dialog", { name: "Validação médica" })).not.toBeInTheDocument();

    fireEvent.pointerEnter(collapsedNavigation);
    act(() => vi.advanceTimersByTime(199));
    expect(screen.queryByRole("dialog", { name: "Validação médica" })).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));

    const expandedNavigation = screen.getByRole("dialog", {
      name: "Validação médica",
    });
    expect(expandedNavigation).toBeVisible();
    expect(
      [...expandedNavigation.querySelectorAll("[data-navigation-item]")].map(
        (item) => item.dataset.navigationItem,
      ),
    ).toEqual(["brand", "home", "tutorial", "support", "theme", "account", "logout"]);
    const expandedBrand = expandedNavigation.querySelector('[data-navigation-item="brand"]');
    expect(expandedBrand).toHaveAttribute("aria-hidden", "true");
    expect(expandedBrand.tagName).toBe("DIV");
    expect(screen.queryByRole("button", { name: "Recolher navegação" })).not.toBeInTheDocument();
    expect(screen.getByText("Início")).toBeVisible();
    expect(screen.getByText("Tutorial rápido")).toBeVisible();
    expect(screen.getByText("Central de ajuda / Contato")).toBeVisible();
    expect(screen.getByText("Modo escuro")).toBeVisible();
    expect(screen.getByText("Dra. Ana")).toBeVisible();
    expect(screen.getByText("Médico avaliador")).toBeVisible();
    expect(screen.queryByText("Navegação da validação")).not.toBeInTheDocument();
    expect(screen.queryByText("Navegação")).not.toBeInTheDocument();
    expect(screen.queryByText("Ajuda e suporte")).not.toBeInTheDocument();
    expect(screen.queryByText("Aparência")).not.toBeInTheDocument();
    expect(screen.queryByText("Conta")).not.toBeInTheDocument();
    expect(screen.queryByText("Voltar para a tela inicial")).not.toBeInTheDocument();
    expect(screen.queryByText("Guia rápido de utilização")).not.toBeInTheDocument();
    expect(screen.queryByText("Fale com o suporte")).not.toBeInTheDocument();
    expect(screen.queryByText("Tema claro ativo")).not.toBeInTheDocument();
    expect(screen.queryByText("Tema escuro ativo")).not.toBeInTheDocument();
    expect(
      screen.queryByText("A validação fica pausada enquanto este painel estiver aberto."),
    ).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeInTheDocument();

    fireEvent.pointerEnter(expandedNavigation);
    act(() => vi.advanceTimersByTime(300));
    expect(expandedNavigation).toBeVisible();

    fireEvent.pointerLeave(expandedNavigation);
    act(() => vi.advanceTimersByTime(299));
    expect(expandedNavigation).toBeVisible();

    fireEvent.pointerEnter(expandedNavigation);
    act(() => vi.advanceTimersByTime(1));
    expect(expandedNavigation).toBeVisible();

    fireEvent.pointerLeave(expandedNavigation);
    act(() => vi.advanceTimersByTime(300));
    expect(expandedNavigation).toHaveAttribute("data-closed");
    expect(expandedNavigation).not.toHaveAttribute("data-open");
    act(() => vi.advanceTimersByTime(0));
    expect(agreeButton).toHaveFocus();
  });

  it("mantém expansão por teclado e fecha com Escape", async () => {
    const user = userEvent.setup();
    stubViewport(false);
    render(<ExamReviewPage />);

    const agreeButton = await screen.findByRole("button", { name: "Concordo" });
    agreeButton.focus();
    screen.getByRole("button", { name: "Início" }).focus();
    expect(await screen.findByRole("dialog", { name: "Validação médica" })).toBeVisible();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Validação médica" })).not.toBeInTheDocument();
    });
    expect(agreeButton).toHaveFocus();
  });

  it("bloqueia uma ação clínica enquanto a navegação lateral está aberta", async () => {
    stubViewport(false);
    render(<ExamReviewPage />);

    const agreeButton = await screen.findByRole("button", { name: "Concordo" });
    vi.useFakeTimers();
    fireEvent.pointerEnter(screen.getByRole("navigation", { name: "Navegação recolhida" }));
    act(() => vi.advanceTimersByTime(200));
    screen.getByRole("dialog", { name: "Validação médica" });

    fireEvent.click(agreeButton);

    expect(reviewDailyDiagnosis).not.toHaveBeenCalled();
  });

  it("mantém os dados clínicos visíveis e recolhe apenas metadados e laudo", async () => {
    const user = userEvent.setup();
    getExamById.mockResolvedValue({
      ...exam,
      comments: "Ritmo regular no laudo original.",
      patient: {
        age: 58,
        birth_date: "17/05/1968",
        bmi: "24,2",
        height: 1.65,
        sex: "Feminino",
        weight: 66,
      },
      source_notes: "Traçado recebido sem intercorrências.",
    });
    stubViewport(false);
    render(<ExamReviewPage />);

    const trigger = await screen.findByRole("button", { name: "Mais informações" });
    expect(screen.getByRole("heading", { name: "Dados clínicos" })).toBeVisible();
    expect(screen.getByText("Nascimento")).toBeVisible();
    expect(screen.getByText("17/05/1968")).toBeVisible();
    expect(screen.getByText("58 anos")).toBeVisible();
    expect(screen.getByText("Feminino")).toBeVisible();
    expect(screen.getByText("66 kg")).toBeVisible();
    expect(screen.getByText("1.65 m")).toBeVisible();
    expect(screen.getByText("24,2")).toBeVisible();
    expect(screen.queryByText("Data e hora")).not.toBeInTheDocument();
    expect(screen.queryByText("ECG 12 derivações")).not.toBeInTheDocument();
    expect(screen.queryByText("Ritmo regular no laudo original.")).not.toBeInTheDocument();
    expect(screen.queryByText("Traçado recebido sem intercorrências.")).not.toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByText("Data e hora")).toBeVisible();
    expect(screen.getByText("26/08/2026 as 08:30")).toBeVisible();
    expect(screen.getByText("ECG 12 derivações")).toBeVisible();
    expect(screen.getByText("Ritmo regular no laudo original.")).toBeVisible();
    expect(screen.getByText("Traçado recebido sem intercorrências.")).toBeVisible();
  });

  it("encaminha o modo IA do contexto para o diagnóstico com concordância", async () => {
    getExamById.mockResolvedValue({
      ...exam,
      diagnoses: [{ ...exam.diagnoses[0], ai_suggested: true }],
    });
    getValidationContext.mockResolvedValue({
      active_standard_diagnosis: "Ritmo sinusal",
      ai_mode_enabled: true,
      is_configured: true,
      is_general_review_day: false,
    });
    stubViewport(false);

    render(<ExamReviewPage />);

    expect(await screen.findByText("IA concordou")).toBeVisible();
  });

  it("oculta a concordância quando o backend antigo não informa o modo IA", async () => {
    getExamById.mockResolvedValue({
      ...exam,
      diagnoses: [{ ...exam.diagnoses[0], ai_suggested: true }],
    });
    getValidationContext.mockResolvedValue({
      active_standard_diagnosis: "Ritmo sinusal",
      is_configured: true,
      is_general_review_day: false,
    });
    stubViewport(false);

    render(<ExamReviewPage />);

    expect(await screen.findByRole("region", { name: "Diagnóstico do dia" })).toBeVisible();
    expect(screen.queryByText("IA concordou")).not.toBeInTheDocument();
  });

  it("usa uma única composição de revisão dentro do Sheet abaixo de 768px", async () => {
    const user = userEvent.setup();
    getExamById.mockResolvedValue({
      ...exam,
      diagnoses: [{ ...exam.diagnoses[0], ai_suggested: true }],
    });
    getValidationContext.mockResolvedValue({
      active_standard_diagnosis: "Ritmo sinusal",
      ai_mode_enabled: true,
      is_configured: true,
      is_general_review_day: false,
    });
    stubViewport(true);
    render(<ExamReviewPage />);

    await screen.findByRole("heading", { name: "Exame ECG-42" });
    expect(screen.queryByRole("complementary", { name: "Diagnósticos e ações" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Diagnóstico do dia" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Diagnósticos e ações" }));

    expect(await screen.findByRole("dialog", { name: "Diagnósticos e ações" })).toBeVisible();
    expect(screen.getAllByRole("region", { name: "Diagnóstico do dia" })).toHaveLength(1);
    expect(screen.getByText("IA concordou")).toBeVisible();
    expect(screen.getByRole("button", { name: "Salvar e próximo" })).toBeVisible();
  });

  it("fecha o Sheet ao iniciar a marcação de uma área no ECG", async () => {
    const user = userEvent.setup();
    stubViewport(true);
    render(<ExamReviewPage />);

    await screen.findByRole("heading", { name: "Exame ECG-42" });
    await user.click(screen.getByRole("button", { name: "Diagnósticos e ações" }));
    await user.click(await screen.findByRole("button", { name: "Marcar área" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Diagnósticos e ações" }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Marcando D1\.1: Ritmo sinusal/)).toBeVisible();
  });

  it("reabre o Sheet ao cancelar a marcação no layout compacto", async () => {
    const user = userEvent.setup();
    stubViewport(true);
    render(<ExamReviewPage />);

    await screen.findByRole("heading", { name: "Exame ECG-42" });
    await user.click(screen.getByRole("button", { name: "Diagnósticos e ações" }));
    await user.click(await screen.findByRole("button", { name: "Marcar área" }));
    await user.click(screen.getByRole("button", { name: "Limpar seleção" }));

    expect(await screen.findByRole("dialog", { name: "Diagnósticos e ações" })).toBeVisible();
  });

  it("reabre o Sheet depois de salvar uma região no layout compacto", async () => {
    const user = userEvent.setup();
    stubViewport(true);
    const { container } = render(<ExamReviewPage />);

    await screen.findByRole("heading", { name: "Exame ECG-42" });
    await user.click(screen.getByRole("button", { name: "Diagnósticos e ações" }));
    await user.click(await screen.findByRole("button", { name: "Marcar área" }));

    const stage = container.querySelector(".ecg-image-stage");
    stage.setPointerCapture = vi.fn();
    vi.spyOn(stage, "getBoundingClientRect").mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    fireEvent.pointerDown(stage, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(stage, { button: 0, clientX: 40, clientY: 30, pointerId: 1 });

    await waitFor(() => expect(addDiagnosisRegion).toHaveBeenCalledOnce());
    expect(await screen.findByRole("dialog", { name: "Diagnósticos e ações" })).toBeVisible();
  });

  it("reabre o Sheet e exibe o erro quando uma região não pode ser salva", async () => {
    const user = userEvent.setup();
    addDiagnosisRegion.mockRejectedValueOnce({ response: { data: { detail: "Falha ao salvar área." } } });
    stubViewport(true);
    const { container } = render(<ExamReviewPage />);

    await screen.findByRole("heading", { name: "Exame ECG-42" });
    await user.click(screen.getByRole("button", { name: "Diagnósticos e ações" }));
    await user.click(await screen.findByRole("button", { name: "Marcar área" }));

    const stage = container.querySelector(".ecg-image-stage");
    stage.setPointerCapture = vi.fn();
    vi.spyOn(stage, "getBoundingClientRect").mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    fireEvent.pointerDown(stage, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(stage, { button: 0, clientX: 40, clientY: 30, pointerId: 1 });

    expect(await screen.findByRole("dialog", { name: "Diagnósticos e ações" })).toBeVisible();
    expect(await screen.findByText("Falha ao salvar área.")).toBeVisible();
  });

  it("preserva o rascunho de discordância ao alternar entre desktop e Sheet", async () => {
    const user = userEvent.setup();
    const viewport = stubViewport(false);
    render(<ExamReviewPage />);

    await screen.findByRole("heading", { name: "Exame ECG-42" });
    await user.click(screen.getByRole("button", { name: "Discordo" }));
    await user.type(screen.getByLabelText(/Motivo/), "Traçado incompatível");

    act(() => viewport.setCompact(true));
    await user.click(screen.getByRole("button", { name: "Diagnósticos e ações" }));

    expect(await screen.findByLabelText(/Motivo/)).toHaveValue("Traçado incompatível");
  });

  it("preserva o payload do salvamento do rascunho", async () => {
    stubViewport(false);
    render(<ExamReviewPage />);

    const notes = await screen.findByRole("textbox", { name: "Observações gerais" });
    fireEvent.change(notes, { target: { value: "Reavaliar intervalo PR" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(saveExamDraft).toHaveBeenCalledWith("42", { notes: "Reavaliar intervalo PR" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Alterações salvas.");
  });
});
