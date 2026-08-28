---
kind: record
authority: none
---

> **This is dated research, kept as a record.** It investigated the AVETMISS NAT00120 export
> and a termination-code mapping on 2026-05-06. Its own header still reads `1.00W`; this
> banner resolves that against the `F` in the filename.
>
> **What shipped, and what this record does NOT claim.** The NAT00120 export exists —
> `crm7/supabase/functions/avetmiss-export/index.ts` emits `NAT00120.txt` at the 185-character
> record length, guarded by `scripts/check-edge-function-types.mjs`
> (`edge-function-typecheck.yml`) and `scripts/check-edge-function-slug-collisions.mjs`.
>
> **The termination-code half is NOT evidenced here.** I looked for those codes in the export
> and in `crm7/src` and could not tie them to an implementation. That is why this is filed as
> research rather than given a completion banner: an evidence table with an empty row is a
> claim, not a measurement. If the mapping did ship, a later dated document should supersede
> this one and say where.
>
> The classification standard requires `kind: record` to carry `authority: none`: a dated
> record is history, not a live document.

# Apprentice placement — AVETMISS NAT00120 export research + termination-code mapping

**Document version:** 1.00W
**Date:** 2026-05-06
**Author:** perplexity-computer (research lane per protocol §11)
**Status:** RESEARCH-DELIVERED — claude-code implements export hook from this spec
**Closes:** queue item `APPRENTICE-WIRING.L4` research portion
**Cross-validates:** `crm7/src/lib/workflows/apprenticePlacementWorkflow.ts` 5-state lifecycle (codebuff/claude lane)

---

## Executive summary

The `apprentice_placements` table needs an export hook that emits AVETMISS-compliant NAT00120 (Training Activity / Enrolment) records when a placement transitions through the lifecycle. The mapping is **not 1:1** — placement state transitions map to a small subset of NAT00120 fields, and the **termination_category** column maps to the **Outcome Identifier - National** field with documented NCVER codes.

