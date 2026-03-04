# BSuite — Remaining Work Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Complete all 10 high-priority items identified in the 2026-03-04 session audit.

**Architecture:** CRM7 (React + Vite + wouter + Supabase), BSU (React + Vite), conduit (Next.js 16)

**Tech Stack:** pnpm 10.30.3, Node 24, Supabase Edge Functions (Deno), shadcn/ui, TypeScript strict

**Current state:** 91 test files · 2346 passing · 0 TS errors · all committed to `development`

---

## Completed This Session (do NOT redo)

- [x] RAM M2M auth client + keystoreParser + createRamClientFromEnv
- [x] ADMS adapter → RAM M2M, 2026 claim types, APIM header
- [x] USI Registry SOAP client (VerifyUSI, LocateUSI, BulkVerify) + multi-tenant OrgCode
- [x] Document lifecycle system (Phases 1–7)
- [x] wageScheduleService + fairwork award cache write-back
- [x] conduit registered as git submodule (was 156 raw files, now proper pointer)
- [x] braden .env.production fixed + gitignored
- [x] Hardcoded Supabase URL in business-suite-oauth.ts fixed
- [x] RAM credential decrypted → .env.local + Supabase secrets

---

## Item 1: Deploy TGA Search Edge Function

**Status:** NOT DONE — deploy failed because it was run from `crm7/` but the function is in `business-suite-unified/`

**Fix:**
```bash
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified
supabase functions deploy tga-search --project-ref tuybltdrdefjblnplpqo
```

**The function lives at:**
`business-suite-unified/supabase/functions/tga-search/index.ts`

**After deploy, test via CRM7 QualificationSelector** — should fetch live data from `training.gov.au/api` instead of falling back to DB cache.

**Commit:** No code change needed — just the deploy command.

---

## Item 2: #87 Task 4 — 7 State Training Authority Adapters

**Files to create** (follow `crm7/src/lib/integrations/stateAuthorities/dtwdAdapter.ts` pattern exactly):

| File | State | Authority | Portal |
|------|-------|-----------|--------|
| `nswAdapter.ts` | NSW | Training Services NSW | `training.nsw.gov.au` |
| `vicAdapter.ts` | VIC | VRQA | `vrqa.vic.gov.au` |
| `qldAdapter.ts` | QLD | DESBT | `desbt.qld.gov.au` |
| `saAdapter.ts` | SA | Skills SA / DIS | `skills.sa.gov.au` |
| `tasAdapter.ts` | TAS | Skills Tasmania | `skills.tas.gov.au` |
| `actAdapter.ts` | ACT | ACT Skills Canberra | `skills.act.gov.au` |
| `ntAdapter.ts` | NT | DCET | `dcet.nt.gov.au` |

**Each adapter implements `StateTrainingAuthorityAdapter` from `types.ts`:**
```typescript
// Each adapter needs these 5 methods:
getPortalInfo(): PortalInfo
generateTrainingContract(data: TrainingContractSubmissionData): SubmissionDocument
generateVariation(data: VariationData): SubmissionDocument
generateCompletion(data: CompletionData): SubmissionDocument
generateFundingClaim(data: FundingClaimData): SubmissionDocument
```

**Each `SubmissionDocument` returns:**
```typescript
{
  content: string,        // the document content (formatted text)
  filename: string,       // e.g. 'NSW-training-contract-2026.docx'
  format: 'docx',
  requiredActions: string[]  // manual steps checklist
}
```

**Update `src/lib/integrations/stateAuthorities/index.ts`** to wire all 7 adapters:
```typescript
import { NswAdapter } from './nswAdapter';
import { VicAdapter } from './vicAdapter';
// ... etc
// Replace 7 TODO stubs with real instances
```

**Commit:**
```bash
git add src/lib/integrations/stateAuthorities/
git commit -m "feat(crm7): close #87 Task 4 — 7 STA adapters (NSW, VIC, QLD, SA, TAS, ACT, NT)"
```

---

