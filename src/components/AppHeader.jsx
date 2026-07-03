import { Activity, Clock, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext.jsx";
import { formatNow } from "../utils/dateUtils.js";

export default function AppHeader() {
  const { logout, user } = useAuth();
  const [now, setNow] = useState(new Date());
  const doctorName = user?.full_name || "Usuário";

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
          <h1>Revisão de ECG</h1>
          <p>Validação médica de exames</p>
        </div>
      </div>
      <div className="header-session">
        <div className="doctor-greeting">
          <Clock size={18} aria-hidden="true" />
          <span>{formatNow(now)} — Bem-vindo, {doctorName}</span>
        </div>
        <button className="button secondary compact-button" type="button" onClick={logout}>
          <LogOut size={16} aria-hidden="true" />
          Sair
        </button>
      </div>
    </header>
  );
}
