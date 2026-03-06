# AU Funding Claims Enhancement — CRM7

Comprehensive plan to expand CRM7's funding claims module to cover **all** Australian apprenticeship funding bodies, claim types, and automation opportunities, with extensibility for future programs.

---

## 1. Research Findings Summary

### 1A. Funding Bodies & External Systems

| Body | Scope | External System | Portal | API Status |
|------|-------|-----------------|--------|------------|
| **ADMS** (Apprenticeship Data Management System) | Federal — all Commonwealth incentives | `adms` | adms.gov.au (myGov/myID auth) | **No public API.** Web portal only. myGov SSO. |
| **WAAMS** (WA Apprenticeship Management System) | WA state — DTWD/Jobs & Skills WA | `waams` | waamsportal.dtwd.wa.gov.au | **No public API.** Employer portal with 3 access tiers. |
| **CTF** (Construction Training Fund — WA) | WA construction levy-funded | `ctf_wa` | ctf.wa.gov.au portal | **No public API.** Online portal with employer/individual registration. |
| **CITB** (Construction Industry Training Board — SA) | SA construction levy-funded | `citb_sa` | citb.org.au | **No public API.** Application-based claims. |
| **CSQ** (Construction Skills Queensland) | QLD construction levy-funded | `csq_qld` | csq.org.au | **No public API.** Funding paid to RTOs, not employers directly. |
| **ABBTF** (Australian Brick & Blocklaying Training Foundation) | National — bricklaying only | `abbtf` | brickandblockcareers.org.au | **No public API.** Industry-funded, application-based. |
| **Smart and Skilled** (NSW) | NSW subsidised training | `smart_and_skilled` | smartandskilled.nsw.gov.au | **No public API.** RTO-facing system. |
| **Skills First** (VIC) | VIC subsidised training | `skills_first` | skills.vic.gov.au | **No public API.** Provider-facing. |
| **Skills Tasmania** | TAS — ATTF grants | `skills_tas` | skills.tas.gov.au | **No public API.** RTO grant applications. |
| **NT User Choice** | NT employer incentives | `nt_user_choice` | nt.gov.au/training | **No public API.** |
| **Skills SA / SAGTP** | SA GTO funding | `skills_sa` | providers.skills.sa.gov.au | **No public API.** |

**Key finding:** No Australian apprenticeship funding body exposes a public REST/GraphQL API. All use web portals with government identity (myGov/myID/RAM). Automation must focus on **internal workflow mirroring** — tracking claims locally and guiding users through external portal steps.

### 1B. Complete Claim Types (Missing from Current System)

Current claim types: `employer_incentive`, `apprentice_payment`, `wage_subsidy`, `tool_allowance`, `travel_allowance`, `loan`, `reimbursement`, `gto_reimbursement`, `other`.

**Missing claim types to add:**

| Claim Type | Description | Bodies |
|------------|-------------|--------|
| `training_subsidy` | Subsidised training delivery (RTO-facing) | CSQ, Smart & Skilled, Skills First, Skills TAS |
| `upskilling_short_course` | Short course / upskilling funding | CTF WA, CSQ |
| `apprentice_training_support` | CITB-style employer training support payments | CITB SA |
| `payroll_tax_rebate` | State payroll tax exemption/rebate | All states |
| `disability_wage_support` | DAAWS and state equivalents | ADMS |
| `living_away_allowance` | LAFHA | ADMS |
| `accommodation_travel` | State travel/accommodation allowances | Skills TAS, DTWD WA |
| `gto_wage_subsidy` | GTO-specific wage subsidies (distinct from reimbursement) | DTWD WA, SAGTP |
| `brickstart_subsidy` | ABBTF bricklaying-specific | ABBTF |
| `mentor_interpreter` | Assistance tutorial/mentor/interpreter services | ADMS |
| `recognition_prior_learning` | RPL funding | CTF WA |
| `charge_out_rate_reduction` | GTO charge-out rate reduction (GTO Boost) | Skills SA |

