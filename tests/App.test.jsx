import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../src/App.jsx";

const auth = vi.hoisted(() => ({
  state: {
    isAuthenticated: false,
    isInitializing: false,
  },
}));

vi.mock("../src/context/AuthContext.jsx", () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => auth.state,
}));

vi.mock("../src/pages/DashboardPage.jsx", () => ({
  default: () => <h1>Dashboard protegido</h1>,
}));

vi.mock("../src/pages/ExamReviewPage.jsx", () => ({
  default: () => <h1>Exame protegido</h1>,
}));

vi.mock("../src/pages/LoginPage.jsx", () => ({
  default: () => <h1>Acesso público</h1>,
}));

function renderAt(path) {
  window.history.replaceState({}, "", path);
  return render(<App />);
}

beforeEach(() => {
  auth.state.isAuthenticated = false;
  auth.state.isInitializing = false;
});

describe("App routes", () => {
  it.each(["/", "/exams/42"])(
    "redireciona %s para o login quando não há sessão",
    async (path) => {
      renderAt(path);

      expect(await screen.findByRole("heading", { name: "Acesso público" })).toBeVisible();
      expect(window.location.pathname).toBe("/login");
    },
  );

  it("redireciona o login para o Dashboard quando a sessão está autenticada", async () => {
    auth.state.isAuthenticated = true;
    renderAt("/login");

    expect(await screen.findByRole("heading", { name: "Dashboard protegido" })).toBeVisible();
    expect(window.location.pathname).toBe("/");
  });

  it("não renderiza conteúdo protegido enquanto valida a sessão", () => {
    auth.state.isInitializing = true;
    renderAt("/exams/42");

    expect(screen.getByText("Validando sessão...")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Exame protegido" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Acesso público" })).not.toBeInTheDocument();
  });
});
