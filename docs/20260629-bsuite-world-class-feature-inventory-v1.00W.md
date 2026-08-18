# BSuite World-Class Feature Inventory

**Date:** 2026-06-29
**Status:** W
**Scope:** Cross-app feature/entity/role/journey inventory for Australian labour hire and Group Training Organisation readiness.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## Canonical ownership model

| Capability / entity | Owner | Reader apps | Corrective disposition |
| --- | --- | --- | --- |
| Tenants, users, subscriptions, billing, feature gates, OAuth consent | BSU | All apps | Must remain BSU-owned; app-local role gates must map back to tenant/subscription state. |
| Contacts, people, apprentices/workers, host employers, placements, compliance, WHS, training records, timesheets, invoices | CRM7 | BSU, R80.3, Conduit handoff, Braden reporting surfaces where applicable | CRM7 remains operational source of truth; no duplicate create/edit UI elsewhere. |
| Award/rate logic, BOOT, charge calculations, rate snapshots | R80.3 / `@bsuite/charge-calc` | CRM7, BSU | R80.3 writes calculation snapshots only; CRM7 source data must not be duplicated. |
| Candidate sourcing, applications, pipeline, recruitment communications, onboarding handoff | Conduit | CRM7, BSU | Candidate-to-person handoff must preserve recruitment history and avoid re-keying. |
| Ideas, initiatives, business plans, internal roadmap | Throughput | BSU | Throughput remains strategy/product-planning owner. |
| Corporate website, public brand surfaces, corporate lead/contact flows | Braden | BSU/CRM7 as explicit integrations only | Corporate brand remains separate from crm7.app D2C apps. |

## Critical labour hire / GTO journeys

| Journey | Required owner chain | World-class acceptance target | Current corrective action |
| --- | --- | --- | --- |
| Candidate → application → screening → offer → onboarding → CRM7 person/apprentice | Conduit → CRM7 | Candidate details entered once; CRM7 person/apprentice links to source candidate, application, documents, consent, offer, and onboarding snapshot. | Audit Conduit handoff tables/UI and CRM7 receive/create-person path; fix missing source links or duplicate entry fields. |
| Host employer → workplace/site → supervisor → placement → WHS/compliance | CRM7 | Host/site/supervisor selected from canonical records; placement inherits active WHS, supervision, site, and state requirements. | Audit placement and WHS forms for free-text host/site/supervisor fields and missing inherited checks. |
| Apprentice/worker → qualification → training contract → RTO/provider → schedule → attendance/progress | CRM7 | Qualification/TCID/provider/schedule are linked; training recommendations are constrained by state, host/site, qualification, and RTO/provider. | Validate training schedule and provider selectors; fix any missing FK-backed selection or stale provider copy. |
| Timesheet → approval → award/rate calculation → charge → invoice → Xero | CRM7 → R80.3 → CRM7/Xero | Approved timesheets use CRM7 placement/person/host data, R80.3 rate snapshots, idempotent invoice/export links, and Xero adapter schema contracts. | Re-run billing/reporting smoke and check Xero adapter coverage; fix disconnected snapshot provenance. |
| Subscription/tenant/user role → feature access → audit log | BSU → all apps | Feature gates, UI nav, API/RLS, and audit trail agree across all apps, including fail-stale subscription behaviour. | Audit role/permission maps, subscription cache, and app nav gates; fix mismatches. |
| Communication/email/calendar/task → canonical actor/entity | Conduit + CRM7 | Recruitment comms live in Conduit until handoff; operational comms live in CRM7 and link to person/host/placement/training/billing records. | CRM7 task, communications, and calendar canonical-link payload helpers now have unit coverage; continue browser/API evidence capture where live auth/browser tooling is available. |

## Role matrix

