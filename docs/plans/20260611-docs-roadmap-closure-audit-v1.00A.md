# Docs / Roadmap Closure Audit — Parent Repo Verdict Table

**Date:** 2026-06-11
**Status:** A (Approved — both halves merged 2026-06-11; submodule tables incorporated)
**Scope:** Every `.md` under the parent's `docs/` EXCEPT `docs/dashboard/**` and `docs/plans/STATUS.md` (handled separately). `docs/archive/**` is treated as already-resolved (verdict = archived, no action) and is not re-tabulated.
**Branch:** `docs/closure-audit-parent-20260611`

## Method

Operator-mandated verdict table: **doc path → documented capability/standard → current code/issue evidence → verdict**. Verdicts:

- **keep-active** — living authority/spec/index, or work verifiably still open
- **archive** — evidence-only artifact (cron log, completed handoff packet, session report, one-off audit export) → `git mv` to `docs/archive/2026-06/`, content never edited
- **supersede** — replaced by a newer canonical doc → moved to `docs/archive/2026-06/` with the successor named
- **re-mark-A** — work verifiably complete (tracking issue closed / PR merged / shipped artifact verified) → filename status suffix W→A, inbound references fixed

Evidence sources: `gh issue view` / `gh pr view` against GaryOcean428/{bsuite,crm7,R80.3}, file greps of installed code (`package.json`, migrations), and the operator-supplied closed/open ground-truth list (bsuite#1487/#1492/#1499/#1500/#1460, crm7#758/#831/#1024/#1046/#1047/#1052–#1054 CLOSED; bsuite#1505/#1506/#635/#937–#939 etc. OPEN). No dashboard counters were used as evidence.

## Parent-repo verdict table

### docs/ root — roadmaps, standards, doctrine

| Doc path | Documented capability/standard | Evidence | Verdict |
|---|---|---|---|
| `docs/20260227-bsuite-master-roadmap-v5.00W.md` | Master roadmap SSoT | Last updated 2026-05-23; cited by OUTSTANDING.md + plans/README | keep-active |
| `docs/20260227-contributing-standards-guide-v1.01W.md` | Universal quality standards | Cited by CLAUDE.md "Key Files" | keep-active |
| `docs/20260227-dry-one-shot-architecture-v1.02A.md` | DRY one-shot entity ownership | Canonical spec cited by `dry-one-shot-architecture` skill + CLAUDE.md | keep-active |
| `docs/20260317-bsuite-gap-report-v2.00W.md` | March gap audit | Historical audit; carries its own "SUPERSEDED (auth retrospectives)" banner; superseded as work index by `OUTSTANDING.md` + merged backlog | archive |
| `docs/20260319-entity-crosswalk-v1.00D.md` | CRM7 entity→table/store/route crosswalk (Draft) | Stale March draft; entity landscape rewritten by people/placements identity bridge (crm7#1024 closed via crm7#1045, 2026-06-10) | archive |
| `docs/20260424-env-var-contributing-rules-v1.00W.md` | Standing env-var rules | Forward-looking standing rules; canonical Supabase project unchanged | keep-active |
| `docs/20260425-bsuite-finish-line-roadmap-v1.00W.md` | Prioritised P0/P1/P2 view | Cited by OUTSTANDING.md as the prioritised finish-line view | keep-active |
| `docs/20260501-merged-execution-backlog-v1.00W.md` | Canonical execution queue | Cited by OUTSTANDING.md as "CANONICAL EXECUTION QUEUE"; P1-15 et al. still live | keep-active |
| `docs/20260504-bsuite-documentation-hub-v1.00W.md` | Cross-submodule doc index | Index doc; links refreshed this audit | keep-active |
| `docs/20260504-bsuite-tech-stack-alignment-v1.00W.md` | Canonical tech-stack baseline | Authority for version convergence; deviations require ADRs | keep-active |
| `docs/20260505-bsuite-dependency-refresh-ts6-migration-v1.00W.md` | TS 6 migration playbook | Reusable remediation playbook for next TS major (bsuite#211 closed 2026-05-12 confirms migration done) | keep-active |
| `docs/20260506-dependency-bump-checklist-v1.00A.md` | `@bsuite/*` bump checklist | Cited by CLAUDE.md auth rule #5 | keep-active |
| `docs/20260507-ff-self-validation-doctrine-v1.00W.md` | Self-validation doctrine FF-SELF-VALIDATION-20260507 | Source for CLAUDE.md §9 | keep-active |
| `docs/20260507-red-team-ux-doctrine-v1.00A.md` | Red-team UX doctrine | Approved doctrine | keep-active |
| `docs/CONSISTENCY-REPORT.md` | Cross-app consistency + plan-tracking convention | Living report; codifies the plan-location convention | keep-active |
| `docs/NEW_ISSUES_FOUND.md` | Append-only mid-task issue ledger | Contains TRACKED-W4/W5 items (host_employers schema joins, nav editor) without closure evidence | keep-active |
| `docs/OUTSTANDING.md` | Outstanding-work SSoT index | Only OUTSTANDING.md in tree (bsuite#488); links refreshed this audit | keep-active |
| `docs/README.md` | Parent docs index | Rewritten this audit — ~36 rows pointed at files archived in the 2026-04-30 sweeps | keep-active (rewritten) |

### docs/ root — auth, security, decisions

| Doc path | Documented capability/standard | Evidence | Verdict |
|---|---|---|---|
| `docs/20260506-cross-app-auth-bug-rca-v1.00A.md` | BSU→CRM7 logged-out RCA | Authority for CLAUDE.md frozen-fact #5 correction (session bridge) | keep-active |
| `docs/20260519-rpc-report-page-security-review-v1.00A.md` | Report RPC security review | Cited by 0609 umbrella plan §reports | keep-active |
| `docs/20260519-storage-rls-four-persona-matrix-v1.00A.md` | Storage RLS persona matrix | Storage phases bsuite#937–#939 OPEN — matrix is their spec | keep-active |
| `docs/20260519-xero-payroll-au-stp-path-decision-v1.00A.md` | Xero/STP path decision | Xero lane still blocked on app registration (open decision dependency) | keep-active |
| `docs/20260428-operator-verification/{README,03,04,05}.md` | Operator verification sweep | Items 3/4/5 (OAUTH_STATE_SECRET, TGA GUCs, TGA_SYNC_ENABLED) recorded VERIFIED INCOMPLETE; closed items 01/02/06/07/08 already archived under `archive/parent/2026-04-30-operator-verification-closed/` | keep-active |

### docs/ root — parity specs (Codehouse program, open: crm7#527/#528/#530–#534)

| Doc path | Documented capability/standard | Evidence | Verdict |
|---|---|---|---|
| `docs/20260506-file-export-adapters-parity-spec-v1.00W.md` | File-export parity spec | crm7#530–#533 OPEN (operator ground truth) | keep-active |
| `docs/20260506-integrations-parity-spec-v1.00W.md` | Integrations parity spec | crm7#527/#528 OPEN | keep-active |
| `docs/20260506-leave-parity-spec-v1.00W.md` | Leave parity spec | parity gaps crm7#527–#534 OPEN | keep-active |
| `docs/20260506-pay-periods-parity-spec-v1.00W.md` | Pay-periods parity spec | as above | keep-active |
| `docs/20260506-reports-parity-spec-v1.00W.md` | Reports parity spec | crm7#534 OPEN; cited by 0609 plan + Reports W2 plan | keep-active |
| `docs/20260506-timesheet-entry-parity-spec-v1.00W.md` | Timesheet entry parity spec | as above | keep-active |
| `docs/20260507-admin-parity-spec-v1.00W.md` | Admin parity spec | as above | keep-active |
| `docs/20260507-comms-parity-spec-v1.00W.md` | Comms parity spec | as above | keep-active |
| `docs/20260507-timesheet-approval-parity-spec-v1.00W.md` | Timesheet approval parity spec | as above | keep-active |
| `docs/20260506-apprentice-placement-avetmiss-nat00120-mapping-v1.00W.md` | AVETMISS NAT00120 export mapping | Reference spec for export hook | keep-active |
| `docs/20260506-apprentice-placement-form-schema-spec-v1.00W.md` | Placement form Zod/RHF spec | Canonical form spec | keep-active |
| `docs/20260506-apprentice-placement-state-machine-canon-v1.00W.md` | Placement state machine canon | Referenced by L6 audit-trigger + unit tests | keep-active |
| `docs/20260507-w4-permissions-editor-scoping-v1.00W.md` → `…v1.00A.md` | W4 permissions editor scoping | Scoping deliverable complete: bsuite#679 CLOSED "COMPLETE" 2026-05-07; W4 implementation tracked in OPEN bsuite#635 | **re-mark-A** |

### docs/ root — evidence-only artifacts (moved to `docs/archive/2026-06/`)

| Doc path | What it recorded | Evidence | Verdict |
|---|---|---|---|
| `docs/20260430-phase-3-vercel-deploy-verification-handoff-v1.00A.md` | Phase 3 deploy verification handoff | Header: green verification completed 2026-04-30 (§8) | archive |
| `docs/20260501-handoff-3c-bsu-developer-routes-deferred-v1.00W.md` | Parked BSU dev-routes handoff | Blocking dep landed: `business-suite-unified/supabase/migrations/20260502000000_drop_tenant_page_layouts.sql` exists; remaining work tracked as P1-15 in merged backlog | archive |
| `docs/20260501-handoffs-readme-v1.00W.md` | 2026-05-01 handoff batch index | All batch members archived (phase-0-closure + 3c this audit) | archive |
| `docs/20260501-p1-4b-coordination-log.md` | P1-4(b) multi-agent coordination log | Historical activity log; consumer-renderer handoff spec archived 2026-04-30 | archive |
| `docs/20260501-phase-0-completion-report-v1.00W.md` | Phase 0 completion report | Completed session report; ADRs 0001–0007 ratified and live in `docs/adr/` | archive |
| `docs/20260504-post-mortem-shared-packages-publish-v1.00W.md` | Publish-pipeline incident post-mortem | Incident closed: packages live on npm, fixes via bsuite PRs #435/#438; trusted-publishing rule codified in CLAUDE.md | archive |
| `docs/20260504-tp-04-bsuite-auth-migration-plan-v1.00D.md` | Cookie-SSO-era throughput auth plan | Own banner: "SUPERSEDED — HISTORICAL ONLY… should NOT be executed"; throughput is a BS OAuth PKCE client | supersede (by `AUTH_CANONICAL.md`) |
| `docs/20260506-codehouse-parity-progress-snapshot-v1.00W.md` | Parity progress snapshot | Self-describes as cron-refresh snapshot; superseded by live tracking in parity issues | archive |
| `docs/20260506-conduit-canonical-map-reconciliation-v1.00W.md` | Conduit canonical-map audit | One-off audit; outcome recorded in schema-gap decision doc | archive |
| `docs/20260506-conduit-schema-gap-decision-v1.00W.md` | `conduit_*`→`r7_*` slot-rename decision | DECIDED + implemented (decision header); companion audit archived alongside | archive |
| `docs/20260506-cron-log-claude-{18h,19h,20h,21h,22h}-v1.00W.md` (5 files) | Cron activity logs 2026-05-06 | Evidence-only; never edited | archive |
| `docs/20260507-cron-log-claude-scheduled-v1.00W.md` | Cron activity log 2026-05-07 | Evidence-only (CLAUDE.md reference path updated) | archive |
| `docs/20260512-cron-log-claude-06h-v1.00W.md` | Cron activity log 2026-05-12 | Evidence-only | archive |
| `docs/cron-logs/*` (6 files) | Cron/session logs 2026-05-07→05-24 | Evidence-only; `docs/cron-logs/` dir removed | archive |
| `docs/20260506-handoff-apprentice-placements-wiring-sleep-packet-v1.00W.md` | Apprentice-placements wiring handoff | Work shipped: identity bridge crm7#1024 CLOSED via crm7#1045 (2026-06-10) | archive |
| `docs/20260506-handoff-next-session-issue-burndown-v1.00W.md` | Next-session burndown handoff | Completed handoff packet (sessions executed 2026-05-06→05-19) | archive |
| `docs/20260506-ship-all-apps-overnight-handoff-v1.00W.md` | Overnight ship handoff | Completed handoff; later all-apps ship 2026-06-08 verified in memory/issue trail | archive |
| `docs/20260506-table-usage-audit-v1.00W.md` | 229-table usage audit | Audit complete ("zero drop candidates"); `apprentice_placements` restoration finding closed via crm7#1024/#1045 | archive |
| `docs/20260508-boot-engine-shipped-evidence-v1.00W.md` | BOOT engine shipped-state evidence | Evidence trail (cited from BOOT spec re-mark) | archive |
| `docs/20260508-roadmap-pending-audit-v1.00W.md` | Roadmap pending-items audit | One-off evidence doc for bsuite#731 rotation | archive |
| `docs/20260513-operator-decision-queue-v1.00W.md` | 6 operator decisions (2026-05-13) | D4 resolved (bsuite#866 CLOSED 2026-05-19), D6 resolved (crm7#758 CLOSED), D5 Xero tracked in issue queue; resolution log never backfilled — decisions live in tracker | archive |
| `docs/20260514-charge-calc-mapd-continuation-prompt-v1.00W.md` | Charge-calc/MAPD continuation prompt | Successor work executed: R80.3#248 CLOSED 2026-05-14; remaining MAPD tails tracked as OPEN R80.3#233–#235 | archive |
| `docs/20260524-claude-loop-compete-aeo-rotation-v1.00W.md` | COMPETE rotation session log | Evidence-only rotation log | archive |
| `docs/20260525-uiux-overhaul-2026-audit-session-v1.00W.md` | UI/UX overhaul session log | Session log; follow-ups tracked as issues (e.g. OPEN bsuite#1322) | archive |
| `docs/audits/20260507-bsuite-634-doctrine-backfill-audit-v1.00A.md` | bsuite#634 doctrine backfill audit | One-off approved audit export; `docs/audits/` dir removed | archive |

### docs/plans/

| Doc path | Documented capability/standard | Evidence | Verdict |
|---|---|---|---|
| `plans/20260227-boot-compliance-engine-specification-v1.00W.md` → `…v1.00A.md` | BOOT compliance engine spec | Engine shipped: `@bsuite/charge-calc@^0.5.0` in crm7 + R80.3 `package.json`; evidence trail `archive/2026-06/20260508-boot-engine-shipped-evidence-v1.00W.md` | **re-mark-A** |
| `plans/20260302-r80-crm7-integration-audit-v1.00W.md` → `…v1.00A.md` | R80.3↔CRM7 shared calc engine | Milestones delivered; R80.3#248 CLOSED 2026-05-14; `@bsuite/charge-calc` consumed by both apps | **re-mark-A** |
| `plans/20260316-crm7-broad-ui-refresh-plan-v1.00W.md` | CRM7 broad UI refresh | Superseded by uplift design language doctrine `plans/uplift/20260507-bsuite-uplift-design-language-v1.00A.md` + Reports W2 uplift | supersede |
| `plans/20260423-bsuite-production-plan-v1.00W.md` | April production plan (Phases 6–15) | Phase 6 re-verified 2026-05-12 (8/9 landed per its own header); superseded by 0609 umbrella plan | supersede |
| `plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md` | GTO billing/STP2/Payday Super | Approved; Xero lane still blocked on registration (open dependency) | keep-active |
| `plans/20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md` | Full-7 audit + UX upgrade | Its execution ledger archived 2026-04-30; `plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md` declares itself the superseding authority | supersede |
| `plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md` | Universal WYSIWYG + schema UX | Header v1.07W: page/form/custom authoring phases + exporters/undo-redo explicitly remain required | keep-active |
| `plans/20260504-typescript-6-migration-evaluation-v1.00W.md` → `…v1.00A.md` | TS 6.0 migration | Tracking issue bsuite#211 CLOSED 2026-05-12 | **re-mark-A** |
| `plans/20260506-codehouse-parity-and-platform-360-v1.00W.md` + `plans/20260506-codehouse-parity/*` (11 files) + `plans/codehouse-parity/PARITY-569-pay-item-groups-spec.md` + `plans/inputs/*` | Codehouse parity + Platform-360 index | Parity gaps crm7#527/#528/#530–#534 OPEN | keep-active |
| `plans/20260507-feature-builder-ux-red-team-v1.00W.md` | Feature Builder UX red-team / Phase 0.5 | No closure evidence found for feature-builder phases; FF-FB-UX-REDTEAM-20260507 | keep-active |
| `plans/20260510-universal-canvas-capability-implementation-v1.00W.md` | Universal canvas capability | Header: "not yet executed" | keep-active |
| `plans/20260511-part-o11-theme-placement-doc-coherence-plan-v1.00W.md` | O.11 theme / O.12 placement / O.13 docs coherence | Named planning authority in CLAUDE.md Theme System section | keep-active |
| `plans/20260513-bsuite-consolidated-hardening-v1.00W.md` | Consolidated hardening multi-cycle | References OPEN bsuite#1505 (multiple anchors) | keep-active |
| `plans/20260513-hf4-pgtap-rls-harness-v1.00W.md` → `…v1.00A.md` | HF-4 pgTAP anon-context RLS harness | bsuite#866 CLOSED 2026-05-19; header already "A — Approved / completed" | **re-mark-A** |
| `plans/20260513-ws4-timesheet-state-vocab-alignment-v1.00W.md` → `…v1.00A.md` | WS-4 timesheet state vocab alignment | crm7 PR #948 MERGED 2026-06-03 (commit `bf97acf9`); header "Status: COMPLETED" | **re-mark-A** |
| `plans/20260521-reports-w2-uplift-implementation-v1.00W.md` | Reports W2 uplift | Phase 1 shipped (crm7 PR #844 MERGED 2026-05-22; #840–#843 same wave); Phases 3a/3b/4/6/7 outstanding | keep-active |
| `plans/20260605-production-spec-completion-plan-v1.00W.md` | Production-spec completion | Superseded by `plans/20260609-…` umbrella (operator directive: 0609 carries the E–H/storage/#1506/#1066 tails) | supersede |
| `plans/20260609-production-readiness-next-steps-plan-v1.00W.md` | Production-readiness umbrella | OPERATOR DIRECTIVE: stays active until bsuite#1506, crm7#1066, storage phases, E–H tails close; "Status as of 2026-06-11" header added | keep-active (annotated) |
| `plans/README.md` | Plans index | Rewritten: Active / Completed (re-marked A) / Archived tables | keep-active (rewritten) |
| `plans/uplift/{20260507-bsuite-uplift-design-language-v1.00A.md,INDEX.md}` | Uplift design language doctrine | Approved doctrine cited by Reports W2 plan | keep-active |

### docs/ supporting directories

| Doc path | Documented capability/standard | Evidence | Verdict |
|---|---|---|---|
| `docs/adr/*.md` (9 files incl. README) | ADR-0001…ADR-0007 architecture decisions | Ratified decision records (ADR-0004 OAuth allowlist etc.) | keep-active |
| `docs/ai/**` (10 README/index files + feature map) | CRM7 AI assistant docs | Directory indexes for live AI features | keep-active |
| `docs/email-templates/README.md` | Supabase email template index | Live templates | keep-active |
| `docs/operator-screenshots/README.md` | Screenshot index | Referenced evidence dir | keep-active |
| `docs/testing/20260425-cross-app-e2e-runbook-v1.00W.md` | Cross-app entity-cell E2E runbook | Manual verification procedure still applicable (no superseding runbook found) | keep-active |
| `docs/archive/**` | Previously archived material | Already resolved — not re-tabulated | (archived) |

## Summary counts (parent repo)

| Verdict | Count |
|---|---|
| keep-active | 62 files (incl. grouped dirs: adr 9, ai 10, codehouse-parity 13, uplift 2, operator-verification 4) |
| archive (evidence-only) | 33 files (24 root docs + 6 `docs/cron-logs/` + 1 `docs/audits/` + handoff-3c + handoffs-readme counted in the 24) |
| supersede (archived with successor named) | 5 files (tp-04 auth plan; broad-ui-refresh; 20260423 production plan; full-7 audit plan; 20260605 production-spec plan) |
| re-mark-A | 6 files (boot spec, r80-crm7 audit, ts6 evaluation, hf4 pgTAP, ws4 timesheet, w4 permissions scoping) |

**Total moved to `docs/archive/2026-06/`: 37 files** (33 archive + 4 superseded plans; the superseded tp-04 was a root doc inside the 33-count). **Total renamed W→A: 6.**

## Moves performed

All via `git mv` into `docs/archive/2026-06/` (filenames preserved, content unedited):

```
20260317-bsuite-gap-report-v2.00W.md
20260319-entity-crosswalk-v1.00D.md
20260430-phase-3-vercel-deploy-verification-handoff-v1.00A.md
20260501-handoff-3c-bsu-developer-routes-deferred-v1.00W.md
20260501-handoffs-readme-v1.00W.md
20260501-p1-4b-coordination-log.md
20260501-phase-0-completion-report-v1.00W.md
20260504-post-mortem-shared-packages-publish-v1.00W.md
20260504-tp-04-bsuite-auth-migration-plan-v1.00D.md
20260506-codehouse-parity-progress-snapshot-v1.00W.md
20260506-conduit-canonical-map-reconciliation-v1.00W.md
20260506-conduit-schema-gap-decision-v1.00W.md
20260506-cron-log-claude-18h-v1.00W.md
20260506-cron-log-claude-19h-v1.00W.md
20260506-cron-log-claude-20h-v1.00W.md
20260506-cron-log-claude-21h-v1.00W.md
20260506-cron-log-claude-22h-v1.00W.md
20260506-handoff-apprentice-placements-wiring-sleep-packet-v1.00W.md
20260506-handoff-next-session-issue-burndown-v1.00W.md
20260506-ship-all-apps-overnight-handoff-v1.00W.md
20260506-table-usage-audit-v1.00W.md
20260507-cron-log-claude-scheduled-v1.00W.md
20260508-boot-engine-shipped-evidence-v1.00W.md
20260508-roadmap-pending-audit-v1.00W.md
20260512-cron-log-claude-06h-v1.00W.md
20260513-operator-decision-queue-v1.00W.md
20260514-charge-calc-mapd-continuation-prompt-v1.00W.md
20260524-claude-loop-compete-aeo-rotation-v1.00W.md
20260525-uiux-overhaul-2026-audit-session-v1.00W.md
(docs/audits/) 20260507-bsuite-634-doctrine-backfill-audit-v1.00A.md
(docs/cron-logs/) 2026-05-07-03h-claude-scheduled.md
(docs/cron-logs/) 2026-05-07-04h-claude-session-log.md
(docs/cron-logs/) 2026-05-13-claude-s3.md
(docs/cron-logs/) 20260513-claude-scheduled-s4.md
(docs/cron-logs/) 20260524-claude-scheduled-fire44.md
(docs/cron-logs/) bsuite_scheduled_log_claude_20260507_00h.md
(docs/plans/) 20260316-crm7-broad-ui-refresh-plan-v1.00W.md
(docs/plans/) 20260423-bsuite-production-plan-v1.00W.md
(docs/plans/) 20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md
(docs/plans/) 20260605-production-spec-completion-plan-v1.00W.md
```

Renames (status suffix W→A, in place; inbound references fixed across living docs):

```
docs/plans/20260227-boot-compliance-engine-specification-v1.00{W→A}.md
docs/plans/20260302-r80-crm7-integration-audit-v1.00{W→A}.md
docs/plans/20260504-typescript-6-migration-evaluation-v1.00{W→A}.md
docs/plans/20260513-hf4-pgtap-rls-harness-v1.00{W→A}.md
docs/plans/20260513-ws4-timesheet-state-vocab-alignment-v1.00{W→A}.md
docs/20260507-w4-permissions-editor-scoping-v1.00{W→A}.md
```

Reference fixes applied to living docs only (`docs/README.md` rewritten, `docs/plans/README.md` tables rewritten, `docs/OUTSTANDING.md`, `docs/20260425-bsuite-finish-line-roadmap-v1.00W.md`, `docs/20260504-bsuite-documentation-hub-v1.00W.md`, `docs/20260504-bsuite-tech-stack-alignment-v1.00W.md`, `docs/20260227-bsuite-master-roadmap-v5.00W.md`, `docs/CONSISTENCY-REPORT.md`, `docs/plans/20260609-production-readiness-next-steps-plan-v1.00W.md`, `CLAUDE.md` cron-log path). Archived/historical docs were NOT edited.

## Submodule closure-audit verdict tables (2026-06-11)

Merged from the submodule half of the audit. Per-repo PRs (all merged): crm7#1068, conduit#315, R80.3#314, BSU#542, braden#325, throughput#223. Full per-doc tables live in each repo's PR / `docs/archive/2026-06/README.md`; the condensed verdicts:

### crm7 (PR #1068)
3 archived (`reference/OUTSTANDING.md` refs-audit snapshot, 2× stale 2025-era status/QA references), 1 re-marked A (e-signing architecture — shipped: `documentSigner.ts` + `SignDocumentFlow.tsx`, crm7#687 closed), 8 indexes repaired (~25 dead links from the 2026-04-30 sweep). Kept active: document-storage docs (canonical for OPEN crm7#1056–#1058), GTO master plan + WS-3…WS-9 (crm7#527–#534 OPEN), migration-history drift doc (MIGRATION_FLOOR operational reference), Xero runbook (registration pending).

### conduit (PR #315)
0 archived. Both `2026-05-04` adopt-plans verified STILL UNIMPLEMENTED (no `components.json`, no `src/components/entity/` — checked 2026-06-11) → keep-active alongside the OPEN conduit#218–#252 backlog. 5 link/status repairs; 1 dead link superseded to the parent archive URL.

### R80.3 (PR #314)
1 archived (2026-03 roadmap with inline superseded banner), 2 re-marked A (Payday Super — shipped, R80.3#231/#232 closed; training fees — shipped, R80.3#129 closed). Kept active: MAPD/Fair Work API reference (live spec for `fairworkApi.ts`), unified-schema/billing references, plans STATUS (GTO invoicing/payroll OPEN as R80.3#233/#234).

### business-suite-unified (PR #542)
0 archived. Auth-dashboard hardening doc kept as the canonical operator runbook (bsu#283 closed external-blocked; portal actions still owed). Both adopt-plans verified still unimplemented (no `dashboard_layouts` table, no entity selectors) → keep-active. 2 indexes repaired.

### braden (PR #325)
0 archived. Roadmap kept (canonical tracking doc for dormant Phase 2–3 visual-editor items per plans/STATUS — rule 4); 3 dead provenance pointers repaired. Corporate theme + security docs all keep-active.

### throughput (PR #223)
Light pass — yesterday's naming sweep (#222) verified good against git first-commit dates; 11 residual pre-rename cross-links repaired in 2 component docs.

### Cross-repo findings (filed as bsuite#1522)
1. **Phantom mirror targets:** all 6 submodules' `INDEX.md`/`UNIFIED-ROADMAP.md`/`STACK-AUDIT.md`/`FEATURE-SURFACE.md` claim to mirror parent files that have never existed (verified `git log --all`).
2. **PARENT-DOCS.md desync:** the 6-way-identical file links three docs this audit archived.
3. crm7 plans/STATUS sibling banner references two removed OUTSTANDING files.

## Final summary (parent + submodules)

| Verdict | Parent | Submodules | Total |
|---|---|---|---|
| keep-active | 62 | ~70 (incl. authority files) | ~132 |
| archive | 33 | 4 | 37 |
| supersede | 5 | 2 (dead links → parent archive URLs) | 7 |
| re-mark-A | 6 | 3 | 9 |

Companion deliverables: STATUS.md truth-up (bsuite#1521 — 13 stale cells), R80.3#235 closed as completed-by-WS-G, crm7#530 re-scoped in-issue, bsuite#1522 filed (mirror debt). The `20260609-production-readiness` plan remains the ACTIVE umbrella per operator directive.

<!-- SUBMODULE-TABLE-MERGE-POINT -->

---

*Filed 2026-06-11 by the parent-repo half of the docs/roadmap closure audit. The submodule agent's verdict table will be appended at the merge point above.*
