# Theme & Type Consistency QA Plan

Cross-project QA for CRM7, R8, and BSU — theme dark mode, type safety, lint, shared types, and one-shot data sync.

---

## 1. CRM7 Dark Mode Background Bug (HIGH)

### Root Cause

The `App.tsx` root div uses `className="min-h-screen font-sans antialiased app-shell"` but **never sets `background-color`** via a theme-aware class. While `theme.css` correctly defines `--bg-body: #001018` under `.dark`, nothing applies it to the page background.

**BSU does this correctly** — its `.dark` block includes `background-color: var(--bg-body); color: var(--text-primary);` and its base layer has `body { @apply bg-background text-foreground; }`. CRM7's CSS has neither.

### Fixes

- [ ] **A1** — Add `background-color: var(--bg-body); color: var(--text-primary);` to CRM7's `theme.css` in both `:root` and `.dark` blocks (on the element itself, like BSU does)
- [ ] **A2** — OR add `bg-background text-foreground` to the root `<div>` in `App.tsx` (line 345)
- [ ] **A3** — Add a `@layer base { body { @apply bg-background text-foreground; } }` rule in `index.css` (like BSU)
- [ ] **A4** — Audit `app-shell` CSS class — if it exists in CSS, ensure it uses theme vars; if not, it's a no-op class name

### Hardcoded Light-Only Classes (89 matches, 51 files)

`bg-white`, `bg-gray-50`, `bg-gray-100`, `bg-slate-50`, `bg-slate-100` — these bypass CSS vars and stay light in dark mode.

**Strategy**: Replace with theme-aware equivalents:
| Hardcoded | Replacement |
|-----------|-------------|
| `bg-white` | `bg-background` or `bg-panel` |
| `bg-gray-50` | `bg-surface` or `bg-muted` |
| `bg-gray-100` | `bg-tertiary` or `bg-muted` |
| `bg-slate-50/100` | `bg-surface` |

**Priority files** (user-visible layouts):
- `MainLayout.tsx` — mobile sidebar uses `bg-white dark:bg-gray-900` (partially correct, but should use var)
- `CRM7Navigation.tsx` (4 matches)
- `UserMenu.tsx` (4 matches)
- `user-nav.tsx` — hardcoded `bg-white/90`, `text-gray-800`, `text-gray-500`
- `portal/index.tsx` (5 matches)
- `ErrorBoundary.tsx`, `GlobalErrorBoundary.tsx`

### Hardcoded Text Colors

`text-gray-600`, `text-gray-800`, `text-gray-500` etc. should use `text-foreground`, `text-muted-foreground`, or inline `style={{ color: 'var(--text-primary)' }}`.

---

## 2. R8 Dark Mode (HIGH — Currently Non-Functional)

### Root Cause

R8 has **no ThemeProvider or ThemeContext**. The `SettingsPage.tsx` has a dark mode toggle but it only sets local React state (`setDarkMode(!darkMode)`) — it **never applies the `dark` class to `document.documentElement`**. The `userSettingsService.ts` has a `toggleDarkMode()` function that persists to Supabase but the result is never consumed.

### Fixes

- [ ] **B1** — Create `R80.3/src/contexts/ThemeContext.tsx` (port from CRM7, adapt storage key to `r8-theme`)
- [ ] **B2** — Wrap `App.tsx` in `<ThemeProvider>` 
- [ ] **B3** — Wire `SettingsPage.tsx` dark mode toggle to the new ThemeContext
- [ ] **B4** — Add base body styling: `body { background-color: var(--bg-body); color: var(--text-primary); }` in R8's theme.css or index.css
- [ ] **B5** — Fix 127 hardcoded `bg-white`/`bg-gray-*` matches across 16 R8 component files (same strategy as CRM7)
- [ ] **B6** — Fix hardcoded `text-gray-*` colors throughout

---

## 3. BSU Dark Mode (LOW — Already Working)

BSU uses `next-themes` ThemeProvider with `attribute="class" defaultTheme="dark" enableSystem`. Its CSS correctly applies dark vars and body styling. 

### Minor Issues

- [ ] **C1** — Verify `AppContent.tsx` hardcoded `neon-theme` class doesn't override dark mode
- [ ] **C2** — Audit for any `bg-white` / `text-gray-*` hardcoded values in BSU components

---

## 4. Tailwind Config Consistency (MEDIUM)

### Current State

| Feature | CRM7 | R8 | BSU |
|---------|------|----|-----|
| `darkMode` | `['class', '[data-theme="dark"]']` | `'class'` | `['class']` |
| Neon Electric Palette | ✅ | ✅ | ✅ |
| shadcn tokens (background, foreground, etc.) | ✅ (CSS var based) | ❌ | ✅ (HSL based) |
| Glow shadows | ✅ | ✅ | ✅ |
| Gradient backgrounds | ✅ | ✅ | ✅ |
| `tailwindcss-animate` plugin | ❌ | ❌ | ✅ |

### Fixes

