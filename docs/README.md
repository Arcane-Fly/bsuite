# BSuite Documentation

Top-level documentation for the BSuite multi-project workspace. Contains cross-project standards, architecture references, and planning documents shared across all six applications (business-suite-unified, crm7, conduit, braden, R80.3, throughput).

> **Index refreshed 2026-06-11** by the docs/roadmap closure audit (`plans/20260611-docs-roadmap-closure-audit-v1.00A.md`). Evidence-only artifacts (cron logs, completed handoff packets, one-off audits) were moved to `archive/2026-06/`; earlier reference docs live under `archive/parent/2026-04-30-references-approved/`.

## Documentation Authority

- `(archived — see archived-repos-docs/20260725-bsuite-cleanup)` is the canonical planning and delivery source of truth
- [`../AUTH_CANONICAL.md`](../AUTH_CANONICAL.md) is the canonical authentication and session-topology reference (the older `20260227-auth-map-reference-v1.00A.md` is archived under `archive/parent/2026-04-30-references-approved/`)
- `20260504-bsuite-tech-stack-alignment-v1.00W.md` is the canonical tech-stack baseline — all apps must converge
- `20260504-bsuite-documentation-hub-v1.00W.md` is the canonical cross-submodule documentation index — start here to find any doc
- **`20260814-estate-remaining-work-register-v2.00W.md` is the canonical remaining-work register** — it supersedes `OUTSTANDING.md` (self-demoted 2026-08-14) and the seven registers listed in its §9. `20260501-merged-execution-backlog-v1.00W.md` remains the phase-ordered execution queue
- Project `docs/README.md` files are navigation hubs only
- `docs/plans/` contains feeder plans that must reconcile back into the master roadmap
- `archive/` and imported donor documentation are reference-only and may preserve older naming or topology

## Contents

### Roadmaps & work indexes

