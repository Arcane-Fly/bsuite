# ADR-0007 — Stripe FDW Read Doctrine

> ## ⚠️ UNIMPLEMENTED — RETIREMENT RECOMMENDED (awaiting operator ratification)
>
> **Nothing in this ADR was ever built.** It has stood as an Accepted doctrine for
> three months while binding zero code — a standing false signal that tells every
> future lane a Stripe read path exists when none does.
>
> **Measured state** (live catalog, project `tuybltdrdefjblnplpqo`, 2026-08-17):
>
> | Prescribed artefact | Measured |
> |---|---|
> | `wrappers` extension | **absent** from `pg_extension` |
> | `stripe` schema | **absent** from `pg_namespace` |
> | `stripe_server` foreign server | `pg_foreign_server` is **empty** (zero rows) |
> | `stripe_wrapper` FDW | `pg_foreign_data_wrapper` is **empty** (zero rows) |
> | Migration `20260512161000_stripe_fdw_wrappers.sql` | **on disk, not in the applied ledger** |
>
> Positive controls: the same probes returned `pg_cron` and the `public` schema, and
> neighbouring same-day migrations `20260512151200` / `20260512220100` / `20260512220200`
> *are* present in `supabase_migrations.schema_migrations` — so the ledger probe finds
> what is there. `20260512161000` is genuinely absent, not missed.
>
> ### Recommendation: **RETIRE this ADR — do not build it.**
>
> 1. **There is no live billing.** The doctrine governs "new Stripe data-read
>    integration paths". None have been added since ratification, and none are
>    scheduled. It is optimising a path that carries no traffic.
> 2. **Its own compliance gate is unmet.** The gate requires the Vault secret
>    `stripe_api_key` to exist *before* the migration applies. Retiring costs nothing;
>    building means provisioning a live Stripe credential to serve zero readers.
> 3. **An unbuilt Accepted ADR is worse than no ADR.** It has already caused a false
>    signal once — it is cited as governing `BL-013` in the merged execution backlog,
>    an item that therefore reads as architecturally settled when its substrate does
>    not exist.
> 4. **Retirement is cheap to reverse.** If live billing arrives and Stripe read
>    volume justifies it, a fresh ADR can be written against the requirements as they
>    actually stand — which will likely differ from the 2026-05 assumptions anyway.
>
> **Operator decision required.** This banner records the measurement and the
> recommendation; it does **not** change `Status:` to Rejected, because retiring a
> ratified ADR is the operator's call, not a lane's. On ratification: set Status to
> `Rejected (retired unbuilt)`, delete the unapplied migration
> `supabase/migrations/20260512161000_stripe_fdw_wrappers.sql`, and drop the `BL-013`
> row from the merged execution backlog.
>
> The alternative — keeping it Accepted — is only defensible if live billing is
> imminent, in which case it needs an implementation ticket, not a doctrine document.

**Status:** Accepted (2026-05-12) — **unimplemented; retirement recommended, pending operator ratification**  
**Related:** `supabase/migrations/20260512161000_stripe_fdw_wrappers.sql` (on disk, never applied); `AUTH_CANONICAL.md`; `docs/20260501-merged-execution-backlog-v1.00W.md`

---

## Context

BSuite currently uses Stripe edge functions for webhook/write paths and some
read paths. Operator direction (2026-05-08T01:21Z) is to prefer Supabase
Wrappers Stripe FDW for **new Stripe data reads** instead of adding more
edge-function read proxies.

The migration baseline before this ADR did not include `wrappers` /
`stripe_fdw` installation in project `tuybltdrdefjblnplpqo`.

## Decision

For all **new Stripe data-read integration paths**, use Supabase Wrappers
Stripe FDW (`stripe.*` foreign tables) behind controlled SQL RPC wrappers.

For this ADR, **new** means any Stripe read path implemented or materially
refactored after 2026-05-12.

Scope split:

- **FDW path:** read-only data retrieval from Stripe objects
- **Edge-function path (kept):** webhook handlers and Stripe writes/mutations
  (portal sessions, refunds, etc.)

## Rationale

1. Removes extra network hops for read paths (`app -> edge fn -> Stripe`) and
   keeps reads in Postgres-native query flow.
2. Centralises Stripe read semantics in SQL objects that can be reused across
   apps.
3. Keeps secret handling in Vault and out of migration source control.
4. Aligns with operator preference while preserving write-path safety where
   edge functions remain the correct fit.

## Consequences

### Atomic replace-and-remove

1. Install baseline Stripe FDW stack through migration:
   `wrappers` extension, `stripe_wrapper`, `stripe_server`, `stripe` schema,
   and mapped foreign tables for customers/invoices/subscriptions/prices/products.
2. Restrict direct foreign-table access to `service_role`; expose reads via
   `SECURITY DEFINER` wrappers that assert `auth.jwt() ->> 'role' = 'service_role'`.
3. Document the doctrine in canonical auth architecture docs and backlog.

### Atomic removal disallows

- Adding new edge functions that only proxy Stripe read calls.
- Inlining Stripe API keys in SQL migration files.
- Exposing `stripe.*` foreign tables directly to `anon`/`authenticated`.

## What this unblocks

- BL-013 in the merged execution backlog (Stripe FDW migration workstream).
- Pilot migration of existing Stripe read chains to Postgres RPC wrappers.

## Compliance Gate

- Vault secret `stripe_api_key` must exist before applying migration.
- Any new Stripe read feature PR must cite this ADR and use FDW path unless a
  documented exception is approved by the operator (or superseded by a newer ADR).
