<!-- G5-VERDICT-BANNER -->
> **VERDICT (SUPERSEDED) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ⚠️ VERDICT: SUPERSEDED
>
> A cross-app "compete immediately" design sweep covering CRM7, BSU, R80.3, Conduit and
> braden.com.au, written 2026-03-03.
>
> **Superseded on two axes.** *Product scope:* by the 2026-08-17 estate completion ledger
> (`docs/20260817-estate-completion-ledger-v1.00W.md`), which supersedes every prior completion
> claim across the estate. *Visual design:* by the D2C Neon Electric brand system and the
> Unified Design Language rollout (`bsuite#635`, 9 waves, open).
>
> One of its named targets no longer exists in the form described: **R80.3 has been retired in
> favour of R80.4**.
>
> Retained for its competitive framing. Do not treat its component or page inventory as current.

---

# BSuite Launch-Ready Design — Compete Immediately

**Document ID:** 20260303-bsuite-launch-ready-design-v1.00D.md
**Status:** Draft
**Date:** 2026-03-03
**Author:** Claude Code (Opus 4.6)
**Scope:** All BSuite apps — CRM7, BSU, R80.3, Conduit, braden.com.au

---

## Executive Summary

BSuite is competing against established Australian GTO and labour hire platforms where the UX is "from 2010." The winning strategy is the HubSpot playbook: not more features — dramatically better UX. Ship 50 features that all work perfectly rather than 200 where half are broken.

**Launch posture:** Public launch, compete immediately. Everything visible must work.

**Target users:** GTO Operations Managers and their Admin/Compliance Managers, switching FROM a competitor CRM (not from spreadsheets).

**Core insight:** Competitors have features but terrible UX. BSuite's differentiator is modern design + AI + compliance intelligence that competitors can't match.

---

## 1. Competitive Landscape

### Primary Competitors (GTO / Labour Hire)

| Competitor | Strengths | Weaknesses | BSuite Must Match | BSuite Can Beat |
|------------|-----------|------------|-------------------|-----------------|
| **Entire OnHire** | Workforce mgmt, mobile app for workers, payroll | Dated UI, enterprise pricing | Mobile access, payroll integration | UX, AI, modern design |
| **foundU** | Award interpretation engine, workforce mgmt | Complex setup, HR-focused not GTO-specific | Award interpretation | GTO-specific workflows, BOOT |
| **Workforce One** | Broad workforce platform | Generic, not GTO-tailored | Feature breadth | GTO compliance, training contracts |
| **ReadyTech ReadyRecruit** | Government backing, recruitment flows | Slow, enterprise feel | Recruitment pipeline | Speed, modern UX |
| **Definitiv** | Payroll + award engine, STP | Payroll-first (not CRM) | Award rates, STP Phase 2 | Full CRM + compliance |
| **Employment Hero** | HR/payroll, large userbase, modern-ish | Generic HR, not GTO/labour hire | Onboarding, leave, payroll basics | GTO specificity, BOOT |
| **FastTrack360** | Staffing/recruitment at scale | Enterprise-only, dated | Recruitment pipeline | Accessibility, pricing |
| **Humanforce** | Workforce mgmt, geolocated timesheets | Workforce-only, no CRM | Timesheet integration | Full lifecycle CRM |
| **Kynection** | Field workforce apps | Niche, limited scope | Field officer tools | Comprehensive platform |

### What No Competitor Has

1. **BOOT Compliance Engine** — automated Better Off Overall Test calculations
2. **AI Assistant with real database access** — not just a chatbot, actually queries and modifies data
3. **Real-time charge rate calculator** — instant feedback without clicking "Calculate"
4. **GTO Standards compliance dashboard** — mapped to all 17 sub-standards
5. **SSO portal across integrated apps** — one login, everything connected
6. **Modern D2C dark-mode design** — everyone else looks like 2010

---

## 2. The Kill List — Remove or Hide Before Launch

These features are visible to users but broken, stubbed, or embarrassing. A broken feature is worse than no feature — it signals amateur software.

