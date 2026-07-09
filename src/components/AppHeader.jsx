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
          <Activity size={21} />
        </span>
        <div>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="header-session">
        <div className="header-tools" aria-label="Acoes globais">
          <button
            className="icon-button compact-icon-button header-action-button"
            type="button"
            onClick={onTutorial}
            aria-label="Abrir tutorial"
            title="Tutorial"
          >
            <HelpCircle size={18} aria-hidden="true" />
          </button>
          <button
            className="icon-button compact-icon-button header-action-button"
            type="button"
            onClick={onContact}
            aria-label="Entrar em contato"
            title="Entrar em contato"
          >
            <LifeBuoy size={18} aria-hidden="true" />
          </button>
          <button
            className="icon-button compact-icon-button header-action-button"
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
            title={isDark ? "Modo claro" : "Modo escuro"}
          >
            {isDark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
          </button>
        </div>
        <div className="doctor-greeting">
          <Clock size={19} aria-hidden="true" />
          <span>
            {formatNow(now)} - {doctorName}
          </span>
        </div>
        <button
          className="icon-button compact-icon-button header-action-button"
          type="button"
          onClick={logout}
          aria-label="Sair"
          title="Sair"
        >
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
