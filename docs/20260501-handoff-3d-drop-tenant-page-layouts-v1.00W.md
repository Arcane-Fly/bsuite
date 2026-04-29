# HANDOFF-3d — author 20260502000000_drop_tenant_page_layouts.sql

**Document**: `20260501-handoff-3d-drop-tenant-page-layouts-v1.00W.md`
**Status**: W (Working)
**Owner**: Claude Code lead session (this session)
**Reason for lead-session ownership**: requires Supabase MCP introspection of live schema (FK dependents, realtime publication membership, RLS enumeration, row count) — Codebuff lacks this access
**Submodule**: `business-suite-unified` (target tree)
**Project ref**: `tuybltdrdefjblnplpqo`
**Depends on**: HANDOFF-3a Step 1 (snapshot branch must exist on `origin` before this handoff branches)

## Goal

Land two SQL files in BSU's `supabase/migrations/` as a single PR:

1. **`20260428085641_repair_tenant_page_layouts_contract.sql`** — preserve git history of the migration that was already applied to production out-of-band (verified via `mcp__claude_ai_Supabase__list_migrations` 2026-05-01). The file currently exists only on the local feature branch + snapshot; production has the migration record but git doesn't.
2. **`20260502000000_drop_tenant_page_layouts.sql`** — the canonical drop, filename pinned by ADR-0001 to prevent date drift. Acts as the atomic kill-switch.

Open a feature → development PR carrying both files. **Do not run the new drop migration in production yet** — that's a separate scheduled execution after user smoke tests.

## Production state at introspection (2026-05-01, lead session via Supabase MCP)

| Property | Value | Implication for migration |
|---|---|---|
| `table_exists` | `true` | Drop is needed (not a no-op) |
| `row_count` | `0` | No data loss; backup is symbolic per ADR-0001 doctrine |
| `fk_dependents` | `[]` | ADR-0001's "atomic drop" assumption holds — no schema cascade required |
| `realtime_publication` | member of `supabase_realtime` | Must `alter publication ... drop table` first |
| `rls_policies` (4) | `tenant_page_layouts_enterprise_admin_rw`, `tenant_page_layouts_platform_admin_rw`, `tenant_page_layouts_select`, `tenant_page_layouts_write_owner` | Enumerate explicit drops |
| `indexes` (8) | `*_pkey`, `unique_tenant_layout`, `*_tenant_id` (×2), `*_created_by`, `*_app_scope_idx`, `tenant_page_layouts_canonical_unique`, `*_app_scope_route_path_idx` | `DROP TABLE` cascades — no explicit drops needed |
| `platform_audit_log` table | **does not exist** | Replace audit insert with `RAISE NOTICE` |
| Predecessor migration `20260428085641_repair_tenant_page_layouts_contract` | applied to production migration history | Out-of-band application (`supabase db push` from local). File goes into this PR for git history preservation. |

## ADR alignment

- **ADR-0001** (page-builder ownership): this migration is the implementation trigger explicitly named in the ADR. CRM7's `custom_pages` becomes the canonical layout authoring surface; BSU's `tenant_page_layouts` is deleted atomically.
- **ADR-0002** (schema-builder ownership): zero FKs at table — drop does not orphan `tenant_field_definitions`.
- **ADR-0003** (consumer-renderer pattern): post-drop, each consumer app renders CRM7's `custom_pages` schema via app-local components.

## Process-issue note

The discovery that `20260428085641_repair_tenant_page_layouts_contract` was applied to production via local `supabase db push` (no PR review) is a § 2.10 doctrine smell. Suggest a follow-up handoff to add a guard rule to AGENTS.md: "Never `supabase db push` from a local checkout against `tuybltdrdefjblnplpqo` without a merged migration file in BSU's `main`." Track as out-of-batch work; not blocking 3d.

## ADR alignment

- **ADR-0001** (page-builder ownership): this migration is the implementation trigger explicitly named in the ADR. CRM7's `custom_pages` becomes the canonical layout authoring surface; BSU's `tenant_page_layouts` is deleted atomically.
- **ADR-0002** (schema-builder ownership): ensure the drop does not orphan any FK declared in `tenant_field_definitions`.
- **ADR-0003** (consumer-renderer pattern): post-drop, each consumer app renders CRM7's `custom_pages` schema via app-local components.

## Step-by-step (this session executes)

### Step 1 — Live schema introspection (DONE 2026-05-01)

Findings recorded in the "Production state at introspection" table above. Halt-conditions cleared:
- `fk_dependents = []` ✅ (ADR-0001 holds)
- `table_exists = true` ✅ (drop is needed, not a no-op)
- `row_count = 0` ✅ (data-loss-free)

### Step 2 — Branch from main

```bash
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified
git fetch origin master fix/auth-tier-free-flicker-20260428-snapshot
git checkout -b feat/bsu-drop-tenant-page-layouts-20260501 origin/main
```

### Step 3 — Cherry-pick the predecessor migration from snapshot for history preservation

```bash
git checkout origin/fix/auth-tier-free-flicker-20260428-snapshot -- \
  supabase/migrations/20260428085641_repair_tenant_page_layouts_contract.sql

git status --short  # expected: A  supabase/migrations/20260428085641_*.sql (or M if previously seen)
```

