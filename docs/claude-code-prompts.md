# BSuite — Claude Code Prompts for Roadmap Execution

**Date:** 2026-02-27
**Status:** Working
**Purpose:** Self-contained prompts for Claude Code instances to execute remaining BSuite roadmap items.
**Google Knowledge MCP:** Enabled — use `google-dev-knowledge` tool for Expo, React Native, Supabase, Google APIs docs.

---

## Competitor Intelligence (Use This Context)

### GTO/Apprenticeship CRM Market

| Competitor | Pricing | Strengths | Weaknesses (Our Edge) |
|-----------|---------|-----------|----------------------|
| **ReadyTech (Ready Apprentice)** | Enterprise POA ($50k+/yr) | Market leader, 20yr history, ISO 27001, STAs + AASNs | Legacy UI, no AI, no mobile app, opaque pricing, no charge rate calc |
| **aXcelerate** | $500–$2,000+/mo per-learner | RTO-focused, good compliance | No GTO tools, no charge rates, no AI |
| **VETtrak Cloud** | $5k–$30k/yr per-student | Deep VET compliance | Legacy Java app, no CRM, no portals |
| **Wisenet** | $290–$770/mo per-learner | Modern-ish UI | No apprentice management, no charge calc |
| **CloudAssess** | ~$5k+/yr | Good assessment tools | Assessment-only, no CRM/WHS/funding |
| **WorkforceOne (Codehouse)** | ~$135/user/mo | 30yr history, GTOs + Labour Hire, payroll, invoicing, timesheets, compliance, employee portal | No AI, legacy UI, no standalone calculator, no modern mobile app, 2.3x BSuite pricing |
| **PeopleTray** | SaaS per-user (POA) | WHS incidents, mobile checklists with offline, risk registers, audits, apprentice mgmt | Mining/FIFO-focused (not GTO), no CRM, no charge rates, no funding claims |

### Recruitment ATS Market (Conduit competes here)

| Competitor | Pricing | Strengths | Weaknesses (Our Edge) |
|-----------|---------|-----------|----------------------|
| **JobAdder** | POA (~$150+/user/mo) | AU-focused, 200+ job boards, 99% satisfaction | No AI, expensive, recruitment-agency focused |
| **Employment Hero** | $6–12/employee/mo | All-in-one HR+ATS+payroll, Fair Work compliance | Generic (not recruitment-specialist), basic ATS |
| **Workable** | ~$169+/mo | Easy setup, AI candidate matching | Expensive for small teams, no AU compliance |
| **Bullhorn** | Enterprise POA | 10k+ agencies, AI workflows, combined ATS+CRM | Enterprise pricing, too complex for SMB |
| **BambooHR** | POA (~$6/employee/mo) | User-friendly, good onboarding | US-focused, limited AU compliance |

### WorkforceOne (Codehouse) — Deep Feature Audit

**Firsthand experience (user, last 18 months):** Buggy, unintuitive, opposite of one-shot input
(requires re-entering data across multiple screens). Mobile is just a PWA (save-to-homescreen),
not a native app. Hasn't changed in that period. Good feature reference though.

**Pricing:** ~$135/user/mo (10 users typical = ~$1,350/mo). Per named internal user.
**Founded:** 1995 (Adelaide). Originally "CHIP — Code House Integrated Payroll".
**Clients:** IntoWork, MADEC, Maxima, Statewide — established GTO + Labour Hire base.

#### WorkforceOne Modules

| Module | Features | BSuite Equivalent | BSuite Status |
|--------|----------|-------------------|---------------|
| **Payroll** | Award interpretation, STP Phase 2, super, tax, automated payslips, multi-role pay rates per employee per period | *Not built (outsourced to Xero/MYOB)* | ❌ Gap — by design |
| **Invoicing** | Custom charge rates → invoice generation, invoice history, re-send/reprint, client accounts | R80.3 (charge rates), BSU (billing) | 🟡 Partial |
| **Timesheets** | Online cloud-based, supervisor approval workflow, any device, award interpretation | CRM7 (not yet) | ❌ Gap |
| **Recruitment/CRM** | Job posting, candidate management, pipeline tracking, placement | Conduit (ATS), CRM7 (contacts) | ✅ Better |
| **Employee Portal** | Payslips, timesheets, training, personal details, self-service | CRM7 apprentice portal (planned) | 🟡 Planned |
| **Client Portal** | Invoices, outstanding accounts, timesheets, leave balances | CRM7 host employer portal (planned) | 🟡 Planned |
| **Charge Rates** | Flexible role-based pay & charge rates, multi-role per employee | R80.3 (standalone calculator) | ✅ Better |
| **Apprentice Progression** | Award-linked progression tracking | CRM7 (apprentice management) | ✅ Built |
| **Custom Forms** | Buildable forms (basic form builder) | CRM7 (not yet) | ❌ Gap |
| **Leave Management** | Leave applications + approval workflow | *Not built* | ❌ Gap — by design |
| **Reporting/Analytics** | Dashboards, real-time insights | CRM7 dashboards | 🟡 Partial |
| **WHS/Compliance** | Basic compliance tracking | CRM7 WHS module | ✅ Built |
| **Mobile** | PWA only (save-to-homescreen), not native | Mobile app (planned — Expo native) | 🟡 Planned — will be better |

#### WorkforceOne Integrations (their ecosystem)

| Integration | Purpose | BSuite Approach |
|-------------|---------|-----------------|
| **RatesCalc** | Charge rate quotation + compliance (EXTERNAL) | R80.3 is BUILT IN — major advantage |
| **Secured Signing** | E-signatures | Planned (Supabase Storage + signing) |
| **Onboarded** | Employee/candidate onboarding | Conduit onboarding (built in) |
| **Shazamme** | Recruitment marketing websites | braden.com.au (built in) |
| **Calendly** | Scheduling | Planned (Google Calendar MCP) |
| **Microsoft 365** | Productivity suite | Planned (email/calendar integration) |
| **Referoo** | Reference/background checks | Conduit (planned integration) |
| **LiveHire** | Talent communities/pools | Conduit talent pools (built in) |
| **MessageMedia** | SMS notifications | Planned (Twilio/MessageMedia) |
| **WorkPro** | Background checks, eLearning, credentials | CRM7 VET + training (built in) |
| **20+ GL systems** | Xero, MYOB journal export/import | Planned (Xero/MYOB API) |

#### Key Takeaways for BSuite