### 1C. Missing Milestone Types

Current: `commencement`, `progress`, `midpoint`, `completion`, `periodic`, `ad_hoc`.

**Add:**
- `6_month` — ADMS PHI/KAP 6-month payment point
- `12_month` — ADMS PHI/KAP 12-month payment point
- `24_month` — KAP apprentice 24-month payment
- `36_month` — KAP apprentice 36-month payment
- `annual` — CITB annual payments
- `quarterly` — DAAWS quarterly payments

### 1D. Missing Funding Source Templates

Current templates cover: KAP employer/apprentice, PHI, AATSP, DAAWS, LAFHA, Tool Allowance, JSWA Employer, WA Adult Apprentice, WA GTO Subsidy, NSW CTF Grant.

**Missing templates to add:**

| Template | Category |
|----------|----------|
| CTF WA Apprenticeship Grant (up to $21k) | `state_wa` |
| CTF WA Upskilling/Short Course | `state_wa` |
| CITB SA Apprentice Training Support | `state_sa` |
| CSQ Apprentice/Trainee Support | `state_qld` |
| CSQ Higher Qualifications | `state_qld` |
| ABBTF Brickstart Subsidy ($3k–$6k) | `industry` |
| Skills TAS ATTF | `state_tas` |
| NT User Choice Regional Incentive ($3k) | `state_nt` |
| SA GTO Boost ($5.2k) | `state_sa` |
| VIC Apprenticeships Victoria | `state_vic` |
| JSWA Adult Apprentice Employer Incentive (up to $26.8k) | `state_wa` |
| WAGTP Priority Group Loadings | `state_wa` |
| KAP Employer Incentive 2026 (updated rates) | `federal` |
| PHI 2026 (reduced to $2,500) | `federal` |
| GTO Reimbursement Pilot | `federal` |
| Australian Apprenticeship Support Loan (AASL) | `federal` |

### 1E. Missing External Systems / Template Categories

Current external systems: `adms`, `waams`, `ctf`, `smart_and_skilled`, `skills_first`.
Current template categories: `federal`, `state_wa`, `state_nsw`, `state_vic`, `state_qld`.

**Add external systems:** `ctf_wa`, `citb_sa`, `csq_qld`, `abbtf`, `skills_tas`, `nt_user_choice`, `skills_sa`, `wagtp`.
**Add template categories:** `state_sa`, `state_tas`, `state_nt`, `state_act`, `industry`.

---

## 2. Automation Opportunities

Since no body has a public API, automation focuses on **internal workflow intelligence**:

### 2A. Automatable Now (Internal Logic)

| Feature | Description | Effort |
|---------|-------------|--------|
| **Milestone auto-scheduling** | When a claim/funding source is created, auto-generate upcoming milestone dates based on `payment_schedule` template + apprentice start date | Medium |
| **Eligibility pre-check** | Validate claim eligibility rules locally (qualification on priority list, employment type, location, age, first-year status) before user submits externally | Medium |
| **Claim amount auto-calculation** | Based on template schedule + FT/PT status + priority loadings, auto-suggest claim amount | Low |
| **Reminder notifications** | Notify users when milestone dates approach (e.g., "PHI 6-month claim window opens in 14 days") | Medium |
| **Document checklist generation** | Per funding body + claim type, generate required documents checklist (wage evidence, training contract, etc.) | Low |
| **Duplicate claim detection** | Flag when a claim for the same apprentice/body/milestone already exists | Low |
| **Status sync guidance** | Show step-by-step instructions for submitting in the external portal (ADMS, WAAMS, CTF) alongside the internal claim record | Low |
| **Priority list lookup** | Store the Australian Apprenticeship Priority List locally and auto-tag qualifications as KAP/Priority/Non-priority | Medium |
| **Bulk claim generation** | For employers with multiple apprentices hitting the same milestone, batch-create draft claims | Medium |