### Step 4 — Author the drop migration file

Write `supabase/migrations/20260502000000_drop_tenant_page_layouts.sql` with this exact content:

```sql
-- 20260502000000_drop_tenant_page_layouts.sql
--
-- ADR-0001 implementation: atomic drop of public.tenant_page_layouts.
-- Page-builder responsibility moves to CRM7's custom_pages.
--
-- Pre-flight introspection (Claude Code lead session, 2026-05-01,
-- via Supabase MCP against tuybltdrdefjblnplpqo):
--   row_count             = 0
--   fk_dependents         = none
--   realtime_publication  = member of supabase_realtime
--   rls_policies          = 4 (enumerated below)
--   platform_audit_log    = does not exist (audit via RAISE NOTICE)
--   predecessor_migration = 20260428085641_repair_tenant_page_layouts_contract
--                           (recorded in production migration history;
--                            file preserved by this PR — see step 3
--                            of HANDOFF-3d)
--
-- Reversibility: forward-only. Empty table at drop time means no data loss;
-- backup table is created for symmetry with ADR-0001 doctrine + 90-day audit.

begin;

-- 1. Backup (zero rows at introspection; ADR-0001 doctrine still mandates artefact)
create table if not exists public.tenant_page_layouts_backup_20260502 as
  select * from public.tenant_page_layouts;

comment on table public.tenant_page_layouts_backup_20260502 is
  'Pre-drop snapshot per ADR-0001 atomic drop (2026-05-02, 0 rows at drop). Retain until 2026-08-02 (90 days), then DROP TABLE.';

-- 2. Remove from realtime publication
alter publication supabase_realtime drop table if exists public.tenant_page_layouts;

-- 3. Drop RLS policies explicitly (DROP TABLE would cascade; explicit drops
--    keep migration logs unambiguous)
drop policy if exists tenant_page_layouts_enterprise_admin_rw on public.tenant_page_layouts;
drop policy if exists tenant_page_layouts_platform_admin_rw   on public.tenant_page_layouts;
drop policy if exists tenant_page_layouts_select              on public.tenant_page_layouts;
drop policy if exists tenant_page_layouts_write_owner         on public.tenant_page_layouts;

-- 4. Drop the table (8 indexes cascade automatically)
drop table public.tenant_page_layouts;

-- 5. Audit trace via RAISE NOTICE (platform_audit_log absent on
--    tuybltdrdefjblnplpqo as of 2026-05-01)
do $$
begin
  raise notice 'ADR-0001 atomic drop: public.tenant_page_layouts DROPPED 2026-05-02. backup=public.tenant_page_layouts_backup_20260502 (0 rows). predecessor=20260428085641_repair_tenant_page_layouts_contract.';
end $$;

commit;
```

**No further refinement needed** — all parameters resolved against live introspection.

### Step 5 — Local verify (no live execution)

```bash
# Lint both SQL files
ls -la supabase/migrations/20260428085641_repair_tenant_page_layouts_contract.sql
ls -la supabase/migrations/20260502000000_drop_tenant_page_layouts.sql

# Verify the new migration text against local introspection findings
grep -c "platform_audit_log" supabase/migrations/20260502000000_drop_tenant_page_layouts.sql
# Expected: 0 (we replaced with RAISE NOTICE)

grep -c "tenant_page_layouts_backup_20260502" supabase/migrations/20260502000000_drop_tenant_page_layouts.sql
# Expected: ≥ 2 (CREATE + COMMENT references it)
```

**Do not run `supabase db push`** in this handoff. Production drop is gated on user smoke test of HANDOFFs 1/2/3a/3b first AND explicit user authorization.

### Step 6 — Commit + PR

