# Item 1 — Azure `xms_edov` optional claim

**Verification date:** 2026-04-28
**Workstream:** WS-β (operator-item verification sweep)
**Status:** UNVERIFIABLE FROM AGENT — operator-only confirmation needed (but verification path is now precisely documented)

## Operator claim

Operator reported this item complete during 2026-04-25 + 2026-04-27 sessions.

## Verification attempted

### Path 1 — Microsoft Graph API (preferred)

Required endpoint:
```
GET https://graph.microsoft.com/v1.0/applications/{app-id}/optionalClaims/idToken
Authorization: Bearer <MS_GRAPH_TOKEN>
```

**App ID lookup:** The deployed `oauth-microsoft-email` edge function (version 26, deployed 2026-04-22) reads `MICROSOFT_CLIENT_ID` from Deno env. The Supabase project secrets list shows **no `MICROSOFT_CLIENT_ID`** — but `AZURE_CLIENT_ID` IS present (64-char HMAC-hashed value redacted by Management API). The Microsoft App Registration's app_id is the value of `AZURE_CLIENT_ID` (the deployed function's env-var name mismatch is a separate issue tracked under Item 3 concerns).

**Why the agent cannot run this:** The MCP tooling available in this session does not include Microsoft Graph. There is no service-to-service path to read App Registration optionalClaims without an interactive Global Admin Microsoft 365 sign-in.

### Path 2 — Live OAuth flow inspection

Trigger BSU's Microsoft OAuth at `https://suite.crm7.app/settings/integrations`, capture the returned `id_token`, base64-decode the middle segment, confirm `xms_edov` field present.

**Why the agent cannot run this:** Requires interactive Microsoft sign-in with a real Microsoft 365 user account inside a tenant whose admin has consented to the optional claim. No headless path. (Even with BrowserBase MCP available, completing Microsoft MFA is operator-only.)

## Operator runs locally to verify

```bash
# Step 1 — Get a Microsoft Graph token (one-time, interactive)
az login                                               # CLI sign-in
MS_GRAPH_TOKEN=$(az account get-access-token \
  --resource https://graph.microsoft.com \
  --query accessToken -o tsv)

# Step 2 — Look up the BSU Microsoft app's GUID
# (This is the value of AZURE_CLIENT_ID in Supabase secrets — pull it from
# 1Password or the Supabase dashboard; it's a UUID like 11111111-2222-...)
APP_ID=<paste-uuid-here>

# Step 3 — Read optionalClaims for ID tokens
curl -s "https://graph.microsoft.com/v1.0/applications/${APP_ID}/optionalClaims" \
  -H "Authorization: Bearer ${MS_GRAPH_TOKEN}" \
  | jq '.idToken'

# Expected output: an array containing
#   { "name": "xms_edov", "essential": false, "additionalProperties": [], "source": null }
```

If the array does NOT contain `xms_edov`, the claim was never enabled or was reverted. Re-add via:
- https://entra.microsoft.com → Identity → Applications → App registrations → select app → Token configuration → Add optional claim → ID → tick `xms_edov` → Add → grant Microsoft Graph `email` permission (admin consent).

## Outcome

**Verified status:** Cannot determine from MCP tooling. Operator will confirm with the curl above on next session.

**Best-effort indirect signal (NOT a verification):** Since the deployed `oauth-microsoft-email` v26 still uses the OLD `btoa(JSON.stringify(...))` state pattern and never inspects `id_token` claims, the absence of `xms_edov` in id_tokens would not surface as a runtime error today. Item 1 has no observable consumer wired in the deployed code, so even a successful Entra config change cannot be validated end-to-end until Item 3 (re-deploy edge fns with the HMAC-state branch + an `id_token` claim inspector) lands. **Items 1 and 3 are coupled.**

## Files inspected

- `/home/braden/Desktop/Dev/bsuite/business-suite-unified/supabase/functions/oauth-microsoft-email/index.ts` (local source — Phase 6.4 HMAC pattern)
- Deployed v26 source via `mcp__claude_ai_Supabase__get_edge_function` (still pre-Phase-6.4 — `btoa(JSON.stringify(...))`)
- Supabase project secrets list via Management API (`AZURE_CLIENT_ID` present, `MICROSOFT_CLIENT_ID` absent)
