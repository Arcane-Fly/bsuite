# CRM7 Apprentice & TGA Integration Plan

**Date:** 2026-03-05
**Status:** Working (v1.00W)
**Author:** Windsurf Cascade
**Scope:** CRM7 — Host Employer unification, TGA API integration, Apprentice workflow

---

## 1. Current State Audit

### 1.1 What Already Exists in CRM7 (Surprisingly Complete)

| Component | Location | State | Notes |
|-----------|----------|-------|-------|
| **TGA Client Service** | `src/services/tgaService.ts` | ✅ Complete | Calls `tga-search` Supabase Edge Function. Has search, detail, import, sync, status. |
| **Qualification Search UI** | `src/components/vet/qualification-search.tsx` | ✅ Complete | Uses tgaService, shows results with import buttons. |
| **VET Qualifications List** | `src/pages/vet/qualifications/index.tsx` | ✅ Complete | Table with search/filter, links to import page. |
| **VET Import Page** | `src/pages/vet/qualifications/import.tsx` | ✅ Complete | Uses QualificationSearch, Sheet confirmation, mutation to import. |
| **VET Qualification Detail** | `src/pages/vet/qualifications/[id].tsx` + `[id]/index.tsx` | ✅ Exists | Detail view. |
| **VET Qualification Edit** | `src/pages/vet/qualifications/[id]/edit.tsx` | ✅ Exists | Edit form. |
| **VET Qualification Structure** | `src/pages/vet/qualifications/[id]/structure.tsx` | ✅ Exists | Manage units within a qualification. |
| **VET Units** | `src/pages/vet/units/` | ✅ Exists | List, detail, edit, create. |
| **VET Training Packages** | `src/pages/vet/training-packages/` | ✅ Exists | List, detail, edit. |
| **VET Assessments** | `src/pages/vet/assessments/index.tsx` | ✅ Exists | Assessment management. |
| **Host Employers List** | `src/pages/hosts/index.tsx` | ✅ Production-quality | Stats, search, filter, sort, pagination, actions. Uses `useHostEmployerStore`. |
| **Host Employer CRUD** | `src/pages/hosts/create.tsx`, `[id].tsx`, `[id]/edit.tsx` | ✅ Exists | Full CRUD. |
| **Host Agreements** | `src/pages/hosts/agreements/` | ✅ Exists | List, detail, create. |
| **Host Vacancies** | `src/pages/hosts/vacancies/` | ✅ Exists | List, detail, create. |
| **Host Monitoring** | `src/pages/hosts/monitoring.tsx` | ✅ Exists | Monitoring page. |
| **Host Capacity Assessment** | `src/pages/hosts/capacity-assessment.tsx` | ✅ Exists | Assessment page. |
| **Clients Page** | `src/pages/clients/index.tsx` | ⚠️ Simplistic | Basic CRUD, no host employer link. |
| **People/New** | `src/pages/people/new.tsx` | ⚠️ Partial | Has QualificationSelector + EmployerSelector but queries local (empty) table. |
| **QualificationSelector** | `src/components/entity/selectors/QualificationSelector.tsx` | ⚠️ Broken | Queries empty `qualifications` Supabase table. |
| **Zod Schemas** | `src/schemas/qualifications.ts` | ✅ Complete | Full Qualification + Competency schemas. |
| **Entity Types** | `src/types/entities.ts` | ✅ Complete | Apprentice, HostEmployer, Client, Qualification, Placement, etc. |
| **Host Employer Store** | `src/stores/hostEmployerStore.ts` | ✅ Complete | Generic entity store for `employers` table. |
| **Client Store** | `src/stores/clientStore.ts` | ✅ Complete | Generic entity store for `clients` table. |

### 1.2 Critical Missing Piece

**The `tga-search` Supabase Edge Function does not exist.** Only `charge-calc` exists in `supabase/functions/`. The entire TGA pipeline (service → UI → import) is wired but has no backend.

### 1.3 Data Model Gap

