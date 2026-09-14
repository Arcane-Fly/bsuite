# fix(db): 4 above-floor cross-submodule migration version collisions — losing side invisible to the shared ledger (env-reproducibility risk)

https://github.com/GaryOcean428/bsuite/issues/1682

Snapshot updatedAt: 2026-08-26T15:28:26Z. Open at capture; re-read live.

Found by the 2026-07-28 gap remediation (`docs/plans/20260728-gap-remediation-plan-v1.00W.md`).

Four **above-floor** migration versions are used by two different submodules for completely different
migrations. All submodules share ONE Supabase backend and therefore ONE
`supabase_migrations.schema_migrations` ledger, which is keyed on `version`:

| Version | Scope A | Scope B | Ledger row recorded |
|---|---|---|---|
| `20260701090000` | crm7 `field_officers_tenant_rls` | BSU `delete_organization_rpc` | `field_officers_tenant_rls` |
| `20260702000000` | BSU `fix_save_tenant_navigation_auth_and_stale_id` | R80.3 `r80_invoice_run_tenant_policy` | `fix_save_tenant_navigation_auth_and_stale_id` |
| `20260722120000` | crm7 `apprentice_placements_add_suspended_status` | BSU `r80_to_r8_canonical_slug` | `apprentice_placements_add_suspended_status` |
| `20260726090000` | crm7 `email_message_links` | R80.3 `funding_offsets` | `email_message_links` |

## Severity: P1, not P0 — live impact was checked and there is none

I verified against the live database that **both sides of every collision actually took effect**:
`delete_organization` RPC exists, `field_officers` has 2 policies, `save_tenant_navigation` exists,
`r80_invoice_runs` has 4 policies, and both `email_message_links` and `funding_offsets` exist. Nothing
is missing from production and no data is wrong.

## What IS broken: environment reproducibility

For each pair the ledger holds only ONE row, so the losing migration is invisible to any process that
keys on version. A future applier run — or a fresh environment built from migration files (DR rebuild,
pgTAP baseline-replay, a new branch DB) — will treat that version as already applied and **skip the
losing side**, producing a schema that silently diverges from production. Production is fine today;
a rebuilt environment would not be.

## Acceptance criteria
- Migration version stamps are unique across ALL submodules, not just within one (the applier keys on version globally).
- A CI check fails when a new migration's version collides with an existing version in any other scope. (The Class C detector added in the new `prod-migration-history-audit.yml` covers detection — this issue is about prevention plus remediating the existing four.)
- A documented remediation for the four existing pairs that does NOT rewrite already-applied history.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)
- **Validation loop**: §9.1 output-equivalence
- **Equivalence target**: a fresh replay from migration files produces the same schema as production for all four collided versions
- **Cross red-team**: claude-code
- **Skills to load**: `supabase`, `supabase-postgres-best-practices`, `verification-before-completion`
- **Self-report on divergence**: yes
