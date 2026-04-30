# Domain 4 — Packages-Monorepo reconcile

**Status:** F (Frozen)
**Date:** 2026-04-28
**Workstream:** WS-ε (parent monorepo dev↔main reconcile)

## Files

107 modified-both + 2 dev-only + 2 main-only across 10 packages. Plus `packages/tsconfig/` (unchanged).

## Per-package decisions

| Package | Main version | Dev version | Decision | Rationale |
|---------|--------------|-------------|----------|-----------|
| `@bsuite/auth` | 0.1.0 | 0.1.0 | take main | Dev deleted `oauth-client.test.ts` (449 LOC), `__tests__/setup.ts`, `vitest.config.ts`. Per memory `[project_bsuite_auth_tests.md]`, the package ships 24 vitest cases (commit 0417c4e) — those tests must not be lost. Main retains them. |
| `@bsuite/charge-calc` | 0.2.2 | 0.2.1 | take main | Newer version. 0.2.2 adds expense allowance amount handling. |
| `@bsuite/design-tokens` | 0.1.0 (oklch) | 0.1.0 (hex) | take dev | Unused by any consumer (zero `@bsuite/design-tokens` imports across the suite). Dev's hex form is consistent with dev's theme/`.windsurfrules`/CLAUDE.md unwinding of the OKLCH mandate. Either form is functionally equivalent here. |
| `@bsuite/dry-lint` | (does not exist) | 0.2.0 | take dev | Dev-only package (WS-γ multi-writer schema, PR #291). Never on main. |
| `@bsuite/eslint-config` | 0.2.0 | 0.1.0 | take main | Newer version. Adds JSX `style={{ color: '#...' }}` literal scan rule. |
| `@bsuite/nav-core` | 0.5.0 | 0.3.1 | take main | Major version delta (0.3.1 → 0.5.0). Main has mobile-overlay Escape-key handler + the v0.5.0 published API consumed by braden. |
| `@bsuite/schema-registry` | 0.2.1 | (does not exist) | take main | Main-only package. Per spec rule 5 + the 0.2.1 fix from PR #286 (.js extensions for Node strict ESM). |
| `@bsuite/theme` | 0.3.0 (yanked) | 0.3.1 | take dev | Per `docs/20260427-theme-0.3.0-yank-narrative-v1.00A.md`: 0.3.0 was deprecated on npm with pointer to 0.3.1 (preset-v4.css nested-comment bug). All 5 consumers currently resolve to 0.3.1. Dev's 0.3.1 is canonical. |
| `@bsuite/theme-codemod` | 1.0.0 | (does not exist) | take main | Main-only package — codemod toolkit. Preserve. |
| `@bsuite/ui` | 0.1.0 | (does not exist) | take main | Main-only package — shared UI primitives. Preserve. |

## Action

```bash
# From integration branch (based on origin/development):
git checkout origin/main -- packages/auth packages/charge-calc \
    packages/eslint-config packages/nav-core \
    packages/schema-registry packages/theme-codemod packages/ui
# Dev's design-tokens, dry-lint, theme remain (no checkout needed)
```

## tsconfig file pairs (dev-only / main-only)

- Dev-only: `packages/dry-lint/tsconfig.json`, `packages/dry-lint/tsconfig.build.json` — kept (part of dry-lint package, taken from dev).
- Main-only: `packages/ui/tsconfig.json`, `packages/ui/tsconfig.build.json` — kept (part of ui package, taken from main).

## Verification

- All 11 expected packages present: `auth charge-calc design-tokens dry-lint eslint-config nav-core schema-registry theme theme-codemod tsconfig ui`.
- Versions verified at canonical npm-published levels:
  - auth=0.1.0, charge-calc=0.2.2, design-tokens=0.1.0, dry-lint=0.2.0, eslint-config=0.2.0, nav-core=0.5.0, schema-registry=0.2.1, theme=0.3.1, theme-codemod=1.0.0, ui=0.1.0
- `pnpm-lock.yaml` regeneration completed in the final pre-push step.
