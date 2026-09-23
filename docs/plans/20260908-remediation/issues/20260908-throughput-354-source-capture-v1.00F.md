---
kind: record
authority: none
owner: bsuite
---

# ensureProfile omits email, which is NOT NULL — the profiles upsert fails 23502 on every call

https://github.com/GaryOcean428/throughput/issues/354

Snapshot updatedAt: 2026-08-31T02:45:24Z. Open at capture; re-read live.

## Measured, not inferred

`src/lib/auth/profileUtils.ts:33-39` upserts into `public.profiles` with:

```ts
.upsert([{
  id: user.id,
  username: user.email?.split('@')[0] || 'user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}], { onConflict: 'id' })
```

`public.profiles.email` is **`NOT NULL` with no default**. Run against the live database
(`tuybltdrdefjblnplpqo`) as `authenticated`, in a rolled-back transaction, with the row absent:

```
PRE-MIGRATION ensureProfile payload        BLOCKED [23502] null value in column "email"
                                                   of relation "profiles" violates not-null constraint
PRE-MIGRATION ensureProfile + email        SUCCEEDED
```

So the insert limb of `ensureProfile` cannot succeed. Adding `email` makes it work.

## Why it has gone unnoticed

The function swallows the failure — `console.warn('Failed to create profile:', insertError)`
then `return`, and the outer `catch` also warns without rethrowing. Nothing surfaces to the
user or to any gate. It is also masked in practice because two `SECURITY DEFINER` triggers on
`auth.users` (`handle_new_user`, `create_user_profile`) already create the row at signup, so
the insert limb is only reached when that row is missing — which is exactly the case this
function exists to repair.

## Not caused by, but found during

crm7 PR #1926 (`profiles` INSERT privilege narrowing). Confirmed pre-existing by running the
identical payload against the **unpatched** grants — the `23502` is identical before and
after. The narrowing deliberately retains INSERT on `id`, `username`, `created_at` and
`updated_at` precisely so this call site keeps working once the missing column is added.

## Fix

Add `email: user.email` to the upsert payload. Worth also deciding whether the swallowed
error should surface, since a repair function that silently fails to repair is the
[#1966](https://github.com/GaryOcean428/bsuite/issues/1966) "checked-nothing vs found-nothing"
shape.

## Acceptance criteria

- [ ] `ensureProfile` sends `email`, and the insert limb succeeds for a user with no profile row
- [ ] The failure path no longer silently swallows — at minimum it is distinguishable from success
- [ ] A test covers the missing-row case, not just the already-exists case

🤖 Generated with [Claude Code](https://claude.com/claude-code)
