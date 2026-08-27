# MedPage Front

Interface de validação médica de ECG construída com React 19, Vite 8, Tailwind CSS 4 e ShadCN Base UI no preset Nova.

## Requisitos

- Node.js 20.19+ ou 22.12+
- API do MedPage Back em execução
- Navegador moderno: Safari 16.4+, Chrome 111+ ou Firefox 128+

## Configuração

Crie um arquivo `.env` a partir de `.env.example` quando precisar apontar para uma API diferente da local:

```env
VITE_API_URL=http://localhost:8000
```

Sem `VITE_API_URL`, o frontend usa `http://localhost:8000`.

## Desenvolvimento

```bash
npm install
npm run dev
```

O Vite fica disponível em `http://localhost:5173`.

## Testes e build

```bash
npm test
npm run test:ui
npm run build
npm run preview
```

- `npm test`: regras de domínio executadas pelo test runner nativo do Node.js.
- `npm run test:ui`: componentes e fluxos React executados pelo Vitest.
- `npm run build`: bundle de produção gerado pelo Vite.

## Design system

O projeto usa componentes locais em `src/components/ui`, gerenciados pelo ShadCN e baseados em Base UI. A configuração está em `components.json`; tokens semânticos, tema e regras geométricas do ECG ficam em `src/styles/global.css`.

Para consultar ou adicionar um componente, use a CLI oficial sem sobrescrever os componentes existentes:

```bash
npx shadcn@latest docs <componente>
npx shadcn@latest add <componente>
```

## Contrato com o backend

O frontend consome a API HTTP do MedPage Back com token Bearer salvo no navegador. Os principais endpoints ficam em `src/services`.

Ao mudar endpoints, payloads, autenticação ou CORS no backend, valide o fluxo completo: login, dashboard, fila, abertura de exame e carregamento da imagem.
