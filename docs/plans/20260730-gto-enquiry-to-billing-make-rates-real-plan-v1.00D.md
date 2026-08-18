> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

<!--
RECOVERED FROM A CLAUDE CODE SESSION TRANSCRIPT, 2026-08-17.

This plan was produced in plan mode on 2026-07-30 and approved, but it only ever
existed inside `~/.claude/projects/-home-braden-Desktop-Dev-bsuite/1853f94c-…jsonl`
— a session transcript. It was never written to `docs/`, so no later agent could
read it, and the estate register that claims to have read every non-archive document under
`docs/` could not have seen it either.

2 iterations of this plan exist in that transcript; this is the FINAL one.
The earlier drafts are superseded and are not reproduced.

Recovered verbatim. Its measurements are from 2026-07-30 and several have moved
since — treat every number here as of that date, not as current.
-->

# GTO enquiry-to-billing: make rates real, then walk the chain

**Status:** Draft for approval · **Date:** 2026-07-30
**References:** `docs/references/20260730-gto-enquiry-to-billing-process-flow-v1.00D.md`,
`docs/references/20260730-gto-process-flow-v1.0.svg`

---

## Context

The process-flow spec is thorough and its ownership ruling is right. But it designs Stage 2
— the two-stage quote, the matrix of `charge_rate_quote_lines`, the BOOT gate, requote-on-rise
— **on top of a rate substrate that is empty**. Measured live on `tuybltdrdefjblnplpqo`,
2026-07-30:

