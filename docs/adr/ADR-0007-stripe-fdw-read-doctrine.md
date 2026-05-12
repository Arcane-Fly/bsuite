# ADR-0007 — Stripe FDW Read Doctrine

**Status:** Accepted (2026-05-12)  
**Related:** `supabase/migrations/20260512161000_stripe_fdw_wrappers.sql`; `AUTH_CANONICAL.md`; `docs/20260501-merged-execution-backlog-v1.00W.md`

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
