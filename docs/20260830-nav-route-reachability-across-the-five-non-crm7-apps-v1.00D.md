# Nav route reachability — the five non-crm7 apps

**Status:** D — a dated audit. Findings below are measured, not asserted.
**Date:** 2026-08-30
**Scope:** braden, business-suite-unified, conduit, throughput, R80.4

## Why this was run

crm7's `routes.deals.detail(id)` returned `/deals/${id}`, a path the router never
registered. Every consumer navigated to a 404 — four call sites, and it surfaced only
because someone clicked one. A routability guard added afterwards found **seven more**
broken builders in that app alone.

The same class had never been measured in the other five apps.

## Result

| app | routing style | nav entries | unreachable | control |
|---|---|---|---|---|
| business-suite-unified | react-router (`<Route path>`) | 19 | **0** | `/` matches |
| throughput | react-router | 36 | **0** | `/ideas` matches |
| conduit | **Next.js app-router** (file-based) | 12 | **0** | `/candidates` matches |
| braden | react-router | 5 navigate targets | **0** | `/` matches |
| R80.4 | **no router at all** | 1 | **n/a** | — |

**No unreachable nav entry in any app.** The crm7 defect did not replicate.

## What the controls caught, and why the first answer was wrong

The first pass reported **conduit 12 of 12 unreachable** and braden unparseable. Both were
instrument failures, not findings:

- **conduit is Next.js.** Routes are directories containing `page.tsx`; there is no
  `<Route path>` to extract, so the extractor found **zero routes** and every nav entry
  "failed" against an empty set. Re-run with file-based discovery: 35 routes, 0 unreachable.
- **braden discriminates on `action`.** Its nav items carry `target`, not `href`, and an
  `action: 'scroll'` target is an **element id, not a route**. Checking those against the
  router would have manufactured three false positives. Only the 5 `navigate` targets are
  routes.
- **R80.4 has no router dependency** — `react-router`, `wouter` and `next` are all absent
  from its `package.json`, and its four pages compose directly. The check does not apply.
  That is **n/a, not a pass**.

Every row above carries a control that had to come back POSITIVE — a known-good route
matching — before its zero was believed. Three of the five initially failed their control,
and each failure was the method being wrong for that app's routing style.

## What this does NOT cover

Reachability of a nav entry, not reachability of a **page**. A route can be registered and
still be reachable from nowhere in the UI — crm7's feature index lists 87 such orphan
routes, and the nav test asserts only one direction. That is a different measurement and it
is not made here.
