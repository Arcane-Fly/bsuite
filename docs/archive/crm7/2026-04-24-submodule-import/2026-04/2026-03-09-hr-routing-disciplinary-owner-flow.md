# HR Routing and Disciplinary Owner Flow Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Repair the missing HR route surface in CRM7 and move disciplinary case ownership from an in-page modal to a canonical detail route.

**Architecture:** Add a small `/hr` landing page, register the existing HR pages in `App.tsx`, create `/hr/disciplinary/:id` as the canonical owner route for disciplinary case detail/action progression, and rewire the disciplinary list page to navigate into that route instead of holding the full workflow in a modal.

**Tech Stack:** React, TypeScript, Wouter, Zustand store factory, Supabase-backed entity stores, Radix UI.

---

### Task 1: Register the HR route surface

**Files:**
- Create: `src/pages/hr/index.tsx`
- Modify: `src/App.tsx`

**Steps:**
1. Add an HR landing page with links to disciplinary, probation completion, and termination.
2. Register `/hr`, `/hr/disciplinary`, `/hr/probation-completion`, and `/hr/termination` in `App.tsx`.

### Task 2: Create a canonical disciplinary detail route

**Files:**
- Create: `src/pages/hr/disciplinary/[id].tsx`
- Modify: `src/pages/hr/disciplinary.tsx`

**Steps:**
1. Build a route-backed detail page for a disciplinary case using the live `disciplinary_cases` and `disciplinary_actions` stores.
2. Move the action timeline, new action form, sign-off, and resolve flow onto the detail route.
3. Replace list-page modal entry with route navigation.

### Task 3: Verify and align navigation

**Files:**
- Modify: `src/pages/hr/termination.tsx`
- Verify: `src/pages/hr/index.tsx`
- Verify: `src/pages/hr/disciplinary.tsx`
- Verify: `src/pages/hr/disciplinary/[id].tsx`
- Verify: `src/App.tsx`

**Steps:**
1. Ensure back-navigation targets real registered HR routes.
2. Run `pnpm typecheck` in `crm7`.
3. Fix any route/store/type mismatches immediately.
