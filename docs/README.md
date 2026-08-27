# BSuite Documentation

Top-level documentation for the BSuite multi-project workspace. Contains cross-project standards, architecture references, and planning documents shared across all six applications (business-suite-unified, crm7, conduit, braden, R80.4, throughput).

> **Dangling-reference repair, 2026-08-17.** This index named 13 documents that are not in this
> repository, four of which it called **canonical**. None were lost: all were archived out of the
> tree by the 2026-07-25 and 2026-07-27 cleanup passes, to
> `~/Desktop/Dev/archived-repos-docs/`. An index that points at a canonical document nobody can
> open is worse than one that omits it, because the reader concludes the authority does not exist
> and re-derives it. Every such row below now says *archived*, and where authority moved, it names
> the document that now holds it.

> **`R80.3/...` paths in older documents do not resolve, and are NOT being rewritten.**
> Measured 2026-08-18: 47 top-level documents mention R80.3; 10 of them reference an
> `R80.3/<path>` pointer, 31 references in total. There is no `R80.3` directory — the live
> repository is `R80.4`.
>
> The tempting fix is a blanket `R80.3` → `R80.4` rewrite. It would be wrong. R80.4 is a
> RESTRUCTURE, not a rename: of the 20 distinct paths referenced, **18 do not exist under
> R80.4 either** — `src/services/awardRulesEngine.ts`, `src/lib/payroll-export/codes.ts`,
> `docs/PARENT-DOCS.md` and the rest are simply gone. Rewriting them would replace a pointer
> that is visibly stale with one that looks current and is still broken, which is the harder
> defect to notice.
>
> So they stand as historical references to the archived version, and this note is the
> authority that says so. If you need what one of them pointed at, look in
> `~/Desktop/Dev/archived-repos-docs/`. The two paths that DO survive are `R80.4/docs/`
> and `R80.4/docs/README.md`.

> **Index refreshed 2026-06-11** by the docs/roadmap closure audit (`plans/20260611-docs-roadmap-closure-audit-v1.00A.md` — **archived**, now at `~/Desktop/Dev/archived-repos-docs/20260727-docs-archive-pass/docs/plans/`). Evidence-only artifacts (cron logs, completed handoff packets, one-off audits) were moved to `archive/2026-06/`; earlier reference docs are **archived out of the repo** under `~/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/docs/archive/parent/2026-04-30-references-approved/`.

## Documentation Authority

- **Canonical planning and delivery source of truth:** `20260814-estate-remaining-work-register-v2.00F.md` (below). The master-roadmap document that formerly held this role is archived at `~/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/`; the placeholder that replaced its name left this bullet naming no document at all.
- [`../AUTH_CANONICAL.md`](../AUTH_CANONICAL.md) is the canonical authentication and session-topology reference (the older `20260227-auth-map-reference-v1.00A.md` is **archived out of the repo** at `~/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/docs/archive/parent/2026-04-30-references-approved/`)
- ~~`20260504-bsuite-tech-stack-alignment-v1.00W.md` is the canonical tech-stack baseline~~ — **archived out of the repo** (`~/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/docs/archive/2026-07/`). The live stack floor is stated in [`../AGENTS.md`](../AGENTS.md); the shared-package matrix is in `20260731-platform-operations-reference-v1.00W.md`, re-measured 2026-08-17.
- `20260504-bsuite-documentation-hub-v1.00W.md` is the canonical cross-submodule documentation index — start here to find any doc
- **`20260814-estate-remaining-work-register-v2.00F.md` is the canonical remaining-work register** — it supersedes `OUTSTANDING.md` (self-demoted 2026-08-14) and the seven registers listed in its §9. The phase-ordered execution queue `20260501-merged-execution-backlog-v1.00W.md` is **archived out of the repo** (`~/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/docs/archive/2026-07/`) — the register above absorbed its sequencing
- Project `docs/README.md` files are navigation hubs only
- `docs/plans/` contains feeder plans that must reconcile back into the master roadmap
- `archive/` and imported donor documentation are reference-only and may preserve older naming or topology

