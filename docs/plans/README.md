# Plans

Implementation plans for BSuite features and enhancements. Each plan follows the `YYYYMMDD-descriptive-name-type-vMAJOR.MINOR[STATUS].md` naming convention.

**Note:** The bulk of historical implementation plans live in the top-level `docs/` folder (not in this subdirectory). This `plans/` folder contains the most recent active plans.

**Status codes:** W=Working, D=Draft, R=Review, A=Approved, F=Frozen

## Canonical Cross-Links

> **Repaired 2026-08-17.** Three of the five links here pointed at documents archived out of the
> repository, including the one labelled "Active phase-ordered queue". An agent opening this index
> to find the queue found nothing.

- [`../20260814-estate-remaining-work-register-v2.00W.md`](../20260814-estate-remaining-work-register-v2.00W.md) — **Canonical remaining-work register.** Start here; it supersedes the finish-line roadmap and the merged execution backlog.
- [`../20260504-bsuite-documentation-hub-v1.00W.md`](../20260504-bsuite-documentation-hub-v1.00W.md) — Cross-submodule documentation hub (top-level index)
- [`../../AGENTS.md`](../../AGENTS.md) — Stack floor and the ten tripwires (replaces the archived tech-stack-alignment doc)
- [`../20260731-platform-operations-reference-v1.00W.md`](../20260731-platform-operations-reference-v1.00W.md) — Shared `@bsuite/*` package matrix, env vars, lockfile rules
- `../00-roadmap/20260112-master-roadmap-1.00W.md` — Master roadmap — **SUPERSEDED**, see its banner
- `../20260425-bsuite-finish-line-roadmap-v1.00W.md` — **archived out of the repo** (`~/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/docs/archive/2026-07/`)
- `../20260501-merged-execution-backlog-v1.00W.md` — **archived out of the repo**, same path

## One-shot prompts — NOT plans

**These are consumed instructions, not standing work.** A refined prompt is written to be pasted
into one agent run. Once that run happens the prompt is a historical artifact: its "do X" lines
describe a job that is finished, half-finished, or was overtaken — and nothing in the file records
which. They sit in this folder for provenance only.

**Do not pick one of these up and execute it.** If you want the work, get it from the canonical
register above, which is re-measured. Fifteen prompt-shaped documents currently live in
`docs/plans/`:

| File | Written |
|------|---------|
| `20260617-product-tails-continuation-prompt-v1.00W.md` | 2026-06-17 |
| `20260629-remaining-work-continuation-prompt.md` | 2026-06-29 |
| `20260709-hermes-deep-dive-audit-prompt-refined-v1.00W.md` | 2026-07-09 |
| `20260723-completion-program-refined-v1.00D.md` | 2026-07-23 |
| `20260724-recurring-bugs-blindspots-refined-v1.00D.md` | 2026-07-24 |
| `20260725-docs-deadcode-archive-refined-v1.00D.md` | 2026-07-25 |
| `20260725-gto-excellence-program-refined-v1.00D.md` | 2026-07-25 |
| `20260727-escalation-council-multiapp-investigation-refined-v1.00W.md` | 2026-07-27 |
| `20260728-billing-model-label-truthfulness-refined.md` | 2026-07-28 |
| `20260729-unified-authoring-redteam-refined-v1.00W.md` | 2026-07-29 |
| `20260802-d2c-theme-compliance-audit-refined.md` | 2026-08-02 |
| `20260811-award-engine-to-zero-refined.md` | 2026-08-11 |
| `20260811-dataplatform-completion-refined.md` | 2026-08-11 |
| `20260811-feature-builder-world-class-refined.md` | 2026-08-11 |
| `20260811-post-persona-execution-refined.md` | 2026-08-11 |

`20260423-gto-billing-reporting-refined-plan-v1.00A.md` is deliberately **not** in this table: it
calls itself a refined prompt but was promoted to an Approved plan and is indexed as one below.

Four of these name **R80.3** or a pre-2026-08-06 app set; R80.3 left the submodule set on
2026-08-06 and was replaced by R80.4. See `../../AGENTS.md`.

## Active Plans

