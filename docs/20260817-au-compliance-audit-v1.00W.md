# BSuite Australian Compliance Audit

**Date:** 17 August 2026
**Scope:** Six parallel audit lanes across the BSuite estate — superannuation, leave, contractor classification, wages, termination, workers' compensation + privacy, and tax invoicing/GST
**Method:** Every finding was measured against live source code, then independently attacked by a second reviewer. Findings that did not survive that attack have been removed from this report. Findings that survived in altered form appear here in their corrected version.
**Status:** 33 findings raised, 5 removed as unfounded, 6 corrected and narrowed, 22 confirmed as stated.

---

## Glossary — every code used in this report

| Term | Meaning |
|---|---|
| **GTO** | Group Training Organisation — employs apprentices/trainees and places them with host employers |
| **R80.4** | The charge-rate/wage calculation engine app. Under a standing ruling, it owns *all* rate calculation |
| **crm7** | The CRM, payroll and invoicing app (`crm.crm7.app`) — where staff actually work |
| **conduit** | The recruitment/applicant-tracking app. No payroll surface, correctly |
| **RPC** | A calculation function that lives *inside the database*, not in the app. Runs when the app asks it to |
| **NES** | National Employment Standards (Fair Work Act 2009) |
| **SG / SGC** | Superannuation Guarantee / Superannuation Guarantee Charge (the penalty for late super) |
| **OTE** | Ordinary Time Earnings — the pre-1-July-2026 base super was calculated on |
| **STP** | Single Touch Payroll — the ATO reporting stream that runs on every payday |
| **RCTI** | Recipient Created Tax Invoice — the buyer issues the invoice instead of the supplier |
| **APP** | Australian Privacy Principle (Privacy Act 1988) |
| **NDB** | Notifiable Data Breaches scheme (Privacy Act Part IIIC) |
| **ABR** | Australian Business Register — the live ABN lookup service |
| **MAPD** | The Fair Work Commission's Modern Awards Pay Database API |
| **BOOT** | Better Off Overall Test |

---

## Executive summary — what this cost, ranked

**Three defects are moving real money right now.**

| # | What is wrong | Exposure | Where |
|---|---|---|---|
| 1 | Placements are costed at 4 weeks' annual leave with no way to enter 5 for a shiftworker | **$3,500–$5,370 per placement per year, under-recovered** — the GTO absorbs the cost, the host is under-billed | crm7 placements |
| 2 | Casual penalty rates are compounded (base × 1.25 × penalty) instead of the award's own additive casual percentage | **7.14% over-charge** on every casual penalty line under MA000020 and three other awards | shared calc engine |
| 3 | The mandatory GTO charge-out-rate compliance report reads workers' comp from a table that has never been written to | Every workers' comp on-cost on that regulator-facing report reads **$0.00** | crm7 reports |

**Four are statutory obligations not currently met.**

Superannuation due dates displayed to the operator use the *old quarterly* rule, 3½ months adrift of the Payday Super regime that started 1 July 2026. Recipient Created Tax Invoices are generated with no record of the written agreement the law requires, and no document is ever produced. There is no mechanism anywhere to destroy personal information once its retention period lapses. There is no data-breach detection-to-notification path at all.

**One large, previously-unflagged fact:** the termination screen your staff use is a mock. It saves nothing, calculates nothing, and prints a "Total Final Pay" figure built from three numbers a person typed in.

