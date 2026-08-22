# Refined prompt — billing-model label truthfulness (R80.3)

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Tier: **Standard** (3 workstreams, compliance-critical surface, domain ambiguity pre-resolved by operator).

## Intent

An earlier fix relabelled the invoice billing model from `"Standard"` to `"Standard (39-Week)"` to
match the self-describing `ALEX48 → "ALEX 48-Week"` and `W52 → "52-Week"`. The operator rejected it:
**"Standard" is standard because it is COMMON, not because it is fixed.** Billable weeks under the
Standard model are *derived* from several variables that differ by circumstance and by award, so no
fixed figure can be asserted on an invoice. Remove the invented number; make the label truthful.

## Grounding (already verified — do not re-derive)

`packages/charge-calc/src/billing.ts:39-43`:
```ts
function standardBillableWeeks(input: BillableWeeksInput): number {
  const alWeeks   = input.annualLeaveDays   / input.daysPerWeek;
  const phWeeks   = input.publicHolidayDays / input.daysPerWeek;
  const sickWeeks = input.sickLeaveDays     / input.daysPerWeek;
  return 52 - alWeeks - phWeeks - sickWeeks - input.trainingWeeks;
}
```
Every term varies: leave entitlements, public holidays (state-dependent), `daysPerWeek` (employment
arrangement), and `trainingWeeks` — which varies by **award** and by **apprentice year**
(`calculate.ts:140-141` selects `trainingWeeksPerYear[currentYear - 1]`).

`packages/charge-calc/src/types.ts:85` already says so:
```ts
Standard: 39,  // fallback only — call calculateBillableWeeks() for leave-adjusted value
```
**39 is a fallback constant, not the fact.** The label asserted the fallback as if it were the answer.

**ALEX48 and W52 are genuinely fixed** — `billing.ts:24-27` hard-returns 48 and 52. Their
self-describing labels are correct and must NOT be changed.

## Decomposition

1. Make the Standard label truthful in `R80.3/src/services/invoicingService.ts`
   (`billingModelDisplayLabel`).
2. Audit the whole codebase for any other place a billing-week figure is asserted as fixed for the
   Standard model — labels, help text, docs, tooltips, tests, seed data.
3. Decide whether the invoice line should show the **actual computed** billable weeks for that record
   (the data is present at render time) rather than a generic label.

## Blindspots to counter

- **Substituting one wrong constant for another.** Do not write "Standard (~39 weeks)" or
  "Standard (39-week typical)" — a hedge word around an invented number is still an invented number
  on a legal document.
- **Treating the fallback as documentation.** `BILLING_MODEL_WEEKS.Standard = 39` exists for a
  degraded path; it is not a description of the model.
- **Over-reaching into ALEX48/W52.** Those numbers are real. Leave them.
- **Changing the stored enum.** `BillingModelType = 'Standard'|'ALEX48'|'W52'|'Custom'` is persisted
  on every invoice line. Display only — a stored-value change is a data migration and is out of scope.
- **Rendering a number the record cannot support.** If actual weeks are shown, they must come from
  `calculateBillableWeeks()` for *that* line, never a default.

## The refined prompt

In `R80.3` (compliance-critical wage/charge calculator), fix `billingModelDisplayLabel` in
`src/services/invoicingService.ts` so the **Standard** billing model no longer asserts a fixed week
count on invoices.

Preferred solution, if the data is available at that render point: show the **actual computed
billable weeks for that invoice line**, sourced from `calculateBillableWeeks()`. That is strictly
better than any label, because it is true for that record.

If the computed value is genuinely not available there, fall back to a label that describes the model
without a number — it is derived from 52 weeks less annual leave, public holidays, sick leave and
training weeks, all of which vary by award and circumstance. Say that, or say nothing numeric. Do not
invent, approximate, or hedge a figure.

Leave `ALEX48` and `W52` exactly as they are — those counts are genuinely fixed.
Do not change the stored `BillingModelType` enum.

Then audit the rest of the monorepo (all 6 apps + `packages/`) for any other assertion that the
Standard model is a fixed number of weeks — UI copy, tooltips, docs, comments that state it as fact
rather than as a fallback, and tests that bake 39 in as an expectation of the *model* rather than of a
specific input set. Report each with a verdict; fix the ones that are assertions, leave the ones that
are legitimately testing the fallback path.

## Skills & MCPs to use

- `award-interpretation-boot` — BOOT / award-interpretation domain rules for R80.3 and `@bsuite/charge-calc`.
- `test-driven-development` — the regression test must fail if a fixed figure is reintroduced.
- `verification-before-completion` — evidence before any completion claim.
- `bsuite-react-testing` — vitest + Testing Library idioms for the R80.3 suite.
- No MCP needed; this is local-source work. Do not query Context7 — the authority is this repo's own
  `billing.ts`, not an external library.
