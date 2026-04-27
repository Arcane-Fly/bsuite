# Codex Phase 2 — Shared Packages Execution Plan

**Status:** W (Phase 2 implementation complete on development; Phase 3 pickup)
**Date:** 2026-04-28
**Authority:** `docs/20260427-roadmaps-audits-plans-outstanding-work-ledger-v1.00W.md` Priority 2; Codex operating prompt §5 Phase 2.
**Predecessor:** `docs/20260428-finish-line-final-signoff-v3.00W.md` (closes WS-η — Phases 0+1+ε complete).

---

## Why Phase 2 starts here

Phases 0 (operator/security items, except 4 genuine operator-only items in v3.00W) and 1 (branch reconcile across all 7 repos) are complete. Phases 4-11 in the ledger consume shared packages. Without Phase 2 ratification, downstream work duplicates effort across 4 D2C apps (BSU, CRM7, Conduit, R80.3) and braden corporate.

The four shared-package workstreams in this Phase are sequential within a single session but each has its own red-team gate.

---

## Current shared-package inventory (verified 2026-04-28)

| Package | Version | Source | Status |
|---|---|---|---|
| `@bsuite/auth` | 0.1.0 | `packages/auth/` | ✅ shipped, consumed by 5 client apps |
| `@bsuite/charge-calc` | 0.2.2 | `packages/charge-calc/` | ✅ shipped, consumed by CRM7 + R80.3 |
| `@bsuite/design-tokens` | 0.1.0 | `packages/design-tokens/` | ✅ shipped |
| `@bsuite/dry-lint` | **0.2.0** | `packages/dry-lint/` | ✅ shipped; writers schema; error-level consumer enforcement |
| `@bsuite/eslint-config` | 0.2.0 | `packages/eslint-config/` | ✅ shipped |
| `@bsuite/nav-core` | 0.5.0 | `packages/nav-core/` | ✅ shipped, consumed by braden |
| `@bsuite/schema-registry` | 0.2.2 | `packages/schema-registry/` | ✅ shipped; browser-safe React helpers; consumers aligned |
| `@bsuite/theme` | 0.3.3 | `packages/theme/` | ✅ shipped; platform-logo helpers; consumers migrated |
| `@bsuite/theme-codemod` | 1.0.0 | `packages/theme-codemod/` | ✅ shipped |
| `@bsuite/ui` | 0.1.0 | `packages/ui/` | ✅ shipped |
| **`@bsuite/page-builder`** | 0.1.0 | `packages/page-builder/` | ✅ extracted; BSU, CRM7, Conduit, and R80.3 consume npm package |

Total: 10 published + 1 missing = 11 packages on the roadmap.

### App-local PageGridLayout duplicate inventory

Resolved by `@bsuite/page-builder@0.1.0`. The four apps now keep thin adapters
only where app-specific preferences, permissions, or editor events differ.

---

## Workstream 2A — `@bsuite/page-builder` extraction

### Why first

Phases 4 (schema/page-builder UX rebuild) and 5 (DRY ownership) both depend on a single canonical page-builder. Without extraction, Phase 4's UX rebuild work would land in 4 places.

### Pick the canonical source

Run `git log --follow` on each of the 4 PageGridLayout.tsx + 4 usePageGridLayout.ts to find the most-evolved version. Heuristic: largest LOC + most recent commit date. Likely CRM7 (474 LOC) or BSU (454 LOC) per the ledger's "likely BSU or CRM7."

**Decision rule:** if both BSU and CRM7 versions are equally evolved (within 10% LOC + same dnd-kit + react-grid-layout API surface), take **CRM7's** version because it's the canonical Universal Canvas surface per frozen #11.

### Extract to `packages/page-builder/`

```
packages/page-builder/
├── package.json                # @bsuite/page-builder@0.1.0
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
├── README.md
├── src/
│   ├── index.ts                # barrel: PageGridLayout, usePageGridLayout, types
│   ├── PageGridLayout.tsx      # canonical from CRM7 (or BSU if equivalent)
│   ├── hooks/
│   │   └── usePageGridLayout.ts
│   ├── types.ts                # WidgetConfig, GridLayout, BreakpointMap
│   └── widgets/                # if widget-registry pattern is canonical
└── tests/
    ├── PageGridLayout.test.tsx
    └── usePageGridLayout.test.ts
```