| Table | Rows |
|---|---|
| `awards` | 7 |
| **`award_classifications`** | **0** ← what crm7's charge path reads |
| `award_rates` | 0 — cannot exist; FKs to classifications |
| `award_rate_cache` | 0 — deleted (crm7#1109), recreated today |
| `award_templates` | written by `sync-award-rates`; a third mirror |
| `charge_calculations` | 0 — no derived calc ever persisted |
| `apprentice_rate_configs` | **99 — populated, and an overlay not a rate source** |

**21 of 29 placements across all tenants carry a charge rate. Not one is award-resolved.** In
`bsuite Platform` specifically, all 12 real placements have `award_rate_id IS NULL` and
`award_rate_resolution_status='unresolved'`, with `award_code` and `classification` held as free
text that has never been resolved against a structured row. Every one of those numbers was typed
or seeded.

**Nothing has ever billed.** `invoices` = 3, all `status='draft'`, `sent_at` null,
`xero_invoice_id` null, `amount_paid` 0.00; `payments` = 0; all 50 `xero_audit_log` rows are OAuth
plumbing. So the urgency is not "wrong money is flowing" — it is **the pipeline has never
conducted, and twelve placements would bill at an unresolved rate the day invoicing turns on.**
That is the operator's own framing and it is the stronger argument.

This is "none of the rates are in force", located precisely. It has been documented since
**2026-04-22** — `crm7/supabase/migrations/CLAUDE.md` records the same twelve placements — and
has not moved in three months.

The spec does not know this. §9.1 says requote-on-rise *"fires on an `award_rates` row change"*;
that table has zero rows, so the trigger can never fire. **crm7's quote/charge/requote path cannot
resolve a rate at all, and building more of Stage 2 on it adds sophistication above a hole.**
(R80.3's path is a different story — see the governing constraint below.)

Intended outcome: a rate that is *derived and defensible* reaches a placement, an invoice line
traces to a signed document, and the chain runs once end to end in the operator's own account.
Then build the quote matrix the spec describes.

### This plan is an AMENDMENT to the spec's own sequence, not a rival to it

The spec already carries an implementation plan — its Phases 1–7, items 1–34, ordered
"legal correctness first, then the spine, then gates, then cycle". **That sequence is adopted
as-is.** Publishing a second competing sequence would be the same duplicate-source-of-truth
error this document is about.

This plan changes it in exactly four ways:

| # | Amendment | Why |
|---|---|---|
| **A** | Insert a **Phase 0** before the spec's Phase 1: point the charge path at a Fair Work integration that works, and give the BOOT gate a way to fail | The spec's Phase 2 items 5–6 and its §9.1 requote trigger all read a rate substrate that is **empty and has no writer**. Nothing in its Phase 2 can produce a real number until this is fixed. |
| **B** | Insert an **end-to-end walk — run first**, before the spec's Phase 2, covering both the bill side and the pay side | The spec has no step that proves the chain conducts. Every defect found this week was surfaced by execution, never by planning. |
| **C** | Add `hiring_divisions.super_guarantee_rate` to the spec's Phase 1 item 1 | The spec's L1 caught `payroll_records` at `0.115` but missed this second column, also stale at 11.5%. |
| **D** | Run the spec's Phase 1 (L1/L4) and two of its Phase 2 items **concurrently** with the walk, not after | They have no rate dependency. The spec itself orders L1 *"do first, independent of everything else"*. |

Everything else in the spec's 34 items stands unchanged, including its judgement that P2.1 and
P2.3 (items 20, 21) should be pulled forward into its Phase 2.

---

## The governing constraint — corrected by code trace

My first reading of this was "two rate paths, pick the canonical one". A trace of every
`wageSource.kind` through to the table or API it actually hits shows that framing was wrong, and
the real shape is worse but more fixable.

**There are three separate Fair Work integrations, and the charge-rate form is wired to the only
one that cannot work.**

| Integration | Reaches the live FWC API? | Consumed by |
|---|---|---|
| `fairwork-enhanced` edge fn (BSU) — live API → `award_rate_cache` → hardcoded fallback | **yes** | crm7 `/payroll/award-rates`, `AwardSelector`, `EnhancedAwardSelector` |
| `auth-fairwork` edge fn (R80.3) — own cache path | **yes** | `R80.3/src/services/fairworkApi.ts` |
| **`crm7WageDataAccess.fromFairWork()`** — direct table read, **no API fallback at all** | **no** | **the charge-rate create/edit form** |

`fromFairWork()` (`crm7/src/services/chargeCalcSourceAdapters.ts:184-201`) queries `awards` then
`award_classifications` directly. On a miss it returns `null`, and `WageResolver`
(`packages/charge-calc/src/resolvers/wage.ts:122-126`) throws
`no rate for {award}/{classification}`. `award_classifications` has **zero rows and no writer
anywhere in the codebase** — not a sync that broke, a table nothing was ever built to populate.
So the charge-rate form's award path has never returned a number, while two working live-API
integrations sit beside it.

**`apprentice_rate_configs` is not the alternative substrate I called it.** Its `wage_percentage`
is a multiplier applied to a `lowestAdultClassificationRate` that must come from somewhere else
(`R80.3/src/services/awardRulesEngine.ts:773-817`, and the raw FWC rate is kept as a legal floor).
It is a **percentage layer**, structurally incapable of answering "what is the rate" alone. Its 99
rows are live in R80.3 and not referenced by crm7's charge path at all.

Also true, and materially worse than "the gate passes vacuously": **the BOOT gate has no live path
that can fail.** `crm7/src/pages/charge-rates/create/index.tsx:433-446` (mirrored in
`[id]/edit.tsx:449-460`) never calls `validateBootCompliance()` — it unconditionally sets
`createPendingResult()`, a factory hardcoded to `verdict:'marginal'`, `blocksApproval:false`.
The batch path does call the validator, but nothing in `crm7/src` ever populates
`BatchWorkerInput.bootComparisonInputs`, so it always takes the `BOOT_INPUTS_MISSING` branch and
stays `indeterminate`. `compareBOOT()` is never reached with real data from either entry point.
Empty award tables are a contributing cause; the proximate cause is that the UI never assembles
the comparison payload.

**And there are four base-rate mirror families, not two.** Beyond `award_classifications`/
`award_rates` (0 rows) and `award_rate_cache` (0 rows, recreated today), `award_templates` is
written by the `sync-award-rates` edge function alongside the cache. Any ruling that names a
canonical mirror has to account for all three, not pick between two.

**A defensible rate can already resolve — just not in crm7.** R80.3's `fairworkApi.ts` +
`awardRulesEngine.ts` + the **deployed and ACTIVE** `auth-fairwork` edge function (proxying
`api.fwc.gov.au/api/v1`, key present in `.env.local` and as a live `api_keys` row) can compute
a live FWC base rate × `apprentice_rate_configs` percentage with API provenance today, with no
seeding and no ruling. What is blocked is **crm7's quote/charge/requote path specifically**, not
the platform. No successful business call is on record, so this is machinery-deployed, not
runtime-proven.

**Corrections to record:** the "two rate paths / rule which is canonical" framing in the first
draft of this plan was a false dichotomy — `apprentice_rate_configs` is an overlay that survives
every answer, and the real question is which table mirrors the live API. The earlier
characterisation of the BOOT gate as "vacuous pass from empty tables" understated it. And
"everything downstream of resolve-a-rate is blocked" was overbroad — it is true of crm7 only.

---

## Amendment A — new Phase 0: give the charge path a working rate source

*Inserts before the spec's Phase 1. **Mostly engineering, one operator ruling.***

The trace above collapses most of what I first posed as an operator decision. The charge-rate
form does not need a new rate substrate — it needs to stop being the one caller that bypasses the
integrations that already work.

**A.1 — Repoint `fromFairWork()` at `fairwork-enhanced`.** Replace the direct
`awards`/`award_classifications` read in `chargeCalcSourceAdapters.ts` with a call through
`crm7/src/services/fairworkEnhancedService.ts`, which already fronts the edge function's
live-API → cache → hardcoded-table chain. This is the single change that makes link 3 of the walk
below capable of returning a number. It also inherits provenance for free — the edge function
knows the award, clause and operative date; the direct table read never did.

**A.2 — Layer `apprentice_rate_configs` on top, don't substitute it for the base.** Port the
`configRate = lowestAdultClassificationRate × wage_percentage`, floored at the raw FWC
classification rate, that `R80.3/src/services/awardRulesEngine.ts:773-817` already implements.
Move that resolution into `@bsuite/charge-calc` so crm7 and R80.3 share one implementation rather
than crm7 growing a second copy — a fourth Fair Work integration is the failure mode to avoid
here.

**A.3 — Make the BOOT gate able to fail.** Assemble a real `AwardSchedule[]`/`EATerms` payload in
`create/index.tsx` and pass it to `validateBootCompliance()` instead of `createPendingResult()`;
populate `bootComparisonInputs` on the batch path. Until `compareBOOT()` is reachable with real
data, a `fail` verdict cannot occur and the gate is decoration. Same defect class as bsuite#1693.

**A.4 — OPERATOR RULING, and it blocks nothing.** The live FWC API is the base-rate origin either
way. The question is: **which single table is its persisted mirror**, so that triggers, provenance
and offline resolution work — and the other two mirrors retire. The candidates are
`award_rates`/`award_classifications`, `award_rate_cache`, and `award_templates`.
`apprentice_rate_configs` survives every answer as the percentage overlay and is not in contention.

This matters because a pure live-API source **cannot fire a Postgres trigger**, so the spec's §9.1
requote-on-rise needs a persisted mirror to watch. Choosing none is a real option only if requote
moves to a scheduled diff instead of a trigger.

**Nothing waits on this.** A.1–A.3 and the walk below run on the reversible default — live FWC base
× percentage overlay, provenance recorded, **zero writes to any mirror table** — so the ruling stays
open and costs nothing. The walk's output is then attached to the ruling request as evidence. An
earlier draft of this plan made Phase 0 a hard gate; that was a stall that bought no risk reduction,
because the divergence risk it guarded against is triggered only by *seeding* a mirror.

---

## Amendment B — the end-to-end walk, run FIRST

Goal: **one** apprentice, in the operator's account, with a rate that is derived rather than
typed, carried to an invoice line **and** to a pay run. Not a feature — a proof that the chain
conducts.

**It runs first, not as a late gate.** It writes almost nothing beyond the seed in link 2, resolves
on the reversible default (live FWC × overlay, zero mirror-table writes), and its output is both
the queue for the spec's Phase 3 *and* the evidence attached to the A.4 ruling request. Holding it
behind either A.4 or the spec's Phase 2 inverts the dependency: the run is the information those
decisions need.

Subject: **`bsuite Platform`**, apprentice **Ryan O'Connor** (`023086db-…`) at **BuildRight
Construction** (VIC), placement `ac0c15c6-…`. Chosen on measured completeness: the only one of the
16 whose `qualification_code` (`CPC30220`) resolves against the tenant's own `qualifications`
table, `status=active`, and a placement with `employer_id`, `client_id`, `award_code`,
`classification`, `hourly_rate` and `charge_rate` all populated and no prior timesheet/quote
clutter. Both tenants are owned by `braden.lang77@gmail.com`, so this satisfies "in my account".

**The two tenants have mirror-image gaps, and neither can pass link 2 as it stands.**

| | `bsuite Platform` | Braden Group |
|---|---|---|
| `apprentices` rows | 16 | **0** |
| `people` typed apprentice, with DOB | 0/16 | **8/8** |
| `current_host_employer_id` | 0/16 | 7/8 |
| apprentice placements | 12 fully FK'd | **0** |

bsuite Platform has the records and no wage-determining facts; Braden Group has the facts and no
apprentice records. **DOB, `year_level`, `trade`, `apprenticeship_type` and `address` are empty on
all 16** bsuite Platform apprentices — so `apprentice_type` (junior_yr10 / junior_yr12 / adult /
sba_sbt) and `year_of_trade`, the two keys `apprentice_rate_configs` is indexed on, cannot be
derived. `is_school_based=false` is known for all 16, which rules out `sba_sbt` and nothing else.

**Decision #2 — ANSWERED by the operator, 2026-07-30.** The walk may create apprentices, rates and
whatever else it needs in `braden.lang77@gmail.com`'s tenants. Two conditions attach:

**Prefer the existing apprentices and hosts** (the operator's standing instruction) — Ryan O'Connor
and BuildRight already exist, so what gets *created* is the missing facts on him plus the rate,
quote, agreement, engagement, timesheet, invoice and pay run the chain needs. Create a new
apprentice only if an existing one cannot carry the chain.

1. **Every created record goes on a cleanup ledger** and is removed when the walk is done —
   `docs/validation/20260730-gto-e2e-walk-cleanup-ledger.md`, one row per record with table, id,
   tenant and created-at. Anything not on the ledger is not cleaned up, so the ledger is written
   **as records are created**, never reconstructed afterwards. This is also why link 2's seeded
   facts must be labelled: the ledger and the "seeded vs found" note are the same discipline.
2. **The run must be visual, as a GTO user would do it, end to end.** Not SQL. Every link is
   exercised **through the UI in a real browser** on `d.crm.crm7.app` / `d.r8.crm7.app`, signed in
   through the actual BS OAuth flow with the operator's dev account (credentials supplied
   in-session — **not written to this file, the repo, or memory**). SQL is for *verifying* what the
   UI did, never for substituting for it. A link that only passes when driven by SQL has failed.

**Send-to address for anything the flow emails** (quote for signature, placement agreement,
invoice, payslip): **`braden@braden.com.au`** — the operator's company address, deliberately
different from the signed-in account so the recipient path is genuinely exercised rather than
short-circuited by same-user delivery.

**Tooling:** Playwright (already in the BSuite stack). Screenshot every link at desktop 1440
minimum, per §9.2. Console must be clean; capture the network calls. A screenshot of a spinner, an
empty state, or a toast that says "saved" is not evidence the row was written — pair each with the
verifying query.

Signed-in on `d.crm.crm7.app` / `d.r8.crm7.app`.

| # | Link | Passes when | Known risk |
|---|---|---|---|
| 1 | Sign in (BS OAuth) | session bridged; RLS reads succeed, not anon | callback must `setSession` |
| 2 | Apprentice has wage-determining facts | DOB, year of trade, state present | **fails today for all 16** — seed step, see above |
| 2b | **Training contract anchors year level** | lodged contract; its commencement date drives year of trade | `training_contracts` **exists live** and conduit's `r7-lodge-training-contract` is deployed — **unwired, not absent**. Wire, don't rebuild. |
| 3a | **Probe `auth-fairwork`** | one successful live FWC call, logged | deployed + keyed, **no successful business call on record** |
| 3b | **Rate resolves** | engine returns a rate **with provenance** | crm7's path is the break; R80.3's may already work |
| 4 | Charge derived | `charge_calculations` row persists; WA apprentice payroll tax = 0 | exemption guard must beat the resolver |
| 5 | Placement carries it | `placements.charge_rate` = derived value; status ≠ `unresolved` | 21 rows currently fail this |
| 5b | **Placement agreement signed** | placement-agreement-stage quote approved **and signed** | signing flow is BUILT; 12 quotes + 12 snapshots live. Link 8 cannot trace to an agreement that was never created. |
| 5c | **Engagement exists** | an `engagements` row for this placement | **`engagements` = 0 live**, and `invoices.engagement_id` + §7.1 host-supervisor visibility both route through it. Prerequisite nothing else creates. |
| 6 | Timesheet | entered against that placement | |
| 7 | **Interpreted** | ordinary/OT/penalty split | `penaltyCalculator.ts` has **zero importers** |
| 8 | Invoice line | hours × rate, traceable to the signed agreement | **`host_agreements` = 0 rows** across all 11 hosts; all `compliance_status='pending'` |
| 9 | Xero | a **non-OAuth** row appears in `xero_audit_log` | 50 rows today, all OAuth — zero business calls ever |
| 10 | Payment | `payments` row | `payments` = 0 globally |
| **P1** | **Pay run** | apprentice paid for the same timesheet | the chain above is money-**in** only |
| **P2** | **`payroll_records` + super** | SG at 12% from qualifying earnings; due date set | this is the only link that exercises the L1 fixes |
| **P3** | **Payslip** | issued | |

Links P1–P3 are the pay side. The GTO's wage obligation to the apprentice exists whether or not the
host pays, and the spec's Stage 8 is "pay **and** bill" — an E2E that stops at the invoice never
exercises the plan's own super findings.

**Each broken link is recorded and ranked; the run's output is the queue for the spec's Phase 3.**
No fix mid-run except where it blocks the next link — the point is to find where it stops, not to
stop finding.

---

## Reuse notes for the spec's Phase 2 (not a re-plan of it)

The spec's items 5–6 (quote lines, quote stages), 7 (`labour_requirements`) and its §2.3 gates
stand as written. What the spec does not say, and an implementer needs:

**Reuse, do not rebuild:** `@bsuite/charge-calc` (BOOT gate, billing models, payroll-tax
exemption); `charge_rate_snapshots` + `chargeRateSnapshotService` (already persists a full
recomputable calc-input profile); the signing flow at `crm7/src/pages/quotes/sign/[token].tsx`
(BUILT, token-authoritative, applies unchanged to both stages); `generate-document` (extend with
a template + field map rather than adding a renderer).

**Reject:** any quote entity in R80.3. R8 owns modelling (`saved_calculations`, `ComparativeView`,
`BetterOffOverallTest`, `MarginDashboard`), never quote persistence. Deep-link CRM7 → R8
read-only; never the reverse.

---

## Parallel track — work that does NOT depend on the rate substrate

Seven items have no dependency on which mirror wins or on the walk. They run concurrently from day
one. Serialising them behind the walk costs calendar time and buys nothing.

**Lane 1 — spec-mandated, no rate dependency.** The spec's own build order says its Phase 1 is
*"legal correctness — do first, independent of everything else"*:

| Item | Spec | Note |
|---|---|---|
| **SG batch** — `payroll_records` 0.115→0.12, **`hiring_divisions` 11.50→12.00**, `qualifying_earnings`, 20-business-day first-contribution exception | L1 | An earlier draft ranked these "by whether the walk hits them" and so deferred `hiring_divisions` indefinitely — the walk never touches it. Baseline for the output-equivalence check exists today (`pay_runs` = 2). |
| **Casual prohibition as a CHECK constraint** | L4 | Pure schema |
| **`labour_requirements`** | §1.4 | New entity, no rate dependency |
| **`quote_stage` / `placement_id` / `supersedes_id` columns** | §2, §3.1a | Additive migration. Only the §3.1a *recompute* needs the rate substrate. |

**Lane 2 — zero new data.** All three values already exist in the calc result and are simply not
rendered.

| Item | Spec | Why it is independent | Value |
|---|---|---|---|
| **Quote inclusions/exclusions block** | P2.1 | `DEFAULT_BILLABLE_OPTIONS` already carries `includeAnnualLeave`, `includePublicHolidays`, `includeSickLeave`, `includeTrainingTime`, `includeAdverseWeather` — all defaulting `false`. The host is quoted a rate whose meaning depends on five booleans they cannot see. | Spec calls it *"the single most common source of month-three billing disputes and it is free to fix"* |
| **"What the GTO carries" summary** | P2.3 | Oncost breakdown already exists in the calc result; only needs rendering | Converts a price objection into the value proposition |
| **Fast-quote path** | P1.2 | Thin surface over the existing `isTemplate` / `templateName` | The sales motion is a live phone call; the current 4-tab wizard cannot produce an indicative rate inside one |

Caveat on the first: spec open decision #7 warns that inclusions currently default to `false` and
the host cannot see them — **set the tenant policy before exposing them**, or the first quote
after the change reads as a price rise. That is an operator decision, not a code one.

---

## Amendment C — correctness items, and one dependency the walk inherits

**Amendment C proper — add to the spec's Phase 1 item 1:**

| Finding | Evidence |
|---|---|
| `payroll_records.super_guarantee_rate` default `0.115` (numeric(5,4)) | SG is 12% — spec L1 caught this |
| **`hiring_divisions.super_guarantee_rate` default `11.50`** (numeric(5,2)) | **also stale at 11.5%**, and **not in the spec**. Fix both in the L1 batch. |
| `qualifying_earnings` absent everywhere | confirms L1 — SG must compute from QE, not OTE |

On the two super columns: an earlier draft of this plan claimed "anything reading both is wrong by
two orders of magnitude". **That was overstated and is withdrawn** — the readers are disjoint.
`hiring_divisions.super_guarantee_rate` is read only by the settings CRUD surface
(`crm7/src/pages/settings/hiring-divisions.tsx`, rendered as "11.50%" — percent-scale by design)
and `adminParityService.ts`; payroll math reads `payroll_records`; `@bsuite/charge-calc`
`defaults.ts` already carries the correct `superRate: 0.12` as a fraction. The real finding is that
**both defaults are stale**, and the inconsistent scale convention is a latent trap for the first
reader that joins them — worth a comment on both columns, not alarm.

**NEW — cross-tenant FK leak in `charge_rate_quotes` (not previously tracked).** Four quote rows
exist across the two tenants. **Three are tagged `tenant_id = bsuite Platform` but their
`host_org_id` and `worker_id` resolve to an employer and a person owned by Braden Group.** Zero
quotes reference any of bsuite Platform's own 16 apprentices, 11 employers or 13 placements. Either
a picker is not tenant-scoped or RLS does not constrain the FK targets on insert. This is a
tenant-isolation defect in the exact table the spec's Stage 2 is about to build on top of, and it
must be diagnosed **before** `charge_rate_quote_lines` adds children to those rows. File it.

**Also measured, and load-bearing for the spec's §2.3 gates:** `host_agreements` = **0 rows** for
all 11 bsuite Platform hosts and `compliance_status = 'pending'` on all 11; `host_contracts`,
`apprentice_placements` and `host_charge_rates` are empty in both tenants; `clients.state` is NULL
on all 13 rows (state lives only on `employers.state`, so any read of `clients.state` yields
nothing); `qualifications` is **tenant-scoped, not a national catalogue** — 14 of the 16 apprentice
qualification codes are valid AU training-package codes with no row in this tenant, which is a
one-time catalogue seed, not 14 per-apprentice edits.

**Dependency A.1 inherits — must be resolved with it, not after.** `fairwork-enhanced` falls back
to `award_rate_cache` between the live API and its hardcoded tables. That table was deleted
(crm7#1109) and **recreated today** by `20260730230700_recreate_award_rate_cache.sql`, whose own
header records that R80.3's client-side cache writers will hit `42501` under the
service-role-write-only policy and fail silently — so the cache never populates from the client.
Practically: A.1 works because the edge function reaches the live FWC API, but its middle cache
tier is inert until a server-side writer exists. Track with **R80.3#386**; do not let A.1 be
declared done on a green typecheck while the cache tier is still a no-op.

**Already tracked:** crm7#1295 (two independent ABA generators; payroll export belongs in crm7,
not R8), crm7#1290 (`/claims/new.tsx` writes a non-existent `person_id`), crm7#1288 (28 phantom
tables with no live caller), parity-matrix P0 (`penaltyCalculator.ts` built with zero importers —
**sits on the walk's link 7**).

**Deferred by vendor gate, not by us:** SEEK and Indeed need partner approval; LinkedIn's
programme is closed. Recorded in `bsuite_pending_actions_jobboards_20260730`.

**Explicitly deferred, with the reason — not dropped.** An earlier draft omitted these silently,
which reads three sessions later as "considered and out of scope" rather than "not looked at":

| Item | Why deferred | Revisit when |
|---|---|---|
| **L2 — Skills, Jobs and Sustainable Pathways** | Apprentices and trainees are excluded from regulated labour-hire arrangement orders, and there is no live labour-hire book | before any `labour_hire_*` placement is created |
| **P2.1 / P2.3** (inclusions block, "what the GTO carries") | Not deferred — they are in Lane 2 above. The spec instructs they be pulled forward into the quote-lines work; that instruction stands. | — |

**Two spec open decisions that belong on the operator list and were missing:** #1 `clients` vs
`employers` — it decides *which entity gets invoiced*, so it gates link 8 directly, and the spec
warns to pick one "before more code accretes on both"; and #7 inclusions/exclusions defaults —
`charge_rate_quote_lines` must not expose lines before tenant policy is set or the first quote after
the change reads as a price rise. Both added below.

---

## Order of work

Two lanes, concurrent. **Nothing is blocked** — decision #2 is answered (see below). A.4 blocks
nothing. Lane B blocks on nothing.

**Lane A (the chain):** A.1 repoint → **RT-1** → A.3 BOOT gate can fail → **RT-2** → seed link 2
(ledger open) → walk links 1→P3 in the browser, screenshotting each → **RT-3** → rank the breaks →
they become the queue for the spec's Phase 3 → attach the run to the A.4 ruling request → **clean
up** → **RT-4**.

**Lane B (independent):** L1 SG batch → **RT-5** → L4 CHECK → `labour_requirements` →
`quote_stage` columns → P2.1 / P2.3 / fast-quote.

**Then, gated on A.4:** retire the two losing mirrors, repoint `requoteOnRiseService`, and build
the spec's Phase 2 quote matrix on a substrate that resolves — **RT-6** before quote lines land.

**File before anything else** (they are defects, not work items): the cross-tenant
`charge_rate_quotes` leak, and the FutureBuild placements carrying charge rates in a tenant with
zero apprentices.

---

## Red-team steps

This plan was itself red-teamed before approval (verdict: *needs these changes*; five landed, and
they are folded in above — the false-dichotomy Phase 0, the serialised parallel work, the missing
engagement/agreement/pay links, and two overstated evidence claims). **The same discipline applies
to the work, not just the plan.** Every gate below is a distinct pass by a fresh reviewer that did
not do the work, briefed to refute rather than confirm.

| # | Gate | Fires when | What the reviewer is asked to refute |
|---|---|---|---|
| **RT-1** | **Rate-resolution correctness** | before A.1 merges | "This rate is defensible against the award clause on challenge." Reviewer checks instrument, clause, classification and operative date against the FWC source — not against our own cache. **Escalate to fable**: a wrong apprentice rate is a wage-underpayment exposure, and the operator is a lawyer who will be asked to defend it. |
| **RT-2** | **The gate can actually fail** | before A.3 merges | "The BOOT gate blocks a bad rate." Reviewer must *construct* an under-award input and see it blocked. A gate that has never returned `fail` is decoration — this is the bsuite#1693 class and it has now recurred twice. |
| **RT-3** | **Walk evidence is real** | after the walk, before any link is marked passed | "This screenshot proves this link passed." Reviewer re-runs the verifying query independently and checks the screenshot shows the *committed* state, not an optimistic UI. Also checks the seeded-vs-found labelling is honest. |
| **RT-4** | **Cleanup is complete** | after cleanup | "Every record the walk created is gone." Reviewer works from the live catalog **outward**, not from the ledger inward — the failure mode is a record that was never written to the ledger, which reading the ledger cannot detect. |
| **RT-5** | **Money math** | before the L1 SG batch merges | "The super figures are right after this change." Output-equivalence on the two existing `pay_runs`, delta explained line by line. **Escalate to fable.** |
| **RT-6** | **Tenant isolation** | before `charge_rate_quote_lines` adds children | "Quotes cannot reference another tenant's entities." Given the cross-tenant leak found above, the reviewer's job is to reproduce it, then confirm the fix closes it — including on the FK targets, not just the `tenant_id` column. |

Two standing rules for every gate: a reviewer who did the work cannot review it, and **a refuted
finding changes the work** — it is not answered with an explanation.

---

## Verification

No item marked BUILT without evidence.

- **A.1:** the charge-rate form returns a rate for an award/classification with **zero rows in
  `award_classifications`** — that is the proof it no longer reads the dead table. Not a green
  typecheck.
- **A.3:** a deliberately under-award input produces `overallVerdict: 'fail'` and blocks the save.
  A gate that has never returned `fail` has not been shown to work.
- **A.4:** a written ruling in the repo; if "retire", `award_rates`/`award_classifications` readers
  enumerated and repointed in the same PR.
- **The walk:** per link, **a browser screenshot AND the verifying query** — the screenshot proves a
  GTO user can get there, the query proves the row committed. Neither alone is sufficient. Link 2
  must state explicitly which facts were **seeded** vs found. Link 3b must show a rate with
  provenance (instrument + clause + classification + effective date), not just a number. Link 9
  must show a **new non-OAuth** `xero_audit_log` row — there has never been one. Anything the flow
  emails must be confirmed **received at `braden@braden.com.au`**, not merely "sent".
- **Cleanup:** the ledger reconciled against the live catalog, and RT-4 run outward from the
  catalog. The walk is not done when the chain conducts — it is done when the tenants are back to
  the state they started in, minus the defects it found.
- **Any migration:** `pnpm typecheck` + `pnpm lint` (crm7 ratchet baseline 0) + pgTAP
  baseline-replay green. Replayed against live inside `BEGIN … ROLLBACK` with the rollback proven —
  **never `apply_migration`**. FK-index gate clean on PR delta.
- **Super fix:** output-equivalence — the same pay run computed before and after, delta explained.
  A silent super-rate change is a wrong-money event in the other direction.
- **Regression tripwire:** a test asserting `award_rate_resolution_status` is never `unresolved`
  on a placement carrying a `charge_rate`. That one assertion would have caught this three months
  ago. **Widen it while writing it** to also assert the placement's person exists and is in the
  same tenant — FutureBuild Academy has **8 placements all carrying charge rates in a tenant with
  zero apprentices**, which the narrow assertion would not catch. The same widening covers the
  cross-tenant `charge_rate_quotes` leak above.

---

## Open decisions for the operator

1. **A.4 — retire or keep `award_rates`/`award_classifications`** once A.1 repoints the charge
   path. Keeping them means a second populated rate source to reconcile against the API; retiring
   them means rewriting the spec's §9.1 requote trigger to watch the cache instead. *Blocking for
   the retirement step only — A.1–A.3 proceed regardless.*
2. ~~May the walk seed the missing apprentice facts?~~ **ANSWERED 2026-07-30: yes** — create
   apprentices and rates freely in the operator's tenants, ledger everything, clean up at the end,
   and drive it visually as a GTO user. Recorded above.
3. **Do the 21 mis-rated placements get re-rated retrospectively, or corrected forward only?**
   Demo/dev data today — cheap now, expensive later.
4. From the spec's own nine: **#1 `clients` vs `employers`** — decides which entity gets invoiced,
   gates link 8, and the spec warns to pick one before more code accretes on both; **#4 host
   guaranteed-hours** (governs whether "no work available" is chargeable, deciding Stage 7.4);
   **#7 inclusions/exclusions tenant policy** (must be set before quote lines expose them, or the
   first quote reads as a price rise); **#8 margin floor + override authority**.