| # | Feature | Current State | Action | Severity |
|---|---------|--------------|--------|----------|
| K1 | **Generate Report** button | Fake spinner → "Report generated successfully" with no actual report | **REMOVE** — hide button entirely | CRITICAL |
| K2 | **Report category links** | Navigate to 404 pages | **REMOVE** — hide from nav until implemented | CRITICAL |
| K3 | **User create/edit/delete** | `logger.warn` stubs — forms submit but nothing happens | **REMOVE** — hide user management CRUD until wired | CRITICAL |
| K4 | **Dashboard percentages** | Hardcoded `+12.5%`, `+8.2%` — fake metrics | **FIX** — show real aggregates or show "Set up your dashboard" empty state | CRITICAL |
| K5 | **Advanced filters** (multiple pages) | Filter UI renders, click handlers are no-ops | **FIX** — wire to Supabase queries or hide filter buttons | HIGH |
| K6 | **VET assessment CRUD** | "Coming soon" placeholders | **REMOVE** — hide from nav | HIGH |
| K7 | **Email send/receive** | UI exists, email never delivers | **REMOVE** — hide Inbox/Compose until SMTP wired | HIGH |
| K8 | **SMS dispatch** | Button exists, no provider configured | **REMOVE** — hide SMS buttons | HIGH |
| K9 | **Calendar** (claims) | Depends on edge function that may not be deployed | **VERIFY** — test edge fn, fix or remove | MEDIUM |
| K10 | **Export buttons** | Some export CSV, some do nothing | **AUDIT** — verify each, hide broken ones | MEDIUM |
| K11 | **Portal pages** (5 routes) | Early-stage, likely incomplete | **AUDIT** — verify or hide | MEDIUM |

### Kill List Philosophy

> "If it doesn't work, it doesn't exist. Period. A user who clicks a button and nothing happens will never trust your software again."

---

## 3. Table Stakes — Must Work Perfectly on Day 1

These are the features every CRM user expects. Getting these wrong = instant churn. BSuite already has most of these built — they need polish, not building.

### 3.1 First-Time Experience (Onboarding)

**Current state:** Login → empty dashboard with fake metrics → user is lost.

**Target state:** Login → guided setup wizard → first value in <5 minutes.

| Step | What Happens | Time |
|------|-------------|------|
| 1 | Welcome screen with company name, role selection | 30s |
| 2 | Import contacts (CSV, or "I'll add manually") | 2min |
| 3 | Set up first apprentice/trainee | 2min |
| 4 | See populated dashboard with real data | instant |
| 5 | Tour: "Here's your pipeline, here's compliance, here's charge rates" | 1min |

**Key principle:** The dashboard should NEVER show fake data. Empty state → guided action → real data.

### 3.2 Empty States That Educate

Every list page, every dashboard widget, every table needs a proper empty state:

```
┌─────────────────────────────────────┐
│                                     │
│         [Illustration]              │
│                                     │
│   No apprentices yet                │
│                                     │
│   Add your first apprentice to      │
│   start tracking their training     │
│   journey and compliance status.    │
│                                     │
│   [+ Add Apprentice]  [Import CSV]  │
│                                     │
└─────────────────────────────────────┘
```

### 3.3 Core CRUD That Must Be Flawless

| Entity | Create | Read | Update | Delete | Search | Filter | Sort | Export |
|--------|--------|------|--------|--------|--------|--------|------|--------|
| People (apprentices, trainees, workers) | Y | Y | Y | Y | Y | Y | Y | Y |
| Contacts (clients, hosts, RTOs) | Y | Y | Y | Y | Y | Y | Y | Y |
| Host Employers | Y | Y | Y | Y | Y | Y | Y | Y |
| Training Contracts | Y | Y | Y | Y | - | Y | Y | Y |
| Charge Rates | Y | Y | Y | Y | - | Y | Y | Y |
| Claims | Y | Y | Y | Y | - | Y | Y | Y |
| Tasks | Y | Y | Y | Y | - | Y | Y | - |
| Compliance Records | Y | Y | Y | Y | - | Y | Y | Y |

Every cell marked Y must work end-to-end with Supabase. No fakes.

### 3.4 Navigation That Never Breaks

- Every nav item leads to a working page
- Breadcrumbs on every page
- Browser back/forward works correctly
- Deep links work (bookmarked URLs load correctly)
- Search/filter state persists in URL params

### 3.5 Data Import

Users are switching FROM another CRM. They need to bring their data.

- CSV import for: People, Contacts, Host Employers, Training Contracts
- Column mapping UI (drag columns to fields)
- Preview before import (show first 5 rows)
- Error handling (show which rows failed, why, let user fix)
- Duplicate detection (match on name + email)

### 3.6 Notifications That Work

- In-app notification bell with unread count
- Compliance alerts (expiring documents, overdue reviews, visa expiry)
- Task reminders
- Email notifications (when SMTP is configured) — graceful degradation when not

### 3.7 Settings That Save

- Profile (name, email, avatar)
- Organization (company name, ABN, logo)
- Notification preferences
- Theme (light/dark/system)
- All settings must persist via Supabase, not just localStorage

### 3.8 Performance

- Page load <2s on 4G
- List pages handle 1000+ rows without lag (virtual scrolling)
- Search results in <500ms
- No loading spinners that last >3s without progress indication

