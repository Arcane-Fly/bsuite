# Inspector Feedback — Iteration 10

## Verdict: FAIL

## Acceptance Criteria Check

- [x] Exact inventory and arithmetic — verified: the ledger contains the exact 128-path dated-document inventory and reports 6 `VALIDATED-CURRENT`, 7 `VALIDATED-DRIFTED`, 3 `DUPLICATE-CLUSTER`, and 112 `UNVERIFIABLE` rows.
- [x] Registry evidence — verified: `node scripts/generate-component-registry.mjs --check` reports `component-registry: in sync (174 components)`.
- [x] Focused row set — verified: the iteration-10 table contains exactly rows 14, 29, 60, 61, 51, 80, 86, 89, 90, and 117.
- [x] Builder scope — verified: commit `e52574e71` changes only `docs/00-roadmap/20260904-dated-doc-validation-ledger-v1.00W.md`.
- [ ] Theme row 14 — FAILED: it says “current theme gates and role-token/source checks” were confirmed, but supplies neither the replay command/output nor concrete source lines. Independent replay of `bash scripts/theme-gates.sh --quick` produced 10 passing gates and a G11 failure for two convertible inline colour styles, so the row also omits a material current result. Keeping the row `UNVERIFIABLE` is correct; its claimed focused evidence trail is not.
- [ ] Schema-authoring/tenancy row 29 — FAILED: the prose names `tenant_schema_layout` but provides no source file/line or replayable command for its ownership, nullability, RLS, subtree, or authoring assertions. Repository baseline definitions exist in `crm7/supabase/migrations/20260101000000_prod_schema_baseline.sql` (including `tenant_schema_layout`, `save_schema_layout_position`, `tenant_subtree_ids`, and `update_platform_entity_label`), but baseline presence is not live-catalogue proof. The row correctly preserves live claims as `UNVERIFIABLE`, yet fails acceptance criterion 6's evidence-trail requirement.
- [ ] Role-capabilities row 60 — FAILED: the row promotes the document to `VALIDATED-CURRENT` without recording the live-catalogue command or concrete source lines that establish its production and consumer counts. An independent live catalogue query found the migration applied, four policies, and six public function definitions containing `role_capabilities` (one is the `role_capabilities_set_updated_at` trigger function); the ledger's “five functions” figure may intend to exclude that trigger, but it gives no counting rule or replayable query. The available local audit command correctly refuses to report without DB input. The promoted row therefore has no auditable evidence trail in the artefact.
- [ ] Role-capabilities row 61 — FAILED: its named CRM7 “consumers” do not consume the database capability matrix. `crm7/src/hooks/usePermissions.ts` derives access from an in-code `rolePermissions` map, and `crm7/src/components/auth/permission-guard.tsx` delegates to that hook. Those files cannot substantiate that `role_capabilities` has application consumers. Database functions/policies may supersede the historical zero-consumer finding, but that requires the live/source evidence and precise consumer classification actually used; the current row conflates two permission systems.
- [x] Caveats and overall state — verified: live/authenticated claims for rows 14 and 29 remain `UNVERIFIABLE`; historical performance/reachability/contrast caveats on preserved rows remain bounded; overall goal state remains `building`.

## Quality Gate

- Command: `node scripts/generate-component-registry.mjs --check`
- Result: PASS
- Details: `component-registry: in sync (174 components)`.
- Additional command: `bash scripts/theme-gates.sh --quick`
- Result: FAIL
- Details: 10 gates passed; G11 reported two convertible inline colour styles.
- Additional command: `node scripts/audit-role-capability-divergence.mjs`
- Result: EXPECTED REFUSAL
- Details: self-tests passed for 17 roles and 91 permissions, then the script refused to claim a zero divergence without explicit database input.
- Additional live catalogue check: migration `20260905000000` is applied; four policies and six public function definitions contain `role_capabilities`, including the update-timestamp trigger function.

## Issues Found

1. Rows 14 and 29 replace generic `E-OPEN` wording with conclusions but still omit concrete source locations and replayable commands, so their focused review is not independently reproducible from the ledger.
2. Row 60 is promoted despite omitting its live SQL/query evidence and the counting rule behind “five functions”. This violates the automatic-fail evidence requirement even though an independent live check supports the applied migration and four-policy portions.
3. Row 61 cites hardcoded client-side role permissions as consumers of the database `role_capabilities` matrix. That is a category error and does not prove the claimed drift.
4. Row 14 omits the current G11 theme-gate failure, weakening its summary of the present theme state.

## What Must Be Fixed

1. Add exact file:line anchors and replayable command/output evidence to rows 14 and 29 while keeping unavailable live/authenticated claims `UNVERIFIABLE`.
2. For row 60, record the exact live catalogue query (or demote the row), state the function-counting rule, and distinguish table readers from the timestamp trigger.
3. For row 61, remove `usePermissions.ts` and `permission-guard.tsx` as database-matrix consumer evidence unless an actual data path to `role_capabilities` is demonstrated. Use genuine function/policy/application consumers and preserve unverified deployment/enforcement claims.
4. Record the current G11 failure in the theme evidence rather than describing the gate set only as supporting evidence.