## Item 3: #87 Task 5 — Settings UI for Government Integrations

**File:** `crm7/src/pages/settings/govt-integrations.tsx`

Read the existing file first. Add or replace with 3 sections:

### Section A: RAM M2M Credential

```tsx
// UI elements:
// 1. File upload input for XML keystore (accept=".xml")
// 2. Password input (type="password", cleared after submit)
// 3. Environment selector: evte | production
// 4. "Upload & Decrypt" button
// 5. Status card showing: credentialId, ABN, expiry, env, badge (Active/Expiring/Expired)
// 6. "Test Connection" button → calls RamAuthClient.getToken() in a try/catch

// On upload:
// - FileReader reads XML text client-side (NEVER send raw XML to server)
// - Call decryptKeystore(xml, password) from '@/lib/integrations/ram'
//   (this runs in the browser — it uses node:crypto via dynamic import)
// - Store decrypted materials via Supabase Edge Function:
//   supabase.functions.invoke('store-ram-credential', { body: materials })
// - Clear password field immediately
// - Show success badge with expiry date
```

**Create Edge Function `crm7/supabase/functions/store-ram-credential/index.ts`:**
```typescript
// Accepts { privateKeyPkcs8B64, leafCertB64, credentialId, abn, expiresAt }
// Stores in Supabase Vault using vault.create_secret()
// Updates tenants.ram_credential_vault_id, ram_credential_expires_at, ram_environment
```

### Section B: USI Organisation Code

```tsx
// UI elements:
// 1. Text input: USI OrgCode (max 8 chars, alphanumeric)
// 2. Helper text: "Assign by applying at usi.gov.au/organisations/access-usi-system"
// 3. Helper text: "If blank, USI verification uses BRADEN PTY LTD's platform OrgCode"
// 4. Save button → UPDATE tenants SET usi_org_code = ? WHERE id = tenant_id
// 5. Status badge: Configured / Using platform default
```

### Section C: ADMS APIM Subscription Key

```tsx
// UI elements:
// 1. Text input (masked) for Azure APIM subscription key
// 2. Helper: "Obtain from portal.admsapi.australianapprenticeships.gov.au"
// 3. Save button → store in Vault, update tenants.adms_apim_key_vault_id
// 4. Status: Configured / Not configured
```

**Commit:**
```bash
git add src/pages/settings/govt-integrations.tsx supabase/functions/store-ram-credential/
git commit -m "feat(crm7): close #87 Task 5 — RAM/USI/ADMS Settings UI with Vault storage"
```

---

## Item 4: Launch-Ready Phase 2 — Empty States on All List Pages

**Audit every list page in `crm7/src/pages/` for empty state handling.**

Pages confirmed missing proper empty states (from audit):
- `competencies/index.tsx` — falls back to `mockCompetencies` array
- `workflows/index.tsx` — hardcoded `userId` TODO
- Any list page where `data.length === 0` shows nothing or a spinner forever

**Pattern to apply** (use `crm7/src/components/common/EmptyState/` canonical component):
```tsx
if (!isLoading && data.length === 0) {
  return (
    <EmptyState
      icon={<ListIcon className="h-8 w-8" />}
      title="No [entity] yet"
      description="[Entity] you create will appear here."
      action={
        <Button onClick={() => navigate('/entity/create')}>
          <Plus className="mr-2 h-4 w-4" /> Add [Entity]
        </Button>
      }
    />
  );
}
```

**Remove `mockCompetencies` fallback** from `competencies/index.tsx` — show EmptyState instead.

**Commit:**
```bash
git commit -m "feat(crm7): Launch-Ready Phase 2 — empty states on all list pages"
```

---

## Item 5: Create caseNoteStore

**File:** `crm7/src/stores/caseNoteStore.ts`

`field-officers/case-notes/create.tsx` uses `console.log` because `caseNoteStore` doesn't exist.

