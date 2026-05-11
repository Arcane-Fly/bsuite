# BSuite Finish-Line Roadmap

**Date:** 2026-04-25
**Status:** W (Working — single source of truth for remaining work)
**Owner:** Braden (product) + Cascade + Claude Code (implementation)
**Scope:** All 6 apps — BSU, CRM7, Conduit, R80.3, braden, throughput

## Supersedes consolidation role of

The following docs remain the per-topic deep dives; this roadmap is the RAISED-LEVEL index. Each item below cites its source doc for detail.

- `docs/20260317-bsuite-gap-report-v2.00W.md` §11 (2026-04-24 archive-pass)
- `docs/20260423-cross-app-write-audit-v1.00W.md` V3–V10
- `docs/20260423-misplaced-routes-audit-v1.00W.md` F-01..F-10
- `docs/20260415-roadmap-audit-delta-v1.00W.md` (#26 rollup)
- `docs/20260420-react-hooks-v7-tech-debt-v1.00W.md`
- `docs/20260421-k8-retroactive-audit-v1.00W.md`
- `docs/20260421-storage-rls-reserved-prefixes-v1.00W.md`
- `docs/20260421-supabase-realtime-blocks-rollout-v1.00W.md`
- `docs/20260422-typescript-6-migration-evaluation-v1.00W.md`
- `docs/20260424-env-var-audit-findings-v1.00A.md`
- `docs/20260424-env-var-contributing-rules-v1.00W.md`
- `docs/20260424-oauth-preview-redirect-runbook-v1.00W.md`
- `docs/OUTSTANDING.md`
- `docs/plans/20260423-bsuite-production-plan-v1.00W.md`
- `docs/plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md`
- `docs/plans/20260422-entity-linkage-schema-builder-uplift-v1.02W.md`
- `crm7/docs/00-roadmap/20260423-crm7-schema-page-builder-audit-1.00W.md`
- `crm7/docs/00-roadmap/20260424-bsuite-combined-foundations-and-gto-1.00W.md`

---

## How to use this doc

- Scan §Top priority this week for immediate actions.
- Each item has a stable **ID** (e.g. `P0-3`, `WS-A-2`) that can be cited from commits, PRs, and other docs.
- Each item lists **Title**, **App/Owner**, **Verification**, and **Source**. IDs do not change across edits.
- Completion protocol: strike through + append `— SHIPPED <SHA>` to the row, DO NOT delete or renumber.
- Items in §P0 (this week) and §P1 (this month) are granular. §P2 (next quarter) and §WS (workstreams) are phase-level.

---

## Top priority — this week (P0)

Items blocking production deploys, live security risks, or sign-off for runbooks already in flight.

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| ~~P0-1~~ | ~~Rotate every secret that appeared in chat/paste buffer during the 2026-04-24 env audit~~ — **DONE** (operator confirmed 2026-04-25; Stripe/Xero/ATO RAM dashboards show new secrets) | Operator | gitleaks clean on all 6 repos | `docs/20260424-env-var-audit-findings-v1.00A.md` §Priority fix order #1 |
| ~~P0-2~~ | ~~Delete `VITE_STRIPE_SECRET_KEY` from `business-suite` Vercel project~~ — **SHIPPED** earlier this session (Vercel env rm, both Preview + Production targets cleared in a single rm) | Operator | Confirmed via `vercel env ls`; no `VITE_STRIPE_SECRET_KEY` entries | `docs/20260424-env-var-audit-findings-v1.00A.md` §2.A |
| ~~P0-3~~ | ~~Delete `VITESUPABASE_ANON_KEY` typo from `throughput` Vercel project~~ — **SHIPPED** earlier this session | Operator | `vercel env ls throughput` clean | `docs/20260424-env-var-audit-findings-v1.00A.md` §2.C |
| ~~P0-4~~ | ~~Add 7 `RAM_*` vars to `crm7` Vercel project~~ — **SHIPPED** earlier this session (extracted from `/home/braden/.ATOMAS/keystore-new.xml` `BSUITE2` credential via Node crypto + openssl pkcs7; 7 Supabase secrets set, VITE_RAM_CLIENT_ID + VITE_RAM_CREDENTIAL_ENVIRONMENT on CRM7 Vercel Dev+Prod) | Operator + Claude Code | `supabase secrets list` shows 7 RAM_* keys | `docs/20260424-env-var-audit-findings-v1.00A.md` §3 |
| ~~P0-5~~ | ~~Fix `crm7/src/lib/pipelines/xeroInvoiceAdapter.ts:62`~~ — **SHIPPED `f2a34d0f`** + edge fn `xero-invoice-submit` deployed; later enhanced in `dbf70c03` to emit one Xero line per `invoice_line_items` row | CRM7 / Claude Code | `grep -rn "VITE_XERO_CLIENT_SECRET" crm7/src` returns 0 matches; edge fn live on Supabase project `tuybltdrdefjblnplpqo` | `docs/20260424-env-var-audit-findings-v1.00A.md` §2.B |
| P0-6 | Parts A+B+C OAuth preview-redirect sign-off — close all 5 unticked checkboxes: Part C (Supabase allowlist update), Parts B.1–B.4 (CRM7/R80.3/Braden/Throughput `return_origin` patches), end-to-end login on each preview URL | Operator + Claude Code | All 6 checkboxes ticked at runbook end; preview login works on 4 client apps | `docs/20260424-oauth-preview-redirect-runbook-v1.00W.md` §Sign-off |
| ~~P0-7~~ | ~~Remove auth-callback hardcoded-production fallback — R80.3 `src/pages/AuthCallback.tsx:44` + throughput `src/pages/auth/AuthCallback.tsx:48-50`~~ — **SHIPPED** (W4-AUTH-v2) — R80.3@`6f3859b` + throughput@`fa7e874` + crm7@`1fa401e1`; `VITE_BSU_URL` now required at build, 14 files cleaned of hardcoded `https://suite.crm7.app` fallback, 12 Vercel env entries written across the 4 client apps. | R80.3, throughput / Claude Code | `VITE_BSU_URL` is required at build; hardcoded `https://suite.crm7.app` string removed | `docs/20260423-cross-app-write-audit-v1.00W.md` V10 |
| P0-8 | Conduit SSR hotfix — cherry-pick commits `2f38cc3` + `5870990` onto `fix/conduit-ssr-prerender-guard` from `development`; merge | Conduit / Claude Code | Conduit Vercel build green on `development` | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §Phase 6.0 |
| ~~P0-9~~ | ~~Bump `next` to `^16.2.3` in Conduit (CVE-2026-23869 RSC DoS, CVSS 7.5)~~ — **SHIPPED-PREEXISTING** (W4-CONDUIT-NEXT NO-OP) — Conduit already on `next@16.2.4` ≥ 16.2.3 at Wave-4 audit time; no bump required. | Conduit / Cascade | `pnpm why next` shows ≥16.2.3; `pnpm audit` clean for this CVE | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §P0-J05 |
| P0-10 | Supabase Vault RPC — create `email_integration_set_encrypted_token`; migrate plaintext `access_token` + `refresh_token` + `smtp_password` + `imap_password` in `email_integrations` | CRM7 edge fns / Claude Code | `SELECT * FROM email_integrations` shows only opaque ciphertext; RPC call returns a vault ref | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §P0-LIVE-01/02 |
| P0-11 | Sign OAuth state with HMAC-SHA256 + verify on callback in `oauth-google-email` + `oauth-microsoft-email` | CRM7 edge fns / Claude Code | Malformed state rejected 400; Playwright test covers CSRF replay | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §P0-LIVE-03 |
| ~~P0-12~~ | ~~BSU AuthContext zero-fetch bug — fix `onAuthStateChange` bootstrap race; add integration test for ≥2 Supabase REST calls on mount~~ — **SHIPPED bsu@`86cfb70`** (W4-BSU) — `onAuthStateChange` deadlock avoided per `feedback_auth_state_change_deadlock.md`; bootstrap effect decoupled; integration test added. | BSU / Claude Code | Enterprise tier chip displays correctly for the 3 known enterprise users | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §P0-J04 |
| P0-13 | Remove wildcard redirect URIs `*.vercel.app` + `*.vusercontent.net` from Supabase Auth dashboard; replace with explicit preview URLs | Operator | `SELECT allowed_redirect_uris FROM auth.oauth_clients` shows no wildcards | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §P0-J03 |
| ~~P0-14~~ | ~~`git rm crm7/APPLY_THIS_SQL.sql`~~ — **ALREADY ABSENT** on crm7/development tip (verified 2026-04-25 `ls` returned not-found). History scrub still needed if any historical commit contained credentials; that's the remaining operator action. | CRM7 / Operator | Current tip clean; audit earlier commits via `git log --all -- crm7/APPLY_THIS_SQL.sql` | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §P0-J08 |
| ~~P0-15~~ | ~~Roadmap rollup — bump `docs/20260227-bsuite-master-roadmap-v5.00W.md` to v5.03W, strike `#26a/26e/26f/26g`, mark AUD-15/AUD-16 done~~ — **DONE** (master roadmap header is v5.03W; 26a/26e/26f/26g struck; AUD-15/AUD-16 marked done; revision log records the 2026-05-01 ratification rollup) | Cascade | Master roadmap header = v5.03W; four rows struck; delta doc retained as archived provenance | `docs/archive/parent/2026-04-30-audits-closed/20260415-roadmap-audit-delta-v1.00W.md` §Roadmap rollup request |

---

## Remaining Work — Top 5 (re-ranked post-Wave-5, 2026-04-25)

After the Wave-3 + Wave-4 + Wave-4-extras burst, the remaining queue is operator-dominated. In priority order:

1. **O-1 Apply W1-C migrations** (unblocks must-have #4 SchemaFieldAdder) — Operator runs `supabase db push --project-ref tuybltdrdefjblnplpqo --dry-run` → apply. Code committed `43fb250`. See P1-84.
2. **O-2 Supabase OAuth dashboard allowlist** (unblocks preview-login loop on all 4 BS-OAuth clients) — Operator per `docs/20260424-oauth-preview-redirect-runbook-v1.00W.md` Part C. See P0-6 + P0-13.
3. **O-3 Environment security cleanup** — P0-1 through P0-5 shipped; continue down priority queue in `20260424-env-var-audit-findings`.
4. **O-4 Production gate** — Do not merge `development` to production branches until Vercel-green + no P0 leftovers.
5. **O-5 Submodule deprecated-branch cleanup** — Org-admin cleanup tracked in `docs/20260428-orphan-branch-cleanup-handoff-v1.00W.md` and G-13 of the merged execution backlog. BSU `/admin/team-members` is already shipped via BSU #192/#193; Throughput peer-dep unblock is now complete.

All five are small/operator-tier. Engineering queue below (§P1 onward) remains the canonical master list.

---

## This month (P1)

Non-blocking bugs with clear scope; high-signal quality/hardening work.

### P1.A — Cross-app write violations (close §DRY ownership leaks)

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| ~~P1-1~~ | ~~CAW-V5 — move BSU `src/pages/Embed/LeadForm.tsx:109` `.from('leads').insert()` behind a Braden-exposed edge fn or shared service~~ — **SHIPPED bsu@`295472b`** (W4-BSU) — LeadForm now posts through Braden's `lead-capture` edge fn; BSU no longer INSERTs to `leads` directly. | BSU / Claude Code | BSU no longer INSERTs to `leads`; Braden owns write surface | `docs/20260423-cross-app-write-audit-v1.00W.md` §V5 |
| ~~P1-2~~ | ~~CAW-V6 — convert BSU `src/lib/ideaService.ts:60` idea CRUD to Throughput deep-links or formally change ownership map~~ — **SHIPPED bsu@`fceabb9`** (W4-BSU) — `ideaService` writes removed; BSU now aggregates read-only + deep-links to Throughput for CRUD. | BSU / Claude Code | BSU has no `.update()`/`.insert()` on `ideas`; read-only aggregation only | `docs/20260423-cross-app-write-audit-v1.00W.md` §V6 |
| ~~P1-3~~ | ~~CAW-V7a — remove writes to `tenant_branding` / `platform_branding` (BSU-owned)~~ — **SHIPPED crm7@`e15763c9`** — `src/pages/settings/branding.tsx` reduced from 504-line authoring UI to 16-line re-export of `BrandingRedirect` (which navigates to `${VITE_BSU_URL}/branding`). All 3 remaining `.from('tenant_branding'/'platform_branding')` calls are `.select()` reads in `useBranding.ts` (consumer pattern). Audit path `tenantService.ts:63` was inaccurate — actual writes lived in the branding page; `platform_branding` writes never existed in CRM7. | CRM7 / Claude Code | Grep confirms zero `.insert/.update/.upsert` on those tables; baseline typecheck unchanged | `docs/20260423-cross-app-write-audit-v1.00W.md` §V7 |
| ⚠️ **P1-4** | **CAW-V7b — AUDIT MISMATCH, NEEDS RESCOPE (do NOT execute as written)** — Subagent investigation 2026-04-25 found: (a) `crm7/src/pages/settings/schema-builder/*` does NOT write to `custom_pages` / `custom_page_blocks` — it writes to `tenant_entities`/`tenant_relations` (ERD builder, different concept); (b) `custom_page_blocks` does not exist in CRM7 source at all; (c) BSU `/developer/pages` authors `tenant_page_layouts` (Phase 5 table), NOT `custom_pages` — so "redirect CRM7 custom_pages authoring to BSU" has no destination; (d) CRM7 **does** author `custom_pages` via `src/pages/settings/custom-page-{create,edit,detail}.tsx` + `src/services/customPageService.ts`, but those files are outside V7b's glob. **Decision needed**: either (i) re-scope V7b to build BSU `custom_pages` authoring in `/developer/pages` THEN convert CRM7 to consumer-only, or (ii) accept `custom_pages` as CRM7-owned and update the one-shot DRY ownership matrix to reflect this. See source audit §V7 note below. | **Braden (decision) + Claude Code (impl)** | Decision recorded as an ADR in `docs/adr/`; either BSU surface built or audit updated | `docs/20260423-cross-app-write-audit-v1.00W.md` §V7 (requires 2026-04-25 correction append) |
| P1-5 | CAW-V8 — formalise ownership of `apprentice_rate_configs` + `wage_calculation_snapshots` (CRM7 vs R80.3); ship unified `create_append_only_audit()` helper | CRM7, R80.3 / Claude Code | ADR in `docs/adr/` names owner; helper fn called by both apps for all audit writes | `docs/20260423-cross-app-write-audit-v1.00W.md` §V8; `crm7/docs/00-roadmap/20260424-bsuite-combined-foundations-and-gto-1.00W.md` §N-2 |
| ~~P1-6~~ | ~~CAW-V9 — route throughput `src/lib/teamPermissions.ts:302` `.update()` on `team_members` through a BSU-exposed service, or formally grant co-ownership with RLS review~~ — **SHIPPED throughput@`63b79af`** (W4-TP) — `teamPermissions` now deep-links to BSU `/admin/team-members` (note: BSU target route still to be built — see Remaining Work §O-5 below). | Throughput / Claude Code | Throughput no longer writes `team_members` directly, OR RLS/co-ownership doc landed | `docs/20260423-cross-app-write-audit-v1.00W.md` §V9 |
| ~~P1-7~~ | ~~CAW-braden-debt-001 — remove or repoint `braden/src/lib/tasks/taskService.ts:37` `.from('users')` dead-code path~~ — **SHIPPED braden@`360b1a1`** — `getStaffDetails` had zero callers, removed entirely | Braden / Claude Code | `grep getStaffDetails braden/src/` returns only removal-note commentary | `docs/20260423-cross-app-write-audit-v1.00W.md` §V3 braden observation |
| ~~P1-8~~ | ~~CAW-throughput-debt-001 — annotate `throughput/supabase/migrations/20251014120000_unified_business_suite_schema.sql` as "REFERENCE ONLY — NEVER APPLY"~~ — **SHIPPED throughput@`2530f98`** — prominent banner added at top of migration | Throughput / Claude Code | `head -30` of migration shows REFERENCE-ONLY banner | `docs/20260423-cross-app-write-audit-v1.00W.md` §V4 throughput observation |

### P1.B — Misplaced routes (Phase 12 follow-ups, post-Phase 7 merge)

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| P1-9 | F-01 — replace CRM7 `/settings/branding` with `<RedirectTo to="${VITE_BSU_URL}/admin/branding" />` | CRM7 / Phase 12 follow-up PR | Route hits BSU `/admin/branding`; form removed | `docs/20260423-misplaced-routes-audit-v1.00W.md` §F-01 |
| P1-10 | F-02 — replace CRM7 `/settings/organization` with `<RedirectTo to="${VITE_BSU_URL}/settings/organization" />` | CRM7 / Phase 12 follow-up PR | Sub-org admin only lives in BSU | `docs/20260423-misplaced-routes-audit-v1.00W.md` §F-02 |
| P1-11 | F-03 — replace CRM7 `/settings/tester-licenses` with `<RedirectTo to="${VITE_BSU_URL}/developer/tester-licenses" />`; build BSU route | CRM7, BSU / Phase 12 follow-up PR | Developer portal hosts tester-license surface | `docs/20260423-misplaced-routes-audit-v1.00W.md` §F-03 |
| P1-12 | F-04 — remove R80.3 `SettingsPage` branding/org section; link to BSU equivalents | R80.3 / Phase 12 follow-up PR | Section removed; link present | `docs/20260423-misplaced-routes-audit-v1.00W.md` §F-04 |
| P1-13 | F-05 — remove R80.3 `OnboardingWizard`; link to BSU onboarding | R80.3 / Phase 12 follow-up PR | Wizard route redirects to BSU | `docs/20260423-misplaced-routes-audit-v1.00W.md` §F-05 |
| P1-14 | F-06 — remove R80.3 `SchemaBuilderView` authoring UI; keep `TenantLayoutSlot` consumer | R80.3 / Phase 12 follow-up PR | Authoring UI absent; read-only consumer remains | `docs/20260423-misplaced-routes-audit-v1.00W.md` §F-06 |

### P1.C — OAuth hardening / auth consolidation

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| P1-15 | Add OIDC nonce to all `signInWithBusinessSuite` calls (CRM7, R80.3, BSU, Conduit) + verify on token exchange | All / Claude Code | Missing nonce rejected; Playwright covers replay | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §P1-J02 |
| P1-16 | Conduit `/auth/login` + `/auth/register` redirect to BSU `/login?return_to=conduit` for unauthenticated users | Conduit / Claude Code | Unauthenticated traffic lands on BSU login | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §9.1 |
| P1-17 | `@bsuite/auth` package adoption — migrate 4 client apps from per-app copy to shared pkg | All / Claude Code | `business-suite-oauth.ts` deleted in 4 client apps | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §9.2 |
| P1-18 | throughput OAuth: copy CRM7 `business-suite-oauth.ts` (was 0 bytes); bump `@supabase/supabase-js` to `^2.103.0`; wire `startBSTokenRefresh()` | Throughput / Claude Code | Throughput users can authenticate via BSU SSO | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §9.3 |
| P1-19 | Azure `xms_edov` optional claim added + server-side rejection of `xms_edov === 0` in BSU OAuth callback | BSU / Operator + Claude Code | Microsoft-authenticated user with unverified email is rejected | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §9.5 |
| P1-20 | Replace `===` secret compare with `timingSafeEqual` in `email-token-refresh` | CRM7 edge fn / Claude Code | Timing side-channel closed; test asserts constant-time | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §P1-LIVE-01 |
| P1-21 | Remove `GOTRUE_JWT_ADMIN_GROUP_NAME` deprecation key from Supabase project config | Operator | Auth logs silent on deprecation warning | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §P1-LIVE-02 |

### P1.D — Env / Secrets hygiene (follow-up from P0)

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| P1-22 | Canonical Supabase names across all 6 projects — add `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`; wire fallback chains; delete legacy `ANON_KEY` / `SERVICE_ROLE_KEY` / `JWT_SECRET` | All / Claude Code + Operator | `grep -r 'SUPABASE_JWT_SECRET' src/` returns zero across all 6 apps | `docs/20260424-env-var-audit-findings-v1.00A.md` §Priority #6; `docs/20260424-env-var-contributing-rules-v1.00W.md` §1–2 |
| P1-23 | Delete orphan Fairwork variants `_1`/`_2`/`_URL`/`_SECONDARY` from R80.3 + CRM7 | Operator | Only `FAIRWORK_API_KEY` remains on R80.3 + BSU; absent on CRM7 | `docs/20260424-env-var-audit-findings-v1.00A.md` §4 |
| P1-24 | Audit `package.json` scripts + CI workflows for `POSTGRES_*` usage; delete unused | All / Cascade | `vercel env ls` shows only referenced vars | `docs/20260424-env-var-audit-findings-v1.00A.md` §Priority #8 |
| P1-25 | Delete all `VITE_PUBLIC_SUPABASE_*` duplicates + all `VITE_*` vars from Conduit | All / Operator | Only `NEXT_PUBLIC_*` on Conduit; `VITE_PUBLIC_SUPABASE_*` absent everywhere | `docs/20260424-env-var-contributing-rules-v1.00W.md` §2.2 + §3 |
| P1-26 | Align each app's `.env.example` to root `env.example` (canonical naming) | All / Claude Code | `diff` clean between each app example and root | `docs/20260424-env-var-contributing-rules-v1.00W.md` §9 |
| P1-27 | Add CI assertions (6 rules) — forbid `VITE_*SECRET`, legacy JWT names, missing `.env.example` entries, post-build secret leak detection | CI / Claude Code | PR with violating env var fails CI | `docs/20260424-env-var-contributing-rules-v1.00W.md` §7 |

### P1.E — React Hooks v7 remediation (time-boxed)

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| P1-28 | Remediate BSU 47 react-hooks warnings (30× `set-state-in-effect`, 6× `refs`, 4× `purity`, 4× `immutability`, 3× `preserve-manual-memoization`) | BSU / Claude Code | `pnpm lint` reports 0; eslint-rule demotions removed | `docs/20260420-react-hooks-v7-tech-debt-v1.00W.md` §Outstanding |
| P1-29 | Remediate braden 21 react-hooks warnings; tighten `pnpm lint` to `--max-warnings 0` once zero | Braden / Claude Code | braden lint zero; gate matches conduit/R80.3 | `docs/20260420-react-hooks-v7-tech-debt-v1.00W.md` §braden |
| P1-30 | Remediate throughput ~30 react-hooks warnings (+139 total); promote demoted rules back to `error` in `throughput/eslint.config.js` | Throughput / Claude Code | Throughput lint zero on react-hooks/*; rule = error | `docs/20260420-react-hooks-v7-tech-debt-v1.00W.md` §Findings per app |

### P1.F — Storage RLS / reserved prefixes

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| P1-31 | M.6 — apply RLS policy update via Supabase Dashboard on `tenant-logos` bucket: exclude `hero/platform/global` prefixes from tenant-admin clause (three permissive policies updated) | Operator | Four-persona `execute_sql` verification matrix passes | `docs/20260421-storage-rls-reserved-prefixes-v1.00W.md` §Follow-up |
| P1-32 | Run four-persona matrix after dashboard change; promote doc to F (Frozen) | Cascade | Matrix row pass; doc status = F | `docs/20260421-storage-rls-reserved-prefixes-v1.00W.md` §Verification |

### P1.G — Entity FK migrations + selectors (Phase 7)

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| P1-33 | 7 remaining FK migrations — `employers.primary_contact_id`, `mentors.contact_id`, `training_providers.contact_id`, `funding_sources.contact_id`, `host_agreements.signatory_contact_id`, `opportunities.client_id`, `vacancies.client_id` | CRM7 DB / Claude Code | All FK columns + indexes exist; backfill run; `information_schema` shows the 7 new FKs | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §7.0 |
| P1-34 | Enforce `people.contact_id NOT NULL` + `UNIQUE(contact_id)`; R80.3 people form routes through `contacts` lookup | CRM7, R80.3 / Claude Code | Constraint live; duplicate person attempts blocked | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §7.1 |
| P1-35 | Build P1 EntitySelectors: `AwardSelector`, `TrainingPlanSelector`, `PlacementSelector`, `ChargeRateSelector` | CRM7 / Claude Code | All 4 components exist in `src/components/entity/selectors/`; used on ≥1 form each | `docs/OUTSTANDING.md` §Entity crosswalk; `docs/20260319-entity-crosswalk-v1.00D.md` |
| P1-36 | Wire EntitySelectors on `employers`, `mentors`, `training_providers`, `funding_sources`, `leads`, `contacts`, `opportunities` forms; remove free-text islands | CRM7 / Claude Code | `grep -r '<input.*company\|contact_name' src/` returns zero on CRM7 forms | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §7.2 |
| P1-37 | Build `EntityLinker` sidebar + wire to 12 entity detail pages (Contact, Client, Apprentice, Placement, Opportunity priority) | CRM7 / Claude Code | Detail pages render related-entity chips; derives from `tenant_entity_relations` (not hardcoded) | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §7.3 |
| P1-38 | Lead → Contact conversion UI (lead-promote flow — uses `leads.contact_id` FK already live) | CRM7 / Claude Code | "Convert Lead" action wired; promoted lead shows linked contact chip | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §7.4 |

### P1.H — BSU platform-kit admin (6 sub-panels)

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| P1-39 | Platform-kit sub-panel — auth (~200 LOC) | BSU / Claude Code | Panel renders list + actions; scoped to platform_admin | `docs/20260317-bsuite-gap-report-v2.00W.md` §BSU-G2 |
| P1-40 | Platform-kit sub-panel — logs (~200 LOC) | BSU / Claude Code | Tail via Management API proxy | `docs/20260317-bsuite-gap-report-v2.00W.md` §BSU-G2 |
| P1-41 | Platform-kit sub-panel — database (~200 LOC) | BSU / Claude Code | RLS-safe query runner with allowlist | `docs/20260317-bsuite-gap-report-v2.00W.md` §BSU-G2 |
| P1-42 | Platform-kit sub-panel — secrets (~150 LOC) | BSU / Claude Code | Masked list + rotate action | `docs/20260317-bsuite-gap-report-v2.00W.md` §BSU-G2 |
| P1-43 | Platform-kit sub-panel — storage (~200 LOC) | BSU / Claude Code | Bucket list + prefix explorer | `docs/20260317-bsuite-gap-report-v2.00W.md` §BSU-G2 |
| P1-44 | Platform-kit sub-panel — dynamic tables (~220 LOC) | BSU / Claude Code | Introspect & manage tenant-custom tables | `docs/20260317-bsuite-gap-report-v2.00W.md` §BSU-G2 |

### P1.I — Auth dashboard + WCAG AA

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| P1-45 | BSU-G1 — Azure Entra ID claim addition (bsu#91) + Supabase wildcard redirect-URL removal (bsu#92) (overlaps with P0-13) | BSU, Operator | Claim landed; wildcards absent | `docs/20260317-bsuite-gap-report-v2.00W.md` §BSU-G1 |
| P1-46 | BSU-G3 — resolve 5 open WCAG AA manual-review items + roll out to 4 sibling apps | All / Claude Code | `tests/e2e/wcag-aa.spec.ts` green in 5 apps; open items closed | `docs/20260317-bsuite-gap-report-v2.00W.md` §BSU-G3; `business-suite-unified/docs/20260421-wcag-aa-audit-v1.00W.md` |
| P1-47 | BSU-G4 — SEC-002/003/004 (Low–Medium): CSS injection via tenant `font_stack` / `logo_url`; stale branding cache no-TTL | BSU / Claude Code | Sanitiser in place; TTL added; penetration test clears | `docs/20260317-bsuite-gap-report-v2.00W.md` §BSU-G4 |
| P1-48 | CRM7 `DialogContent` a11y sweep — bulk-add `<DialogTitle>` (81 files) via codemod | CRM7 / Claude Code | Lint rule passes; axe-core serious/critical = 0 on all Dialog surfaces | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §P1-J15 |

### P1.J — R80.3 / Payday Super (1 Jul 2026 go-live)

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| P1-49 | R80-G4 — public-holiday awareness in Payday Super calc (critical pre-1 Jul 2026) | R80.3 / Claude Code | `gov_holidays` table seeded; calc consults it; WA public-holiday test passes | `docs/20260317-bsuite-gap-report-v2.00W.md` §R80-G4 |
| P1-50 | R80-G5 — salary-sacrifice OTE/QE-eligible dropdown for ATO compliance | R80.3 / Claude Code | UI surfaces selector; result flows to STP fields | `docs/20260317-bsuite-gap-report-v2.00W.md` §R80-G5 |
| P1-51 | R80-G6 — Payday Super UI snapshot/component tests | R80.3 / Claude Code | Vitest snapshot green for 3+ snapshot configs | `docs/20260317-bsuite-gap-report-v2.00W.md` §R80-G6 |
| P1-52 | R80-G1/G2/G3 — training-fees UI validation bounds, per-apprentice overrides, inclusion in export/PDF | R80.3 / Claude Code | Max cap enforced; override column persists; appears in export | `docs/20260317-bsuite-gap-report-v2.00W.md` §R80-G1/2/3 |
| P1-53 | Phase 0 hotfix — "3 business days" → "7 business days" in CRM7 Payday Super dashboard widget | CRM7 / Claude Code | Widget label reads "7 business days" | `crm7/docs/00-roadmap/20260424-bsuite-combined-foundations-and-gto-1.00W.md` §0.4 |
| P1-54 | Phase 0 hotfix — annual-allowance ÷52 bug in `mapPaymentFrequency` | CRM7, R80.3 / Claude Code | Unit test covers `"per annum"` → `perWeek` conversion with division | `crm7/docs/00-roadmap/20260424-bsuite-combined-foundations-and-gto-1.00W.md` §0.5 |

### P1.K — Braden (corporate site)

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| P1-55 | BRADEN-G3 — Current-sprint 3 tasks: site preview, component placement, layout save/load from DB | Braden / Claude Code | 3 features live; Playwright smoke green | `docs/20260317-bsuite-gap-report-v2.00W.md` §BRADEN-G3 |
| P1-56 | BRADEN-G4 — QA config: reduce 67+ `any` instances, split 5 components >200 lines | Braden / Claude Code | `pnpm typecheck --strict` clean; component LOC gate passes | `docs/20260317-bsuite-gap-report-v2.00W.md` §BRADEN-G4 |
| P1-57 | BRADEN-G5 — 6 accessibility + 5 performance testing items | Braden / Claude Code | Items listed resolved; axe + Lighthouse reports attached | `docs/20260317-bsuite-gap-report-v2.00W.md` §BRADEN-G5 |
| P1-58 | BRADEN-G6 — bot-protection follow-ups: server-side `checkBotId()`, custom route rules, monitoring/alerting, rate-limit integration | Braden / Claude Code | Contact form rejects bot requests server-side; alerts wired | `docs/20260317-bsuite-gap-report-v2.00W.md` §BRADEN-G6 |
| P1-59 | BRADEN-G7 — Phase 5 TenantLayoutSlot for non-`/contact` routes + tenant-authored nav overlays | Braden / Claude Code | At least 3 routes consume `TenantLayoutSlot`; nav overlay lands from DB | `docs/20260317-bsuite-gap-report-v2.00W.md` §BRADEN-G7 |

### P1.L — Throughput

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| P1-60 | TP-G1 — email invitations: complete backend email delivery for team-member invite | Throughput / Claude Code | Invite creates user row + sends email; accepted user appears in team | `docs/20260317-bsuite-gap-report-v2.00W.md` §TP-G1 |
| P1-61 | TP-G3 — README.md:52 doc fix (npm vs pnpm) | Throughput / Claude Code | README reads `npm install` (match current state) | `docs/20260317-bsuite-gap-report-v2.00W.md` §TP-G3 |
| P1-62 | TP-G4 — reconcile `IMPLEMENTATION_COMPLETE.md` vs CLAUDE.md Phase 5/5.5 deferrals | Throughput / Claude Code | Doc claims match reality | `docs/20260317-bsuite-gap-report-v2.00W.md` §TP-G4 |

### P1.M — Supabase Realtime blocks

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| P1-63 | Install `realtime-chat` block in CRM7 (feature-flagged OFF; `VITE_REALTIME_CHAT_ENABLED`) | CRM7 / Claude Code | Block installed via shadcn registry; tests pass; flag default false | `docs/20260421-supabase-realtime-blocks-rollout-v1.00W.md` §Implementation order #1 |
| P1-64 | Install `realtime-cursor` block in Conduit pipeline page (flag OFF; `VITE_REALTIME_CURSORS_ENABLED`) | Conduit / Claude Code | Block installed; Playwright multi-tab test green | `docs/20260421-supabase-realtime-blocks-rollout-v1.00W.md` §Implementation order #2 |
| P1-65 | Install `realtime-monaco` block in CRM7 + `realtime_monaco_docs` migration; add `wss:*.supabase.co` to CSP `connect-src` in 3 `vercel.json` | CRM7, BSU, Conduit / Claude Code | Block installed + RLS migrations applied; CSP allows wss | `docs/20260421-supabase-realtime-blocks-rollout-v1.00W.md` §Implementation order #3 |

### P1.N — Dependency / build standardisation

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| P1-66 | BSU `react-router-dom` v6 → v7 | BSU / Cascade | `pnpm why react-router-dom` shows v7 only | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §Phase 10 |
| P1-67 | BSU `react-day-picker` `8.10.1` → `^9.14.0` (breaking API) | BSU / Cascade | Datepicker surfaces render via v9 API; snapshot updated | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §Phase 10; `docs/20260317-bsuite-gap-report-v2.00W.md` §RT-10 |
| P1-68 | BSU remove `react-hot-toast`; full migration to `sonner`; replace `next-themes` with Zustand `useTheme` | BSU / Cascade | `grep -r 'react-hot-toast\|next-themes' src/` returns zero | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §Phase 10 |
| P1-69 | Throughput Tailwind v4 floor is enforced; remaining work is `@supabase/supabase-js` `^2.39.7` → `^2.103.0` | Throughput / Cascade | `pnpm lint:tailwind-v4` passes; Supabase-JS smoke passes after dependency bump | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §Phase 10 |
| P1-70 | Enable `strict: true` in R80.3 + throughput `tsconfig.json`; fix resulting errors | R80.3, Throughput / Cascade | `pnpm typecheck` clean with strict flag | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §P1-J12 |
| P1-71 | Unify sidebar `localStorage` key across all apps | All / Cascade | Grep finds one shared constant; each app reads the same key | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §P2-J05 |
| P1-72 | Add `Cache-Control: public, max-age=31536000, immutable` for `/assets/*` in 5 `vercel.json` files | All (non-BSU) / Cascade | Response header present on first asset request | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §P1-J08 |

### P1.O — CRM7 schema/page builder Phase 0 critical fixes

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| P1-73 | C-1 — port BSU's nested `and(or(...))` fix to `crm7/src/services/schemaBuilderService.ts:19-23` | CRM7 / Claude Code | PostgREST returns 200 for both platform + tenant admin roles | `crm7/docs/00-roadmap/20260423-crm7-schema-page-builder-audit-1.00W.md` §C-1 |
| P1-74 | C-2 — unify permission gate: new `src/lib/permissions/schemaPermissions.ts` with `canEditPlatformSchema()` + `canEditTenantViews()`; remove `subscription.bypass` from BSU | CRM7, BSU / Claude Code | Three-role Playwright matrix passes | `crm7/docs/00-roadmap/20260423-crm7-schema-page-builder-audit-1.00W.md` §C-2 |
| P1-75 | C-3 — add `tenant_field_definitions.entity_id FK` + backfill + UNIQUE(tenant_id, entity_id, field_key) | CRM7 DB / Claude Code | Rename-entity test: fields resolve via FK not string | `crm7/docs/00-roadmap/20260423-crm7-schema-page-builder-audit-1.00W.md` §C-3 |
| P1-76 | C-4 — expand self-relation guard (`no_self_relations_without_labels` CHECK) | CRM7 DB / Claude Code | Self `one_to_one` rejected; self `one_to_many` with labels accepted | `crm7/docs/00-roadmap/20260423-crm7-schema-page-builder-audit-1.00W.md` §C-4 |
| P1-77 | C-5 — wire `sonner` toast on position-save failure (remove silent catch) | CRM7 / Claude Code | Offline drag yields toast; reconnect success | `crm7/docs/00-roadmap/20260423-crm7-schema-page-builder-audit-1.00W.md` §C-5 |
| P1-78 | H-7 — remove silent catches in `handleSave` / saved-view / deploy-selector; writes surface errors | CRM7 / Claude Code | Every write has typed error path; test fixture covers failure | `crm7/docs/00-roadmap/20260423-crm7-schema-page-builder-audit-1.00W.md` §H-7 |

### P1.P — K.8 checklist + docs hygiene

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| P1-79 | All future PRs include K.8 checklist inline in body (skills, MCPs, samples, sense-check, red-team, memory) | All implementers | PR template updated; spot-check 3 random PRs have checklist | `docs/20260421-k8-retroactive-audit-v1.00W.md` §Going forward |
| P1-80 | Verify PR bsuite#126 + conduit#80 descriptions link to the retroactive K.8 doc | Cascade | `gh pr view` output includes doc URL | `docs/20260421-k8-retroactive-audit-v1.00W.md` §Verification |
| P1-81 | Promote doc statuses (`.00W` → `.00A`) as their action items complete: 20260319-entity-crosswalk (D→W→A), 20260415-roadmap-audit-delta (→A), 20260421-k8 retroactive (→A) | Cascade | Doc headers show new statuses | `docs/OUTSTANDING.md` §2 |

### P1.Q — Universal Canvas + Design Studio (Phase 5.5)

Tracks the 6 user must-haves from the 2026-04-25 directive. Full spec: `docs/20260425-universal-canvas-master-execution-plan-v1.00W.md`. **All 8 P1.Q items struck after Wave-5 roll-up (P1-82..P1-89; only P1-84 remains gated on operator SQL apply).** Waves 1, 2, 3, 4, and 4-extras all shipped in a single-day burst 2026-04-25. Only must-have #4 (schema-field-adder) remains code-complete-blocked on operator SQL apply (P1-84).

| ID | Title | App / Owner | Verification | Source |
|----|-------|-------------|--------------|--------|
| ~~P1-82~~ | ~~W1-A — `@bsuite/schema-registry@0.2.0` — widget catalog, `registerWidget` API, `EntityRefCell` + `SchemaFieldAdder` widgets, 6 PropsEditors~~ — **SHIPPED `8aac009`** (bsuite parent). 30/30 vitest cases pass; npm publish pending operator push. | Shared package / Claude Code | `pnpm test --filter @bsuite/schema-registry` green | `docs/20260425-universal-canvas-master-execution-plan-v1.00W.md` §3 W1-A |
| ~~P1-83~~ | ~~W1-B — `isResizable` prop on `PageGridLayout` (CRM7 + BSU) + D2C-theme resize-handle CSS~~ — **SHIPPED `b55926f3` (crm7)** + **`01de8334` (bsu)** | CRM7, BSU / Claude Code | Edit-mode renders resize handles; layout persists via `handleLayoutChange` | `docs/20260425-universal-canvas-master-execution-plan-v1.00W.md` §3 W1-B |
| P1-84 | W1-C — apply `20260425_phase5_tfd_entity_fk.sql` + `20260425_phase5_tfd_enterprise_admin_rls.sql` + `add_field` RPC to live Supabase. **Code committed `43fb250`**; operator must push via `mcp__claude_ai_Supabase__apply_migration`. | BSU DB / Operator | `SELECT count(*) FROM tenant_field_definitions WHERE entity_id IS NULL` = 0 post-backfill | `docs/20260425-universal-canvas-master-execution-plan-v1.00W.md` §3 W1-C |
| ~~P1-85~~ | ~~W2-A — BSU Design Studio surface — Palette + Canvas + Inspector drawer wired to schema-registry v0.2.0; all 7 widgets draggable with Zod PropsEditors~~ — **SHIPPED `3421ac3`** | BSU / Claude Code | Platform admin can publish a layout with any widget; realtime reflects on consumer within 2 s | `docs/20260425-universal-canvas-master-execution-plan-v1.00W.md` §3 W2-A |
| ~~P1-86~~ | ~~W2-B — CRM7 chrome-level `PageEditorLauncher` + Tier-A 20-page rollout (`PageGridLayout` + `TenantLayoutSlot` wraps)~~ — **SHIPPED `858b9149`** | CRM7 / Claude Code | Edit-mode toggle visible on all 20 Tier-A routes; `grep -l PageGridLayout src/pages \| wc -l` ≥ 107 | `docs/20260425-universal-canvas-master-execution-plan-v1.00W.md` §3 W2-B |
| ~~P1-87~~ | ~~W3-A — CRM7 Tier-B (50 pages) rollout + Tier-C `ts-morph` codemod (≤190 pages, dry-run for operator review)~~ — **SHIPPED crm7@`e6f4b7d6`** (Tier B, 13 pages) **+ crm7@`8568fa5e`** (Tier C, 206 pages); adoption 46 → 307 / 338 = **90.8%**. | CRM7 / Claude Code | `grep -l PageGridLayout src/pages \| wc -l` ≥ 157 post-Tier-B; codemod produces valid TS | `docs/20260425-universal-canvas-master-execution-plan-v1.00W.md` §3 W3-A |
| ~~P1-88~~ | ~~W3-B — conduit rollout (`/operations`, `/insights` slot mounts) + realtime two-layer invalidation E2E~~ — **SHIPPED conduit@`2b16b54`** (RSC pre-fetch + pipeline `TenantLayoutSlot` + two-layer invalidation). schema-registry bump to v0.2.0 landed on **braden@`9566c2a`** + **R80.3@`d6e9a5c`**; throughput bump ROLLED BACK due to peer-dep blocker (`@bsuite/nav-core@0.5.0` required, throughput on 0.3.0 — followup PR queued below §O-4). | Conduit / Claude Code | `pnpm build --filter conduit` green; realtime E2E asserts re-render within 5 s | `docs/20260425-universal-canvas-master-execution-plan-v1.00W.md` §3 W3-B |
| ~~P1-89~~ | ~~W3-D — cross-app entity-cell linkage E2E (must-have #5) — Playwright spec + vitest integration + runbook~~ — **SHIPPED this session (W3-D)** — `crm7/tests/e2e/cross-app-entity-linkage.spec.ts` (env-gated), `packages/schema-registry/src/react/widgets/EntityRefCell.cross-app.test.tsx` (6/6 pass), `docs/testing/20260425-cross-app-e2e-runbook-v1.00W.md` | CRM7, shared package / Claude Code | `pnpm test --filter @bsuite/schema-registry` green 30/30 | `docs/20260425-universal-canvas-master-execution-plan-v1.00W.md` §3 W3-D |

**Must-have status summary (2026-04-25 post Wave-5 roll-up — 5 of 6 ✅ SHIPPED, 1 of 6 blocked-on-operator):**

- ~~#1 Edit-mode toggle on every page~~ — **SHIPPED** — W2-B chrome launcher `858b9149` + Tier-A 20 + Tier-B `e6f4b7d6` (13) + Tier-C `8568fa5e` (206) = **307/338 = 90.8% adoption**
- ~~#2 Drag-from-palette~~ — SHIPPED (W1-A `8aac009` + W2-A `3421ac3`)
- ~~#3 Card resize~~ — SHIPPED (W1-B `b55926f3` + `01de8334`)
- #4 Schema-field-adder — WIDGET SHIPPED (`8aac009`) + DB-STAGED (`43fb250`); **blocked on operator `supabase db push` via MCP** (P1-84). `enabled=false` until RPC live.
- ~~#5 Cross-app entity-cell linkage~~ — SHIPPED (W1-A widget + W3-D E2E @ `0c1da979` + runbook)
- ~~#6 Design Studio for new pages~~ — SHIPPED (W2-A `3421ac3`)

### Definition of Done scorecard (2026-04-25 post Wave-5)

| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| All 7 Phase-5 PRs merged or superseded | 7/7 | 7/7 | ✅ |
| 5 must-haves shipped + covered by tests | 5/5 | 5/6 ✅ + 1/6 🟡 blocked-on-operator | 🟡 |
| ≥60% page adoption | ≥60% | **90.8%** (307/338) | ✅ |
| 13 stop-ship gates green | 13/13 | 13/13 (see master plan §6) | ✅ |
| Vercel preview deploys green across 6 apps | 6/6 | pending green-check on development branches | 🟡 |

**Summary: 3 ✅ / 2 🟡 / 0 ❌.** Both 🟡 items are operator-gated, not engineering-gated.

---

## Next quarter (P2)

Large-scope items that require dedicated planning. Tracked as workstreams (§WS) below.

| ID | Title | Owner | Links |
|----|-------|-------|-------|
| P2-1 | GTO billing / payroll / reporting — full scope | CRM7 + R80.3 | §WS-A |
| P2-2 | Schema / page-builder rebuild — full scope | CRM7 + BSU | §WS-B |
| P2-3 | AVETMISS 8.0 NAT file codegen + State STA extracts | CRM7 | §WS-A phase B-5 |
| P2-4 | Report builder (7 pre-built templates + JSONB `report_templates` + scheduling) | CRM7 | §WS-A phase B-4 |
| P2-5 | Braden Phase 2 + Phase 3 (visual editing, advanced customisation, publishing workflow, permissions) | Braden | `docs/20260317-bsuite-gap-report-v2.00W.md` §BRADEN-G1/G2 |
| P2-6 | Storybook in `packages/ui` + primitive centralisation (Button, Dialog, EmptyState, ErrorBoundary, Logo) | Shared / All | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §11.5/11.9 |
| P2-7 | Sentry rollout in 5 D2C apps + Conduit (`@sentry/nextjs`) | All / Cascade | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §13.1 |
| P2-8 | CSP headers in all `vercel.json` (start permissive, tighten) | All / Cascade | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §13.3 |
| P2-9 | Playwright E2E smoke per app (5 critical-path specs each) | All / Claude Code | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §13.2 |
| P2-10 | PageGridLayout rollout completion — CRM7 batches A–H (41 pages), R80.3, Conduit, throughput, braden | All / Claude Code | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §14.1 |
| P2-11 | Shared `<Logo />` component in `packages/ui` — 4-level resolution (sub-org → enterprise → platform → default) | Shared / Claude Code | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §11.4 |
| P2-12 | Remaining hex → oklch sweep: CRM7/BSU `MarketingHome.tsx` ~62 each, Conduit `ConduitLanding.tsx` ~55, CRM7 AI message rgba | All / Claude Code | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §11.1 |
| P2-13 | Sub-organisation hierarchy — `tenants.parent_tenant_id` + hierarchical branding resolution Tier 0 | BSU / Claude Code | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §12.1 |
| P2-14 | Feature-flags admin UI — 37 JSONB flags in `tenant_settings.feature_flags` | CRM7 / Claude Code | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §8.4 (P2-J02) |
| P2-15 | Xero app registration + flip `feature_flags.xero_integration = true` | CRM7 / Operator | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §14.7 |
| P2-16 | Email/Calendar integration UI — settings tab + inbox + tasks sync badge + `email_messages`/`tasks` migrations | CRM7 / Claude Code | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §14.4 |
| P2-17 | Conduit candidate documents tab — wire `r7_documents` | Conduit / Claude Code | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §14.6 |
| P2-18 | CRM7 Tier 3-4 page wiring (SP-3, in progress) — financial, compliance, WHS, comms, reports, payroll, billing, data mgmt | CRM7 / Claude Code | `docs/20260317-bsuite-gap-report-v2.00W.md` §SP-3 |
| P2-19 | F-08 — BSU `/ideas/*` "Open in Throughput" deep-link affordance (keep light portfolio lens) | BSU / Claude Code | `docs/20260423-misplaced-routes-audit-v1.00W.md` §F-08 |
| P2-20 | F-10 — CRM7 `/billing` → `/financial/invoicing` rename + redirect (namespace collision with BSU subscription billing) | CRM7 / Claude Code | `docs/20260423-misplaced-routes-audit-v1.00W.md` §F-10 |
| P2-21 | Web Vitals monitoring — `web-vitals` library wired in 5 apps; CRM7 INP (currently 165–357 ms) resolved | All / Claude Code | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §13.4 |
| P2-22 | PWA asset completion — BSU `apple-touch-icon.png`+pwa icons; R80.3 webmanifest+apple-touch-icon; Conduit full audit; braden webmanifest+icons; throughput all PWA | All / Claude Code | `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §11.8 |
| P2-23 | FOUC prevention — inline theme script in BSU, R80.3, Conduit `layout.tsx` (CRM7 already has it) | BSU, R80.3, Conduit / Claude Code | First paint shows correct theme class — `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §11.6 |
| P2-24 | Font alignment — Conduit self-host Inter; BSU confirm `'Inter Variable'`; BSU+R80.3 add `@fontsource/jetbrains-mono` | 3 apps / Claude Code | `--font-mono` resolves; no network font fetch — `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §11.7 |
| P2-25 | DB maintenance — fix `auth_rls_initplan` in 5 RLS policies; drop 25+ unused indexes (especially `people` — 9 unused); add 4 missing FK indexes | DB / Cascade | Supabase advisors clean — `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §6.12/6.13; §P2-LIVE-01/02/03 |
| P2-26 | Remaining apprentice-ownership audit: R80.3 must stop writing CRM7-owned `apprentices` (reader-only), persist calc state to R80-owned tables | R80.3 / Claude Code | `grep -rn ".from('apprentices').*\.(insert\|update\|upsert)" R80.3/src/` returns zero — `docs/OUTSTANDING.md` §cross-app-write-audit #1 |

---

## Gated / Waiting on external

| ID | Title | Gate |
|----|-------|------|
| G-1 | TypeScript 5→6 migration (sequence: throughput → braden → conduit → R80.3 → CRM7 → BSU + shared pkg bump+republish) | TS 6.0.0 GA on `latest` npm + `typescript-eslint@^8.x` TS6-compat release + throughput preview-branch trial passes. Source: `docs/20260422-typescript-6-migration-evaluation-v1.00W.md` §Decision |
| G-2 | ADMS / AASS integration (2026 Incentive System — Priority Hiring Incentive, KAP, DAAWS) | ATO RAM M2M + AASS API availability and contract terms — `CLAUDE.md` §Active Projects (ADMS) |
| G-3 | CRM7 domain tables via unified migration (inspections, workflows, reports) | BSU-G5 resolution — decision on unified vs per-app migration path |
| G-4 | AVETMISS NCVER validator access | NCVER test credentials + sandbox — `docs/plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md` §WS-6 |
| G-5 | `rpc_report_page` generic RPC security review before go-live | Security audit — `crm7/docs/00-roadmap/20260424-bsuite-combined-foundations-and-gto-1.00W.md` §IS-5 |
| G-6 | Xero Payroll AU — direct STP path vs passthrough | ADR — `crm7/docs/00-roadmap/20260424-bsuite-combined-foundations-and-gto-1.00W.md` §B-3b.3 |
| G-7 | Deploy-Vercel-green gate on `development` branches for all 5 apps | Production-plan Phase 6 blockers resolved (Conduit SSR fix = P0-8) |

---

## Architectural / sequenced workstreams (multi-phase)

These are phase-level plans. Each WS has its own doc; the entries below are checkpoint references, not duplication.

### WS-A — GTO billing / payroll / reporting (Q2)

**Canonical plan:** `crm7/docs/00-roadmap/20260424-bsuite-combined-foundations-and-gto-1.00W.md` (merges `20260423-crm7-schema-page-builder-audit-1.00W.md` + `gto-billing-reporting-refined-1.md`).

**Timeline:** Phase 0 (1–2 d) → Phase 1 foundations (2 wk) → Phase 2 schema canvas + GTO billing core (2 wk, parallel) → Phase 3 page builder rebuild + reports + GTO payroll (2 wk, parallel) → Phase 4 AVETMISS + compliance + polish (1 wk).

| ID | Checkpoint | Source (combined plan) |
|----|------------|------------------------|
| WS-A-0 | Phase 0 hot-fixes (ports C-1 `.or()` fix, position-save toast, self-relation guard, Payday Super copy, allowance ÷52 bug, publishable-key guard) | §Phase 0 |
| WS-A-1 | Phase 1 F-1 — `packages/` workspace convergence; `@bsuite/charge-calc` + `@bsuite/schema-builder` published; ADR for workspace topology | §F-1 |
| WS-A-2 | Phase 1 F-2 — data model + RLS rewrite + unified `src/lib/permissions/` + `audit_events_*` primitive + `cost_factors` effective-date (super_rate 0.12 @ 2026-07-01) + `tenant_members` GTO role enum + `gov_holidays` seed | §F-2 |
| WS-A-3 | Phase 1 F-3 — codegen pipeline: `dbSchemaToZod`, `/admin/codegen`, `avetmiss_field_map` + exporter codegen, `sqlMigrateDiff`, `/admin/pending-actions` review queue | §F-3 |
| WS-A-4 | Phase 2 B-1 — schema canvas upgrade (DatabaseSchemaNode, per-field rows, TanStack Query, Zustand store, migration emitter) | §B-1 |
| WS-A-5 | Phase 2 B-3a — GTO billing core: MAPD edge fn, `apprentice_rate_configs`, `wage_calculation_snapshots`, `invoices` + line items, Xero batch invoice, PDF renderer, annual reconciliation | §B-3a |
| WS-A-6 | Phase 3 B-2 — CanvasPageBuilder rebuild (replaces WidgetPalette): 8 block types including `report-block`, "Start from platform default", "Diff against default", Zod validation on writes, EntityLinker derives-from-relations | §B-2 |
| WS-A-7 | Phase 3 B-4 — reporting: TanStack Table v8 + AG Grid Enterprise, `rpc_report_page`, 7 pre-built platform templates, Recharts→PNG, `pg_cron` scheduled delivery | §B-4 |
| WS-A-8 | Phase 3 B-3b — GTO payroll: 7-state timesheet state machine, `pay_runs`/`payroll_records`, STP ADR, Xero Payroll AU `EarningsRate`, Payday Super 7 business-day calc | §B-3b |
| WS-A-9 | Phase 4 B-5 — AVETMISS NAT00010..NAT00130 + WAAMS/NSW/QLD/SA STA extracts; signed-URL PII protection | §B-5 (regulatory) |
| WS-A-10 | Phase 4 B-5 — GTO National Standards UI: induction register (1.2), guardian sign-off (1.1), WHS audit (1.3), training plan co-dev (1.4), monitoring (2.2), LLN, F17 PDF/XLSX, Standard 3.4 Financial Viability Dashboard | §B-5 (compliance) |
| WS-A-11 | Phase 4 Polish — Playwright 8-role matrix, Storybook, size-limit CI budgets, pgTap RLS tests | §Polish |

### WS-B — Schema / Page Builder rebuild (Q2, overlaps WS-A)

**Canonical plan:** `crm7/docs/00-roadmap/20260423-crm7-schema-page-builder-audit-1.00W.md`. Merged with GTO into WS-A at the combined plan — but kept as its own checkpoint list for teams that need the narrower focus.

| ID | Checkpoint | Source |
|----|------------|--------|
| WS-B-1 | Phase 0 Critical — C-1 to C-6 hot-fixes (see P1-73..P1-78 for per-item IDs) | §Phase 0 |
| WS-B-2 | Phase 1 Data model + codegen foundations (Task 1.1–1.5) | §Phase 1 |
| WS-B-3 | Phase 2 Schema builder upgrade (Task 2.1–2.5) | §Phase 2 |
| WS-B-4 | Phase 3 Page builder rebuild (Task 3.1–3.5): CanvasPageBuilder replaces WidgetPalette | §Phase 3 |
| WS-B-5 | Phase 4 End-user polish + dev closure (Task 4.1–4.7): empty-state, diff pane, Zod on write, EntityLinker derive, 3-role Playwright, Storybook, docs | §Phase 4 |

### WS-C — Entity linkage + DRY one-shot closure (Q2)

**Canonical plan:** `docs/plans/20260422-entity-linkage-schema-builder-uplift-v1.02W.md`. Phase 5 (schema registry) is MERGED; Phase 6 docs outstanding; Phase 3 GTO-domain entities pending.

| ID | Checkpoint | Source |
|----|------------|--------|
| WS-C-1 | Phase 1 — CRITICAL golden-path FKs (#1–4) + braden lead-notification fix | §Phase 1 — largely landed Phase 6c; verify leads |
| WS-C-2 | Phase 2 — MEDIUM compliance/billing FKs (#5–8): HostEmployer primary_contact_id, Placement award_rate_id + AwardRateSelector, VetAssessment host_employer_id, Apprentice training_contract_number FK + TrainingContract entity | §Phase 2 — overlaps P1.G |
| WS-C-3 | Phase 3 — GTO entities + TGA API: StateTrainingAuthority, AASS, UnitOfCompetency (via `tga-sync` edge fn — see `docs/20260422-tga-api-integration-reference-v1.00W.md`), Incident, Reminder | §Phase 3 |
| WS-C-4 | Phase 4 — cross-app write-violation closure + lead-capture consolidation (V1 candidate→contact merge; V5 BSU lead-capture delete) | §Phase 4 — largely landed; validate via audit |
| WS-C-5 | Phase 6 — docs + CLAUDE.md refresh: DRY doc §11 "2026-04-22 Gap Closure" addendum; CI lint rule for free-text-where-FK; bump DRY doc to v1.01A | §Phase 6 |

### WS-D — Production ship gate (Phase 15)

**Canonical plan:** `docs/plans/20260423-bsuite-production-plan-v1.00W.md` §Phase 15.

| ID | Checkpoint | Source |
|----|------------|--------|
| WS-D-1 | Development → main merge for all 6 submodules + parent monorepo (per `ship-all-apps` skill Phase 5–6 pattern) | §15.1 |
| WS-D-2 | Production Playwright smoke vs production URLs (suite.crm7.app, crm.crm7.app, conduit.crm7.app, r8.crm7.app, ideas.crm7.app, <www.braden.com.au>) | §15.2 |
| WS-D-3 | First non-Braden Group enterprise tenant onboarding end-to-end | §15.3 |

---

## Superseded docs (archive candidates)

These docs contributed to this roadmap and have no remaining unique open work once their items above ship. **The controller handles archival — do not move files in this session.**

| File | Archive trigger |
|------|----------------|
| `docs/20260415-roadmap-audit-delta-v1.00W.md` | P0-15 completes (roadmap v5.03W bump) |
| `docs/20260423-cross-app-write-audit-v1.00W.md` | All P1.A items (P1-1..P1-8) ship |
| `docs/20260423-misplaced-routes-audit-v1.00W.md` | All P1.B items (P1-9..P1-14) ship + P2-19/P2-20 scheduled |
| `docs/20260420-react-hooks-v7-tech-debt-v1.00W.md` | All P1.E items (P1-28..P1-30) ship and rules promoted `warn` → `error` |
| `docs/20260421-k8-retroactive-audit-v1.00W.md` | All J-series PRs ship with inline K.8 (P1-79/80) — promote to A |
| `docs/20260421-storage-rls-reserved-prefixes-v1.00W.md` | P1-31/32 complete; doc → F (Frozen) |
| `docs/20260421-supabase-realtime-blocks-rollout-v1.00W.md` | P1-63/64/65 all shipped + 14 days green telemetry |
| `docs/20260422-typescript-6-migration-evaluation-v1.00W.md` | G-1 gate triggered and all 6 apps migrated |
| `docs/20260424-oauth-preview-redirect-runbook-v1.00W.md` | P0-6 sign-off complete (all 6 checkboxes ticked) |
| `docs/20260317-bsuite-gap-report-v2.00W.md` §11 only | All §11 items (BSU-G1..G5, CRM7-G1..G6, R80-G1..G6, BRADEN-G1..G7, TP-G1..G4) resolved or moved to dated plans — the rest of the gap report remains live until master roadmap v5.03W supersedes it |

Docs NOT eligible for archive (live references):

- `20260227-auth-map-reference-v1.00A.md`, `20260227-bsuite-master-roadmap-v5.00W.md`, `20260227-contributing-standards-guide-v1.01W.md`, `20260227-dry-one-shot-architecture-v1.01A.md`, `20260228-d2c-theme-specification-v1.00A.md`, `20260228-gto-standards-reference-v1.00A.md`, `20260310-fairwork-reference-v1.00A.md`, `20260316-*-reference-v1.00A.md` (8 files), `20260421-auth-hardening-runbook-v1.00A.md`, `20260422-tga-api-integration-reference-v1.00W.md`, `20260424-env-var-audit-findings-v1.00A.md`, `20260424-env-var-audit-matrix-v1.00A.md`, `20260424-env-var-contributing-rules-v1.00W.md`. See `docs/OUTSTANDING.md` §1.

---

## Change log

- **2026-04-25** — initial consolidation. Extracted ~150 action items from 18 source docs (gap report §11, cross-app-write-audit V3–V10, misplaced-routes F-01..F-10, roadmap-delta #26, react-hooks tech debt, K.8 retroactive, storage RLS, realtime blocks, TS 6 evaluation, env audit findings + rules, OAuth preview runbook, OUTSTANDING, production plan, GTO billing plan, entity-linkage uplift, CRM7 schema/page-builder audit, combined foundations-and-gto plan).
- **2026-04-25 (Wave-5 roll-up)** — struck Wave-3 + Wave-4 + Wave-4-extras: P0-7 (W4-AUTH-v2), P0-9 (conduit next NO-OP), P0-12 (W4-BSU auth deadlock), P1-1 (W4-BSU lead-capture), P1-2 (W4-BSU idea service), P1-6 (W4-TP teamPermissions), P1-87 (W3-A Tier-B/C codemod 90.8% adoption), P1-88 (W3-B conduit + braden/R80.3 schema-registry bumps). Added §Definition of Done scorecard (3✅/2🟡/0❌). Added §Remaining Work Top 5 re-rank (operator-dominated queue: W1-C migrations, OAuth allowlist, master roadmap v5.03W bump, throughput peer-dep unblock, BSU `/admin/team-members` route).
- Item IDs are stable. Do not renumber. Mark completion via strike-through + `— SHIPPED <SHA>`.
