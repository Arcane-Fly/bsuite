# BSuite Consistency Report

**Generated:** 2026-05-04 (Plan-tracking convention added 2026-05-06)
**Last updated:** 2026-07-07 (TypeScript 6.0, React 19, Zod 4 migrations complete; admin parity schema + contact propagation trigger shipped)
**Scope:** Cross-app WCAG / a11y / dependency / auth consistency status,

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

plus the canonical plan-tracking convention.

This report tracks parent-level consistency items that span all six
submodules. It is updated whenever a parent EPIC moves, a per-submodule fix
lands, or a new cross-cutting concern is opened.

## Plan-tracking convention

Codified after the 2026-05-04 doc-unification wave and the 2026-05-06
plans audit. All future plans across the parent + 6 submodules MUST
follow this layout:

- **Location:** `docs/plans/` of the relevant repo (parent or submodule).
  Cross-app plans live in the parent's `docs/plans/`; per-app plans
  live in the submodule's `docs/plans/`. Plans MUST NOT be authored in
  IDE-specific locations such as `~/.claude/plans/` or `~/.windsurf/plans/`
  — those locations are agent-private scratch and are out-of-tree.
- **Naming:** `YYYYMMDD-descriptive-name-type-vMAJOR.MINOR[STATUS].md`
  (status codes: `W` Working, `D` Draft, `R` Review, `A` Approved,
  `F` Frozen). Adopt-stub plans created in the 2026-05-04 sweep use the
  shorter `YYYY-MM-DD-name.md` form by exception.
- **Status ledger:** every `docs/plans/` directory has a `STATUS.md`
  with sibling-link block + per-plan rows + cross-app a11y / dependency
  tracking rows. The parent `STATUS.md` is the cross-app dispatch
  surface; submodule `STATUS.md` files mirror their slice.
- **Archive:** verified-complete plans move to
  `docs/plans/archive/YYYY-MM/<plan>.md` with an
  `archive/YYYY-MM/<plan>.evidence.md` companion that lists per-checklist
  evidence (PR, commit SHA, closed issue, file:line). The parent uses
  `docs/archive/<group>/` (organised by archival event) rather than by
  plan-creation month.
- **Archival gate:** never archive a plan without per-checklist
  evidence. If a plan is partially shipped, mark it `PARTIAL` in
  `STATUS.md` and itemise the open scope inside the plan body.
- **External plans (claude_code IDE / windsurf cascade):** are
  out-of-tree. They MAY be referenced for context but MUST NOT be
  treated as canonical. When an external plan ships, the loop is closed
  in this repo's `STATUS.md`; the external file does not need to be
  moved into `docs/plans/`.

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

**Status:** ✅ **DONE** (2026-05-14)

- Plan: [`docs/plans/20260504-typescript-6-migration-evaluation-v1.00A.md`](archive/README.md) *(archived — was `20260504-typescript-6-migration-evaluation-v1.00A.md`)*
- Evidence: commit `1872dc4` — `chore(deps): align root pnpm overrides with TS6/ESLint10 app baseline (#971)`
- All six consumer apps now resolve TypeScript 6-compatible stacks
- ESLint 10 aligned across the suite

EPIC closed 2026-05-14. Plan retained in `docs/plans/README.md` Completed Plans.

## Dependencies

### bsuite#212 — React 19 + Zod 4 + Vite 8 stack modernization

**Status:** ✅ **DONE** (2026-05-13)

- Evidence: commit `3270f80` — `chore(packages): React 19 attestation bumps + nav-core peerDeps + schema-registry publish workflow (#434)`
- Evidence: commit `fab23e1` — `feat(shared): Zod 4 codemod Phase 4.1 — z.string().format() → z.format() across packages (#950)`
- All six consumer apps on React ^19.2.4 or ^19.2.5
- Zod 4 codemod complete across shared packages
- Shared packages (`@bsuite/nav-core`, `@bsuite/schema-registry`, `@bsuite/page-builder`) attest React 19 peerDeps

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

## Codehouse parity audit (2026-05-06)

