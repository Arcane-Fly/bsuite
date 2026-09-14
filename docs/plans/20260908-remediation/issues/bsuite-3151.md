# Cross-scope collision on 20261121000000 — the BSU side is a security fix that will be recorded as applied without ever running

https://github.com/GaryOcean428/bsuite/issues/3151

Snapshot updatedAt: 2026-09-07T10:03:53Z. Open at capture; re-read live.

## A cross-scope migration version collision on `20261121000000`, and the second file is a security fix

All six submodules share **one** Supabase project, and `supabase_migrations.schema_migrations`
is keyed on the **version string alone**. Two scopes now carry the same version:

| scope | file |
|---|---|
| **crm7** | `20261121000000_an_acting_as_window_you_would_notice.sql` |
| **business-suite-unified** | `20261121000000_is_platform_admin_is_public_executable_again.sql` |

Whichever the applier reaches **second is silently skipped** (bsuite#1707).

## The ordering is already decided, and not in BSU's favour

`20261121000000` is **already in production's ledger** — one row, from the crm7 side. It is also
the **maximum applied version**. So the BSU file will never apply: the applier sees the version
present and moves on, recording success.

## What that file does

```sql
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;
```

Its own comment states the stakes: `is_platform_admin` is **SECURITY DEFINER** over a
**caller-supplied uid**, so anon reach makes it *"a privilege oracle over any known user id"*.
It was written to re-close that after `20260929000000` re-created the function and **inherited
the default PUBLIC grant** — and it notes that the `REVOKE ... FROM anon` in that earlier file is
a **no-op against an inherited PUBLIC grant**.

## Production is currently SAFE — measured, not assumed

```
proname            is_platform_admin(uid uuid)
security_definer   true
acl                postgres=X/postgres | service_role=X/postgres | authenticated=X/postgres
anon_can_execute   false
authenticated_can_execute  true
```

**No PUBLIC grant, anon cannot execute.** There is no live exposure, and this is not an incident.

## Why it still matters

The end state is right on production **today**, but the migration that guarantees it will be
recorded as applied **without ever having run**. So:

- any **rebuilt** environment — preview branch, recovery, a new region — replays
  `20260929000000`, inherits the PUBLIC grant, and **never runs the file that closes it**;
- the ledger will assert the fix is applied when it is not, which is worse than an open gap
  because it stops anyone looking.

## Allowlisting would be the wrong call here

`scripts/migration-collision-allowlist.txt` exists for *"a known, deliberately-identical
duplicate or a verified-harmless coincidence"*. This is neither: the two files are unrelated, and
the BSU one is load-bearing on any rebuild. Allowlisting would silence the detector on precisely
the case it was built for.

**Rename the BSU migration to an unused timestamp** so it actually applies. That is a
business-suite-unified change; it is already on BSU `main`, so it needs a forward migration with
a fresh version rather than an edit in place.

## Blocking

bsuite#3148 (advance the BSU pointer `c72355ad2` → `543875002`) is **correctly blocked** by
`version-collision-lint`. Verified the collision is **introduced by that promotion**: the BSU
file is absent at `c72355ad2` and present at `543875002`. I am not merging it and not
allowlisting past it.
