<!--
RECOVERED FROM A CLAUDE CODE SESSION TRANSCRIPT, 2026-08-17.

This plan was produced in plan mode on 2026-07-29 and approved, but it only ever
existed inside `~/.claude/projects/-home-braden-Desktop-Dev-bsuite/1853f94c-…jsonl`
— a session transcript. It was never written to `docs/`, so no later agent could
read it, and the estate register that claims to have read every non-archive document under
`docs/` could not have seen it either.

4 iterations of this plan exist in that transcript; this is the FINAL one.
The earlier drafts are superseded and are not reproduced.

Recovered verbatim. Its measurements are from 2026-07-29 and several have moved
since — treat every number here as of that date, not as current.
-->

# R8 Rates Engine + Xero + Product Corrections — Implementation Plan

## Context

Five inputs converged: the operator's reference calculator, a completed Xero audit, Hermes's hand-back,
the `20260729-xero-api-docs-v1.00W.md` brief, and a live UX inspection of `r8.crm7.app`.

**Governing finding:** the charge-rate *maths* is already correct — `packages/charge-calc/src/calculate.ts`
is a port of the operator's reference and cites its line numbers. Every problem below is **wiring, data
provenance, or ownership** — not arithmetic.

**Legacy quote reconciliation is dead.** No real quotes have ever been issued; Hermes's 12
`CANNOT_DETERMINE` rows are test data. Close it and his blocking question with it.

---

## Orchestration

### Team formation (per `master-orchestration`)

| Lane | Agent tier | Named skills (Gate C — never general-purpose) | MCPs |
|---|---|---|---|
| **A** Rates engine | sonnet | `award-interpretation-boot`, `australian-apprenticeship-system`, `test-driven-development`, `bsuite-react-testing` | Supabase (`execute_sql` for live award/rate tables), Context7 (installed lib versions) |
| **B** R8 product | sonnet | `ui-ux-pro-max`, `bsuite-brand-system`, `dry-one-shot-architecture`, `test-driven-development` | Supabase, BrowserBase (live UX) |
| **C** Occupation model | sonnet | `australian-apprenticeship-system`, `best-practice-research`, `supabase-postgres-best-practices` | Supabase (schema), WebFetch (ANZSCO / priority-occupation / STA sources) |
| **D** Xero | sonnet | `xero-integration`, `xero-accounting`, `best-practice-research`, `security-audit` | Context7 (`xero-node`), Supabase (edge fns, `xero_*` tables), WebFetch (Payroll AU docs) |
| **E** Competitor parity | haiku | `competitive-capability-matrix`, `competitor-product-research` | WebFetch / BrowserBase (docs several links deep) |
| **Red team** | **fable** | `multi-agent-red-team-implementation`, `bsuite-reliability-red-team`, `bsuite-rls-authz-red-team-checklist`, `security-audit` | Supabase (`get_advisors`), GitHub |
| **Verification** | sonnet | `verification-before-completion`, `qa-and-verification`, `definition-of-done`, `playwright` | Supabase, BrowserBase, Vercel (deploy state) |
| **G** Dead-code cleanup | sonnet | `dead-duplicate-code-audit`, `codebase-cleanup`, **`cleanup-scope-enforcement`**, `simplify-code` | GitHub (issue-per-orphan) |
| **Docs/close-out** | haiku | `documentation-compliance`, `planning-and-roadmapping`, `qig-agent-comms` | qig-memory (bsuite silo), GitHub |

**Constraints:** isolated git worktree per lane; **max 2 concurrent** (operator runs heavy QIG compute);
maker ≠ checker; GPG-signed commits; pnpm only. `Tavily` and `Zapier` MCPs need reauthorisation and are
**not** relied on — WebFetch substitutes. Playwright MCP is disconnected; use the local `playwright`
skill (already in the BSuite stack) plus BrowserBase for live UX.

### Red-team protocol (per `multi-agent-red-team-implementation`)

Two full rounds before QA, **not one**. Each round: implement → red-team → remediate Critical/High → re-test.

Roles, with a domain role added because this is compliance-critical wage work and the operator is a lawyer:

| Role | Asks |
|---|---|
| **Award/BOOT domain** | Is the rate defensible against the award clause? Would a union challenge it? |
| Security | Secrets, scope escalation, RLS, anon exposure |
| Reliability | Null/edge states, partial saves, stale cache, concurrent quote edits |
| Correctness | Is any displayed number a *stand-in* for a computed one? *(the recurring defect class)* |
| UX/DX | Can a GTO admin do the simple case in one click and the advanced case without leaving the screen? |
| Code quality | Duplication, dead code, second sources of truth |