1. **One-shot input is our killer feature** — WorkforceOne forces redundant data entry. BSuite's DRY architecture is the opposite.
2. **R80.3 built-in vs. RatesCalc external** — they pay extra for what we include. Massive selling point.
   - **RatesCalc firsthand experience:** Archaic architecture. No middleware/caching — pulls directly from Fair Work every time. A single rate calculation can take ~1 HOUR not due to complexity but because progressing between sections takes ~5 mins each. The UX is painfully slow and clunky.
   - **R80.3 advantage:** Cached Fair Work data, instant calculations, modern React UI, offline-capable (planned PWA). This alone could win deals.
3. **Timesheets + Leave** are features WorkforceOne has that we don't (by design — we defer payroll to Xero/MYOB). Consider adding timesheet capture that exports to payroll systems.
4. **Custom forms builder** is a gap we should address in CRM7 (P2).
5. **Their PWA mobile vs. our planned native Expo app** — once shipped, this is a clear win for BSuite.
6. **Portal parity needed** — employee + client portals are table-stakes. CRM7 needs these.

### BSuite Competitive Advantages to Build On

1. **Only GTO-first platform** combining CRM + charge rates + WHS + VET + portals + ATS
2. **AI assistant (Jodie)** — no competitor has integrated AI
3. **Modern stack** — React/TypeScript vs. legacy Java/.NET competitors
4. **Transparent pricing** — $29–99/user vs. opaque enterprise POA
5. **Mobile-first** — no competitor has native mobile with offline sync
6. **Integrated suite** — one Supabase backend, SSO across all apps

---

## Prompt 1: BSuite Mobile — PWA First, Then Android Native

**Build:** Claude Code Instance 1
**Research:** Windsurf (completed — see research section below)
**Effort:** Phase A: 1 week (PWA), Phase B: 2 weeks (Android native)
**Priority:** P1 — Major competitive differentiator
**Note:** User has Google Play Developer account ready from other projects.

```
You are building mobile access for BSuite — a SaaS platform for Australian Group
Training Organisations (GTOs). The strategy is TWO PHASES:

  Phase A: PWA (Progressive Web App) — ship FAST, installable from browser
  Phase B: Android native app via Expo — ship to Google Play Store shortly after

NO competitor has native mobile. WorkforceOne's "mobile" is just a PWA (save-to-
homescreen) — we match that immediately in Phase A, then SURPASS it with Phase B.

## PHASE A: PWA (1 week) — Claude Code builds this NOW

Add PWA capabilities to the existing CRM7 web app so it's installable on mobile.
CRM7 is at `/home/braden/Desktop/Dev/bsuite/crm7/`.

### A1. Vite PWA Plugin Setup

- Install `vite-plugin-pwa` and configure in `vite.config.ts`
- Create `manifest.json` with BSuite D2C Neon Electric branding:
  - `name`: "BSuite CRM"
  - `short_name`: "BSuite"
  - `theme_color`: "#2563eb" (Electric Blue)
  - `background_color`: "#0a0e1a" (Deep Navy)
  - `display`: "standalone"
  - `orientation`: "portrait"
  - Icons: 192x192 and 512x512 (generate from existing logo)
- Service Worker with Workbox strategies:
  - **Cache-first** for static assets (JS, CSS, images, fonts)
  - **Network-first** for Supabase API calls
  - **Stale-while-revalidate** for reference data (clients, host employers)
- App shell caching for instant load
- Offline indicator in UI header

### A2. Mobile-Responsive Enhancements

CRM7 already has responsive CSS but optimize for phone-sized screens:
- Touch-friendly tap targets (min 44x44px)
- Bottom navigation bar on mobile (tabs: Dashboard, Apprentices, Timesheets, WHS, More)
- Swipe gestures for list items (approve/reject timesheets)
- Pull-to-refresh on list views
- Camera access via browser APIs for WHS incident photos
- Full-screen mode when launched from homescreen

### A3. Offline Data Layer (IndexedDB via `idb`)

- Cache apprentice list, host employers, recent timesheets in IndexedDB
- Queue mutations when offline (timesheet approvals, WHS incidents)
- Sync on reconnect with conflict resolution (server wins)
- Show "Offline — changes will sync" banner
- "Last synced: [timestamp]" indicator

### A4. Install Prompt

- Custom "Add to Home Screen" prompt (defer native browser prompt)
- Show after 2nd visit or on first timesheet action
- Instructions for both Android Chrome and iOS Safari

### Phase A Success Criteria

- [ ] PWA installs on Android Chrome and iOS Safari
- [ ] Lighthouse PWA score 90+
- [ ] App works offline with cached data
- [ ] Timesheet approval works offline and syncs
- [ ] Camera capture works for WHS via browser API
- [ ] Touch-friendly mobile UI
- [ ] `pnpm build` passes

## PHASE B: Android Native via Expo (2 weeks) — Claude Code builds after Phase A

Create a new Expo project at `/home/braden/Desktop/Dev/bsuite/mobile/`.

### B1. Project Setup

```bash
npx create-expo-app@latest bsuite-mobile --template blank-typescript
```

- Expo SDK 52+ with Expo Router v4 for file-based navigation
- TypeScript strict mode
- NativeWind v4 (TailwindCSS for React Native) with D2C Neon Electric theme
- `@supabase/supabase-js` with `expo-sqlite` for secure token storage
- pnpm as package manager

### B2. Supabase Backend (ALREADY EXISTS — DO NOT RECREATE)

- URL: Read from EXPO_PUBLIC_SUPABASE_URL env var
- Anon Key: Read from EXPO_PUBLIC_SUPABASE_ANON_KEY env var
- Auth: Supabase Auth (email + Google OAuth already configured)
- RLS: All tables already have Row Level Security policies
- Existing tables: profiles, clients, contacts, apprentices, host_employers,
  placements, timesheets, whs_incidents, documents, email_messages, etc.

### B3. Architecture Requirements

1. **Shared types** — Create `packages/shared/` with types from
   `supabase gen types typescript`. Importable by mobile + web apps.

2. **Offline-first** — WatermelonDB with Supabase sync:
   - WatermelonDB on top of expo-sqlite for reactive offline-first storage
   - Supabase RPC functions for push/pull sync (see Supabase official guide)
   - Cache apprentice list, host employers, recent timesheets
   - Queue mutations when offline (timesheet approvals, incident reports)
   - Sync on reconnect — server wins for reads, queue for writes
   - Supabase Realtime triggers sync on other devices

3. **Auth** — Supabase Auth with:
   - Email/password login
   - Google OAuth via `expo-auth-session` + `makeRedirectUri`
   - Secure token storage via `expo-secure-store`
   - Auto-refresh tokens
   - Tenant-aware (user belongs to org via `user_tenants` join table)

4. **Navigation** (Expo Router tabs):
   - **Dashboard** — metrics (active apprentices, pending timesheets, reviews, WHS)
   - **Apprentices** — list, search, profile view, documents
   - **Timesheets** — approve/reject, bulk actions, weekly view
   - **WHS** — incident list, new incident report with camera
   - **More** — settings, profile, notifications, logout

5. **Push notifications** via `expo-notifications`:
   - FCM for Android (Google Play Developer already set up)
   - Timesheet approval requests, WHS alerts, document expiry, milestones
   - Store push tokens in Supabase `profiles.push_token`

6. **Camera/media** — `expo-image-picker` + `expo-camera`:
   - WHS incident photo evidence
   - Document uploads (licenses, certificates)
   - Signature capture for timesheets

7. **Biometric auth** — `expo-local-authentication` for quick re-entry

### B4. Key Screens (Priority Order)

**Sprint 1 — MVP (1 week):**

- Login screen (email + Google OAuth)
- Dashboard with metric cards
- Apprentice list with search/filter
- Apprentice profile (read-only: contact, placement, documents)
- Timesheet list with approve/reject
- Settings/profile screen

**Sprint 2 — Field Officer Tools (1 week):**

- WHS incident report form with camera
- Document scanner/upload
- Offline queue with sync status
- Push notification setup
- Apprentice notes/activity log
- Host employer directory
- Deep linking from push notifications

### B5. Google Play Store Submission

Use EAS Build + EAS Submit:

```yaml
# eas.json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

