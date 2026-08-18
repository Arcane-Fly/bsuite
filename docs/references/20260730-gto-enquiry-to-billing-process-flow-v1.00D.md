# GTO enquiry-to-billing process flow

**Status:** D (Draft) · **Date:** 2026-07-30 · **Scope:** BSuite — CRM7, Conduit, R80.3, BSU

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Anchored against `development` HEAD of `GaryOcean428/crm7`, `GaryOcean428/R80.3`,
`GaryOcean428/conduit`. Every "BUILT" claim below cites the file or migration it was
verified from. Nothing is marked BUILT on inference.

---

## 0. Ownership ruling (DRY one-shot)

| Entity | Owning app | Table |
|---|---|---|
| Lead | CRM7 | `leads` |
| **Labour requirement** (NEW) | CRM7 | `labour_requirements` |
| Host employer | CRM7 | `employers` |
| Charge rate quote | **CRM7** | `charge_rate_quotes` |
| Charge rate calculation engine | shared package | `@bsuite/charge-calc` |
| Placement agreement (quote stage) | CRM7 | `charge_rate_quotes` (`quote_stage`) |
| Vacancy | CRM7 | `vacancies` |
| Candidate / application | Conduit | `r7_candidates`, `r7_applications` |
| Person / apprentice | CRM7 | `people`, `apprentices` |
| Placement / engagement | CRM7 | `placements`, `engagements` |
| Timesheet | CRM7 | `timesheets` |
| Pay run / payroll record | CRM7 | `pay_runs`, `payroll_records` |
| Invoice | CRM7 | invoices + Xero passthrough |
| What-if modelling, BOOT, margin, funding offsets | R80.3 | `saved_calculations` (non-transactional) |

**R80.3 does not own quotes.** It has no quote entity — only `saved_calculations`
(`R80.3/src/App.tsx`, `useCalculatorStore`). CRM7 already consumes the same
`@bsuite/charge-calc` engine, including the BOOT gate
(`crm7/src/pages/charge-rates/create/types.ts`). Placements, completions and
training hours were already moved R80.3 → CRM7 on 2026-07-29 under the same
ruling. Any "quote in R8" path creates a second CRUD owner and must be rejected.

R8 remains the modelling surface: `ComparativeView`, `BetterOffOverallTest`,
`PaydaySuperCalculator`, `MarginDashboard`, `FundingOffsets`,
`EnterpriseAgreementManager`. Deep-link from a CRM7 quote into R8 read-only for
what-if; never the reverse for persistence.

---

## Stage 1 — Enquiry intake

### 1.1 Inbound capture — BUILT
`crm7/supabase/functions/lead-capture/index.ts` (canonical; the BSU duplicate was
deleted 2026-04-23). Channels: `braden.com.au` contact form, and the tenant embed
at `/embed/lead-form.html?tenant=<uuid>`. Hardening in place: origin allow-list
CORS, 30 req/min per IP, POST-only, `application/json` enforced, 16 KB body cap,
per-field length caps, C0 control-char stripping, type-confusion guards, email
redaction in logs, internal lead id never returned.

### 1.2 Manual/phone entry — PARTIAL
`crm7/src/pages/leads/create.tsx` exists but is a generic CRM lead form. **GAP:**
no GTO enquiry capture. See 1.4.

### 1.3 Routing and notification — PARTIAL
BUILT: `lead_routing_rules` (ordered by `priority`, matched on `match_source` and
`match_service_type`) → fallback `lead_routing_defaults` → sets `leads.assigned_to`
→ inserts `app_notifications` (`type: 'action_required'`) → emails the tenant's
`tenant_settings.lead_notification_email` via `email-dispatcher` → sends the
enquirer a confirmation.

**GAPS:**
- Cannot match on trade, qualification, region, sector or headcount.
- Single-user target only — no team target, no round-robin.
- No SLA timer, no escalation on unactioned leads. This is the single biggest
  revenue leak in the flow.

**Fix:** extend `lead_routing_rules` with `match_trade`, `match_state`,
`match_region`, `match_sector`; add `assigned_to_team` (nullable, XOR with
`assigned_to_user`) and `assignment_strategy ∈ {first, round_robin, load_balanced}`;
add `sla_minutes` + `escalate_to_user_id` with a cron sweep.

### 1.4 Labour requirement — GAP (new entity)

The step-4 payload does not belong on `leads` as loose columns. It outlives the
lead: it is what gets quoted, recruited against, becomes the vacancy, and gets
versioned when the host changes their mind. One record, carried end to end.

```
labour_requirements
  id                        uuid pk
  tenant_id                 uuid not null
  lead_id                   uuid null  -> leads(id)
  host_org_id               uuid null  -> employers(id)     -- null pre-conversion
  requirement_number        text not null                    -- per-tenant sequence
  version                   int  not null default 1
  supersedes_id             uuid null  -> labour_requirements(id)

  -- what
  worker_type               worker_type not null   -- apprentice|trainee|sbt|
                                                   -- labour_hire_ft|labour_hire_pt|
                                                   -- labour_hire_casual|abn_contractor
  headcount                 int not null default 1
  trade_id                  uuid null
  qualification_code        text null              -- TGA code, via tga-search
  training_package_code     text null
  anzsic_division           text null              -- industry, e.g. construction
  sector                    text null              -- residential|commercial|civil|...

  -- who
  entry_level               text null              -- new|y1|y2|y3|y4|existing_worker
  prior_experience_years    numeric null
  age_band                  text null              -- adult|junior|unspecified
  completed_year_12         boolean null
  school_based              boolean not null default false

  -- where / when
  proposed_start_date       date null
  state                     char(3) not null
  region                    text null
  worksite_address          jsonb null

  -- conditions
  required_tickets          text[] not null default '{}'   -- WAH, C-class, WhiteCard...
  special_considerations    text null
  host_referenced_instrument_id uuid null   -- NOT "the applicable EBA" — see §Legal
  host_referenced_note      text null

  status                    text not null default 'open'
    -- open|quoted|won|lost|withdrawn|filled
  created_by                uuid null
  created_at / updated_at   timestamptz
```