---

## 4. Differentiators — What Makes BSuite Special

These are features competitors don't have or do poorly. These get people talking.

### 4.1 BOOT Compliance Engine

**What it is:** Automated Better Off Overall Test — calculates whether an Enterprise Agreement makes employees better off overall compared to the relevant Modern Award.

**Why it matters:** Unions drill down on BOOT. Most competitors leave it to users. Most users don't understand it. BSuite automates it.

**Current state:** `packages/charge-calc` + `crm7/src/lib/rates/bootGate.ts` — calculation engine exists, tested.

**Launch state needed:**
- Visual comparison table: Award vs EA rates side-by-side
- Clear pass/fail indicator with explanation
- PDF export of BOOT analysis (for union/FWC submission)
- Historical tracking (BOOT status at each annual wage review)

### 4.2 AI Assistant (Jodie/Scout)

**What it is:** AI chat interface with real database tools — can query contacts, generate reports, answer compliance questions, draft communications.

**Why it matters:** No GTO CRM has AI. This is the "wow" moment.

**Current state:** AI Gateway configured (Grok + Claude), plugin system, tool infrastructure.

**Launch state needed:**
- Works reliably for: "Show me all apprentices with expiring visas", "Draft a letter to [host] about [apprentice]'s progress", "What's the charge rate for a 2nd year carpenter?"
- Graceful failure when AI can't help (redirect to relevant page, don't just say "I don't know")
- Clear indication this is AI-generated content
- Latency <3s for simple queries

### 4.3 Real-Time Charge Rate Calculator (R80.3)

**What it is:** Instant feedback charge rate calculation — type numbers, see results immediately. No "Calculate" button.

**Why it matters:** Competitors require form submission → wait → result. R80.3 updates as you type.

**Current state:** Working in R80.3 standalone app. Multi-apprentice comparison, Enterprise Agreement manager.

**Launch state needed:**
- Embedded in CRM7 charge rates page (or seamless link via SSO)
- Award data current (Fair Work rates updated)
- PDF export of calculations
- Save calculations to apprentice record

### 4.4 GTO Standards Dashboard

**What it is:** Compliance dashboard mapped to all 3 elements and 17 sub-standards of the National Standards for GTOs (2017).

**Why it matters:** STA audits check these standards. Having a dashboard that maps evidence to each standard is a compliance officer's dream.

**Current state:** Seed data for all 17 standards exists, compliance pages built.

**Launch state needed:**
- Visual progress indicators per standard (red/amber/green)
- Evidence linking (attach documents to specific sub-standards)
- Audit preparation mode (generate evidence portfolio)
- Gap analysis ("You're missing evidence for Standard 2.3")

### 4.5 SSO Portal (BSU)

**What it is:** Single sign-on portal connecting CRM7, R80.3, Conduit, and braden.com.au.

**Why it matters:** One login, everything connected. Competitors have siloed products.

**Current state:** BSU portal working with session handoff, plan comparison, Stripe integration.

**Launch state needed:**
- Seamless app switching (no re-login)
- Consistent branding across apps
- Unified user management (one place to manage team)
- Plan-gated features clearly indicated

### 4.6 Modern UX (The Invisible Differentiator)

**What it is:** D2C Neon Electric theme, dark mode, responsive design, keyboard shortcuts, command palette.

**Why it matters:** "UX is from 2010" — this is the #1 pain point. Looking modern IS the differentiator.

**Launch state needed:**
- Dark mode toggle that works everywhere
- Keyboard shortcuts for power users (Cmd+K command palette)
- Responsive design (works on tablet at minimum)
- Consistent component library (no mixed UI patterns)
- Loading states that feel fast (skeleton screens, not spinners)
- Smooth animations on navigation (no jarring page flashes)

---

## 5. Day 1 User Flow — The First 10 Minutes

This is the most critical 10 minutes. Get this right and users stay. Get it wrong and they're gone.

```
Step 1: Sign Up (BSU Portal)
├── Email + password (or Google SSO)
├── Company name, ABN
├── Select plan (free trial, no credit card)
└── Auto-provision CRM7 tenant

Step 2: Welcome Screen (CRM7)
├── "Welcome to BSuite, [Company Name]"
├── Role: "I manage apprentices/trainees" (default)
├── "Let's get you set up in 5 minutes"
└── [Start Setup] button

Step 3: Import or Add
├── Option A: Import CSV (contacts, apprentices)
│   ├── Upload file
│   ├── Map columns
│   ├── Preview + confirm
│   └── "Imported 47 apprentices, 12 hosts"
├── Option B: Add manually
│   ├── Add first apprentice (guided form)
│   ├── Add first host employer
│   └── Link them (training contract)
└── Option C: "I'll explore first" (skip)

Step 4: Dashboard (Now With Real Data)
├── Active apprentices: 47
├── Expiring compliance: 3
├── Upcoming reviews: 5
├── Claims due this month: 2
└── "Your setup is 60% complete" progress bar

Step 5: Quick Wins
├── AI: "Try asking Jodie: 'Show me apprentices in their probation period'"
├── Charge Rates: "Calculate charge rates instantly →"
├── Compliance: "Your compliance score: 72% — see gaps →"
└── Each links to the relevant feature
```

