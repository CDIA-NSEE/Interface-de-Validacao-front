import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";

const TEXT_SIZE_KEY = "medpage.textSize";
const TextSizeContext = createContext(null);

// Pelo tamanho do corpo do texto: 14px (padrão), 16px e 18px. Os valores de cada nível ficam em global.css.
export const TEXT_SIZE_OPTIONS = [
  { label: "Padrão", value: "default" },
  { label: "Grande", value: "large" },
  { label: "Muito grande", value: "extra-large" },
];

const TEXT_SIZE_VALUES = new Set(TEXT_SIZE_OPTIONS.map((option) => option.value));

function getInitialTextSize() {
  const storedTextSize = window.localStorage.getItem(TEXT_SIZE_KEY);
  return TEXT_SIZE_VALUES.has(storedTextSize) ? storedTextSize : "default";
}

// Guarda só a preferência: quem aplica é cada tela, com `useApplyTextSize`.
export function TextSizeProvider({ children }) {
  const [textSize, setTextSizeState] = useState(getInitialTextSize);

  const setTextSize = useCallback((nextTextSize) => {
    if (!TEXT_SIZE_VALUES.has(nextTextSize)) return;
    setTextSizeState(nextTextSize);
    window.localStorage.setItem(TEXT_SIZE_KEY, nextTextSize);
  }, []);

  const value = useMemo(() => ({ setTextSize, textSize }), [setTextSize, textSize]);

  return <TextSizeContext.Provider value={value}>{children}</TextSizeContext.Provider>;
}

export function useTextSize() {
  const context = useContext(TextSizeContext);
  if (!context) {
    throw new Error("useTextSize must be used inside TextSizeProvider");
  }
  return context;
}

// Aplica o tamanho escolhido enquanto a tela que chama está montada. Na raiz do documento porque menu lateral, diálogos,
// gaveta e dicas vivem em portais fora da página. Por ora só a tela de revisão chama: o dashboard e o login ainda não
// foram adaptados ao texto maior e seguem no padrão (DESIGN.md › Typography › Tamanho do texto).
export function useApplyTextSize() {
  const { textSize } = useTextSize();

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (textSize === "default") {
      root.removeAttribute("data-text-size");
    } else {
      root.setAttribute("data-text-size", textSize);
    }
    return () => root.removeAttribute("data-text-size");
  }, [textSize]);
}
