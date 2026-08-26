import { Activity, Clock, HelpCircle, LifeBuoy, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button.jsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.jsx";
import { useAuth } from "@/context/AuthContext.jsx";
import { useTheme } from "@/context/ThemeContext.jsx";
import { formatNow } from "@/utils/dateUtils.js";

function HeaderAction({ children, label, onClick }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            onClick={onClick}
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

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
    <TooltipProvider>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex min-h-16 w-full max-w-screen-2xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"
            >
              <Activity className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                BP · NSEE
              </p>
              <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground md:flex">
              <Clock className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {formatNow(now)} · {doctorName}
              </span>
            </div>

            <nav className="flex items-center gap-1" aria-label="Ações globais">
              <HeaderAction label="Abrir tutorial" onClick={onTutorial}>
                <HelpCircle aria-hidden="true" />
              </HeaderAction>
              <HeaderAction label="Entrar em contato" onClick={onContact}>
                <LifeBuoy aria-hidden="true" />
              </HeaderAction>
              <HeaderAction
                label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
                onClick={toggleTheme}
              >
                {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
              </HeaderAction>
              <HeaderAction label="Sair" onClick={logout}>
                <LogOut aria-hidden="true" />
              </HeaderAction>
            </nav>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
