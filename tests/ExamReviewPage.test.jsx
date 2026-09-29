import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import ExamReviewPage from "../src/pages/ExamReviewPage.jsx";
import {
  addDiagnosisRegion,
  getDiagnosisOptions,
  getExamById,
  getExamImage,
  removeDiagnosisRegion,
  saveExamDraft,
} from "../src/services/examsService.js";
import {
  getValidationContext,
  reviewDailyDiagnosis,
} from "../src/services/validationService.js";

const navigate = vi.fn();
const logout = vi.fn();
const theme = vi.hoisted(() => ({ isDark: false }));

beforeAll(() => {
  Object.defineProperty(Element.prototype, "getAnimations", {
    configurable: true,
    value: () => [],
  });
  // jsdom não implementa object URLs; a página libera a do traçado ao trocar de exame e ao desmontar.
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

afterAll(() => {
  delete Element.prototype.getAnimations;
  delete URL.revokeObjectURL;
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
  useTheme: () => ({ isDark: theme.isDark, toggleTheme: vi.fn() }),
}));

vi.mock("../src/services/examsService.js", () => ({
  addDiagnosis: vi.fn(),
  addDiagnosisRegion: vi.fn(),
  getDiagnosisOptions: vi.fn(),
  getExamById: vi.fn(),
  getExamImage: vi.fn(),
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
  theme.isDark = false;
  vi.stubGlobal("ResizeObserver", class ResizeObserver {
    observe() {}
    disconnect() {}
  });
  getExamById.mockResolvedValue(exam);
  getExamImage.mockReset();
  getExamImage.mockResolvedValue("blob:ecg-42");
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
  reviewDailyDiagnosis.mockResolvedValue({
    ...exam,
    diagnoses: [{ ...exam.diagnoses[0], review_status: "confirmed" }],
  });
});

describe("ExamReviewPage", () => {
  it("mantém a revisão compacta e o ECG lado a lado no desktop", async () => {
    stubViewport(false);
    const { container } = render(<ExamReviewPage />);

    expect(await screen.findByRole("heading", { name: "Exame ECG-42" })).toBeVisible();
    const reviewLayout = container.querySelector("main");
    expect(reviewLayout).toHaveStyle({ "--review-sidebar-width": "30%" });
    expect(reviewLayout).toHaveClass(
      "md:grid-cols-[max(30%,var(--review-sidebar-width))_minmax(0,1fr)]",
    );
    expect(screen.getByRole("complementary", { name: "Diagnósticos e ações" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Visualizador de ECG" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Diagnóstico do dia" })).toBeVisible();
    expect(container.querySelector("header dl")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dados do exame" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Notas do laudo")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Observações gerais (opcional)" })).toBeVisible();
    const ecgToolbar = screen.getByRole("toolbar", { name: "Controles do ECG" });
    expect(screen.getByRole("region", { name: "Visualizador do traçado de ECG" })).toContainElement(ecgToolbar);
    expect(screen.getByTestId("general-observations-header")).not.toContainElement(ecgToolbar);
    expect(ecgToolbar).not.toHaveTextContent("Controles do ECG");
    expect(screen.queryByTestId("ecg-controls-dock")).not.toBeInTheDocument();
    expect(screen.getByTestId("current-status")).toHaveClass("flex-row");
    expect(screen.getByTestId("current-status")).toHaveTextContent("Exame ECG-42");
    expect(screen.getByTestId("current-status")).toHaveTextContent("Status atual:");
    expect(screen.getByText("Iniciar")).toBeVisible();
    expect(screen.getByRole("button", { name: "Salvar observações" })).toBeDisabled();
  });

  it("mede o painel quando o layout surge depois do carregamento", async () => {
    const observe = vi.fn();
    vi.stubGlobal("ResizeObserver", class ResizeObserver {
      observe = observe;
      disconnect() {}
    });
    const widthSpy = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1856);
    const heightSpy = vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(1080);
    stubViewport(false);

    const { container } = render(<ExamReviewPage />);
    await screen.findByRole("heading", { name: "Exame ECG-42" });

    const reviewLayout = container.querySelector("main");
    await waitFor(() => expect(reviewLayout).toHaveStyle({ "--review-sidebar-width": "557px" }));
    expect(observe).toHaveBeenCalledWith(reviewLayout);

    widthSpy.mockRestore();
    heightSpy.mockRestore();
  });

  it("explica por que Salvar e próximo está desabilitado", async () => {
    stubViewport(false);
    render(<ExamReviewPage />);

    const primaryButton = await screen.findByRole("button", { name: "Salvar e próximo" });
    expect(primaryButton).toBeDisabled();

    const tooltipTrigger = primaryButton.parentElement;
    expect(tooltipTrigger).toHaveAttribute(
      "aria-label",
      "Salvar e próximo indisponível: Defina Concordo ou Discordo para continuar.",
    );

    fireEvent.focus(tooltipTrigger);
    await waitFor(() => {
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent(
        "Defina Concordo ou Discordo para continuar.",
      );
    });
  });

  it("abre o exame só com o traçado real, baixado junto com os dados", async () => {
    stubViewport(false);
    let resolveImage;
    getExamImage.mockReturnValue(new Promise((resolve) => { resolveImage = resolve; }));
    const { container } = render(<ExamReviewPage />);

    expect(getExamImage).toHaveBeenCalledWith("42", { signal: expect.any(AbortSignal) });
    await waitFor(() => expect(getExamById).toHaveBeenCalledWith("42"));
    await act(async () => {});
    expect(screen.getByText("Abrindo exame...")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Exame ECG-42" })).not.toBeInTheDocument();

    await act(async () => resolveImage("blob:ecg-42"));

    expect(await screen.findByRole("heading", { name: "Exame ECG-42" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Traçado do ECG" })).toHaveAttribute("src", "blob:ecg-42");
    expect(container.querySelector('img[src*="sample-ecg"]')).not.toBeInTheDocument();
  });

  it("mostra a falha no lugar do traçado, sem ECG de exemplo, e tenta de novo", async () => {
    stubViewport(false);
    const user = userEvent.setup();
    getExamImage
      .mockRejectedValueOnce(new Error("timeout of 60000ms exceeded"))
      .mockResolvedValueOnce("blob:ecg-42");
    const { container } = render(<ExamReviewPage />);

    expect(await screen.findByText("Não foi possível carregar o traçado do ECG.")).toBeVisible();
    expect(screen.getByText("As decisões ficam bloqueadas até o traçado aparecer.")).toBeVisible();
    expect(screen.queryByRole("img", { name: "Traçado do ECG" })).not.toBeInTheDocument();
    expect(container.querySelector('img[src*="sample-ecg"]')).not.toBeInTheDocument();
    expect(screen.queryByRole("toolbar", { name: "Controles do ECG" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByRole("img", { name: "Traçado do ECG" })).toHaveAttribute("src", "blob:ecg-42");
    expect(screen.queryByText("Não foi possível carregar o traçado do ECG.")).not.toBeInTheDocument();
    expect(getExamImage).toHaveBeenCalledTimes(2);
  });

  it("trava as decisões enquanto o traçado não está na tela", async () => {
    stubViewport(false);
    const user = userEvent.setup();
    getExamImage
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce("blob:ecg-42");
    render(<ExamReviewPage />);

    await screen.findByText("Não foi possível carregar o traçado do ECG.");
    // Travado aparece desabilitado (o "ocupado" curto mantém a aparência plena).
    expect(screen.getByRole("button", { name: "Concordo" }).closest("[data-decisions-locked]")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Concordo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Discordo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Marcar área" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Adicionar diagnóstico" })).toBeDisabled();
    const primaryButton = screen.getByRole("button", { name: "Salvar e próximo" });
    expect(primaryButton).toBeDisabled();
    expect(primaryButton.parentElement).toHaveAttribute(
      "aria-label",
      "Salvar e próximo indisponível: Carregue o traçado do ECG para continuar.",
    );
    // Observações são rascunho, não decisão: continuam livres.
    expect(screen.getByRole("textbox", { name: "Observações gerais (opcional)" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    await screen.findByRole("img", { name: "Traçado do ECG" });
    expect(screen.getByRole("button", { name: "Concordo" }).closest("[data-decisions-locked]")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Concordo" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Marcar área" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Adicionar diagnóstico" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Salvar e próximo" }).parentElement).toHaveAttribute(
      "aria-label",
      "Salvar e próximo indisponível: Defina Concordo ou Discordo para continuar.",
    );
  });

  it("avisa quando o exame não tem imagem do ECG", async () => {
    stubViewport(false);
    getExamImage.mockRejectedValueOnce({ response: { status: 404 } });
    render(<ExamReviewPage />);

    expect(await screen.findByText("Imagem do ECG não encontrada.")).toBeVisible();
    expect(screen.queryByRole("img", { name: "Traçado do ECG" })).not.toBeInTheDocument();
  });

  it("explica quando falta uma região obrigatória", async () => {
    stubViewport(false);
    getExamById.mockResolvedValue({
      ...exam,
      diagnoses: [{
        ...exam.diagnoses[0],
        region_required_missing: true,
        review_status: "confirmed",
      }],
    });
    render(<ExamReviewPage />);

    const primaryButton = await screen.findByRole("button", { name: "Salvar e próximo" });
    expect(primaryButton).toBeDisabled();

    const tooltipTrigger = primaryButton.parentElement;
    fireEvent.focus(tooltipTrigger);
    await waitFor(() => {
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent(
        "Marque a área obrigatória no ECG para continuar.",
      );
    });
  });

  it("não adiciona tooltip quando Salvar e próximo está habilitado", async () => {
    stubViewport(false);
    getExamById.mockResolvedValue({
      ...exam,
      diagnoses: [{ ...exam.diagnoses[0], review_status: "confirmed" }],
    });
    render(<ExamReviewPage />);

    const primaryButton = await screen.findByRole("button", { name: "Salvar e próximo" });
    expect(primaryButton).toBeEnabled();
    expect(primaryButton.closest('[data-slot="tooltip-trigger"]')).toBeNull();
  });

  it("expande e recolhe a navegação somente após a intenção de hover", async () => {
    stubViewport(false);
    render(<ExamReviewPage />);

    const agreeButton = await screen.findByRole("button", { name: "Concordo" });
    agreeButton.focus();
    const collapsedNavigation = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(collapsedNavigation).toBeVisible();
    const collapsedBrand = collapsedNavigation.querySelector('[data-navigation-item="brand"]');
    expect(collapsedBrand).toHaveAttribute("aria-hidden", "true");
    expect(collapsedBrand.tagName).toBe("DIV");
    expect(screen.queryByRole("button", { name: "Expandir navegação" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Revisão de ECG" })).not.toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(
      [...collapsedNavigation.querySelectorAll("[data-navigation-item]")].map(
        (item) => item.dataset.navigationItem,
      ),
    ).toEqual(["brand", "home", "tutorial", "shortcuts", "support", "theme", "account", "logout"]);
    // Sem dica no trilho: o menu abre com os nomes, e a dica só piscava antes de ser coberta.
    expect(collapsedNavigation.querySelector('[data-slot="tooltip-trigger"]')).toBeNull();
    // "Dra." é título, não nome: as iniciais de "Dra. Ana" são "A".
    const collapsedAccount = collapsedNavigation.querySelector('[data-navigation-item="account"]');
    expect(collapsedAccount.querySelector('[aria-hidden="true"]')).toHaveTextContent(/^A$/);
    // A identidade não é controle: sem parada de Tab; no trilho, o nome fica para o leitor de tela.
    expect(collapsedAccount).not.toHaveAttribute("tabindex");
    expect(collapsedAccount).not.toHaveAttribute("role");
    expect(collapsedAccount).toHaveTextContent("Dra. Ana");

    vi.useFakeTimers();
    fireEvent.pointerEnter(collapsedNavigation, { clientX: 32, clientY: 300 });
    expect(screen.queryByRole("dialog", { name: "Revisão de ECG" })).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="sheet-overlay"]')).not.toBeInTheDocument();

    // Só passar pelo trilho a caminho do painel não abre o menu.
    act(() => vi.advanceTimersByTime(199));
    fireEvent.pointerLeave(collapsedNavigation);
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByRole("dialog", { name: "Revisão de ECG" })).not.toBeInTheDocument();

    // Andar pelo trilho recomeça a contagem; um tremor dentro da tolerância não.
    fireEvent.pointerEnter(collapsedNavigation, { clientX: 32, clientY: 300 });
    act(() => vi.advanceTimersByTime(150));
    fireEvent.pointerMove(collapsedNavigation, { clientX: 32, clientY: 360 });
    act(() => vi.advanceTimersByTime(150));
    expect(screen.queryByRole("dialog", { name: "Revisão de ECG" })).not.toBeInTheDocument();
    fireEvent.pointerMove(collapsedNavigation, { clientX: 34, clientY: 363 });
    act(() => vi.advanceTimersByTime(49));
    expect(screen.queryByRole("dialog", { name: "Revisão de ECG" })).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));

    const expandedNavigation = screen.getByRole("dialog", {
      name: "Revisão de ECG",
    });
    expect(expandedNavigation).toBeVisible();
    expect(
      [...expandedNavigation.querySelectorAll("[data-navigation-item]")].map(
        (item) => item.dataset.navigationItem,
      ),
    ).toEqual(["brand", "home", "tutorial", "shortcuts", "support", "theme", "account", "logout"]);
    const expandedBrand = expandedNavigation.querySelector('[data-navigation-item="brand"]');
    expect(expandedBrand).toHaveAttribute("aria-hidden", "true");
    expect(expandedBrand.tagName).toBe("DIV");
    expect(screen.queryByRole("button", { name: "Recolher navegação" })).not.toBeInTheDocument();
    expect(screen.getByText("Início")).toBeVisible();
    expect(screen.getByText("Tutorial rápido")).toBeVisible();
    expect(screen.getByText("Contato e suporte")).toBeVisible();
    expect(screen.queryByText("Central de ajuda / Contato")).not.toBeInTheDocument();
    expect(screen.getByText("Modo escuro")).toBeVisible();
    expect(screen.getByText("Dra. Ana", { selector: "p" })).toBeVisible();
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
    act(() => vi.advanceTimersByTime(400));
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

  it("fecha o menu que abriu no instante em que o ponteiro saía do trilho sem entrar nele", async () => {
    stubViewport(false);
    render(<ExamReviewPage />);

    await screen.findByRole("button", { name: "Concordo" });
    const collapsedNavigation = screen.getByRole("navigation", { name: "Navegação principal" });
    vi.useFakeTimers();
    fireEvent.pointerEnter(collapsedNavigation, { clientX: 20, clientY: 600 });
    act(() => vi.advanceTimersByTime(200));
    const expandedNavigation = screen.getByRole("dialog", { name: "Revisão de ECG" });

    // Saindo do trilho para dentro do menu: continua aberto.
    fireEvent.pointerLeave(collapsedNavigation, { relatedTarget: expandedNavigation });
    act(() => vi.advanceTimersByTime(300));
    expect(expandedNavigation).toHaveAttribute("data-open");

    // Saindo para o fundo sem ter entrado no menu: fecha como uma saída do menu.
    fireEvent.pointerLeave(collapsedNavigation, { relatedTarget: document.body });
    act(() => vi.advanceTimersByTime(299));
    expect(expandedNavigation).toHaveAttribute("data-open");
    act(() => vi.advanceTimersByTime(1));
    expect(expandedNavigation).toHaveAttribute("data-closed");
  });

  it.each([
    { isDark: false, label: "Modo escuro", accessibleName: "Ativar modo escuro", icon: "lucide-moon" },
    { isDark: true, label: "Modo claro", accessibleName: "Ativar modo claro", icon: "lucide-sun" },
  ])("mostra no item de tema o modo para onde o clique leva (escuro: $isDark)", async ({
    accessibleName,
    icon,
    isDark,
    label,
  }) => {
    theme.isDark = isDark;
    stubViewport(false);
    render(<ExamReviewPage />);

    await screen.findByRole("button", { name: "Concordo" });
    screen.getByRole("button", { name: accessibleName }).focus();
    const expandedNavigation = await screen.findByRole("dialog", { name: "Revisão de ECG" });
    const themeButton = expandedNavigation.querySelector('[data-navigation-item="theme"] button');

    // O estado atual já está na tela inteira: sem "Ligado"/"Desligado" e sem aria-pressed (o nome troca com o tema).
    expect(themeButton).toHaveAccessibleName(accessibleName);
    expect(themeButton).toHaveTextContent(new RegExp(`^${label}$`));
    expect(themeButton).not.toHaveAttribute("aria-pressed");
    expect(themeButton.querySelector("svg")).toHaveClass(icon);
  });

  it("abre pelo menu lateral a lista de atalhos de teclado", async () => {
    const user = userEvent.setup();
    stubViewport(false);
    render(<ExamReviewPage />);

    await screen.findByRole("button", { name: "Concordo" });
    screen.getByRole("button", { name: "Atalhos de teclado" }).focus();
    const expandedNavigation = await screen.findByRole("dialog", { name: "Revisão de ECG" });
    await user.click(expandedNavigation.querySelector('button[aria-label="Atalhos de teclado"]'));

    const shortcuts = await screen.findByRole("dialog", { name: "Atalhos de teclado" });
    expect(screen.getByRole("region", { name: "Traçado do ECG" })).toHaveTextContent("Aumentar zoom+");
    expect(screen.getByRole("region", { name: "Campos de texto" })).toHaveTextContent(
      "Salvar observações ou justificativaCtrl+Enter",
    );
    expect(shortcuts).toHaveTextContent("Ocultar ou mostrar marcaçõesV");
  });

  it("mantém expansão por teclado e fecha com Escape", async () => {
    const user = userEvent.setup();
    stubViewport(false);
    render(<ExamReviewPage />);

    const agreeButton = await screen.findByRole("button", { name: "Concordo" });
    agreeButton.focus();
    screen.getByRole("button", { name: "Início" }).focus();
    expect(await screen.findByRole("dialog", { name: "Revisão de ECG" })).toBeVisible();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Revisão de ECG" })).not.toBeInTheDocument();
    });
    expect(agreeButton).toHaveFocus();
  });

  it("abre a navegação pelo mouse com o foco no painel, sem destacar Início", async () => {
    stubViewport(false);
    render(<ExamReviewPage />);

    const agreeButton = await screen.findByRole("button", { name: "Concordo" });
    agreeButton.focus();
    fireEvent.pointerEnter(screen.getByRole("navigation", { name: "Navegação principal" }));

    const expandedNavigation = await screen.findByRole("dialog", { name: "Revisão de ECG" });
    await waitFor(() => expect(expandedNavigation).toHaveFocus());
    expect(expandedNavigation.querySelector('button[aria-label="Início"]')).not.toHaveFocus();
  });

  it("abre a navegação pelo teclado no item que recebeu o foco", async () => {
    stubViewport(false);
    render(<ExamReviewPage />);

    const agreeButton = await screen.findByRole("button", { name: "Concordo" });
    agreeButton.focus();
    screen.getByRole("button", { name: "Sair da sessão" }).focus();

    const expandedNavigation = await screen.findByRole("dialog", { name: "Revisão de ECG" });
    await waitFor(() => {
      expect(expandedNavigation.querySelector('button[aria-label="Sair da sessão"]')).toHaveFocus();
    });
  });

  it("sai do menu pelo Tab no último item e segue para a tela, como uma navegação comum", async () => {
    const user = userEvent.setup();
    stubViewport(false);
    render(<ExamReviewPage />);

    await screen.findByRole("button", { name: "Concordo" });
    screen.getByRole("button", { name: "Sair da sessão" }).focus();
    const expandedNavigation = await screen.findByRole("dialog", { name: "Revisão de ECG" });
    await waitFor(() => {
      expect(expandedNavigation.querySelector('button[aria-label="Sair da sessão"]')).toHaveFocus();
    });

    // Antes o Tab voltava para "Início" dentro do menu; agora fecha o menu e continua na página.
    await user.tab();

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Revisão de ECG" })).not.toBeInTheDocument();
    });
    await waitFor(() => expect(screen.getByRole("main")).toContainElement(document.activeElement));
  });

  it("sai do menu pelo Shift+Tab no primeiro item e volta ao começo da página", async () => {
    const user = userEvent.setup();
    stubViewport(false);
    render(<ExamReviewPage />);

    await screen.findByRole("button", { name: "Concordo" });
    screen.getByRole("button", { name: "Início" }).focus();
    const expandedNavigation = await screen.findByRole("dialog", { name: "Revisão de ECG" });
    await waitFor(() => expect(expandedNavigation.querySelector('button[aria-label="Início"]')).toHaveFocus());

    await user.tab({ shift: true });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Revisão de ECG" })).not.toBeInTheDocument();
    });
    expect(document.body).toHaveFocus();
  });

  it("pede confirmação antes de sair da sessão com alterações não salvas", async () => {
    const user = userEvent.setup();
    stubViewport(false);
    render(<ExamReviewPage />);

    const notes = await screen.findByRole("textbox", { name: "Observações gerais (opcional)" });
    fireEvent.change(notes, { target: { value: "Reavaliar intervalo PR" } });
    screen.getByRole("button", { name: "Sair da sessão" }).focus();
    const expandedNavigation = await screen.findByRole("dialog", { name: "Revisão de ECG" });
    await user.click(expandedNavigation.querySelector('button[aria-label="Sair da sessão"]'));

    expect(await screen.findByRole("alertdialog", { name: "Sair sem salvar?" })).toHaveTextContent(
      "descartar essas alterações e sair da sessão.",
    );
    expect(logout).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Descartar e sair" }));
    expect(logout).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("sai da sessão sem confirmação quando não há alterações não salvas", async () => {
    const user = userEvent.setup();
    stubViewport(false);
    render(<ExamReviewPage />);

    await screen.findByRole("button", { name: "Concordo" });
    screen.getByRole("button", { name: "Sair da sessão" }).focus();
    const expandedNavigation = await screen.findByRole("dialog", { name: "Revisão de ECG" });
    await user.click(expandedNavigation.querySelector('button[aria-label="Sair da sessão"]'));

    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("executa a ação do ícone do trilho no primeiro clique, sem abrir o menu", async () => {
    const user = userEvent.setup();
    stubViewport(false);
    render(<ExamReviewPage />);

    await screen.findByRole("button", { name: "Concordo" });
    const railTutorial = screen.getByRole("button", { name: "Tutorial rápido" });
    await user.click(railTutorial);

    expect(await screen.findByRole("dialog", { name: "Tutorial rápido" })).toBeInTheDocument();
    // O clique não foca o trilho (o foco abria o menu e o clique se perdia) e cancela a abertura por hover agendada.
    expect(railTutorial).not.toHaveFocus();
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    expect(screen.queryByRole("dialog", { name: "Revisão de ECG" })).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Tutorial rápido" })).not.toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Início" }));
    expect(navigate).toHaveBeenCalledWith("/");
    expect(screen.queryByRole("dialog", { name: "Revisão de ECG" })).not.toBeInTheDocument();
  });

  it("no trilho, o primeiro clique em Sair só abre o menu; o segundo, no menu, sai", async () => {
    const user = userEvent.setup();
    stubViewport(false);
    render(<ExamReviewPage />);

    await screen.findByRole("button", { name: "Concordo" });
    // "Sair" fica a 28px do "Voltar" do painel: um desvio não pode encerrar a sessão.
    await user.click(screen.getByRole("button", { name: "Sair da sessão" }));

    const expandedNavigation = await screen.findByRole("dialog", { name: "Revisão de ECG" });
    expect(logout).not.toHaveBeenCalled();
    await user.click(expandedNavigation.querySelector('button[aria-label="Sair da sessão"]'));
    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
  });

  it("permanece recolhida após restaurar o foco ao clicar fora da navegação", async () => {
    const user = userEvent.setup();
    stubViewport(false);
    render(<ExamReviewPage />);

    await screen.findByRole("button", { name: "Concordo" });
    screen.getByRole("button", { name: "Ativar modo escuro" }).focus();
    const expandedNavigation = await screen.findByRole("dialog", { name: "Revisão de ECG" });
    const expandedHome = expandedNavigation.querySelector('button[aria-label="Início"]');
    expandedHome.focus();
    expect(expandedHome).toHaveFocus();

    await user.click(document.querySelector('[data-slot="sheet-overlay"]'));
    await new Promise((resolve) => window.setTimeout(resolve, 500));

    expect(screen.queryByRole("dialog", { name: "Revisão de ECG" })).not.toBeInTheDocument();
  });

  it("bloqueia uma ação clínica enquanto a navegação lateral está aberta", async () => {
    stubViewport(false);
    render(<ExamReviewPage />);

    const agreeButton = await screen.findByRole("button", { name: "Concordo" });
    vi.useFakeTimers();
    fireEvent.pointerEnter(screen.getByRole("navigation", { name: "Navegação principal" }));
    act(() => vi.advanceTimersByTime(200));
    screen.getByRole("dialog", { name: "Revisão de ECG" });

    fireEvent.click(agreeButton);

    expect(reviewDailyDiagnosis).not.toHaveBeenCalled();
  });

  it("diferencia dados clínicos e apresenta metadados e notas sem hierarquia redundante", async () => {
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

    const trigger = await screen.findByRole("button", { name: "Dados do exame (com notas do laudo)" });
    expect(screen.getByRole("heading", { level: 2, name: "Dados do exame (com notas do laudo)" })).toContainElement(trigger);
    expect(trigger).toContainElement(screen.getByText("Notas do laudo"));
    expect(trigger.closest("[data-slot='card']")).toHaveClass("py-0");
    expect(trigger).toHaveClass("min-h-11", "border-0", "focus-visible:ring-inset");
    expect(trigger).not.toHaveClass("active:not-aria-[haspopup]:translate-y-px");
    expect(trigger).toHaveClass("rounded-xl", "aria-expanded:rounded-b-none", "hover:bg-muted/50");
    expect(trigger).not.toHaveClass("hover:bg-muted");
    expect(trigger).not.toHaveClass("aria-expanded:bg-muted");
    const clinicalHeading = screen.getByRole("heading", { name: "Dados clínicos" });
    expect(clinicalHeading).toBeVisible();
    expect(
      clinicalHeading.closest("[data-slot='card-title']").querySelector(".lucide-stethoscope"),
    ).toBeTruthy();
    expect(trigger.querySelector(".lucide-file-text")).toBeTruthy();
    expect(trigger.querySelector(".lucide-chevron-down")).toHaveClass("text-muted-foreground");
    const clinicalIconLabel = clinicalHeading.querySelector('[data-slot="validation-panel-icon-label"]');
    const informationIconLabel = trigger.querySelector('[data-slot="validation-panel-icon-label"]');
    expect(clinicalIconLabel).toHaveClass("gap-2", "items-center");
    // Ícone na altura da 1ª linha: no painel estreito a etiqueta "Notas do laudo" desce para uma 2ª linha.
    expect(informationIconLabel).toHaveClass("gap-2", "items-start");
    expect(clinicalIconLabel.querySelector('[data-slot="validation-panel-icon"]')).toHaveClass(
      "size-5",
      "shrink-0",
    );
    expect(informationIconLabel.querySelector('[data-slot="validation-panel-icon"]')).toHaveClass(
      "size-5",
      "shrink-0",
    );
    expect(screen.getByText("Nascimento")).toBeVisible();
    const clinicalGrid = screen.getByText("Nascimento").closest("dl");
    expect(clinicalGrid).toHaveClass("grid-cols-2", "sm:grid-cols-3");
    expect(clinicalGrid).not.toHaveClass("bg-muted/40");
    expect(clinicalGrid.children).toHaveLength(6);
    [...clinicalGrid.children].forEach((clinicalItem) => {
      expect(clinicalItem).not.toHaveClass("border");
      expect(clinicalItem).not.toHaveClass("bg-muted/40");
    });
    expect([...clinicalGrid.querySelectorAll("dt")].map((term) => term.textContent)).toEqual([
      "Idade",
      "Sexo",
      "Nascimento",
      "Peso",
      "Altura",
      "IMC",
    ]);
    expect(clinicalGrid).toContainElement(screen.getByText("58 anos"));
    expect(clinicalGrid).toContainElement(screen.getByText("Feminino"));
    expect(screen.getByText("17/05/1968")).toBeVisible();
    expect(screen.getByText("58 anos")).toBeVisible();
    expect(screen.getByText("Feminino")).toBeVisible();
    expect(screen.getByText("66 kg")).toBeVisible();
    expect(screen.getByText("1,65 m")).toBeVisible();
    expect(screen.getByText("24,2 kg/m²")).toBeVisible();
    expect(screen.queryByText("Data")).not.toBeInTheDocument();
    expect(screen.queryByText("ECG 12 derivações")).not.toBeInTheDocument();
    expect(screen.queryByText("Ritmo regular no laudo original.")).not.toBeInTheDocument();
    expect(screen.queryByText("Traçado recebido sem intercorrências.")).not.toBeInTheDocument();

    await user.click(trigger);

    const examGrid = screen.getByText("Data").closest("dl");
    expect(examGrid).toHaveClass("grid-cols-2", "sm:grid-cols-3");
    expect([...examGrid.querySelectorAll("dt")].map((term) => term.textContent)).toEqual([
      "Data",
      "Hora",
      "Tipo",
      "Notas",
    ]);
    expect(screen.getByText("26/08/2026")).toBeVisible();
    expect(screen.getByText("08:30")).toBeVisible();
    expect(screen.getByText("ECG 12 derivações")).toBeVisible();
    expect(screen.getByText("Notas")).toBeVisible();
    expect(screen.getByText("Notas").closest("[data-slot='card-content']")).toHaveClass("py-3");
    expect(screen.queryByText("Laudo original")).not.toBeInTheDocument();
    expect(screen.queryByText("Comentários")).not.toBeInTheDocument();
    expect(screen.getByText("Ritmo regular no laudo original.")).toBeVisible();
    expect(screen.getByText("Traçado recebido sem intercorrências.")).toBeVisible();
  });

  it("abre Dados do exame como o médico deixou no último exame", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("medpage.examDataOpen", "true");
    stubViewport(false);
    render(<ExamReviewPage />);

    const trigger = await screen.findByRole("button", { name: "Dados do exame" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Data")).toBeVisible();

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(window.localStorage.getItem("medpage.examDataOpen")).toBe("false");

    await user.click(trigger);

    expect(window.localStorage.getItem("medpage.examDataOpen")).toBe("true");
  });

  it("avisa no rótulo quando a idade foi calculada pela API", async () => {
    getExamById.mockResolvedValue({
      ...exam,
      patient: { age: 89, age_calculated: true, birth_date: "06/07/1935", sex: "Masculino" },
    });
    stubViewport(false);
    render(<ExamReviewPage />);

    const ageValue = await screen.findByText("89 anos");
    expect(ageValue.previousElementSibling).toHaveTextContent("Idade (calculada)");
  });

  it("informa quando o exame não tem nenhum dado clínico", async () => {
    getExamById.mockResolvedValue({
      ...exam,
      patient: { age: 0, birth_date: null, bmi: null, height: 0, sex: "", weight: null },
    });
    stubViewport(false);
    render(<ExamReviewPage />);

    const clinicalHeading = await screen.findByRole("heading", { name: "Dados clínicos" });
    const clinicalCard = clinicalHeading.closest("[data-slot='card']");
    expect(clinicalCard).toContainElement(screen.getByText("Nenhum dado clínico neste exame."));
    expect(clinicalCard.querySelector("dl")).toBeNull();
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
    expect(screen.getByText("Marcando área para D1")).toBeVisible();
  });

  it("reabre o Sheet ao cancelar a marcação no layout compacto", async () => {
    const user = userEvent.setup();
    stubViewport(true);
    render(<ExamReviewPage />);

    await screen.findByRole("heading", { name: "Exame ECG-42" });
    await user.click(screen.getByRole("button", { name: "Diagnósticos e ações" }));
    await user.click(await screen.findByRole("button", { name: "Marcar área" }));
    await user.click(screen.getByRole("button", { name: "Cancelar marcação" }));

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

    // O Sheet fechado pelo "Marcar área" ainda pode estar desmontando quando a reabertura chega: esperar o estado
    // aberto (data-open) em vez de pegar o primeiro dialog encontrado, que pode ser o que está fechando.
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Diagnósticos e ações" })).toHaveAttribute("data-open"));
    expect(screen.getByRole("dialog", { name: "Diagnósticos e ações" })).toBeVisible();
    expect(await screen.findByText("Falha ao salvar área.")).toBeVisible();
  });

  it("preserva o rascunho de discordância ao alternar entre desktop e Sheet", async () => {
    const user = userEvent.setup();
    const viewport = stubViewport(false);
    reviewDailyDiagnosis.mockResolvedValueOnce({
      ...exam,
      diagnoses: [{ ...exam.diagnoses[0], review_status: "rejected" }],
    });
    render(<ExamReviewPage />);

    await screen.findByRole("heading", { name: "Exame ECG-42" });
    await user.click(screen.getByRole("button", { name: "Discordo" }));
    // O Discordo já abre o editor: sem "Adicionar justificativa" no caminho.
    await user.type(await screen.findByRole("textbox", { name: "Justificativa (opcional)" }), "Traçado incompatível");

    act(() => viewport.setCompact(true));
    await user.click(screen.getByRole("button", { name: "Diagnósticos e ações" }));

    expect(await screen.findByRole("textbox", { name: "Justificativa (opcional)" })).toHaveValue("Traçado incompatível");
  });

  it("preserva o payload do salvamento do rascunho", async () => {
    stubViewport(false);
    render(<ExamReviewPage />);

    const notes = await screen.findByRole("textbox", { name: "Observações gerais (opcional)" });
    fireEvent.change(notes, { target: { value: "Reavaliar intervalo PR" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar observações" }));

    await waitFor(() => expect(saveExamDraft).toHaveBeenCalledWith("42", { notes: "Reavaliar intervalo PR" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Salvas");
    expect(screen.getByTestId("general-observations-header")).toContainElement(screen.getByRole("status"));
    expect(screen.getByTestId("general-observations-header")).not.toContainElement(
      screen.getByRole("toolbar", { name: "Controles do ECG" }),
    );
  });

  it("salva as observações pelo botão do próprio campo ou com Ctrl+Enter, fora do rodapé", async () => {
    stubViewport(false);
    render(<ExamReviewPage />);

    const notes = await screen.findByRole("textbox", { name: "Observações gerais (opcional)" });
    const save = screen.getByRole("button", { name: "Salvar observações" });
    // A ação mora no campo (canto inferior direito), não no rodapé — que fica com Voltar e a primária.
    expect(notes.closest('[data-slot="input-group"]')).toContainElement(save);
    expect(screen.getByRole("group", { name: "Ações da validação" })).not.toContainElement(save);
    expect(save).toHaveTextContent("Salvar");
    expect(save).toBeDisabled();

    fireEvent.change(notes, { target: { value: "Reavaliar intervalo PR" } });
    expect(save).toBeEnabled();
    saveExamDraft.mockClear();
    // Enter sozinho quebra linha; Ctrl+Enter salva.
    fireEvent.keyDown(notes, { key: "Enter" });
    expect(saveExamDraft).not.toHaveBeenCalled();
    fireEvent.keyDown(notes, { ctrlKey: true, key: "Enter" });
    await waitFor(() => expect(saveExamDraft).toHaveBeenCalledWith("42", { notes: "Reavaliar intervalo PR" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Salvas");
  });

  it("não confirma como salvo um texto alterado durante a requisição", async () => {
    let resolveSave;
    saveExamDraft.mockReturnValueOnce(new Promise((resolve) => {
      resolveSave = resolve;
    }));
    stubViewport(false);
    render(<ExamReviewPage />);

    const notes = await screen.findByRole("textbox", { name: "Observações gerais (opcional)" });
    fireEvent.change(notes, { target: { value: "Primeira versão" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar observações" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Salvando…");

    fireEvent.change(notes, { target: { value: "Versão ainda não enviada" } });
    await act(async () => {
      resolveSave({ ...exam, draft_notes: "Primeira versão" });
    });

    expect(screen.queryByText("Salvas")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar observações" })).toBeEnabled();
  });

  it("mostra feedback contextual ao salvar uma decisão clínica", async () => {
    stubViewport(false);
    render(<ExamReviewPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Concordo" }));
    const decisionFeedback = await screen.findByLabelText("✓ Decisão salva");
    expect(decisionFeedback).toHaveTextContent("Salvo");
    expect(reviewDailyDiagnosis).toHaveBeenCalledWith(1, "confirmed", "");
  });

  it("não desabilita os demais controles numa decisão rápida e só os desabilita se ela demorar", async () => {
    let resolveReview;
    reviewDailyDiagnosis.mockClear();
    reviewDailyDiagnosis.mockReturnValueOnce(new Promise((resolve) => {
      resolveReview = resolve;
    }));
    stubViewport(false);
    render(<ExamReviewPage />);

    const agree = await screen.findByRole("button", { name: "Concordo" });
    const back = screen.getByRole("button", { name: "Voltar" });
    const home = screen.getByRole("button", { name: "Início" });
    const logoutButton = screen.getByRole("button", { name: "Sair da sessão" });

    vi.useFakeTimers();
    fireEvent.click(agree);
    expect(reviewDailyDiagnosis).toHaveBeenCalledTimes(1);
    // Requisição em andamento, mas dentro do limiar: nada fica desabilitado (sem a "piscada" da página).
    expect(back).toBeEnabled();
    expect(home).toBeEnabled();
    expect(logoutButton).toBeEnabled();
    act(() => vi.advanceTimersByTime(299));
    expect(back).toBeEnabled();
    expect(home).toBeEnabled();
    // Passou do limiar: a página passa a indicar que está ocupada.
    act(() => vi.advanceTimersByTime(1));
    expect(back).toBeDisabled();
    expect(home).toBeDisabled();
    expect(logoutButton).toBeDisabled();

    await act(async () => {
      resolveReview({ ...exam, diagnoses: [{ ...exam.diagnoses[0], review_status: "confirmed" }] });
    });
    expect(back).toBeEnabled();
    expect(home).toBeEnabled();
    expect(logoutButton).toBeEnabled();
    expect(screen.getByLabelText("✓ Decisão salva")).toBeInTheDocument();
  });

  it("ignora um segundo comando enquanto uma ação está em andamento", async () => {
    let resolveReview;
    reviewDailyDiagnosis.mockReturnValueOnce(new Promise((resolve) => {
      resolveReview = resolve;
    }));
    stubViewport(false);
    render(<ExamReviewPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Concordo" }));
    // Ainda habilitado (limiar não atingido), mas a trava impede sair no meio do salvamento.
    const back = screen.getByRole("button", { name: "Voltar" });
    expect(back).toBeEnabled();
    fireEvent.click(back);
    expect(navigate).not.toHaveBeenCalled();

    await act(async () => {
      resolveReview({ ...exam, diagnoses: [{ ...exam.diagnoses[0], review_status: "confirmed" }] });
    });
    fireEvent.click(back);
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("salva a justificativa opcional com feedback próprio", async () => {
    const user = userEvent.setup();
    const rejectedExam = {
      ...exam,
      diagnoses: [{ ...exam.diagnoses[0], review_status: "rejected" }],
    };
    getExamById.mockResolvedValue(rejectedExam);
    reviewDailyDiagnosis.mockResolvedValue(rejectedExam);
    stubViewport(false);
    render(<ExamReviewPage />);

    // Justificativa vazia: a barra do grupo abre o campo, já com o cursor nele.
    await user.click(await screen.findByRole("button", { name: "Justificativa (opcional)" }));
    await user.type(screen.getByRole("textbox", { name: "Justificativa (opcional)" }), "Traçado incompatível");
    await user.click(screen.getByRole("button", { name: "Salvar justificativa" }));

    expect(reviewDailyDiagnosis).toHaveBeenCalledWith(1, "rejected", "Traçado incompatível");
    const justificationFeedback = await screen.findByLabelText("✓ Justificativa salva");
    expect(justificationFeedback).toHaveTextContent("Salvo");
  });

  it("explica junto ao diagnóstico quando a última área obrigatória não pode ser removida", async () => {
    getExamById.mockResolvedValue({
      ...exam,
      diagnoses: [{
        ...exam.diagnoses[0],
        review_status: "confirmed",
        requires_region: true,
        regions: [{ id: 7, x: 10, y: 10, width: 30, height: 20 }],
      }],
    });
    removeDiagnosisRegion.mockRejectedValueOnce({ response: { status: 400, data: { detail: "recusado" } } });
    stubViewport(false);
    render(<ExamReviewPage />);

    fireEvent.click(await screen.findByLabelText("1 área marcada"));
    fireEvent.click(screen.getByRole("button", { name: "Remover D1.1" }));
    expect(await screen.findByText("Este diagnóstico exige ao menos uma área.")).toBeVisible();
  });
});