- [ ] **D1** — Normalize `darkMode` config: all three should use `['class']` (CRM7's extra `[data-theme="dark"]` is redundant since ThemeContext sets both)
- [ ] **D2** — Consider adding `tailwindcss-animate` to CRM7 and R8 if they use Radix/shadcn animations
- [ ] **D3** — R8 should add shadcn semantic color tokens if it uses shadcn components

---

## 5. TypeScript / Lint QA (HIGH)

### Build Checks Needed

- [ ] **E1** — Run `tsc --noEmit` (or `vite build`) on CRM7 and catalog remaining errors
- [ ] **E2** — Run `tsc --noEmit` (or `vite build`) on R8 and catalog remaining errors
- [ ] **E3** — Run `tsc --noEmit` (or `vite build`) on BSU and catalog remaining errors
- [ ] **E4** — Fix any errors found, prioritizing real type mismatches over cosmetic `as any` casts

### Known Pre-Existing Issues (CRM7)

- `vite.config.ts` has "No overload matches this call" and "fastRefresh does not exist" — cosmetic, doesn't affect build
- Various `as any` casts added in previous session for quick TS error suppression — should be audited

### Shared Type Patterns to Verify

- `BaseEntity { id, tenant_id, created_at, updated_at }` pattern from `crm7/src/types/entities.ts`
- R8 types in `R80.3/src/types/index.ts` (calculation-specific: `CostConfig`, `ApprenticeProfile`, `CalculationResult`)
- R8 also has `unified-schema.ts` and `database.ts` — check alignment with CRM7
- BSU has **no `src/types/` directory** — relies on inline types and Supabase generated types

---

## 6. Shared Types Architecture (MEDIUM)

### Current State

No shared types package exists. Each project defines its own types independently. The `DRY-ONE-SHOT-ARCHITECTURE.md` defines entity ownership but there's no shared TypeScript package.

### Options

1. **Shared `bsuite/packages/shared-types/`** — npm workspace package with common interfaces (`BaseEntity`, `EntityStatus`, `Address`, etc.)
2. **Generated from Supabase** — Use `supabase gen types typescript` as the single source, distribute to all projects
3. **Status quo + manual alignment** — Keep separate but ensure key interfaces match (lowest effort)

### Recommendation

Option 3 for now (manual alignment), with Option 2 as a follow-up. The projects are Vite-based without a monorepo package manager, so Option 1 requires workspace tooling setup.

### Alignment Checks

- [ ] **F1** — Verify `R80.3/src/types/unified-schema.ts` matches CRM7's entity definitions
- [ ] **F2** — Verify `R80.3/src/types/database.ts` matches actual Supabase schema
- [ ] **F3** — Ensure BSU's inline types for `user_tenants`, `tenants`, `subscriptions` match schema
- [ ] **F4** — Check CRM7's charge-rate pages consume R8 types correctly (per memory: "charge rate TS errors in CRM7 may need R8 store/type alignment")

---

## 7. One-Shot Data Entry & Entity Sync QA (MEDIUM)

Per `DRY-ONE-SHOT-ARCHITECTURE.md`, every entity has ONE owning app. Verify:

- [ ] **G1** — CRM7 forms for contacts/clients/apprentices use EntitySelector (not free-text) for related entities
- [ ] **G2** — R8 rate calculator reads apprentices from Supabase (not local re-entry)
- [ ] **G3** — BSU admin panel reads users/tenants correctly
- [ ] **G4** — Verify FK relationships: `apprentices.contact_id → contacts.id`, `placements.employer_id → employers.id`, etc.
- [ ] **G5** — Personal contacts scope: verify RLS allows user-private contacts (not visible to all tenant users) where `visibility = 'private'` or similar

### Security Considerations

- Contacts may be personal (user-scoped) or business (tenant-scoped)
- Current RLS uses `tenant_id IN (SELECT auth_tenant_id())` — this is tenant-wide, no user-private row support yet
- [ ] **G6** — Assess need for `visibility` column on `contacts` table with RLS policy: `visibility = 'private' AND created_by = auth.uid()` OR `visibility = 'shared' AND tenant_id IN (SELECT auth_tenant_id())`

---

## 8. CSS Variable Completeness (LOW)

### Verify All Projects Define These Vars

| Variable | CRM7 `:root` | CRM7 `.dark` | R8 `:root` | R8 `.dark` | BSU `:root` | BSU `.dark` |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|
| `--bg-body` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `--bg-surface` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `--bg-panel` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `--text-primary` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `--border-color` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `--accent-primary` | ✅ | ✅ | ✅ | ✅ | ? | ? |
| `color` on `.dark` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `background-color` on `.dark` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

- [ ] **H1** — Add `color` and `background-color` properties to CRM7's `.dark` block
- [ ] **H2** — Add `color` and `background-color` properties to R8's `.dark` block

---

## Execution Priority

1. **CRM7 dark mode background** (A1-A4) — user-reported, quick fix
2. **R8 ThemeProvider** (B1-B4) — dark mode completely non-functional
3. **TypeScript build checks** (E1-E3) — identify scope of type issues
4. **Hardcoded color audit** (A5, B5, B6) — systematic, can be batched
5. **Tailwind config normalization** (D1-D3)
6. **Shared types alignment** (F1-F4)
7. **One-shot data entry QA** (G1-G6)
8. **CSS variable completeness** (H1-H2)
