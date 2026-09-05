# `@bsuite/schema-builder` — migrations (DEV-FIXTURE COPIES)

> ## ⚠️  HARD RULE — READ BEFORE EDITING
>
> **These SQL files are DEV-FIXTURE COPIES. They are NOT the canonical source of truth.**
>
> **Canonical location:** [`business-suite-unified/supabase/migrations/`](https://github.com/GaryOcean428/bsuite/tree/development/business-suite-unified/supabase/migrations) (absolute URL — relative links break once this package is published to npm)
>
> **Never edit these files directly.** Edit the BSU copy, land it via a BSU PR, then copy the final file verbatim back into this directory. The copies in this folder exist ONLY so that:
>
> 1. Package contributors can spin up a local Supabase via `supabase start` against the `packages/schema-builder/` directory and have a self-contained fixture set for running Vitest against real SQL.
> 2. The package's own integration tests (under `src/__tests__/`) can reference a known-good schema shape without depending on the parent monorepo layout.
>
> **If you edit a file here without also updating BSU, you will silently diverge from production.** Enforcement is now **automated** via the `schema-builder-migration-parity` GitHub Action (`.github/workflows/schema-builder-migration-parity.yml` in the parent bsuite repo). Every PR that touches either migrations directory runs three checks:
>
> 1. **File-set parity A → B** — every `packages/schema-builder/supabase/migrations/*.sql` has a BSU canonical twin.
> 2. **File-set parity B → A** — every BSU migration that opts into parity by including the `-- @sync-boundary-below` marker has a dev-fixture twin.
> 3. **Content parity** — the SQL body below the `-- @sync-boundary-below` marker is byte-identical across both copies.
>
> All three must pass before merge. The only legal difference between a package dev-fixture and its BSU canonical twin is the annotation header above the sync-boundary marker. Migrations in BSU that do NOT contain the marker are ignored by this workflow — that is intentional, because some pre-existing BSU migrations legitimately touch Schema-Builder tables for broader concerns (enabling Realtime, hardening RLS, adding FK indexes) without being Schema-Builder-owned.

---

## Why this split exists

Before 2026-05-01 the three migrations below lived only in this package. That meant:

- **Production deploys of BSU had no way to pick them up** — Supabase CI in BSU targets `business-suite-unified/supabase/migrations/`, not arbitrary paths inside `packages/*`.
- **New consumer apps could not bootstrap standalone** — crm7 / conduit / R80.3 don't own these migrations (BSU is the auth + shared-schema hub; see `AGENTS.md` §Architecture → "`client_id` RLS scoping" for the rationale).
- **Migration timestamps could collide invisibly** because the package files were never linted against BSU's sequence.

Moving the canonical copies into BSU fixed all three. The package keeps dev-fixture copies so `pnpm --filter @bsuite/schema-builder test` can still spin up a Supabase fixture without mounting the entire monorepo.

---

## Files in this directory

| File | BSU canonical path | Purpose |
|------|--------------------|---------|
| `20260503000000_add_field_level_relations.sql` | `business-suite-unified/supabase/migrations/20260503000000_add_field_level_relations.sql` | Adds `source_field_id` / `target_field_id` + `on_delete` / `on_update` columns to `tenant_entity_relations`, enforces paired-NULL integrity guard, creates performance indexes, confirms Realtime. Phase 1a prereq per `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md` §2.6. |
| `20260503000001_revert_field_level_relations.sql` | `business-suite-unified/supabase/migrations/20260503000001_revert_field_level_relations.sql` | Rollback twin for the above. Safe because all target columns were nullable. |
| `20260504000000_schema_reflection_rpc.sql` | `business-suite-unified/supabase/migrations/20260504000000_schema_reflection_rpc.sql` | `reflect_entity_schema(text, text)` RPC — live Postgres introspection used by `useSchemaReflection()`. Documented security posture: `SECURITY DEFINER` + `GRANT EXECUTE ... TO authenticated`, gated at the application layer by route guards on `/settings/schema-builder`. |

---

## Sync workflow (for maintainers)

When you genuinely need to add, edit, or retire a migration that the Schema Builder depends on:

```bash
# 1. Edit the CANONICAL copy in BSU
$EDITOR business-suite-unified/supabase/migrations/<file>.sql

# 2. Land the BSU change via a normal PR (review, CI, merge to development)
cd business-suite-unified
git checkout -b feat/schema-migration-<slug>
git add supabase/migrations/<file>.sql
git commit -m "feat(bsu): <migration description>"
gh pr create --base development --title "feat(bsu): <migration description>" --fill

# 3. AFTER the BSU PR merges — copy the final file verbatim into this directory,
#    THEN RESTORE THIS COPY'S OWN HEADER. A bare `cp` overwrites everything,
#    including the annotation header above `-- @sync-boundary-below` — the ONE
#    part of the file that is SUPPOSED to differ (DEV-FIXTURE COPY banner, and
#    a `-- rehearsal: <marker>` line if this migration is a byte-identical
#    twin that sorts behind another scope's copy in the whole-estate replay —
#    see supabase-migration-rehearsal.yml). The parity gate will not catch a
#    dropped header: Check 3 only compares content BELOW the boundary, and a
#    full-file copy trivially matches itself there. This exact mistake shipped
#    on 2026-09-04 (bsuite commit 2137caec, caught and fixed as FOLLOW 87) by
#    following this step literally, without the manual restore that follows.
cp business-suite-unified/supabase/migrations/<file>.sql \
   packages/schema-builder/supabase/migrations/<file>.sql
git diff packages/schema-builder/supabase/migrations/<file>.sql  # re-add the header this copy had before, above the marker

# 4. Bump @bsuite/schema-builder version, update CHANGELOG, land via a package PR
cd packages/schema-builder
$EDITOR package.json CHANGELOG.md
git commit -am "chore(schema-builder): sync migration copy after BSU <file>"
```

### What NOT to do

- ❌ **Do not** edit a file in this directory and not in BSU. Those changes will never hit production. (Parity CI will block the PR.)
- ❌ **Do not** add a new migration only here. BSU must own it canonically. (Parity CI will block the PR.)
- ❌ **Do not** rename a file here without renaming it in BSU. Supabase applies by filename, not by content hash. (Parity CI will block the PR.)
- ❌ **Do not** assume a migration applied in the package's Vitest fixture means it applied in BSU staging or prod. Always verify via `supabase migration list --project-ref tuybltdrdefjblnplpqo`.
- ❌ **Do not** remove the `-- @sync-boundary-below` marker from any SQL file — the parity CI uses it to locate the body that must match. Without the marker, the check fails closed.
- ❌ **Do not** `cp` the BSU canonical file over this one without then restoring this copy's own header above the marker. The parity gate cannot see this mistake — it only diffs content below the boundary, which a full-file copy trivially matches. Losing a `-- rehearsal: <marker>` line this way is silent until the migration-rehearsal gate happens to re-examine the file on a later PR.

### Known gaps

- **No pre-commit hook locally.** The parity check runs in CI only. If you want fast local feedback, add a `.husky/pre-commit` or `lefthook.yml` hook that runs the same diff. This is tracked in `docs/OUTSTANDING.md`.
- **`p_schema` whitelist in `reflect_entity_schema`** is currently hard-coded to `public`. Extending it is a two-file edit (BSU canonical first, then this dev-fixture). See `CHANGELOG.md` v0.5.1 for context.

---

## Related docs

- `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md` §2.6 — migration plan
- `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md` §3.9 — Zod contract that shapes the columns these migrations add
- `AGENTS.md` §Database — shared Supabase project `tuybltdrdefjblnplpqo`
- `packages/schema-builder/CHANGELOG.md` — version history including the 2026-05-01 migration-consolidation (v0.5.1)
