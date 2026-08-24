import { Activity, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [requestError, setRequestError] = useState("");
  const submissionInProgress = useRef(false);

  function handleChange(field, value) {
    setCredentials((currentCredentials) => ({
      ...currentCredentials,
      [field]: value,
    }));
    if (fieldErrors[field]) {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [field]: "",
      }));
    }
    if (requestError) {
      setRequestError("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submissionInProgress.current) {
      return;
    }

    setRequestError("");
    setIsRecoveringPassword(false);

    const email = credentials.email.trim();
    const nextFieldErrors = {
      email: email ? "" : "Informe sua credencial ou e-mail institucional.",
      password: credentials.password ? "" : "Informe sua senha.",
    };

    setFieldErrors(nextFieldErrors);
    if (nextFieldErrors.email || nextFieldErrors.password) {
      return;
    }

    submissionInProgress.current = true;
    setIsSubmitting(true);
    try {
      await login({ email, password: credentials.password });
      navigate("/", { replace: true });
    } catch (error) {
      setRequestError(error?.response?.data?.detail || "Não foi possível entrar.");
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <svg
        aria-hidden="true"
        className="login-background-ecg"
        focusable="false"
        viewBox="0 0 1440 180"
      >
        <path d="M0 103h55l24-40 28 82 34-131 36 150 31-61h113l21-28 26 56 29-98 33 131 34-61h155l21-30 28 58 31-101 34 134 34-61h135l25-35 28 69 32-117 37 144 29-61h139" />
      </svg>

      <div className="login-layout">
        <section className="login-card" aria-labelledby="login-title">
          <form className="login-auth-panel" noValidate onSubmit={handleSubmit}>
            <header className="login-heading">
              <span className="login-eyebrow">ACESSO MÉDICO</span>
              <h1 id="login-title">Revisão de ECG</h1>
              <div className="login-medical-divider" aria-hidden="true">
                <span>
                  <Activity size={17} />
                </span>
              </div>
              <p>
                Entre com seu e-mail institucional BP para acessar a plataforma de validação de
                exames.
              </p>
            </header>

            <div className="login-fields">
              <div className="login-field">
                <label htmlFor="login-credential">E-mail institucional BP</label>
                <div className="login-input-frame">
                  <Mail aria-hidden="true" size={19} />
                  <input
                    aria-describedby={
                      fieldErrors.email ? "login-credential-error" : undefined
                    }
                    aria-invalid={fieldErrors.email ? "true" : undefined}
                    autoComplete="username"
                    autoFocus
                    disabled={isSubmitting}
                    id="login-credential"
                    name="email"
                    onChange={(event) => handleChange("email", event.target.value)}
                    placeholder="medico@dominio-bp"
                    type="text"
                    value={credentials.email}
                  />
                </div>
                {fieldErrors.email ? (
                  <p className="login-field-error" id="login-credential-error">
                    {fieldErrors.email}
                  </p>
                ) : null}
              </div>

              <div className="login-field">
                <label htmlFor="login-password">Senha</label>
                <div className="login-input-frame">
                  <LockKeyhole aria-hidden="true" size={19} />
                  <input
                    aria-describedby={
                      fieldErrors.password ? "login-password-error" : undefined
                    }
                    aria-invalid={fieldErrors.password ? "true" : undefined}
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    id="login-password"
                    name="password"
                    onChange={(event) => handleChange("password", event.target.value)}
                    placeholder="Digite sua senha"
                    type={isPasswordVisible ? "text" : "password"}
                    value={credentials.password}
                  />
                  <button
                    aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={isPasswordVisible}
                    className="login-password-toggle"
                    disabled={isSubmitting}
                    onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
                    type="button"
                  >
                    {isPasswordVisible ? (
                      <EyeOff aria-hidden="true" size={19} />
                    ) : (
                      <Eye aria-hidden="true" size={19} />
                    )}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p className="login-field-error" id="login-password-error">
                    {fieldErrors.password}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="login-options">
              <label className="login-remember-option" htmlFor="login-remember">
                <input
                  disabled={isSubmitting}
                  id="login-remember"
                  type="checkbox"
                />
                <span>Lembrar meu acesso</span>
              </label>
              <button
                aria-controls="login-recovery-guidance"
                aria-expanded={isRecoveringPassword}
                className="login-recovery-button"
                disabled={isSubmitting}
                onClick={() => {
                  setRequestError("");
                  setIsRecoveringPassword((currentValue) => !currentValue);
                }}
                type="button"
              >
                Esqueci minha senha
              </button>
            </div>

            {isRecoveringPassword ? (
              <div
                className="login-recovery-guidance"
                id="login-recovery-guidance"
                role="note"
              >
                <p>
                  Para recuperar sua senha, contate o administrador responsável pelo cadastro de
                  usuários.
                </p>
                <p>Novos usuários não são criados por esta tela.</p>
              </div>
            ) : null}

            <div
              aria-atomic="true"
              aria-live="assertive"
              className="login-request-feedback"
              role={requestError ? "alert" : undefined}
            >
              {requestError}
            </div>

            <button
              aria-busy={isSubmitting}
              className="login-submit-button"
              disabled={isSubmitting}
              type="submit"
            >
              <LockKeyhole aria-hidden="true" size={19} />
              {isSubmitting ? "Entrando..." : "Entrar na plataforma"}
            </button>

            <div className="login-divider" aria-hidden="true">
              <span>ou</span>
            </div>

            {/* TODO: integrar o fluxo OAuth quando o provedor institucional estiver definido. */}
            <button className="login-alternative-button" type="button">
              <ShieldCheck aria-hidden="true" size={19} />
              Acessar com outro método
            </button>
          </form>

          <section
            aria-label="Identidade da plataforma de validação de ECG"
            className="login-institutional-panel"
          >
            <div className="login-logo-row" aria-label="Marcas BP e NSEE">
              <span className="login-logo-frame login-logo-frame-bp">
                <img src="/logos/logo_BP.png" alt="BP" />
              </span>
              <span aria-hidden="true" className="login-logo-divider" />
              <span className="login-logo-frame login-logo-frame-nsee">
                <img src="/logos/logo_NSEE.jpeg" alt="NSEE" />
              </span>
            </div>

            <svg
              aria-hidden="true"
              className="login-ecg-line"
              focusable="false"
              viewBox="0 0 560 160"
            >
              <path d="M0 88h86l18-22 23 45 26-91 31 128 27-60h51l20-24 19 47 29-88 28 124 25-59h58l19-25 24 48 25-23h71" />
            </svg>

            <div className="login-institutional-copy">
              <span aria-hidden="true" className="login-security-emblem">
                <ShieldCheck size={30} />
              </span>
              <p className="login-institutional-title">
                <span>Plataforma segura para</span>{" "}
                <strong>validação de exames de ECG</strong>
              </p>
              <p>Precisão, confiabilidade e suporte à decisão clínica.</p>
            </div>
          </section>

          <aside className="login-security-note">
            <LockKeyhole aria-hidden="true" size={21} />
            <p>
              Seus dados são protegidos e seguem os padrões de segurança e privacidade da BP.
            </p>
          </aside>
        </section>

        <footer className="login-footer">
          <p>© 2026 BP • Todos os direitos reservados</p>
          <p>Política de Privacidade • Termos de Uso • Suporte</p>
        </footer>
      </div>
    </main>
  );
}