---

## 6. What Gets People Talking

### 6.1 "It actually works"

The bar is so low in GTO software that a CRM where everything works is remarkable. No broken buttons, no 404s, no fake data.

### 6.2 "The AI actually understands my data"

User asks "Show me all apprentices with visa expiry in the next 90 days" and gets a real, accurate table. Not a chatbot that says "I'm sorry, I can't help with that."

### 6.3 "The charge rate calculator is instant"

Type numbers, see results. No waiting. No "Calculate" button. This is viscerally satisfying and competitors don't have it.

### 6.4 "Dark mode that actually works"

Every competitor is white-background-only. Dark mode is table stakes for modern software but none of them have it.

### 6.5 "It knows the GTO Standards"

Show a compliance officer the standards dashboard with evidence mapping and they'll tell every other GTO they know.

### 6.6 "BOOT is automated"

Currently every GTO does BOOT manually or doesn't do it at all. Automated BOOT analysis is a unique selling point that unions and the FWC will appreciate.

---

## 7. What Will Piss People Off (And How to Prevent It)

| # | Frustration | Prevention |
|---|------------|------------|
| F1 | Clicking a button and nothing happens | Kill List — remove all broken features |
| F2 | Fake data on dashboard | Real aggregates or guided empty state |
| F3 | Can't import my existing data | CSV import with column mapping |
| F4 | No mobile access | Responsive design minimum; PWA stretch goal |
| F5 | Slow page loads | Virtual scrolling, lazy loading, skeleton screens |
| F6 | "Coming soon" pages | Hide unfinished features completely |
| F7 | Can't find what I'm looking for | Command palette (Cmd+K), consistent navigation |
| F8 | Features that half-work | Feature flags — fully on or fully off |
| F9 | No way to get help | In-app help tooltips, documentation links, AI assistant |
| F10 | Data feels unsafe | Visible autosave indicators, undo on delete, audit trail |

---

## 8. Technical Architecture for Launch

### 8.1 Feature Flag System

Every feature must be toggleable. If it's not ready, it's hidden.

```typescript
// Feature flags in Supabase tenant_settings
interface FeatureFlags {
  // Core (always on)
  people_crud: true;
  contacts_crud: true;
  host_employers: true;
  charge_rates: true;
  claims: true;
  compliance: true;
  tasks: true;

  // Launch features (on by default, can disable)
  ai_assistant: boolean;
  boot_engine: boolean;
  gto_standards: boolean;
  dark_mode: true;

  // Not ready (off by default)
  email_integration: false;
  sms_integration: false;
  vet_assessments: false;
  report_generation: false;
  user_management_crud: false;
  portal_pages: false;
}
```

### 8.2 Empty State System

Centralized empty state components:

```typescript
// Shared empty state pattern
<EmptyState
  icon={<UsersIcon />}
  title="No apprentices yet"
  description="Add your first apprentice to start tracking their training journey."
  primaryAction={{ label: "Add Apprentice", onClick: () => navigate('/people/new') }}
  secondaryAction={{ label: "Import CSV", onClick: () => navigate('/settings/import') }}
/>
```

### 8.3 Error Boundary System

Every page wrapped in error boundary that shows friendly message, not white screen:

```
┌──────────────────────────────────┐
│  Something went wrong            │
│                                  │
│  This page encountered an error. │
│  Our team has been notified.     │
│                                  │
│  [Try Again]  [Go to Dashboard]  │
└──────────────────────────────────┘
```

### 8.4 Loading State System

- **Skeleton screens** for initial page loads (not spinners)
- **Optimistic updates** for CRUD operations
- **Progress indicators** for long operations (import, export)
- **Toast notifications** for background completions

---

## 9. Cross-Project Integration Map

