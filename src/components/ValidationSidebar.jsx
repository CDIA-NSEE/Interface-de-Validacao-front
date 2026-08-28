import {
  Activity,
  HelpCircle,
  House,
  LifeBuoy,
  LogOut,
  Moon,
  PanelLeftClose,
  Sun,
  UserRound,
} from "lucide-react";

import TooltipIconButton from "@/components/TooltipIconButton.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.jsx";
import { useAuth } from "@/context/AuthContext.jsx";
import { useTheme } from "@/context/ThemeContext.jsx";

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function NavigationAction({ description, disabled, icon: Icon, label, onClick }) {
  return (
    <Button
      className="h-auto w-full justify-start whitespace-normal px-3 py-2.5 text-left"
      disabled={disabled}
      onClick={onClick}
      type="button"
      variant="brandGhost"
    >
      <Icon aria-hidden="true" data-icon="inline-start" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span>{label}</span>
        {description ? (
          <span className="text-xs font-normal text-brand-foreground/70">{description}</span>
        ) : null}
      </span>
    </Button>
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

    const focusedElement =
      event.type === "focus"
        ? event.relatedTarget
        : document.activeElement;

    triggerRef.current = focusedElement instanceof HTMLElement ? focusedElement : null;
    onOpenChange(true);
  }

  return (
    <>
      <nav
        aria-label="Navegação recolhida"
        className="flex h-svh min-h-0 w-16 flex-col items-center gap-2 border-r border-brand bg-brand px-2 py-3 text-brand-foreground"
        onFocusCapture={openFromRail}
        onPointerEnter={openFromRail}
      >
        <span
          aria-label="Validação médica"
          className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-foreground/15"
          role="img"
        >
          <Activity aria-hidden="true" />
        </span>

        <Separator className="bg-brand-foreground/20" />

        <TooltipIconButton
          disabled={isBusy}
          label="Ir para o início"
          onClick={onHome}
          size="icon"
          variant="brandGhost"
        >
          <House aria-hidden="true" />
        </TooltipIconButton>
        <TooltipIconButton
          label="Abrir tutorial"
          onClick={onTutorial}
          size="icon"
          variant="brandGhost"
        >
          <HelpCircle aria-hidden="true" />
        </TooltipIconButton>
        <TooltipIconButton
          label="Entrar em contato"
          onClick={onSupport}
          size="icon"
          variant="brandGhost"
        >
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

        <div className="mt-auto flex flex-col items-center gap-2">
          <TooltipIconButton
            label={`Abrir conta de ${doctorName}`}
            onClick={openFromRail}
            size="icon"
            variant="brandGhost"
          >
            <UserRound aria-hidden="true" />
          </TooltipIconButton>
          <TooltipIconButton
            label="Sair da sessão"
            onClick={logout}
            size="icon"
            variant="brandGhost"
          >
            <LogOut aria-hidden="true" />
          </TooltipIconButton>
        </div>
      </nav>

      <Sheet open={expanded} onOpenChange={onOpenChange}>
        <SheetContent
          aria-describedby="validation-navigation-description"
          className="gap-0 border-brand bg-brand text-brand-foreground data-[side=left]:w-72 data-[side=left]:sm:max-w-none"
          onPointerLeave={() => onOpenChange(false)}
          overlayClassName="bg-black/30 supports-backdrop-filter:backdrop-blur-[1px]"
          showCloseButton={false}
          side="left"
        >
          <SheetHeader className="border-b border-brand-foreground/20 pr-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-brand-foreground/70 uppercase">
                  Validação médica
                </p>
                <SheetTitle className="text-brand-foreground">
                  Navegação da validação
                </SheetTitle>
              </div>
              <Button
                aria-label="Recolher navegação"
                onClick={() => onOpenChange(false)}
                size="icon-sm"
                type="button"
                variant="brandGhost"
              >
                <PanelLeftClose aria-hidden="true" />
              </Button>
            </div>
            <SheetDescription
              className="text-brand-foreground/70"
              id="validation-navigation-description"
            >
              A validação fica pausada enquanto este painel estiver aberto.
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            <section className="flex flex-col gap-1" aria-labelledby="validation-navigation-section">
              <h2
                className="px-3 text-xs font-medium tracking-wide text-brand-foreground/70 uppercase"
                id="validation-navigation-section"
              >
                Navegação
              </h2>
              <NavigationAction
                description="Voltar para a tela inicial"
                disabled={isBusy}
                icon={House}
                label="Início"
                onClick={() => closeThen(onHome)}
              />
            </section>

            <Separator className="bg-brand-foreground/20" />

            <section className="flex flex-col gap-1" aria-labelledby="validation-help-section">
              <h2
                className="px-3 text-xs font-medium tracking-wide text-brand-foreground/70 uppercase"
                id="validation-help-section"
              >
                Ajuda e suporte
              </h2>
              <NavigationAction
                icon={HelpCircle}
                label="Tutorial rápido"
                onClick={() => closeThen(onTutorial)}
              />
              <NavigationAction
                icon={LifeBuoy}
                label="Central de ajuda / Contato"
                onClick={() => closeThen(onSupport)}
              />
            </section>

            <Separator className="bg-brand-foreground/20" />

            <section className="flex flex-col gap-1" aria-labelledby="validation-appearance-section">
              <h2
                className="px-3 text-xs font-medium tracking-wide text-brand-foreground/70 uppercase"
                id="validation-appearance-section"
              >
                Aparência
              </h2>
              <NavigationAction
                description={isDark ? "Tema escuro ativo" : "Tema claro ativo"}
                icon={isDark ? Sun : Moon}
                label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
                onClick={toggleTheme}
              />
            </section>

            <div className="mt-auto flex flex-col gap-3">
              <Separator className="bg-brand-foreground/20" />
              <section className="flex flex-col gap-2" aria-labelledby="validation-account-section">
                <h2
                  className="px-3 text-xs font-medium tracking-wide text-brand-foreground/70 uppercase"
                  id="validation-account-section"
                >
                  Conta
                </h2>
                <div className="flex items-center gap-3 px-3 py-2">
                  <Badge
                    className="size-10 justify-center rounded-full bg-brand-foreground/15 text-brand-foreground"
                    variant="secondary"
                  >
                    {getInitials(doctorName)}
                  </Badge>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{doctorName}</p>
                    <p className="text-xs text-brand-foreground/70">Médico revisor</p>
                  </div>
                </div>
                <NavigationAction
                  icon={LogOut}
                  label="Sair da sessão"
                  onClick={() => closeThen(logout)}
                />
              </section>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
