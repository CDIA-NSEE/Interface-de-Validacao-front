import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "../src/context/AuthContext.jsx";
import { AUTH_TOKEN_KEY } from "../src/services/api.js";
import { getCurrentUser } from "../src/services/authService.js";

vi.mock("../src/services/authService.js", () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
}));

function AuthStateProbe() {
  const { isAuthenticated, isInitializing } = useAuth();
  return (
    <p>
      {isInitializing ? "validando" : isAuthenticated ? "autenticado" : "sem sessão"}
    </p>
  );
}

beforeEach(() => {
  getCurrentUser.mockReset();
});

describe("AuthContext", () => {
  it("limpa a sessão armazenada quando a validação retorna 401", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "token-expirado");
    window.localStorage.setItem(
      "medpage.authUser",
      JSON.stringify({ full_name: "Dra. Ana" }),
    );
    getCurrentUser.mockRejectedValue({ response: { status: 401 } });

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>,
    );

    expect(screen.getByText("validando")).toBeVisible();
    await waitFor(() => expect(screen.getByText("sem sessão")).toBeVisible());
    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem("medpage.authUser")).toBeNull();
  });
});