### Dependencies (from current PageGridLayout source)

- `react-grid-layout` (canonical grid implementation)
- `@dnd-kit/core` + `@dnd-kit/sortable` (drag-drop primitives)
- `peerDependencies`: `react@^19.0.0`, `react-dom@^19.0.0`, `@bsuite/design-tokens@^0.1.0`

### Breakpoint map (from session E prompt WS-2)

```typescript
export const BREAKPOINTS = {
  xs: { cols: 2, breakpoint: 0 },
  sm: { cols: 3, breakpoint: 640 },
  md: { cols: 4, breakpoint: 768 },
  lg: { cols: 6, breakpoint: 1024 },
  xl: { cols: 12, breakpoint: 1280 },
} as const;
```

### Edit-mode side-panel for in-place add (WS-2 deliverable)

Resize handles + edit-mode toggle: read the canonical CRM7 surface, copy verbatim, name `<EditModePanel>` and export.

### Tests

- 12 unit tests covering: grid layout persistence, breakpoint switching, widget add/remove, resize, drag-reorder, edit-mode toggle, dnd-kit integration, RGL integration, type-correct widget config, error-boundary fallback

### Publish to npm

```bash
cd packages/page-builder
pnpm build
pnpm test
pnpm publish --access public
```

**Verify:** `npm view @bsuite/page-builder@0.1.0` returns the manifest.

### Migrate 4 consumers

For each app (BSU, CRM7, Conduit, R80.3):

1. Bump `@bsuite/page-builder: "^0.1.0"` in `package.json`. Lockfile regen out-of-tree per CLAUDE.md recipe.
2. Replace local imports:
   ```diff
   - import { PageGridLayout } from '@/components/platform/PageGridLayout';
   - import { usePageGridLayout } from '@/hooks/usePageGridLayout';
   + import { PageGridLayout, usePageGridLayout } from '@bsuite/page-builder';
   ```
3. Delete app-local `src/components/platform/PageGridLayout.tsx` + `src/hooks/usePageGridLayout.ts`.
4. Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build` per app.
5. Open per-app PR. Merge after green CI.
6. Bump submodule pointer in parent.

### DoD §2A

- `@bsuite/page-builder@0.1.0` on npm registry
- 4 consumer PRs merged with green CI
- `find -name "PageGridLayout.tsx" -not -path "*/node_modules/*" -not -path "./packages/*"` returns 0 matches
- Memory key `bsuite_phase2a_page_builder_extracted`
- Independent red-team subagent confirms zero regressions on each consumer's PageGridLayout-rendering pages (BrowserBase smoke vs pre-migration baseline)

---

## Workstream 2B — `@bsuite/schema-registry` consumer reconciliation

The ledger says "consumers exist, but local source is absent." That was true at v1.00W ratification. Verified 2026-04-28: `packages/schema-registry/` exists at version 0.2.1 with `.js`-extension Node strict ESM compliance fix from PR #286.

### What's left

- Verify all 4 consumers (BSU, CRM7, Conduit, R80.3) resolve `@bsuite/schema-registry@0.2.1` correctly (no workspace overrides; fresh-clone install passes typecheck).
- Reconcile CRM7 schema-builder vs page-builder vs consumer expectations against single registry. Per ledger §4, this is integral to Phase 4 schema-builder rebuild.

### DoD §2B

- All consumers resolve to npm-published 0.2.1 (no `workspace:*`, no `file:`)
- Schema-registry tests pass on a clean clone
- Memory key `bsuite_phase2b_schema_registry_consumers_aligned`

---

## Workstream 2C — `@bsuite/theme@0.3.3` consumer migration

### Verify version

The ledger references 0.3.3 with platform-logo helpers. Verified 2026-04-28: `packages/theme/package.json` shows 0.3.1.

**Action:** investigate whether 0.3.3 was published to npm but never bumped in source, OR whether 0.3.3 is a planned-not-shipped version. Run `npm view @bsuite/theme versions --json`. If 0.3.3 doesn't exist on npm, bump local source 0.3.1 → 0.3.3 with `resolvePlatformLogo()` + `usePlatformLogo()` helpers, build, publish.

### Helpers to ship

```typescript
// packages/theme/src/react/platform-logo.ts
export function resolvePlatformLogo({
  tenantId,
  appSlug,
}: { tenantId: string; appSlug: string }): string {
  // Three-tier: tenant_app_branding → tenant_branding → platform_branding → D2C default
}

