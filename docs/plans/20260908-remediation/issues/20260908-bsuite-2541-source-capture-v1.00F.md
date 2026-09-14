---
kind: record
authority: none
owner: bsuite
---

# The doubled BOTTOM border is Math.ceil row over-allocation, not itemChrome — 28 of 29 slots measured bottom-heavy, 0 concentric

https://github.com/GaryOcean428/bsuite/issues/2541

Snapshot updatedAt: 2026-09-06T09:16:58Z. Open at capture; re-read live.

## The defect the operator has raised "hundreds of times", finally measured

**It is not `itemChrome`.** It is the deliberate `Math.ceil` row over-allocation in `computeAutoHeightRows`, painted instead of absorbed.

### What is on screen

Measured 2026-08-27 on `crm.crm7.app` (production), signed in as `e2e@crm7.app`, serial, origin asserted before every read. **45 slots across 8 routes. 29 carry a painted card. 28 are BOTTOM-HEAVY. ZERO are concentric.**

| inset | median | max |
|---|---|---|
| top | 1px | 73 |
| left / right | 1px | 17 |
| **bottom** | **26.6px** | **257** |

1px is just the surface's own border. The card is **flush** on three edges and leaves a strip of **bare bordered grid surface below it** — card border, gap, then the surface's own bottom border. Two visibly separate horizontal lines. That is why the report has always been *"bottom border still double"* and never *"cards have double borders"*.

### The cause, reproduced exactly

Rows are 32px on a 6px margin; react-grid-layout allocates `px(n) = n*32 + (n-1)*6`:

| slot | content | rows | allocated | measured | gap |
|---|---|---|---|---|---|
| `/people` 0 | 156.4+2 | `ceil(164.4/38)`=5 | 184 | **184** | 25.6 |
| `/clients` 0 | 110+2 | `ceil(118/38)`=4 | 146 | **146** | 35.0 |
| `/contacts` 1 | 1899+2 | `ceil(1907/38)`=51 | 1932 | **1932** | 33.0 |

**The ceiling is correct and must not be reverted.** Its docblock records that `Math.round` clipped content about one card in six and on 2026-08-20 left `/clients/create`'s submit button physically unclickable. The defect is that the *"few pixels of empty card padding"* it trades for is **painted as a bordered strip** instead of absorbed inside the card.

### Where the gap lives

Identical on every slot measured:

```
surface 184px  →  flex-1 min-h-0 182px  →  measureRef 156.4px  →  … → card 156.4px
                                           ^^^^^^^^^^^^^^^^^^^ the entire gap
```

**The obvious fix does not work.** Stretching `measureRef` is a stable fixed point (`ceil(38n/38) = n` for any n) — but it **latches at the high-water mark**, so a card whose content later shrinks could never collapse back. The docblock's insistence on unconstrained measurement is correct. A real fix has to separate *measurement* from *fill*, and that is a design decision, not a patch.

### Concentric is NOT this defect

The operator ruling of 2026-08-26 sets card radius at **12px inside the canvas's 24px**, deliberately nested, and the Card's own E5b comment says the inner border was *added* so a borderless card would not blend invisibly into the canvas. An evenly-inset card is that ruling rendering correctly. Only a bottom-heavy inset is the symptom. **Reporting both together is how a correct design gets "fixed".**

### Why no gate caught it

`gridItemFit` — the class *named* for this — compared `.react-grid-item` to `Array.from(it.children).find(visible)`, which returns the **surface**, and the surface is `h-full` by construction. Identical rects, `dBottom` always ~0, **it could never fire**. Fixed in the skills hub 2026-08-27 and validated in both directions on production:

| route | result | independently measured truth |
|---|---|---|
| `/people` | FAIL 5 | 5/5 bottom-heavy |
| `/clients` | FAIL 5 | 5/5 |
| `/analytics` | FAIL 4 + WARN 2 | 6/6, of which 2 are chrome-off |
| `/pricing` | **0** | fully opted out — negative control, silent |

Two further detector faults, both false-negatives: `paintedCard` (keys on `bg-card`) returned **zero positives across all 206 slots**, and `paintedBox` had an off-by-one (`boxes` counts *descendants*, so one nested card is already a double border, but the threshold demanded two). Correcting it moves the positive control from 2/6 FAIL to **6/6 PASS**. Two lanes' contested "42" and "189" were the same data at different thresholds.

### Scope

Estate-wide — `@bsuite/page-builder` is consumed by crm7, BSU, conduit, braden and throughput. All five currently pin **2.2.0**.