| Role | Primary surfaces | Required data boundary | Corrective target |
| --- | --- | --- | --- |
| Platform super admin | BSU + all apps | All tenants only through explicit platform-admin controls | Verify UI claims, RLS/service-role isolation, audit logs. |
| Tenant/org admin | BSU + CRM7 | Own tenant only | Verify tenant scoping and membership-driven feature access. |
| GTO admin/staff | CRM7 + reports | Own tenant operations | Verify access to apprentices, hosts, placements, training, compliance, reports. |
| Field officer | CRM7 + mobile/portal surfaces | Assigned apprentices/hosts/visits | Verify visit records, calendar, tasks, training progress, WHS follow-ups. |
| Host employer/supervisor | CRM7 portals | Their site/workers/placements/timesheets only | Verify RLS, portal routes, approvals, compliance evidence. |
| Apprentice/worker | CRM7 portals | Self-service record only | Verify timesheets, training schedule/progress, documents, notifications. |
| RTO/training provider | CRM7 portals | Assigned cohorts/contracts/training records only | Verify training-plan collaboration and progress evidence. |
| Finance/payroll | CRM7 + R80.3 + Xero | Billing, payroll, invoice, export surfaces only | Verify no overbroad operational/admin access. |
| Candidate | Conduit public/applicant flows | Own application and documents only | Verify public apply, consent, upload, status comms. |
| Executive | BSU + reports | Aggregated tenant metrics, no unnecessary PII | Verify dashboard metrics and privacy minimisation. |
| External auditor | CRM7/BSU evidence packs | Read-only scoped compliance/audit evidence | Verify export/access model before enabling. |

## Cross-cutting corrective findings

