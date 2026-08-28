---
kind: record
authority: none
---

> **This is a spent plan, kept as a record.** It planned the schema-package pin for
> extreme #26 on 2026-07-27.
>
> **It is not the authority on which versions are pinned today** — `package.json` and the
> lockfiles are, and `scripts/check-shared-package-reach.mjs` plus
> `scripts/check-own-package-freshness.mjs` are the gates that keep them honest.
>
> Its `R80.3/` paths are historical and deliberately not rewritten.
>
> The classification standard requires `kind: record` to carry `authority: none`: a dated
> record is history, not a live document. Frozen (`F`) because a record of what was planned
> must not drift; per the operator ruling of 2026-08-26, `F` governs the document's
> mutability, not the state of the work.

# Schema package pin plan — extreme #26 (2026-07-27)

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## Problem
Published: `@bsuite/schema-builder@1.0.1`, `@bsuite/schema-registry@1.0.0`  
Consumers still on lagging ranges:

| App | schema-builder | schema-registry |
|-----|----------------|-----------------|
| crm7 | ^0.7.3 | ^0.3.6 |
| conduit | ^0.7.3 | ^1.0.0 |
| BSU | ^0.7.3 | ^1.0.0 |
| R80.3 | ^0.7.3 | ^1.0.0 |
| throughput | — | ^0.3.6 |
| braden | — | ^1.0.0 |

## Doctrine
Publish-before-pin. Pin exact published versions (or tight `^1.0.x`). Regenerate lockfiles **outside** monorepo workspace tree. Smoke Feature Builder / schema pages per app before promote.

## Ordered execution
1. **crm7** (Feature Builder owner) — pin builder `^1.0.1` + registry `^1.0.0`; lockfile outside tree; smoke `/developer` Feature Builder + schema-related pages; vitest schema tests.
2. **BSU** — same pins; smoke schema builder settings if present.
3. **conduit / R80.3** — builder pin; registry already 1.0.0 on some.
4. **throughput** — registry `^1.0.0` if it imports registry types.
5. Parent docs: DEPENDENCY-BUMP-CHECKLIST checklist tick; update inventory caveat.

## Explicit non-goals this PR
- No API redesign of schema-builder
- No force-latest of unrelated @bsuite packages

## Success
- All apps that import builder/registry resolve ≥ published major.minor
- CI green per app
- No workspace `..` importers in lockfiles
