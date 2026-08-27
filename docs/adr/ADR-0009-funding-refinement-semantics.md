---
kind: decision
authority: engineering
owner: bsuite
---

# ADR-0009 — Funding Refinement Semantics: the placement-time look at funding replaces, it does not add

**Status:** Accepted
**Ratified:** 2026-08-26 (operator ruling, Braden Lang)
**Built?** ✅ live in crm7 (separate-ledger model); ❌ contradicted by one unwired R80.4 module — see Consequences
**Related:** [ADR-0005](ADR-0005-rams-funding-authoring.md) (superseded — established that calculation belongs to R80.4 and crm7 records rather than decides); `crm7/docs/adr/20260423-calc-engine-single-source-v1.00W.md`; migration `crm7/supabase/migrations/20260830010000_retire_funding_offsets_scheme_model.sql`

## Context

ADR-0005's superseding ruling settled *who* calculates funding: R80.4 owns it, crm7 records
it, no engine decides eligibility. It did not settle *what happens to the funding figure when
a quote becomes a placement* — and that gap let two contradictory models coexist in the tree.

A GTO quotes a host employer before it knows which individual will fill the placement. At quote
time, funding is a **broad category estimate**: this kind of apprentice, in this award, in this
region, typically attracts this much. Later — once the placement exists, the training contract
is sighted, and evidence against the funding criteria is gathered — the GTO knows the **specific
amount available for that individual**. That amount may be higher or lower than the estimate.

The question this ADR answers: is the second look a *second set of funding*, or a *refinement of
the first*?

## Decision

**It is a refinement. The placement-time figure replaces the quote-time estimate. It is never
added to it, and it never nets against a charge rate a second time.**

Three rules follow, and they are binding:

1. **Total funding available in the quote is the only funding figure that matters.** There is one
   funding amount per engagement, and the placement-time evaluation restates it at higher
   precision. Going from broad category to individual-specific is not a second entitlement.

2. **Funding is claimed, not discounted.** Funding is money claimed *from* the funding body and
   tracked in its own ledger (`funding_claims`, `funding_milestones`, `funding_sources`). It does
   **not** reduce `placements.charge_rate` and it does **not** reduce what the host is invoiced.
   Where funding must appear on an invoice it appears as a **separate line item**
   (`billingEngine.addSubsidyCreditLine()` — the ATO requires the apprentice's name on it), never
   as an adjustment to the wages line's rate.

3. **R80.4's calculation is the only acceptable method.** Restated from the ruling already
   recorded in `20260830010000_retire_funding_offsets_scheme_model.sql`. Any second mechanism that
   reduces the same charge rate is a double-count by construction, regardless of whether a guard
   is present.

## Rationale

The live estate already implements this, and it implements it correctly:

- `charge_rate_quotes_propagate_approval()` writes the approved R80.4 quote onto the placement
  with a straight **overwrite** — `SET charge_rate = COALESCE(NEW.charge_rate_hourly, charge_rate)`
  — never an arithmetic adjustment against a prior value.
- `billingEngine.ts` prices the wages line directly off `placements.charge_rate`
  (`group.totalHours * group.chargeRate`). No funding math touches it.
- `funding_claims` / `funding_milestones` / `funding_sources` and `fundingService.ts` do not
  reference `placements` or `charge_rate` at all. Two ledgers, no crossing.
- `funding_offsets` — the one table that *did* apply a subsidy scheme to a placement's charge
  rate — was retired by name on 2026-08-30, writes revoked and trigger-refused, under the ruling
  that *"it reduces the SAME charge rate the milestone model reduces… both live is a
  double-count."*

So this ADR does not introduce a new model. It writes down the one already in force, because the
reasoning currently survives only as a comment inside a migration that revokes grants — and an
agent reading the schema finds the revocation without the reason.

## Consequences

**One module contradicts this ADR and must not be wired as written.**

`R80.4 src/awards/quotes.ts :: applyPlacementFunding` implements the **additive** model:

```js
// quote time — src/awards/calculate.ts
rates.ord = { ..., funded: quoted - fundingPH, funding: fundingPH }

// placement time — src/awards/quotes.ts
const next = { ...placement, hourly: round2(placement.hourly - additionalPerHour) }
```

`placement.hourly` originates from the already-funding-netted quote rate, and this subtracts
again. The `inheritedProgramIds` exclusion list exists to stop a re-elected program being
subtracted twice, and is permanently `[]` because nothing writes `quote.meta.fundingProgramIds`.

**The empty guard is the lesser defect. The model is the defect.** Under this ADR there is nothing
to inherit and nothing to exclude, because the placement figure supersedes the estimate rather
than stacking on it. Writing `fundingProgramIds` would make the guard function and leave the
module implementing a model the estate has rejected.

Required actions:

- **Do not** fix `applyPlacementFunding` by populating `quote.meta.fundingProgramIds`.
- Either delete the `FundingProgram` path, or re-spec it to replacement semantics. Deletion is
  preferred: crm7 already owns the second look and already keeps it off the charge rate.
- The panel that would call it stays unbuilt until one of those happens.
- The same shape exists on the crm7 side: `placements.funding_json` → `usePlacementChargeCalc` →
  `@bsuite/charge-calc.calculate()` is present in schema and hook but never populated by
  `ChargeRateCard.tsx` or `create.tsx`, so `cfg.funding` always falls through to empty. Wiring it
  without applying this ADR would re-create exactly what `funding_offsets` was killed for.

**Not a production defect.** No shipped surface calls `applyPlacementFunding`; the live calculator
prices through `FundingScheme`. This is a latent contradiction in modelled-but-unreached code, and
it is recorded here so the next lane to open that panel finds the ruling rather than only the
revoked grants.

## Measured state (2026-08-26, at `R80.4@8e74a61` / `crm7@62fd36e`)

| Claim | Verified against |
|---|---|
| Placement rate is an overwrite, not an adjustment | `20260704130000_charge_rate_snapshots_and_propagation.sql` |
| Invoice prices off `placements.charge_rate` verbatim | `crm7/src/lib/billingEngine.ts` |
| Funding ledger never references charge rate | `fundingService.ts`; `funding_claims` / `funding_milestones` / `funding_sources` schema |
| Subsidy appears as a separate invoice line | `billingEngine.addSubsidyCreditLine()` |
| `funding_offsets` retired to prevent double-count | `20260830010000_retire_funding_offsets_scheme_model.sql` |
| `applyPlacementFunding` is additive | `R80.4 src/awards/quotes.ts`; `src/awards/calculate.ts` |
| `quote.meta.fundingProgramIds` has no writer | repo-wide search, corroborated by `R80.4 docs/00-roadmap/20260818-r804-master-roadmap-v1.00A.md` |
| `applyPlacementFunding` has no live call site | `R80.4` UI prices via `FundingScheme` (27 refs) |
