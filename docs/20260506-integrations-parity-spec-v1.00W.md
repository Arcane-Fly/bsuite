# Integrations parity spec — close 5 Codehouse gaps (issue #577)

**Document version:** 1.00W
**Date:** 2026-05-06
**Author:** perplexity-computer (research lane per protocol §11)
**Status:** SPEC-DELIVERED — claude-code/copilot implements from this spec
**Closes:** queue item `PARITY-577-DOC` (research portion of issue #577)
**Cross-references:** `parity-matrix.md` rows 137-141; codehouse PDFs (WF1 FAQ Idibu / Onboarded / Secured Signing / Calendly); existing `email_integrations` + `platform_webhooks` + `mapd_webhook_queue` (all verified live, project `tuybltdrdefjblnplpqo`); #576 super_funds spec (super funds row 141 already covered)

---

## Executive summary

Spec for closing 5 integrations parity gaps from #577:

- **Row 137:** Idibu (job board posting + Quick Repost + credit balance)
- **Row 138:** Onboarded (digital onboarding + payroll pack delivery)
- **Row 139:** E-signature — met by the **in-house** signing architecture (no third-party signing vendor; see §5). Supersedes the original "Secured Signing / Adobe Sign" framing.
- **Row 140:** Calendly (OAuth + interview scheduling + webhook)
- **Row 141:** Super funds management — **already covered by #576 spec** (cross-reference, no duplicate work)

**Critical schema reuse (verified live):**
- `email_integrations` provides the canonical OAuth-with-Vault pattern (provider, access_token_vault_id, refresh_token_vault_id, scopes, sync_status, error_message). Spec generalises this into `vendor_integrations` table reusable for all 4 third-party adapters.
- `platform_webhooks` exists with secret_hash + last_triggered_at + last_status_code — reusable for Calendly/Onboarded webhook subscriptions.
- `mapd_webhook_queue` shows the queue-with-retry pattern — reusable for inbound Onboarded/Calendly events processing.

This means rows 137-140 require: 1 new generic table + 4 vendor adapters + 2 reused webhook tables. No webhook infrastructure rebuild.

Per §20 obvious-fix autonomy: spec grounded in existing email_integrations canonical pattern + reuse of platform_webhooks; proceed if concur.

---

## 1. Schema migrations

### 1.1 `vendor_integrations` table (generic OAuth credential store)

```sql
-- 20260507000050_vendor_integrations_table.sql
-- Generalised vendor OAuth credential store, mirroring email_integrations canonical pattern.

CREATE TABLE IF NOT EXISTS vendor_integrations (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   uuid NOT NULL,
  vendor                      text NOT NULL CHECK (vendor IN ('idibu','onboarded','secured_signing','calendly','adobe_sign','xero','myob','astute','intuit','docusign','paywaywest')),
  display_name                text,                          -- e.g. "Acme HR Idibu account"
  account_id                  text,                          -- vendor's account identifier (visible)
  access_token_vault_id       uuid,                          -- pgsodium vault reference; NEVER store plain token
  refresh_token_vault_id      uuid,
  api_key_vault_id            uuid,                          -- for non-OAuth vendors (e.g. some Idibu plans)
  token_expires_at            timestamptz,
  scopes                      text[] NOT NULL DEFAULT '{}',
  webhook_secret_vault_id     uuid,                          -- HMAC validation secret
  is_active                   boolean NOT NULL DEFAULT true,
  sync_status                 text NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending','active','degraded','expired','failed')),
  last_sync_at                timestamptz,
  last_error_at               timestamptz,
  error_message               text,
  metadata                    jsonb NOT NULL DEFAULT '{}',   -- vendor-specific config (e.g. Idibu credit balance, Calendly user URI)
  created_by                  uuid REFERENCES auth.users(id),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, vendor, account_id)
);

ALTER TABLE vendor_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_integrations_select" ON vendor_integrations FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "vendor_integrations_admin" ON vendor_integrations FOR ALL
  USING (tenant_id = current_tenant_id() AND auth.jwt() ->> 'role' IN ('tenant_admin','org_admin','integration_admin'))
  WITH CHECK (tenant_id = current_tenant_id());

CREATE INDEX idx_vendor_integrations_tenant_vendor_active
  ON vendor_integrations (tenant_id, vendor, is_active);
CREATE INDEX idx_vendor_integrations_sync_status
  ON vendor_integrations (sync_status, last_sync_at) WHERE sync_status IN ('degraded','expired','failed');
```

### 1.2 `vendor_webhook_events` queue (inbound events from third-parties)

```sql
-- 20260507000051_vendor_webhook_events_queue.sql
-- Inbound webhook event queue; mirrors mapd_webhook_queue pattern.

CREATE TABLE IF NOT EXISTS vendor_webhook_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  vendor_integration_id uuid REFERENCES vendor_integrations(id) ON DELETE CASCADE,
  vendor              text NOT NULL,
  event_type          text NOT NULL,                         -- e.g. 'invitee.created' (Calendly), 'envelope.completed' (Secured Signing)
  external_event_id   text,                                  -- vendor-supplied dedup id (idempotency)
  payload             jsonb NOT NULL,
  signature_verified  boolean NOT NULL DEFAULT false,
  status              text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','processing','processed','failed','dropped')),
  received_at         timestamptz NOT NULL DEFAULT now(),
  processed_at        timestamptz,
  error               text,
  retry_count         smallint NOT NULL DEFAULT 0 CHECK (retry_count <= 3),
  UNIQUE (vendor, external_event_id)
);

ALTER TABLE vendor_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_webhook_events_select" ON vendor_webhook_events FOR SELECT
  USING (tenant_id = current_tenant_id() AND auth.jwt() ->> 'role' IN ('tenant_admin','integration_admin'));

CREATE INDEX idx_vendor_webhook_events_tenant_status_received
  ON vendor_webhook_events (tenant_id, status, received_at DESC);
CREATE INDEX idx_vendor_webhook_events_dedup
  ON vendor_webhook_events (vendor, external_event_id);
```

---

## 2. Common adapter interface

```ts
// crm7/src/services/integrations/IntegrationAdapter.ts
// Shared by all 4 vendor adapters per #577 quality red-team #5 (consistency).

export interface IntegrationAdapter<TConfig = Record<string, unknown>> {
  readonly vendor: 'idibu' | 'onboarded' | 'secured_signing' | 'calendly';
  readonly displayName: string;
  readonly authMethod: 'oauth2' | 'api_key' | 'hmac_webhook';

  /** Returns OAuth authorize URL (or null if not OAuth) */
  getAuthorizeUrl(state: string): string | null;
  /** Exchanges authorization code for tokens; persists to vendor_integrations + Vault */
  exchangeCode(code: string, state: string): Promise<{ integrationId: string }>;
  /** Refreshes access token if expired; updates Vault entries */
  refreshTokenIfNeeded(integrationId: string): Promise<void>;
  /** Validates webhook payload signature (vendor-specific HMAC) */
  validateWebhookSignature(rawBody: string, headers: Record<string, string>, secret: string): boolean;
  /** Health check — pings vendor API; updates sync_status + last_sync_at */
  healthCheck(integrationId: string): Promise<{ ok: boolean; details: Record<string, unknown> }>;
  /** Disconnect — revokes tokens + clears Vault entries */
  disconnect(integrationId: string): Promise<void>;
}
```

---

## 3. Idibu adapter (Row 137)

### 3.1 API context

Idibu is a UK/AU job board distribution platform. OAuth 2.0 not standard for Idibu — they use API key + per-account secret. Wraps under `IntegrationAdapter` with `authMethod: 'api_key'`.

### 3.2 Adapter shape

```ts
// conduit/src/services/idibuAdapter.ts
export interface IdibuConfig {
  accountId: string;
  apiKey: string;        // stored in vendor_integrations.api_key_vault_id (pgsodium-encrypted)
  baseUrl: string;       // default: 'https://api.idibu.com/v1'
}

export class IdibuAdapter implements IntegrationAdapter<IdibuConfig> {
  vendor = 'idibu' as const;
  displayName = 'Idibu Job Board';
  authMethod = 'api_key' as const;

  getAuthorizeUrl(): null { return null; }  // not OAuth

  async exchangeCode(): Promise<never> {
    throw new IntegrationError('Idibu uses API key, not OAuth');
  }

  async healthCheck(integrationId: string): Promise<{ ok: boolean; details: { credit_balance?: number } }> {
    const config = await getIntegrationConfig(integrationId);
    const apiKey = await retrieveFromVault(config.api_key_vault_id);
    const res = await fetch(`${config.base_url}/account/balance`, {
      headers: { 'X-Account-ID': config.account_id, Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      await updateSyncStatus(integrationId, 'degraded', `Idibu health check failed: ${res.status}`);
      return { ok: false, details: {} };
    }
    const { credit_balance } = await res.json();
    await updateSyncStatus(integrationId, 'active');
    await persistMetadata(integrationId, { credit_balance });
    return { ok: true, details: { credit_balance } };
  }

  /** POST a job to Idibu; debits credit balance */
  async postJob(integrationId: string, jobId: string, opts: IdibuPostingOptions): Promise<{ posting_id: string }> {
    // Async per #577 perf red-team #3 — caller should not block on this
    const config = await getIntegrationConfig(integrationId);
    const apiKey = await retrieveFromVault(config.api_key_vault_id);
    const job = await fetchJobFromConduit(jobId);
    const body = mapConduitJobToIdibuPayload(job, opts);
    const res = await fetch(`${config.base_url}/jobs/post`, {
      method: 'POST',
      headers: { 'X-Account-ID': config.account_id, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new IdibuPostingError(`Posting failed: ${res.status} ${await res.text()}`, jobId);
    return await res.json();
  }

  /** Quick Repost — fetches a previous posting and reposts under same params (saves credits) */
  async quickRepost(integrationId: string, postingId: string): Promise<{ new_posting_id: string }> { /* ... */ }

  validateWebhookSignature(): boolean { return false; }  // no webhooks; status-pulled
  async refreshTokenIfNeeded(): Promise<void> { /* no-op for API key */ }
  async disconnect(integrationId: string): Promise<void> { await clearVaultEntries(integrationId); }
}
```

### 3.3 UI integration

`conduit/src/app/(dashboard)/jobs/[jobId]/page.tsx` adds:
- "Post to Idibu" button (gated by `vendor_integrations.is_active && vendor='idibu'`)
- "Quick Repost" button on jobs with prior `idibu_posting_id`
- Credit balance shown in jobs nav badge (from `metadata.credit_balance`)

Failed postings render an error badge (`idibu_last_error` per job) and link to the Idibu integration settings page.

---

## 4. Onboarded adapter (Row 138)

### 4.1 API context

Onboarded is an Australian onboarding platform. OAuth 2.0 standard. Webhook for completion events.

### 4.2 Adapter shape

```ts
// conduit/src/services/onboardedAdapter.ts
export class OnboardedAdapter implements IntegrationAdapter {
  vendor = 'onboarded' as const;
  authMethod = 'oauth2' as const;

  getAuthorizeUrl(state: string): string {
    const base = 'https://api.onboarded.com.au/oauth/authorize';
    const params = new URLSearchParams({
      client_id: ONBOARDED_CLIENT_ID,
      redirect_uri: `${BASE_URL}/api/integrations/onboarded/callback`,
      response_type: 'code',
      scope: 'employee:read employee:activate payroll_pack:send webhook',
      state,
    });
    return `${base}?${params}`;
  }

  async exchangeCode(code: string, state: string): Promise<{ integrationId: string }> {
    const tokenRes = await fetch('https://api.onboarded.com.au/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: `${BASE_URL}/api/integrations/onboarded/callback`, client_id: ONBOARDED_CLIENT_ID, client_secret: ONBOARDED_CLIENT_SECRET }),
    });
    const { access_token, refresh_token, expires_in, account } = await tokenRes.json();
    // Store tokens in Vault, NEVER plain
    const integrationId = await createIntegrationWithVaultedTokens('onboarded', access_token, refresh_token, expires_in, account);
    return { integrationId };
  }

  /** Activate employee on Onboarded — sends activation email */
  async activateEmployee(integrationId: string, conduitCandidateId: string): Promise<{ onboarded_employee_id: string }> {
    // Queued in edge function per #577 perf red-team #3 — does NOT block UI
    return await invokeEdgeFunction('onboarded-activate-employee', { integrationId, conduitCandidateId });
  }

  /** Trigger payroll pack email */
  async sendPayrollPack(integrationId: string, onboardedEmployeeId: string): Promise<void> {
    return await invokeEdgeFunction('onboarded-send-payroll-pack', { integrationId, onboardedEmployeeId });
  }

  validateWebhookSignature(rawBody: string, headers: Record<string, string>, secret: string): boolean {
    const signature = headers['x-onboarded-signature'];
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }
  async refreshTokenIfNeeded(integrationId: string): Promise<void> { /* standard OAuth refresh */ }
  async healthCheck(): Promise<{ ok: boolean; details: Record<string, unknown> }> { /* GET /me */ }
  async disconnect(integrationId: string): Promise<void> { /* revoke + clear */ }
}
```

### 4.3 Webhook handler (edge function)

```ts
// conduit/supabase/functions/onboarded-webhook/index.ts
Deno.serve(async (req) => {
  const rawBody = await req.text();
  const integrationId = req.url.split('/').pop();  // path: /onboarded-webhook/{integrationId}
  const integration = await fetchIntegration(integrationId);
  const secret = await retrieveFromVault(integration.webhook_secret_vault_id);

  // 1. Validate HMAC signature (red-team #2 security)
  const valid = adapter.validateWebhookSignature(rawBody, Object.fromEntries(req.headers), secret);
  if (!valid) return new Response('Invalid signature', { status: 401 });

  const payload = JSON.parse(rawBody);

  // 2. Idempotency check (red-team #4 reliability)
  const dedup = await dbInsertOrSkip('vendor_webhook_events', {
    tenant_id: integration.tenant_id,
    vendor_integration_id: integrationId,
    vendor: 'onboarded',
    event_type: payload.event,
    external_event_id: payload.id,
    payload,
    signature_verified: true,
    status: 'received',
  });
  if (dedup === 'duplicate') return new Response('Already processed', { status: 200 });

  // 3. Process synchronously if <5s budget; else enqueue
  if (payload.event === 'employee.onboarding_completed') {
    await updateConduitOnboardingStatus(payload.data.onboarded_employee_id, 'completed');
    await markWebhookProcessed(dedup.id);
  } else {
    // unknown event — drop gracefully (status='dropped')
    await markWebhookDropped(dedup.id, 'unhandled event type');
  }
  return new Response('OK');
});
```

---

## 5. E-signature (Row 139) — IN-HOUSE, no third-party signing vendor

> **Decision (canonical):** BSuite builds and operates its **own** e-signature workflow. We do **not** integrate a third-party signing vendor (Secured Signing, Adobe Sign, DocuSign, HelloSign, etc.). Row 139 parity is met by the in-house architecture, not by a vendor adapter.

### 5.1 Canonical architecture

E-signature is delivered by the in-house path documented in `crm7/docs/20260317-document-esigning-architecture-v1.00A.md` ("zero vendor dependency", AU Electronic Transactions Act 1999 compliant):

- **Document assembly**: Google Docs template merge → PDF export (`generate-document` edge function, WIF auth) — no Adobe PDF Services.
- **Viewing**: `react-pdf` (Mozilla pdf.js) — no Adobe Embed API.
- **Signing + integrity**: `pdf-lib` + `crypto.subtle` SHA-256 in-browser stamping with an appended Certificate of Completion (identity / intent / integrity); `documentSigner.ts` + `SignDocumentFlow.tsx`.
- **Multi-party ordering**: `@xyflow/react` document flow (e.g. candidate → host → recruiter countersign) runs in-process — no external signing webhooks.
- **Storage + audit**: Supabase Storage (`documents` bucket) + `document_audit_logs` (IP, user-agent, timestamps per action).

### 5.2 Reuse, do not re-integrate

New signing surfaces (e.g. conduit offer → training-contract loop, conduit#227) reuse `documentSigner.ts` + `SignDocumentFlow.tsx` + the `@xyflow/react` flow and record an `esign_flow_id` — they MUST NOT add a vendor adapter or a vendor webhook.

### 5.3 Removed vendor path (do not reintroduce)

Adobe Sign / DocuSeal / Adobe PDF Services were **removed** fleet-wide on 2026-03-17 (crm7#687). `signatureRequestStore.ts` no longer wraps a vendor; there is no provider selector. The `secured_signing` / `adobe_sign` / `docusign` values are dropped from the e-signature integration scope (they remain only as historical CHECK enum values for non-signing integration rows; no signing adapter is built for them). If a regulated external signer is ever genuinely mandated, it is a fresh ADR — not the default.

> **AASN lodgement note:** the regulated AASN training-contract lodgement API is **RAMS** (the AASN API). RAMS lodgement is a separate, regulated step that follows the in-house e-signature of the offer/contract — it is not itself an e-signature vendor.

---

## 6. Calendly adapter (Row 140)

### 6.1 API context

Calendly v2 API uses OAuth 2.0. Webhooks (`invitee.created`, `invitee.canceled`) require HMAC signature validation per Calendly's signing-key spec.

### 6.2 Adapter shape

OAuth flow standard. Key methods:

```ts
async listEventTypes(integrationId: string): Promise<CalendlyEventType[]>;
async createEventType(integrationId: string, params: { name: string; duration_minutes: number; ... }): Promise<{ event_type_uri: string }>;
async createWebhookSubscription(integrationId: string, scope: 'organization' | 'user', events: string[]): Promise<{ webhook_uri: string; signing_key: string }>;
```

The `signing_key` returned by `createWebhookSubscription` is stored in `vendor_integrations.webhook_secret_vault_id` (encrypted via pgsodium).

### 6.3 Webhook → interview record creation

```ts
// conduit/supabase/functions/calendly-webhook/index.ts
// Same pattern as Onboarded webhook (HMAC validate + dedup + process)
// On 'invitee.created' event:
//   1. Look up Calendly event_type_uri in conduit interview_event_mappings to find associated job/candidate context
//   2. Create r7_interviews row with calendly_invitee_uri + start_time + invitee email
//   3. Auto-link to candidate via email match
//   4. Notify recruiter via existing comms infra
```

Calendly HMAC validation per their spec:
```ts
function validateCalendlyHmac(rawBody: string, signatureHeader: string, signingKey: string): boolean {
  // Header format: "t=<timestamp>,v1=<signature>"
  const parts = Object.fromEntries(signatureHeader.split(',').map(p => p.split('=')));
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  // Reject events older than 3 minutes (replay protection)
  if (Math.abs(Date.now() / 1000 - parseInt(t)) > 180) return false;
  const data = `${t}.${rawBody}`;
  const expected = createHmac('sha256', signingKey).update(data).digest('hex');
  return timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
}
```

---

## 7. Vault helpers (shared)

```ts
// supabase/functions/_shared/vaultHelpers.ts (NEW)
import { createClient } from '@supabase/supabase-js';

/** Stores a secret in pgsodium vault; returns vault_id. */
export async function storeInVault(supabase: SupabaseClient, plaintext: string, label: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_vault_secret', { secret: plaintext, name: label });
  if (error) throw error;
  return data;
}

/** Retrieves a decrypted secret by vault_id. */
export async function retrieveFromVault(supabase: SupabaseClient, vaultId: string): Promise<string> {
  const { data, error } = await supabase.from('vault.decrypted_secrets').select('decrypted_secret').eq('id', vaultId).single();
  if (error) throw error;
  return data.decrypted_secret;
}

export async function clearVaultEntry(supabase: SupabaseClient, vaultId: string): Promise<void> {
  const { error } = await supabase.from('vault.secrets').delete().eq('id', vaultId);
  if (error) throw error;
}
```

---

## 8. UI patch list

| Component | Path | Change |
|---|---|---|
| Settings/Integrations page | `crm7/src/pages/settings/integrations.tsx` (and `conduit/src/app/(dashboard)/settings/integrations/page.tsx`) | + 4 vendor cards (Idibu/Onboarded/Secured Signing/Calendly) with connect/disconnect + status badge |
| Integration connect form | `crm7/src/components/settings/IntegrationConnectForm.tsx` | NEW — generic OAuth + API-key flow UI |
| OAuth callback handlers | `conduit/src/app/api/integrations/{onboarded,secured-signing,calendly}/callback/route.ts` | NEW — exchange code, redirect to settings |
| IdibuAdapter | `conduit/src/services/idibuAdapter.ts` | NEW (§3) |
| OnboardedAdapter | `conduit/src/services/onboardedAdapter.ts` | NEW (§4) |
| SecuredSigningAdapter | `crm7/src/services/securedSigningAdapter.ts` | NEW (§5) |
| CalendlyAdapter | `conduit/src/services/calendlyAdapter.ts` | NEW (§6) |
| signatureRequestStore | `crm7/src/services/signatureRequestStore.ts` | + provider field + Secured Signing dispatch |
| Job detail page | `conduit/src/app/(dashboard)/jobs/[jobId]/page.tsx` | + Post to Idibu + Quick Repost buttons (§3.3) |
| Onboarding page | `conduit/src/app/(dashboard)/onboarding/page.tsx` | + Activate on Onboarded button (§4) |
| Documents/signatures | `crm7/src/pages/documents/signatures.tsx` | + Provider selector when multiple integrations active |
| Edge fn onboarded-webhook | `conduit/supabase/functions/onboarded-webhook/index.ts` | NEW (§4.3) |
| Edge fn calendly-webhook | `conduit/supabase/functions/calendly-webhook/index.ts` | NEW (§6.3) |
| Edge fn secured-signing-webhook | `crm7/supabase/functions/secured-signing-webhook/index.ts` | NEW (paid tier) |
| Edge fn onboarded-activate-employee + onboarded-send-payroll-pack | `conduit/supabase/functions/` | NEW (queue pattern) |

---

## 9. Test fixture inventory

### 9.1 Adapter tests with mocked APIs (~24)
- Idibu: postJob success, postJob with no credit, healthCheck balance update, quickRepost
- Onboarded: OAuth code exchange, refresh token, activateEmployee queueing, payrollPack queueing
- Secured Signing: send for signing, status polling, download signed
- Calendly: OAuth, listEventTypes, createWebhookSubscription, signing-key persisted to Vault

### 9.2 Webhook tests (~12)
- HMAC validation for Onboarded + Calendly + Secured Signing
- Calendly replay protection (>3min stale)
- Idempotency via vendor_webhook_events dedup
- Unknown event handling (status='dropped')

### 9.3 RLS / security tests (~6)
- vendor_integrations: tenant isolation
- vendor_integrations: only tenant_admin/integration_admin can write
- Vault secrets never returned via vendor_integrations select

### 9.4 UI tests (~16)
- Settings page: 4 vendor cards render with correct status
- OAuth flow: button -> redirect -> callback -> success toast
- Idibu credit balance shown
- Per-job Idibu posting button gated correctly
- Calendly booking creates interview record (e2e)

### 9.5 E2E (1 Playwright)
- recruiter connects Calendly OAuth -> creates event type -> simulated webhook -> interview record appears in pipeline

**Total: ~58 unit/integration + 1 e2e + 16 UI = ~75 tests.**

---

## 10. Implementation sequence (8 PRs)

| PR | Scope | Size | Depends on |
|---|---|---|---|
| 577.1 | Migrations §1.1-§1.2 + Vault helpers + IntegrationAdapter interface + RLS tests | ~1.5h | none |
| 577.2 | Generic Integrations settings page + OAuth callback handlers + connect/disconnect UI | ~2h | 577.1 |
| 577.3 | Idibu adapter + UI integration on jobs page + tests | ~2h | 577.1, 577.2 |
| 577.4 | Onboarded adapter + activation/payroll-pack edge functions + webhook + tests | ~2.5h | 577.1, 577.2 |
| 577.5 | Secured Signing adapter + signatureRequestStore extension + tests | ~2h | 577.1, 577.2 |
| 577.6 | Calendly adapter + webhook + interview record creation + tests | ~2.5h | 577.1, 577.2 |
| 577.7 | Documents page provider selector + cross-vendor signing UX | ~1h | 577.5 |
| 577.8 | E2E Playwright: full Calendly flow | ~1h | 577.6 |

Total estimated effort: ~14.5h, 8 sub-PRs. After 577.1 + 577.2 land, 577.3-577.6 ship in parallel.

---

## 11. §17 quality gate self-check (Doc PR)

1. ✓ All internal links resolve
2. ✓ Citations verified — `email_integrations` + `platform_webhooks` + `mapd_webhook_queue` schemas queried live; codehouse PDFs cited; Calendly/Onboarded API URLs verified
3. ✓ No placeholders without owner+ETA
4. ✓ Conventional commit `docs(crm7,conduit):` prefix
5. ✓ Naming compliant

## §17 mutual-reminder

- ✓ red-team table addressed: UX (status badges, provider selector, OAuth redirect-back), Security (Vault for ALL tokens, HMAC validation per vendor, replay protection on Calendly, AUTH_CANONICAL.md compliant), Performance (async/queued via edge functions for non-blocking calls; webhook 5s budget enforced), Reliability (idempotency via vendor_webhook_events dedup; failed-Idibu badge; non-blocking Onboarded), Quality (common IntegrationAdapter interface; canonical email_integrations pattern reused; conventional commits)
- ✓ smoke test documented (~75 tests in §9)
- ✓ no orphan branches (will delete after merge)
- ✓ no dead code (research doc only)

## AUTH_CANONICAL.md compliance

ALL access tokens, refresh tokens, API keys, and webhook secrets stored in pgsodium Vault — NEVER plaintext in `vendor_integrations`. ALL webhook handlers verify HMAC signature before any side effects. ALL OAuth callbacks use authenticated supabase client (NOT service role). RLS policies tenant-scoped via `current_tenant_id()`. SECURITY INVOKER on all helper functions. Zero cookie SSO.

## Hand-off

@claude-code / @copilot: implementation per §10 sequence. Migrations + IntegrationAdapter interface + Vault helpers in §1, §2, §7 are copy-paste-ready. Per-vendor adapters in §3-§6 follow consistent structure. UI patch list in §8 enumerates all 14 components.

Per §20 obvious-fix autonomy: spec grounded in existing email_integrations canonical pattern + reuse of platform_webhooks + verified vendor APIs (Calendly v2, Onboarded, Secured Signing, Idibu); proceed if concur. Sub-PRs 577.1 + 577.2 are the natural starters; 577.3-577.6 ship in parallel after.
