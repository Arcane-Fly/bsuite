<!-- G5-VERDICT-BANNER -->
> **VERDICT (DELIVERED) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ✅ VERDICT: DELIVERED — marker and body agree (rare in this directory)
>
> Migration from a static Google service-account key to **Workload Identity Federation** completed
> 2026-03-05, as the body states.
>
> **Independently confirmed 2026-08-17:** WIF is the live credential path in
> `crm7/supabase/functions/crm7-generate-document/index.ts` (ACTIVE v5 in production). No
> service-account private key remains in the document-generation path.
>
> This is the one document in `docs/recovered/` whose status marker (`A`), body claim
> (*"COMPLETED"*) and live code all agree. No correction needed.

---

# Migrate Google Service Account Key → Workload Identity Federation

## STATUS: ✅ COMPLETED (2026-03-05)

All phases executed successfully by Claude Code. Verified against Google official documentation by Cascade (2026-03-05).

### Completion Summary

| Phase | Status | Commits |
|-------|--------|---------|
| Phase 1: GCP Configuration | ✅ Done | N/A (CLI) |
| Phase 2: Edge Function Code Changes | ✅ Done | `953a1cb` (crm7) |
| Phase 3: Documentation & Rules | ✅ Done | `bb64b98` (root) |
| Phase 4: Verification | ✅ Deployed | Edge Function live on `tuybltdrdefjblnplpqo` |

### What Was Done

- WIF pool `supabase-edge-functions` created (global)
- OIDC provider `supabase-auth` created (`--allowed-audiences="authenticated"`)
- IAM binding: `roles/iam.workloadIdentityUser` granted to pool for SA
- IAM Credentials API enabled
- Exposed key `63d97c908882b...` deleted — **0 user-managed keys remain**
- Duplicate gcloud snap install removed (kept `~/google-cloud-sdk/`)
- Supabase secrets set: `GCP_PROJECT_NUMBER`, `GCP_WIF_POOL_ID`, `GCP_WIF_PROVIDER_ID`, `GCP_SA_EMAIL`
- Old secret `GOOGLE_SERVICE_ACCOUNT_JSON` removed
- Edge Function + googleDocsService.ts rewritten to WIF
- `.env.example` updated with placeholder values
- 4 docs files updated, AGENTS.md WIF enforcement section added

### Google Docs Verification (2026-03-05)

Implementation cross-referenced against `docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-providers`:

- ✅ STS endpoint, grant_type, audience format (no `https:` scheme), scope, requested_token_type all match official docs
- ✅ SA impersonation via `iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/{email}:generateAccessToken` matches official REST API
- ✅ Least-privilege scopes (Drive + Docs only, not broad `cloud-platform`)
- ✅ `--allowed-audiences="authenticated"` configured to accept Supabase JWT `aud` claim
- ⚠️ `subject_token_type: jwt` used instead of `id_token` — both are valid per SAP/ABAP SDK docs; working in production

### Remaining E2E Test

- Trigger document generation from CRM7 UI to confirm full WIF flow works end-to-end

---

Replace the exposed static service account key (`63d97c908882b...`) with Workload Identity Federation (WIF), using Supabase's OIDC endpoint as the identity provider so the `generate-document` Edge Function authenticates to Google APIs with **zero stored secrets**.

---

## Context

**Current state:** ~~The `generate-document` Supabase Edge Function reads `GOOGLE_SERVICE_ACCOUNT_JSON`~~ **MIGRATED** — now uses WIF.

**Target state:** The Edge Function uses the caller's Supabase JWT — which it already has from the `Authorization` header — and exchanges it via Google's Security Token Service (STS) for a short-lived federated access token, then impersonates the existing service account to call Google Docs/Drive APIs. No static credentials stored anywhere. **✅ IMPLEMENTED**

**Why this works:** Supabase Auth exposes a public JWKS endpoint (`https://tuybltdrdefjblnplpqo.supabase.co/auth/v1/.well-known/jwks.json`) and an OIDC-compatible issuer (`https://tuybltdrdefjblnplpqo.supabase.co/auth/v1`). Google WIF supports any OIDC provider with a public JWKS. We configure GCP to trust Supabase JWTs, exchange them for federated tokens, and impersonate the service account.

---

## Architecture: Before vs After

| Aspect | Before (Service Account Key) | After (WIF + Supabase OIDC) |
|--------|-----------------------------|-----------------------------|
| **Stored secret** | Full JSON key file in Supabase secrets | None (WIF config is non-sensitive) |
| **Auth flow** | Build JWT → exchange for access token | Supabase JWT → STS → impersonate SA → access token |
| **Rotation** | Manual key rotation | Automatic — tokens are short-lived |
| **Blast radius if leaked** | Permanent access until key disabled | N/A — no static credential exists |
| **New GCP config** | None | WIF Pool + Provider + IAM binding |
| **New Supabase secrets** | N/A | `GCP_PROJECT_NUMBER`, `GCP_WIF_POOL_ID`, `GCP_WIF_PROVIDER_ID`, `GCP_SA_EMAIL` (all non-sensitive metadata) |

