# Migrate Supabase project to ap-southeast-2 (Sydney) before MBAWA board pitch — mid-June 2026

https://github.com/GaryOcean428/bsuite/issues/1322

Snapshot updatedAt: 2026-08-24T10:53:54Z. Open at capture; re-read live.

## Context

The MBAWA board pitch deck (`mbawa_board_pitch_v2.pdf`, slide 4 architecture line) claims `Single Supabase backend (Sydney region)`. This is a forward-looking commitment that must become true before the pitch is delivered.

MBAWA is a Western Australian member organisation. Australian data residency is procurement-relevant for a 125-year-old construction-sector body, and the deck's credibility depends on the claim being verifiable on the day it's read. The pitch is anticipated mid-June 2026.

Confirmed by operator (Braden) 2026-05-27 that the current Supabase project is **not** in `ap-southeast-2`. Specific current region requires inspection (Supabase MCP `get_project` against project `tuybltdrdefjblnplpqo` returns it; awaiting approval grant or manual check via dashboard).

## Current state

- Supabase project ID: `tuybltdrdefjblnplpqo`
- Consumers: all 6 BSuite apps (CRM7, Conduit, BSU, R80.3, braden, Throughput)
- Current region: **TBC — operator to confirm; not `ap-southeast-2`**
- All apps in production v0.2.0+; deck slide 4 architecture claim depends on Sydney residency

## Target state

- New Supabase project in `ap-southeast-2` (Sydney)
- All 6 apps cut over to the new project
- Slide 4 architecture claim becomes true and verifiable
- No data loss; no extended downtime during business hours

## Scope of work

Supabase does not support in-place region changes. This is a new-project + migrate + cutover operation. High-level steps:

1. **Provision** new Supabase project in `ap-southeast-2` (Sydney). Confirm cost via `confirm_cost` first. Match plan tier to current.
2. **Schema migration** — run all existing migrations against the new project. Use Supabase CLI or MCP `apply_migration`. Reference: parent CLAUDE.md §"Database" rule for migration discipline.
3. **Auth configuration** — re-create OAuth providers (Google + Microsoft, matching the §"Mandatory OAuth Providers" rule), re-register all 20 redirect URIs from the URI registry (CLAUDE.md §"Supabase URI Allow-List"), re-generate JWKS keys, update issuer URL.
4. **Data migration** — `pg_dump` + `pg_restore`, or Supabase's native migration tooling. Schedule for off-peak (Australian business hours are the user load window; AEDT 22:00–04:00 likely best). Pre-flight: snapshot of source before migration.
5. **Environment variable rotation** across:
   - 6 Vercel projects (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY`)
   - All Edge Function secrets (GCP WIF metadata, Stripe webhook secrets, Xero connection secrets)
   - GitHub Actions secrets if any reference the project URL
6. **BS OAuth server reconfiguration** — BSU's OAuth client registry (`auth.oauth_clients`) must be migrated; verify all 5 client IDs (CRM7, R80.3, braden, Throughput, Conduit) still resolve correctly post-migration. Reference: parent CLAUDE.md §"OAuth Client Registry".
7. **WIF trust update** — Google Cloud Workload Identity Federation provider trusts the issuer `https://tuybltdrdefjblnplpqo.supabase.co/auth/v1`. If the project ID changes, the WIF provider trust binding must be updated. Reference: parent CLAUDE.md §"Google Cloud Authentication".
8. **DNS / redirect URI** updates — Supabase project domain changes; update Auth URL Configuration allowlist (CLAUDE.md §"Supabase URI Allow-List — Do Not Prune" — every URI in that block must be re-registered against the new project).
9. **Cutover** — coordinated env-var flip across 6 Vercel projects within a maintenance window. Prefer blue/green: deploy each app pointed at new project on a preview branch, smoke-test, then flip production.
10. **Post-cutover verification** — run the contract test suite (`oauth-contract.test.ts` in each of 5 consumers + new BSU equivalent), Ship-All-Apps cron RLS audit, cross-app E2E (`crm7/tests/e2e/cross-app-auth.spec.ts`).
11. **Decommission** — old project paused (not deleted) for 30 days as a rollback window; deleted thereafter.

## Acceptance criteria (per FF-SELF-VALIDATION-20260507 §9.1 output-equivalence)

- [ ] New project provisioned in `ap-southeast-2`; verified via `Supabase:get_project` returning `region: "ap-southeast-2"`
- [ ] All migrations applied; schema diff between old and new returns empty (`pg_dump --schema-only` comparison)
- [ ] All RLS policies re-applied; the 5 tenant/`user_tenants` policies remain `{authenticated}` not `{public}` (Ship-All-Apps cron RLS audit passes against new project)
- [ ] All 20 registered redirect URIs re-registered against new project; allowlist verified per CLAUDE.md §"Supabase URI Allow-List — Do Not Prune"
- [ ] OAuth providers (Google + Microsoft) reconfigured; Sign-In flow tested end-to-end on each of 6 apps
- [ ] BS OAuth flow tested end-to-end (login on BSU → silent re-auth on CRM7/R80.3/Braden/Throughput/Conduit)
- [ ] WIF trust binding updated; `generate-document` edge function in CRM7 successfully obtains a Google access token post-cutover
- [ ] All 6 Vercel projects building green on new env vars; production deploys live
- [ ] Contract tests pass: `oauth-contract.test.ts` in CRM7, R80.3, Braden, Throughput, Conduit (5 consumers); new equivalent in BSU
- [ ] Cross-app E2E `crm7/tests/e2e/cross-app-auth.spec.ts` passes
- [ ] Sentry / observability dashboards show no error spike post-cutover
- [ ] Old project paused (not deleted); rollback path documented

## Risks / dependencies

| Risk | Mitigation |
|------|------------|
| Active user sessions invalidated during cutover | Schedule cutover for off-peak; communicate via in-app notice 48h ahead; users re-authenticate via OAuth silent re-auth where possible |
| WIF binding mismatch causes edge function auth failures post-cutover | Pre-test WIF flow on new project before flipping CRM7 production env vars |
| Redirect URI allowlist incomplete; OAuth flows fail | Use the 20-URI registry in CLAUDE.md as canonical source; verify every URI re-registered |
| Stripe webhook secrets need re-registration | Update Stripe Dashboard webhook URLs to new project domain; rotate signing secrets |
| Xero OAuth tokens stored in `xero_connections` table — re-encryption with new keys may be needed | Audit token storage encryption; rotate as needed during cutover |
| Pitch slips past mid-June | Acceptable risk; commit only realistic deadline |
| Cutover causes >1h downtime | Blue/green deployment pattern; old project stays warm for instant rollback |

## Deadline

**Mid-June 2026** — before MBAWA board pitch.

Tight but achievable if started promptly. The slowest critical-path items are likely: (a) data migration window for the largest tables, (b) WIF binding verification, (c) all-apps smoke testing post-cutover.

## Related

- Deck reference: `mbawa_board_pitch_v2.pdf` slide 4 architecture line
- Red-team review: `mbawa-deck-v2-redteam.md` issue R1-07
- Parent rule: CLAUDE.md §"Supabase URI Allow-List — Do Not Prune", §"Google Cloud Authentication", §"OAuth Client Registry"
- AUTH_CANONICAL.md (per-domain Supabase localStorage rule must continue to hold post-cutover)

## Validation loop (FF-SELF-VALIDATION-20260507)

- **Validation loop:** §9.1 output-equivalence
- **Equivalence target:** schema diff empty, RLS policy state preserved, all 6 apps building + auth flows working post-cutover
- **Cross red-team:** claude-code verifies acceptance criteria evidence before issue closure
- **Skills to load:** `supabase`, `qa-and-verification`
- **Self-report on divergence:** yes (mandatory; do not rationalise gaps)

## Out of scope

- Database performance tuning post-migration (track separately if needed)
- Region migration of any non-Supabase infrastructure (Vercel projects, GitHub repos — all stay where they are)
- Pricing-tier review (assume same tier on new project unless operator decides otherwise)
