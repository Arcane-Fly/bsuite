---
status: A (Approved/complete — tracking issue bsuite#211 closed 2026-05-12; re-marked 2026-06-11 by docs/roadmap closure audit)
date: 2026-05-04
tracking_issue: GaryOcean428/bsuite#211
target_window: 2026-Q3 (post Phase 3 deploy stabilisation)
---

# TypeScript 6.0 Migration Plan

Tracks the cross-submodule migration from TypeScript 5.x to TypeScript 6.0.x.
TypeScript 6 is the prerequisite for TypeScript 7 (Go-native compiler) and
introduces stricter type narrowing, improved JSX inference, and several
breaking changes. This plan defers the **execution** to a scheduled
maintenance window (target: 2026-Q3) but locks the **scope, evaluation, and
rollout order** today so the work can start when called for.

## Per-app current state

| App | Current TS | Target TS | TS source files | `as any` | `@ts-{ignore,expect-error,nocheck}` | Notes |
|-----|-----------|-----------|-----------------|----------|--------------------------------------|-------|
| business-suite-unified | `~5.9.3` | `^6.0.3` | 185 | 1 | 0 | Vite + React |
| R80.3 | `~5.9.3` | `^6.0.3` | 142 | 0 | 0 | Vite + React, smallest blast radius |
| throughput | `^5.5.3` | `^6.0.3` | 211 | 19 | 1 | Behind on minor version too — bump to 5.9.3 first |
| braden | `^5.9.3` | `^6.0.3` | 338 | 12 | 3 | Vite + React, low risk |
| conduit | `^5.9.3` | `^6.0.3` | 249 | 0 | 0 | Next.js 16 — coordinate with Next types |
| crm7 | `~5.9.3` | `^6.0.3` | 1325 | 3 | 1 | Largest surface — last in rollout |

## Recommended rollout order (smallest blast radius first)

1. **R80.3** (142 files, 0 escape hatches) — test bed for TS 6 lint adjustments.
2. **business-suite-unified** (185 files, 1 escape hatch) — small, central.
3. **throughput** (211 files, 20 escape hatches) — also bumps from 5.5 → 6.0,
   so attempt 5.9 → 6.0 in two PRs to isolate the failures.
4. **braden** (338 files, 15 escape hatches) — production website; do during
   off-peak window.
5. **conduit** (249 files, 0 escape hatches) — must coordinate with Next.js
   16 type definitions; check `@types/react@19` compatibility matrix at
   migration time.
6. **crm7** (1,325 files, 4 escape hatches) — last; bench-tested by all
   prior migrations.

## Per-app PR template

```markdown
## Summary
- Bump `typescript` to `^6.0.3` in `<app>` `devDependencies`.
- Run `pnpm type-check` and address all new diagnostics from TS 6 stricter
  narrowing / JSX inference rules.
- No runtime behavior changes.

## Why
Tracking GaryOcean428/bsuite#211 — TypeScript 6.0 prepares the codebase for
TS 7 (Go-native compiler) and several React 19 type-inference improvements.

## Testing
- [ ] `pnpm type-check` succeeds with zero errors.
- [ ] `pnpm lint` succeeds.
- [ ] `pnpm test` succeeds (unit + integration).
- [ ] `pnpm build` succeeds.
- [ ] Vercel preview deploy is GREEN.
- [ ] Manually exercise primary user flows in the preview (login, dashboard,
      one create-and-save flow).

## Rollback
- `git revert` of this PR restores TS 5.9.3.
- No DB / config changes.

Refs: GaryOcean428/bsuite#211
```

## Pre-flight checklist (run before opening any per-app PR)

1. Confirm the consumer's package manager pins (e.g. `packageManager:
   pnpm@10.30.3` and `.node-version: 24`) match what the migration PR will
   ship — do **not** bump those alongside TS.
2. `npx tsc@6 --noEmit` from outside the bsuite tree (per
   `CLAUDE.md` lockfile rules) to dry-run the type-check, capture the
   error catalog, and triage by category before mass-editing.
3. Categorise errors: (a) genuine bugs unmasked by stricter narrowing, (b)
   benign noise where a precise type annotation suffices, (c) library
   typing gaps requiring `@types/*` updates.
4. If category (c) hits a shared `@bsuite/*` package, bump that package
   first (see CLAUDE.md "Dependency Version Policy" rule 2).

## Known TS 6 breaking changes that touch this codebase

- **Stricter `unknown` narrowing in `try/catch`** — places using
  `catch (e) { if (e.message) … }` will now require `instanceof Error` or
  type-guard helpers.
- **JSX intrinsic element inference** — keys typed as `string` in
  `React.JSX.IntrinsicElements` may need explicit narrowing in helpers
  that programmatically build elements (page-builder consumers).
- **`erasableSyntaxOnly` mode** — TS 6 emits a hint when type-only syntax
  leaks into emit. Adopt opt-in per app for the TS 7 readiness path.
- **`useUnknownInCatchVariables` is on by default** — already enabled in
  most strict configs, but verify each app's `tsconfig.json` does not
  override it back to `any`.

## Per-app child tracking issues

- crm7: GaryOcean428/crm7#433
- conduit: GaryOcean428/conduit#168
- business-suite-unified: GaryOcean428/business-suite-unified#286
- R80.3: GaryOcean428/R80.3#157
- braden: GaryOcean428/braden#188
- throughput: GaryOcean428/throughput#90

## External / scheduling blockers

- **TS 7 release timing** — TS 6 is the staging step; if TS 7 lands before
  Q3, prefer 5.9 → 7 directly via Microsoft's recommended path rather than
  the 6.x intermediate.
- **`@types/react@19` stability** — confirm types release matches the runtime
  `react@19.x` in use across all apps.
- **Vercel build caching** — TS 6 changes the build artifact shape; expect
  a one-off `vercel --prod --force` on first deploy per app.

## Closure criteria for issue #211

The bsuite#211 EPIC closes only when **all six** per-app PRs have:
1. Merged to `development` and then promoted to `main`.
2. Passed CI (type-check + lint + test + build).
3. Deployed GREEN on Vercel production.
4. Had `pnpm type-check` rerun on `main` post-merge with zero errors.

Until then the EPIC stays open with this plan attached and child issues
tracking each app.
