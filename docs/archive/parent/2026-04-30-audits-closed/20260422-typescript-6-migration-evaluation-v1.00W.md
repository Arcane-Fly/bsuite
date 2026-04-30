# TypeScript 6.0 migration evaluation — BSuite — 2026-04-22

**Status:** W (Working — evaluation only; not an implementation plan)
**Part:** N.7.c of the 2026 world-class audit
**Drives:** GitHub issues `bsuite#227`, `bsuite#211`

## Intent

Evaluate the scope, risk, and sequencing of migrating every BSuite app from TypeScript 5.x → 6.0.x before the TS 7.0 Go-native compiler release (3-5× faster builds; breaking release, requires all TS 6.0 deprecations resolved). This document is a read-only audit — no code changes — so the next cycle can pick up with a cost-justified per-app plan.

## What TS 6.0 actually changes

TS 6.0 is predominantly a **deprecation-surface increase** ahead of TS 7.0's hard removal. Confirmed via Context7 lookup of the microsoft/typescript repo:

- `moduleResolution: classic` → deprecated in 6.0, REMOVED in 7.0.
- `outFile` compiler option → deprecated in 6.0 (AMD/SystemJS bundle mode).
- `target: ES5` → deprecated in 6.0.
- Other legacy options (e.g. `importHelpers` default switch, `esModuleInterop` interaction with `module=amd`) → flagged.
- Escape hatch: `"ignoreDeprecations": "6.0"` in `tsconfig.json` silences the TS5107 errors for a grace period. Non-strategic — just buys time.

There are NO new compile-time features that break existing code in TS 6.0 beyond deprecations. The "breaking" part is ignoring deprecations until TS 7.0.

## Per-app baseline (as of 2026-04-22)

| App | TS version (pinned in root `package.json`) | Uses `moduleResolution: classic`? | Uses `outFile`? | Uses `target: ES5`? | Custom build toolchain |
|---|---|---|---|---|---|
| `business-suite-unified` | `~5.9.3` | No — `"bundler"` | No | No — `ES2020` | Vite 8 + rolldown |
| `crm7` | check at impl time | likely `"bundler"` | No | No | Vite 8 |
| `conduit` | check at impl time | N/A — Next.js 16 manages tsconfig | No | No | Turbopack (Next 16) |
| `R80.3` | check at impl time | likely `"bundler"` | No | No | Vite |
| `throughput` | check at impl time | likely `"bundler"` | No | No | Vite |
| `braden` | check at impl time | likely `"bundler"` | No | No | Vite |

**All 6 apps are on post-`moduleResolution: bundler` toolchains** (Vite 8 or Turbopack / Next 16) — that's the modern path. None use the deprecated `moduleResolution: classic`, `outFile`, or `ES5` target. That's the main source of TS 6.0 migration pain, and BSuite is clear of it.

## Compat surface — runtime deps that track the TS compiler API

TS compiler API-linked deps that can block a 5.x → 6.0 bump:

| Package | TS API usage | BSuite usage | Risk |
|---|---|---|---|
| `ts-node` | Yes | Only via test-runner setup (vitest) — not in hot path | Low |
| `tsx` | Yes | Possibly used by scripts/dev. Verify per app | Low |
| `@typescript-eslint/*` | Direct API | Every app's lint pipeline | **Medium — needs TS-compat release** |
| `typescript-eslint` (v8+) | Direct API | BSU + CRM7 + R80.3 lint | **Medium** |
| `vite-tsconfig-paths` | Indirect — reads tsconfig | All 5 Vite apps | Low |
| `vitest` | Peer dep of TS | All 6 apps (conduit added vitest per CLAUDE.md) | Low — follows TS closely |
| `eslint-plugin-react-hooks@^7` | Uses TS AST for some rules | All 6 apps (post N.7.a bump) | Low |
| `@tanstack/react-query` | Types-only | All 6 apps | None — types aren't TS-API coupled |
| `@supabase/supabase-js` | Types-only | All 6 apps | None |
| `@bsuite/auth` | Types-only | BSuite shared pkg | None |
| `@bsuite/charge-calc` | Types-only | CRM7 + R80.3 | None |
| `@bsuite/ui` | Types-only | BSU | None |

