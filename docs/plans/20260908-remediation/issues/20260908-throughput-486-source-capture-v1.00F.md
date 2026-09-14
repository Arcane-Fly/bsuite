---
kind: record
authority: none
owner: bsuite
---

# V-C3: the 'Capture' stage heading truncates itself at 390px on /

https://github.com/GaryOcean428/throughput/issues/486

Snapshot updatedAt: 2026-09-06T13:46:37Z. Open at capture; re-read live.

`visual-probe.js` class **V-C3 `clippedHeading`**, production `ideas.crm7.app` @ `c3590cf`,
`/`, **390px only**, both themes.

```
FAIL: heading text is CLIPPED — overflows its box by 4x0px and the heading clips itself
  sel   h2.text-gradient-accent.text-lg.font-semibold
  text  "Capture"
```

Measured directly:

```
class          text-gradient-accent text-lg font-semibold truncate
overflow       hidden          white-space  nowrap        text-overflow  ellipsis
scrollWidth    70              clientWidth  66            width 66px
background-clip text            (gradient text)
parent         div.flex.items-center.space-x-3.min-w-0
```

The word is seven characters and it does not fit, so `truncate` renders it with an ellipsis.
This is a **real** clip, unlike the font-metric overhangs the same class reports as WARN —
the heading clips itself, horizontally, by 4px, and the user reads "Captur…".

It is small, and it is the stage label on the idea board, so the truncated word is the
thing that identifies the column. `min-w-0` on the parent is doing what it is meant to do;
the 66px comes from the row's other children not yielding at 390.

Worth noting for whoever picks it up: `truncate` on `background-clip: text` also clips the
gradient, so the ellipsis is painted in the fallback colour rather than the accent.

Found by the SHIP lane while enumerating every remaining blocker on bsuite#3119. Reported,
not fixed.
