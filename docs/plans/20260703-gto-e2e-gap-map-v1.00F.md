# GTO End-to-End Cycle — File-Grounded Gap Map (W1)

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

`20260703-gto-e2e-gap-map-v1.00F.md` · Status W · Loop contract:
[`docs/plans/loop-contracts/20260703-gto-e2e-cycle-loop-contract-v1.00W.md`](./loop-contracts/20260703-gto-e2e-cycle-loop-contract-v1.00W.md)

**Method:** single-threaded research (no subagent fan-out — W1 retry after the
first attempt died to a session limit from an 8-way fan-out). Grep-first,
open-key-files-only, then live-catalog verification against Supabase project
`tuybltdrdefjblnplpqo` via read-only `execute_sql` (information_schema +
table-existence checks only — no writes). All row/column facts below were
queried live on 2026-07-03/04; all file facts were opened directly (paths
cited) — no claim in this document is from memory or migration-file
inference alone.

## Headline finding (read this first)

Two competing "quote" schemas exist in crm7 code. Only one is live:

- `quotes` / `quote_line_items` (opportunity-style CRM quote — `pages/quotes/*`,
  ~~`src/lib/quoteLifecycle.ts`~~ (no file of this name exists; quoting now lives in `crm7/src/services/requoteOnRiseService.ts` and `crm7/src/lib/quoteInclusions.ts`), `useQuoteStore`) — migration files
  `supabase/migrations/20260228120000_create_quotes.sql` and
  `20260301100800_create_charge_rate_quotes.sql` exist but **the `quotes` /
  `quote_line_items` tables are NOT in the live schema** (verified via
  `information_schema.tables`, project `tuybltdrdefjblnplpqo`, 2026-07-04).
  This entire code path (`pages/quotes/index.tsx`, `create.tsx`, `[id]/*`,
  `quoteLifecycle.ts::convertQuoteToContract`) will throw
  `relation "quotes" does not exist` the first time it runs against
  production. It is dead code today, not a working feature.
- `charge_rate_quotes` (GTO-specific: `host_org_id`, `worker_id`,
  `calc_run_id`, `charge_rate_hourly`) — **is live**, and is the table
  actually queried by `pages/charge-rates/[id]/index.tsx`,
  `pages/charge-rates/create/index.tsx`, and
  `components/rates/RateApprovalWorkflow.tsx`. This is the real, working
  charge-rate-quote path.

Two more tables queried by live-looking code are also **missing from the
live schema**:

- `boot_assessments` — migration file
  `supabase/migrations/20260228140100_create_boot_assessments.sql` (+ two
  follow-on RLS/hardening migrations) exists, all dated pre-floor
  (2026-02/03), none applied. `RateApprovalWorkflow.tsx` reads this table
  (line ~103, `.from('boot_assessments')`) for the BOOT compliance gate.
- `charge_rate_audit_log` — queried by `pages/charge-rates/[id]/index.tsx`
  (line ~230). No migration file for this table exists anywhere in
  `supabase/migrations/` — it was never even drafted, let alone applied.
- `award_rate_cache` — queried by ~~`src/lib/rates/awardRateCacheService.ts`~~ (no file of this name exists anywhere in the estate)
  (3 call sites). Live schema instead has `award_rates` (a different table).
  The cache-then-fallback-to-fairwork-enhanced logic in this service will
  hard-fail on every cold call.

**Why this matters to the loop contract:** W2's success condition ("a quote
created on d.crm, e-sign link signed in-browser, status=approved, host rate
rows live") cannot be met on the `pages/quotes/*` code path at all (missing
tables), and the BOOT gate — the feature Braden calls the competitive
differentiator — is silently unenforceable on the live `charge_rate_quotes`
path too, because `boot_assessments` doesn't exist. **W2 chunk 1 must be a
migration-application chunk, not a feature-build chunk.**

---

## Per-stage inventory

### Stage 1 — Host enquiry intake (braden contact form → crm7 leads/clients)

**Verdict: EXISTS, live-wired end to end.**

- `braden/src/components/ContactForm.tsx` (Turnstile-gated) →
  `braden/src/components/contact/EnhancedContactForm.tsx:105` calls
  `supabase.functions.invoke('lead-capture', ...)`.
