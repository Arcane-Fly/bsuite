# UX & One-Shot Deep Dive: Eliminate Double-Entry Across CRM7

Comprehensive audit of every CRM7 form, selector, DB link, and data layer to enforce the "enter once, use everywhere" principle from `DRY-ONE-SHOT-ARCHITECTURE.md` — from UI to DB connections.

---

## User Profile

**Primary users**: GTO (Group Training Organisation) administrators, coordinators, and compliance officers managing apprentices, host employers, placements, funding claims, and training contracts in the Australian VET sector. These users handle 50-500+ apprentices, often entering the same entity data (contacts, employers, qualifications) across multiple workflows. Every keystroke saved matters.

---

## Executive Summary: 5 Systemic Issues Found

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | **Dual data layer** — DataContextSimple (in-memory seed data) vs Zustand stores (Supabase) | CRITICAL | ApprenticeForm, create.tsx, clients use fake data, not Supabase |
| 2 | **Zero EntitySelector components exist** — architecture doc prescribes 6, none built | CRITICAL | Every FK field uses a basic `<Select>` with no search or auto-populate |
| 3 | **9 forms have free-text fields for data that exists in tables** | HIGH | Contact details re-entered on every host, client, contract, funding source |
| 4 | **Missing auto-population chains** — selecting an entity doesn't fill related fields | HIGH | User manually re-types qualification, employer, dates already in the DB |
| 5 | **DynamicFieldRenderer & EntityLinker used on only 3 of 12+ entity pages** | MEDIUM | Custom fields and cross-entity linking mostly inert |

---

## Phase 1: Foundation — Searchable EntitySelector Component (CRITICAL)

**Why first**: Every subsequent fix depends on having a reusable, searchable entity picker.

### 1A. Build generic `EntitySelector<T>` component

**File**: `crm7/src/components/entity/EntitySelector.tsx`

A cmdk-powered (Command component already exists in `ui/command.tsx`) searchable combobox that:
- Accepts `table`, `displayField`, `searchColumns`, `selectColumns`, `onSelect`, `value`
- Debounced typeahead search against Supabase (min 2 chars)
- Shows secondary info (e.g., ABN for employers, qualification for apprentices)
- Returns the full row object on select (enables auto-populate)
- Supports "quick-add" button for inline entity creation
- Falls back to full list for <50 items, search for >50

**Props interface**:
```typescript
interface EntitySelectorProps<T> {
  table: string;
  value?: string;                          // current entity ID
  onSelect: (entity: T | null) => void;    // returns full row
  displayField: (row: T) => string;
  secondaryField?: (row: T) => string;
  searchColumns: string[];
  selectColumns?: string;                  // Supabase select with JOINs
  placeholder?: string;
  disabled?: boolean;
  onQuickAdd?: () => void;                 // show inline create form
  filterFn?: (query: any) => any;          // additional Supabase filters
}
```

**Builds on**: Existing `CrossEntitySearch.tsx` (navigation search) and `ui/command.tsx` (cmdk). This is the form-input counterpart.

### 1B. Build typed wrapper selectors

Each wraps EntitySelector with entity-specific defaults:

| Component | Table | Display | Secondary | JOINs |
|-----------|-------|---------|-----------|-------|
| `ApprenticeSelector` | apprentices | `{first_name} {last_name}` | qualification code + employer | `contacts(first_name,last_name,email), qualifications(code,title), employers!current_host_employer_id(business_name)` |
| `EmployerSelector` | employers | `{business_name}` | ABN + industry | — |
| `ContactSelector` | contacts | `{first_name} {last_name}` | email + phone | — |
| `ClientSelector` | clients | `{name}` | industry + status | `contacts!primary_contact_id(first_name,last_name,email)` |
| `QualificationSelector` | qualifications | `{code} — {title}` | level + status | — |
| `FundingSourceSelector` | funding_sources | `{name}` | provider + remaining budget | — |
| `PlacementSelector` | placements | Apprentice @ Employer | dates + status | `apprentices(first_name,last_name), employers(business_name)` |

**File**: `crm7/src/components/entity/selectors/` (one file per selector)

---

## Phase 2: Retire DataContextSimple — Unify on Zustand Stores

