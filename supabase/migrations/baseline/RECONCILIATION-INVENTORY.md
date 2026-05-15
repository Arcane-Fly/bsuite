# Supabase Grant Audit — Reconciliation Inventory

**Shared project:** `tuybltdrdefjblnplpqo`  
**Audit performed:** 2026-05-13T12:30Z  
**Auditor:** claude-code (operator-supervised; prompted by Supabase Data API change email)  
**Doctrine trigger:** bsuite#964 — Supabase Data API explicit-grant requirement (Oct 30 2026 enforcement)

---

## Audit scope

All tables in the `public` schema × {`anon`, `authenticated`, `service_role`} roles.  
Checked via `information_schema.role_table_grants`.

### Audit query

```sql
WITH api_roles AS (SELECT unnest(ARRAY['anon', 'authenticated', 'service_role']) AS rolname),
     public_tables AS (
       SELECT c.relname AS tablename, c.oid
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'
     )
SELECT pt.tablename, ar.rolname AS role,
       COALESCE(string_agg(privilege_type, ',' ORDER BY privilege_type), 'NONE') AS privileges
FROM public_tables pt
CROSS JOIN api_roles ar
LEFT JOIN information_schema.role_table_grants g
  ON g.table_schema = 'public' AND g.table_name = pt.tablename AND g.grantee = ar.rolname
GROUP BY pt.tablename, ar.rolname
HAVING COALESCE(string_agg(privilege_type, ','), 'NONE') = 'NONE'
ORDER BY pt.tablename, ar.rolname;
```

---

## Findings

**Verdict: production state is COMPLIANT for Oct 30 2026 enforcement.**

All client-facing tables already have explicit grants (legacy default behaviour auto-granted them at table creation). The 2 service-role-only tables are intentionally restricted.

### Tables with restricted grants (intentional)

| Table | Missing roles | Reason |
|---|---|---|
| `mapd_webhook_queue` | `anon`, `authenticated` | Internal webhook receiver — service_role only by design; never exposed to clients |
| `mapd_webhook_subscriptions` | `anon`, `authenticated` | Internal webhook config — service_role only by design; never exposed to clients |

### All other public-schema tables

Explicit `SELECT` (anon), `SELECT/INSERT/UPDATE/DELETE` (authenticated), and `SELECT/INSERT/UPDATE/DELETE` (service_role) grants confirmed present.

---

## Going-forward requirement

Every new `CREATE TABLE public.<x>` MUST include explicit GRANT statements in the same migration file. See `supabase/migrations/README.md` for the canonical template.

CI guard: `.github/workflows/explicit-grant-lint.yml` (added PR #965, script at `scripts/explicit-grant-lint.sh`) fails any PR that adds `CREATE TABLE public.<x>` without a matching `GRANT` in the same file.

---

## Re-audit instructions

Run the audit query above against `tuybltdrdefjblnplpqo` via Supabase MCP `execute_sql` or the SQL Editor. Any rows returned indicate tables missing grants for that role.

**Re-audit triggers:**
- After any migration that adds a new table without an explicit grant section
- Before the Oct 30 2026 enforcement date
- After any Supabase project upgrade that could reset grant state

---

## Related

- bsuite#964 — tracking issue (explicit-grant doctrine + CI guard)
- `supabase/migrations/README.md` — grant template, CI guard docs
- `.github/workflows/explicit-grant-lint.yml` — CI enforcement
- `scripts/explicit-grant-lint.sh` — lint script
- crm7#770 — Phase 2 reconciliation inventory (crm7 supabase migrations)