- `crm7/supabase/functions/lead-capture/index.ts` (417 lines) — canonical
  single copy (BSU duplicate deleted 2026-04-23 per its own header comment).
  Inserts into `leads` (tenant-scoped via `BRADEN_TENANT_ID` secret), applies
  `lead_routing_rules` / `lead_routing_defaults`, writes `app_notifications`,
  and dispatches submitter-confirmation + admin-notification email via the
  BSU-hosted `email-dispatcher` function (`business-suite-unified/supabase/functions/email-dispatcher`
  — confirmed present there, absent from crm7, i.e. correctly shared not
  duplicated).
- `crm7/src/lib/leads.ts` + `crm7/src/types/entities.ts` (`Lead`) carry
  `client_id`/`contact_id` FK fields for the lead→client conversion step.
- `crm7/src/lib/clients.ts` — `clients.is_host_employer: boolean` is the flag
  that marks a converted client as a host employer (no separate
  `host_employers` table; `host_agreements.host_employer_id` and
  `RateApprovalWorkflow`'s `hostEmployerId` both resolve to `clients.id`).
- Live tables confirmed: `leads`, `clients`, `lead_routing_rules`,
  `lead_routing_defaults`, `app_notifications`.
- **Gap:** lead→client conversion (turning a `leads` row into a `clients`
  row with `is_host_employer=true`) was not traced to a specific UI action in
  this pass — likely a manual CRM action; not yet verified as wired.

### Stage 2 — Charge-rate quote build (incl. R80.3 bulk)

**Verdict: PARTIAL — calc engine is a superset match; live quote schema is
`charge_rate_quotes`, not `quotes`; BOOT gate table is missing; R80.3 has NO
bulk mode.**

- `/home/braden/Desktop/Dev/bsuite/charge-calculator-mapd.jsx` (1527 lines,
  reference calc `calculate(cfg)` at line 346–475) vs
  `packages/charge-calc/src/calculate.ts` (377 lines): **the package is
  already a faithful superset**, not a divergent reimplementation. Matches:
  allowance-to-per-hour aggregation, leave loading, super-on-OT toggle,
  workers' comp %, margin (percent/flat), penalty/OT oncost split, funding
  spread (reduce/passPercent/passThrough), full per-hour oncost
  decomposition, non-billable-week accounting including training weeks.
  Deltas (package has, reference calc lacks): casual-loading path
  (`casualLoading`/`isCasual`/`casualLoadingPH`, replaces leave entitlements
  for casual workers), `payrollTaxRate`/`payrollTaxAmt` line, per-year
  `trainingWeeksPerYear` override (reference calc has only a flat `trainWk`),
  `tafeDayAmortizationPerHour` (post-oncost, non-compounding), and
  Xero-style `payItemGroupId`/`category` rate-key resolution
  (`resolveRateKey`/`assignRate`) for accounting integration — none of which
  exist in the reference `.jsx`. No regressions found; the package is the
  more complete engine.
  - `[CONFIG]` flags the operator flagged (leave loading, workcover rate) are
    present in both, confirmed matching field-for-field.
- **CRM7 HAS bulk mode:** `crm7/src/pages/charge-rates/create/ApprenticeHostTab.tsx`
  — `isBulkOperation` form field ("Batch Mode... BOOT assessment runs
  per-worker for apprentice/trainee types"), `selectedApprentices: string[]`
  array, checkbox multi-select UI (lines ~120–360); `index.tsx:363` consumes
  `selectedIds = values.selectedApprentices ?? []`.
- **R80.3 has NO bulk mode:** `R80.3/src/components/R8Calculator.tsx`
  (1126 lines) uses a single `WorkerSelector` (line 836,
  `employmentTypes={['apprentice','trainee']}`) to populate training weeks
  for exactly one worker; no loop/array/batch construct found anywhere in
  the file. This is the literal gap the loop contract calls out
  ("R8 must gain bulk (multi-apprentice) calculation").
- Both apps consume the shared engine correctly: R80.3
  `services/chargeRateScheduleService.ts` imports `calculate as
  sharedCalculate` from `@bsuite/charge-calc`; CRM7
  `services/chargeCalcSourceAdapters.ts`, `lib/rates/bootGate.ts`,
  `components/placements/ChargeRateCard.tsx` all import from
  `@bsuite/charge-calc`.
- Components confirmed present: `crm7/src/components/rates/{RateApprovalWorkflow,ChargeRatePdfDocument,BootGateBlocker,ChargeRateVisualizer}.tsx`.
- **`ChargeRateCard.tsx` header comment is stale/misleading**: it says
  charge-rate/billing-model/overhead/margin persistence is "deferred" pending
  a migration adding `placements.charge_rate` etc. Live-catalog check shows
  `placements.charge_rate` (numeric) **is live**, but `billing_model`,
  `overhead_value`, `margin_value`, `charge_rate_quote_id` are **not** —
  i.e. the final rate propagates but the calc-input audit trail (which
  billing model, what overhead/margin were used) does not. This blocks
  faithful requoting (Stage 6) from the placement record alone.
- **`boot_assessments` missing live** (see headline finding) — BOOT gate on
  the live `charge_rate_quotes` path is unenforceable today.

### Stage 3 — Quote email dispatch/approval

**Verdict: PARTIAL — status-flip UI exists, no actual email dispatch wired.**

- `crm7/src/pages/quotes/[id]/index.tsx:182-198` `handleSend()` — literally
  just `update(quote.id, { status: 'sent', sent_at: ... })` + a toast. No
  call to `email-dispatcher`, no PDF attachment, no recipient resolution.
  (This is on the dead `quotes` table path per the headline finding, so it's
  doubly non-functional.)
- `handleAccept()` (same file, ~line 199) is the same pattern — a bare
  status flip to `accepted`, no e-sign linkage created.
- Communications infrastructure that COULD carry this exists and works
  elsewhere: `crm7/src/lib/communications.ts`,
  `crm7/src/pages/communications/compose.tsx`, and the BSU `email-dispatcher`
  function used successfully by `lead-capture` (Stage 1). Nothing in the
  charge-rate/quote flow calls it yet.
- **Gap:** no code path found that sends a quote (PDF + e-sign link) to a
  host contact by email. This is a build item, not a wiring item — the
  pieces (`ChargeRatePdfDocument.tsx`, `email-dispatcher`) exist
  independently but are not connected.

### Stage 4 — In-house React e-sign (no DocuSign)

**Verdict: EXISTS as a real, working canvas e-sign UI — but scoped to
training plans, not generically reusable by quotes yet.**

- `crm7/src/types/entities.ts:1690-1705` `SignatureRequest` —
  `provider: 'docusign' | 'internal'`, generic `document_id`/`document_title`,
  full status lifecycle (`pending→sent→viewed→signed/declined/expired`).
  `signature_requests` table confirmed live with matching columns
  (`provider`, `document_id`, `signing_url`, `signed_at`, etc.).
- `crm7/src/pages/documents/signatures.tsx` (213 lines) — dashboard/list view
  over `useSignatureRequestStore` (generic `signature_requests`); no signing
  capture UI of its own (list + stat cards only).
- `crm7/src/pages/contracts/training/e-signatures.tsx` (624 lines) — **this
  is the real in-house signing UI**: canvas element with pointer-down/move/up
  handlers (lines 135–202), `canvas.toDataURL('image/png')` capture, a
  type-name fallback (`typedName`/`signatureMethod==='type'`), writes to
  `training_plan_signatures` (confirmed live). This is genuinely "no
  DocuSign" per the operator's requirement.
- **Gap:** the working canvas signer is wired to `training_plan_signatures`
  specifically (also used by the apprentice portal per the pre-verified
  Stage-10 finding), not to the generic `signature_requests` table that
  `pages/documents/signatures.tsx` lists. Wiring a quote/host-agreement
  e-sign means either extending `e-signatures.tsx`'s canvas pattern to a new
  quote-signing route, or building a `document_id`-driven generic signer
  page — neither exists yet.

### Stage 5 — Approved-rate recording vs host + propagation to apprentice records

**Verdict: PARTIAL — the bridge and final-value propagation are live; the
calc-input audit trail is not persisted.**

- `crm7/src/types/entities.ts:356` `placements.charge_rate?: number` — live
  column confirmed (`information_schema.columns`, `placements`, type
  `numeric`).
- `placements.person_id` (uuid) confirmed live — the people↔placements
  bridge (crm7#1045, per memory) is real at the schema level.
- `crm7/src/lib/quoteLifecycle.ts::convertQuoteToContract` builds a
  `host_agreements` row from a `quotes` row (`host_employer_id:
  quote.client_id ?? undefined`) — but since `quotes` isn't live, this
  function cannot run today. `host_agreements` itself IS live.
- `crm7/src/components/placements/ChargeRateCard.tsx` — reads
  `usePlacementChargeCalc`, displays billing-model/overhead/margin selectors,
  but (per its own header comment, confirmed against live schema) these
  inputs are **not persisted** — only `placements.charge_rate` (the output
  number) has a live column. `billing_model`, `overhead_value`,
  `margin_value`, `charge_rate_quote_id` are all absent from the live
  `placements` table.
- **Gap:** propagation of the *final rate* to the placement record is
  wired; propagation of the *calc config that produced it* is not — meaning
  a later requote (Stage 6) cannot reconstruct "what changed" purely from
  the placement row.

### Stage 6 — Requote on award/EBA/custom rise

**Verdict: MISSING as an explicit feature; underlying rate-change plumbing
exists in fragments, disconnected.**

- No hits anywhere in `crm7/src` for `requote`/`re-quote` as a concept —
  confirmed by full-repo grep.
- `crm7/src/lib/rates/awardRateCacheService.ts` — reads/writes
  `.from('award_rate_cache')` (3 call sites, lines ~167/368/403) — **this
  table does not exist live**; only `award_rates` does (a different table,
  same domain). The cache-then-fallback-to-`fairwork-enhanced`-edge-function
  logic will hard-fail on first cold read, not silently degrade.
  `crm7/src/stores/awardRateCacheStore.ts` and
  `services/fairworkEnhancedService.ts` also reference the same
  nonexistent-table pattern.
- `mapd_webhook_queue` and `mapd_webhook_subscriptions` tables **are live**,
  but zero `.from('mapd_webhook_...')` call sites exist in `crm7/src` —
  i.e. this is backend/edge-function-only plumbing (or entirely unconsumed)
  with no frontend read path, so it cannot currently trigger a UI-visible
  requote flow either way.
- `crm7/src/types/rateSchedule.ts:28` `RateSourceType` union
  (`'award'|'enterprise_agreement'|'custom'`) exists and is consumed by
  `RateApprovalWorkflow` (`rateSourceType` prop) — the type model for
  "what kind of rate is this" is in place; there is no listener/trigger that
  fires a requote when the underlying award/EBA/custom rate changes.
- **Gap:** this is a genuine build item, not a wiring item. Three
  ingredients exist (award-change webhook queue, rate-source typing,
  award-rate service) but none are connected to each other or to a
  requote-draft-generation flow.

### Stage 7 — Timesheets: fill → approve → notices

**Verdict: EXISTS, live schema is materially richer than the loop contract
assumed.**

- `crm7/src/pages/timesheets/{index,create,[id]/index,[id]/edit}.tsx` — full
  CRUD set. `[id]/index.tsx` queries `timesheets`, `timesheet_events`, and
  `audit_logs` (lines 238/243/248).
- Live `timesheets` columns confirmed (26 columns) include:
  `ordinary_hours`, `overtime_hours`, `training_hours`, `billable_hours`,
  `host_employer_id`, `host_approved_by`/`host_approved_at`/
  `host_approval_notes`/`host_rejected_at`/`rejection_reason`,
  `gto_reviewer_id`, `state` (enum), `exported_at`, `archived_at`. This is a
  genuinely complete fill→host-approve→GTO-review state machine at the
  schema level, exceeding what the loop contract's success condition asked
  for.
- Live `timesheet_events` and `timesheet_groups` tables also confirmed
  (event/audit trail + grouping).
- Host-side bulk approve/dispute UI already confirmed in the pre-verified
  Stage-10 finding (`pages/portal/host-employer.tsx`).
- **Gap:** FO/GTO-admin *notices* (i.e. an actual notification firing on
  state transitions, distinct from the `app_notifications` pattern used for
  leads) were not traced to a specific call site in this pass — the schema
  supports it (`gto_reviewer_id`) but the trigger/notification wiring needs
  verification in a follow-up chunk.

### Stage 8 — Hour classes: billable / non-billable / leave / training / accruals

**Verdict: PARTIAL — billable/training split is live and rich; a standalone
leave-request workflow table is missing.**

- `timesheets.ordinary_hours`, `overtime_hours`, `training_hours`,
  `billable_hours` confirmed live (same query as Stage 7) — billable vs.
  training/non-billable is a first-class schema concept, not inferred.
- `crm7/src/types/entities.ts:1920-1956` `LeaveType` (annual/personal/
  long_service/parental/study/unpaid/compassionate), `LeaveRequest`,
  `LeaveBalance` interfaces exist. **Live-catalog check: `leave_balances` is
  live; no `leave_requests`-shaped table exists** (searched
  `information_schema.tables` for `%leave_request%` — zero rows). Accruals
  are represented (`LeaveBalance.accrued/taken/balance`) but the request
  workflow itself (submit → approve leave) has no confirmed live table.
- R80.3/charge-calc's per-hour oncost breakdown (`oncosts.annualLeave`,
  `.publicHolidays`, `.sickLeave`, `.training`, `.study`, `.ppe`,
  `.superannuation`, `.workersComp`, `.overhead`, `.payrollTax`,
  `.tafeAmortization`) gives the billing side of "hour classes" a complete,
  already-shipped decomposition (`packages/charge-calc/src/calculate.ts:322-335`).
- **Gap:** leave-request submission/approval as a distinct workflow (vs.
  balance tracking) needs a schema check/build; not confirmed live.

### Stage 9 — Billing: invoice generation/send + Xero push

**Verdict: PARTIAL — two disconnected invoicing systems, only one has a
Xero path.**

- **R80.3 owns host/GTO billing**: `R80.3/docs/20260702-invoice-runs-feature-v1.00W.md`
  documents `invoice_runs` (R80.3-owned, per-host-per-week, GWS/EIS credit
  handling, GST, CSV/PDF export via `@bsuite/data-export/browser` + jsPDF).
  Live table `invoice_runs` confirmed. **Zero Xero references anywhere in
  `R80.3/src`** (grep for `xero` case-insensitive across the whole tree:
  no hits) — export is CSV/PDF only, no accounting-system push.
- **CRM7 owns payroll/engagement invoicing + the Xero push**:
  `crm7/src/lib/pipelines/xeroInvoiceAdapter.ts` — thin client wrapper (moved
  server-side 2026-04-24 for secret-leak reasons) that invokes the
  `xero-invoice-submit` edge function with **CRM7 `invoiceIds`** (its own
  `invoices`/`invoice_line_items` tables, both confirmed live) — this
  operates on payroll/engagement invoices, not on R80.3's host
  `invoice_runs`. `xero_connections`, `xero-invoice-submit`,
  `xero-token-exchange`, `xero-webhook` edge functions all confirmed
  present in `crm7/supabase/functions/`.
- **Gap:** the host-facing GTO invoice (R80.3 `invoice_runs`, the one that
  matters for the charge-rate/quote lifecycle this contract is about) has
  **no path to Xero at all**. The Xero push that does exist is scoped to a
  different invoice concept (CRM7 payroll/engagement billing). W5's success
  condition ("invoice generated from approved timesheets; Xero push path
  exercised or stubbed") needs to specify which of the two invoicing
  systems it means, or bridge them.

### Stage 10 — Portals (apprentice + host mirror)

**Verdict: EXISTS (pre-verified by a surviving research thread; spot-checked
here, not re-researched).**

- `crm7/src/pages/portal/worker-portal.tsx` — 911 lines confirmed present.
  Real queries: people/placements/timesheets/payroll_records payslip feed
  with download button/training_plans/site_visits; `PortalScopeGate`
  `APPRENTICE_READ`; routed at `/portal/worker`
  (`crm7/src/App.tsx:3130-3141`, feature flag `portal_pages` confirmed
  present in `crm7/src/config/navigation.ts:282`, default true).
- `crm7/src/pages/portal/host-employer.tsx` — 982 lines confirmed present.
  Host mirror: tenants/employers/people/timesheets bulk approve-dispute/
  invoices/placements/site_visits; `HOST_SUPERVISOR_READ`; `useSharedData`
  `canSee()` sharing controls.
- `apprentice-reports.tsx` / `host-reports.tsx` companion pages also
  reported present by the surviving thread (not re-opened here).
- **Gaps carried forward (not re-verified, per instruction):** (a)
  documentation drift — absent from dashboard `portal_coverage` +
  codehouse-parity sub-plans; (b) scope enforcement soft —
  `inject_portal_scope_claims` Custom Access Token Hook may not be
  registered (`PortalScopeGate` degrades to RLS-only); (c) live-data risk —
  `apprentice_profiles` 0 rows, `people.contact_id`→`auth.users` linkage
  unverified live.

### Stage 11 — Conduit + Jodie onboarding (job ads, screening, triage, correspondence)

**Verdict: EXISTS — real AI tool layer over real tables, plus a distinct
internal engineering bot that is NOT the same "Jodie".**

- **Important disambiguation:** two different things are both called
  "Jodie" in this monorepo. `packages/jodie` (`@bsuite/jodie`, root-level
  shared package: `classifier.ts`, `routing-matrix.ts`, `sla-tracker.ts`,
  `agent.ts`) is an **internal engineering bug/PR-triage bot**
  (severity/effort/area/type classification for GitHub issues — consumed by
  the BSU `jodie-bug-create`/`jodie-pr-notify` edge functions). This is
  unrelated to recruitment.
  **`conduit/src/lib/ai/jodie-persona.ts` + `conduit/src/lib/ai/tools/{job,candidate,communication,interview,pipeline,analytics}-tools.ts`**
  is the actual recruitment AI the operator means — separate code, separate
  concern, same name. Both are real; do not conflate them in planning.
- `conduit/src/lib/ai/tools/job-tools.ts` (209 lines) — `createJobTools()`
  returns real AI-SDK `tool()` definitions: `search_jobs` (queries
  `r7_jobs`), `get_job_applications` (queries `r7_applications` joined to
  `r7_candidates`), plus 2 more (draft-description, metrics per file
  header). Confirmed live Supabase queries with real table/column names, not
  stubs.
- `conduit/src/app/(dashboard)/{jobs,candidates,pipeline,interviews,offers,onboarding,compliance,talent-pools}` —
  substantial dashboard route coverage confirmed present.
- `docs/plans/loop-contracts/20260817-recruitment-comms-rams-loop-contract-v1.00W.md`
  confirmed present at the expected path.
- **Gap:** did not trace whether `jodie-persona.ts`'s tool set is actually
  wired into a chat UI route in this pass (file-existence + real-query
  confirmation only, per budget) — recommend a live-UX check before W7.

### Stage 12 — Labour-hire/casual variant

**Verdict: EXISTS at the type-model and calc-engine level; UI selectability
in R80.3 not confirmed (R80.3 lacks bulk mode per Stage 2, and its single-
worker selector's employment-type filter was only confirmed for
apprentice/trainee).**

- `crm7/src/types/employmentTypes.ts` — single-source-of-truth
  `EMPLOYMENT_TYPES` const: `'apprentice'|'trainee'|'labour_hire_ft'|
  'labour_hire_pt'|'labour_hire_casual'|'abn_contractor'|'internal_staff'`.
  Explicit header comment: "GTOs employ multiple worker types beyond
  apprentices... Each type has different on-cost profiles, leave
  entitlements, training requirements, and BOOT obligations."
- `crm7/src/types/entities.ts:1288` `LabourHireEmploymentType =
  'labour_hire_ft'|'labour_hire_pt'|'labour_hire_casual'` — discriminated
  type guard (`isLabourHire`-style, ~line 1301) alongside the
  apprentice/trainee guard.
- `packages/charge-calc/src/calculate.ts:143-164` — explicit casual-worker
  branch: `isCasual = casualLoading !== undefined`; when true,
  `effectiveAlDays/PhDays/SickDays = 0` and `leaveLoad = 0` (loading
  replaces leave entitlements), `casualLoadingPH = wage * casualLoading`
  added to `recv`. This is a real, tested calc-engine implementation of
  "casual award application", not a placeholder.
  `crm7/src/components/placements/ChargeRateCard.tsx:38` `W52` billing
  model is explicitly labelled "labour-hire / casual" (52 billable weeks,
  vs. `Standard` leave-adjusted apprentice weeks) — the "no training
  days" requirement maps naturally to this model (training weeks = 0 for
  W52), though a hard UI enforcement of "0 training days for labour-hire"
  was not traced to a specific validation rule in this pass.
- `crm7/src/pages/charge-rates/create/ApprenticeHostTab.tsx` — `WorkerType`
  selector consumes the full `EMPLOYMENT_TYPES` enum via
  `WORKER_TYPE_LABELS` (all 7 types selectable, not restricted to
  apprentice/trainee), confirming the CRM7 charge-rate build UI already
  supports labour-hire/casual selection end-to-end.
- **Gap:** R80.3's `WorkerSelector` (Stage 2) filters to
  `['apprentice','trainee']` only — labour-hire/casual is not reachable from
  the R80.3 calculator UI today, even though the shared engine underneath
  supports it. This is the same underlying gap as Stage 2's bulk-mode
  finding: R80.3's UI is narrower than the CRM7 UI and the shared package.

---

## Ranked W2–W7 build order (S/M/L effort)

Ordering rationale: fix the floor (missing tables) before building on top of
it; the BOOT gate is compliance-critical and blocks nothing else, so it
jumps the queue; propagation/requote/billing follow the data dependency
chain; portals and onboarding are already-shipped features needing
verification, not builds, so they sit last as low-effort confirmation passes.

| Order | Workstream | Scope | Effort |
|---|---|---|---|
| 1 | **W2.0 — Migration floor repair** | Apply (or replace with a fresh floor-gated migration re-derived from) `boot_assessments` + its 2 RLS/hardening follow-ons; decide fate of `quotes`/`quote_line_items` (delete the dead `pages/quotes/*` code path OR apply the migration — recommend delete, since `charge_rate_quotes` is the live, working schema and keeping both is a DRY violation); draft + apply `charge_rate_audit_log` (no migration file exists yet — net-new); reconcile `award_rate_cache` vs. live `award_rates` (rename call sites or add a compatibility view) | **M** |
| 2 | **W2.1 — BOOT gate live-wire** | Once `boot_assessments` is live, verify `BootGateBlocker`/`RateApprovalWorkflow` actually block approval on a failing BOOT result (compliance-critical, Braden's stated differentiator) | **S** |
| 3 | **W2.2 — Quote email dispatch** | Wire `handleSend`/quote-approval on the `charge_rate_quotes` path (not the dead `quotes` path) to `ChargeRatePdfDocument` + BSU `email-dispatcher`, with a real host-contact recipient resolution | **M** |
| 4 | **W2.3 — Quote e-sign wiring** | Extend the `e-signatures.tsx` canvas pattern (or build a generic `document_id`-driven signer) to `charge_rate_quotes`/`host_agreements`; create `signature_requests` rows from the quote-approval flow | **M** |
| 5 | **W2.4 — R80.3 bulk mode** | Port CRM7's `isBulkOperation`/`selectedApprentices` pattern (`ApprenticeHostTab.tsx`) into `R8Calculator.tsx`/`calculatorStore.ts`; loop `@bsuite/charge-calc` `calculate()` per selected worker | **M** |
| 6 | **W2.5 — R80.3 employment-type breadth** | Extend R80.3's `WorkerSelector` filter beyond `['apprentice','trainee']` to the full `EMPLOYMENT_TYPES` union so labour-hire/casual is selectable from R80.3, matching CRM7 | **S** |
| 7 | **W3.0 — Placement calc-input persistence** | Add `billing_model`, `overhead_value`, `margin_value`, `charge_rate_quote_id` columns to `placements` (floor-gated migration) so `ChargeRateCard.tsx` can actually persist what it displays — prerequisite for faithful requoting | **S** |
| 8 | **W3.1 — Requote trigger** | Build the actual requote feature: listener on `mapd_webhook_queue`/award-rate change → diff against `placements` (now with persisted calc inputs) → draft requote + notice; first genuinely-new feature in this list (no fragments to reuse beyond the queue tables) | **L** |
| 9 | **W4.0 — GTO/FO notices on timesheet state change** | Verify or build the notification firing on `timesheets.state` transitions (host-approve, GTO-review) — schema already supports it (`gto_reviewer_id`), trigger wiring unconfirmed | **S** |
| 10 | **W4.1 — Leave-request workflow** | `leave_balances` exists live; `leave_requests`-shaped submit/approve workflow does not — build table + minimal UI, or confirm it's intentionally out of scope and accrual-only | **M** |
| 11 | **W5.0 — Host invoice → Xero bridge** | Either give R80.3's `invoice_runs` its own Xero push, or define an explicit hand-off from a finalised `invoice_run` into a CRM7 `invoices` row so the existing `xeroInvoiceAdapter`/`xero-invoice-submit` path can carry it | **L** |
| 12 | **W6.0 — Portal doc-drift + scope-hook verification** | Confirmed-shipped feature; close the 3 carried-forward gaps (dashboard `portal_coverage` entry, `inject_portal_scope_claims` hook registration check, `apprentice_profiles`/`people.contact_id` live-data check) | **S** |
| 13 | **W7.0 — Conduit/Jodie live-UX check** | Confirmed-shipped AI tool layer; verify `jodie-persona.ts` tools are reachable from an actual chat route on `d.conduit` before claiming W7 done | **S** |

---

## Top-10 next chunks (binary success condition each)

1. **Apply/re-derive the `boot_assessments` migration chain (+ 2 follow-ons)
   via the floor-gated dispatch.**
   Success: `select 1 from information_schema.tables where table_name='boot_assessments'`
   returns a row on `tuybltdrdefjblnplpqo`, verified via MCP `execute_sql`
   (not migration-file inspection).

2. **Decide and execute: delete `pages/quotes/*` + `quoteLifecycle.ts` +
   `useQuoteStore`, OR apply `20260228120000_create_quotes.sql`.**
   Success: `pnpm typecheck` is green after the change AND no `.from('quotes')`
   call site remains that targets a nonexistent table (grep confirms zero,
   or the table exists live — pick one, not both left half-done).

3. **Draft + apply a `charge_rate_audit_log` migration matching the columns
   `pages/charge-rates/[id]/index.tsx` reads (line ~230).**
   Success: the charge-rate detail page's audit-log tab renders with zero
   console errors on a signed-in `d.crm` session with at least one seeded
   row.

4. **Reconcile `awardRateCacheService.ts`'s `award_rate_cache` references
   against the live `award_rates` table.**
   Success: `pnpm test` for `lib/rates/awardRateCacheService.test.ts` (or
   equivalent) passes against the live table name, and a manual cold-cache
   read on `d.crm` returns data instead of a Postgres relation error.

5. **Wire `RateApprovalWorkflow`'s approval action to block on a failing
   `boot_assessments` result (once #1 lands).**
   Success: attempting to approve a `charge_rate_quotes` row linked to a
   `boot_assessments` row with `passed=false` is rejected in the UI with a
   visible reason, screenshot captured.

6. **Wire quote-send to `email-dispatcher` + `ChargeRatePdfDocument` on the
   live `charge_rate_quotes` path.**
   Success: sending a quote from `d.crm` results in an email received at a
   test inbox with the PDF attached, captured as evidence per §9.1/9.2.

7. **Wire a `signature_requests` row creation + canvas-sign route for
   `charge_rate_quotes`/`host_agreements`.**
   Success: a host contact can open a signing link, draw or type a
   signature, and the quote flips to `status=approved` — demonstrated
   end-to-end on `d.crm`.

8. **Port bulk mode into R80.3's `R8Calculator.tsx`.**
   Success: selecting 3+ workers in R80.3 and running the calculator
   produces 3+ distinct charge-rate results in one batch, matching
   per-worker manual runs to the cent (output-equivalence per §9.1).

9. **Add `billing_model`/`overhead_value`/`margin_value`/
   `charge_rate_quote_id` columns to `placements`.**
   Success: saving a placement with a non-default billing model persists
   and reloads correctly (round-trip verified via `execute_sql` SELECT,
   not just UI display).

10. **Give R80.3's `invoice_runs` (or a defined hand-off point) a real Xero
    push path.**
    Success: finalising an `invoice_run` on `d.r8` results in either (a) a
    Xero invoice visible in a connected Xero demo org, or (b) a CRM7
    `invoices` row created and picked up by the existing
    `xeroInvoiceAdapter`/`xero-invoice-submit` path — either is acceptable
    but the hand-off must be explicit, not assumed.

---

## Cross-cutting notes for the loop contract

- **Labour-hire variant acceptance (cross-cutting per the contract's own
  note) is further along than the contract assumed** on the calc-engine and
  type-model side (Stage 12) — the remaining work is UI breadth (R80.3
  selector) and an explicit "0 training days" validation rule, not new calc
  logic.
- **The single biggest risk to W2's binary success condition** ("a quote
  created on d.crm, e-sign link signed in-browser, status=approved, host
  rate rows live") is the migration-floor gap (`boot_assessments`,
  `charge_rate_audit_log`, `award_rate_cache`/`award_rates` mismatch) — none
  of these are feature-build work, all are §12.1 Supabase Policy Gate /
  floor-gated dispatch work, and should be sequenced first so the rest of
  W2 isn't built and tested against a schema that silently doesn't match
  what the code queries.
- **Dead-code hygiene:** `pages/quotes/*` + `quoteLifecycle.ts` +
  `useQuoteStore` is a concrete DRY violation once `charge_rate_quotes` is
  confirmed as the intended live path — flagging for the operator's §7
  dead-code-removal rule rather than unilaterally deleting it in this
  research pass.
