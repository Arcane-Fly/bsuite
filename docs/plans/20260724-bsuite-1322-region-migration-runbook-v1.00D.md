# bsuite#1322 — Supabase Region Migration Runbook (East US → ap-southeast-2 Sydney)

> **Naming:** `20260724-bsuite-1322-region-migration-runbook-v1.00D.md` · Status **D** (Draft — awaiting operator go/no-go) · Companion to `20260724-bsuite-1322-supabase-region-migration-scope-v1.00D.md`.
> **Method (research-confirmed, deleg_b9be9706):** CLI `pg_dump`/`pg_restore` dump-and-swap into a new ap-southeast-2 project. **No managed region-move exists.** ap-southeast-2 IS available. Auth users/identities/passwords migrate in the dump (no re-auth). Cutover ≈ 5 min with pre-staged env vars.

## Why dump-and-swap (not the managed clone, not replication)

- Managed "Restore to a New Project" (beta) copies everything incl. the Vault root key — **but is same-region only** (data-residency by design). Can't reach Sydney.
- Supabase→Supabase logical replication isn't a supported migration path; read replicas are read-only and can't promote cross-region.
- At ~30 MB core / 205 MB total, dump+restore is <2 min — replication complexity isn't warranted.

## ⚠️ The one delicate part: Vault root key

`supabase_vault` is **in use — 15 secrets** (Xero tokens, email OAuth tokens encrypted via Vault). The manual CLI path does **NOT** carry the encryption root key. **Without exporting the root key from the old project and importing it into the new one, those 15 secrets are permanently unreadable.** This is the single highest-risk step and must be done carefully (export root key → import to new project → verify a Vault-decrypted read succeeds BEFORE cutover).

## Migration surface (verified 2026-07-24)

| Layer | Volume / Count | Path |
|---|---|---|
| Core business Postgres | ~30 MB (exclude 175 MB infra noise) | pg_dump/pg_restore |
| auth.users + identities + passwords | 11 | **migrates in dump** ✅ |
| RLS / roles / policies / grants | extensive | migrates in roles.sql + schema.sql ✅ |
| **Vault root key + 15 secrets** | 15 secrets | **MANUAL export/import — delicate** ⚠️ |
| Storage objects | ~190 MB, 449 objects, 5 buckets (2 public) | rclone / Storage-API copy (NOT in dump) ❌ |
| Edge functions | 55 (crm7 22, conduit 4, BSU 27, +_shared) | `supabase functions deploy` each ❌ |
| pg_cron jobs | 10 active | re-register via migrations ❌ |
| Extensions | hypopg, index_advisor, pg_cron, pg_net, pg_stat_statements, pg_trgm, pgcrypto, supabase_vault, uuid-ossp | re-enable non-default on new project ⚠️ |
| Realtime publications | conduit cursors + live queries | re-enable via Dashboard ⚠️ |
| OAuth 2.1 server (BSU hub) | oauth_clients, JWKS, consent | re-register clients; new JWKS endpoint + signing keys ⚠️ |
| **Project ref + API keys** | `tuybltdrdefjblnplpqo` → new ref | **env vars across all 6 apps** ❌ (highest-effort) |

## Pre-flight checklist (do BEFORE anything)

1. **Full backup:** Dashboard → Backups (confirm a current one exists) AND a manual `supabase db dump` of the public schema + a Storage objects export. Verify the dump restores into a throwaway project first.
2. **Audit infra-noise:** decide truncate-vs-exclude for `job_run_details` (93 MB), `_http_response` (55 MB), `error_log`, `audit_log_entries` — recommend EXCLUDE from dump (they regenerate).
3. **Inventory auth/storage schema customizations:** `supabase db diff --linked --schema auth,storage > auth-storage-changes.sql` (none found in migration grep, but verify live).
4. **Confirm ap-southeast-2 selectable** on the org's plan (it is, per Regions page).

## Execution plan (parallel-run, verify-then-swap)

**Phase 0 — New project (no prod impact):**
1. Create new project in **ap-southeast-2** (note the new ref + new keys).
2. Enable non-default extensions (pg_cron, pg_net, pgcrypto, supabase_vault, pg_trgm, index_advisor, hypopg).
3. Re-enable Realtime publications on subscribed tables.

**Phase 1 — Data restore (no prod impact):**
4. Dump old project: `roles.sql`, `schema.sql`, `data.sql` (`--use-copy --data-only`, excluding infra-noise tables via `-x`).
5. Restore into new project: `psql --single-transaction --variable ON_ERROR_STOP=1 --file roles.sql --file schema.sql --command 'SET session_replication_role = replica' --file data.sql --dbname [NEW]`.
6. **Export Vault root key from old → import into new** → verify `SELECT decrypted_secret FROM vault.decrypted_secrets LIMIT 1` returns plaintext (NOT garbage).
7. Copy Storage objects (rclone between the two projects' S3, or re-upload via the Storage API) — all 449 objects across 5 buckets; verify a private signed URL resolves.

**Phase 2 — Rebuild (no prod impact):**
8. Redeploy all 55 edge functions against the new ref (`supabase functions deploy` per app).
9. Re-register the 10 cron jobs (run the cron migrations: sta-email-watch, xero-refresh, tga-sync, etc.).
10. Re-register OAuth 2.1 clients (oauth_clients rows); confirm the new JWKS endpoint serves the new signing keys.
11. **Verification checklist** (from the scope doc): row counts per business table match source; RLS tenant isolation holds; a Vault-decrypted read succeeds; a private-storage signed URL resolves; one full PKCE login round-trip per app against the new project (via a temp env-var override on d.* previews).

**Phase 3 — Cutover (~5 min, pre-staged):**
12. Pre-stage all 6 Vercel apps' new env vars (new `SUPABASE_URL`, anon, publishable, service, JWT_SECRET, DB pooler string for ap-southeast-2) — set but NOT deployed.
13. Maintenance mode on all apps.
14. Final incremental data dump (delta since Phase 1) → restore → deploy all 6 apps with new env vars.
15. Smoke-check each app (login + one core read) → disable maintenance mode.
16. Rollback path = revert env vars to the old ref (old project stays live until decommissioned).

**Phase 4 — Decommission (after a soak period):**
17. Keep the East US project live (read-only) for a 1–2 week soak; then pause/delete.

## Go / No-go for operator

- **Effort:** dominated by env-var repoint (6 apps) + edge-function redeploy (55) + Vault root-key handling. Data restore is trivial (~30 MB core).
- **Risk:** LOW on data (tiny, verified, snapshot-first, parallel-run, instant env-var rollback); MEDIUM on Vault root key (the only irreversible-if-wrong step — mitigated by verify-before-cutover).
- **Downtime:** ~5 min with pre-staged env vars.
- **My recommendation:** proceed ONLY if the Sydney latency benefit justifies the env-var + edge-function + Vault effort. It's safe at this size, but it's a half-day of careful work for a latency win. **Your call — I won't execute without explicit go.**
