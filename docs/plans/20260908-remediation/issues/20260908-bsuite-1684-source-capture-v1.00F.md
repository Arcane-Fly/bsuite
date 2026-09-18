---
kind: record
authority: none
owner: bsuite
---

# [architecture] One-shot drift: Charge Calculations are R8-owned by doctrine but authored in crm7 — root cause of crm7#1265 and register #11

https://github.com/GaryOcean428/bsuite/issues/1684

Snapshot updatedAt: 2026-08-26T12:23:00Z. Open at capture; re-read live.

Surfaced independently by two verification passes on 2026-07-28 (the Task 4 code review and the
R8-as-rates-engine architecture spec). Filing so it is tracked rather than rediscovered a third time.

## The drift

`docs/20260227-dry-one-shot-architecture-v1.02A.md` §1 states:

| Entity | Owner | Readers |
|---|---|---|
| **Charge Calculations** | **R8** | CRM7 (invoicing) |
| **Award Rates** | **R8** | CRM7 (payroll ref) |
| **Funding Offsets** | **R8** | CRM7, BSU |

But in practice `charge_rate_quotes`, `charge_rate_snapshots` and the `/charge-rates` UI all live in
**crm7**, and the approval trigger in crm7 writes `placements.charge_rate` / `hourly_rate` /
`margin_rate` directly. So the entity the doctrine assigns to R8 is authored, versioned and approved
in crm7.

## Why it matters — this is not bookkeeping

Two independent P0-class defects this window trace back to this drift:

1. **crm7#1265** — crm7 assembles its own `crmCalcInput` and computes a charge rate with
   `DEFAULT_COST_CONFIG.payrollTaxRate` (0.0485, Victoria) for **every** tenant. WA is 5.5%.
   The GTO under-charges the host employer by ~$321/apprentice/yr. crm7 would not be computing
   this at all if the doctrine were held.
2. **Register #11** — `AdvancedConfigSection.tsx` renders hard-coded `@bsuite/charge-calc` package
   defaults as static `<li>` text instead of the apprentice's real values, because there is no
   read path from crm7 to R8's computed values.

A Task 4 verifier also confirmed there is **no cross-app read path from crm7 into the R80.3 app
anywhere in the codebase today** — only shared-package `@bsuite/charge-calc` imports, which are a
calculation *library*, not a read of R8's owned data. So "CRM7 reads R8" is currently aspirational.

## Compounding: two rival versioning schemas

The architecture spec (`docs/plans/20260728-r8-as-rates-engine-architecture-v1.00D.md`) found two
disconnected versioned-rate schemas that are unaware of each other:
- R8's `charge_rate_schedules` / `host_charge_rates` — better designed, **completely unwired (dead code)**
- crm7's `ChargeRateSnapshot` — live and working, but arguably in the wrong app

## Decision required (operator)

Which becomes canonical. The spec's recommended default: keep crm7's `ChargeRateSnapshot` as interim
canonical **but source its `calc_result` from R8** rather than a locally-reseeded engine call, and
formally deprecate R8's dead tables. That is a recommendation, not a ruling.

Strategic context: the operator has directed that **R8 should work like RatesCalc and crm7 should act
like an integration would for RatesCalc** — which points the same way (R8 as the rates engine with a
consumable surface, crm7 as a consumer).

## Also flag
The ownership doc is inconsistently versioned: the filename and §11 say `v1.02A`, but its own
changelog header claims `v1.04A`, and no `v1.03A`/`v1.04A` exists on disk. Content reads as current;
only the stamp is stale. Resolve so the canonical version is unambiguous.

## Acceptance criteria
- A written ruling on which schema is canonical, recorded in the ownership doc.
- crm7 stops computing charge rates locally; it reads R8's owned values.
- The ownership doc's version stamp is made consistent.
- A lint or contract test prevents a new local recomputation of an R8-owned entity.
