<!-- G5-VERDICT-BANNER -->
> **VERDICT (STILL-WANTED) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # 📋 VERDICT: STILL-WANTED in part — the transport shipped, the tenant-facing surface did not
>
> At 3,010 lines this is the largest document in the directory. Treat it as **partly delivered**.
>
> **Delivered — evidence, live project `tuybltdrdefjblnplpqo` (2026-08-17):** edge functions
> `email-dispatcher` (v71), `oauth-google-email` (v93), `oauth-microsoft-email` (v94),
> `email-token-refresh` (v62), `email-inbox-sync` (v43); tables `email_integrations`,
> `email_messages`, `email_message_links`, `email_audit_log`, `email_templates`.
>
> **Still wanted, and NOT covered by the completion ledger's 87 items:**
>
> 1. **Email signatures and per-tenant email branding (operator RULING 12.1).** Measured across
>    `crm7/src`, `business-suite-unified/src` and `conduit/src`: **zero** implementation. Every
>    "signature" hit in those trees is *document* signing, not an email sign-off block. Positive
>    control: the same probe returns 50 files for `email_integrations`, so the zero is real.
>    **This plan never specified them** — saying "it's in the recovery docs" is wrong here.
> 2. **`email_templates` holds 0 rows** — tenant-scoped with admin RLS, and unseeded.
>
> **Already tracked elsewhere:** client-side account connection is `crm7#1705`; the Sent/SMS/
> Internal read pane is `crm7#1610`; the settings/inbox UI is `crm7#480`.
>
> **Body defect:** the document presents itself as the complete email plan while containing no
> signature or branding requirement at all.

---

# Email Capabilities - Full Implementation Plan

**Version:** 1.00W
**Date:** 2026-02-27
**Status:** Working
**Applies to:** CRM7, Conduit, Braden
**Imported from:** Internal planning artifact (credentials redacted)

> **Security Note:** All OAuth client IDs, client secrets, and API keys have been redacted from this document. Actual credentials are stored in Supabase Edge Function secrets. See Supabase dashboard → Settings → Edge Functions → Secrets.

> **Conduit Note:** This plan applies to Conduit's communication features via the `conduit_communications` table. While the Edge Functions (OAuth, email-dispatcher, token-refresh) are shared across all bsuite projects, Conduit uses its own `conduit_` prefixed tables and Zustand stores. See `conduit/src/types/entities.ts` for the `Communication` interface.

**Goal:** Comprehensive email sending across bsuite ecosystem with platform-level (Resend) and user-level (Gmail, Microsoft Graph, SMTP) providers.

**Architecture:** Edge Function dispatcher with provider abstraction, encrypted OAuth token storage, Zustand store for frontend state, compose UI integrated into Contacts/Leads pages.

**Tech Stack:** Deno Edge Functions, Resend API, Gmail API, Microsoft Graph, denomailer (SMTP), Zustand, React

---

## Implementation Status (Updated 2026-02-27)

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Database Schema (`email_messages`, `email_templates`, `email_audit_log`, `email_integrations` enhancements) | ✅ Migrated |
| Phase 2 | OAuth Edge Functions (`oauth-google-email` v2, `oauth-microsoft-email` v2 — now with calendar scopes) | ✅ Deployed |
| Phase 2.3 | Token Refresh Cron (`email-token-refresh`) | ✅ Deployed |
| Phase 3 | Email Dispatcher (`email-dispatcher` — multi-provider: Resend, Gmail, Graph, SMTP) | ✅ Deployed |
| Phase 4 | CRM7 Frontend — `emailStore.ts`, `EmailComposeDialog`, `EmailHistory`, `EmailTemplateSelector` | ✅ Built |
| Phase 5 | Conduit Frontend — `communicationStore.ts`, `communicationService.ts`, `ComposeDialog`, `CommunicationTimeline` | ✅ Built |
| Phase 6 | Frontend ↔ Edge Function wiring (OAuth flow trigger, dispatcher calls from UI) | 🔶 Not wired |
| Phase 7 | Braden lead capture (contact form → `lead-capture` Edge Function → CRM sync) | 🔲 Not started |
| Phase 8 | Embeddable lead capture widget | 🔲 Not started |

**Blocking items:**

- CRM7 email UI needs to call `oauth-google-email/authorize` and `oauth-microsoft-email/authorize` to initiate OAuth
- After OAuth, compose dialog needs to call `email-dispatcher` with `source: "user"` and `integration_id`
- Conduit `communicationService.ts` needs same Edge Function wiring
- Google Cloud Console: enable Calendar API, update OAuth consent screen scopes
- Azure AD: add `Calendars.ReadWrite` permission to app registration

---

## Credentials Status

### Google OAuth (Gmail API)

**Found in `/bsuite/.env.local`:**

```bash
GOOGLE_CLIENT_ID="<REDACTED — stored in Supabase secrets>"
GOOGLE_CLIENT_SECRET="<REDACTED — stored in Supabase secrets>"
```

**Action:** Add to Supabase secrets with email scopes in Google Cloud Console.

### Microsoft/Azure (Graph API)

**Registered - credentials ready:**

```bash
MICROSOFT_CLIENT_ID=<REDACTED — stored in Supabase secrets>
MICROSOFT_CLIENT_SECRET=<REDACTED — stored in Supabase secrets>
MICROSOFT_TENANT_ID=common
```

**Action:** Add to Supabase secrets.

### Resend (Platform Email)

**Status:** Working in `send-notification` function.
**Existing:** `RESEND_API_KEY` in Supabase secrets.

---

## Current State Analysis

### Working Components

| Component | Location | Status |
|-----------|----------|--------|
| `send-notification` | `supabase/functions/send-notification/index.ts` | ✅ Production |
| `notificationService.ts` | `business-suite-unified/src/lib/notificationService.ts` | ✅ Production |
| `email_integrations` table | `packages/db/migrations/0003_crm_cms_email.sql` | ✅ Schema exists |
| Settings UI | `/settings/integrations` | ✅ Form exists |

### Now Deployed (previously missing)

| Component | Location | Status |
|-----------|----------|--------|
| `email-dispatcher` | `supabase/functions/email-dispatcher/index.ts` | ✅ Deployed (multi-provider) |
| `email-token-refresh` | `supabase/functions/email-token-refresh/index.ts` | ✅ Deployed (cron) |
| `calendar-integration` | `supabase/functions/calendar-integration/index.ts` | ✅ Deployed v1 |
| `send-notification` | `supabase/functions/send-notification/index.ts` | ✅ Deployed v1 |
| CRM7 Email UI | `crm7/src/components/email/` | ✅ Built (not wired to Edge Functions) |
| Conduit Comms UI | `conduit/src/components/communications/` | ✅ Built (not wired to Edge Functions) |

### Still Missing

| Component | Status |
|-----------|--------|
| Frontend ↔ Edge Function OAuth wiring | 🔶 Not wired |
| Braden lead capture integration | 🔲 Not started |
| Embeddable lead capture widget | 🔲 Not started |

---

## Phase 1: Database Schema Enhancement

### Task 1.1: Create email schema migration

**File:** `packages/db/migrations/0007_email_enhancements.sql`