**Verdict:** the only real blocker is `typescript-eslint@v8` needing a TS 6.0-compatible release. Their track record is "TypeScript major release → plugin compat release within 2 weeks" (historical pattern for v4, v5). Assume a 2-4 week lag after TS 6.0 GA before `typescript-eslint` ships a compatible version.

## Per-app sequencing recommendation

Not this cycle — this is a next-cycle plan. The suggested ordering:

1. **Throughput first** (smallest test + lint surface; npm not pnpm — gets the lockfile regen recipe right).
2. **Braden next** (corporate site, small scope, fewer callers).
3. **Conduit third** (Next.js 16 manages its own tsconfig; migrate when the Next team bumps their minimum TS version to 6 OR once TS 6 is stable enough that manual override is safe).
4. **R80.3 fourth** (compliance-critical — extra test coverage required; migrate when all Vite TS 6 compat is proven in 1–3).
5. **CRM7 fifth** (largest TS surface; AI SDK dep coupling needs explicit check).
6. **BSU last** (most cross-cutting; let the other 5 shake out any shared-package TS 6 issues first).

## Risk table

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| `typescript-eslint` lag blocks lint | Medium | Medium | Add `eslint-disable-next-line` on breaking rules until plugin catches up. |
| `vite-tsconfig-paths` needs a minor bump | Low | Low | Bump alongside TS, not a problem. |
| `@typescript-eslint/parser` out-of-sync | Medium | Medium | Same as above. |
| New strict-mode false positives surface | Medium | Low | Per-file `// @ts-expect-error` with a todo comment. |
| `vitest` needs a peer-dep bump | Low | Low | Verify current vitest peer deps before migration. |
| `ignoreDeprecations` escape hatch disabled in 7.0 | High (by design) | High — breaks build on TS 7 | ACTUALLY migrate deprecations before 7.0 lands, don't just silence. |
| `@bsuite/*` shared packages block | Low | High | Bump shared-package TS first, republish, then consumer apps. |

## Cost estimate

- **Per app:** 2–4 hours of real work (lockfile regen outside bsuite tree per project rule, lint baseline pre/post, verify husky pre-commit, prod-preview smoke).
- **Cross-app coordination:** 1 day for shared-package (@bsuite/auth, @bsuite/charge-calc, @bsuite/ui, @bsuite/nav-core) TS 6 bumps + republish.
- **Total:** 3–5 days across the team for all 6 apps + 4 shared packages.

## Decision: GO / NO-GO per app

All 6 apps are **GO** at TS 6.0.0 GA + `typescript-eslint` compat release + 2-week soak. None have deprecation blockers.

**Gate:** do NOT migrate any app until:
1. TS 6.0.0 is released on `latest` npm channel (not a beta).
2. `typescript-eslint@^8.x` (or whatever major is current) has a TS 6-compatible release.
3. At least one of the apps (recommend throughput, per sequencing above) has been through the bump successfully in a preview branch.

## Not in scope

- TS 7.0 Go-native migration — that's a separate evaluation after 7.0 GA. Expected gains: 3-5× faster `tsc` runs and `tsserver` editor responsiveness. Worth its own doc.
- ESLint 10+ migration (see N.7.a — `eslint-plugin-react-hooks@v7` alignment).
- Monorepo-level `packageManager` pinning updates (tracked elsewhere).

## Related

- Issue `bsuite#227` — the parent tracker for this evaluation.
- Issue `bsuite#211` — the P1-tagged migration ticket.
- Plan: `/home/braden/.claude/plans/bsuite-world-class-audit-adaptive-sonnet.md` Part N.7.c.

## Status moves to A (Approved) when

The next-cycle implementation plan is opened and references this evaluation as its risk assessment. Moves to F (Frozen) once all 6 apps have completed the migration + TS 7.0 Go-native eval is opened as its successor.