**Anti-discrimination note.** `age_band`, `completed_year_12` and
`school_based` exist because they are **wage-determining variables under the
award**, not screening criteria. They must be captured on the *requirement*
(what rate applies) and never surfaced as filters on the *candidate* search in
Conduit. Enforce with a lint rule: these columns may not appear in any
`r7_candidates` query.

**Gates before leaving Stage 1:** none. Capture is cheap; qualify later.

---

## Stage 2 — Quote (two-stage lifecycle)

**Operator ruling 2026-07-30.** A quote exists **before** any agreement with the
host — it is the sales instrument that wins the relationship. The lifecycle is:

```
provisional quote                    placement agreement and charge
(pre-agreement, person-less)   →     (post-placement, apprentice-specific)

priced as a MATRIX of general        amended with the actual apprentice's
circumstances: every quoted year     wage-determining facts: real age band,
level x every profile (junior Y12,   Y12 status, actual year level, actual
junior non-Y12, adult), assumed      start date; the applicable matrix LINE
start window                         is selected and locked; approved; sent
                                     to host specific for that apprentice
host signs → business won            host signs → operative billing document
```

Schema: this is a discriminator and an amendment chain on the **existing** table,
not a new entity. `charge_rate_quotes.worker_id` is already nullable — the
provisional stage is simply the person-less state the schema anticipated.

```
charge_rate_quotes  (additions)
  quote_stage        text not null default 'provisional'
                     check (quote_stage in ('provisional','placement_agreement'))
  placement_id       uuid null -> placements(id)
                     -- required when quote_stage = 'placement_agreement'
  supersedes_id      uuid null -> charge_rate_quotes(id)
                     -- amendment chain: the placement agreement supersedes the
                     -- provisional quote it was derived from; re-negotiations
                     -- chain the same way
  check (quote_stage = 'provisional' or placement_id is not null)
```

Consequences:
- **`host_rate_cards` (previously proposed at §3.1) is withdrawn.** The approved
  placement agreement IS the rate record for that placement. Invoicing traces
  each line to `charge_rate_quote_line_id` on the placement agreement — the host
  sees the exact document they signed for that apprentice on every invoice.
  Simpler, and DRY.
- The signing flow (§2.5) applies unchanged to both stages — same token
  mechanism, same page; the context RPC already returns `workerName` when
  present.
- `requoteOnRiseService` and the progression scheduler (§9) emit draft
  **placement-agreement-stage** amendments (`supersedes_id` → the current
  agreement), never bare quotes — which is nearly what the service already does,
  since it copies the prior quote's host/worker linkage.
- **The provisional quote is a matrix, not a single assumed profile** (operator
  ruling 2026-07-30). `charge_rate_quote_lines` carries one line per
  (year_level × worker_profile) combination the host may need: Y1–Y4 across
  junior-Y12 / junior-non-Y12 / adult, each with its own effective-dated rate.
  The host signs one document covering whoever recruitment finds. The placement
  agreement then *selects* the applicable line and locks it to the apprentice —
  it does not recompute from scratch. The amendment diff at placement time is
  therefore a line selection ("matrix line: adult Y1, $Y/hr") plus any facts
  that fell outside the quoted matrix.
- **Role authority is BSU-configured, not hardcoded** (operator ruling
  2026-07-30). Who can create quotes, edit which fields and variables, override
  margin, approve, and dispatch is a super-admin / org-admin decision set in
  BSU's permission management — consistent with BSU owning system management
  under DRY one-shot. Every "role" reference in this document (P1.1, P1.3, §8.2
  review rights) describes a *sensible default permission set*, not a fixed
  role model. CRM7 reads the permission matrix; it does not define it."
- The training contract has **no bearing on quoting** — it appears at Stage 5
  (engagement) only. Its commencement date matters to the *progression
  scheduler* (§9.2), which drives future placement-agreement amendments, but it
  is not an input to either quote stage.

### 2.1 Quote from requirement — PARTIAL
`leadId` is already in the quote form schema
(`crm7/src/pages/charge-rates/create/types.ts`) but nothing navigates to it.
`/leads/[id]` offers only Convert to Contact / Link Contact / Convert to Client.

**Fix:** add a "Quote this requirement" action on `labour_requirements`, routing
to `/charge-rates/create?requirement_id=<uuid>`, pre-filling worker type, trade,
qualification, entry level, state, age band, Y12, SBT, start date.

### 2.2 Quote builder — BUILT (with gaps)
`crm7/src/pages/charge-rates/create/` — tabs `ApprenticeHostTab`, `RateInfoTab`,
`AdvancedConfigSection`, `ReviewTab`, plus `RateScheduleSidebar`.

BUILT inputs: `apprenticeId`, `hostEmployerId`, `leadId`, `workerType`, `payRate`
+ `wageSource` (live-api fair-work / live-api enterprise-agreement /
tenant-preference / host-agreed / manual), `trainingDaysSource`, `asOfDate`
(as-of rate preview), `enterpriseAgreementId`, `awardId`, `classificationId`,
`customMargin`, `isTemplate` + `templateName` (**satisfies your step 10**),
`isQuote`, `isBulkOperation` + `selectedApprentices` / `selectedHostEmployers`
(**batch quoting**), `advancedOverrides` (super, WC, leave loading, study, PPE,
admin, training weeks, annual/PH/sick leave days, billing model
`standard|alex48|w52`).

BUILT provenance: `charge_rate_snapshots` + `chargeRateSnapshotService` +
`CALC_ENGINE_VERSION` — every quote persists its full calc-input profile so it
can be recomputed identically later.

**GAPS to close:**