export function usePlatformLogo({
  tenantId,
  appSlug,
}: { tenantId: string; appSlug: string }): { url: string; loading: boolean; error: Error | null } {
  // React hook wrapping resolvePlatformLogo with TanStack Query + Realtime invalidation
}
```

### Consumer migration

For each app that has app-local logo/path fallback logic:

1. Bump `@bsuite/theme` to `^0.3.3`
2. Replace local logic with `resolvePlatformLogo()` / `usePlatformLogo()`
3. Delete app-local fallback code
4. Verify typecheck + build

### DoD §2C

- `@bsuite/theme@0.3.3` on npm registry
- All consumers migrated; zero app-local logo-resolution helpers
- Memory key `bsuite_phase2c_theme_logo_consumers_migrated`

---

## Workstream 2D — `@bsuite/dry-lint` warn → error promotion

### State (updated 2026-04-27)

WS-γ landed `@bsuite/dry-lint@0.2.0` with multi-writer schema. Phase 2D promoted
consumer enforcement to `error` across BSU, CRM7, Conduit, R80.3, Braden, and
Throughput.

Red-team correction: the first promotion pass still relied on checkout-path app
detection in several apps, which can make `no-cross-app-write` inert in isolated
worktrees. The hardening follow-up pins `appOverride` per app and separates
ownership enforcement from token-rule ignore lists.

Merged evidence:

- Parent docs/lockfile: bsuite PR #310, commit `97ee59b`
- BSU: PR #213, commit `28fa10a`
- CRM7: PR #326, commit `3e64e301`
- Conduit: PR #133, commit `b321a87`
- R80.3: PR #116, commit `51664be`
- Braden: PR #163, commit `40f51ef`
- Throughput: PR #57, commit `378a4cd`
- App-override hardening:
  - BSU PR #214, commit `297593b`
  - CRM7 PR #327, commit `16f3104`
  - Conduit PR #134, commit `e51e4b6`
  - R80.3 PR #117, commit `d7bbf5d`
  - Braden PR #164, commit `7297279`
  - Throughput PR #58, commit `42b7a97`

### Tighten ownership map

Complete in `@bsuite/dry-lint@0.2.0`: `tenants` and `user_tenants` use
`writers: ["bsu", "crm7"]`, and `teams` plus `team_invitations` are mapped to
BSU with read access for consumer apps.

### Promote warning → error

Complete:

1. Base consumer configs set `'bsuite/no-cross-app-write': 'error'`.
2. R80.3 and Braden now depend on `@bsuite/dry-lint@^0.2.0`.
3. Existing legacy write paths are isolated by narrow per-file overrides only.
4. Each consumer config passes `appOverride` so temporary worktrees and
   independently cloned repos cannot silently disable the rule.
5. Local verification: `pnpm lint` passed in all six app worktrees with zero
   dry-lint errors.

### DoD §2D

- [x] `bsuite/no-cross-app-write` is `error` in BSU, CRM7, Conduit, R80.3,
  Braden, and Throughput eslint configs.
- [x] `bsuite/no-cross-app-write` uses explicit `appOverride` in all six
  consumer configs.
- [x] No consumer uses `bsuiteDryLint.configs.warn`.
- [x] No `workspace:*`, `file:../packages`, or `link:` `@bsuite/*` dependency
  was introduced.
- [x] `@bsuite/dry-lint` build/test passed: 47 tests.
- [x] Memory key `bsuite_phase2d_dry_lint_error_mode`.

---

## Workstream 2E — Charge calc + nav convergence (final cleanup)

### Verify

- `@bsuite/charge-calc@0.2.2` consumed by CRM7 + R80.3 via npm dep (NOT `workspace:*` or `file:`).
- `@bsuite/nav-core@0.5.0` consumed by braden via npm dep.

### Action

If any remaining `workspace:*` or `file:` references — convert to npm pins per CLAUDE.md.

### DoD §2E

- `rg "workspace:\*" packages/*/package.json` returns 0 matches
- `rg "file:\.\./packages" --glob "**/package.json"` returns 0 matches
- Memory key `bsuite_phase2e_workspace_pins_eliminated`

---

## Phase 2 sequence + red-team gate

```
2A page-builder extraction → red-team → consumer migration → red-team → merge
                                                 ↓
