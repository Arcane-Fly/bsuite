# Inspector Feedback — Iteration 12

## Verdict: FAIL

## Acceptance Criteria Check

- [x] Theme row 14 — verified: independent replay of `bash scripts/theme-gates.sh --quick` returned exit 1 with `10 passed, 1 failed`, `2 convertible inline colour style(s)`, and outstanding `G11 — no NEW convertible inline colour styles`. The cited role-token anchors map correctly to `packages/theme/src/css/vars.css:152` (`--role-primary`), `:154` (`--role-accent`), and `:165-166` (`--role-error` / `--role-destructive`).
- [x] Schema row 29 — verified: `crm7/supabase/migrations/20260101000000_prod_schema_baseline.sql:18256` creates `tenant_schema_layout`, `:18280` creates `save_schema_layout_position`, `:20353` creates `tenant_subtree_ids`, and `:21744` creates `update_platform_entity_label`. The row explicitly limits these to baseline source evidence and leaves live-catalogue/RLS/authenticated authoring proof open.
- [ ] Role-capabilities row 60 — FAILED: it claims an applied migration, 4 policies, 6 matching public function definitions, and 5 functional APIs after excluding `role_capabilities_set_updated_at`, but supplies neither the exact catalogue SQL nor the returned policy/function rows. It explicitly says the SQL transcript is not retained, so the claimed live counts remain non-replayable. The local command is named and its 17-role/91-permission/exit-2 outcome is accurate, but the exact refusal output is still omitted: `::error::Provide ROLE_CAPABILITIES_JSON (CI, via psql) or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (local). Refusing to report a divergence of zero against a database I never reached.` No unsupported promotion occurs because the row remains `UNVERIFIABLE`.
- [x] Inventory and arithmetic — verified: the literal deduplicated inventory contains 128 paths; the ledger has 128 unique matching rows with no missing, extra, or duplicate paths. Verdict totals remain 5 `VALIDATED-CURRENT`, 7 `VALIDATED-DRIFTED`, 3 `DUPLICATE-CLUSTER`, and 113 `UNVERIFIABLE`.
- [x] Prior caveats — verified: the Builder diff changes only remediation wording for rows 14, 29, and 60 plus iteration/evidence summaries; previously accepted caveats and bounded rulings remain intact.
- [x] Registry, status, and commit scope — verified: `node scripts/generate-component-registry.mjs --check` reports `component-registry: in sync (174 components)` with exit 0; front matter remains `status: building`; commit `620ae0439` is GPG-good and changes only `docs/00-roadmap/20260904-dated-doc-validation-ledger-v1.00W.md`.

## Quality Gate

- Command: `node scripts/generate-component-registry.mjs --check`
- Result: PASS
- Details: `component-registry: in sync (174 components)`; exit 0.
- Additional command: `bash scripts/theme-gates.sh --quick`
- Result: EXPECTED CURRENT FAILURE
- Details: exit 1; 10 passed, 1 failed; G11 found 2 convertible inline colour styles and is named outstanding.
- Additional command: `node scripts/audit-role-capability-divergence.mjs`
- Result: EXPECTED REFUSAL
- Details: self-tests passed for 17 roles and 91 permissions; exit 2 with the explicit no-database-input refusal quoted above.
- Additional check: `git diff --check 620ae0439^ 620ae0439`
- Result: PASS

## Issues Found

1. Row 60 still records live catalogue counts without the exact SQL and returned rows required to make those counts independently replayable.
2. Row 60 still paraphrases the local audit refusal instead of retaining its exact result text.

## What Must Be Fixed

1. Add the exact read-only catalogue SQL used to establish migration application, the 4 policies, and the 6 matching public function definitions, together with the returned policy/function rows and count mapping. If that transcript cannot be recovered or freshly replayed, remove the live counts rather than carrying them as catalogue evidence.
2. Record the exact local audit refusal output and exit code alongside `node scripts/audit-role-capability-divergence.mjs`.
3. Keep row 60 `UNVERIFIABLE` and preserve the production/live boundary until the evidence is replayable.

This is a narrow iteration-remediation FAIL. The overall audit remains incomplete and correctly stays `building` with 113 `UNVERIFIABLE` rows.