| Gap | Fix |
|---|---|
| Single scalar rate | `charge_rate_quote_lines` (below) |
| No split effective-dating in one quote | line-level `effective_from` / `effective_to` |
| No year-level schedule persisted | line per year level; the PDF already accepts `yearlyRates` and is being passed `[]` |
| No adult/junior, Y12, SBT selectors | inherit from `labour_requirements` |
| No state/region when no apprentice chosen | inherit from `labour_requirements.state` (drives payroll tax + WC) |
| No tickets/licences | inherit; surface as quote inclusions and as recruitment must-haves |
| Raw UUID as quote id | `quote_number` per-tenant sequence |
| No expiry | `valid_until date not null default now() + interval '30 days'` |
| No GST treatment | `gst_treatment ∈ {ex_gst, inc_gst}` + display on PDF and signing page |

```
charge_rate_quote_lines
  id                    uuid pk
  charge_rate_quote_id  uuid not null -> charge_rate_quotes(id) on delete cascade
  line_no               int not null
  worker_profile        text not null   -- 'apprentice_y2_adult_non_y12'
  year_level            text null
  effective_from        date not null
  effective_to          date null
  base_wage_hourly      numeric(10,4) not null
  charge_rate_hourly    numeric(10,2) not null
  oncost_breakdown      jsonb not null  -- super, WC, payroll tax, leave, admin, margin
  rate_basis_note       text null       -- 'post 1 Jul super rise', 'pre WC renewal'
  unique (charge_rate_quote_id, line_no)
```

`charge_rate_quotes.charge_rate_hourly` becomes the headline/derived value; the
lines are the substance.

### 2.3 Compliance gates on quote save — MOSTLY GAP

| Gate | Applies to | Status | Behaviour |
|---|---|---|---|
| BOOT / award floor | all | BUILT (`bootGate`, `@bsuite/charge-calc/boot`) | block below-award |
| Casual prohibition | apprentice, trainee, SBT | GAP | hard block `worker_type ∈ {apprentice,trainee,sbt}` with casual engagement |
| Protected rate floor (SJSP) | labour_hire_* only | **GAP — see §Legal 2** | block if host is a regulated host and rate < protected rate |
| Host insurance currency | all | GAP | warn |
| Host capacity assessment | apprentice, trainee, SBT | GAP | warn at quote, **block at placement** |

### 2.4 Quote bundle and dispatch — PARTIAL
BUILT: `charge-rate-quote-dispatch` edge function (`send`, `notify_signed`);
tracked email; recipient-scoped signing token.

**GAP:** one envelope must carry quote + Host Employer Agreement + Host Handbook,
with per-document signature status. Today the token covers the quote alone and
`hosts/agreements` is an unlinked surface.

```
quote_envelopes
  id, tenant_id, charge_rate_quote_id, host_org_id, recipient_email,
  recipient_name, sent_at, expires_at, status
quote_envelope_documents
  id, envelope_id, document_kind,     -- quote|host_agreement|handbook|
                                      -- placement_agreement|schedule
      document_template_id uuid null, -- template it was rendered from
      document_metadata_id, requires_signature bool, signed_at, signature_id
```

### 2.4a Document templates — GAP (operator ruling 2026-07-30)

Quotes, host agreements, handbooks and placement agreements must be
**uploadable as tenant templates with merge fields** for customisation — not
hardcoded layouts. The GTO uploads their own agreement and handbook; the system
fills the fields at envelope generation.

```
document_templates
  id, tenant_id,
  kind ∈ {quote, host_agreement, handbook, placement_agreement, other},
  name, version int, is_active bool,
  storage_bucket, storage_path,        -- uploaded docx/pdf source
  created_by, created_at
document_template_fields
  id, template_id,
  field_key text,                      -- host.business_name, quote.number,
                                       -- line.charge_rate, apprentice.full_name,
                                       -- agreement.effective_from ...
  label, source ∈ {system, manual},    -- system-resolved vs entered at send
  required bool, default_value text null
```

`system` fields bind to canonical entities (employers, quotes, quote lines,
people, placements); `manual` fields are prompted at envelope creation.
Rendering substrate: the existing `generate-document` edge function (crm7) —
extend it to take a template + field map rather than adding a renderer.
Template-editing permission is BSU-managed like everything else in P1.
DRY note: templates render **from** canonical data; a rendered document is an
artifact in `document_metadata`, never a second source of truth for a rate.

### 2.5 Signature — BUILT
`crm7/src/pages/quotes/sign/[token].tsx` — public, unauthenticated, token is the
sole authority artifact (mirrors `r7_redeem_talent_pool_consent`). Draw or type
signature, decline-with-reason, PDF download, already-actioned handling, expired-
link handling. RPCs `get_charge_rate_quote_signing_context` /
`redeem_charge_rate_quote_signature`. Migration
`20260704090000_charge_rate_quote_signing.sql`.

**Add:** offline return path — upload a wet-signed PDF, scan/enter the
`quote_number`, and record `signature_method = 'wet_uploaded'` with the uploader
and the document reference, so the audit trail is uniform across channels.

---

## Stage 3 — Host activation

### 3.1 Acceptance propagation — REVISED per the two-stage ruling
BUILT: `charge_rate_quotes_propagate_approval` trigger (migration
`20260704130000`, execute revoked `20260704140000`) propagates an approved quote
to its placement.

Under the two-stage model this trigger is **correctly aimed** — it just fires at
the wrong stage today. Behaviour by stage:

- `provisional` approved → **no placement propagation** (none exists). Effects:
  host status advances (§3.3), requirement status → `won`, recruitment is
  unblocked (Stage 4), tasks fan out (P1.4).
- `placement_agreement` approved → the existing propagation runs: the placement's
  operative rate is the approved agreement's line set, resolved by date and
  worker profile. Invoice lines trace to `charge_rate_quote_line_id`.

Guard: the trigger gains a `quote_stage = 'placement_agreement'` condition. A
provisional quote approval must never write to a placement.

