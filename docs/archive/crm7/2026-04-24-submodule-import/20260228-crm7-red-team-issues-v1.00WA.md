> **ARCHIVED** — Historical reference, not actively maintained. Archived 2026-03-16 as part of documentation compliance remediation.

---

# Red-Team Review Issues - UI/UX Consistency Migration

**Review Date:** 2026-02-26
**Scope:** 15 page migrations to unified design system
**Reviewers:** Security, Reliability, Performance, UX/DX, Code Quality agents

---

## Critical Issues (Must Fix Immediately)

### SEC-H1: Development Mode Bypasses Authentication
- **Severity:** CRITICAL
- **Area:** `/home/braden/Desktop/Dev/bsuite/crm7/src/components/auth/protected-route.tsx:34-38`
- **Reproduction:** Set `VITE_MODE=development` in production → auth bypassed
- **Impact:** Complete authentication bypass in production
- **Proposed Fix:** Remove MODE check, only trust `import.meta.env.DEV`
- **Status:** Closed — Fixed in `protected-route.tsx` to rely on `import.meta.env.DEV` and block production bypass when Supabase isn't configured.

### SEC-H2: Master Key Exposed in Client Bundle
- **Severity:** CRITICAL
- **Area:** `/home/braden/Desktop/Dev/bsuite/crm7/src/services/documentService.ts:358`
- **Reproduction:** Search bundle for VITE_TENANT_MASTER_KEY
- **Impact:** Master key accessible to anyone
- **Proposed Fix:** Move master key operations to backend API
- **Status:** Open

