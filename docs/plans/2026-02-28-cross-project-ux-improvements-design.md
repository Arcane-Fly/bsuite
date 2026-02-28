# Cross-Project UX Improvements Design

**Date:** 2026-02-28
**Status:** Approved
**Scope:** R80.3, business-suite-unified, braden
**Total Items:** 14

---

## Context

Red team audit of the BSuite workspace revealed that UX improvements were only applied to CRM7 and Conduit (ScoutIcon, @dnd-kit pipeline). Three projects — R80.3, BSU, and braden — received zero UX attention despite having real gaps.

### Key Findings

- **R80.3**: No shadcn, no DnD, no view toggles. ApprenticeManager is a dense list with modal-only editing. ComparativeView has a dead Export button. No sorting or filtering.
- **BSU**: Admin panel is well-built (pagination, search, modals), but SystemOverview fakes health checks (always green) and DashboardStats shows fabricated numbers when no data exists.
- **braden**: Full shadcn/ui library (50+ components) but admin pages are scaffolding. Add Lead/Client buttons hard-code dummy data. Tasks/Staff/Emails are pure mock data with no DB tables. Dashboard nav is inconsistent.

---

## R80.3 Improvements (4 items)

### R1. ApprenticeManager View Toggle (list/card)

**Problem:** Dense vertical list is hard to scan at 6+ apprentices.
**Solution:** Add `viewMode: 'list' | 'card'` state with localStorage persistence. Card view uses a 2-3 column grid showing year badge, name, pay rate, charge rate, and key stats. Reuse existing `EnterpriseAgreementManager` card grid pattern.
**Components:** Toggle button group (LayoutList / LayoutGrid icons), ApprenticeCard component.

### R2. Fix Dead Export Button in ComparativeView

**Problem:** Export button renders but has no `onClick` handler — misleading dead UI.
**Solution:** Wire to the existing `ExportCalculations` view's export service, or navigate to the Export view with comparison data pre-selected.

### R3. ComparativeView Sortable Table Columns

**Problem:** Can't sort by charge rate or cost in the comparison table.
**Solution:** Click column headers to sort ascending/descending. Pure client-side array sort, no dependencies needed. Sort state: `{ column: string, direction: 'asc' | 'desc' }`.

### R4. ApprenticeManager Year Filter

**Problem:** Managing 8+ apprentices across 4 years in an undivided list is noisy.
**Solution:** Filter button group above list: All / Y1 / Y2 / Y3 / Y4. Client-side filter on apprentice year field. Persisted to localStorage.

---

## BSU Improvements (2 items)

### B1. Fix Misleading DashboardStats Sample Data

**Problem:** Shows fabricated numbers (1,247 users, $125K revenue) when `bi_metrics` returns no rows. Confuses new tenants into thinking they have data.
**Solution:** When `bi_metrics` query returns empty, show "No data yet" empty state cards instead of fake numbers. Keep the card structure but replace values with placeholder text and a subtle "Set up analytics" CTA.

### B2. Fix Faked Health Checks in SystemOverview

**Problem:** Health status always shows "All systems operational" (hardcoded green). False sense of security in production.
**Solution:** At minimum, replace hardcoded green with honest "Not monitored" labels with amber indicator. Ideally, add a real fetch against Supabase REST endpoint (`/rest/v1/` health) and Auth endpoint to verify connectivity. Storage and API checks can remain "Not monitored" until real monitoring is set up.

---

## braden Improvements (8 items)

### BR1. Fix Add Lead/Client Forms

**Problem:** "Add Lead" and "Add Client" buttons hard-code dummy data (`"New Lead"`, `"new@lead.com"`) instead of opening a form. This is a bug.
**Solution:** Replace with shadcn `Dialog` containing a form with real fields. Lead form: name, email, phone, service interest, source, notes. Client form: name, email, company, phone, notes. Use existing shadcn `Input`, `Select`, `Button`, `Label` components.

### BR2. Add Status Field to Leads

