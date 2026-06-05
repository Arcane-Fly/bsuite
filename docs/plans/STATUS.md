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
| [#1408](https://github.com/GaryOcean428/bsuite/issues/1408) | chore(shared): publish `@bsuite/charge-calc` 0.5.0 and bump consumers | 🔴 Operator-blocked | HF-1 source/package verification is green (`@bsuite/charge-calc@0.5.0`, 728 tests, typecheck, build, publish dry-run), but npm still serves 0.4.0 and real publish failed from this environment with registry permission. Do not bump CRM7/R80.3 until `npm view @bsuite/charge-calc version` returns 0.5.0+. |
| [#1422](https://github.com/GaryOcean428/bsuite/issues/1422) | Production-spec completion execution plan | 🔄 In progress | Plan: `20260605-production-spec-completion-plan-v1.00W.md`. Task 0 inventory verified 0 open PRs across seven repos. The initial inventory found 157 open issues; filing #1422 as the durable production-spec tracker brings the live count to 158 (bsuite 62, crm7 74, conduit 11, BSU 4, R80.3 3, braden 3, throughput 1). Development branch divergence before the production gate: bsuite 80, crm7 108, conduit 8, BSU 6, R80.3 8, braden 5, throughput 6 commits ahead of `main`. |
| TBD (WS-B) | Codehouse Parity & Platform 360 — index plan + 9 portal sub-plans + visual feature builder spec | 🟡 W (working) | Added 2026-05-06. Plan: `20260506-codehouse-parity-and-platform-360-v1.00W.md` + `20260506-codehouse-parity/` (10 sub-plans). 12 grouped issues will be filed by the issue-filer subagent in a parallel PR. Dashboard JSON extension is a follow-up PR (post #535). |
| TBD (O.11/O.12/O.13) | Theme centralisation, feature-placement boundaries, and docs coherence | 🟡 W (working) | Added 2026-05-11. Plan: `20260511-part-o11-theme-placement-doc-coherence-plan-v1.00W.md`. O.11 BSU theme POC runs before O.12 wizard re-placement; O.13 reconciles ownership/doc drift after the audit returns. |

## 2026-06-05 Production-spec Task 0 inventory matrix

| Group | Current status | Next action |
|-------|----------------|-------------|
| Production blockers | Application repos remain on `development`; do not promote to `main` until the Task 9 ship gate passes. `development` is ahead of `main` in all seven repos. | Finish Tasks 1-8, then open deliberate `development` -> `main` PRs one app at a time. |
| Operator blockers | `@bsuite/charge-calc@0.5.0` source is present but npm still serves 0.4.0; issue #1408 remains the evidence row. Supabase/Vercel operator-only settings are handled through issues when encountered. | Re-test `npm view`; publish or keep #1408 updated with exact failure output before consumer bumps. |
| Package blockers | Source versions ahead of npm were observed for `charge-calc` (0.5.0 vs 0.4.0), `schema-builder` (0.7.2 vs 0.7.0), `schema-registry` (0.3.5 vs 0.3.2), `theme` (0.4.1 vs 0.3.3), and `ui` (0.3.0 vs 0.2.0). App package manifests in the active checkout use npm semver, with no `workspace:*` or `file:../packages/*` matches. | Task 1 handles `charge-calc`; later package work must publish source-of-truth versions before consumer rollout. |
| Auth/security | `AUTH_CANONICAL.md` remains the authority: BS OAuth 2.1 PKCE + JWKS only; no cookie SSO. Initial manifest scan found no forbidden package-link/auth strings in package manifests. | Task 2 performs auth package and consumer hardening, CODEOWNERS, forbidden-pattern CI, Braden `getClaims()` replacement, and RLS checks. |
| DB/source-of-truth | CRM7 open issues #831 and #758 remain the DB source-of-truth/migration-repair blockers. | Task 3 reconciles migrations, pgTAP, advisors, and live SECURITY DEFINER/RPC grants. |
| DRY one-shot | CRM7/R80 entity ownership issues remain open, including CRM7 #460/#461/#463/#484 and related qualification/provider/host-employer issues. | Task 4 completes FK-backed selectors, entity linking, and reader/writer boundaries. |
| CRM7 GTO | CRM7 GTO/reporting/payroll backlog remains broad; report catalogue issues #527-#534 and payroll #570 remain open. | Task 5 finishes charge-calc rollout, payroll/provider finalisation evidence, exports, fixtures, and role matrix. |
| Conduit recruitment | Conduit has 11 open recruitment issues, led by public apply, handoff snapshot, status constraints, offer/AASS, and consent/compliance scope. | Task 6 uses Next.js MCP and browser tests to complete candidate/apply/offer/handoff flows. |
| BSU platform | BSU has 4 open platform/admin/design issues, including ADR-0002 schema ownership and branding redesign cascade. | Task 7 completes platform panels and Visual Feature Builder phases or records credential blockers. |
| UI/UX/a11y/perf | Suite-wide UI/perf work remains in bsuite #475/#476/#478/#479/#483/#484 and app-specific issues such as CRM7 #881/#833 and throughput #184. | Task 8 runs cross-app component inventory, accessibility/performance/theme sweeps, and screenshot evidence. |
| Docs/dashboard | Dashboard top-level summary matched current `gh` counts; secondary `counters` block was stale and normalized during this Task 0 update. | Keep dashboard JSON and inline HTML updated in the same PR as each evidence change. |

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
