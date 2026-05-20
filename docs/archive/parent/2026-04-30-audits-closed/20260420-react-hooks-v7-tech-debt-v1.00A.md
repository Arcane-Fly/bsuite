# React Hooks v7 Tech Debt — Remediation Tracker

**Status:** A (Approved — closed 2026-05-19)
**Owner:** BSuite frontend team
**Surfaced:** 2026-04-20 via `eslint-plugin-react-hooks@7.1.1` upgrade (PR #113 bumped v5→v7; local `node_modules` was stale until this wave)
**Closed:** 2026-05-19 via parent ref-bump PR `chore/bump-react-hooks-v7-cleanup-refs`; submodule PRs: BSU #235 (2026-05-12), braden #290, throughput #179.

## Context

`eslint-plugin-react-hooks` v7 shipped six new rules from the React Compiler linter. Each flags a real-world anti-pattern that can cause subtle bugs (stale renders, cascading re-renders, mutation tracking misses), but fixing each site safely requires per-call judgment — many instances are legitimate "sync from async server data" patterns that the compiler over-flags.

Rather than demote the rules globally and hide the findings, every app surfaced them as warnings in `pnpm lint` output. CI stayed green; tech debt stayed visible. As of 2026-05-19, all three holdouts (BSU, braden, throughput) are clean and the rules are promoted to `error` everywhere.

## Findings per app (final)

| App | Total (start) | Total (final) | Rule severity (final) | Closure PR |
|-----|--------------|---------------|------------------------|-----------|
| business-suite-unified | 47 | 0 | `error` (incompatible-library: off) | bsu#235 (2026-05-12) |
| crm7 | 0 | 0 | n/a — never demoted | — |
| conduit | 0 | 0 | n/a — never demoted | — |
| R80.3 | 0 (post-zustand-selector refactor in Wave 3) | 0 | n/a | — |
| braden | 21 (initial estimate) → 0 (actual at close) | 0 | `error` | braden#290 (2026-05-19) |
| throughput | ~30 → 2 (at close) | 0 | `error` (incompatible-library: off) | throughput#179 (2026-05-19) |

## Remediation plan (executed)

Batched by app. Real refactors only — no `eslint-disable-next-line` shortcuts.

### BSU (47 → 0)
Closed 2026-05-12 in PR #235 wave-2 sweep. Resolution mix:
- Derive-during-render via `useMemo` for cheap computations
- `useReducer` consolidation for related state transitions
- `useSyncExternalStore` for external system integrations
- Targeted `eslint-disable-next-line` with justification only for the canonical "sync server fetch result into local edit buffer" pattern (e.g. `src/pages/ideas/detail.tsx:101`)
- `react-hooks/incompatible-library` set to `off` (informational; flags many legitimate patterns)

### braden (estimated 21 → 0)
The initial 21-warning estimate was from a sweep before the React 19 + compiler-safe refactor wave landed. By the time this tracker was reopened on 2026-05-19, `pnpm lint` reported zero findings. Closure PR (#290) was config-only — promoted all five rules from `warn` to `error` to lock in the invariant.

### throughput (2 final → 0)
Closed 2026-05-19 in PR #179 with real refactors:
- `src/components/dashboard/DashboardContent.tsx`: replaced the effect-driven `captureOrder` mirror with a `useMemo` derived from `ideas + captureOrderOverride`. The override stores explicit user reorders; the merged view tracks idea churn. Eliminates set-state-in-effect without changing observable behaviour.
- `src/components/entity/EntitySelector.tsx`: rewrote the debounced search effect so all `setState` calls happen inside the timeout's async callback (after the `cancelled` guard) rather than synchronously in the effect body. Empty-query branch collapses delay to 0ms so clearing remains near-immediate.
- eslint.config.js: promoted all five v7 rules from `warn` to `error`. `react-hooks/incompatible-library` set to `off` matching BSU.

## Rule promotions (final state)

All five `react-hooks/*` v7 rules at `error` severity in:
- [business-suite-unified/eslint.config.js](../../../business-suite-unified/eslint.config.js)
- [braden/eslint.config.js](../../../braden/eslint.config.js)
- [throughput/eslint.config.js](../../../throughput/eslint.config.js)

`react-hooks/incompatible-library` is `off` in BSU and throughput. braden does not configure that rule (zero current findings; rule registration would be additive if needed later).

## Success criteria (met)

- ✅ Each of the 5 rules errors (not warns) in every D2C-D-electric app's `eslint.config.js`
- ✅ `pnpm lint` returns 0 react-hooks/* warnings across all 6 apps
- ✅ Rule demotion lines removed from eslint configs

## Non-goals (still honoured)

- Rewriting components that legitimately sync server state into local state (e.g. React Hook Form defaultValues, TanStack Query result → edit-mode buffer). These keep targeted `eslint-disable-next-line` + justification.
- Forcing all ref reads into `useState` — many ref-in-render reads (e.g. SchemaBuilder's `pendingConnection`) are paired with re-render-triggering state updates and are safe by construction.

## Cross-references

- Closure PRs: bsu#235, braden#290, throughput#179
- Parent ref-bump PR: `chore/bump-react-hooks-v7-cleanup-refs` (this commit)
- Wave 5 deliverable W5d (this file)
- [business-suite-unified/src/pages/Settings/SchemaBuilder.tsx](../../../business-suite-unified/src/pages/Settings/SchemaBuilder.tsx) — `pendingConnection` ref reads (kept as designed)
- [business-suite-unified/src/pages/ideas/detail.tsx](../../../business-suite-unified/src/pages/ideas/detail.tsx) — canonical `sync-from-server` pattern
