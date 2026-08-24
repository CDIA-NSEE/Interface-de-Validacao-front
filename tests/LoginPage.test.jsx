import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "../src/pages/LoginPage.jsx";

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
}));

vi.mock("../src/context/AuthContext.jsx", () => ({
  useAuth: () => ({
    login: authMocks.login,
  }),
}));

function RouterProbe() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <output data-testid="router-location">{location.pathname}</output>
      <button onClick={() => navigate(-1)} type="button">
        Voltar no histórico do teste
      </button>
    </>
  );
}

function renderLoginPage() {
  return render(
    <MemoryRouter
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      initialEntries={["/login"]}
    >
      <LoginPage />
      <RouterProbe />
    </MemoryRouter>,
  );
}

function expectCurrentPath(pathname) {
  expect(screen.getByTestId("router-location")).toHaveTextContent(pathname);
}

function getCredentialInput() {
  return screen.getByRole("textbox", { name: /e-mail institucional bp/i });
}

function getPasswordInput() {
  return screen.getByLabelText(/^senha$/i, { selector: "input" });
}

function expectAccessibleFieldError(input, expectedText) {
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAttribute("aria-describedby");
  expect(input).toHaveAccessibleDescription(expectedText);
}

describe("LoginPage", () => {
  beforeEach(() => {
    authMocks.login.mockReset();
  });

  it("renderiza a identidade institucional, os textos e todos os controles", () => {
    renderLoginPage();

    expect(screen.getByText("ACESSO MÉDICO")).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: "Revisão de ECG" })).toBeVisible();
    expect(
      screen.getByText(
        "Entre com seu e-mail institucional BP para acessar a plataforma de validação de exames.",
      ),
    ).toBeVisible();

    const institutionalMessage = screen.getByText(/Plataforma segura para/i).closest("p");
    expect(institutionalMessage).toHaveTextContent(
      "Plataforma segura para validação de exames de ECG",
    );
    expect(
      screen.getByText("Precisão, confiabilidade e suporte à decisão clínica."),
    ).toBeVisible();

    expect(screen.getByRole("img", { name: "BP" })).toHaveAttribute(
      "src",
      "/logos/logo_BP.png",
    );
    expect(screen.getByRole("img", { name: "NSEE" })).toHaveAttribute(
      "src",
      "/logos/logo_NSEE.jpeg",
    );

    expect(getCredentialInput()).toHaveProperty("type", "text");
    expect(getCredentialInput()).toHaveAttribute("placeholder", "medico@dominio-bp");
    expect(getPasswordInput()).toHaveProperty("type", "password");
    expect(getPasswordInput()).toHaveAttribute("placeholder", "Digite sua senha");
    expect(screen.getByRole("button", { name: "Mostrar senha" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Lembrar meu acesso" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Esqueci minha senha" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Entrar na plataforma" })).toHaveAttribute(
      "type",
      "submit",
    );
    expect(screen.getByRole("button", { name: "Acessar com outro método" })).toHaveAttribute(
      "type",
      "button",
    );

    expect(
      screen.getByText(
        "Seus dados são protegidos e seguem os padrões de segurança e privacidade da BP.",
      ),
    ).toBeVisible();
    expect(screen.getByText("© 2026 BP • Todos os direitos reservados")).toBeVisible();
    expect(screen.getByText("Política de Privacidade • Termos de Uso • Suporte")).toBeVisible();
  });

  it("submete por Enter aceitando usuário sem @, com trim apenas da credencial", async () => {
    const user = userEvent.setup();
    authMocks.login.mockResolvedValue({ id: 1 });
    renderLoginPage();

    await user.type(getCredentialInput(), "  dr.joao  ");
    await user.type(getPasswordInput(), "  segredo com espaço  ");
    await user.type(getPasswordInput(), "{Enter}");

    await waitFor(() => {
      expect(authMocks.login).toHaveBeenCalledTimes(1);
    });
    expect(authMocks.login).toHaveBeenCalledWith({
      email: "dr.joao",
      password: "  segredo com espaço  ",
    });
    expectCurrentPath("/");

    await user.click(screen.getByRole("button", { name: "Voltar no histórico do teste" }));
    await waitFor(() => expectCurrentPath("/"));
  });

  it("expõe erros locais acessíveis junto a cada campo", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole("button", { name: "Entrar na plataforma" }));

    expectAccessibleFieldError(getCredentialInput(), /credencial|e-mail/i);
    expectAccessibleFieldError(getPasswordInput(), /senha/i);
    expect(authMocks.login).not.toHaveBeenCalled();

    await user.type(getCredentialInput(), "dr.joao");
    await user.click(screen.getByRole("button", { name: "Entrar na plataforma" }));

    expect(getCredentialInput()).not.toHaveAttribute("aria-invalid", "true");
    expectAccessibleFieldError(getPasswordInput(), /senha/i);
    expect(authMocks.login).not.toHaveBeenCalled();
  });

  it("anuncia o erro devolvido pela API em uma região live", async () => {
    const user = userEvent.setup();
    authMocks.login.mockRejectedValue({
      response: {
        data: {
          detail: "Credenciais inválidas.",
        },
      },
    });
    renderLoginPage();

    await user.type(getCredentialInput(), "dr.joao");
    await user.type(getPasswordInput(), "segredo");
    await user.click(screen.getByRole("button", { name: "Entrar na plataforma" }));

    const apiError = await screen.findByText("Credenciais inválidas.");
    const liveRegion = apiError.closest("[aria-live]");

    expect(liveRegion).not.toBeNull();
    expect(liveRegion).toHaveTextContent("Credenciais inválidas.");
    expect(getCredentialInput()).not.toHaveAttribute("aria-invalid");
    expect(getPasswordInput()).not.toHaveAttribute("aria-invalid");
  });

  it("libera uma nova tentativa após falha de rede e limpa a mensagem ao editar", async () => {
    const user = userEvent.setup();
    authMocks.login
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ id: 1 });
    renderLoginPage();

    await user.type(getCredentialInput(), "dr.joao");
    await user.type(getPasswordInput(), "segredo");
    await user.click(screen.getByRole("button", { name: "Entrar na plataforma" }));

    expect(await screen.findByText("Não foi possível entrar.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Entrar na plataforma" })).toBeEnabled();

    await user.type(getCredentialInput(), "x");
    expect(screen.queryByText("Não foi possível entrar.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Entrar na plataforma" }));

    await waitFor(() => {
      expect(authMocks.login).toHaveBeenCalledTimes(2);
      expectCurrentPath("/");
    });
  });

  it("mantém o estado de carregamento e faz somente uma chamada enquanto autentica", async () => {
    const user = userEvent.setup();
    let resolveLogin;
    authMocks.login.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );
    renderLoginPage();

    await user.type(getCredentialInput(), "dr.joao");
    await user.type(getPasswordInput(), "segredo");

    const submitButton = screen.getByRole("button", { name: "Entrar na plataforma" });
    const form = submitButton.closest("form");
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => {
      expect(authMocks.login).toHaveBeenCalledTimes(1);
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/entrando|carregando|aguarde/i);
      expect(getCredentialInput()).toBeDisabled();
      expect(getPasswordInput()).toBeDisabled();
      expect(screen.getByRole("button", { name: "Mostrar senha" })).toBeDisabled();
      expect(screen.getByRole("checkbox", { name: "Lembrar meu acesso" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Esqueci minha senha" })).toBeDisabled();
    });

    expect(authMocks.login).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLogin({ id: 1 });
    });
    await waitFor(() => expect(submitButton).toBeEnabled());
  });

  it("mostra e oculta a senha sem alterar seu valor", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const passwordInput = getPasswordInput();
    await user.type(passwordInput, "senha secreta");

    await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(passwordInput).toHaveProperty("type", "text");
    expect(passwordInput).toHaveValue("senha secreta");

    await user.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(passwordInput).toHaveProperty("type", "password");
    expect(passwordInput).toHaveValue("senha secreta");
  });

  it("mantém a recuperação de senha como orientação local", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole("button", { name: "Esqueci minha senha" }));

    expect(
      screen.getByText(
        /Para recuperar sua senha, contate o administrador responsável pelo cadastro de usuários\./i,
      ),
    ).toBeVisible();
    expect(screen.getByText(/Novos usuários não são criados por esta tela\./i)).toBeVisible();
    expect(authMocks.login).not.toHaveBeenCalled();
  });

  it("mantém 'Lembrar meu acesso' apenas como controle visual", async () => {
    const user = userEvent.setup();
    const { unmount } = renderLoginPage();

    const rememberCheckbox = screen.getByRole("checkbox", { name: "Lembrar meu acesso" });
    await user.click(rememberCheckbox);

    expect(rememberCheckbox).toBeChecked();
    expect(window.localStorage.length).toBe(0);

    unmount();
    renderLoginPage();

    expect(screen.getByRole("checkbox", { name: "Lembrar meu acesso" })).not.toBeChecked();
    expect(window.localStorage.length).toBe(0);
  });

  it("mantém o método alternativo focável, habilitado e estritamente inerte", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(getCredentialInput(), "dr.joao");
    await user.type(getPasswordInput(), "segredo");

    const alternativeButton = screen.getByRole("button", {
      name: "Acessar com outro método",
    });
    alternativeButton.focus();

    expect(alternativeButton).toHaveFocus();
    expect(alternativeButton).toBeEnabled();
    expect(alternativeButton).toHaveAttribute("type", "button");

    await user.click(alternativeButton);

    expect(alternativeButton).toHaveFocus();
    expect(authMocks.login).not.toHaveBeenCalled();
    expectCurrentPath("/login");
    expect(getCredentialInput()).toHaveValue("dr.joao");
    expect(getPasswordInput()).toHaveValue("segredo");
  });
});
