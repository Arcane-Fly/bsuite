---
kind: record
authority: none
owner: bsuite
---

# Schema Builder never loads on a cold direct navigation — stuck on "Loading tenant context…" forever while every fetch it needs returns 200

https://github.com/GaryOcean428/crm7/issues/2543

Snapshot updatedAt: 2026-09-07T11:35:54Z. Open at capture; re-read live.

## `/settings/schema-builder` never loads on a cold direct navigation

On production `crm.crm7.app`, opening `/settings/schema-builder` **as the first crm7 page of a
session** leaves it on "Loading tenant context…" indefinitely. It never renders, never errors,
never times out. Visiting any other crm7 page first and then navigating to it works.

That is the difference between a bookmark, a deep link, a browser refresh, or a link from
another app — all broken — and clicking through the nav, which works. The page is effectively
unreachable by every entry point except in-app navigation.

## Paired control, one run, one build

Three fresh browser contexts, same sign-in, same deployed build, 25s wait each. Signed in as
`braden@braden.com.au` (`platform_role=developer`, `is_super_admin=t`) — address recorded,
password never printed or persisted, no `storageState` written to disk.

```
COLD direct (attempt 1)   {"stuck":true,  "canvas":false, "h":null, "nodes":0}
WARM via /dashboard       {"stuck":false, "canvas":true,  "h":779,  "nodes":44}
COLD direct (attempt 2)   {"stuck":true,  "canvas":false, "h":null, "nodes":0}
```

`stuck` = the literal string "Loading tenant context…" is on screen. Cold reproduces 2/2; the
warm run in between is the positive control proving the account, the build, the permission gate
and the data are all fine.

## It is this route, not the tenant hook

Cold-loading other crm7 pages in the same conditions resolves tenant normally — the tenant name
renders and nothing is stuck:

```
crm7 /dashboard (cold)   {"tenantNameShown":true, "stuckTenant":false}
crm7 /contacts  (cold)   {"tenantNameShown":true, "stuckTenant":false}
crm7 /settings  (cold)   {"tenantNameShown":true, "stuckTenant":false}
```

So `useTenantId` works on a cold load generally. Something about this route's mount does not.

## Every fetch it needs SUCCEEDS while it is stuck

Captured during a stuck cold load — the tenant is resolved and delivered, and the UI still does
not leave the loading branch:

```
200 rest/v1/rpc/acting_scope_tenant_id  -> "fd7a450f-0253-4f03-87ae-0dc2c01e0a31"
200 rest/v1/profiles?select=platform_role,is_super_admin,home_tenant_id,current_tenant_id
                                        -> [{"platform_role":"developer","is_super_admin":true,…}]
200 rest/v1/platform_admin_acting_as    -> []
200 rest/v1/user_tenants…               -> 3 active memberships
console errors: 0        pageerrors: 0        failed requests: none relevant
```

The database answer is correct and arrives. `acting_scope_tenant_id()` resolves via its step 2
(`profiles.current_tenant_id` backed by an active membership) — I confirmed that read-only
against production, and all three of this account's memberships are `status='active'`.

**I have not identified the client-side mechanism and am not going to guess at one.** The
measurement says: data arrives, `tenantLoading || !tenantId` stays true on this route only, on a
cold mount only. `src/pages/settings/schema-builder/index.tsx:93` is the branch; `useTenantId`,
`usePlatformRole` (whose `isLoading` is OR'd into the result) and `useChromeless` are the three
things this route does differently, and that is where I would start.

## Second defect in the same branch: there is no failure path

```tsx
{tenantLoading || !tenantId ? (
  <div className="flex h-full items-center justify-center">
    <span className="text-sm text-muted-foreground">Loading tenant context…</span>
  </div>
) : ( <SchemaBuilder … /> )}
```

`tenantLoading` and `!tenantId` are two different situations rendered identically and forever.
`acting_scope_tenant_id()` returning NULL is a **legitimate, documented, fail-closed outcome**
for a user with no active membership and no acting row — and this page tells that user it is
still loading, permanently. Whatever the cold-load cause turns out to be, a resolution that
finishes with no tenant needs to say so and offer the tenant switcher; a resolution that is
genuinely still running needs a timeout that turns into an error with a retry. Worth fixing
independently, because it is what made this defect invisible: with an error state, this would
have been reported the first time it happened instead of looking like a slow page.

## Acceptance criteria

1. A cold direct navigation to `crm.crm7.app/settings/schema-builder` renders the canvas.
   Test it in a **fresh browser context** — a warm session hides this defect completely.
2. A regression test that mounts this route as the first route, not one that mounts it after
   another page has already resolved the tenant. A test on a warm store cannot fail on this.
3. The loading branch distinguishes *resolving*, *resolved-with-no-tenant* and *failed*, and
   neither of the last two renders "Loading…" forever.

## Related — and note crm7 is the GOOD one on sizing

business-suite-unified#1193 records the same component pinned at its 420px emergency floor on
BSU and conduit. **crm7 is the correct reference**: when it loads, its canvas measures
**1184x779**, because `useChromeless()` gives the route a real height box. Whoever fixes #1193
should copy this route's layout rather than invent a third approach.

Filed by claude-code-bsuite-pi while re-measuring operator note D-6. All measurements read-only
against production; no DDL, no writes.
