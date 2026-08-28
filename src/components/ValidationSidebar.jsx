import {
  Activity,
  HelpCircle,
  House,
  LifeBuoy,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";

import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Separator } from "@/components/ui/separator.jsx";
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

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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
  compactLabel,
  description,
  disabled,
  icon: Icon,
  itemKey,
  label,
  onClick,
}) {
  const accessibleLabel = compactLabel || label;
  const button = (
    <Button
      aria-label={compact ? accessibleLabel : undefined}
      className={cn(
        "grid w-full grid-cols-[4rem_minmax(0,1fr)] items-center gap-0 rounded-none px-0 py-2 text-left",
        description ? "min-h-14" : "min-h-10",
      )}
      data-navigation-item={itemKey}
      disabled={disabled}
      onClick={onClick}
      type="button"
      variant="brandGhost"
    >
      <Icon aria-hidden="true" className="justify-self-center" data-icon="inline-start" />
      {compact ? null : (
        <span className="flex min-w-0 flex-col gap-0.5 pr-4 transition-opacity duration-150">
          <span>{label}</span>
          {description ? (
            <span className="text-xs font-normal text-brand-foreground/70">{description}</span>
          ) : null}
        </span>
      )}
    </Button>
  );

  return compact ? (
    <CompactTooltip label={accessibleLabel}>{button}</CompactTooltip>
  ) : button;
}

function NavigationHeader({ compact, onToggle }) {
  const toggleLabel = compact ? "Expandir navegação" : "Recolher navegação";
  const brandButton = (
    <Button
      aria-label={toggleLabel}
      className="justify-self-center bg-brand-foreground/15 hover:bg-brand-foreground/20"
      data-navigation-item="brand"
      onClick={onToggle}
      size="icon-lg"
      type="button"
      variant="brandGhost"
    >
      <Activity aria-hidden="true" />
    </Button>
  );
  const content = (
    <div className="grid min-h-20 grid-cols-[4rem_minmax(0,1fr)] items-center">
      {compact ? (
        <CompactTooltip label={toggleLabel}>{brandButton}</CompactTooltip>
      ) : brandButton}
      {compact ? null : (
        <div className="min-w-0 pr-4">
          <p className="text-xs font-medium tracking-wide text-brand-foreground/70 uppercase">
            Validação médica
          </p>
          <SheetTitle className="text-brand-foreground">
            Navegação da validação
          </SheetTitle>
        </div>
      )}
    </div>
  );

  return compact ? (
    <div className="border-b border-brand-foreground/20">{content}</div>
  ) : (
    <SheetHeader className="border-b border-brand-foreground/20 p-0">{content}</SheetHeader>
  );
}

function SectionTitle({ children, compact, id }) {
  return (
    <div className="min-h-4 pr-4 pl-16">
      {compact ? null : (
        <h2
          className="text-xs font-medium tracking-wide text-brand-foreground/70 uppercase"
          id={id}
        >
          {children}
        </h2>
      )}
    </div>
  );
}