```bash
git add \
  supabase/migrations/20260428085641_repair_tenant_page_layouts_contract.sql \
  supabase/migrations/20260502000000_drop_tenant_page_layouts.sql

git commit -m "$(cat <<'EOF'
feat(bsu): drop tenant_page_layouts atomically (ADR-0001 implementation)

Lands two migration files in one PR:

1. 20260428085641_repair_tenant_page_layouts_contract.sql
   — preservation of an existing production migration record. This file
   was applied to tuybltdrdefjblnplpqo via out-of-band `supabase db push`
   from a local checkout (verified via Supabase MCP list_migrations
   2026-05-01). The file currently exists only on snapshot branch
   fix/auth-tier-free-flicker-20260428-snapshot. Without this PR, git
   history would diverge from production migration history permanently.

2. 20260502000000_drop_tenant_page_layouts.sql
   — canonical drop, filename pinned by ADR-0001 to prevent date-drift
   between ADR authoring and migration landing. Behaviors:
     - Pre-drop backup to public.tenant_page_layouts_backup_20260502
       (90-day retention; 0 rows at drop time)
     - Remove from supabase_realtime publication
     - Drop 4 attached RLS policies explicitly
     - DROP TABLE (8 indexes cascade)
     - Audit trace via RAISE NOTICE (platform_audit_log not present)

Pre-flight introspection via Supabase MCP (Claude Code lead session,
2026-05-01) confirmed:
- Row count: 0
- FK dependents: none (ADR-0001 holds)
- Realtime publication: supabase_realtime member
- RLS policies: tenant_page_layouts_enterprise_admin_rw,
  tenant_page_layouts_platform_admin_rw, tenant_page_layouts_select,
  tenant_page_layouts_write_owner
- Indexes: 8 (drop-table cascade handles all)
- platform_audit_log: absent

Forward-only migration. Recovery requires restoring from
tenant_page_layouts_backup_20260502 + replaying phase5 create migration.

Process note: the out-of-band application of the repair migration is a
doctrine smell flagged in HANDOFF-3d § "Process-issue note". Follow-up
work should add an AGENTS.md guard against `supabase db push` from
local checkouts.

Backlog reference: docs/20260501-merged-execution-backlog-v1.00W.md —
P0-15 ratification rollup; ADR-0001 implementation trigger.

🤖 Generated with [Claude Code](https://claude.com/claude-code) — HANDOFF-3d
EOF
)"

git push -u origin feat/bsu-drop-tenant-page-layouts-20260501

gh pr create \
  --base development \
  --head feat/bsu-drop-tenant-page-layouts-20260501 \
  --title "feat(bsu): drop tenant_page_layouts atomically (ADR-0001)" \
  --body "$(cat <<'EOF'
## Summary

Implements ADR-0001 by landing the canonical drop migration alongside
the predecessor repair migration (preserved for git↔production history
alignment).

## Files (2)

- `supabase/migrations/20260428085641_repair_tenant_page_layouts_contract.sql` — git history preservation; file already applied to production via out-of-band `supabase db push`
- `supabase/migrations/20260502000000_drop_tenant_page_layouts.sql` — canonical atomic drop per ADR-0001

## Pre-flight introspection (2026-05-01, Supabase MCP)

| Property | Value |
|---|---|
| `table_exists` | true |
| `row_count` | 0 |
| `fk_dependents` | none |
| `realtime_publication` | member |
| `rls_policies` | 4 (enumerated in migration) |
| `platform_audit_log` | absent |

## ADR compliance

- **ADR-0001**: implements the named drop migration
- **ADR-0002**: zero FKs at table — no schema-builder orphan risk
- **ADR-0003**: post-drop, consumer apps render CRM7's `custom_pages` via app-local components

## Verification

- [x] Pre-flight introspection complete
- [x] Migration SQL matches live policy/index names verbatim
- [x] No `platform_audit_log` reference (replaced with RAISE NOTICE)
- [ ] CI green (lint + DOM-layout-invariants only — no DB tests in CI)
- [ ] User explicit authorization to run drop in production

## Stop-short gate

**Do not merge AND do not run the drop migration in production** until:
1. HANDOFFs 1/2/3a/3b previews have been smoke-tested by the user
2. User explicitly authorizes the drop ("run the drop migration")

Lead session executes the production drop via Supabase MCP `apply_migration`
after authorization, with verification:
`select count(*) from public.tenant_page_layouts_backup_20260502` == 0.

## Process note

The repair migration's presence in production migration history without a
prior PR is a § 2.10 doctrine smell. Track follow-up: add AGENTS.md guard
against `supabase db push` from local checkouts.

🤖 Generated with [Claude Code](https://claude.com/claude-code) — HANDOFF-3d
EOF
)"
```

### Step 7 — Stop short of execution

The migration file lives in the repo and the PR is ready to merge — but
**do not actually run the drop against `tuybltdrdefjblnplpqo`** until:

1. ✅ User smoke tests HANDOFFs 1/2/3a/3b previews
2. ✅ User explicitly authorizes the drop ("run the drop migration")
3. ✅ Backup verification: `select count(*) from public.tenant_page_layouts_backup_20260502` returns the same count as the pre-drop introspection

Lead session executes the run via Supabase MCP `apply_migration` after authorization.

## Stop conditions

| Condition | Action |
|---|---|
| Step 1 finds FK dependents | Halt — ADR-0001 assumes none. Escalate to user — may need ADR amendment |
| Step 1 finds the table doesn't exist on `tuybltdrdefjblnplpqo` | Migration is a no-op or already applied — confirm with `supabase migration list` |
| Step 1 row count is unexpectedly large (>1000) | Confirm with user before continuing — may indicate accidental population |
| `platform_audit_log` does not exist | Drop the audit insert from migration text, document in commit |

## Done definition (this session)

- [ ] Live schema introspection complete — findings filled into this doc + commit message
- [ ] Migration file written to `business-suite-unified/supabase/migrations/20260502000000_drop_tenant_page_layouts.sql`
- [ ] Feature branch + PR open into BSU `development`
- [ ] PR is ready-to-merge but **not merged**
- [ ] Production drop **not yet executed**

## Future un-blocks

After this PR merges + the drop runs in production:
- HANDOFF-3c can begin (Developer/* rework re-targeted to CRM7 `custom_pages`)
- ADR-0001 status moves from "ratified" to "implemented" — update `docs/adr/README.md` accordingly
