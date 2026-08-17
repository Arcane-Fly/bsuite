<!-- G5-VERDICT-BANNER -->
> **VERDICT (NEVER-BUILT-AND-SHOULD-NOT-BE) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ⛔ VERDICT: NEVER-BUILT-AND-SHOULD-NOT-BE
>
> This proposes a **new standalone repository `bsuite/recruit7`** for candidate sourcing and
> onboarding. It was never created and should not be.
>
> **Measured:** `.gitmodules` declares six submodules — `crm7`, `braden`,
> `business-suite-unified`, `conduit`, `throughput`, `R80.4`. There is no `recruit7`.
>
> **The capability was built, in Conduit, not in a seventh repo.** Conduit carries the recruitment
> domain (`r7_*` tables, `r7_talent_pool_matcher` and `r7-automation-processor` edge functions) and
> its AI tool suite already covers exactly this plan's scope:
> `conduit/src/lib/ai/tools/candidate-tools.ts`, `job-tools.ts`, `pipeline-tools.ts`,
> `interview-tools.ts`, `triage-tools.ts`.
>
> Standing up `recruit7` now would duplicate Conduit and breach the estate's enter-once-use-
> everywhere rule. **The competitive-landscape section retains reference value.**

---

# Recruit7 — Candidate Sourcing & Onboarding Platform

New standalone repo (`bsuite/recruit7`) for end-to-end candidate sourcing, job posting, employer/employee onboarding, and candidate progress tracking — purpose-built for GTOs and apprenticeship providers, designed to connect to the bsuite ecosystem via shared Supabase when ready.

---

## Competitive Landscape

### Direct Competitors (Australian GTO/Recruitment)

| Vendor | Strength | Gap |
|--------|----------|-----|
| **ReadyTech** | Only purpose-built GTO/STA platform (20yr). AVETMISS, apprentice lifecycle | Closed ecosystem, legacy UX, no AI |
| **LiveHire** | Talent clouds, candidate-owned profiles, AI matching, 2-way SMS | No GTO features, no onboarding/payroll |
| **JobAdder** | ATS+CRM, 200+ job board integrations, SEEK optimised | No onboarding, no GTO compliance |
| **PageUp** | Enterprise recruitment marketing, LMS, analytics | Enterprise-priced, no GTO modules |
| **Broadbean** | 7,000+ job board distribution, analytics | Distribution only, no ATS/CRM |
| **ELMO** | Recruitment → onboarding → payroll, AI job ads | No GTO-specific workflows |
| **Employment Hero** | SmartMatch AI, integrated ATS→payroll, own job board | SMB focus, no apprenticeship features |
| **foundU** | Onboarding, VEVO checks, STP, rostering | No ATS, no talent pooling |

### Key Market Gap
**No single platform** combines modern candidate sourcing (LiveHire-style talent pools) + GTO-specific compliance (ReadyTech-level) + AI-powered workflows (bsuite vision) + integrated onboarding. This is the opportunity.

---

## Feature Set — 8 Modules

### Module 1: Candidate Sourcing & Talent Pools

| Feature | Description | Competitor Reference |
|---------|-------------|---------------------|
| **Talent Clouds** | Branded, shareable talent pools per qualification/trade/region | LiveHire |
| **Candidate-Owned Profiles** | Candidates create/update own profiles, control visibility | LiveHire |
| **AI Matching** | Score candidates against job requirements using embeddings | LiveHire, Employment Hero SmartMatch |
| **Referral Engine** | Employee/partner referral tracking with reward workflows | PageUp |
| **Social Sourcing** | Chrome extension to import profiles from LinkedIn/SEEK/Indeed | LiveHire (CrintellTech) |
| **Talent Rediscovery** | AI resurfaces past candidates for new roles | JobAdder, Broadbean |
| **Pipeline Kanban** | Visual drag-drop pipeline stages per role | JobAdder |
| **Duplicate Detection** | AI-powered fuzzy matching to prevent duplicate candidates | bsuite AI vision |
| **Candidate Scoring** | Configurable weighted scoring (skills, location, availability) | Employment Hero |
| **Bulk Import** | CSV/Excel import with AI field mapping | bsuite AI vision |

