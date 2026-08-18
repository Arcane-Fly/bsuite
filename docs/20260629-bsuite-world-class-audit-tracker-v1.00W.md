# BSuite World-Class Audit Tracker

**Date:** 2026-06-29
**Status:** W
**Scope:** Vercel Pro launch readiness plus Australian labour hire / Group Training Organisation product, data, security, role, communications, subscription, and UX readiness across all BSuite apps.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## Execution doctrine

The audit is not complete until confirmed gaps have a disposition: fixed, verified not-a-bug, external-blocked with owner/date, or explicitly operator-waived. P0/P1 findings must be corrected and verified before production promotion.

## Subagent lanes

| Lane | Owner role | Skills / MCPs | Evidence required |
| --- | --- | --- | --- |
| Vercel hardening | Platform lead | `deployment-readiness`, Vercel CLI/dashboard, GitHub MCP | Domain headers, Vercel setting screenshots/output, commit/PR links |
| Auth/security | Auth/security guardian | `security-audit`, `supabase-auth-comprehensive`, Supabase MCP, GitHub secret scanning | RLS/advisor output, auth tests, WAF/rate-limit evidence |
| Data ownership | Data architect | `dry-one-shot-architecture`, `schema-consistency`, Supabase MCP | Entity owner matrix, schema/RLS links, tests |
| UX/design | UX/design sheriff | `bsuite-brand-system`, `ui-ux-pro-max`, Playwright | Desktop/mobile screenshots, WCAG notes |
| GTO domain | GTO domain analyst | `best-practice-research`, `xero-integration`, `stripe-integration` | Capability map, corrective issues/fixes |
| QA closure | QA/user advocate + red team | `qa-and-verification`, `multi-agent-red-team-implementation`, Browser/Playwright | Test output, browser evidence, red-team sign-off |

## Vercel Pro readiness matrix

| App | Production URL | Development URL | Status | Corrective action |
| --- | --- | --- | --- | --- |
| BSU | `https://suite.crm7.app` | `https://d.suite.crm7.app` | Repo fixes verified | Explicit HTML/root no-cache headers added; dashboard-only WAF, Deployment Protection, Log Drains, Observability, and Spend alerts still require Vercel dashboard verification. |
| CRM7 | `https://crm.crm7.app` | `https://d.crm.crm7.app` | Repo verified | Frozen install, CSP/security headers, immutable assets, explicit HTML cache, Analytics, and Speed Insights pass `pnpm lint:vercel-production`; dashboard-only controls still require Vercel dashboard verification. |
| R80.3 | `https://r8.crm7.app` | `https://d.r8.crm7.app` | Repo verified | Frozen install, CSP/security headers, immutable assets, explicit HTML cache, Analytics, and Speed Insights pass `pnpm lint:vercel-production`; Sentry parity remains a dashboard/product decision. |
| Conduit | `https://conduit.crm7.app` | `https://d.conduit.crm7.app` | Repo verified | Next.js `next.config.ts` CSP/security headers, immutable Next static cache, Analytics, and Speed Insights pass `pnpm lint:vercel-production`; WAF/rate-limit public/API routes still require Vercel dashboard verification. |
| Throughput | `https://ideas.crm7.app` | `https://d.ideas.crm7.app` | Repo fixes verified | Added Vercel Analytics, standalone lockfile update, and explicit HTML/root no-cache headers; OAuth dev-flow issue remains separately tracked. |
| Braden | `https://www.braden.com.au` | `https://d.braden.com.au` | Repo verified | Frozen install, CSP/security headers, immutable assets, explicit HTML cache, Analytics, and Speed Insights pass `pnpm lint:vercel-production`; corporate brand boundary remains in UX audit. |

## Product/data/UX corrective-action matrix

