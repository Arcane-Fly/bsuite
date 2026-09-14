---
kind: record
authority: none
owner: bsuite
---

# useMailStats counts email_messages with no tenant filter, and it is rendered on /communications

https://github.com/GaryOcean428/crm7/issues/2525

Snapshot updatedAt: 2026-09-07T04:54:45Z. Open at capture; re-read live.

## What

`useMailStats()` in `src/components/communications/mail/useMailData.ts` counts
`public.email_messages` with **no tenant filter**, and it is rendered on `/communications`.

```ts
.from('email_messages')
.select('id', { count: 'exact', head: true })
.eq('direction', 'inbound')
.eq('is_read', false),
```

The only predicates are `direction` and `is_read`. Wired at `src/pages/communications/index.tsx:57`
— `const { data: stats } = useMailStats()`.

## Why RLS does not save it

This is the same mechanism recorded on crm7#2492 and restated in #2515's own rationale, verified
live rather than repeated:

`auth_tenant_id()` is `acting_tenant_id()` **UNION ALL every active `user_tenants` row** when
`acting_tenant_id()` is empty — and `acting_tenant_id()` only resolves for a **platform developer
with an unexpired impersonation row**. So for an ordinary user RLS returns the rows of **every
tenant they belong to**, not the tenant they are acting in. The client predicate is the only
thing that narrows to the acting tenant, and here there isn't one.

## Severity, stated precisely

This is a **count**, not row contents — `head: true` returns no rows. So what crosses is the
*volume* of another tenant's unread inbound mail, not its subjects or bodies.

Denominators, so the number can be absurd against something: **2 of 9** active users belong to
more than one active tenant, and `email_messages` holds **452 rows across 5 tenants**. So the
inflated count is reachable today, by two real people, and it is wrong rather than dangerous —
a user in two tenants sees a badge counting both.

Not a P0. Filed because it is the **live remainder** of a class that was reported closed.

## The class, measured

**24 `.from('email_*')` sites across four files** (non-test):

| file | sites | state |
|---|---|---|
| `services/emailService.ts` | 15 | **guarded** by `requireTenantId()` (#2515, #2520) |
| `services/emailLinkService.ts` | 6 | unguarded — not assessed for reachability |
| `components/communications/mail/useMailData.ts` | 2 | **this issue** — one is live |
| `services/calendarService.ts` | 1 | caller-supplied tenant, the shape #2524 closed by removing the parameter |

So the guard covers **15 of 24**, not "every `email_*` query". The earlier measurement cleared
against a denominator of 15 — `emailService.ts` alone — which is the instance rather than the
class. The file was complete; the class was not.

## Fix

Bring `useMailData.ts` under `requireTenantId()`, matching `emailService.ts`. Then assess
`emailLinkService.ts` (6) and `calendarService.ts` (1) — the latter takes a caller-supplied
tenant, which is exactly the shape #2524 fixed by **removing the parameter** so a caller cannot
supply one.

## Acceptance

- Every `email_*` site derives its tenant from `requireTenantId()`, or states why not.
- A test plants a null tenant and asserts **no query reaches the table** — a call count of zero,
  with a positive control driving the same counter above zero.
- The count on `/communications` matches the acting tenant for a user who belongs to two.

Found while gating crm7#2518. Related: #2492, #2493, #2515, #2520, #2524.