```
┌─────────────┐     SSO Cookie      ┌─────────────┐
│    BSU       │◄──────────────────►│   CRM7      │
│  (Portal)   │     Session         │  (Core CRM) │
│             │     Handoff         │             │
└──────┬──────┘                     └──────┬──────┘
       │                                    │
       │ SSO                               │ Shared
       │ Cookie                            │ @bsuite/charge-calc
       │                                    │
┌──────▼──────┐                     ┌──────▼──────┐
│  Conduit    │                     │   R80.3     │
│  (ATS)      │                     │ (Wage Calc) │
└─────────────┘                     └─────────────┘

braden.com.au ──── Marketing site (separate branding)
```

### Integration Points That Must Work

1. **BSU → CRM7:** SSO login, session handoff, app switching
2. **BSU → R80.3:** SSO login, session handoff
3. **BSU → Conduit:** SSO login, session handoff
4. **CRM7 ↔ R80.3:** Shared charge-calc package (`@bsuite/charge-calc`)
5. **braden.com.au → BSU:** "Sign Up" CTA links to BSU registration
6. **All apps:** Consistent D2C theme (except braden.com.au = corporate brand)

---

## 10. Launch Checklist — Ship/No-Ship Criteria

### MUST SHIP (launch blockers)

- [ ] Zero broken buttons, links, or nav items visible to users
- [ ] All visible features work end-to-end with Supabase
- [ ] Dashboard shows real data (or guided empty state)
- [ ] Onboarding flow: signup → first value in <5 minutes
- [ ] CSV import for people and contacts
- [ ] Core CRUD flawless: People, Contacts, Hosts, Charge Rates, Claims, Compliance, Tasks
- [ ] SSO works: BSU → CRM7, BSU → R80.3
- [ ] Dark mode works everywhere
- [ ] Responsive on tablet (minimum)
- [ ] Error boundaries on every page
- [ ] Empty states on every list
- [ ] Feature flags hiding all unfinished features
- [ ] Fair Work rates current (not stale 2022-2025 data)
- [ ] TypeScript 0 errors, all tests passing

### SHOULD SHIP (strongly desired)

- [ ] AI assistant working for common queries
- [ ] BOOT compliance engine with visual comparison
- [ ] GTO Standards dashboard with evidence mapping
- [ ] Command palette (Cmd+K)
- [ ] Keyboard shortcuts for power users
- [ ] Saved views / custom filters
- [ ] Bulk actions (multi-select + update)
- [ ] BSU → Conduit SSO

### CAN DEFER (nice to have, not launch blocking)

- [ ] Email/SMS integration
- [ ] Full report generation
- [ ] VET assessment CRUD
- [ ] Portal pages (host employer, training provider, worker)
- [ ] PWA/offline mode
- [ ] Xero/MYOB integration
- [ ] State Training Authority adapters (beyond WA)

---

## 11. Metrics for Success

### Week 1 After Launch

- **Activation rate:** >60% of signups complete onboarding (import or add first apprentice)
- **Session duration:** >5 minutes average (not bouncing)
- **Feature adoption:** >80% of users visit Dashboard, People, Charge Rates in first session
- **Error rate:** <1% of page loads result in error boundary
- **Support tickets:** <5 per 100 users (indicates UX is self-explanatory)

### Month 1

- **Retention:** >40% of Week 1 users return in Week 4
- **Expansion:** >20% of users try AI assistant
- **NPS:** >30 (minimum viable for B2B SaaS)
- **Churn reason:** If users leave, it should be "missing feature" not "broken feature"

---

## Appendix A: Stub/Placeholder Audit (Exhaustive)

**Audited:** 1,697 source files across 6 projects. Found **61 stubs** total: 9 Critical, 28 High, 15 Medium, 9 Low.

### Summary

| Project | Critical | High | Medium | Low | Total |
|---------|----------|------|--------|-----|-------|
| CRM7 | 7 | 19 | 10 | 7 | 43 |
| BSU | 1 | 5 | 0 | 0 | 6 |
| Conduit | 1 | 2 | 1 | 0 | 4 |
| R80.3 | 0 | 0 | 0 | 2 | 2 |
| braden | 0 | 1 | 2 | 0 | 3 |
| mobile | 0 | 1 | 2 | 0 | 3 |

### CRITICAL Findings (Launch Blockers)

| # | Location | What Users See | Reality |
|---|----------|---------------|---------|
| 1 | `crm7/components/dashboard/financial-summary.tsx:62` | Dashboard: "Revenue $527,850", "Profit $115,214" | 100% hardcoded fiction, timeframe selector changes nothing |
| 2 | `crm7/pages/settings/user-management.tsx:257-311` | "User created successfully" toast | `logger.warn` only — nothing persists |
| 3 | `crm7/pages/settings/configuration.tsx:155-231` | "Configuration saved" toast | `logger.warn` only — no `tenant_settings` table |
| 4 | `crm7/pages/settings/permissions.tsx:128-310` | "Permission created" toast | 9 mutations all `logger.warn` stubs |
| 5 | `crm7/pages/settings/integrations.tsx:318-488` | "Integration connected" toast | 8 mutations all `logger.warn` stubs |
| 6 | `crm7/pages/hosts/reports.tsx:123-160` | 12-month performance chart | Static `monthlyProgressData` array, not from DB |
| 7 | `bsu/lib/analyticsService.ts` | "DAU: 342, MAU: 4,891" | All mock data generators, CSV export downloads fake data |

