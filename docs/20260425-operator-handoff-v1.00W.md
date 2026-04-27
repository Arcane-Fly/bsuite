# Operator Handoff — Finish Line Session (2026-04-25)

**Status:** W (Working)
**Author:** Claude Code (WS-G agent, finish-line plan)
**Scope:** Tasks that **cannot** be completed by an agent and require a human operator with elevated credentials (Supabase dashboard, Microsoft Entra portal, GitHub branch-protection admin).

This document is the residue from the 10-item operator checklist captured in `bsuite_pending_actions` (memory key, dated 2026-04-23). Items 1-5 (Supabase migrations + extensions + GUC discovery) and item 10 (auto-delete head branches) were executed during this session; only items below remain operator-only.

After every operator action, run the listed `verification_command` so the next agent session can confirm the state without re-asking.

---

## Item 1 — `OAUTH_STATE_SECRET` set + redeploy oauth edge functions

**Why operator-only:** Supabase edge function env vars (project-level secrets) are NOT writable via the Supabase MCP `execute_sql` tool — they live in the Supabase platform config, not Postgres. The `apply_migration` / `execute_sql` MCP surface explicitly cannot reach them. Setting requires either the Supabase CLI (`supabase secrets set ...`) authenticated with a project access token, or the dashboard.

### Action

Generate a 32-byte secret and persist it as a project-level secret, then redeploy the two consuming edge functions so they pick up the new env var.

### CLI (preferred — keyless via interactive login)

```bash
# 1. Authenticate once (opens browser)
supabase login

# 2. Set the secret
supabase secrets set OAUTH_STATE_SECRET=$(openssl rand -hex 32) \
  --project-ref tuybltdrdefjblnplpqo

# 3. Redeploy both consumers so they re-read env
supabase functions deploy oauth-google-email --project-ref tuybltdrdefjblnplpqo
supabase functions deploy oauth-microsoft-email --project-ref tuybltdrdefjblnplpqo
```

### Dashboard alternative

URL: https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/functions/secrets

1. Click "Add new secret".
2. Name: `OAUTH_STATE_SECRET`. Value: paste output of `openssl rand -hex 32` (must be ≥ 32 chars).
3. Click "Save".
4. Navigate to Functions → `oauth-google-email` → "Redeploy". Repeat for `oauth-microsoft-email`.

**Screenshot reference:** `docs/operator-screenshots/oauth-state-secret-add.png` (capture after first run for next operator).

### `verification_command`

```bash
# Check the function logs after attempting an OAuth round-trip — absence of
# "OAUTH_STATE_SECRET is not configured" is success. The function code at
# business-suite-unified/supabase/functions/_shared/oauth-state.ts:48-52
# raises that exact error when the env var is < 32 chars.
curl -s "https://api.supabase.com/v1/projects/tuybltdrdefjblnplpqo/functions/oauth-google-email/logs?limit=20" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq '.[] | select(.event_message | contains("OAUTH_STATE_SECRET"))' \
  | wc -l
# Expected: 0 (no occurrences after redeploy)
```

---

## Item 2 — Apply pending Supabase migrations

**Status:** ✅ DONE (this session, 2026-04-25). All three migrations (`phase12_tenant_hierarchy_hardening`, `phase12_hierarchy_rls`, `phase6_11_seed_enterprise_subscriptions`) applied via `Supabase:apply_migration` MCP tool. Verified post-state: 5 contacts policies (was 4), 5 placements policies (was 4), 4 enterprise subscription rows (was 0), `trg_tenants_hierarchy_check` trigger present, `has_parent_admin_access` function present.

### `verification_command`

```bash
psql "$SUPABASE_DB_URL" -c "
SELECT
  (SELECT count(*) FROM pg_policy WHERE polrelid = 'public.contacts'::regclass) AS contacts_policies,
  (SELECT count(*) FROM pg_policy WHERE polrelid = 'public.placements'::regclass) AS placements_policies,
  (SELECT count(*) FROM public.subscriptions WHERE plan_tier = 'enterprise' AND status = 'active') AS enterprise_subs,
  (SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_tenants_hierarchy_check')) AS hierarchy_trigger,
  (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname='has_parent_admin_access')) AS hierarchy_func;
"
# Expected: contacts_policies=5, placements_policies=5, enterprise_subs=4, both booleans TRUE
```