### 3.1a Placement → agreement generation — GAP (the new step)
When a placement is created and an apprentice linked (Stage 5.4), the system
derives a draft placement agreement from the governing provisional quote:
copy lines, substitute the apprentice's actual wage-determining facts, recompute
via `@bsuite/charge-calc` against the same snapshot profile, set
`supersedes_id`, present the diff ("quoted junior Y1; placed adult Y1 — $X→$Y")
for GTO review, then dispatch to the host through the existing envelope + signing
path. Nothing auto-sends.

### 3.2 Host record of truth — GAP (decision required)
Lead conversion creates a `clients` row (`status: 'prospect'`,
`crm7/src/pages/leads/[id].tsx`). Quotes FK to `employers.id` via `host_org_id`.
Two tables, one concept.

**Recommendation:** `employers` is the host of record. `clients` becomes either
(a) deleted, or (b) a commercial-relationship view over `employers`. Lead
conversion should create/link an `employers` row. Pick one before more code
accretes on both.

### 3.3 Host lifecycle status — GAP
Your `pending host → converted` idea is right but needs to be explicit:

```
prospect → quoted → agreement_signed → assessment_passed → active → dormant → terminated
```

`assessment_passed` is set by `hosts/capacity-assessment` (BUILT surface) and is
the gate on placement.

### 3.4 Commercial onboarding — GAP
Not in your flow, needed before first invoice: ABN/ACN verification, credit check
or credit limit, trading terms and payment terms agreed, PO-required flag,
billing contact and invoice delivery method, public liability certificate of
currency with expiry tracked in `document_metadata`.

---

## Stage 4 — Recruitment (Conduit)

Out of scope for detail here per your note. The handoff contract:

- CRM7 `vacancies` row is created **from** `labour_requirements`, carrying trade,
  qualification, entry level, state, region, start date and `required_tickets`
  (as must-have screening criteria — **not** age band, Y12 or SBT).
- Conduit runs sourcing, screening, interviews, offers.
- BUILT handback: Conduit "Convert to apprentice in CRM7" → handoff token →
  CRM7 `/apprentices/from-candidate` → RPC `create_apprentice_from_candidate` →
  then `handover-to-employment` edge function
  (`crm7/supabase/functions/handover-to-employment/index.ts`) which copies the
  candidate's `r7_documents` into `document_metadata` / the
  `apprentice-documents` bucket with provenance notes, re-links recruitment
  emails via `email_message_links`, and evaluates required-document coverage
  against `tenant_field_definitions`. Idempotent on deterministic destination
  paths. **This satisfies your step 17.**

---

## Stage 5 — Engagement (the missing stage)

Everything here is GAP. It sits between your steps 15 and 16.

| Step | Entity | Note |
|---|---|---|
| 5.1 Employment contract | `employment_contracts` | GTO is the employer. Casual prohibited for apprentice/trainee/SBT — DB CHECK constraint, not a warning. |
| 5.2 Training contract | `training_contracts` | Sign-up with the AASN provider, lodgement with the state training authority (WA: DTWD). Track `lodged_at`, `approved_at`, `probation_end_date`, `nominal_completion_date`, `statutory_lodgement_deadline`. |
| 5.3 RTO enrolment | `training_enrolments` | RTO selection, enrolment date, funding source. `training-providers` + `funding-sources` surfaces already exist. |
| 5.4 Host placement | `placements` | **Blocked** unless host `assessment_passed`, assessment not expired, PL insurance current, host agreement signed. |
| 5.5 Inductions | `inductions` | GTO induction + host site WHS induction, both evidenced before first shift. |
| 5.6 Rate assignment | approved placement agreement | Operative rate = the approved `placement_agreement`-stage quote's line set (§3.1a). `placements.award_rate_id` remains for the underlying instrument reference. |
| 5.7 Portal invite | BUILT | `worker-portal` if not already converted from Conduit. |

**Out of scope — training plan.** Operator ruling 2026-07-30: the training plan
(units of competency mapped to on- and off-the-job delivery, signed three ways
with the RTO) belongs to training management, not the enquiry-to-billing loop.
It is an important process and warrants its own flow spec; it is not gated here
and no step above depends on it.

**In scope — training contract.** Distinct from the plan and retained at 5.2. Its
`commencement_date` and `nominal_term` are wage-determining: the year-level clock
that drives progression (§9.2) and the rate card (§3.1) starts at the contract's
commencement, not at the placement date. A placement cannot proceed without a
lodged contract.

---

## Stage 6 — Pay cycle configuration

All GAP. Your steps 18–20 have no home in the schema today.

```
pay_cycles
  id, tenant_id, name,
  frequency ∈ {weekly, fortnightly, monthly},
  anchor_date date,                       -- defines the period grid
  payment_weekday int,                    -- 0-6
  timesheet_due_offset_days int,          -- e.g. -2 (Monday for a Wednesday pay)
  timesheet_due_time time,                -- e.g. 12:00
  host_approval_due_offset_days int,
  host_approval_due_time time,            -- e.g. 18:00
  backup_payment_weekday int null,        -- optional secondary payday
  is_default bool

pay_cycle_assignments
  id, tenant_id, pay_cycle_id,
  scope ∈ {worker_type, cohort, individual},
  worker_type worker_type null,
  person_id uuid null

notification_schedules
  id, tenant_id, pay_cycle_id,
  event ∈ {timesheet_open, timesheet_due_soon, timesheet_overdue,
           approval_due_soon, approval_overdue, payslip_available,
           progression_upcoming, rate_change_upcoming},
  offset_minutes int,                     -- negative = before deadline
  channels text[],                        -- email, sms, push, in_app
  audience text[]                         -- apprentice, host_supervisor,
                                          -- field_officer, payroll, gto_admin
  is_active bool
```

**Award frequency check.** Most awards require apprentice wages weekly or
fortnightly. Store the permitted maximum interval against the applicable
instrument and block a `pay_cycles` configuration that exceeds it for the
affected cohort, rather than relying on the operator to remember.

---

## Stage 7 — Timesheet cycle

