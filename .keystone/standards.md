# Engineering Standards

## 1. Version Control

### Commit Messages

- **Format**: Conventional Commits — `<type>(<optional-scope>): <short summary>`
- **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`
- **Scope**: módulo ou stone afetado (`studio`, `emoji-utils`, `app-shell`, `init`, etc.) quando aplicável.
- Commits devem ser atômicos e focados em uma única mudança lógica.

### Pull Requests

- Resumo conciso da mudança e sua motivação.
- Análise de impacto listando as stones afetadas (`keystone stone show <id>`).
- Evidência de execução de `npm test` (cleanup de ignores + typecheck + lint + testes com cobertura).

## 2. Code Conventions

- **Naming**: `camelCase` para variáveis e funções, `PascalCase` para componentes React e interfaces/types (`Layer`, `DragState`), `UPPER_SNAKE_CASE` para constantes de catálogo (`EMOJI_STYLES`, `GRADIENTS`, `POPULAR_EMOJIS`).
- **Proibição de supressões**: Nunca utilizar `@ts-ignore`, `@ts-nocheck` ou `eslint-disable` em `src/`; o script `scripts/remove-ignores.js` apaga essas diretivas automaticamente no pipeline de teste.
- **Formatting & Linting**:
  - Arquivos TypeScript (`.ts`, `.tsx`): validados via `npx tsc --noEmit` e `npm run lint:ts` (ESLint 9 com `eslint-config-next/core-web-vitals` e `eslint-config-next/typescript`).
  - Arquivos JavaScript (`.js`): validados via JSDoc com `npm run lint:js` (`eslint-plugin-jsdoc` + `tsc --allowJs --checkJs --noEmit`).

## 3. Testing

- **Unit & Integration Tests**: Vitest com ambiente `jsdom` e `@testing-library/react` em `__tests__/` (`npm run test:unit`).
- **E2E Tests**: Playwright (`@playwright/test`) em `e2e/` (`npm run test:e2e`), exercitando o estúdio completo sobre o servidor Next.js.
- **Pipeline de verificação e CI**: `npm test` (`node scripts/remove-ignores.js && npx tsc --noEmit && npm run lint && npm run test:unit`) e `npm run test:e2e` rodam automaticamente no GitHub Actions (`.github/workflows/ci.yml`) a cada Pull Request.

## 4. Documentation

- JSDoc nas funções utilitárias exportadas em `src/utils/`.
- Comentários no código explicam o *porquê* (ex.: decisões de matrizes/transformações no canvas ou tratamento de sequências ZWJ), nunca o óbvio.
- Decisões arquiteturais e invariantes de módulos residem nas stones (`.stone.<id>.md`).
