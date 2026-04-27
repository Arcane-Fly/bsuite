# Item 3 — `OAUTH_STATE_SECRET` set + edge functions redeployed

**Verification date:** 2026-04-28
**Workstream:** WS-β (operator-item verification sweep)
**Status:** ❌ **VERIFIED INCOMPLETE — TWO INDEPENDENT BLOCKERS**

## Operator claim history

Item appeared on the original 10-item checklist (2026-04-23 memory `bsuite_pending_actions`). Carried forward as Item 1 in v1.00W handoff (2026-04-27). Operator has not explicitly reported it complete in chat, but it is on the current pending_actions list as still-todo.

## Verification commands

### A. Supabase project secrets — is `OAUTH_STATE_SECRET` present?

```bash
curl -s "https://api.supabase.com/v1/projects/tuybltdrdefjblnplpqo/secrets" \
  -H "Authorization: Bearer $SUPABASE_MCP_ACCESS_TOKEN" \
  | jq -r 'map(.name) | sort | .[]' | grep -i oauth_state
# Expected: OAUTH_STATE_SECRET line if set
```

**Result:** No output. Secret is **not set**.

### B. Deployed edge function code — does it reference the secret?

Deployed v26 of `oauth-microsoft-email` (deployed 2026-04-22, ezbr_sha256 `b9bd727b...e9930c`) inspected via `mcp__claude_ai_Supabase__get_edge_function`:

```typescript
// Deployed code (v26):
const state = btoa(
  JSON.stringify({
    user_id: userId,
    tenant_id,
    timestamp: Date.now(),
  })
);
// ... no signState / verifyState / OAUTH_STATE_SECRET reference anywhere
```

Same OLD pattern in deployed `oauth-google-email` v26 (ezbr_sha256 `974c55d9...17eb082`).

### C. Local source code — does it use HMAC pattern?

```bash
grep -n "signState\|verifyState\|OAUTH_STATE_SECRET" \
  /home/braden/Desktop/Dev/bsuite/business-suite-unified/supabase/functions/oauth-microsoft-email/index.ts \
  /home/braden/Desktop/Dev/bsuite/business-suite-unified/supabase/functions/oauth-google-email/index.ts
```

Output (truncated):

```
oauth-google-email/index.ts:5:    import { signState, verifyState } from "../_shared/oauth-state.ts";
oauth-google-email/index.ts:153:  // Phase 6.4: Sign state with HMAC-SHA256 (OAUTH_STATE_SECRET) to prevent
oauth-google-email/index.ts:155:  const state = await signState({
oauth-google-email/index.ts:195:  const verified = await verifyState(state);
oauth-microsoft-email/index.ts:5:    import { signState, verifyState } from "../_shared/oauth-state.ts";
oauth-microsoft-email/index.ts:147:  const state = await signState({
oauth-microsoft-email/index.ts:187:  const verified = await verifyState(state);
```

**Local source has the new HMAC pattern; deployed code does NOT.** Last deploy (2026-04-22) preceded the Phase 6.4 commit landing.

## Outcome

❌ **VERIFIED INCOMPLETE on TWO independent grounds:**

1. **Secret missing:** `OAUTH_STATE_SECRET` is not in Supabase project secrets (Management API confirmed).
2. **Code missing:** Deployed v26 edge fns don't reference `OAUTH_STATE_SECRET` at all — they use the old unsigned `btoa(JSON.stringify(...))` envelope. Even setting the secret would have no observable effect until the local source (Phase 6.4 HMAC branch) is redeployed.

**Both fixes are required.** Either alone is insufficient.

### Operator runs to fix

```bash
# 1. Generate + set the secret
supabase secrets set OAUTH_STATE_SECRET=$(openssl rand -hex 32) \
  --project-ref tuybltdrdefjblnplpqo

# 2. Redeploy both edge fns from the HMAC branch
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified
supabase functions deploy oauth-google-email --project-ref tuybltdrdefjblnplpqo
supabase functions deploy oauth-microsoft-email --project-ref tuybltdrdefjblnplpqo

# 3. Re-verify code is the new version
# (ezbr_sha256 should change from current 974c55d9.../b9bd727b...)
```

### Bonus secret-name discrepancy (operator decision needed)

Deployed v26 reads `MICROSOFT_CLIENT_ID` and `GOOGLE_EMAIL_CLIENT_ID` / `GOOGLE_EMAIL_CLIENT_SECRET`. The Supabase secrets list contains `AZURE_CLIENT_ID` and `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` instead. The function uses non-null assertions (`Deno.env.get("MICROSOFT_CLIENT_ID")!`) which would throw at runtime when the env var is undefined. Either:
- Microsoft + Google email OAuth flows are not actually working today (and no one's hitting that path enough to surface the error), OR
- The deployed v26 was built against a Supabase where those secret names existed and have since been renamed without redeploying.

**This is not a Phase 6.4 issue but is exposed during this verification.** Suggest operator confirm whether email-OAuth flows have been used recently. If used and broken, add `MICROSOFT_CLIENT_ID` / `GOOGLE_EMAIL_CLIENT_ID` / `GOOGLE_EMAIL_CLIENT_SECRET` aliases pointing at the existing values.

## Files inspected

- Deployed v26: `mcp__claude_ai_Supabase__get_edge_function(slug=oauth-google-email|oauth-microsoft-email)`
- Local source: `business-suite-unified/supabase/functions/oauth-{google,microsoft}-email/index.ts` + `_shared/oauth-state.ts`
- Supabase secrets: Management API `/v1/projects/tuybltdrdefjblnplpqo/secrets`

## Memory key written

`bsuite_oauth_state_secret_verified_incomplete` (PUT 2026-04-28).
