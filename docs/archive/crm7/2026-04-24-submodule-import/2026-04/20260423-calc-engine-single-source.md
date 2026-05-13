# ADR-001 · `@bsuite/charge-calc` as Single-Source Calculation Engine

> **⚠️ Archive copy — not the source of truth.**
> Canonical location (local path): [`crm7/docs/adr/20260423-calc-engine-single-source.md`](../../../../../crm7/docs/adr/20260423-calc-engine-single-source.md)
> Canonical location (GitHub): <https://github.com/GaryOcean428/crm7/blob/development/docs/adr/20260423-calc-engine-single-source.md>
> This file is retained for submodule-import provenance only. Any updates must be made to the canonical copy.
> Cross-reference added per [HF-3 / issue #862](https://github.com/GaryOcean428/bsuite/issues/862) on 2026-05-13.

---

**Date:** 2026-04-23  
**Status:** Accepted  
**Deciders:** Braden Lang (GTO Product Owner), Computer (AI architect)  
**Supersedes:** N/A — first formal ADR for this decision space

---

## Context

BSuite was developed across three separate apps (R80.3, CRM7, business-suite-unified)
with overlapping charge-rate calculation logic. At the point of this ADR three partial
implementations existed:

1. **`packages/charge-calc`** — the shared package, containing `calculate.ts` (the cost
   engine), `mapd-mapper.ts` (MAPD API normalization), and `billing.ts`. Published as
   `@bsuite/charge-calc`.

2. **R80.3 `calcBridge.ts`** — a thin adapter around `@bsuite/charge-calc`; calls
   `toCalcConfig` → `sharedCalculate` → `fromCalcResult`. Already the canonical path.

3. **CRM7 `crmCalcBridge.ts`** — also wraps `@bsuite/charge-calc`; mirrors R80.3's
   pattern for payroll-side rate display.

A fourth "engine" existed implicitly in `R80.3/src/services/awardRulesEngine.ts` — a
rules engine for legal wage resolution. This is NOT a separate calculator; it resolves
the legally correct wage rate that is then passed *into* `@bsuite/charge-calc`.

---

## Decision

**`@bsuite/charge-calc` is the canonical, single-source calculation engine for all
charge-rate, payroll-rate, and cost calculations across BSuite.**

The calc-bridge pattern (a thin adapter between app-level rate resolution and the shared
engine) is the approved integration method.

```
App Rate Resolution (R80.3 awardRulesEngine / CRM7 crmCalcBridge)
    │
    ▼
@bsuite/charge-calc (sharedCalculate / calculate.ts)   ← CANONICAL ENGINE
    │
    ▼
CalcResult → charge rates, payroll rates, on-cost totals
```

No third engine shall be introduced. Any new calculation requirement is implemented
inside `@bsuite/charge-calc` first, then exposed via the bridge.

### Data flow authority

| Data | Authority | Reads |
|---|---|---|
| FWC award rates | R80.3 `fairworkApi.ts` (live MAPD API + DB cache) | CRM7 reads via `award_rates` / `host_charge_rates` tables |
| Apprentice rate configs | CRM7 `apprentice_rate_configs` Supabase table (seeded + tenant overrides) | R80.3 reads via `fairworkApi.fetchApprenticeRateConfigs()` |
| Legal wage resolution | R80.3 `awardRulesEngine.ts` | Wraps both sources above; output → calcBridge |
| Cost calculation | `@bsuite/charge-calc` (canonical engine) | Receives resolved wage + config |
| Host charge rates | Written by R80.3 `crm7SyncService.ts` → `host_charge_rates` | CRM7 reads for invoicing |
| Payroll runs | CRM7 `chargeToPayroll.ts` → `PayrollAdapter` | Xero Payroll AU API passthrough |

---

## Consequences

### Positive
- Single implementation eliminates divergence risk (previously annual allowances were
  calculated differently in each app; BUG-1 would have been caught earlier).
- New rate rules (e.g. SBA/SBT supplements, EBA overrides) are added once, in
  `@bsuite/charge-calc`, and flow to all apps.
- Testability: `@bsuite/charge-calc` has its own test suite independent of any app.
- Compliance audit: every rate calculation passes through the same audited code path.

### Negative / Trade-offs
- App-level UI logic (e.g. CRM7's `AwardRateSelector`) must remain coordinated with
  R80.3's rate fetch. This is managed via the `apprentice_rate_configs` table (CRM7 owns,
  R80.3 reads via `fetchApprenticeRateConfigs`).
- Any breaking change to `CalcConfig` or `CalcResult` types in `@bsuite/charge-calc`
  must be coordinated across both bridges. Semantic versioning is enforced on the package.

### Bugs fixed as part of this ADR (WS-1)

| Bug | Location | Fix |
|---|---|---|
| BUG-1 CRITICAL | `mapd-mapper.ts` `mapWageAllowance` / `mapExpenseAllowance` | Annual allowance amounts now divided by 52 before entering `CalcConfig`. A new `isAnnualFrequency()` helper is exported and 4 regression tests added. |
| BUG-2 HIGH | `chargeToPayroll.ts:44`, `jodie-persona.ts:94` | Payday Super employer deadline corrected to 7 business days (Treasury Laws Amendment 2023). |
| BUG-4 HIGH | R80.3 rules engine / fairworkApi | `fetchApprenticeRateConfigs()` added to `fairworkApi.ts`; `ResolveRatePackageInput` extended with `apprenticeRateConfigs?`; Step 2b in `resolveRatePackage` applies percentage overrides while preserving FWC legal floor. |
| BUG-5 LOW | `R80.3/src/types/index.ts` JSDoc | `superRate` comment updated to reflect 12% (1 July 2025). |

---

## Compliance Notes

- **Payday Super:** 7 business days (not 3) from pay run to fund receipt. Effective 1 July 2026.
  Treasury Laws Amendment (Better Targeted Superannuation Debate) Act 2023.
- **Annual Minimum Wage:** Award rates change 1 July annually. `fetchApprenticeRateConfigs`
  rows with `effective_to IS NULL` are the live rates. A pg_cron job fires 1 July to trigger
  a review notification.
- **SG Rate:** 12% from 1 July 2025. Will rise to 12% (no further increases legislated).
  All references to 11.5% in JSDoc are now corrected.

---

## Related

- [Master Implementation Plan v1.00W](../plans/20260423-bsuite-gto-master-plan-v1.00W.md)
- [GTO Billing Reporting Plan](../plans/gto-billing-reporting-refined.md)
- [Apprentice Rate Configs Plan](../plans/apprentice-rate-configs-refined.md)
- WS-2: MAPD Edge Function (next — depends on this ADR being implemented)
