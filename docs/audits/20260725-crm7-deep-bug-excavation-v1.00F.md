---
kind: record
authority: none
owner: bsuite
---

# Deep Bug Excavation — crm7 (Read-Only)

> **File:** `20260725-crm7-deep-bug-excavation-v1.00F.md`  
> **Status:** F (Frozen) · **Mode:** READ-ONLY (no source files modified)  
> **Date:** 2026-07-25  
> **Scope:** Implementation bugs in `crm7` only. STRICTLY BSuite.  
> **Method:** Static read of `src/`, `supabase/migrations/`, and route table in `src/App.tsx`. No code mutation, no live runtime. Prefer file:line evidence over speculation.  
> **Hunt targets:** TODO/FIXME that break UX, empty catch, any-types on money paths, RLS footguns, broken links, a11y, race conditions, wrong defaults, portal gaps.  
> **Skipped:** multi-picker / sanitize known-fixed reports (unless regression observed).  
> **Severity:**  
> - **P0** — broken money/auth path, missing critical RPC, or portal hard-dead for a role  
> - **P1** — money/compliance race, silent budget non-decrement, orphan invoices, dead money UI  
> - **P2** — broken nav links, missing routes for implemented pages, a11y blockers on primary forms  
> - **P3** — latent UX gaps, tech-debt TODOs, soft failures, display-only zeros

---

## Findings table

