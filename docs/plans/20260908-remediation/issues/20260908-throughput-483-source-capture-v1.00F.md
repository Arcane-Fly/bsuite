---
kind: record
authority: none
owner: bsuite
---

# The page scrolls sideways at 1024 and 768 on 6 of 7 routes — 1070px of content, and #480 did not close it

https://github.com/GaryOcean428/throughput/issues/483

Snapshot updatedAt: 2026-09-06T14:06:41Z. Open at capture; re-read live.

Measured on production `ideas.crm7.app` @ `c3590cf`, signed in as `e2e@crm7.app`,
`prefers-color-scheme` emulated + reloaded, transitions killed. `visual-probe.js` class
**V-C10 `layout`**.

```
page scrolls horizontally (1070px content in 1024px viewport)
page scrolls horizontally (1070px content in  768px viewport)
```

**24 of the 56 throughput cells in the run**, both themes, on 6 of the 7 routes measured —
`/`, `/launch`, `/analytics`, `/teams`, `/settings`, `/ideas/new`. `/pricing` is the only
route that does not overflow. 1440 and 390 are clean; it is exactly 1024 and 768 that break.

`document.documentElement.scrollWidth` is **1070px regardless of viewport**, so the
overhang is 46px at 1024 and **302px at 768**.

## The element whose right edge defines that 1070

Enumerated every element in `body` whose `right` exceeds `innerWidth`, sorted narrowest
first (7 of them, all in the header):

| element | left | right | width | text |
|---|---:|---:|---:|---|
| `svg` (chevron) | 1013 | 1027 | 14 | |
| `span.hidden.text-left.sm:block` | 1042 | 1064 | 22 | `e2e` |
| `span.block.text-xs.font-medium` | 1042 | 1064 | 22 | `e2e` |
| `span.flex.h-7.w-7.items-center` | 1006 | 1034 | 28 | (avatar) |
| `div.relative` | 1000 | **1070** | 70 | `e2e` |
| `button.flex.items-center.gap-2.rounded-lg` | 1000 | **1070** | 70 | `e2e` |

The account chip's right edge **is** the document scroll width. It is **data-dependent**:
`e2e` is a three-character tenant name, so a real tenant name pushes it further.

I am naming the measurement, not asserting the cause — the chip is where the scroll width
comes from, but the reason the header cannot fit at these two widths could equally be a
sibling that refuses to shrink. #478 ("throughput is the only app in the estate without a
header or sidebar") is the structural version of the same complaint and is probably where
the real fix lives.

## Why this needs its own row

**#480 / `9af5b21` — "the header could not fit between 768 and 1086, and the chip was not
why" — is merged and in production at `c3590cf`, and the overflow is still there.** So
either that fix addressed a different span of widths than the two that fail, or the chip is
in fact where the width comes from. Either way the claim in that PR title is not true of
the deployed build, and a fix that is believed to have landed is worse than one known to be
outstanding.

Screenshots: `throughput_-light-1024.png`, `throughput_-light-768.png` and the same pair in
dark, from the 168-cell run posted on bsuite#3119.

Found by the SHIP lane while enumerating every remaining blocker on bsuite#3119. Reported,
not fixed — out of scope for that promotion's two named blockers.
