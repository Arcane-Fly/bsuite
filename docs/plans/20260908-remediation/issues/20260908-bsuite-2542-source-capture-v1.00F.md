---
kind: record
authority: none
owner: bsuite
---

# page-builder: h-full cannot resolve inside an autoHeight slot — doubled bottom border, and probably the inert in-card scroll regions

https://github.com/GaryOcean428/bsuite/issues/2542

Snapshot updatedAt: 2026-08-31T02:49:34Z. Open at capture; re-read live.

## `h-full` cannot work inside an autoHeight slot, and the symptom is a doubled bottom border

Found by the visual gate on `d.crm.crm7.app/placements` — 5 `gridItemFit` failures at 1440, 1024 and 768. Root-caused by measuring the box chain, not by reading code.

### The chain, measured on the deployed page

| element | height |
|---|---|
| `[data-slot="grid-item-surface"]` (bordered, painted) | **184.0** |
| `.flex-1.min-h-0.overflow-hidden` | 182.0 |
| **`<div>` with no class — the `measureRef` wrapper** | **176.391** |
| `.relative.h-full.group/canvas-card` | 176.391 |
| `.block.h-full.w-full.text-left` | 176.391 |
| `.border-border.bg-card` (the StatCard) | 176.391 |

The unclassed div is `PageGridLayout.tsx`'s `{autoHeight ? <div ref={measureRef}>{content}</div> : content}`. It is **intentionally unconstrained** — that is the whole reason it exists, so the observer reads the content's intrinsic height rather than the clipped flex box.

The consequence is that its height is `auto`. Every `h-full` below it therefore resolves against **content height**, not the 182px actually available. Three nested `h-full` elements all inherit 176.391px and none of them fills the slot.

### Why it shows as a doubled border

The slot paints card chrome (`[data-slot="grid-item-surface"]`: 1px border, `bg`, `--radius-card`). The content paints its own card. They are flush on top and both sides at 1.0px, and **6.6px apart at the bottom** — so a bare bordered strip of the outer surface shows below the inner card. That is the V-C5 class exactly.

### This is not a new class, it is the same wrapper

`@bsuite/page-builder` 2.3.0 added a dev warning for the *collapsed* form of this — content that measures 0px and vanishes inside `overflow-hidden`. This is the *degraded* form: the child does not vanish, it just refuses to fill. It is the same mechanism, and it is very likely the mechanism behind the earlier report that **no in-card pane ever scrolled across 48 measured card bodies** — a scroll region sized `h-full` inside an autoHeight slot can never receive a definite height either.

### Why I am not shipping a fix in this pass

`StatCard` already carries `h-full` with a comment saying it was added for precisely this symptom. It does not work, and it cannot: `min-height` never makes a parent definite for a percentage child, and constraining the measuring wrapper breaks the measurement it exists to take. A real fix means measuring a different element from the one that lays out — a sentinel, or reading the child's `scrollHeight` — which changes the autoHeight convergence loop. That file's own comments record several prior attempts at that loop failing in production, and it is consumed by six apps.

That is a deliberate change with its own visual gate at every breakpoint, not a ride-along on a promotion at this hour.

**Narrower alternative worth considering first:** stop double-painting. A slot whose content brings its own card does not need the surface to paint chrome underneath it. That is a smaller change than touching measurement, and it fixes the visible symptom on every consumer at once — but it is still a cross-app chrome decision.

Pre-existing; not introduced by any change in flight.
