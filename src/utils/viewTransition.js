import { flushSync } from "react-dom";

// Aplica uma mudança de estado como View Transition (crossfade entre o DOM antigo e o novo).
// Sem suporte ou com movimento reduzido, aplica na hora. Retorna uma promise que resolve ao terminar.
export function runViewTransition(update) {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (typeof document.startViewTransition !== "function" || reducedMotion) {
    update();
    return Promise.resolve();
  }
  return document.startViewTransition(() => flushSync(update)).finished;
}