| File | Description |
|------|-------------|
| `20260814-estate-remaining-work-register-v2.00W.md` | **Canonical remaining-work register — for item definitions and evidence; superseded for *status* by `20260817-estate-completion-ledger-v1.00W.md`.** Covers **266** non-archive docs (the "264" previously stated here and in the register's own Method line was corrected 2026-08-17), at **~93% coverage of the dated set, not 100%**. Every material claim re-measured against the six repos at `development` HEAD, live SQL, live GitHub state and a live theme-audit re-run. P0 → P3 with sizes, evidence and a sequence. Supersedes seven earlier registers (§9). **Its `V-1`…`V-11` are the verification-integrity items** — the Vercel platform audit's findings are `VP-n`. |
| `20260817-estate-completion-ledger-v1.00W.md` | **Authoritative status** for all 87 register items, re-measured live 2026-08-17: 16 DONE, 3 never defects, 1 settled by ruling, 13 partial, 54 open. Plus §5, the coverage gaps absent from the register. Keeps the register's identifiers. |
| `(archived — see archived-repos-docs/20260725-bsuite-cleanup)` | Single source of truth for BSuite project planning across all projects |
| `20260425-bsuite-finish-line-roadmap-v1.00W.md` | Prioritised P0/P1/P2 finish-line view (154 items, cited to sources) |
| `20260501-merged-execution-backlog-v1.00W.md` | Canonical phase-ordered execution queue (BL-NNN / P0-* / P1-* / P2-* / WS-* item IDs) |
| `OUTSTANDING.md` | **Superseded 2026-08-14** by `20260814-estate-remaining-work-register-v2.00W.md` — retained for its evidence trail; its counts are stale |
| `CONSISTENCY-REPORT.md` | Cross-app WCAG / a11y / dependency / auth consistency status + plan-tracking convention |
| `NEW_ISSUES_FOUND.md` | Append-only ledger of pre-existing issues discovered mid-task (Five-Wave Stabilization) |
| `20260723-bsuite-capability-matrix-v1.00W.md` | Competitor capability matrix (Code House WfO/AnyTime, ReadyTech Ready Recruit, aXcelerate) + prioritised completion ledger + user-manual program seed |
| `20260724-bsuite-vercel-env-inventory-v1.00W.md` | Vercel production env-var inventory across all 6 apps (per-app matrix, gap notes) — captured via vercel CLI 2026-07-24 |
| `20260724-oneshot-cross-cutting-audit-v1.00W.md` | Full cross-cutting DRY one-shot audit (2026-07-22→24 ship window) — 5 violations fixed, 4 ownership-map gaps closed, lifecycle-handover exception codified |
| `20260724-migration-fk-index-checklist-v1.00W.md` | Every new FK column needs a same-migration btree index (pgTAP A1 / R1); CI script check-migration-fk-indexes.mjs |
| `20260724-recurring-bugs-and-blindspots-v1.00W.md` | Recurring bug classes (R1–R12) + unexamined clusters (B1–B12) + next-5 investigations — discovery only after prompt-enhancer Standard refine |
| `plans/20260725-docs-deadcode-archive-refined-v1.00D.md` | Prompt-enhanced plan: docs↔code audit, dead code, archive relocate |
| `20260725-headroom-learn-notes-v1.00W.md` | Headroom learn on bsuite: 7.1% tool-fail rate; LLM extract blocked (Claude limit / litellm); Qwen 3.8 API 401 |
| `20260723-Anytime-WorkforceOne-Admin-Guide.md` | Code House AnyTime/Workforce One Administrator Guide (competitor reference — full admin/timesheet/award surface) |

### Standards & doctrine

| File | Description |
|------|-------------|
| `20260814-portals-operator-rulings-v1.00A.md` | **Operator rulings D-93 to D-98** — field officer is staff; a host sees the full charge-rate build-up; a host places staffing orders but does not browse workers; payslips are a viewer; WHS questions match AnyTime; bank/TFN/super are out of scope. Answers `20260813-portals-redesign-brainstorm-v1.00D.md` §1. Cite by D-number; do not re-derive. |
| `20260227-contributing-standards-guide-v1.01W.md` | Universal quality, documentation, and code standards for all BSuite projects |
| `20260227-dry-one-shot-architecture-v1.02A.md` | DRY principles and one-shot data entry architecture for all modules (Approved) |
| `20260424-env-var-contributing-rules-v1.00W.md` | Standing rules for env var naming, scoping, and storage |
| `20260504-bsuite-documentation-hub-v1.00W.md` | **Canonical cross-submodule documentation hub** — indexes every `docs/` folder across parent + 6 submodules |
| `20260504-bsuite-tech-stack-alignment-v1.00W.md` | **Canonical tech-stack baseline** — target versions, per-app matrix, shared `@bsuite/*` package inventory |
| `20260505-bsuite-dependency-refresh-ts6-migration-v1.00W.md` | TS 5.9→6.0 migration playbook — reusable for the next TS major bump |
| `20260506-dependency-bump-checklist-v1.00A.md` | Dependency bump checklist for `@bsuite/*` consumers (cited by CLAUDE.md) |
| `20260507-ff-self-validation-doctrine-v1.00W.md` | FF-SELF-VALIDATION-20260507 self-validation loop doctrine (source for CLAUDE.md §9) |
| `20260507-red-team-ux-doctrine-v1.00A.md` | Red-team UX doctrine (Approved) |
| `20260731-platform-operations-reference-v1.00W.md` | Setup, lockfile generation, shared packages, env vars, GCP WIF, Ship-All-Apps cron, memory protocol, per-project notes (relocated from `AGENTS.md`) |
| `20260731-agent-engineering-patterns-v1.00W.md` | AI SDK standards, multi-file refactor tooling (FF-TOOLING-PATTERNS), reusable code patterns (FF-CODE-PATTERNS) |
| `20260731-frontend-layout-zindex-standards-v1.00W.md` | Layout rules, suite-wide z-index scale, 3-prompt DOM autopsy system |
| `20260731-supabase-verification-gates-v1.00W.md` | FF-SUPABASE-GATES-20260610 policy/consumer/live-UX gates, definition of done, database rules |

### Auth & security references

| File | Description |
|------|-------------|
| `20260427-conduit-auth-doctrine-investigation-v1.00W.md` | Conduit auth doctrine vs reality investigation (recovered from a stash 2026-08-05 — historical, predates the 2026-04-28 BS OAuth migration) |
| `20260427-security-definer-audit-v1.00W.md` | SECURITY DEFINER privilege-escalation audit — `public.is_team_admin` + WS-G helpers (recovered from a stash 2026-08-05; verify findings against the live catalog before acting) |
| `20260506-cross-app-auth-bug-rca-v1.00A.md` | BSU→CRM7 logged-out incident RCA — authority for the OAuth session-bridge frozen-fact correction |
| `20260519-rpc-report-page-security-review-v1.00A.md` | Report page / RPC security review (Approved) |
| `20260519-storage-rls-four-persona-matrix-v1.00A.md` | Storage RLS four-persona access matrix (Approved) |
| `20260519-xero-payroll-au-stp-path-decision-v1.00A.md` | Xero Payroll AU / STP path decision record (Approved) |
| [`20260428-operator-verification/`](20260428-operator-verification/README.md) | Operator verification sweep — items 3/4/5 (OAUTH_STATE_SECRET, TGA GUCs, TGA sync) remain verified-incomplete; closed items archived under `archive/parent/2026-04-30-operator-verification-closed/` |
| `security/` | Security data files (Supabase advisor allowlist) |

### Specs & parity (Codehouse parity program)

| File | Description |
|------|-------------|
| `20260506-apprentice-placement-avetmiss-nat00120-mapping-v1.00W.md` | AVETMISS NAT00120 export research + termination-code mapping |
| `20260506-apprentice-placement-form-schema-spec-v1.00W.md` | Apprentice placement create/edit form Zod + RHF spec |
| `20260506-apprentice-placement-state-machine-canon-v1.00W.md` | Apprentice placement state machine canonical reference |
| `20260506-file-export-adapters-parity-spec-v1.00W.md` | File export adapters parity spec |
| `20260506-integrations-parity-spec-v1.00W.md` | Integrations parity spec |
| `20260506-leave-parity-spec-v1.00W.md` | Leave parity spec |
| `20260506-pay-periods-parity-spec-v1.00W.md` | Pay periods parity spec |
| `20260506-reports-parity-spec-v1.00W.md` | Reports parity spec |
| `20260506-timesheet-entry-parity-spec-v1.00W.md` | Timesheet entry parity spec |
| `20260507-admin-parity-spec-v1.00W.md` | Admin parity spec |
| `20260507-comms-parity-spec-v1.00W.md` | Comms parity spec |
| `20260507-timesheet-approval-parity-spec-v1.00W.md` | Timesheet approval parity spec |
| `20260507-w4-permissions-editor-scoping-v1.00A.md` | W4 permissions editor scoping & architecture (scoping complete — bsuite#679 closed) |

> **Parity-spec status correction (2026-08-14):** the nine tracking issues for these specs are closed as `completed`, but each was closed on the day its spec document merged. Measured 2026-08-14, **26 of the 36 tables they define do not exist**. See `20260814-estate-remaining-work-register-v2.00W.md` §3 before treating any of these as delivered.

### Audits, trackers & validation reports

| File | Description |
|------|-------------|
| `20260629-bsuite-world-class-audit-tracker-v1.00W.md` | World-class readiness audit tracker — running evidence log (WC-/A-series) |
| `20260629-bsuite-world-class-feature-inventory-v1.00W.md` | World-class feature inventory companion to the audit tracker |
| `20260629-bsuite-role-rls-subscription-parity-matrix-v1.00W.md` | Role / RLS / subscription parity matrix (WC-008…WC-012 resolutions) |
| `20260629-batch-e-rbac-parity-dev-deploy-test-plan-v1.00W.md` | Batch E — RBAC parity (WC-008…012) dev-deploy validation test plan |
| `20260629-batch-e-rbac-parity-dev-deploy-test-report-v1.00W.md` | Batch E — RBAC parity dev-deploy validation report (conduit Team `joined_at` fix) |
| `20260630-cross-app-auth-validation-dev-deploy-test-plan-v1.00W.md` | Cross-app auth validation dev-deploy test plan (5 `d.*` apps) |
| `20260630-cross-app-auth-validation-dev-deploy-test-report-v1.00W.md` | Cross-app auth validation dev-deploy report (OAuth 2.1 + PKCE + JWKS, 5/5 pass) |
| `20260427-dev-main-fork-rca-v1.00W.md` | dev ↔ main fork RCA (parent + crm7) — pre-reconcile gate analysis (recovered from a stash 2026-08-05) |
| `20260506-supabase-linter-action-plan-v1.00W.md` | Supabase linter action plan — Phases 1+2 ready, Phase 3 deferred (recovered from a stash 2026-08-05; re-run the advisor before acting) |
| `20260506-table-usage-audit-v1.00W.md` | Table usage audit — conclusions stand, but each drop recommendation needs human sign-off (recovered from a stash 2026-08-05). **Counts are stale**: 229 tables recorded, 403 live |
| `20260722-developer-portal-investigation-v1.00W.md` | Developer Portal surface investigation — tenant_navigation, platform_branding, feature_builder, and schema-builder tables audit |
| `20260814-notes-backlog-verification-register-v1.00D.md` | Measured state of every defect in the operator's `bsuite notes.docx` and the 2026-08-13 directive (D-59…D-92) — verified against code, live issues and live SQL, not against doc claims. Corrects the directive's own coverage numbers in both directions. |
| `20260814-phase0-scope-remediation-delivery-v1.00W.md` | Phase 0 delivery + evidence record (crm7#1731, BSU#726). **Records two retractions**: crm7#1728 was not a defect and the filed fix would have taken the shared GTO report catalogue down in every tenant; crm7#1729's original query-scope fix chose the correct layer. Carries the unscoped-SELECT class sweep (12 tables, 4 real) and the Caris ruling. |
| `20260814-estate-remaining-work-register-v2.00W.md` | **Canonical remaining-work register** (also indexed under Roadmaps above) — the full estate audit: 8 P0s, the money/compliance block, the parity-program correction, adoption gaps, verification-integrity holes, theme/perf, portals, doc hygiene, and what no static pass can settle. |

### Directories

| Directory | Description |
|-----------|-------------|
| [`adr/`](adr/README.md) | Architecture decision records (ADR-0001…ADR-0007) |
| [`ai/`](ai/README.md) | CRM7 AI Assistant documentation — architecture, features, pricing, integrations |
| [`archive/`](archive/README.md) | Archived docs — per-project roadmaps, finish-line sweeps, and the 2026-06 closure-audit archive (`archive/2026-06/`) |
| [`dashboard/`](dashboard/README.md) | Roadmap dashboard (data + refresh scripts) + the canonical FF-DASHBOARD-20260508 update protocol |
| [`email-templates/`](email-templates/README.md) | Supabase email template HTML files (signup, invite, magic link, etc.) |
| `evidence/` | Evidence captures referenced by plans/audits |
| [`operator-screenshots/`](operator-screenshots/README.md) | Operator handoff screenshots |
| [`plans/`](plans/README.md) | Implementation plans (active) — archived plans live in `archive/` |
| [`runbooks/`](runbooks/README.md) | Operator/platform runbooks — migration dispatch, edge function deploy, parent pointer reconcile, tenant switching & branding tiers, secrets/vault rotation |
| [`testing/`](testing/README.md) | Cross-app E2E runbook + e2e tooling decision record |

> **Archived reference sets:** approved references from Feb–Apr 2026 (auth map, theme spec, GTO standards, competitive landscape, pricing, Fair Work, CRM8U research, etc.) → `archive/parent/2026-04-30-references-approved/`; closed audits → `archive/parent/2026-04-30-audits-closed/`; Phase-0 closure handoffs/session reports → `archive/parent/2026-04-30-phase-0-closure/`; 2026-06 closure-audit moves (cron logs, handoff packets, one-off audits, superseded plans) → `archive/2026-06/`.

- [20260727 multi-app agent blindspot investigation ledger](./20260727-multiapp-agent-blindspot-investigation-ledger-v1.00W.md) — escalation council 45-item ranked backlog

- [20260727 extreme-poor agent items execution](./20260727-extreme-poor-agent-items-execution-v1.00W.md)

- [20260727 schema package pin plan](./20260727-schema-package-pin-plan-v1.00W.md)

- [20260728 overnight world-class close-out](./20260728-overnight-worldclass-closeout-v1.00W.md)

- [20260728 migration idempotency audit](./20260728-migration-idempotency-audit-v1.00W.md) — gap-remediation Task 3 (P0-2): verdicts for the 17 above-floor migrations flagged as unrecorded; all SAFE, no guards needed; documents that the ledger gap has since substantially closed

- [20260729 unified authoring QA audit](./20260729-unified-authoring-qa-audit-v1.00W.md) — comprehensive QA audit across unified authoring, invites, Jodie and the platform kit

- [20260730 competitor parity matrix](./20260730-competitor-parity-matrix-v1.00W.md) — R80.3 vs RatesCalc, CRM7 vs Code House Workforce One, crm7 timesheets vs Code House AnyTime, conduit vs Humanforce/LiveHire; evidence-linked gap ledger (2 P0s, 4 P1s, 3 P2s) — confirms LiveHire was absorbed into Humanforce, and that crm7's per-shift penalty interpreter (`penaltyCalculator.ts`) is built but has zero consumers (unwired)

- [20260813 portals redesign brainstorm](./20260813-portals-redesign-brainstorm-v1.00D.md) — D-81/D-82 decision document (Draft, no code). Reads the Code House AnyTime/Workforce One admin guide as the layout study D-82 asked for (the 5 Aug pass missed the file and concluded no layout reference existed); maps all 11 crm7 `/portal` routes; finds 14 of the 20 curated portal menu destinations point into internal staff pages, which is the source of the re-orientation; recommends merging the field-officer portal into the main app as a scoped staff surface; lists three decisions required before any build