```sql
-- Email Messages Table
-- Tracks all emails sent through the system with threading support
CREATE TABLE IF NOT EXISTS email_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Sender info
    integration_id UUID REFERENCES email_integrations(id) ON DELETE SET NULL,
    from_email TEXT NOT NULL,
    from_name TEXT,

    -- Recipients
    to_emails TEXT[] NOT NULL,
    cc_emails TEXT[],
    bcc_emails TEXT[],

    -- Content
    subject TEXT NOT NULL,
    body_html TEXT,
    body_text TEXT,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'bounced')),
    provider TEXT NOT NULL CHECK (provider IN ('resend', 'gmail', 'microsoft', 'smtp')),
    provider_message_id TEXT,
    error_message TEXT,

    -- Threading
    thread_id TEXT,
    in_reply_to TEXT,
    references_header TEXT[],

    -- CRM linking
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

    -- Timestamps
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_email_messages_tenant ON email_messages(tenant_id);
CREATE INDEX idx_email_messages_contact ON email_messages(contact_id);
CREATE INDEX idx_email_messages_lead ON email_messages(lead_id);
CREATE INDEX idx_email_messages_thread ON email_messages(thread_id);
CREATE INDEX idx_email_messages_status ON email_messages(status);

-- Email Templates Table
-- User-customizable email templates per tenant
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Template info
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',

    -- Content
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,

    -- Variables (JSON schema for template variables)
    variables JSONB DEFAULT '[]'::jsonb,

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_email_templates_tenant ON email_templates(tenant_id);
CREATE INDEX idx_email_templates_category ON email_templates(category);

-- Email Audit Log
-- Compliance logging for all email operations
CREATE TABLE IF NOT EXISTS email_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Action info
    action TEXT NOT NULL CHECK (action IN ('send', 'oauth_connect', 'oauth_disconnect', 'oauth_refresh', 'template_create', 'template_update', 'template_delete')),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Details
    email_message_id UUID REFERENCES email_messages(id) ON DELETE SET NULL,
    integration_id UUID REFERENCES email_integrations(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}'::jsonb,

    -- Request info
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_audit_tenant ON email_audit_log(tenant_id);
CREATE INDEX idx_email_audit_user ON email_audit_log(user_id);
CREATE INDEX idx_email_audit_action ON email_audit_log(action);
CREATE INDEX idx_email_audit_created ON email_audit_log(created_at);

-- Add columns to email_integrations for enhanced tracking
ALTER TABLE email_integrations
ADD COLUMN IF NOT EXISTS encryption_key_id TEXT,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scopes TEXT[];

-- RLS Policies
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_audit_log ENABLE ROW LEVEL SECURITY;

-- email_messages policies
CREATE POLICY "Users can view their tenant's emails"
    ON email_messages FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM memberships WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users with write permission can insert emails"
    ON email_messages FOR INSERT
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM memberships
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'manager', 'member')
    ));

-- email_templates policies
CREATE POLICY "Users can view their tenant's templates"
    ON email_templates FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM memberships WHERE user_id = auth.uid()
    ));

CREATE POLICY "Admins can manage templates"
    ON email_templates FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM memberships
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    ));

-- email_audit_log policies
CREATE POLICY "Admins can view audit log"
    ON email_audit_log FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM memberships
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    ));
```

**Run:** `supabase db push` or apply via Supabase dashboard.

---

## Phase 2: OAuth Edge Functions

### Task 2.1: Google OAuth for Gmail API

**File:** `supabase/functions/oauth-google-email/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_EMAIL_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_EMAIL_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Gmail API scopes for sending emails
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  try {
    switch (path) {
      case "authorize":
        return handleAuthorize(req);
      case "callback":
        return handleCallback(req);
      case "refresh":
        return handleRefresh(req);
      default:
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("OAuth error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleAuthorize(req: Request): Promise<Response> {
  // Get user from JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );

  if (error || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { tenant_id } = await req.json();

  // Generate state parameter (encrypted user/tenant info)
  const state = btoa(JSON.stringify({
    user_id: user.id,
    tenant_id,
    timestamp: Date.now(),
  }));

  const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-google-email/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GMAIL_SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return new Response(JSON.stringify({ url: authUrl.toString() }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleCallback(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return redirectWithError(`OAuth error: ${error}`);
  }

  if (!code || !state) {
    return redirectWithError("Missing code or state");
  }

  // Decode state
  let stateData;
  try {
    stateData = JSON.parse(atob(state));
  } catch {
    return redirectWithError("Invalid state");
  }

  // Verify timestamp (15 min expiry)
  if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
    return redirectWithError("State expired");
  }

  const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-google-email/callback`;

  // Exchange code for tokens
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  const tokens = await tokenResponse.json();

  if (tokens.error) {
    return redirectWithError(`Token error: ${tokens.error_description}`);
  }

  // Get user email from Google
  const userInfoResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const userInfo = await userInfoResponse.json();

  // Store in database
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { error: insertError } = await supabase.from("email_integrations").upsert({
    tenant_id: stateData.tenant_id,
    user_id: stateData.user_id,
    provider: "google",
    email: userInfo.email,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    scopes: GMAIL_SCOPES.split(" "),
    is_active: true,
  }, {
    onConflict: "tenant_id,provider,email",
  });

  if (insertError) {
    console.error("Insert error:", insertError);
    return redirectWithError("Failed to save integration");
  }

  // Audit log
  await supabase.from("email_audit_log").insert({
    tenant_id: stateData.tenant_id,
    user_id: stateData.user_id,
    action: "oauth_connect",
    details: { provider: "google", email: userInfo.email },
  });

  // Redirect to success page
  return new Response(null, {
    status: 302,
    headers: { Location: "/settings/integrations?email_connected=google" },
  });
}

