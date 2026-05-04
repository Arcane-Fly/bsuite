# Archive — 2026-05-04 Documentation Unification Sweep

**Date:** 2026-05-04
**Context:** Cross-submodule documentation alignment per user request — produced `docs/20260504-bsuite-documentation-hub-v1.00W.md` + `docs/20260504-bsuite-tech-stack-alignment-v1.00W.md` + `{app}/docs/PARENT-DOCS.md` across all 6 submodules.

This folder contains plans whose work is **demonstrably complete** per the evidence in the files themselves. Each archived file retains its full content — this is a move, not a rewrite.

## Archived Files

### `20260428-codex-phase-2-shared-packages-plan-v1.00W.md`

**Archive reason:** All 5 workstreams (2A–2E) are marked complete in the plan itself with PR evidence. Verified against shared-package inventory on 2026-05-04:

| Workstream | Evidence | Status |
|---|---|---|
| **2A** `@bsuite/page-builder` extraction | `packages/page-builder@0.2.0` published; 4 consumers (BSU, CRM7, Conduit, R80.3) migrated; PR merges recorded in plan | ✅ Complete |
| **2B** `@bsuite/schema-registry` consumer alignment | All consumers resolve npm `@bsuite/schema-registry@0.3.1`; no `workspace:*` or `file:` references remaining | ✅ Complete |
| **2C** `@bsuite/theme@0.3.3` consumer migration | `packages/theme@0.3.3` with `usePlatformLogo()` helpers; consumers migrated | ✅ Complete |
| **2D** `@bsuite/dry-lint` warn → error promotion | `@bsuite/dry-lint@0.3.0` consumed at `error` level in all 6 apps (BSU PR #213, CRM7 PR #326, Conduit PR #133, R80.3 PR #116, Braden PR #163, Throughput PR #57); `appOverride` hardening also shipped | ✅ Complete |
| **2E** charge-calc + nav workspace-pin verification | Zero `workspace:*` or `file:../packages` references across consumer package.json files | ✅ Complete |

The plan's "Pickup checklist for Phase 3" line marks Phase 3 as the handoff point — Phase 2 is closed.

### Independent verification (2026-05-04)

The workstream 2E DoD (`rg "workspace:\*" packages/*/package.json` + `rg "file:\.\./packages"` return 0 matches) was independently re-verified this session against the parent + all 6 submodules: zero matches for either pattern. The workspace-pin elimination is airtight.

**Note on WS-2B version drift:** the plan ratified `@bsuite/schema-registry@0.2.1` but current source is `0.3.1` (and consumers are on `^0.3.0`). This forward movement is expected — WS-2B closed, subsequent minor bumps are routine shared-package work tracked in the tech-stack alignment doc.

**Note on WS-2D consumer version:** the plan ratified `@bsuite/dry-lint@0.2.0` at error level across all 6 apps. Current source is `0.3.0` (adds the `no-raw-entity-select` rule); consumers are still on `^0.2.0`. This drift is tracked as gap TS-24 / SHARED-11 in the tech-stack alignment doc — it is a future bump, not a reason to re-open WS-2D.

**Successor work:** Phase 3 auth runtime smoke and downstream Phases 4-11 are tracked in:

- `docs/20260501-merged-execution-backlog-v1.00W.md`
- `docs/plans/20260423-bsuite-production-plan-v1.00W.md` (Phases 6-15)
- `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`

## Move protocol

The actual archive move (from `docs/plans/20260428-codex-phase-2-shared-packages-plan-v1.00W.md` to `docs/archive/2026-05-04-doc-unification/20260428-codex-phase-2-shared-packages-plan-v1.00W.md`) is performed as a single `git mv` by the parent agent so git history is preserved. This README documents the decision.

## Future archive candidates (NOT archived in this sweep — evidence insufficient)

The following plans were evaluated for archival and **retained in `docs/plans/`** because remaining work is documented:

- `20260227-boot-compliance-engine-specification-v1.00W.md` — specification, still actively referenced
- `20260302-r80-crm7-integration-audit-v1.00W.md` — integration still in progress (charge-calc convergence ongoing)
- `20260316-crm7-broad-ui-refresh-plan-v1.00W.md` — ~40% complete per production plan
- `20260423-bsuite-production-plan-v1.00W.md` — many P0/P1 items still open
- `20260423-gto-billing-reporting-refined-plan-v1.00A.md` — Approved, large active plan
- `20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md` — orchestration plan, ledger tracks per-item status
- `20260501-universal-wysiwyg-schema-ux-v1.00W.md` — recent, 6 of 30+ tasks complete

The next archive pass should re-evaluate these after Phases 6-9 of the production plan land.
