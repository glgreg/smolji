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
- **Formatting & Linting**: Validado via `npx tsc --noEmit` e `npm run lint` (ESLint 9).

## 3. Testing

- **Runner**: Vitest com ambiente `jsdom` e `@testing-library/react`.
- **Pipeline de verificação**: Sempre validar alterações executando `npm test` (`node scripts/remove-ignores.js && npx tsc --noEmit && npm run lint && vitest run --coverage`).
- Funções utilitárias puras (como parsing de emojis e geração de URLs) possuem testes unitários dedicados em `__tests__/emoji.test.ts`; fluxos de UI ficam em `__tests__/App.test.tsx`.

## 4. Documentation

- JSDoc nas funções utilitárias exportadas em `src/utils/`.
- Comentários no código explicam o *porquê* (ex.: decisões de matrizes/transformações no canvas ou tratamento de sequências ZWJ), nunca o óbvio.
- Decisões arquiteturais e invariantes de módulos residem nas stones (`.stone.<id>.md`).
