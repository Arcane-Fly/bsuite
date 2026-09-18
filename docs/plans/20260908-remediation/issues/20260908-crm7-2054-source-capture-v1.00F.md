---
kind: record
authority: none
owner: bsuite
---

# Communications inbox: emails cannot be opened, and compose 503s on the fairwork-enhanced edge function

https://github.com/GaryOcean428/crm7/issues/2054

Snapshot updatedAt: 2026-08-26T12:23:57Z. Open at capture; re-read live.

Two findings, same feature area, both block basic use of the Communications module.

## What a user cannot do

- **Emails can't be opened and read** at `crm.crm7.app/communications`. Operator, verbatim: "emails, cant be opened and read." (note.001)
- **Compose page fails to load fully**: `crm.crm7.app/communications/compose` — the `fairwork-enhanced` Supabase edge function returns a 503. Console evidence: `tuybltdrdefjblnplpqo.supabase.co/functions/v1/fairwork-enhanced:1 — 503` (note.003)

## Why fairwork-enhanced on a compose page is suspicious

The `fairwork-enhanced` edge function name suggests Fair Work award-rate logic, not email composition — its presence as a blocking dependency on the compose page load may itself be a mis-wired call (e.g. a shared layout component pulling in an unrelated data fetch). Worth checking whether this call is actually needed on this page before fixing it as a 503.

## Feature-index scope

crm7 module rows for `Communications inbox` and `Compose page` — check `sibling_class`/`sibling_count` to see whether other messaging-adjacent surfaces share the same broken read/compose path.

## Done means

- An email in the inbox opens and its content renders.
- The compose page loads without a failed request, and if `fairwork-enhanced` is genuinely required there, it returns 200 with real data; if it isn't required, the call is removed.