| Sev | Area | File:line | Symptom | Repro hint | Suggested fix |
|-----|------|-----------|---------|------------|---------------|
| **P0** | Email / vault | `src/services/emailService.ts:584-625` | `getDecryptedToken()` RPCs `get_email_integration_token`, but **no migration defines that function**. Token decrypt always fails → OAuth/IMAP/SMTP email integrations cannot retrieve secrets. | Connect an email integration, then trigger any flow that calls `emailService.getDecryptedToken(id)`. Network/RPC error: function does not exist. `grep -rn get_email_integration_token supabase/migrations` → empty. | Ship the SECURITY DEFINER RPC sketched in the TODO (vault read + `user_id = auth.uid()` guard + pinned `search_path`). Add migration + grant EXECUTE to `authenticated` only. Cover with a migration/test that the function exists. |
| **P0** | Portal / routing | `src/pages/portal/index.tsx:43-44,70` · page exists at `src/pages/portal/field-officer.tsx` · **no** `path="/portal/field-officer"` in `src/App.tsx` | Field officers auto-redirect to `/portal/field-officer`, which is **not a declared route**. Landing page is 404 / not-found. Page file + portal selector card exist; router never mounts them. | Sign in as `portalRole === 'field_officer'` (or open `/portal` as FO). Observe redirect to `/portal/field-officer` then not-found. Confirm: `grep path=.*portal src/App.tsx` has no field-officer entry. | Lazy-import `./pages/portal/field-officer`, add `<ProtectedRoute path="/portal/field-officer" …>` next to other portal routes (~3172+). Wire same permission/scope gate as worker/host portals. |
| **P1** | Billing / money | `src/lib/billingEngine.ts:256-318` | Invoice row is inserted **before** line items. If line-item insert fails, throw leaves an **orphan draft invoice** with zero lines (no rollback/delete). Operators see empty invoices; DB totals may stay 0. | Force line-item insert failure (FK violation / RLS deny on `invoice_line_items`). Call `generateInvoiceFromTimesheets`. Invoice number exists; no lines. | Wrap create in a DB RPC/transaction: insert invoice + lines atomically, or on line failure delete the invoice (and surface a single error). Prefer SECURITY DEFINER RPC with tenant check. |
| **P1** | Billing / money | `src/lib/billingEngine.ts:169-206,305-308` | Groups with `chargeRate === 0` (no placement rate + no approved quote) still become line items at **$0/hr**. Invoices can be generated and sent with zero revenue. | Placement with null/`0` `charge_rate`, no approved `charge_rate_quotes`. Approve timesheets → generate invoice. Line amount = 0. | After quote fallback, filter `groups` where `chargeRate <= 0` (or throw hard with apprentice names). Block bulk generate when any host has unresolved rates. |
| **P1** | Billing / payments | `src/lib/billingEngine.ts:560-627` | `recordPayment` is read → check balance → insert payment (no lock / no `amount_due` predicate). Concurrent payments can both pass overpayment guard → **overpay** / double partial. Client return status may disagree with DB trigger. | Two tabs, same invoice, two payments that sum > `amount_due`, submit near-simultaneously. | Single RPC: `INSERT … SELECT` with `WHERE amount_due >= $amount` (or `FOR UPDATE` on invoice). Return updated balances from DB only. Add unique idempotency key optional. |
| **P1** | Funding / money | `src/services/fundingService.ts:146-152,279-334` · `src/lib/fundingWorkflow.ts:256` · **no writers** of `remaining_budget` | `remaining_budget` is **checked** on submit but **never decremented** on approve/pay. No migration trigger updates it. Budget is a soft gate that never shrinks → multiple claims can pass “sufficient funds” forever. | Create funding source with budget $10k. Submit two $8k claims serially (or concurrent). Both can submit if balance never drops. | On `approved` or `paid` (pick one lifecycle point), decrement `funding_sources.remaining_budget` in the same transaction (RPC). Re-check with `WHERE remaining_budget >= claim_amount`. Restore on reject/void. |
| **P1** | Leave / money | `src/services/leaveRequestService.ts:176-199,279-296` | `approveLeaveRequest`: fetch pending → update status (no `status='pending'` in UPDATE). Concurrent approves both pass → **`annotateLeaveBalance` runs twice** (double-count `taken`). Balance update is also read-modify-write without lock. | Two GTO staff approve same pending leave request simultaneously. | Optimistic lock: `.update(…).eq('id', id).eq('status','pending')` and require `count=1`. Balance: SQL `taken = taken + $h`, `balance = accrued - taken` in one statement / RPC. |
| **P1** | Timesheets / workflow | `src/lib/timesheetWorkflow.ts:469-495,444-466` | `executeTransition` fetch → pure advance → update **without** `.eq('state', currentState)`. Concurrent hostReject + hostApprove (or double approve) race; last write wins; audit events can disagree with final state. | Two actors act on same timesheet in `pending_host_approval` at once. | Conditional update: `.eq('state', fromState)` (or RPC with `UPDATE … WHERE state = $from RETURNING`). Fail with conflict if 0 rows. |
| **P1** | Charge rates / money UI | `src/pages/charge-rates/[id]/index.tsx:190-210,922-936` | Detail page maps quote to `payRate: 0`, `baseWage: 0`, all `oncosts.*: 0`. UI/PDF/payroll-preview paths display **zeros** for on-costs even when quote has a real `charge_rate_hourly`. | Open any saved charge-rate quote detail. On-cost breakdown and pay rate show $0. | Rehydrate from `source_provenance` / stored calc JSON, or re-run `@bsuite/charge-calc` from persisted wage/margin/oncost inputs. Never hardcode zeros for display when rate > 0. |
| **P1** | Financial forms / money | `src/components/financial/expense-form-dialog.tsx:45-52,75-97` | Expense form uses RHF **without Zod**. `amount` is free string → `parseFloat` can yield **NaN** persisted via `createFinancialRecord`. | Open expense dialog, enter non-numeric amount (or empty if required not enforced), submit. | Add Zod (`z.coerce.number().positive().finite()`) + `typedZodResolver`. Reject NaN before store write. |
| **P1** | RCTI / money | `src/lib/rctiGenerator.ts:52-57,140-168` · unique idx `supabase/migrations/20260306000004_rcti_schema.sql:30` | Invoice number = `RCTI-YYYYMMDD-` + `Math.random()` 4 digits. Unique constraint exists; **no retry** (unlike billingEngine’s 3 retries). Collision → hard fail; concurrent generate same day raises risk. | Generate many RCTIs same day / parallel generate. | Sequence like billing (`INV-YYYYMM-####` pattern) or retry on `23505`. Prefer DB sequence / advisory lock. |
| **P2** | Routing / broken links | `src/pages/compliance/index.tsx:612-636,654-664` · pages exist under `src/pages/compliance/{induction,lln-assessments,monitoring-visits,whs-audits}/index.tsx` · **missing** from `App.tsx` ProtectedRoute list | Compliance hub links to `/compliance/induction`, `/compliance/whs-audits`, `/compliance/monitoring-visits`, `/compliance/lln-assessments` — pages implemented, **routes never registered** → not-found. | From `/compliance`, click Induction / WHS Audits / Monitoring Visits / LLN cards. | Register four list routes (+ any `:id` if needed) pointing at existing page modules. |
| **P2** | Portal / broken links | `src/pages/portal/field-officer.tsx:299,319` · `src/pages/portal/host-employer.tsx:586-587,914-915` · `src/pages/portal/worker-portal.tsx:362,970` | Portal CTAs navigate to `/compliance/whs-audits/create` and `/compliance/lln-assessments/create` — **neither path nor create page** registered (only list `index.tsx` files exist). FO/host/worker quick actions dead. | FO portal → “WHS Audit” / “LLN Assessment”; host “WHS Upload”; worker LLN history chip. | Either add create routes + pages, or retarget buttons to list pages / in-dialog create (lln already has a dialog testid). |
| **P2** | Routing / broken links | `src/pages/leads/index.tsx:248` · page `src/pages/leads/scoring.tsx` exists · no App route | “Lead scoring” link → not-found. | From leads list, open scoring link. | Add `<ProtectedRoute path="/leads/scoring" component={…} permission="view_leads" />`. |
| **P2** | Routing / broken links | `src/pages/reports/[key].tsx:356` · page `src/pages/reports/deliveries.tsx` exists · no App route | Report deliveries hub link → not-found. | Open a report detail, click deliveries link. | Register `/reports/deliveries` with `generate_report` (or existing) permission. |
| **P2** | Documents / broken links | `src/pages/documents/templates/index.tsx:48` | Link to `/documents/templates/new` — **no page file and no route** (only `templates/index.tsx` + route `/documents/templates`). | Documents → Templates → New. | Implement create page + route, or change href to existing create flow (`/documents/create` / modal). |
| **P2** | Charge calc / money silent fail | `src/hooks/usePlacementChargeCalc.ts:163-167` | `calculate(cfg)` failures swallowed by empty `catch { result = null }`. UI shows “no rate” with **no error** — operators cannot tell bad config from empty inputs. | Feed invalid CalcConfig (e.g. broken allowances) into placement charge calc UI. | Catch → log + surface toast/inline error; distinguish “insufficient input” vs “engine threw”. |
| **P2** | a11y | `src/components/email/EmailComposeDialog.tsx:151-196` | To/Cc/Bcc/Subject inputs use adjacent `<span>` labels without `htmlFor`/`id` or `aria-label`. Screen readers lose field names. | Open compose; axe/NVDA on recipient fields. | Use `FormLabel htmlFor` or `aria-label="To"` etc. on each input. |
| **P2** | a11y | `src/components/ai/AIFloatingButton.tsx:46-48` · `src/components/layout/CRM7Header.tsx:153-155` | Decorative/meaningful logos use `alt=""`. Floating AI button image has empty alt (button may still need accessible name if icon-only). Header tenant logo empty alt may hide brand when logo is sole identity. | Inspect floating Jodie button and header logo with a11y tree. | Ensure parent control has `aria-label` (“Open Jodie AI”). Prefer meaningful `alt` for brand logo when it is the only text identity. |
| **P2** | Charge rates / wrong defaults | `src/pages/charge-rates/create/types.ts:15-26` · same pattern `src/pages/charge-rates/[id]/edit.tsx:75` | Super/WC/payroll-tax always from package `DEFAULT_CONFIG`, not tenant settings (TODO). Multi-tenant GTOs with different WC/payroll tax get **wrong default oncosts** until manually edited. | Create charge rate in tenant with non-default WC; Advanced Config shows engine defaults. | Load from `tenant_settings` (or org financial profile); fall back to DEFAULT_CONFIG only when unset. |
| **P2** | Placement / money gap | `src/hooks/usePlacementChargeCalc.ts:56-65,143-160` · `src/pages/placements/create.tsx:88-93` | RDO accrual accepted in UI but **not passed into CalcConfig** (awaiting charge-calc ≥0.2.4). Billable weeks ignore RDO → **overstated billable capacity / wrong charge** when RDO used. Feature flag `VITE_PLACEMENT_CHARGE_CALC_V2` keeps v2 UI off by default. | Placement with RDO hours; compare derived charge vs engine with RDO. | Bump charge-calc, add DB columns, wire `rdoAccrualPerWeek`; enable flag when schema ready. |
| **P3** | AI UX | `src/components/ai/AIAssistant.tsx:150-153,210` | Upgrade CTA calls `handleUpgrade` which only `logger.info` — **dead button** when tier limit hit. | Exhaust AI tier / open upgrade from usage warning. | Navigate to billing/pricing (`/pricing` or BSU billing URL) or open upgrade modal. |
| **P3** | Financial / stub | `src/components/financial/budget-form-dialog.tsx:98-120` | Budget “create” is `setTimeout` + toast — **no persistence**. Fake success. | Create budget → refresh list; nothing saved. | Wire to real store/API or hide entry until backend exists. |
| **P3** | Stub context | `src/contexts/EnhancedDataContext.tsx:1-6` · consumers `EnhancedApprenticeForm`, `EntityValidationDashboard` (not routed from App) | Stub always “validates” success; dead feature surface if ever linked. | N/A unless a route mounts these components. | Remove or implement; do not route until real. |
| **P3** | Billing / race soft | `src/lib/billingEngine.ts:49-76,268-285` | Invoice numbers use max+1 with 3 retries on `23505`. Under high concurrency still possible to exhaust retries. | Parallel bulk invoice generation same month. | DB sequence / `nextval` per tenant-month. |
| **P3** | Import / RLS reliance | `src/services/importExportService.ts:262-334` | Export/import apply optional filters only; **no app-level forced `tenant_id`**. Correctness depends entirely on RLS. Safe if RLS solid; footgun if a table policy is misconfigured. | Export entity type without filter as non-admin. | Always `.eq('tenant_id', requireTenantId())` on export; force `tenant_id` on import rows server-side. |
| **P3** | Portal scopes | `src/lib/portal-scopes.ts:1-12` | If Custom Access Token Hook not registered, `scopes` claim absent → all `hasPortalScope` false → “scope pending” UX. Operational gap, not code defect. | Portal user JWT without `scopes`. | Ops: register BSU CAT hook; document in runbook. |
| **P3** | GTO dashboard scaffold | `src/pages/compliance/gto-dashboard.tsx:43,160-180` | Queries non-existent `gto_compliance_status` view; empty catch → “Awaiting data”. Intentional scaffold (crm7#667). | Open GTO compliance dashboard. | Ship child issues / view; not a regression. |
| **P3** | Types / money (low risk) | `src/lib/invoicing/renderInvoicePdf.ts:588-592` | `as any` only bridges react-pdf `createElement` types — not amount math. | N/A | Keep until @react-pdf types improve; no money impact. |
| **P3** | UI types | `src/components/ui/chart.tsx:101,247` | `ChartTooltipContentProps = any` / Legend — recharts v3 migration TODOs. | N/A | Track bsuite#215; not user-facing bug. |

---

## Summary counts

| Severity | Count |
|----------|------:|
| P0 | 2 |
| P1 | 9 |
| P2 | 10 |
| P3 | 9 |
| **Total** | **30** |

---

## Highest-priority fix order (recommended)

1. **P0 email vault RPC** — email integrations non-functional without `get_email_integration_token`.
2. **P0 field-officer portal route** — entire FO persona blocked at entry.
3. **P1 funding `remaining_budget` never decrements** — compliance/money integrity.
4. **P1 leave + timesheet + payment optimistic locking** — concurrent double-apply.
5. **P1 orphan invoice on line-item failure** + **zero-rate invoice guard**.
6. **P1 charge-rate detail zeros** + **expense NaN**.
7. **P2 register missing compliance/leads/reports/documents routes** and retarget portal CTAs.

---

## Explicit non-findings (checked, OK or out of scope)

| Check | Result |
|-------|--------|
| Empty `catch` that fully swallows without return/log on critical AI tools | Most AI tools return `{ success: false, error }` — acceptable. |
| Client `service_role` / admin Supabase client in `src/` | Not found. |
| `mapd_webhook_*` tables without RLS | Documented service-role-only; intentional. |
| `tenants` SELECT for platform admins | Consolidated policy uses `is_platform_admin()` (`20260610411800_…`). |
| Leave accrual NES rates (`leaveConstants.ts`) | Math consistent with 4 weeks / 10 days @ 38h. |
| multi-picker / sanitize known fixes | Skipped per brief (no regression hunt beyond note). |
| `dangerouslySetInnerHTML` | Only chart CSS injection + static main.tsx fatal UI — no user HTML. |

---

## Method notes

- Routes: extracted all `ProtectedRoute`/`Route` `path=` from `src/App.tsx` (368 paths) and cross-checked `navigate()` / `Link href` / portal seeds.
- Money paths: `billingEngine`, `rctiGenerator`, `fundingService`, `leaveRequestService`, `leaveAccrual`, charge-rate pages/hooks/store, expense form.
- RLS: sampled SECURITY DEFINER usage and tables created without ENABLE RLS in same migration; client queries rely on RLS (no service role in browser).
- No automated test run; findings are static evidence only.

---

*End of report. No source code was modified.*
