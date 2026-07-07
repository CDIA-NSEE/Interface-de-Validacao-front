import { KeyRound, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(field, value) {
    setCredentials((currentCredentials) => ({
      ...currentCredentials,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsRecoveringPassword(false);

    const email = credentials.email.trim();
    if (!email || !credentials.password) {
      setError("Informe e-mail e senha para acessar o sistema.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password: credentials.password });
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "Nao foi possivel entrar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-shell" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="login-logo-row" aria-label="Marcas BP e NSEE">
            <img src="/logos/logo_BP.png" alt="BP" />
            <img src="/logos/logo_NSEE.jpeg" alt="NSEE" />
          </div>
          <div>
            <span className="eyebrow">Acesso medico</span>
            <h1 id="login-title">Revisao de ECG</h1>
          </div>
        </div>

        <form className="login-panel" onSubmit={handleSubmit}>
          <div className="login-heading">
            <h2>Entrar no sistema</h2>
            <p>Use o e-mail institucional BP cadastrado pelo administrador.</p>
          </div>

          {error ? <div className="feedback error-feedback">{error}</div> : null}
          {isRecoveringPassword ? (
            <div className="feedback login-info-feedback">
              Para recuperar sua senha, contate o administrador responsavel pelo cadastro de
              usuarios. Novos usuarios nao sao criados por esta tela.
            </div>
          ) : null}

          <label>
            E-mail BP
            <span className="input-with-icon">
              <Mail size={19} aria-hidden="true" />
              <input
                autoComplete="email"
                autoFocus
                disabled={isSubmitting}
                onChange={(event) => handleChange("email", event.target.value)}
                placeholder="medico@dominio-bp"
                type="text"
                value={credentials.email}
              />
            </span>
          </label>

          <label>
            Senha
            <span className="input-with-icon">
              <LockKeyhole size={19} aria-hidden="true" />
              <input
                autoComplete="current-password"
                disabled={isSubmitting}
                onChange={(event) => handleChange("password", event.target.value)}
                placeholder="Digite sua senha"
                type="password"
                value={credentials.password}
              />
            </span>
          </label>

          <button
            className="button primary-action full-width-button"
            disabled={isSubmitting}
            type="submit"
          >
            <KeyRound size={18} aria-hidden="true" />
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>

          <button
            className="login-recovery-button"
            disabled={isSubmitting}
            onClick={() => {
              setError("");
              setIsRecoveringPassword((currentValue) => !currentValue);
            }}
            type="button"
          >
            Recuperar senha
          </button>
        </form>
      </section>
    </main>
  );
}