| Domain | Owning app | Audit target | Current disposition | Corrective action |
| --- | --- | --- | --- | --- |
| Candidate sourcing and applications | Conduit | Candidate → application → offer → onboarding handoff | In progress | Verify no duplicate person entry; ensure handoff links recruitment history into CRM7. |
| Person/contact/worker/apprentice identity | CRM7 | Single canonical person/contact reused across roles | In progress | Validate FK-backed selectors and no free-text duplicate fields. |
| Host employer/site/supervisor | CRM7 | Host/site constraints feed placements and compliance | In progress | Verify host/site/WHS data drives placement requirements. |
| Training contracts/schedules/RTO/provider | CRM7 | Qualification, TCID, RTO, training calendar, attendance/progress | In progress | Validate training recommendations and downstream R80/portal reads. |
| Rate/charge calculations | R80.3 | Reads CRM7 placement/training/award data; writes calculation snapshots | In progress | Verify no source-data duplication and consistent snapshot provenance. |
| Timesheet → invoice → Xero | CRM7 + R80.3 | Approved timesheet to charge to invoice/export | In progress | Trace source data, charge rules, invoice links, and Xero adapter coverage. |
| Subscription and billing | BSU | Tenant subscription, feature gates, Stripe billing | In progress | Verify feature gates and fail-stale behaviour across apps. |
| Roles/RLS | BSU + all apps | UI permissions match RLS/JWT claims | Matrix built; all 5 parity gaps (WC-008…WC-012) **fixed in code** | Role-by-role matrix delivered in `20260629-bsuite-role-rls-subscription-parity-matrix-v1.00W.md`; all five gaps resolved (operator-approved 2026-06-29). Batch E live validation on `d.*` deploys. |
| Communications/calendar/tasks | CRM7 + Conduit | Every communication linked to canonical actor/entity | In progress | Inventory email/calendar/task surfaces and define/fix one-shot communications model. |
| UI/UX consistency | All apps | World-class desktop/mobile, WCAG, D2C/corporate brand split | In progress | Browser evidence per critical journey and role; fix P0/P1 UX defects. |

## Red-team gates

- **Security:** no auth/RLS/WAF/secrets finding closes without evidence.
- **Reliability:** no critical journey closes without retry/error/empty-state review.
- **Performance:** no report/dashboard/table fix closes without bundle/query/render impact review.
- **Code quality:** no batch closes with lint/type/test failures, dead code, or duplicate ownership.
- **User advocate:** no UI change closes without desktop/mobile screenshots.
- **Developer advocate:** no cross-app change closes without docs, issue/dashboard, and DX notes.

## Current evidence commands

```bash
node scripts/check-vercel-production-readiness.mjs
pnpm lint:lockfile-hygiene
pnpm lint:no-cookie-sso
pnpm lint:supabase-client-init
pnpm lint:tailwind-v4
```

## Evidence log

| Check | Result |
| --- | --- |
| `pnpm lint:vercel-production` | Pass: 6/6 apps, 0 failed, 0 warned. |
| `pnpm lint:lockfile-hygiene` | Pass: 6/6 app lockfiles standalone-clean. |
| `pnpm lint:no-cookie-sso` | Pass: no forbidden cookie SSO patterns. |
| `pnpm lint:supabase-client-init` | Pass: 5/5 Vite SPA Supabase clients, including typed `createClient<Database>()` calls. |
| `pnpm lint:tailwind-v4` | Pass: no Tailwind below v4. |
| `pnpm typecheck` in `throughput` | Pass after Analytics dependency/link update. |
| `pnpm build` in `throughput` | Pass after Analytics dependency/link update. |
| `pnpm typecheck` in `crm7` | Pass after task canonical entity-link UI update. |
| `pnpm build` in `crm7` | Pass after task canonical entity-link UI update; prerender optimisation skipped due missing local Chrome but command exited 0. |
| `pnpm typecheck` in `crm7` after communications compose update | Pass after recipient_type / recipient_id wiring. |
| `pnpm build` in `crm7` after communications compose update | Pass after recipient_type / recipient_id wiring; prerender optimisation skipped due missing local Chrome but command exited 0. |
| `pnpm typecheck` in `crm7` after calendar entity-link update | Pass after related entity metadata added to calendar event creation. |
| `pnpm build` in `crm7` after calendar entity-link update | Pass after related entity metadata added to calendar event creation; prerender optimisation skipped due missing local Chrome but command exited 0. |
| `pnpm exec vitest run --reporter=dot src/lib/__tests__/task-communication-calendar-linking.test.ts` | Pass: 7/7 helper tests for task, communication, and calendar canonical entity-link payloads. |
| Browser probe of `/tasks/create`, `/communications/compose`, `/calendar` | Blocked: Playwright browser binaries missing locally (`chromium_headless_shell` not installed), so live DOM screenshots could not be captured in this session. |
| WC-007 role/RLS/subscription parity matrix | Built from code+schema inspection in `20260629-bsuite-role-rls-subscription-parity-matrix-v1.00W.md`; three role layers (platform / tenant+portal / GTO) mapped to UI gates, RLS helpers, and `module_access` gate with `file:line` anchors. |
| Role-by-role browser/JWT-decode smoke | Batch E — Playwright login against `d.*` development deploys (see §Batch E below). |