Commands:

```bash
eas build --platform android --profile production
eas submit --platform android
```

Submit to Internal Testing track first, then promote to Production.
Package name: `com.bsuite.mobile` (or `au.com.bsuite.mobile`)

### B6. Alternative Fast Path: Bubblewrap TWA

If Phase B takes longer than expected, a QUICK interim option exists:

- Use Google's Bubblewrap CLI to wrap the Phase A PWA as an Android TWA
- `npm i -g @bubblewrap/cli && bubblewrap init --manifest=https://crm7.vercel.app/manifest.json`
- Produces an APK/AAB uploadable to Google Play Store
- Requires Digital Asset Links verification (/.well-known/assetlinks.json)
- This is a STOPGAP — not a replacement for the native Expo app

## Theme (D2C Neon Electric — match web apps)

- Primary: Electric Blue #2563eb
- Accent: Electric Cyan #00cec9
- Success: Electric Green #22c55e
- Error: Electric Coral #ff4757
- Warning: Electric Yellow #fdcb6e
- Dark background: Deep Navy #0a0e1a
- Light background: Off-white #fefefe
- Typography: Inter (use expo-font for Phase B)

## Technical Standards

- pnpm as package manager
- Conventional commits: `feat(mobile): ...` or `feat(crm7): ...` for Phase A
- Co-located tests: `*.test.tsx`
- Zustand for state management (same pattern as web apps)
- Zod for runtime validation
- No hardcoded API keys — env vars (VITE_for Phase A, EXPO_PUBLIC_ for Phase B)
- ESLint + Prettier configured

## Files to Reference

- `/home/braden/Desktop/Dev/bsuite/docs/00-master-roadmap.md` — project context
- `/home/braden/Desktop/Dev/bsuite/AGENTS.md` — coding standards
- `/home/braden/Desktop/Dev/bsuite/Theme-best-practice.md` — theme spec
- `/home/braden/Desktop/Dev/bsuite/docs/AUTH-MAP.md` — auth architecture
- `/home/braden/Desktop/Dev/bsuite/crm7/src/stores/` — Zustand store patterns
- `/home/braden/Desktop/Dev/bsuite/crm7/src/services/` — service layer patterns

## WHY THIS MATTERS

WorkforceOne (direct GTO competitor at $135/user) only has a PWA — buggy, slow,
unintuitive. ReadyTech ($50k+/yr) has NO mobile at all. Field officers visit
apprentices on-site daily and need mobile tools for timesheets, WHS, and document
capture. Phase A matches WorkforceOne immediately. Phase B on Google Play Store
leapfrogs the entire market.

```

---

## Prompt 2: Conduit AI Tools — Recruitment Intelligence

**Build:** Claude Code Instance 2 — START IMMEDIATELY (known work)
**Research:** None needed — CRM7 AI patterns already exist to port
**Effort:** 1 week
**Priority:** P1 — Differentiates from JobAdder/Employment Hero

```

You are adding AI-powered recruitment tools to Conduit — a Next.js 16 App Router ATS (Applicant Tracking System) within the BSuite ecosystem. This makes Conduit the ONLY Australian ATS with integrated AI assistant capabilities.

## Context

Conduit is at `/home/braden/Desktop/Dev/bsuite/conduit/`. It uses:

- Next.js 16 App Router with React 19
- Supabase for auth, DB, storage (shared with CRM7)
- TailwindCSS v4 with D2C Neon Electric theme
- Zustand for state management
- pnpm as package manager

CRM7 already has a working AI assistant (Jodie) with 54 tools. Reference its implementation:

- `/home/braden/Desktop/Dev/bsuite/crm7/src/components/ai/` — AI UI components
- `/home/braden/Desktop/Dev/bsuite/crm7/src/hooks/useAIChat.ts` — chat hook
- `/home/braden/Desktop/Dev/bsuite/crm7/src/lib/ai-chat-service.ts` — service layer
- `/home/braden/Desktop/Dev/bsuite/crm7/src/stores/aiStore.ts` — Zustand store

## Google Knowledge MCP

Use `google-dev-knowledge` to look up:

- Vercel AI SDK v6 `useChat` hook patterns
- Next.js App Router API routes with streaming
- Supabase Edge Functions for AI tool execution

## What to Build

### 1. AI API Route (`/api/ai/chat/route.ts`)

Create a Next.js App Router API route that:

- Uses Vercel AI SDK v6 (`ai` package) with `streamText`
- Connects to AI Gateway (env var: `AI_GATEWAY_API_KEY`)
- Implements Conduit-specific system prompt with recruitment expertise
- Registers Conduit AI tools (see below)
- Streams responses back to client
- Enforces per-tenant usage limits (from subscription tier)

### 2. Conduit AI Tools (12 tools)

| Category | Tool | Description |
|----------|------|-------------|
| **Search** | `search_candidates` | Full-text search across candidates with filters (skills, location, experience, status) |
| **Search** | `search_jobs` | Search open jobs by title, department, location, salary range |
| **Search** | `match_candidates_to_job` | AI-powered matching: score candidates against a job's requirements using skills overlap, experience, location |
| **Pipeline** | `get_pipeline_stats` | Pipeline stage counts, conversion rates, time-in-stage averages |
| **Pipeline** | `move_candidate` | Move candidate to a different pipeline stage with optional note |
| **Pipeline** | `bulk_reject` | Reject multiple candidates with a template reason |
| **Scheduling** | `find_available_slots` | Query calendar for interviewer availability |
| **Scheduling** | `schedule_interview` | Create interview event with candidate, panel, and calendar invite |
| **Comms** | `draft_email` | Generate personalized email to candidate (offer, rejection, follow-up, scheduling) |
| **Comms** | `send_email` | Send email via email-dispatcher Edge Function |
| **Analytics** | `hiring_funnel_report` | Conversion rates by stage, source, and time period |
| **Analytics** | `time_to_hire_report` | Average days from application to offer by department/role |

