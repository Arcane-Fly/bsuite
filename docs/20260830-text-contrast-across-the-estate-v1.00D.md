---
kind: record
authority: none
owner: bsuite
---

# Text contrast across the estate — what was measured, fixed, and left open

**Status:** D — a dated audit. Every number below was measured on production, in a browser,
with the instrument named. Nothing here is asserted from source alone.
**Date:** 2026-08-30

## The finding that started it

`crm.crm7.app/reports`, light theme, at and below 1024px: `--role-text-muted` in a selected
grid cell measured **4.05:1**, under the 4.5:1 AA floor for 12px text.

The token carried `/* 4.92:1 ✓ AA normal */` in the source beside it. That number was
correct — for the token on the plain body background, the one case anyone had measured. It
had **0.42 of headroom** where every other tier in the same scale had multiples of it (body
15.46, secondary 8.94). Dark's equivalent was 6.69 and passed everywhere, so a dark-only
sweep or any sweep of the plain background saw nothing.

**The wash did not break the token. It spent headroom the token never had.**

## Three live AA failures, all in the 3.0–4.5 band

| # | surface | measured | fixed to | where |
|---|---|---|---|---|
| 1 | `--role-text-muted` on `bg-primary/15`, light | **4.05** | 5.44 | bsuite#2836/#2837 |
| 2 | crm7 `--sidebar-muted-foreground`, **dark** | **4.45** | 4.96 | crm7#2258 |
| 3 | braden `ErrorAlert` gold text on `bg-role-warning/10` | **3.74** light, **4.00** dark | 5.25 / 7.36 | braden#558 |

All three sit above 3.0. The estate's browser gate used a flat 3:1 floor, so **it passed all
three**.

## Why no gate saw them

Three gates exist and each is blind to this class in a different way.

**`packages/theme/src/text-contrast.test.ts`** — 300+ assertions, a working positive control,
and it was green throughout. It pairs each role with **its own** tint: `--role-primary-text`
on `bg-primary/15`. The DOM does not do that. A cell washed `bg-primary/15` holds a name in
`text-body` and a slug in `text-muted` — *neutral type on a coloured wash*, a cross pairing
that appears in no list in that file. Its own docblock names the failure mode it was written
to end — *"not bad arithmetic, a short list"* — and it repeated it one axis over.

**`scripts/audit-d2c-theme.sh`** — checks palette conformance: pure white/black, non-oklch,
bypass, destructive. Returns 0 real findings across all six apps. It does not measure
contrast at all.

**`scripts/audit-applied-tokens.mjs`** (P7) — the one gate that opens a browser. Its floor
was a flat 3:1, documented honestly as *"deliberately lenient … a stricter bar on a first
pass produces a list nobody acts on."* True when written. Re-measured 2026-08-30 with its
own defects fixed: **722 element-readings across three production surfaces in both themes,
one failure.** The lenient band is now where the remaining defects live.

## P7 was also measuring the wrong colour, three ways

Found by running it against production and refusing a number that looked wrong. Fixed in
bsuite#2841.

1. **It skipped opaque layers it could not parse.** The walk matched `rgb()` only, and the
   estate's palette gate *requires* `oklch` — so nearly every card and panel was invisible
   and the walk continued through it. On braden a form label resolved past its own white
   card to the navy section behind: navy text vs navy, **1.00:1, seven times on one page.**
2. **It walked ancestors; backdrops are often siblings.** A hero's dark layer sits beneath a
   z-indexed content div. One paragraph read **1.03:1** while rendering perfectly.
3. **It treated a translucent layer as opaque** — a 15% wash read as the saturated fill.

Fixing 1 and 2 also cut the *unmeasurable* count on one page from 50 to 14.

## The uncovered surface

**44 literal text-colour definitions live outside `packages/theme`**, across four apps
(counted by grepping assignments, not `var()` references). Nothing measures any of them.
Failures 2 and 3 above were both sitting there.

And **429 contrast ratios are asserted in comments estate-wide**:

| | claims | verified by a gate |
|---|---|---|
| `packages/theme/**` | 112 | yes — the contrast suite asserts the real values |
| app-local stylesheets | **104 live** (+9 historical "was …") | **no** |

Of the four app-local claims examined on 2026-08-30, **three were wrong or misleading**: the
shared token's `4.92:1`, a `6.18:1` that described a value which never shipped, and
`ErrorAlert`'s *"now uses a properly-contrasting gold text token"* at 3.74:1.

## The rule this leaves

**A ratio recorded beside a token, without the backdrop it was measured against, is not
evidence.** It is a measurement of one pairing that reads as a property of the token, and
that is precisely how each of these survived. Every ratio written during this work carries
its pairing.

## Open — not claimed either way

- **braden's public site produces 9 findings on the dark pass.** The page has no theme
  control and does not read a stored preference, but the probe toggles `.dark` on
  `documentElement`, flipping package tokens while hardcoded brand classes
  (`bg-braden-navy`, `text-primary-foreground`) do not. Whether a user can reach that state
  is **not established**. A sentinel — does the body background change under `.dark`? — does
  not discriminate, because it changes on that page too.
- **A skip link on the same page at 2.76:1**, light. Plausibly real; skip links must be
  legible when focused, and this was measured unfocused.
- **`--color-braden-gold-text` is 3.98:1 on the plain light body**, so it is not an AA-safe
  body-text token in light mode anywhere. Left in place — it remains sound for large text and
  icons, which need 3:1. Only the one component measured to be using it for body copy was
  changed.
- **The 104 unverified app-local claims** have not been swept.

## Instrument notes, because three of these cost real time

- **Carry the build asset hash in every deploy reading.** The closing measurement returned
  4.05 — the before-number exactly — because the browser served a cached HTML document
  naming the old CSS while `curl` already showed the new one. An after-measurement that
  reproduces the before-number to the hundredth is a red flag, not a result.
- **`devicePixelRatio` was 0.8**, so `setViewportSize(1440)` gave `innerWidth` 1800. Four
  breakpoints were measured that were none of the four named, until the probe asserted
  `got === want`.
- **Do not hand-roll a contrast reader.** The skill ships `visual-probe.js`, which composites
  alpha correctly; inject it from disk with `page.addScriptTag({path})`. A throwaway reader
  reported five failures here, all artefacts of treating `lab(… / 0.11)` as opaque.
- **Gradient-clipped text has `color: transparent`** and reads as black against a dark page.
  It is UNKNOWN, not FAIL — resolving it needs the gradient's own stops, which found a live
  1.70:1 on a public CTA when last done.