**And a caveat that governs how much of this you should trust:** twelve of the fifteen Australian compliance skills used today had never been invoked in this codebase before. See [Confidence and blind spots](#confidence-and-blind-spots) at the end — it is the most important section for deciding what to do next.

---

## Part 1 — Money actually paid or charged wrong

### 1.1 Every placement is costed at four weeks' leave, with no field to enter five

**Severity: critical. Confirmed by independent re-measurement.**

The Placements → Create screen builds a charge rate and writes it straight to `placements.charge_rate` — the number the host employer is billed against. It hardcodes annual leave to 20 days (4 weeks). The input type it accepts has **no field** for annual leave at all, so there is no way to enter 25 days for a continuous shiftworker entitled to 5 weeks under **Fair Work Act s.87(1)(b)**.

The code says so itself: *"PlacementChargeCalcInput has no override fields for them yet."*

| Evidence | Detail |
|---|---|
| File | `crm7/src/hooks/usePlacementChargeCalc.ts:190-204` |
| Consumer | `crm7/src/pages/placements/create.tsx:296-314`, writes to `data.charge_rate` at :329 |
| Feature flag | `CHARGE_CALC_V2_ENABLED` defaults **on**; no override exists anywhere in the repo |
| Measurement | The shipped engine (`@bsuite/charge-calc@0.12.0` dist, not a test re-derivation) was executed with 20-day vs 25-day inputs |

**The dollars, measured:**

| Wage | Rate at 20 days (what ships) | Rate at 25 days (correct) | Under-recovery |
|---|---|---|---|
| $29.50/hr | $53.6448/hr | $56.0899/hr | $2.4451/hr → **$3,530.75/yr** |
| $35.00/hr | — | — | $2.8970/hr → **$4,183.29/yr** |
| $45.00/hr | — | — | $3.7186/hr → **$5,369.72/yr** |

(Per placement, at 1,444 billable hours/year.)

Direction matters: this **under-charges the host**. The GTO wears the extra week of leave cost while billing as if only four weeks were owed. It is not an underpayment-to-worker risk; it is margin the business is silently giving away.

The reviewer also established that the standing "R80.4 owns all rate calculation" ruling does *not* rescue this. The placement-create flow never touches R80.4's corrected-rate mechanism (`charge_rate_quotes`) — it is a fully separate calculation path. The V2 flag was switched on six days *after* that ruling was made.

**Fix:** add the optional override fields (additive, zero behaviour change today), then wire a form field sourced from the placement's award/EA leave entitlement. That second half needs a database column that does not exist yet.

---

### 1.2 Casual penalty rates are compounded — a 7.14% over-charge to the host

**Severity: critical. Confirmed by independent re-measurement.**

The shared calculation package multiplies the casual-loaded wage by the standard penalty multiplier, on every award, unconditionally. That produces base × 1.25 × 1.50 = **187.5%**.

For MA000020 (Building & Construction) the correct figure is **175%** — because cl.12.5/12.6 makes the casual conversion *additive* (+25 percentage points on the standard multiplier, applied to the **base** rate), not multiplicative on an already-loaded rate.

> **1.875 ÷ 1.75 = 1.0714 — a 7.14% overstatement, exact, not approximate.**

This is the reverse direction of 1.1: it **over-charges the host** on every casual penalty line.

| Evidence | Detail |
|---|---|
| File | `packages/charge-calc/src/calculate.ts:164-165, 216, 308-310` |
| Reachable via | crm7 form → `crmCalcBridge.ts:296-299` → `sharedCalculate()`. Also the R8-push ingestion contract |
| Test coverage | **None.** `grep casual` over the package's own test file returns zero hits |
| Fix history | `git log --grep=casual` shows only the original feature commit. No follow-up fix, ever |

**The estate already knows the right answer.** R80.4 has a dedicated module, `casual-penalty-convention.ts`, with clause citations for MA000020 cl.12.5/12.6, MA000004 cl.11.1, MA000009 cl.29.2/28.4, MA000036 cl.12.2/23, MA000010 cl.11.1(d) — correctly distinguishing additive from multiplicative awards, and *refusing* (raising a typed error, never returning a wrong number) for any award/category pair not individually verified. That module's own header warns: *"MA000020's cl.12.5/12.6 additive rule is AWARD-SPECIFIC and must not be borrowed."*

That correct logic simply never made it into the shared package crm7 actually calls.

---

### 1.3 The GTO compliance report reads workers' comp from a table nothing writes to

**Severity: critical. Confirmed, and the reviewer found it is worse than reported.**

`report_gto_charge_out_rate_summary` — self-documented as a *"WS-5 GTO mandatory report"* — reads the workers' comp on-cost from `host_charge_rates`. That table has **zero write paths in the entire six-submodule estate.**

| Check | Result |
|---|---|
| `INSERT`/`UPDATE` on `host_charge_rates`, repo-wide incl. submodules | None. Only a generic `updated_at` timestamp trigger |
| The writer its own architecture record names (`crm7SyncService.ts`) | **Does not exist anywhere on disk** |
| Reads/writes from crm7 app code | Zero (only the auto-generated type file mentions it) |
| Where the *real* workers' comp rate lives | `charge_rate_snapshots.workers_comp_rate` — read/written by ~19 files |

The report does `COALESCE(hcr.wc_rate, 0)` — so the workers' comp component of the on-cost renders as **$0.00**, silently, on a regulator-facing compliance artefact.

**Confirmed live in production**, not merely in an unapplied migration: the identical function body and comment appear byte-for-byte in the production baseline schema dump (`20260807_prod_baseline_schema_dump.sql:10459-10546`).

**And it is user-reachable.** The reviewer traced the full chain: a seeded `report_templates` row (`template_key='gto-charge-out-rate-summary'`) points at this exact RPC, and `reportTemplateRunnerService.ts:315-326` executes it from the generic `/reports/[key]` page. A staff member opening "Charge-Out Rate Summary" today sees either no rows or a permanently-zeroed workers' comp figure.

**Fix:** point the report at `charge_rate_snapshots` (as the other six report RPCs in the same file already do against their live tables), and drop the `COALESCE(...,0)` in favour of an explicit "WC rate not resolved" state.

---

### 1.4 Contractors are paid through the payroll writer as if they were employees

**Severity: critical. Confirmed.**

crm7's live pay-run builder (`build_pay_run_from_timesheets`) inserts an ABN contractor's approved timesheet into `payroll_records` exactly like an employee's: it computes a superannuation guarantee dollar amount and tags the payment `income_type = 'SAL'` (Salary and Wages). It never looks at the person's employment type.

| Evidence | Detail |
|---|---|
| File | `crm7/supabase/migrations/20260806090000_overtime_multiplier_is_never_assumed.sql:289-303` |
| Measurement | `grep "employment_type\|abn_contractor"` across all five versions of this function → **zero hits**. Positive control: the same grep over the wider migrations tree returns 40+ hits, so the zero is real |
| Reachable via | Payroll Dashboard → "Build Pay Run" card (`payroll/dashboard.tsx:248`, whose own comment reads *"The ONLY caller of build_pay_run_from_timesheets"*) |

**The same system says the opposite elsewhere.** `chargeToPayroll.ts:46-50` defines `PAYROLL_EXCLUDED_TYPES = ['abn_contractor']` and skips them with the reason *"ABN contractor — excluded from payroll. Appears in billing only."* `employmentTypes.ts:269-274` marks `abn_contractor.hasSuperannuation: false`. The database function consults none of it.

**Two limbs of exposure, both real:**

1. **Money:** `super_guarantee_amount` is computed and summed into `pay_runs.total_super` for a person the same tenant separately bills as a contractor with no on-costs.
2. **Evidentiary, and this is the one that should concern you most:** a `payroll_records` row treating an ABN contractor as a salary-and-wages employee, with employer super computed, is the GTO's own internal record that it treated the relationship as employment. Under the **s.15AA whole-of-relationship test** that is precisely the kind of contemporaneous business record that undermines a genuine-contractor position, and it goes to **s.357** sham-contracting exposure.

**One material cap on current impact:** the Xero payroll push that would carry `income_type='SAL'` out to an actual STP lodgement is parked and not activated (no payroll OAuth scope, no production client, no edge function). So the mislabelling has not yet reached the ATO. The internal data defect and the super computation are live today.

---

### 1.5 Recipient Created Tax Invoices: no written agreement, and no document

**Severity: high (both). Both confirmed.**

Two separate defects on the same feature.

**(a) The mandatory written RCTI agreement is not modelled anywhere.**

An RCTI is only valid where a written agreement exists between the parties, both are GST-registered, the buyer issues within 28 days, and the supplier does not issue a separate invoice. The estate models none of it.

| Check | Result |
|---|---|
| Any `rcti_agreement` table, column, or flag | None. `rcti_invoices` columns are id/tenant/host/period/number/line_items/subtotal/gst/total/status/dates/notes — no agreement reference of any kind |
| Agreement check inside `generateRcti()` | None. It fetches timesheets and inserts a row |
| RCTI consent clause in the host services agreement template | None. `hostAgreementTemplate.ts` has zero mentions of invoice, billing, tax or GST |
| Any UI gate | None. The route is gated on the payroll feature flag only |

Files: `crm7/src/lib/rctiGenerator.ts:137-280`; `supabase/migrations/20260306000004_rcti_schema.sql`.

**(b) RCTI "generation" produces no document at all.**

`rcti_invoices` is referenced by exactly three non-test files: the generator, the generated type file, and a store. There is no PDF renderer, no email path, no Xero submission specific to RCTIs. The status enum includes `'sent'` — and nothing in the estate can transmit an RCTI, so a record could reach `'sent'` with no compliant tax document ever having existed. (The database CHECK constrains only the status *values*, not the transition; the generic entity-store `update()` accepts an arbitrary status payload.)

By contrast the ordinary invoice path has both a renderer and a send function. No equivalents exist for RCTI.

**Combined effect:** the RCTI feature currently cannot produce anything an auditor would recognise as a valid recipient-created tax invoice, regardless of whether the dollar figures inside it are right.

**(c) And the dollars inside it are not verified either.** The RCTI dialog seeds three free-text rate fields with hardcoded defaults — `35.00` / `52.50` / `35.00` — and passes whatever is typed straight into the generator with no lookup against any rate engine (`crm7/src/pages/payroll/rcti/index.tsx:53-79`). The reviewer traced it: `amount = hours × rate` flows directly into the persisted `subtotal`/`gst`/`total` and into the success toast. Nothing validates it. Nothing bounds it (the schema asserts only "non-negative"). R80.4 contains no invoice code at all, so there is no engine this dialog could even be routing through.

The codebase states the rule for itself in `chargeRateDefaults.ts`: *"crm7 does not recompute charge rates, it only displays/consumes them."* This dialog is an in-repo violation of a rule the source states in its own comments.

---

## Part 2 — Statutory obligations not currently met

### 2.1 Superannuation due dates shown to the operator use the superseded quarterly rule

**Severity: critical. Corrected on review — narrower than first reported, but the operator-facing half is worse.**

Payday Super commenced **1 July 2026**. Contributions must reach the fund within **7 business days** of payday (20 business days for a new employee's first contribution). The June 2026 quarter was the last under the old rules.

The database function that stamps super due dates, `super_due_date_for()`, still computes *"28 days after the quarter end"* — the old regime — and all five copies of the pay-run writer call it (`20260806043000_pay_run_from_timesheets.sql:92-107`, confirmed still live in the 20260807 production baseline).

**What the review corrected:** the original finding claimed the correct trigger never fires and every stored row is wrong. That overstates it. The same migration that built the correct logic (`20260730270200_l1_super_guarantee_correctness.sql`) built **two** triggers, and the finding only examined one:

- `set_payroll_super_due_date()` — BEFORE INSERT, guarded `IF NEW.super_due_date IS NULL`. Correctly identified as never firing, because the writer always supplies a value.
- `payroll_repair_super_due_dates()` — **AFTER INSERT, `ENABLE ALWAYS`, live in the production baseline, never disabled.** It re-stamps `super_due_date` to the correct 7-business-day figure *unconditionally* for any worker with an earlier payday. This one does fire.

**So the corrected position:**

| | Status |
|---|---|
| **Stored value**, second and subsequent contributions | Self-heals to the **correct** 7-business-day date |
| **Stored value**, a worker's very first contribution | **Wrong** — lands on the quarterly date instead of the correct 20-business-day new-employee figure |
| **Value displayed to the operator** | **Wrong 100% of the time** |

The display defect is the serious one. `build_pay_run_from_timesheets`'s return payload computes `super_due_date` via a *fresh, independent call* to the quarterly function — it never reads back the (corrected) row. `BuildPayRunCard.tsx:187-190` renders that uncorrected value directly: *"at {rate}%, due {result.super_due_date}"*.

**What the operator sees:** for a 6 July 2026 payday, the screen says the super is due **28 October 2026**. The true date is roughly **15 July 2026**. That is 3½ months of false comfort, on a screen that will read "not yet due" through the entire window in which the SGC accrues.

Missing the true window triggers the superannuation guarantee charge — non-deductible, with an administrative uplift, and penalties to 200%.

**Fix (narrower than originally proposed):**
1. Correct the RPC's return-clause `super_due_date` so it reflects the actually-stamped date, not a fresh quarterly recompute. *This is the one that stops the wrong number reaching a human.*
2. Close the first-contribution gap — either let `super_due_date` arrive NULL so the existing 20-day trigger fires, or branch `super_due_date_for()` on first-contribution status.

---

### 2.2 The termination screen is a mock. Nothing behind it works.

**Severity: critical. Confirmed — and the reviewer found the exposure is understated.**

`/hr/termination` is the only termination screen in the CRM.

| What it does | Evidence |
|---|---|
| Hardcodes the apprentice's name | `termination.tsx:192` — `useState('Emma Williams')`. The route takes no ID parameter |
| Never calls any backend | `grep -E 'supabase\|Service\|api\|fetch\|mutation'` over the file → **zero matches** |
| Fakes the save | `await new Promise(r => setTimeout(r, 500))`, then a success toast. No write occurs |
| Computes "Total Final Pay" as | `parseFloat(outstandingWages) + parseFloat(accruedLeave) + parseFloat(otherPayments)` — three numbers a person typed |
| Notice period, redundancy, RDO balance, the s.117(3)(b) over-45 uplift | **None present in the file** |

The separate path that *does* persist (`apprenticePlacementService.transitionApprenticePlacement`) writes only status, termination category and reason. **No dollar field anywhere in that write path.**

**Worse than reported:** the reviewer checked whether the proper transition dialog offers a fallback. It does not — `ApprenticePlacementTransitionDialog.tsx` is imported by no page except its own test, and on the one page its docstring claims it is wired into, the button is rendered `disabled`. So the mock is not merely *a* termination path; **it is the only live, clickable one in the product.**

Against **final pay obligations** — outstanding wages, accrued annual leave plus loading, accrued long service leave, plus situation-dependent notice, redundancy and RDOs — this system computes none of it, checks none of it, and would catch none of it.

**Also, a low-severity note that was raised and dismissed on review:** the three inputs default to `'0'`, so the card shows `$0.00` before anything is entered. The reviewer refuted this as a compliance defect — these are plain editable number inputs the operator fills in, no engine invents or infers anything, and `$0.00` can be a legitimately correct final pay where payroll already processed it. It remains a small UX improvement (distinguish "not yet entered" from "genuinely nil"), not a compliance item.

---

### 2.3 Rostered days off are invisible end to end — including at termination

**Severity: high. Confirmed, and independently extended by the reviewer.**

Under MA000020 cl.16.2 an apprentice accrues 0.4 hours of RDO per 8-hour day worked. Accrued-but-untaken RDO is money owed, and it must be paid out on termination.

**Nothing anywhere computes an RDO balance.** Three layers, all unwired:

| Layer | State |
|---|---|
| Calculation package | `rdo.ts` and `RdoAccrualConfig` exist and are correct — but consumed only by their own test file. `calculate.ts` contains the string "rdo" **zero times** |
| Config field | `types.ts:203` — its own comment: *"calculate() does not yet consume this field itself"* |
| Database | `timesheets.rdo_accrual_hours` / `rdo_taken_hours` exist and are applied (confirmed in the production baseline) — and `grep` across all of crm7 returns **zero** reads or writes of either column |

The reviewer went further and checked three adjacent RDO surfaces that might have covered it. All three are separate dead ends:

- `pay_item_groups.is_rdo_accrual` — a taxonomy flag on a table with 0 rows; nothing produces or consumes it.
- `usePlacementChargeCalc.ts`'s `rdoAccrualPerWeek` — a *different*, placement-level field whose own comment says it is *"not yet plumbed into CalcConfig"*; never persisted, never displayed.
- The timesheet page's `'rdo'` work-type option — selecting it dumps the hours into the generic `leaveHours` bucket and never touches either RDO column.

And `hr/termination.tsx` has **zero mentions of "rdo" in any casing.**

The entitlement is not computed-and-hidden. It is **stranded by omission** — a terminated apprentice's RDO balance cannot currently be identified by any workflow in this estate, let alone paid.

---

### 2.4 Twenty-six sensitive documents sit unencrypted — but this is a ruled decision, not an open breach

**Severity: downgraded on review. Read the correction carefully.**

**The facts hold.** 26 documents flagged sensitive are stored unencrypted: 18 identified 8 August 2026 (9 driver's licences, 7 super-choice forms carrying a TFN, 2 passports), plus 8 photography consent forms — some involving minors — flagged retroactively on 16 August. This engages **APP 11.1** (reasonable steps to protect personal information), and sensitive information attracts a higher standard.

**What the review corrected — two things, both material to how you should read this.**

**First, you already ruled on it.** The operator decision register records your own RULING 14.1, dated 9 August 2026 — the day *after* the finding. An earlier draft had called this "a live breach that had to be remediated before other work could proceed." You overturned that framing:

> *"Encryption is an option on the document category, configured by whoever owns the category… a super-admin decision, not something an agent gets to declare an incident about and gate work behind."*

The register states plainly: *"It is not a blocker on anything. Nothing is waiting on it."* Presenting this as an unaddressed high-severity violation contradicts a decision you made on record.

**Second, the "the fix has never been run" claim is unsupported and used the wrong instrument.** It rested on `git log` for the remediation script — but running a script produces no commit, so its absence proves nothing. Worse, that script was rewritten on 9 August into a thin wrapper around an edge-function action, and the *same* remediation pass is available as a live UI button in `settings/document-categories.tsx` (a wired `runEncryptionPass()` handler behind a confirmation dialog). A super admin can run it from the browser leaving no trace in any git history. The audit's method cannot distinguish "never run" from "run repeatedly via the path the register directs operators to use."

**Corrected position:** a real, documented, ruled-on, actively-tooled operator decision point. Not an unaddressed violation. It sits in Part 3 below as a decision for you, not an action for engineering.

For scale if it ever does go wrong: OAIC penalties for a serious interference reach the greater of $50M, three times the benefit, or 30% of adjusted turnover.

---

### 2.5 Nothing destroys personal information when its retention period lapses (APP 11.2)

**Severity: medium. Confirmed.**

**APP 11.2** requires reasonable steps to destroy or de-identify personal information no longer needed for any permitted purpose. You have formally ruled the retention periods. Only one mechanism is actually scheduled, and it covers system telemetry only.

| Table set | Automatically destroyed? |
|---|---|
| `error_log`, `audit_logs`, `audit_events`, `data_change_sets` | **Yes** — daily cron at 02:15 UTC, archives before deleting, logs to `retention_run_log` so a zero-deletion run is distinguishable from a job that never fired. This part is well built |
| Training contracts | **No.** The only training-contract cron is a *keep*-the-record annual attestation reminder under Fair Work Act s.535 — the opposite obligation. It contains zero DELETE statements |
| Apprentice/candidate documents (`document_metadata`) | **No.** Only an `expiry_date` column and a licence/passport expiry *alert* sweep. No destruction job |
| User activity logs (your ruling 5, the 2yr-archive/7yr-delete tier) | **Not built.** The rulings document calls it *"the largest remaining piece"* and closes: *"Nothing deletes anything today"* |

The reviewer additionally found two newer, unmerged migrations that extend cleanup — one to the *same four* system tables, one scheduling cleanup of 24-hour handoff tokens. Neither touches training contracts, apprentice documents, or any TFN-adjacent record. The gap is unchanged.

---

### 2.6 There is no data-breach detection-to-notification path anywhere

**Severity: medium. Confirmed, with three independent corroborations.**

Under **Privacy Act Part IIIC**, an entity must assess a suspected eligible data breach and notify the OAIC and affected individuals where serious harm is likely.

`grep -rliE 'notifiable.data.breach|data_breach|breach_notif|\bNDB\b'` across every `.ts`, `.tsx` and `.sql` file in the monorepo, submodules included: **zero hits.** (Positive-controlled — the same grep style finds real hits for other terms, so this is a true zero.)

The reviewer checked the two mechanisms that might have covered it and read both in full:

- The **Supabase advisor sweep** CI workflow — a pre-emptive misconfiguration gate on migrations. Not breach-event detection.
- The **incident response plan** in the production launch runbook — a SEV-1/2/3 *outage* playbook (OAuth down, RLS failure, payment failure), with zero mention of serious-harm assessment, the OAIC, or individual notification.

Your own retention-rulings document already logs this: ruling 6 is marked *"Open — needs its own investigation before building."* Two other documents, months apart, independently flag the same absence.

NDB assessment is legitimately a human and legal process rather than a code artefact — you would run it, not the software. But **no tooling path currently feeds into that assessment at all**, so a real breach would depend entirely on someone noticing by other means.

---

### 2.7 Every tax invoice has an ABN problem — two of them, actually

**Severity: high. Both corrected on review; the corrections change what you fix.**

Two related findings were raised. Both were narrowed, and the *reason* is the same in each case: **crm7 has never successfully produced an invoice PDF. Not once.**

The repo's own commit `9b84d2c8` (merged 16 August, one day before this audit) measured live production data: the `invoices` table holds **3 rows, 0 with a PDF URL**, and the storage bucket holds **0 objects**. Its own words: *"It has never once succeeded."* That commit fixed a storage-policy bug but added no caller for the renderer, which still has zero production call sites anywhere in crm7.

**Finding (a) — the placeholder seller ABN.** `renderInvoicePdf.ts:469` prints the literal string `"ABN: [Your ABN Here]"` instead of the GTO's real ABN. A seller's ABN is mandatory on every compliant tax invoice above $82.50 inc GST, and its absence lets the ATO deny the host's input tax credit.

**Corrected:** the string is real and is ship-blocking, but it is currently **latent, not live** — that renderer is never invoked. What *is* live is arguably worse and was not what the finding described: the "Send Direct" path falls back to an inline HTML email (`buildInvoiceHtmlEmail`) which contains **no ABN reference of any kind**, for either party. So today's emailed invoices state no seller identity at all.

**Finding (b) — invalid ABNs on stored records.** 12 of the 14 ABNs stored across employers/clients fail the ATO modulus-89 checksum — seed/demo data with rolling digits. A deliberate, well-reasoned decision validates ABNs *forward-only* (on change) so as not to reject 12 pre-existing rows.

**Corrected — this one was refuted as a live money finding.** The claim was that most live invoices currently display an invalid ABN. They cannot: no invoice PDF has ever existed. The data-quality gap is real and already documented; the compliance impact is dormant, not active.

**Finding (c) — the $1,000 threshold, confirmed as stated.** No code anywhere checks the $1,000 inc-GST threshold above which the *buyer's* identity or ABN becomes mandatory. The host employer's ABN prints purely because the field happens to be populated, never because the total crosses the threshold — `renderInvoicePdf.ts:344-346` never references the invoice total at all. Routine charge invoices exceed $1,000 in ordinary operation (38 hours at $35/hr is $1,330 from the RCTI dialog's own defaults). No database constraint, UI validation, or send-time gate exists.

**What this means practically:** fix all three *before* the PDF pipeline is wired to a live trigger. Right now the compliance harm is theoretical; the moment someone connects the renderer it becomes real on every invoice.

---

## Part 3 — Decisions for you, not for engineering

These are not defects to be fixed. They are choices only you can make.

| # | Decision | What is actually at stake |
|---|---|---|
| **D1** | **The 26 unencrypted sensitive documents.** Your RULING 14.1 already holds this as a super-admin configuration choice, not an incident. The tooling to run the encryption pass exists and is wired (a button in Settings → Document Categories). | Whether to run it, and when. No engineering work is required — only your decision. Note the audit could not verify whether it has already been run, because the primary path leaves no git trail. A live database query would settle it in seconds. |
| **D2** | **Where contractor charge rates live.** The standing ruling is that R80.4 owns all rate calculation. R80.4 has never been asked to price a contractor. crm7 has a full ABN-contractor model and prices them through the shared engine with per-app adapters. | Either add contractor pricing to R80.4, or formally record that the shared-package-plus-adapter arrangement satisfies the ruling. Both are defensible; leaving it undeclared is not. |
| **D3** | **Whether the person-creation form should surface the classification test.** When staff pick "ABN Contractor" from a plain dropdown, nothing prompts the **s.15AA** whole-of-relationship test and nothing records *why* the classification was made. Your standing ruling — *"the user determines eligibility, never an engine"* — forbids an auto-classifier, and this finding does **not** propose one. But a passive prompt plus a reasons field would not violate that ruling. | The sham-contracting defence under **ss.357-359** turns partly on whether the employer reasonably believed the engagement was genuine (an *objective* test since 27 Feb 2024). A documented contemporaneous reasons trail is exactly the evidence that defence needs. Penalties scale to 1,500 penalty units, ×10 for serious or systematic contraventions. The gap exists on **both** intake paths — the legacy `/people/new/worker` form and the current primary `/people/onboard` flow. |
| **D4** | **Whether workers' comp should be state-aware.** A single hardcoded national default of **4.7%** is used for every placement, everywhere. Its sibling on-cost, payroll tax, has an 8-jurisdiction revenue-office-verified table with a "source / verified" badge rendered in the UI — *three lines above* the bare workers' comp field with no badge at all. | WA WorkCover, NSW icare and VIC WorkSafe have materially different premium structures. The field is manually editable, so this is drift risk, not guaranteed error. The estate has already proved it can build the state-aware pattern; it simply has not for this on-cost. |
| **D5** | **Whether public-holiday counts should come from the calendar you already built.** The charge model uses a flat manually-typed 10 days. crm7 already has state-aware, date-effective `public_holiday_groups` / `public_holiday_group_dates` tables with a settings UI and RLS — built for penalty-rate lookups, never wired to costing. WA has ~8 public holidays, VIC ~13 including Melbourne Cup. Both default to 10. | The NES floor gate accepts anything ≥8, so a VIC placement at the default of 10 passes silently while understating the on-cost by roughly three days. The ingredients for the fix already exist and are unused. |
| **D6** | **How far to build out termination coverage.** Only 3 of R80.4's 21 modelled awards have a notice-of-termination or NES s.119 redundancy-scale module (MA000020, MA000029, MA000036). | *Corrected on review:* the claim "the other 18 have no termination logic of any kind" is too strong — MA000025 computes leave loading payable on termination, MA000059 computes pro-rata leave hours on termination, MA000071 computes a notice-failure penalty. But none of those is the notice-period or redundancy-scale calculation. This is award-modelling scope, not an audit fix. |
| **D7** | **Whether to add a live ABR lookup.** Only local checksum arithmetic exists — no call to the Australian Business Register anywhere in the codebase. | Checksum-valid is necessary but not sufficient: it does not confirm an ABN is *currently registered, active, or GST-registered*. That last one is an explicit RCTI precondition ("both parties GST registered"), so this gap blocks full RCTI compliance even after the agreement gap in 1.5 is closed. |

---

## Part 4 — What is correct

The lanes were asked to record what works. This section is not padding: several of these are places where the estate got a hard thing right, and in two cases it independently derived the correct legal rule from clause text.

### Superannuation

- **The 12% rate is correct and consistent.** `SUPER_SCHEDULE` and `DEFAULT_SUPER_RATE` both hold 0.12, matching the final legislated 2025-26/2026-27 rate. A migration correctly corrected both `payroll_records.super_guarantee_rate` (0.115→0.12) and `hiring_divisions.super_guarantee_rate` (11.50→12.00), confirmed still in effect in the production baseline.
- **Payday Super infrastructure already exists and is wired.** `PAYDAY_SUPER_EFFECTIVE_DATE = '2026-07-01'` and `isPaydaySuperRequired()` correctly auto-enable per-payday treatment for any pay date on or after that date, live on the payroll dashboard.
- **The 7-day/20-day due-date engine was built correctly** in `20260730270200_l1_super_guarantee_correctness.sql`, with a business-days helper, an out-of-order-insert repair trigger, and a consistency check. Genuinely well-engineered — the defect in 2.1 is that a later writer bypasses part of it, not that anyone got the law wrong.
- **The engine deliberately excludes overtime from the super base** (`superOnOT: false`), which remains correct under Payday Super — the one new inclusion is a narrow commission carve-in, not overtime generally.
- **conduit correctly has no payroll or super surface at all** — a clean app boundary, verified.

### Leave

- **R80.4 implements the 5-week continuous-shiftworker entitlement correctly** — `alWeeksEntitled = continuousShiftworker ? 5 : 4`, with an in-code documented history of a prior part-time pro-ration bug that over-charged hosts ~$2,300/yr on a 3-day/week apprentice, found and fixed.
- **Casuals are correctly excluded from annual, personal and public-holiday costing** in R80.4, with the right legal reasoning cited (cl.12.1/12.4 — the 25% loading *is* the compensation, so costing both double-charges the host).
- **crm7's NES floor gate treats 20 days as a floor, not a ceiling** — it does not block or clamp a legitimate 25-day entry. The gate is not the cause of the hardcode in 1.1.
- **Casuals and contractors are correctly excluded from paid leave and leave loading** across employment-type configs and the accrual engine.
- **Annual leave loading (17.5%) is applied only to the annual-leave-pay component**, never to ordinary pay, and is correctly zeroed for casuals and ABN contractors.
- **The leave-balance accrual engine honestly documents its own limits** — it states in its docstring that it models the NES statutory floor only and does not cover a shiftworker's 5-week entitlement. It is not silently wrong; it says what it does not do. (That gap remains real and reaches a live UI figure via `leave_balances.accrued`, but the code does not mislead.)

### Contractors

- **The TypeScript payroll pipeline correctly excludes ABN contractors** with a clear skip reason. This is the right design; the SQL writer in 1.4 is the one that departs from it.
- **Contractors are billed separately and correctly** — no on-costs, contractor rate plus GTO margin, distinct invoice line description.
- **The static contractor configuration is legally sound**: superannuation, workers' comp, payroll tax, leave entitlements, casual loading, leave loading, training and funding all `false`, BOOT `never`.
- **No auto-classifier exists anywhere.** Every place employment type is set is an explicit operator selection — consistent with your ruling that the user determines eligibility, never an engine. This report proposes no classifier.
- **R80.4's exclusion of contractors is a tested boundary, not an oversight** — an explicit test asserts the value is rejected. That is a provable design decision.
- **conduit's ABN handling is a different concern entirely** — verifying a host employer's or GTO's business ABN for regulator lodgement, not classifying a candidate. Correctly out of scope.
- **The real STP Phase 2 vocabulary is correct and ATO-aligned** (SAW/CHP/ANN/WHM/SWP/FEI/IAA/ADX income types; F/P/C/L/V/D/N employment-basis codes including L for labour hire). The defect in 1.4 is that a *parallel* vocabulary was invented for the timesheet RPC and never reconciled with this correct one.

### Wages and rates

- **Every wage input carries a typed source, a human-readable trace and a timestamp**, and **throws rather than silently defaulting** when a fetch returns null. It warns when a live rate is more than 90 days old. No hardcoded dollar figure exists in that module.
- **The source-of-truth ranking is implemented exactly as it should be**: manual override > MAPD API > MAPD cache > database instrument > pay guide > bundled fallback, with a specific non-silent warning for every non-live provenance and an explicit contract forbidding a cache from outranking a live call.
- **The one bundled fallback rate carries an effective date and a staleness check** returning an actionable warning, not a silent ageless literal.
- **`casual-penalty-convention.ts` is the best piece of compliance engineering found in this audit.** Clause-cited, per-award, per-category, and it **refuses via a typed error rather than returning a wrong number** for any pair not individually verified. It is exactly the design this estate should generalise.
- **R80.4 refuses casual treatment for an apprentice under a training contract** — pushes a violation rather than silently computing. Correct.
- **crm7's calc bridge is a pure adapter** with zero independent dollar arithmetic — it correctly respects R80.4's ownership at that layer.
- **Every bundled award rate table carries a clause citation and an effective date**, so any figure can answer "as at what date, from which clause".

### Termination

- **The NES s.117 notice engine is correct and fully tested** — the 1/2/3/4-week service bands *and* the **s.117(3)(b) over-45-with-2-years uplift**, correctly one-directional (an employer owes the extra week; an employee never does on resignation). Verified by running the suite live: **17 of 17 pass**. This is the limb most commonly omitted, and it is right.
- **It also correctly excludes daily-hire building-industry workers** from the notice scale per s.123(3)(a) — a specific, easy-to-miss exclusion nobody asked about, present and tested.
- **The redundancy engine implements the apprentice exclusion correctly** (cl.14.2(e)), with *both* narrow re-entry conditions modelled. This is the one redundancy path actually wired into a live UI.
- **The MA000029 small-business redundancy scheme is carefully modelled** — including the correct *narrow* base rate (base rate of pay, not the wider all-purpose rate the same clause uses elsewhere).
- **Small-business-employer status is a consistently applied concept**, referenced across 18 files spanning leave, allowances and employment clauses in eleven awards.
- **conduit correctly has no termination logic** — it does not employ anyone.
- **crm7 requires an operator-supplied termination category on every terminal transition**, enforced server-side. Your "user determines eligibility" ruling is being followed for the classification half of termination, even though the financial half is unwired.

### Privacy and tax file numbers

This was the highest-risk single item the audit was asked to check, and it came back clean.

- **The TFN is write-only by design.** It is stored via the database vault with only person and tenant IDs in the secret's description. **No decrypt or read RPC exists anywhere** — verified by grep across all migrations and source. This is unlike the bank-account path, which has a decrypt route that is org-admin-only and audit-logged.
- **TFN validation deliberately does not echo the value into error messages.** The TFN validator emits a fixed string with no interpolation — in explicit contrast to the BSB validator two functions above it, which *does* interpolate its (less sensitive) input. That is a deliberate choice, not an accident of a shared pattern.
- **The TFN is masked in the UI to the last three digits only.**
- **No console logging, custom network logger, or analytics call sits on the TFN save path.**
- **The global query error handler forwards only the error object**, never the mutation's input variables.
- **Sentry is configured defensively for exactly this risk** — session replay masks all text and blocks all media, which would mask a TFN field and block a scanned passport image. No PII-capture or request-body config is present.
- **The STP module that types a TFN field is entirely unwired** — zero callers, no STP edge function. There is currently no live code path by which a decrypted TFN could reach a log, Sentry, or an analytics payload.
- **The audit/error-log retention family is correctly cron-enforced**, archives before deleting, and logs its runs so a zero-deletion run is distinguishable from a job that never fired.

### Invoicing, GST and ABN

- **The ABN, ACN and TFN checksum validators are correctly implemented** against the published algorithms — ATO weighted modulus-89, ASIC weighted modulus-10, ATO weighted modulus-11 — exported as both predicates and schemas, with algorithm citations in comments.
- **ABN and ACN are never confused.** 11 digits versus 9, distinct checksums, separate columns; no site writes one into the other's field.
- **Host-employer ABN entry is checksum-gated going forward**, with a documented deliberate decision not to retro-invalidate known-bad legacy rows.
- **The Xero tax-rate resolver is exemplary.** It resolves each line's tax type from the tenant's *own live* Xero data, explicitly documents and closes a prior defect where the type was hardcoded, and **refuses to fall back to any hardcoded default** — degrading only to a genuinely previously-fetched cache, never a fabricated value. It is wired in, and a resolution failure fails the whole submission batch.
- **crm7 is the sole owner of invoice and RCTI tables.** No duplicate or mirror invoice logic exists in any other app.
- **R80.4 contains zero invoicing, ABN or tax-invoice code** — correctly keeping tax concerns out of the rate engine.

### Architecture boundaries verified

- **The database's GST schema already supports a 0% GST-free line** (`CHECK (gst_rate IN (0, 0.10))`) — the capability exists, application code simply never exercises it. Labour hire is normally a standard taxable supply so today's invoices are likely correctly taxed at 10%, but the PDF hardcodes the label "GST (10%)", which would become silently wrong the day a zero-rated line is entered.
- **The dead Flyway schema in `business-suite-unified`** carrying a second copy of workers'-comp rate columns is genuinely unreachable — no app code, no cross-package consumption, and its CI deploy workflow has **never run once** and is missing the credentials to run.
- **`resolveOrdinaryRate()` has zero production call sites**, confirmed by the codebase's own dead-code tooling, which states it in as many words. Its documentation/implementation mismatch (14+ awards return a bundled table before the live-data branch is reached) affects no dollar today — but it is a landmine for whoever wires it up next.

---

## Confidence and blind spots

**Twelve of the fifteen Australian compliance skills used in this audit had never been invoked against this codebase before today.**

That is the single most important sentence in this report, and here is what it means in practice.

**What it does not mean.** It does not mean the code was written badly or carelessly. Several of the strongest pieces of work found — the casual-penalty convention module, the s.117 notice engine with the age uplift, the TFN write-only design, the Xero tax-rate resolver — were built correctly by people reasoning directly from the legislation and the award clauses. In four separate places the code cited the correct statute or clause and got the answer right independently. Where the skills and the code disagreed, the code was sometimes the more careful of the two.

**What it does mean.** Every finding in this report comes from a *first* pass. First passes on unexamined ground have a characteristic shape: they find the defects that sit in the paths someone thought to walk, and they miss the ones in paths nobody walked. Two patterns in this audit prove the point directly:

1. **The superannuation finding was overstated on first pass and had to be corrected.** The original examined one of two corrective triggers built in the same file and concluded every stored row was wrong. Half the correction was already in place. Nobody had looked before, so nobody knew.

2. **Three findings were refuted or downgraded because the code path had never actually run.** The invoice PDF renderer has zero call sites. The overtime multiplier in the payroll pipeline always multiplies by zero. The unencrypted-documents "never remediated" claim used git history to test something git history cannot see. Unwalked ground looks like defect and absence at the same time, and telling them apart takes a second pass.

**Where confidence is genuinely low, ranked:**

| Area | Why confidence is low |
|---|---|
| **Long service leave** | Not audited at all in any lane. State-based, and WA's rules differ from the eastern states. Nothing in this report speaks to it |
| **Award coverage beyond MA000020** | 21 awards are modelled; termination/redundancy exists for 3. The casual-penalty convention covers 5. The remainder are unverified for these limbs |
| **Workers' compensation** | The dedicated skill has *no content* on labour-hire or GTO on-cost modelling — it is written entirely from a claims and employer-obligations angle. The one thing this estate needs it for is the one thing it does not cover |
| **Anything requiring a live database** | The privacy lane had no Supabase access. The 26-document count and the empty-table finding are documentary cross-checks against prior measurements and current migrations, not fresh row counts. Both are probably right; neither was re-queried live today |
| **Deployed behaviour** | This was a source-code audit throughout. No finding was verified by signing into the running application and exercising it as a user |

**What would raise confidence most, in order:**

1. **Run three live database queries.** How many documents are actually unencrypted right now; how many rows `host_charge_rates` actually holds; what `payroll_records` actually contains for any ABN contractor. Each settles a finding in seconds and each currently rests on inference.
2. **Second-pass the areas nobody has ever examined** — long service leave first, then award coverage for the 18 unmodelled termination paths.
3. **Exercise the three critical money defects in the deployed application** and capture what the screen shows. Source-code tracing found them; only a live test proves what a staff member actually sees.

**One methodological note that should increase your confidence in what survived.** Every finding here was attacked by an independent reviewer whose job was to break it. Five findings did not survive and are not in this report. Six were corrected and appear only in narrowed form. The twenty-two that remain each withstood a deliberate attempt to refute them on file contents, reproduced measurements, reachability, legal basis, and whether something else already handled it. Where a reviewer's own check went *further* than the original finding — as it did on the termination screen and the RDO gap — that extension is noted in the text above.

---

*Report generated 17 August 2026. Every file:line reference in this document was verified against live source by a second reviewer independent of the lane that raised it.*