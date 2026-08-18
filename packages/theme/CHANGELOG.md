# @bsuite/theme

## 0.14.0 — 2026-08-17

**Republishes work that 0.13.0 silently lost.**

Two pull requests both set the version to `0.13.0`. Whichever reached `main` first
published; the second could not republish a version npm already held, so it
**no-oped without failing**. The source and the registry diverged and nothing
reported it.

Measured by unpacking the published tarball rather than trusting the version:

| in `@bsuite/theme@0.13.0` on npm | |
|---|---|
| `fonts.css` + 4 vendored woff2 | present |
| `--role-border-interactive` (TH-5) | **0 occurrences — lost** |
| `.bsuite-gradient-underline` (TH-6) | **0 occurrences — lost** |
| `non-text-contrast.test.ts` (22 assertions) | **absent** |

All four are present in `development`'s source. Nothing needed rewriting — 0.14.0
simply ships what 0.13.0 should have.

What that means for consumers: every app on 0.13.0 has the fonts and **not** the
3:1 interactive border contrast fix. `--input` still resolves to the old value,
so `border-input` on every Input, Select, Textarea and outline Button is still at
1.12:1 in light mode.

### Included, from the source that never shipped

- `--role-border-interactive` — light `oklch(0.56 0.015 260)` worst 3.88:1, dark
  `oklch(0.66 0.018 250)` worst 5.30:1. `--input` resolves to it; `--border` stays
  on the decorative hairline deliberately.
- dark `--role-border-strong` raised to `oklch(0.55 0.015 250)`, worst 3.40:1 — it
  was 2.99:1 against the lightest dark surface, which the original short surface
  list never tested.
- `non-text-contrast.test.ts` — cross product of every border role × every surface
  × both modes, so a short list cannot hide a failing pair again. Carries its own
  positive controls, including an assertion that a pair MUST fail.
- `.bsuite-gradient-underline` / `-span` moved in from crm7.