function AccountIdentity({ compact, doctorName }) {
  const identity = (
    <div
      aria-label={compact ? doctorName : undefined}
      className="grid min-h-14 grid-cols-[4rem_minmax(0,1fr)] items-center"
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
          <p className="truncate text-sm font-medium">{doctorName}</p>
          <p className="text-xs text-brand-foreground/70">Médico revisor</p>
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
  isBusy,
  isDark,
  onClose,
  onHome,
  onLogout,
  onOpen,
  onSupport,
  onTheme,
  onTutorial,
}) {
  return (
    <div className="flex h-full w-80 flex-col">
      <NavigationHeader compact={compact} onToggle={compact ? onOpen : onClose} />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-3">
        <section
          aria-labelledby={compact ? undefined : "validation-navigation-section"}
          className="flex flex-col gap-1"
        >
          <SectionTitle compact={compact} id="validation-navigation-section">
            Navegação
          </SectionTitle>
          <NavigationAction
            compact={compact}
            compactLabel="Ir para o início"
            description="Voltar para a tela inicial"
            disabled={isBusy}
            icon={House}
            itemKey="home"
            label="Início"
            onClick={onHome}
          />
        </section>

        <Separator className="mx-4 w-auto bg-brand-foreground/20" />

        <section
          aria-labelledby={compact ? undefined : "validation-help-section"}
          className="flex flex-col gap-1"
        >
          <SectionTitle compact={compact} id="validation-help-section">
            Ajuda e suporte
          </SectionTitle>
          <NavigationAction
            compact={compact}
            compactLabel="Abrir tutorial"
            description="Guia rápido de utilização"
            icon={HelpCircle}
            itemKey="tutorial"
            label="Tutorial rápido"
            onClick={onTutorial}
          />
          <NavigationAction
            compact={compact}
            compactLabel="Entrar em contato"
            description="Fale com o suporte"
            icon={LifeBuoy}
            itemKey="support"
            label="Central de ajuda / Contato"
            onClick={onSupport}
          />
        </section>

        <Separator className="mx-4 w-auto bg-brand-foreground/20" />

        <section
          aria-labelledby={compact ? undefined : "validation-appearance-section"}
          className="flex flex-col gap-1"
        >
          <SectionTitle compact={compact} id="validation-appearance-section">
            Aparência
          </SectionTitle>
          <NavigationAction
            compact={compact}
            compactLabel={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
            description={isDark ? "Tema escuro ativo" : "Tema claro ativo"}
            icon={isDark ? Sun : Moon}
            itemKey="theme"
            label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
            onClick={onTheme}
          />
        </section>

        <div className="mt-auto flex flex-col gap-2">
          <Separator className="mx-4 w-auto bg-brand-foreground/20" />
          <section
            aria-labelledby={compact ? undefined : "validation-account-section"}
            className="flex flex-col gap-1"
          >
            <SectionTitle compact={compact} id="validation-account-section">
              Conta
            </SectionTitle>
            <AccountIdentity compact={compact} doctorName={doctorName} />
            <NavigationAction
              compact={compact}
              compactLabel="Sair da sessão"
              icon={LogOut}
              itemKey="logout"
              label="Sair da sessão"
              onClick={onLogout}
            />
          </section>
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
  const doctorName = user?.full_name || "Usuário";

  function closeThen(action) {
    onOpenChange(false, { restoreFocus: false });
    queueMicrotask(action);
  }

  function openFromRail(event) {
    if (expanded) return;

    const focusedElement = event?.type === "focus" ? event.relatedTarget : document.activeElement;
    triggerRef.current = focusedElement instanceof HTMLElement ? focusedElement : null;
    onOpenChange(true);
  }

  return (
    <>
      <nav
        aria-label="Navegação recolhida"
        className="h-svh min-h-0 w-16 overflow-hidden border-r border-brand bg-brand text-brand-foreground"
        onFocusCapture={openFromRail}
        onPointerEnter={openFromRail}
      >
        <NavigationPanel
          compact
          doctorName={doctorName}
          isBusy={isBusy}
          isDark={isDark}
          onHome={onHome}
          onLogout={logout}
          onOpen={() => onOpenChange(true)}
          onSupport={onSupport}
          onTheme={toggleTheme}
          onTutorial={onTutorial}
        />
      </nav>

      <Sheet open={expanded} onOpenChange={onOpenChange}>
        <SheetContent
          className="overflow-hidden border-brand bg-brand text-brand-foreground transition-[width,opacity] duration-200 ease-out data-[side=left]:w-80 data-[side=left]:data-ending-style:w-16 data-[side=left]:data-ending-style:translate-x-0 data-[side=left]:data-starting-style:w-16 data-[side=left]:data-starting-style:translate-x-0 data-[side=left]:sm:max-w-none"
          onPointerLeave={() => onOpenChange(false)}
          overlayClassName="bg-black/30 supports-backdrop-filter:backdrop-blur-[1px]"
          showCloseButton={false}
          side="left"
        >
          <NavigationPanel
            doctorName={doctorName}
            isBusy={isBusy}
            isDark={isDark}
            onClose={() => onOpenChange(false)}
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
