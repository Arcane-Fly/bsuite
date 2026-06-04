---
title: BSuite Consolidated Hardening — Multi-Cycle Plan
status: W (Working)
owner: Braden Lang (GaryOcean428)
generated: 2026-05-13
based_on: ~/Downloads/bsuite-consolidated-prompt.md (operator-supplied)
critical_assessment_by: claude-code session 2026-05-13
---

# BSuite Consolidated Hardening — Multi-Cycle Execution Plan

## Why this exists

Operator supplied a 7-phase consolidated hardening prompt covering auth posture, DB security/performance, edge-function cleanup, Zod 4 alignment, skill creation, and red-team verification. It cites 47 SECURITY DEFINER findings + 25 RLS initplan + 56 multiple-permissive + 23 unindexed FK + 452 unused index findings from Supabase advisors against `tuybltdrdefjblnplpqo`.

**Critical assessment**: the plan is sound but its scope (~25-35 PRs, 1-2 weeks) cannot be executed in a single cycle. This doc breaks it into multi-cycle chunks with explicit prerequisites and stopping points.

## Pre-flight (verified 2026-05-13)

| Check | Result | Source |
|---|---|---|
| JWKS endpoint returns asymmetric keys (Phase 1.1) | ✅ **PASS** — 2 ES256 P-256 keys, no migration needed | `curl https://tuybltdrdefjblnplpqo.supabase.co/auth/v1/.well-known/jwks.json` |
| Source/prod schema baseline available | ✅ **PASS** — crm7#767 ships 22,803-line dump (233 tables / 615 policies / 107 functions, matches MCP audit) | `supabase db dump --linked --schema public` |
| OAuth client registry | ✅ **PASS** — 5 clients registered, all PKCE + public + correct grants | Verified earlier this session |
| @bsuite/theme StatusBadge canonical primitive (brand-token consolidation) | ✅ Foundation shipped — bsuite#943 | This session |

## Phase 0 — crm7#758 reconciliation (PREREQUISITE for Phases 1+2)

Before any RLS rewrites or Zod regen against the schema, the source migration tree must be source-of-truth. Otherwise Phases 1+2 work against a moving target.

| Step | Status | PR/Issue |
|---|---|---|
| 0.1 Dump prod baseline | ✅ DONE | crm7#767 (22,803 lines) |
| 0.2 Inventory historical migrations vs baseline (which are SUPERSEDED) | NEXT | TBD |
| 0.3 Move superseded migrations to `_archived/` with README | After 0.2 | TBD |
| 0.4 Promote baseline to main migrations path with timestamp | After 0.3 | TBD |
| 0.5 Register baseline in `supabase_migrations.schema_migrations` | After 0.4 | TBD |
| 0.6 Verify `supabase db reset` on local PG-17 → diff against `pg_dump` of prod → empty diff | After 0.5 | TBD |
| 0.7 pgTAP CI flips from FAILURE → SUCCESS | After 0.6 | Auto-verified |

**Estimated cycles**: 1-2

## Phase 1 — Auth posture (`supabase-auth-comprehensive`)

| Step | Status | Notes |
|---|---|---|
| 1.1 JWKS asymmetric keys present | ✅ DONE (pre-flight) | 2 ES256 keys |
| 1.2 grep `getSession()` server-side, replace with `getClaims()` | TODO | conduit (Next.js SSR) most likely culprit |
| 1.3 Verify Vite SPAs use `localStorage` (NEVER `sessionStorage`), `persistSession: true`, `autoRefreshToken: true` | TODO | 5 apps to audit |
| 1.4 Custom Access Token Hooks audit | TODO | Verify all 11 required claims preserved |
| 1.5 Production SMTP configured (not 2/hr default) | TODO (operator-side via dashboard) | — |

**Estimated cycles**: 1

## Phase 2 — Database hardening (`supabase-postgres-best-practices`)