```typescript
// Follow createEntityStore pattern from src/stores/createEntityStore.ts
import { createEntityStore } from './createEntityStore';

export interface CaseNote {
  id: string;
  person_id: string;
  tenant_id: string;
  content: unknown[]; // Plate.js v52 JSON (TElement[])
  field_officer_id?: string;
  visit_date?: string;
  visit_type?: 'site_visit' | 'phone' | 'email' | 'other';
  created_at: string;
  updated_at: string;
}

export const useCaseNoteStore = createEntityStore<CaseNote>('case_notes', {
  defaultSort: { column: 'created_at', direction: 'desc' },
  defaultPageSize: 25,
  defaultFilters: { person_id: '', visit_type: '' },
});
```

**Migration needed:**
```sql
-- Add to next migration file
CREATE TABLE IF NOT EXISTS case_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  content jsonb NOT NULL DEFAULT '[]',
  field_officer_id uuid REFERENCES auth.users(id),
  visit_date date,
  visit_type text CHECK (visit_type IN ('site_visit', 'phone', 'email', 'other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_case_notes" ON case_notes
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));
```

**Wire into `field-officers/case-notes/create.tsx`** — replace `console.log` with `useCaseNoteStore().create()`

**Commit:**
```bash
git commit -m "feat(crm7): caseNoteStore + case_notes table + wire field officer case notes"
```

---

## Item 6: Create host_preferred_qualifications Table

**File:** New migration `crm7/supabase/migrations/20260304000007_host_preferred_qualifications.sql`

```sql
CREATE TABLE IF NOT EXISTS host_preferred_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_employer_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  qualification_code text NOT NULL,
  qualification_title text,
  preferred_year_levels integer[],  -- e.g. [1, 2] = prefer 1st and 2nd year
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE host_preferred_qualifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_hpq" ON host_preferred_qualifications
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));
CREATE INDEX idx_hpq_host ON host_preferred_qualifications(host_employer_id);
```

`hosts/[id].tsx` currently logs warnings on all qualification operations because this table doesn't exist.

**Commit:**
```bash
git commit -m "feat(crm7): add host_preferred_qualifications table (fixes host detail page warnings)"
```

---

## Item 7: Fair Work Compliance Gaps (14 Items)

From `docs/plans/20260306-fair-work-templates-compliance-audit-v1.00W.md`.

### Priority 1 — Timesheets (reg 3.34)

**File:** `crm7/src/pages/timesheets/` and relevant components

- Add start/finish time fields to timesheet entry (currently only duration)
- Add per-day time blocks (Mon–Sun) rather than single-week total
- Add host employer approval workflow (host reviews and approves timesheet)
- Add "ordinary hours vs overtime" breakdown display

**Migration:**
```sql
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS finish_time time;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS host_approved_at timestamptz;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS host_approved_by text;
```

### Priority 2 — Disciplinary (Fair Work Act requirements)

**File:** `crm7/src/pages/people/[id].tsx` (Disciplinary tab)

- Add support person field (right to representation under FWA s387)
- Add Performance Improvement Plan (PIP) section with review date
- Add "show cause" workflow for serious misconduct allegations

### Priority 3 — Termination

**File:** `crm7/src/pages/people/[id].tsx` (Employment tab)

- Add redundancy consultation record (FWA s120 requirement)
- Track consultation dates, outcomes, alternative employment considered
- Add separation certificate generation (links to Document Lifecycle)

### Priority 4 — Leave Management

**File:** `crm7/src/pages/people/[id].tsx` (Leave tab)

- Add "in advance agreement" flag for taking leave in advance
- Add cash-out workflow (reg 3.36 — requires written agreement, base rate paid)
- Add "leave not taken" alert when leave balance > 8 weeks

### Priority 5 — Probation

- Extend probation period tracking to show regulatory max (6 months standard, 12 months small business)
- Add warning when probation end date not set

