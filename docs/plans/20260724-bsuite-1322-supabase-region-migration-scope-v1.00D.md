# bsuite#1322 — Supabase Region Migration Scope (East US → ap-southeast-2 Sydney)

> **Naming:** `20260724-bsuite-1322-supabase-region-migration-scope-v1.00D.md` · Status **D** (Draft — pending migration-method research lane) · Operator constraint: "there isn't much data but we do need to be safe with what we have."

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## Current state (verified 2026-07-24)

- **Project:** `supabase-business-suite` (ref `tuybltdrdefjblnplpqo`), region **East US (North Virginia)**, created 2025-10-09.
- **Backs 6 Vercel apps:** BSU, crm7, conduit, R80.3, braden, throughput (all consume `SUPABASE_URL` + anon/publishable/service keys, project-ref-bound).

## Data footprint (the "not much data" part — VERIFIED small + safe)

| Layer | Volume | Notes |
|---|---|---|
| **Total DB** | 205 MB | — |
| **Core business data** | **~30 MB** | excludes infra noise |
| — infra noise (excludable) | ~175 MB | `job_run_details` 93 MB + `_http_response` 55 MB + `error_log`/`audit_log_entries`/schema backups — NOT business data; can be excluded or truncated from the migration |
| **Tenants** | 5 | — |
| **auth.users** | 11 | small — re-auth is a viable fallback but preserve if possible |
| **Storage objects** | **~190 MB** | `apprentice-documents` 440 files/184 MB + host-employer-docs 5 MB + tenant-logos 5 MB + contracts ~1 MB |

**Safety framing:** the irreplaceable business payload is ~30 MB Postgres + ~190 MB Storage. Everything else (job_run_details, _http_response, error/audit logs) is regenerable infra noise that should NOT be migrated (shrinks the dump + the risk surface).

## Migration surface (what must move + what must be repointed)

| Area | Scope | Repoint needed? |
|---|---|---|
| **Postgres data** | ~30 MB core (all public-schema business tables) | pg_dump/restore (preferred at this size) |
| **auth schema** | 11 users + identities + refresh tokens | Supabase-managed; verify whether it migrates or users re-auth |
| **Storage objects** | ~190 MB across 5 non-empty buckets (2 public: tenant-logos, platform-logos; 3+ private) | bucket-by-bucket object copy |
| **Edge functions** | **55 total**: crm7 22, conduit 4, BSU 27 (+ _shared) | redeploy per app to the new project |
| **RLS / policies / roles / grants** | extensive (per migration doctrine + advisor allowlist) | replay from versioned migrations + baseline dump |
| **pg_cron jobs** | 10 active (sta-email-watch */15, xero-refresh, tga-sync, etc.) | re-register via migrations |
| **Realtime** | conduit RealtimeCursors + live queries | config only |
| **Project ref / API URL / keys** | `tuybltdrdefjblnplpqo` + anon/publishable/service/JWT secret | **YES — new project = new ref + new keys; env vars across all 6 apps must update** (see env inventory doc) |
| **OAuth 2.1 server** | BSU is the OAuth hub (JWKS, oauth_clients, consent) | re-register clients + new JWKS endpoint; signing keys rotate |
| **Vercel Marketplace link** | `vercel_icfg_mlfS5ZEbzDdPLpgNezj5GDIx` org binding | relink |

## The env-var repoint (the highest-risk non-data step)

New project ref ⇒ new `SUPABASE_URL` + `anon`/`publishable`/`service` keys + `JWT_SECRET`. Per `20260724-bsuite-vercel-env-inventory-v1.00W.md`, **every app** carries the Supabase set (BSU has 17 Supabase-shaped vars; each Vite app ~13; conduit NEXT_PUBLIC_* equivalents). All must flip to the new ref — coordinated, atomic, and rolled back on failure. **This is the downtime driver, not the data.**

## Safety strategy (given "safe with what we have")

1. **Snapshot first:** a full project backup (Dashboard → Backups, and a manual `pg_dump` of the public schema + a Storage objects export) BEFORE anything. Verify the dump restores into a throwaway project.
2. **Exclude the noise:** dump only the core ~30 MB (exclude `job_run_details`, `_http_response`, `error_log`, `audit_log_entries`, schema backups) — smaller dump, faster restore, smaller blast radius.
3. **Parallel-run, don't big-bang:** spin up the new ap-southeast-2 project, restore into it, verify (row counts per table, RLS policies, cron jobs, edge functions deployed, storage objects present) while prod stays live on East US.
4. **Verify-then-swap:** only after the new project passes a smoke checklist (see below), flip the env vars app-by-app (or via a coordinated script), watch error rates, roll back by reverting env vars if anything breaks.
5. **Auth continuity:** if the `auth` schema doesn't carry over cleanly, the 11 users re-auth once (acceptable at this scale) — but prefer preserving sessions if the method allows.

## Verification checklist (post-restore, pre-swap)

- [ ] Row counts match per business table (vs the East US source, same point-in-time).
- [ ] RLS policies present + tenant isolation holds (spot-check `auth_tenant_id()` SETOF policies).
- [ ] All 55 edge functions deployed + a representative invoke succeeds.
- [ ] 10 cron jobs registered + one manual run of `sta-email-watch` succeeds.
- [ ] Storage: 449 objects present across the 5 buckets; a private-doc signed URL resolves.
- [ ] OAuth 2.1: JWKS endpoint healthy (2 ES256 keys), oauth_clients re-registered, a full PKCE login round-trip works.
- [ ] One full user login per app (BSU + crm7 + conduit at minimum).

## Open questions for the research lane (deleg_b9be9706)

- Native/managed region-migration vs manual dump/restore (2026 current state).
- Does `auth` schema migrate, or must users re-auth?
- Does the project ref change (confirming the env-var repoint)?
- Is ap-southeast-2 currently available for new projects?
- Zero/low-downtime options at ~30 MB (logical replication vs dump-and-swap).