**Standing red-team question for every lane:** *"Which number on this screen is representative rather than
computed for this record?"* — that single question has produced every wrong-money defect found this week.

---

## Workstream A — R8 as the rates engine

**Goal:** a GTO admin selects an apprentice and gets a compliance-correct, award-resolved charge rate
they can name and save, with no hand-typed figure that the system could have derived.

### A1. Unify the two divergent calculation paths *(root cause — do first)*

- `R8Calculator.tsx` — standalone. Manual entry, ephemeral, **never consults the exemption engine**.
- `ApprenticeManager.tsx:223` → `awardRulesEngine.ts:859` `resolveRatePackage()` — the compliance-correct
  path (award wage, payroll-tax exemption, WIC-code workers comp, TAFE amortisation).

Route `R8Calculator` through `resolveRatePackage()` when a profile is selected; manual entry only as
fallback. Reuse the rules/warnings display at `ApprenticeSettingsModal.tsx:1476-1496` — **do not build a
second one**.

**Done when:** a WA apprentice profile selected in `R8Calculator` produces the *same* rate as the same
profile in `ApprenticeManager`, proven by a test that fails if the wiring is removed.

### A2. Payroll tax — exemption reaches the calculator

Field is already zeroable (`R8Calculator.tsx:725-737`; `calculatorValidation.ts:55-62` `min:0, warnMin:0`).
The **exemption knowledge already exists**: `awardRulesEngine.ts:356-372` `PAYROLL_TAX_EXEMPT_STATES` —
**WA/VIC/NSW fully exempt AP, AA and TN**; QLD/SA/TAS/ACT/NT exempt AP/AA only. `resolvePayrollTaxRate()`
(`:546-553`) returns `0`.

**Auto-zero + note.** Pre-fill `0%` for an apprentice/trainee in an exempting state, show a
legislation-check note, keep it editable. Making the user *remember* to type 0 is the same failure class
as the VIC-payroll-tax bug. Tooltip (`:734`) mentions only the threshold — add the exemption **without
asserting it as fact for any tenant**.

**Also:** `HARDCODED_PAYROLL_TAX_RATES` (`payrollTaxService.ts:75-84`) and `PAYROLL_TAX_RATES`
(`charge-calc/src/defaults.ts:4-13`) are two copies — verified identical, **no cross-import**. Collapse.

**Done when:** WA/AP → 0 and VIC/AD → 0.0485 under test; the note renders; one rate table remains;
mutation-test confirms the tests fail on revert.

### A3. Rate "builds" — named, saveable, reusable

`R8Calculator` persists **nothing**. `chargeCalculationsService` (per-apprentice),
`chargeRateScheduleService` (output), `customPayRateService` (year 1–4 presets) exist but none is a
reusable template. **Named saveable builds** — prerequisite for bulk creation either way. Extend
`chargeCalculationsService`; do not add a fourth persistence layer.

**Done when:** save → reload the app → restore, and every field round-trips, with **billable weeks
recomputed rather than restored as a literal**.

### A4. Do NOT re-import the reference's `39`

`charge-calculator-mapd.jsx:107-112` hardcodes `Standard (39w) / billableWeeks: 39`, contradicting the
shipped ruling. Its own `calculate()` derives `impliedBillable = 52 − Σweeks`. **Take the derivation.**

---

## Workstream B — R8 product corrections (from live inspection)

**Goal:** every figure on a funding or margin surface is either entered by the user as a genuine input,
or derived from the quote — nothing in between.

### B1. Funding Offsets — stop hardcoding, start deriving *(same family as A4)*

`FundingOffsets.tsx:97` — `useState('1976') // 52w × 38h default`. **1976 is a hardcoded derived figure**
asserting 52 billable weeks on a funding surface, in the codebase where we just removed that assumption.

- **Current charge rate** pulls from the selected quote, not typed.
- **Billable hours** derives from the quote's variables via `calculateBillableWeeks()` — never a default.

**Done when:** changing the quote's leave/training inputs changes the displayed billable hours. A test
that still passes with `1976` hardcoded proves nothing and does not count.

### B2. EIS is misclassified

`fundingSchemes.ts:83-89` — `key: 'federal_eis'`, `level: 'federal'`, `jurisdiction: 'AU'`, described as
"Legacy federal employer incentive payments". **EIS is Western Australian** (DTWD). Reclassify and correct
the description; audit the whole registry for the same error class.

