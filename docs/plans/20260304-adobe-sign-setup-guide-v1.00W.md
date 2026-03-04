# Adobe Acrobat Sign API Setup Guide — CRM7 Document Lifecycle

**Date:** 2026-03-04
**Status:** v1.00W (Working)
**Project:** CRM7 Document Lifecycle System
**Author:** Windsurf review

---

## 1. Account Requirements

### Minimum Plan

**Adobe Acrobat Sign Enterprise** or **Developer** subscription is required for API access.

| Plan | API Access | Integration Key | Webhooks | Price |
|------|-----------|----------------|----------|-------|
| Acrobat Standard ($12.99/mo) | No | No | No | Per user |
| Acrobat Pro ($19.99/mo) | No | No | No | Per user |
| Acrobat Pro Teams ($23.99/mo) | No | No | No | Per user |
| **Acrobat Sign Enterprise** | Yes | Yes | Yes | Contact sales |
| **Developer (free trial)** | Yes | Yes | Yes | Free (limited) |

Start with a free Adobe Sign Developer account for development/testing, then upgrade to Enterprise for production.

### Sign Up

- **Developer account:** <https://www.adobe.com/acrobat/business/developer-form.html>
- **Enterprise:** Contact Adobe sales

### Current Documentation URLs (verified March 2026)

| Resource | URL |
|----------|-----|
| Developer portal | <https://developer.adobe.com/acrobat-sign/> |
| Developer guide | <https://developer.adobe.com/acrobat-sign/docs/overview/developer_guide/> |
| Application quickstart | <https://developer.adobe.com/acrobat-sign/docs/overview/developer_guide/gstarted> |
| REST API v6 reference | <https://secure.na1.adobesign.com/public/docs/restapi/v6> |
| Webhook & event reference | <https://developer.adobe.com/acrobat-sign/docs/overview/acrobat_sign_events/> |
| Embed partner guide | <https://developer.adobe.com/acrobat-sign/docs/overview/embedpartner/> |
| SDKs | <https://developer.adobe.com/acrobat-sign/docs/overview/sdks/> |
| Postman collection | <https://www.postman.com/adobe/adobe-acrobat-sign/overview> |
| Release notes | <https://developer.adobe.com/acrobat-sign/docs/overview/releasenotes/> |

**Dead URLs** (do not use):

- `https://www.adobe.io/apis/documentcloud/sign/docs.html` — redirects/times out
- `https://opensource.adobe.com/acrobat-sign/developer_guide/*` — legacy, use `developer.adobe.com` instead

---

## 2. API Shard Discovery (CRITICAL)

### Current Code Issue

The code hardcodes `na4` shard:

```typescript
const ADOBE_BASE_URL = 'https://api.na4.adobesign.com/api/rest/v6';
```

Adobe Sign has multiple data center shards (na1, na2, na3, na4, eu1, eu2, jp1, au1, in1). Your account is assigned to ONE shard at creation. Using the wrong shard returns auth errors.

### Correct Approach: Dynamic Shard Discovery

Call `GET /baseUris` to discover your API access point:

```bash
curl -X GET "https://api.na4.adobesign.com/api/rest/v6/baseUris" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Response:

```json
{
  "apiAccessPoint": "https://api.na4.adobesign.com/",
  "webAccessPoint": "https://na4.adobesign.com/"
}
```

### Fix Required

Store the shard as an env var after initial discovery:

```
ADOBE_SIGN_SHARD=na4
```

Or store the full base URL:

```
ADOBE_SIGN_BASE_URL=https://api.na4.adobesign.com/api/rest/v6
```

### How to Find Your Shard

1. Log into Adobe Sign web UI
2. Look at the URL — e.g., `https://na4.adobesign.com/` means shard is `na4`
3. Or call `GET /baseUris` with your token

---

## 3. Authentication — Integration Key vs OAuth

### Option A: Integration Key (Recommended for Server-to-Server)