### 7.1 State machine — BUILT
Migration `20260423150000_ws4_timesheet_state_machine.sql`:
`draft → submitted → pending_host_approval → pending_gto_review → approved →
exported → archived`, with append-only `timesheet_events` (from_state, to_state,
actor, actor_role, event_type, notes, metadata). RLS: GTO staff full, apprentice
sees own via `get_user_apprentice_id()`, host supervisor sees rows for workers
engaged at their host via `engagements`.

### 7.2 Generation and pre-fill — GAP
Needed: scheduled generation per `pay_cycles`; pre-fill from the placement's
ordinary hours and rostered training day; carry-forward from the prior period;
allowance picker scoped to the applicable instrument (km, meal, travel, tool,
site); optional Jodie-assisted completion.

### 7.3 Entry paths — PARTIAL
BUILT: apprentice via `worker-portal`, host via `host-employer` portal, deep-link
from notification.

**GAP — two distinct audit states, not one:**
- `host_entered_on_behalf` — host created the entry from scratch.
- `host_adjusted` — host modified the apprentice's entry.

Both notify the apprentice. Both are separate `timesheet_events` types.
`host_entered_on_behalf` should require apprentice acknowledgement before
reaching `approved`, with a GTO override for genuine connectivity cases. The
adjustment feature stays tenant-toggleable as you specified.

### 7.4 Leave without pay — GAP, and stronger than you specified
Default every period to the placement's full ordinary hours. Reducing below that
requires an approved exception reason. Host-entered "no work available" is not a
valid reason to reduce — the GTO carries the wage cost regardless, so it should
be recorded as a **claimable event against the host** under the host agreement's
guaranteed-hours clause, not as a silent reduction. Repeat occurrences roll up to
`hosts/monitoring` for field-officer review. This inverts the incentive correctly
and it is also the commercially correct answer.

### 7.5 Reminders and escalation — GAP
Driven by `notification_schedules`. Missed-deadline path must include the backup
payday branch when the tenant has enabled one.

---

## Stage 8 — Pay and bill

### 8.1 Pay run — BUILT (with the legal gaps in §Legal 1)
`pay_runs` (period, payment date, status, totals, `xero_payrun_id`,
`stp_submitted_at`) and `payroll_records` (per apprentice per run, hours,
earnings, PAYG, super, net, `super_due_date`, `timesheet_ids[]`).
`business_days_after(payment_date, 7)` trigger sets the super due date. Xero
payroll adapter and STP passthrough per `docs/adr/0004-stp-xero-passthrough.md`.

### 8.2 GTO review — change from your spec
Do **not** auto-process on host approval. Keep `pending_gto_review` as a
mandatory state but make it a batch exception review: auto-advance clean
timesheets, hold only those that trip a rule —

- leave without pay present
- overtime above a configured threshold
- an allowance not previously claimed for this placement
- hours below the placement's ordinary hours
- host adjustment or host-entered-on-behalf
- apprentice acknowledgement outstanding

That gives the speed you want without handing payroll authorisation to a host
mis-click, and without creating STP events you then have to reverse.

### 8.3 Payslip — verify
Confirm payslip generation and delivery to `worker-portal`. Fair Work requires
issue within one working day of payment. Not verified in this pass — treat as
unconfirmed until evidenced.

### 8.4 Invoice — PARTIAL, verify the trigger
BUILT: `src/lib/billingEngine.ts`, `src/components/invoices/InvoiceLineItemBuilder.tsx`,
`invoice-send-direct`, `xero-invoice-submit`, `xero-webhook`.

**Unverified:** whether an approved timesheet automatically produces invoice lines.
Required behaviour: on `approved`, generate lines from billable hours × the
approved placement agreement's line rate, plus allowances and penalties, respecting the
host's billing model (`standard|alex48|w52`) and PO requirement. Every line must
carry `timesheet_id` and `charge_rate_quote_line_id` so the host can trace the
rate back to what they signed.

### 8.5 Debtor follow-up — GAP
Your step 24 ("invoice reminders sent"). Needs an ageing schedule, reminder
cadence, and a stop-supply escalation policy.

---

## Stage 9 — Ongoing change events

### 9.1 Rate rise requote — BUILT (narrow)
`crm7/src/services/requoteOnRiseService.ts`. Fires on an `award_rates` row change,
finds active placements by `placements.award_rate_id`, recomputes against the
placement's most recent `charge_rate_snapshots` calc-input profile, inserts a
**draft** `charge_rate_quotes` row and an `app_notifications` notice. Never
auto-sends, never auto-approves.

**GAPS:** manual entry point only (no cron / DB trigger on `award_rates` UPDATE);
notifies the GTO admin only — not the host, not the apprentice.

### 9.2 Year-level progression — GAP
This is the higher-frequency event and has no trigger at all. Required:

- Scheduler on the apprentice's progression anniversary (or competency-based
  progression event, where the training contract uses it).
- Lead time from tenant preference — your example was one month.
- Three notification lanes: host (new charge rate, effective date, full
  breakdown of wage/allowance/penalty impact), apprentice (new wage rate,
  effective date), GTO payroll (action list).
- Emits a draft placement-agreement amendment (`supersedes_id` → current
  agreement) for GTO review; sent to the host where the agreement requires
  re-acceptance, notice-only otherwise (open decision 2).

### 9.3 Other change events to model
Award annual increase (1 July), super rate change, workers-comp premium renewal,
payroll-tax threshold change, host EBA replacement, placement transfer to a new
host, apprentice suspension or cancellation, completion.

---

## Legal findings — must resolve before build

### L1. Payday Super — schema is behind the law
Payday Super commenced **1 July 2026**. Confirmed against ATO guidance and PCG
2026/1.

- SG contributions must be **received by the fund** within **7 business days** of
  payday. The existing `business_days_after(payment_date, 7)` trigger is
  **correct**.
- **`payroll_records.super_guarantee_rate DEFAULT 0.115` is stale.** SG is 12%.
  `@bsuite/charge-calc` `DEFAULT_CONFIG.superRate` already says 12% — the two
  disagree. Fix the default and backfill.
