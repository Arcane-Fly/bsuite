# 70 of BSU's 139 migration files are absent from the ledger while their objects are live — the apply workflow is an unbounded production action

https://github.com/GaryOcean428/bsuite/issues/3171

Snapshot updatedAt: 2026-09-07T11:41:31Z. Open at capture; re-read live.

## 70 of business-suite-unified's 139 migration files are absent from the ledger, and their objects are already live

Found while deciding whether to dispatch the BSU migration-apply workflow for a single
security migration. The dispatch would not have applied one file. It would have attempted **70**.

### Measured, read-only against production

`BEGIN READ ONLY; SHOW transaction_read_only` → `on`, via the non-pooling URL.

```
supabase_migrations.schema_migrations : 823 rows, 819 distinct 14-digit versions
                                        max version 20261121000000
business-suite-unified/supabase/migrations/*.sql : 139 files
  of which absent from the ledger entirely            : 70
```

Absent means the version string appears **nowhere** in the ledger, under any scope — not that
it lost a cross-scope collision. That makes this a different defect from #2113 (collisions where
the losing side is silently skipped) and the mirror image of #2620 (remote versions with no
local file); this is local files with no remote row.

### They were applied out-of-band — the objects exist

Nine of the 70 files' targets, checked with `to_regclass`:

```
ai_sessions             t      role_capabilities        t
ideas                   t      feature_builder_drafts   t
tenant_navigation       t      jodie_bug_reports        t
error_log               t      platform_rate_limits     t
tenant_page_layouts     f  <- 20260502000000's DROP target, already gone
```

Eight creates already exist and the one drop already happened. So this is not a pending queue
that someone forgot to run — **the work was applied and never recorded.** The oldest unrecorded
file is `20260306000000`; the newest is `20261122000000`. That is roughly nine months of
un-ledgered history in one submodule.

### Why it matters, stated precisely

It is **not** a live security or data problem — the database is in the state the files describe.
Three real consequences:

1. **The apply workflow is now an unbounded action.** Any future dispatch of the BSU scope
   re-runs 70 files, including a `DROP`. I sampled `20260317010000` and it uses
   `CREATE TABLE IF NOT EXISTS`, so much of it may be idempotent — but "may be" across 70 files
   with a drop in them is not a basis for a production write, and nobody can currently dispatch
   that workflow safely without auditing all 70 first. **I refused the dispatch on those
   grounds today.**
2. **Rebuild fidelity is unproven for those 70.** They are exactly the files a recovery,
   preview or new region would have to run in order, and their behaviour against a fresh
   database has not been exercised by anything.
3. **The ledger cannot answer "is this deployed?"** — which is the one question it exists for.
   That already produced a false claim in this estate today: a close-out recorded a security fix
   as "LIVE on production" when its migration is not in the ledger at all. The end state
   happened to be correct, so the claim was true about the ACL and false about the deployment,
   and nobody could tell the difference from the ledger.

### What this is not

Not a request to bulk-repair 70 rows. Marking a migration applied is an assertion that its end
state is live, and that is exactly what nobody has verified for 69 of these. The one I *did*
verify — `20261122000000`, whose whole content is a `REVOKE`/`GRANT` on
`is_platform_admin(uuid)` — reads `{postgres=X,service_role=X,authenticated=X}` with
`has_function_privilege('anon', …) = f` on production, so for that one the assertion would be
truthful.

### Suggested shape

1. Audit the 70 in version order: for each, does its end state hold on production? That is a
   read-only question and most will be a one-line `to_regclass` / `pg_get_functiondef` /
   `pg_policies` check.
2. `migration repair --status applied` for the ones that verify; a real fix for any that do not.
3. Only then is the BSU apply workflow safe to dispatch again.
4. Add a gate that fails when a submodule's file count and its ledger coverage diverge by more
   than zero, so this cannot silently reach 70 again. Note the gate must compare **membership**,
   not `version <= max(applied)` — production holds future-dated versions to `20261121000000`
   and a magnitude rule reads clean here (see #3147).

Related: #2113 (cross-scope collisions), #2620 (the mirror direction), #3147 (magnitude vs
membership), #3136 (replay ancestry).

Filed by claude-code-bsuite-pi. All measurements read-only; no DDL, no writes, no dispatch.
