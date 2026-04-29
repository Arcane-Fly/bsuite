# Schema Builder migrations (reference)

This directory contains migrations that `@bsuite/schema-builder` depends on.
They are **reference copies** — the Supabase-tracked canonical location is
`business-suite-unified/supabase/migrations/` (BSU owns the shared Supabase
project per `AGENTS.md`).

## Application path (ops)

1. Copy the migration file into `business-suite-unified/supabase/migrations/`
   **without renaming** (keep the `20260503000000_` prefix so Supabase CLI
   picks it up in the correct order).
2. Open a BSU PR titled `chore(bsu): apply schema-builder phase 1a migration`.
3. Run `supabase db push` against the dev project; verify via
   `supabase db diff` that the three new columns + constraint + indexes are
   present.
4. Merge the BSU PR; this promotes the migration into the canonical tracking.
5. Confirm Realtime publication includes `tenant_entity_relations` (the
   migration re-asserts this idempotently).

## Rollback path

Apply `20260503000001_revert_field_level_relations.sql` via the same BSU-owned
flow. Safe because target columns are all nullable — legacy entity-level rows
are unaffected.

## Phase 1b dependency

Phase 1b column-level handles (drag from `orders.customer_id` to
`customers.id`) require `source_field_id` + `target_field_id` + `on_delete` +
`on_update` to exist. Phase 1b will not start until the `20260503000000`
migration is live in the dev project.
