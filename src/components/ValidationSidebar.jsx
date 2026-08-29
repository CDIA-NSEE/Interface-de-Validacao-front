import {
  Activity,
  HelpCircle,
  House,
  LifeBuoy,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.jsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.jsx";
import { useAuth } from "@/context/AuthContext.jsx";
import { useTheme } from "@/context/ThemeContext.jsx";
import { cn } from "@/lib/utils.js";

const SIDEBAR_OPEN_DELAY_MS = 100;
const SIDEBAR_CLOSE_DELAY_MS = 150;

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getUserRoleLabel(user) {
  if (user?.job_title) return user.job_title;

  const roleLabels = {
    admin: "Administrador",
    doctor: "Médico avaliador",
  };

  return roleLabels[user?.role] || user?.role || "Médico avaliador";
}

function CompactTooltip({ children, label }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function NavigationAction({
  compact,
  disabled,
  icon: Icon,
  itemKey,
  label,
  onClick,
}) {
  const button = (
    <Button
      aria-label={label}
      className={cn(
        "mx-2 grid h-full grid-cols-[3rem_minmax(0,1fr)] items-center gap-0 rounded-lg border-0 px-0 text-left",
        compact ? "w-12" : "w-[calc(100%-1rem)]",
      )}
      disabled={disabled}
      onClick={onClick}
      size="icon"
      type="button"
      variant={itemKey === "logout" ? "brandNavigationDestructive" : "brandNavigation"}
    >
      <Icon aria-hidden="true" className="justify-self-center" data-icon="inline-start" />
      {compact ? null : (
        <span className="min-w-0 truncate pr-4 pl-2 transition-opacity duration-150">
          {label}
        </span>
      )}
    </Button>
  );

  const control = compact ? (
    <CompactTooltip label={label}>{button}</CompactTooltip>
  ) : button;

  return (
    <div className="flex h-13 items-center" data-navigation-item={itemKey}>
      {control}
    </div>
  );
}

function NavigationHeader({ compact }) {
  const brandMark = (
    <div
      aria-hidden="true"
      className="grid size-10 place-items-center justify-self-center rounded-lg bg-brand-foreground/15"
      data-navigation-item="brand"
    >
      <Activity className="size-5" />
    </div>
  );
  const content = (
    <div className="grid h-16 grid-cols-[4rem_minmax(0,1fr)] items-center">
      {brandMark}
      {compact ? null : (
        <SheetTitle className="min-w-0 truncate pr-4 text-sm font-semibold tracking-wide text-brand-foreground uppercase">
          Validação médica
        </SheetTitle>
      )}
    </div>
  );

  return compact ? (
    content
  ) : (
    <SheetHeader className="p-0">{content}</SheetHeader>
  );
}

function AccountIdentity({ compact, doctorName, doctorRole }) {
  const identity = (
    <div
      aria-label={compact ? doctorName : undefined}
      className="grid h-16 grid-cols-[4rem_minmax(0,1fr)] items-center"
      data-navigation-item="account"
      role={compact ? "img" : undefined}
      tabIndex={compact ? 0 : undefined}
    >
      <Badge
        className="size-10 justify-center justify-self-center rounded-full bg-brand-foreground/15 text-brand-foreground"
        variant="secondary"
      >
        {getInitials(doctorName)}
      </Badge>
      {compact ? null : (
        <div className="min-w-0 pr-4">
          <p className="truncate text-sm font-semibold">{doctorName}</p>
          <p className="truncate text-xs text-brand-foreground/70">{doctorRole}</p>
        </div>
      )}
    </div>
  );

  return compact ? (
    <CompactTooltip label={doctorName}>{identity}</CompactTooltip>
  ) : identity;
}

function NavigationPanel({
  compact = false,
  doctorName,
  doctorRole,
  isBusy,
  isDark,
  onHome,
  onLogout,
  onSupport,
  onTheme,
  onTutorial,
}) {
  return (
    <div className="flex h-full w-72 flex-col">
      <NavigationHeader compact={compact} />

      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <div className="flex flex-col">
          <NavigationAction
            compact={compact}
            disabled={isBusy}
            icon={House}
            itemKey="home"
            label="Início"
            onClick={onHome}
          />
          <NavigationAction
            compact={compact}
            icon={HelpCircle}
            itemKey="tutorial"
            label="Tutorial rápido"
            onClick={onTutorial}
          />
          <NavigationAction
            compact={compact}
            icon={LifeBuoy}
            itemKey="support"
            label="Central de ajuda / Contato"
            onClick={onSupport}
          />
          <NavigationAction
            compact={compact}
            icon={isDark ? Sun : Moon}
            itemKey="theme"
            label={isDark ? "Modo claro" : "Modo escuro"}
            onClick={onTheme}
          />
        </div>

        <div className="mt-auto flex flex-col">
          <AccountIdentity compact={compact} doctorName={doctorName} doctorRole={doctorRole} />
          <NavigationAction
            compact={compact}
            icon={LogOut}
            itemKey="logout"
            label="Sair da sessão"
            onClick={onLogout}
          />
        </div>
      </div>
    </div>
  );
}

export default function ValidationSidebar({
  expanded,
  isBusy,
  onHome,
  onOpenChange,
  onSupport,
  onTutorial,
  triggerRef,
}) {
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const doctorName = user?.full_name || "Usuário";
  const doctorRole = getUserRoleLabel(user);

  function clearOpenTimer() {
    if (openTimerRef.current === null) return;
    window.clearTimeout(openTimerRef.current);
    openTimerRef.current = null;
  }

  function clearCloseTimer() {
    if (closeTimerRef.current === null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }

  useEffect(() => {
    return () => {
      clearOpenTimer();
      clearCloseTimer();
    };
  }, []);

  function rememberTrigger(event) {
    const focusedElement = event?.type === "focus" ? event.relatedTarget : document.activeElement;
    triggerRef.current = focusedElement instanceof HTMLElement ? focusedElement : null;
  }

  function openImmediately(event) {
    clearOpenTimer();
    clearCloseTimer();
    rememberTrigger(event);
    onOpenChange(true);
  }

  function scheduleOpen(event) {
    if (expanded) return;

    clearOpenTimer();
    clearCloseTimer();
    rememberTrigger(event);
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      onOpenChange(true);
    }, SIDEBAR_OPEN_DELAY_MS);
  }

  function cancelScheduledOpen() {
    clearOpenTimer();
  }

  function keepOpen() {
    clearCloseTimer();
  }

  function scheduleClose() {
    if (!expanded) return;

    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onOpenChange(false);
    }, SIDEBAR_CLOSE_DELAY_MS);
  }

  function handleSheetOpenChange(open) {
    clearOpenTimer();
    clearCloseTimer();
    onOpenChange(open);
  }

  function closeThen(action) {
    clearOpenTimer();
    clearCloseTimer();
    onOpenChange(false, { restoreFocus: false });
    queueMicrotask(action);
  }

  return (
    <>
      <nav
        aria-label="Navegação recolhida"
        className="h-svh min-h-0 w-16 overflow-x-hidden overflow-y-hidden border-r border-brand-foreground/10 bg-brand text-brand-foreground"
        onFocusCapture={openImmediately}
        onPointerEnter={scheduleOpen}
        onPointerLeave={cancelScheduledOpen}
      >
        <NavigationPanel
          compact
          doctorName={doctorName}
          doctorRole={doctorRole}
          isBusy={isBusy}
          isDark={isDark}
          onHome={onHome}
          onLogout={logout}
          onSupport={onSupport}
          onTheme={toggleTheme}
          onTutorial={onTutorial}
        />
      </nav>

      <Sheet open={expanded} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          className="gap-0 overflow-hidden border-brand-foreground/10 bg-brand text-brand-foreground transition-[width,opacity] duration-200 ease-out data-[side=left]:w-72 data-[side=left]:data-ending-style:w-16 data-[side=left]:data-ending-style:translate-x-0 data-[side=left]:data-starting-style:w-16 data-[side=left]:data-starting-style:translate-x-0 data-[side=left]:sm:max-w-none"
          finalFocus={false}
          onPointerEnter={keepOpen}
          onPointerLeave={scheduleClose}
          overlayClassName="bg-black/25 supports-backdrop-filter:backdrop-blur-[1px]"
          showCloseButton={false}
          side="left"
        >
          <NavigationPanel
            doctorName={doctorName}
            doctorRole={doctorRole}
            isBusy={isBusy}
            isDark={isDark}
            onHome={() => closeThen(onHome)}
            onLogout={() => closeThen(logout)}
            onSupport={() => closeThen(onSupport)}
            onTheme={toggleTheme}
            onTutorial={() => closeThen(onTutorial)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
