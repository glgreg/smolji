# Architecture

## 1. System Overview

Aplicação web sobre Next.js App Router composta por duas rotas principais sob identidade visual unificada (**Printmaker's Stamp Foundry**: superfícies Drafting Paper no claro, Graphite Cutting Mat no escuro e destaque tipográfico/interativo em Vermilion ink):

- **`/` (`src/app/page.tsx`)**: Landing page pública em Server Component com cabeçalho responsivo (`SiteHeader`), hero assimétrico, provador interativo de espécimes (`LandingSpecimen`), catálogo comparativo das 11 famílias de emojis (`#styles`), guia em 3 etapas (`#workflow`), FAQ nativo em `<details>` (`#faq`) e múltiplos CTAs diretos para `/playground` sem exigência de login.
- **`/playground` (`src/app/playground/page.tsx`)**: Rota dedicada do estúdio interativo. Carrega `src/App.tsx` via `PlaygroundClient.tsx` (`next/dynamic` com `ssr: false`) para executar composição multicamadas em Canvas 2D, controle de visibilidade/transformações, empacotamento ZIP e uploads opcionais inteiramente no cliente.

## 2. Technology Stack

- **Language / Runtime**: TypeScript 5 em Node.js / Browser (ES2017+)
- **Frameworks**: Next.js 16.2.10 (App Router), React 19.2.4, Tailwind CSS v4 (`@tailwindcss/postcss`), fontes Google auto-hospedadas via `next/font/google` (`Bricolage_Grotesque`, `Plus_Jakarta_Sans`, `JetBrains_Mono`)
- **Libraries**: `gemoji` (catálogo e shortcodes de emojis), `jszip` (exportação de pacotes ZIP), `gifuct-js` (decodificação GIF quadros/disposal), `omggif` (codificação GIF89a no navegador), `lucide-react` (ícones)
- **Testing & Quality**: Vitest 4 com `jsdom`, `@testing-library/react` e `@vitest/coverage-v8` (`__tests__/`), Playwright (`@playwright/test`) em `e2e/`, ESLint 9 (`eslint-config-next/typescript` em TS/TSX e `eslint-plugin-jsdoc` + `tsc --checkJs` em JS), `scripts/remove-ignores.js` e GitHub Actions CI (`.github/workflows/ci.yml`).

## 3. Structure and Patterns

- **Directory layout**:
  - `src/app/`: Shell do App Router (`layout.tsx`, `page.tsx`, `playground/page.tsx`, `globals.css`).
  - `src/components/`: Ilhas e controles compartilhados (`SiteHeader.tsx`, `SiteThemeToggle.tsx`, `SmoljiMark.tsx`, `LandingSpecimen.tsx`, `PlaygroundClient.tsx`, `StudioControls.tsx`).
  - `src/types/` & `src/types.ts`: Contratos TypeScript compartilhados (`Layer`, `UploadedHistory`, `ContextMenuState`, `DragState`) e declarações de tipos para `omggif` e atributos da plataforma web.
  - `src/App.tsx`: Estúdio interativo do `/playground` (camadas de emojis, emojis animados e imagens externas/clipboard, playback ao vivo em `<canvas>`, atalhos de teclado, exportação PNG/GIF/ZIP e `<dialog>` modal).
  - `src/utils/`: Domínio puro (`emoji.ts` para estilos/gradientes, grafemas ZWJ, CDN e uploads; `gif.ts` para decodificação animada GIF/WebP/APNG e quantização/codificação GIF89a; `image.ts` para ingestão de arquivos/clipboard/drag-drop e geometria por proporção; `theme.ts` para resolução e sincronização de esquema claro/escuro).
  - `__tests__/`: Testes unitários e de integração (`App.test.tsx`, `app-shell.test.tsx`, `emoji.test.ts`, `gif.test.ts`, `image.test.ts`, `remove-ignores.test.ts`).
  - `e2e/`: Testes end-to-end com Playwright (`studio.spec.ts`), cobrindo `/` e `/playground`.
  - `scripts/remove-ignores.js`: Gate pré-teste que remove diretivas de supressão em `src/`.
- **Data flow**:
  1. Visitantes em `/` testam estilos e recortes em `LandingSpecimen` e entram sem bloqueios ou login em `/playground`.
  2. Em `/playground`, entradas de texto (`:shortcodes:`), busca por palavra-chave, clique no catálogo, upload, drag-and-drop ou colagem de imagem do clipboard adicionam `Layer`s (`emoji` ou `image`) ao artboard lógico `512x512`, desenhado reativamente no Canvas 2D (`render2D`) com playback contínuo para camadas animadas.
  3. Exportações (`PNG`, `GIF` animado ou quadro único, clipboard, `ZIP`, `ImgBB`/`Imgur`) reutilizam `render2D(..., isExport = true)` com fidelidade geométrica de `64px` a `2048px`.

## 4. Integration Points

- **Emoji Asset CDN**: `https://emoji-cdn.mqrio.dev/<emoji>?style=<style>` fornece gráficos rasterizados para todos os 11 estilos (`microsoft-3D-fluent`, `google`, `apple`, `twitter`, `openmoji`, `animated-noto-color-emoji`, etc.).
- **Image Hosting APIs**: ImgBB (`https://api.imgbb.com/1/upload`) e Imgur (`https://api.imgur.com/3/image`) com credenciais opcionais armazenadas apenas em `localStorage`.

## 5. Constraints

- **Client-only rendering para o Studio**: `src/App.tsx` lê `localStorage` e usa `HTMLCanvasElement`; sempre carregado via `PlaygroundClient` com `ssr: false`.
- **Entrada sem atrito em `/playground`**: Nenhum fluxo de login, cadastro ou paywall bloqueia o acesso ao editor.
- **Zero-ignore gate**: `npm test` remove `@ts-ignore`, `@ts-nocheck` e `eslint-disable` de `src/` antes do typecheck/lint/test.
- **Next.js 16 & Modern Web**: Seguir guias em `node_modules/next/dist/docs/` e melhores práticas Web verificadas.
- **Licenciamento de ativos**: O estilo padrão permanece `microsoft-3D-fluent` (MIT) com atribuição visível tanto em `/` quanto no modal de configurações do estúdio ([LEGAL_ANALYSIS.md](../LEGAL_ANALYSIS.md)).

## 6. Stone Index

Generated by `keystone stone create` and `keystone stone doctor --fix`. Do not edit between the markers.

<!-- keystone:index:start -->
| Stone | Type | Location | Summary |
| --- | --- | --- | --- |
| `studio` | module | [src](../src/.stone.studio.md) | Interactive multi-layer canvas studio mounted at /playground for composing, animating, transforming, and exporting emoji and external image stickers (PNG/GIF, 64px–2048px). |
| `app-shell` | module | [src/app](../src/app/.stone.app-shell.md) | Next.js App Router shell routing `/` to the Stamp Foundry landing page and `/playground` to the client-only Studio with shared typography and Paper/Graphite theme tokens. |
| `emoji-utils` | integration | [src/utils](../src/utils/.stone.emoji-utils.md) | Emoji grapheme parsing, CDN asset resolution, style/gradient catalogs, client-side image hosting uploads, and cross-route theme synchronization. |
| `media-utils` | module | [src/utils](../src/utils/.stone.media-utils.md) | Client-side animated GIF/WebP/APNG decoding, Median Cut quantization and encoding, and external/clipboard image asset ingestion. |
<!-- keystone:index:end -->