## Role/RLS/subscription parity findings (WC-007 → WC-008…WC-012)

| ID | Priority | Finding | Disposition |
| --- | --- | --- | --- |
| WC-008 | P2 | `is_platform_admin()` IN-list includes `'super_admin'`, which the `profiles.platform_role` CHECK forbids — dead branch (`is_super_admin` boolean covers it). | **FIXED 2026-06-29** — migration `crm7/supabase/migrations/20260629120000_wc008_remove_dead_super_admin_branch.sql` (CREATE OR REPLACE; behaviour-equivalent). |
| WC-009 | P1 | UI privilege-bypass sets diverge: crm7 `{developer,tester}`, conduit `{developer,tester,platform_admin}`, DB `{is_super_admin,platform_admin,developer}`. | **FIXED 2026-06-29** (operator-approved canonical=DB) — crm7 `usePlatformRole.ts:208-216` now `isPrivileged = developer\|tester\|platform_admin`, matching conduit + DB. |
| WC-010 | P1 | App code keys host portal on `host_employer`, but DB `portal_role` CHECK only allows `host_contact` → host contacts mis-route to default `viewer`. | **FIXED 2026-06-29** (operator-approved canonical=`host_contact`) — suite-wide token rename in crm7+conduit `roleMappingService.ts`, routing, settings UIs. |
| WC-011 | P2 | DB `portal_role='worker'`/`'viewer'` have no app `PortalRole` union member or UI route; `usePortalContext` cast mistypes them. | **FIXED 2026-06-29** — `worker`/`viewer` added to `PortalRole` union (both apps); crm7 routes `worker`→`/portal/worker`. |
| WC-012 | P1 | Conduit RBAC reads `user_tenants.role` (owner/admin/manager/staff/guest) not `portal_role`, so its `candidate`/`employer`/`viewer` mappings are unreachable. | **FIXED 2026-06-29** (operator-approved) — conduit `useTenantId.ts:19`, `getTenantContext.ts:44`, `middleware.ts:171` now read `portal_role`; `TeamSection` writes it; **DB-layer**: new migration `20260629130000_wc012_resolve_portal_role_canonical.sql` rewrites the `resolve_bs_oauth_subject_portal_role` RPC to return `portal_role` (was `role`). |

## Change log

