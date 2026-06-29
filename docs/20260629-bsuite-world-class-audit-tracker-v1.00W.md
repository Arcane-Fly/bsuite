# BSuite World-Class Audit Tracker

**Date:** 2026-06-29
**Status:** W
**Scope:** Vercel Pro launch readiness plus Australian labour hire / Group Training Organisation product, data, security, role, communications, subscription, and UX readiness across all BSuite apps.

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
| Roles/RLS | BSU + all apps | UI permissions match RLS/JWT claims | Matrix built; 5 parity gaps logged (WC-008…WC-012) | Role-by-role matrix delivered in `20260629-bsuite-role-rls-subscription-parity-matrix-v1.00W.md`; 3 security-sensitive gaps await operator sign-off, 2 low-risk fixes await approval. |
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
| Role-by-role browser/JWT-decode smoke | Deferred to Batch E (Playwright binaries unavailable). |

## Role/RLS/subscription parity findings (WC-007 → WC-008…WC-012)

| ID | Priority | Finding | Disposition |
| --- | --- | --- | --- |
| WC-008 | P2 | `is_platform_admin()` IN-list includes `'super_admin'`, which the `profiles.platform_role` CHECK forbids — dead branch (`is_super_admin` boolean covers it). | Low-risk fix proposed (drop dead literal); awaiting approval. |
| WC-009 | P1 | UI privilege-bypass sets diverge: crm7 `{developer,tester}`, conduit `{developer,tester,platform_admin}`, DB `{is_super_admin,platform_admin,developer}`. | Security-sensitive; canonical shared predicate proposed; awaiting operator sign-off. |
| WC-010 | P1 | App code keys host portal on `host_employer`, but DB `portal_role` CHECK only allows `host_contact` → host contacts mis-route to default `viewer`. | Security-sensitive; align token suite-wide (recommend app→`host_contact`); awaiting operator sign-off. |
| WC-011 | P2 | DB `portal_role='worker'`/`'viewer'` have no app `PortalRole` union member or UI route; `usePortalContext` cast mistypes them. | Low-risk fix proposed (extend union + route `worker`); awaiting approval. |
| WC-012 | P1 | Conduit RBAC reads `user_tenants.role` (owner/admin/manager/staff/guest) not `portal_role`, so its `candidate`/`employer`/`viewer` mappings are unreachable. | Security-sensitive; switch Conduit to `portal_role` (match CRM7) or document intent; awaiting operator sign-off. |

## Change log

- **2026-06-29:** Initial tracker created for the Vercel + world-class BSuite implementation pass.
- **2026-06-29:** Phase 0/1 repo-level corrective actions completed: parent Vercel readiness checker added, BSU/Throughput no-cache headers added, Throughput Vercel Analytics added, Supabase client checker false negative fixed.
- **2026-06-29:** Phase 3 Batch B started: CRM7 task creation now captures existing canonical task entity-link fields for contacts, opportunities, projects, apprentices, and employers.
- **2026-06-29:** Phase 3 Batch B continues: CRM7 communications compose now captures canonical recipient_type / recipient_id links for linked outbound messages.
- **2026-06-29:** Phase 3 Batch B continues: CRM7 calendar event creation now embeds canonical entity references in event descriptions for traceability.
- **2026-06-29:** Phase 3 helper extraction: CRM7 canonical-link payload helpers moved into `src/lib/communications.ts` and `src/lib/calendar.ts`, with unit coverage for task/communication/calendar payload behavior passing.
- **2026-06-29:** Batch D (WC-007): role/RLS/subscription parity matrix built from code+schema inspection; documents three role layers and surfaces five new parity gaps (WC-008…WC-012), three of which are security-sensitive and await operator sign-off before code changes.