### HIGH Findings (First Session Discoveries)

| # | Location | What Users See | Action |
|---|----------|---------------|--------|
| 1 | 6 ComingSoonPage stubs | Full pages saying "Coming Soon" | Hide nav items |
| 2 | WHS entire module (8 components) | Forms collect data, show success | Data discarded — no DB tables exist |
| 3 | VET assessments (5 buttons) | Create/Record/Complete/Edit/Delete | All fire "coming soon" toast |
| 4 | VET training packages (2 buttons) | Edit and Delete | "coming soon" toast |
| 5 | Field officer case notes | Form submit → success toast | `console.log` only — data lost on refresh |
| 6 | Training plan actions | "Request RTO Report" / "Export PDF" | `window.alert('stub')` — native browser alert |
| 7 | Leads conversion | "Convert to Contact" / "Convert to Client" | Toast-only stubs |
| 8 | Quote edit | "Edit" button visible on drafts | Permanently disabled, no edit route exists |
| 9 | GTO risk management (3 buttons) | "Add Risk" / "Record Review" | "coming soon" toast |
| 10 | GTO records management | File upload dialog with input | "coming soon" toast — nothing uploaded |
| 11 | Document upload page | Upload page exists in nav | URL-only workaround, no file upload |
| 12 | Placements page | 10 placement records shown | Hardcoded fake people as fallback |
| 13 | Conduit general settings | "Settings saved" after 500ms | `setTimeout` fake — zero data written |
| 14 | Conduit candidate/employer portals | Full portal pages | "Coming soon" banner |
| 15 | Mobile app entire data layer | All screens show data | `MOCK_METRICS`, `MOCK_APPRENTICES` — no Supabase |

### The Most Dangerous Patterns

1. **Silent success toasts on failed operations** — 29+ settings mutations show success toast when nothing is saved. Users believe their data is persisted.
2. **Hardcoded financial figures on main dashboard** — Revenue/profit numbers are fiction but displayed prominently.
3. **BSU analytics with fake CSV export** — Users can download completely fabricated analytics data.
4. **`setTimeout` fake save** in Conduit settings — Visually indistinguishable from a real save.

---

## Appendix B: Competitor Feature Comparison Matrix

### Structured Comparison

| Dimension | Entire OnHire | foundU | Workforce One | ReadyTech | Definitiv | Employment Hero |
|---|---|---|---|---|---|---|
| **Primary target** | Labour hire, healthcare | Labour hire, manufacturing | GTO + labour hire | GTO (purpose-built) | Enterprise payroll | SME HR + payroll |
| **GTO purpose-built?** | No | No | Partial | YES (market leader) | No | No |
| **TPES accredited?** | No | No | No | YES (only one) | No | No |
| **Award interpretation** | Basic | Excellent (fully configurable) | Yes | Integrated | Excellent (drag-and-drop) | Good (50+ pre-built) |
| **BOOT support** | No | YES (explicit export tool) | No | No | No | No |
| **Training plan tracking** | No | No | Limited | YES (TAFE dates, field visits) | No | No |
| **Training contract mgmt** | No | No | Limited | YES | No | No |
| **Host employer portal** | YES (mobile) | YES (browser) | YES | YES | No | Limited |
| **Mobile app — worker** | YES (native) | YES (geo clock-in) | No native app | YES (offline capable) | No | YES (SwagApp) |
| **Timesheet → invoice** | YES | YES (one platform) | YES | YES | Not detailed | Yes (basic) |
| **Payroll** | YES | YES (integrated) | YES | YES | YES (single platform) | YES |
| **STP Phase 2** | Not stated | Implied | YES | YES | YES | YES |
| **Compliance automation** | YES (shift blocking) | YES (roster alerts) | YES (ISO 27001) | YES (TPES) | YES | Yes (auto updates) |
| **Reporting** | Standard | Standard | 350+ reports | Completion dashboards | Standard + custom | Standard |
| **Pricing** | Quote-based | $3/user/week | ~$135/user/month | Quote-based | Quote-based | $19-60/employee/month |
| **Free tier** | No | No | No | No | No | Limited |

### Key Strategic Observations