**Commit per sub-item:**
```bash
git commit -m "fix(crm7): Fair Work compliance — timesheets reg 3.34 (start/finish times, host approval)"
git commit -m "fix(crm7): Fair Work compliance — disciplinary (support person, PIP, show cause)"
git commit -m "fix(crm7): Fair Work compliance — termination (redundancy consultation record)"
git commit -m "fix(crm7): Fair Work compliance — leave (in-advance, cash-out, balance alerts)"
```

---

## Item 8: #92 God File Refactor

### charge-rates/create.tsx (1931 lines)

**File:** `crm7/src/pages/charge-rates/create.tsx`

Split into:
- `charge-rates/create/RateBasicsSection.tsx` — award selection, classification, year level
- `charge-rates/create/AllowancesSection.tsx` — allowance table editing
- `charge-rates/create/BootAnalysisSection.tsx` — BOOT calculation display
- `charge-rates/create/RateSchedulePreview.tsx` — final rate schedule preview table
- `charge-rates/create/index.tsx` — orchestration only (~100 lines)

### fairwork-enhanced edge function (1234 lines)

**File:** `business-suite-unified/supabase/functions/fairwork-enhanced/index.ts`

Split into:
- `_shared/fairwork-client.ts` — HTTP client for FWC MAPD API
- `_shared/rate-limiter.ts` — sliding window rate limiting
- `_shared/cache.ts` — Supabase DB cache read/write
- `fairwork-enhanced/index.ts` — routing and request handling only (~150 lines)

Fix **Bug B1**: `handlePenaltyRates` returns hardcoded `FALLBACK_PENALTY_RATES` alongside live API data — remove the fallback, return error instead.

Fix **Security S1**: Add CORS allowlist — replace `'*'` with specific allowed origins.
Fix **Security S2**: Add rate limiting — max 20 requests/minute per IP.

**Commit:**
```bash
git commit -m "refactor(crm7): #92 break up charge-rates/create.tsx god file (1931L → 5 components)"
git commit -m "refactor(bsu): #92 break up fairwork-enhanced edge function + fix CORS + rate limiting"
```

---

## Item 9: #93 Test Coverage for Critical Paths

### fairworkApi.ts

**File:** `crm7/src/services/__tests__/fairworkEnhancedService.test.ts`

Test:
- Live API response → cache write-back
- Cache hit (< 30 days old) → return cached, no API call
- Cache miss → API call → write to cache
- API error → fallback to cache → if cache empty, throw

### stripeService.ts

**File:** `crm7/src/lib/__tests__/stripeService.test.ts`

Test:
- `createSubscription()` — mock Stripe API, verify correct plan selected
- `cancelSubscription()` — verify cancel at period end (not immediate)
- `getSubscriptionStatus()` — map Stripe status → BSuite status

### Supabase auth

**File:** `crm7/src/lib/__tests__/supabase-auth.test.ts`

Test:
- `getClaims()` validation (via supabase-auth-comprehensive skill patterns)
- JWT expiry handling
- Tenant isolation via RLS (integration test)

### conduit smoke tests

**File:** `conduit/src/test/smoke.test.ts` already exists — verify it runs and add:
- Auth middleware redirect test
- Database connection test
- API route 200 response test

**Commit:**
```bash
git commit -m "test(crm7): #93 add critical path test coverage (fairworkApi, stripeService, auth)"
git commit -m "test(conduit): #93 expand smoke tests (auth redirect, DB, API routes)"
```

---

## Item 10: R80.3 Milestones 2–3 (Commit Existing Work)

### What's written but NOT committed in R80.3

These files exist on disk but aren't committed:
- `R80.3/src/services/crm7SyncService.ts` — bidirectional sync R80.3 ↔ CRM7
- `R80.3/src/services/payrollTaxService.ts` — state-based payroll tax rate lookups
- `R80.3/src/tests/payrollTaxService.test.ts`
- `R80.3/src/utils/calcBridge.ts` (modified)
- `R80.3/src/tests/calcBridge.test.ts` (modified)

### What's written but NOT committed in CRM7

- `crm7/src/lib/wageScheduleService.ts` ← **ALREADY COMMITTED** (358fcd4)
- `crm7/src/services/fairworkEnhancedService.ts` ← **ALREADY COMMITTED** (358fcd4)

