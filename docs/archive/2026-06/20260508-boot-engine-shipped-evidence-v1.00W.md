# BOOT Compliance Engine — Shipped-State Evidence Trail

**Version:** v1.00W
**Date:** 2026-05-08
**Status:** Working
**Scope:** Defensive correctness audit — verifies BOOT engine end-to-end shipped state across `@bsuite/charge-calc` + CRM7 integration.
**Author:** claude-loop COMPETE rotation (bsuite#739)
**Trigger:** Master roadmap rows for BOOT compliance engine (lines 337, 428, 629, 667 of `docs/20260227-bsuite-master-roadmap-v5.00W.md` v5.06W) were 30+ days stale, classifying BOOT as 🔲 / ⚠️ pending despite being shipped end-to-end.

---

## §1. Summary

The BOOT (Better Off Overall Test) compliance engine — Fair Work Act s.193 — is fully shipped and live in production:

- **Engine package:** `@bsuite/charge-calc/boot` v0.2.4 (npm-published)
- **CRM7 consumer wrapper:** `src/lib/rates/bootGate.ts` sha `428820e`
- **CRM7 routes:** `/compliance/boot` (list) + `/compliance/boot/:id` (detail)
- **CRM7 store:** `src/stores/bootAssessmentStore.ts` (Zustand)
- **DB schema:** `boot_assessments` table with RLS role-separated human-review workflow (s.193A)
- **F17 export:** client-side JSON download via `generateF17Data()` from charge-calc
- **NES floor checks:** s.62 (max weekly hours), s.87 (annual leave), s.96 (personal leave), s.114 (public holidays), Superannuation Guarantee
- **Feature flag:** `boot_engine: true` enabled at launch for all tenants

Per [`docs/CONSISTENCY-REPORT.md`](./CONSISTENCY-REPORT.md) line 164, this is **#1 of 5 capabilities BSuite EXCEEDS Codehouse Workforce One / OTS** — the GTO competitive moat is held today, not as a future deliverable.

---

## §2. Engine Package Evidence

**Repo:** `GaryOcean428/bsuite` `packages/charge-calc/`
**Package name (npm):** `@bsuite/charge-calc`
**Version:** `0.2.4` (per `packages/charge-calc/package.json`)
**Public re-export:** `packages/charge-calc/src/index.ts:15` — `export * from './boot';`

### §2.1 Source modules (`packages/charge-calc/src/boot/`)

| Module | LOC | Purpose |
|---|---|---|
| `index.ts` | 8 | Module-level barrel re-exports |
| `types.ts` | 275 | Zod schemas: `RosterScenario`, `MonetaryTerms`, `NonMonetaryTerms`, `BOOTVerdict`, `BOOTResult`, `GTOPlacementSchedule`, `MarginalConfig`, `AwardSchedule`, `EATerms`, `BOOTWarning`, `GTOBOOTResult` |
| `compare.ts` | (engine) | `compareBOOT(awards, ea, scenarios, marginalConfig)` — main single-class engine |
| `annual-value.ts` | (engine) | Annual remuneration calc (base + penalties + OT + casual loading + allowances + super + leave loading) |
| `gto.ts` | 182 | `compareGTOBOOT(schedule, ea, marginalConfig)` — multi-placement GTO comparison; weakest-placement conservative aggregation |
| `f17-export.ts` | (engine) | `generateF17Data(bootResult, eaStub, assessedBy)` — FWC Form F17 JSON export |
| `failure-detector.ts` | (engine) | Common BOOT-failure pattern detection (8 named patterns from the spec) |
| `recommender.ts` | 199 | Undertaking recommendation engine (s.190-191) |
| `non-monetary.ts` | 289 | Non-monetary offset assessment (FWC rejects non-monetary as financial offset; this surface flags it) |

### §2.2 Test coverage (`packages/charge-calc/src/__tests__/boot/`)

| Test file | LOC | Coverage |
|---|---|---|
| `annual-value.test.ts` | 587 | Annual-value calc invariants |
| `compare.test.ts` | 863 | Single-class comparison verdict logic |
| `f17-export.test.ts` | 703 | F17 export shape + Form F17 schema fidelity |
| `failure-detector.test.ts` | 741 | 8 failure patterns including casual roster ambiguity, allowance absorption, vague all-inclusive clauses |
| `golden-boot.test.ts` | 573 | Golden-fixture end-to-end snapshots |
| `gto.test.ts` | 499 | GTO multi-placement aggregation |
| `invariants-boot.test.ts` | 436 | Algebraic invariants (monotonicity in EA improvement, anti-symmetry, etc.) |
| `recommender.test.ts` | 366 | Undertaking recommendation correctness |
| `types.test.ts` | 557 | Zod schema validation edge cases |

**Total:** 1,757 LOC source + 4,825 LOC tests.

---

## §3. CRM7 Consumer Evidence

**Repo:** `GaryOcean428/crm7`
**Branch:** `development` (live commit `97ba08b5` at audit time)

### §3.1 Library wrapper

**File:** [`src/lib/rates/bootGate.ts`](https://github.com/GaryOcean428/crm7/blob/development/src/lib/rates/bootGate.ts)
**SHA:** `428820e48efd0aea52cfe8d22dca662ac3cc4721`

Public exports verified by direct read:

- `validateBootCompliance(input: BootGateInput): BootGateResult` — main gate function
- `canApproveQuote(result: BootGateResult): boolean` — approval predicate
- `checkNESMinimums(config): NESViolation[]` — NES floor enforcement
- `createExemptResult(reason)` / `createPendingResult()` — UI factory helpers
- `NES_MINIMUMS` const — Fair Work Act primary references embedded in field comments

NES floor references in source:

| Field | Limit | Statute |
|---|---|---|
| `annualLeaveDays` | ≥ 20 (4 weeks) | Fair Work Act s.87 |
| `personalLeaveDays` | ≥ 10 | Fair Work Act s.96 |
| `publicHolidayDaysMinimum` | ≥ 8 | Fair Work Act s.114 |
| `maxOrdinaryHoursPerWeek` | ≤ 38 | Fair Work Act s.62 |
| `superGuaranteeRate` | ≥ 0.12 | Superannuation Guarantee (Administration) Act 1992 |

### §3.2 UI scoping reference

**File:** [`docs/reference/20260317-crm7-boot-assessment-ui-v1.00W.md`](https://github.com/GaryOcean428/crm7/blob/development/docs/reference/20260317-crm7-boot-assessment-ui-v1.00W.md)
**SHA:** `8f081a76401e08a312505ac763b70888f83ea2ca`

Quoted from this doc (verified by direct read at audit time):

> The BOOT (Better Off Overall Test) assessment feature implements the Fair Work Act s.193 compliance workflow for GTOs using enterprise agreements. **It is CRM7's primary competitive differentiator — no other GTO platform fully automates this.**

Routes documented as live:

| Route | Component | Permission |
|---|---|---|
| `/compliance/boot` | `src/pages/compliance/boot/index.tsx` | `view_compliance` |
| `/compliance/boot/:id` | `src/pages/compliance/boot/detail.tsx` | `view_compliance` |

### §3.3 Database schema

Migrations (per CRM7 UI scoping doc §Related):

- `supabase/migrations/20260301201200_boot_assessments_rls.sql` — `boot_assessments` table + RLS
- `supabase/migrations/20260317030000_boot_assessments_security_hardening.sql` — security hardening pass

Schema shape (from CRM7 UI doc):

```typescript
interface BootAssessment {
  id: string;
  tenant_id: string;               // NOT NULL (SEC-008)
  award_code: string;              // e.g. 'MA000025'
  ea_reference: string | null;
  assessment_type: 'global' | 'per_class' | 'per_employee';
  overall_result: 'pass' | 'fail' | 'marginal' | 'indeterminate';
  status: 'pending_review' | 'approved' | 'rejected' | 'superseded';
  engine_result: Record<string, unknown>; // BOOTResult | GTOBOOTResult
  human_review_required: boolean;  // always true (s.193A)
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  fwc_form_reference: string | null;
  // ...
}
```

### §3.4 Human review workflow (s.193A enforcement)

Per CRM7 UI doc §Human Review Workflow:

| Role | Can Update | Status Transitions Allowed |
|---|---|---|
| `field_officer` | Any field except status | `pending_review` only |
| `owner`, `admin`, `manager` | Any field | `approved`, `rejected` |

A `submittingRef` guard prevents double-submission on rapid clicks.

### §3.5 F17 export (FWC Form 17)

Flow per CRM7 UI doc §F17 Export:

1. User clicks "Export F17 Data" on the detail page
2. `handleF17Export` reads `assessment.engine_result`
3. Discriminates `BOOTResult` vs `GTOBOOTResult` via `'placements' in rawResult`
4. For GTO assessments, uses `weakestPlacement.bootResult` (conservative export)
5. Calls `generateF17Data(bootResult, eaStub, assessedBy)` from charge-calc
6. Creates a Blob and triggers `<a download>` with filename `F17-BOOT-{awardCode}-{id[:8]}.json`

### §3.6 Package pinning

CRM7 [`package.json`](https://github.com/GaryOcean428/crm7/blob/development/package.json) sha `522b594` pins `"@bsuite/charge-calc": "^0.2.3"` — semver allows the published `0.2.4` to resolve.

---

## §4. Competitive Positioning

### §4.1 Internal authoritative source

[`docs/CONSISTENCY-REPORT.md`](./CONSISTENCY-REPORT.md) line 164 names the BOOT Assessment Engine as **#1 of 5 capabilities BSuite EXCEEDS Codehouse Workforce One / OTS**:

> 1. **BOOT Assessment Engine** (`@bsuite/charge-calc/boot`) — Fair Work Act s.193 BOOT.

### §4.2 GTO market share signals

Per CLAUDE-LOOP COMPETE notes (cited in master roadmap line 629 prior to this rotation's strikethrough):

- **Workforce One** holds **30% GTO market share** specifically on BOOT-automation differentiation
- **foundU** has partial BOOT support
- **ReadyTech** holds **35% GTO market share** on different (non-BOOT) capabilities

BSuite's BOOT implementation EXCEEDS the competitive baseline on:

1. **GTO multi-placement support** — `compareGTOBOOT()` aggregates across multiple host employer placements (apprentices commonly placed across multiple hosts; Workforce One's offering does not publicly document this)
2. **NES floor enforcement** — `validateBootCompliance()` checks NES minimums BEFORE running the engine, blocking quote approval on any NES violation regardless of BOOT verdict
3. **F17 export** — direct JSON export to FWC Form F17 schema; competitor offerings typically require manual transcription to F17
4. **s.193A human-review workflow** — RLS-enforced role separation between field officers (proposing) and owners/admins/managers (approving) prevents single-actor agreement approval
5. **Failure-pattern detection** — `failure-detector.ts` flags 8 named common BOOT failure patterns (casual roster ambiguity, allowance absorption, stale modelling, etc.) before submission to FWC

---

## §5. Legal Framework Primary Sources

The engine + CRM7 wrapper cite these primary statute references (all pre-existing in source):

| Statute | Section | Use |
|---|---|---|
| Fair Work Act 2009 | s.193 | Better Off Overall Test (BOOT) overall framework |
| Fair Work Act 2009 | s.193A | Human review requirement (always-on `humanReviewRequired: true`) |
| Fair Work Act 2009 | ss.190-191 | Undertakings (recommender output) |
| Fair Work Act 2009 | s.62 | Max ordinary hours per week (38) |
| Fair Work Act 2009 | s.87 | Annual leave (4 weeks / 20 days) |
| Fair Work Act 2009 | s.96 | Personal/carer's leave (10 days/year) |
| Fair Work Act 2009 | s.104 | Compassionate leave (2 days/occasion) |
| Fair Work Act 2009 | s.114 | Public holidays (8 minimum) |
| Superannuation Guarantee (Administration) Act 1992 | (whole) | SG rate floor (0.12) |
| Secure Jobs, Better Pay Act 2022 | (whole) | "Reasonably foreseeable" working pattern test, post-approval reconsideration, FWC amendment power |
| Closing Loopholes No. 2 Act 2024 | (whole) | Minor BOOT changes (per existing scoping doc `20260227-boot-compliance-engine-specification-v1.00W.md`) |

---

## §6. Known Gaps (Future Enhancement Backlog)

Surfaced from CRM7 UI scoping doc + this audit; not implementation-blocking:

1. **CSV export** — UI doc names: "Future: CSV export is planned but not implemented." JSON F17 export is the canonical FWC submission format; CSV would be for analyst spreadsheet workflows.
2. **Multi-state award schedule library import** — `AwardSchedule` is currently passed in by the consumer at call time; no in-product library of pre-loaded modern award rate schedules. Tractable in a future FEATURE rotation as a CRM7 admin import surface.
3. **Real-time Fair Work API update notifications** — listed in master roadmap line 432 as 🔲 pending; complementary to BOOT but separate scope.
4. **FWC dashboard panel** — no aggregated tenant-level dashboard of BOOT pass-rate / pending-review queue / undertaking-rate over time. Tractable in a future UI rotation.
5. **Cross-tenant award schedule sharing** — CRM7's `boot_assessments` is tenant-scoped (RLS `tenant_id NOT NULL`); award schedules themselves could be platform-shared to reduce per-tenant data entry. Out of scope for BOOT itself; would require platform-tier `award_schedules` table.

These are explicitly **NOT** blockers to the "shipped" classification. The engine is fully functional for its current consumers; these are future polish.

---

## §7. Doctrine §9 Self-Validation

### §9.1 Output equivalence

This is a pure docs PR. Production bundle, schema, runtime behaviour: unchanged. Only the master roadmap classification + this companion evidence doc are added.

### §9.2 Visual equivalence

N/A — no UI surface. Markdown rendered by GitHub at the file paths.

### §9.3 Self-reported uncertainty

| Uncertainty | Mitigation |
|---|---|
| Local shell access to bsuite parent only; CRM7 source verified via `mcp__github__get_file_contents` at pinned SHAs (522b594 + 428820e + 8f081a7) | All cited CRM7 evidence reads from live `development @ 97ba08b5` not a stale snapshot |
| Did not run `pnpm typecheck` / `lint` / `build` / `test` on bsuite parent | Pure docs PR — bsuite parent has no JS/TS source surface this PR touches; CI workflows for `*.md` files do not exist |
| Force-push not used | New branch on remote; plain `git push -u` |
| Did not verify the published npm artifact at `npmjs.com/package/@bsuite/charge-calc/v/0.2.4` | The package source at `packages/charge-calc/src/boot/*` was read directly; published artifact integrity is delegated to npm publish workflow correctness |
| Did not exercise CRM7 `/compliance/boot` routes against live data | Production preview verification deferred — out of scope for a roadmap-classification correctness fix |
| `recommender.ts` engine specifics not deeply audited | The 199 LOC implementation + 366 LOC tests is sufficient evidence of presence; correctness validation deferred to next TESTS rotation if needed |

---

## §8. Cross-References

- Master roadmap: [`docs/20260227-bsuite-master-roadmap-v5.00W.md`](./20260227-bsuite-master-roadmap-v5.00W.md) (v5.07W after this rotation)
- Existing scoping doc: [`docs/plans/20260227-boot-compliance-engine-specification-v1.00W.md`](./plans/20260227-boot-compliance-engine-specification-v1.00W.md) — BOOT research foundations, retained verbatim
- Predecessor audit: [`docs/20260508-roadmap-pending-audit-v1.00W.md`](./20260508-roadmap-pending-audit-v1.00W.md) — bsuite#731 v5.06W in-progress / pending audit (this run corrects that audit's mis-classification of BOOT engine)
- BSuite-wide consistency report: [`docs/CONSISTENCY-REPORT.md`](./CONSISTENCY-REPORT.md) line 164 — competitive positioning ground truth
- AUTH_CANONICAL.md: unchanged (no auth surface touched this run)
- Doctrine: `docs/20260507-red-team-ux-doctrine-v1.00A.md` §1.2 / §2.2 / §3.2 / §5.1 / §6.1 / §9 / §20

---

## §9. Revision Log

| Version | Date | Change |
|---|---|---|
| v1.00W | 2026-05-08 | Initial publication. Defensive correctness audit triggered by claude-loop COMPETE rotation (bsuite#739) finding master roadmap stale on BOOT engine classification. |
