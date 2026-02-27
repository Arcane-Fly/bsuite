# AI Tools Migration & Calendar Edge Function Implementation Plan

**Version:** 1.00A
**Date:** 2026-02-28
**Status:** Approved (Complete)
**Applies to:** CRM7 (AI tools), business-suite-unified (Edge Functions)

---

## Table of Contents

1. [Scope Summary](#1-scope-summary)
2. [Part A: Legacy Tool Migration (parameters → inputSchema)](#2-part-a-legacy-tool-migration)
3. [Part B: Calendar Integration Edge Function](#3-part-b-calendar-integration-edge-function)
4. [Part C: Calendar Scopes in Existing OAuth Functions](#4-part-c-calendar-scopes-in-existing-oauth-functions)
5. [Testing Strategy](#5-testing-strategy)
6. [Deployment Checklist](#6-deployment-checklist)

---

## 1. Scope Summary

### What we ARE doing

| Task | Files | Effort |
|------|-------|--------|
| Migrate `crud-tools.ts` from `parameters` → `inputSchema` | `crm7/src/lib/ai/tools/crud-tools.ts` | ~15 tools, find-replace + type check |
| Migrate `report-tools.ts` from `parameters` → `inputSchema` | `crm7/src/lib/ai/tools/report-tools.ts` | ~7 tools |
| Migrate `timesheet-tools.ts` from `parameters` → `inputSchema` | `crm7/src/lib/ai/tools/timesheet-tools.ts` | ~8 tools |
| Migrate `search-tools.ts` from `parameters` → `inputSchema` | `crm7/src/lib/ai/tools/search-tools.ts` | ~5 tools |
| Add calendar scopes to Google OAuth Edge Function | `business-suite-unified/supabase/functions/oauth-google-email/index.ts` | Small change |
| Add calendar scopes to Microsoft OAuth Edge Function | `business-suite-unified/supabase/functions/oauth-microsoft-email/index.ts` | Small change |
| Build `calendar-integration` Edge Function | `business-suite-unified/supabase/functions/calendar-integration/index.ts` | New file |

### What we are NOT doing (already complete)

| Component | Location | Status |
|-----------|----------|--------|
| `oauth-google-email` Edge Function | `business-suite-unified/supabase/functions/oauth-google-email/index.ts` | ✅ Built (authorize/callback/refresh) |
| `oauth-microsoft-email` Edge Function | `business-suite-unified/supabase/functions/oauth-microsoft-email/index.ts` | ✅ Built (authorize/callback/refresh) |
| `email-dispatcher` Edge Function | `business-suite-unified/supabase/functions/email-dispatcher/index.ts` | ✅ Built (Resend/Gmail/Graph/SMTP) |
| `email-token-refresh` Edge Function | `business-suite-unified/supabase/functions/email-token-refresh/index.ts` | ✅ Built (cron-based) |
| Email schema migration (0005) | `business-suite-unified/packages/db/migrations/0005_email_enhancements.sql` | ✅ Written (email_messages, templates, audit_log) |
| Base email_integrations table (0003) | `business-suite-unified/packages/db/migrations/0003_crm_cms_email.sql` | ✅ Written |
| New AI tools (vacancy, screening, scheduling, email) | `crm7/src/lib/ai/tools/*.ts` | ✅ Built with `inputSchema` |
| Tool registry updates | `crm7/src/lib/ai/tools/index.ts` | ✅ Updated |

---

## 2. Part A: Legacy Tool Migration

### Problem

The AI SDK v6 renamed the `tool()` property from `parameters` to `inputSchema`. Four existing tool files use the deprecated `parameters` property, causing latent type errors.

### Files to Migrate

| File | Tool Count | Pattern |
|------|-----------|---------|
| `crm7/src/lib/ai/tools/crud-tools.ts` | 15 | `tool({ description, parameters: z.object({...}), execute })` |
| `crm7/src/lib/ai/tools/report-tools.ts` | 7 | Same pattern |
| `crm7/src/lib/ai/tools/timesheet-tools.ts` | 8 | Same pattern |
| `crm7/src/lib/ai/tools/search-tools.ts` | 5 | Same pattern |

### Migration Pattern

Each tool follows the identical pattern. The migration is a mechanical rename:

```typescript
// BEFORE (deprecated)
tool({
  description: '...',
  parameters: z.object({ ... }),
  execute: async (params) => { ... },
})

// AFTER (AI SDK v6)
tool({
  description: '...',
  inputSchema: z.object({ ... }),
  execute: async (params) => { ... },
})
```

### Execution Steps

1. **For each file**: Replace all occurrences of `parameters:` with `inputSchema:` inside `tool({...})` calls
2. **Type-check**: Run `npx tsc --noEmit` in crm7 to verify no type errors
3. **No logic changes**: The `execute` functions, Zod schemas, and return types remain identical

### Risk Assessment

- **Low risk**: This is a property rename only. No schema or logic changes.
- **Backwards compatibility**: AI SDK v6 only supports `inputSchema`, so this is required.
- **Rollback**: Simple revert of the property name if needed.

---

## 3. Part B: Calendar Integration Edge Function

### Overview

New Edge Function at `business-suite-unified/supabase/functions/calendar-integration/index.ts` that provides a unified calendar API supporting both Google Calendar and Microsoft Graph Calendar.

### API Design

| Route | Method | Description |
|-------|--------|-------------|
| `/list-calendars` | POST | List user's calendars |
| `/list-events` | POST | List events in a date range |
| `/create-event` | POST | Create a calendar event |
| `/update-event` | POST | Update an existing event |
| `/delete-event` | POST | Delete a calendar event |
| `/check-availability` | POST | Check free/busy for a time range |

### Authentication

- All routes require a valid Supabase JWT in the `Authorization` header
- The function looks up the user's `email_integrations` record to get the OAuth access token
- If the token is expired, it calls the appropriate OAuth refresh endpoint first

### Request/Response Schema

#### `/create-event`

```typescript
// Request
{
  integration_id: string;        // UUID of email_integrations record
  title: string;
  description?: string;
  start_time: string;            // ISO 8601
  end_time: string;              // ISO 8601
  timezone?: string;             // e.g. "Australia/Brisbane"
  location?: string;
  attendees?: Array<{ email: string; name?: string }>;
  reminders?: Array<{ minutes: number; method: 'email' | 'popup' }>;
}

// Response
{
  success: boolean;
  event_id?: string;             // Provider event ID
  html_link?: string;            // Link to view event
  error?: string;
}
```

#### `/list-events`

```typescript
// Request
{
  integration_id: string;
  start_date: string;            // ISO 8601
  end_date: string;              // ISO 8601
  max_results?: number;          // default 50
}

// Response
{
  success: boolean;
  events?: Array<{
    id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    attendees?: Array<{ email: string; name?: string; status?: string }>;
    html_link?: string;
    provider: 'google' | 'microsoft';
  }>;
  error?: string;
}
```

#### `/check-availability`

```typescript
// Request
{
  integration_id: string;
  start_time: string;
  end_time: string;
  attendee_emails?: string[];    // Check other people's availability
}

// Response
{
  success: boolean;
  busy_slots?: Array<{ start: string; end: string }>;
  is_available?: boolean;        // For the primary time range
  error?: string;
}
```

### Provider Mapping

| Operation | Google Calendar API | Microsoft Graph API |
|-----------|-------------------|-------------------|
| List calendars | `GET /calendar/v3/users/me/calendarList` | `GET /v1.0/me/calendars` |
| List events | `GET /calendar/v3/calendars/{id}/events` | `GET /v1.0/me/calendarView` |
| Create event | `POST /calendar/v3/calendars/{id}/events` | `POST /v1.0/me/events` |
| Update event | `PATCH /calendar/v3/calendars/{id}/events/{id}` | `PATCH /v1.0/me/events/{id}` |
| Delete event | `DELETE /calendar/v3/calendars/{id}/events/{id}` | `DELETE /v1.0/me/events/{id}` |
| Free/busy | `POST /calendar/v3/freeBusy` | `POST /v1.0/me/calendar/getSchedule` |

### Implementation Structure

```
calendar-integration/
  index.ts          # Main entry point with route handler
```

The function will:

1. Parse the route from the URL path
2. Verify the user's JWT via Supabase auth
3. Look up the `email_integrations` record for the given `integration_id`
4. Check token expiry and refresh if needed
5. Dispatch to the correct Google or Microsoft API
6. Normalise the response into a unified format

---

## 4. Part C: Calendar Scopes in Existing OAuth Functions

### Google OAuth (`oauth-google-email`)

Current scopes:

```
gmail.send, gmail.readonly, userinfo.email
```

Add calendar scopes:

```
calendar.events, calendar.readonly
```

**Change**: Update `GMAIL_SCOPES` array in `oauth-google-email/index.ts`

### Microsoft OAuth (`oauth-microsoft-email`)

Current scopes:

```
Mail.Send, Mail.Read, User.Read, offline_access
```

Add calendar scopes:

```
Calendars.ReadWrite, Calendars.Read.Shared
```

**Change**: Update `MS_SCOPES` array in `oauth-microsoft-email/index.ts`

### Impact

- Users who previously connected will need to **re-authorize** to grant the new calendar scopes
- New connections will automatically get both email + calendar scopes
- Consider renaming the functions from `oauth-*-email` to `oauth-*` in a future refactor (breaking change, deferred)

---

## 5. Testing Strategy

### Part A: Tool Migration

1. **Type check**: `cd crm7 && npx tsc --noEmit` — should produce zero errors
2. **Runtime test**: Start crm7 dev server, open Jodie chat, invoke a tool (e.g. `search_apprentices`)
3. **Regression**: All existing tool names still appear in `getAllToolNames()`

### Part B: Calendar Edge Function

1. **Local test** (via Supabase CLI):

   ```bash
   supabase functions serve calendar-integration --env-file .env.local
   ```

2. **Manual test**: Use `curl` to hit `/list-events` with a valid integration
3. **Error cases**: Invalid JWT, expired token, missing integration_id

### Part C: OAuth Scope Changes

1. **New connection**: Initiate Google/Microsoft OAuth and verify consent screen shows calendar scopes
2. **Existing connection**: Verify the flow prompts for incremental consent

---

## 6. Deployment Checklist

### Pre-deployment

- [ ] Email schema migration (`0005_email_enhancements.sql`) applied to production Supabase
- [ ] Supabase secrets set for `GOOGLE_EMAIL_CLIENT_ID`, `GOOGLE_EMAIL_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`
- [ ] Google Cloud Console: Calendar API enabled, scopes added to consent screen
- [ ] Azure AD: `Calendars.ReadWrite` and `Calendars.Read.Shared` permissions added

### Deployment Order

1. **Apply migration** `0005_email_enhancements.sql` (if not already applied)
2. **Deploy updated OAuth functions** (with calendar scopes)
3. **Deploy `calendar-integration`** Edge Function
4. **Deploy CRM7** with migrated tools (parameters → inputSchema)

### Post-deployment

- [ ] Verify all Jodie AI tools respond correctly
- [ ] Test Google OAuth re-authorization with calendar scopes
- [ ] Test Microsoft OAuth re-authorization with calendar scopes
- [ ] Test calendar event creation via Edge Function

---

## Execution Order

| Step | Task | Estimated Changes |
|------|------|-------------------|
| 1 | Migrate `crud-tools.ts` | ~15 `parameters:` → `inputSchema:` |
| 2 | Migrate `report-tools.ts` | ~7 replacements |
| 3 | Migrate `timesheet-tools.ts` | ~8 replacements |
| 4 | Migrate `search-tools.ts` | ~5 replacements |
| 5 | Type-check crm7 | `npx tsc --noEmit` |
| 6 | Add calendar scopes to `oauth-google-email` | 2-line change |
| 7 | Add calendar scopes to `oauth-microsoft-email` | 2-line change |
| 8 | Build `calendar-integration` Edge Function | New file (~350 lines) |