Each tool must follow the `inputSchema` format (JSON Schema) matching CRM7's pattern.

### 3. AI Chat UI Components

Port and adapt from CRM7's AI components:

- `AIAssistant.tsx` — orchestrator component
- `AISheet.tsx` — slide-out panel (responsive: 100% mobile, 60% tablet, 40% desktop)
- `AIMessage.tsx` — message bubbles with markdown rendering
- `AIInputArea.tsx` — input with slash commands
- `AIToolCard.tsx` — tool execution result display
- `AIFloatingButton.tsx` — trigger button

Adapt for Conduit's recruitment context:

- Quick actions: "Find candidates for [job]", "Pipeline summary", "Draft rejection email", "Schedule interview"
- Recruitment-specific persona (not Jodie — name it "Scout" for recruitment context)
- Blue/cyan accent theming consistent with Conduit

### 4. Zustand Store (`aiStore.ts`)

- Chat history with localStorage persistence
- Usage tracking (queries remaining)
- Active conversation context (which job/candidate is selected)
- Tool execution state

## Competitor Gap Analysis

- **JobAdder**: No AI. Manual everything. $150+/user/mo.
- **Employment Hero**: SmartMatch AI for candidate matching, but NO conversational AI. $6-12/employee/mo.
- **Workable**: AI candidate matching but NO chat-based AI assistant. $169+/mo.
- **Bullhorn**: AI workflows but enterprise-only, NOT conversational. Enterprise POA.

Conduit with Scout AI will be the ONLY AU ATS with a conversational AI assistant that can search, match, schedule, and communicate.

## Technical Standards

- Next.js App Router (server components by default, `'use client'` only when needed)
- TypeScript strict mode
- Conventional commits: `feat(conduit): ...`
- Tests with Jest for critical paths
- No hardcoded API keys
- All DB access via Supabase client with RLS

## Success Criteria

- [ ] AI chat API route streams responses
- [ ] All 12 tools execute correctly against Supabase
- [ ] AI Sheet slides in/out responsively
- [ ] Quick actions work for common recruitment tasks
- [ ] Candidate-to-job matching returns scored results
- [ ] Email drafting produces professional recruitment emails
- [ ] Pipeline stats are accurate
- [ ] Usage tracking enforces per-tenant limits
- [ ] `pnpm build` passes

```

---

## Prompt 3: BSU Billing Portal + Stripe Integration

**Build:** Claude Code Instance 3 — START IMMEDIATELY (known work)
**Research:** None needed — Stripe IDs already in pricing-strategy.md
**Effort:** 1 week
**Priority:** P1 — Required for revenue

```

You are completing the Stripe billing integration for business-suite-unified (BSU) — the central portal for the BSuite SaaS platform. BSU is at `/home/braden/Desktop/Dev/bsuite/business-suite-unified/`.

## Context

- React + Vite + TypeScript + TailwindCSS + Zustand
- Supabase for auth/DB
- Stripe products and prices are ALREADY CREATED (live AUD):
  - Read `/home/braden/Desktop/Dev/bsuite/docs/pricing-strategy.md` for all Stripe product/price IDs
  - Products: Essentials ($29/user/mo), Professional ($59/user/mo), Enterprise ($99/user/mo)
  - AI add-ons: $10/$15/$20 per user per tier
  - R80 Calculator Pro: $49/mo standalone
  - Volume discounts at 10+, 25+, 50+ seats

## Google Knowledge MCP

Use `google-dev-knowledge` to look up:

- Supabase Edge Functions for serverless Stripe webhooks
- Google Cloud project configuration if needed

## What to Build

### 1. Stripe Checkout Edge Function (`supabase/functions/stripe-checkout/`)

Create a Supabase Edge Function that:

- Accepts: `{ priceId, quantity, successUrl, cancelUrl, customerId? }`
- Creates a Stripe Checkout Session with:
  - `mode: 'subscription'`
  - `allow_promotion_codes: true`
  - `subscription_data.trial_period_days: 14`
  - `customer_email` from Supabase auth user
  - `metadata: { tenant_id, user_id }`
- Returns the checkout session URL
- Uses `STRIPE_SECRET_KEY` from env (set in Supabase Dashboard)

### 2. Stripe Webhook Edge Function (`supabase/functions/stripe-webhook/`)

Handle these events:

- `checkout.session.completed` — Create subscription record, update tenant tier
- `customer.subscription.updated` — Sync plan changes, seat count
- `customer.subscription.deleted` — Downgrade to free, notify admin
- `invoice.payment_succeeded` — Log payment, update billing status
- `invoice.payment_failed` — Alert admin, grace period logic

Database updates (use existing tables or create migration):

- `subscriptions` table: tenant_id, stripe_subscription_id, stripe_customer_id, plan_tier, seat_count, status, current_period_start, current_period_end, ai_addon
- `billing_events` table: event_type, stripe_event_id, tenant_id, data, created_at

### 3. Customer Portal Edge Function (`supabase/functions/stripe-portal/`)

- Creates Stripe Customer Portal session for self-service:
  - Plan changes (upgrade/downgrade)
  - Seat management
  - Payment method updates
  - Invoice history
  - Cancellation

### 4. BSU Billing Page (`/billing`)

React page with:

- Current plan display (tier, seats, AI addon, monthly cost)
- Seat management (add/remove seats with prorated preview)
- Plan upgrade/downgrade buttons → Stripe Checkout
- AI addon toggle
- Invoice history table (from Stripe API)
- Payment method display (last 4 digits, expiry)
- "Manage Billing" → Stripe Customer Portal
- Usage meters (if AI addon: queries used / limit)

### 5. Subscription Gating

Create a `useSubscription` hook that:

- Reads tenant's active subscription from Supabase
- Exposes: `tier`, `seatCount`, `aiAddon`, `isTrialing`, `daysRemaining`
- Used by feature flags across BSU and child apps
- Platform roles (developer, tester) bypass all gates

### 6. R80 Standalone Checkout

Separate flow for R80.3 Calculator Pro:

- Landing page with pricing ($49/mo or $468/yr)
- Stripe Checkout for R80 standalone
- If user later upgrades to Professional/Enterprise, R80 is included (credit applied)

