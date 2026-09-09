# is_platform_admin(uuid) is PUBLIC-executable again — BSU re-created the function crm7 dropped, and revoked only anon

https://github.com/GaryOcean428/bsuite/issues/3144

Snapshot updatedAt: 2026-09-07T10:22:07Z. Open at capture; re-read live.

## The sequence

| date | scope | what it did |
| --- | --- | --- |
| 2026-08-09 | crm7 `20260809043000` | Converged the predicate into `is_platform_developer()` and, after a guarded dependency check, `DROP FUNCTION public.is_platform_admin(uuid)`. Gone. |
| 2026-09-13 | crm7 `20260913000000` | `REVOKE EXECUTE ... FROM PUBLIC`, **guarded** on `to_regprocedure(...) IS NOT NULL` so it cannot abort a rebuild. Function absent → correctly did nothing. |
| 2026-09-29 | **BSU** `20260929000000` | `CREATE OR REPLACE FUNCTION public.is_platform_admin(uid uuid DEFAULT auth.uid())`. On a function that does not exist this is a plain CREATE, which carries PostgreSQL's default: **EXECUTE to PUBLIC**. |
| same file, line 469 | BSU | `REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM anon;` |

The revoke that would have closed it ran sixteen days before the function came back.

## Why the anon revoke is inert

crm7's own migration documented this, having measured the ACL when it closed the same hole:

```
=X/postgres | postgres=X/postgres | service_role=X/postgres
```

> "The leading `=X` with an EMPTY grantee is PUBLIC. `REVOKE ... FROM anon` would have completed successfully and changed nothing, because anon never held a direct grant — it inherited PUBLIC's."

**Proven, not asserted.** Reproduced on a throwaway `postgres:17`:

| step | `anon` can execute? |
| --- | --- |
| function freshly created (proacl `null` = default PUBLIC EXECUTE) | **true** |
| after `REVOKE EXECUTE ... FROM anon` — BSU's line 469 | **true** — the naive fix is provably a no-op |
| after `REVOKE EXECUTE ... FROM PUBLIC` + `GRANT ... TO authenticated` | **false** |

With `service_role` given a direct grant first, the pre-state ACL reproduces byte-identically to what crm7 measured on production — `=X/postgres | postgres=X/postgres | service_role=X/postgres` — and after the fix `service_role` **survives** (`t`), `authenticated` keeps access (`t`), `anon` loses it (`f`).

## Why it matters

`is_platform_admin` takes a **caller-supplied uid**. Reachable unauthenticated, it answers *"is THIS user a platform admin"* for any user id someone can guess or harvest — a reconnaissance oracle over the privilege graph. It grants no access itself, which is exactly why it reads as harmless in review. crm7 classed it seriously enough to write a dedicated migration for it.

There is also an unresolved architectural disagreement underneath: **crm7 deliberately dropped this predicate as converged-away; BSU depends on it and re-created it.** Two apps on one database disagree about whether it should exist. Closing the grant does not settle that.

## How it was found

#3143 made the migration rehearsal replay `archive/`, which it never had. That put crm7's DROP and its guarded REVOKE into the replay for the first time, in their real order relative to BSU's re-creation, and `check-secdef-grants.mjs --substrate replay` reported:

```
SECURITY DEFINER function grants EXECUTE to PUBLIC: is_platform_admin(uuid)
```

The gate was correct all along. The sequence that produces the defect had simply never been assembled in one database before — because 153 archived migrations were invisible to the only harness that assembles all six apps together.

## NOT verified

**The live ACL on production was not read.** This is reasoned from the migration sequence — which production also executed — and from a replay that reproduces it. A live `\df+ public.is_platform_admin` would settle it. Treat the live state as **expected-but-unconfirmed**, not measured.

## Fix

business-suite-unified#TBD — a guarded `REVOKE ... FROM PUBLIC` + explicit `GRANT ... TO authenticated`, the same shape as crm7's `20260913000000`, for the same reasons.

Refs: #3143, crm7 `20260809043000`, crm7 `20260913000000`, BSU `20260929000000`