**Problem**: `ApprenticeForm.tsx`, `EnhancedApprenticeForm.tsx`, and `apprentices/create.tsx` all use `DataContextSimple` which holds **in-memory seed data** (fake employers, fake apprentices). The real data lives in Supabase via Zustand stores.

### 2A. Rewire ApprenticeForm to use Zustand stores

- Replace `useData()` with `useApprenticeStore()`, `useHostEmployerStore()`, `useQualificationStore()`
- Replace `populateApprenticeFromEmployer()` (seed-data only) with real Supabase JOINs
- Replace free-text `qualification` input with `QualificationSelector`
- Replace basic employer `<Select>` with `EmployerSelector`
- On employer select → auto-populate address, industry, site options from the full employer row
- On qualification select → auto-populate code, level, duration, funding eligibility

### 2B. Retire DataContextSimple and EnhancedDataContext

- `DataContextSimple.tsx` — 154 lines of in-memory fake data. Delete after 2A.
- `DataContextSupabase.tsx` — appears to be an unused Supabase variant. Audit and delete if unused.
- Remove `DataContextSimple` from `App.tsx` provider tree
- Grep for remaining `useData()` calls and rewire each

### 2C. Remove demo/hardcoded data from list pages

| Page | Current State | Fix |
|------|--------------|-----|
| `hosts/index.tsx` | 10 hardcoded `demoHostEmployers`, Supabase query with demo fallback | Use `useHostEmployerStore()` only, show empty state when no data |
| `clients/index.tsx` | Inline `ClientFormData` with free-text fields, `useData()` | Use `useClientStore()`, replace form with proper selectors |
| `placements/index.tsx` | Own camelCase `Placement` interface, demo fallback | Use `usePlacementStore()` with its existing JOINs |

---

## Phase 3: Eliminate Free-Text Contact Fields (9 Forms)

**The rule**: If a person's name/email/phone exists in the `contacts` table, use `ContactSelector`, never free text.

### DB Schema Changes Needed

```sql
-- Add contact FK to employers (currently has free-text contact_name/email/phone)
ALTER TABLE employers ADD COLUMN primary_contact_id UUID REFERENCES contacts(id);

-- Add contact FK to funding_sources (currently has free-text contact_name/email/phone)  
ALTER TABLE funding_sources ADD COLUMN contact_id UUID REFERENCES contacts(id);

-- Add signatory contact FK to host_agreements/contracts
-- (contracts table may be stored as host_agreements — verify)
```

### Form Rewiring

| Page | Current Free-Text Fields | Replace With |
|------|------------------------|-------------|
| `hosts/create.tsx` | `contactPerson`, `email`, `confirmEmail`, `phone` | `ContactSelector` → sets `primary_contact_id` |
| `clients/index.tsx` | `contactPerson`, `email`, `phone` | `ContactSelector` → sets `primary_contact_id` (FK already exists) |
| `contracts/new.tsx` | `signatory_name`, `signatory_email`, `signatory_phone` | `ContactSelector` filtered to selected employer's contacts |
| `funding-sources/new.tsx` | `contact_name`, `contact_email`, `contact_phone` | `ContactSelector` → sets `contact_id` |
| `compliance/create.tsx` | `relatedId` (manual numeric input!) | `EntitySelector` that switches table based on `relatedTo` type |

**Quick-add pattern**: Each ContactSelector should have a "+" button that opens an inline mini-form to create a new contact on the spot (like `QuickEmployerForm` already does for employers).

---

## Phase 4: Auto-Population Chains

When the user selects an entity, fill every field that can be derived from that selection.

### 4A. Claims New Page (`claims/new.tsx`)

**On apprentice select** → auto-fill:
- `qualification_code`, `qualification_name` (from `apprentices.qualification_id` JOIN)
- `employer_id` (from `apprentices.current_host_employer_id` → employers)
- `apprenticeship_start` (from `apprentices.start_date`)
- `employment_type` (from placement record if active)
- `hours_per_week` (from placement record)
- `is_first_year` (calculated from start_date)
- `location_classification` (from employer address)

