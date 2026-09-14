# Supabase Preview check has never been green on main — 'Remote migration versions not found in local migrations directory'

https://github.com/GaryOcean428/bsuite/issues/2620

Snapshot updatedAt: 2026-08-31T02:49:44Z. Open at capture; re-read live.

## The state

`Supabase Preview` is a check posted by the **Supabase GitHub App**, not by any workflow in this repository. On the last eight commits to `main` it is:

```
5b716afd failure   12e88678 failure   e467239f failure   656c1c72 skipped
ecf7f849 skipped   9452b296 skipped   4e6f2b91 skipped   20b86305 failure
```

**Never once green.** Its summary:

> Remote migration versions not found in local migrations directory.

## Why

The parent repository has no `supabase/migrations` directory — migrations live in the submodules (`crm7/supabase/migrations`, `business-suite-unified/supabase/migrations`). The Supabase integration is comparing the linked project's applied migration history against a directory that does not exist here, so it reports every remote version as unaccounted for.

## Why it matters even though it is not required

It is not a required check and does not block merges. But a check that has been red or skipped for its entire life is one nobody reads, and the next *genuine* Supabase problem arrives looking exactly like the standing noise. This estate has hit that failure mode three times in the last week alone (`pending-encryption-watch` red 11/11 since birth; `advance-submodule-pointers` red for doing the right thing; `check-phantom-migrations` green over an empty tree).

## Options — this is a Supabase dashboard setting, not a code change

1. **Disconnect the GitHub integration from the parent repo** and connect it to the submodules that actually hold migrations. The parent never had a migrations directory and never will; the applier is `supabase-migrate.yml`, which is diff-driven across submodules.
2. **Point the integration at a migrations path** if the integration supports one, though the parent has nothing to point it at.
3. **Accept it and record the acceptance** somewhere the next reader will find, so it stops reading as an unattended failure.

I have not changed it because it is configured in the Supabase dashboard for project `tuybltdrdefjblnplpqo`, outside this repository, and disconnecting an integration on the production project is not a change to make unattended.