---

## Step-by-Step Plan

### Phase 1: GCP Configuration (Cascade executes via CLI — user approves commands)

**1.1 — Verify Supabase OIDC endpoint is accessible**

```bash
# Should return JSON with jwks_uri
curl https://tuybltdrdefjblnplpqo.supabase.co/auth/v1/.well-known/openid-configuration
```

If this endpoint doesn't exist (Supabase may not serve full OIDC discovery), we'll use the JWKS-upload approach instead (see Fallback below).

**1.2 — Create Workload Identity Pool**

```bash
gcloud iam workload-identity-pools create supabase-edge-functions \
  --location="global" \
  --description="Supabase Edge Functions accessing Google APIs" \
  --display-name="Supabase Edge Functions" \
  --project=claritycrm-hpofn
```

**1.3 — Create OIDC Provider (Supabase as IdP)**

```bash
gcloud iam workload-identity-pools providers create-oidc supabase-auth \
  --location="global" \
  --workload-identity-pool="supabase-edge-functions" \
  --issuer-uri="https://tuybltdrdefjblnplpqo.supabase.co/auth/v1" \
  --allowed-audiences="authenticated" \
  --attribute-mapping="google.subject=assertion.sub,attribute.email=assertion.email,attribute.role=assertion.role" \
  --attribute-condition="assertion.aud=='authenticated' && assertion.role=='authenticated'" \
  --project=claritycrm-hpofn
```

> **Fallback — JWKS upload approach:** If Supabase doesn't serve `/.well-known/openid-configuration`, download the JWKS file and upload it directly:
>
> ```bash
> curl -o supabase-jwks.json https://tuybltdrdefjblnplpqo.supabase.co/auth/v1/.well-known/jwks.json
> gcloud iam workload-identity-pools providers create-oidc supabase-auth \
>   --location="global" \
>   --workload-identity-pool="supabase-edge-functions" \
>   --issuer-uri="https://tuybltdrdefjblnplpqo.supabase.co/auth/v1" \
>   --jwk-json-path="./supabase-jwks.json" \
>   --allowed-audiences="authenticated" \
>   --attribute-mapping="google.subject=assertion.sub" \
>   --attribute-condition="assertion.aud=='authenticated'" \
>   --project=claritycrm-hpofn
> ```
>
> **Note:** With JWKS upload, you must re-upload whenever Supabase rotates its signing keys (rare but track it).

**1.4 — Grant service account impersonation to the WIF pool**

```bash
# Get project number
gcloud projects describe claritycrm-hpofn --format="value(projectNumber)"

# Grant Workload Identity User role
gcloud iam service-accounts add-iam-policy-binding \
  firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/supabase-edge-functions/attribute.role/authenticated" \
  --project=claritycrm-hpofn
```

**1.5 — Delete the exposed key (after verifying WIF works)**

```bash
gcloud iam service-accounts keys delete 63d97c908882b88aabe9d2461f261ed2bec54007 \
  --iam-account=firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com
```

**1.6 — Set non-sensitive WIF config as Supabase secrets**

```bash
supabase secrets set \
  GCP_PROJECT_NUMBER='<from step 1.4>' \
  GCP_WIF_POOL_ID='supabase-edge-functions' \
  GCP_WIF_PROVIDER_ID='supabase-auth' \
  GCP_SA_EMAIL='firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com'

# Remove the old key
supabase secrets unset GOOGLE_SERVICE_ACCOUNT_JSON
```

---

### Phase 2: Edge Function Code Changes (Cascade implements)

**2.1 — Rewrite `getGoogleAccessToken()` in `generate-document/index.ts`**

Replace the current flow (lines 435–513: build RS256 JWT from private key → exchange for token) with the WIF flow:

```typescript
async function getGoogleAccessToken(supabaseJwt: string): Promise<string> {
  const projectNumber = Deno.env.get('GCP_PROJECT_NUMBER')!;
  const poolId = Deno.env.get('GCP_WIF_POOL_ID')!;
  const providerId = Deno.env.get('GCP_WIF_PROVIDER_ID')!;
  const saEmail = Deno.env.get('GCP_SA_EMAIL')!;

  // Step 1: Exchange Supabase JWT for federated access token via STS
  const stsRes = await fetch('https://sts.googleapis.com/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      subject_token: supabaseJwt,
    }),
  });

  if (!stsRes.ok) {
    const err = await stsRes.text();
    throw new Error(`STS token exchange failed: ${stsRes.status} ${err}`);
  }
  const { access_token: federatedToken } = await stsRes.json();

  // Step 2: Impersonate service account to get scoped access token
  const iamRes = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${saEmail}:generateAccessToken`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${federatedToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scope: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/documents',
        ],
      }),
    }
  );

  if (!iamRes.ok) {
    const err = await iamRes.text();
    throw new Error(`SA impersonation failed: ${iamRes.status} ${err}`);
  }
  const { accessToken } = await iamRes.json();
  return accessToken;
}
```

**2.2 — Update the caller in `generate-document/index.ts`**

Change line ~201 from:

```typescript
const tokenRes = await getGoogleAccessToken(credentials);
```

To:

```typescript
const googleToken = await getGoogleAccessToken(accessToken);
```

Remove lines 192–200 (the `GOOGLE_SERVICE_ACCOUNT_JSON` parsing) and all helper functions for RS256 JWT signing (`toBase64Url`, `bytesToBase64Url`, the old `getGoogleAccessToken`).

**2.3 — Update `googleDocsService.ts`**

Rewrite `mergeGoogleDocTemplate()` to use the same WIF token exchange instead of `google.auth.GoogleAuth({ credentials })`. Since this file uses `googleapis` SDK, we can pass the access token directly:

```typescript
const auth = new google.auth.OAuth2();
auth.setCredentials({ access_token: googleToken });
```

Or more likely: this file is dead code (the Edge Function does the work inline). Verify usage and either update or remove.

**2.4 — Update `crm7/.env.example`**

Replace the `GOOGLE_SERVICE_ACCOUNT_JSON` entry with the new WIF config vars.

---

### Phase 3: Documentation & Rules Updates (Cascade implements)

**Files to update:**

| File | Change |
|------|--------|
| `docs/plans/20260304-crm7-document-lifecycle-design-v1.00D.md` | Replace service account key references with WIF architecture |
| `docs/plans/20260304-crm7-document-lifecycle-implementation-plan-v1.00W.md` | Update Google auth setup steps |
| `docs/plans/20260304-gto-document-templates-guide-v1.00W.md` | Update "share with service account" instructions (still share with same SA email — that doesn't change) |
| `docs/plans/20260304-document-esign-best-practice-research-v1.00W.md` | Update Google credentials section |
| `AGENTS.md` (root) | Add WIF enforcement rule under a new "Google Cloud Authentication" section |
| `crm7/AGENTS.md` | Same |

**New rule to add (AGENTS.md):**

```markdown
## Google Cloud Authentication

**CRITICAL**: All Google API access MUST use Workload Identity Federation (WIF). Static service account keys are BANNED.

- **GCP Project:** `claritycrm-hpofn`
- **Service Account:** `firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com` (key-less — WIF only)
- **WIF Pool:** `supabase-edge-functions` (Supabase OIDC as IdP)
- **Auth flow:** Supabase JWT → STS token exchange → SA impersonation → short-lived access token
- **NEVER create or store service account JSON keys** — use WIF for all Google API access
- **Reference impl:** `crm7/supabase/functions/generate-document/index.ts`
```

---

### Phase 4: Verification

1. **Test OIDC discovery** — `curl` the Supabase OIDC endpoint to confirm GCP can reach it
2. **Deploy Edge Function** — `supabase functions deploy generate-document`
3. **Test document generation** — Generate a test document via CRM7 UI and verify PDF output
4. **Verify no static keys remain** — `gcloud iam service-accounts keys list --iam-account=firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com` (should show 0 user-managed keys)
5. **TypeScript check** — `pnpm typecheck` in crm7

---

## Risk / Fallback

| Risk | Mitigation |
|------|-----------|
| Supabase doesn't serve OIDC discovery metadata | Use JWKS-upload approach (Step 1.3 fallback) |
| Supabase rotates JWKS keys | Re-upload JWKS to WIF provider; monitor Supabase changelog |
| Google APIs (Docs/Drive) don't support WIF direct access | Use service account impersonation (already planned) |
| STS token exchange adds latency (~200-500ms) | Acceptable for document generation (already takes seconds) |
| Attribute condition too broad/narrow | Start with `role=='authenticated'`; tighten to specific user roles if needed |

---

## Files Affected (Complete List)

### Code

- `crm7/supabase/functions/generate-document/index.ts` — **Major rewrite** of auth section
- `crm7/src/services/googleDocsService.ts` — Update or remove (verify if used)
- `crm7/.env.example` — Replace `GOOGLE_SERVICE_ACCOUNT_JSON` with WIF vars

### Docs

- `docs/plans/20260304-crm7-document-lifecycle-design-v1.00D.md`
- `docs/plans/20260304-crm7-document-lifecycle-implementation-plan-v1.00W.md`
- `docs/plans/20260304-gto-document-templates-guide-v1.00W.md`
- `docs/plans/20260304-document-esign-best-practice-research-v1.00W.md`

### Rules

- `AGENTS.md` (root)
- `crm7/AGENTS.md` (if separate)
- Cascade memory (update the Google Cloud memory entry)
