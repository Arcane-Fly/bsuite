<!-- G5-VERDICT-BANNER -->
> **VERDICT (DELIVERED) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ✅ VERDICT: DELIVERED
>
> Google and Azure/Microsoft OAuth setup is live in production.
>
> **Evidence, live project `tuybltdrdefjblnplpqo` (2026-08-17):** edge functions
> `oauth-google-email` (v93, ACTIVE) and `oauth-microsoft-email` (v94, ACTIVE), with
> `email-token-refresh` (v62) handling rotation. Google Workload Identity Federation replaced the
> static service-account key (see `20260305-wif-migration-plan-v1.00A.md`).
>
> **Marker defect:** `W` on delivered work.
>
> Setup instructions below remain useful as a runbook for adding a new provider tenant.

---

# End-to-End Flows & Google/Azure Setup Requirements

**Version:** 1.00W
**Date:** 2026-02-27
**Status:** Working
**Applies to:** All BSuite projects (CRM7, Conduit, BSU, R80.3, Braden)

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [User Flow 1: Host Employer Posts Vacancy](#2-user-flow-1-host-employer-posts-vacancy)
3. [User Flow 2: Jodie AI Screens Candidates](#3-user-flow-2-jodie-ai-screens-candidates)
4. [User Flow 3: Interview Scheduling & Calendar](#4-user-flow-3-interview-scheduling--calendar)
5. [User Flow 4: Email Triage & Automation](#5-user-flow-4-email-triage--automation)
6. [User Flow 5: Document Handling & Compliance](#6-user-flow-5-document-handling--compliance)
7. [Google Cloud Console Setup](#7-google-cloud-console-setup)
8. [Azure AD / Entra ID Setup](#8-azure-ad--entra-id-setup)
9. [Supabase Edge Function Secrets](#9-supabase-edge-function-secrets)
10. [Implementation Phases](#10-implementation-phases)

---

## 1. Current State Audit

### What EXISTS Today

| Capability | Status | Location |
| --- | --- | --- |
| Supabase Auth (email/password + Google + Azure AD) | Production | All apps via `AUTH-MAP.md` |
| BS OAuth 2.1 PKCE (SSO across apps) | Production | BSU as server, CRM7/R80.3/Braden as clients |
| Cookie-based cross-subdomain SSO (.crm7.app) | Production | BSU, CRM7, R80.3 |
| Jodie AI chat endpoint (Edge Runtime) | Built | `crm7/api/ai/chat.ts` |
| Jodie persona + skills + model router | Built | `crm7/src/lib/ai/` |
| AI Tool registry (CRUD, reports, timesheets, search) | Built | `crm7/src/lib/ai/tools/` |
| Conduit entity types (Candidate, Job, Application, Pipeline, Communication, Document, Compliance) | Built | `conduit/src/types/entities.ts` |
| Conduit communication store + service | Built | `conduit/src/stores/communicationStore.ts`, `conduit/src/lib/communicationService.ts` |
| Conduit communications UI (timeline, compose, item) | Built | `conduit/src/components/communications/` |
| Conduit candidate/job pages with comms integration | Built | `conduit/src/app/(dashboard)/candidates/[id]/`, `jobs/[id]/` |
| Email schema (email_messages, email_templates, email_audit_log, email_integrations) | Planned | `docs/plans/20260227-email-capabilities-plan-v1.00W.md` |
| Google OAuth Edge Function for Gmail | Planned | Email capabilities plan Phase 2 |
| Microsoft OAuth Edge Function for Graph | Planned | Email capabilities plan Phase 2 |
| Resend platform email (send-notification) | Production | `supabase/functions/send-notification/` |
| `email_integrations` table | Schema exists | `packages/db/migrations/0003_crm_cms_email.sql` |

### What is MISSING (Gap Analysis)

| Capability | Gap | Required For |
| --- | --- | --- |
| Host employer portal / vacancy posting UI | No employer-facing UI in Conduit | Flow 1 |
| Employer entity CRUD in Conduit | Types exist but no store/pages | Flow 1 |
| AI candidate screening tools | No screening tools in Jodie registry | Flow 2 |
| Resume parsing / scoring | No parser or scorer exists | Flow 2 |
| Google Calendar API integration | Not implemented | Flow 3 |
| Microsoft Graph Calendar API | Not implemented | Flow 3 |
| Calendar Edge Function | Does not exist | Flow 3 |
| Interview scheduling UI | No scheduling component in Conduit | Flow 3 |
| Gmail API send implementation | Edge Function placeholder only | Flow 4 |
| Microsoft Graph send implementation | Not implemented | Flow 4 |
| Email inbox sync (read/triage) | Not implemented | Flow 4 |
| Automated email rules/triage | Not implemented | Flow 4 |
| Document upload to Supabase Storage | Types exist, no upload flow | Flow 5 |
| Document verification workflow | Types exist, no UI | Flow 5 |
| Google Drive integration | Not implemented | Flow 5 |
| OneDrive/SharePoint integration | Not implemented | Flow 5 |

---

## 2. User Flow 1: Host Employer Posts Vacancy

### Flow Description

A host employer (managed via CRM7) needs to post a vacancy that appears in Conduit for candidate matching.

### Architecture

```
CRM7 (Employer Management)          Conduit (Recruitment ATS)
┌─────────────────────────┐         ┌──────────────────────────┐
│ Employer creates vacancy │ ──DB──> │ Job listing appears      │
│ via CRM7 or Jodie AI    │         │ Candidates can be matched│
│                          │         │ Applications tracked     │
└─────────────────────────┘         └──────────────────────────┘
```

### Current State

- **Conduit has** `Job`, `Application`, `PipelineStage`, `PipelineEntry` types
- **Conduit has** `JobStatus`: draft, open, closed, filled, cancelled
- **Conduit has** `JobDistribution` for multi-channel posting
- **Missing**: Employer store, employer-facing portal, job creation flow from CRM7

### Implementation Required

1. **Conduit employer store** (`conduit/src/stores/employerStore.ts`) — CRUD for `conduit_employers` table
2. **Conduit job creation page** (`conduit/src/app/(dashboard)/jobs/new/page.tsx`) — form to create jobs linked to employers
3. **CRM7 → Conduit bridge**: Jodie AI tool `create_vacancy` that writes to `conduit_jobs` table via Supabase
4. **Employer portal** (Phase 2): Authenticated employer view to post/manage their own vacancies

### New Jodie AI Tool

```typescript
// crm7/src/lib/ai/tools/vacancy-tools.ts
create_vacancy: tool({
  description: 'Create a job vacancy for a host employer in Conduit',
  parameters: z.object({
    employerId: z.string().uuid(),
    title: z.string(),
    description: z.string(),
    location: z.string(),
    employmentType: z.enum(['full_time', 'part_time', 'casual', 'contract', 'apprenticeship', 'traineeship']),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    salaryType: z.enum(['hourly', 'weekly', 'annual']).optional(),
    closingDate: z.string().optional(),
  }),
  execute: async (params) => {
    // Insert into conduit_jobs via Supabase
  }
})
```

---

## 3. User Flow 2: Jodie AI Screens Candidates

### Flow Description

Jodie reviews applications against job requirements, scores candidates, and recommends shortlists.

### Architecture

```
Jodie AI (CRM7)
┌────────────────────────────────────────────────┐
│ 1. Fetch open job + requirements               │
│ 2. Fetch applications for that job              │
│ 3. For each candidate:                          │
│    a. Parse resume (Supabase Storage URL)       │
│    b. Match skills/qualifications vs job reqs   │
│    c. Score (0-100) with reasoning              │
│ 4. Rank candidates                              │
│ 5. Update application.score + pipeline stage    │
│ 6. Send notification to hiring manager          │
└────────────────────────────────────────────────┘
```

### New AI Tools Required

```typescript
// crm7/src/lib/ai/tools/screening-tools.ts

screen_candidates: tool({
  description: 'Screen all candidates for a job vacancy against requirements and score them',
  parameters: z.object({
    jobId: z.string().uuid(),
    criteria: z.array(z.string()).optional().describe('Additional screening criteria'),
  }),
  // Reads conduit_jobs + conduit_applications + conduit_candidates
  // Scores each candidate, updates application.score
  // Moves top candidates to "shortlisted" pipeline stage
})

score_candidate: tool({
  description: 'Score a single candidate against a job posting',
  parameters: z.object({
    candidateId: z.string().uuid(),
    jobId: z.string().uuid(),
  }),
  // Returns score + reasoning
})

shortlist_candidates: tool({
  description: 'Move top-scored candidates to shortlist stage',
  parameters: z.object({
    jobId: z.string().uuid(),
    count: z.number().default(5).describe('Number of top candidates to shortlist'),
  }),
})

parse_resume: tool({
  description: 'Extract structured data from a candidate resume',
  parameters: z.object({
    candidateId: z.string().uuid(),
  }),
  // Downloads from Supabase Storage, sends to AI for extraction
  // Updates candidate.skills, candidate.qualifications
})
```

### Resume Parsing Approach

- Resumes stored in Supabase Storage (`candidate.resume_url`)
- Edge Function downloads PDF/DOCX, extracts text
- Jodie AI (Grok 4.1 with 2M context) analyses text, extracts structured fields
- Results saved back to candidate record

---

## 4. User Flow 3: Interview Scheduling & Calendar

### Flow Description

After screening, Jodie schedules interviews by checking calendars, proposing times, sending invites.

### Architecture

```
Jodie AI ──> Calendar Edge Function ──> Google Calendar API
                                    ──> Microsoft Graph Calendar API
         ──> Email Edge Function ───> Gmail/Graph send invite
         ──> Conduit DB ────────────> conduit_interviews table (new)
```

### New Schema Required

```sql
CREATE TABLE conduit_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    application_id UUID REFERENCES conduit_applications(id),
    candidate_id UUID NOT NULL,
    job_id UUID NOT NULL,
    interviewer_ids UUID[] NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location TEXT,
    meeting_url TEXT,
    calendar_event_id TEXT,
    calendar_provider TEXT CHECK (calendar_provider IN ('google', 'microsoft')),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show')),
    notes TEXT,
    feedback JSONB,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New AI Tools Required

```typescript
// crm7/src/lib/ai/tools/scheduling-tools.ts

check_availability: tool({
  description: 'Check calendar availability for interviewers',
  parameters: z.object({
    interviewerIds: z.array(z.string().uuid()),
    dateRange: z.object({
      start: z.string().describe('ISO 8601 start date'),
      end: z.string().describe('ISO 8601 end date'),
    }),
    durationMinutes: z.number().default(60),
  }),
  // Calls Calendar Edge Function → Google/Microsoft freebusy API
})

schedule_interview: tool({
  description: 'Schedule an interview with calendar invites and email notifications',
  parameters: z.object({
    candidateId: z.string().uuid(),
    jobId: z.string().uuid(),
    interviewerIds: z.array(z.string().uuid()),
    scheduledAt: z.string().describe('ISO 8601 datetime'),
    durationMinutes: z.number().default(60),
    location: z.string().optional(),
    meetingUrl: z.string().optional(),
    notes: z.string().optional(),
  }),
  // 1. Create calendar event via Edge Function
  // 2. Send email invites to candidate + interviewers
  // 3. Insert into conduit_interviews
  // 4. Update application pipeline stage to 'interviewing'
})

set_reminder: tool({
  description: 'Set a calendar reminder for a task or follow-up',
  parameters: z.object({
    title: z.string(),
    description: z.string().optional(),
    reminderAt: z.string().describe('ISO 8601 datetime'),
    relatedEntityType: z.enum(['candidate', 'job', 'employer', 'application']).optional(),
    relatedEntityId: z.string().uuid().optional(),
  }),
  // Creates calendar event with reminder notification
})
```

### New Edge Function Required

```
supabase/functions/calendar-integration/index.ts
  Routes:
    POST /freebusy     → Check availability (Google/Microsoft)
    POST /create-event → Create calendar event with invites
    POST /update-event → Reschedule or cancel
    POST /delete-event → Remove calendar event
```

---

## 5. User Flow 4: Email Triage & Automation

### Flow Description

Sync inbox, triage incoming emails (match to candidates/employers), auto-categorise, and allow Jodie to draft replies.

### Architecture

```
Gmail/Graph Inbox ──> Email Sync Edge Function ──> email_messages table
                                                     │
                                                     ▼
                                              Jodie AI Triage
                                              ┌──────────────┐
                                              │ Categorise   │
                                              │ Link to CRM  │
                                              │ Priority tag │
                                              │ Draft reply  │
                                              └──────────────┘
```

### Email Sync Flow

1. **Periodic sync** (cron or webhook): Edge Function fetches new emails from Gmail/Graph
2. **Store** in `email_messages` table with threading
3. **AI triage**: Jodie analyses subject + body, auto-links to candidate/employer
4. **Actions**: Flag urgent, draft replies, create follow-up reminders

### New AI Tools Required

```typescript
// crm7/src/lib/ai/tools/email-tools.ts

triage_inbox: tool({
  description: 'Scan recent unread emails and categorise/prioritise them',
  parameters: z.object({
    limit: z.number().default(20),
    since: z.string().optional().describe('ISO 8601 — only emails after this date'),
  }),
  // Reads email_messages where read_at IS NULL
  // For each: categorise, link to entity, set priority
})

draft_reply: tool({
  description: 'Draft an email reply to a specific message',
  parameters: z.object({
    emailMessageId: z.string().uuid(),
    tone: z.enum(['professional', 'friendly', 'formal']).default('professional'),
    instructions: z.string().optional().describe('Specific instructions for the reply'),
  }),
  // Reads original email, generates contextual reply
  // Returns draft (user must approve before sending)
})

send_email: tool({
  description: 'Send an email via connected email account',
  parameters: z.object({
    to: z.array(z.string().email()),
    subject: z.string(),
    body: z.string(),
    cc: z.array(z.string().email()).optional(),
    replyToMessageId: z.string().optional(),
    templateId: z.string().uuid().optional(),
  }),
  // Calls email-dispatcher Edge Function
})

create_follow_up: tool({
  description: 'Create a follow-up reminder from an email',
  parameters: z.object({
    emailMessageId: z.string().uuid(),
    followUpAt: z.string().describe('ISO 8601 datetime'),
    notes: z.string().optional(),
  }),
  // Creates calendar reminder + tags email
})
```

### New Edge Function Required

```
supabase/functions/email-sync/index.ts
  Routes:
    POST /sync-gmail     → Fetch new Gmail messages via Gmail API
    POST /sync-microsoft → Fetch new messages via Graph API
    POST /webhook-gmail  → Gmail push notification handler
```

---

## 6. User Flow 5: Document Handling & Compliance

### Flow Description

Upload, verify, and track expiry of compliance documents (VEVO, USI, police checks, WWCC, medical, licences).

### Current State

- **Conduit has** `Document` and `ComplianceCheck` types
- **Supabase Storage** is available for file uploads
- **Missing**: Upload UI, verification workflow, expiry notifications, Google Drive/OneDrive sync

### Implementation Required

1. **Document upload component** — Drag-and-drop to Supabase Storage
2. **Document viewer** — Preview PDFs/images inline
3. **Compliance dashboard** — Track all checks per candidate/employer with expiry warnings
4. **Jodie AI tools** for document processing

### New AI Tools

```typescript
// crm7/src/lib/ai/tools/document-tools.ts

check_compliance_status: tool({
  description: 'Check compliance status for a candidate or employer',
  parameters: z.object({
    entityType: z.enum(['candidate', 'employer']),
    entityId: z.string().uuid(),
  }),
  // Reads conduit_compliance_checks, flags expired/missing
})

request_document: tool({
  description: 'Send a document request to a candidate or employer',
  parameters: z.object({
    entityType: z.enum(['candidate', 'employer']),
    entityId: z.string().uuid(),
    documentType: z.string(),
    message: z.string().optional(),
  }),
  // Sends email requesting document upload
})

flag_expiring_documents: tool({
  description: 'Find all documents expiring within a given period',
  parameters: z.object({
    withinDays: z.number().default(30),
  }),
  // Queries conduit_compliance_checks where expires_at < now + withinDays
})
```

---

## 7. Google Cloud Console Setup

### Project Configuration

**Google Cloud Project**: Create or use existing project for bsuite.

```
Project Name: bsuite-production
Project ID:   bsuite-prod-XXXXX
```

### APIs to Enable

| API | Purpose | Used By |
| --- | --- | --- |
| Gmail API | Send/read emails | CRM7, Conduit, BSU |
| Google Calendar API | Schedule interviews, reminders | CRM7, Conduit |
| Google Drive API | Document sync (Phase 2) | Conduit |
| Google People API | Contact sync (Phase 2) | CRM7 |
| Identity Platform / Google Sign-In | OAuth login | All apps (via Supabase) |

### OAuth 2.0 Credentials

#### Credential 1: Supabase Auth (Login)

Already configured in Supabase dashboard.

- **Type**: Web application
- **Authorized redirect URIs**:
  - `https://tuybltdrdefjblnplpqo.supabase.co/auth/v1/callback`
- **Scopes**: `openid`, `email`, `profile`

#### Credential 2: Email + Calendar + Drive (API Access)

New credential for server-side API access via Edge Functions.

- **Type**: Web application
- **Name**: `bsuite-api-integration`
- **Authorized redirect URIs**:
  - `https://tuybltdrdefjblnplpqo.supabase.co/functions/v1/oauth-google-email/callback`
  - `https://tuybltdrdefjblnplpqo.supabase.co/functions/v1/calendar-integration/callback`
- **Authorized JavaScript origins**:
  - `https://suite.crm7.app`
  - `https://crm.crm7.app`

#### OAuth Consent Screen

- **User type**: External (or Internal if using Google Workspace)
- **App name**: bsuite
- **Support email**: support@braden.com.au
- **Scopes requested**:

```
# Email (Gmail API)
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.modify

# Calendar
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/calendar.readonly

# Drive (Phase 2)
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/drive.readonly

# User info
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

#### Verification Status

- Apps requesting sensitive scopes (gmail.send, calendar) require **Google verification**
- Submit for verification once OAuth consent screen is configured
- During development, add test users manually (up to 100)

### Service Account (Optional — for Server-to-Server)

If using Google Workspace domain-wide delegation:

- **Name**: `bsuite-service-account`
- **Domain-wide delegation**: Enable if org uses Google Workspace
- **Scopes**: Same as above
- **Key**: JSON key file stored as Supabase secret

---

## 8. Azure AD / Entra ID Setup

### App Registration

**Azure Portal** > Microsoft Entra ID > App registrations

```
App Name:     bsuite
Application (client) ID: <REDACTED — stored in Supabase secrets>
Directory (tenant) ID:   common (multi-tenant)
```

### App Registration 1: Supabase Auth (Login)

Already configured for Supabase native OAuth.

- **Redirect URIs**:
  - `https://tuybltdrdefjblnplpqo.supabase.co/auth/v1/callback` (Web)
- **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
- **Permissions**: `User.Read`, `openid`, `email`, `profile`

### App Registration 2: Email + Calendar + Drive (API Access)

New or expanded registration for server-side API access.

- **Redirect URIs**:
  - `https://tuybltdrdefjblnplpqo.supabase.co/functions/v1/oauth-microsoft-email/callback` (Web)
  - `https://tuybltdrdefjblnplpqo.supabase.co/functions/v1/calendar-integration/ms-callback` (Web)
- **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts

#### API Permissions (Delegated)

| Permission | Type | Purpose | Admin Consent Required |
| --- | --- | --- | --- |
| `Mail.Send` | Delegated | Send emails via Graph | No |
| `Mail.Read` | Delegated | Read inbox for triage | No |
| `Mail.ReadWrite` | Delegated | Mark emails as read, flag | No |
| `Calendars.ReadWrite` | Delegated | Create/read calendar events | No |
| `Calendars.Read.Shared` | Delegated | Check shared calendar availability | No |
| `Files.Read` | Delegated | Read OneDrive files (Phase 2) | No |
| `Files.ReadWrite` | Delegated | Upload documents (Phase 2) | No |
| `User.Read` | Delegated | Basic profile info | No |
| `offline_access` | Delegated | Refresh tokens | No |

#### API Permissions (Application — Optional, for daemon/cron)

| Permission | Type | Purpose | Admin Consent Required |
| --- | --- | --- | --- |
| `Mail.Read` | Application | Background inbox sync | Yes |
| `Calendars.Read` | Application | Background availability check | Yes |

> **Note**: Application permissions require Azure AD admin consent. Use delegated permissions with stored refresh tokens for most flows.

#### Client Secret

- **Description**: `bsuite-api-secret`
- **Expires**: 24 months (set calendar reminder to rotate)
- Store in Supabase Edge Function secrets as `MICROSOFT_CLIENT_SECRET`

#### Token Configuration

- **Access token version**: v2.0
- **Optional claims**: `email`, `preferred_username`

---

## 9. Supabase Edge Function Secrets

All secrets stored in Supabase dashboard: Settings > Edge Functions > Secrets.

### Current Secrets (Existing)

| Secret | Purpose | Status |
| --- | --- | --- |
| `SUPABASE_URL` | Auto-injected | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected | Production |
| `SUPABASE_ANON_KEY` | Auto-injected | Production |
| `RESEND_API_KEY` | Platform email sending | Production |

### New Secrets Required

| Secret | Purpose | Source |
| --- | --- | --- |
| `GOOGLE_EMAIL_CLIENT_ID` | Gmail + Calendar OAuth | Google Cloud Console > Credential 2 |
| `GOOGLE_EMAIL_CLIENT_SECRET` | Gmail + Calendar OAuth | Google Cloud Console > Credential 2 |
| `MICROSOFT_CLIENT_ID` | Graph Mail + Calendar | Azure > App Registration 2 |
| `MICROSOFT_CLIENT_SECRET` | Graph Mail + Calendar | Azure > App Registration 2 |
| `MICROSOFT_TENANT_ID` | Azure tenant (use `common` for multi-tenant) | Azure portal |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway for Jodie | Vercel dashboard |
| `ENCRYPTION_KEY` | Encrypt stored OAuth tokens at rest | Generate with `openssl rand -hex 32` |

### Secret Deployment Command

```bash
supabase secrets set \
  GOOGLE_EMAIL_CLIENT_ID="<value>" \
  GOOGLE_EMAIL_CLIENT_SECRET="<value>" \
  MICROSOFT_CLIENT_ID="<value>" \
  MICROSOFT_CLIENT_SECRET="<value>" \
  MICROSOFT_TENANT_ID="common" \
  AI_GATEWAY_API_KEY="<value>" \
  ENCRYPTION_KEY="<value>"
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Current Sprint)

| Task | Status | Owner |
| --- | --- | --- |
| Fix chat.ts TypeScript errors | Done | This session |
| Conduit communication store + service | Done | Previous session |
| Conduit communications UI components | Done | Previous session |
| Candidate/job page integration | Done | Previous session |
| Email schema migration (email_messages, templates, audit) | Planned | `email-capabilities-plan` Phase 1 |

### Phase 2: Email & OAuth (Next Sprint)

| Task | Priority | Depends On |
| --- | --- | --- |
| Deploy email schema migration | P0 | Phase 1 |
| Build `oauth-google-email` Edge Function | P0 | Google Cloud Console setup |
| Build `oauth-microsoft-email` Edge Function | P0 | Azure AD setup |
| Build `email-dispatcher` Edge Function (Gmail + Graph send) | P0 | OAuth functions |
| Build `email-sync` Edge Function (inbox read) | P1 | OAuth functions |
| Email compose UI in CRM7 (contacts/leads pages) | P1 | Dispatcher |
| Add `send_email` + `draft_reply` to Jodie tools | P1 | Dispatcher |

### Phase 3: Calendar & Scheduling (Sprint +2)

| Task | Priority | Depends On |
| --- | --- | --- |
| Build `calendar-integration` Edge Function | P0 | Google/Azure OAuth |
| Create `conduit_interviews` table migration | P0 | Schema design |
| Add `schedule_interview`, `check_availability`, `set_reminder` Jodie tools | P0 | Calendar Edge Function |
| Interview scheduling UI in Conduit | P1 | Calendar + interviews table |
| Calendar sync widget in CRM7 dashboard | P2 | Calendar Edge Function |

### Phase 4: AI Screening & Triage (Sprint +3)

| Task | Priority | Depends On |
| --- | --- | --- |
| Build `screen_candidates`, `score_candidate`, `parse_resume` Jodie tools | P0 | Conduit data access |
| Add `triage_inbox`, `create_follow_up` Jodie tools | P1 | Email sync |
| Automated screening pipeline (trigger on new application) | P2 | Screening tools |
| Email auto-categorisation rules | P2 | Triage tools |

### Phase 5: Documents & Compliance (Sprint +4)

| Task | Priority | Depends On |
| --- | --- | --- |
| Document upload component (Supabase Storage) | P0 | Conduit UI |
| Compliance dashboard | P0 | Conduit UI |
| `check_compliance_status`, `flag_expiring_documents` Jodie tools | P1 | Compliance data |
| Google Drive sync Edge Function | P2 | Google OAuth |
| OneDrive sync Edge Function | P2 | Microsoft OAuth |

### Phase 6: Employer Portal (Sprint +5)

| Task | Priority | Depends On |
| --- | --- | --- |
| Employer self-service portal (vacancy posting) | P1 | Conduit auth + employer store |
| Employer dashboard (applications, interviews, compliance) | P1 | All previous phases |
| `create_vacancy` Jodie tool (CRM7 → Conduit bridge) | P1 | Employer store |

---

## Appendix: Quick Reference — API Endpoint Matrix

| Edge Function | Google API | Microsoft Graph API | Status |
| --- | --- | --- | --- |
| `oauth-google-email` | `accounts.google.com/o/oauth2` | N/A | Planned |
| `oauth-microsoft-email` | N/A | `login.microsoftonline.com/{tenant}/oauth2/v2.0` | Planned |
| `email-dispatcher` | `gmail.googleapis.com/gmail/v1/users/me/messages/send` | `graph.microsoft.com/v1.0/me/sendMail` | Placeholder exists |
| `email-sync` | `gmail.googleapis.com/gmail/v1/users/me/messages` | `graph.microsoft.com/v1.0/me/messages` | Not started |
| `calendar-integration` | `www.googleapis.com/calendar/v3` | `graph.microsoft.com/v1.0/me/calendar` | Not started |
| `send-notification` | N/A (uses Resend) | N/A | Production |
