# HANDOFF-3c — BSU Developer routes follow-up (DEFERRED)

**Document**: `20260501-handoff-3c-bsu-developer-routes-deferred-v1.00W.md`
**Status**: W (Working) — **PARKED**
**Owner**: TBD (likely Codebuff in a future ship round)
**Blocking dep**: HANDOFF-3d's drop migration must land first
**Submodule**: `business-suite-unified`

## Goal (when un-parked)

Land the BSU Developer portal routing rework + sub-nav refactor + new tests
that originally lived on `fix/auth-tier-free-flicker-20260428`. This is
**backlog item P1-15** ("BSU Developer portal route fix") per
`docs/20260501-merged-execution-backlog-v1.00W.md`.

## Why this is parked

The seven affected files all reference `tenant_page_layouts` either directly
(via Supabase queries) or via the `TENANT_LAYOUT_ROUTES.bsu` config that
expanded from 3 to 30+ canonical routes — including
`/developer/pages` and `/developer/nav`, which are tenant_page_layouts
consumers.

`tenant_page_layouts` is scheduled to be **dropped atomically** by
HANDOFF-3d's `20260502000000_drop_tenant_page_layouts.sql` per ADR-0001.
Shipping the routing rework BEFORE the drop migration lands is a contract
race: the Developer pages would query a table that's about to disappear, and
the new test `tenantRoutes.test.ts` would assert routes that point to pages
which immediately stop working post-drop.

Per ADR-0003 (consumer-renderer pattern), the post-drop world has each
consumer app rendering CRM7's `custom_pages` schema via app-local
components. The Developer/* rework should be **re-targeted** to consume the
new pattern, not the deprecated `tenant_page_layouts` shape.

## Files parked (preserved on `fix/auth-tier-free-flicker-20260428-snapshot`)

| File | Status | Why parked |
|---|---|---|
| `src/config/tenantRoutes.ts` | M (37-line diff: 3 routes → 30+) | Includes `/developer/pages`, `/developer/nav` — tenant_page_layouts consumers |
| `src/config/__tests__/tenantRoutes.test.ts` | NEW (untracked) | Pairs with tenantRoutes.ts changes |
| `src/pages/Developer/Notices.tsx` | M | Reads tenant_page_layouts.layout_json |
| `src/pages/Developer/RateLimits.tsx` | M | Reads tenant_page_layouts |
| `src/pages/Developer/Routing.tsx` | M | Reads tenant_page_layouts |
| `src/pages/Developer/Schema.tsx` | M | Reads tenant_page_layouts |
| `src/pages/Developer/index.tsx` | M | SUB_NAV_TABS export + resolveDeveloperFallbackPath helper for the expanded route set |
| `src/pages/Developer/__tests__/DeveloperPortalRoutes.test.ts` | NEW (untracked) | Pairs with Developer/index.tsx changes |

All preserved on branch `fix/auth-tier-free-flicker-20260428-snapshot` (created
in HANDOFF-3a Step 1, pushed to `origin`). **Do not delete that branch** until
this handoff resolves.

## Un-park preconditions

This handoff becomes runnable when ALL of the following are true:

1. ✅ HANDOFF-3d's `supabase/migrations/20260502000000_drop_tenant_page_layouts.sql` has merged to BSU's `master` and run against the live `tuybltdrdefjblnplpqo` Supabase project
2. ✅ CRM7's `custom_pages` schema is the canonical page builder per ADR-0001
3. ✅ A consumer-renderer for BSU pages (per ADR-0003) is implemented as either an app-local component reading `custom_pages` or a documented stub
4. ✅ The Developer portal pages have been **re-targeted** to query `custom_pages` (or a CRM7-published view) instead of `tenant_page_layouts`

Until step 4 is done, the parked code is **stale source material** — useful
for understanding the intended UX flow, but not directly cherry-pickable.

## Recommended un-park sequence (sketch — write a fresh handoff doc when un-parking)

1. Branch from `master`: `feat/bsu-developer-portal-rework-<date>`
2. Manually port the **route additions** from `tenantRoutes.ts` (most are valid post-drop because they're just route paths; only `/developer/pages` and `/developer/nav` need a hard look)
3. Re-target each Developer/* page from `tenant_page_layouts` queries to `custom_pages` queries
4. Update the new tests to assert against the new schema
5. Open feature → development PR
6. Stop short of merge for smoke test

## Tracking

When ready to un-park, file a new HANDOFF doc:
`docs/<date>-handoff-3c-resumed-bsu-developer-rework-v1.00W.md`

…and link back to this doc + the ADR-0001 drop migration that unblocked it.

## Done definition (this handoff while parked)

- [x] Source material preserved on `fix/auth-tier-free-flicker-20260428-snapshot`
- [x] Park reason documented in this file
- [x] Un-park preconditions enumerated
- [ ] (when un-parked) New HANDOFF doc written and executed
