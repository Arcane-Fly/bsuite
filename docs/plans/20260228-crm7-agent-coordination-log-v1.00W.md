# CRM7 Agent Coordination Log

**Purpose:** Keep Windsurf (Cascade) and Claude Code aligned on shared codebase.

**Branch:** `development` (single branch, both agents)

**Rule:** Check this log before editing shared files (entities.ts, schema.ts, stores).

---

## Active Agent Scopes

| Agent | Current Task | Files Owned | Status |
|-------|-------------|-------------|--------|
| **Windsurf (Cascade)** | Type error remediation → Cascade tasks from v2 plan | See below | Active |
| **Claude Code** | Remediation plan v2 — complex logic tasks | See below | Active |

### Windsurf File Scope (DO NOT EDIT from Claude Code)

- `src/components/GlobalErrorBoundary.tsx`
- `src/components/TenantSwitcher.tsx`
- `src/components/ai/AIToolCard.tsx`
- `src/components/common/ActionButton/`
- `src/components/whs/advanced-reporting-manager.tsx`
- `src/pages/claims/list.tsx`
- `src/pages/contacts/modern-contacts.tsx`
- `src/pages/funding-sources/list.tsx`
- `src/pages/funding-sources/[id].tsx`
- `src/pages/charge-rates/[id]/index.tsx`
- `src/pages/awards/[id]/edit.tsx`
- `src/pages/payroll/award-rates/index.tsx`

### Claude Code File Scope

- Compliance engine (`src/lib/funding/`, `src/lib/awards/`)
- Placement workflow (`src/lib/workflows/`)
- BOOT assessment (`src/schemas/bootAssessment.ts`)
- Portal pages (`src/pages/portal/`)
- External integrations (`src/lib/integrations/`)

### Shared Files (coordinate before editing)

- `src/types/entities.ts` — Windsurf added `pay_rates` to `AwardClassificationItem`
- `src/shared/schema.ts` — Windsurf added `url`, `uploadDate`, `expiryDate` to `Document`
- `src/stores/` — entity stores

---

## Progress Log

### 2026-02-28 20:30 AWST — Windsurf (Cascade)

**Completed:** All non-test type errors resolved to zero.

**Commit:** `69e5cbf` — `fix(crm7): resolve all non-test type errors to zero`

**38 files changed across:**
- Implicit `any` fixes (explicit parameter types)
- `unknown` → `ReactNode` fixes (typeof narrowing in JSX)
- Missing interface properties added
- Variant/size prop mappings for shadcn UI
- Supabase joined relation type handling
- Vite `import.meta.env.DEV` instead of `process.env`
- `Column<Contact>` type alignment

**Remaining test-only errors:** `documentService.test.ts` (Supabase mock typing — low priority)

**Next:** Cascade tasks from remediation plan v2:
- Task 5.1: Consolidate duplicate stores
- Task 5.3: Extract shared StatusBadge component
- Task 5.5: Extract Australian validators
- Task 0.1: Consolidate .md files (if not started by Claude)
