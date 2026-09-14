# crm7: 171 of 292 page-builder slots draw a box inside a box — and the split is per-page, so there is no single lever

https://github.com/GaryOcean428/bsuite/issues/2560

Snapshot updatedAt: 2026-08-27T08:03:06Z. Open at capture; re-read live.

Enumerated on **production DOM** by another lane, handed over rather than acted on. Posting it as its own issue because it is a programme, not a patch, and because it keeps being confused with bsuite#2542 — which is a different defect with a different cause.

## The measurement

| | |
|---|---|
| routes measured | **71** |
| card slots measured | **292** |
| slots with `itemChrome` on | **292 of 292** — no exceptions in the sample |
| slots painting **2 or more** card surfaces | **171 (58%)** |
| slots painting exactly 1 | 121 |
| slots painting 0 | 0 |
| routes with at least one doubled slot | **62 of 71** |
| routes clean | 7 |
| routes with no card slots at all | 2 |

Worst offenders: `/settings/feature-flags` 9 of 11 · `/settings/govt-integrations` 9 of 12 · `/settings` 8 of 8 · `/settings/module-visibility` 8 of 9 · `/hr/termination` 7 of 9.

Clean routes: `/documents/hub`, `/documents/templates`, `/enrichment`, `/enrichment/programs`, `/field-officers/caseload`, `/settings/custom-pages`, `/settings/payroll-remittance`.

## The finding that kills the easy fix

The obvious hypothesis was that the split falls along the two authoring patterns — `DraggableCardPage` nests its own `<Card>`, raw `PageGridLayout` consumers do not. That would make this one line in `DraggableCardPage`.

**It does not.** All **271** resolvable slots are `DraggableCardPage`, and **161 double while 110 do not**. The split is **per-page, not per-pattern**.

So flipping `restProps.itemChrome ?? true` to `false` in `crm7/src/components/platform/pageGridLayoutAdapter.tsx:101` would correctly un-frame 161 slots and **strip the only card off the other 110**. I proposed exactly that flip on bsuite#2542 and it was wrong.

6 of 69 routes could not be resolved to a file. They are **excluded** from the 271, not silently folded in.

## How it happened, and it is nobody's current fault

1. `@bsuite/page-builder` ≤ 1.0.7 painted slot chrome unconditionally.
2. **2.0.0** turned it off by default. The reason is recorded in `crm7/src/pages/analytics/index.tsx`: *"~90% of the estate nests its own `<Card>` inside the slot and was drawing a box inside a box."*
3. crm7 then set `itemChrome` page-wide in the adapter, to restore the ~45 slots 2.0.0 had left bare.

Both changes were correct in isolation. Their **composition** re-created the exact defect 2.0.0 existed to fix.

## The direction is already ruled

`analytics/index.tsx` settles it: *"Giving the widget its own `<Card>` is durable, is what the other ~988 crm7 slots already do, and carries the 12px card radius ruling for free."*

Read with the operator ruling of 2026-08-26 in `crm7/src/components/ui/card.tsx` — corner radius 12, *"12 INSIDE 24 is the point… a card nested in it needs outer minus padding to sit concentrically"* — **concentric nesting is intended design**. The defect is never that two surfaces exist; it is that here the outer one is redundant and its inset is uneven.

**Endgame:** adapter default `false`, and the ~110 bare slots gain a `<Card>` of their own.

## Not the same defect as bsuite#2542

| | #2542 | this |
|---|---|---|
| symptom | **bottom edge only** — three sides show the border, the bottom shows border **+** remainder | a full second card outline, all four sides |
| cause | `computeAutoHeightRows` rounds up to whole 32px rows; `h-full` cannot resolve against the unconstrained `measureRef` wrapper | 110 of 271 slots have no card of their own, and the adapter chrome the other 161 duplicate |
| measured | 6.6px at 1440 and 768, 28.6px at 1024, on `/placements` | 171 of 292 slots, 62 of 71 routes |
| reachable by | `@bsuite/page-builder` 2.3.x | a per-slot refactor plus an adapter default change |

`2.3.1` changes the row arithmetic and **cannot** remove a second painted surface. If re-measuring the bottom border after 2.3.1 shows it fixed, that settles #2542 and leaves these 171 untouched. Neither issue closes the other.

## Why it is not being fixed tonight

A ~110-slot refactor plus an adapter default flip, with an estate-wide visual consequence. `page-builder` 2.0.0 is the standing reminder of what a confidently-scoped chrome change costs here — it discarded every saved layout across 1,729 cards.

## Related

- Operator ask **D-136** — *"Doubled bottom border gone, estate-wide"* — is cross-cutting and names every card surface, so it covers both this and #2542.
- bsuite#2542 for the row-quantisation defect.
