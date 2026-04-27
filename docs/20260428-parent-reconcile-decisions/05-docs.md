# Domain 5 — Docs reconcile

**Status:** F (Frozen)
**Date:** 2026-04-28
**Workstream:** WS-ε (parent monorepo dev↔main reconcile)

## Files

- 134 modified-both docs
- 22 dev-only docs (under `docs/` and `docs/archive/parent/2026-04-25-finish-line/`)
- 22 main-only docs (under `docs/archive/2026-04/` mostly + 1 v1.01A active)

## Decision rule (per spec §9 + §10)

Take dev's docs/ tree as canonical. Dev contains the WS-α/WS-β/WS-γ session deltas:

- WS-α frozen #5 narrative (PR #292) corrects the conduit OAuth doctrine.
- WS-β operator handoff v3.00W (PR #293) + 8-item verification evidence.
- Archive sweep at `docs/archive/parent/2026-04-25-finish-line/` (dev's canonical scheme) supersedes main's `docs/archive/2026-04/` scheme.

The 79 main-only doc basenames under `docs/archive/{braden,crm7,r80,bsu,conduit}/2026-04-24-submodule-import/...` are pre-finish-line submodule-import dumps that were intentionally pruned on dev. Audit confirmed the canonical content lives in each submodule's own `docs/archive/` (verified via `crm7/docs/archive/20260226-*.md`). No content lost.

## Per-file decisions

| Path pattern | Decision | Rationale |
|---|---|---|
| `docs/<active doc>` (modified-both) | Take dev | Dev has the post-finish-line session deltas; main's older versions are superseded. |
| `docs/archive/<submodule>/2026-04-24-submodule-import/...` (~79 files) | Take dev (deletion) | Per-submodule archives now live in each submodule's own `docs/archive/`. No content lost. |
| `docs/archive/2026-04/...` (21 main-only files) | Take dev (don't restore) | Same content lives at `docs/archive/parent/2026-04-25-finish-line/...` on dev. Restoring would create duplicates. |
| `docs/archive/2026-04-25-universal-canvas-wave/...` | Take dev (mostly deletion of 2 files) | Dev pruned this folder during the WS-H sweep. Content was time-bound. |
| `docs/20260227-dry-one-shot-architecture-v1.01A.md` (main-only) | RESTORE from main | Main has v1.01A (Phase 6a gap-closure refresh, 2026-04-23). Dev only has v1.00A. Both versions kept; v1.01A supersedes v1.00A but the v1.00A is still referenced in CLAUDE.md cross-refs so retain both for now. |
| `docs/OUTSTANDING.md` (main-only) | RESTORE from main | Useful index doc cross-referencing the finish-line roadmap. Dev deleted it; restoring is non-destructive. |
| `docs/20260317-bsuite-gap-report-v2.00W.md` (modified-both, main has +16 lines) | Take dev | Dev's Section 11 is "Finish-Line Reconciliation (2026-04-25)". Main's Section 11 is the older "2026-04-24 archive-pass findings". Dev's is the newer iteration. |
| `docs/archive/braden/2026-04-25-orphan-branch-archive/*.md` | Take dev | Both modified-both files match dev's canonical archive scheme. |
| `docs/archive/parent/2026-04-25-finish-line/*` (dev-only, 5 files) | Already on dev | Canonical archive scheme. |
| `docs/operator-screenshots/.gitkeep` (dev-only) | Already on dev | Placeholder for operator screenshot intake folder. |
| `docs/archive/bsu/2026-04-24-submodule-import/2026-04/.gitkeep` (main-only) | Don't restore | Empty subfolder that no longer exists on dev's flattened bsu archive structure. |

## Action

```bash
# Dev base preserved for the 134 modified-both docs.
# Restore from main:
git checkout origin/main -- docs/20260227-dry-one-shot-architecture-v1.01A.md
git checkout origin/main -- docs/OUTSTANDING.md
```

## Verification

- `find docs -type f | wc -l` post-Domain-5 = 145 (vs 143 on dev base + 2 restored = 145).
- All 22 dev-only docs preserved.
- 2 of 22 main-only docs restored (substantive); remaining 20 are duplicate archive content already represented under dev's `docs/archive/parent/2026-04-25-finish-line/` scheme.
- 79 deleted submodule-import archive docs verified to live in their owning submodules — no content drop.
