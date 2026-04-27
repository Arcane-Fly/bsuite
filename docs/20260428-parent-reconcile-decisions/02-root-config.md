# Domain 2 — Root Config reconcile

**Status:** F (Frozen)
**Date:** 2026-04-28
**Workstream:** WS-ε (parent monorepo dev↔main reconcile)

## Files (modified-both, root level + scripts/, except pnpm-lock.yaml)

- `.gitignore`
- `.gitmodules`
- `.windsurfrules`
- `AGENTS.md`
- `CLAUDE.md`
- `SECURITY.md`
- `env.example`
- `scripts/check-no-hex-in-dist.sh`
- `scripts/dry-free-text-where-fk-lint.sh`

`pnpm-lock.yaml` is reconciled separately as the final step of WS-ε after package versions converge in Domain 4.

Submodule pointer entries (`R80.3`, `braden`, `business-suite-unified`, `conduit`, `crm7`, `throughput`) are reconciled in Domain 3.

## Per-file decisions

### `.gitignore` — 3-way merge

Dev added `.claude/`, `.smoke-artefacts/`, `.playwright-mcp/`. Main has `*/.playwright-mcp/`, `playwright-report/`, `test-results/`. Take the union: dev's additions PLUS main's playwright/test-results entries. Both sides serve different (non-overlapping) purposes.

### `.gitmodules` — take main (whitespace style)

Dev's only delta was a tab→space conversion on the `business-suite-unified` URL line. Main's tabs match the rest of the file. Take main per spec rule 3.

### `.windsurfrules` — take dev

Dev removed the OKLCH mandate line. This is consistent with dev's CLAUDE.md and AGENTS.md unwinding the OKLCH mandate. The yanked `@bsuite/theme@0.3.0` (per `docs/20260427-theme-0.3.0-yank-narrative-v1.00A.md`) means OKLCH mandate is no longer guaranteed enforceable across consumers.

### `AGENTS.md` — take dev + surgical grok model fix from main

Dev has the correct WS-α frozen #5 conduit-OAuth-client doctrine. Main has a newer `xai/grok-4.20-reasoning` model update (commit a28b8a9, 2026-04-24) that crm7's runtime code already consumes (verified via `crm7/src/lib/ai/config.test.ts` and `jodie-rate-review.ts` — `grok-4.20-reasoning` is the canonical primary). Apply main's surgical 3-line CRM7 model description fix on top of dev's base.

### `CLAUDE.md` — take dev + 2 surgical fixes from main

Dev base, plus:
1. Throughput section: `docs/GROQ_INTEGRATION.md` → `throughput/docs/GROQ_INTEGRATION.md` (commit 8c9d8fa, path-correction for submodule-local).
2. CRM7 §AI Gateway models: same `grok-4.20-reasoning` fix as AGENTS.md.

Dev's frozen #5 wording (Conduit IS a BSU OAuth 2.1 PKCE client) is preserved verbatim per spec rule 1.

### `SECURITY.md` — restore from main

Deleted on dev (probably accidentally — it's a GitHub-recommended security policy file). Restore.

### `env.example` — restore from main

Deleted on dev. Main has 233 lines of unified env-variable documentation across all 6 apps. Critical reference for new contributors. Restore.

### `scripts/check-no-hex-in-dist.sh` — restore from main

Deleted on dev. Phase 5 CI gate that verifies no hex literals survived into built CSS bundles. Still referenced by Phase 5 release process. Restore.

### `scripts/dry-free-text-where-fk-lint.sh` — restore from main

Deleted on dev. Phase 6c lint script invoked by `.github/workflows/dry-lint.yml` (restored in Domain 1). Restoring keeps the CI workflow functional.

## Action

```bash
# Dev base preserved for: .gitignore (merged), .windsurfrules, AGENTS.md, CLAUDE.md
# Restore from main: .gitmodules, SECURITY.md, env.example, scripts/{check-no-hex,dry-free-text}.sh
git checkout origin/main -- .gitmodules SECURITY.md env.example \
    scripts/check-no-hex-in-dist.sh scripts/dry-free-text-where-fk-lint.sh
# Apply 2 surgical fixes from main on top of dev's CLAUDE.md and AGENTS.md (grok model + GROQ path)
```

## Verification

- File-presence and grep-spot-check confirm all decisions applied.
- `pnpm install --frozen-lockfile` deferred to post-Domain 4 lockfile regeneration.