### Module 2: Job Posting & Distribution

| Feature | Description | Competitor Reference |
|---------|-------------|---------------------|
| **Multi-Channel Posting** | One-click post to SEEK, Indeed, LinkedIn, Jora, CareerOne | Broadbean, JobAdder |
| **AI Job Ad Generator** | Generate compliant, engaging job ads from minimal input | ELMO |
| **Branded Career Portal** | Tenant-branded careers page (custom domain support) | ELMO, PageUp |
| **Template Library** | Reusable job templates by qualification/trade | JobAdder |
| **Board Analytics** | Track cost-per-application, source effectiveness, time-to-fill per board | Broadbean |
| **Internal Job Board** | Post to internal talent pool first before external | LiveHire |
| **Compliance Flags** | Auto-flag ads missing required info (award reference, conditions) | Australian compliance |
| **Application Forms** | Configurable application forms per role with conditional logic | JobAdder |
| **QR Code Applications** | Generate QR codes for physical job ads (trade shows, sites) | Modern UX |

### Module 3: Employer Onboarding (Host Employer Setup)

| Feature | Description | Competitor Reference |
|---------|-------------|---------------------|
| **Host Employer Registration** | Self-service portal for host employers to register | GTO workflow |
| **WHS Pre-Qualification** | Checklist: insurance, safety plan, equipment, supervisor quals | GTO compliance |
| **Site Assessment** | Digital site inspection forms with photo capture | GTO compliance |
| **Agreement Generation** | Auto-generate host employer agreements from templates | ELMO (e-signatures) |
| **E-Signatures** | Digital signing of agreements (DocuSign/Annature integration) | ELMO, Flare HR |
| **ABN/ACN Verification** | Auto-verify against ABR (Australian Business Register) | foundU |
| **Insurance Verification** | Upload + expiry tracking for WorkCover, public liability | GTO compliance |
| **Supervisor Registration** | Register and verify workplace supervisors | GTO compliance |
| **Capacity Assessment** | AI-evaluate employer capacity for apprentices (# supervisors, equipment, space) | bsuite AI |
| **Compliance Dashboard** | Real-time employer compliance status with expiry alerts | foundU |

### Module 4: Employee/Apprentice Onboarding

| Feature | Description | Competitor Reference |
|---------|-------------|---------------------|
| **Digital Onboarding Pack** | Paperless collection of TFN, super choice, bank details, emergency contacts | foundU, Employment Hero |
| **VEVO Check** | Automated right-to-work verification via VEVO API | foundU |
| **USI Verification** | Automated Unique Student Identifier lookup/verification | GTO compliance |
| **Police Check** | Integration with CVCheck/Fit2Work for national police checks | JobAdder, PageUp |
| **Medical/Fitness** | Pre-employment medical questionnaire + booking integration | GTO compliance |
| **Induction Modules** | Digital induction content (videos, quizzes, acknowledgements) | Employment Hero |
| **PPE Checklist** | Record PPE issued with photo evidence | GTO compliance |
| **Contract Generation** | Auto-generate employment contracts from templates with e-sign | ELMO |
| **Training Contract** | Generate AASN-compliant training contract documents | GTO-specific |
| **Welcome Kit** | Automated welcome emails, first-day info, buddy assignment | Modern UX |
| **Document Vault** | Secure per-candidate document storage with expiry tracking | foundU |
| **Checklist Engine** | Configurable onboarding checklists per role/qualification/employer | Employment Hero |

### Module 5: Candidate Progress & Journey Tracking

| Feature | Description | Competitor Reference |
|---------|-------------|---------------------|
| **Journey Timeline** | Visual timeline of every candidate touchpoint (application → placement) | bsuite vision |
| **Stage Gates** | Configurable stage gates with required actions before progression | JobAdder pipelines |
| **Communication Log** | All emails, SMS, calls logged against candidate with templates | LiveHire |
| **2-Way SMS** | Send/receive SMS directly from candidate profile | LiveHire |
| **Email Templates** | Branded email templates for each stage (applied, shortlisted, offer, etc.) | JobAdder |
| **Interview Scheduling** | Calendar integration for booking interviews (Calendly-style) | JobAdder |
| **Assessment Tracking** | Pre-employment assessments (aptitude, trade skills, literacy/numeracy) | GTO-specific |
| **Offer Management** | Generate, send, track acceptance of formal offers | PageUp |
| **Rejection Workflows** | Respectful rejection emails with opt-in to talent pool | LiveHire |
| **Candidate Portal** | Self-service portal: track application status, upload docs, complete tasks | LiveHire |
| **Field Officer App** | Mobile app for field officers: site visits, candidate check-ins, notes | GTO-specific |
| **NPS/Feedback** | Post-placement candidate and employer satisfaction surveys | PageUp |

### Module 6: Compliance & Regulatory (GTO-Specific)

| Feature | Description | Competitor Reference |
|---------|-------------|---------------------|
| **AVETMISS Export** | Generate compliant NAT files for state/territory reporting | ReadyTech, Intrinsiq |
| **Training Contract Lodgement** | Prepare and track AASN lodgement of training contracts | ReadyTech |
| **Funding Eligibility Check** | Auto-check candidate eligibility for state/federal incentives | bsuite CRM7 funding module |
| **Competency Matrix** | Track unit-by-unit competency completion per apprentice | ReadyTech |
| **Probation Tracking** | Monitor probation periods with milestone check-ins | GTO compliance |
| **Award Compliance** | Auto-check employment conditions against relevant award | bsuite R8 integration |
| **Government Reporting** | State-specific reporting (SA STELA, NSW Smart & Skilled, etc.) | ReadyTech |
| **Audit Trail** | Full audit trail of all compliance actions and decisions | Enterprise requirement |

### Module 7: Analytics & Intelligence

| Feature | Description | Competitor Reference |
|---------|-------------|---------------------|
| **Recruitment Funnel** | Application → Screen → Interview → Offer → Start conversion rates | All ATS platforms |
| **Source ROI** | Cost-per-hire and quality-of-hire by source channel | Broadbean |
| **Time-to-Fill** | Track days from posting to placement by role/region/qualification | All ATS platforms |
| **Diversity Metrics** | Track and report on diversity in candidate pipeline | PageUp |
| **AI Predictions** | Predict candidate success probability based on historical data | bsuite AI vision |
| **Employer Scorecard** | Rate host employers on retention, satisfaction, compliance | GTO-specific |
| **Custom Dashboards** | Drag-drop dashboard builder with saved views per role | bsuite AI vision |
| **Scheduled Reports** | Auto-generate and email reports on schedule | PageUp |

### Module 8: Integrations & Ecosystem

| Feature | Description | Priority |
|---------|-------------|----------|
| **bsuite CRM7** | Sync apprentices, employers, contacts, placements bidirectionally | P0 — core |
| **bsuite R8** | Pull award rates for compliance checking | P1 |
| **bsuite BSU** | SSO, tenant management, billing, permissions | P0 — core |
| **SEEK API** | Post jobs, receive applications | P1 |
| **Indeed API** | Post jobs, receive applications | P1 |
| **LinkedIn** | Post jobs, source candidates | P2 |
| **Xero/MYOB** | Sync new employees for payroll setup | P2 |
| **DocuSign/Annature** | E-signatures for contracts and agreements | P1 |
| **CVCheck/Fit2Work** | Background and police checks | P1 |
| **ABR API** | ABN/ACN verification | P1 |
| **VEVO API** | Right-to-work verification | P1 |
| **USI Registry** | Student identifier verification | P1 |
| **Training.gov.au** | Qualification and RTO data sync | P2 |
| **Google/Outlook Calendar** | Interview scheduling | P2 |
| **Twilio/MessageMedia** | SMS communications | P1 |

---

## Technical Architecture

### New Repo: `bsuite/recruit7`

```
recruit7/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── (auth)/             # Login, register, SSO callback
│   │   ├── (dashboard)/        # Main authenticated layout
│   │   │   ├── candidates/     # Talent pool & candidate management
│   │   │   ├── jobs/           # Job posting & distribution
│   │   │   ├── onboarding/     # Employer & employee onboarding
│   │   │   ├── pipeline/       # Recruitment pipeline (kanban)
│   │   │   ├── compliance/     # GTO compliance hub
│   │   │   ├── analytics/      # Dashboards & reports
│   │   │   └── settings/       # Config, integrations, templates
│   │   ├── portal/             # External portals
│   │   │   ├── candidate/      # Candidate self-service
│   │   │   ├── employer/       # Host employer self-service
│   │   │   └── careers/        # Public careers page
│   │   └── api/                # API routes
│   │       ├── ai/             # AI endpoints (matching, generation)
│   │       ├── integrations/   # Webhook receivers (SEEK, Indeed)
│   │       └── webhooks/       # Internal event webhooks
│   ├── components/             # Shared UI components
│   │   ├── ui/                 # shadcn/ui base
│   │   ├── candidates/         # Candidate-specific components
│   │   ├── jobs/               # Job posting components
│   │   ├── onboarding/         # Onboarding flow components
│   │   └── compliance/         # Compliance components
│   ├── lib/                    # Core libraries
│   │   ├── supabase/           # Supabase client + types
│   │   ├── ai/                 # AI service layer
│   │   └── integrations/       # External API clients
│   ├── stores/                 # Zustand stores
│   └── types/                  # TypeScript types
├── supabase/
│   ├── migrations/             # DB migrations (recruit7-specific tables)
│   └── functions/              # Edge functions
├── public/
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| **Framework** | Next.js 15 (App Router) | SSR, API routes, RSC, latest patterns |
| **UI** | shadcn/ui + Tailwind + Lucide | Matches bsuite design system |
| **State** | Zustand + React Query | Matches CRM7 patterns |
| **Database** | Supabase (same project: `tuybltdrdefjblnplpqo`) | Shared data layer |
| **Auth** | Supabase Auth (SSO via BSU) | Single identity provider |
| **AI** | Vercel AI SDK + AI Gateway | Matches CRM7 AI vision |
| **SMS** | Twilio or MessageMedia | 2-way SMS for candidate comms |
| **Email** | Resend or Supabase email | Transactional emails |
| **File Storage** | Supabase Storage | Documents, photos, certificates |
| **Deployment** | Vercel | Matches bsuite deployment |
| **Domain** | `recruit.crm7.app` | Matches naming convention |

### Database — New Tables (in shared Supabase)

All tables tenant-scoped with RLS. Prefix `r7_` to avoid collisions.

```sql
-- Core recruitment
r7_talent_pools          -- Named talent pools (per qualification/trade/region)
r7_candidates            -- Candidate profiles (extends contacts)
r7_candidate_pool_memberships -- M:M candidates ↔ pools
r7_jobs                  -- Job postings
r7_job_distributions     -- Where each job was posted + performance
r7_applications          -- Candidate applications to jobs
r7_pipeline_stages       -- Configurable pipeline stages per tenant
r7_pipeline_entries      -- Candidate position in pipeline
r7_interviews            -- Scheduled interviews
r7_assessments           -- Pre-employment assessments
r7_offers                -- Formal offers sent/accepted/declined

-- Onboarding
r7_onboarding_templates  -- Configurable onboarding checklists
r7_onboarding_instances  -- Active onboarding for a candidate
r7_onboarding_tasks      -- Individual tasks within an onboarding
r7_documents             -- Uploaded documents (TFN, super, police check, etc.)
r7_document_verifications-- Verification status of documents
r7_induction_modules     -- Digital induction content
r7_induction_completions -- Candidate completion of induction modules

-- Employer onboarding
r7_employer_registrations  -- Host employer registration submissions
r7_site_assessments        -- WHS site assessment records
r7_employer_agreements     -- Generated agreements + signature status
r7_employer_compliance     -- Per-employer compliance checklist items

-- Compliance
r7_competency_records    -- Unit-by-unit competency tracking
r7_training_contracts    -- AASN training contract records
r7_avetmiss_exports      -- Generated AVETMISS NAT file records
r7_compliance_checks     -- VEVO, USI, police check results

-- Communications
r7_communications        -- All emails/SMS sent and received
r7_communication_templates -- Reusable message templates
r7_scheduled_messages    -- Queued future messages

-- Analytics
r7_source_metrics        -- Aggregated source channel performance
r7_funnel_snapshots      -- Point-in-time funnel data for trending
```

### Connection to bsuite Ecosystem

```
recruit7 READS from (CRM7-owned):
  - apprentices, employers, contacts, qualifications, placements
  - funding_sources, funding_claims

recruit7 WRITES to (recruit7-owned):
  - r7_* tables (all recruitment/onboarding data)
  - candidates → contacts (creates contact when candidate is hired)
  - r7_pipeline_entries → apprentices (creates apprentice on placement)

recruit7 READS from (R8-owned):
  - award_rates (for compliance checking)

recruit7 READS from (BSU-owned):
  - users, tenants, user_tenants, permissions
```

---

## Implementation Phases

### Phase 1: Repo Scaffold + Core Candidate Management (2 weeks)
- Next.js 15 project setup with shared Supabase
- Auth wiring (SSO via BSU)
- Candidate CRUD + talent pools
- Pipeline kanban board
- Basic candidate profile page

### Phase 2: Job Posting & Distribution (1.5 weeks)
- Job creation form with AI ad generator
- Branded careers portal (public)
- SEEK API integration
- Application intake + pipeline auto-entry
- Board analytics

### Phase 3: Employer Onboarding (1.5 weeks)
- Host employer self-service registration portal
- WHS pre-qualification checklist
- Agreement generation + e-signature (Annature)
- ABN verification (ABR API)
- Compliance dashboard

### Phase 4: Employee/Apprentice Onboarding (2 weeks)
- Digital onboarding pack (TFN, super, bank, emergency)
- VEVO + USI + police check integrations
- Induction module builder + delivery
- Contract generation + e-sign
- Document vault with expiry tracking
- Checklist engine

### Phase 5: Progress Tracking & Communications (1.5 weeks)
- Journey timeline
- 2-way SMS (Twilio)
- Email templates + scheduling
- Interview scheduling (calendar integration)
- Candidate self-service portal

### Phase 6: GTO Compliance (1.5 weeks)
- AVETMISS NAT file generation
- Training contract lodgement tracking
- Competency matrix
- Government reporting templates
- Award compliance checks (R8 integration)

### Phase 7: Analytics & AI (1 week)
- Recruitment funnel dashboard
- Source ROI analytics
- AI candidate matching
- AI predictions (candidate success probability)
- Custom dashboard builder

### Phase 8: CRM7 Integration Bridge (1 week)
- Bidirectional sync: candidates ↔ contacts/apprentices
- Employer sync with CRM7 employers table
- Qualification sync
- Placement creation from recruit7 pipeline
- Event-driven sync via Supabase realtime/triggers

---

## Entity Ownership Update (DRY Architecture)

Add to `DRY-ONE-SHOT-ARCHITECTURE.md`:

| Entity | Owner App | Supabase Table |
|--------|-----------|----------------|
| **Candidates** | Recruit7 | `r7_candidates` |
| **Talent Pools** | Recruit7 | `r7_talent_pools` |
| **Job Postings** | Recruit7 | `r7_jobs` |
| **Applications** | Recruit7 | `r7_applications` |
| **Onboarding Flows** | Recruit7 | `r7_onboarding_*` |
| **Recruitment Comms** | Recruit7 | `r7_communications` |
| **Compliance Checks** | Recruit7 | `r7_compliance_checks` |
| **Competency Records** | Recruit7 | `r7_competency_records` |

---

## Why This Wins

1. **Only platform combining modern sourcing + GTO compliance** — ReadyTech has compliance but 2005-era UX; LiveHire has sourcing but no GTO features
2. **AI-native from day one** — competitor bolts-on chatbots; we use AI for matching, ad generation, compliance prediction, candidate scoring
3. **Self-service portals** — candidates AND employers manage their own onboarding (reduces GTO admin by ~60%)
4. **Shared data layer** — apprentice created in recruit7 → instantly available in CRM7 for placement management, R8 for rate calculation, BSU for metrics
5. **Mobile-first field officer experience** — site visits, candidate check-ins, photo evidence — all from phone