## Contents

### Roadmaps & work indexes

| File | Description |
|------|-------------|
| `20260814-estate-remaining-work-register-v2.00F.md` | **Canonical remaining-work register — for item definitions and evidence; superseded for *status* by `20260817-estate-completion-ledger-v1.00W.md`.** Covers **266** non-archive docs (the "264" previously stated here and in the register's own Method line was corrected 2026-08-17), at **~93% coverage of the dated set, not 100%**. Every material claim re-measured against the six repos at `development` HEAD, live SQL, live GitHub state and a live theme-audit re-run. P0 → P3 with sizes, evidence and a sequence. Supersedes seven earlier registers (§9). **Its `V-1`…`V-11` are the verification-integrity items** — the Vercel platform audit's findings are `VP-n`. |
| `20260817-estate-completion-ledger-v1.00W.md` | **Authoritative status** for all register items, re-measured live 2026-08-17 and amended repeatedly since. **Read the TOP amendment, not the tally table** — the file is append-only, so it carries a chronological stack of superseded counts. Its 2026-08-19m amendment corrects the arithmetic itself: the scoreboard had been counting **80** items while the ledger tracks **88**, silently excluding the whole `P0-` live-exposure series from its own totals. Current: **88 items, DONE 58 · NOT-A-DEFECT 4 · SUPERSEDED 1 · PARTIAL 20 · OPEN 5**. Plus §5, the coverage gaps absent from the register. Keeps the register's identifiers. |
| `20260819-estate-session-evidence-v1.00F.md` | **Operator-facing evidence record for 2026-08-19**, written in plain language rather than for an engineer. Four findings with the measurement behind each — a host supervisor reading 8 placements where 1 was theirs; Adobe Sign still deployed five months after being replaced; 1,154 styling instructions across four shared libraries silently discarded by every app; and a wage cache holding one identical rate for nineteen different awards. Also: two items reported to you as unfinished that are actually done, two mistakes made and corrected in-session, and the eight decisions that genuinely need the operator. |
| `20260817-built-unlanded-and-unwired-register-v1.00W.md` | **Machine sweep of what already exists and is not reachable** — the complement to the remaining-work register, which counts only what is missing. 96 git work trees across 60 repositories, every `src/**` module in the six apps, every edge function against the live `cron.job` table. Headline negative: **no commit is stranded on the laptop** (all ten apparently-unpushed branches are local-*behind*, direction checked both ways). Findings: 18 open PRs, four of which are completion-plan phases already written; **64 unreferenced modules** (29 feature, ~4,000 lines) including braden's entire unrouted admin surface at ~1,800 lines; **9 edge functions with no caller**, chief among them an award-rate refresh chain that is inert while a test comment asserts pg_cron runs it. Also §5, a work tree staging 3,104 deletions of live guard infrastructure on `development`, and §6, an exposed credential. Adds items **BU-1…BU-9** to `plans/20260817-estate-completion-plan-v1.00D.md`. **§3.3/§4.4 (2026-08-19): every §3/§4 item resolved to WIRE IT / REMOVE IT (pending operator approval, none deleted) / KEEP-MARKED-UNRELEASED — 4 WIRE IT shipped as PRs across braden/crm7/throughput/conduit, §4.2's award-rate-refresh claim corrected (a cron now exists and still doesn't close the real gap).** |
| `20260425-bsuite-finish-line-roadmap-v1.00W.md` | **Archived out of the repo** — `~/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/docs/archive/2026-07/`. Prioritised P0/P1/P2 finish-line view (154 items). Superseded by the register above. |
| `20260501-merged-execution-backlog-v1.00W.md` | **Archived out of the repo** — same path as above. Phase-ordered execution queue (BL-NNN / P0-* / P1-* / P2-* / WS-* item IDs). Cite the register above for sequencing. |
| `OUTSTANDING.md` | **Superseded 2026-08-14** by `20260814-estate-remaining-work-register-v2.00F.md` — retained for its evidence trail; its counts are stale |
| `CONSISTENCY-REPORT.md` | Cross-app WCAG / a11y / dependency / auth consistency status + plan-tracking convention |
| `NEW_ISSUES_FOUND.md` | Append-only ledger of pre-existing issues discovered mid-task (Five-Wave Stabilization) |
| `20260723-bsuite-capability-matrix-v1.00W.md` | Competitor capability matrix (Code House WfO/AnyTime, ReadyTech Ready Recruit, aXcelerate) + prioritised completion ledger + user-manual program seed |
| `20260724-bsuite-vercel-env-inventory-v1.00W.md` | Vercel production env-var inventory across all 6 apps (per-app matrix, gap notes) — captured via vercel CLI 2026-07-24 |
| `20260724-oneshot-cross-cutting-audit-v1.00W.md` | Full cross-cutting DRY one-shot audit (2026-07-22→24 ship window) — 5 violations fixed, 4 ownership-map gaps closed, lifecycle-handover exception codified |
| `20260724-migration-fk-index-checklist-v1.00W.md` | Every new FK column needs a same-migration btree index (pgTAP A1 / R1); CI script check-migration-fk-indexes.mjs |
| `20260724-recurring-bugs-and-blindspots-v1.00W.md` | Recurring bug classes (R1–R12) + unexamined clusters (B1–B12) + next-5 investigations — discovery only after prompt-enhancer Standard refine |
| `plans/20260725-docs-deadcode-archive-refined-v1.00F.md` | Prompt-enhanced plan: docs↔code audit, dead code, archive relocate |
| `20260725-headroom-learn-notes-v1.00F.md` | Headroom learn on bsuite: 7.1% tool-fail rate; LLM extract blocked (Claude limit / litellm); Qwen 3.8 API 401 |
| `20260723-anytime-workforceone-admin-guide-v1.00W.md` | Code House AnyTime/Workforce One Administrator Guide (competitor reference — full admin/timesheet/award surface) |

### Standards & doctrine

| File | Description |
|------|-------------|
| `20260814-portals-operator-rulings-v1.00A.md` | **Operator rulings D-93 to D-98** — field officer is staff; a host sees the full charge-rate build-up; a host places staffing orders but does not browse workers; payslips are a viewer; WHS questions match AnyTime; bank/TFN/super are out of scope. Answers `20260813-portals-redesign-brainstorm-v1.00D.md` §1. Cite by D-number; do not re-derive. |
| `20260227-contributing-standards-guide-v1.01W.md` | Universal quality, documentation, and code standards for all BSuite projects |
| `20260227-dry-one-shot-architecture-v1.04A.md` | DRY principles and one-shot data entry architecture for all modules (Approved) |
| `20260424-env-var-contributing-rules-v1.00W.md` | Standing rules for env var naming, scoping, and storage |
| `20260504-bsuite-documentation-hub-v1.00W.md` | **Canonical cross-submodule documentation hub** — indexes every `docs/` folder across parent + 6 submodules |
| `20260504-bsuite-tech-stack-alignment-v1.00W.md` | **Archived out of the repo** — `~/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/docs/archive/2026-07/`. Its shared-`@bsuite/*` inventory is superseded by the re-measured table in `20260731-platform-operations-reference-v1.00W.md`; the stack floor is in `../AGENTS.md`. |
| `20260505-bsuite-dependency-refresh-ts6-migration-v1.00W.md` | **Archived out of the repo** — `~/Desktop/Dev/archived-repos-docs/20260727-docs-archive-pass/docs/`. TS 5.9→6.0 migration playbook, reusable for the next TS major bump. |
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
| `20260427-conduit-auth-doctrine-investigation-v1.00F.md` | Conduit auth doctrine vs reality investigation (recovered from a stash 2026-08-05 — historical, predates the 2026-04-28 BS OAuth migration) |
| `20260427-security-definer-audit-v1.00W.md` | SECURITY DEFINER privilege-escalation audit — `public.is_team_admin` + WS-G helpers (recovered from a stash 2026-08-05; verify findings against the live catalog before acting) |
| `20260506-cross-app-auth-bug-rca-v1.00A.md` | BSU→CRM7 logged-out incident RCA — authority for the OAuth session-bridge frozen-fact correction |
| `20260519-rpc-report-page-security-review-v1.00A.md` | Report page / RPC security review (Approved) |
| `20260519-storage-rls-four-persona-matrix-v1.00A.md` | Storage RLS four-persona access matrix (Approved) |
| `20260519-xero-payroll-au-stp-path-decision-v1.00A.md` | Xero Payroll AU / STP path decision record (Approved) |
| [`20260428-operator-verification/`](20260428-operator-verification/README.md) | Operator verification sweep — items 3/4/5 (OAUTH_STATE_SECRET, TGA GUCs, TGA sync) remain verified-incomplete; closed items (1, 2, 6, 7, 8) archived **out of the repo** at `~/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/docs/archive/parent/2026-04-30-operator-verification-closed/` |
| `security/` | Security data files (Supabase advisor allowlist) |

### Specs & parity (Codehouse parity program)

| File | Description |
|------|-------------|
| `20260506-apprentice-placement-avetmiss-nat00120-mapping-v1.00F.md` | AVETMISS NAT00120 export research + termination-code mapping |
| `20260506-apprentice-placement-form-schema-spec-v1.00F.md` | Apprentice placement create/edit form Zod + RHF spec |
| `20260506-apprentice-placement-state-machine-canon-v1.00W.md` | Apprentice placement state machine canonical reference |
| `20260506-file-export-adapters-parity-spec-v1.00W.md` | File export adapters parity spec |
| `20260506-integrations-parity-spec-v1.00W.md` | Integrations parity spec |
| `20260506-leave-parity-spec-v1.00W.md` | Leave parity spec |
| `20260506-pay-periods-parity-spec-v1.00W.md` | Pay periods parity spec |
| `20260506-reports-parity-spec-v1.00F.md` | Reports parity spec |
| `20260506-timesheet-entry-parity-spec-v1.00W.md` | Timesheet entry parity spec |
| `20260507-admin-parity-spec-v1.00W.md` | Admin parity spec |
| `20260507-comms-parity-spec-v1.00W.md` | Comms parity spec |
| `20260507-timesheet-approval-parity-spec-v1.00W.md` | Timesheet approval parity spec |
| `20260507-w4-permissions-editor-scoping-v1.00A.md` | W4 permissions editor scoping & architecture (scoping complete — bsuite#679 closed) |

> **Parity-spec status correction (2026-08-14):** the nine tracking issues for these specs are closed as `completed`, but each was closed on the day its spec document merged. Measured 2026-08-14, **26 of the 36 tables they define do not exist**. See `20260814-estate-remaining-work-register-v2.00F.md` §3 before treating any of these as delivered.

### Audits, trackers & validation reports

| File | Description |
|------|-------------|
| `20260629-bsuite-world-class-audit-tracker-v1.00W.md` | World-class readiness audit tracker — running evidence log (WC-/A-series) |
| `20260629-bsuite-world-class-feature-inventory-v1.00W.md` | World-class feature inventory companion to the audit tracker |
| `20260629-bsuite-role-rls-subscription-parity-matrix-v1.00W.md` | Role / RLS / subscription parity matrix (WC-008…WC-012 resolutions) |
| `20260629-batch-e-rbac-parity-dev-deploy-test-plan-v1.00W.md` | **Archived out of the repo** — `~/Desktop/Dev/archived-repos-docs/20260727-docs-archive-pass/docs/`. Batch E RBAC parity (WC-008…012) dev-deploy validation test plan. |
| `20260629-batch-e-rbac-parity-dev-deploy-test-report-v1.00W.md` | **Archived out of the repo** — same path. Batch E RBAC parity dev-deploy validation report (conduit Team `joined_at` fix). |
| `20260630-cross-app-auth-validation-dev-deploy-test-plan-v1.00F.md` | **Partially recovered** — the plan is in-repo at [`recovered/20260630-cross-app-auth-validation-dev-deploy-test-plan-v1.00F.md`](recovered/20260630-cross-app-auth-validation-dev-deploy-test-plan-v1.00F.md) (5 `d.*` apps). |
| `20260630-cross-app-auth-validation-dev-deploy-test-report-v1.00W.md` | **Archived out of the repo** — `~/Desktop/Dev/archived-repos-docs/20260727-docs-archive-pass/docs/`. Cross-app auth validation dev-deploy report (OAuth 2.1 + PKCE + JWKS, 5/5 pass). |
| `20260427-dev-main-fork-rca-v1.00F.md` | dev ↔ main fork RCA (parent + crm7) — pre-reconcile gate analysis (recovered from a stash 2026-08-05) |
| `20260506-supabase-linter-action-plan-v1.00W.md` | Supabase linter action plan — Phases 1+2 ready, Phase 3 deferred (recovered from a stash 2026-08-05; re-run the advisor before acting) |
| `20260506-table-usage-audit-v1.00W.md` | Table usage audit — conclusions stand, but each drop recommendation needs human sign-off (recovered from a stash 2026-08-05). **Counts are stale**: 229 tables recorded, **402 live** (re-measured 2026-08-17 — the doc now carries a banner saying so) |
| `20260722-developer-portal-investigation-v1.00W.md` | Developer Portal surface investigation — tenant_navigation, platform_branding, feature_builder, and schema-builder tables audit |
| `20260814-notes-backlog-verification-register-v1.00D.md` | Measured state of every defect in the operator's `bsuite notes.docx` and the 2026-08-13 directive (D-59…D-92) — verified against code, live issues and live SQL, not against doc claims. Corrects the directive's own coverage numbers in both directions. **Superseded for *status* by `20260817-operator-notes-backlog-d59-d92-status-v1.00W.md`**; its evidence and item wording remain the reference. |
| `20260817-operator-notes-backlog-d59-d92-status-v1.00W.md` | **Authoritative status** for the 34 directives D-59…D-92 and the thirty §5 filings, re-measured live 2026-08-17: 21 DONE, 8 partial, 3 open, 1 never a defect, 1 standing rule; §5 = 5 fixed, 3 partial, 21 open, 1 never a defect. Closes coverage gap **G1** in the completion ledger. **The "11 not filed anywhere" count is now 0** and 4 of the 6 platform-wide surface defects are closed. The surviving defect is the *mechanism* (D-62): the shared card-surface scanner is published and imported by nobody — `bsuite#2055`. Carries three operator decisions incl. D-83's twelve rows (`crm7#1778`). |
| `20260814-phase0-scope-remediation-delivery-v1.00W.md` | Phase 0 delivery + evidence record (crm7#1731, BSU#726). **Records two retractions**: crm7#1728 was not a defect and the filed fix would have taken the shared GTO report catalogue down in every tenant; crm7#1729's original query-scope fix chose the correct layer. Carries the unscoped-SELECT class sweep (12 tables, 4 real) and the Caris ruling. |
| `20260814-estate-remaining-work-register-v2.00F.md` | **Canonical remaining-work register** (also indexed under Roadmaps above) — the full estate audit: 8 P0s, the money/compliance block, the parity-program correction, adoption gaps, verification-integrity holes, theme/perf, portals, doc hygiene, and what no static pass can settle. |

### Directories

| Directory | Description |
|-----------|-------------|
| [`adr/`](adr/README.md) | Architecture decision records (ADR-0001…ADR-0007) |
| [`ai/`](ai/README.md) | CRM7 AI Assistant documentation — architecture, features, pricing, integrations |
| [`archive/`](archive/README.md) | Archived docs — per-project roadmaps, finish-line sweeps, and the 2026-06 closure-audit archive (`archive/2026-06/`) |
| [`archive/20260506-plan-completion-dashboard/`](archive/20260506-plan-completion-dashboard/README.md) | **Retired 2026-08-10** (`17175120`). Was `dashboard/` — the roadmap dashboard plus the FF-DASHBOARD-20260508 update protocol. Kept for its data; no longer refreshed, so do not cite its numbers. |
| `evidence/` | Evidence captures referenced by plans/audits (no index) |
| [`recovered/`](recovered/) | Documents recovered from stashes and session transcripts. **A frozen archive** — `scripts/drift-scan.mjs` deliberately exempts this path, so its contents are not linted and may quote superseded patterns as evidence. |
| [`references/`](references/README.md) | Source material we did not write — vendor API docs, regulator guidance, competitor knowledgebase crawls, rate-calculation domain material. Indexed 2026-08-17. |
| [`email-templates/`](email-templates/README.md) | Supabase email template HTML files (signup, invite, magic link, etc.) |
| `evidence/` | Evidence captures referenced by plans/audits |
| [`operator-screenshots/`](operator-screenshots/README.md) | Operator handoff screenshots |
| [`plans/`](plans/README.md) | Implementation plans (active) — archived plans live in `archive/` |
| [`runbooks/`](runbooks/README.md) | Operator/platform runbooks — migration dispatch, edge function deploy, parent pointer reconcile, tenant switching & branding tiers, secrets/vault rotation |
| [`testing/`](testing/README.md) | Cross-app E2E runbook + e2e tooling decision record |

> **Archived reference sets — all OUT OF THIS REPOSITORY.** The `archive/parent/` tree was moved to
> `~/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/docs/archive/parent/` by the 2026-07-25
> cleanup, so every `archive/parent/...` path below is a **local disk path, not a repo path**:
> approved references from Feb–Apr 2026 (auth map, theme spec, GTO standards, competitive landscape,
> pricing, Fair Work, CRM8U research) → `2026-04-30-references-approved/`; closed audits →
> `2026-04-30-audits-closed/`; Phase-0 closure handoffs/session reports → `2026-04-30-phase-0-closure/`.
> Still in-repo: 2026-06 closure-audit moves → [`archive/2026-06/`](archive/) and
> [`archive/2026-07/`](archive/).

- [20260727 multi-app agent blindspot investigation ledger](./20260727-multiapp-agent-blindspot-investigation-ledger-v1.00W.md) — escalation council 45-item ranked backlog

- [20260727 extreme-poor agent items execution](./20260727-extreme-poor-agent-items-execution-v1.00F.md)

- [20260727 schema package pin plan](./20260727-schema-package-pin-plan-v1.00F.md)

- [20260728 overnight world-class close-out](./20260728-overnight-worldclass-closeout-v1.00W.md)

- [20260728 migration idempotency audit](./20260728-migration-idempotency-audit-v1.00F.md) — gap-remediation Task 3 (P0-2): verdicts for the 17 above-floor migrations flagged as unrecorded; all SAFE, no guards needed; documents that the ledger gap has since substantially closed

- [20260729 unified authoring QA audit](./20260729-unified-authoring-qa-audit-v1.00W.md) — comprehensive QA audit across unified authoring, invites, Jodie and the platform kit

- [20260730 competitor parity matrix](./20260730-competitor-parity-matrix-v1.00W.md) — R80.3 vs RatesCalc, CRM7 vs Code House Workforce One, crm7 timesheets vs Code House AnyTime, conduit vs Humanforce/LiveHire; evidence-linked gap ledger (2 P0s, 4 P1s, 3 P2s) — confirms LiveHire was absorbed into Humanforce, and that crm7's per-shift penalty interpreter (`penaltyCalculator.ts`) is built but has zero consumers (unwired)

- [20260813 portals redesign brainstorm](./20260813-portals-redesign-brainstorm-v1.00D.md) — D-81/D-82 decision document (Draft, no code). Reads the Code House AnyTime/Workforce One admin guide as the layout study D-82 asked for (the 5 Aug pass missed the file and concluded no layout reference existed); maps all 11 crm7 `/portal` routes; finds 14 of the 20 curated portal menu destinations point into internal staff pages, which is the source of the re-orientation; recommends merging the field-officer portal into the main app as a scoped staff surface; lists three decisions required before any build