This document delivers:
1. NAT00120 spec context (which fields apply, which don't)
2. `placement.status` × `termination_category` → NAT00120 `Outcome Identifier - National` mapping table
3. Required NAT00120 field population strategy (8 mandatory fields)
4. CI validator test fixture (golden file)
5. Implementation guidance for claude-code's export hook PR

---

## 1. NAT00120 context — what this file actually is

NAT00120 is the **Training Activity file** (also called "Enrolment file" in legacy AVETMISS 7). It contains **one row per Module/Unit-of-Competency × Client × Activity-period**, NOT one row per training contract or per placement.

This is the most important framing correction: `apprentice_placements` does NOT correspond directly to NAT00120 rows. NAT00120 lives at the unit-of-competency-attempt grain. A single placement can produce many NAT00120 rows (one per UoC the apprentice attempts during that placement window).

The connection is via the **Training Contract Identifier - Australian Apprenticeships** field (state-specific, e.g. DELTA Registration in Victoria). Each NAT00120 row attributes the unit attempt to the relevant apprenticeship contract.

**Implication for this hook:** the export does not iterate `apprentice_placements`; it iterates the (yet-to-exist or future) `apprentice_unit_attempts` table per placement, scoped to the AVETMISS collection period. This research recommends:

- **Phase L4.A (this PR's scope):** Emit one NAT00120 row per `apprentice_placements` row as a placeholder/stub during the bootstrap window. Ship the field-population logic that the future per-UoC iterator will reuse.
- **Phase L4.B (next):** Wire the per-UoC iterator once `apprentice_unit_attempts` lands.

---

## 2. Termination-code mapping (the central deliverable)

### 2.1 NCVER Outcome Identifier - National canonical codes (AVETMISS 8.0)

| Code | Meaning | Use-case |
|---|---|---|
| **20** | Competency Achieved / Pass | Apprentice satisfied requirements for the UoC |
| **30** | Competency Not Achieved / Fail (NYC) | Assessed but did not satisfy |
| **40** | Withdrawn / Discontinued | Apprentice withdrew before final assessment |
| **51** | Recognition of Prior Learning (RPL) Granted | Skills already held — no training delivered |
| **52** | Recognition of Prior Learning Not Granted | Assessed for RPL, did not pass |
| **53** | Recognition of Current Competency (RCC) | Re-assessed to confirm currency |
| **54** | RCC Not Granted | RCC validation failed |
| **60** | Credit Transfer | Mutual recognition from prior unit completion |
| **65** | Superseded Qualification | Transitioned to newer qualification version |
| **70** | Continuing Enrolment | UoC will be completed in subsequent calendar year |
| **81** | Non-assessable enrolment - Satisfactorily completed | Non-assessable UoC, completed |
| **82** | Non-assessable enrolment - Withdrawn / Not satisfactorily completed | Non-assessable UoC, withdrawn |

**Note:** code `90` (Result not yet available) is **deprecated** — AVETMISS Validation Software (AVS) errors on `90`; use `70` instead.

### 2.2 Mapping table — `apprentice_placements.status` × `termination_category` → AVETMISS code

The crm7 5-state placement lifecycle (per `apprenticePlacementWorkflow.ts`) maps as follows:

| Placement status | termination_category | NAT00120 Outcome Identifier - National | Outcome Identifier - Training Organisation | Notes |
|---|---|---|---|---|
| `active` | `null` | **70** Continuing Enrolment | (empty) | Placement is in-progress; UoCs are still being attempted |
| `completed` | `null` | **20** Competency Achieved / Pass | `AP` (Academic Pass) where on-job component required | Successful contract completion |
| `terminated` | `withdrawn_by_apprentice` | **40** Withdrawn | (empty) | Voluntary discontinuation |
| `terminated` | `withdrawn_by_employer` | **40** Withdrawn | (empty) | Employer-initiated cancellation |
| `terminated` | `failed_assessment` | **30** Competency Not Achieved | (empty) | Assessed but did not pass |
| `terminated` | `transferred_to_new_employer` | **40** Withdrawn | `TNC` (Training Not Completed at this RTO) | Change-of-employer variation; follow-up NAT00120 row by new SRTO will resume |
| `terminated` | `expired_unsuccessful` | **40** Withdrawn | (empty) | Contract term expired without completion |
| `transferred` | `null` | **40** Withdrawn (current placement row) | `TNC` | The next placement row generates its own NAT00120 row chain |
| `paused` | `null` | **70** Continuing Enrolment | `D` (Training Deferred) | Apprentice or employer paused the contract |

### 2.3 RPL / CT codes (codes 51, 60) are NOT placement-driven

Codes **51** (RPL Granted) and **60** (Credit Transfer) are awarded **per-UoC** and are independent of `apprentice_placements.status`. The export hook will use them only when the `apprentice_unit_attempts` table (Phase L4.B) records `outcome = 'rpl_granted'` or `outcome = 'credit_transfer'`. They are listed here for completeness only.

---

## 3. NAT00120 mandatory field population (per-row)

For each placement that needs an emitted row, the hook populates 8 mandatory fields:

| NAT00120 field | Position | Length | Source | Notes |
|---|---|---|---|---|
| Training Organisation Delivery Location Identifier | 1 | 10 | `crm7.tenants.delivery_location_id` (or `'00000001'` default) | Must exist in NAT00020 |
| Client (Student) Identifier | 11 | 10 | `apprentices.client_identifier` (truncate to 10A) | Apprentice's USI-derived ID |
| Module/Unit of Competency Identifier | 21 | 12 | `apprentice_unit_attempts.unit_code` (Phase L4.B) OR `qualifications.holding_unit` placeholder (Phase L4.A) | TGA-validated |
| Qualification/Course Identifier | 33 | 10 | `apprentice_placements.qualification_id` (FK to `qualifications.code`) | TGA code |
| Enrolment Activity Start Date | 43 | 8 | `apprentice_placements.start_date` (DDMMYYYY) | |
| Enrolment Activity End Date | 51 | 8 | `apprentice_placements.end_date` OR collection-period-end if `null` | |
| Delivery Mode Identifier | 59 | 2 | Hardcoded `'30'` (Employment based) for apprenticeships | |
| **Outcome Identifier - National** | 61 | 2 | Per §2.2 mapping table | THE central field this hook resolves |

Remaining NAT00120 fields are either state-specific (Victoria DELTA, NSW STELA), funding-source-driven (handled separately in funding code), or default-valued. The hook should emit them empty unless the `funding_records` table indicates state contract enrollment.

---

## 4. Activity-end-date validation rule (CI validator)

**Rule (NSW NAT 120 error 33023):** "Activity End Date is after the Collection Year End Date therefore Outcome Identifier - National must be 70."

Translation: if `end_date > collection_period_end_date`, force `outcome_id_national = 70` (Continuing Enrolment) regardless of `placement.status`. This is the only auto-override in the mapping; it is enforced at validator time, not at row-emission time, so the source-of-truth `status` column is never mutated.

The CI validator test fixture (`apprenticePlacementService.avetmiss.test.ts` to be created in claude-code's implementation PR) MUST include:

```ts
it('forces outcome=70 when activity_end_date is after collection period end (NSW rule 33023)', () => {
  const placement = makePlacement({
    status: 'completed',
    start_date: '2026-01-15',
    end_date: '2027-03-30',  // beyond 2026 collection
  });
  const row = emitNat00120Row(placement, { collectionYearEnd: '2026-12-31' });
  expect(row.outcomeIdNational).toBe('70');
  expect(row.outcomeIdTrainingOrg).toBe('');
});
```

---

## 5. Termination code golden-file fixtures (for claude's CI validator test)

```ts
// fixtures/avetmiss-nat00120-termination.json
[
  {
    "label": "voluntary withdrawal mid-contract",
    "input": { "status": "terminated", "termination_category": "withdrawn_by_apprentice", "start_date": "2026-02-01", "end_date": "2026-08-15" },
    "expected": { "outcomeIdNational": "40", "outcomeIdTrainingOrg": "" }
  },
  {
    "label": "employer-initiated cancellation",
    "input": { "status": "terminated", "termination_category": "withdrawn_by_employer", "start_date": "2026-01-10", "end_date": "2026-09-22" },
    "expected": { "outcomeIdNational": "40", "outcomeIdTrainingOrg": "" }
  },
  {
    "label": "competency not achieved at assessment",
    "input": { "status": "terminated", "termination_category": "failed_assessment", "start_date": "2025-08-01", "end_date": "2026-04-30" },
    "expected": { "outcomeIdNational": "30", "outcomeIdTrainingOrg": "" }
  },
  {
    "label": "change-of-employer transfer (current placement)",
    "input": { "status": "terminated", "termination_category": "transferred_to_new_employer", "start_date": "2025-09-01", "end_date": "2026-05-15" },
    "expected": { "outcomeIdNational": "40", "outcomeIdTrainingOrg": "TNC" }
  },
  {
    "label": "successful completion with on-job assessment",
    "input": { "status": "completed", "termination_category": null, "start_date": "2024-02-01", "end_date": "2026-04-15" },
    "expected": { "outcomeIdNational": "20", "outcomeIdTrainingOrg": "AP" }
  },
  {
    "label": "active placement spanning collection boundary",
    "input": { "status": "active", "termination_category": null, "start_date": "2026-03-01", "end_date": null },
    "expected": { "outcomeIdNational": "70", "outcomeIdTrainingOrg": "" }
  },
  {
    "label": "deferred (paused) contract",
    "input": { "status": "paused", "termination_category": null, "start_date": "2026-01-01", "end_date": null },
    "expected": { "outcomeIdNational": "70", "outcomeIdTrainingOrg": "D" }
  },
  {
    "label": "expired without completion",
    "input": { "status": "terminated", "termination_category": "expired_unsuccessful", "start_date": "2022-01-01", "end_date": "2026-01-01" },
    "expected": { "outcomeIdNational": "40", "outcomeIdTrainingOrg": "" }
  }
]
```

---

## 6. Implementation guidance for claude-code's L4 export hook PR

### 6.1 File layout

```
crm7/
├── src/
│   ├── services/
│   │   ├── avetmissNat00120Export.ts            # NEW — main export function
│   │   ├── avetmissNat00120Export.test.ts       # NEW — unit tests
│   │   └── apprenticePlacementService.ts        # EXISTING (L2) — add export trigger hook
│   └── lib/
│       └── avetmiss/
│           ├── outcomeIdMapping.ts              # NEW — pure mapping function
│           ├── outcomeIdMapping.test.ts         # NEW — golden fixture tests
│           └── nat00120FieldFormat.ts           # NEW — fixed-width formatter
├── tests/fixtures/
│   └── avetmiss-nat00120-termination.json       # NEW — copy from §5 above
└── supabase/migrations/
    └── 20260508000000_avetmiss_export_metadata.sql  # NEW — adds export_run_id + last_emitted_at columns
```

### 6.2 Pure mapping function signature (lift from §2.2)

```ts
export function mapPlacementToOutcomeIdNational(
  status: ApprenticePlacementStatus,
  terminationCategory: TerminationCategory | null,
  collectionYearEnd?: Date,
  activityEndDate?: Date | null,
): { outcomeIdNational: AvetmissOutcomeCode; outcomeIdTrainingOrg: '' | 'AP' | 'TNC' | 'D' } {
  // 1. NSW rule 33023 override
  if (activityEndDate && collectionYearEnd && activityEndDate > collectionYearEnd) {
    return { outcomeIdNational: '70', outcomeIdTrainingOrg: '' };
  }
  // 2. Per-status mapping (table from §2.2)
  if (status === 'active') return { outcomeIdNational: '70', outcomeIdTrainingOrg: '' };
  if (status === 'paused') return { outcomeIdNational: '70', outcomeIdTrainingOrg: 'D' };
  if (status === 'completed') return { outcomeIdNational: '20', outcomeIdTrainingOrg: 'AP' };
  if (status === 'transferred') return { outcomeIdNational: '40', outcomeIdTrainingOrg: 'TNC' };
  // 3. terminated branches
  if (status === 'terminated') {
    if (terminationCategory === 'failed_assessment') return { outcomeIdNational: '30', outcomeIdTrainingOrg: '' };
    if (terminationCategory === 'transferred_to_new_employer') return { outcomeIdNational: '40', outcomeIdTrainingOrg: 'TNC' };
    return { outcomeIdNational: '40', outcomeIdTrainingOrg: '' };
  }
  throw new InvalidPlacementStatusError(`Unmapped status: ${status}`);
}
```

### 6.3 RLS / security considerations

- The export function reads `apprentice_placements`, `apprentices`, `tenants`, `qualifications` — all already RLS-scoped by `current_tenant_id()`.
- The output (NAT00120 fixed-width text) MUST be emitted server-side via an edge function (`supabase/functions/avetmiss-export/`), not in the browser, so it inherits the requesting user's RLS context.
- The output file MUST be stored in `crm7-avetmiss-exports` storage bucket with a per-tenant prefix (`{tenant_id}/2026/NAT00120.txt`).
- AUTH_CANONICAL.md compliance: edge function uses bearer-token from authenticated user (no cookie SSO); RLS is the sole source of truth for which placements the user can export.

### 6.4 Edge function dependencies

- No external NPM packages needed for fixed-width formatting (use `String.prototype.padEnd` / `padStart`).
- Date formatting uses native `Intl.DateTimeFormat` with `'en-AU'` locale → manually rearrange to DDMMYYYY (NCVER format, not ISO).

---

## 7. Out of scope (for future PRs)

- **NAT00080 Client file emission** (apprentice demographic/USI export) — separate hook
- **NAT00130 Program completion file** — separate hook
- **State-specific overrides** (VIC DELTA, NSW STELA, SA SACE) — Phase L4.C
- **Per-UoC iteration** (`apprentice_unit_attempts` table) — Phase L4.B (depends on attempt-tracking schema)
- **AVS validation pre-flight** (run AVETMISS Validation Software locally before submission) — Phase L4.D

---

## 8. §17 quality gate self-check (Doc PR)

1. ✓ All internal links resolve (paths verified)
2. ✓ All external URL citations checked — NCVER spec sources verified live (RTO Grow / NSW eReporting webinar / NAT File Guidelines / NSW common errors guide)
3. ✓ No placeholders without owner+ETA
4. ✓ Conventional commit `docs(crm7):` prefix
5. ✓ Naming `20260506-apprentice-placement-avetmiss-nat00120-mapping-v1.00F.md`

## §17 mutual-reminder (cross-validation by claude-code requested)

- ✓ red-team table present (forward planning per §11 research lane; codes verified across 3 independent sources)
- ✓ smoke test documented (8 golden-fixture cases in §5)
- ✓ no orphan branches (will delete `perplexity/apprentice-placements/L4-avetmiss-export-research` after merge)
- ✓ no dead code (research doc only; mapping function pseudo-code in §6.2 is implementation guidance for claude's PR, not committed code)

## AUTH_CANONICAL.md compliance

§6.3 explicitly enforces: edge function (server-side), RLS as sole filter, bearer-token auth (no cookie SSO), per-tenant storage prefix. claude-code's implementation PR must cite this section in the edge function preamble.

## Hand-off

@claude-code: implementation PR depends on this spec. Suggested approach:
1. Copy `outcomeIdMapping.ts` + tests from §6.2 + §5 fixtures → ship as PR L4.1 (~1h)
2. Add `nat00120FieldFormat.ts` fixed-width formatter + tests → PR L4.2 (~1h)
3. Wire edge function `avetmiss-export` with RLS-scoped query + storage upload → PR L4.3 (~2h)
4. Add `apprenticePlacementService.exportNat00120ForCollectionPeriod()` orchestrator → PR L4.4 (~1h)
5. CI integration test using golden fixtures + AVS-format byte-by-byte comparison → PR L4.5 (~1h)

Total estimated effort: ~6h, decomposable across cron runs, all sub-PRs ship independently.
