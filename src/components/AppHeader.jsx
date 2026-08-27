import { Activity, Clock, HelpCircle, LifeBuoy, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext.jsx";
import { useTheme } from "@/context/ThemeContext.jsx";
import { formatNow } from "@/utils/dateUtils.js";
import TooltipIconButton from "@/components/TooltipIconButton.jsx";

export default function AppHeader({ onContact, onTutorial, title = "Revisão de ECG" }) {
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [now, setNow] = useState(new Date());
  const doctorName = user?.full_name || "Usuário";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-brand bg-brand text-brand-foreground shadow-sm">
        <div className="mx-auto flex min-h-16 w-full max-w-screen-2xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-foreground/15 text-brand-foreground"
            >
              <Activity className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-brand-foreground/70 uppercase">
                BP · NSEE
              </p>
              <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-lg bg-brand-foreground/10 px-3 py-2 text-xs text-brand-foreground/80 md:flex">
              <Clock className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {formatNow(now)} · {doctorName}
              </span>
            </div>

            <nav className="flex items-center gap-1" aria-label="Ações globais">
              <TooltipIconButton label="Abrir tutorial" onClick={onTutorial} size="icon" variant="brandGhost">
                <HelpCircle aria-hidden="true" />
              </TooltipIconButton>
              <TooltipIconButton label="Entrar em contato" onClick={onContact} size="icon" variant="brandGhost">
                <LifeBuoy aria-hidden="true" />
              </TooltipIconButton>
              <TooltipIconButton
                label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
                onClick={toggleTheme}
                size="icon"
                variant="brandGhost"
              >
                {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
              </TooltipIconButton>
              <TooltipIconButton label="Sair" onClick={logout} size="icon" variant="brandGhost">
                <LogOut aria-hidden="true" />
              </TooltipIconButton>
            </nav>
          </div>
        </div>
    </header>
  );
}
