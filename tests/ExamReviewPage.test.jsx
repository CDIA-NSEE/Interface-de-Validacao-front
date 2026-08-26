import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import ExamReviewPage from "../src/pages/ExamReviewPage.jsx";
import { getDiagnosisOptions, getExamById, saveExamDraft } from "../src/services/examsService.js";
import { getValidationContext } from "../src/services/validationService.js";

const navigate = vi.fn();

beforeAll(() => {
  Object.defineProperty(Element.prototype, "getAnimations", {
    configurable: true,
    value: () => [],
  });
});

afterAll(() => {
  delete Element.prototype.getAnimations;
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
  useAuth: () => ({ user: { full_name: "Dra. Ana" } }),
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

function stubViewport(isCompact) {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: isCompact,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
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
  saveExamDraft.mockResolvedValue(exam);
});

describe("ExamReviewPage", () => {
  it("mantém a revisão lateral e o ECG lado a lado no desktop", async () => {
    stubViewport(false);
    render(<ExamReviewPage />);

    expect(await screen.findByRole("heading", { name: "Exame ECG-42" })).toBeVisible();
    expect(screen.getByRole("complementary", { name: "Diagnósticos e ações" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Visualizador de ECG" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Diagnóstico do dia" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Dados clínicos completos" })).toBeVisible();
  });

  it("usa uma única composição de revisão dentro do Sheet abaixo de 768px", async () => {
    const user = userEvent.setup();
    stubViewport(true);
    render(<ExamReviewPage />);

    await screen.findByRole("heading", { name: "Exame ECG-42" });
    expect(screen.queryByRole("complementary", { name: "Diagnósticos e ações" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Diagnóstico do dia" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Diagnósticos e ações" }));

    expect(await screen.findByRole("dialog", { name: "Diagnósticos e ações" })).toBeVisible();
    expect(screen.getAllByRole("region", { name: "Diagnóstico do dia" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Salvar e próximo" })).toBeVisible();
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