async function handleRefresh(req: Request): Promise<Response> {
  const { integration_id } = await req.json();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: integration, error } = await supabase
    .from("email_integrations")
    .select("*")
    .eq("id", integration_id)
    .single();

  if (error || !integration) {
    return new Response(JSON.stringify({ error: "Integration not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Refresh the token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: integration.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await tokenResponse.json();

  if (tokens.error) {
    // Mark integration as error
    await supabase.from("email_integrations").update({
      sync_status: "error",
      error_message: tokens.error_description,
    }).eq("id", integration_id);

    return new Response(JSON.stringify({ error: tokens.error_description }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update tokens
  await supabase.from("email_integrations").update({
    access_token: tokens.access_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    sync_status: "idle",
    error_message: null,
    last_sync_at: new Date().toISOString(),
  }).eq("id", integration_id);

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function redirectWithError(message: string): Response {
  const errorUrl = `/settings/integrations?email_error=${encodeURIComponent(message)}`;
  return new Response(null, {
    status: 302,
    headers: { Location: errorUrl },
  });
}
```

### Task 2.2: Microsoft OAuth for Graph API

**File:** `supabase/functions/oauth-microsoft-email/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const MS_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID")!;
const MS_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;
const MS_TENANT_ID = Deno.env.get("MICROSOFT_TENANT_ID") || "common";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Microsoft Graph scopes
const MS_SCOPES = [
  "Mail.Send",
  "Mail.Read",
  "User.Read",
  "offline_access",
].join(" ");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  try {
    switch (path) {
      case "authorize":
        return handleAuthorize(req);
      case "callback":
        return handleCallback(req);
      case "refresh":
        return handleRefresh(req);
      default:
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("OAuth error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleAuthorize(req: Request): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );

  if (error || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { tenant_id } = await req.json();

  const state = btoa(JSON.stringify({
    user_id: user.id,
    tenant_id,
    timestamp: Date.now(),
  }));

  const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-microsoft-email/callback`;

  const authUrl = new URL(`https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/authorize`);
  authUrl.searchParams.set("client_id", MS_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", MS_SCOPES);
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set("state", state);

  return new Response(JSON.stringify({ url: authUrl.toString() }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleCallback(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return redirectWithError(`OAuth error: ${error}`);
  }

  if (!code || !state) {
    return redirectWithError("Missing code or state");
  }

  let stateData;
  try {
    stateData = JSON.parse(atob(state));
  } catch {
    return redirectWithError("Invalid state");
  }

  if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
    return redirectWithError("State expired");
  }

  const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-microsoft-email/callback`;

  // Exchange code for tokens
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        scope: MS_SCOPES,
      }),
    }
  );

  const tokens = await tokenResponse.json();

  if (tokens.error) {
    return redirectWithError(`Token error: ${tokens.error_description}`);
  }

  // Get user email from Microsoft Graph
  const userInfoResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userInfoResponse.json();

  // Store in database
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { error: insertError } = await supabase.from("email_integrations").upsert({
    tenant_id: stateData.tenant_id,
    user_id: stateData.user_id,
    provider: "microsoft",
    email: userInfo.mail || userInfo.userPrincipalName,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    scopes: MS_SCOPES.split(" "),
    is_active: true,
  }, {
    onConflict: "tenant_id,provider,email",
  });

  if (insertError) {
    console.error("Insert error:", insertError);
    return redirectWithError("Failed to save integration");
  }

  // Audit log
  await supabase.from("email_audit_log").insert({
    tenant_id: stateData.tenant_id,
    user_id: stateData.user_id,
    action: "oauth_connect",
    details: { provider: "microsoft", email: userInfo.mail || userInfo.userPrincipalName },
  });

  return new Response(null, {
    status: 302,
    headers: { Location: "/settings/integrations?email_connected=microsoft" },
  });
}

async function handleRefresh(req: Request): Promise<Response> {
  const { integration_id } = await req.json();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: integration, error } = await supabase
    .from("email_integrations")
    .select("*")
    .eq("id", integration_id)
    .single();

  if (error || !integration) {
    return new Response(JSON.stringify({ error: "Integration not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        refresh_token: integration.refresh_token,
        grant_type: "refresh_token",
        scope: MS_SCOPES,
      }),
    }
  );

  const tokens = await tokenResponse.json();

  if (tokens.error) {
    await supabase.from("email_integrations").update({
      sync_status: "error",
      error_message: tokens.error_description,
    }).eq("id", integration_id);

    return new Response(JSON.stringify({ error: tokens.error_description }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabase.from("email_integrations").update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || integration.refresh_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    sync_status: "idle",
    error_message: null,
    last_sync_at: new Date().toISOString(),
  }).eq("id", integration_id);

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function redirectWithError(message: string): Response {
  const errorUrl = `/settings/integrations?email_error=${encodeURIComponent(message)}`;
  return new Response(null, {
    status: 302,
    headers: { Location: errorUrl },
  });
}
```

### Task 2.3: Token Refresh Cron Job

**File:** `supabase/functions/email-token-refresh/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  // Verify cron secret or admin auth
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Find integrations expiring within 30 minutes
  const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { data: integrations, error } = await supabase
    .from("email_integrations")
    .select("id, provider, token_expires_at")
    .eq("is_active", true)
    .lt("token_expires_at", thirtyMinutesFromNow)
    .not("refresh_token", "is", null);

  if (error) {
    console.error("Failed to fetch integrations:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  console.log(`Found ${integrations?.length || 0} tokens to refresh`);

  const results = [];

  for (const integration of integrations || []) {
    try {
      const refreshUrl = integration.provider === "google"
        ? `${SUPABASE_URL}/functions/v1/oauth-google-email/refresh`
        : `${SUPABASE_URL}/functions/v1/oauth-microsoft-email/refresh`;

      const response = await fetch(refreshUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration_id: integration.id }),
      });

      results.push({
        id: integration.id,
        provider: integration.provider,
        success: response.ok,
      });
    } catch (err) {
      console.error(`Failed to refresh ${integration.id}:`, err);
      results.push({
        id: integration.id,
        provider: integration.provider,
        success: false,
        error: err.message,
      });
    }
  }

  return new Response(JSON.stringify({ refreshed: results }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

**Cron schedule:** Add to Supabase dashboard: `*/30 * * * *` (every 30 minutes)

---

## Phase 3: Email Dispatcher Rewrite

### Task 3.1: Full email-dispatcher implementation

**File:** `supabase/functions/email-dispatcher/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const DEFAULT_FROM_EMAIL = Deno.env.get("EMAIL_FROM") || "noreply@crm7.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailDispatchPayload {
  source: "platform" | "user";
  integration_id?: string;
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_html?: string;
  body_text?: string;
  template_id?: string;
  template_data?: Record<string, string>;
  contact_id?: string;
  lead_id?: string;
  tenant_id: string;
  user_id?: string;
  in_reply_to?: string;
  thread_id?: string;
}

interface SendResult {
  success: boolean;
  provider: string;
  message_id?: string;
  error?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload: EmailDispatchPayload = await req.json();

    // Validate required fields
    if (!payload.to || !payload.subject || !payload.tenant_id) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, tenant_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.source === "user" && !payload.integration_id) {
      return new Response(JSON.stringify({ error: "integration_id required for user source" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Handle template substitution
    let bodyHtml = payload.body_html;
    let bodyText = payload.body_text;
    let subject = payload.subject;

    if (payload.template_id) {
      const { data: template } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", payload.template_id)
        .single();

      if (template) {
        subject = substituteVariables(template.subject, payload.template_data || {});
        bodyHtml = substituteVariables(template.body_html, payload.template_data || {});
        bodyText = template.body_text
          ? substituteVariables(template.body_text, payload.template_data || {})
          : undefined;
      }
    }

    // Normalize recipients
    const toEmails = Array.isArray(payload.to) ? payload.to : [payload.to];

    // Create email_messages record
    const { data: emailRecord, error: insertError } = await supabase
      .from("email_messages")
      .insert({
        tenant_id: payload.tenant_id,
        integration_id: payload.integration_id,
        from_email: payload.source === "platform" ? DEFAULT_FROM_EMAIL : "pending",
        to_emails: toEmails,
        cc_emails: payload.cc,
        bcc_emails: payload.bcc,
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
        status: "pending",
        provider: payload.source === "platform" ? "resend" : "pending",
        contact_id: payload.contact_id,
        lead_id: payload.lead_id,
        thread_id: payload.thread_id,
        in_reply_to: payload.in_reply_to,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create email record:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create email record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dispatch based on source
    let result: SendResult;

    if (payload.source === "platform") {
      result = await sendViaResend({
        to: toEmails,
        cc: payload.cc,
        bcc: payload.bcc,
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
        in_reply_to: payload.in_reply_to,
      });
    } else {
      // Get integration details
      const { data: integration } = await supabase
        .from("email_integrations")
        .select("*")
        .eq("id", payload.integration_id)
        .single();

      if (!integration) {
        result = { success: false, provider: "unknown", error: "Integration not found" };
      } else if (!integration.is_active) {
        result = { success: false, provider: integration.provider, error: "Integration is inactive" };
      } else {
        // Update from_email now that we know it
        await supabase.from("email_messages").update({
          from_email: integration.email,
          provider: integration.provider,
        }).eq("id", emailRecord.id);

        switch (integration.provider) {
          case "google":
            result = await sendViaGmail(integration, {
              to: toEmails,
              cc: payload.cc,
              bcc: payload.bcc,
              subject,
              body_html: bodyHtml,
              body_text: bodyText,
              in_reply_to: payload.in_reply_to,
              thread_id: payload.thread_id,
            });
            break;
          case "microsoft":
            result = await sendViaMSGraph(integration, {
              to: toEmails,
              cc: payload.cc,
              bcc: payload.bcc,
              subject,
              body_html: bodyHtml,
              body_text: bodyText,
              in_reply_to: payload.in_reply_to,
            });
            break;
          case "smtp":
            result = await sendViaSMTP(integration, {
              to: toEmails,
              cc: payload.cc,
              bcc: payload.bcc,
              subject,
              body_html: bodyHtml,
              body_text: bodyText,
            });
            break;
          default:
            result = { success: false, provider: integration.provider, error: "Unknown provider" };
        }
      }
    }

    // Update email record with result
    await supabase.from("email_messages").update({
      status: result.success ? "sent" : "failed",
      provider_message_id: result.message_id,
      error_message: result.error,
      sent_at: result.success ? new Date().toISOString() : null,
    }).eq("id", emailRecord.id);

    // Audit log
    await supabase.from("email_audit_log").insert({
      tenant_id: payload.tenant_id,
      user_id: payload.user_id,
      action: "send",
      email_message_id: emailRecord.id,
      integration_id: payload.integration_id,
      details: {
        to: toEmails,
        subject,
        success: result.success,
        provider: result.provider,
        error: result.error,
      },
    });

    return new Response(JSON.stringify({
      success: result.success,
      email_id: emailRecord.id,
      message_id: result.message_id,
      error: result.error,
    }), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Email dispatch error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============ Provider Implementations ============

async function sendViaResend(options: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_html?: string;
  body_text?: string;
  in_reply_to?: string;
}): Promise<SendResult> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: DEFAULT_FROM_EMAIL,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        html: options.body_html,
        text: options.body_text,
        headers: options.in_reply_to ? { "In-Reply-To": options.in_reply_to } : undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, provider: "resend", error: data.message || "Resend API error" };
    }

    return { success: true, provider: "resend", message_id: data.id };
  } catch (error) {
    return { success: false, provider: "resend", error: error.message };
  }
}

async function sendViaGmail(
  integration: { access_token: string; email: string },
  options: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body_html?: string;
    body_text?: string;
    in_reply_to?: string;
    thread_id?: string;
  }
): Promise<SendResult> {
  try {
    // Build RFC 2822 MIME message
    const boundary = `boundary_${Date.now()}`;
    const mimeMessage = buildMimeMessage({
      from: integration.email,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      body_html: options.body_html,
      body_text: options.body_text,
      in_reply_to: options.in_reply_to,
      boundary,
    });

    // Base64 URL encode the message
    const encodedMessage = btoa(mimeMessage)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const requestBody: Record<string, string> = { raw: encodedMessage };
    if (options.thread_id) {
      requestBody.threadId = options.thread_id;
    }

    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, provider: "gmail", error: data.error?.message || "Gmail API error" };
    }

    return { success: true, provider: "gmail", message_id: data.id };
  } catch (error) {
    return { success: false, provider: "gmail", error: error.message };
  }
}

async function sendViaMSGraph(
  integration: { access_token: string; email: string },
  options: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body_html?: string;
    body_text?: string;
    in_reply_to?: string;
  }
): Promise<SendResult> {
  try {
    const message = {
      message: {
        subject: options.subject,
        body: {
          contentType: options.body_html ? "HTML" : "Text",
          content: options.body_html || options.body_text || "",
        },
        toRecipients: options.to.map((email) => ({ emailAddress: { address: email } })),
        ccRecipients: options.cc?.map((email) => ({ emailAddress: { address: email } })) || [],
        bccRecipients: options.bcc?.map((email) => ({ emailAddress: { address: email } })) || [],
      },
      saveToSentItems: true,
    };

    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/sendMail",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        provider: "microsoft",
        error: error.error?.message || "Microsoft Graph error"
      };
    }

    // Microsoft sendMail returns 202 with no body on success
    return { success: true, provider: "microsoft", message_id: `ms_${Date.now()}` };
  } catch (error) {
    return { success: false, provider: "microsoft", error: error.message };
  }
}

async function sendViaSMTP(
  integration: { smtp_host: string; smtp_port: number; smtp_user: string; smtp_pass: string; email: string },
  options: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body_html?: string;
    body_text?: string;
  }
): Promise<SendResult> {
  try {
    const client = new SMTPClient({
      connection: {
        hostname: integration.smtp_host,
        port: integration.smtp_port,
        tls: true,
        auth: {
          username: integration.smtp_user,
          password: integration.smtp_pass,
        },
      },
    });

    await client.send({
      from: integration.email,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      content: options.body_text || "",
      html: options.body_html,
    });

    await client.close();

    return { success: true, provider: "smtp", message_id: `smtp_${Date.now()}` };
  } catch (error) {
    return { success: false, provider: "smtp", error: error.message };
  }
}

// ============ Helper Functions ============

function substituteVariables(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
}

function buildMimeMessage(options: {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_html?: string;
  body_text?: string;
  in_reply_to?: string;
  boundary: string;
}): string {
  const headers = [
    `From: ${options.from}`,
    `To: ${options.to.join(", ")}`,
    options.cc?.length ? `Cc: ${options.cc.join(", ")}` : null,
    options.bcc?.length ? `Bcc: ${options.bcc.join(", ")}` : null,
    `Subject: ${options.subject}`,
    `MIME-Version: 1.0`,
    options.in_reply_to ? `In-Reply-To: ${options.in_reply_to}` : null,
    options.in_reply_to ? `References: ${options.in_reply_to}` : null,
    `Content-Type: multipart/alternative; boundary="${options.boundary}"`,
  ].filter(Boolean).join("\r\n");

  const textPart = options.body_text || stripHtml(options.body_html || "");
  const htmlPart = options.body_html || `<pre>${options.body_text || ""}</pre>`;

  return `${headers}\r\n\r\n` +
    `--${options.boundary}\r\n` +
    `Content-Type: text/plain; charset="UTF-8"\r\n\r\n` +
    `${textPart}\r\n` +
    `--${options.boundary}\r\n` +
    `Content-Type: text/html; charset="UTF-8"\r\n\r\n` +
    `${htmlPart}\r\n` +
    `--${options.boundary}--`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}
```

---

## Phase 4: Frontend Services & Store

### Task 4.1: Email Service

**File:** `crm7/src/lib/emailService.ts`

```typescript
import { supabase } from './supabase';
import { getCurrentTenantId } from '../services/unifiedSchemaService';

export interface EmailIntegration {
  id: string;
  provider: 'google' | 'microsoft' | 'smtp';
  email: string;
  is_active: boolean;
  sync_status: 'idle' | 'syncing' | 'error';
  error_message?: string;
  last_sync_at?: string;
  created_at: string;
}

export interface EmailMessage {
  id: string;
  from_email: string;
  from_name?: string;
  to_emails: string[];
  cc_emails?: string[];
  subject: string;
  body_html?: string;
  body_text?: string;
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced';
  provider: string;
  sent_at?: string;
  created_at: string;
  contact_id?: string;
  lead_id?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_html?: string;
  body_text?: string;
  template_id?: string;
  template_data?: Record<string, string>;
  contact_id?: string;
  lead_id?: string;
  integration_id?: string; // If not provided, sends via platform
  in_reply_to?: string;
  thread_id?: string;
}

export interface SMTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
}

class EmailService {
  // ============ Integration Management ============

  async getIntegrations(): Promise<EmailIntegration[]> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) throw new Error('No tenant selected');

    const { data, error } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async connectGoogle(): Promise<{ url: string }> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) throw new Error('No tenant selected');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-google-email/authorize`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenant_id: tenantId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get OAuth URL');
    }

    return response.json();
  }

  async connectMicrosoft(): Promise<{ url: string }> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) throw new Error('No tenant selected');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-microsoft-email/authorize`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenant_id: tenantId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get OAuth URL');
    }

    return response.json();
  }

  async connectSMTP(config: SMTPConfig): Promise<void> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) throw new Error('No tenant selected');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Test the connection first
    await this.testSMTP(config);

    const { error } = await supabase.from('email_integrations').insert({
      tenant_id: tenantId,
      user_id: user.id,
      provider: 'smtp',
      email: config.from_email,
      smtp_host: config.host,
      smtp_port: config.port,
      smtp_user: config.username,
      smtp_pass: config.password,
      is_active: true,
    });

    if (error) throw error;
  }

  async testSMTP(config: SMTPConfig): Promise<{ success: boolean; error?: string }> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) throw new Error('No tenant selected');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-dispatcher/test-smtp`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...config, tenant_id: tenantId }),
      }
    );

    return response.json();
  }

  async disconnect(integrationId: string): Promise<void> {
    const { error } = await supabase
      .from('email_integrations')
      .delete()
      .eq('id', integrationId);

    if (error) throw error;
  }

  // ============ Email Sending ============

  async send(options: SendEmailOptions): Promise<{
    success: boolean;
    email_id?: string;
    message_id?: string;
    error?: string;
  }> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) throw new Error('No tenant selected');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-dispatcher`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...options,
          source: options.integration_id ? 'user' : 'platform',
          tenant_id: tenantId,
          user_id: session.user.id,
        }),
      }
    );

    return response.json();
  }

  // ============ Email History ============

  async getEmailHistory(params: {
    contact_id?: string;
    lead_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ emails: EmailMessage[]; total: number }> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) throw new Error('No tenant selected');

    let query = supabase
      .from('email_messages')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(params.offset || 0, (params.offset || 0) + (params.limit || 20) - 1);

    if (params.contact_id) {
      query = query.eq('contact_id', params.contact_id);
    }
    if (params.lead_id) {
      query = query.eq('lead_id', params.lead_id);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { emails: data || [], total: count || 0 };
  }

  async getEmail(emailId: string): Promise<EmailMessage | null> {
    const { data, error } = await supabase
      .from('email_messages')
      .select('*')
      .eq('id', emailId)
      .single();

    if (error) throw error;
    return data;
  }

  // ============ Templates ============

  async getTemplates(): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    category: string;
    subject: string;
    body_html: string;
    variables: Array<{ name: string; description?: string }>;
  }>> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) throw new Error('No tenant selected');

    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }
}

export const emailService = new EmailService();
```