**Done when:** EIS appears under Western Australia in the picker, and every other scheme's jurisdiction is
evidence-checked against its administering body.

### B3. R8 owns dashboards belonging to CRM7 *(one-shot violation — needs a ruling)*

`CompletionsDashboard.tsx` docstring: *"Outcomes derive from the CRM7 apprentice status taxonomy."*

| R8 nav item | Owner under one-shot §1 |
|---|---|
| Placements | **CRM7** |
| Completions | **CRM7** (apprentice lifecycle) |
| Training Hours | **CRM7** (though training weeks feed rate calc) |
| Margin | **R8 — legitimately its own** |

**Ruling needed:** move to CRM7, or keep as explicitly-labelled read-only cross-app views. Either is
defensible; silently owning another app's domain is not.

### B4. Payroll Exports — employer identity sourced, not typed

The "Employer & pay run" block asks for employer name, ABN, branch code, remitter BSB/account/name, ABA
bank code, ABA user ID and STP software ID **per pay run**. That is stable organisational identity.

- Tenant payroll identity → org/account settings, configured once.
- **Host-employer data → the Host/Client Portal.**
- The export screen keeps only pay-run-specific inputs (period, payment date, frequency).

**Done when:** generating an export requires zero re-entry of organisational identity.

### B5. Margin floor policy engine *(new capability)*

- Admin / super-admin set **base margin defaults**; all quotes **inherit** them.
- The base is a **floor** — a quoter may go **higher**, never lower.
- Below-floor requires **an admin user, or admin approval** (approval workflow).
- The floor is **volume-sensitive**: it reduces **proportionately as billable hours rise**.

Store the policy (base + volume curve) at tenant level with provenance, mirroring the override/provenance
pattern Hermes shipped in `AdvancedConfigSection` (`06809710`) rather than inventing a second one. The
floor must be **computed from billable hours, not a table of fixed numbers per band** — a banded table
reintroduces exactly the hardcoded-figure problem.

**Done when:** a non-admin below-floor quote is rejected and an admin's is permitted; and two different
billable-hour volumes yield two different floors (proving it computes rather than looks up).

---

## Workstream C — Occupation / qualification data model

**Goal:** the three identifiers are stored separately and can disagree without corrupting each other.

| Concept | Source | Example |
|---|---|---|
| **Qualification** | TGA (national) + STA (state) | `CPC30220` Cert III in Carpentry / state `BGB8` |
| **Apprenticeship/Traineeship title** | **Set by the STA** | `CARPENTER`, code `AP01960` |
| **Occupation** | **ANZSCO** (ABS) | separate classification |

**Related but not equal** — "it may be exact to the occupation but not always." One string is wrong.

- Occupation from **ANZSCO** (`abs.gov.au/statistics/data-integration`), plus **priority occupations**
  (`apprenticeships.gov.au/.../explore-priority-occupations`) — the latter drives priority wage-subsidy
  eligibility, so it is **funding-relevant, not cosmetic**.
- Apprenticeship title/code from the STA (e.g. WA DTWD curriculum search).
- Keep **TGA status** and **STA/DTWD status** separate — the example shows TGA `Current` alongside DTWD
  `Approved`; they can disagree.
- Capture **training-contract conditions** (e.g. elite athletes: minimum 7.5 hrs/week averaged over six
  months) as structured data — it affects hours and therefore rates.

R8's Occupation selector is currently a stub — *"(not yet active)… phase-2 scope"*. This is phase 2.

**Done when:** a qualification whose apprenticeship title differs from its ANZSCO occupation round-trips
with all three preserved and distinct, and priority-occupation status is queryable for funding logic.

---

## Workstream D — Xero (audit complete; fix list)

**Goal:** no hardcoded tax treatment on a financial document; nothing reads as shipped that isn't.

### D1. GST hardcoded — cheapest win, same family as A4/B1

`_shared/xero-invoice-mapping.ts:219,236` hardcodes `taxType: 'OUTPUT'` on **every invoice line**. Xero
exposes `TaxRates` and the **`accounting.settings` scope is already granted** — no re-consent needed.
Replace with a per-tenant/per-account-code lookup.
**Done when:** a tenant with a non-default tax rate gets that rate on the invoice, mutation-tested.

### D2. Payroll AU: fully built, entirely unwired

