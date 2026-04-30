# Archive bucket — 2026-05-01 Vitest-canonical docs cleanup

**Date:** 2026-05-01
**Trigger:** User directive 2026-04-28 + 2026-05-01 — correct stale Jest claims across the BSuite monorepo. Verified: every project (6 apps) and shared package (3) uses Vitest; zero Jest installations anywhere.

## Contents

| File | Archive reason |
|------|----------------|
| `20260227-contributing-standards-guide-v1.00A.md` | Explicitly superseded by `docs/20260227-contributing-standards-guide-v1.01W.md`. The v1.00A snapshot carried the stale claim that the monorepo uses "Jest (Next.js projects) or Vitest (Vite projects)"; .01W is the corrected live version. |

## Related PRs

- `bsuite#351` — parent docs sweep + submodule-pointer bumps + new .01W live doc + this archive operation
- `crm7#346`, `R80.3#132`, `braden#170`, `business-suite-unified#238`, `throughput#66` — submodule-local Jest → Vitest corrections (all merged 2026-04-30)