### Task 4.2: Email Zustand Store

**File:** `crm7/src/stores/emailStore.ts`

```typescript
import { create } from 'zustand';
import { emailService, EmailIntegration, EmailMessage, SendEmailOptions, SMTPConfig } from '../lib/emailService';

interface EmailState {
  // Integrations
  integrations: EmailIntegration[];
  integrationsLoading: boolean;
  integrationsError: string | null;

  // Email history
  emails: EmailMessage[];
  emailsLoading: boolean;
  emailsError: string | null;
  emailsTotal: number;

  // Compose state
  composing: boolean;
  sending: boolean;
  sendError: string | null;

  // Actions
  loadIntegrations: () => Promise<void>;
  connectGoogle: () => Promise<void>;
  connectMicrosoft: () => Promise<void>;
  connectSMTP: (config: SMTPConfig) => Promise<void>;
  disconnectIntegration: (id: string) => Promise<void>;
  sendEmail: (options: SendEmailOptions) => Promise<{ success: boolean; email_id?: string; error?: string }>;
  loadEmailHistory: (params: { contact_id?: string; lead_id?: string; limit?: number; offset?: number }) => Promise<void>;
  setComposing: (composing: boolean) => void;
  clearErrors: () => void;
}

export const useEmailStore = create<EmailState>((set, get) => ({
  integrations: [],
  integrationsLoading: false,
  integrationsError: null,

  emails: [],
  emailsLoading: false,
  emailsError: null,
  emailsTotal: 0,

  composing: false,
  sending: false,
  sendError: null,

  loadIntegrations: async () => {
    set({ integrationsLoading: true, integrationsError: null });
    try {
      const integrations = await emailService.getIntegrations();
      set({ integrations, integrationsLoading: false });
    } catch (error) {
      set({ integrationsError: (error as Error).message, integrationsLoading: false });
    }
  },

  connectGoogle: async () => {
    try {
      const { url } = await emailService.connectGoogle();
      // Open OAuth popup
      const popup = window.open(url, 'google-oauth', 'width=600,height=700,popup=true');

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          if (popup?.closed) {
            clearInterval(pollInterval);
            // Reload integrations to check for new connection
            get().loadIntegrations();
          }
        } catch {
          // Ignore cross-origin errors
        }
      }, 500);
    } catch (error) {
      set({ integrationsError: (error as Error).message });
    }
  },

  connectMicrosoft: async () => {
    try {
      const { url } = await emailService.connectMicrosoft();
      const popup = window.open(url, 'microsoft-oauth', 'width=600,height=700,popup=true');

      const pollInterval = setInterval(async () => {
        try {
          if (popup?.closed) {
            clearInterval(pollInterval);
            get().loadIntegrations();
          }
        } catch {
          // Ignore cross-origin errors
        }
      }, 500);
    } catch (error) {
      set({ integrationsError: (error as Error).message });
    }
  },

  connectSMTP: async (config) => {
    set({ integrationsLoading: true, integrationsError: null });
    try {
      await emailService.connectSMTP(config);
      await get().loadIntegrations();
    } catch (error) {
      set({ integrationsError: (error as Error).message, integrationsLoading: false });
    }
  },

  disconnectIntegration: async (id) => {
    try {
      await emailService.disconnect(id);
      set({ integrations: get().integrations.filter(i => i.id !== id) });
    } catch (error) {
      set({ integrationsError: (error as Error).message });
    }
  },

  sendEmail: async (options) => {
    set({ sending: true, sendError: null });
    try {
      const result = await emailService.send(options);
      set({ sending: false, composing: false });
      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({ sendError: errorMessage, sending: false });
      return { success: false, error: errorMessage };
    }
  },

  loadEmailHistory: async (params) => {
    set({ emailsLoading: true, emailsError: null });
    try {
      const { emails, total } = await emailService.getEmailHistory(params);
      set({ emails, emailsTotal: total, emailsLoading: false });
    } catch (error) {
      set({ emailsError: (error as Error).message, emailsLoading: false });
    }
  },

  setComposing: (composing) => set({ composing }),

  clearErrors: () => set({ integrationsError: null, emailsError: null, sendError: null }),
}));
```