---

## Item 3 — Extensions + GUCs

### 3a. `pg_cron` + `pg_net` extensions — ✅ DONE (this session)

`pg_cron` was already installed (1.6.4 in `pg_catalog`); `pg_net` 0.19.5 installed via `CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;` through the Supabase MCP `execute_sql` tool. No operator action remains.

### 3b. `app.tga_sync_url` + `app.tga_sync_secret` GUCs — OPERATOR-ONLY

**Why operator-only:** Hosted Supabase does NOT grant the `postgres` connecting role the necessary privileges for `ALTER DATABASE ... SET app.tga_sync_url = ...` (we verified by querying `current_setting('app.tga_sync_url', true)` — returned empty). This requires either dashboard-level "Custom Postgres Config" or contacting Supabase support.

### Action

Add two custom GUCs scoped to the database via the Supabase dashboard's Custom Postgres Config panel.

URL: https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/database/custom-config

1. Click "Add custom variable".
2. Variable: `app.tga_sync_url`. Value: production TGA edge function URL — `https://tuybltdrdefjblnplpqo.supabase.co/functions/v1/tga-sync`.
3. Click "Add custom variable" again.
4. Variable: `app.tga_sync_secret`. Value: a freshly generated `openssl rand -hex 32` value. **The same value must also be set as the `TGA_SYNC_SECRET` edge function secret** (see Item 1 for the secrets workflow).
5. Click "Save". The Postgres pool will be restarted (~30s).

If the dashboard rejects the request ("variable not in allowed list"), open a Supabase support ticket: subject `Need ALTER DATABASE SET privilege for app.* GUCs (project tuybltdrdefjblnplpqo)`.

**Screenshot reference:** `docs/operator-screenshots/custom-postgres-config.png`.

### `verification_command`

```bash
psql "$SUPABASE_DB_URL" -c "
SELECT
  current_setting('app.tga_sync_url', true)    AS tga_url,
  current_setting('app.tga_sync_secret', true) IS NOT NULL AS tga_secret_set;
"
# Expected: tga_url is the function URL; tga_secret_set is true
```

---

## Item 4 — `TGA_SYNC_ENABLED=true` flip

**Why operator-only:** The runbook requires a manual sandbox dry-run with non-prod data BEFORE enabling. The sandbox path (Supabase branch DB or local emulator) requires interactive supervision; the agent cannot prove safety without operator-supplied test data.

### Action

1. From the Supabase dashboard, create a temporary branch: https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/branches → "Create branch" → name `tga-dryrun-20260425`.
2. Apply all migrations to the branch.
3. Manually invoke the `tga-sync` function on the branch with a tiny payload (1-3 qualification codes).
4. Inspect `units_of_competency` rows on the branch — confirm only the test rows landed and no existing data was disturbed.
5. Once verified, set the production env var:

```bash
supabase secrets set TGA_SYNC_ENABLED=true --project-ref tuybltdrdefjblnplpqo
supabase functions deploy tga-sync --project-ref tuybltdrdefjblnplpqo
```

6. Delete the dry-run branch.

### `verification_command`

```bash
# Inspect a recent tga_sync_runs row — should now have synced_components > 0
psql "$SUPABASE_DB_URL" -c "
SELECT id, started_at, finished_at, status, synced_components
FROM public.tga_sync_runs
ORDER BY started_at DESC
LIMIT 3;
"
```

---

## Item 5 — `phase3_uoc_drop_legacy_contract.sql`

**Status:** SKIP (no migration file exists in `business-suite-unified/supabase/migrations/`). Per the original 2026-04-23 plan, this is the "Contract" half of an Expand → Migrate → Contract pattern that should NOT be applied until the consumer rollout is stable. Action deferred until a separate session that owns the consumer audit (likely WS-K or a future Phase 3 closeout).

