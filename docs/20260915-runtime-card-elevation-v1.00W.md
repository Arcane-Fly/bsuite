---
kind: record
authority: none
owner: bsuite
evidence:
  - packages/theme/src/runtime-elevation.test.ts
  - .github/workflows/publish-theme.yml
---

# Runtime card elevation

The BSU Settings card ignored a saved depth of 4 on development `229850db0d382d5abc87b0c658d332f811f6df41`: `--shadow-elev-4` was absent from compiled CSS. The page builder selects the token at runtime, whereas the theme bridge emitted only variables referenced by static CSS. Default card elevation remained 2.

The shared Tailwind bridge now emits depths 0–4 with `@theme inline static`. Utility classes still use role-bound ink. Default elevation is unchanged; zero remains an explicit choice. This affects the shared preset consumed by the five D2C apps and Corporate Braden, each retaining its own ink.

Validation: three compiler regressions failed before and pass after; all 405 theme tests pass. Chromium compared before/after for five depths in D2C/Corporate and light/dark (eight cases). Selected depth 4 resolves after the correction. Build and typecheck pass. Installed Tailwind 4.3.3 supports combined inline/static flags; official guidance: https://tailwindcss.com/docs/theme#generating-all-css-variables. Context7 remains unavailable under the preserved quota limit; no repeated paid fallback.

This is one dependency of bsuite#479. Page-wrapper versus contained-card paint, saved padding, page-through-platform branding inheritance and all six deployed user journeys remain open. The BSU live test restored defaults without submitting profile changes. No production release or D8 approval is implied.

Reproduce the compiler boundary with `node node_modules/vitest/vitest.mjs run packages/theme/src/runtime-elevation.test.ts`. Publication evidence: `.github/workflows/publish-theme.yml`, run [34922856820](https://github.com/GaryOcean428/bsuite/actions/runs/34922856820), published 1.5.2-next.1 from commit `36979c54893b5e2adc38c013c7fe42a44e9bb34e`. The registry tarball integrity and preset bytes match that signed source. These are package receipts, not consumer or deployment acceptance.
