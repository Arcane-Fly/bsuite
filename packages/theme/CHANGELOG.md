# @bsuite/theme

## 1.5.3 (unreleased; 1.5.3-next.N on development) — 2026-09-26

**A centred gradient title stays centred** (bsuite#3365).

`.text-gradient-accent` sets `width: fit-content` so the gradient spans the
glyphs. That made a parent's `text-align: center` inert: the text was centred
inside a box that hugged it, and the box sat at the parent's start edge. 38
titles across BSU, crm7 and conduit were affected, most of them `CardTitle`s in
a `text-center` `CardHeader`. Measured on d.suite `/login`: 24px from the left,
250px from the right.

The utility now adds `margin-inline: auto` when the element carries
`text-center` or its **direct** parent does. A left-aligned block nested
somewhere inside a centred container is untouched. Real-browser measurement
(parent 500px wide):

| case | before | after |
|---|---|---|
| title in a `text-center` parent | 0 / 315px | 157 / 157px |
| title with its own `text-center` | 0 / 279px | 139 / 139px |
| nested left-aligned block | 0 / 378px | 0 / 378px |

## 1.5.0 — 2026-08-31

**A touch-target floor for coarse pointers.**

Adds `src/css/touch.css`, imported by the `@bsuite/theme/css` barrel that all six
apps already import, and exported as `@bsuite/theme/touch.css`.

Measured on `suite.crm7.app/login` under iPhone 14 emulation: **every one of the
eight controls** on the sign-in screen was below a usable tap size, and two were
below even WCAG 2.2 AA (2.5.8, 24x24) —

| control | size | control | size |
|---|---|---|---|
| Continue with Google | 300x36 | password input | 300x36 |
| Continue with Microsoft | 300x36 | Sign In | 300x40 |
| email input | 300x36 | password visibility | 24x24 |
| Forgot password? | 85x16 | Create Account | 87x20 |

**The font-size rule is not cosmetic.** Safari on iOS zooms the whole page when a
focused input is under 16px. Both login inputs were 14px, so tapping the email
field threw the layout out of scale and left it there — that is the symptom people
notice, and the small targets are what they blame afterwards.

**Gated on `pointer: coarse`, not a width breakpoint.** The constraint is the
finger, not the viewport, so desktop rendering is untouched and the estate's dense
data surfaces carry no risk.

Blast radius, measured rather than assumed:

```
suite.crm7.app/login   8 of 8 controls failing -> 0 failing, no overflow
crm.crm7.app/          0 failing before AND after; document height 3681px -> 3681px
```

A page that already complies is untouched — that property is what makes this safe
to ship estate-wide rather than page by page.

44px is Apple HIG and WCAG 2.5.5 (AAA); the AA floor is 24px. `.tap-exempt` opts a
control out, and the file says plainly it is an admission rather than a default.

Contract-tested (9 cases) and mutation-tested: removing the `pointer: coarse` gate
or changing `min-height` to `height` each turns the suite red.

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
