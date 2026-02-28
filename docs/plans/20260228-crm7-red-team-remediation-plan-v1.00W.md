# CRM7 Red-Team & Remediation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Fix all issues identified in the comprehensive 8-agent red-team audit of CRM7 Stream B and broader codebase health.

**Architecture:** Fixes grouped by blast radius — critical bugs first, then naming/DRY consolidation, then documentation cleanup.

**Tech Stack:** TypeScript, React 18, Supabase v2, Zustand v5, Zod v4, Vite 6

---

## Priority Matrix

| Priority | Category | Task Count | Risk if Deferred |
|----------|----------|------------|-----------------|
| P0 | Critical Bug | 1 | Session corruption |
| P1 | Naming/Entity Consolidation | 3 | Growing confusion |
| P2 | DRY Violations | 4 | Maintenance burden |
| P3 | Documentation Cleanup | 2 | Onboarding friction |

---

## P0: Critical Bug Fix

### Task 1: Fix BSU cookie cleanup bug

**Files:**
- Fix: `business-suite-unified/src/lib/supabase.ts:106`

**Step 1: Verify the bug**

Read line 106 of `business-suite-unified/src/lib/supabase.ts`. Confirm it calls `readCookie(name)` instead of `readCookieRaw(name)`.

Compare with the correct implementation at `crm7/src/lib/supabase.ts:106` which uses `readCookieRaw(name)`.

**Step 2: Fix**

Change `readCookie(name)` to `readCookieRaw(name)` on line 106.

**Step 3: Verify fix matches crm7**

Confirm the `removeItem()` function in BSU now matches the crm7 implementation exactly.

**Step 4: Commit**

```bash
git add business-suite-unified/src/lib/supabase.ts
git commit -m "fix(bsu): use readCookieRaw in cookie cleanup to prevent orphaned chunks"
```

---

## P1: Naming & Entity Consolidation

### Task 2: Consolidate duplicate stores (contractStore + hostAgreementStore)

**Files:**
- Audit: `crm7/src/stores/contractStore.ts`
- Audit: `crm7/src/stores/hostAgreementStore.ts`
- Modify: `crm7/src/stores/index.ts`
- Modify: All pages importing the duplicate store

**Step 1: Determine which store is canonical**

Both query `host_agreements` table. Identify which has more consumers and better filter logic.

**Step 2: Remove the duplicate**

Keep the better-implemented store. Update all imports from the removed store to point to the canonical one.

**Step 3: Update barrel export**

Remove the duplicate from `stores/index.ts`.

**Step 4: Run type check**

```bash
cd crm7 && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add crm7/src/stores/
git commit -m "refactor(crm7): consolidate duplicate host agreement stores"
```

### Task 3: Normalize host employer FK naming

**Files:**
- Audit: `crm7/src/types/entities.ts` — find all variations of `host_employer_id`, `host_org_id`, `employer_id`
- Modify: entities.ts, relevant schemas, relevant stores

**Step 1: Audit all FK names**

Search for `host_employer_id`, `host_org_id`, `employer_id` across all entity types and schemas. Document which name each entity uses.

**Step 2: Choose canonical name**

Use `host_employer_id` — matches the `host_employers` table and is the most descriptive.

**Step 3: Update TypeScript types**

In `entities.ts`, rename all variations to `host_employer_id`. This is a type-only change — DB columns keep their names (those require migrations).

**Step 4: Update schemas**

In relevant schema files, rename Zod field names to match.

**Step 5: Run type check**

```bash
cd crm7 && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add crm7/src/types/ crm7/src/schemas/
git commit -m "refactor(crm7): normalize host employer FK naming to host_employer_id"
```

### Task 4: Consolidate compliance entity naming

**Files:**
- Audit: `crm7/src/types/entities.ts` — find `ComplianceAlert`, `ComplianceCheck`, `ComplianceIssue`
- Audit: relevant schemas and stores

**Step 1: Map the three compliance concepts**

- `ComplianceAlert` — triggered notification about a compliance issue
- `ComplianceCheck` — scheduled verification of compliance status
- `ComplianceIssue` — a tracked problem requiring resolution

Determine if these are truly distinct entities or overlapping names for the same thing.

**Step 2: If overlapping, consolidate**

If `ComplianceCheck` and `ComplianceIssue` are just different states of `ComplianceAlert`, remove them and add status fields to `ComplianceAlert`.

**Step 3: Update all references**

Update stores, schemas, and page imports.

**Step 4: Run type check**

```bash
cd crm7 && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add crm7/src/types/ crm7/src/schemas/ crm7/src/stores/
git commit -m "refactor(crm7): consolidate overlapping compliance entities"
```

---

## P2: DRY Violations

### Task 5: Create shared StatusBadge component

**Files:**
- Create: `crm7/src/components/common/StatusBadge.tsx`
- Modify: All 6+ pages with inline status badge implementations

**Step 1: Audit existing badge implementations**

Search for Badge components rendering status strings like "Active", "Completed", "Pending", "Draft" with variant/color logic. Document each pattern.

**Step 2: Create unified StatusBadge**

```tsx
interface StatusBadgeProps {
  status: string;
  colorMap?: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'>;
}
```

Use a sensible default color map: active/completed → green variant, pending/draft → yellow, cancelled/rejected → destructive, etc.

**Step 3: Replace all inline implementations**

Update each page to use `<StatusBadge status={item.status} />`.