### `verification_command` (when ready to apply)

```bash
# Confirm no consumer references the legacy uoc contract before dropping
rg -l "uoc_legacy|qualification_unit_legacy" /home/braden/Desktop/Dev/bsuite --type ts --type tsx
# Expected: empty output → safe to apply the drop migration
```

---

## Item 6 — Azure `xms_edov` optional claim

**Why operator-only:** Microsoft Entra portal requires an interactive admin login (cannot be automated via gh / supabase MCP).

### Action

1. Sign in to https://entra.microsoft.com as Global Administrator.
2. Navigate to: **Identity → Applications → App registrations** → select the Microsoft OAuth app used by `oauth-microsoft-email` (app id is in the function code).
3. Open **Token configuration** → "Add optional claim".
4. Token type: `ID`. Select `xms_edov` (email-domain-owner-verified). Click Add.
5. When prompted, grant Microsoft Graph `email` permission (admin consent).
6. Save.

**Screenshot reference:** `docs/operator-screenshots/azure-xms-edov-optional-claim.png`.

### `verification_command`

```bash
# Inspect a fresh ID token from a Microsoft sign-in attempt — xms_edov should
# appear as a claim. Use jwt.io or jq:
curl -s "https://api.supabase.com/v1/projects/tuybltdrdefjblnplpqo/functions/oauth-microsoft-email/logs?limit=5" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq -r '.[] | select(.event_message | contains("id_token claims")) | .event_message' \
  | head -1
# Expected: log line includes "xms_edov" key
```

---

## Item 7 — Remove `*.vercel.app` wildcard redirect URIs

**Why operator-only:** Supabase Auth URL Configuration (Site URL + Redirect URLs allowlist) has a Management API path (PATCH `/v1/projects/{ref}/config/auth`), but it requires a Personal Access Token + the operator should review the wildcard list before stripping (some preview-branch flows may be intentional). Agent cannot judge intent safely.

### Action

URL: https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/auth/url-configuration

1. Under **Redirect URLs**, find any entry matching `https://*.vercel.app/**` or similar wildcard.
2. Replace with explicit entries: e.g.
   - `https://business-suite-unified.vercel.app/**`
   - `https://crm7.vercel.app/**`
   - `https://r8-chi.vercel.app/**`
   - `https://braden.vercel.app/**`
3. For per-PR Vercel preview support, the BSU app already supports `return_origin` query param (added 2026-04-24, see `business-suite-unified/src/lib/redirectTargets.ts`) — preview URLs can be passed through that path without an open allowlist.
4. Click "Save".

**Screenshot reference:** `docs/operator-screenshots/auth-url-config-redirect-urls.png`.

### `verification_command`

```bash
curl -s "https://api.supabase.com/v1/projects/tuybltdrdefjblnplpqo/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq '.uri_allow_list' | grep -c '\\*\\.vercel\\.app'
# Expected: 0 (no wildcards present)
```

---

## Item 8 — Revoke HS256 Previous JWK in Supabase dashboard

**Why operator-only:** As of 2026-04, the JWT Signing Keys management surface in Supabase is dashboard-only — no Management API endpoint, no SQL path. Confirmed via `Supabase:search_docs` GraphQL query (no `revoke previous JWK` API result returned).

### Action

URL: https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/settings/jwt

1. Find the section "JWT Signing Keys".
2. If a previous HS256 key is listed alongside the current ES256 key, click "Revoke" on the HS256 row.
3. Confirm the modal warning ("All sessions signed with this key will be invalidated"). The new active ES256 key is unaffected.

**Screenshot reference:** `docs/operator-screenshots/jwt-revoke-hs256.png`.

### `verification_command`

```bash
# Inspect a fresh access token's `alg` header — must be ES256, not HS256
curl -s "https://tuybltdrdefjblnplpqo.supabase.co/auth/v1/.well-known/jwks.json" \
  | jq '.keys | map(.alg) | unique'
# Expected: ["ES256"]  (NOT containing "HS256")
```

