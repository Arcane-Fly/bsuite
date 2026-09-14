# V-C3 on /: the plans heading loses 3px of ink to its grid slot, and autoHeight lands short rather than the seed being wrong

https://github.com/GaryOcean428/business-suite-unified/issues/1178

Snapshot updatedAt: 2026-09-06T13:48:56Z. Open at capture; re-read live.

`bsuite-ship-visual-promote/scripts/visual-probe.js`, class **V-C3**, on `/`:

```
FAIL: heading text is CLIPPED — overflows its box by 0x3px and it is cut by
      div.min-h-0.flex-1.overflow-auto
  sel        h2.mb-4.text-4xl.font-bold
  text       "Choose Your Business Suite Plan"
  font       Geist Variable 36px / line-height 40px
  clippedBy  div.min-h-0.flex-1.overflow-auto
```

`src/components/UnifiedDashboard.tsx:227` — `<CanvasCard w={12} cardKey="plans-header" h={4}>`
wrapping a 36px `<h2>` plus a 20px `<p>`. page-builder's grid slot is
`flex-1 min-h-0 overflow-hidden/auto`, so the 3px of ink outside the slot is
**cut**, not merely overhanging.

**Pre-existing and unchanged by business-suite-unified#1175.** Measured on
production `9292b84` and on that PR's preview build `41e7c35`: byte-identical
finding on both, dark and light, at 1440/1024/768/390. It is recorded here so
that the BLOCK verdict on this route has a named owner rather than being carried
silently as "the probe says BLOCK".

The second entry in the same class on this route is a WARN, not a FAIL, and is
correctly classified by the probe as font metrics rather than lost ink:
`h2#radix-…​.text-base.font-semibold.leading-none` "Get started with BSuite",
16px/16px — glyphs stand 2px outside the box with nothing clipping them.

**Please do not fix this by nudging `h={4}` to `h={5}`.** Per
`bsuite-page-grid-layout`, a seed height is a pre-measurement placeholder and
autoHeight is supposed to converge past it; a hand-tuned seed on one page is the
"patch the page, not the default" antipattern that section exists to prevent. The
question to answer first is why the autoHeight convergence lands 3px short on
this card — a row-rounding boundary is the obvious candidate, and if it is, it is
a package-level fix and every raw consumer has it.

Filed from the maker lane on bsuite#3119.