1. **The GTO gap is real.** Workforce One and ReadyTech own the GTO market but both have dated UIs. foundU and Entire OnHire have modern UX but zero GTO features. BSuite can own "modern UX + GTO-native."

2. **ReadyTech's TPES moat is the highest barrier.** 35% market share + only accreditation. Path: win underserved GTOs first, build toward TPES long-term.

3. **foundU's BOOT tool should be matched and extended.** Braden's legal background + BOOT as compliance/validation layer = documentation suitable for FWC review. Superior to anything on market.

4. **Award interpretation is table stakes** but the bar varies. foundU best for labour hire. For GTO specifically, the engine must handle junior/apprentice rates correctly.

5. **Host employer portal UX is where BSuite can win.** No competitor provides GTO-specific host data (training progress, TAFE attendance, field visits) in a modern portal.

6. **Pricing transparency is a differentiator.** foundU publishes $3/user/week. Everyone else hides pricing. Transparent pricing + freemium tier (free for ≤5 apprentices) would be genuinely disruptive.

### Table Stakes vs Nice-to-Have

**TABLE STAKES (Must match — appear in 4+ competitors):**

- Award interpretation engine (configurable)
- Digital onboarding (VEVO, document collection)
- Timesheet → payroll → invoice in one platform
- Host employer portal
- Mobile app for workers
- STP Phase 2 compliance
- Qualification/licence expiry tracking
- Reporting suite
- Integrated payroll

**GTO-SPECIFIC TABLE STAKES:**

- Training contract management
- TAFE/RTO schedule tracking
- Apprentice lifecycle stages as explicit states
- Host employer management (tripartite model)
- Field visit recording on mobile
- Completion rate tracking
- STA/funding body reporting

**NICE-TO-HAVE (Differentiators, not baseline):**

- BOOT tool (only foundU has it)
- Geolocation clock-in with photo
- AI shift matching
- Earned wage access
- Employee perks marketplace
- Invoice financing integration
- TPES accreditation (long-term)
- Freemium tier (no GTO competitor has one)

---

## Appendix C: CRM UX Best Practices Research

### C.1 HubSpot Onboarding — What Makes Day 1 Good

1. **Role-based survey before interface** — 3 questions customise entire experience. User never sees irrelevant features on Day 1.
2. **Sample contacts** — Pre-populated with clearly-labelled demo records. Users learn the workflow on fake data before importing real data.
3. **Email verification as gateway** — First functional action unlocks activity timeline, meetings, email logging. Deliberate: builds daily habit.
4. **TTFV metric** — Time to First Value. Users hitting TTFV in first session are 2x more likely to retain.
5. **Persistent checklist** (not modal) — stays on home screen, disappears when complete.

**CRM7 activation event:** "First training contract created" or "first placement linked to charge rate."

### C.2 Modern CRM UX Patterns (2025-2026)

1. **Command Palette (Cmd+K)** — Expected in every serious B2B SaaS. Use `cmdk` library (1-2 day integration). Handles navigation, record creation, search, quick actions.
2. **Activity Timeline as primary record view** — Open a contact/apprentice → see chronological log of everything. Not a form-first view.
3. **Co-Pilot AI Panel** — Fixed right panel (280-360px, collapsible), context-aware. Shows AI summary + suggested action + chat input for current record.
4. **Role-based canvas layout** — Drag-and-drop dashboard modules. Recruiter's home ≠ finance person's home.

### C.3 Empty State Design

**Three proven approaches:**

1. **Sample data** (HubSpot) — highest-converting for complex products
2. **Instructional illustration** (Pipedrive, Linear) — "two parts instruction, one part delight"
3. **Action-forward** (Keap) — Skip explanation, show two large CTAs

**CRM7 recommendation:** Build a sample data seed: 5 sample apprentices at different lifecycle stages, 2 RTOs, 2 host employers, 1 sample quote. Toggleable: "Explore with sample data / I'll add my own."

### C.4 Data Migration

**Why migration is the biggest barrier:** Fear of data loss during migration. Switching cost is psychological as much as technical.

**Key patterns:**

- Accept CSV from Excel (universal format for GTO admin staff)
- Smart column-mapping: auto-match familiar column names from Workforce One / foundU exports
- Show import errors inline, not as download
- Add export button on every list view from Day 1 (users who can get data out are more willing to put data in)

### C.5 Why Users Abandon CRMs

| Rank | Reason | Fix |
|------|--------|-----|
| 1 | **Data entry burden** — 23% primary complaint, 2-3hrs/day | Reduce keystrokes, voice notes, auto-populate |
| 2 | **Too many clicks** — 5 screens to find a phone number | Command palette, simplified navigation |
| 3 | **Poor integration** — BCC yourself to log emails | Email/calendar integration |
| 4 | **No value for individual user** — CRM benefits managers, burdens users | "My Day" section, personal follow-ups, AI drafts |
| 5 | **One-time training** — Launch training then nothing | Contextual help embedded in product |

