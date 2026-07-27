# Sydney region migration readiness (#1322)

> Status **W** · Excellence backlog close-out · **Cutover remains operator-gated** (scheduled window Wed 07:00 per prior plan — do not execute without explicit go).

## Success condition for this loop item

- [x] Runbook present and linked  
- [x] Scope doc present  
- [x] Pre-flight checklist enumerated  
- [ ] Operator approval for cutover  
- [ ] Dump restore dry-run into throwaway project  

## Canonical docs

- `docs/plans/20260724-bsuite-1322-region-migration-runbook-v1.00D.md`
- `docs/plans/20260724-bsuite-1322-supabase-region-migration-scope-v1.00D.md`
- Skill ref: `subagent-orchestration/references/supabase-region-migration-runbook.md`

## Pre-flight (verify before cutover day)

1. Measure core DB size excluding noise tables (`pg_total_relation_size`).  
2. Confirm `vault.secrets` count — if >0, export/import vault root key procedure ready.  
3. Inventory Storage buckets for rclone copy plan.  
4. List edge functions + cron jobs + OAuth clients to re-register.  
5. Pre-stage env vars for all apps (new ref, anon/publishable/service/JWT) without cutting traffic.  
6. Snapshot dump + restore into throwaway AU Sydney project.  
7. Parallel-run: apps still on Melbourne/current until verify-then-swap.  

## Explicit non-goals this loop

- No production cutover  
- No deletion of old project  

## Silo

`bsuite_sydney_readiness_2026-07-25` — READY_FOR_OPERATOR when dry-run complete; currently **RUNBOOK_READY**.

## RT-hardened dry-run gate (2026-07-27)

Ordered dry-run (before any cutover decision):
1. Dump old project (roles + schema + data; exclude infra-noise tables)
2. Restore into throwaway Sydney project (`--single-transaction --variable ON_ERROR_STOP=1`)
3. Export + import Vault root key
4. **Named-secret verify GATE:** `SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'xero_client_refresh_token'` must return plaintext (not garbage). If fail → STOP.
5. Storage rclone + verify private signed URL resolves
6. Redeploy edge functions; re-register cron + OAuth clients
7. Full verify: row counts + RLS isolation + PKCE login per app
8. THEN pre-stage env vars (set, not deployed)

### Key hygiene (mandatory)
- Export/import in tmpfs scratch (`/dev/shm/sydney-keyring`), wiped after
- `HISTFILE=/dev/null` for the key-handling shell session
- Dry-run project's imported key destroyed after verification
- No DSNs/keys in runbook or git — scan before commit (gitleaks clean)