- `Client` entity (`clients` table): `name`, `contact_person`, `email`, `phone`, `address_line1`, `industry`, `status`
- `HostEmployer` entity (`employers` table): `business_name`, `trading_name`, `abn`, `acn`, `industry`, `contact_name`, `contact_email`, `contact_phone`, `address_line1`, `suburb`, `state`, `postcode`, `website`, `notes`, `status`, `safetyRating`, `complianceStatus`

**Problem:** These are two separate tables representing overlapping entities. A Client IS a Host Employer in the GTO context. The Host Employer model is far richer.

---

## 2. Donor Repo Audit — Salvageable Code

### 2.1 ApprenticeTracker (Primary Source)

| Component | File | Salvageable? | Notes |
|-----------|------|-------------|-------|
| **TGA Service** | `server/services/tga-service.ts` | ✅ HIGH | Full SOAP client for TGA API. Parses XML responses, handles search/detail/import. 600+ lines. |
| **Qualification Schema** | `shared/schema.ts` | ⚠️ REFERENCE | Drizzle ORM schema. Use as reference for Supabase table design. |
| **Client Schema** | `shared/schema/clients.ts` | ⚠️ REFERENCE | Full client model with hostEmployerId FK, services, interactions, contacts. |
| **WHS Schema** | `shared/schema/whs.ts` | ⚠️ REFERENCE | Incidents, risk assessments, inspections, policies — all linked to host_employer_id. |
| **Host Employer Schema** | `shared/schema.ts` lines ~160-210 | ⚠️ REFERENCE | Enhanced AU addressing, safety rating, compliance, org relationship. |
| **Apprentice Schema** | `shared/schema.ts` lines ~130-160 | ⚠️ REFERENCE | AQF level, apprenticeship year, GTO enrolled flag, GTO ID. |

### 2.2 CRM13 (Secondary Source)

| Component | File | Salvageable? | Notes |
|-----------|------|-------------|-------|
| **Host Employers List** | `src/pages/employers/HostEmployersList.tsx` | ⚠️ REFERENCE | Card-based layout with capacity bars, visit tracking. Good UX patterns. |
| **Apprentice Components** | `src/components/apprentice/` | ⚠️ REFERENCE | UnitsOfCompetency, QualificationProgress, UnitDetails, StatusBadge, CSV export. |
| **Training Pages** | `src/pages/training/` | ⚠️ REFERENCE | QualificationsPage (hardcoded), CompetencyUnitsPage, Assessments, Certifications, Reviews. |
| **GTO Types** | `src/types/gto.ts` | ✅ USEFUL | TypeScript interfaces for GTO domain. |
| **Host Form** | `src/components/hosts/HostForm.tsx` | ⚠️ REFERENCE | Form component for host employer CRUD. |

### 2.3 CRM8/CRM8U (Low Value)

Mostly scaffolding — training-management module exists but is empty shells. Not worth porting.

---

## 3. Architecture Plan

### 3.1 Phase 1: TGA Edge Function (CRITICAL PATH)

**Goal:** Create the `tga-search` Supabase Edge Function that the existing `tgaService.ts` client already calls.

**Approach:** Port the ApprenticeTracker `tga-service.ts` SOAP client to a Deno Edge Function.

**Actions:**
1. Create `supabase/functions/tga-search/index.ts`
2. Implement TGA SOAP API calls (Training.gov.au sandbox → production)
3. Support all actions the client expects: `search`, `qualification`, `import`, `sync`, `status`
4. On `import`: upsert qualification + units into Supabase `qualifications` and `units_of_competency` tables
5. Add rate limiting and caching (TGA API is slow)
6. Environment variables: `TGA_USERNAME`, `TGA_PASSWORD`, `TGA_ENDPOINT_URL`

**TGA API Details:**
- Sandbox: `https://ws.sandbox.training.gov.au/Deewr.Tga.WebServices/TrainingComponentService.svc`
- Auth: Basic HTTP auth (username/password from env)
- Protocol: SOAP/XML
- Key operations: `Search`, `GetDetails` (with `ShowUnitGrid=true` for units)

