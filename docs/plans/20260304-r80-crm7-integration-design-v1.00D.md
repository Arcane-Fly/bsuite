# R80.3 + CRM7 Integration — Shared Wage/Conditions Architecture

**Date:** 2026-03-04
**Status:** D (Draft)
**Version:** v1.00D
**Scope:** R80.3, CRM7, @bsuite/charge-calc, @bsuite/nav-core, Supabase shared backend

---

## 1. Problem Statement

R80.3 (wage calculator) and CRM7 (GTO CRM) share a Supabase backend but operate as data silos:

- R80.3 has hardcoded default wages and variables from `charge-calculator.jsx` — not live Fair Work data
- CRM7 duplicates the R80.3 charge-rate calculation in `pages/charge-rates/create.tsx`
- `AppSwitcher` is copy-pasted across 4 apps (CRM7, R80.3, BSU, conduit) — ~600 lines of identical code
- Cookie storage utility is triplicated across R80.3, CRM7, BSU — with a known bug in BSU (`readCookie` vs `readCookieRaw`)
- Two deprecated calc engines in R80.3 (`r8Calc.ts`, `calculationUtils.ts`) have no importers and exist as dead code
- Charge rates calculated in R80.3 cannot flow to CRM7 host agreements, quotes, or apprentice wage schedules
- Fair Work API data is siloed per app — no shared cache, no bidirectional sync

---

## 2. Chosen Approach: Data Layer First (Approach 2)

Three sequentially shippable milestones built on a shared Supabase schema foundation.

```
R80.3 (subscription-gated calc) ──writes──► host_charge_rates table ◄──reads── CRM7
R80.3 ──reads──► award_rate_cache ◄──writes── CRM7 Fair Work integration
CRM7 ──writes──► apprentice_wage_schedules (linked to host_employer) ◄──reads── R80.3
```

---

## 3. Supabase Schema (Migration: Milestone 1)

### 3.1 `award_rate_cache`
Shared cache for Fair Work API award rates. Either app can write; both read.

```sql
CREATE TABLE award_rate_cache (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID REFERENCES tenants(id) ON DELETE CASCADE,
  award_code           TEXT NOT NULL,           -- e.g., MA000025
  classification_code  TEXT,                    -- e.g., 'C10', 'AW4'
  year_of_trade        INT,                     -- 1–4 for apprentices
  effective_date       DATE NOT NULL,
  hourly_rate          DECIMAL(10,4) NOT NULL,
  source               TEXT DEFAULT 'fwc-api',  -- 'fwc-api' | 'manual' | 'jodie'
  fetched_at           TIMESTAMPTZ DEFAULT now(),
  expires_at           TIMESTAMPTZ,             -- null = never expires
  UNIQUE(tenant_id, award_code, classification_code, year_of_trade, effective_date)
);
-- RLS: tenant_id isolation, both apps read/write
```

### 3.2 `enterprise_agreements`
GTO-managed EA records. GTO admins are NOT signatories, but host employers may ask hosted apprentices to mirror EA conditions. FWC approval = BOOT pre-passed.

```sql
CREATE TABLE enterprise_agreements (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID REFERENCES tenants(id) ON DELETE CASCADE,
  fwc_agreement_id         TEXT,               -- From https://www.fwc.gov.au/document-search
  fwc_document_url         TEXT,               -- Direct link to FWC document
  name                     TEXT NOT NULL,
  employer_name            TEXT,
  commencement_date        DATE,
  expiry_date              DATE,
  status                   TEXT DEFAULT 'active' CHECK (status IN ('active','expired','suspended')),
  storage_path             TEXT,               -- Supabase Storage path if PDF uploaded
  underpinning_award_code  TEXT,              -- Award that applies where EA is silent
  boot_approved            BOOLEAN DEFAULT TRUE, -- FWC approval implies BOOT passed
  classifications          JSONB,              -- { code, title, hourly_rate }[]
  created_by               UUID,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);
-- RLS: tenant_id isolation
```

### 3.3 `host_charge_rates`
Canonical charge rates for a host employer. Both R80.3 (source_app='r80') and CRM7 (source_app='crm7') write here. Cross-check: flag discrepancies > 5%.

```sql
CREATE TABLE host_charge_rates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID REFERENCES tenants(id) ON DELETE CASCADE,
  host_employer_id      UUID REFERENCES host_employers(id) ON DELETE CASCADE,
  source_app            TEXT NOT NULL CHECK (source_app IN ('r80', 'crm7', 'manual')),
  rate_source_type      TEXT NOT NULL CHECK (rate_source_type IN ('award','enterprise_agreement','custom')),
  enterprise_agreement_id UUID REFERENCES enterprise_agreements(id),
  charge_rate_hourly    DECIMAL(10,2) NOT NULL,
  effective_from        DATE NOT NULL,
  effective_to          DATE,
  calc_config           JSONB,     -- Full CalcConfig snapshot (@bsuite/charge-calc)
  calc_result           JSONB,     -- Full CalcResult snapshot
  crm7_verified         BOOLEAN,   -- CRM7 cross-check passed
  crm7_verified_at      TIMESTAMPTZ,
  notes                 TEXT,
  created_by            UUID,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
-- RLS: tenant_id isolation
```