`xeroAdapter.ts` (1134 lines) + `xeroPayrollAdapter.ts` (420 lines) model Employees, PayRuns, Payslips,
PayItems/EarningsRates, PayrollCalendars, `SuperFundID` — coded, unit-tested, **zero callers**. It could
not work if wired: OAuth requests only Accounting scopes (`xero-auth.ts:140-150`), **no `payroll.*`
scope**. The `xero-payroll-submit` function its ADR describes **does not exist**.
**Recommend park.** Activating = new scopes + re-consent + a new edge function + D4. Either way it must
stop reading as shipped.

### D3. Stale security warning *(verified — code is clean)*

`env.example:103-109` carries a `# ---- CRITICAL BUG ----` block about `VITE_XERO_CLIENT_SECRET` at
`xeroInvoiceAdapter.ts:62`. **Verified remediated** — the adapter invokes the edge function, its docstring
states the secret never leaves the server, grep finds no `VITE_XERO_CLIENT_SECRET` in `src/`. Correct the
note. **Operator question: was the secret rotated after that finding?**

### D4. Don't reintroduce the localStorage bug

`/payroll` was fixed (`payroll/index.tsx:104-116` reads `xero_connections` from the DB). But
`getStoredConnection()` (`xero-auth.ts:87`) is still localStorage-backed and the inert `XeroPayrollAdapter`
builds connection state from it (`xeroAdapter.ts:273-286, 939-943`).

### D5. Payroll tax is NOT in Xero — record the boundary

State payroll tax is a revenue-office levy, absent from Xero's Accounting **and** Payroll AU APIs.
`payrollTaxService` stays the source of truth. Record it so it isn't re-opened as a gap.

### D6. Skills cover the wrong half of Xero

`xero-integration` covers OAuth + **Accounting**. The doc's links are overwhelmingly **Payroll AU** —
earnings rates, pay items, super funds, leave, timesheets, STP — exactly where the rates live. Per the
doc's own instruction, extend it (or add `xero-payroll-au`), plus under-covered best practices:
account/items/tracking mapping, rounding, taxes, if-modified-since, paging, connection cleanup.

### D7. Other dead surface

`xero_m2m_connections` + `xero-token-exchange-cc` — built, **zero call sites**. Park or remove deliberately.

---

## Workstream E — Competitor parity (research only)

**Goal:** an evidence-linked gap ledger, not opinions. **No implementation this pass.**

| Ours | Theirs |
|---|---|
| R8 | RatesCalc (`api-demo.ratescalc.com/docs`) |
| CRM7 | Codehouse Workforce One |
| Payroll portal | Codehouse Anytime Timesheets |
| Conduit | Humanforce / LiveHire |

**Done when:** every matrix cell cites a source URL; gaps are ranked P0/P1/P2 with rationale.

---

## Workstream F — Carried-over

- **Q3 reconciliation → CLOSE** (moot). Employer state still worth populating for *future* quote
  correctness — data quality, not reconciliation.
- **TGA bulk sync** — SOAP returns **32.7 MB for one record**. Probe for a non-SOAP interface first; if
  none, GitHub Actions cron.
- **`ALTER ROLE authenticator SET pgrst.db_schemas`** — Hermes ran this live, outside a migration. Capture it.
- **bsuite#1688 (mine):** reconcile the 19 above-floor migrations missing from the ledger; sweep 5 braden
  migrations carrying `CREATE POLICY IF NOT EXISTS` — **do not lower `MIGRATION_FLOOR` first**.

---

## Workstream G — Dead & duplicate code cleanup

**Goal:** nothing in the tree reads as shipped that isn't, and no value has two sources of truth.

**Safety discipline (non-negotiable).** BSuite doctrine is *feature flags over hard deletions* and
*no downgrading features without human approval*. Several orphans below are **product decisions, not
junk** — 700-line pages someone built deliberately. So this lane runs
`dead-duplicate-code-audit` → classify → **operator approves per item** → remove, under
`cleanup-scope-enforcement` (execute only approved items; never widen scope mid-run). One agent's
git operation already destroyed three untracked docs this week — that is the failure mode being guarded.

### G1. Confirmed dead — safe to remove once approved

| Item | Evidence |
|---|---|
| `xero_m2m_connections` + `xero-token-exchange-cc` | client-credentials flow, **zero call sites** |
| BSU `notificationService` (460 lines) | never imported |
| `SettingsBranding` void in `App.tsx` | explicit dead artifact from a feature removal |
| `generateRateAdjustment`'s `billingModel` param | accepted, never read (found during crm7#1275) |
| 4 crm7 redirect stubs | `/whs/training/assign`, `/whs/reports/advanced`, `/activities/create`, `/settings/integrations/[id]` |