---

## Phase 5: Email Compose UI Components

### Task 5.1: EmailComposeDialog

**File:** `crm7/src/components/email/EmailComposeDialog.tsx`

```tsx
import { useState, useEffect } from 'react';
import { X, Send, Paperclip, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { useEmailStore } from '../../stores/emailStore';
import EmailTemplateSelector from './EmailTemplateSelector';

interface EmailComposeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  contactId?: string;
  leadId?: string;
  inReplyTo?: string;
  threadId?: string;
}

export default function EmailComposeDialog({
  isOpen,
  onClose,
  defaultTo = '',
  defaultSubject = '',
  contactId,
  leadId,
  inReplyTo,
  threadId,
}: EmailComposeDialogProps) {
  const { integrations, sending, sendError, sendEmail, loadIntegrations } = useEmailStore();

  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState('');
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadIntegrations();
      setTo(defaultTo);
      setSubject(defaultSubject);
    }
  }, [isOpen, defaultTo, defaultSubject, loadIntegrations]);

  useEffect(() => {
    // Auto-select first active integration
    const activeIntegration = integrations.find(i => i.is_active);
    if (activeIntegration && !selectedIntegration) {
      setSelectedIntegration(activeIntegration.id);
    }
  }, [integrations, selectedIntegration]);

  const handleSend = async () => {
    if (!to || !subject) return;

    const toEmails = to.split(',').map(e => e.trim()).filter(Boolean);
    const ccEmails = cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : undefined;
    const bccEmails = bcc ? bcc.split(',').map(e => e.trim()).filter(Boolean) : undefined;

    const result = await sendEmail({
      to: toEmails,
      cc: ccEmails,
      bcc: bccEmails,
      subject,
      body_html: body,
      contact_id: contactId,
      lead_id: leadId,
      integration_id: selectedIntegration || undefined,
      in_reply_to: inReplyTo,
      thread_id: threadId,
    });

    if (result.success) {
      onClose();
      // Reset form
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      setBody('');
    }
  };

  const handleTemplateSelect = (template: { subject: string; body_html: string }) => {
    setSubject(template.subject);
    setBody(template.body_html);
    setShowTemplates(false);
  };

  if (!isOpen) return null;

  const selectedIntegrationData = integrations.find(i => i.id === selectedIntegration);
  const sendingAs = selectedIntegrationData?.email || 'Platform (noreply@crm7.app)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">New Email</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* From selector */}
        <div className="px-4 py-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 w-12">From:</span>
            <div className="relative flex-1">
              <select
                value={selectedIntegration || ''}
                onChange={(e) => setSelectedIntegration(e.target.value || null)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white appearance-none pr-8"
              >
                <option value="">Platform (noreply@crm7.app)</option>
                {integrations.filter(i => i.is_active).map((integration) => (
                  <option key={integration.id} value={integration.id}>
                    {integration.email} ({integration.provider})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Recipients */}
        <div className="px-4 py-2 space-y-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 w-12">To:</span>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com, another@example.com"
              className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none"
            />
            <button
              onClick={() => setShowCcBcc(!showCcBcc)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cc/Bcc
            </button>
          </div>

          {showCcBcc && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 w-12">Cc:</span>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 w-12">Bcc:</span>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Subject */}
        <div className="px-4 py-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 w-12">Subject:</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none"
            />
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={12}
            className="w-full bg-transparent border-none text-white text-sm focus:outline-none resize-none"
          />
        </div>

        {/* Error */}
        {sendError && (
          <div className="px-4 py-2 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {sendError}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white border border-slate-600 rounded"
            >
              Templates
            </button>
            <button className="p-2 text-slate-400 hover:text-white">
              <Paperclip className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Sending as {sendingAs}
            </span>
            <button
              onClick={handleSend}
              disabled={sending || !to || !subject}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send
                </>
              )}
            </button>
          </div>
        </div>

        {/* Template selector modal */}
        {showTemplates && (
          <EmailTemplateSelector
            onSelect={handleTemplateSelect}
            onClose={() => setShowTemplates(false)}
          />
        )}
      </div>
    </div>
  );
}
```

