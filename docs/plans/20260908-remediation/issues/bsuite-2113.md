# 16 cross-scope migration version collisions — up to 13 migrations silently never applied

https://github.com/GaryOcean428/bsuite/issues/2113

Snapshot updatedAt: 2026-08-24T03:26:59Z. Open at capture; re-read live.

## Sixteen cross-scope migration version collisions — up to thirteen migrations silently never applied

`supabase_migrations.schema_migrations` is **shared across all eight scopes** and keyed on the **14-digit version alone** — not the filename, not the path, not the repo. When two scopes claim the same version, the first to apply is recorded and the second is **skipped permanently, silently, on a green run.**

Enumerated 2026-08-18 across every submodule's `origin/development` plus the parent: **800 versions checked, 16 cross-scope collisions.**

### Thirteen pair genuinely DIFFERENT migrations

| Version | Scope A | Scope B |
|---|---|---|
| 20260228000000 | crm7 `ensure_apprentice_gto_fields` | BSU `add_billing_tables` |
| 20260228000001 | crm7 `gto_foundation_tables` | braden `create_tasks_table` |
| 20260306000001 | crm7 `ots_parity_schema` | BSU `create_platform_admin_tables` |
| 20260306000003 | crm7 `timesheet_comm_templates` | BSU `wave5_wave10_db_gaps` |
| 20260317000000 | crm7 `add_tenant_branding` | BSU `create_app_notifications_table` |
| 20260422000000 | crm7 `create_apprentice_handoff_tokens` | BSU `create_platform_api_keys_and_webhooks` |
| 20260423120000 | crm7 `ws8_revoke_anon_execute_on_gto_helpers` | BSU `phase12_tenant_hierarchy_hardening` |
| 20260423130000 | crm7 `ws8_arc_anon_public_read` | BSU `phase12_hierarchy_rls` |
| 20260423150000 | crm7 `ws4_timesheet_state_machine` | BSU `phase6_imap_password_vault` |
| 20260423160000 | crm7 `ws5_report_system` | BSU `phase6_11_seed_enterprise_subscriptions` |
| 20260504010000 | BSU `branding_search_path_no_pgtemp` | conduit `fix_r7_current_tenant_id_search_path` **and** braden `fix_security_definer_search_path` (three scopes) |
| 20260506000000 | crm7 `backfill_app_metadata_tenant_id` | BSU `rename_physical_column_rpc` |
| 20260519100000 | crm7 `gto_standards_clauses` | BSU `branding_walk_parent_tenant_chain` |

Three more are the *same* file duplicated across scopes (`20260707000020`, `20260707000021`, `20260728120000`) — less harmful, but they mean a copy is inert.

### Proven harm — this is not theoretical

```
20260228000000  BSU  add_billing_tables         -> 2 billing tables EXIST
20260228000000  crm7 ensure_apprentice_gto_fields -> 0 gto columns on apprentices
```

Business Suite's side applied. **crm7's side never did, and its columns do not exist.** The version reads as applied in the ledger, so nothing has ever flagged it.

`20260504010000` is worse in kind: **not recorded at all** (`count = 0`), yet three different scopes ship a file at that version — three separate `search_path` hardening fixes, in Business Suite, conduit and braden. Those are security fixes.

### Why this went unseen

The collision is invisible from inside any single repo — each has exactly one file at the version, and each repo's own duplicate lint is clean. Only the parent sees all eight scopes at once, and only once its submodule pointers advance far enough to contain both files. It surfaced on the pointer-bump PR (bsuite#2103).

### What is needed

1. For each of the 13, determine which side applied and whether the other's objects exist.
2. Re-issue the skipped side under a **free** version (verified across all eight scopes, every submodule `development`, and `schema_migrations` live), as a forward migration — never by editing the historical file, which is frozen once applied.
3. Keep the cross-scope collision lint running at the parent on every pointer bump. It is what caught this.

Two instances were already fixed today by renumbering: crm7#1804 (`field_officer_caseload_rls`, an RLS policy that would never have applied) and crm7#1821 (`gto_charge_out_rate_summary`, confirmed absent from the live database).

Recorded per the operator's standing instruction that findings of this kind are filed and addressed as a matter of course.
