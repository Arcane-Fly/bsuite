# Inspector Feedback — Iteration 11

## Verdict: FAIL

## Acceptance Criteria Check

- [x] Exact inventory and arithmetic — verified: an independent replay found 128 dated paths, 128 inventory rows, no missing or extra paths, and verdict totals of 5 `VALIDATED-CURRENT`, 7 `VALIDATED-DRIFTED`, 3 `DUPLICATE-CLUSTER`, and 113 `UNVERIFIABLE`.
- [x] Focused row set — verified: the iteration-11 table contains exactly rows 14, 29, 60, 61, 51, 80, 86, 89, 90, and 117.
- [x] Registry evidence — verified: `node scripts/generate-component-registry.mjs --check` reports `component-registry: in sync (174 components)`.
- [x] Builder scope and overall state — verified: commit `fd1e4845a` changes only `docs/00-roadmap/20260904-dated-doc-validation-ledger-v1.00W.md`; the ledger remains `building` and explicitly reports 113 unresolved rows.
- [x] Prior rulings — verified: the Builder diff does not alter rows 51, 52, 55, 80, 86, 89, 90, or 117, so the previously accepted caveats and conflict rulings remain intact.
- [ ] Theme row 14 — FAILED: it now gives genuine role-token anchors (`packages/theme/src/css/vars.css:152`, `:154`, `:165-166`) and the correct command, but it paraphrases rather than records the exact output requested. Independent replay output is `10 passed, 1 failed`, with G11 reporting `2 convertible inline colour style(s)` and the outstanding item `G11 — no NEW convertible inline colour styles`. The row says only “10 gates passed and G11 failed because 2 convertible inline-colour styles remain”.
- [ ] Schema row 29 — FAILED: the four line numbers replay correctly as 18256, 18280, 20353, and 21744, but the row records approximate `~` numbers and omits the migration path. Exact anchors are `crm7/supabase/migrations/20260101000000_prod_schema_baseline.sql:18256`, `:18280`, `:20353`, and `:21744`. It does correctly distinguish baseline source evidence from unavailable live-catalogue/RLS/authenticated proof.
- [ ] Role-capabilities row 60 — FAILED: the row correctly demotes to `UNVERIFIABLE`, explains six total functions versus five functional APIs after excluding `role_capabilities_set_updated_at`, and avoids unsupported promotion. However, it explicitly states that the exact live query transcript/output is not retained, rather than including the exact live-catalogue query/result required by the remediation. It also omits the local audit result: `node scripts/audit-role-capability-divergence.mjs` self-tests 17 roles and 91 permissions, then exits 2 with the expected refusal to report zero divergence without database input.
- [x] Role-capabilities row 61 — verified with a wording caveat: it no longer treats `usePermissions.ts` or `permission-guard.tsx` as database `role_capabilities` consumers, correctly identifies them as hardcoded client-side permission sources, and leaves application enforcement/live deployment unverified. A future revision should say explicitly that DB-backed UI consumption is unknown, but the category error identified in iteration 10 is corrected.

## Quality Gate

- Command: `node scripts/generate-component-registry.mjs --check`
- Result: PASS
- Details: `component-registry: in sync (174 components)`.
- Additional command: `bash scripts/theme-gates.sh --quick`
- Result: EXPECTED CURRENT FAILURE
- Details: 10 passed, 1 failed; G11 found 2 convertible inline colour styles.
- Additional command: `node scripts/audit-role-capability-divergence.mjs`
- Result: EXPECTED REFUSAL
- Details: self-tests passed for 17 roles and 91 permissions; exit 2 because neither explicit DB JSON nor Supabase credentials were supplied.

## Issues Found

1. Row 14 does not preserve the exact quick-gate output requested by the previous Inspector finding.
2. Row 29 uses approximate numbers without the migration file path, so they are not exact file:line anchors.
3. Row 60 still lacks the exact live SQL/query result and the local audit's expected-refusal transcript. Demotion prevents false promotion, but it does not complete the requested evidence remediation.

## What Must Be Fixed

1. Quote the exact `bash scripts/theme-gates.sh --quick` result in row 14, including `10 passed, 1 failed`, G11's two-style count, and the named outstanding gate.
2. Replace row 29's approximate anchors with the full migration path and exact lines 18256, 18280, 20353, and 21744; retain the baseline-versus-live boundary.
3. Add row 60's exact live-catalogue SQL and returned rows/counts, plus the exact local audit expected refusal. Keep the six-total/five-functional/timestamp-trigger distinction and do not promote until the evidence is replayable from the ledger.

This is an iteration-remediation FAIL only. The overall audit remains incomplete and correctly stays `building`.