# @bsuite/theme v0.6.0 — Migration Guide

**Status:** W (Working, 2026-07-20)

## What changed

v0.6.0 ships the W3 "A1" contract (six-tier text roles, canonical gradient,
grid/dot doctrine, sRGB fallback fix — see `TOKEN-MAPPING.md §8`) plus a
zero-bug closure pass on the release. This guide covers the one
consumer-visible removal from that closure pass; everything else in §8 is
additive.

### Removed: 5 orphaned CSS files

`packages/theme/src/css/`:

| File | Status |
|---|---|
| `tokens-light.css` | **Deleted** |
| `tokens-dark.css` | **Deleted** |
| `tokens-high-contrast.css` | **Deleted** |
| `tokens-brand-corporate-braden.css` | **Deleted** |
| `runtime-branding.css` | **Deleted** |

**This is not a breaking change for any real consumer.** These files were
documented in `MIGRATION-v0.2.0.md` as shipping "included when you
`@import '@bsuite/theme/css'`", but that was never actually true —
`src/css/index.css` has only ever imported `vars.css` + `utilities.css`
(confirmed by the 2026-07-09 styling-consistency audit). The files were:

- Not in the package's `exports` map (no `./tokens-light.css` etc. entry)
- Not `@import`-ed by `index.css` or `braden.css`
- Not referenced by any deep-import anywhere across all 7 repos (parent +
  6 submodules) — verified by exhaustive grep for each filename

Every token they defined already has a live equivalent in `vars.css`
(Layers 2–4: `--light-text-*` / `--dark-text-*` surface primitives,
`--role-*` semantic aliases, shadcn bridge) or in `braden.css` for the
Corporate brand. If your app imports `@bsuite/theme/css` or
`@bsuite/theme/braden-css` as documented, this change is invisible to you.

### If you were deep-importing one of these files directly

No consumer was found doing this (see verification above), but if you had
a local, undocumented `@import '@bsuite/theme/src/css/tokens-light.css'`
(or similar) — replace it with `@import '@bsuite/theme/css'` (D2C) or
`@import '@bsuite/theme/braden-css'` (Corporate), which cover the same
token surface via `vars.css`.

## Upgrading

```bash
pnpm add @bsuite/theme@0.6.0
```

No code changes required for consumers using the documented `./css` /
`./braden-css` / `./vars.css` / `./utilities.css` exports.

## Breaking changes

None for documented usage. See "Removed: 5 orphaned CSS files" above for
the one file-level removal.
