# MedPage Front

Interface React + Vite da Plataforma de Revisao de ECG.

## Requisitos

- Node.js compativel com Vite 6
- API do MedPage Back em execucao

## Configuracao

Crie um arquivo `.env` a partir de `.env.example` quando precisar apontar para uma API diferente da local.

```env
VITE_API_URL=http://localhost:8000
```

Se `VITE_API_URL` nao for definido, o front usa `http://localhost:8000`.

## Rodar localmente

```bash
npm install
npm run dev
```

URL padrao do Vite:

```text
http://localhost:5173
```

## Build e preview

```bash
npm run build
npm run preview
```

## Contrato com o back

O front consome a API HTTP do MedPage Back com token Bearer salvo no navegador. Os principais endpoints usados ficam nos arquivos em `src/services`.

Ao mudar endpoints, payloads, autenticacao ou CORS no back, valide o fluxo completo do front: login, dashboard, fila, abertura de exame e carregamento de imagem.