**On funding source select** → auto-fill:
- `government_level` (from source record)
- `external_system` (from source record)
- `claim_type` (suggest based on source's typical claim types)

### 4B. Contract New Page (`contracts/new.tsx`)

**On host employer select** → auto-fill:
- Signatory from employer's primary contact (ContactSelector pre-filtered)
- Default contract terms template
- Employer address for contract address fields

### 4C. Apprentice Create (`apprentices/create.tsx`)

**On employer select** → auto-fill (via Supabase JOINs, not seed data):
- Work address from employer record
- Industry from employer
- Available qualifications filtered by employer's industry
- Supervisor options from employer's supervisors

**On qualification select** → auto-fill:
- Duration (months) → calculate expected end date
- Funding eligibility flag
- National code

### 4D. Placement Create (NEW — currently no create form exists)

A placement create form should be added at `placements/create.tsx`:
- `ApprenticeSelector` → auto-fill qualification, current status
- `EmployerSelector` → auto-fill site options, supervisor options
- `ContactSelector` (filtered to employer) → for supervisor
- Date auto-calculation from apprentice's training plan

---

## Phase 5: Extend DynamicFieldRenderer & EntityLinker Coverage

### Current coverage (3 pages):
- `claims/[id].tsx` ✅
- `claims/new.tsx` ✅  
- `funding-sources/[id].tsx` ✅

### Missing from (needs adding):

| Page | Entity Type | DynamicFieldRenderer | EntityLinker |
|------|------------|---------------------|-------------|
| `apprentices/[id].tsx` | apprentice | Add to detail page | Add to detail page |
| `hosts/[id].tsx` | employer | Add to detail page | Add to detail page |
| `clients/index.tsx` (detail view) | client | Add when detail page exists | Add |
| `contacts/index.tsx` (detail view) | contact | Add when detail page exists | Add |
| `placements/index.tsx` (detail view) | placement | Add when detail page exists | Add |
| `contracts/[id].tsx` | contract/host_agreement | Add | Add |
| `compliance/create.tsx` | compliance | Add | Add (link to related entity) |
| `funding-sources/new.tsx` | funding_source | Add to create form | — |

### Also: extend `tenant_field_definitions` entity_type constraint

Current DB constraint allows: `contact/lead/client/apprentice/employer/placement/project/task`

**Add**: `funding_claim`, `funding_source`, `compliance_record`, `host_agreement`

```sql
ALTER TABLE tenant_field_definitions 
DROP CONSTRAINT IF EXISTS tenant_field_definitions_entity_type_check;

ALTER TABLE tenant_field_definitions 
ADD CONSTRAINT tenant_field_definitions_entity_type_check 
CHECK (entity_type IN (
  'contact','lead','client','apprentice','employer','placement',
  'project','task','funding_claim','funding_source',
  'compliance_record','host_agreement'
));
```

---

## Phase 6: List Page Consistency & Search

### 6A. Replace basic `<Select>` filters with `EntitySelector` on list pages

| List Page | Current Filter | Upgrade To |
|-----------|---------------|-----------|
| `claims/list.tsx` | Basic status Select | Keep status, add ApprenticeSelector + EmployerSelector filters |
| `placements/index.tsx` | Basic filters | Add ApprenticeSelector + EmployerSelector filters |
| `compliance/index.tsx` | Basic type filter | Add entity type filter + EntitySelector for related entity |

### 6B. Ensure all list pages use Zustand stores (not local state)

Audit each list page's data source:
- `hosts/index.tsx` → migrate to `useHostEmployerStore()`
- `clients/index.tsx` → migrate to `useClientStore()`  
- `placements/index.tsx` → migrate to `usePlacementStore()`
- `contacts/index.tsx` → verify uses `useContactStore()`

---

## Phase 7: Cross-Entity Navigation & Context Preservation

### 7A. "View in context" links

When viewing an entity, every related entity should be a clickable link:
- Apprentice detail → click employer name → goes to employer detail
- Claim detail → click apprentice name → goes to apprentice detail
- Placement detail → click supervisor → goes to contact detail
- Contract detail → click employer → goes to employer detail

### 7B. "Create related" shortcuts

From an entity detail page, offer quick-create buttons:
- From employer detail → "New Placement" (pre-selects this employer)
- From apprentice detail → "New Claim" (pre-selects this apprentice)
- From apprentice detail → "New Placement" (pre-selects this apprentice)
- From funding source detail → "New Claim" (pre-selects this source)

Use URL query params: `/claims/new?apprentice_id=xxx&employer_id=yyy`

---

## Implementation Priority (Recommended Order)

| Order | Phase | Effort | Impact | Dependency |
|-------|-------|--------|--------|-----------|
| 1 | **1A**: Generic EntitySelector | 1 day | Unblocks everything | cmdk already installed |
| 2 | **1B**: Typed wrapper selectors (6) | 0.5 day | Unblocks form fixes | Phase 1A |
| 3 | **2A**: Rewire ApprenticeForm to Zustand | 0.5 day | Fixes fake data | Phase 1B |
| 4 | **3**: Free-text → ContactSelector (5 forms) | 1 day | Eliminates worst double-entry | Phase 1B |
| 5 | **4A-C**: Auto-population chains | 1 day | Biggest UX win | Phase 1B + 3 |
| 6 | **2B-C**: Retire DataContextSimple + demo data | 0.5 day | Code cleanup | Phase 2A |
| 7 | **5**: DynamicFieldRenderer + EntityLinker coverage | 0.5 day | Custom fields everywhere | Independent |
| 8 | **6**: List page consistency | 0.5 day | Filters use selectors | Phase 1B |
| 9 | **7**: Cross-entity nav + create-related | 0.5 day | UX polish | Phase 1B |
| 10 | **4D**: Placement create form (new page) | 0.5 day | Fills functional gap | Phase 1B |

**Total estimated effort: ~6.5 days**

---

## DB Schema Summary: What Exists vs What's Missing

### FKs That Already Exist ✅
- `apprentices.contact_id → contacts.id`
- `apprentices.qualification_id → qualifications.id`
- `apprentices.current_host_employer_id → clients.id`
- `clients.primary_contact_id → contacts.id`
- `placements.apprentice_id → apprentices.id`
- `placements.employer_id → employers.id`
- `placements.client_id → clients.id`
- `funding_claims.apprentice_id → apprentices.id`
- `funding_claims.employer_id → employers.id`
- `funding_claims.funding_source_id → funding_sources.id`

### FKs That Need Adding
- `employers.primary_contact_id → contacts.id` (NEW)
- `funding_sources.contact_id → contacts.id` (NEW)
- `host_agreements.signatory_contact_id → contacts.id` (NEW, if table exists)

### Constraint Updates
- `tenant_field_definitions.entity_type` — add `funding_claim`, `funding_source`, `compliance_record`, `host_agreement`

---

## Files Changed Summary

### New Files (~8)
- `components/entity/EntitySelector.tsx` — generic searchable combobox
- `components/entity/selectors/ApprenticeSelector.tsx`
- `components/entity/selectors/EmployerSelector.tsx`
- `components/entity/selectors/ContactSelector.tsx`
- `components/entity/selectors/ClientSelector.tsx`
- `components/entity/selectors/QualificationSelector.tsx`
- `components/entity/selectors/FundingSourceSelector.tsx`
- `pages/placements/create.tsx` — new placement create form

### Modified Files (~15)
- `pages/apprentices/create.tsx` — Zustand stores + selectors
- `components/forms/ApprenticeForm.tsx` — Zustand + QualificationSelector + EmployerSelector
- `pages/hosts/create.tsx` — ContactSelector
- `pages/hosts/index.tsx` — useHostEmployerStore, remove demo data
- `pages/clients/index.tsx` — useClientStore + ContactSelector
- `pages/contracts/new.tsx` — ContactSelector for signatory
- `pages/compliance/create.tsx` — EntitySelector for related entity
- `pages/funding-sources/new.tsx` — ContactSelector
- `pages/claims/new.tsx` — ApprenticeSelector + auto-populate
- `pages/claims/[id].tsx` — EntityLinker
- `pages/placements/index.tsx` — usePlacementStore
- `pages/apprentices/[id].tsx` — DynamicFieldRenderer + EntityLinker
- `App.tsx` — remove DataContextSimple provider
- 1 DB migration (add contact FKs + entity_type constraint update)

### Deleted Files (~2-3)
- `contexts/DataContextSimple.tsx` (after rewiring)
- `contexts/DataContextSupabase.tsx` (if unused)
- `components/forms/EnhancedApprenticeForm.tsx` (merge into ApprenticeForm)
