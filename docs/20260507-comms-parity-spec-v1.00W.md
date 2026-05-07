# Comms parity spec — 3 Codehouse gaps (closes #571 research portion)

**Status:** WORKING (`v1.00W`) — research-lane specification, not yet implemented
**Owner:** perplexity-computer (autonomous cron — FF-AUTONOMY-20260506)
**Closes:** [GaryOcean428/bsuite#571](https://github.com/GaryOcean428/bsuite/issues/571) (research portion)
**Implementation tracker:** PR ladder filed by claude or copilot per Cron A routing matrix
**Live schema verified:** 2026-05-07T01:14Z via Supabase MCP project `tuybltdrdefjblnplpqo`
**Source matrix rows:** 81, 84, 85 (parity-matrix.md)
**Domain covered:** J (communications + notifications)

---

## 1. Scope (FULL — not MVP)

This spec covers **3 distinct comms parity gaps**:

| Matrix row | Domain | Codehouse name | BSuite state | Gap class |
|---|---|---|---|---|
| 81 | J | SMS dispatcher with Twilio + 5 event triggers + template editor | schema only, no dispatcher | 🔴 gap |
| 84 | J | Login-time pop-up notifications | `notifications` exists, no `login_popup` type | 🟡 partial |
| 85 | J | WHS safety-contact email alert | `whs_records` exists, no email trigger | ⛔ missing |

**No MVPs.** Per operator directive (2026-05-06): each gap closed to full Codehouse parity, with WCAG-AA UX in light + dark, RHF+Zod with cross-field rules, RLS-enforced auth, Supabase migrations honoring AUTH_CANONICAL.md, secrets via Supabase Vault.

**Out of scope for this spec:** Twilio account onboarding wizard (separate ticket); email IMAP receive (already covered by `r7_communications`); push notifications (PWA / FCM — future).

---

## 2. Live schema reference (Supabase project `tuybltdrdefjblnplpqo`)

Verified 2026-05-07T01:14Z via `mcp__supabase__execute_sql`:

### Existing tables (relevant subset)

```
communications
  (id, tenant_id, channel, direction, subject, body, status, recipient_type,
   recipient_id, recipient_email, recipient_phone, recipient_name,
   sender_id, sender_name, template_id, sent_at, delivered_at, opened_at,
   failed_reason, bulk_batch_id, tags, custom_fields, created_at,
   updated_at)

communication_templates
  (id, tenant_id, name, description, channel, subject, body, variables,
   category, is_active, custom_fields, created_at, updated_at)

email_templates
  (id, tenant_id, name, description, category, subject, body_html,
   body_text, variables, is_active, created_by, created_at, updated_at)

notifications
  (id, tenant_id, user_id, title, message, type, priority, entity_type,
   entity_id, action_url, read_at, dismissed_at, custom_fields,
   created_at, updated_at)

app_notifications
  (id, tenant_id, user_id, type, title, body, action_url, read,
   source_app, created_at)

whs_audits
  (id, tenant_id, host_employer_id, auditor_user_id, audit_date,
   audit_type, status, findings, corrective_actions, pass_score,
   overall_rating, reassessment_date, completed_at, report_url, notes,
   created_at, updated_at)

whs_records
  (id, tenant_id, host_org_id, record_type, details, reported_by,
   report_date)
```

### Missing tables (must be created)

```
sms_templates                     -- 160-char SMS body w/ variables
sms_dispatch_log                  -- Twilio MessageSid + status updates
twilio_credentials                -- per-tenant SID/token in Vault references
twilio_delivery_receipts          -- inbound webhook receipts
whs_safety_contacts               -- per-client safety-contact email list
login_popup_messages              -- scheduled pop-up notifications
login_popup_dismissals            -- per-user dismissal log (idempotent)
```

### Existing flag/enum changes needed

```
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'login_popup';
-- (or, if no enum exists, add CHECK constraint to notifications.type)
```

---

## 3. Decomposition into 5 ship-able PRs

```
571.1 (schema A: SMS + Twilio)         571.2 (schema B: WHS safety + login popup)
   │                                       │
   ├──► 571.3 (Edge Function: sms-dispatcher
   │           + template editor UI + 160 counter)
   │
   └──► 571.4 (UI: notifications/templates surfacing
               + login-popup admin)
                                            │
                                       571.5 (e2e + dashboard refresh)
```

### 571.1 — Schema A: SMS + Twilio (matrix row 81) ~2h

Tables created:
- `sms_templates` — tenant-scoped, `name`, `body` (max 1530 chars = 10 SMS parts), `variables jsonb`, `event_type enum`
- `twilio_credentials` — per-tenant; stores Vault key references, NOT the secrets themselves
- `sms_dispatch_log` — `recipient_phone`, `template_id`, `twilio_message_sid`, `status enum`, `cost_estimate numeric`, `retry_count int`, `failed_reason text`
- `twilio_delivery_receipts` — webhook payloads for status callbacks (queued → sent → delivered → failed)

Event-type enum:
```sql
CREATE TYPE sms_event_type AS ENUM (
  'missing_timesheet',
  'timesheet_rejected',
  'timesheet_unsubmitted',
  'awaiting_approval',
  'leave_event'
);
```

### 571.2 — Schema B: WHS safety + login popup (matrix rows 84, 85) ~1.5h

Tables created:
- `whs_safety_contacts` — per host employer (`host_employer_id`, `name`, `email`, `is_primary bool`)
- `login_popup_messages` — scheduled pop-ups (`title`, `body`, `audience jsonb` for role/tenant filters, `start_at`, `end_at`, `dismissible bool`, `severity enum`)
- `login_popup_dismissals` — `(user_id, popup_id) UNIQUE` so re-show is idempotent

Notification-type extension:
```sql
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_chk
  CHECK (type IN (
    'info','warning','error','success',
    'login_popup','whs_alert','sms_failed','timesheet_reminder'
  ));
```

### 571.3 — Edge Function: sms-dispatcher + template editor UI ~2.5h

- `crm7/supabase/functions/sms-dispatcher/index.ts` — Deno edge function
  - Takes batch of `{recipient_phone, template_id, variables}`
  - Resolves Twilio creds via `vault.decrypted_secrets` lookup (tenant-scoped)
  - Calls Twilio API with rate limit awareness (sleeps 1.05s between sends on trial accounts)
  - Writes `sms_dispatch_log` rows with returned `MessageSid`
  - Subscribes to status updates via webhook endpoint (separately deployed as `twilio-status-webhook`)
- `crm7/src/pages/communications/templates.tsx` — adds SMS tab next to existing email tab
  - 160-char live counter with multi-part GSM-7 estimate (uses `gsm-utf8-length` calc)
  - Variable picker (`@first_name`, `@timesheet_url`, etc. — Codehouse legacy `@` prefix)
  - Test-send to a single phone before activation
- `crm7/supabase/functions/twilio-status-webhook/index.ts` — receives Twilio delivery receipts; idempotent on `MessageSid`

### 571.4 — UI: notifications surfacing + login-popup admin ~2h

- `crm7/src/pages/notifications/login-popups.tsx` — new admin page
  - Schedule pop-up: title + body (rich text), audience filter, dates, dismissible toggle, severity
  - Live preview matching production look
- `crm7/src/components/LoginPopupPresenter.tsx` — wraps `<App>` and shows the next undismissed eligible popup on first paint after auth
  - Z-index high, focus trap, keyboard escape dismisses (if dismissible)
  - Writes `login_popup_dismissals` row on dismiss
  - WCAG-AA: focus visible, accessible-name on close button, aria-live="polite"
- `crm7/src/services/notificationService.ts` — adds `whs.send-safety-alert(host_employer_id, payload)` function
  - Looks up `whs_safety_contacts` for host org
  - Sends one email per contact via existing `email-dispatcher` edge function with template `whs_alert`
  - Logs to `communications` with `category='whs_alert'`

### 571.5 — End-to-end test + dashboard refresh ~1h

- Playwright `e2e/comms-parity.spec.ts`:
  1. Log in as `gto_admin`
  2. Settings → Communications → SMS Templates → New → "Missing Timesheet"
  3. Type body, see counter; pick `@first_name` variable; save
  4. Trigger missing-timesheet event manually → verify `sms_dispatch_log` row + Twilio mock returns success
  5. Notifications → Login Popups → New → "Maintenance window" → save
  6. Log out; log back in → popup appears; close it; reload → no popup (dismissed once)
  7. WHS form → submit answer "yes" to safety question → verify `communications` row created with `category='whs_alert'`
- After merge, fire dashboard-refresh event

---

## 4. Migrations (copy-paste-ready)

> Applied via `mcp__supabase__apply_migration` (per supabase skill rules).

### Migration 571.1.A — SMS + Twilio schema

```sql
-- name: 20260507_comms_parity_571_schema_a

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TYPE public.sms_event_type AS ENUM (
  'missing_timesheet',
  'timesheet_rejected',
  'timesheet_unsubmitted',
  'awaiting_approval',
  'leave_event'
);

CREATE TYPE public.sms_dispatch_status AS ENUM (
  'queued','sent','delivered','undelivered','failed'
);

CREATE TABLE IF NOT EXISTS public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  body text NOT NULL CHECK (length(body) > 0 AND length(body) <= 1530),
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  event_type public.sms_event_type,
  is_active bool NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.sms_templates FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id()
              AND auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));

CREATE TABLE IF NOT EXISTS public.twilio_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  is_active bool NOT NULL DEFAULT true,
  account_sid_vault_key text NOT NULL,         -- key in vault.secrets
  auth_token_vault_key text NOT NULL,          -- key in vault.secrets
  default_from_number text NOT NULL CHECK (default_from_number ~ '^\+[1-9][0-9]{6,14}$'),
  webhook_url text,                             -- for status callbacks
  rate_limit_per_second int NOT NULL DEFAULT 1, -- 1 for trial; raise for paid
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX twilio_one_active_per_tenant
  ON public.twilio_credentials(tenant_id) WHERE is_active = true;
ALTER TABLE public.twilio_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.twilio_credentials FOR ALL
  USING (tenant_id = public.current_tenant_id()
         AND auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'))
  WITH CHECK (tenant_id = public.current_tenant_id()
              AND auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));

CREATE TABLE IF NOT EXISTS public.sms_dispatch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  template_id uuid REFERENCES public.sms_templates(id),
  recipient_phone text NOT NULL,
  recipient_user_id uuid REFERENCES auth.users(id),
  body_rendered text NOT NULL,
  twilio_message_sid text UNIQUE,
  status public.sms_dispatch_status NOT NULL DEFAULT 'queued',
  cost_estimate numeric(10,4),
  retry_count int NOT NULL DEFAULT 0,
  failed_reason text,
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  payload_seen jsonb
);
CREATE INDEX sms_dispatch_log_tenant_idx ON public.sms_dispatch_log(tenant_id, dispatched_at DESC);
CREATE INDEX sms_dispatch_log_sid_idx ON public.sms_dispatch_log(twilio_message_sid);
ALTER TABLE public.sms_dispatch_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.sms_dispatch_log FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE TABLE IF NOT EXISTS public.twilio_delivery_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twilio_message_sid text NOT NULL,
  status text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (twilio_message_sid, status)            -- idempotent
);
CREATE INDEX twilio_receipts_sid_idx ON public.twilio_delivery_receipts(twilio_message_sid);
```

### Migration 571.2.A — WHS safety + login popup schema

```sql
-- name: 20260507_comms_parity_571_schema_b

CREATE TABLE IF NOT EXISTS public.whs_safety_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  host_employer_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
  phone text,
  is_primary bool NOT NULL DEFAULT false,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX whs_one_primary_per_host
  ON public.whs_safety_contacts(host_employer_id) WHERE is_primary = true AND is_active = true;
ALTER TABLE public.whs_safety_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.whs_safety_contacts FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE TABLE IF NOT EXISTS public.login_popup_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  audience jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {roles:[],tenant_ids:[],all:true}
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  dismissible bool NOT NULL DEFAULT true,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','urgent')),
  is_active bool NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at IS NULL OR end_at > start_at)
);
ALTER TABLE public.login_popup_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_read ON public.login_popup_messages FOR SELECT
  USING (tenant_id = public.current_tenant_id() AND is_active = true);
CREATE POLICY admin_write ON public.login_popup_messages FOR ALL
  USING (tenant_id = public.current_tenant_id()
         AND auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'))
  WITH CHECK (tenant_id = public.current_tenant_id()
              AND auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));

CREATE TABLE IF NOT EXISTS public.login_popup_dismissals (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  popup_id uuid NOT NULL REFERENCES public.login_popup_messages(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, popup_id)
);
ALTER TABLE public.login_popup_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_self ON public.login_popup_dismissals FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add login_popup + whs_alert to notifications.type via CHECK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'notifications' AND constraint_name = 'notifications_type_chk'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_type_chk
      CHECK (type IN (
        'info','warning','error','success',
        'login_popup','whs_alert','sms_failed','timesheet_reminder'
      ));
  END IF;
END $$;
```

---

## 5. Zod schemas + cross-field rules

```ts
// packages/comms-validators/src/index.ts (new)
import { z } from 'zod';

/** GSM-7 character set check (Twilio-compatible). Multi-part >160. */
export function smsLengthEstimate(body: string): { chars: number; parts: number; encoding: 'GSM-7' | 'UCS-2' } {
  const gsm7 = /^[A-Za-z0-9 \r\n@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#$%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\\[~\]|€]*$/;
  const isGsm = gsm7.test(body);
  const enc = isGsm ? 'GSM-7' : 'UCS-2';
  const single = isGsm ? 160 : 70;
  const multi = isGsm ? 153 : 67;
  if (body.length <= single) return { chars: body.length, parts: 1, encoding: enc };
  return { chars: body.length, parts: Math.ceil(body.length / multi), encoding: enc };
}

export const SmsTemplateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  body: z.string().min(1).max(1530),
  variables: z.array(z.string().regex(/^@[a-z_][a-z0-9_]*$/, 'Variables use @snake_case prefix')).default([]),
  event_type: z.enum([
    'missing_timesheet','timesheet_rejected','timesheet_unsubmitted',
    'awaiting_approval','leave_event'
  ]).optional(),
  is_active: z.boolean().default(true),
}).superRefine((d, ctx) => {
  const est = smsLengthEstimate(d.body);
  if (est.parts > 10) {
    ctx.addIssue({ code:'custom', message:'SMS body exceeds 10-part limit (1530 GSM-7 / 670 UCS-2)', path:['body'] });
  }
});

export const TwilioCredentialsSchema = z.object({
  account_sid_vault_key: z.string().min(2).max(120),
  auth_token_vault_key: z.string().min(2).max(120),
  default_from_number: z.string().regex(/^\+[1-9][0-9]{6,14}$/, 'Use E.164 format (+CountryCodeNumber)'),
  webhook_url: z.string().url().optional(),
  rate_limit_per_second: z.number().int().min(1).max(100).default(1),
});

export const WhsSafetyContactSchema = z.object({
  host_employer_id: z.string().uuid(),
  name: z.string().min(2).max(200),
  email: z.string().email(),
  phone: z.string().optional(),
  is_primary: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const LoginPopupMessageSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(2).max(2000),
  audience: z.object({
    all: z.boolean().optional(),
    roles: z.array(z.string()).optional(),
    tenant_ids: z.array(z.string().uuid()).optional(),
  }).default({ all: true }),
  start_at: z.coerce.date(),
  end_at: z.coerce.date().optional(),
  dismissible: z.boolean().default(true),
  severity: z.enum(['info','warning','urgent']).default('info'),
  is_active: z.boolean().default(true),
}).superRefine((d, ctx) => {
  if (d.end_at && d.end_at <= d.start_at) {
    ctx.addIssue({ code:'custom', message:'end_at must be after start_at', path:['end_at'] });
  }
});
```

---

## 6. Edge Function: sms-dispatcher

```ts
// crm7/supabase/functions/sms-dispatcher/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { SmsTemplateSchema } from '@bsuite/comms-validators';

interface DispatchRequest {
  template_id: string;
  recipients: Array<{ phone: string; user_id?: string; variables: Record<string, string> }>;
}

Deno.serve(async (req) => {
  const { template_id, recipients } = (await req.json()) as DispatchRequest;
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Resolve template + tenant_id
  const { data: tpl, error: tplErr } = await sb.from('sms_templates').select('*').eq('id', template_id).single();
  if (tplErr || !tpl) return new Response(JSON.stringify({ error: 'template_not_found' }), { status: 404 });

  // Fetch active Twilio creds for tenant
  const { data: cred } = await sb.from('twilio_credentials')
    .select('*').eq('tenant_id', tpl.tenant_id).eq('is_active', true).single();
  if (!cred) return new Response(JSON.stringify({ error: 'no_twilio_credentials' }), { status: 412 });

  const { data: secrets } = await sb.from('vault.decrypted_secrets')
    .select('name, decrypted_secret')
    .in('name', [cred.account_sid_vault_key, cred.auth_token_vault_key]);
  const sid = secrets?.find(s => s.name === cred.account_sid_vault_key)?.decrypted_secret;
  const token = secrets?.find(s => s.name === cred.auth_token_vault_key)?.decrypted_secret;
  if (!sid || !token) return new Response(JSON.stringify({ error: 'vault_lookup_failed' }), { status: 500 });

  const auth = btoa(`${sid}:${token}`);
  const sendUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const interval = 1000 / cred.rate_limit_per_second;

  const results = [];
  for (const r of recipients) {
    const body = renderTemplate(tpl.body, r.variables);
    try {
      const resp = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: cred.default_from_number,
          To: r.phone,
          Body: body,
          StatusCallback: cred.webhook_url ?? '',
        }).toString(),
      });
      const json = await resp.json();
      const sidOut = json.sid as string | undefined;
      await sb.from('sms_dispatch_log').insert({
        tenant_id: tpl.tenant_id,
        template_id,
        recipient_phone: r.phone,
        recipient_user_id: r.user_id ?? null,
        body_rendered: body,
        twilio_message_sid: sidOut,
        status: resp.ok ? 'sent' : 'failed',
        failed_reason: resp.ok ? null : json.message ?? `http_${resp.status}`,
        payload_seen: json,
      });
      results.push({ phone: r.phone, ok: resp.ok, sid: sidOut });
    } catch (err) {
      await sb.from('sms_dispatch_log').insert({
        tenant_id: tpl.tenant_id,
        template_id,
        recipient_phone: r.phone,
        recipient_user_id: r.user_id ?? null,
        body_rendered: body,
        status: 'failed',
        failed_reason: String(err),
      });
      results.push({ phone: r.phone, ok: false, error: String(err) });
    }
    // Rate-limit pacing (Twilio trial = 1 msg/sec default)
    if (recipients.indexOf(r) < recipients.length - 1) {
      await new Promise(res => setTimeout(res, interval));
    }
  }

  return new Response(JSON.stringify({ dispatched: results.length, results }), {
    headers: { 'content-type': 'application/json' },
  });
});

/** Replace @variables with values, leave unmatched literally. */
function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/@([a-z_][a-z0-9_]*)/g, (_m, name) => vars[name] ?? `@${name}`);
}
```

---

## 7. Tests (~40 unit + 6 integration + 1 e2e)

### Unit (Vitest)

`packages/comms-validators/test/sms.test.ts`:
1–8. `smsLengthEstimate`: 1-part GSM-7, 2-part GSM-7, 1-part UCS-2 (emoji), 2-part UCS-2, exactly 160 chars, 161 chars (2 parts), 1530 cap, >1530 fails
9–14. `SmsTemplateSchema`: valid → ok, missing name → fail, body too long → superRefine fails, invalid variable name → fail (no `@`), invalid event_type → fail, default `is_active=true`
15–18. `TwilioCredentialsSchema`: valid E.164, missing `+` fails, rate_limit > 100 fails, default rate_limit=1
19–22. `WhsSafetyContactSchema`: valid, missing email fails, invalid email fails, default `is_active=true`
23–28. `LoginPopupMessageSchema`: valid, end_at < start_at fails, severity invalid fails, default audience={all:true}, default dismissible=true, body too long fails

`crm7/test/services/comms.test.ts` — 12 service-layer tests (smsTemplatesService, twilioCredentialsService, smsDispatchLogService, whsSafetyContactsService, loginPopupService, dismissalsService — list/create/update/inactivate per service).

### Integration (Playwright Component / Vitest)

`crm7/test/comms/sms-template-editor.spec.tsx` — render editor; type body; counter updates; pick variable; counter recomputes; save mutates store.
`crm7/test/comms/login-popup-presenter.spec.tsx` — mount with active popup → renders; click close → dismissal recorded; reload → no popup.
`crm7/test/comms/whs-alert.spec.ts` — mock notification service; submit WHS form with `yes` → safety-contact email queued.
`crm7/supabase/functions/sms-dispatcher/test.ts` — mock Twilio response; verify dispatch_log row + rate-limit pacing.
`crm7/supabase/functions/twilio-status-webhook/test.ts` — POST status callback twice for same SID → only 1 row in delivery_receipts (idempotency check).
`crm7/test/admin/twilio-credentials.spec.tsx` — settings page CRUD + Vault key validation.

### E2E (Playwright, 1 case)

`crm7/e2e/comms-parity.spec.ts` — full happy path described in §3 step 571.5.

---

## 8. Documentation drift fixes (closes part of #579)

- Update `crm7/README.md` Features list to mention: SMS templates with Twilio, login pop-up notifications, WHS safety-contact email alerts.
- Update `crm7/docs/communications-overview.md` (new) with the 5 SMS event types + WHS escalation flow diagram.

---

## 9. PR description template (for implementation PRs)

```markdown
## Scope
571.X — <short title>

## Files
- <list>

## Evidence
- Migration applied: <name> at <timestamp>
- Live verify: `select * from <table> where ...` returns expected
- crm7/src/<file>.tsx:<line> — UI surface
- crm7/test/<file>.spec.ts:<line> — test
- e2e/comms-parity.spec.ts:<line> — passes locally

## §17 Mutual reminder

- [ ] Red-team table reviewed (UX/Security/Perf/Reliability/Quality)
- [ ] Smoke test passes locally + in CI
- [ ] Branch will be deleted after squash-merge
- [ ] No dead code left behind

## AUTH_CANONICAL.md compliance
- [ ] All new tables have RLS enabled
- [ ] All policies cite canonical role enum
- [ ] No cookie SSO introduced
- [ ] Twilio creds via Vault, never plaintext in env or DB
- [ ] SECURITY DEFINER functions have locked search_path
```

---

## 10. Red-team table (§17 mandatory)

| Domain | Concern | Mitigation |
|---|---|---|
| **UX** | 160-char counter could feel laggy on every keystroke | Debounce GSM-7 detection by 100ms; counter renders synchronously without debounce |
| **UX** | Login popup blocks the page; could be dismissed accidentally | Focus trap + Escape only dismisses if `dismissible=true`; non-dismissible popups need explicit click on action button |
| **Security** | Twilio creds in env vars leak into client-side bundle | Never imported into client code; all dispatch via edge function; client only POSTs to `/api/sms/dispatch` |
| **Security** | WHS email could be sent cross-tenant via crafted host_employer_id | Service function double-checks `host_employer_id` belongs to current tenant before lookup |
| **Security** | Twilio webhook accepts unsigned POSTs | Validate `X-Twilio-Signature` HMAC against Twilio auth token before persisting |
| **Performance** | SMS dispatch to 1000 recipients takes 1000s on trial | Document trial limit; recommend paid account for bulk; UI shows ETA based on `rate_limit_per_second` |
| **Performance** | Login popup query on every page load | Cache fetched popup in TanStack Query with 60s staleTime; presenter component only fires once per session |
| **Reliability** | Twilio API hiccups mid-batch | Per-recipient try/catch; `failed_reason` recorded; batch result returned with per-row status |
| **Reliability** | Webhook receipt for unknown SID | Insert anyway (UNIQUE on (sid, status) guards dupes); orphan receipts visible in admin log for debugging |
| **Quality** | Risk of duplicating email-template store with SMS | New `sms_templates` table; existing email templates untouched; UI shares the same CRUD pattern (DRY via shared `<TemplateEditor>` component) |
| **Quality** | DRY — variable substitution logic should not be duplicated | Single `renderTemplate()` helper in `@bsuite/comms-validators` consumed by edge function + UI preview |
| **Quality** | `notification_type` enum check vs ALTER TYPE ENUM | Used CHECK constraint instead of native enum to avoid the lock-and-rewrite cost of ALTER TYPE in production |

---

## 11. Smoke test plan

After full ladder ships:
1. As `gto_admin`, log into crm7
2. Settings → Communications → Twilio → enter trial creds → save
3. Settings → SMS Templates → New → "Missing Timesheet" → body: "Hi @first_name, your timesheet for @period is missing. Submit at @url" → counter shows 1 part GSM-7
4. Trigger missing-timesheet event for one apprentice → verify SMS dispatched to test number
5. SMS dispatch log shows `sent` then (after webhook) `delivered`
6. Notifications → Login Popups → New → "Maintenance window 8pm" → audience all → save
7. Log out and back in → popup appears; close it
8. Reload → no popup (dismissal recorded)
9. WHS form → submit answer "yes" to safety question → check `communications` for new email row to safety contact

All steps must complete without console errors, with light/dark WCAG-AA, and the popup focus-traps correctly.

---

## 12. Citations

- [AnyTime Admin Guide (WF1) — Codehouse PDF](https://help.codehouseworkforce.com.au) pp. 65–70 (SMS, login pop-ups, WHS alerts)
- [WF1 FAQ — Bulk Send Email and SMS](https://help.codehouseworkforce.com.au) — bulk send confirmed
- [Twilio — Programmable Messaging API 2026](https://www.twilio.com/docs/sms/api)
- [Twilio — Trial account rate limits](https://www.twilio.com/docs/usage/rest)
- [Twilio — StatusCallback signatures](https://www.twilio.com/docs/usage/webhooks/sms-webhooks)
- [GSM-7 character set](https://en.wikipedia.org/wiki/GSM_03.38)
- [Supabase — Vault & secret encryption](https://supabase.com/docs/guides/database/vault)
- [Supabase — Edge Functions](https://supabase.com/docs/guides/functions)
- Internal: `competitor/parity-matrix.md` rows 81, 84, 85
- Internal: `competitor/bsuite-inventory.md` §J item 3
- Internal: `bsuite/docs/AUTH_CANONICAL.md` §§3.4, 4, 5, 6
- Internal: prior parity specs PR #594 (timesheet), #596 (leave), #598 (reports), #600 (pay-periods), #602 (file-export), #603 (integrations), #604 (admin)

---

*Filed by perplexity-computer · 2026-05-07T01:14Z · cron 8c20448f run #14*
*FF-AUTONOMY + FF-PROACTIVE-COLLAB + FF-COMPLETION-NORTH-STAR + FF-OBVIOUS-FIX-AUTONOMY*
