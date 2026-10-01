import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{jsx,tsx}"],
    setupFiles: "./tests/setup.js",
    // Com a suíte inteira em paralelo, testes que passam sozinhos em ~2s (o filtro combinado do DashboardPage digita
    // tecla a tecla e redesenha o painel a cada uma) passavam dos 5s padrão em toda rodada. 15s dão folga sem esconder
    // um teste travado.
    testTimeout: 15000,
  },
});