## Pricing Reference (from pricing-strategy.md)

| Item | Monthly | Annual | Stripe Price ID |
|------|---------|--------|-----------------|
| Essentials | $29/seat | $300/seat/yr | price_1T52MsAYIAu3GrrMcQU3GcPO / price_1T52MtAYIAu3GrrMPQMdT3oT |
| Professional | $59/seat | $588/seat/yr | price_1T52MuAYIAu3GrrMUxpfS6Es / price_1T52MuAYIAu3GrrMw2GhDnUr |
| Enterprise | $99/seat | $1,068/seat/yr | price_1T52MwAYIAu3GrrMCnFcv0zR / price_1T52MwAYIAu3GrrMVMp9dxb7 |

## Competitor Context

- ReadyTech: Enterprise POA, no self-service billing, sales-driven
- aXcelerate: Per-learner POA, opaque
- BSuite advantage: Transparent self-service billing, trial-to-paid, seat-based

## Success Criteria

- [ ] Stripe Checkout creates subscriptions correctly
- [ ] Webhooks update tenant tier in real-time
- [ ] Customer Portal allows self-service management
- [ ] Billing page shows accurate subscription data
- [ ] Feature gating works based on subscription tier
- [ ] R80 standalone checkout works
- [ ] `pnpm build` passes for BSU
- [ ] Edge Functions deploy successfully

```

---

## Prompt 4: R80.3 Offline PWA + Enhanced Testing

**Build:** Claude Code Instance 4 — START IMMEDIATELY (known work)
**Research:** Windsurf (completed — PWA/Workbox patterns in Prompt 1 research)
**Effort:** 5 days
**Priority:** P1 — Critical for field use

```

You are adding Progressive Web App (PWA) capabilities and comprehensive test coverage to R80.3 — the BSuite apprentice charge rate calculator. R80.3 is at `/home/braden/Desktop/Dev/bsuite/R80.3/`.

## Context

- React + Vite + TypeScript + TailwindCSS + Zustand
- Supabase for auth/DB
- Legally compliance-critical: wage calculations MUST be accurate per Fair Work Australia
- Used by GTO field officers who often work in areas with poor connectivity

## Google Knowledge MCP

Use `google-dev-knowledge` to look up:

- Vite PWA plugin configuration
- Service Worker strategies for offline-first
- Workbox caching patterns

## What to Build

### 1. PWA Setup

- Install `vite-plugin-pwa` and configure in `vite.config.ts`
- Create `manifest.json` with BSuite branding (D2C Neon Electric icons)
- Service Worker with Workbox strategies:
  - **Cache-first** for static assets (JS, CSS, images, fonts)
  - **Network-first** for API calls (Supabase queries)
  - **Stale-while-revalidate** for Fair Work award data (cached but refreshed)
- App shell caching for instant load
- Background sync for queued calculations

### 2. Offline Data Layer

Using IndexedDB (via `idb` library):

- Cache award rate tables locally (these change infrequently — monthly at most)
- Cache user's saved calculations
- Cache enterprise agreements
- Queue new calculations when offline → sync when online
- Show "Last synced: [timestamp]" indicator
- Conflict resolution: server data wins for award rates, user data preserved for calculations

### 3. Install Prompt

- Custom "Add to Home Screen" prompt for mobile browsers
- Install banner after 2nd visit
- Standalone display mode (no browser chrome)

### 4. Comprehensive Wage Calculation Tests (Vitest)

This is LEGALLY CRITICAL. Create tests covering:

**Award Rate Calculations:**

- [ ] Base hourly rate for each apprentice year (1st, 2nd, 3rd, 4th)
- [ ] Casual loading (25%)
- [ ] Overtime rates (time-and-a-half, double time)
- [ ] Weekend penalty rates (Saturday 150%, Sunday 200%)
- [ ] Public holiday rates (250%)
- [ ] Shift allowances (afternoon, night, early morning)

**Charge Rate Calculations:**

- [ ] Standard billing model: base + on-costs + margin
- [ ] ALEX48 model: annualized charge spread over 48 weeks
- [ ] W52 model: annualized charge spread over 52 weeks
- [ ] Workers comp loading
- [ ] Superannuation (currently 11.5%, verify against ATO rates)
- [ ] Payroll tax (varies by state — test NSW, VIC, QLD, WA, SA, TAS)
- [ ] Leave loading (17.5%)
- [ ] Long service leave accrual

**Edge Cases:**

- [ ] Year boundary transitions (apprentice progressing to next year)
- [ ] Mid-year award rate changes
- [ ] Enterprise agreement overrides
- [ ] Custom pay rates above award
- [ ] Rounding precision (2 decimal places for currency)
- [ ] Zero values and null inputs
- [ ] Very large numbers (bulk calculations)

**Fair Work Integration:**

- [ ] API response parsing
- [ ] Fallback to cached rates when API unavailable
- [ ] Rate change detection and notification

Target: **90%+ test coverage** on calculation logic (legally critical).

### 5. Logger Migration

Replace 173 raw `console.*` calls with centralized logger (same pattern as CRM7):

- Create `src/utils/logger.ts` matching CRM7's implementation
- `logger.info()`, `logger.warn()`, `logger.error()`, `logger.debug()`, `logger.performance()`
- Errors always logged; info/debug gated to dev mode
- Bulk search-and-replace across all source files

## Competitor Context

- ReadyTech: NO offline, NO PWA, requires constant connectivity
- aXcelerate: NO charge rate calculator at all
- VETtrak: Desktop-only, no mobile/offline
- BSuite R80.3 with PWA will be the ONLY offline-capable charge rate calculator

## Success Criteria

- [ ] PWA installs on mobile (Android + iOS Safari)
- [ ] App works fully offline with cached award rates
- [ ] Online calculations sync to Supabase when connection returns
- [ ] Vitest suite covers all calculation paths (90%+ on calc logic)
- [ ] All wage calculations match Fair Work award rates exactly
- [ ] Logger replaces all raw console calls
- [ ] `pnpm build` passes
- [ ] Lighthouse PWA audit scores 90+

```

---

## Prompt 5: CRM7 AI Plugin System + Workflow Automation

**Build:** Claude Code Instance 5 — START AFTER Group A
**Research:** Windsurf (completed — Xero OAuth2 + Google Calendar API patterns below)
**Effort:** 2 weeks
**Priority:** P2 — Advanced differentiator

```

You are building an AI plugin system and workflow automation engine for CRM7 — the BSuite CRM for Group Training Organisations. CRM7 is at `/home/braden/Desktop/Dev/bsuite/crm7/`.

## Context