### R80.3 commit steps

```bash
cd /home/braden/Desktop/Dev/bsuite/R80.3

# Verify tests pass first
pnpm vitest run

# Commit
git add src/services/crm7SyncService.ts src/services/payrollTaxService.ts
git add src/tests/payrollTaxService.test.ts src/utils/calcBridge.ts src/tests/calcBridge.test.ts
git commit -m "feat(R80.3): Milestone 2+3 — crm7SyncService, payrollTaxService, calcBridge wiring (#91)"
```

Then update monorepo:
```bash
cd /home/braden/Desktop/Dev/bsuite
git add R80.3
git commit -m "chore: update R80.3 submodule — Milestones 2+3 (#91)"
```

---

## Blocked / Needs External Action

| Item | Blocked on |
|------|-----------|
| USI Registry live verification | BRADEN needs to register at `usi.gov.au/organisations/access-usi-system` → get OrgCode → set `USI_ORG_CODE` env var |
| ADMS live API calls | Need ADMS APIM subscription key from `portal.admsapi.australianapprenticeships.gov.au` |
| Adobe Sign live signing | Need to register webhook at Adobe Sign developer portal: `https://<project>.supabase.co/functions/v1/adobe-sign-webhook` |
| document_templates Google Doc IDs | Each template needs a Google Doc created, then the Doc ID registered in `document_templates.google_doc_id` |

---

## Quick Reference — Key File Paths

```
crm7/src/lib/integrations/
  ram/                           # RamAuthClient, keystoreParser, createRamClientFromEnv
  usi/usiRegistryClient.ts       # USI SOAP client (VerifyUSI, LocateUSI, BulkVerify)
  usi/usiService.ts              # Two-path verify (registry → format-only)
  stateAuthorities/              # DTWD (live) + 7 TODO stubs → implement here
  aass/                          # AASS lifecycle tracking

crm7/src/lib/funding/
  admsAdapter.ts                 # ADMS HTTP adapter (RAM M2M auth, 2026 claim types)
  claimSubmissionService.ts      # Orchestrates claim preparation + submission

crm7/src/services/
  googleDocsService.ts           # buildReplaceRequests, mergeGoogleDocTemplate
  mergeVariableResolver.ts       # Entity-aware merge var resolution
  adobeSignService.ts            # Adobe Sign REST v6 (buildParticipantSets, agreements)

crm7/supabase/functions/
  generate-document/             # Google Docs merge → Supabase Storage
  adobe-sign-webhook/            # Handles AGREEMENT_ACTION_COMPLETED

crm7/supabase/migrations/
  20260304000001_document_lifecycle.sql     # document_templates, document_records, signatories
  20260304000002_document_storage.sql       # Storage bucket + RLS
  20260304000003_people_case_notes.sql      # people.case_notes jsonb column
  20260304000004_document_storage_policies.sql  # DELETE + UPDATE policies + UNIQUE constraint
  20260304000005_ram_credentials.sql        # tenants RAM + ADMS Vault columns
  20260304000006_usi_org_code.sql           # tenants.usi_org_code

business-suite-unified/supabase/functions/
  tga-search/                    # TGA REST API proxy — deploy from BSU dir!
  fairwork-enhanced/             # FWC MAPD API proxy

docs/
  20260304-ram-credential-government-access-map-v1.00W.md  # 60+ services access map
```

---

## TGA Deploy Fix (Item 1 detail)

```bash
# MUST run from BSU directory, not CRM7
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified
supabase functions deploy tga-search --project-ref tuybltdrdefjblnplpqo

# Verify
curl -X POST https://tuybltdrdefjblnplpqo.supabase.co/functions/v1/tga-search \
  -H "Authorization: Bearer <anon_key>" \
  -H "Content-Type: application/json" \
  -d '{"action":"status"}'
# Expected: {"status":"ok","source":"tga-api"}
```
