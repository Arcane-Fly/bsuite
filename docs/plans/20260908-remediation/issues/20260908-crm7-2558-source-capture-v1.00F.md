---
kind: record
authority: none
owner: bsuite
---

# govt-integrations shows a raw 42703 Postgres error when saving a USI org code — true, but asks an operator to decode a column name

https://github.com/GaryOcean428/crm7/issues/2558

Snapshot updatedAt: 2026-09-07T14:46:21Z. Open at capture; re-read live.

## Saving a USI org code shows the user a raw Postgres error

Follow-up from the completion-enforcer gate on crm7#2553 (gap 2), and a small one — but it is the
last user-visible step of a defect chain that has now been through three states.

`/settings/govt-integrations` renders the caught error verbatim in its error slot. Once the save
reaches the `tenants` UPDATE it hits `42703 column "usi_org_code" of relation "tenants" does not
exist` (crm7#2554), and that string is what the operator reads.

### The three states this message has been through

1. **Before crm7#2553** — "Tenant not found". A *lie*: the tenant resolved fine; the page was
   reading a non-existent `user_profiles.tenant_id` by a non-existent `user_profiles.user_id`.
   The message blamed the user's account.
2. **After crm7#2553** — a raw PostgREST error. *True*, and a strict improvement, because it no
   longer accuses the account of being misconfigured. But it asks an operator to interpret a
   column name.
3. **What it should be** — this feature cannot work until `tenants.usi_org_code` exists
   (crm7#2554). The honest message names that, e.g. *"Saving a USI org code isn't available yet
   — tracked in crm7#2554"*, rather than making the reader decode `42703`.

### Why it is worth a row rather than a shrug

A raw database error in a settings field is the kind of thing an operator screenshots and asks
about, and the answer — "a column is missing from the schema" — is not something they can act on.
Naming the limitation costs one `catch` and removes a support round-trip.

Deliberately **not** folded into crm7#2553: that PR is gated at head `159dce6cc` with an APPROVE,
and this is a copy change in a file it touches. Amending it now would invalidate the gate for a
cosmetic improvement.

### Suggested shape

Catch the known case at the call site and map it to the plain-language message; leave the generic
handler for anything unexpected. Close it together with crm7#2554 if that lands first, since a
working save makes the special case unnecessary.

Related: crm7#2554 (the missing column), crm7#2553 (the "Tenant not found" fix).
