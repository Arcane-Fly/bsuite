---
kind: record
authority: none
owner: bsuite
---

# BSuite Docs Deep-Dive Inventory — 2026-07-27

**Status:** F (Frozen) · **Lane:** DOCS · **Scope:** parent `docs/` + all six submodule `docs/` trees
**Method:** Read-only audit. Every capability/feature/standard claim verified against source (`grep`/`read_file`) before a verdict was assigned. No doc was moved or edited; this report is the only file written.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## Classification rules (applied uniformly)

- **COMPLETE-archive** — doc claims a capability is shipped AND the claim is backed by a concrete `file:line` citation or merged PR that was actually verified. Action = archive (see archive-target caveat below).
- **INCOMPLETE** — doc claims shipped but code does not back it, OR it carries explicit open/pending items. Action = keep + record what is missing.
- **LIVING** — standard / doctrine / reference / README / INDEX / STATUS / roadmap / runbook / ADR meant to stay current. Action = keep (living).

**Hard rule honoured:** no doc is marked COMPLETE-archive without a verified `file:line` or merged-PR citation.

## Verified state used (2026-07-27)

NOW lane + RT cycle + notes batch + N-CRIT p1+p2 + fairwork 503 fix + legal pages + landing dark treatment + Share Portal + money-integrity batch all shipped; 37 crm7 issues closed with evidence; braden#264/#265 closed; conduit#381 cards; schema-builder 1.0.1 published; module-visibility unglue; card-unglue contract test. Validation lane summaries: `~/.hermes/cache/delegation/subagent-summary-*-20260727_185629_*.txt`.

## Cross-cutting caveats (verified, affect multiple repos)

1. **schema-builder consumer lag.** `packages/schema-builder/package.json:3` = `1.0.1` and `@bsuite/schema-registry` = `1.0.0` (installed in conduit/R80.3/braden/BSU), BUT `crm7/package.json:61` still pins `@bsuite/schema-builder ^0.7.3`. No doc may be marked complete on a "1.0.1 consumed everywhere" claim until crm7 (and any lagging consumer) bumps. Per `docs/DEPENDENCY-BUMP-CHECKLIST.md` doctrine this is a publish-before-pin chain gap, not a doc error.
2. **Archive target relocated (2026-07-25).** In-repo `docs/archive/` trees were emptied; only a `README.md` pointer remains in each. The archive now lives at `/home/braden/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/<repo>/docs/archive`. The literal target `docs/archive/2026-07/` does not currently exist in-repo — COMPLETE-archive rows must route to the external archive path (or recreate the in-repo folder) before any move.
3. **Deprecated cookie-SSO claims still live.** Several living docs still assert the `.crm7.app` shared-cookie SSO that was removed 2025-02-27 (AGENTS.md §Auth canonical, `AUTH_CANONICAL.md`). These are active regression hazards and must be corrected, not archived. Flagged inline per repo.
4. **Mirror-doc version drift.** `STACK-AUDIT.md` / `FEATURE-SURFACE.md` / `CONSISTENCY-REPORT.md` / `UNIFIED-ROADMAP.md` / `PARENT-DOCS.md` are byte-synced mirrors that have drifted from `package.json` in every submodule (React 19, TS 6, charge-calc `^0.5.0`, schema-registry `1.0.0`, theme `^0.6.0`, motion `^12.40.0`, etc.). Low leverage individually, high aggregate churn.
5. **Missing provenance doc.** `plans/20260227-boot-compliance-engine-specification-v1.00A.md` cites `docs/archive/2026-06/20260508-boot-engine-shipped-evidence-v1.00W.md`, which no longer exists (lost in the archive relocation). Code verifies the claim; the cited evidence file is drifted.

## Suite totals

| Repo | Files | COMPLETE-archive | INCOMPLETE | LIVING |
|---|---|---|---|---|
| parent (`bsuite/docs`) | 152 | 11 | ~46 | ~95 |
| crm7 | 50 | 6 | 12 | 32 |
| conduit | 17 | 0 | 5 | 12 |
| business-suite-unified | 29 | 4 | 2 | 23 |
| R80.3 | 22 | 5 | 1 | 16 |
| throughput | 32 | 0 | 7 | 25 |
| braden | 24 | 0 | 4 | 20 |

---

## 1. Parent (`bsuite/docs`)

Verdict key: **C** = COMPLETE-archive · **I** = INCOMPLETE · **L** = LIVING.

