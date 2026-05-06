# BSuite Consistency Report

**Generated:** 2026-05-04
**Scope:** Cross-app WCAG / a11y / dependency consistency status.

This report tracks parent-level consistency items that span all six
submodules. It is updated whenever a parent EPIC moves, a per-submodule fix
lands, or a new cross-cutting concern is opened.

## WCAG / Accessibility

### bsuite#208 — Radix Dialog/Sheet must include DialogTitle (WCAG 1.3.1)

**Status:** ✅ **DONE** (2026-05-04)

| Submodule | Status | Evidence |
|-----------|--------|----------|
| crm7 | ✅ Clean | `scripts/phase7-5-dialog-title-sweep.mjs` returns 0 findings; static-test `wcag-static.test.ts` enforces parity going forward |
| conduit | ✅ Clean | `src/test/wcag-static.test.ts` enforces DialogTitle parity in CI |
| business-suite-unified | ✅ Fixed | PR `fix/wcag-dialog-titles-2026-05-04` (#285) — hoisted `InviteDialog` title out of conditional form mount |
| R80.3 | ⊘ N/A | No Radix Dialog/Sheet usage in this app |
| braden | ✅ Clean | All `<DialogContent>` paired with `<DialogTitle>` (sweep returns 0) |
| throughput | ⊘ N/A | No Radix Dialog/Sheet usage in this app |

### bsuite#209 — Login/register forms must include autoComplete (WCAG 3.3.8)

**Status:** ✅ **DONE** (2026-05-04 — verified, no code changes required)

| Submodule | Status | Evidence |
|-----------|--------|----------|
| crm7 | ✅ Clean | `src/pages/auth/reset-password.tsx` lines 196, 216 — `autoComplete="new-password"`. Login is BSU-redirect (no input form) |
| conduit | ⊘ N/A | `src/app/auth/login/page.tsx` and `register/page.tsx` are BSU OAuth PKCE redirects — no input fields |
| business-suite-unified | ✅ Clean | `src/components/AuthForm.tsx` — `autoComplete="email"`, `"current-password"`, `"new-password"` already present |
| R80.3 | ⊘ N/A | `src/pages/AuthLogin.tsx` is a BSU-redirect — no input fields |
| braden | ✅ Clean | `src/components/auth/AdminLoginForm.tsx` — `autoComplete="email"`, `"current-password"` already present |
| throughput | ⊘ N/A | `src/components/login/LoginContent.tsx` is a BSU-redirect — no input fields |

## Dependencies

### bsuite#211 — TypeScript 6.0 migration EPIC

**Status:** 🟡 **TRACKED** — plan locked, execution scheduled to 2026-Q3 maintenance window.

- Plan: [`docs/plans/2026-05-04-typescript-6-migration.md`](./plans/2026-05-04-typescript-6-migration.md)
- Per-submodule child issues:
  - GaryOcean428/crm7#433
  - GaryOcean428/conduit#168
  - GaryOcean428/business-suite-unified#286
  - GaryOcean428/R80.3#157
  - GaryOcean428/braden#188
  - GaryOcean428/throughput#90

EPIC remains open with `external-blocked` rationale: deferred to scheduled
migration window per the universal rulebook's formal-issue requirement.

## Authentication

### bsuite#505 — Cross-app OIDC silent re-auth

**Status:** 🟢 **IMPLEMENTED, PROMOTING** (2026-05-06)

The doctrine claim from 2025-02-27 (cross-app SSO via OIDC `prompt=none`,
not cookies) now matches the code. `@bsuite/auth` v0.2.0 implements real
silent re-auth; every BS OAuth 2.1 client wires `attemptSilentAuth()` in
its boot path; every callback handles `error=login_required`.

| Submodule | Status | Evidence |
|-----------|--------|----------|
| crm7 | ✅ Wired | crm7#488 — `src/contexts/AuthContext.tsx` calls `attemptSilentAuth({ returnTo })`; `src/pages/auth/callback.tsx` handles `error=login_required` |
| throughput | ✅ Wired | throughput#104 — `src/lib/auth/AuthProvider.tsx` + `src/pages/auth/AuthCallback.tsx` |
| R80.3 | 🟡 In flight | feat/auth-wire-silent-reauth-bsuite-auth-v0.2.0 |
| braden | 🟡 In flight | feat/auth-wire-silent-reauth-bsuite-auth-v0.2.0 |
| conduit | 🟡 In flight | feat/auth-wire-silent-reauth-bsuite-auth-v0.2.0 |
| business-suite-unified | ⊘ N/A | BSU is the OAuth Server, not a consumer |

Parent CI guard: `.github/workflows/verify-silent-auth-wired.yml` runs on
every push to main + development and asserts every consumer's source tree
references `attemptSilentAuth` in a `.ts` / `.tsx` file. Drift fails the
guard — no consumer can quietly remove the wiring.

Bootstrap migration (`crm7/supabase/migrations/20260506000100_bootstrap_profile_for_existing_users.sql`)
shipped as part of Track A in crm7#487; application to Supabase is tracked
at bsuite#507 (operator action required — Supabase MCP / `supabase login`
credentials needed).