- **SG is now calculated on qualifying earnings, not OTE.** QE includes OTE plus
  commissions, salary sacrifice and most paid leave; it excludes overtime,
  expense allowances and most termination payments. `payroll_records` has
  `ordinary_earnings`, `overtime_earnings`, `gross_earnings` — none of which is
  QE. **Add `qualifying_earnings numeric(14,2) not null default 0`** and compute
  SG from it. STP must report QE and the super liability every cycle.
- **20-business-day exception not modelled.** A first contribution for a new
  employee, or to a new fund for an existing employee, gets 20 business days.
  For a GTO onboarding apprentices continuously this is the common case. The
  trigger currently applies 7 unconditionally, which will produce false overdue
  alerts and, worse, may mask a genuine one.
- Maximum contribution base is now annual ($270,830 for 2026-27) rather than
  quarterly. Low impact for apprentices; relevant for senior labour hire.

### L2. Same Job Same Pay — not modelled anywhere
Zero matches for protected rate / regulated labour hire / same job same pay
across the whole org.

- **Apprentices and trainees under a training arrangement are excluded** from
  regulated labour hire arrangement orders. The ACCI employer guide calls this
  exemption out as specifically relevant to GTOs. Your apprentice book is safe.
- **Your non-training worker types are not.** `labour_hire_ft`, `labour_hire_pt`,
  `labour_hire_casual` placed at a regulated (non-small-business) host are in
  scope. Paying below the protected rate is a civil penalty on the GTO.
- Required: `employers.is_regulated_host bool`, `employers.covered_instrument_id`,
  a `protected_rate_of_pay` resolver, exemption-period tracking (first 3 months
  of an arrangement), and a **hard block** on quoting or paying a non-training
  worker below protected rate at a regulated host.

### L3. EBA mirroring — settled 2026-07-30 per operator direction

An enterprise agreement does not get approved by the FWC without passing BOOT.
An approved EBA is therefore a **valid rate source as-is** — the engine takes the
approved schedule and does not re-run BOOT against it.

Rules that remain:
- The GTO's floor is the modern award (or its own EBA if it holds one). **GTO
  customisation is upward-from-award only** — any manual or host-agreed rate is
  checked against the award floor by the existing `bootGate`, exactly as built.
- An imported/mirrored host EBA sits above that floor as the agreed commercial
  schedule. Keep `rateSource: 'enterprise_agreement'` and the existing
  `wageSource` machinery unchanged.
- Add one field only: `ea_role ∈ {applicable_instrument, mirrored_reference}` on
  the quote↔EA link, so the record shows whether the GTO is a party to the
  agreement or is contractually matching a host's schedule. Surface it in R80.3's
  `EnterpriseAgreementManager` list view.
- **An EBA carries wages, never charges** (operator ruling 2026-07-30). An
  enterprise agreement contains pay rates, penalties, allowances and conditions
  only. It is exclusively a *wage-side input*. The charge side — super, workers
  comp, payroll tax, leave loading, admin, margin — is always computed by
  `@bsuite/charge-calc`, regardless of wage source. No instrument ever supplies
  a charge rate; any import path that reads a "charge" from an uploaded EBA is
  a bug. Engine contract: wage inputs (award | EBA | manual-above-award) →
  charge-calc → charge rate.
