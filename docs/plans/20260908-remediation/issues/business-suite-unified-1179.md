# /ideas' 3 stage columns render box-shadow: none — no elevation ramp at all, both themes

https://github.com/GaryOcean428/business-suite-unified/issues/1179

Snapshot updatedAt: 2026-09-06T14:50:50Z. Open at capture; re-read live.

`visual-probe.js` class **V-C7 `elevation`**, production `suite.crm7.app` @ `9292b84`,
signed in as `e2e@crm7.app`, `prefers-color-scheme` emulated + reloaded, transitions killed.
12 cells. Two distinct sub-classes on two routes.

## `/docs` · dark · all four widths — 7 cards, no accent glow

```
FAIL: dark-mode card shadow carries no accent glow — every layer is at or below the
      ambient ink's own chroma (max 0.0189, needs 0.05)                        x7
  sel  a.block.h-full.rounded-lg
  cls  block h-full rounded-lg border border-border bg-card p-5 shadow-elev-2
       transition-colors hover:border-primary/…
```

`shadow-elev-2` and nothing else. This is **the same defect as throughput#481**, which the
SHIP lane is fixing in throughput#482 — so the class is wider than that issue's title
suggests. The estate, measured in one run with the instrument's own control in every cell
(a known chromatic colour must read ≥ 0.12, a known achromatic one ≤ 0.03 — both bit on all
six hosts):

| app | route measured | dark cards | max layer chroma |
|---|---|---:|---:|
| crm7 | `/dashboard` | 4 | **0.1316** conformant |
| braden | `/` | 10 | **0.0941** conformant (Corporate gold, by design) |
| conduit | `/` | 8 | 0.0189 flat |
| throughput | `/` | 3 | 0.0189 flat — fixed in throughput#482 |
| **BSU** | **`/docs`** | **7** | **0.0189 flat** ← this issue |
| R80.4 | `/` | 0 | no cards match the selector |

The fix throughput#482 lands is: take crm7's **diffuse** accent layer
(`0 4px 28px 0 color-mix(in oklch, var(--card-glow-source) 22%, transparent)` in
`--tw-inset-shadow`) and deliberately leave crm7's 1px accent **ring** behind, per
`docs/20260822-border-elevation-token-system-spec-v1.00F.md` §5.4 — *"dark-mode cards keep
a faint accent presence … without drawing a ring."* The same shape applies here.

## `/ideas` · **both** themes · all four widths — 3 cards with no shadow at all

```
FAIL: card has box-shadow: none — no elevation                                 x3
  cls  flex flex-col rounded-xl border bg-card/30 p-4 border-t-2 border-stage-{2,4,6}/40
  text "Capture 0 ideas / No ideas in capture stage", "Refine …", "Launch …"
```

These are the three stage columns on the Idea Hub. `box-shadow: none` — not a missing
glow, no elevation ramp at all, in light as well as dark. The probe's "decoration inside an
already-elevated surface" exemption did not fire, so no ancestor is carrying elevation for
them either.

Note `bg-card/30`: the card ground is at 30% alpha, so whatever elevation is added has to
work against a translucent surface.

## Not covered by #1173

#1173 is `/gto` and names `ring-offset #fff` + `glow-accent`. These are different routes and,
for `/ideas`, a different sub-class (absent rather than achromatic).

Found by the SHIP lane while enumerating every remaining blocker on bsuite#3119. Reported,
not fixed — out of scope for that promotion's two named blockers.