### 3.4 `apprentice_wage_schedules`
Wage schedule for an apprentice at a host employer. Inherits from award or EA; custom rates must pass BOOT.

```sql
CREATE TABLE apprentice_wage_schedules (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID REFERENCES tenants(id) ON DELETE CASCADE,
  apprentice_id           UUID NOT NULL,                        -- people.id
  host_employer_id        UUID REFERENCES host_employers(id),
  rate_source_type        TEXT NOT NULL CHECK (rate_source_type IN ('award','enterprise_agreement','custom')),
  enterprise_agreement_id UUID REFERENCES enterprise_agreements(id),
  award_code              TEXT,
  classification_code     TEXT,
  year_of_trade           INT,
  -- Rates
  base_hourly_rate        DECIMAL(10,4) NOT NULL,
  super_rate              DECIMAL(6,4) DEFAULT 0.12,
  payroll_tax_rate        DECIMAL(6,4),
  payroll_tax_state       TEXT,                                -- 'WA','VIC','QLD',...
  wc_rate                 DECIMAL(6,4),
  leave_loading           DECIMAL(6,4) DEFAULT 0.175,
  -- Conditions
  hours_per_week          DECIMAL(5,2) DEFAULT 38,
  employment_type         TEXT DEFAULT 'full_time',
  -- BOOT
  boot_status             TEXT CHECK (boot_status IN ('passed','failed','not_required','pending')),
  boot_checked_at         TIMESTAMPTZ,
  boot_result             JSONB,
  -- Sync
  effective_from          DATE NOT NULL,
  effective_to            DATE,
  sync_source             TEXT CHECK (sync_source IN ('r80','crm7','manual')),
  last_synced_at          TIMESTAMPTZ,
  created_by              UUID,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);
-- RLS: tenant_id isolation
```

---

## 4. Wage/Conditions Resolution Hierarchy

When building a wage schedule for an apprentice at a host employer:

```
1. Select rate source type:
   a. Award          → Fair Work API (FindYourAward by occupation/industry)
   b. Enterprise Agreement → from enterprise_agreements table (BOOT pre-passed)
   c. Custom         → manual entry → BOOT check required against underpinning award

2. On-costs resolution:
   a. Super          → 12% SG (statutory, from @bsuite/charge-calc defaults)
   b. Payroll tax    → RAM credential → state revenue office API
                     → fallback: Jodie AI web search for current state rate
   c. Workers comp   → manual entry OR state WC minimum rates (stored in award_rate_cache)
   d. Leave loading  → 17.5% (standard) OR award-specific if different

3. All conditions not explicitly set → underpinning award (Fair Work API)

4. BOOT gate (for custom rates only):
   a. Calculate annualised custom wage
   b. Calculate annualised award wage (same classification, same hours)
   c. Custom must be ≥ award for all protected conditions
   d. Cannot proceed if BOOT fails
```

---

## 5. Subscription Gating

| Feature | R80.3 | CRM7 |
|---------|-------|------|
| View award rates from Fair Work | Free (public data) | Free |
| **Charge rate calculation engine** | **Subscription required** | **CRM7 subscription** |
| Push charge rate to CRM7 | Subscription required | — |
| EA upload/link | Subscription required | CRM7 subscription |
| BOOT validation | Subscription required | CRM7 subscription |
| Payroll tax auto-resolve | Subscription required | CRM7 subscription |

CRM7 subscription gates access to CRM7 itself (already implemented via feature flags). Within CRM7, the payroll/award-rates section uses the Fair Work enhanced service and is available to all active CRM7 tenants.

---

## 6. DRY Cleanup (Milestone 1)

### 6.1 Delete deprecated calc files
- `R80.3/src/lib/r8Calc.ts` — zero live importers, all functions deprecated in favour of `calcBridge.ts`
- `R80.3/src/utils/calculationUtils.ts` — same; `calcBridge.ts` is the canonical bridge to `@bsuite/charge-calc`

### 6.2 Stores
Keep `calculatorStore` and `apprenticeStore` separate (different domains):
- `calculatorStore`: formula state, custom rates, saved calculations (single-calc UX)
- `apprenticeStore`: multi-apprentice collection, active apprentice, Supabase sync

Remove any duplication of `calculateResults` logic — both stores delegate to `calcBridge.ts`.

