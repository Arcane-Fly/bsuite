---
kind: record
authority: none
owner: bsuite
---

# Placements list empty after person page — sticky personId filter on shared store

https://github.com/GaryOcean428/crm7/issues/2584

Snapshot updatedAt: 2026-09-08T04:58:25Z. Open at capture; re-read live.

## Symptom
FutureBuild Academy: DB has **8** placements; `/placements` showed **0** while acting as FutureBuild after opening a person (e.g. Ben) with no placements.

## Root cause
`usePersonPlacements` in `people/[id].tsx` sets `usePlacementStore` filters to `{ personId }`. The global list page only called `fetch()` and never cleared the sticky filter, so network showed:
`...&or=(person_id.eq.<ben>,apprentice_id.eq.<ben>)` → 0 rows.

## Fix
PR clears `personId` to `'all'` on `/placements` mount when sticky.

## DoD
- [ ] After person detail → Placements nav, list shows tenant placements
- [ ] Person tab still scoped to that person
- [ ] No FutureBuild data writes