| Doc path | Claim | Verdict | Evidence | Action |
|---|---|---|---|---|
| 20260227-contributing-standards-guide-v1.01W.md | Universal code/doc/commit standards | L | Referenced by all CONTRIBUTING.md | keep (living) |
| 20260227-dry-one-shot-architecture-v1.04A.md | DRY one-shot architecture + ownership map | L | Doctrine; "Last updated 2026-07-24 (v1.04A)" | keep (living) |
| 20260424-env-var-contributing-rules-v1.00W.md | Env-var naming/scoping rules | L | "Status W (living document)" | keep (living) |
| 20260504-bsuite-documentation-hub-v1.00W.md | Cross-submodule doc hub | L | Canonical doc index | keep (living) |
| 20260505-bsuite-dependency-refresh-ts6-migration-v1.00W.md | TS 5.9→6.0 migration record | C | `packages/auth/tsconfig.build.json:8`; TS `~6.0.3` `crm7/package.json:198` | archive |
| 20260506-apprentice-placement-avetmiss-nat00120-mapping-v1.00F.md | NAT00120 termination-code mapping | L | NCVER reference; no `*avetmiss*` export hook | keep (living) |
| 20260506-apprentice-placement-form-schema-spec-v1.00F.md | Placement form + Zod schema | L | `crm7/src/components/apprentices/ApprenticePlacementForm.tsx:10,108` | keep (living) |
| 20260506-apprentice-placement-state-machine-canon-v1.00W.md | 13-state + 5-state machines | L | `crm7/src/lib/workflows/placementWorkflow.ts`, `apprenticePlacementWorkflow.ts:117` | keep (living) |
| 20260506-cross-app-auth-bug-rca-v1.00A.md | Cross-app auth RCA + remediation | L | RCA (Status A); OIDC silent re-auth "tracked" open | keep (living) |
| 20260506-dependency-bump-checklist-v1.00A.md | `@bsuite/*` bump ceremony | L | v1.00A canonical ceremony | keep (living) |
| 20260506-file-export-adapters-parity-spec-v1.00W.md | ABA/PayWay/Super exporters (3 gaps) | I | No `super_funds`/`payroll_exports` migration; `abaGenerator.ts` absent | keep |
| 20260506-integrations-parity-spec-v1.00W.md | Idibu/Onboarded/Calendly adapters (5 gaps) | I | No `vendor_integrations` migration; webhook fns absent | keep |
| 20260506-leave-parity-spec-v1.00W.md | Leave persistence + calendar/cash-out (5 gaps) | I | `20260228120200_create_leave.sql:16,89`; `leave_types` absent; cash-out/CoInvest/DV unbuilt | keep |
| 20260506-pay-periods-parity-spec-v1.00W.md | Pay-period streams/lock + reminder (4 gaps) | I | `20260707000020_pay_periods_table.sql:5`; streams/lock/reminder unverified | keep |
| 20260506-reports-parity-spec-v1.00F.md | 7 report pages (superseded) | L | Header redirects to `plans/20260521-reports-w2-uplift…` | keep (living) |
| 20260506-timesheet-entry-parity-spec-v1.00W.md | 3 tables + 4 cols + WHS (8 gaps) | I | `company_settings` table not found | keep |
| 20260507-admin-parity-spec-v1.00W.md | 14 admin/payroll-tax gaps | I | `public_holiday_groups`/`purchase_orders`/`hiring_divisions`/`citb_levy`/`pay_items` absent | keep |
| 20260507-comms-parity-spec-v1.00W.md | SMS dispatcher + login popup (3 gaps) | I | `crm7/src/lib/smsAdapter.ts:4` exists; no dispatcher edge fn | keep |
| 20260507-ff-self-validation-doctrine-v1.00W.md | FF-SELF-VALIDATION doctrine | L | Source for AGENTS.md §9 | keep (living) |
| 20260507-red-team-ux-doctrine-v1.00A.md | Red-team + UX-DX doctrine | L | "AUTHORITATIVE for all BSuite crons" | keep (living) |
| 20260507-timesheet-approval-parity-spec-v1.00W.md | Bulk-approve RPC + reminder (4 gaps) | I | `bulk_approve_timesheets` only as AI tool name (`crm7/src/lib/ai/tools/index.ts:145`); no RPC | keep |
| 20260507-w4-permissions-editor-scoping-v1.00A.md | W4 Permissions Editor scoping | L | Scoping done (bsuite#679); W4 impl open (bsuite#635) | keep (living) |
| 20260519-rpc-report-page-security-review-v1.00F.md | Approved spec for `rpc_report_page` | L | Header: SPEC ONLY/not implemented | keep (living) |
| 20260519-storage-rls-four-persona-matrix-v1.00A.md | Storage RLS four-persona matrix | L | `crm7/supabase/tests/database/25_storage_bucket_policy_coverage.sql:243-279` | keep (living) |
| 20260519-xero-payroll-au-stp-path-decision-v1.00A.md | ADR: V1 = Xero Passthrough (Option B) | L | `xero-token-exchange`/`xero-invoice-submit`/`xero-webhook` exist; `xero-payroll-submit` unbuilt | keep (living) |
| 20260629-batch-e-rbac-parity-dev-deploy-test-plan-v1.00W.md | Test plan WC-008…012 RBAC fixes | C | `crm7/supabase/migrations/20260629120000_wc008_remove_dead_super_admin_branch.sql`; `usePlatformRole.ts:214`; `conduit/src/lib/supabase/middleware.ts:199` | archive |
| 20260629-batch-e-rbac-parity-dev-deploy-test-report-v1.00W.md | Conduit Team `joined_at` fix verified PASS | C | `conduit/src/components/settings/TeamSection.tsx:110-113`; PR #342 | archive |
| 20260629-bsuite-role-rls-subscription-parity-matrix-v1.00W.md | Role/RLS/subscription matrix; 5 gaps resolved | I | Gaps fixed but §4 client fail-stale trace "deferred"; external-auditor role unimplemented | keep |
| 20260629-bsuite-world-class-audit-tracker-v1.00W.md | Vercel + world-class audit tracker | I | Rows "In progress"; Batch E "pending deploy"; merge "BLOCKED" | keep |
| 20260629-bsuite-world-class-feature-inventory-v1.00W.md | Cross-app feature/entity/role inventory | L | Standing reference (WC-008…012 verified) | keep (living) |
| 20260629-vercel-production-launch-runbook-v1.00W.md | Vercel Pro launch/incident/rollback runbook | L | Runbook; PARTIAL rows (CSP, Sentry, rate limiting) | keep (living) |
| 20260630-cross-app-auth-validation-dev-deploy-test-plan-v1.00F.md | OAuth→setSession bridge yields 200 RLS reads | C | `conduit/src/app/auth/callback/page.tsx:119-177` (setSession+poll+throw) | archive |
| 20260630-cross-app-auth-validation-dev-deploy-test-report-v1.00W.md | 5/5 apps PASS auth bridge validation | C | `conduit/src/app/auth/callback/page.tsx:119-177` | archive |
| 20260722-developer-portal-investigation-v1.00W.md | Read-only investigation of 5 dev-portal pages | I | "No code changes"; FeatureBuilder "3/8 live" finding STALE (`FeatureBuilder/index.tsx:39-46` all `live:true`) | keep |
| 20260722-visual-qa-d-apps-v1.00W.md | Visual QA sweep; "ALL ITEMS CLOSED" | C | `conduit/src/services/pipelineService.ts:64-68`; `useAIChat.ts:76`; PRs crm7#1191/conduit#368/BSU#576/R80#342/throughput#250 | archive |
| 20260723-anytime-workforceone-admin-guide-v1.00W.md | Competitor (Code House AnyTime) admin guide | L | Static crawled competitor reference | keep (living) |
| 20260723-bsuite-capability-matrix-v1.00W.md | Competitor capability matrix + ledger | I | P0 resolved; P1/P2 open; watch `crm7/package.json:61` schema-builder `^0.7.3` | keep |
| 20260724-bsuite-vercel-env-inventory-v1.00W.md | Per-app Vercel prod env-var inventory | L | Inventory; email-ingestion env "not yet present" | keep (living) |
| 20260724-oneshot-cross-cutting-audit-v1.00W.md | One-shot DRY audit; 5 violations fixed | I | crm7#469/#470/#471 open; bsuite#1610 LocalisedDateInput open | keep |
| 20260724-recurring-bugs-and-blindspots-v1.00W.md | Recurring bug classes + blindspots | I | §9 OPEN: SQL linter #1175/#1158, flake #1159, Advisor/SECDEF/CSP #1261/#1542/#1139 | keep |
| 20260725-backlog-closeout-loop-v1.00A.md | Close-out loop; host capacity + Jodie shipped | I | `crm7/src/lib/hostCapacityGate.ts:51` wired `placements/create.tsx:295`; gaps remain | keep |
| 20260725-excellence-program-master-ledger-v1.00W.md | Excellence program master ledger | I | STA BLOCKED, WHS deferred, Sydney scheduled, Billing.tsx "next lane" | keep |
| 20260725-headroom-learn-notes-v1.00F.md | Headroom `learn` run notes | I | "--apply not run"; litellm unconfigured; Qwen key 401 | keep |
| 20260725-sta-email-samples-checklist-v1.00W.md | STA email sample checklist for PROVEN_STATES | I | All 6 state sample rows blank | keep |
| 20260725-sydney-migration-readiness-v1.00W.md | Sydney region migration readiness (#1322) | I | RUNBOOK_READY only; cutover approval + dry-run unchecked | keep |
| CONSISTENCY-REPORT.md | Cross-app consistency tracker | L | "Last updated 2026-07-07" | keep (living) |
| NEW_ISSUES_FOUND.md | Append-only pre-existing-issue ledger | L | Append-only ledger | keep (living) |
| OUTSTANDING.md | Single outstanding-work index (SSoT) | L | "Updated 2026-07-08" SSoT | keep (living) |
| README.md | Parent docs navigation index | L | Nav hub | keep (living) |
| 00-roadmap/20260112-master-roadmap-v1.00F.md | Master planning roadmap | L | Last updated 2026-07-26/27; active checkboxes | keep (living) |
| 00-roadmap/20260725-excellence-closeout-implementation-plan-v1.00F.md | Excellence close-out impl plan (T0–Tn) | I | Unchecked AC boxes; explicit DEFER items | keep |
| 00-roadmap/20260725-qwen-excellence-integration-plan-v1.00F.md | Qwen excellence integration plan (W1–W6) | I | Status W; DEFER list | keep |
| adr/ADR-0001-page-builder-ownership.md | CRM7 custom_pages canonical; BSU layouts dropped | L | `business-suite-unified/supabase/migrations/20260502000000_drop_tenant_page_layouts.sql` | keep (living) |
| adr/ADR-0002-schema-builder-ownership.md | CRM7 owns tenant_entities/field_definitions | L | Decision doc | keep (living) |
| adr/ADR-0003-consumer-renderer-pattern.md | Per-app renderers, no shared npm package | L | Decision doc | keep (living) |
| adr/ADR-0004-oauth-allowlist-doctrine.md | AGENTS.md is SSoT for redirect allow-list | L | AGENTS.md allow-list matches; note duplicate ADR-0004 number | keep (living) |
| adr/ADR-0004-schema-builder-consolidation.md | Shared @bsuite/schema-builder, thin wrappers | L | `packages/schema-builder/package.json:3`=1.0.1 BUT `crm7/package.json:61` `^0.7.3`; duplicate number; not in index | keep (living) |
| adr/ADR-0005-rams-funding-authoring.md | CRM7 hosts RAMS funding matrix authoring | L | Decision doc; Phase 4 future | keep (living) |
| adr/ADR-0006-contact-propagation-doctrine.md | contacts/clients canonical; junction-not-table | L | Cites `20260423020000_phase4_v1_candidate_contact_merge.sql` | keep (living) |
| adr/ADR-0007-stripe-fdw-read-doctrine.md | Stripe reads via FDW behind SECDEF wrappers | L | `supabase/migrations/20260512161000_stripe_fdw_wrappers.sql` | keep (living) |
| adr/README.md | ADR index (0001–0007) | L | Omits ADR-0004-schema-builder-consolidation; duplicate 0004 | keep (living) |
| ai/README.md | CRM7 AI Assistant overview + status | L | Stale (says Grok 4.1; live roster is `xai/grok-4.3` since 2026-07-31 — read `grok-4.20-reasoning` at audit time; Phases 4-6 unchecked) | keep (living) |
| ai/CONTRIBUTING.md | AI dev standards | L | Stale: recommends `toDataStreamResponse` (banned by AGENTS.md AI §2) | keep (living) |
| ai/architecture/README.md · ai/development/README.md · ai/diagrams/README.md · ai/integrations/README.md · ai/pricing/README.md · ai/reference/README.md | Stubs — planned, not populated | L | Placeholders | keep (living) |
| ai/features/20260227-feature-map-complete-v1.00W.md | "49 tools", Phase 1 ✅, full feature map | I | Phases 3-6 unchecked; model Grok 4.1 superseded; no tool-registry impl evidence | keep |
| ai/features/README.md | Index of features docs | L | Filename drift (cites v1.0.0.md, actual v1.00W.md) | keep (living) |
| audits/20260725-action-plan-from-audits-v1.00A.md | Audit-driven action plan; STA BLOCKED | I | STA 6-state parsers BLOCKED + 3 open NEXT items | keep |
| audits/20260725-bsu-braden-throughput-deep-bug-excavation-v1.00W.md | 12 bugs (3 CRIT/HIGH) | I | BUG-01 raw `custom_css` injection; BUG-06 dead `Lock` (`FeatureBuilder/index.tsx:13,146-170`) | keep |
| audits/20260725-bsu-braden-throughput-docs-code-audit-v1.00W.md | 46 docs audited; 23 STALE, 5 PARTIAL | I | 23 STALE verdicts unresolved | keep |
| audits/20260725-conduit-r80-deep-bug-excavation-v1.00W.md | conduit/R80 bugs; HIGH non-atomic confirm-flow | I | HIGH: `staEmailActions.ts:120-155` 3 writes, no RPC/txn | keep |
| audits/20260725-conduit-r80-docs-code-audit-v1.00F.md | conduit+R80 docs↔code audit (36 docs) | I | SUBSTANTIVE-MATCH/PARTIAL pending closure | keep |
| audits/20260725-crm7-deep-bug-excavation-v1.00F.md | crm7 P0–P3 bug hunt | I | P0 open: `get_email_integration_token` RPC absent; `emailService.ts:584-625` | keep |
| audits/20260725-crm7-docs-code-audit-v1.00F.md | crm7 feature docs↔code verdicts | I | STALE-DOC: xero ref (`useFeatureFlags.ts:73`); doc-storage OPEN (crm7#1056-#1058) | keep |
| audits/20260725-dead-duplicate-code-audit-v1.00W.md | Dead/dup code inventory | I | DUPLICATE_CONSOLIDATE (LocalisedDateInput ×6) not extracted | keep |
| audits/20260725-jodie-parity-matrix-v1.00F.md | Jodie UI-action→tool parity matrix | I | MISSING/PARTIAL rows; stale re: leave/FO | keep |
| dashboard/README.md | Plan dashboard architecture/refresh | L | Dashboard live per AGENTS.md §10 | keep (living) |
| email-templates/README.md | Supabase auth email templates + theme | L | README; raw hex vs OKLCH (minor) | keep (living) |
| operator-screenshots/README.md | Screenshot capture protocol | L | Protocol README | keep (living) |
| archive/README.md | Archive relocated out of monorepo 2026-07-25 | L | Pointer README | keep (living) |
| plans/README.md · plans/STATUS.md | Plans index / status board | L | Index / "Last updated 2026-07-01" | keep (living) |
| plans/20260227-boot-compliance-engine-specification-v1.00A.md | BOOT engine shipped in charge-calc + CRM7 | C | `packages/charge-calc/src/index.ts:15`; `boot/recommender.ts:1`; `integration-phase2.test.ts:146-263`. Cited evidence doc missing (caveat 5) | archive |
| plans/20260302-r80-crm7-integration-audit-v1.00A.md | Audit/reference; charge-calc shared | L | `crm7/package.json:55`+`R80.3:52`+`conduit:27`=`charge-calc@^0.5.0` | keep (living) |
| plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md | 9-WS GTO billing/payroll/reporting; 3/9 done | I | WS-1 "PUBLISH BLOCKED" (bsuite#1408 npm serves charge-calc 0.4.0); WS-4/5/6/8/9 partial | keep |
| plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md | WYSIWYG + Schema Builder master plan, 6 phases | I | Phase 0/SB 1a/1b complete; authoring active | keep |
| plans/20260504-typescript-6-migration-evaluation-v1.00A.md | TS 5→6 migration across 6 apps (bsuite#211) | C | TS `~6.0.3`/`^6.0.3` in crm7:198, R80.3:126, conduit:108, braden:143, throughput:94, BSU:158 | archive |
| plans/20260506-codehouse-parity-and-platform-360-v1.00W.md | Index for 35 parity gaps + Platform-360 | I | §2 "delivers WS-A1+A4+D scaffolding+E spec only"; rest deferred | keep |
| plans/20260506-codehouse-parity/20260506-portal-*.md (9 files: braden-marketing, bsu-admin, bsu-tenant-admin, conduit-candidate, conduit-careers, conduit-employer, conduit-recruiter, crm7-internal, r80-3-calculator) | Per-portal gap specs | I | Pervasive `(TODO: audit)` RLS rows; missing tables + unshipped edge fns (`sms-dispatcher`, `stp-submit`, `verify-right-to-work`, `e-sign-offer`) | keep |
| plans/20260506-codehouse-parity/20260506-visual-feature-builder-spec-v1.00W.md | WS-E dev-only `/dev/feature-builder` spec | I | `status: W`; paths "(planned)"; route not built | keep |
| plans/20260506-codehouse-parity/README.md | Index of 9 portal sub-plans + spec | L | Pure INDEX | keep (living) |
| plans/20260507-feature-builder-ux-red-team-v1.00F.md | FB UX red-team + Phase 0.5 | I | "under review"; §3 P1 frictions open | keep |
| plans/20260510-universal-canvas-capability-implementation-v1.00F.md | Systemic canvas/drag fix across 6 apps | I | `status: W (not yet executed)` | keep |
| plans/20260511-part-o11-theme-placement-doc-coherence-plan-v1.00W.md | O.11 theme centralisation + O.12/O.13 | I | "O.11 POC first" forward-looking | keep |
| plans/20260513-bsuite-consolidated-hardening-v1.00W.md | 7-phase hardening, ~25-35 PRs | I | Phase 0 step 0.2 "NEXT"; Phase 1.5 SMTP "DEFERRED → bsuite#1505" | keep |
| plans/20260513-hf4-pgtap-rls-harness-v1.00A.md | pgTAP anon-context RLS harness (bsuite#866) | C | `crm7/supabase/tests/database/00_harness_helpers.sql`…`06_payroll_records_rls.sql`; CRM7 PR #949 | archive |
| plans/20260513-ws4-timesheet-state-vocab-alignment-v1.00A.md | Align TS TimesheetState to 7-state DB enum (HF-2) | C | `crm7/src/types/entities.ts:466-467`; transition map :454-459; CRM7 PR #948 | archive |
| plans/20260521-reports-w2-uplift-implementation-v1.00F.md | W2 Airtable-style reports uplift (Tasks 1–9) | I | Tasks 1–9 mostly Merged (crm7#840…#987) but "Task 3a Deferred" open | keep |
| plans/20260609-production-readiness-next-steps-plan-v1.00W.md | Active production-readiness umbrella | I | Open bsuite#1505, crm7#661/#662/#530; STATUS.md ACTIVE | keep |
| plans/20260611-docs-roadmap-closure-audit-v1.00A.md | One-off closure audit; 37 archived + 6 renamed | C | PR bsuite#1520 + #1523 merged 2026-06-11 | archive |
| plans/20260617-product-tails-continuation-prompt-v1.00F.md | Handoff prompt for remaining product tails | I | Open scope table | keep |
| plans/20260618-recruitment-comms-rams-cluster-plan-v1.00A.md | Cluster SHIPPED + prod-verified 2026-06-24 | I | conduit#221/#225/#227/#229 CLOSED; §4 ADMS APIM-key / RAMS final-lodgement gap open | keep |
| plans/20260629-bsuite-remaining-work-roadmap-v1.00F.md | Subordinated remaining-work roadmap | I | CRM7 wizards #659-#662 blocked; R80.3#320 OPEN; #1322/#479 operator-blocked | keep |
| plans/20260629-remaining-work-continuation-prompt-v1.00F.md | Continuation prompt for 0629 roadmap | I | Points at open items | keep |
| plans/20260701-docs-plans-closure-audit-v1.00W.md | Working closure audit + execution log | I | conduit#218/#219/#231 + crm7#1090 CLOSED; §12.3 deploy fix pending | keep |
| plans/20260703-gto-e2e-gap-map-v1.00F.md | W1 file-grounded gap map of GTO cycle | I | `boot_assessments`/`charge_rate_audit_log`/`award_rate_cache` missing live; stages 3/6 MISSING | keep |
| plans/20260703-unified-authoring-surface-plan-v1.03A.md | In-context authoring surface; Phase-1 authorized | I | §11 BLOCKING pre-work + §10 open; not executed | keep |
| plans/20260709-hermes-deep-dive-audit-prompt-refined-v1.00F.md | Refined prompt for Hermes audit instructions | I | Prompt artifact | keep |
| plans/20260716-bsuite-completion-program-plan-v1.00F.md | Completion program orchestration + CC Directive | I | Clusters A-F open; W4/W5/W9/W10 unexecuted | keep |
| plans/20260723-bsuite-documentation-program-design-v1.00D.md | Two-layer docs program design (Approved) | I | Build lanes L1-L4 not executed | keep |
| plans/20260723-completion-program-refined-v1.00F.md | Refined prompt for completion program | I | W1 publish chain "blocked on operator npm login" | keep |
| plans/20260724-bsuite-1322-region-migration-runbook-v1.00D.md · plans/20260724-bsuite-1322-supabase-region-migration-scope-v1.00D.md | Draft Sydney runbook + scope | I | "won't execute without explicit go"; bsuite#1322 OPEN | keep |
| plans/20260724-conduit-338-training-contract-status-email-ingestion-plan-v1.00D.md | Draft email-ingestion build scope for #338 | I | Status D; open design questions | keep |
| plans/20260724-email-funding-expansion-scope-v1.00D.md | Draft email/funding expansion scope | I | W1-W3 "NOT MODELLED"/"PARTIAL" | keep |
| plans/20260724-recruitment-employment-handover-design-v1.00D.md | Draft recruitment→employment handover design | I | W1-W3 not built; "RECORD ONLY" | keep |
| plans/20260724-recurring-bugs-blindspots-refined-v1.00D.md | Refined prompt for recurring-bugs ledger | I | Analysis-only | keep |
| plans/20260725-docs-deadcode-archive-refined-v1.00F.md · plans/20260725-gto-excellence-program-refined-v1.00F.md · plans/20260725-gto-persona-excellence-design-v1.00D.md | Refined prompts / persona design (Draft) | I | Prompt/design artifacts; not closure exports | keep |
| plans/codehouse-parity/20260817-parity-569-pay-item-groups-spec-v1.00W.md | Pay Item Groups parity spec; PR-A–F merged | I | PR-A–F merged (crm7#950-#955); PR-G "npm publish blocked" (bsuite#1363) | keep |
| plans/inputs/20260506-codehouse-parity-prompt-enhancer-output-v1.00F.md | prompt-enhancer provenance output | I | One-off prompt output | keep |
| plans/loop-contracts/20260703-gto-e2e-cycle-loop-contract-v1.00W.md | Loop contract for GTO E2E cycle W0-W7 | I | W2-W7 success conditions unmet | keep |
| plans/loop-contracts/20260817-recruitment-comms-rams-loop-contract-v1.00F.md | Loop contract for recruitment cluster | I | STATE table stale; RAMS/ADMS gap | keep |
| plans/uplift/20260507-bsuite-uplift-design-language-v1.00A.md | Unified design-language doctrine (Approved) | L | Doctrine cited by INDEX + Reports W2 | keep (living) |
| plans/uplift/INDEX.md | Uplift 9-wave tracker/index | L | Wave index (W0/W1 done, W2-W8 open); bsuite#635 | keep (living) |
| references/codehouse_kb_crawl_results.md · references/codehouse-knowledgebase-crawl.md | Code House WfO KB crawl data | L | Reference crawl data | keep (living) |
| research/20260725-gto-compliance-ux-research-v1.00W.md | GTO/Fair Work/incentive UX research | I | Status W; "Recommendation: Adopt" items not implemented | keep |
| runbooks/20260716-database-migration-dispatch-guide-v1.00W.md · edge-function-deploy-guide · parent-pointer-reconcile-guide · secrets-vault-rotation-guide · tenant-switching-branding-tiers-guide · runbooks/README.md | Operational runbooks + index | L | Cite live workflows/migrations/RPCs | keep (living) |
| testing/20260425-cross-app-e2e-runbook-v1.00W.md | Manual E2E for cross-app EntityRefCell linkage | L | Operational manual; env-gated Playwright | keep (living) |
| 20260428-operator-verification/03-oauth-state-secret.md | OAUTH_STATE_SECRET missing + deployed code old | I | Local HMAC present (`oauth-state.ts:86`); live secret/deploy unverified | keep |
| 20260428-operator-verification/04-tga-gucs.md · 05-tga-sync-enabled.md | TGA GUCs NULL / sync not enabled | I | Documented open operator actions; live DB state unverified | keep |
| 20260428-operator-verification/README.md | Verification sweep index (4 complete/3 incomplete) | L | Tracks 3 unresolved items (3,4,5) | keep (living) |

### INCOMPLETE ledger (parent) — by leverage

1. **audits/20260725-crm7-deep-bug-excavation** — P0 `get_email_integration_token` RPC undefined (0 matches in `crm7/supabase/migrations`); email integrations cannot decrypt tokens. Plus money races (`fundingService.ts` `remaining_budget` never decremented; `leaveRequestService.ts` double-approve). Missing: RPC migration + atomic money writes.
2. **plans/20260423-gto-billing-reporting-refined-plan** — WS-1 calc convergence "PUBLISH BLOCKED": source `charge-calc@0.5.0` fixed but npm serves 0.4.0 (bsuite#1408); 6/9 workstreams partial.
3. **plans/20260703-gto-e2e-gap-map + loop-contracts/20260703-gto-e2e-cycle-loop-contract** — live schema missing `boot_assessments`, `charge_rate_audit_log`, `award_rate_cache`; BOOT gate + quote/requote hard-fail; W2-W7 unbuilt.
4. **20260725-sydney-migration-readiness + plans/20260724-bsuite-1322-*** — Sydney migration NOT executed; bsuite#1322 OPEN; dry-run + operator cutover pending.
5. **20260725-sta-email-samples-checklist** — blocks STA PROVEN_STATES beyond WA/NT; all 6 state sample rows blank (external-input blocked).
6. **Parity-spec batch (8 docs)** — verified-missing schema/code (`super_funds`, `vendor_integrations`, `leave_types`, `company_settings`, `pay_items`, `public_holiday_groups`, SMS dispatcher edge fn, bulk-approve RPC). Admin spec highest leverage (14 gaps).
7. **plans/20260506-codehouse-parity-and-platform-360 + 9 portal sub-plans + visual-feature-builder-spec** — 35 parity gaps; `(TODO: audit)` RLS rows; feature-builder route unbuilt.
8. **20260724-recurring-bugs-and-blindspots** — permanent-control debt: SQL linter false-greens (#1175/#1158), flake (#1159), Advisor/SECDEF/CSP (#1261/#1542/#1139).
9. **20260723-bsuite-capability-matrix** — competitive-parity P1 open + schema-builder pin caveat.
10. **audits/20260725-conduit-r80-deep-bug-excavation** — HIGH non-atomic `confirmStaEmail` 3-write gap (`staEmailActions.ts:120-155`).
11. **audits/20260725-bsu-braden-throughput-deep-bug-excavation** — CRIT raw `custom_css` injection bypassing sanitizer.
12. **plans/20260513-bsuite-consolidated-hardening** — Phase 0 crm7#758 reconciliation stuck; Phase 1.5 SMTP deferred (bsuite#1505); Phases 2-7 not started.
13. **20260725-excellence-program-master-ledger + 20260725-backlog-closeout-loop** — open queue: STA blocked, WHS deferred, enterprise-admin Jodie, payslip, Billing.tsx tiers.
14. **audits/20260725-jodie-parity-matrix** — MISSING/PARTIAL rows; stale re: shipped leave/FO tools.
15. **audits/20260725-dead-duplicate-code-audit** — LocalisedDateInput ×6, tenantRoutes ×5, 102 orphans not extracted.
16. **audits/20260725-*-docs-code-audit (3 docs)** — 23+ STALE docs need updates.
17. **20260724-oneshot-cross-cutting-audit** — crm7#469/#470/#471; bsuite#1610 LocalisedDateInput open.
18. **20260629-bsuite-world-class-audit-tracker + role-rls-subscription-parity-matrix** — rows "In progress"; §4 client fail-stale trace deferred; external-auditor role unimplemented.
19. **plans/20260609-production-readiness + 20260629-bsuite-remaining-work-roadmap + continuation prompts** — open E-H tails; CRM7 wizards #659-#662; GTO reports; R80.3#320; operator-blocked #1322/#479.
20. **plans/20260716-bsuite-completion-program-plan + 20260723-completion-program-refined** — clusters A-F open; W1 publish chain blocked on operator npm login.
21. **20260428-operator-verification/03,04,05** — open operator actions; live Supabase secret/DB state needs MCP `execute_sql` re-verification.
22. **ai/features/20260227-feature-map-complete** — 49-tool registry claim; Phases 3-6 unchecked; model superseded; no impl evidence.
23. **plans/codehouse-parity/20260817-parity-569-pay-item-groups-spec-v1.00W** — PR-G npm publish blocked (bsuite#1363).
24. **plans/20260618-recruitment-comms-rams-cluster-plan + loop-contract** — ADMS APIM key / final RAMS lodgement gap; STATE table stale.
25. **plans/20260521-reports-w2-uplift** — only Task 3a (Stepper extraction) Deferred. Low leverage.
26. **plans/20260701-docs-plans-closure-audit** — §12.3 deployed-domain evidence pending; "Not Archive-Ready" rows.
27. **00-roadmap/20260725-excellence-closeout + qwen-excellence-integration** — unchecked AC boxes + DEFER lists.
28. **research/20260725-gto-compliance-ux-research** — "Adopt" UX items not implemented.
29. **20260722-developer-portal-investigation** — recommendations unverified; FeatureBuilder "3/8 live" stale (all 8 `live:true`).
30. **20260725-headroom-learn-notes** — `--apply` never run; Qwen key 401.
31. **Draft design/prompt artifacts (keep, low leverage):** 20260703-unified-authoring-surface, 20260723-bsuite-documentation-program-design, 20260724-recruitment-employment-handover-design, 20260724-email-funding-expansion-scope, 20260724-conduit-338-plan, 20260724-recurring-bugs-blindspots-refined, 20260725-docs-deadcode-archive-refined, 20260725-gto-excellence-program-refined, 20260725-gto-persona-excellence-design, 20260709-hermes-deep-dive-audit-prompt-refined, 20260617-product-tails-continuation-prompt, inputs/20260506-codehouse-parity-prompt-enhancer-output, 20260507-feature-builder-ux-red-team, 20260510-universal-canvas-capability-implementation, 20260511-part-o11-theme-placement-doc-coherence, 20260501-universal-wysiwyg-schema-ux.

**Stale-LIVING fix list (small, high-value):** `ai/CONTRIBUTING.md` (recommends banned `toDataStreamResponse`), `ai/README.md` (Grok 4.1 ref), `ai/features/README.md` (filename drift), `adr/README.md` (omits ADR-0004-schema-builder-consolidation; duplicate ADR-0004 number).

---

## 2. crm7 (`crm7/docs`)

> Archive-target note: `crm7/docs/archive/README.md` states the archive was relocated out-of-monorepo 2026-07-25 ("Do not re-add large historical docs here"). COMPLETE-archive rows route to the external archive path, not in-tree.

| Doc path | Claim | Verdict | Evidence | Action |
|---|---|---|---|---|
| INDEX.md · README.md | Nav hub; "6 selectors" canonical | L | `src/components/entity/selectors/` has 22 `.tsx` (not 6) — stale count | keep (living); fix count |
| FEATURE-SURFACE.md | crm7 patterns; "framer-motion absent" | L | `package.json:127 "motion":"^12.40.0"` present → stale | keep (living); fix |
| CONSISTENCY-REPORT.md · STACK-AUDIT.md · UNIFIED-ROADMAP.md · PARENT-DOCS.md | Mirrors / version matrix | L | Stale: react-query `^5.101.0`, motion `^12.40.0`, charge-calc `^0.5.0`, schema-registry `^0.3.6`, theme `^0.6.0`, ui `^1.0.1`, TS `~6.0.3` | keep (living); refresh |
| DEPENDENCY-BUMP-CHECKLIST.md | Exact-pin ceremony for `@bsuite/*` | L | `package.json "@bsuite/auth":"0.2.7"` exact pin | keep (living) |
| 20260316-crm7-ai-strategic-vision-v1.00W.md | AI-native vision; Phases 2–5 | I | "Phases 2–5 open"; model "Grok 4.1" vs `src/lib/ai/config.ts` `DEFAULT_MODEL='grok-4.3'` (read `grok-4.20-reasoning` at audit time; roster moved 2026-07-31 — line number dropped, it drifts) | keep |
| 20260316-crm7-document-storage-implementation-v1.00W.md | 14-bucket storage impl guide | I | Self-marked "⚠️ PENDING: encryption, UI, portal"; superseded by setup doc 2026-06 evidence | keep |
| 20260316-crm7-document-storage-setup-v1.00W.md | Bucket/RLS setup runbook | I | crm7#1056/#1057/#1058 OPEN; closure gate = signed-in d.crm.crm7.app UX evidence | keep |
| 20260317-document-esigning-architecture-v1.00A.md | In-app e-signing (pdf-lib + SHA-256) shipped | C | `src/lib/documentSigner.ts`, `SignDocumentFlow.tsx`, `PdfViewer.tsx`, `pages/documents/signatures.tsx`, `generate-document/index.ts`, migration `20260304000005_document_signing_audit.sql` | archive (leave canonical pointer) |
| 20260421-xero-oauth-runbook-v1.00W.md | Xero activation runbook | C | Banner "SUPERSEDED 2026-07-06 … historical only" | archive |
| 20260512-portal-cross-app-sso-architecture-decision-v1.00A.md | Portal SSO via BS OAuth + scopes | L | ADR; step 3 cites ".crm7.app shared cookie" — conflicts with AUTH_CANONICAL; crm7#723–#726 unverified | keep (living); flag cookie conflict |
| 20260512-xero-node-sdk-deno-compat-decision-v1.00A.md | Keep raw fetch, not xero-node SDK | L | `supabase/functions/_shared/xero-{token-helpers,oidc,webhook-sig,idempotency,rate-bucket,vault,audit,config}.ts` | keep (living) |
| 20260519-csp-policy-reference-v1.00W.md | Live CSP policy reference | L | `vercel.json` CSP + `frame-ancestors 'none'`; tightening backlog open | keep (living) |
| 20260706-email-sending-architecture-v1.00W.md | Platform vs per-user email send modes | I | 5 self-reported follow-ups: RLS migration "not yet applied", mail-merge stub, MICROSOFT vs AZURE env, `get_email_integration_token` TODO, no deployed test | keep |
| 20260706-xero-integration-setup-v1.00W.md | Canonical Xero OAuth + daily refresh cron | I | cron migration "not yet applied"; `VITE_XERO_CLIENT_SECRET` landmine; `xero-invoice-submit` DRY gap; live-verify pending | keep |
| 20260723-card-autoheight-edit-page-restore-fix-v1.00W.md | autoHeight sweep + Edit-page header button | C | `DraggableCardPage.tsx:106 LAYOUT_EPOCH=101`; `__tests__/card-autoheight-contract.test.ts`; `PageEditorLauncher.tsx:144` | archive |
| 20260723-entity-widget-feature-gate-feature-v1.00W.md | EntityTableWidget `is_feature_enabled` gate | C | `src/lib/page-builder/EntityTableWidget.tsx:128 rpc('is_feature_enabled')`, `:198`, `:201 Lock`; test exists | archive |
| 20260724-jodie-docs-gap-tool-feature-v1.00W.md | `docs_flag_gap` Jodie tool + GitHub issue route | C | `src/lib/ai/tools/docs-tools.ts`(+test), `api/ai/docs-gap-issue.ts` | archive |
| 20260724-org-documents-feature-v1.00W.md | Org-admin documents + assignment + ack | C | migration `20260724090000_org_documents.sql`, `orgDocumentService.ts`(+test), `pages/settings/org-documents.tsx`, `portal/org-documents.tsx` | archive |
| 20260726-email-entity-assignment-feature-v1.00W.md | Link emails to entities via join table | C | migration `20260726090000_email_message_links.sql`, `emailLinkService.ts`, `email-link-tools.ts` | archive |
| adr/0004-stp-xero-passthrough.md | CRM7 delegates STP to Xero | L | `src/lib/pipelines/xeroPayrollAdapter.ts:29 XERO_BATCH_SIZE=50`, `:245-246` | keep (living) |
| adr/20260423-calc-engine-single-source-v1.00W.md | charge-calc single-source engine | L | `src/utils/crmCalcBridge.ts`(+test) | keep (living) |
| adr/20260525-contacts-clients-leads-canonical-source-v1.00W.md · adr/20260525-host-employer-table-canonicalization-v1.00W.md | 3-table retention / host-employer canonicalization | L | ADRs; `20260525120000_canonicalize_host_employers_to_employers.sql` | keep (living) |
| adr/README.md | ADR index | L | Lists 3 ADRs but 4 exist; two labeled "ADR-002" (collision) | keep (living); fix |
| architecture/20260316-crm7-ai-sessions-schema-v1.00W.md | `ai_sessions`/`ai_messages` schema | I | Tables exist (`20260312000000_create_ai_sessions_messages.sql`); "UI cost tracking P2-2 not implemented" | keep |
| architecture/README.md · archive/README.md · deployment/README.md · guides/README.md · operations/README.md · plans/README.md · plans/STATUS.md · reference/README.md · troubleshooting/README.md | Indexes / mount points | L | Index/pointer docs | keep (living) |
| operations/20260610-migration-history-post-baseline-drift-v1.00W.md | Migration-history drift audit + hotfix | I | "#831 not closed by this hotfix"; pre-baseline reconciliation outstanding | keep |
| plans/20260423-bsuite-gto-master-plan-v1.00W.md · plans/20260423-ws3-to-ws9-implementation-plan-v1.00W.md | 8-workstream GTO master plan + WS-3..9 detail | I | STATUS = IN-PROGRESS; billing/funding carry residual money bugs; AVETMISS variants, LLN UI, annual reconciliation remain | keep |
| reference/20260310-crm7-magicui-pattern-guide-v1.00W.md · reference/20260310-crm7-reference-surface-pack-v1.00W.md | Magic UI patterns / 5 reference surfaces | L | Design standard; `src/pages/Dashboard.tsx`, `reports/index.tsx` | keep (living) |
| reference/20260317-crm7-boot-assessment-ui-v1.00W.md | BOOT assessment UI reference | L | `bootAssessmentStore.ts`, `pages/compliance/boot/`, `lib/rates/bootGate.ts`; cites charge-calc `^0.2.0` (actual `^0.5.0`) | keep (living); fix version |
| reference/20260317-crm7-feature-flags-v1.00W.md | LAUNCH_FLAGS registry reference | L | DRIFT: claims `xero_integration:false` but `useFeatureFlags.ts:73 xero_integration:true`; "36 flags" stale | keep (living); fix |
| reference/20260317-crm7-xero-integration-v1.00W.md | Xero OAuth + payroll reference | L | Partly superseded by 20260706 doc; plaintext-vs-Vault contradiction | keep (living); mark supersession |
| 00-roadmap/20260226-crm7-master-roadmap-v1.00A.md | CRM7 master roadmap | I | Banner "ARCHIVED 2026-03-16" contradicts `00-roadmap/README.md` "LIVE"; stale Feb-2026 snapshot | keep; resolve contradiction |
| 00-roadmap/20260424-bsuite-combined-foundations-and-gto-v1.00W.md · 00-roadmap/README.md | Combined foundations + GTO overlay / index | I/L | Status "1.00W (Working)"; 5-phase plan in flight | keep |

### INCOMPLETE ledger (crm7) — by leverage

1. **Money-integrity residuals (plans/20260423-bsuite-gto-master-plan, ws3-to-ws9).** `20260727130000_money_integrity_batch.sql` shipped DB guards; `recordPayment` overpay FIXED (`billingEngine.ts:623` → `record_payment_atomic`); zero-rate invoice FIXED (`billingEngine.ts:200-223`); RCTI uniqueness added. **STILL REAL:** `remaining_budget` never decremented on approve — `approve_funding_claim` exists in SQL but `fundingService.ts reviewClaim()` (~201-273) does a plain client-side status update and never calls the RPC (grep returns nothing), so the atomic guard is orphaned. Also unaddressed: charge-rate detail zeros, expense NaN.
2. **20260706-xero-integration-setup** (canonical Xero ref) — daily-refresh cron migration "not yet applied"; `VITE_XERO_CLIENT_SECRET` leak landmine; `xero-invoice-submit` DRY gap; deployed-domain verify pending.
3. **20260706-email-sending-architecture** — 5 open self-reports: RLS INSERT migration not applied; mail-merge sender picker deferred (`mail_merge_batches` absent); MICROSOFT vs AZURE env naming unverified; `get_email_integration_token` RPC inline TODO; no `d.crm.crm7.app` live test.
4. **20260316-crm7-document-storage-setup + -implementation** — crm7#1056/#1057/#1058 OPEN; closure gate = signed-in `d.crm.crm7.app` UX evidence. The two docs disagree (implementation guide carries stale PENDING markers).
5. **architecture/20260316-crm7-ai-sessions-schema** — tables live but AI cost-tracking UI (P2-2) not implemented.
6. **operations/20260610-migration-history-post-baseline-drift** — crm7#831 NOT closed; pre-baseline reconciliation outstanding.
7. **00-roadmap/20260226-crm7-master-roadmap** — doc-drift: file banner "ARCHIVED" vs README "LIVE (do not archive)".
8. **20260316-crm7-ai-strategic-vision** — Phases 2–5 open; model refs stale (`config.ts:148`).
9. **00-roadmap/20260424-bsuite-combined-foundations-and-gto + both plans/** — active Working plans, open workstreams.
10. **Living-mirror version drift (low leverage, high churn):** framer-motion "absent" (installed), "6 selectors" (22), stale package versions, `reference/feature-flags` `xero_integration:false` (code `true`).
11. **adr/README.md** — missing host-employer ADR row; "ADR-002" numbering collision.
12. **Schema-builder 1.0.1 watch-item** — `crm7/package.json` pins `^0.7.3`; no suite-level "1.0.1 consumed" claim is backed by this repo.
13. **20260512-portal-cross-app-sso-architecture-decision** — step 3 ".crm7.app shared cookie" contradicts AUTH_CANONICAL; crm7#723–#726 unverified.

---

## 3. conduit (`conduit/docs`)

| Doc path | Claim | Verdict | Evidence | Action |
|---|---|---|---|---|
| 20260519-csp-policy-reference-v1.00W.md | CSP permissive baseline via `next.config.ts` | L | `conduit/next.config.ts:84-110` (object-src/frame-ancestors 'none'); 6-item tightening backlog open | keep (living) |
| 20260629-supabase-auth-comprehensive-verification-v1.00W.md | Suite auth doctrine (PKCE+JWKS+setSession bridge) | L | `src/app/auth/callback/page.tsx:119,162,177`; `src/lib/supabase/middleware.ts` (getClaims JWKS) | keep (living) |
| 20260723-schema-builder-registry-consolidation-chore-v1.00W.md | `schemaBuilderService.ts` thin re-export of `@bsuite/schema-registry@1.0.0` | I | Code shipped: `src/lib/schemaBuilderService.ts:23-30`, `package.json:33 ^1.0.0`, pkg 1.0.0 exports factory. Doc still W "blocked on upstream publish" + open follow-ups | keep; flip W→A + gate evidence |
| 20260725-training-contract-status-email-ingestion-feature-v1.00W.md | STA email ingestion shipped (conduit#338) | I | Code shipped: migrations `20260725090000`/`091000`, `staEmailRegistry.ts`, `staParsers/`, `staReferenceMatcher.ts`, `offerStateMachine.ts`, `sta-email-watch/`, `staEmailActions.ts`, `StaEmailsSection.tsx`, 5 tests. §12.3 live UX gate not exercised | keep; deploy + live-verify |
| 20260726-recruitment-employment-handover-feature-v1.00W.md | "What ships" table: conduit handover helpers + edge fn + 42 tests | I | Contradiction: NO `handover*.ts` in `src/lib/recruitment/`, NO `handover-to-employment/` fn. Only surviving piece = token augmentation `candidates/[id]/actions.ts:103,105,429-430` (shipped). Helpers/tests moved to crm7 | keep; rewrite (actively misleading) |
| archive/README.md | Archive relocated out of monorepo 2026-07-25 | L | Pointer | keep (living) |
| CONSISTENCY-REPORT.md | Mirror; CON-4 shadcn missing; CON-10 cookie-SSO retired | L | Stale: `conduit/components.json` now EXISTS; "BS OAuth + cookie SSO ✅" contradicts CON-10 | keep (living); refresh |
| DEPENDENCY-BUMP-CHECKLIST.md | Canonical bump ceremony | L | Standard | keep (living) |
| FEATURE-SURFACE.md | Mirror (RBAC ✅, EntitySelector ❌) | L | Stale "App Router co-existence with cookie SSO"; EntitySelector ❌ accurate | keep (living); fix cookie line |
| INDEX.md | Navigation hub | L | Broken refs: `20260512-bsu-crm-domain-migration-doctrine` (MISSING), relocated archive links | keep (living); repair |
| PARENT-DOCS.md | Nav bridge to parent | L | Malformed absolute-path links from archive relocation | keep (living); repair |
| plans/20260504-adopt-entity-selectors-v1.00F.md | OPEN plan: adopt Person/Host/Contact selectors | I | `src/components/entity/` does NOT exist | keep |
| plans/20260504-shadcn-init-v1.00F.md | OPEN plan: shadcn init | I | `conduit/components.json` now EXISTS; `src/components/ui/` 13 primitives. "OPEN" stale | keep; verify a page uses shadcn Form |
| plans/STATUS.md · README.md · STACK-AUDIT.md · UNIFIED-ROADMAP.md | Status/index/stack/roadmap mirrors | L | Stale: shadcn-init "components.json absent" (now exists); cookie-SSO refs | keep (living); refresh |

### INCOMPLETE ledger (conduit) — by leverage

1. **20260726-recruitment-employment-handover-feature** (highest — actively misleading): "What ships" + "42 tests" cite `handoverDocuments/Emails/RequiredDocs/Contract.ts` + `handover-to-employment` fn that were REMOVED from conduit (moved to crm7). Missing: rewrite to state conduit owns only handoff-token augmentation (`candidates/[id]/actions.ts:103,105,429-430`, verified shipped).
2. **20260725-training-contract-status-email-ingestion-feature** — all code shipped but not deployed/live-verified. Missing: apply migrations, seed vault secrets, deploy `sta-email-watch`, live `d.*` signed-in flow (§12.3), confirm STA sender domains.
3. **20260723-schema-builder-registry-consolidation-chore** — code shipped (shim + `^1.0.0` + pkg 1.0.0) so the "blocked" blocker is resolved, but doc un-updated (still W). Missing: W→A, typecheck/lint/build green, live-verify Schema Builder route.
4. **plans/20260504-shadcn-init-v1.00F** — `components.json` + 13 primitives exist; "OPEN" stale. Missing: confirm a page replaces a hand-written form with shadcn Form + RHF + Zod, green typecheck/lint.
5. **plans/20260504-adopt-entity-selectors-v1.00F** — genuinely OPEN; `src/components/entity/` absent.

No COMPLETE-archive verdicts: every feature/chore doc carries open deployment/live-verification or stale-rewrite items. No conduit doc claims the conduit#223 assessment capability or conduit#381 cards.

---

## 4. business-suite-unified (`business-suite-unified/docs`)

| Doc path | Claim | Verdict | Evidence | Action |
|---|---|---|---|---|
| 20260723-developer-portal-remaining-work-feature-v1.00W.md | 6-item dev-portal pass | C (Item-6 "blocked" section stale) | Gate `src/lib/page-builder/EntityTableWidget.tsx:118`; migration `20260723090000_create_organization_with_owner_option_b.sql`; panels `FeatureBuilder/panels/{Logic,Portal,Verification,Ai,Page}Panel.tsx`; `verification-checks.ts`; shim `schemaBuilderService.ts`; `package.json:56 ^1.0.0`, pkg 1.0.0 exports factory | archive — first strike stale "⚠ Blocker / Unblock steps" (1.0.0 published+installed) |
| 20260724-manuals-content-model-feature-v1.00W.md | Manuals content model (Doc Program L1): 7 role manuals + ManualRenderer + `/docs` | C | `src/lib/manuals/{registry,types,routeManualMap}.ts`; 7 manuals; `ManualRenderer.tsx`; route `AppContent.tsx:328-329`; `manuals.test.ts` | archive |
| 20260724-docs-contextual-links-feature-v1.00W.md | Contextual "Learn more" deep-links (L4) | C | `src/components/manuals/{ManualLink,HeaderManualLink}.tsx`(+tests); `routeManualMap.ts`(+test); `manuals/org-admin.ts` | archive |
| 20260425-e2e-hang-rca-v1.00A.md | RCA + fix for `networkidle` hang (PR #190) | C | `tests/e2e/wcag-aa.spec.ts:202,233,255` `waitUntil:'domcontentloaded'`; `playwright.config.ts:42-43`; `crm7/.github/workflows/e2e.yml:13` | archive (fold playbook into maintenance guide) |
| 20260418-auth-dashboard-hardening-v1.00W.md | Two P0 auth items (Azure `xms_edov` bsu#91; wildcard redirect removal bsu#92) | I | Doc's own table both `Done? ☐`; operator-blocked (Azure portal / Supabase dashboard) | keep |
| 20260421-platform-kit-admin-v1.00W.md | Platform Kit local Supabase admin — "foundation shipped, panels in-progress" | I (status understates) | Foundation `platform-kit-proxy/index.ts`, `PlatformKit.tsx`, `AppContent.tsx:346`. Panels NOW shipped: Auth/Database/Logs/Secrets/Storage/DynamicTables (`AppContent.tsx:347-352`, `__tests__/`). Missing: deeper users panel | keep; rewrite status |
| 20260421-wcag-aa-audit-v1.00W.md | WCAG 2.1 AA + 2.2 audit; axe gate | L | `tests/e2e/wcag-aa.spec.ts:31 AA_TAGS`, `:282-289` target-size; open manual-review queue | keep (living) |
| 20260519-csp-policy-reference-v1.00W.md | Permissive baseline CSP; SSoT `vercel.json` | L (drift) | `vercel.json:100` full CSP. Drift: claims `frame-ancestors 'none'` but main header has none (only `/embed/*` `:35,48` = `*`). 6-item backlog open | keep (living); correct claim |
| 20260316-bsu-crm7-rbac-rls-reference-v1.00W.md | Proposed CRM7 RBAC tiers + RLS snippets | L | Reference/proposed SQL | keep (living) |
| 20260316-bsu-crm7-supabase-audit-v1.00W.md | CRM7 UI→backend→Supabase map (June 2025) | L (stale) | 2025-vintage CRM7 audit snapshot | keep (living); flag vintage |
| 20260316-bsu-debug-guide-v1.00W.md · -inventory · -maintenance-guide · -schema-diagram · -security-reference | Debug/inventory/maintenance/ERD/security refs | L | Reference docs | keep (living) |
| 20260316-bsu-deployment-notes-v1.00W.md | Active BSuite deployment topology | L (stale auth claim) | Topology matches; **drift:** still asserts ".crm7.app cookie SSO" — REMOVED 2025-02-27 | keep (living); DELETE cookie-SSO sentences |
| 20260316-bsu-supabase-apply-runbook-v1.00W.md | Runbook to apply CRM7 core schema + RLS | L (stale path) | References `external-apps/crm7/.../20250601_crm7_core_schema.sql` — path absent | keep (living); flag |
| INDEX.md · README.md · PARENT-DOCS.md | Index/README/nav bridge | L | Current | keep (living) |
| FEATURE-SURFACE.md | BSU feature-surface mirror | L (two stale cells) | dnd-kit "1" → now 3 files; Cmd+K primitive exists (`uplift/CommandPalette.tsx`) but not wired; EntitySelector ❌ accurate | keep (living); update |
| UNIFIED-ROADMAP.md · STACK-AUDIT.md · CONSISTENCY-REPORT.md | Roadmap/stack/consistency mirrors | L (CONSISTENCY partly stale) | CONSISTENCY CON-8 dnd "1 file" → 3; CON-7 Cmd+K primitive present; **"cookie SSO ✅" deprecated** | keep (living); remove cookie-SSO line |
| plans/STATUS.md | BSU plans status board | L | Consistent with source | keep (living) |
| plans/20260504-adopt-dnd-dashboard-v1.00F.md | Adopt: per-user `dashboard_layouts` persistence | L (open) | No `dashboard_layouts` migration; dnd-kit present but not persisted-dashboard pattern | keep (living/open) |
| plans/20260504-adopt-entity-selectors-v1.00F.md | Adopt: replace BSU forms with EntitySelectors | L (open) | 0 selector matches in `src/` | keep (living/open) |
| plans/20260507-feature-builder-execution-sequence-v1.00W.md | 8-phase Feature Builder roadmap | L (partly superseded) | Phase 0 present; Phases 2-6 partly delivered by 20260723 pass | keep (living); reconcile |
| archive/README.md | Archive relocation pointer | L | Pointer | keep (living) |
| AGENTS.md · CLAUDE.md · CONTRIBUTING.md · README.md (top-level) | Standards/README | L | Living guides | keep (living) |

### INCOMPLETE ledger (BSU) — by leverage

1. **HIGH — 20260418-auth-dashboard-hardening (operator-blocked, security P0):** (1) Azure Entra ID `xms_edov` optional claim not added (bsu#91); (2) Supabase `*.vercel.app`/`*.vusercontent.net` wildcard redirect URIs not removed (bsu#92, OAuth 2.1 §7.6 violation). Missing: two portal actions + code-side `xms_edov !== 1` rejection (doc gives pseudo-code, not implemented).
2. **HIGH — deprecated cookie-SSO claims live in two docs:** `20260316-bsu-deployment-notes` + `CONSISTENCY-REPORT.md`. Active regression hazard per AGENTS.md anti-revert doctrine. Missing: deletion of those sentences.
3. **MEDIUM — 20260421-platform-kit-admin status stale:** Auth/Database/Logs/Secrets/Storage/DynamicTables panels all shipped + routed + tested (`AppContent.tsx:346-352`). Missing: status rewrite; dedicated deeper users admin panel (only generic `UserManagement.tsx`).
4. **MEDIUM — 20260723-developer-portal-remaining-work Item-6 blocker stale:** claims `@bsuite/schema-registry@1.0.0` unpublished (E404, 0.3.6); reality `package.json:56 ^1.0.0`, pkg 1.0.0. Must not be archived asserting an active block. (Items 1-5 verified shipped.)
5. **LOW — 20260519-csp-policy-reference drift + backlog:** claims `frame-ancestors 'none'` but main header (`vercel.json:100`) has none. 6-item strict-CSP backlog open.
6. **LOW — mirror-doc count drift:** dnd-kit "1" → 3; Cmd+K primitive exists but unwired.
7. **LOW — stale 20260316 reference cohort:** deployment-notes (cookie SSO), supabase-apply-runbook (dead path), crm7-supabase-audit (2025 paths), maintenance-guide ("Apprentice Tracker" donor name).

**Archive-eligible (COMPLETE, verified):** `20260724-manuals-content-model`, `20260724-docs-contextual-links`, `20260425-e2e-hang-rca`, and `20260723-developer-portal-remaining-work` (after striking its stale Item-6 blocker section).

---

## 5. R80.3 (`R80.3/docs`)

> Archive-target note: `docs/archive/README.md` + `docs/plans/archive/README.md` state the archive was relocated out-of-monorepo 2026-07-25. Archive actions route to the external path.

| Doc path | Claim | Verdict | Evidence | Action |
|---|---|---|---|---|
| 20260726-funding-offsets-feature-v1.00W.md | Funding offsets shipped: table, scheme registry, charge-calc offset, reconciliation UI, Jodie tool, 5 tests | C | `supabase/migrations/20260726090000_funding_offsets.sql:28`; `fundingSchemes.ts`, `fundingOffset.ts`, `ai/fundingOffsetTool.ts`, `fundingOffsetsService.ts`, `FundingOffsets.tsx`; `calcBridge.ts:21,436-441`; 5 test files | archive |
| 20260702-invoice-runs-feature-v1.00W.md | GTO invoice runs shipped (R80.3#233) | C | `invoicingService.ts:514,681,717,903,1115,1202,1261,1377`; migrations `20260701100000`/`20260702000000`/`20260704160000`; 2 test files. Email dispatch honestly documented as NOT wired | archive |
| 20260418-payday-super-feature-v1.00A.md | Payday Super calculator shipped + verified (PR #39) | C | `paydaySuperService.ts`, `PaydaySuperCalculator.tsx`, tests + snapshot; PRs #230/#231/#232/#255/#256. **§5 "Open Gaps" STALE** — public-holiday/salary-sacrifice/snapshot all since shipped | archive (note stale §5) |
| 20260304-r80-training-fees-feature-v1.01A.md | Training fees feature shipped (#129, Approved) | C | `calculatorValidation.ts:103-109` (trainingFeesAnnual min0/max50000/warnMax5000 verbatim); `calcBridge.ts`; `pdfExportService.ts`. PDF line-item = documented follow-up | archive |
| 20260706-r80-typecheck-gate-burndown-v1.00W.md | Typecheck gate fixed: real `tsc --build --force`, 434→0 errors (#330) | C | `package.json:46-47`; `tsconfig.app.json:24 "types":["node","vitest/globals"]` | archive |
| 20260723-schema-builder-registry-consolidation-chore-v1.00W.md | DRY consolidation into `@bsuite/schema-registry` factory | I | Code merged (`52f577f`) + pkg 1.0.0 (`schemaBuilderService.ts:24` imports factory). Doc self-reports "complete-but-unverified"; §9.1 evidence never backfilled; stale contradictory blocker text | keep; backfill §9.1 + reconcile |
| 20260304-r80-fairwork-api-reference-v1.00W.md | FWC MAPD API reference + 3-layer cache/fallback | L | `fairworkApi.ts` + `fairworkCacheFallback.test.ts` (PR #48). Filename v1.00W vs header v1.01W (cosmetic) | keep (living) |
| 20260304-r80-billing-models-reference-v1.00W.md · -external-wage-sources-reference | Billing models / external wage-source CSV guide | L | `calcBridge.ts`; `wageSourceManager.ts`, `spreadsheetWageService.ts` + tests. Footer `[Current Date]` placeholder (cosmetic) | keep (living) |
| 20260519-csp-policy-reference-v1.00W.md | CSP permissive baseline (bsuite#477) + backlog | L | `vercel.json` CSP; tightening backlog open | keep (living) |
| INDEX.md · README.md · FEATURE-SURFACE.md · CONSISTENCY-REPORT.md · STACK-AUDIT.md · DEPENDENCY-BUMP-CHECKLIST.md · PARENT-DOCS.md | Indexes/mirrors/standard | L | UNIFIED-ROADMAP "TS 6.0 gated to Q3" stale; PARENT-DOCS package versions stale | keep (living); refresh |
| UNIFIED-ROADMAP.md | Roadmap mirror | L | Stale TS 6.0 row | keep (living) |
| plans/STATUS.md · plans/README.md · archive/README.md · plans/archive/README.md | Status/index/relocation pointers | L | Pointers | keep (living) |
| AGENTS.md · CLAUDE.md · CONTRIBUTING.md · README.md (top-level) | Governance/README | L | Feature claims backed; MYOB/STP EOFY honestly cited as tracked (bsuite#570) | keep (living) |

### INCOMPLETE ledger (R80.3) — by leverage

1. **HIGH — 20260723-schema-builder-registry-consolidation-chore** (only doc blocking archive): code merged + dependency shipped, but (1) FF-SELF-VALIDATION §9.1 output-equivalence evidence never filled; (2) stale self-contradictory blocker text ("workspace copy is 0.3.6", "Until 0.4.0 ships") though `@bsuite/schema-registry@1.0.0` installed and `docs/README.md` declares RESOLVED. Missing: equivalence evidence (identical PostgREST rows for `getSchemaEntities(null)`/`('<tenant>')` across scopes `r8`/`all`) + typecheck/lint/test confirmation, then strip blocker.
2. **LOW — 20260418-payday-super §5 "Open Gaps" stale** — items 1/2/5 shipped (#230/#231/#232). Strike on the way to archive.
3. **LOW — 20260304-r80-training-fees** — PDF cost-rate report omits `trainingFeesAnnual` line item (documented recommendation).
4. **LOW — PARENT-DOCS.md** — stale `@bsuite/*` versions + relocated-archive links.
5. **LOW — UNIFIED-ROADMAP / plans/STATUS** — "TS 6.0 gated to 2026-Q3" stale; TS 6 shipped suite-wide.
6. **LOW — 20260304-r80-external-wage-sources-reference** — unfilled `[Current Date]` footer.

**Context (R80.3#320):** No R80.3 doc claims the `@bsuite/stp` extraction is done. Verified deferred: `packages/stp` absent; both duplicate code tables remain (`R80.3/src/lib/payroll-export/codes.ts` 8.9 KB + `crm7/src/lib/stp/phase2/codes.ts` 10.9 KB). Belongs in deferred-work queue, not archive.

---

## 6. throughput (`throughput/docs`)

| Doc path | Claim | Verdict | Evidence | Action |
|---|---|---|---|---|
| INDEX.md · README.md · PARENT-DOCS.md | Nav hub / bridge | L | README links 4 docs that do NOT exist (`20250509-system-architecture`, `20250511-rls-policies`, `20250509-conversation-map`, `20250509-development`) | keep (living); fix dead links |
| FEATURE-SURFACE.md | Parity mirror; dnd-kit ❌ / EntitySelector ❌ | L | STALE — dnd-kit in `package.json:46-48`, `EntitySelector.tsx` at `src/components/entity/` | keep (living); refresh |
| CONSISTENCY-REPORT.md · STACK-AUDIT.md | Stack mirrors | L | STALE pre-modernization snapshot vs `package.json` (react `^19.2.7`, vite `^8.0.16`, zod `^4.4.3`, lucide `^1.17.0`) | keep (living); refresh |
| UNIFIED-ROADMAP.md | Roadmap mirror | L | Open "Multi-provider AI (OpenAI+Anthropic) reconciliation" | keep (living) |
| DEPENDENCY-BUMP-CHECKLIST.md | Canonical bump ceremony | L | Standard | keep (living) |
| 20250511-throughput-api-reference · -troubleshooting · -user-guide | API/troubleshooting/user guides | L | Tables correspond to `supabase/migrations/20251014100000_consolidated_schema.sql` | keep (living) |
| 20250829-throughput-roadmap-v1.00W.md | Local roadmap (React 18.3, OpenAI+Anthropic, 105 tests) | L | Stale (React 19, AI now Groq) but roadmaps living | keep (living); note staleness |
| 20260805-throughput-ai-gateway-architecture | Jodie AI setup on Vercel AI Gateway (supersedes deleted 20251014 Groq docs) | L | `api/llm/*`, `src/lib/llmGateway.ts`, `langchainGateway.ts`, `llmApi.ts`, `llm-panel/{ToolSelector,ReasoningDisplay,index}.tsx` | keep (living) |
| 20251014-throughput-navigation-ux-guide-v1.00W.md | Enhanced navigation UX guide | L | `src/components/navigation/{EnhancedNavigation,MegaMenu,GlobalSearch,TenantSwitcher,MobileBottomNav,EnhancedBreadcrumbs}.tsx` | keep (living) |
| 20251014-throughput-components-guide · -component-documentation-template · 20260430-component-docs-quick-reference | Component index/template/quick-ref | L | `throughput/scripts/generate-component-docs.js`; flags Input/Textarea/Alert/Badge/Card "Needs Docs" | keep (living) |
| 20260430-throughput-component-button-v1.00W.md | Button component doc (filled) | L | Props match `src/components/ui/Button.tsx:4-14`; drift: doc says danger="red", source `bg-destructive` (purple, `:22`) | keep (living); fix colour drift |
| 20260430-throughput-component-modal-v1.00W.md | Modal component doc (filled) | L | Props match `src/components/Modal.tsx:5-12`; `src/lib/accessibility.ts` | keep (living) |
| 20251014-throughput-component-alert · -badge · -card · -input · -textarea | Component docs (5 stubs) | I | Unfilled template stubs (`[Describe...]` placeholders); components exist in `src/components/ui/` | keep; fill or consolidate |
| 20251014-throughput-quality-improvements-implementation-v1.00W.md | Quality improvements "✅ Completed" | I | Core shipped (`logger.ts`, `accessibility.ts`); open "Next Steps" (Sentry, replace console.log, user context) | keep |
| 20260425-throughput-outstanding-v1.00W.md | Outstanding-status tracker | L | References legacy UPPERCASE filenames (ARCHITECTURE.md etc.) that were renamed | keep (living); stale refs |
| 20260519-csp-policy-reference-v1.00W.md | CSP permissive baseline shipped 2026-05-19 | L | CSP header in `throughput/vercel.json`; open tightening backlog (bsuite#477) | keep (living) |
| plans/STATUS.md · plans/20260504-adopt-canonical-patterns-plan-v1.00W.md | Status / canonical-patterns adoption (PARTIAL) | L/I | dnd-kit (PR #85) + EntitySelector primitive (PR #87) + `20260630120000_add_idea_display_order_persistence.sql` shipped; OPEN: EntitySelector data-source wiring + Cmd+K palette (blocked on `@bsuite/ui`) | keep |
| archive/README.md · plans/archive/README.md | Relocation pointers | L | External archive path | keep (living) |
| README.md · CONTRIBUTING.md · AGENTS.md · CLAUDE.md · ACCESSIBILITY_STATEMENT.md · FEATURE_DOCUMENTATION.md (top-level) | Governance/feature reference | L | Living standards | keep (living) |

### INCOMPLETE ledger (throughput) — by leverage

1. **plans/20260504-adopt-canonical-patterns-plan** (highest — real feature gap): (1) EntitySelector data-source wiring — primitive exists but `search()` not wired to canonical Supabase readers; (2) Cmd+K palette — blocked on `@bsuite/ui` command primitive. Missing: Supabase-backed reader + palette port + Playwright tests.
2. **Five empty component-doc stubs (alert, badge, card, input, textarea)** — pure unfilled templates despite shipped components. Missing: doc bodies, or consolidation into the single template.
3. **20251014-throughput-quality-improvements-implementation** — marked "✅ Completed" but open Next Steps (Sentry, console.log replacement, user-context). Missing: follow-throughs or strike if descoped.
4. **20260519-csp-policy-reference** — 6-item tightening backlog open (bsuite#477).
5. **Stale LIVING mirrors (low):** STACK-AUDIT (react 18.3→19.2.7 etc.), FEATURE-SURFACE (dnd-kit/EntitySelector shipped), CONSISTENCY-REPORT (Tailwind 4.0.0→4.3.0), UNIFIED-ROADMAP (multi-provider AI row).
6. **Dead internal links (low):** relocated stack-modernization plan still linked from 8 docs; README links 4 nonexistent docs; outstanding tracker references renamed legacy filenames.

No COMPLETE-archive candidates: every file is LIVING or INCOMPLETE (component-docs are living by definition; quality/CSP docs carry open items).

---

## 7. braden (`braden/docs`)

| Doc path | Claim | Verdict | Evidence | Action |
|---|---|---|---|---|
| 20260316-braden-architecture-v1.00W.md | Visual website-customization architecture (CMS, Theme Customizer, DnD editor, Component Library) | L | DnD shipped `DndLayoutEditor.tsx` (884 lines, #264); `content_pages`→`pagesService.ts`, `page_layouts`→`useLayoutData.ts`, `site_settings`→`ThemeContext.tsx`. BUT `custom_components` table NOT referenced in `src/` (unbacked) | keep (living); flag `custom_components` |
| 20260316-braden-bot-protection-v1.00W.md | BotID NOT implemented; relies on Vercel WAF | L | `botid` absent from `package.json`; `src/tests/bot-protection.test.ts:16` asserts absence; braden#262 | keep (living) |
| 20260316-braden-corporate-theme-reference-v1.00W.md | Canonical corporate theme; claims "Tailwind v3" + "no dark mode by design" | L (STALE — factually wrong) | `package.json tailwindcss:^4.3.0`; `src/index.css` 27 dark-mode selectors + `next-themes`; landing dark treatment shipped | keep (living); MUST update |
| 20260316-braden-csp-security-v1.00W.md | CSP config (style-src-elem + fonts; connect-src v0.dev/Vercel/vitals) | I (superseded) | `style-src-elem` + fonts present; doc omits Turnstile/GTM/Pusher/Sentry/`*.crm7.app` (all in `vercel.json`); superseded by 20260519 doc | keep; reconcile or archive as superseded |
| 20260316-braden-environment-setup-dev-guide-v1.00W.md | Env-var setup guide | L | README + CONTRIBUTING link to `docs/ENVIRONMENT_SETUP.md` which does not exist (real file is dated name) | keep (living); fix inbound links |
| 20260316-braden-getting-started-v1.00W.md | Getting-started: CMS, DnD editor, "version history", component library | L (stale claim) | DnD shipped; BUT "version history"/rollbacks UI NOT built — zero matches for `version.?history keep (living); flag | rollback` in `src/` (braden#266 partial) |
| 20260316-braden-qa-configuration-v1.00W.md | QA tooling: `yarn audit:deps`, jscpd, size-limit, health-check | I (heavily stale) | braden is pnpm (`packageManager: pnpm@10.33.3`); no `jscpd`/`size-limit`; scripts lack `audit:*`/`health-check`/`test:coverage` | keep; rewrite or archive |
| 20260316-braden-rls-policies-v1.00W.md | RLS for `admin_users` + `hero-images`; migration `20250808080000` | L (partial snapshot) | Migration exists (✓); `admin_users` used (`roleManager.ts`). 20+ later migrations (incl. `20260701000001/02`, `20260701150000`) not covered | keep (living); note partial |
| 20260316-braden-roadmap-v1.00W.md | Website-customization roadmap; self-marked superseded | L (stale) | DnD shipped (#264) yet shown `[ ]`; #265 + #266 DB also landed after | keep (living); note stale checkboxes |
| 20260316-braden-ui-ux-best-practices-v1.00W.md | UI/UX best practices + API coverage matrix | I (matrix partly unbacked) | Backed: `useCMSContent.ts`, `AddAdminDialog.tsx`, axe-core (`tests/e2e/a11y.spec.ts`), Lighthouse (`lighthouserc.json`). Unbacked: `CMSManager`/`SiteSettingsManager` NOT in `src/`; "content table" wrong (actual `content_pages`); RPCs `is_developer_admin`/`add_admin_user` not found; footer "Jan 12 2025" | keep; reconcile matrix |
| 20260519-csp-policy-reference-v1.00W.md | Current CSP SSoT | L (mostly accurate) | All claimed hosts in `vercel.json` EXCEPT "qig-memory-api.vercel.app explicitly listed" — NOT found (covered by `https:` wildcard) | keep (living); flag claim |
| 20260723-schema-builder-registry-consolidation-chore-v1.00W.md | Chore: thin re-export of `@bsuite/schema-registry` factory | I (work done; doc stale) | Re-export `src/lib/schemaBuilderService.ts:18-25`; `package.json @bsuite/schema-registry:^1.0.0`; pkg 1.0.0 installed + locked; README/INDEX say "RESOLVED". Doc body still W/blocked | keep; flip status + gate evidence |
| 20260723-theme-canonicalisation-decision-v1.00W.md | Decision #340: defer `@bsuite/theme/braden-css`; keep local `src/index.css` | L (accurate) | `@bsuite/theme` absent from `package.json`; `src/index.css` light+dark + 20 `THEME-REVIEW` comments; open #340 | keep (living) |
| archive/README.md · plans/archive/README.md | Relocation notices | L | Pointers | keep (living) |
| CONSISTENCY-REPORT.md · DEPENDENCY-BUMP-CHECKLIST.md · FEATURE-SURFACE.md · INDEX.md · PARENT-DOCS.md · plans/STATUS.md · README.md · STACK-AUDIT.md · UNIFIED-ROADMAP.md | Mirrors/indexes/standard | L | Drift: CONSISTENCY CON-3 react-query already `^5.101.0`; FEATURE-SURFACE `cmdk`+`@bsuite/page-builder` present vs "❌/n/a"; STATUS/UNIFIED-ROADMAP TS 6.0 "deferred" (done `^6.0.3`) + DnD "partial" (shipped); PARENT-DOCS malformed relocated-archive links | keep (living); refresh |
| AGENTS.md · CLAUDE.md (top-level) | Living agent guide | L | Stale: "Cypress (E2E)" (actual Playwright ×3, zero cypress); "Railway, Docker with Nginx" (actual Vercel) | keep (living); correct |
| CONTRIBUTING.md (top-level) | Contributing standard | L | All referenced doc filenames non-dated + DO NOT exist; `../docs/00-master-roadmap.md` absent | keep (living); fix links |
| README.md (top-level) | Project README; "Deployed on Railway" | L | Stale: actual Vercel. Legal pages verified shipped: `src/pages/PrivacyPolicy.tsx`, `TermsOfService.tsx`, routed `src/Routes.tsx`, tested `legal-entity.test.tsx` | keep (living); fix Railway→Vercel |

### INCOMPLETE ledger (braden) — by leverage

1. **20260316-braden-ui-ux-best-practices** (highest — most-referenced capability matrix): missing accurate component names (`CMSManager`/`SiteSettingsManager` not in `src/`), correct table (`content`→`content_pages`), correct RPCs (`is_developer_admin`/`add_admin_user` not found), resolution of "Pending" rows; footer date stale.
2. **20260316-braden-qa-configuration** — pnpm migration not reflected (still `yarn`); `jscpd`/`size-limit`/`health-check`/`test:coverage`/`audit:*` absent. Rewrite or archive.
3. **20260723-schema-builder-registry-consolidation-chore** — local-half verifiably DONE (`schemaBuilderService.ts:18-25`; `@bsuite/schema-registry@1.0.0` locked) but doc body still W with "1.0.0 not published" blocker that README/INDEX call RESOLVED. Missing: status flip + gate evidence + cross-app rollout note.
4. **20260316-braden-csp-security** — superseded by 20260519 doc; missing current hosts. Reconcile or archive as superseded.
5. **20260316-braden-getting-started** — "version history"/rollbacks unbacked (braden#266 DB-only: migration `20260701000002`, `fn_publish_page`, `fn_rollback_page`, pg_cron present; rollback UI + preview-as-anonymous NOT built).
6. **20260316-braden-corporate-theme-reference (living but factually wrong)** — "Tailwind v3" (actual `^4.3.0`) and "no dark mode by design" (actual light+dark, 27 dark selectors, `next-themes`, landing dark treatment shipped).
7. **20260519-csp-policy-reference (one false claim)** — "qig-memory-api.vercel.app explicitly listed" not present in `vercel.json`.
8. **20260316-braden-architecture (one unbacked claim)** — `custom_components` table / "Custom component creation (Phase 2)" unbacked.
9. **20260316-braden-rls-policies (partial)** — missing post-2025-08 migrations (`20260701000001/02`, `20260701150000`).
10. **Mirror/status stale rows (low):** UNIFIED-ROADMAP + plans/STATUS (TS 6.0 done; DnD shipped #264), CONSISTENCY-REPORT (CON-3 satisfied), STACK-AUDIT (version drift), FEATURE-SURFACE (cmdk/page-builder present).
11. **Link rot in living standards (low):** CONTRIBUTING.md (all `docs/*.md` non-dated + nonexistent), README.md (`docs/ENVIRONMENT_SETUP.md` broken; "Railway"→Vercel), AGENTS.md/CLAUDE.md ("Cypress"→Playwright; "Railway/Docker"→Vercel), PARENT-DOCS.md (malformed relocated-archive links).

No COMPLETE-archive candidates: every doc is LIVING or INCOMPLETE. Nearest case (`20260316-braden-rls-policies`) documents a shipped+verified fix but remains a useful partial reference.

---

## Global next-work ledger (INCOMPLETE, ordered by leverage across all repos)

1. **crm7 money-integrity residuals** — `remaining_budget` never decremented on approve (`fundingService.ts reviewClaim()` never calls `approve_funding_claim` RPC; atomic guard orphaned); charge-rate detail zeros; expense NaN. Highest leverage: real money bugs behind a "shipped" batch. (crm7 plans/20260423-*, audits/20260725-crm7-deep-bug-excavation)
2. **crm7 P0 `get_email_integration_token` RPC undefined** — email integrations cannot decrypt tokens; 0 matches in migrations. (audits/20260725-crm7-deep-bug-excavation, 20260706-email-sending-architecture)
3. **conduit `confirmStaEmail` non-atomic 3-write compliance gap** (`staEmailActions.ts:120-155`) — needs RPC/transaction. (audits/20260725-conduit-r80-deep-bug-excavation)
4. **BSU security P0 (operator-blocked)** — Azure `xms_edov` claim (bsu#91) + Supabase wildcard redirect removal (bsu#92, OAuth 2.1 §7.6). (20260418-auth-dashboard-hardening)
5. **CRIT raw `custom_css` injection bypassing sanitizer** (BSU/braden/throughput). (audits/20260725-bsu-braden-throughput-deep-bug-excavation)
6. **GTO E2E missing live schema** — `boot_assessments`, `charge_rate_audit_log`, `award_rate_cache`; BOOT gate + quote/requote hard-fail; W2-W7 unbuilt. (plans/20260703-gto-e2e-gap-map + loop-contract)
7. **GTO billing WS-1 PUBLISH BLOCKED** — npm serves charge-calc 0.4.0 (bsuite#1408); 6/9 workstreams partial. (plans/20260423-gto-billing-reporting-refined-plan)
8. **STA PROVEN_STATES blocked** — all 6 state sample rows blank; blocks promotion beyond WA/NT. (20260725-sta-email-samples-checklist)
9. **Sydney region migration NOT executed** — bsuite#1322 OPEN; dry-run + operator cutover pending. (20260725-sydney-migration-readiness + plans/20260724-bsuite-1322-*)
10. **Parity-spec batch (8 docs) + codehouse-parity (9 portal sub-plans)** — verified-missing schema/code; 35+ parity gaps; `(TODO: audit)` RLS rows. Admin spec (14 gaps) highest leverage.
11. **Deprecated cookie-SSO claims** still live in BSU deployment-notes + CONSISTENCY-REPORT and crm7 portal-cross-app-sso ADR — active regression hazard. (cross-cutting caveat 3)
12. **schema-builder consumer chain** — crm7 pins `^0.7.3`; publish-before-pin gap blocks any "1.0.1 consumed" completion claim. (caveat 1; adr/ADR-0004-schema-builder-consolidation)
13. **conduit recruitment-employment-handover doc actively misleading** — cites handover helpers/edge-fn/42 tests removed from conduit (moved to crm7). Rewrite. (conduit 20260726-*)
14. **Recurring-bugs permanent-control debt** — SQL linter false-greens (#1175/#1158), flake (#1159), Advisor/SECDEF/CSP (#1261/#1542/#1139). (20260724-recurring-bugs-and-blindspots)
15. **braden ui-ux-best-practices capability matrix** — wrong component/table/RPC names; most-referenced braden doc. (braden 20260316-braden-ui-ux-best-practices)
16. **schema-registry consolidation chore docs (conduit/R80.3/braden)** — code done, docs stale (still W/blocked); backfill §9.1 evidence + flip status.
17. **crm7 document-storage** — crm7#1056/#1057/#1058 OPEN; closure gate = signed-in `d.crm.crm7.app` UX evidence; two docs disagree.
18. **throughput canonical-patterns** — EntitySelector data-source wiring + Cmd+K palette open; 5 empty component-doc stubs.
19. **braden qa-configuration** — pnpm migration not reflected; rewrite or archive.
20. **Mirror-doc version drift (all repos)** + **link rot** (throughput 4 dead docs, braden CONTRIBUTING non-dated links, relocated-archive malformed links) — low leverage individually, high aggregate; batch-fix.

### Archive-eligible after stated corrections (COMPLETE, verified)

- **Parent (11):** 20260505-ts6-migration, 20260629-batch-e-rbac-plan, 20260629-batch-e-rbac-report, 20260630-cross-app-auth-plan, 20260630-cross-app-auth-report, 20260722-visual-qa-d-apps, plans/20260227-boot-compliance-engine-specification (cited evidence file drifted), plans/20260504-typescript-6-migration-evaluation, plans/20260513-hf4-pgtap-rls-harness, plans/20260513-ws4-timesheet-state-vocab-alignment, plans/20260611-docs-roadmap-closure-audit.
- **crm7 (6):** 20260317-document-esigning-architecture (leave canonical pointer), 20260421-xero-oauth-runbook, 20260723-card-autoheight-edit-page-restore-fix, 20260723-entity-widget-feature-gate, 20260724-jodie-docs-gap-tool, 20260724-org-documents, 20260726-email-entity-assignment.
- **BSU (4):** 20260724-manuals-content-model, 20260724-docs-contextual-links, 20260425-e2e-hang-rca, 20260723-developer-portal-remaining-work (after striking stale Item-6 blocker).
- **R80.3 (5):** 20260726-funding-offsets, 20260702-invoice-runs, 20260418-payday-super (strike stale §5), 20260304-r80-training-fees, 20260706-r80-typecheck-gate-burndown.
- **conduit / throughput / braden:** none — every feature/chore doc carries open deployment/live-verification or stale-rewrite items.

**Archive routing:** per the 2026-07-25 relocation doctrine, route these to `/home/braden/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/<repo>/docs/archive/` (or recreate an in-repo `docs/archive/2026-07/` first). Do not move any doc until the target exists.