- Unchanged: where a regulated labour hire arrangement order is in force, the
  host instrument's protected rate is a **legal** floor for non-training workers
  (L2's mechanism, independent of mirroring).

### L4. Casual prohibition needs a constraint, not a warning
Apprentices, trainees and school-based trainees cannot be engaged casually under
national and state legislation. `worker_type` already includes
`labour_hire_casual`, which is correct for non-training workers. Add a CHECK
constraint on the engagement/placement so `worker_type ∈
{apprentice, trainee, sbt}` cannot coexist with a casual employment basis.

### L5. Missing statutory artifacts (in this flow)
Training contract lodgement, probation dates, RTO enrolment, host WHS induction.
See Stage 5. Highest risk of these is the training contract: without a lodged
contract there is no apprenticeship, and its commencement date is the anchor for
every year-level progression and rate change downstream.

Training plan is out of scope for this flow per the operator ruling at Stage 5 —
tracked separately.

---

## Perspectives

The flow above is written from the system's point of view. Read from each
participant's point of view it has different holes. The largest structural
assumption is that **"GTO user" is one person, and that hosts and apprentices are
recipients of notifications rather than participants in the process.**

### P1. GTO users — four roles, not one

> **Authority note (operator ruling 2026-07-30):** everything below describes
> default permission *sets*, not a fixed role model. The actual matrix — who
> can create quotes, edit fields and variables, override margin, edit
> templates, approve and dispatch — is configured per organisation by the
> super-admin / org-admin in BSU.

| Role | Lives in | What the flow gives them today | What's missing |
|---|---|---|---|
| BDM / sales | Leads, requirements, quotes | 4-tab wizard with a full oncost override panel | Fast-quote path; role-simplified form; pipeline and win-rate view |
| Field officer | Host assessment, monitoring, welfare | Nothing until after placement | Required reviewer on host capacity assessment; notified on any quote in their patch |
| Payroll officer | Timesheet → pay run → invoice | Lists | Exception queues (§8.2), not lists |
| Manager | Margin, approvals | No floor, no authority model | Margin floor + discount authority gate |

**P1.1 — Role-scope the quote wizard.** `advancedOverrides` exposes super rate,
WC rate, leave loading, study cost, PPE cost, admin rate, training weeks and
three leave-day fields. That surface belongs to an admin, not a BDM. Tenant-default
every value, lock the panel behind a role permission, and give the BDM four
inputs: host, trade, entry level, start date. Everything else resolves from
`labour_requirements` + tenant settings.

**P1.2 — Fast-quote path.** The sales motion is a live phone call. Current path
(lead → requirement → 4-tab wizard) cannot produce an indicative rate inside a
call. Build: pick host + trade + level from a template → indicative rate on
screen in under 30 seconds → formal quote generated afterward against the same
`charge_rate_snapshots` profile. `isTemplate` / `templateName` already exist;
this is a thin surface over them.

**P1.3 — Discount authority.** `RateApprovalWorkflow.tsx` exists but there is no
margin floor. Add `tenant_settings.min_margin_percent` and
`tenant_settings.margin_override_role`; a quote below the floor cannot reach
`sent` without an approval event recorded on the quote. Today an under-priced
job is discovered in a margin report weeks later.

**P1.4 — Task handover on acceptance.** When a quote is signed, nothing is
assigned to anyone. Create a task for the owning BDM (host activation) and for the
field officer (assessment, if not current), and notify recruitment that a
requirement is ready to publish.

**P1.5 — Field officer in the pre-sale loop.** The FO knows the host's supervision
capacity, safety history and past apprentice outcomes better than the BDM does.
Make FO sign-off a required input to `hosts/capacity-assessment` and notify the FO
for the region on any quote issued to a host in their patch.

### P2. Hosts — they are budgeting, not buying an hourly rate

**P2.1 — Inclusions and exclusions must appear on the quote.**
`DEFAULT_BILLABLE_OPTIONS` carries `includeAnnualLeave`, `includePublicHolidays`,
`includeSickLeave`, `includeTrainingTime`, `includeAdverseWeather`, all defaulting
to `false`. The host is currently quoted a rate whose meaning depends on five
booleans they cannot see. Render them as an explicit inclusions/exclusions block
on the quote PDF and the signing page. This is the single most common source of
month-three billing disputes and it is free to fix — the data is already in the
calc config.

**P2.2 — The forward rate schedule is the feature hosts actually want.**
"$X/hr now, $Y/hr from March 2027 when they progress to 2nd year." Every host asks
this and the current single-scalar quote cannot answer it. This is the strongest
business case for `charge_rate_quote_lines` (§2.2).

**P2.3 — "What the GTO carries" line.** Hosts price against direct employment.
The oncost breakdown already exists in the calc result. Render a plain-language
summary on the quote: workers compensation, payroll tax, superannuation
administration, leave accrual and cover, replacement cover during training and
absence, field officer support, recruitment, training contract administration,
termination risk. Converts a price objection into the value proposition. Zero new
data required.

**P2.4 — Mobile timesheet approval is the retention risk.** A host supervisor is
on a site, on a phone, at 5pm. If approving four timesheets takes more than about
ninety seconds they will stop doing it on time and the whole pay cycle slips —
which cascades into late apprentice pay (P3.1). This surface deserves more design
attention than any internal screen in the system. Target: open notification →
approve all → done, three taps, no scrolling, works on a poor connection.

**P2.5 — Rate change notices need reason and lead time.** A host reacts
differently to "award increase, 1 July, everyone" than to "your apprentice
progresses to 3rd year on 12 March". Both need enough lead time to budget or
object. `notification_schedules.event` already distinguishes
`progression_upcoming` from `rate_change_upcoming` — carry the reason into the
message body and the host portal.

**P2.6 — Sign once.** The envelope model (§2.4) matters to the host more than to
the GTO: quote, host agreement and handbook in one action, with a clear statement
of what they are committing to beyond price — guaranteed hours, notice period,
termination, WHS obligations, supervision ratio.

### P3. Apprentices — currently present in two steps out of twenty-five

Apprentice completion rate is the GTO's regulated performance measure under the
National Standards. Every friction point below is a completion-rate risk, which
makes this the commercially serious lens rather than the soft one.

**P3.1 — Pay certainty is the whole relationship.** Late or incorrect pay is the
top driver of apprentice disengagement. This is the argument for keeping
`pending_gto_review` mandatory (§8.2) and for the exception-queue model rather
than host-triggered auto-processing.

**P3.2 — Timesheet friction is a pay problem, not a UX problem.** If submission is
hard they don't submit, then they aren't paid, then they disengage. Pre-fill from
placement ordinary hours + carry-forward from last period + one-tap standard week
is a completion-rate intervention, not a convenience feature.

**P3.3 — Design for the actual population.** Many apprentices are 16–18, some with
low literacy, often on prepaid mobile with patchy data. SMS over email for
deadlines. Plain language: "your timesheet is due tomorrow at 12" — not
"timesheet submission deadline". No jargon, no acronyms, no unexplained state
names from the seven-state machine.

**P3.4 — Host adjustment notification must be mandatory.** The adjustment feature
is tenant-toggleable per operator spec, which is correct. The *notification* to
the apprentice when their hours are changed must not be — it is their pay and a
record-keeping obligation.

**P3.5 — Surface the field officer.** The FO is the GTO's entire value proposition
to the apprentice. Put "your field officer is X, call or text here" prominently in
`worker-portal`, and provide a low-friction "something is wrong at my host"
channel that does **not** route through the host. Without it, a safety or bullying
issue reaches the GTO through the host, or not at all.

**P3.6 — Document privacy boundary.** `handover-to-employment` copies TFN
declarations, bank details and identity documents into the GTO DocumentHub.
Timesheet visibility for host supervisors is correctly scoped via `engagements`;
verify that `document_metadata` visibility has equivalent scoping. A host
supervisor should see competency evidence and ticket currency and nothing else.
This needs an RLS policy audit, not a UI filter.

**P3.7 — Anti-discrimination guardrail.** `age_band`, `completed_year_12` and
`school_based` on `labour_requirements` exist because they are wage-determining
award variables. They must never appear in a Conduit candidate query or a
shortlisting filter. Enforce with a lint rule, not a convention.

### P4. Cross-cutting

**P4.1 — One calculation, three renderings.** The GTO needs margin and oncost
composition. The host needs charge rate, inclusions and the forward schedule. The
apprentice needs their wage and when it changes. Today it is one document with one
number. `charge_rate_snapshots` already stores the full calc profile — build three
views over it rather than three documents.

**P4.2 — The notification model is one-directional and needs to be two.** Every
notification in the system runs system → user. All three parties need to push an
exception back into the flow: host disputes hours, apprentice reports a missing
allowance, field officer flags a placement for review. There is no dispute or
exception object anywhere in the schema. Without one, every disagreement leaves
the system and becomes a phone call — which means it leaves the audit trail too,
and that is a compliance problem as much as a service problem.

```
exceptions
  id, tenant_id,
  subject_type ∈ {timesheet, invoice, payslip, placement, quote, rate_card},
  subject_id uuid,
  raised_by_user_id, raised_by_role ∈ {apprentice, host, field_officer, gto_staff},
  category, description,
  status ∈ {open, acknowledged, resolved, rejected},
  assigned_to_user_id, resolution_note, resolved_at,
  created_at, updated_at
```

Reuses the existing `app_notifications` fan-out for routing. Everything the three
portals need is a filtered view over this one table.

**Phase 1 — legal correctness (do first, independent of everything else)**
1. `payroll_records`: fix SG default to 0.12, add `qualifying_earnings`, add the
   20-business-day first-contribution exception to `set_payroll_super_due_date()`.
2. Casual-prohibition CHECK constraint.
3. Rename the enterprise-agreement rate source to host-referenced; add the
   mandatory applicable-instrument field.

**Phase 2 — the spine**
4. `labour_requirements` + version chain.
5. `charge_rate_quote_lines`; `quote_number`, `valid_until`, `gst_treatment`.
6. `quote_stage` + `placement_id` + `supersedes_id` on `charge_rate_quotes`;
   stage-guard the propagation trigger; build §3.1a agreement generation.
7. Resolve `clients` vs `employers`.
8. Lead → requirement → quote navigation.

**Phase 3 — gates**
9. Placement blocked on host `assessment_passed` + assessment currency + PL
   insurance + signed agreement.
10. SJSP: regulated-host flag, protected-rate resolver, quote and pay blocks.
11. `quote_envelopes` bundle + `document_templates` / merge fields (§2.4a),
    rendered via the existing `generate-document` edge function.

**Phase 4 — cycle**
12. `pay_cycles`, `pay_cycle_assignments`, `notification_schedules`.
13. Timesheet generation, pre-fill, carry-forward, allowance picker.
14. Host-entered vs host-adjusted audit split; LWOP exception model.
15. GTO batch exception review.

**Phase 5 — engagement stage**
16. Employment contract, training contract, RTO enrolment, inductions.

**Phase 6 — change events**
17. Progression scheduler with three notification lanes.
18. Requote-on-rise: automatic trigger + host and apprentice notification.
19. Debtor ageing and reminders.

**Phase 7 — perspective fixes**

Sequenced by leverage per unit of work, not by phase order. P2.1 and P2.3 are the
cheapest high-value items in this whole document and should be pulled forward into
Phase 2 alongside the quote lines.

| # | Item | Ref | Cost | Leverage |
|---|---|---|---|---|
| 20 | Inclusions/exclusions on quote + signing page | P2.1 | low | high — removes the top billing-dispute cause |
| 21 | "What the GTO carries" value line | P2.3 | low | high — reframes every price objection |
| 22 | Role-scope the quote wizard | P1.1 | low | high — the form is currently unusable by its main user |
| 23 | Anti-discrimination lint rule | P3.7 | low | high — cheap now, expensive as a finding later |
| 24 | Mandatory host-adjustment notification | P3.4 | low | high — record-keeping obligation |
| 25 | Field officer surfaced in worker portal + escalation channel | P3.5 | med | high — completion-rate lever |
| 26 | `exceptions` table + three portal views | P4.2 | med | high — closes the audit trail |
| 27 | Mobile timesheet approval rebuild | P2.4 | high | high — gates the whole pay cycle |
| 28 | Timesheet pre-fill, carry-forward, one-tap week | P3.2 | med | high — completion-rate lever |
| 29 | Fast-quote path | P1.2 | med | med — sales velocity |
| 30 | Margin floor + discount authority | P1.3 | low | med — margin protection |
| 31 | Field officer in pre-sale loop; task handover on acceptance | P1.4, P1.5 | low | med |
| 32 | Document visibility RLS audit | P3.6 | low | med — privacy correctness |
| 33 | Three renderings over one calculation | P4.1 | med | med — consolidates 20, 21 and the apprentice view |
| 34 | SMS channel + plain-language message set | P3.3 | med | med |

---

## Open decisions for the operator

1. `clients` or `employers` as host of record — pick one.
2. Does an accepted quote bind the host for a fixed term, or is the rate card
   revisable on any award movement without re-acceptance? This changes whether
   requote-on-rise sends or merely drafts.
3. Progression notice lead time default (one month proposed) and whether host
   re-acceptance is required or notice-only.
4. **Host guaranteed-hours position** — does the host agreement guarantee the
   apprentice's ordinary hours, making "no work available" a chargeable event?
   The whole LWOP model in 7.4 depends on this clause. Highest-impact open item.
5. Quote validity default (30 days proposed).
6. Whether the GTO holds its own enterprise agreement — determines whether
   `ea_role = applicable_instrument` is ever used, or only `mirrored_reference`.
7. Default inclusions/exclusions per tenant (P2.1): is training time charged? RDO?
   Adverse weather? These currently default to `false` in
   `DEFAULT_BILLABLE_OPTIONS` and the host cannot see them. Set the tenant policy
   before exposing them, or the first quote after the change reads as a price rise.
8. Margin floor value and which role holds override authority (P1.3).
9. SMS provider and cost model for apprentice notifications (P3.3) — email-only
   is a known completion-rate compromise.

---

## Verification standard

Per §9 of the agent directive, no item above may be marked BUILT in a future pass
without: diff hash, CI green, Vercel READY, and a smoke artefact. Items marked
"verify" in this document (payslip generation, timesheet→invoice trigger) are
explicitly unconfirmed and must not be assumed.
