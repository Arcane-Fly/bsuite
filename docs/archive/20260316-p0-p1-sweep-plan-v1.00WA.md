> **ARCHIVED** — All items in this plan are complete as of 2026-03-16. Ported from `/home/braden/.windsurf/plans/p0-p1-sweep-07fa37.md` for historical reference.

---

# Full P0+P1 Cross-Project Gap Closure

Implements all genuinely missing P0/P1 items identified after codebase audit: Conduit candidate documents tab, BSU Idea Hub, Braden GA4 env var, and gap report corrections.

---

## Audit Corrections (gap report had stale data)

The gap report `docs/20260316-bsuite-gap-report-v1.00W.md` contained several P0 items that are **already implemented**:

| Claim | Reality |
|---|---|
| P0-2 Dead route `/contacts/:id` | EXISTS — `crm7/src/pages/contacts/[id]/index.tsx` + wired in App.tsx |
| P0-3 Dead route `/contacts/:id/edit` | EXISTS — `crm7/src/pages/contacts/[id]/edit.tsx` + wired |
| P0-4 Dead route `/placements/:id` | EXISTS — `crm7/src/pages/placements/[id].tsx` + wired |
| P0-5 Dead route `/placements/create` | EXISTS — `crm7/src/pages/placements/create.tsx` + wired |
| P1-1 EntitySelector missing | EXISTS — 6 selectors in `crm7/src/components/entity/selectors/` |
| P1-2 DataContextSimple in active pages | Only in demo components, not production pages |
| P1-3/4 Training sign-off / host agreement | `hostAgreementStore.ts` + `hosts/agreements/index.tsx` exist |

**These will be corrected in Step 1.**

---

## Confirmed Real Gaps

| # | Gap | Project | DB |
|---|-----|---------|-----|
| 1 | Candidate documents tab | Conduit | `r7_documents` exists |
| 2 | Idea Hub | BSU | `ideas` table exists |
| 3 | GA4 hardcoded ID | Braden | env var |

---

## Step 1 — Correct Gap Report (bsuite)

**File:** `docs/20260316-bsuite-gap-report-v1.00W.md`

- Remove P0-2/3/4/5 (dead routes — already built)
- Remove P1-1 (EntitySelectors — 6 exist in `components/entity/selectors/`)
- Remove P1-2 (DataContextSimple — demo only, not production)
- Remove P1-3/4 (training sign-off / host agreements — stores + pages exist)
- Add "Audit Corrections" section noting what was wrong and why
- Update cross-project theme audit summary (already confirmed clean)
- Bump version to v1.01W

---

## Step 2 — Conduit: Candidate Documents Tab

**DB:** `r7_documents` (`id`, `tenant_id`, `entity_type`, `entity_id`, `document_type`, `file_name`, `file_url`, `file_size`, `mime_type`, `verified`, `verified_at`, `expires_at`, `created_at`)

Query: `r7_documents.select('*').eq('entity_type', 'candidate').eq('entity_id', candidateId)`

### Files to create

**`conduit/src/app/(dashboard)/candidates/[id]/documents/page.tsx`**
```tsx
import type { Metadata } from 'next'
import { CandidateDocumentsView } from './_view'
export const metadata: Metadata = { title: 'Candidate Documents' }
export default function CandidateDocumentsPage() {
  return <CandidateDocumentsView />
}
```

**`conduit/src/app/(dashboard)/candidates/[id]/documents/_view.tsx`** — `'use client'`
- Fetch `r7_documents` where `entity_type='candidate'` AND `entity_id=params.id`
- Display table: file name, document type, size, verified badge, expiry, download link
- Empty state: "No documents uploaded yet"
- Upload button: opens Supabase Storage upload → inserts row in `r7_documents`
- Delete with confirm dialog
- Verified badge (green checkmark / grey pending)

### Files to edit

**`conduit/src/app/(dashboard)/candidates/[id]/_view.tsx`**
- Add tab navigation bar above the main grid: `Overview | Documents`
- Use Next.js `Link` for tab switching via sub-routes
- `Overview` = current content at `candidates/[id]`
- `Documents` = `candidates/[id]/documents`
- Detect active tab from `usePathname()`

---

## Step 3 — BSU: Idea Hub

**DB:** `ideas` (`id`, `title`, `description`, `category`, `status`, `user_id`, `project_id`, `created_at`, `updated_at`)

Status values: `draft | submitted | under_review | approved | rejected`
Categories (inferred from BSU context): `feature | bug | improvement | other`

### Files to create

**`business-suite-unified/src/pages/IdeaHub.tsx`**

Layout:
- Header: "Idea Hub" title + "Submit Idea" button
- Filter bar: status chips (All / Submitted / Under Review / Approved)
- Idea cards grid: title, description excerpt, category badge, status badge, submitted date, author
- Create/edit sheet (Radix `Sheet` or inline): title, description (textarea), category select
- Delete with confirm
- Supabase: uses shared `supabase` client from `src/lib/supabase.ts`

### Files to edit

**`business-suite-unified/src/components/AppContent.tsx`**
- Add `import IdeaHub from '../pages/IdeaHub'`
- Add `<Route path="/ideas" element={<IdeaHub />} />` inside MainApp Routes

**BSU sidebar/navigation** (find nav component, add Ideas entry with `Lightbulb` icon at `/ideas`)

---

## Step 4 — Braden: GA4 Env Var

**`braden/src/lib/analytics.ts`**
```diff
- const GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX';
+ const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID ?? 'G-XXXXXXXXXX';
```

**`braden/.env.example`** — add:
```
VITE_GA4_MEASUREMENT_ID=
```

No other changes needed — the existing `if (GA4_MEASUREMENT_ID === 'G-XXXXXXXXXX') { return }` guard already handles the empty/placeholder case gracefully.

---

## Step 5 — Typecheck + Commit

```bash
# Conduit
cd conduit && pnpm typecheck

# BSU
cd business-suite-unified && pnpm typecheck

# Commits (one per project)
git commit -m "feat(conduit): add candidate documents tab (r7_documents)"
git commit -m "feat(bsu): add Idea Hub page (/ideas route)"
git commit -m "fix(braden): move GA4 ID to VITE_GA4_MEASUREMENT_ID env var"
git commit -m "docs(bsuite): correct gap report P0/P1 stale items"
git push
```

---

## Out of Scope (separate plan needed)

- CRM7 Tier 3-4 page wiring (financial, compliance, WHS, comms, reports) — 2w effort
- BSU cross-app notifications (Supabase Realtime pub/sub) — 3d effort
- R80.3 test coverage push to 70% — ongoing
- BSU Stripe end-to-end verification — 1w effort