A full parity audit between BSuite and Codehouse Workforce One + OTS
landed via the `docs/codehouse-parity-and-platform-360-plan` branch
(PR bsuite#580). Canonical artefacts:

- `docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md` — execution plan
- `docs/plans/20260506-codehouse-parity/` — per-domain rollup notes
- 13 implementation issues filed on `bsuite/`: **#567 – #579** (parity-codehouse label)
  - #567 timesheet entry · #568 timesheet approval · #569 pay item / penalty / allowance / timesheet groups
  - #570 MYOB + Astute payroll adapters + STP EOFY · #571 Twilio SMS dispatcher
  - #572 geo-fence / kiosk / photo clock-in · #573 leave calendar
  - #574 reports · #575 pay periods · #576 ABA / PayWay / super exports
  - #577 Idibu / Onboarded / Secured Signing / Calendly · #578 admin (divisions, PH groups, FBT, etc.)
  - #579 doc-drift + README over-delivery surfacing (this PR set)

### DOC-DRIFT PR set (bsuite#579)

Filed 2026-05-06 against §3 of `competitor/bsuite-inventory.md`. Each PR
is docs-only, additive, branch namespace `perplexity/codehouse/doc-drift-*`:

| Repo | Branch | Summary |
|------|--------|---------|
| bsuite (parent) | `perplexity/codehouse/doc-drift-bsuite` | README + knowledge.md surface 5 suite-wide over-deliveries; fix throughput submodule note; this CONSISTENCY-REPORT entry |
| crm7 | `perplexity/codehouse/doc-drift-crm7` | MYOB stub note (links bsuite#570); surface BOOT, AI suite, offline PWA, schema builder, OKLCH; add Codehouse parity status section |
| business-suite-unified | `perplexity/codehouse/doc-drift-bsu` | Clarify FWC webhook is delegated to crm7/R80.3; surface sub-org hierarchy, OKLCH, Visual Feature Builder Phase 0 (PR #344) |
| conduit | `perplexity/codehouse/doc-drift-conduit` | Verify AI assistant + 4-portal + Next 16 entries are accurate |
| R80.3 | `perplexity/codehouse/doc-drift-r80-3` | **Critical:** README React 18.3.1 claim → React 19; Tailwind 3.4 → 4; Vite/Vitest current; surface payday-super + payroll-tax-by-state services + SchemaBuilderView |
| braden | `perplexity/codehouse/doc-drift-braden` | Fix R80.3 mis-description ("compliance platform" → "GTO charge-rate calculator"); React 18 → 19; Tailwind v4 |
| throughput | `perplexity/codehouse/doc-drift-throughput` | React 18.3 → 19; surface Monitoring + Teams + collaboration components; expand Groq integration detail |

DOC-DRIFT items are **additive** — no code or `package.json` is
touched; version-mismatch READMEs are corrected to match `package.json`
ground truth (the apps already run on the suite-standard stack — only
the prose lagged).

### Suite-wide over-deliveries (surfaced in DOC-DRIFT PR set)

Five capabilities exceed Codehouse Workforce One / OTS — historically
under-described in app READMEs. The DOC-DRIFT PR set surfaces them in
the user-visible documentation surface (parent README, knowledge.md,
crm7 README, BSU README, R80.3 README):

1. **BOOT Assessment Engine** (`@bsuite/charge-calc/boot`) — Fair Work Act s.193 BOOT.
2. **20-component AI Assistant** (CRM7) + Conduit `/api/ai/chat` + Throughput Groq GPT-OSS-120B.
3. **Visual schema builder** (`@bsuite/schema-builder`) — used in 4 apps.
4. **Offline-first PWA** (CRM7) — SQLite WASM + IndexedDB + bi-directional Supabase sync.
5. **Multi-tenant sub-organisation hierarchy** + runtime OKLCH branding (BSU).

## Codehouse parity implementation (2026-07-07)

Schema migrations shipped to close 14 admin parity gaps (bsuite#578) and implement contact propagation doctrine (ADR-0006):

### Admin parity schema (bsuite#578)

**Schema A** — Hiring/Placements/Imports (matrix rows 68, 70, 72-73, 98, 106):
- `hiring_divisions` — tenant-scoped with super_guarantee_rate
- `public_holiday_groups` + `public_holiday_dates` — per-state holiday tracking
- `ots_rules` + `ots_streams` — Over Time Scheme configuration
- `classifications` — unified parent-child hierarchy (replaces ad-hoc award_classifications usage)
- `purchase_orders` — placement-scoped PO tracking
- `employee_imports` — import job tracking with error_rows JSONB
- Added columns to `placements`: hiring_division_id, ots_rule_id, ots_stream_id, public_holiday_group_id

**Schema B** — Payroll-tax extensions (matrix rows 111-114):
- `pay_item_types` — seed data for ATO STP Phase 2 (ordinary, overtime, allowance, leave, ETP, lump sums, FBT)
- `pay_items` — tenant-scoped pay item registry
- `tfn_declarations` — encrypted TFN storage with pgcrypto + vault integration
- `citb_levy_config` — single-row-per-tenant CITB levy configuration
- Added columns to `apprentices`: fbt_reportable_amount, termination_date
- Helper functions: `encrypt_tfn()`, `decrypt_tfn_last4()` (SECURITY DEFINER, vault-backed)

All tables have RLS enabled with tenant isolation policies (AUTH_CANONICAL.md §5). Admin write policies restrict INSERT/UPDATE to org_admin/gto_admin roles.

### Contact propagation doctrine (ADR-0006)

Trigger function `fn_propagate_contact_changes()` automatically propagates contact updates (email, phone, name) to:
- `apprentices` (if contact is an apprentice)
- `supervisors` (if contact is a supervisor)
- `client_contacts` (if contact is a client contact)
- `placements` (supervisor contact references)

Ensures single source of truth: `contacts` table is canonical; role junctions inherit changes automatically.

### Leave persistence layer (bsuite#573)

- `leave_types` — configurable leave categories with color coding
- `leave_requests` — employee leave requests with approval workflow
- `leave_balances` — per-employee leave accrual tracking
- All tables tenant-scoped with RLS

### Pay periods infrastructure (bsuite#575)

- `pay_periods` — payroll period tracking with status workflow (open → processing → closed → locked)
- `pay_period_streams` — per-stream payroll processing within a period
- Supports bulk operations, CSV export, and reminder dispatch

### UI implementations (in progress)

- **Leave calendar** (`crm7/src/pages/leave/calendar.tsx`) — react-big-calendar with employee/leave type selectors
- **Pay periods management** (`crm7/src/pages/payroll/periods.tsx`) — create, close, lock, export, send reminders
- **Admin parity UI** (dispatched to Claude Code) — hiring divisions, PH groups, classifications, import wizard
- **Timesheet approval** (dispatched to Claude Code) — bulk approve RPC, audit trail, supervisor reminders
- **Comms parity** (dispatched to agy) — SMS adapter, event triggers, template editor, WHS alerts
