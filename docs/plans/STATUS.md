# Plans / Tracking — STATUS

**Last updated:** 2026-05-04

This is a quick-reference status board for the cross-app tracking issues
in the parent `bsuite` repo. It complements `docs/OUTSTANDING.md`
(per-doc index) and `docs/CONSISTENCY-REPORT.md` (cross-cutting a11y +
dependency status).

## Active tracking issues

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| [#208](https://github.com/GaryOcean428/bsuite/issues/208) | P0 WCAG: Radix Dialog/Sheet DialogTitle | ✅ Done | All 6 submodules verified — see `CONSISTENCY-REPORT.md`. BSU PR #285 fixed the only finding. |
| [#209](https://github.com/GaryOcean428/bsuite/issues/209) | P0 WCAG: Login/register autoComplete | ✅ Done | Audit on 2026-05-04 found all input-bearing forms compliant. The other three apps redirect to BSU. |
| [#211](https://github.com/GaryOcean428/bsuite/issues/211) | P1 Deps: TypeScript 6.0 migration EPIC | 🟡 Tracked | Plan: `2026-05-04-typescript-6-migration.md`. Six child issues filed. Execution is gated to the 2026-Q3 maintenance window pending TS 6.0 latest + typescript-eslint compatibility. |

## How to update

When you close a tracking issue, mark its row ✅ Done and add the
closing PR / commit reference. When a new cross-app issue opens, add a
row before doing any per-submodule work — the audit comes first.