2B schema-registry consumer alignment ← (independent; can parallelise with 2A)
                                                 ↓
2C theme@0.3.3 + platform-logo helpers ← (independent; can parallelise with 2A/2B)
                                                 ↓
2D dry-lint warning → error
                                                 ↓
2E charge-calc + nav workspace-pin verification (final cleanup)
                                                 ↓
                          MEMORY: bsuite_phase2_complete
```

**Per-WS red-team gate:** independent subagent verifies (a) zero app-local duplicates, (b) every consumer's lockfile resolves to published version (no workspace overrides), (c) typechecks pass on clean clone, (d) BrowserBase smoke vs pre-migration baseline shows zero regressions on the affected surfaces.

---

## Risk inventory

1. **Page-builder canonical pick disagreement:** if BSU and CRM7 versions diverge on dnd-kit / RGL API, picking one breaks the other. **Mitigation:** if equivalent, pick CRM7 per frozen #11 Universal Canvas. If genuinely divergent, surface binary to operator with the specific API gaps.

2. **Theme 0.3.3 publish conflict:** if 0.3.3 was already published with different content, our local-source bump would duplicate. **Mitigation:** `npm view @bsuite/theme versions --json` first; if 0.3.3 exists, source-only-bump to 0.3.4.

3. **Dry-lint error mode breaks pre-existing violation file:** without finishing Category B kill-shot, error-mode flips will fail CI on schemaBuilderService.ts. **Mitigation:** complete Category B BEFORE flipping. Track via `bsuite_phase2d_category_b_complete` memory key as gate.

4. **Submodule pointer drift:** any consumer migration that doesn't bump submodule pointer leaves parent stale. **Mitigation:** submodule pointer bump is the LAST step of each WS, after consumer PR merges.

5. **Lockfile churn in bsuite tree:** running `pnpm install` inside the bsuite tree embeds `..` paths and breaks Vercel. **Mitigation:** mandatory CLAUDE.md recipe — regenerate from `~/<app>_lockgen/` outside the bsuite tree.

---

## Skills + MCPs (per Codex operating prompt §3)

**Skills:** `master-orchestration`, `dispatching-parallel-agents`, `multi-agent-red-team-implementation`, `verification-before-completion`, `git-workflow`, `best-practice-research` (research current React 19 + dnd-kit + react-grid-layout patterns before §2A starts), `code-quality-enforcement` (§2D), `frontend-backend-mapping` (§2C theme + Supabase RPC).

**MCPs:**
- `Context7`: `dnd-kit/core`, `react-grid-layout`, `@bsuite/auth` patterns, OAuth 2.1 if Phase 3 surface bleed
- `Tavily`: "react-grid-layout shared library 2026", "monorepo published package consumed by independently deployed apps", "ESLint custom rule cross-package ownership 2026"
- `github` for PR coordination across 5 repos (parent + 4 consumer apps)
- `Vercel` for preview deploy verification per consumer
- `BrowserBase` for visual smoke vs pre-migration baseline

---

## Later Ledger Phases

These move to Phases 4-9 per the ledger:

- Schema-builder UX rebuild (Phase 4)
- Page-builder direct-manipulation rebuild (Phase 4 §4e — depends on 2A package being shipped)
- DRY one-shot ownership write-redirection (Phase 5 — uses 2D's error-mode rule as enforcement)
- CRM7 product WS-2..9 (Phase 6)
- AI Phase 2-5 + modernization (Phase 7)
- BSU platform admin (Phase 8)
- App-specific closures (Phase 9)
- Docs hygiene (Phase 10)

---

## Pickup checklist for Phase 3

Before starting Phase 3:

- [ ] Read this doc end-to-end.
- [ ] Read the ledger Priority 3 auth runtime smoke section.
- [ ] Confirm all Phase 2 development PRs remain merged.
- [ ] Confirm preview deploys remain READY for the apps touched by Phase 2D.

Begin Phase 3 auth runtime smoke.
