# Plans / Tracking — STATUS

**Last updated:** 2026-06-05

This is a quick-reference status board for the cross-app tracking issues
in the parent `bsuite` repo. It complements `docs/OUTSTANDING.md`
(per-doc index) and `docs/CONSISTENCY-REPORT.md` (cross-cutting a11y +
dependency status).

> **Plans NOT in this register:** sibling submodule `docs/plans/STATUS.md` files
> (crm7, conduit, business-suite-unified, R80.3, braden, throughput) carry the
> per-app rows. The long-horizon planning reference is
> [`docs/20260227-bsuite-master-roadmap-v5.00W.md`](../20260227-bsuite-master-roadmap-v5.00W.md);
> the active phase-ordered queue is
> [`docs/20260501-merged-execution-backlog-v1.00W.md`](../20260501-merged-execution-backlog-v1.00W.md).
> Cross-app a11y / dependency / auth status lives in
> [`docs/CONSISTENCY-REPORT.md`](../CONSISTENCY-REPORT.md).

## Active tracking issues

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| [#208](https://github.com/GaryOcean428/bsuite/issues/208) | P0 WCAG: Radix Dialog/Sheet DialogTitle | ✅ Done | All 6 submodules verified — see `CONSISTENCY-REPORT.md`. BSU PR #285 fixed the only finding. |
| [#209](https://github.com/GaryOcean428/bsuite/issues/209) | P0 WCAG: Login/register autoComplete | ✅ Done | Audit on 2026-05-04 found all input-bearing forms compliant. The other three apps redirect to BSU. |
| [#211](https://github.com/GaryOcean428/bsuite/issues/211) | P1 Deps: TypeScript 6.0 migration EPIC | 🟡 Tracked | Plan: `2026-05-04-typescript-6-migration.md`. Six child issues filed. Execution is gated to the 2026-Q3 maintenance window pending TS 6.0 latest + typescript-eslint compatibility. |
| [#635](https://github.com/GaryOcean428/bsuite/issues/635) | feat(uplift): BSuite Unified Design Language rollout — 9-wave loop tracker | 🔄 In progress | W0 + W1 done. W4 scoping landed (`bsuite#681`), W4/W6 BSU impl PRs pending merge (`BSU#376`, `BSU#375`). W2/W3/W5/W7 active or queued; W8 remains blocked on W7. Canonical tracker: `docs/plans/uplift/INDEX.md`. |
| [#1237](https://github.com/GaryOcean428/bsuite/issues/1237) | Reports W2 Uplift — Task 6 RPC schema-gap closure | 🔄 In progress | Tasks 6.1-6.6 shipped via `crm7#956` (`report_rejected_timesheets` + pgTAP + grant hardening), `crm7#957` (`report_hours_by_work_type` from entries JSONB), `crm7#958` (`report_pay_item_group_hours` hours-first pay item group mapping), `crm7#959` (`report_pay_items_by_employee` from invoice line items), `crm7#960` (`report_consultant_kpi` from assigned people/timesheets/invoice lines with selected-tenant field-officer gating), `crm7#985` (`report_coinvest_lsl` from `leave_balances.long_service` with admin/gto_admin gating), `crm7#986` (report delivery timezone/retry/error reliability hardening), and `bsuite#1395` (Task 9 dashboard/outstanding-work links). Remaining Reports W2 work is deferred Task 3a/4 report-list/stepper uplift plus follow-on scheduling UI. Plan: `20260521-reports-w2-uplift-implementation-v1.00W.md`. |
| [#1408](https://github.com/GaryOcean428/bsuite/issues/1408) | chore(shared): publish `@bsuite/charge-calc` 0.5.0 and bump consumers | ✅ Done | Closed 2026-06-05. `@bsuite/charge-calc@0.5.0` was published by the `bsuite#1424` workflow; `npm view @bsuite/charge-calc version` returns 0.5.0; CRM7#1010 and R80.3#303 consume `^0.5.0` on `development` with frozen installs, typechecks, and tests passing. |
| [#1422](https://github.com/GaryOcean428/bsuite/issues/1422) | Production-spec completion execution plan | 🔄 In progress | Plan: `20260605-production-spec-completion-plan-v1.00W.md`. Task 0 inventory verified 0 open PRs across seven repos. Filing #1422 as the durable production-spec tracker and closing #1408 after Task 1 leaves the live count at 157 open issues (bsuite 61, crm7 74, conduit 11, BSU 4, R80.3 3, braden 3, throughput 1). Task 1 is complete. Task 2 auth package rollout is merged: `@bsuite/auth@0.2.5` published via bsuite#1426 and consumed by CRM7#1011, R80.3#304, Braden#315, Throughput#203, Conduit#303, and BSU#535. Braden role hardening is merged via Braden#316. COOKIE-SSO forbidden-pattern CI is verified by `scripts/drift-scan.mjs --self-test` (50/50). Remaining Task 2 items continue with RLS/RPC verification and browser smoke. |
| TBD (WS-B) | Codehouse Parity & Platform 360 — index plan + 9 portal sub-plans + visual feature builder spec | 🟡 W (working) | Added 2026-05-06. Plan: `20260506-codehouse-parity-and-platform-360-v1.00W.md` + `20260506-codehouse-parity/` (10 sub-plans). 12 grouped issues will be filed by the issue-filer subagent in a parallel PR. Dashboard JSON extension is a follow-up PR (post #535). |
| TBD (O.11/O.12/O.13) | Theme centralisation, feature-placement boundaries, and docs coherence | 🟡 W (working) | Added 2026-05-11. Plan: `20260511-part-o11-theme-placement-doc-coherence-plan-v1.00W.md`. O.11 BSU theme POC runs before O.12 wizard re-placement; O.13 reconciles ownership/doc drift after the audit returns. |

## 2026-06-05 Production-spec Task 0 inventory matrix

| Group | Current status | Next action |
|-------|----------------|-------------|
| Production blockers | Application repos remain on `development`; do not promote to `main` until the Task 9 ship gate passes. `development` is ahead of `main` in all seven repos. | Finish Tasks 1-8, then open deliberate `development` -> `main` PRs one app at a time. |
| Operator blockers | The charge-calc npm publish blocker is cleared. Supabase/Vercel operator-only settings remain handled through issues when encountered; Task 1 self-reported repeated Vercel preview cancellations from the dashboard on CRM7#1010 and R80.3#303, with GitHub CI/local checks green. | Continue non-blocked plan tasks; file/update issues when operator-only Supabase/Vercel settings block live verification. |
| Package blockers | `charge-calc` is published/rolled out. Task 7 package publish slice published `@bsuite/ui@0.3.0`, `@bsuite/schema-builder@0.7.2`, and `@bsuite/theme@0.4.1`; `@bsuite/schema-registry@0.3.5` remains npm-permission blocked in bsuite#1432 (`npm publish` 404/not found or no permission). App package manifests in the active checkout use npm semver, with no `workspace:*` or `file:../packages/*` matches. | Fix schema-registry npm permissions/trusted publisher; then update consumers whose lockfiles should pin newer package versions. |
| Auth/security | `AUTH_CANONICAL.md` remains the authority: BS OAuth 2.1 PKCE + JWKS only; no cookie SSO. `@bsuite/auth@0.2.5` now adds cross-tab BS token removal handling and refresh-rejected expiry events, all six consumers are on 0.2.5, Braden RoleManager uses `getClaims()` with no hardcoded admin email, and COOKIE-SSO drift-scan self-tests pass. | Continue Task 2 with RLS/client_id checks, Conduit service-role RPC grant verification, and browser smoke. |
| DB/source-of-truth | CRM7 open issues #831 and #758 remain the DB source-of-truth/migration-repair blockers. | Task 3 reconciles migrations, pgTAP, advisors, and live SECURITY DEFINER/RPC grants. |
| DRY one-shot | CRM7/R80 entity ownership issues remain open, including CRM7 #460/#461/#463/#484 and related qualification/provider/host-employer issues. | Task 4 completes FK-backed selectors, entity linking, and reader/writer boundaries. |
| CRM7 GTO | CRM7 GTO/reporting/payroll backlog remains broad. GTO catalogue issue crm7#529 is closed by merged PR #570; crm7#527/#528/#530/#531/#532/#533/#534 and payroll/provider follow-ups remain open. | Continue Task 5 with the remaining report catalogue/payroll workstreams. |
| Conduit recruitment | Conduit has 11 open recruitment issues, led by public apply, handoff snapshot, offer/AASS, and consent/compliance scope. The status-constraints slice is merged via Conduit#304: all live `r7_*` status columns have CHECK coverage and TypeScript status mirrors. | Continue Task 6 with public apply, handoff snapshot, offer/AASS, documents, and CRM7 receive/create-person flows. |
| BSU platform | BSU has 4 open platform/admin/design issues, including ADR-0002 schema ownership and branding redesign cascade. Shared UI/schema package availability improved: ui 0.3.0, schema-builder 0.7.2, and theme 0.4.1 are on npm; schema-registry 0.3.5 is blocked by bsuite#1432. | Continue platform panels/Visual Feature Builder work; resolve schema-registry npm publish permissions before consumer lockfile rollout. |
| UI/UX/a11y/perf | Suite-wide UI/perf work remains in bsuite #475/#476/#478/#479/#483/#484 and app-specific issues such as CRM7 #881/#833. Throughput #184 is closed: throughput#204 fixed the focused dark-mode card surfaces and throughput#205 completed the remaining raw Tailwind palette sweep with semantic D2C tokens. CRM7 #881 class-utility slice is merged via CRM7#1012 with TS/TSX raw-palette class scans at 0; CRM7#1013 removed safe non-PDF/chart hex literals from changed runtime/chart surfaces (changed-file color hex count 0, repo remainder 334); CRM7#1014 converted HTML print/export template colors to OKLCH (repo remainder 313). PDF/export/renderer-specific hex cleanup remains open. | Continue Task 8 with remaining cross-app component inventory, accessibility/performance/theme sweeps, and screenshot evidence. |
| Docs/dashboard | Dashboard top-level summary matched current `gh` counts; secondary `counters` block was stale and normalized during this Task 0 update. | Keep dashboard JSON and inline HTML updated in the same PR as each evidence change. |
| Supabase schema topology | One shared Supabase backend (`tuybltdrdefjblnplpqo`) is fed by migrations across parent + submodules. Parent `bsuite` owns the CI connection via `.github/workflows/supabase-migrate.yml`; CRM7 holds the bulk of schema definitions. Braden's `supabase/config.toml` points at stale/local project `iykrauzuutvmnxpqppzk`, so manual links from Braden must explicitly pass `--project-ref tuybltdrdefjblnplpqo`. | Use Supabase MCP `apply_migration` as the preferred audited production applier; CI `migration up --include-all` is the fallback/PR path; never run local `supabase db push` against production. |

## 2026-05-06 Plans Audit

A docs-only audit on 2026-05-06 reconciled in-repo plans against an
external corpus of 49 IDE / Cascade plan files (claude_code IDE +
windsurf cascade) and the `bsuite_*` memory namespace. Key results:

| Source | Total | DONE-V | DUPLICATE-OF-IN-REPO | SUPERSEDED | PARTIAL | OPEN | Dismissed (QIG) |
|--------|------:|------:|--------------------:|-----------:|--------:|-----:|----------------:|
| External (claude_code IDE) | 14 | 4 | 0 | 2 | 0 | 1 | 7 |
| External (windsurf cascade) | 35 | 8 | 2 | 9 | 3 | 1 | 12 |
| Live in-repo (parent + 6) | 19 | 0 | n/a | 0 | 0 | 19 | 0 |
| Already in `archive/` (parent + per-app) | 10 | 10 | n/a | 0 | 0 | 0 | 0 |

- **Plans archived this run:** 0 — every in-repo plan is either active
  multi-phase work or already archived in the 2026-05-04 doc-unification
  wave (parent PR #430) and the throughput Wave A sweep (throughput PR #76).
- **Plans dismissed (QIG silo):** 17 + 2 reclassified during this audit.
- **Loop-closing notes:** the two external "duplicate" plans
  (`crm7-broad-ui-refresh-ec965f.md`, `bsuite-audit-page-builder-branding-relationships-66c734.md`)
  map cleanly to the active in-repo
  `20260316-crm7-broad-ui-refresh-plan-v1.00W.md` and
  `20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md`;
  the in-repo versions are canonical.
- **External-only OPEN plans worth transcribing if picked up:** the
  five-wave stabilisation plan (W5 systemic guards remains open per
  `bsuite_session_20260502_w1_to_w4_complete`) and the email/calendar/
  tasks integration plan (Phases 3+4 still open).

Triage workpapers (out-of-repo, in `~/workspace/plans-review/`):
`external-plans-triage.md`, `in-repo-plans-triage.md`, `memory-archaeology.md`.

## How to update

When you close a tracking issue, mark its row ✅ Done and add the
closing PR / commit reference. When a new cross-app issue opens, add a
row before doing any per-submodule work — the audit comes first.

Future plans live in `docs/plans/` of the relevant repo with a
`STATUS.md` ledger and an `archive/YYYY-MM/` for verified-complete with
an evidence companion (`<plan>.evidence.md`). See the Plan-tracking
convention in [`docs/CONSISTENCY-REPORT.md`](../CONSISTENCY-REPORT.md).
