import { Activity, Clock } from "lucide-react";
import { useEffect, useState } from "react";

import { formatNow } from "../utils/dateUtils.js";

const DOCTOR_NAME = "Dr. João";

export default function AppHeader() {
  const [now, setNow] = useState(new Date());

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
      <div className="doctor-greeting">
        <Clock size={18} aria-hidden="true" />
        <span>{formatNow(now)} — Bem-vindo, {DOCTOR_NAME}</span>
      </div>
    </header>
  );
}

