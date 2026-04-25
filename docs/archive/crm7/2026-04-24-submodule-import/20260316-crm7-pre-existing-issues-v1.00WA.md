> **ARCHIVED** — Historical reference, not actively maintained. Archived 2026-03-16 as part of documentation compliance remediation.

---

# CRM7 Pre-Existing Issues Audit

**Date:** 2026-02-25
**Audited by:** CASCADE (Phase 1 porting work)
**Context:** Discovered during Phase 1 porting of workforce-hub features into CRM7. These issues existed before porting began and must be addressed before the unified upgrade is complete.

---

## Summary

| Repo | TS Errors | Build Status |
|------|-----------|-------------|
| **CRM7** | **670** | ✅ Builds (Vite ignores TS errors) |
| **R80.3** | 0 | ✅ Clean |
| **BSU** | 0 | ✅ Clean |

CRM7 builds successfully because Vite doesn't enforce `tsc --noEmit` at build time. These errors will surface if strict CI is enabled.

---

## 🔴 Critical — Missing NPM Dependencies (6 packages)

These are imported in code but **not installed** in `package.json`:

| Package | Used By | Impact |
|---------|---------|--------|
| `axios` | `components/fair-work/AwardAnalysisPanel.tsx` | Runtime crash if component loads |
| `cmdk` | `components/ui/command.tsx` | Shadcn command palette broken |
| `embla-carousel-react` | `components/ui/carousel.tsx` | Shadcn carousel broken |
| `input-otp` | `components/ui/input-otp.tsx` | OTP input broken |
| `react-resizable-panels` | `components/ui/resizable.tsx` | Resizable panels broken |
| `vaul` | `components/ui/drawer.tsx` | Shadcn drawer broken |

**Fix:** `pnpm add axios cmdk embla-carousel-react input-otp react-resizable-panels vaul`

---

## 🔴 Critical — Missing Modules / Dead Imports (internal)

These reference files/modules that don't exist in the repo:

| Missing Module | Referenced By | Count |
|---------------|--------------|-------|
| `../../contexts/EnhancedDataContext` | OneShotEntryDemo, EnhancedApprenticeForm, EnhancedEmployerForm, EntityValidationDashboard | 6 refs |
| `../../lib/entity-validator` | EntityConflictDialog, entity-validation/index.ts | 3 refs |
| `../hooks/usePerformanceSafety` | PerformanceTestComponent | 1 ref |
| `@/types/dashboard` | features/dashboard/index.ts | 1 ref |
| `@/lib/permissions` | pages/settings/permissions-demo.tsx | 1 ref |
| `@/lib/date-utils` | pages/field-officers.tsx | 1 ref |
| `@/components/dashboard/*` (stats-cards, quick-actions, placement-trends, alerts-section) | features/dashboard/index.ts | 4 refs |
| Feature barrel `./utils`, `./types`, `./components`, `./services`, `./hooks`, `./domain` | features/settings, reports, financial, dashboard | ~14 refs |

**Impact:** Any lazy-loaded route that hits these will crash at runtime.

---

## 🟠 High — Error Hotspots by Area (670 total TS errors)