### 6.3 `@bsuite/nav-core` v0.2.0
New exports:
- `AppSwitcher` component — props-driven, env-agnostic (no `import.meta.env` inside)
- `createCookieStorage(options)` — shared chunked cookie storage factory (fixes BSU `readCookieRaw` bug)

Each project passes its app list as props and creates its own cookie storage instance.

### 6.4 Cookie storage
Replace triplicated chunked cookie code in:
- `R80.3/src/services/supabaseClient.ts`
- `crm7/src/lib/supabase.ts`
- `business-suite-unified/src/lib/supabase.ts`

BSU's `readCookie()` → `readCookieRaw()` bug is fixed in the extracted implementation.

---

## 7. R80.3 Live Data Wiring (Milestone 2)

### 7.1 `calcBridge.ts` update
Add `resolveAwardRate(awardCode, classificationCode, yearOfTrade, supabase)`:
- Checks `award_rate_cache` first (< 7 days old)
- If stale: fetches from Fair Work API, writes back to cache
- Returns `{ hourlyRate, source, effectiveDate }`

### 7.2 `charge-calculator.jsx` → React component refactor
Replace hardcoded `wage` default with:
```typescript
const { data: awardRate } = useAwardRate({ awardCode, classification, year })
// Falls back to hardcoded default if no subscription or API failure
```

### 7.3 Payroll tax resolver
```typescript
async function resolvePayrollTax(state: AustralianState): Promise<number> {
  // 1. Check award_rate_cache for payroll_tax:{state}
  // 2. If RAM credentials configured → state revenue authority API
  // 3. If not → Jodie AI web search: "WA payroll tax rate 2026"
  // 4. Store result in award_rate_cache (expires: 90 days)
}
```

### 7.4 Push-to-CRM7 button
After successful calculation (subscription-gated):
```typescript
await supabase.from('host_charge_rates').upsert({
  tenant_id, host_employer_id, source_app: 'r80',
  charge_rate_hourly, calc_config, calc_result,
  rate_source_type, effective_from: today
})
```

### 7.5 EA selector
- "Link FWC Agreement" → open FWC document search in drawer, paste URL → parse `fwc_agreement_id`
- "Upload EA PDF" → Supabase Storage → `enterprise_agreements` record
- Both paths set `boot_approved = true` (FWC approval implies BOOT)

---

## 8. CRM7 Wage Schedule + Bidirectional Sync (Milestone 3)

### 8.1 CRM7 wage schedule screen (`pages/people/[id]/wage-schedule.tsx`)
- Shows `apprentice_wage_schedules` for selected apprentice + host
- Rate source selector (award / EA / custom)
- If award: auto-fills from `award_rate_cache` (refresh from FWC if stale)
- If EA: select from `enterprise_agreements` list
- If custom: BOOT gate before save

### 8.2 Bidirectional sync
- CRM7 Fair Work rates → write to `award_rate_cache` → R80.3 reads fresh data
- R80.3 push → `host_charge_rates` → CRM7 shows "Synced from R80.3" badge
- Cross-check: when R80.3 rate and CRM7 rate differ by > 5%, flag for review

---

## 9. Acceptance Criteria

### Milestone 1
- [ ] `r8Calc.ts` and `calculationUtils.ts` deleted, all tests pass
- [ ] `@bsuite/nav-core` v0.2.0 published with `AppSwitcher` + `createCookieStorage`
- [ ] All 4 AppSwitcher copies replaced with nav-core import
- [ ] BSU `readCookieRaw` bug fixed via shared cookie storage
- [ ] 4 new Supabase tables created with correct RLS policies
- [ ] All existing tests pass (no regressions)

### Milestone 2
- [ ] R80.3 calc uses live Fair Work award rates (not hardcoded)
- [ ] Payroll tax resolved from state authority or Jodie (not hardcoded 4.85%)
- [ ] Workers comp: manual entry field + state minimum reference
- [ ] EA upload and FWC link both work, stored in `enterprise_agreements`
- [ ] Custom wages require BOOT pass before saving
- [ ] "Push to CRM7" writes to `host_charge_rates`
- [ ] R80.3 calc engine gated behind subscription check
- [ ] R80.3 tests pass

### Milestone 3
- [ ] CRM7 apprentice wage schedule page reads from `apprentice_wage_schedules`
- [ ] CRM7 FWC rate writes populate `award_rate_cache`
- [ ] R80.3 reads from `award_rate_cache` (bidirectional confirmed)
- [ ] Cross-check flag visible in both apps when rates differ > 5%
- [ ] All CRM7 tests pass

---

## 10. Implementation Plan Reference

See: `docs/plans/20260304-r80-crm7-integration-plan-v1.00W.md`