### G2. Duplicate sources of truth — collapse, don't delete

- **Payroll tax tables** — `payrollTaxService.ts:75-84` and `charge-calc/defaults.ts:4-13`; identical
  values, **no cross-import**, so a rate change won't propagate. (Also A2.)
- **Two calculation paths** — once A1 lands, whichever branch of `R8Calculator` is superseded becomes
  dead. **Remove it in the same PR as A1**, not later, or the divergence quietly returns.
- **Xero SDK vs raw `fetch`** — `xero-invoice-submit` uses `xero-node`; everything else uses `fetch`
  (per an ADR about Deno compat). Document which is canonical so the next author doesn't guess.

### G3. Orphan pages — product decisions, NOT cleanup

8 crm7 pages have no route and no import: `admin/change-of-year` (771L), `billing/reconciliation`
(608L), `compliance/avetmiss` (398L), `funding/incentive-calendar` (739L),
`field-officers/competency/assess` (468L), `contacts/groups/[id]/edit`, `contacts/groups/new`,
`custom/[slug]`.

**Do not delete these as dead code.** ~3,000 lines of deliberate work. Each needs a per-page verdict:
**route it**, **fold into an existing surface**, or **delete**. Present as a list with a
one-line recommendation each; the operator decides. `compliance/avetmiss` in particular — memory
records AVETMISS as *RTO* compliance, not GTO, so that one is likely genuinely out of scope.

### G4. Park, don't delete — Xero Payroll AU

`xeroAdapter.ts` (1134L) + `xeroPayrollAdapter.ts` (420L) are unwired but **not** junk — they implement
the operator-approved ADR architecture. Mark clearly as parked/not-activated (module docstring + the
crm7 reference doc) so nobody reads them as live. Deletion needs an explicit operator call.

**Done when:** every item is approved-and-removed, collapsed, or explicitly parked with a reason; a
follow-up grep proves no remaining references; tests and typecheck stay green; and no G3 page was
deleted without a recorded decision.

---

## Decisions flagged (proceeding on the recommendation, not blocking)

1. **"Build creation"** — named saveable builds (A3).
2. **Payroll tax exemption** — auto-zero + note (A2).
3. **R8 dashboards (B3)** — recommend moving to CRM7; keeping them needs an explicit read-only label.
4. **Xero Payroll AU** — park; ship D1/D3/D6 instead.
5. **TGA** — probe for non-SOAP before building a worker.
6. **Xero secret rotation** — operator to confirm.

---

## Definition of Done (gate — `definition-of-done` D1–D7)

No item flips to done, and no lane returns, until **all** hold:

1. **Code merged, CI green** (incl. pgTAP baseline-replay for DB changes).
2. **Mutation-tested** — revert the fix, confirm red, restore, confirm green. Both observations reported.
   A test that passes either way is not evidence.
3. **No representative figures** — grep the diff; every displayed number is computed for that record or is
   a genuine user input.
4. **Two red-team rounds** complete; zero Critical/High open.
5. **Live-catalog verified** for any DB claim — `pg_policies` / `pg_proc` / `schema_migrations` via
   Supabase MCP. A green applier run is **not** evidence (bsuite#1688).
6. **Deployed-domain evidence (§12.3)** — signed-in session on `d.r8.crm7.app` (A/B/C) or
   `d.crm.crm7.app` (D), screenshots, clean console, expected network calls. Local CI is necessary,
   never sufficient.
7. **Docs + dashboard + issue closed** in the same session, with evidence URLs.
8. **No dead code left behind** — if the change supersedes a path, the superseded path goes in the
   **same PR**. Deferring it is how the two divergent calculation paths happened.

**Order:** A1 (+G2 same PR) → A2 → B1/B2 → A3 → B5 → C → D1/D3/D6 → G1 → E.
B3, D2 and G3 wait on rulings.

## Open questions for the operator

1. **B3** — move Placements/Completions/Training Hours to CRM7, or keep as labelled read-only views?
2. **G3** — per-page verdict on the 8 orphan crm7 pages (~3,000 lines).
3. **D3** — was the Xero client secret rotated after the historical client-side finding?
4. **"Build creation"** — confirm named saveable builds is what you meant (proceeding on it either way,
   since it is the prerequisite for bulk).