### REL-C1: Missing React Query Error States
- **Severity:** CRITICAL
- **Area:** 10+ pages (contacts, field-officers/*, etc.)
- **Reproduction:** Disconnect Supabase → pages show empty instead of error
- **Impact:** Silent failures, confusing UX
- **Proposed Fix:** Add error handling pattern to all useQuery calls
- **Status:** Open

### REL-C2: DataTable Doesn't Handle Null Row Data
- **Severity:** CRITICAL
- **Area:** `/home/braden/Desktop/Dev/bsuite/crm7/src/components/common/DataTable/DataTable.tsx:119-122`
- **Reproduction:** Pass data with null properties to DataTable
- **Impact:** React crashes on render
- **Proposed Fix:** Add defensive null checks before row[column.key] access
- **Status:** Open

### PERF-1.1: Missing Memoization in DataTable
- **Severity:** CRITICAL
- **Area:** DataTable component column rendering
- **Reproduction:** Render 1000+ rows, observe 300-500ms render time
- **Impact:** Poor performance on large datasets
- **Proposed Fix:** Memoize column render functions
- **Status:** Open

### PERF-1.2: Inline Variant Calculations Not Memoized
- **Severity:** CRITICAL
- **Area:** 43+ files with getStatusVariant inline calls
- **Reproduction:** Profile render with 100+ rows
- **Impact:** 50-100ms wasted calculations per render
- **Proposed Fix:** Memoize variant calculation results
- **Status:** Open

### CODE-CRIT1: Duplicate Status Variant Functions
- **Severity:** CRITICAL
- **Area:** 4+ locations (StatusBadge, opportunities, field-officers/*)
- **Reproduction:** Compare implementations - they differ!
- **Impact:** Inconsistent status mapping, maintenance nightmare
- **Proposed Fix:** Centralize in /lib/statusVariants.ts
- **Status:** Open

### CODE-CRIT2: Three StatCard Implementations
- **Severity:** CRITICAL
- **Area:** 3 files (common/StatCard, dashboard/stat-card, dashboard/stats-card)
- **Reproduction:** Grep for StatCard imports
- **Impact:** Confusion, duplication, inconsistency
- **Proposed Fix:** Delete 2 legacy versions
- **Status:** Open

---

## High Priority Issues (Should Fix This Sprint)

### SEC-H3: No CSRF Protection
- **Severity:** HIGH
- **Area:** All form submissions
- **Reproduction:** Submit form from malicious site while authenticated
- **Impact:** Unauthorized actions on behalf of users
- **Proposed Fix:** Implement Supabase RLS + CSRF tokens
- **Status:** Open

### REL-C3: Clickable Navigation Failures Are Silent
- **Severity:** HIGH
- **Area:** `/home/braden/Desktop/Dev/bsuite/crm7/src/components/common/Clickable/Clickable.tsx:82-87`
- **Reproduction:** Click stat with undefined href
- **Impact:** User confusion, no error feedback
- **Proposed Fix:** Add toast notification when navigation fails
- **Status:** Open

### REL-I1: entityNavigation Doesn't Validate IDs
- **Severity:** HIGH
- **Area:** `/home/braden/Desktop/Dev/bsuite/crm7/src/lib/entityNavigation.ts`
- **Reproduction:** Pass null/undefined ID → generates /apprentices/null
- **Impact:** Broken navigation, invalid URLs
- **Proposed Fix:** Add ID validation before building hrefs
- **Status:** Open

### PERF-1.3: Formatters Called Without Memoization
- **Severity:** HIGH
- **Area:** StatCard component
- **Reproduction:** Render 8 StatCards, profile formatter calls
- **Impact:** 10-20ms wasted per render cycle
- **Proposed Fix:** Memoize formatted value in StatCard
- **Status:** Open

### PERF-1.4: Column Definitions Not Consistently Memoized
- **Severity:** HIGH
- **Area:** expenses, opportunities, training pages
- **Reproduction:** Empty dependency arrays with external references
- **Impact:** Stale closures, unexpected behavior
- **Proposed Fix:** Fix dependency arrays in useMemo
- **Status:** Open

### UX-C1: Inconsistent Empty State Implementation
- **Severity:** HIGH
- **Area:** contracts page vs other pages
- **Reproduction:** Compare empty states across pages
- **Impact:** Visual inconsistency
- **Proposed Fix:** Migrate contracts to EmptyState component
- **Status:** Open

### UX-A4: DataTable Missing Keyboard Navigation
- **Severity:** HIGH
- **Area:** DataTable component
- **Reproduction:** Try navigating table with keyboard
- **Impact:** WCAG violation, accessibility failure
- **Proposed Fix:** Add tabIndex, onKeyDown, arrow key support
- **Status:** Open

### DX-D1: DataTable Column Type Confusion
- **Severity:** HIGH
- **Area:** DataTable render function signature
- **Reproduction:** Developer writes render: (expense) => instead of (value, row) =>
- **Impact:** Developer mistakes, inconsistent patterns
- **Proposed Fix:** Standardize render signature documentation
- **Status:** Open

---

## Medium Priority Issues (Address Soon)

### SEC-M1 through SEC-M5
- XSS risk in DataTable render
- URL parameter injection
- No input validation in formatters
- localStorage without encryption
- No rate limiting

### REL-I2 through REL-I3
- Hosts page filter malformed data handling
- Claims dashboard missing error boundary

### PERF-2.1 through PERF-2.4
- No virtual scrolling
- Inconsistent React Query configs
- Clickable wrapper div overhead
- Date formatting in render

### UX Issues
- Inconsistent formatter usage
- Missing loading states
- Number alignment issues
- Missing ARIA labels
- Color contrast problems

### DX Issues
- StatusBadge variant mapping manual
- Missing date formatter
- Component API complexity

### Code Quality Issues
- 51 files with manual formatting
- Inconsistent type imports
- Missing EmptyState tests
- Magic numbers in components

---

## Summary

- **Total Issues:** 52
- **Critical:** 8 (must fix before Round 2)
- **High:** 9 (should fix this sprint)
- **Medium:** 35 (address in next sprints)

**Next Steps:**
1. Fix all 8 Critical issues
2. Re-run tests
3. Run Round 2 red-team review
4. Address remaining High issues
5. Final QA and verification
