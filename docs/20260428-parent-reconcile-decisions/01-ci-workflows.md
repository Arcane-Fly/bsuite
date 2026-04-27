# Domain 1 — CI Workflows reconcile

**Status:** F (Frozen)
**Date:** 2026-04-28
**Workstream:** WS-ε (parent monorepo dev↔main reconcile)

## Files (2 modified-both)

- `.github/workflows/dry-lint.yml`
- `.github/workflows/publish-theme.yml`

## Observed delta

Both workflows existed on `origin/main` and were DELETED on `origin/development`. Likely an accidental deletion or pre-publish cleanup that never came back.

## Decision rule

Take main's version (RESTORE the workflows).

Rationale:
- `dry-lint.yml` is the Phase 6c free-text-where-FK lint gate — referenced in the active dry-lint scripts and protects DRY architecture.
- `publish-theme.yml` automates `@bsuite/theme` npm publishes when `packages/theme/**` changes land on main. This is the same release contract as `@bsuite/dry-lint` and `@bsuite/schema-registry` and must remain functional.

Neither workflow has a dev-side replacement, so restoring is non-regressive. Both reference `packages/theme/**` and `scripts/dry-free-text-where-fk-lint.sh` — those exist on the integrated branch so the workflows resolve.

## Action

```bash
git checkout origin/main -- .github/workflows/dry-lint.yml .github/workflows/publish-theme.yml
```

## Verification

- File presence confirmed; no syntax changes.
- No node version drift (both use `actions/setup-node@v5` with `node-version: '24'`, matches `.node-version` at repo root).