- React + Vite + TypeScript + TailwindCSS + Zustand
- AI assistant "Jodie" already has 54 tools across 8 categories
- Vercel AI SDK v6 integration complete
- Reference: `/home/braden/Desktop/Dev/bsuite/crm7/src/lib/ai-tools/` for existing tool registry

## Google Knowledge MCP

Use `google-dev-knowledge` to look up:

- Vercel AI SDK tool calling patterns
- Supabase Edge Functions for async processing
- Google Calendar API integration

## What to Build

### 1. Plugin Registry System

Create a plugin architecture that allows dynamic tool loading:

```typescript
interface AIPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  tools: AITool[];
  config: PluginConfig;
  permissions: string[];
  enabled: boolean;
}
```

- Plugin discovery: `/api/plugins/list` — available plugins
- Plugin install: `/api/plugins/install` — enable for tenant
- Plugin config: `/api/plugins/configure` — set API keys, options
- Built-in plugins: Xero, Google Calendar, Gmail, ADMS, Fair Work
- Each plugin provides tools that register with the existing tool registry

### 2. Xero Integration Plugin

**Windsurf Research (completed):**

Xero OAuth2 uses standard code flow for web apps (PKCE for mobile/desktop).
SDK: `xero-node` — fully typed TypeScript client.
Scopes needed: `openid profile email accounting.transactions accounting.contacts offline_access`
Access tokens expire after 30 minutes — use `offline_access` scope for refresh tokens.
Uncertified apps: 25 tenant connections max, 5,000 API calls/day/tenant.
Base URL: `https://api.xro/2.0/` — requires `Authorization: Bearer` + `Xero-Tenant-Id` headers.

#### Xero OAuth2 Flow (implement in Supabase Edge Function)

```
1. User clicks "Connect Xero" → redirect to:
   https://login.xero.com/identity/connect/authorize?
     response_type=code&client_id=CLIENTID&redirect_uri=CALLBACK&
     scope=openid+profile+email+accounting.transactions+offline_access

2. User authorizes → redirected back with ?code=xxx

3. Exchange code for tokens:
   POST https://identity.xero.com/connect/token
   Body: grant_type=authorization_code&code=xxx&redirect_uri=CALLBACK&client_id=ID&client_secret=SECRET

4. Get connected tenants:
   GET https://api.xero.com/connections
   Header: Authorization: Bearer ACCESS_TOKEN
   Returns: [{ tenantId, tenantName, tenantType }]

5. Store tokens + tenantId in Supabase: xero_connections table
   (tenant_id, xero_tenant_id, access_token, refresh_token, token_expires_at)

6. Refresh before every call if expired:
   POST https://identity.xero.com/connect/token
   Body: grant_type=refresh_token&client_id=ID&client_secret=SECRET&refresh_token=xxx
```

#### Xero SDK Usage Pattern (xero-node)

```typescript
import { XeroClient, Invoice, Contact } from 'xero-node';

const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID!,
  clientSecret: process.env.XERO_CLIENT_SECRET!,
  redirectUris: ['https://bsu.vercel.app/api/xero/callback'],
  scopes: ['openid', 'profile', 'email',
           'accounting.transactions', 'accounting.contacts', 'offline_access']
});
```

#### Xero AI Tools (6 tools)

| Tool | Xero Endpoint | BSuite Use Case |
|------|---------------|-----------------|
| `xero_sync_contacts` | GET /Contacts | Sync host employers + apprentices → Xero contacts |
| `xero_create_invoice` | POST /Invoices | Apprentice charge rates → ACCREC invoices |
| `xero_get_invoices` | GET /Invoices?where=Status=="AUTHORISED" | Show outstanding invoices in CRM7 |
| `xero_get_account_balance` | GET /Reports/BalanceSheet | Dashboard widget: current account balances |
| `xero_reconcile_payment` | POST /Payments | Mark invoice as paid when host employer pays |
| `xero_sync_all` | GET /Invoices + /Contacts + /Payments | Full bi-directional sync on schedule |

#### GTO-Specific Mapping

- BSuite `host_employers` → Xero Contacts (isCustomer: true)
- BSuite `placements` + R80.3 charge rates → Xero Invoice line items
- BSuite `apprentices` → Xero Contact (isSupplier: false, tracked as employee)
- Invoice reference: "BSuite-{placement_id}-{period}"

### 3. Google Calendar Integration Plugin

**Windsurf Research (completed):**

Google Calendar API uses OAuth2 with scope `https://www.googleapis.com/auth/calendar`.
SDK: `googleapis` npm package — `google.calendar('v3')`.
Key endpoints: events.insert, events.list, events.update, events.delete, freebusy.query.
Requires Google Cloud project with Calendar API enabled + OAuth2 credentials (Web app type).

#### Google Calendar OAuth2 Flow (via Supabase Edge Function)

```
1. User clicks "Connect Google Calendar" → redirect to:
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=CLIENTID&redirect_uri=CALLBACK&
     scope=https://www.googleapis.com/auth/calendar&
     response_type=code&access_type=offline&prompt=consent

2. User authorizes → redirected back with ?code=xxx

3. Exchange code:
   POST https://oauth2.googleapis.com/token
   Body: grant_type=authorization_code&code=xxx&client_id=ID&
         client_secret=SECRET&redirect_uri=CALLBACK

4. Store tokens in Supabase: google_calendar_connections table
   (tenant_id, user_id, access_token, refresh_token, token_expires_at)

5. Refresh: POST https://oauth2.googleapis.com/token
   Body: grant_type=refresh_token&client_id=ID&client_secret=SECRET&refresh_token=xxx
```

#### Google Calendar AI Tools (4 tools)

| Tool | API Method | BSuite Use Case |
|------|-----------|-----------------|
| `gcal_find_available_slots` | freebusy.query | Find free slots for site visits, reviews, interviews |
| `gcal_create_event` | events.insert | Schedule apprentice reviews, site visits, training |
| `gcal_list_events` | events.list | Show upcoming schedule in CRM7 dashboard |
| `gcal_update_event` | events.update | Reschedule appointments from AI chat |

#### Key Code Pattern (googleapis)

```typescript
import { google } from 'googleapis';

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

// Check availability
const freebusy = await calendar.freebusy.query({
  requestBody: {
    timeMin: '2026-03-01T09:00:00+10:00',
    timeMax: '2026-03-01T17:00:00+10:00',
    timeZone: 'Australia/Brisbane',
    items: [{ id: 'primary' }]
  }
});

// Create event with Google Meet
const event = await calendar.events.insert({
  calendarId: 'primary',
  conferenceDataVersion: 1,
  requestBody: {
    summary: '4-Week Apprentice Review — John Smith',
    location: 'Host Employer Office',
    start: { dateTime: '2026-03-05T10:00:00+10:00', timeZone: 'Australia/Brisbane' },
    end: { dateTime: '2026-03-05T11:00:00+10:00', timeZone: 'Australia/Brisbane' },
    attendees: [
      { email: 'fieldofficer@gto.com.au' },
      { email: 'apprentice@email.com' }
    ],
    conferenceData: {
      createRequest: { requestId: crypto.randomUUID() }
    }
  }
});
```

