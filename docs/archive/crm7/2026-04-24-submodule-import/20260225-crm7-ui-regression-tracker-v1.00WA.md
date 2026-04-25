> **ARCHIVED** — Historical reference, not actively maintained. Archived 2026-03-16 as part of documentation compliance remediation.

---

# CRM7 Broad UI Refresh — Remaining Work (Tasks 3 & 4)

## Context

Tasks 1 and 2 are **COMPLETE** — verified by codebase exploration on 2026-03-11. Cascade's polish passes landed all the planned shell and workflow hub changes. What remains is Task 3 (visual QA) and Task 4 (cross-app polish check).

**Verified complete (Tasks 1 & 2):**

- `theme.css`: `[data-theme-mode="balanced"]` ✅, `.dark[data-theme-mode="neon-premium"]` ✅, `--tenant-primary` ✅, `--shell-blur` ✅
- `CRM7Header.tsx`: All `backdropFilter` uses `blur(var(--shell-blur))` — no hardcoded px ✅
- Auth pages (callback, confirm, reset-password): No deprecated `--bg-primary` / `--text-heading` — all use `--bg-body` / `--text-primary` ✅
- `claims/index.tsx`: Imports and uses `PageHeader` — no manual `<h1>` ✅

**Dashboard.tsx note (from Cascade handoff, updated 2026-03-12):**

- Cascade's ordered polish pass landed: `heroSignals` (Pipeline/Follow-ups/Conversion), hero gradient, "Core metrics" heading, panel separators, Customise button inline
- **RGL v2 regression fixed (2026-03-12):** `isDraggable`/`isResizable`/`draggableHandle`/`compactType` migrated to v2 API — `dragConfig`/`resizeConfig`/`compactor={verticalCompactor}`
- **Neon glow regression fixed (2026-03-12):** All dashboard grid cells now get `var(--shadow-shell-glow)` + `var(--bg-panel)` + `var(--border-shell-strong)` unconditionally (previous conditional string-match only covered ~60% of widgets)
- **Space filling (2026-03-12):** `rowHeight` increased 30→40, default layout `h` values increased for stat cards (4→5) and panels (10→12, 12→13)

**module-visibility fixes (2026-03-12):**

- `border` Tailwind class → `1px solid var(--border-shell)` inline style — eliminates hard black borders on module rows
- Floating save bar: `bg-background border rounded-lg shadow-lg` → `var(--bg-shell-elevated)` + `var(--border-shell-strong)` + `var(--shadow-shell-glow)`

**Dashboard layout system (2026-03-16):**

- `Dashboard.tsx`: Replaced `verticalCompactor` (always-on) with dual-mode engine — `noCompactor + preventCollision: true` in edit mode (free 2D canvas, no overlap), `verticalCompactor` in view mode (responsive reflow on resize/breakpoint)
- `Dashboard.tsx`: `bounded: true` + `cancel: '.react-resizable-handle'` on `dragConfig` — cards can't escape canvas into nav; resize handle no longer races drag start
- `Dashboard.tsx`: `layoutCols` state persisted via `useScopedPreference('page:dashboard_grid_cols', 12)` — user-configurable column count 1–24
- `Dashboard.tsx`: `activeCols` computed — edit mode locks all breakpoints to `layoutCols`; view mode uses responsive breakpoints (12→10→6→4→2)
- `Dashboard.tsx`: Edit toolbar expanded — column slider (1–24), preset chips (1/2/3/4/6/12), "Compact Layout" button (packs cards upward within current column count)
- `docs/guides/20260226-best-practices-guide-v1.00A.md`: Rewritten React 18 → React 19 section — `use()`, `useActionState`, `useFormStatus`, `useOptimistic`, ref-as-prop, `<Context>` shorthand, updated memoization guidance, yarn→pnpm references, date+footer updated
- `docs/mermaid-ui-builder.md`: Added Dashboard Canvas Alignment section — documents that dashboard edit canvas IS the foundation of the Template Library; carries forward to `pages`+`page_revisions` persistence when builder expands

**UI regression fixes (2026-03-16):**

