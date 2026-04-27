# Operator Handoff — 7 actionable items

**Status:** W (Working)
**Last updated:** 2026-04-27 (rewrite for clarity per operator review)
**Audience:** Braden — operator with credentials for Supabase dashboard, Microsoft Entra portal, developer.xero.com, and Supabase CLI.

This doc lists **only the 7 items that still need you**. Everything else from the 2026-04-25 + 2026-04-27 sessions is done and verifiable — see [§Already Resolved](#already-resolved) at the bottom for the audit trail.

---

## Quick reference

Run any item independently. Each section below has identical structure: **What / Why-you / How / Verify**.

| # | Item | Where | Time | Blocking? |
|---|---|---|---|---|
| 1 | Set `OAUTH_STATE_SECRET` + redeploy 2 edge fns | Supabase CLI or dashboard | 5 min | OAuth login broken until done |
| 2 | Add 2 TGA GUCs (`app.tga_sync_url`, `app.tga_sync_secret`) | Supabase dashboard (or support ticket) | 10 min | Blocks item 3 |
| 3 | Flip `TGA_SYNC_ENABLED=true` after sandbox dry-run | Supabase branch + CLI | 30 min (incl. dry-run) | Blocks TGA cron job |
| 4 | Enable Azure `xms_edov` optional claim | https://entra.microsoft.com | 5 min | Microsoft email verification |
| 5 | Replace `*.vercel.app` wildcard redirect URIs with explicit list | Supabase dashboard | 5 min | Security hardening |
| 6 | Revoke HS256 "Previous" JWK | Supabase dashboard | 2 min | Final step of JWK rotation |
| 7 | Register Xero OAuth app (Part O.2) | https://developer.xero.com/myapps | 10 min | Blocks Xero integration rollout |

**Total:** ~70 minutes of active operator time (longer if waiting on Supabase support for item 2).

**Suggested order:** 1 → 2 → 3 → 4 → 5 → 6 → 7. Items 4, 5, 6, 7 are independent — do them in any order. Item 3 needs item 2 done first.

---

## Item 1 — Set `OAUTH_STATE_SECRET` + redeploy 2 edge functions

**What:** Generate a 32-byte secret. Set it as a Supabase project-level edge function secret. Redeploy `oauth-google-email` and `oauth-microsoft-email` so they pick up the new env var.

**Why you (not the agent):** Supabase edge function env vars are platform-config, not Postgres rows. The MCP `execute_sql` tool can't reach them. Setting requires the Supabase CLI (interactive `supabase login`) or the dashboard.

### How — CLI path (preferred)

```bash
supabase login                                                                       # one-time browser flow

supabase secrets set OAUTH_STATE_SECRET=$(openssl rand -hex 32) \
  --project-ref tuybltdrdefjblnplpqo

supabase functions deploy oauth-google-email --project-ref tuybltdrdefjblnplpqo
supabase functions deploy oauth-microsoft-email --project-ref tuybltdrdefjblnplpqo
```

### How — Dashboard path

1. Open https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/functions/secrets
2. **Add new secret** → Name `OAUTH_STATE_SECRET` → Value `openssl rand -hex 32` output (must be ≥32 chars) → Save.
3. Functions → `oauth-google-email` → Redeploy. Then same for `oauth-microsoft-email`.

### Verify

```bash
# After an OAuth round-trip attempt, the function logs should NOT contain
# "OAUTH_STATE_SECRET is not configured" (raised by _shared/oauth-state.ts:48-52).
curl -s "https://api.supabase.com/v1/projects/tuybltdrdefjblnplpqo/functions/oauth-google-email/logs?limit=20" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq '.[] | select(.event_message | contains("OAUTH_STATE_SECRET"))' \
  | wc -l
# Expected: 0
```

---

## Item 2 — Add 2 TGA GUCs

**What:** Add two custom Postgres GUCs scoped to the database — `app.tga_sync_url` and `app.tga_sync_secret`. The pg_cron job that drives TGA syncing reads these.

**Why you (not the agent):** Hosted Supabase doesn't grant the connecting `postgres` role privileges to `ALTER DATABASE ... SET app.*`. Verified by `current_setting('app.tga_sync_url', true)` returning empty. Either dashboard "Custom Postgres Config" panel or a Supabase support ticket.

### How

1. Open https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/database/custom-config
2. **Add custom variable** — name `app.tga_sync_url` — value `https://tuybltdrdefjblnplpqo.supabase.co/functions/v1/tga-sync` → Add.
3. **Add custom variable** — name `app.tga_sync_secret` — value `openssl rand -hex 32` output → Add. Save this same value to your password store; you'll need it again in step 4.
4. Save. Postgres pool restarts (~30s).
5. **Item 1 prereq:** `TGA_SYNC_SECRET` edge-fn secret must equal the value from step 3. Use the CLI from Item 1 with `supabase secrets set TGA_SYNC_SECRET=<value-from-step-3>`.

If the dashboard rejects (`variable not in allowed list`), open a Supabase support ticket: subject *"Need ALTER DATABASE SET privilege for `app.*` GUCs (project tuybltdrdefjblnplpqo)"*.

### Verify

```bash
psql "$SUPABASE_DB_URL" -c "
SELECT
  current_setting('app.tga_sync_url', true)    AS tga_url,
  current_setting('app.tga_sync_secret', true) IS NOT NULL AS tga_secret_set;
"
# Expected: tga_url = function URL; tga_secret_set = t
```

---

## Item 3 — Flip `TGA_SYNC_ENABLED=true` (after sandbox dry-run)

**What:** Turn on the production TGA sync cron job after proving it doesn't corrupt existing `units_of_competency` data on a sandbox branch.

**Why you (not the agent):** Requires a manual sandbox dry-run with non-prod data. The agent can't pick safe test payloads or judge "did this disturb existing rows" without operator inspection.

### How

1. https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/branches → **Create branch** → name `tga-dryrun-20260427`.
2. The new branch auto-applies all migrations.
3. Manually invoke the `tga-sync` function on the branch with a tiny payload (1–3 qualification codes).
4. Inspect `units_of_competency` rows on the branch. Confirm only your test rows landed; existing data untouched.
5. If safe, flip production:
   ```bash
   supabase secrets set TGA_SYNC_ENABLED=true --project-ref tuybltdrdefjblnplpqo
   supabase functions deploy tga-sync --project-ref tuybltdrdefjblnplpqo
   ```
6. Delete the dry-run branch.

### Verify

```bash
# Most recent tga_sync_runs row should have synced_components > 0
psql "$SUPABASE_DB_URL" -c "
SELECT id, started_at, finished_at, status, synced_components
FROM public.tga_sync_runs
ORDER BY started_at DESC
LIMIT 3;
"
```

---

## Item 4 — Enable Azure `xms_edov` optional claim

**What:** Add the `xms_edov` (email-domain-owner-verified) claim to the Microsoft Entra app registration so `oauth-microsoft-email` can confirm the user actually owns the email domain claimed in their token.

**Why you (not the agent):** Microsoft Entra portal requires Global Admin interactive sign-in. No service-account or API path.

### How

1. Sign in to https://entra.microsoft.com as **Global Administrator**.
2. **Identity → Applications → App registrations** → select the Microsoft OAuth app used by `oauth-microsoft-email`. (App ID is hardcoded in `business-suite-unified/supabase/functions/oauth-microsoft-email/index.ts` near the top of the file.)
3. **Token configuration → Add optional claim**.
4. Token type **ID** → tick `xms_edov` → Add.
5. When prompted, **grant Microsoft Graph `email` permission** (admin consent).
6. Save.

### Verify

```bash
# After a fresh Microsoft sign-in, the function logs should record the claim:
curl -s "https://api.supabase.com/v1/projects/tuybltdrdefjblnplpqo/functions/oauth-microsoft-email/logs?limit=5" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq -r '.[] | select(.event_message | contains("id_token claims")) | .event_message' \
  | head -1
# Expected: log line includes the substring "xms_edov"
```

---

## Item 5 — Replace `*.vercel.app` wildcard redirect URIs

**What:** In Supabase Auth's redirect-URL allowlist, replace any `https://*.vercel.app/**` wildcard with the explicit production hostnames. Preview-branch flows use the `return_origin` query param path instead (added 2026-04-24, see `business-suite-unified/src/lib/redirectTargets.ts`).

**Why you (not the agent):** The Management API path exists (PATCH `/v1/projects/{ref}/config/auth`) but you should review the wildcard list before stripping — some preview flows might be intentional. The agent can't judge intent safely.

### How

1. Open https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/auth/url-configuration
2. Under **Redirect URLs**, find any `https://*.vercel.app/**` entries.
3. Replace with explicit:
   - `https://business-suite-unified.vercel.app/**`
   - `https://crm7.vercel.app/**`
   - `https://r8-chi.vercel.app/**`
   - `https://braden.vercel.app/**`
   - (any others you actually use; do NOT add ones you don't)
4. Save.

### Verify

```bash
curl -s "https://api.supabase.com/v1/projects/tuybltdrdefjblnplpqo/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq '.uri_allow_list' | grep -c '\\*\\.vercel\\.app'
# Expected: 0
```

---

## Item 6 — Revoke HS256 "Previous" JWK

**What:** Final step of the JWT signing-key rotation. The current ES256 key is in use; the previous HS256 key needs revoking so old sessions signed with it can't be replayed.

**Why you (not the agent):** Supabase JWT Signing Keys are dashboard-only as of 2026-04. No Management API endpoint, no SQL path. Verified via `Supabase:search_docs` returning no `revoke previous JWK` API result.

### How

1. Open https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/settings/jwt
2. In the **JWT Signing Keys** section, find the previous HS256 key listed alongside the current ES256 key.
3. Click **Revoke** on the HS256 row.
4. Confirm the modal warning ("All sessions signed with this key will be invalidated"). The active ES256 key is unaffected.

### Verify

```bash
# Fresh access tokens should now be ES256-only
curl -s "https://tuybltdrdefjblnplpqo.supabase.co/auth/v1/.well-known/jwks.json" \
  | jq '.keys | map(.alg) | unique'
# Expected: ["ES256"]   (HS256 must NOT appear)
```

---

## Item 7 — Register Xero OAuth app (Part O.2)

**What:** Create a Xero OAuth 2.0 app at developer.xero.com so CRM7 can connect tenant Xero organizations for payroll/accounting integration.

**Why you (not the agent):** Xero's developer portal requires interactive sign-in with your Xero developer account. No API or service-account path to register apps.

### How

1. Sign in to https://developer.xero.com/myapps with the Braden Xero developer account.
2. Click **New app**.
3. Fill in:
   - **App name:** `Braden Group CRM7` (or `BSuite CRM7 Integration` — your call on branding)
   - **Integration type:** **Web app**
   - **Company / app URL:** `https://crm.crm7.app`
   - **OAuth 2.0 redirect URI:** `https://crm.crm7.app/auth/xero/callback`
4. After creation, open the app's **Configuration** tab.
5. **Copy the Client ID and Client Secret.** The secret is shown ONCE — store immediately in 1Password (or your vault) before navigating away.
6. The consumer app will request these scopes at OAuth time (no pre-approval needed on Xero's side, but document them):
   - `accounting.contacts`
   - `accounting.transactions`
   - `accounting.settings.read`
   - `payroll.employees`
   - `payroll.payruns`
   - `offline_access`
7. **Hand the Client ID + Client Secret back via the agreed secure channel** (1Password reference, not raw chat paste).

### What the agent does next (after you return credentials)

- Writes `VITE_XERO_CLIENT_ID=<client_id>` to **CRM7 Vercel** env (Production + Preview) via Vercel MCP.
- Writes `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_REDIRECT_URI=https://crm.crm7.app/auth/xero/callback` to **Supabase secrets** (project `tuybltdrdefjblnplpqo`) via Supabase MCP.
- Per-tenant `xero_integration` feature flag activation is operator-toggled per customer at rollout time (separate from app registration).

### Verify (after agent has written secrets)

```bash
# 1. CRM7 Vercel env has the public client ID
vercel env ls --token=$VERCEL_TOKEN --scope=braden-pty-ltd | grep VITE_XERO_CLIENT_ID
# Expected: a line showing "VITE_XERO_CLIENT_ID  Encrypted  Production, Preview"

# 2. Supabase has all 3 server-side secrets
supabase secrets list --project-ref tuybltdrdefjblnplpqo \
  | grep -E '^(XERO_CLIENT_ID|XERO_CLIENT_SECRET|XERO_REDIRECT_URI)\b'
# Expected: 3 lines

# 3. End-to-end OAuth handshake smoke
curl -sI https://crm.crm7.app/auth/xero/connect | head -1
# Expected: HTTP/2 302 with Location → login.xero.com/identity/connect/authorize
# (404 means consumer route not yet wired in CRM7 — that's the implementation
#  follow-up task post-registration, not blocking your handoff.)
```

---

## Already resolved

These items came off the original 10-item checklist (memory `bsuite_pending_actions` 2026-04-23) and the 2026-04-27 review. Listed here for audit trail — no operator action needed.

| Original # | Item | Resolved by | Evidence |
|---|---|---|---|
| 2 | Apply 3 Supabase migrations (`phase12_tenant_hierarchy_hardening`, `phase12_hierarchy_rls`, `phase6_11_seed_enterprise_subscriptions`) | WS-G (2026-04-25) via `Supabase:apply_migration` MCP | contacts policies 4→5, placements 4→5, enterprise subs 0→4, hierarchy trigger + function present |
| 3a | Install `pg_cron` + `pg_net` extensions | WS-G (2026-04-25) | `pg_cron@1.6.4` already installed; `pg_net@0.19.5` installed via `CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions` |
| 5 | Apply `phase3_uoc_drop_legacy_contract.sql` | SKIPPED — file does not exist in `business-suite-unified/supabase/migrations/`. The "Contract" half of the Expand → Migrate → Contract pattern was never authored. Track in a future Phase 3 closeout if needed. | n/a |
| 9 | Add `dry-lint` as required CI check on protected branches | WS-I-PHASE-2 (2026-04-25) — wired across all 7 repos × 2 branches (14 protections) | `gh api repos/<r>/branches/<b>/protection/required_status_checks --jq '.contexts'` includes the lint job that runs `bsuite/no-cross-app-write` |
| 10 | Disable "Automatically delete head branches" | WS-G (2026-04-25) — patched all 8 BSuite repos | `gh api /repos/GaryOcean428/<r> --jq '.delete_branch_on_merge'` returns `false` for all |
| (new) | SECURITY DEFINER NULL-search_path FAIL on `set_payroll_super_due_date` | 2026-04-27 review session — migration `20260427000000_security_definer_hardening.sql` applied live, source PR #197 merged | `pg_proc` shows `proconfig != NULL` for `set_payroll_super_due_date` and `is_team_admin` (latter tightened to `''`) |
| (new) | Branch protection enforced (`allow_force_pushes=false`, `prs_required=true`, `enforce_admins=true`) on all 14 refs | 2026-04-27 review session — PR #280 | `gh api repos/<r>/branches/<b>/protection --jq '.allow_force_pushes.enabled'` returns `false` |

### Operator behavior change required (consequence of branch-protection enforcement)

Cascade IDE auto-snapshot direct-pushes to `main` or `development` on any of the 7 repos will now be **rejected server-side**. You'll need to either reconfigure Cascade to push to a feature branch + open a PR, or accept that those workflows will keep failing. Server-side enforcement is in place; client-side tooling is your call.

---

## Quick-start: do all 7 in one sitting

If you want to bang through everything in ~70 minutes:

```bash
# Block 1 (~15 min): Items 1, 2, 3 — Supabase secrets + GUCs + dry-run
supabase login                                                                                     # one-time
supabase secrets set OAUTH_STATE_SECRET=$(openssl rand -hex 32) --project-ref tuybltdrdefjblnplpqo  # Item 1
# (then dashboard for Item 2 GUCs, then sandbox-branch + flip for Item 3)

# Block 2 (~10 min): Items 4, 5, 6 — Microsoft Entra + Supabase dashboard
# (interactive UI work — open the 3 dashboard URLs in tabs and step through)

# Block 3 (~10 min): Item 7 — Xero developer portal
# (interactive — register the app, capture credentials, hand back)
```

Each block has explicit `verify` blocks above. Run them in order; if a verify fails, the agent can pick up from that item next session.

---

## Cross-reference

- **2026-04-27 finish-line review sign-off:** [`docs/20260427-finish-line-review-signoff-v1.00W.md`](20260427-finish-line-review-signoff-v1.00W.md) — full session context.
- **Original 10-item checklist source:** memory key `bsuite_pending_actions` (2026-04-23 — superseded; current memory key has the trimmed list).
- **Original Xero (Item 7 / Part O.2) source:** memory key `bsuite_backlog_2026_post_n` (2026-04-22, "HUMAN-ACTION BLOCKERS" #1).
- **Throughput W4-TP deep-link target (built in WS-G):** `business-suite-unified/src/pages/Admin/TeamMembers.tsx`.
- **Operator screenshots (capture as you go):** `docs/operator-screenshots/` — directory stub created in WS-G-fix; capture protocol in its README.

---

**Author:** Claude Opus 4.7 (1M context). Original 11-item version 2026-04-25; 7-item rewrite 2026-04-27 per operator review feedback ("be clearer with the 6-item handoff").
