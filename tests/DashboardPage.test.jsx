import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DashboardPage from "../src/pages/DashboardPage.jsx";
import ExamList from "../src/components/ExamList.jsx";
import { getStats } from "../src/services/dashboardService.js";
import { getExams } from "../src/services/examsService.js";
import {
  getNextValidationExam,
  getValidationContext,
  getValidationQueue,
} from "../src/services/validationService.js";

vi.mock("../src/services/dashboardService.js", () => ({
  getStats: vi.fn(),
}));

vi.mock("../src/services/examsService.js", () => ({
  getExams: vi.fn(),
}));

vi.mock("../src/services/validationService.js", () => ({
  getNextValidationExam: vi.fn(),
  getValidationContext: vi.fn(),
  getValidationQueue: vi.fn(),
}));

vi.mock("../src/services/supportService.js", () => ({
  getSupportContact: vi.fn(),
}));

vi.mock("../src/components/AppHeader.jsx", () => ({
  default: () => <header>MedPage</header>,
}));

vi.mock("../src/components/SupportContactModal.jsx", () => ({
  default: () => null,
}));

vi.mock("../src/components/TutorialModal.jsx", () => ({
  default: () => null,
}));

const stats = {
  pending_total: 4,
  in_validation_total: 1,
  reviewed_total: 2,
  queue_state_counts: { all: 7, start: 4, validated: 1, completed: 2 },
  decision_counts: { confirmed: 2, rejected: 1 },
  region_counts: { with_region: 1, without_region: 2 },
};

const configuredContext = {
  is_configured: true,
  is_general_review_day: false,
  day_index: 4,
  active_standard_diagnosis: "Ritmo sinusal",
  support_contact: null,
};

const queue = {
  items: [{ id: 10 }],
  progress: { total: 5, remaining: 3, completed: 2, percent: 40 },
};

function makeExam(id, status = "nao_validado", queueState = "start") {
  return {
    id,
    exam_code: `ECG-${String(id).padStart(3, "0")}`,
    exam_date: "2026-08-20",
    created_at: `2026-08-${String(id).padStart(2, "0")}T09:00:00Z`,
    status_validation: status,
    queue_state: queueState,
  };
}

const exams = [
  makeExam(1),
  makeExam(2),
  makeExam(3, "em_validacao"),
  makeExam(4),
  makeExam(5),
  makeExam(6, "valido", "completed"),
];

function renderDashboard() {
  function OpenedExam() {
    const { id } = useParams();
    return <div>Exame {id} aberto</div>;
  }

  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/exams/:id" element={<OpenedExam />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStats.mockResolvedValue(stats);
    getExams.mockResolvedValue(exams);
    getValidationContext.mockResolvedValue(configuredContext);
    getValidationQueue.mockResolvedValue(queue);
    getNextValidationExam.mockResolvedValue({ exam: makeExam(77) });
  });

  it("combina busca, estado da fila, decisão e região no mesmo contrato de filtros", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText("Ritmo sinusal");
    const search = screen.getByRole("searchbox", { name: /buscar exame/i });
    await user.type(search, "ECG-003");
    await user.click(screen.getByRole("button", { name: /em validação:/i }));
    await user.click(screen.getByRole("button", { name: /concordou:/i }));
    await user.click(screen.getByRole("button", { name: /^mapeado:/i }));

    await waitFor(() => {
      expect(getExams).toHaveBeenCalledWith({
        queue_state: "validated",
        decision: "confirmed",
        region: "with_region",
        search: "ECG-003",
      });
    });

    await user.click(screen.getByRole("button", { name: "Limpar filtro Concordou" }));
    await waitFor(() => {
      expect(getExams).toHaveBeenCalledWith({
        queue_state: "validated",
        decision: "",
        region: "with_region",
        search: "ECG-003",
      });
    });

    await user.click(screen.getByRole("button", { name: "Limpar todos os filtros" }));
    await waitFor(() => expect(getExams).toHaveBeenCalledWith({
      queue_state: "all",
      decision: "",
      region: "",
      search: "",
    }));
  });

  it("mantém quatro exames por página e expõe a navegação somente quando necessária", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ExamList exams={exams} />
      </MemoryRouter>,
    );

    const previousPage = screen.getByRole("button", { name: /página anterior/i });
    const nextPage = screen.getByRole("button", { name: /próxima página/i });
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(previousPage).toBeDisabled();
    expect(nextPage).toBeEnabled();

    await user.click(nextPage);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
    expect(previousPage).toBeEnabled();
    expect(nextPage).toBeDisabled();
  });

  it("mantém o exame em validação no topo antes de paginar a fila", async () => {
    renderDashboard();

    const queue = await screen.findByRole("region", { name: "Lista de exames" });
    const firstPage = within(queue).getAllByRole("listitem");

    expect(firstPage).toHaveLength(4);
    expect(within(firstPage[0]).getByRole("heading", { name: "Exame ECG-003" })).toBeInTheDocument();
    expect(within(firstPage[1]).getByRole("heading", { name: "Exame ECG-001" })).toBeInTheDocument();
  });

  it("abre o próximo exame configurado e preserva a rota pública do fluxo", async () => {
    const user = userEvent.setup();
    renderDashboard();

    const startButton = await screen.findByRole("button", { name: "Iniciar validação" });
    await user.click(startButton);

    expect(getNextValidationExam).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Exame 77 aberto")).toBeInTheDocument();
  });

  it("prioriza exame em validação no modo legado", async () => {
    const user = userEvent.setup();
    getValidationContext.mockResolvedValue({
      ...configuredContext,
      is_configured: false,
      active_standard_diagnosis: null,
    });
    getValidationQueue.mockResolvedValue({ items: [], progress: null });
    getExams.mockImplementation((filters) => {
      if (!filters) {
        return Promise.resolve([
          makeExam(8),
          makeExam(9, "em_validacao"),
        ]);
      }
      return Promise.resolve(exams);
    });

    renderDashboard();
    const startButton = await screen.findByRole("button", { name: "Iniciar validação" });
    await user.click(startButton);

    expect(getNextValidationExam).not.toHaveBeenCalled();
    expect(await screen.findByText("Exame 9 aberto")).toBeInTheDocument();
  });

  it("apresenta o progresso diário com semântica de progressbar", async () => {
    renderDashboard();

    const progress = await screen.findByRole("progressbar", { name: /progresso da fila/i });
    expect(progress).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("3 restantes de 5")).toBeInTheDocument();
  });
});
