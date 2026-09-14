---
kind: record
authority: none
owner: bsuite
---

# Estate-wide: per-card drag/resize on the card grid — 385 surfaces, 5 apps, one package, and it is react-grid-layout not dnd-kit

https://github.com/GaryOcean428/bsuite/issues/2334

Snapshot updatedAt: 2026-08-31T02:49:26Z. Open at capture; re-read live.

**No estate-wide issue has ever existed for this.** Braden has raised it *"innumerable times"* and
each time it has been fixed on the page he named. This is the class issue, filed with a measured
surface count so a future closure can be checked against something.

> *"Cards ... all on common backing cards so dnd kit is useless ... Every page on every app should
> have this working correctly. This is a repeated issue and has been raised innumerable times.
> Usually one page gets fixed but not all even when all are a requirement of the task."*

That last sentence is operator ruling **D-70**, and it is the acceptance criterion here: **fixing
any single page closes nothing.**

## First, a correction that changes which file you open

**The card grid does not use `@dnd-kit`. It uses `react-grid-layout`.**

`packages/page-builder/src/PageGridLayout.tsx`:
```
:11  import { Responsive, type EventCallback, type ResizeHandleAxis } from 'react-grid-layout'
:12  import { gridBounds, minMaxSize, minSize } from 'react-grid-layout/core'
:13  import 'react-grid-layout/css/styles.css'
```
There is no `@dnd-kit` import anywhere in `PageGridLayout.tsx` or `DraggableCardPage.tsx`. The
visual-gate class list already records this (`V-C4 … The grid is react-grid-layout, **not**
@dnd-kit`), but the request is phrased in terms of dnd-kit, so anyone acting on the words alone
goes to the wrong library and finds nothing wrong with it.

`@dnd-kit` **is** used in this estate — `packages/data-grid` column reordering, and 8 files in
crm7, 3 in BSU, 3 in conduit, 6 in braden, 3 in throughput. Those are a different surface and are
not what this issue is about.

## Measured blast radius

Files that actually **import** `DraggableCardPage` / `PageGridLayout` / `@bsuite/page-builder`:

| App | Importing files |
|---|---:|
| crm7 | **337** |
| business-suite-unified | 16 |
| throughput | 14 |
| conduit | 13 |
| braden | 5 |
| R80.4 | 0 (carries the dnd-kit deps, consumes no card page) |
| **Total** | **385 across 5 apps** |

A first grep said 467; that counted files merely *mentioning* the names. 385 is the import count.
Stating both so the number can be re-derived rather than trusted.

## It is ONE component, in a PUBLISHED package

`crm7/src/components/platform/DraggableCardPage.tsx:2` describes itself as *"crm7's thin adapter
over `@bsuite/page-builder`"*. Every app is a consumer, not an owner:

```
packages/page-builder  version 1.0.3
crm7, business-suite-unified, conduit, braden, throughput  ->  "@bsuite/page-builder": "^1.0.3"
```

**That is the good news**: this is genuinely one fix, not 385. It is also exactly why per-page
fixes have never held — a page-level patch cannot change what the package renders, so the next
page reproduces it.

## BLOCKED — publish circularity, named not worked around

The fix lands in `packages/page-builder`, and **that package publishes on `main` only**. So:

> fix the package → needs a publish → publish needs `main` → reaching `main` needs a green gate →
> the gate measures the apps against their **installed** `^1.0.3`, which does not contain the fix

This is the same circularity recorded for `packages/theme` in **#2321**, and the
`break-publish-circularity` lane owns it (`#2323` canary publishing, `#2327` prereleases to
`next`). **I am not working around it** — no vendored copy, no per-app override, no "fix crm7 now
and the rest later". Any of those would reproduce D-70 by construction.

## Acceptance criteria

- [ ] Root cause identified **in `packages/page-builder`**, not in any app
- [ ] Per-card drag works independently on a page with ≥3 cards — cards do not move as one block
- [ ] Per-card resize works independently, and the resize persists across reload
- [ ] The column slider changes the columns cards can occupy (see also the `V-C6` "control rescales `lg` only" note)
- [ ] Verified on **at least one surface in each of the 5 consuming apps**, named individually with the route — not "crm7 works"
- [ ] The count above is re-measured at closure and any drift explained
- [ ] Closure enumerates **every** criterion here, each marked met or explicitly carried forward

## Depends on

- `#2321` / the publish-circularity lane — a package fix cannot be visually gated before promotion

## Related, deliberately not merged into this issue

Operator note 3.2 — *"Card resize regressions. Cant resize individual cards anymore. Columns to
move cards into do not respect the columns slider"* — is plausibly the same root cause, but it is
a **regression** report with its own timeline and should be verified against this fix rather than
assumed identical.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