An Integration Key is a long-lived access token that does not expire. Simplest option for Supabase Edge Functions.

#### How to Create

1. Log into Adobe Sign as an **admin**
2. Navigate to: **Account > Adobe Sign API > API Information > Integration Key**
3. Click **Create Integration Key**
4. Name it: `crm7-document-lifecycle`
5. Select required scopes:
   - `agreement_write:account` — create agreements
   - `agreement_read:account` — read agreement status, signing URLs, download docs
   - `webhook_read:account` — read webhook config
   - `webhook_write:account` — create webhooks
   - `webhook_retention:account` — webhook data retention
6. Click **Save** — key is displayed ONCE. Copy immediately.
7. Store as `ADOBE_SIGN_ACCESS_TOKEN` in Supabase secrets

#### Integration Key vs OAuth

| | Integration Key | OAuth 2.0 |
|---|---|---|
| Lifetime | Never expires | Access: 1 hour, Refresh: 60 days inactive |
| Rotation | Manual revoke + recreate | Automatic via refresh |
| Setup | 1 step | Multi-step OAuth flow |
| Best for | Server-to-server (Edge Functions) | User-facing apps |

### Option B: OAuth 2.0

Not recommended for current architecture. Edge Functions act as system-level service, not on behalf of individual Adobe Sign users. If needed in future, implement token refresh (access tokens expire after 1 hour; refresh tokens after 60 days of inactivity).

---

## 4. Application Registration (for Client ID)

The webhook verification uses `ADOBE_SIGN_CLIENT_ID`. This comes from registering an Application:

1. Log into Adobe Sign as admin
2. Navigate to: **Account > Adobe Sign API > API Applications**
3. Click **+** to create a new application
4. Fill in:
   - **Name:** `CRM7 Document Lifecycle`
   - **Display Name:** `CRM7`
   - **Domain:** `crm7.app`
5. Click **Save**
6. Note the **Application ID** — this is your `ADOBE_SIGN_CLIENT_ID`
7. Configure OAuth (click app name > Configure OAuth):
   - Set redirect URI: `https://crm.crm7.app/auth/adobe-callback` (if using OAuth)
   - Select scopes (same as Integration Key scopes above)

Store the Application ID as `ADOBE_SIGN_CLIENT_ID` in Supabase secrets.

---

## 5. Webhook Registration

### Prerequisites

- Application registered (step 4)
- Edge Function deployed: `supabase functions deploy adobe-sign-webhook`
- Function URL: `https://tuybltdrdefjblnplpqo.supabase.co/functions/v1/adobe-sign-webhook`

### Register via API

```bash
curl -X POST "https://api.<SHARD>.adobesign.com/api/rest/v6/webhooks" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CRM7 Document Signing Webhook",
    "scope": "ACCOUNT",
    "state": "ACTIVE",
    "webhookSubscriptionEvents": [
      "AGREEMENT_ACTION_COMPLETED"
    ],
    "webhookUrlInfo": {
      "url": "https://tuybltdrdefjblnplpqo.supabase.co/functions/v1/adobe-sign-webhook"
    },
    "applicationId": "<YOUR_APPLICATION_ID>",
    "applicationDisplayName": "CRM7"
  }'
```

### Verification Flow

When registering, Adobe Sign sends a GET request to your webhook URL with header `X-AdobeSign-ClientId`. Your endpoint must echo it back:

```json
{ "xAdobeSignClientId": "<the-client-id-from-header>" }
```

Current code handles this correctly.

### Register via UI (Alternative)

1. Adobe Sign admin > **Account > Webhooks**
2. Click **+** to create
3. Set URL to the Edge Function URL
4. Select events: `AGREEMENT_ACTION_COMPLETED`
5. Set scope: Account
6. Save — Adobe verifies the endpoint via GET

---

## 6. Environment Variables

Set these on Supabase Edge Functions:

```bash
supabase secrets set ADOBE_SIGN_ACCESS_TOKEN="3AAABLblqZhB...your-integration-key"
supabase secrets set ADOBE_SIGN_CLIENT_ID="CBJCHBCAABAAp...your-application-id"
```

Available in Edge Functions via `Deno.env.get()`.

---

## 7. API Endpoints Used by CRM7

| Endpoint | Method | Purpose | File |
|----------|--------|---------|------|
| `/transientDocuments` | POST | Upload PDF for signing | `adobeSignService.ts` |
| `/agreements` | POST | Create signing agreement | `adobeSignService.ts` |
| `/agreements/{id}/signingUrls` | GET | Get embedded signing URL | `adobeSignService.ts` |
| `/agreements/{id}/combinedDocument` | GET | Download signed PDF | `adobeSignService.ts` + webhook |

### Required OAuth Scopes

| Scope | Needed For |
|-------|-----------|
| `agreement_write:account` | Create agreements, upload transient docs |
| `agreement_read:account` | Get signing URLs, download documents |
| `webhook_write:account` | Register webhooks |
| `webhook_read:account` | List/manage webhooks |

---

## 8. Testing Checklist

- [ ] Verify your shard: log into Adobe Sign web UI, check URL
- [ ] Create Integration Key with correct scopes
- [ ] Register Application, note Client ID
- [ ] Test `GET /baseUris` returns correct `apiAccessPoint`
- [ ] Test `POST /transientDocuments` with a sample PDF
- [ ] Test `POST /agreements` with a transient doc ID
- [ ] Test `GET /agreements/{id}/signingUrls` returns signing URL
- [ ] Complete signing via the URL
- [ ] Verify webhook receives `AGREEMENT_ACTION_COMPLETED` event
- [ ] Test `GET /agreements/{id}/combinedDocument` downloads signed PDF
- [ ] Deploy Edge Function: `supabase functions deploy adobe-sign-webhook`
- [ ] Register webhook via API or UI
- [ ] Verify GET verification passes (echoes client ID)
- [ ] Send test agreement and complete signing
- [ ] Verify webhook updates `document_records` + `document_signatories`
- [ ] Verify signed PDF uploaded to Supabase Storage

---

## 9. Known Issues in Current Implementation

### CRITICAL: Hardcoded Shard (na4)

Both `adobeSignService.ts` and `adobe-sign-webhook/index.ts` hardcode `https://api.na4.adobesign.com/api/rest/v6`. If your account is on a different shard, all API calls will fail with auth errors.

**Fix:** Make base URL configurable via `ADOBE_SIGN_BASE_URL` env var.

### HIGH: No Token Refresh Logic

If using OAuth, access tokens expire after 1 hour. Current code has no refresh mechanism.

**Mitigation:** Use Integration Key (never expires). This is recommended for Edge Functions.

### MEDIUM: Webhook Client ID Check is Correct

The webhook verifies `x-adobesign-clientid` header. Adobe Sign v6 does NOT support HMAC signature verification on webhook payloads. Client ID check is the official and only verification method per Adobe docs.

**Status:** Current implementation is correct.

### LOW: No Idempotency on Webhook Processing

Adobe Sign may retry webhook delivery. Current webhook does not check for duplicate events. Mitigated by Supabase Storage `upsert: true` for PDF upload.

---

## 10. Production Readiness Checklist

- [ ] Enterprise subscription active
- [ ] Integration Key created with correct scopes, stored in Supabase secrets
- [ ] Application registered, Client ID stored in Supabase secrets
- [ ] Shard verified and base URL configured (not hardcoded)
- [ ] Webhook registered and verified
- [ ] Edge Functions deployed (`generate-document` + `adobe-sign-webhook`)
- [ ] Test end-to-end: generate doc > send for signing > complete > webhook fires > signed PDF stored
- [ ] Monitor Adobe Sign webhook dashboard for delivery failures/retries