### 2B. Future Automation (If APIs Emerge)

| Feature | Description |
|---------|-------------|
| **ADMS claim submission** | Direct submission via API when/if DEWR opens one |
| **ADMS status polling** | Check claim status automatically |
| **WAAMS data sync** | Sync training contract data from WAAMS |
| **CTF portal integration** | Auto-submit CTF claims |

---

## 3. Implementation Plan

### Phase 1: Data Model & Types (Low Risk)

1. **Update `FundingClaim` interface** — add new claim types, milestone types
2. **Update `FundingSource` interface** — add new `external_system` and `priority_list_category` values
3. **Expand `funding-source-templates.ts`** — add all missing templates (CTF WA, CITB, CSQ, ABBTF, Skills TAS, NT, SA, VIC, updated 2026 federal rates)
4. **Add template categories** — `state_sa`, `state_tas`, `state_nt`, `state_act`, `industry`
5. **Update Zod schemas** — extend enum options in claim form

### Phase 2: UI Enhancements (Medium Risk)

6. **Update claim form dropdowns** — new claim types, milestone types, external systems
7. **Add "Funding Body Guide" panel** — when external system is selected, show portal URL, instructions, required documents
8. **Update claim detail page** — show funding body-specific context (portal links, document checklists)
9. **Add priority list category badge** — visual indicator of KAP/Priority/Non-priority on claim cards

### Phase 3: Automation Features (Medium Risk)

10. **Milestone auto-scheduler** — `lib/milestone-scheduler.ts` — given a funding source template + apprentice start date, generate milestone dates and amounts
11. **Eligibility pre-check engine** — `lib/eligibility-checker.ts` — validate claim against known rules (qualification, employment type, location, age)
12. **Claim amount calculator** — auto-suggest amount based on template + FT/PT + loadings
13. **Document checklist generator** — per funding body, show required docs

### Phase 4: Notifications & Bulk Operations (Lower Priority)

14. **Milestone reminder system** — upcoming claim window notifications
15. **Bulk claim draft generation** — batch create for multiple apprentices at same milestone
16. **Duplicate claim detection** — warn on create if similar claim exists

---

## 4. Files to Modify

| File | Changes |
|------|---------|
| `crm7/src/types/entities.ts` | Add new claim type literals, milestone type literals, external system literals |
| `crm7/src/lib/funding-source-templates.ts` | Add ~16 new templates, new categories, update 2026 rates |
| `crm7/src/pages/claims/new.tsx` | Expand dropdowns, add funding body guide panel |
| `crm7/src/pages/claims/[id].tsx` | Add funding body context, document checklist |
| `crm7/src/pages/claims/list.tsx` | Add new filter options |
| `crm7/src/stores/fundingClaimStore.ts` | Update filter value types |
| `crm7/src/pages/funding-sources/new.tsx` | Update template picker with new categories |

### New Files

| File | Purpose |
|------|---------|
| `crm7/src/lib/au-funding-bodies.ts` | Registry of all AU funding bodies with metadata (portal URLs, docs, instructions) |
| `crm7/src/lib/milestone-scheduler.ts` | Auto-generate milestone dates from templates |
| `crm7/src/lib/eligibility-checker.ts` | Pre-check eligibility rules |
| `crm7/src/lib/claim-amount-calculator.ts` | Auto-suggest amounts based on templates + employment type |
| `crm7/src/lib/document-checklist.ts` | Per-body required documents config |
| `crm7/src/components/funding/FundingBodyGuide.tsx` | Info panel showing portal instructions per body |

---

## 5. Scope Decision

Recommend implementing **Phases 1–3** in this task (data model + UI + automation logic). Phase 4 (notifications, bulk ops) can be a follow-up.

Estimated touch: ~8 files modified, ~6 new files, no DB migrations needed (all fields already exist on the `funding_claims` table as free-text strings).