---

## Item 9 — Add `dry-lint` as required status check on protected branches

**Status:** BLOCKED on WS-I (which builds the `dry-lint` package). Skipping per the original WS-G plan.

When WS-I lands, the operator action is:

```bash
for repo in crm7 R80.3 braden business-suite-unified throughput conduit bsuite; do
  for branch in development main; do
    gh api -X PATCH "/repos/GaryOcean428/$repo/branches/$branch/protection/required_status_checks" \
      -f strict=true \
      --input <(echo '{"contexts":["dry-lint","quality"]}')
  done
done
```

### `verification_command`

```bash
gh api /repos/GaryOcean428/business-suite-unified/branches/development/protection/required_status_checks \
  --jq '.contexts'
# Expected: ["dry-lint","quality",...]
```

---

## Item 10 — Disable "Automatically delete head branches"

**Status:** ✅ DONE (this session). Patched 5 repos via `gh api -X PATCH /repos/<owner>/<repo> -f delete_branch_on_merge=false`:

- `crm7` → `delete_branch_on_merge=false` ✅
- `R80.3` → `delete_branch_on_merge=false` ✅
- `braden` → `delete_branch_on_merge=false` ✅
- `business-suite-monorepo` → `delete_branch_on_merge=false` ✅
- `bsuite` → `delete_branch_on_merge=false` ✅ (was previously `true`)

### `verification_command`

```bash
for repo in crm7 R80.3 braden business-suite-monorepo bsuite business-suite-unified throughput conduit; do
  echo -n "$repo: "
  gh api "/repos/GaryOcean428/$repo" --jq '.delete_branch_on_merge'
done
# Expected: false for all listed repos
```

---

## Item 11 — Xero developer-portal app registration (Part O.2)

**Why operator-only:** Registering a Xero OAuth 2.0 app at `developer.xero.com/myapps` requires interactive sign-in with the Xero developer account credentials (linked to Braden's MyXero login). Agents cannot authenticate to Xero's developer portal — there is no API or service-account path to register an app. This is genuinely human-only.

**Restoration note:** This item was originally catalogued as **Part O.2** in `bsuite_backlog_2026_post_n` (2026-04-22 backlog) and listed as a human-action blocker. It was inadvertently omitted from the 2026-04-25 finish-line operator handoff during the WS-G/WS-J doc consolidation. Restored here on 2026-04-27 per user review request — see `docs/20260425-finish-line-signoff-v1.00W.md` §"Restoration Errata" for cross-reference.

### Action

1. Sign in to https://developer.xero.com/myapps with the Braden Xero developer account.
2. Click **New app**.
3. Fill out the app registration form:
   - **App name:** `BSuite CRM7 Integration` (or `Braden Group CRM7` per Xero brand guidelines)
   - **Integration type:** **Web app**
   - **Company or application URL:** `https://crm.crm7.app`
   - **OAuth 2.0 redirect URI:** `https://crm.crm7.app/auth/xero/callback`
4. After creation, open the app's **Configuration** tab and confirm the following scopes are requested when the OAuth client requests consent (these are scopes the consumer app will request — not all need to be pre-approved on Xero's side, but document them here as the contract):
   - `accounting.contacts`
   - `accounting.transactions`
   - `accounting.settings.read`
   - `payroll.employees`
   - `payroll.payruns`
   - `offline_access`