**Problem:** No pipeline stage exists on leads. Foundation for any pipeline/kanban view.
**Solution:** Add `status` column to Leads table display. Values: `new`, `contacted`, `qualified`, `proposal`, `won`, `lost`. Show as colored badges in the table. Add filter buttons to filter by status.

### BR3. Create Tasks DB Table

**Problem:** Tasks page is pure mock data with no persistence.
**Solution:** Create Supabase migration for `tasks` table: `id`, `title`, `description`, `status` (todo/in_progress/done), `assigned_to`, `due_date`, `created_at`, `updated_at`. Wire Tasks page to real data via Supabase client. Add CRUD operations.

### BR4. Create Staff DB Table

**Problem:** Staff page is pure mock data with no persistence.
**Solution:** Create Supabase migration for `staff` table: `id`, `name`, `email`, `position`, `phone`, `created_at`. Wire Staff page to real data. Add CRUD operations.

### BR5. Search + Filter on Leads/Clients

**Problem:** No search exists on any admin page.
**Solution:** Add shadcn `Input` with search icon above each table. Client-side filter on name/email/company fields. Debounced 200ms. Combined with status filter for Leads.

### BR6. Admin Layout: Proper Sidebar

**Problem:** Dashboard nav is inconsistent — mixes in-page tabs, navigate-away buttons, and bottom cards all linking to different things.
**Solution:** Replace button-stack nav with persistent admin sidebar using shadcn `sidebar` component (already in `src/components/ui/sidebar.tsx`). Sections: Dashboard, Content (Content Manager, CMS, Site Editor), People (Leads, Clients, Staff), Operations (Tasks, Emails), Settings (Site Settings, User Management).

### BR7. Leads Kanban Board

**Problem:** Leads are in a flat table with no pipeline visualization.
**Solution:** After BR2 (status field), add kanban board view with drag-and-drop. Columns: New → Contacted → Qualified → Proposal → Won/Lost. Install `@dnd-kit/core` + `@dnd-kit/sortable`. Lead cards show name, email, service interest, date. Drag between columns updates status in Supabase. Toggle between table and kanban view.

### BR8. Tasks Kanban Board

**Problem:** Tasks have a status field (todo/in_progress/done) but are in a flat table.
**Solution:** After BR3 (DB table), add kanban board view. 3 columns: To Do → In Progress → Done. Install `@dnd-kit` (shared with BR7). Task cards show title, assigned to, due date. Drag between columns updates status. Toggle between table and kanban view.

---

## Implementation Strategy

### Execution Order

Projects are independent — R80.3, BSU, and braden can run as 3 parallel subagents.

**Within braden (sequential dependencies):**
1. BR6 (admin sidebar) — structural, everything else looks better after this
2. BR1 (fix forms) — bug fix, blocks nothing but is embarrassing
3. BR3, BR4 (DB tables) — foundation for Tasks/Staff
4. BR2 (leads status field) — foundation for kanban
5. BR5 (search/filter) — enhances all pages
6. BR7, BR8 (kanban boards) — depends on BR2 + BR3

**R80.3 and BSU items are independent of each other and of braden.**

### Shared Component: ViewToggle

A reusable `ViewToggle` component (button group with LayoutList / LayoutGrid / Kanban icons) should be created once and reused across R80.3 ApprenticeManager, braden Leads, and braden Tasks. Persist selection to localStorage per page key.

### DnD Library

braden needs `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` for kanban boards (BR7 + BR8). R80.3 does not need DnD (YAGNI for small dataset). BSU does not need DnD.

---

## What Was Explicitly Excluded

- **R80.3 DnD reorder** — Small dataset (10-20 apprentices), marginal value
- **R80.3 auto-calculate** — Store architecture change, risky side effects
- **R80.3 stepper/tab unification** — Refactor, not UX improvement
- **BSU recharts** — No real data flowing yet
- **BSU invoice download** — Stripe API work beyond UX scope
- **braden Email mock→real** — Wrong abstraction, needs transactional email service
- **braden inline editing** — Dialog/sheet is simpler and more maintainable