| File | Status | Description |
|------|--------|-------------|
| `20260817-estate-completion-plan-v1.00D.md` | D | **The implementing-agent brief for the whole remaining-work register.** Eight dependency-ordered phases, each stating its acceptance test and its failure condition, built on 46 primary-source findings (2026-08-17). Carries four standing contracts (server decides permissions; default state is *I do not know*; money is integer minor units rounded once; every figure is AUTHORITATIVE / INDICATIVE / REFUSE) and gates G0-G7. §1 corrects four claims this estate's own documents get wrong — two of them in `../20260815-vercel-platform-audit-and-res-regression-v1.00W.md`. §9 lists six rulings the operator must make before the phases they gate can start; §10 states what the plan does not settle. Executes `../20260817-estate-remaining-work-register-v3.00W.md` (PR bsuite#2075, open at time of writing). |
| `20260814-portals-and-surface-class-remediation-v1.00D.md` | D | **Seven-phase programme** closing the two classes the operator has raised most often — scope enforced in the UI instead of the database, and cards/theme fixed one page at a time — then the portals per rulings D-93…D-98. Phase 0 DELIVERED (crm7#1731, BSU#726 — see `../20260814-phase0-scope-remediation-delivery-v1.00W.md`). Declares four explicit boundaries with the concurrent nav-route lane; one is a live collision on `/portal/field-officer`. Phase 5 is gated on R8 award coverage. |
| `20260807-data-platform-completion-program-v1.00D.md` | D | Data-platform completion: report catalog covers 23 of 363 tables (crm7-only, zero conduit/BSU/throughput/braden); four P4/P5 persistence surfaces at 0 rows; one live silent data-loss bug on `/settings/custom-fields`. Supersedes `20260806-reporting-bulk-data-tiered-schema-program-v1.00D.md` **as the execution plan** — its own P1–P9 were delivered 2026-08-07 (catalogue 23 → 84 entities). **Its decisions D1–D7 remain required, and are NOT the same seven questions as the 2026-08-06 document's D1–D7 — always cite the date.** |
| `20260806-reporting-bulk-data-tiered-schema-program-v1.00D.md` | D | Reporting, bulk import/update and tiered schema control — the fuller analysis behind the 2026-08-07 execution plan. **Rescued from untracked 2026-08-10** (it had sat uncommitted since 2026-08-06 under a machine-generated filename). Superseded as a plan, retained as the analysis: its §1.1 finding is still live — there is no query engine, so "billable hours per month" remains a migration rather than a configuration. Carries its own unanswered **D1–D7**, chief among them D1, the grid technology. |
| `20260729-qa-backlog-execution-v1.00W.md` | W | QA backlog execution plan — full red-team completion of the unified-authoring audit findings |
| `20260423-gto-billing-reporting-refined-plan-v1.00A.md` | A | Production billing, STP Phase 2, Payday Super, regulatory reporting (Approved; Xero lane blocked on app registration) |
| `20260501-universal-wysiwyg-schema-ux-v1.00W.md` | W | Universal WYSIWYG + schema-driven UX (Phase 0 + Schema Builder Phase 1a/1b + schema-builder-specific Phase 3 complete; page/form/custom authoring phases active) |
| `20260506-codehouse-parity-and-platform-360-v1.00W.md` | W | Codehouse Workforce-One parity + Platform-360 capability spec (index plan + 9 portal sub-plans + 1 visual feature builder spec under `20260506-codehouse-parity/`; refined-prompt provenance under `inputs/`). Permissions remain AUTH_CANONICAL.md + Supabase RLS + BSuite SSO — no new RBAC/ABAC framework. |
| `20260507-feature-builder-ux-red-team-v1.00W.md` | W | Visual Feature Builder UX red-team + Phase 0.5 plan (FF-FB-UX-REDTEAM-20260507) |
| `20260510-universal-canvas-capability-implementation-v1.00W.md` | W | Universal canvas capability implementation (red-team amendments applied; not yet executed) |
| `20260511-part-o11-theme-placement-doc-coherence-plan-v1.00W.md` | W | Part O.11 theme centralisation + enterprise white-label POC, O.12 feature-placement audit, and O.13 docs-coherence handoff |
| `20260513-bsuite-consolidated-hardening-v1.00W.md` | W | Consolidated hardening multi-cycle plan (open tails tracked via bsuite#1505 et al.) |
| `20260521-reports-w2-uplift-implementation-v1.00W.md` | W | Reports W2 uplift — Phase 1 shipped (crm7 PRs #840–#844 merged 2026-05-22); Phases 3a/3b/4/6/7 outstanding |
| `20260609-production-readiness-next-steps-plan-v1.00W.md` | W | **Umbrella production-readiness plan** — package consumer rollout, visual smoke triage, TCID/WAAMS, placement identity bridge, block-release calendar, workstreams E–H; remains active until bsuite#1506, crm7#1066, storage phases, and E–H tails close |
| `20260701-docs-plans-closure-audit-v1.00W.md` | W | Current closure audit across parent + six submodules; records archive candidates, stale status corrections, and remaining work by repo |

### Completed Plans (re-marked A, retained in place)

| File | Completed | Evidence |
|------|-----------|----------|
| `20260227-boot-compliance-engine-specification-v1.00A.md` | 2026-05-08 | BOOT engine shipped in `@bsuite/charge-calc` + CRM7 integration — evidence trail `../archive/2026-06/20260508-boot-engine-shipped-evidence-v1.00W.md` |
| `20260302-r80-crm7-integration-audit-v1.00A.md` | 2026-05-14 | Shared calc engine delivered — `@bsuite/charge-calc` consumed by both crm7 and R80.3 `package.json` at the time; R80.3#248 closed. (R80.3 left the submodule set 2026-08-06; charge-calc is now `0.12.0`, consumed by crm7 and conduit.) |
| `20260504-typescript-6-migration-evaluation-v1.00A.md` | 2026-05-12 | Tracking issue bsuite#211 CLOSED 2026-05-12; TS 6.0 playbook **archived out of the repo** at `~/Desktop/Dev/archived-repos-docs/20260727-docs-archive-pass/docs/20260505-bsuite-dependency-refresh-ts6-migration-v1.00W.md` |
| `20260513-hf4-pgtap-rls-harness-v1.00A.md` | 2026-05-19 | Tracking issue bsuite#866 CLOSED 2026-05-19; header already marked Approved/completed |
| `20260513-ws4-timesheet-state-vocab-alignment-v1.00A.md` | 2026-06-03 | crm7 PR #948 MERGED 2026-06-03 (commit `bf97acf9`); plan header marked COMPLETED |

### Archived Plans (moved to `docs/archive/`)

| File | Archived | Reason |
|------|----------|--------|
| `20260316-crm7-broad-ui-refresh-plan-v1.00W.md` | 2026-06-11 | Superseded by uplift design language doctrine `uplift/20260507-bsuite-uplift-design-language-v1.00A.md` + Reports W2 uplift; moved to `../archive/2026-06/` |
| `20260423-bsuite-production-plan-v1.00W.md` | 2026-06-11 | Superseded by the 2026-06-09 production-readiness umbrella plan (Phase 6 re-verified 2026-05-12 with 8/9 items landed); moved to `../archive/2026-06/` |
| `20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md` | 2026-06-11 | Execution ledger archived 2026-04-30 (now out of the repo at `~/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/docs/archive/parent/2026-04-30-phase-0-closure/`); superseded by `20260501-universal-wysiwyg-schema-ux-v1.00W.md`; moved to `../archive/2026-06/` |
| `20260605-production-spec-completion-plan-v1.00W.md` | 2026-06-11 | Superseded by `20260609-production-readiness-next-steps-plan-v1.00W.md` (operator-designated umbrella); moved to `../archive/2026-06/` |
| `20260311-d2c-theme-remediation-plan-v1.00W.md` | 2026-04-07 | All theme remediation items confirmed complete in gap report v2 |
| `20260316-bsuite-entity-reconciliation-plan-v1.00W.md` | 2026-04-07 | SP-4 entity crosswalk delivered (gap report v2 Section 9) |
| `20260316-crm7-dashboard-grid-fix-plan-v1.00W.md` | 2026-04-07 | PageGridLayout wired on all apps (gap report v2 Section 2) |
| `20260316-crm7-ui-fix-plan-v1.00W.md` | 2026-04-07 | All UI fix items confirmed done (gap report v2 Section 2) |
| `20260422-entity-linkage-schema-builder-uplift-v1.02W.md` | 2026-05-01 | Superseded by v1.05W `20260501-universal-wysiwyg-schema-ux-v1.00W.md` §3.6 + §3.9 (strict superset — field-level handles, SchemaRelationSchema, dagre, crow's-foot) |
| `20260428-codex-phase-2-shared-packages-plan-v1.00W.md` | 2026-05-04 | All 5 workstreams (2A–2E) complete with PR evidence; see `../archive/2026-05-04-doc-unification/README.md` |

## Data Files

| File | Description |
|------|-------------|
| `CRM7_entity_inventory_v2.xlsx` | CRM7 entity inventory spreadsheet (v2) |