5. From the **Configuration** tab, copy the **Client ID** and **Client Secret**. The client secret is shown ONCE — store immediately in a secure location (1Password / operator's vault) before navigating away.
6. Hand `client_id` and `client_secret` back to the agent session via the agreed secure channel (DO NOT paste raw secrets into chat — share the 1Password reference / secret-store path instead).

### What happens next (agent-executable, AFTER operator returns credentials)

The agent will:

- Write `VITE_XERO_CLIENT_ID=<client_id>` to **CRM7 Vercel** env (Production + Preview scopes) via `vercel env add`.
- Write `XERO_CLIENT_ID=<client_id>`, `XERO_CLIENT_SECRET=<client_secret>`, `XERO_REDIRECT_URI=https://crm.crm7.app/auth/xero/callback` to **Supabase secrets** (project `tuybltdrdefjblnplpqo`) via the Supabase MCP `secrets set` flow (or `supabase secrets set` CLI).
- Per-tenant `xero_integration` feature flag activation lives in CRM7 `tenant_settings` JSONB and is operator-toggled per customer at rollout time (separate concern from initial app registration).

**Dashboard URL:** https://developer.xero.com/myapps

**Screenshot reference:** `docs/operator-screenshots/xero-app-registration.png` (operator captures and commits after first registration so the next operator can verify the form fields visually).

### `verification_command`

Run **after** the agent has written the secrets (i.e., post-handoff back to the agent):

```bash
# 1. Confirm VITE_XERO_CLIENT_ID is set on CRM7 in both Production + Preview
vercel env ls --token=$VERCEL_TOKEN --scope=braden-pty-ltd \
  | grep VITE_XERO_CLIENT_ID
# Expected: a line showing "VITE_XERO_CLIENT_ID  Encrypted  Production, Preview"

# 2. Confirm Supabase has all three Xero edge-function secrets
supabase secrets list --project-ref tuybltdrdefjblnplpqo \
  | grep -E '^(XERO_CLIENT_ID|XERO_CLIENT_SECRET|XERO_REDIRECT_URI)\b'
# Expected: 3 lines, one for each secret name

# 3. End-to-end OAuth handshake smoke — should redirect to Xero (not 404)
curl -sI https://crm.crm7.app/auth/xero/connect | head -1
# Expected: HTTP/2 302  with Location header pointing to login.xero.com/identity/connect/authorize
```

If step 3 returns `404` instead of `302`, the consumer route `/auth/xero/connect` has not yet been wired in CRM7 — that is **Part O.2 implementation work** (the agent-executable 1-week task post-registration), tracked separately in `bsuite_backlog_2026_post_n`.

---

## Summary — Items Requiring Operator Action

| # | Item | Reason | ETA |
|---|------|--------|-----|
| 1 | OAUTH_STATE_SECRET + redeploy | Edge fn env vars not in MCP | ~5 min |
| 3b | TGA GUCs | Hosted Supabase tier blocks `ALTER DATABASE` | ~10 min (or Supabase support ticket) |
| 4 | TGA_SYNC_ENABLED flip | Requires sandbox dry-run | ~30 min including dry-run |
| 6 | Azure xms_edov claim | Entra portal interactive only | ~5 min |
| 7 | Remove `*.vercel.app` wildcards | Operator must review intent | ~5 min |
| 8 | Revoke HS256 Previous JWK | Dashboard-only, no API | ~2 min |
| 11 | Xero app registration (Part O.2) | developer.xero.com requires interactive sign-in | ~10 min |

**Items resolved this session:** 2 (migrations), 3a (pg_net install), 5 (skipped per plan), 9 (blocked on WS-I), 10 (auto-delete branches).

**Total operator time estimate:** ~70 minutes (was 60 min — +10 for Xero registration).

---

## Cross-Reference

- Original checklist source: memory key `bsuite_pending_actions` (2026-04-23).
- Replacement memory key written by this session: `bsuite_pending_actions` (2026-04-25), trimmed to operator-only items.
- Implementation context: `docs/plans/20260425-finish-line-session-refined.md` (parent monorepo).
- Throughput W4-TP deep-link target: `business-suite-unified/src/pages/Admin/TeamMembers.tsx` (created in WS-G, PR #192).
- **Xero (Item 11 / Part O.2) source:** memory key `bsuite_backlog_2026_post_n` (2026-04-22, "HUMAN-ACTION BLOCKERS" #1). Restored 2026-04-27 — see signoff doc §"Restoration Errata".