- `theme.css`: Added complete missing shell variable set — `--bg-shell`, `--border-shell`, `--border-shell-strong`, `--bg-shell-chrome/elevated/hero/accent/accent-strong/sidebar`, `--shadow-shell`, `--shadow-shell-glow`, `--shell-blur`, `--tenant-*` — light + dark modes. Root cause of all black borders throughout app (undefined vars fell back to `currentColor`).
- `theme.css`: Strengthened `--shadow-shell-glow` — dark: `rgba(cyan, 0.28)` ring + `rgba(cyan, 0.22)` 28px bloom + `rgba(cyan, 0.08)` 48px halo. Light: `rgba(blue, 0.16)` + `rgba(blue, 0.14)`. Previous values (0.08/0.12) were imperceptible.
- `MainLayout.tsx`: Added `fixed inset-0 z-0` `DotPattern` at shell level — visible across all pages including header area. Removed `bg-background` solid override so pattern shows through.
- `StatCard.tsx`: Added `borderColor: var(--border-shell)` + `--shadow-shell-glow` to Card inline style. Tailwind `border-border` class was computing `hsl(rgba(...))` = invalid CSS → `currentColor` = white in dark mode.
- `dashboard-panels.tsx`: Stripped redundant `border` + `shadow-elev-2` from all 7 panel root divs (outer grid wrapper handles neon border+glow). Set `bg: transparent`. Double-border was the source of hard white inner borders.
- `index.css`: Fixed scrollbar color from invalid `hsl(var(--hex))` to proper `rgba()` neon values — light (blue 20%) + dark (cyan 20%).
- `OrgSetupWizard.tsx`: Added direct Supabase `user_tenants` query fallback when edge function fails silently. Added `PUBLIC_EMAIL_DOMAINS` validation on manual domain input.

**schema-builder fixes (2026-03-12):**

- Early-fire bug: `tenantId !== undefined` check replaced with `if (tenantLoading) return` — prevents querying before tenant resolves
- Error state: load failures now show `AlertTriangle` error UI instead of silently falling through to "No entities yet"
- DB: 18 additional system entities seeded via migration `20260312000000_seed_additional_system_entities.sql` — opportunity, deal, quote, invoice, training_contract, whs_incident, site_visit, case_note, risk_assessment, payroll_record, timesheet, charge_rate, qualification, unit_of_competency, vet_assessment, funding_period, document, notification (30 total system entities)

---

## Task 3 — Visual QA

Run `cd crm7 && pnpm typecheck` first to confirm clean baseline.

Audit checklist (no code changes unless regressions found):

- Desktop: sidebar collapsed/expanded shell continuity
- Mobile: bottom nav + header chrome
- Keyboard focus rings visible on nav items, buttons, tabs
- Contrast: active nav item, accent badges, card text on shell backgrounds
- Spacing: hero/content/footer region gaps consistent with reference pages (`reports/index.tsx`, `hosts/index.tsx`)
- Dashboard hero: hero description text (~line 766) — trim if it feels redundant after seeing in browser
- Dashboard "Core metrics": `{visibleMetricCards.length} visible` badge — keep or remove based on UX feel
- No lingering hardcoded `background: #hex` or `color: #hex` in touched files

Grep to run before sign-off:

```bash
grep -rn "var(--bg-primary)\|var(--text-heading)\|var(--bg-secondary)" crm7/src/pages/ --include="*.tsx"
grep -rn "backdropFilter.*blur([0-9]" crm7/src/components/ --include="*.tsx"
```

---

## Task 4 — Cross-app polish (post Task 3)

Scope: `business-suite-unified`, `conduit`, `R80.3` — fix only regressions from the shell token rollout. No redesigns.

**Pre-verified (2026-03-11):** All three apps have independent, clean theme implementations. No deprecated `--bg-primary`/`--text-heading` refs, no hardcoded `backdropFilter` in TSX. No blocking issues.

**One low-priority gap:** `business-suite-unified/src/index.css` — `.glass-effect` class has `backdrop-filter: blur(20px)` hardcoded in CSS (not TSX). Optional: extract to `--shell-blur` var. Not a blocker.

Each app: `pnpm typecheck` only — no visual changes expected.

---

## Execution

1. `cd crm7 && pnpm typecheck` — confirm clean baseline
2. Task 3 visual QA (browser + grep checks above)
3. Task 4 cross-app typecheck sweep
4. Commit with `style(crm7): broad UI refresh — shell completion + workflow hub polish`