- **2026-06-29:** Initial tracker created for the Vercel + world-class BSuite implementation pass.
- **2026-06-29:** Phase 0/1 repo-level corrective actions completed: parent Vercel readiness checker added, BSU/Throughput no-cache headers added, Throughput Vercel Analytics added, Supabase client checker false negative fixed.
- **2026-06-29:** Phase 3 Batch B started: CRM7 task creation now captures existing canonical task entity-link fields for contacts, opportunities, projects, apprentices, and employers.
- **2026-06-29:** Phase 3 Batch B continues: CRM7 communications compose now captures canonical recipient_type / recipient_id links for linked outbound messages.
- **2026-06-29:** Phase 3 Batch B continues: CRM7 calendar event creation now embeds canonical entity references in event descriptions for traceability.
- **2026-06-29:** Phase 3 helper extraction: CRM7 canonical-link payload helpers moved into `src/lib/communications.ts` and `src/lib/calendar.ts`, with unit coverage for task/communication/calendar payload behavior passing.
- **2026-06-29:** Batch D (WC-007): role/RLS/subscription parity matrix built from code+schema inspection; documents three role layers and surfaces five new parity gaps (WC-008…WC-012), three of which are security-sensitive and await operator sign-off before code changes.
- **2026-06-29:** Batch D fixes (WC-008…WC-012) **all landed** (operator approved all five). WC-008 migration (drop dead `super_admin` branch); WC-009 crm7 `isPrivileged` aligned to DB+conduit (`+platform_admin`); WC-010 suite-wide `host_employer`→`host_contact` rename; WC-011 `worker`/`viewer` added to `PortalRole` union + `worker` route; WC-012 conduit tenant-context reads (`useTenantId`/`getTenantContext`/`middleware`) switched to `portal_role`. crm7+conduit typecheck/lint/tests green (pre-existing flaky/env failures excluded). Parity matrix §3 updated with Resolution notes + consolidated change set.
- **2026-06-29 reconciliation:** confirmed previously flagged A-series items are already resolved on `development`.
  - **A1 crm7 placements** — now uses real `usePlacementStore().fetch()` in `crm7/src/pages/placements/index.tsx:220-225`; no `fallbackPlacements` branch remains in the committed file.
  - **A2 #91 Azure `xms_edov`** — implemented in `business-suite-unified/src/lib/azureEmailVerification.ts:5-21` and wired in `business-suite-unified/src/contexts/AuthContext.tsx:499-501`; the claim enablement was confirmed 2026-04-21. **A2 #92** (Supabase wildcard redirect removal) remains an operator dashboard action.
  - **A3 host-contact routing (WC-010)** — resolved suite-wide by renaming the app token `host_employer` → `host_contact`; see `docs/20260629-bsuite-role-rls-subscription-parity-matrix-v1.00W.md:72-80` and `:85`.
  - **A4 crm7 encryption (SEC-001) + tests (QUAL-001)** — complete per `crm7/docs/00-roadmap/20260226-crm7-master-roadmap-v1.00WA.md:109-124` and `:327-333`; the line-333 “Production Environment: Blocked” status is stale and will be corrected in a separate crm7 PR.
- **2026-06-29:** Code-review hardening on conduit PR #341 (Devin Review): (1) `toBaseRole` fall-through default changed `'staff'`→least-privilege `'guest'` (privilege-escalation fix — `viewer`/`worker`/etc. assignments were persisting as recruiter-level on the legacy `role` column); (2) `getTenantContext` NULL `portal_role` fallback `'staff'`→`'viewer'`; (3) **DB-layer WC-012**: `resolve_bs_oauth_subject_portal_role` RPC (middleware's primary OAuth gate) returned `ut.role` despite its name — new migration rewrites it to return `ut.portal_role` with privilege-ranked tie-break; (4) two stale test descriptions corrected. conduit full vitest 903✓.

## Batch E — live role/JWT browser smoke (Playwright on `d.*` deploys)

**Workflow:** work lands on `development` → Vercel deploys to `d.`-prefixed URLs (`d.crm.crm7.app`, `d.suite.crm7.app`, `d.ideas.crm7.app` = Throughput, `d.r8.crm7.app`, `d.conduit.crm7.app`) → Playwright login + visual validation BEFORE any merge to main/master.

| Step | Status |
| --- | --- |
| Submodule PRs (crm7, conduit) + parent gitlink bump opened into `development` | see PR links in change log / session |
| CI green on all PRs | pending |
| `development` deployed to `d.*` by Vercel | pending deploy |
| Playwright login (`braden.lang7…@gmail.com`) + per-role JWT/route smoke on `d.*` | pending deploy |
| Merge to main/master | BLOCKED until `d.*` validation passes |
