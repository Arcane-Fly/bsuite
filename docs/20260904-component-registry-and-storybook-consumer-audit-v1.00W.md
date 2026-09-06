---
kind: record
authority: none
owner: bsuite
---

# Component registry and Storybook consumer audit

> **Status:** W (Working) · **Date:** 2026-09-04 · **Owner:** Platform lead
> **Validation loop:** §9.1 output-equivalence for registry counts and §9.2 visual-equivalence for Storybook coverage
> **Cross red-team:** PI agent verifies the parser and lifecycle classification before promotion
> **Skills to load:** `check-dead-duplicate-code`, `check-code-quality`, `test-qa-and-verification`, `test-verify-before-completion`
> **Self-report on divergence:** mandatory

## Finding

The generated component registry currently measures **direct imports from the six
apps**. It does not count Storybook stories as consumers, and it is not a complete
measure of package-internal use. A zero direct-app consumer therefore does not mean
that an export is dead.

The registry parser also previously used regular expressions for TypeScript import
and export parsing. That was contrary to the repository's no-regex rule for
structured data and produced false negatives for multiline imports and package
subpaths. The parser now uses explicit string scanning and regression cases; the
registry script contains no regex parsing.

## Current measured state

- Shared exports: **174**
- Zero direct-app consumers: **145**
- Component registry self-tests: **14 passed**
- Registry check: passed after regeneration
- `packages/ui/.storybook/main.ts` and `preview.ts` exist.
- `packages/ui/package.json` exposes `storybook` and `build-storybook` scripts.
- Existing Storybook coverage includes shared primitives and page-builder card
  surfaces, but the registry does not yet record story coverage as a consumer.

## Classification rule

| Classification | Meaning | Action |
|---|---|---|
| Package-internal support | Schema, node, editor, token, descriptor, or helper used by a higher-level export | Keep; do not delete from a zero-app count |
| Storybook-only consumer | Export is demonstrated or exercised by a `.stories.*` file but not imported by an app | Keep and count as a consumer in a separate story coverage field |
| Adoption gap | Valid public export with no app or story consumer, intended for a shared surface | Add a story first, then schedule app adoption if useful |
| Duplicate candidate | Shared export has an equivalent app-local implementation or overlapping shared export | Consolidate only after behavioural, visual, accessibility, and import-surface proof |
| Dead candidate | No package-internal reference, no story, no app import, no documented public use case | Do not delete automatically; require an owner-approved removal/archive decision |

## Preliminary package disposition

- `@bsuite/ui`: additive primitive catalogue with likely duplicate candidates around
  `StatusBadge`, `Button`, `Dialog`, `Popover`, and `Command`, because apps retain
  local shadcn copies. Storybook should be the visual contract before consolidation.
- `@bsuite/data-grid`: editor and undo primitives are supporting parts of the
  consumed `DataGrid`; classify as package-internal/additive, not dead.
- `@bsuite/page-builder`: layout constants, card styles, responsive contracts and
  optional surfaces are additive support APIs. `DraggableCardPage` is app-consumed;
  the registry must not classify it as unused.
- `@bsuite/nav-core`: app-key/path constants are additive platform configuration;
  review for adoption, not deletion.
- `@bsuite/theme`: provider/context and token constants are runtime support APIs;
  `StatusBadge` overlaps with UI/app status components and needs an ownership ruling.
- `@bsuite/schema-builder`: canvas, relation and field schemas are package-internal
  support for the consumed `SchemaBuilder` surface.
- `@bsuite/jodie`: routing and classifier constants are package configuration APIs,
  not UI components; they need a separate export taxonomy.
- `@bsuite/workflow-canvas`: node descriptors, handles, schemas and errors support
  the consumed workflow canvas; they are additive package internals.

## Required follow-up

1. Extend the registry schema with separate `appConsumers`, `storyConsumers`, and
   `packageInternalReferences`; do not collapse these into one consumer count.
2. Add Storybook story coverage to the shared UI contract for `@bsuite/ui` and
   `@bsuite/page-builder`, with both D2C and Corporate theme states where applicable.
3. Add story coverage for data-grid editing states, schema-builder canvas primitives,
   and workflow-canvas node types before calling those packages production-ready.
4. Run a duplicate-class sweep against app-local UI/status/page-builder copies.
5. Only archive/remove an export after the dead-candidate criteria above are proven.

## Evidence commands

- `node scripts/generate-component-registry.mjs --self-test`
- `node scripts/generate-component-registry.mjs --check`
- `node --check scripts/generate-component-registry.mjs`
- `grep`/source inspection confirmed `packages/ui/.storybook/` and package Storybook scripts.

## PI handoff

Please treat this document as the handoff for the next platform/docs lane:

- The registry must remain regex-free under the repository no-regex rule.
- The current `145` figure means no direct app import only; it is not a deletion list.
- Storybook must be modelled as a first-class consumer and coverage contract for
  `@bsuite/ui` and `@bsuite/page-builder`, then expanded to data-grid,
  schema-builder, and workflow-canvas states.
- Resolve the duplicate ownership question for shared/local `StatusBadge`, Button,
  Dialog, Popover, and Command implementations before consolidation.
- Require Storybook/build evidence before marking component exports complete or
  archive-ready.

This document is an active remediation record. It does not mark the 145 exports
complete, dead, or archive-ready; it identifies the missing Storybook consumer
axis needed for a truthful decision.