### Task 5.2: EmailHistory Component

**File:** `crm7/src/components/email/EmailHistory.tsx`

```tsx
import { useEffect, useState } from 'react';
import { Mail, ChevronRight, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useEmailStore } from '../../stores/emailStore';
import { formatDistanceToNow } from 'date-fns';

interface EmailHistoryProps {
  contactId?: string;
  leadId?: string;
}

export default function EmailHistory({ contactId, leadId }: EmailHistoryProps) {
  const { emails, emailsLoading, emailsError, emailsTotal, loadEmailHistory } = useEmailStore();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    loadEmailHistory({ contact_id: contactId, lead_id: leadId, limit: 10 });
  }, [contactId, leadId, loadEmailHistory]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'failed':
      case 'bounced':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Mail className="w-4 h-4 text-slate-400" />;
    }
  };

  if (emailsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (emailsError) {
    return (
      <div className="flex items-center gap-2 py-4 text-red-400 text-sm">
        <AlertCircle className="w-4 h-4" />
        {emailsError}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-8">
        <Mail className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No emails yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">Email History</h3>
        <span className="text-xs text-slate-500">{emailsTotal} total</span>
      </div>

      {emails.map((email) => (
        <div
          key={email.id}
          className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden"
        >
          <button
            onClick={() => setExpanded(expanded === email.id ? null : email.id)}
            className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-700/30 transition-colors"
          >
            {getStatusIcon(email.status)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{email.subject}</p>
              <p className="text-xs text-slate-400 truncate">
                To: {email.to_emails.join(', ')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {email.sent_at ? formatDistanceToNow(new Date(email.sent_at), { addSuffix: true }) : 'Pending'}
              </span>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded === email.id ? 'rotate-90' : ''}`} />
            </div>
          </button>

          {expanded === email.id && (
            <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/30">
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-slate-500 w-16">From:</span>
                  <span className="text-white">{email.from_email}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-500 w-16">Provider:</span>
                  <span className="text-white capitalize">{email.provider}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-500 w-16">Status:</span>
                  <span className={`capitalize ${
                    email.status === 'sent' || email.status === 'delivered' ? 'text-green-400' :
                    email.status === 'failed' || email.status === 'bounced' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {email.status}
                  </span>
                </div>
                {email.body_text && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <p className="text-slate-300 whitespace-pre-wrap">{email.body_text}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Task 5.3: EmailTemplateSelector Component

**File:** `crm7/src/components/email/EmailTemplateSelector.tsx`

```tsx
import { useState, useEffect } from 'react';
import { X, FileText, Search } from 'lucide-react';
import { emailService } from '../../lib/emailService';

interface Template {
  id: string;
  name: string;
  description?: string;
  category: string;
  subject: string;
  body_html: string;
}

interface EmailTemplateSelectorProps {
  onSelect: (template: { subject: string; body_html: string }) => void;
  onClose: () => void;
}

export default function EmailTemplateSelector({ onSelect, onClose }: EmailTemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await emailService.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(templates.map(t => t.category))];

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="absolute inset-0 bg-slate-900/95 rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white">Email Templates</h3>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search and filters */}
      <div className="px-4 py-3 border-b border-slate-700 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 text-xs rounded-full border ${
              !selectedCategory
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 text-xs rounded-full border capitalize ${
                selectedCategory === category
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Template list */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No templates found</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelect({ subject: template.subject, body_html: template.body_html })}
                className="text-left bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-4 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{template.name}</p>
                    {template.description && (
                      <p className="text-sm text-slate-400 mt-1">{template.description}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-2 truncate">
                      Subject: {template.subject}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded capitalize">
                    {template.category}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Phase 6: Settings Integration Update

### Task 6.1: Update Settings/Integrations Page

**File to modify:** `crm7/src/pages/settings/integrations.tsx`

Add OAuth connect buttons for Google and Microsoft:

```tsx
// Add these imports
import { useEmailStore } from '../../stores/emailStore';
import { useEffect, useState } from 'react';
import { Mail, Check, AlertCircle, Trash2 } from 'lucide-react';

// Inside the component, add:
const {
  integrations,
  integrationsLoading,
  integrationsError,
  loadIntegrations,
  connectGoogle,
  connectMicrosoft,
  disconnectIntegration
} = useEmailStore();

useEffect(() => {
  loadIntegrations();
}, [loadIntegrations]);

// Add this section to the UI:
<section className="glass-card rounded-xl p-6">
  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
    <Mail className="w-5 h-5 text-blue-400" />
    Email Accounts
  </h2>

  <p className="text-slate-400 mb-6">
    Connect your email accounts to send emails directly from the CRM.
  </p>

  {integrationsError && (
    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
      <AlertCircle className="w-4 h-4" />
      {integrationsError}
    </div>
  )}

  {/* Connected accounts */}
  {integrations.length > 0 && (
    <div className="space-y-3 mb-6">
      {integrations.map((integration) => (
        <div
          key={integration.id}
          className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              integration.provider === 'google' ? 'bg-red-500/20' :
              integration.provider === 'microsoft' ? 'bg-blue-500/20' :
              'bg-slate-500/20'
            }`}>
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <p className="text-white text-sm">{integration.email}</p>
              <p className="text-xs text-slate-400 capitalize">{integration.provider}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {integration.is_active ? (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <Check className="w-3 h-3" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="w-3 h-3" /> Error
              </span>
            )}
            <button
              onClick={() => disconnectIntegration(integration.id)}
              className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
              title="Disconnect"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )}

  {/* Connect buttons */}
  <div className="grid gap-3 sm:grid-cols-2">
    <button
      onClick={connectGoogle}
      disabled={integrationsLoading}
      className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-lg transition-colors"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Connect Google
    </button>
    <button
      onClick={connectMicrosoft}
      disabled={integrationsLoading}
      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0078D4] hover:bg-[#106EBE] text-white font-medium rounded-lg transition-colors"
    >
      <svg className="w-5 h-5" viewBox="0 0 23 23">
        <path fill="#f3f3f3" d="M0 0h11v11H0z"/>
        <path fill="#f35325" d="M0 0h11v11H0z"/>
        <path fill="#81bc06" d="M12 0h11v11H12z"/>
        <path fill="#05a6f0" d="M0 12h11v11H0z"/>
        <path fill="#ffba08" d="M12 12h11v11H12z"/>
      </svg>
      Connect Microsoft
    </button>
  </div>
</section>
```

---

## Environment Variables to Add

Add to Supabase Edge Function secrets:

```bash
# Google OAuth (use existing from .env.local)
GOOGLE_EMAIL_CLIENT_ID=<REDACTED — stored in Supabase secrets>
GOOGLE_EMAIL_CLIENT_SECRET=<REDACTED — stored in Supabase secrets>

# Microsoft/Azure OAuth (registered)
MICROSOFT_CLIENT_ID=<REDACTED — stored in Supabase secrets>
MICROSOFT_CLIENT_SECRET=<REDACTED — stored in Supabase secrets>
MICROSOFT_TENANT_ID=common

# Cron job authentication
CRON_SECRET=<generate-random-32-char>
```

---

## Google Cloud Console Setup

1. Go to Google Cloud Console → APIs & Services → OAuth consent screen
2. Add scopes: `gmail.send`, `gmail.readonly`, `userinfo.email`
3. Add redirect URI: `https://tuybltdrdefjblnplpqo.supabase.co/functions/v1/oauth-google-email/callback`
4. Submit for verification (required for production use of gmail.send)

---

## Azure AD App Setup

User has registered the app. Ensure these are configured:

1. **Redirect URI:** `https://tuybltdrdefjblnplpqo.supabase.co/functions/v1/oauth-microsoft-email/callback`
2. **API Permissions (delegated):**
   - `Mail.Send`
   - `Mail.Read`
   - `User.Read`
   - `offline_access`
3. **Generate client secret** and add to Supabase secrets

---

## Verification Checklist

1. **Database migration**: Run migration, verify tables created
2. **Google OAuth**: Click connect → authorize → verify token stored
3. **Microsoft OAuth**: Click connect → authorize → verify token stored
4. **Platform email**: Send test via Resend, verify in inbox
5. **Gmail send**: Send via connected Gmail, verify in Sent folder
6. **Microsoft send**: Send via connected Outlook, verify in Sent folder
7. **Token refresh**: Wait 30+ min, verify tokens auto-refresh
8. **Email history**: View sent emails on contact/lead page
9. **Compose UI**: Open from contact, verify all fields work

---

## Files Summary

### Create

| Path | Lines (est) |
|------|-------------|
| `packages/db/migrations/0007_email_enhancements.sql` | ~100 |
| `supabase/functions/oauth-google-email/index.ts` | ~180 |
| `supabase/functions/oauth-microsoft-email/index.ts` | ~170 |
| `supabase/functions/email-token-refresh/index.ts` | ~60 |
| `supabase/functions/email-dispatcher/index.ts` | ~350 |
| `crm7/src/lib/emailService.ts` | ~180 |
| `crm7/src/stores/emailStore.ts` | ~120 |
| `crm7/src/components/email/EmailComposeDialog.tsx` | ~200 |
| `crm7/src/components/email/EmailHistory.tsx` | ~130 |
| `crm7/src/components/email/EmailTemplateSelector.tsx` | ~140 |

### Modify

| Path | Changes |
|------|---------|
| `crm7/src/pages/settings/integrations.tsx` | Add OAuth buttons + connected accounts list |

**Total: ~1,630 lines of new code**

---

## Phase 7: Lead Capture Email Notifications

### Current State (Braden Website)

The website's `useContactForm.ts` already invokes `email-dispatcher`:

```typescript
// Current code in braden/src/components/contact/useContactForm.ts (line 121-138)
await supabase.functions.invoke('email-dispatcher', {
  body: {
    to: 'info@braden.com.au',
    subject: 'New Website Enquiry: ' + values.company,
    body: `Name: ${values.name}\nEmail: ${values.email}...`
  },
});
```

**Problem:** `email-dispatcher` is a placeholder that only logs - emails never actually send.

**Solution:** Our Phase 3 rewrite makes `email-dispatcher` fully functional. We need to:

1. Ensure the payload format is compatible
2. Add confirmation email to the lead submitter
3. Use HTML templates for professional emails

### Task 7.1: Update useContactForm for dual emails

**File to modify:** `braden/src/components/contact/useContactForm.ts`

Replace the email sending section (lines 119-138) with:

```typescript
// Send notification to Braden team + confirmation to submitter
try {
  // 1. Notify Braden (info@braden.com.au)
  await supabase.functions.invoke('email-dispatcher', {
    body: {
      source: 'platform',
      tenant_id: 'braden-website',
      to: 'info@braden.com.au',
      subject: `New Website Enquiry: ${values.company}`,
      body_html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a365d;">New Lead from Braden Website</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Name:</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${values.name}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><a href="mailto:${values.email}">${values.email}</a></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Phone:</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><a href="tel:${values.phone}">${values.phone}</a></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Company:</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${values.company}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Service:</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${values.serviceType.replace('_', ' ')}</td></tr>
          </table>
          <div style="margin-top: 16px; padding: 16px; background: #f8fafc; border-radius: 8px;">
            <strong>Message:</strong>
            <p style="margin-top: 8px; white-space: pre-wrap;">${values.message}</p>
          </div>
          <p style="margin-top: 24px; color: #64748b; font-size: 12px;">
            This lead was submitted via the Braden website contact form.
          </p>
        </div>
      `,
    },
  });

  // 2. Send confirmation to lead submitter
  await supabase.functions.invoke('email-dispatcher', {
    body: {
      source: 'platform',
      tenant_id: 'braden-website',
      to: values.email,
      subject: 'Thank you for contacting Braden',
      body_html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <img src="https://braden.com.au/logo.png" alt="Braden" style="height: 40px; margin-bottom: 24px;" />
          <h2 style="color: #1a365d;">Thank you for reaching out, ${values.name.split(' ')[0]}!</h2>
          <p>We've received your enquiry about <strong>${values.serviceType.replace('_', ' ')}</strong> services and will be in touch within 1-2 business days.</p>
          <div style="margin: 24px 0; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #c41e3a;">
            <strong>Your message:</strong>
            <p style="margin-top: 8px; color: #475569;">${values.message}</p>
          </div>
          <p>In the meantime, feel free to:</p>
          <ul>
            <li>Call us at <a href="tel:1300272336">1300 BRADEN</a></li>
            <li>Visit our <a href="https://braden.com.au/services">services page</a></li>
          </ul>
          <p style="margin-top: 24px;">Best regards,<br/><strong>The Braden Team</strong></p>
          <hr style="margin-top: 32px; border: none; border-top: 1px solid #e2e8f0;" />
          <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">
            Braden Group Pty Ltd<br/>
            Brisbane, QLD Australia
          </p>
        </div>
      `,
    },
  });
} catch (emailErr) {
  console.error('Error sending emails:', emailErr);
  // Don't fail the form submission if email fails
}
```

### Task 7.2: Add CRM lead sync API endpoint

**File:** `crm7/pages/api/leads.ts` (or Edge Function alternative)

```typescript
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const leadData = req.body;

    // Insert into unified leads table
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        tenant_id: process.env.DEFAULT_TENANT_ID,
        first_name: leadData.first_name,
        last_name: leadData.last_name,
        email: leadData.email,
        phone: leadData.phone,
        company: leadData.company,
        job_title: leadData.job_title,
        notes: leadData.message,
        source: leadData.source || 'website',
        status: 'new',
        tags: leadData.tags || [],
        metadata: leadData.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    // Send notification email to sales team
    await supabase.functions.invoke('email-dispatcher', {
      body: {
        source: 'platform',
        tenant_id: lead.tenant_id,
        to: 'sales@braden.com.au',
        subject: `New CRM Lead: ${leadData.first_name} ${leadData.last_name} from ${leadData.company}`,
        body_html: `
          <h2>New Lead Synced from Website</h2>
          <p><strong>Name:</strong> ${leadData.first_name} ${leadData.last_name}</p>
          <p><strong>Company:</strong> ${leadData.company}</p>
          <p><strong>Email:</strong> ${leadData.email}</p>
          <p><strong>Phone:</strong> ${leadData.phone}</p>
          <p><a href="https://crm7.vercel.app/leads/${lead.id}">View in CRM</a></p>
        `,
        lead_id: lead.id,
      },
    });

    return res.status(200).json({ success: true, lead_id: lead.id });
  } catch (error: any) {
    console.error('Lead sync error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

---

## Email Flow Summary

### Lead Submission (Braden Website → Emails)

```
User submits contact form
        │
        ▼
┌───────────────────────────┐
│  useContactForm.ts        │
│  - Insert to clients      │
│  - Insert to leads        │
│  - Invoke email-dispatcher│
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│  email-dispatcher         │
│  - Send to info@braden    │ ◄── Notify Braden team
│  - Send to submitter      │ ◄── Confirm to lead
│  - Log to email_messages  │
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│  leadSync.js (periodic)   │
│  - Sync to CRM7           │
│  - Create CRM lead record │
│  - Notify sales team      │
└───────────────────────────┘
```

### User-Level Email (CRM7 → Customer)

```
User clicks "Send Email" on Contact/Lead page
        │
        ▼
┌───────────────────────────┐
│  EmailComposeDialog       │
│  - Select integration     │
│  - Compose message        │
│  - Click Send             │
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│  emailStore.sendEmail()   │
│  - POST to email-dispatcher│
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│  email-dispatcher         │
│  - Route by integration   │
│  ├─ Gmail API             │
│  ├─ Microsoft Graph       │
│  └─ SMTP                  │
└───────────────────────────┘
```

---

## Updated Verification Checklist

1. **Database migration**: Run migration, verify tables created
2. **Google OAuth**: Connect Gmail → authorize → verify token stored
3. **Microsoft OAuth**: Connect Outlook → authorize → verify token stored
4. **Platform email**: Send test via Resend → verify in inbox
5. **Gmail send**: Send via connected Gmail → verify in Sent folder
6. **Microsoft send**: Send via connected Outlook → verify in Sent folder
7. **Token refresh**: Wait 30+ min → verify tokens auto-refresh
8. **Email history**: View sent emails on contact/lead page
9. **Compose UI**: Open from contact → verify all fields work
10. **Lead notification**: Submit Braden contact form → verify <info@braden.com.au> receives
11. **Lead confirmation**: Submit Braden contact form → verify submitter receives confirmation
12. **CRM sync**: Check lead appears in CRM7 with correct data

---

## Updated Files Summary

### Create

| Path | Lines (est) |
|------|-------------|
| `packages/db/migrations/0007_email_enhancements.sql` | ~100 |
| `supabase/functions/oauth-google-email/index.ts` | ~180 |
| `supabase/functions/oauth-microsoft-email/index.ts` | ~170 |
| `supabase/functions/email-token-refresh/index.ts` | ~60 |
| `supabase/functions/email-dispatcher/index.ts` | ~350 |
| `crm7/src/lib/emailService.ts` | ~180 |
| `crm7/src/stores/emailStore.ts` | ~120 |
| `crm7/src/components/email/EmailComposeDialog.tsx` | ~200 |
| `crm7/src/components/email/EmailHistory.tsx` | ~130 |
| `crm7/src/components/email/EmailTemplateSelector.tsx` | ~140 |
| `crm7/pages/api/leads.ts` | ~70 |

### Modify

| Path | Changes |
|------|---------|
| `crm7/src/pages/settings/integrations.tsx` | Add OAuth buttons + connected accounts list |
| `braden/src/components/contact/useContactForm.ts` | Update email sending with HTML templates + confirmation |

**Updated Total: ~1,700 lines of new code**

---

## Phase 8: Embeddable Lead Capture Widget (Multi-Tenant)

### Goal

Create an embeddable form that any organization/tenant can add to their website:

- Leads route to their specific CRM tenant (your account for Braden, other orgs' accounts for theirs)
- Notifications go to their configured inbox (not hardcoded)
- Widget settings configurable per organization

### Task 8.1: Lead Capture Edge Function (Multi-Tenant)

**File:** `supabase/functions/lead-capture/index.ts`

This Edge Function handles lead submissions from any tenant's embedded widget:

1. Looks up the `org_id` to find the correct tenant
2. Creates lead in that tenant's CRM
3. Sends notification to that tenant's configured `lead_notification_email`
4. Sends confirmation to submitter (if enabled)

**Key features:**

- `org_id` determines which CRM tenant receives the lead
- Tenant `settings` JSONB column stores:
  - `lead_notification_email` - where notifications go
  - `send_lead_confirmation` - whether to email submitter
  - `lead_confirmation_template` - custom confirmation message

### Task 8.2: Widget Embed Script

**File:** `crm7/public/widget/lead-form.js`

Embeddable JavaScript snippet that other organizations add to their websites:

```html
<script
  src="https://crm7.vercel.app/widget/lead-form.js"
  data-org-id="YOUR_ORG_ID"
  data-theme="light"
></script>
```

Features:

- Self-contained (no dependencies)
- Customizable theme (light/dark)
- CORS-enabled to work on any domain
- Posts to `/functions/v1/lead-capture` with `org_id`

### Task 8.3: Widget Configuration UI

**File:** `crm7/src/pages/settings/widget.tsx`

Settings page where org admins configure their lead capture:

1. **Embed Code** - Copy-paste snippet with their `org_id`
2. **Notification Email** - Where to receive lead alerts
3. **Confirmation Toggle** - Whether to email submitters
4. **Live Preview** - See how the form looks

### Task 8.4: Tenant Settings Schema

Add to migration:

```sql
-- Add settings column if not exists
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Example tenant settings:
-- {
--   "lead_notification_email": "leads@acme.com",
--   "send_lead_confirmation": true,
--   "lead_confirmation_template": {
--     "subject": "Thank you for contacting ACME Corp",
--     "body": "We received your inquiry and will respond within 24 hours."
--   }
-- }
```

---

## Updated Verification Checklist (Final)

1. **Database migration**: Run migration, verify tables created
2. **Google OAuth**: Connect Gmail → authorize → verify token stored
3. **Microsoft OAuth**: Connect Outlook → authorize → verify token stored
4. **Platform email**: Send test via Resend → verify in inbox
5. **Gmail send**: Send via connected Gmail → verify in Sent folder
6. **Microsoft send**: Send via connected Outlook → verify in Sent folder
7. **Token refresh**: Wait 30+ min → verify tokens auto-refresh
8. **Email history**: View sent emails on contact/lead page
9. **Compose UI**: Open from contact → verify all fields work
10. **Braden lead notification**: Submit contact form → verify <info@braden.com.au> receives
11. **Lead confirmation**: Submit contact form → verify submitter receives confirmation
12. **CRM sync**: Check lead appears in YOUR CRM tenant (Braden tenant only)
13. **Widget embed**: Add widget to test page → submit lead → verify it goes to correct tenant
14. **Multi-tenant routing**: Test with different org_ids → leads route correctly

---

## Updated Files Summary (Final)

### Create

| Path | Lines (est) |
|------|-------------|
| `packages/db/migrations/0007_email_enhancements.sql` | ~120 |
| `supabase/functions/oauth-google-email/index.ts` | ~180 |
| `supabase/functions/oauth-microsoft-email/index.ts` | ~170 |
| `supabase/functions/email-token-refresh/index.ts` | ~60 |
| `supabase/functions/email-dispatcher/index.ts` | ~350 |
| `supabase/functions/lead-capture/index.ts` | ~180 |
| `crm7/src/lib/emailService.ts` | ~180 |
| `crm7/src/stores/emailStore.ts` | ~120 |
| `crm7/src/components/email/EmailComposeDialog.tsx` | ~200 |
| `crm7/src/components/email/EmailHistory.tsx` | ~130 |
| `crm7/src/components/email/EmailTemplateSelector.tsx` | ~140 |
| `crm7/pages/api/leads.ts` | ~70 |
| `crm7/public/widget/lead-form.js` | ~100 |
| `crm7/src/pages/settings/widget.tsx` | ~120 |

### Modify

| Path | Changes |
|------|---------|
| `crm7/src/pages/settings/integrations.tsx` | Add OAuth buttons + connected accounts list |
| `braden/src/components/contact/useContactForm.ts` | Update email sending with HTML templates + confirmation |

**Final Total: ~2,120 lines of new code**