### C.6 AI in CRM — What's Worth Building

**Three layers (build in order):**

| Layer | What | CRM7 Priority |
|-------|------|---------------|
| **L1: Automation** | Email drafting, meeting summaries, activity logging | Start here |
| **L2: Intelligence** | Predictive scoring, anomaly detection, "best time to contact" | Next |
| **L3: Agents** | Autonomous multi-step actions | Later (needs trust infrastructure) |

**CRM7 AI recommendations:**
1. Start with Layer 1: email drafting with apprentice/employer context
2. Build GTO-specific context engine: AI understands training contracts, milestones, DTWD funding windows, BOOT conditions
3. Implement co-pilot panel pattern (right-side, collapsible, context-aware)
4. Add "next best action" per apprentice record

### C.7 Priority Implementation Ranking

Based on impact vs effort across all research:

| Priority | Feature | Impact | Effort |
|----------|---------|--------|--------|
| 1 | Kill all stubs/fakes (61 items) | CRITICAL | Medium |
| 2 | Persistent setup checklist | High | Low |
| 3 | Sample GTO data seed | High | Low |
| 4 | CSV import with column-mapping | High | Medium |
| 5 | Activity timeline as primary record view | High | Medium |
| 6 | Cmd+K command palette | High | Low-Medium |
| 7 | Co-pilot AI panel on record views | High | Medium |
| 8 | "My Day" dashboard section | Medium | Low |
| 9 | Feature flag system | High | Medium |
| 10 | Empty states on all list pages | High | Medium |

---

## Appendix D: Sources

### CRM UX & Onboarding

- [HubSpot Onboarding Guide 2025](https://www.project36.io/blog/hubspot-onboarding-guide-step-by-step-process-for-success-in-2025)
- [Appcues: Getting past the empty state](https://www.appcues.com/blog/crm-software-user-onboarding)
- [GoodUX: HubSpot's new user onboarding](https://goodux.appcues.com/blog/hubspots-new-user-onboarding)
- [10 AI-Driven UX Patterns SaaS 2026](https://www.orbix.studio/blogs/ai-driven-ux-patterns-saas-2026)
- [CRM UX Design 2025](https://yellowslice.in/bed/crm-ux-design-in-2025-what-works-what-fails-and-whats-next/)
- [Command Palette UX Patterns](https://medium.com/design-bootcamp/command-palette-ux-patterns-1-d6b6e68f30c1)

### CRM Adoption & Failure

- [Why CRM Adoption Fails — HeyDAN](https://heydan.ai/articles/why-crm-adoption-fails-and-how-to-finally-fix-it)
- [Why CRM Projects Fail 2025](https://atyantik.com/why-crm-projects-fail-in-2025/)
- [CRM Statistics](https://www.sltcreative.com/crm-statistics)
- [UX/UI Impact on CRM Adoption](https://eseospace.com/blog/how-ux-and-ui-impact-crm-adoption-rates/)

### Competitors

- [Entire OnHire](https://entireonhire.com/)
- [foundU — Features](https://www.foundu.com.au/features)
- [foundU — Award Interpretation](https://www.foundu.com.au/solutions/award-interpretation-software)
- [Workforce One](https://www.workforceone.com.au/)
- [ReadyTech — Ready Recruit](https://readytech.io/what-we-do/apprenticeships-and-training/products/ready-recruit/overview)
- [ReadyTech — Ready Apprentice](https://readytech.io/what-we-do/apprenticeships-and-training/products/ready-apprentice/overview)
- [Definitiv — Access Group](https://www.theaccessgroup.com/en-au/products/definitiv/)
- [Employment Hero](https://employmenthero.com/)

### AI in CRM

- [Top 8 Agentic CRM Platforms 2026](https://aimultiple.com/agentic-crm)
- [HubSpot Breeze AI](https://www.eesel.ai/blog/hubspot-breeze-ai-capabilities)
- [HubSpot AI Tools Guide 2026](https://www.hublead.io/blog/hubspot-ai-tools)

### Onboarding Metrics

- [SaaS Factor: User Activation Strategies](https://www.saasfactor.co/blogs/saas-user-activation-proven-onboarding-strategies-to-increase-retention-and-mrr)
- [Chameleon: Product Aha Moment](https://www.chameleon.io/blog/successful-user-onboarding)
- [Attio: Ask More From CRM](https://attio.com/)
