import { Activity, Clock, HelpCircle, LifeBuoy, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { formatNow } from "../utils/dateUtils.js";

export default function AppHeader({ onContact, onTutorial, title = "Revisao de ECG" }) {
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [now, setNow] = useState(new Date());
  const doctorName = user?.full_name || "Usuario";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="app-header">
      <div className="brand-lockup">
        <span className="brand-icon" aria-hidden="true">
          <Activity size={24} />
        </span>
        <div>
          <h1>{title}</h1>
          <p>Validacao medica de ECG</p>
        </div>
      </div>
      <div className="header-session">
        <div className="header-tools" aria-label="Acoes globais">
          <button
            className="button secondary compact-button"
            type="button"
            onClick={onTutorial}
            title="Tutorial"
          >
            <HelpCircle size={16} aria-hidden="true" />
            Tutorial
          </button>
          <button
            className="button secondary compact-button"
            type="button"
            onClick={onContact}
            title="Entrar em contato"
          >
            <LifeBuoy size={16} aria-hidden="true" />
            Contato
          </button>
          <button
            className="icon-button compact-icon-button"
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
            title={isDark ? "Modo claro" : "Modo escuro"}
          >
            {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          </button>
        </div>
        <div className="doctor-greeting">
          <Clock size={18} aria-hidden="true" />
          <span>
            {formatNow(now)} - Bem-vindo, {doctorName}
          </span>
        </div>
        <button className="button secondary compact-button" type="button" onClick={logout}>
          <LogOut size={16} aria-hidden="true" />
          Sair
        </button>
      </div>
    </header>
  );
}
