# React Hooks v7 Tech Debt — Remediation Tracker

**Status:** W (Working)
**Owner:** BSuite frontend team
**Surfaced:** 2026-04-20 via `eslint-plugin-react-hooks@7.1.1` upgrade (PR #113 bumped v5→v7; local `node_modules` was stale until this wave)

## Context

`eslint-plugin-react-hooks` v7 shipped six new rules from the React Compiler linter. Each flags a real-world anti-pattern that can cause subtle bugs (stale renders, cascading re-renders, mutation tracking misses), but fixing each site safely requires per-call judgment — many instances are legitimate "sync from async server data" patterns that the compiler over-flags.

Rather than demote the rules globally and hide the findings, every app surfaces them as warnings in `pnpm lint` output. CI stays green; tech debt stays visible.

## Findings per app (as of 2026-04-20)

| App | Total | `set-state-in-effect` | `refs` | `purity` | `immutability` | `preserve-manual-memoization` | `incompatible-library` |
|-----|-------|-----------------------|--------|----------|----------------|-------------------------------|------------------------|
| business-suite-unified | 47 | 30 | 6 | 4 | 4 | 3 | 0 |
| crm7 | ~0 surfaced — investigate | — | — | — | — | — | — |
| conduit | N/A | — | — | — | — | — | — |
| R80.3 | 0 (clean post-zustand-selector refactor in Wave 3) | — | — | — | — | — | — |
| braden | 0 (smaller surface) | — | — | — | — | — | — |
| throughput | 139 (incl. pre-existing non-hooks warnings) | ~30 | — | — | — | — | — |

## Outstanding (2026-04-22 — post N.7.a re-baseline)

Part N.7.a (bsuite#228) re-captured lint baselines after aligning all
five D2C apps to `lucide-react@1.8.0` + `eslint-plugin-react-hooks@7.1.1`.
Deltas observed in the worktree runs:

| App | Before N.7.a | After N.7.a | Delta | PR |
|-----|--------------|-------------|-------|-----|
| conduit | 0 | 0 | 0 | [conduit#87](https://github.com/GaryOcean428/conduit/pull/87) |
| R80.3 | 0 | 0 | 0 | [R80.3#90](https://github.com/GaryOcean428/R80.3/pull/90) |
| braden | 21 | 21 | 0 | [braden#144](https://github.com/GaryOcean428/braden/pull/144) |

No new warnings were unmasked by N.7.a because all three apps were
already on `eslint-plugin-react-hooks@7.1.1` — conduit via the
transitive from `eslint-config-next`, R80.3 via commit f518d65, braden
via prior cycle. N.7.a promoted the direct devDep pin in conduit for
consistency.

**braden surfaced 21 react-hooks warnings** that the earlier table
reported as 0 (because the doc pre-dated the v7.1.1 consumption in
braden's local lint runs). The breakdown:

- `react-hooks/purity`: ~5 occurrences (most in setting async-error-throw
  code paths inside render functions — pattern matches BSU's
  `sync-from-server` justification)
- `react-hooks/immutability`: ~13 occurrences (mutation of captured
  locals inside handlers that close over state)
- `react-hooks/preserve-manual-memoization`: 1 occurrence
- `react-hooks/incompatible-library`: 1 occurrence (likely
  `@tanstack/react-query` devtools or similar — compiler over-flag)
- 1 unused `eslint-disable` directive (easy cleanup)

braden's `lint` script is `eslint .` (no `--max-warnings 0` gate), so
these do not block husky pre-commit or CI. They should be batched into
a follow-up remediation PR using the same pattern the BSU 47 are being
worked through. Target: tighten `pnpm lint` to `--max-warnings 0` after
the count drops to zero, matching conduit and R80.3.

## Remediation plan

Batch into rule-specific PRs (roughly 1 per rule per app). Each PR:
1. Runs `pnpm lint` to list current offenders of that rule
2. Reads each offender; classifies as:
   - **Derive-during-render**: cheap computation → inline, drop the useEffect
   - **useMemo**: expensive computation → swap useEffect+setState for useMemo
   - **useSyncExternalStore**: external system integration → proper API
   - **Legitimate async sync-from-server**: add `// eslint-disable-next-line react-hooks/set-state-in-effect -- syncing tanstack-query result into local edit buffer` with a one-line justification
3. Commits the fix batch, re-runs lint, confirms count drops

## Rule demotions (current state)

Demoted to `warn` in these eslint configs:

- [business-suite-unified/eslint.config.js](../business-suite-unified/eslint.config.js)
- [throughput/eslint.config.js](../throughput/eslint.config.js)

The demotion is a time-boxed measure. Once the remediation PRs land and the counts drop to zero, promote each rule back to `error` in the eslint config. Enforcement is then automatic.

## Success criteria

- Each of the 5 rules errors (not warns) in every app's `eslint.config.js`
- `pnpm lint` returns 0 react-hooks/* warnings across all 6 apps
- Rule demotion lines removed from eslint configs

## Non-goals

- Rewriting components that legitimately sync server state into local state (e.g. React Hook Form defaultValues, TanStack Query result → edit-mode buffer). These stay with targeted `eslint-disable-next-line` + justification.
- Forcing all ref reads into `useState` — many ref-in-render reads (e.g. SchemaBuilder's `pendingConnection`) are paired with re-render-triggering state updates and are safe by construction.

## Cross-references

- Wave 5 (this file is the deliverable for W5d)
- [business-suite-unified/src/pages/Settings/SchemaBuilder.tsx:358-361](../business-suite-unified/src/pages/Settings/SchemaBuilder.tsx#L358-L361) — `pendingConnection` ref reads (6 of the `refs` findings)
- [business-suite-unified/src/pages/ideas/detail.tsx:101](../business-suite-unified/src/pages/ideas/detail.tsx#L101) — canonical `sync-from-server` pattern
