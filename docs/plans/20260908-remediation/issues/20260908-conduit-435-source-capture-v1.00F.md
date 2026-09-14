---
kind: record
authority: none
owner: bsuite
---

# chore(conduit): contract step — drop the deprecated, ignored p_ip_hash from r7_submit_public_application

https://github.com/GaryOcean428/conduit/issues/435

Snapshot updatedAt: 2026-08-24T03:29:05Z. Open at capture; re-read live.

Contract step of the Expand → Migrate → Contract change made in #434 (conduit#433).

## What is outstanding

`public.r7_submit_public_application` still carries a trailing

```sql
p_ip_hash text DEFAULT NULL
```

It is **never read**. The rate-limit bucket is derived inside the function by `public.r7_anon_request_bucket()` from the edge-set `cf-connecting-ip`, which a caller cannot choose. The security defect is closed; this is cleanup, not a live hole.

## Why it was left in

Deleting it in #434 would have changed the wire contract. Between the migration applying on the parent's `main` and conduit's own Vercel deploy, PostgREST could not have resolved the function for the deployed client (`PGRST202`) and **every public job application would have failed**. Retaining the parameter, defaulted and ignored, makes both call shapes resolve so the promotion is order-independent. `CLAUDE.md` mandates Expand → Migrate → Contract for schema changes; this is the contract step.

## Why it should not be left indefinitely

A parameter named `p_ip_hash` on an `anon`-granted `SECURITY DEFINER` function invites a future maintainer to wire it back up. That would silently restore the exact HIGH defect #433 was opened for: a throttle keyed on a value the caller supplies.

## Preconditions

1. #434 merged **and** the migration applied (`supabase_migrations.schema_migrations` contains `20260814030000`).
2. conduit deployed, so no live caller sends `p_ip_hash`. The browser submit path (`src/app/portal/careers/[jobId]/apply/submitApplication.ts`) already omits it.
3. Confirm no other caller exists estate-wide — it was conduit-only at the time of #434.

## The change

A new migration (request a version from the PI — the ledger is keyed on version alone and shared across all six submodules) that:

- `DROP FUNCTION` the current signature **by its identity arguments**, then `CREATE FUNCTION` without `p_ip_hash`. Note the trap found in #434: moving or removing a `text` parameter shifts every later parameter, so the type signature changes and `CREATE OR REPLACE` would leave a **second, still-callable overload** rather than replacing. Prove the old one is gone with `to_regprocedure()`.
- Re-issue `REVOKE EXECUTE … FROM PUBLIC` and the `anon` / `authenticated` / `service_role` grants — `DROP FUNCTION` discards them.
- Delete the deprecation comments in the function header and in `actions.ts`.

## Acceptance criteria

- `to_regprocedure()` on the with-`p_ip_hash` signature returns NULL.
- `anon` still holds EXECUTE on the new signature (the public apply form depends on it).
- A public application submitted end-to-end still succeeds, and a rotating-key probe still throttles.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: §9.1 output-equivalence
- **Equivalence target**: the #434 positive controls re-run against the contracted signature — rotating every caller-controlled value must still throttle at the 4th call, and the two oracle probes must stay byte-identical
- **Cross red-team**: claude-code verifies the `to_regprocedure()` and grant assertions before flip-to-done
- **Skills to load**: `supabase:supabase-postgres-best-practices`, `bsuite-rls-authz-red-team`, `test-verify-before-completion`
- **Self-report on divergence**: yes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