#### GTO-Specific Use Cases

- **Apprentice reviews**: Auto-schedule 4-week, 3-month, annual reviews
- **Site visits**: Field officer scheduling with host employer location
- **Training sessions**: Block calendar for group training dates
- **WHS follow-ups**: Schedule investigation meetings after incidents
- **Workflow integration**: Workflows can trigger calendar events as steps

### 4. Workflow Automation Engine

```typescript
interface Workflow {
  id: string;
  name: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  enabled: boolean;
  tenant_id: string;
}

type WorkflowTrigger =
  | { type: 'event'; event: string } // e.g., 'apprentice.created'
  | { type: 'schedule'; cron: string } // e.g., '0 9 * * 1'
  | { type: 'manual' }
  | { type: 'ai'; condition: string } // AI evaluates condition

type WorkflowStep =
  | { type: 'ai_tool'; toolName: string; params: Record<string, any> }
  | { type: 'email'; template: string; to: string }
  | { type: 'webhook'; url: string; method: string }
  | { type: 'delay'; duration: string }
  | { type: 'condition'; if: string; then: WorkflowStep[]; else?: WorkflowStep[] }
```

Built-in workflow templates:

- **New Apprentice Onboarding**: Create → Send welcome email → Assign training plan → Notify field officer → Schedule 4-week review
- **Timesheet Overdue**: Check daily → If >2 days overdue → Email apprentice → If >5 days → Escalate to supervisor
- **WHS Incident Response**: Incident created → Notify WHS officer → If severity=high → Notify management → Schedule investigation
- **Funding Claim Prep**: Monthly trigger → Gather eligible placements → Generate claim draft → Notify admin
- **Document Expiry**: Daily check → 30 days before → Email reminder → 7 days before → Urgent alert → On expiry → Lock placement

### 4. AI Cost Tracking

- Track per-tenant AI usage: queries, tool executions, tokens consumed
- Store in `ai_usage` table: tenant_id, user_id, model, tokens_in, tokens_out, cost_usd, timestamp
- Dashboard widget showing usage vs. limit (per subscription tier)
- Alerts at 80% and 100% of quota
- Admin override for Enterprise tenants

### 5. Workflow Builder UI

Visual workflow editor:

- Drag-and-drop step builder
- Trigger selector
- Step configuration panels
- Preview/test mode
- Execution history log

## Competitor Context

- ReadyTech: Basic workflow (form routing), NO AI, NO plugin system
- Salesforce: Has workflow automation but costs $75+/user + AI costs extra
- HubSpot: Workflow automation but NO GTO context, NO Australian compliance
- BSuite with AI-powered workflows will be the ONLY GTO platform with intelligent automation

## Success Criteria

- [ ] Plugin registry loads and manages plugins
- [ ] Xero OAuth flow works
- [ ] At least 5 workflow templates execute correctly
- [ ] Workflow builder UI allows visual editing
- [ ] AI cost tracking records all usage
- [ ] Workflows trigger on events and schedules
- [ ] `pnpm build` passes

```

---

## Prompt 6: Braden SEO + Lead Capture Wiring

**Build:** Claude Code Instance 6 — START IMMEDIATELY (known work)
**Research:** None needed — SEO patterns well-known
**Effort:** 3 days
**Priority:** P2 — Marketing funnel

```

You are completing SEO optimization and lead capture for braden.com.au — the BSuite corporate website. Braden is at `/home/braden/Desktop/Dev/bsuite/braden/`.

## Context

- React + Vite + TypeScript + TailwindCSS
- Corporate branding (NOT D2C Neon Electric): Braden Red #ab233a, Gold #cbb26a, Navy #2c3e50
- CSP headers + bot protection already configured
- Contact form exists but doesn't connect to CRM

## Google Knowledge MCP

Use `google-dev-knowledge` to look up:

- Vite SSG/prerender strategies for SEO
- Google Search Console verification
- Structured data (JSON-LD) for business websites

## What to Build

### 1. Prerender for Social Sharing

Using `vite-plugin-prerender` (already referenced in `/home/braden/Desktop/Dev/bsuite/scripts/prerender.mjs`):