**Step 4: Run type check**

```bash
cd crm7 && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add crm7/src/components/common/StatusBadge.tsx crm7/src/pages/
git commit -m "refactor(crm7): extract shared StatusBadge component, replace 6+ inline implementations"
```

### Task 6: Migrate top 10 direct Supabase query pages to use stores

**Files:**
- Identify the 10 most-queried pages that bypass stores
- Modify each to use `createEntityStore` or existing stores

**Step 1: Identify candidates**

Search for `supabase.from(` in pages directory. Rank by query count. Pick top 10 that have a corresponding store (or should have one).

**Step 2: For each page**

Replace direct `supabase.from('table').select()` calls with the appropriate store's `fetch()`, `getById()`, etc. If no store exists, create one using `createEntityStore<T>()`.

**Step 3: Run type check after each page**

```bash
cd crm7 && npx tsc --noEmit
```

**Step 4: Commit in batches of 2-3 pages**

```bash
git commit -m "refactor(crm7): migrate [page names] from direct Supabase to stores"
```

### Task 7: Fix analytics page to use React Query

**Files:**
- Modify: `crm7/src/pages/analytics/index.tsx`

**Step 1: Replace useEffect + fetch with useQuery**

Replace the manual `fetchMetrics` + `useEffect` + `useState` pattern at lines 26-54 with a `useQuery` hook.

**Step 2: Verify**

```bash
cd crm7 && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add crm7/src/pages/analytics/index.tsx
git commit -m "refactor(crm7): migrate analytics from useEffect to React Query"
```

### Task 8: Extract shared Australian validators to @bsuite/validators

**Files:**
- Reference: `/mnt/wwn-0x5000c500c05cd06f-part1/sDev/CRM7-Standalone/src/lib/validation.ts` (donor)
- Create: shared package or `crm7/src/lib/validators/au.ts`
- Modify: any existing ABN/TFN validation in crm7

**Step 1: Harvest donor validators**

From the CRM7-Standalone donor, extract:
- ABN validation (11-digit with weighting algorithm)
- TFN validation (8-9 digit)
- Australian phone validation
- Postcode validation (4-digit)
- Address schema

**Step 2: Create validator module**

Place in `crm7/src/lib/validators/au.ts` with Zod refinements for each.

**Step 3: Replace any existing inline validation**

Search for ABN/TFN/phone validation in crm7 schemas and replace with the shared validators.

**Step 4: Add tests**

Create `crm7/src/lib/validators/au.test.ts` with valid/invalid cases for each validator.

**Step 5: Run tests**

```bash
cd crm7 && npx vitest run src/lib/validators/au.test.ts
```

**Step 6: Commit**

```bash
git add crm7/src/lib/validators/
git commit -m "feat(crm7): add Australian validators (ABN, TFN, phone, postcode) from donor"
```

---

## P3: Documentation Cleanup

### Task 9: Rename docs to follow contributing standards

**Files:**
- All files in `docs/` and `docs/plans/` that violate naming convention

**Step 1: Audit all doc filenames**

List all docs, identify those missing `YYYYMMDD-` prefix, version number, or status code.

**Step 2: Rename with git mv**

Use `git mv` to rename each file to follow `YYYYMMDD-descriptive-name-type-vMAJOR.MINOR[STATUS].md` format.

**Step 3: Update any internal cross-references**

Search for old filenames in other docs and update links.

**Step 4: Commit**

```bash
git add docs/
git commit -m "docs: rename documentation files to follow contributing standards naming convention"
```

### Task 10: Organize CRM13 donor docs

**Files:**
- `docs/crm13-docs/` directory

**Step 1: Create README index**

Add `docs/crm13-docs/README.md` listing all imported CRM13 docs with their purpose and import date.

**Step 2: Mark as imported**

Add `[IMPORTED FROM CRM13]` header to each file, or namespace them clearly.

**Step 3: Remove duplicates**

If any files exist in both `docs/` and `docs/crm13-docs/`, keep only the `crm13-docs/` version and add a redirect note in `docs/`.

**Step 4: Commit**

```bash
git add docs/
git commit -m "docs: organize CRM13 donor docs with README index and import markers"
```

---

## Deferred (Not in This Sprint)

These items are real but lower priority:

| Item | Reason to Defer |
|------|----------------|
| 356 `any` type violations | Pre-existing, ESLint rule off — needs separate enforcement sprint |
| 17 `React.FC` usages | Cosmetic, not breaking |
| App.tsx 662-line routing split | Architectural — needs design phase |
| pnpm workspaces migration | Large blast radius — needs careful planning |
| Re-enable `@typescript-eslint/no-explicit-any` | Requires fixing 356 violations first |
| Shared `@bsuite/validators` package | Start in crm7 first, extract to package later |

---

## Execution Order

```
Task 1 (P0: BSU cookie bug)     → 5 min
Task 2 (P1: duplicate stores)   → 15 min
Task 3 (P1: FK naming)          → 20 min
Task 4 (P1: compliance naming)  → 15 min
Task 5 (P2: StatusBadge)        → 20 min
Task 6 (P2: store migration)    → 45 min
Task 7 (P2: React Query)        → 10 min
Task 8 (P2: AU validators)      → 30 min
Task 9 (P3: doc renaming)       → 15 min
Task 10 (P3: CRM13 docs)        → 10 min
```

Total: ~3 hours of subagent work