| Area | Error Count | Root Cause |
|------|------------|------------|
| `pages/settings/` (config, integrations, user-mgmt, permissions) | **158** | Type mismatches with API response shapes, missing utility types |
| `pages/vet/` (units, qualifications, training-packages) | **120** | Interface mismatches — components expect different shapes than entity types provide |
| `components/whs/` (training, incidents, inspections, risk) | **77** | `PageHeaderProps` missing `title`/`description`, form type mismatches |
| `pages/hosts/` (vacancies, agreements, detail) | **41** | Property mismatches (`startDate`, `endDate`, `isActive` don't exist on entity types) |
| `pages/labour-hire/workers` | **39** | Worker entity shape doesn't match component expectations |
| `pages/apprentices/` (training, detail) | **28** | Missing properties on Apprentice type vs what pages expect |
| `pages/awards/` | **24** | Award detail/edit pages have type mismatches |
| `components/dashboard/` | **22** | tasks.tsx zodResolver issue, missing imports |
| `pages/charge-rates/` | **21** | **Cross-repo dependency** — charge rates calculated in R8, displayed in CRM7. Types may need alignment with R8 stores |
| `pages/contacts/` (tags, groups) | **15** | Contact entity shape mismatches |
| `pages/mentors/` | **11** | Mentor entity doesn't match expected shape |
| `pages/competencies/` | **11** | Competency entity shape mismatches |
| `components/ui/` | **9** | calendar.tsx `IconLeft` deprecated in react-day-picker v9, user-nav `setTheme` missing from ThemeContext |
| `pages/auth/login.tsx` | **9** | Auth form type issues |
| `pages/contracts/` | **4** | Contract entity shape mismatches |
| `pages/clients/` | **4** | Client entity shape mismatches |

---

## 🟠 High — Systemic Type Issues

### 1. zod v4 + @hookform/resolvers incompatibility

- `zod@4.1.12` with `@hookform/resolvers@5.2.2` causes `ResolverResult` type mismatch
- Affects: `components/dashboard/tasks.tsx`, `pages/claims/new.tsx` (fixed with `as any` cast)
- **Fix:** Either downgrade to zod v3, or cast `zodResolver()` as `any` in all affected files, or wait for @hookform/resolvers to support zod v4 natively

### 2. Entity type shapes don't match page expectations

- Most of the 228 `TS2339` (property doesn't exist) and 203 `TS2322` (type assignment) errors stem from pages expecting properties that don't exist on the entity interfaces in `src/types/entities.ts`
- Common missing properties: `startDate`, `endDate`, `isActive`, `unitCode`, `unitTitle`, `trainingPackage`, `occupation`, `profileImage`, `overallProgress`, `average_score`
- **Root cause:** Pages were ported/written against different type definitions than what `entities.ts` provides. Either the types need expanding or the pages need updating.

### 3. ThemeContext missing `setTheme`

- `components/ui/user-nav.tsx` and `components/ui/imported/user-nav.tsx` call `setTheme` which doesn't exist on `ThemeContextType`
- **Fix:** Add `setTheme` to ThemeContext or update components

### 4. PageHeaderProps missing `title`/`description`

- Multiple WHS components pass `title` and `description` to `PageHeader` but the component doesn't accept those props
- **Fix:** Update `PageHeader` component to accept title/description, or update callers

### 5. API request signature mismatches

- `components/fair-work/FairWorkUpdateNotification.tsx` and `components/vet/qualification-search.tsx` pass wrong argument types to API functions
- `components/forms/ApprenticeForm.tsx` and `components/rates/RateApprovalWorkflow.tsx` pass wrong number of arguments

---

## 🟡 Medium — Charge Rates ↔ R8 Alignment

- `pages/charge-rates/` has 21 TS errors
- **Charge rates are calculated in R8 (R80.3)** and displayed/managed in CRM7
- Types and data shapes need to align between R8's calculator store exports and CRM7's charge rate pages
- This is a cross-repo dependency that should be addressed during Phase 1 integration

---

## 🟡 Medium — Feature Barrel Exports Incomplete

The `features/` directory has barrel `index.ts` files that re-export from `./utils`, `./types`, `./components`, `./services`, `./hooks`, `./domain` — but many of these sub-modules don't exist yet:

- `features/dashboard/index.ts` — missing components, types
- `features/financial/index.ts` — missing services, utils, hooks, domain
- `features/reports/index.ts` — missing services, utils, hooks, domain
- `features/settings/index.ts` — missing services, utils, hooks, domain

**Fix:** Either create the missing modules or remove the dead exports.

---

## 🟢 Low — UI Component Deprecation

- `components/ui/calendar.tsx` uses `IconLeft`/`IconRight` props deprecated in `react-day-picker` v9. Should use `components` prop instead.

---

## Recommended Fix Priority

1. **Install 6 missing npm packages** — immediate, prevents runtime crashes
2. **Fix or remove dead module imports** — prevents route crashes
3. **Align entity types with page expectations** — addresses ~430 of 670 errors
4. **Fix PageHeaderProps** — addresses ~20 WHS errors
5. **Fix ThemeContext** — addresses user-nav errors
6. **Address zod v4 / hookform resolver** — systemic but workaround exists
7. **Align charge rate types with R8** — cross-repo, do during integration
8. **Clean up feature barrel exports** — housekeeping
