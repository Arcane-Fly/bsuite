# Item 2 — `*.vercel.app` wildcard redirect URI removal

**Verification date:** 2026-04-28
**Workstream:** WS-β (operator-item verification sweep)
**Status:** ✅ **VERIFIED COMPLETE**

## Operator claim

Operator reported this item complete during 2026-04-25 + 2026-04-27 sessions.

## Verification command

```bash
curl -s "https://api.supabase.com/v1/projects/tuybltdrdefjblnplpqo/config/auth" \
  -H "Authorization: Bearer $SUPABASE_MCP_ACCESS_TOKEN" \
  | jq '{site_url, uri_allow_list}'
```

## Evidence (captured 2026-04-28)

```json
{
  "site_url": "https://suite.crm7.app",
  "uri_allow_list": "https://www.braden.com.au/auth/callback,https://suite.crm7.app/auth/callback,http://localhost:*/**,https://suite.crm7.app/oauth/consent,https://crm.crm7.app/oauth/consent,https://r8.crm7.app/oauth/consent,https://ideas.crm7.app/oauth/consent"
}
```

Parsed entries (7 total):

| # | Entry | Wildcard? |
|---|---|---|
| 1 | `https://www.braden.com.au/auth/callback` | no |
| 2 | `https://suite.crm7.app/auth/callback` | no |
| 3 | `http://localhost:*/**` | localhost-only — acceptable |
| 4 | `https://suite.crm7.app/oauth/consent` | no |
| 5 | `https://crm.crm7.app/oauth/consent` | no |
| 6 | `https://r8.crm7.app/oauth/consent` | no |
| 7 | `https://ideas.crm7.app/oauth/consent` | no |

**Zero `*.vercel.app` wildcards present.** Localhost wildcard is intentional + acceptable for dev flows.

## Note on omission

The current allowlist does NOT include `https://crm.crm7.app/auth/callback`, `https://r8.crm7.app/auth/callback`, `https://ideas.crm7.app/auth/callback`, or any `https://conduit.crm7.app/...` entries. The 4 client apps (CRM7, R80.3, Throughput, Conduit) using BS OAuth 2.1 don't actually need to be in the Supabase URI allow_list because they exchange BS OAuth tokens (not Supabase native auth tokens). The allowlist is for Supabase native GoTrue redirects only — the consent screens at `/oauth/consent` cover the BSU server side. **Allowlist is correct as-is.**

## Outcome

✅ **VERIFIED COMPLETE** — operator action confirmed. Removed from v3.00W handoff doc.

## Memory key written

`bsuite_vercel_wildcard_redirects_removed_verified` (PUT 2026-04-28).