| ID | Priority | Finding | Corrective action | Verification |
| --- | --- | --- | --- | --- |
| WC-001 | P0 | Vercel repo-level checklist had no parent guard. | Added `scripts/check-vercel-production-readiness.mjs` and `pnpm lint:vercel-production`. | `pnpm lint:vercel-production` passes 6/6 apps. |
| WC-002 | P1 | Throughput lacked Vercel Analytics despite suite-wide checklist parity. | Added `@vercel/analytics`, rendered production `Analytics`, updated root and standalone lockfiles. | `pnpm typecheck` and `pnpm build` pass in `throughput`; readiness checker passes. |
| WC-003 | P1 | BSU and Throughput Vite SPA entry points lacked explicit root/index no-cache headers. | Added `/` and `/index.html` no-cache/no-store headers. | Readiness checker passes. |
| WC-004 | P1 | Supabase client checker falsely failed typed `createClient<Database>()`, hiding real Braden compliance. | Updated checker regex to support typed calls. | `pnpm lint:supabase-client-init` passes 5/5. |
| WC-005 | P1 | Communications/calendar/task ownership remains underspecified across Conduit/CRM7. | CRM7 task form now captures existing `tasks.related_entity_type` and `tasks.related_entity_id` fields; CRM7 communications compose captures `recipient_type` and `recipient_id`; CRM7 calendar create dialog embeds a canonical entity reference into the event description for traceability. | `pnpm typecheck` and `pnpm build` pass in `crm7`; build exits 0 with prerender optimisation skipped due missing local Chrome. |
| WC-005a | P2 | Canonical-link payload behavior had no direct unit coverage. | Added pure helper modules `src/lib/communications.ts` and `src/lib/calendar.ts` plus `src/lib/__tests__/task-communication-calendar-linking.test.ts` to verify task, communication, and calendar canonical-link payloads. | `pnpm exec vitest run --reporter=dot src/lib/__tests__/task-communication-calendar-linking.test.ts` passes 7/7. |
| WC-006 | P1 | Candidate-to-apprentice handoff needs source-link proof. | Verified Conduit mints `apprentice_handoff_tokens` with candidate/application/job/pipeline snapshot and CRM7 consumes it in `/apprentices/from-candidate` via `create_apprentice_from_candidate` (contact merge + apprentice metadata `source=conduit_handoff`). | Conduit `createApprenticeHandoffToken` enforces `status='hired'` and embeds snapshot; CRM7 RPC merges contact and writes apprentice `custom_fields.snapshot` for traceability. |
| WC-007 | P1 | Role/RLS/subscription parity needs a single evidence matrix. | Built `20260629-bsuite-role-rls-subscription-parity-matrix-v1.00W.md` mapping three role layers (L1 platform `profiles.platform_role`/`is_super_admin`; L2 tenant `user_tenants.role` + portal `user_tenants.portal_role`; L3 GTO `org_members.gto_role`) to UI gates, RLS helpers, and `subscription_plans.module_access`, with `file:line` anchors. | Code+schema inspection complete; role-by-role browser/JWT smoke in Batch E (`d.*` deploys). Five parity gaps logged as WC-008…WC-012 — **all now fixed**. |
| WC-008 | P2 | `is_platform_admin()` IN-list includes `'super_admin'`, forbidden by the `profiles.platform_role` CHECK — dead branch. | Drop the dead literal (`is_super_admin` boolean already covers super admins). | **FIXED 2026-06-29** — migration `crm7/supabase/migrations/20260629120000_wc008_remove_dead_super_admin_branch.sql` (CREATE OR REPLACE; behaviour-equivalent). |
| WC-009 | P1 | UI privilege-bypass sets diverge (crm7 `{developer,tester}` vs conduit `{developer,tester,platform_admin}` vs DB `is_platform_admin`). | Define one canonical `isPrivileged` predicate shared across apps; decide `platform_admin` bypass policy. | **FIXED 2026-06-29** (operator-approved canonical=DB) — crm7 `usePlatformRole.ts:208-216` now `developer\|tester\|platform_admin`, matching conduit + DB. |
| WC-010 | P1 | App code keys host portal on `host_employer`; DB `portal_role` only allows `host_contact`, so host contacts mis-route to `viewer`. | Align the token suite-wide (recommend app token → `host_contact`); fix misleading comments. | **FIXED 2026-06-29** (operator-approved canonical=`host_contact`) — suite-wide token rename in crm7+conduit. |
| WC-011 | P2 | DB `portal_role='worker'`/`'viewer'` lack an app `PortalRole` member or UI route; `usePortalContext` cast mistypes them. | Extend `PortalRole` union and route `worker` to `/portal/worker`. | **FIXED 2026-06-29** — `worker`/`viewer` added to `PortalRole` union (both apps); crm7 routes `worker`→`/portal/worker`. |
| WC-012 | P1 | Conduit RBAC reads `user_tenants.role` not `portal_role`, so its `candidate`/`employer` mappings are unreachable. | Switch Conduit `useTenantId` to read `portal_role` (match CRM7) or document the intended mechanism. | **FIXED 2026-06-29** (operator-approved) — conduit `useTenantId`/`getTenantContext`/`middleware` read `portal_role`; `TeamSection` writes it. |

## Next implementation batches

1. **Batch A — Dashboard/docs integration:** update plan/status/dashboard tracking for the new audit tracker and Vercel guard.
2. **Batch B — Communication/calendar ownership audit:** task, communication, and calendar canonical entity-link UI plus pure payload helpers are implemented in CRM7; continue with browser/API evidence when browser binaries are available.
3. **Batch C — Conduit → CRM7 handoff proof:** verified with existing token + RPC flow; remaining work is browser evidence for the handoff journey.
4. **Batch D — Role/RLS/subscription parity:** matrix delivered (`20260629-bsuite-role-rls-subscription-parity-matrix-v1.00W.md`); all five parity gaps (WC-008…WC-012) **fixed in code** (operator-approved 2026-06-29) — see parity matrix §3 Resolution + §3.1 consolidated change set.
5. **Batch E — Browser evidence:** capture desktop/mobile + per-role JWT/route smoke against the `d.*` development deploys for the critical candidate → placement → training → billing journey, BEFORE any merge to main/master.
