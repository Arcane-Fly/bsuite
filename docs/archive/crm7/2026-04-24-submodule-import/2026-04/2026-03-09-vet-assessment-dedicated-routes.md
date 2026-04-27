# VET Assessment Dedicated Routes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Replace the placeholder VET assessment actions with dedicated create, detail, and edit routes backed by the real `vet_assessments` table and a shared metadata-ready assessment schema.

**Architecture:** Normalize the shared assessment abstraction to `vet_assessments`, add one reusable assessment schema/config layer, then build canonical `/vet/assessments/create`, `/vet/assessments/:id`, and `/vet/assessments/:id/edit` pages. The list page becomes a projection that navigates into those canonical routes and uses the corrected store for destructive actions.

**Tech Stack:** React, TypeScript, Wouter, TanStack Query, React Hook Form, Zod, Supabase, Zustand store factory.

---

### Task 1: Normalize the shared VET assessment abstraction

**Files:**
- Modify: `src/types/entities.ts`
- Modify: `src/stores/assessmentStore.ts`
- Create: `src/lib/vet-assessments.ts`

**Steps:**
1. Align `Assessment` to the actual `vet_assessments` schema.
2. Point `useAssessmentStore` at `vet_assessments` and filter on `apprentice_id` + `status`.
3. Add shared assessment form schema, mapping helpers, and fetch helpers for routes.

### Task 2: Build canonical VET assessment routes

**Files:**
- Create: `src/components/vet/AssessmentForm.tsx`
- Create: `src/pages/vet/assessments/create.tsx`
- Create: `src/pages/vet/assessments/[id]/index.tsx`
- Create: `src/pages/vet/assessments/[id]/edit.tsx`

**Steps:**
1. Create one reusable form component driven by the shared schema.
2. Build create route with real insert behavior.
3. Build detail route with real status progression and delete action.
4. Build edit route with real update behavior.

### Task 3: Rewire the list page and app routes

**Files:**
- Modify: `src/pages/vet/assessments/index.tsx`
- Modify: `src/App.tsx`

**Steps:**
1. Replace placeholder actions with navigation to create/detail/edit routes.
2. Use the corrected assessment mapping for list rendering.
3. Keep delete on the list page live and safe.
4. Register the new protected routes in `App.tsx`.

### Task 4: Verify

**Files:**
- Verify: `src/pages/vet/assessments/index.tsx`
- Verify: `src/pages/vet/assessments/create.tsx`
- Verify: `src/pages/vet/assessments/[id]/index.tsx`
- Verify: `src/pages/vet/assessments/[id]/edit.tsx`
- Verify: `src/lib/vet-assessments.ts`
- Verify: `src/stores/assessmentStore.ts`
- Verify: `src/types/entities.ts`
- Verify: `src/App.tsx`

**Steps:**
1. Run `pnpm typecheck` in `crm7`.
2. Fix any route/schema/store mismatches immediately.
3. Update the working todo list to mark implementation and verification progress.