### 3.2 Phase 2: Client ↔ Host Employer Unification

**Goal:** Merge the concept so Clients ARE Host Employers.

**Approach:** Add `host_employer_id` FK to `clients` table. Existing `employers` table remains the richer entity; `clients` becomes a thin wrapper that links to an employer plus CRM-specific fields (pipeline stage, account value, etc.).

**Migration:**
```sql
ALTER TABLE clients ADD COLUMN host_employer_id UUID REFERENCES employers(id);
ALTER TABLE clients ADD COLUMN account_type TEXT DEFAULT 'host_employer';
```

**UI Changes:**
- Client detail page shows host employer card if linked
- Creating a client can optionally create/link a host employer
- Host employer detail page shows linked client if exists

### 3.3 Phase 3: QualificationSelector Fix

**Goal:** Make the QualificationSelector work with real data.

**Current problem:** `QualificationSelector` queries `qualifications` Supabase table directly, which is empty.

**Fix options:**
- **Option A (recommended):** After Phase 1, the import flow populates the `qualifications` table. QualificationSelector then works as-is.
- **Option B:** Add a TGA live-search fallback to QualificationSelector (search TGA API when local table returns no results).

**Recommended:** Option A + B hybrid. QualificationSelector searches local first, shows "Search Training.gov.au" button if no results.

### 3.4 Phase 4: Apprentice Creation Flow

**Goal:** Streamlined "Add Apprentice" flow with qualification and host employer linking.

**Current state:** `src/pages/people/new.tsx` has the form but it's a generic "Add Person" with employment type selector. Apprentices need a more guided workflow.

**Proposed flow:**
1. Select employment type → Apprentice
2. Personal details (name, DOB, email, phone, USI)
3. Select qualification (QualificationSelector with TGA fallback)
4. Select host employer (EmployerSelector from `employers` table)
5. Training details (start date, training provider, training contract number)
6. Review & submit

This matches the existing form structure in `people/new.tsx` but needs the qualification data pipeline to be working (Phase 1).

---

## 4. Implementation Order

| Phase | Task | Depends On | Est. Effort |
|-------|------|------------|-------------|
| **1a** | Create `tga-search` Edge Function | — | 2-3h |
| **1b** | Deploy Edge Function to Supabase | 1a | 30m |
| **1c** | Test TGA search → import pipeline end-to-end | 1b | 1h |
| **2a** | Add `host_employer_id` to `clients` table (migration) | — | 30m |
| **2b** | Update Client entity type + store | 2a | 30m |
| **2c** | Update Client UI to show/link host employer | 2b | 1-2h |
| **3** | Enhance QualificationSelector with TGA fallback | 1c | 1h |
| **4** | Polish apprentice creation flow | 1c, 3 | 1-2h |

**Total estimated: ~8-10 hours of implementation**

---

## 5. Supabase Table Requirements

### Existing Tables (need verification)
- `qualifications` — Should exist for local qualification storage
- `units_of_competency` — Should exist for imported units
- `employers` — Host employer table (confirmed via store)
- `clients` — Client table (confirmed via store)
- `people` — Person records including apprentices

### Tables to Verify/Create
- `qualification_structure` — Links qualifications to units (core/elective)
- `training_packages` — Training package metadata

---

## 6. Environment Variables Needed

```env
# TGA API (for Edge Function)
TGA_ENDPOINT_URL=https://ws.sandbox.training.gov.au/Deewr.Tga.WebServices/TrainingComponentService.svc
TGA_USERNAME=WebService.Read
TGA_PASSWORD=Asdf098
```

These go in Supabase Edge Function secrets, NOT in `.env.local`.

---

## 7. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| TGA SOAP API is slow/unreliable | High | Cache responses in Supabase, implement retry logic |
| TGA sandbox credentials expire | Medium | Document production credential request process |
| `qualifications` table doesn't exist yet | High | Check and create via migration if needed |
| Client/Host Employer merge breaks existing data | Medium | Additive migration only (add FK, don't delete columns) |