- Prerender all 8 routes: /, /about, /contact, /products, /services/*, /privacy, /terms
- Generate proper `<meta>` tags for each page:
  - `og:title`, `og:description`, `og:image`, `og:url`
  - `twitter:card`, `twitter:title`, `twitter:description`
  - `canonical` URL
- Generate `sitemap.xml` and `robots.txt`

### 2. Structured Data (JSON-LD)

Add schema.org markup:

- `Organization` — company details, logo, contact
- `WebSite` — search action
- `LocalBusiness` — address, opening hours, service area
- `Product` — for BSuite product pages
- `BreadcrumbList` — navigation trail

### 3. Lead Capture Wiring

Connect contact form to BSuite backend:

- On form submit → call `lead-capture` Edge Function (already deployed)
- Edge Function creates a lead in CRM7's `leads` table
- Send confirmation email via `email-dispatcher` Edge Function
- Show success state with estimated response time
- Form fields: name, email, phone, company, message, interest (dropdown: CRM, Calculator, ATS, Suite)

### 4. Analytics

- Add Google Analytics 4 (GA4) via gtag.js
- Track: page views, form submissions, CTA clicks, scroll depth
- UTM parameter parsing for campaign tracking
- Cookie consent banner (Australian Privacy Act compliance)

### 5. Performance

- Image optimization (WebP with fallbacks)
- Lazy loading for below-fold content
- Font preloading (Montserrat, Inter)
- Target: Lighthouse Performance 95+, SEO 100

## Success Criteria

- [ ] All pages prerendered with correct meta tags
- [ ] Structured data validates in Google Rich Results Test
- [ ] Contact form creates lead in CRM7
- [ ] Confirmation email sends after form submission
- [ ] sitemap.xml and robots.txt generated
- [ ] Lighthouse: Performance 95+, SEO 100, Accessibility 95+
- [ ] `pnpm build` passes

```

---

## Prompt 7: BSU Session Handoff + Cross-App Notifications

**Build:** Claude Code Instance 7 — START AFTER Prompt 3 (needs subscription tables)
**Research:** None needed — Supabase Realtime patterns well-known
**Effort:** 5 days
**Priority:** P1 — Suite cohesion

```

You are building unified session handoff and cross-app notifications for business-suite-unified (BSU). BSU is at `/home/braden/Desktop/Dev/bsuite/business-suite-unified/`.

## Context

- BSU is the central portal that links to CRM7, Conduit, R80.3, and Braden
- All apps share Supabase Auth (same project: tuybltdrdefjblnplpqo)
- BSU has OAuth 2.1 PKCE consent screen already built
- Service cards on dashboard link to external app URLs

## What to Build

### 1. Session Handoff

When user clicks a service card (e.g., "Open CRM7"):

- Generate a short-lived token (JWT, 30s expiry) containing: user_id, tenant_id, target_app, permissions
- Redirect to target app with token in URL: `https://crm7.vercel.app/auth/sso?token=xxx`
- Target app validates token against Supabase, creates local session
- No re-login required when switching between BSuite apps

### 2. Cross-App Notification System

Supabase Edge Function `send-notification` (already deployed, needs enhancement):

- Notification types: info, warning, error, action_required
- Channels: in-app (real-time), email, push (when mobile app exists)
- Store in `notifications` table: id, tenant_id, user_id, type, title, body, action_url, read, source_app, created_at
- Supabase Realtime subscription for instant delivery

BSU notification center UI:

- Bell icon in header with unread count badge
- Dropdown with notification list (grouped by date)
- Mark as read / mark all read
- Click notification → navigate to source app + context
- Notification preferences page (per-type channel selection)

### 3. Usage Analytics Dashboard

- Aggregate usage across all BSuite apps:
  - Active users per app (daily, weekly, monthly)
  - Feature usage heatmap
  - Storage consumption per tenant
  - AI query usage (if addon enabled)
  - Login frequency and session duration
- Charts using Recharts (already in CRM7's dependencies)
- Export to CSV

## Success Criteria

- [ ] SSO session handoff works between BSU → CRM7 → Conduit
- [ ] No re-login required when switching apps
- [ ] Notifications appear in real-time via Supabase Realtime
- [ ] Notification center shows cross-app notifications
- [ ] Usage analytics dashboard shows accurate metrics
- [ ] `pnpm build` passes

```

---

## Agent Assignment Matrix

### Role Split: Windsurf (Research) vs Claude Code (Build)

**Windsurf** handles research, competitor intel, documentation lookups, and
architecture decisions using Tavily, Context7, and Google Knowledge MCPs.
**Claude Code** handles implementation — writing code, tests, and committing.

### Claude Code: START IMMEDIATELY (copy-paste these prompts)

| # | Project | Start | Key Deliverable |
|---|---------|-------|-----------------|
| **1A** | crm7 (PWA) | NOW | PWA install + offline + mobile UI |
| **2** | conduit | NOW | AI assistant "Scout" (12 tools) |
| **3** | BSU | NOW | Stripe billing + subscription gating |
| **4** | R80.3 | NOW | PWA offline + 90% wage calc test coverage |
| **6** | braden | NOW | SEO + lead capture → CRM7 |

### Claude Code: START AFTER Group A

| # | Project | Depends On | Key Deliverable |
|---|---------|------------|-----------------|
| **1B** | mobile (NEW) | After 1A | Expo Android native → Google Play Store |
| **5** | crm7 | After 1A | AI plugins + Xero + workflow automation |
| **7** | BSU | After 3 | Session handoff + cross-app notifications |

### Windsurf: Research Queue (I handle these)

| Task | Status | Feeds Into |
|------|--------|------------|
| Android/Expo/EAS research | ✅ Done | Prompt 1B |
| PWA + Workbox patterns | ✅ Done | Prompts 1A, 4 |
| WatermelonDB + Supabase offline sync | ✅ Done | Prompt 1B |
| Bubblewrap TWA fallback path | ✅ Done | Prompt 1B |
| Google Play submission via EAS | ✅ Done | Prompt 1B |
| WorkforceOne + RatesCalc feature audit | ✅ Done | All prompts |
| Xero API + OAuth2 patterns | ✅ Done | Prompt 5 |
| Google Calendar API patterns | ✅ Done | Prompt 5 |

### Orchestration Rules

1. **No file overlaps** — each instance works on a separate project/directory
2. **Shared DB caution** — only Prompt 3 creates new Supabase migrations
3. **Build verification** — every instance runs `pnpm build` before committing
4. **Conventional commits** — `feat(scope): description` format
5. **Branch** — all work on `development` branch per project
6. **Prompt 1A touches CRM7** — no other instance should edit CRM7 until 1A is done
7. **ZERO-DEFER** — never mark issues as "deferred" or "beyond scope". Fix everything you find, now. Rate limiting, error handling, validation, and tests ship with the feature, not later.

---

## Mobile App Development Research Summary

### Recommended Stack: Expo + React Native

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Expo SDK 52+ | Managed workflow, OTA updates, push notifications, no native build config |
| **Navigation** | Expo Router v4 | File-based routing (matches Next.js pattern in Conduit) |
| **Styling** | NativeWind v4 | TailwindCSS for React Native — reuse D2C Neon Electric theme tokens |
| **State** | Zustand | Same as all BSuite web apps — shared patterns |
| **Backend** | Supabase JS | Same client library works in React Native with expo-sqlite for secure storage |
| **Auth** | Supabase Auth + expo-auth-session | Google OAuth + email, secure token storage via expo-secure-store |
| **Offline** | expo-sqlite + WatermelonDB | Local-first with sync engine |
| **Push** | expo-notifications | FCM (Android) + APNs (iOS) via Expo Push Service |
| **Camera** | expo-camera + expo-image-picker | WHS incident photos, document scanning |
| **Maps** | react-native-maps | Host employer locations, site visit routing |
| **Biometrics** | expo-local-authentication | Quick re-entry for field officers |

### Key Expo Advantages for BSuite

1. **Code sharing** — Zustand stores, Zod schemas, Supabase client config can be shared with web apps
2. **OTA updates** — Push JS updates without app store review (critical for compliance changes)
3. **Single codebase** — iOS + Android from one TypeScript project
4. **Expo EAS** — Cloud builds for iOS/Android without local Xcode/Android Studio
5. **Free tier** — Expo + Supabase free tiers cover development and early launch
6. **AI tools** — Expo has first-class AI coding tool support (Expo MCP Server)

### Google Knowledge MCP Usage for Mobile

The `google-dev-knowledge` MCP server provides documentation for:
- Firebase Cloud Messaging (FCM) for push notifications
- Google Maps SDK for React Native
- Google OAuth for mobile apps
- Google Calendar API integration
- Android/iOS build configuration

Use it in Claude Code prompts with:
```

Use the google-dev-knowledge MCP tool to look up current documentation for [topic].

```
