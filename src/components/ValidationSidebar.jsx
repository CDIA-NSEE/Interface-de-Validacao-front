import {
  Activity,
  HelpCircle,
  House,
  Keyboard,
  LifeBuoy,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.jsx";
import { useAuth } from "@/context/AuthContext.jsx";
import { useTheme } from "@/context/ThemeContext.jsx";
import { cn } from "@/lib/utils.js";

// O menu abre 200ms depois que o ponteiro entra no trilho, parado ou em movimento (como o trilho do Carbon, que conta
// só a permanência). Exigir o ponteiro parado fazia o menu nunca abrir para quem percorre os ícones subindo e descendo;
// só passar pelo trilho a caminho do painel leva menos que isso — com 100ms, uma passagem de 120ms já abria o menu.
const SIDEBAR_OPEN_DELAY_MS = 200;
const SIDEBAR_CLOSE_DELAY_MS = 300;

const FOCUSABLE_SELECTOR =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

// Primeiro controle depois do trilho na ordem da página, fora do menu (que vive num portal no fim do body).
function getFirstFocusableAfter(rail, menu) {
  if (!rail) return null;

  return (
    [...document.querySelectorAll(FOCUSABLE_SELECTOR)].find(
      (element) =>
        rail.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING &&
        !rail.contains(element) &&
        !menu?.contains(element) &&
        !element.closest("[hidden]"),
    ) ?? null
  );
}

// Títulos não são nome: "Dra. Maria Souza" vira "MS", não "DM".
const NAME_TITLES = new Set(["dr", "dra", "prof", "profa"]);

function getInitials(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  const nameParts = parts.filter((part) => !NAME_TITLES.has(part.replace(/\.$/, "").toLowerCase()));

  return (nameParts.length > 0 ? nameParts : parts)
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

// No trilho, o clique não move o foco: com o foco num botão do trilho o menu abria já no mousedown, o mouseup caía nele
// e o clique se perdia. Sem foco, o clique chega ao botão, e o foco segue na tela (diálogos o devolvem para lá).
function keepFocusOnPress(event) {
  event.preventDefault();
}

// Sem tooltip no trilho recolhido: o menu abre com os nomes logo em seguida, e a dica só piscava antes de ser coberta.
function NavigationAction({
  accessibleLabel,
  compact,
  disabled,
  icon: Icon,
  itemKey,
  label,
  onClick,
  pointerItemKey,
}) {
  // Destaques colados, como no Gemini e no ChatGPT: com linha de 48px e destaque de 40px, sobrava um vão de 8px, e na
  // troca de item os dois destaques ficavam acesos com uma faixa escura entre eles. No trilho, o destaque é um quadrado
  // do tamanho da marca e do avatar.
  return (
    <div className="flex h-10 items-center" data-navigation-item={itemKey}>
      <Button
        aria-label={accessibleLabel ?? label}
        className={cn(
          "mx-3 grid h-10 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-0 rounded-lg border-0 px-0 text-left",
          compact ? "w-10" : "w-[calc(100%-1.5rem)]",
        )}
        data-pointer-over={pointerItemKey === itemKey || undefined}
        disabled={disabled}
        onClick={onClick}
        onMouseDown={compact ? keepFocusOnPress : undefined}
        size="icon"
        type="button"
        variant="brandNavigation"
      >
        <Icon aria-hidden="true" className="justify-self-center" data-icon="inline-start" />
        {compact ? null : (
          <span className="min-w-0 truncate pr-4 pl-3 transition-opacity duration-150">
            {label}
          </span>
        )}
      </Button>
    </div>
  );
}

function NavigationHeader({ compact }) {
  // Marca invertida: com a tinta a 15%, era igual ao destaque de hover dos itens (1,03:1) e parecia um botão aceso.
  const brandMark = (
    <div
      aria-hidden="true"
      className="grid size-10 place-items-center justify-self-center rounded-lg bg-brand-foreground text-brand"
      data-navigation-item="brand"
    >
      <Activity className="size-5" />
    </div>
  );
  const content = (
    <div className="grid h-16 grid-cols-[4rem_minmax(0,1fr)] items-center">
      {brandMark}
      {compact ? null : (
        <SheetTitle className="min-w-0 truncate pr-4 text-base font-semibold text-brand-foreground">
          Revisão de ECG
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

// Identidade não é controle: sem parada de Tab. As iniciais são decorativas; no trilho, o nome fica só para leitor de tela.
function AccountIdentity({ compact, doctorName, doctorRole }) {
  return (
    <div
      className="grid h-16 grid-cols-[4rem_minmax(0,1fr)] items-center"
      data-navigation-item="account"
    >
      <Badge
        aria-hidden="true"
        className="size-10 justify-center justify-self-center rounded-full bg-brand-foreground/15 text-brand-foreground"
        variant="secondary"
      >
        {getInitials(doctorName)}
      </Badge>
      {compact ? (
        <span className="sr-only">{doctorName}</span>
      ) : (
        <div className="min-w-0 pr-4">
          <p className="truncate text-sm font-semibold">{doctorName}</p>
          <p className="truncate text-xs text-brand-foreground/70">{doctorRole}</p>
        </div>
      )}
    </div>
  );
}

function NavigationSeparator({ compact }) {
  return (
    <Separator
      className={cn(
        "mx-3 my-2 bg-brand-foreground/15",
        compact ? "data-horizontal:w-10" : "data-horizontal:w-auto",
      )}
    />
  );
}

function NavigationPanel({
  compact = false,
  doctorName,
  doctorRole,
  isBusy,
  isDark,
  onHome,
  onLogout,
  onShortcuts,
  onSupport,
  onTheme,
  onTutorial,
  pointerItemKey,
}) {
  // `group/navigation`: com o ponteiro dentro do painel, o destaque salta de item em item; o fade de saída fica para
  // quando ele sai (como no menu do macOS).
  return (
    <div className="group/navigation flex h-full w-72 flex-col">
      <NavigationHeader compact={compact} />

      {/* Destino e ferramentas juntos no topo, separados por uma linha (grupos numa lista só, como no Material); a conta
          fica na base. Com Início sozinho em cima e o resto embaixo, sobrava um vazio e o peso ia todo para baixo. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <div className="flex flex-col">
          <NavigationAction
            compact={compact}
            disabled={isBusy}
            icon={House}
            itemKey="home"
            label="Início"
            onClick={onHome}
            pointerItemKey={pointerItemKey}
          />
          <NavigationSeparator compact={compact} />
          <NavigationAction
            compact={compact}
            icon={HelpCircle}
            itemKey="tutorial"
            label="Tutorial rápido"
            onClick={onTutorial}
            pointerItemKey={pointerItemKey}
          />
          <NavigationAction
            compact={compact}
            icon={Keyboard}
            itemKey="shortcuts"
            label="Atalhos de teclado"
            onClick={onShortcuts}
            pointerItemKey={pointerItemKey}
          />
          <NavigationAction
            compact={compact}
            icon={LifeBuoy}
            itemKey="support"
            label="Contato e suporte"
            onClick={onSupport}
            pointerItemKey={pointerItemKey}
          />
          {/* Nome e ícone do modo para onde o clique leva (lua no claro, sol no escuro), como no cabeçalho do dashboard: o
              estado atual já está na tela inteira. O leitor de tela, sem essa pista, ouve o verbo ("Ativar modo escuro"). */}
          <NavigationAction
            accessibleLabel={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
            compact={compact}
            icon={isDark ? Sun : Moon}
            itemKey="theme"
            label={isDark ? "Modo claro" : "Modo escuro"}
            onClick={onTheme}
            pointerItemKey={pointerItemKey}
          />
        </div>

        <div className="mt-auto flex flex-col pb-2">
          <NavigationSeparator compact={compact} />
          <AccountIdentity compact={compact} doctorName={doctorName} doctorRole={doctorRole} />
          <NavigationAction
            compact={compact}
            disabled={isBusy}
            icon={LogOut}
            itemKey="logout"
            label="Sair da sessão"
            onClick={onLogout}
            pointerItemKey={pointerItemKey}
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
  onLogout,
  onOpenChange,
  onShortcuts,
  onSupport,
  onTutorial,
  triggerRef,
}) {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const popupRef = useRef(null);
  const railRef = useRef(null);
  const focusedItemKeyRef = useRef(null);
  const railPointerItemRef = useRef(null);
  const [pointerItemKey, setPointerItemKey] = useState(null);
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

  // O menu nasce opaco por cima do trilho, e o navegador só dá `:hover` ao item do menu sob o ponteiro alguns quadros
  // depois (50–100ms): o destaque do trilho sumia e voltava. O item que estava sob o ponteiro no trilho já abre destacado,
  // até o primeiro movimento dentro do menu, quando o hover de verdade assume.
  function trackRailPointer(event) {
    railPointerItemRef.current =
      event.target.closest?.("[data-navigation-item] button")?.closest("[data-navigation-item]")?.dataset.navigationItem ??
      null;
  }

  function openMenu() {
    setPointerItemKey(railPointerItemRef.current);
    onOpenChange(true);
  }

  function releasePointerItem() {
    setPointerItemKey(null);
  }

  function openImmediately(event) {
    clearOpenTimer();
    clearCloseTimer();
    rememberTrigger(event);
    focusedItemKeyRef.current =
      event.target.closest?.("[data-navigation-item]")?.dataset.navigationItem ?? null;
    openMenu();
  }

  function scheduleOpen(event) {
    if (expanded) return;

    clearOpenTimer();
    clearCloseTimer();
    rememberTrigger(event);
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      focusedItemKeyRef.current = null;
      openMenu();
    }, SIDEBAR_OPEN_DELAY_MS);
  }

  function handleRailPointerLeave(event) {
    clearOpenTimer();
    railPointerItemRef.current = null;
    // O menu pode abrir no instante em que o ponteiro já sai: ele nasce com a largura do trilho e o ponteiro sai sem ter
    // entrado nele. Sem entrada no menu não há a saída que agenda o fechamento, e a tela ficava escurecida e travada.
    // Fora da árvore do React (ou da janela), o `relatedTarget` do evento sintético é `window`, que não é um Node.
    const enteredMenu = event.relatedTarget instanceof Node && popupRef.current?.contains(event.relatedTarget);
    if (expanded && !enteredMenu) scheduleClose();
  }

  // Apertar um ícone do trilho é clique, não intenção de abrir o menu. Se a abertura por hover caísse entre o apertar e o
  // soltar, o menu cobria o trilho, o soltar caía nele e o navegador não gerava o clique no ícone: a ação se perdia.
  function cancelOpenOnPress() {
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

  // Aberto pelo mouse, o foco fica no próprio painel: focar "Início" o destacava (anel de foco, se a última interação
  // foi de teclado) e deixava Enter pronto para sair do exame. Aberto pelo teclado, segue o item que recebeu o foco.
  function getInitialFocus() {
    const popup = popupRef.current;
    const itemKey = focusedItemKeyRef.current;
    if (!itemKey) return popup ?? true;

    return popup?.querySelector(`[data-navigation-item="${itemKey}"] button:not(:disabled)`) ?? true;
  }

  function closeThen(action) {
    clearOpenTimer();
    clearCloseTimer();
    onOpenChange(false, { restoreFocus: false });
    queueMicrotask(action);
  }

  // Os ícones do trilho estão sempre à vista: agem no primeiro clique, sem esperar o menu, que por hover serve para ler
  // os nomes. O clique cancela a abertura por hover já agendada (o menu não abre por cima do que o clique abriu).
  function actFromRail(action) {
    return () => {
      if (expanded) {
        closeThen(action);
        return;
      }
      clearOpenTimer();
      clearCloseTimer();
      action();
    };
  }

  // Exceção: um desvio não pode encerrar a sessão — o primeiro clique só abre o menu, com "Sair da sessão" escrito sob o
  // cursor, e o segundo confirma (NN/g: ação consequente ao lado de uma frequente pede um passo a mais). A regra nasceu
  // quando o "Voltar" do painel, clicado a cada exame, ficava a 28px do "Sair"; ele saiu em 2026-09-30.
  function openMenuFromRail() {
    clearOpenTimer();
    clearCloseTimer();
    rememberTrigger();
    focusedItemKeyRef.current = null;
    openMenu();
  }

  // Pelo teclado, o menu é uma parada da ordem de Tab, não um beco: Tab depois do último item fecha e segue para o
  // primeiro controle da tela; Shift+Tab antes do primeiro fecha e volta ao começo da página (como o trilho do Carbon).
  // Antes o Tab circulava dentro do menu, e do topo da página só se chegava à tela voltando com Shift+Tab.
  function leaveMenuByTab(event) {
    if (event.key !== "Tab") return;

    const popup = popupRef.current;
    const items = [...(popup?.querySelectorAll("button:not(:disabled)") ?? [])];
    const leavingForward = !event.shiftKey && document.activeElement === items.at(-1);
    const leavingBackward = event.shiftKey && (document.activeElement === items[0] || document.activeElement === popup);
    if (!leavingForward && !leavingBackward) return;

    event.preventDefault();
    clearOpenTimer();
    clearCloseTimer();
    triggerRef.current = leavingForward ? getFirstFocusableAfter(railRef.current, popup) : null;
    if (leavingBackward) document.activeElement?.blur();
    onOpenChange(false);
  }

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="h-svh min-h-0 w-16 overflow-x-hidden overflow-y-hidden border-r border-brand-foreground/10 bg-brand text-brand-foreground"
        onFocusCapture={openImmediately}
        onPointerDown={cancelOpenOnPress}
        onPointerEnter={scheduleOpen}
        onPointerLeave={handleRailPointerLeave}
        onPointerOver={trackRailPointer}
        ref={railRef}
      >
        <NavigationPanel
          compact
          doctorName={doctorName}
          doctorRole={doctorRole}
          isBusy={isBusy}
          isDark={isDark}
          onHome={actFromRail(onHome)}
          onLogout={openMenuFromRail}
          onShortcuts={actFromRail(onShortcuts)}
          onSupport={actFromRail(onSupport)}
          onTheme={actFromRail(toggleTheme)}
          onTutorial={actFromRail(onTutorial)}
        />
      </nav>

      <Sheet open={expanded} onOpenChange={handleSheetOpenChange}>
        {/* Fundo só escurecido, sem desfoque (o DESIGN.md recusa blur de fundo; o overlay base do Sheet também não tem).
            O menu cresce a partir do trilho sempre opaco: com o fade do Sheet, o painel vazava por trás dele na abertura. */}
        <SheetContent
          className="gap-0 overflow-hidden border-brand-foreground/10 bg-brand text-brand-foreground outline-none transition-[width] duration-200 ease-out motion-reduce:transition-none data-ending-style:opacity-100 data-starting-style:opacity-100 data-[side=left]:w-72 data-[side=left]:data-ending-style:w-16 data-[side=left]:data-ending-style:translate-x-0 data-[side=left]:data-starting-style:w-16 data-[side=left]:data-starting-style:translate-x-0 data-[side=left]:sm:max-w-none"
          finalFocus={false}
          initialFocus={getInitialFocus}
          onKeyDown={leaveMenuByTab}
          onPointerEnter={keepOpen}
          onPointerLeave={scheduleClose}
          onPointerMove={releasePointerItem}
          overlayClassName="bg-scrim/28"
          ref={popupRef}
          showCloseButton={false}
          side="left"
        >
          <NavigationPanel
            doctorName={doctorName}
            doctorRole={doctorRole}
            isBusy={isBusy}
            isDark={isDark}
            onHome={() => closeThen(onHome)}
            onLogout={() => closeThen(onLogout)}
            onShortcuts={() => closeThen(onShortcuts)}
            onSupport={() => closeThen(onSupport)}
            onTheme={toggleTheme}
            onTutorial={() => closeThen(onTutorial)}
            pointerItemKey={pointerItemKey}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
