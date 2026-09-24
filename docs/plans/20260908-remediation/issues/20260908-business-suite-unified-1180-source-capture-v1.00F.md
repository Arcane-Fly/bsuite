---
kind: record
authority: none
owner: bsuite
---

# /analytics and /admin issue three HTTP 400 count queries — user_tenants.created_at and profiles.last_sign_in_at

https://github.com/GaryOcean428/business-suite-unified/issues/1180

Snapshot updatedAt: 2026-09-06T13:47:13Z. Open at capture; re-read live.

Production `suite.crm7.app` @ `9292b84`, signed in as `e2e@crm7.app`, 1440, captured from
before navigation until the page settled (the earlier reading that showed 0 for these
routes had its listeners attached *after* the load, which is a measurement gap, not a clean
page).

## `/analytics` — 2× 400, both on `user_tenants`

```
400 HEAD .../rest/v1/user_tenants?select=*
        &tenant_id=eq.00000000-0000-0000-0000-000000000e2e
        &created_at=gte.2026-08-31T16:00:00.000Z
400 HEAD .../rest/v1/user_tenants?select=*
        &tenant_id=eq.00000000-0000-0000-0000-000000000e2e
        &created_at=gte.2026-07-31T16:00:00.000Z&created_at=lt.2026-08-31T…
```

## `/admin` — 1× 400 on `profiles`

```
400 HEAD .../rest/v1/profiles?select=*&last_sign_in_at=gte.2026-09-05T13:29:00.868Z
```

Both are the **column-drift** class, not RLS: an RLS refusal is a 200 with zero rows or a
403, never a 400. The filtered columns — `user_tenants.created_at` and
`profiles.last_sign_in_at` — should be compared against the live schema before anyone
reaches for policy.

They are `HEAD` requests, i.e. **count** queries. So the two analytics figures those calls
compute ("this month" and "last month", by the date ranges) are being derived from requests
that fail, which is the same shape as #1164 — *"/gto queries employers and apprentices with
`tenant_id=eq.` (empty) and gets two 400s — the compliance counts are computed from failed
requests"*. Same class, different route and different columns.

**The tenant id is not an unresolved sentinel.** `00000000-0000-0000-0000-000000000e2e`
ends in `e2e` and is the seeded fixture tenant — the session reads back as
*"E2E Fixture Tenant (do-not-delete)"*. #1176 describes the same id as "the all-zeros tenant
UUID"; that reading is wrong and is corrected in a comment there. The 400s here are about
the **columns**, and the tenant filter is doing exactly what it should.

Found by the SHIP lane while enumerating every remaining blocker on bsuite#3119. Reported,
not fixed.