**SPLIT into per-finding-class PRs** (consolidated plan's "one big migration" approach is too risky):

| Step | Findings | Status | Approach |
|---|---|---|---|
| 2.0 no-TO RLS policy role scoping | Auth/session/tenant-scoped policies applying to PUBLIC | ✅ DONE | CRM7 PR [#961](https://github.com/GaryOcean428/crm7/pull/961) adds metadata-driven `ALTER POLICY ... TO authenticated` hardening, preserves intentional public reads, covers `auth.jwt()` predicates, and ships pgTAP guardrail `09_harden_no_to_rls_policies.sql`. Closed crm7#825. |
| 2.1 SECURITY DEFINER lockdown | 47 functions | ✅ DONE | CRM7 PR [#962](https://github.com/GaryOcean428/crm7/pull/962) completes the remaining public-schema SECURITY DEFINER EXECUTE lockdown: zero unpinned helper search paths, zero PUBLIC/anon EXECUTE grants, authenticated RLS helper grants preserved, and pgTAP guardrail `09_secdef_execute_lockdown.sql` covers the invariant. |
| 2.2 RLS initplan rewrite | 25 direct-auth policies initially; all targeted Phase 2.2 policy groups rewritten with initplan wrappers | ✅ DONE | CRM7 PR [#963](https://github.com/GaryOcean428/crm7/pull/963) rewrites the Visual Feature Builder policy group. CRM7 PR [#964](https://github.com/GaryOcean428/crm7/pull/964) rewrites `role_capabilities`. CRM7 PR [#965](https://github.com/GaryOcean428/crm7/pull/965) rewrites `tenant_locations`. CRM7 PR [#966](https://github.com/GaryOcean428/crm7/pull/966) rewrites `xero_audit_log` and `xero_m2m_connections`. CRM7 PR [#967](https://github.com/GaryOcean428/crm7/pull/967) rewrites the legacy `super_admin_action_audit` tenant-audit policy. CRM7 PR [#968](https://github.com/GaryOcean428/crm7/pull/968) rewrites `apprentice_placements`. CRM7 PR [#969](https://github.com/GaryOcean428/crm7/pull/969) completes the remaining `team_invitations` `auth.role()` wrappers. Each slice adds pgTAP policy-text and behavior coverage. |
| 2.3 Multiple permissive consolidation | 56 duplicates initially; first low-risk duplicate SELECT groups consolidated | IN_PROGRESS | Per-table PRs. OR' the duplicate predicates into one policy. CRM7 PR [#970](https://github.com/GaryOcean428/crm7/pull/970) consolidates `team_invitations` admin/invitee SELECT policies into one authenticated OR policy with pgTAP behavior coverage. CRM7 PR [#971](https://github.com/GaryOcean428/crm7/pull/971) consolidates `team_members` self/team-admin SELECT policies into one authenticated OR policy with pgTAP behavior coverage. CRM7 PR [#972](https://github.com/GaryOcean428/crm7/pull/972) consolidates `tenants` platform-admin/own-tenant SELECT policies into one authenticated OR policy with pgTAP behavior coverage. |
| 2.4 Unindexed FK btree indexes | 23 FKs | TODO | Single migration is OK here (additive, no breaking change). |
| 2.5 Unused indexes observation | 452 indexes | DEFER | Wait for 7-day pg_stat_statements observation; drop only `idx_scan=0` after window. NOT this cycle. |

**Estimated cycles**: 3-4

## Phase 3 — Edge Functions cleanup

| Step | Status | Notes |
|---|---|---|
| 3.1 Re-deploy 46 functions with `file:///` imports | IN PROGRESS | This session: `xero-token-exchange`, `xero-invoice-submit` redeployed. 44 remaining. |
| 3.2 Replace `file:///` imports with `npm:` / `https://deno.land/...` | TODO | Codemod-able pattern |
| 3.3 Add CI guard: any function manifest with `file:///` fails | TODO | Single workflow file edit |

**Estimated cycles**: 1-2

## Phase 4 — Zod 4 alignment

| Step | Status | Notes |
|---|---|---|
| 4.1 Sweep `z.string().email()` / `.uuid()` / `.url()` → `z.email()` etc. | TODO | Codemod-able. Hand-write the codemod, run on review-PRs. NOT auto-apply. |
| 4.2 `z.discriminatedUnion()` for tagged unions (e.g. `apprentice_handoff_tokens.kind`) | TODO | Per-schema work |
| 4.3 Move duplicated schemas to `packages/schema-registry` | TODO | Per-schema work |
| 4.4 `safeParse` everywhere on trust boundaries | TODO | Audit per route handler |

**Estimated cycles**: 2-3 (depends on 4.1 codemod fidelity)

## Phase 5 — Skill authorship (in-PR, not separate phase)

Per critical assessment, skills are AUTHORED IN the PR that first uses their pattern, not in a separate phase:

- `bsuite-rls-patterns` → authored in Phase 2.2 first PR
- `bsuite-advisor-triage` → authored in Phase 2.1 first PR
- `bsuite-zod-validation` → authored in Phase 4.1 first PR
- `bsuite-oauth-server-app-config` → authored in Phase 1.5 (operator dashboard work)

## Skipped from consolidated plan

- "Bulk drop 452 unused indexes" — wait for pg_stat_statements observation window (skill-aligned, not a deferral)
- "One migration that wraps every auth.uid()" — split per-table for safety (operator preference: highest UX = stable rollout > big-bang)

## Re-evaluation gates

After each cycle:
- Re-run Supabase advisors. Compare findings to Phase target counts.
- pgTAP CI status (informational until #758 closes).
- Production app health (Vercel deployments READY across all 6 apps).

## Out-of-scope for this plan

- Brand-token Strategy A consumer-side migration (handled separately as bsuite#943 + 4 follow-up PRs)
- Charge engine R80.3 re-spawn (R80.3#248)
- People-wizard re-spawn waves (crm7#763, #764)

## Cross-references

- Operator-supplied source: `~/Downloads/bsuite-consolidated-prompt.md`
- Phase 0 baseline: crm7#767
- Brand-token foundation: bsuite#943
- Source-of-truth doctrine: crm7#758
- StatusBadge tracker: bsuite#943

## Validation loop (FF-SELF-VALIDATION-20260507)

- **Loop**: §9.1 output-equivalence at every phase
- **Equivalence target**: Supabase advisor counts → 0 security findings + < 5 perf findings (unused-index residual only)
- **Cross red-team**: per-PR §17 verification (not a separate phase)
- **Self-report**: every closed PR includes Evidence block with advisor-count delta
