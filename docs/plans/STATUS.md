# Plans / Tracking — STATUS

**Last updated:** 2026-05-06

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
