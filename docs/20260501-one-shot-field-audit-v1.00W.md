# BSuite — One-Shot Field Audit (WS-E.5) (v1.00W)

**Status:** Working (framework, matrix fill in Phase 4)
**Scope:** Every `<form>` / `useForm` / Zod schema across CRM7, BSU, R80.3, conduit, braden, throughput. Per-field classification + compliance status.
**Authority:** `docs/20260227-dry-one-shot-architecture-v1.01A.md` §4 Auto-Population Rules, §6 Violations; ADR-0006 (Contact Propagation).
**Purpose:** Enforce the enter-once-appears-everywhere doctrine at the field level. Every form field is classified; non-compliant fields land on the Phase 4 fix queue.

---

## Classification

| Class | Meaning | Implementation rule |
|---|---|---|
| **(a) Canonical write** | This is the single location where this data enters the system. | Owning app per §1 ownership map; never duplicated elsewhere. |
| **(b) FK reference** | The field references another entity that has a canonical write surface elsewhere. | MUST use a Tier-3 EntitySelector (§3). Free-text equivalents are violations. |
| **(c) Derived** | Value computed from other entities / lookup tables. | MUST render read-only (e.g. read-only badge); no user-writable input. `rams_funding_for(...)` is the archetype. |
| **(d) Auxiliary** | App-local, no propagation, no FK (e.g. UI preferences, per-record notes). | No constraint beyond normal validation. |

## Audit matrix template (filled in Phase 4)

Per app, one table per form / Zod schema / useForm hook. Columns:

| Field name | Classification | Current behaviour | Required fix | Fix PR ID |
|---|---|---|---|---|
| (example) `client_name` | (b) FK reference | Free-text `<input>` | Replace with `ClientSelector`; drop field in Zod schema; add `client_id` FK | WS-E.5-crm7-<formname> |

### CRM7 forms (Phase 4 Discovery pending)

| Form | File | Status |
|---|---|---|
| Apprentice create | `crm7/src/pages/apprentices/new.tsx` or equivalent | 🔲 |
| Apprentice edit | `crm7/src/pages/apprentices/[id]/edit.tsx` | 🔲 |
| Client create | `crm7/src/pages/clients/new.tsx` | 🔲 |
| Client edit | `crm7/src/pages/clients/[id]/edit.tsx` | 🔲 |
| Placement create | `crm7/src/pages/placements/new.tsx` | 🔲 |
| Placement edit | `crm7/src/pages/placements/[id]/edit.tsx` | 🔲 |
| Invoice create | `crm7/src/pages/financial/invoice-new.tsx` | 🔲 |
| Timesheet entry | `crm7/src/pages/timesheets/...` | 🔲 |
| Funding claim create | `crm7/src/pages/funding/...` | 🔲 |
| Contact create / edit | `crm7/src/pages/contacts/...` | 🔲 |
| Supervisor create / edit | `crm7/src/pages/supervisors/...` | 🔲 |
| Qualification create / edit (VET section) | `crm7/src/pages/vet/qualifications/...` | 🔲 |
| Training provider create / edit | `crm7/src/pages/training-providers/...` | 🔲 |
| Assessment create / edit | `crm7/src/pages/assessments/...` | 🔲 |
| WHS incident report | `crm7/src/pages/whs/incidents/...` | 🔲 |
| Compliance record create | `crm7/src/pages/compliance/...` | 🔲 |
| Custom page create / edit (per ADR-0001 canonical) | `crm7/src/pages/settings/custom-page-*` | 🔲 |
| Schema builder (per ADR-0002) | `crm7/src/pages/settings/schema-builder/*` | 🔲 |
| (plus all Developer Portal sub-surfaces) | `crm7/src/pages/developer/...` | 🔲 |

### BSU forms (Phase 4 Discovery pending)

| Form | File | Status |
|---|---|---|
| Tenant create / edit (Platform admin) | `business-suite-unified/src/pages/Admin/...` | 🔲 |
| User invite / role admin | `business-suite-unified/src/pages/Admin/...` | 🔲 |
| Organization create | `business-suite-unified/src/pages/Organization/CreateOrganization.tsx` | 🔲 |
| Billing / subscription | `business-suite-unified/src/pages/Billing/...` | 🔲 |
| AdminBranding | `business-suite-unified/src/pages/Admin/AdminBranding.tsx` | 🔲 |
| Lead capture (via edge function, not a form per se) | `business-suite-unified/supabase/functions/lead-capture/` | 🔲 |

### R80.3 forms

| Form | File | Status |
|---|---|---|
| Rate calculator inputs | `R80.3/src/pages/rates/...` | 🔲 |
| Award rate edit (admin) | `R80.3/src/pages/admin/awards/...` | 🔲 |
| Apprentice rate override (per-apprentice) | `R80.3/src/pages/apprentices/...` | 🔲 |
| Training fees config | `R80.3/src/pages/training-fees/...` | 🔲 |
| Payday super config | `R80.3/src/pages/payday-super/...` | 🔲 |

### conduit forms

| Form | File | Status |
|---|---|---|
| Candidate create | `conduit/src/app/candidates/new/...` | 🔲 |
| Job post | `conduit/src/app/jobs/new/...` | 🔲 |
| Application tracker | `conduit/src/app/applications/...` | 🔲 |
| Pipeline stage config | `conduit/src/app/settings/pipeline/...` | 🔲 |
| Compliance check | `conduit/src/app/compliance/...` | 🔲 |

### braden forms

| Form | File | Status |
|---|---|---|
| Website lead capture | `braden/src/pages/contact/...` | 🔲 |
| Admin surfaces (layout editor, etc.) | `braden/src/pages/admin/...` | 🔲 |

### throughput forms

| Form | File | Status |
|---|---|---|
| Idea create / edit | `throughput/src/pages/ideas/...` | 🔲 |
| Business plan section edit | `throughput/src/pages/business-plan/...` | 🔲 |
| Project create / edit | `throughput/src/pages/projects/...` | 🔲 |

## Phase 4 WS-E.5 execution protocol

For each app:

1. **File-picker sweep** — enumerate every `<form>` / `useForm` / Zod schema in `src/`.
2. **Per-form audit** — for each field, classify (a/b/c/d) and record current behaviour.
3. **Violation list** — every (b) field using free-text instead of EntitySelector, every (c) field that's user-writable, every (a) field duplicated across apps.
4. **Atomic fix PRs** — one PR per form (or per logical grouping), replacing violations with compliant implementations. Old fields deleted in the same PR.
5. **Matrix fill** — this doc is the live tracker; fix-PR ID populated when fix lands.

## CI lint extensions (lands Phase 6 BL-016)

Extend the existing `packages/dry-lint/no-free-text-where-fk` rule:

1. **Detect (b) violations** — flag form fields named like `*_name`, `*_email`, `*_phone`, `*_company`, `*_code`, `*_abn`, `*_address` on a form that lacks a corresponding `*_id` field and where the `*_name` pattern matches a known canonical table. Severity: error.
2. **Detect (c) violations** — flag form fields classified as derived (via an annotation mechanism — e.g. `// @derived-from rams_funding_for` comment) that have `<input>` / `<textarea>` / writable behaviour. Severity: error.
3. **Detect cross-app (a) duplication** — check `ownership-map.json` and flag any app creating / editing an entity whose canonical owner is a different app (unless it's a junction-table write by a reader role).

## Acceptance criteria (WS-E.5 complete)

1. Every form in the matrix populated with per-field classification.
2. Zero (b) violations across the 6 apps.
3. Zero (c) violations across the 6 apps.
4. Zero cross-app (a) duplications (per ownership-map).
5. CI lint rule set active; breaks PRs that would introduce new violations.
6. E2E test: enter a contact once in CRM7; verify it appears via the relevant selectors in all 4 reader apps without re-entry. Same for client, apprentice, qualification.

## What this unblocks

- **WS-E.1** (Client↔Host unification) — a subset of this audit; the audits proceed in parallel with WS-E.1 matrix linking to specific rows here.
- **WS-E.2 / WS-E.3 / WS-E.4** (qualification junctions, training-provider constraints, RAMS derivation) — each is a specific set of (b) + (c) classification instances.
- **WS-E.6** (DRY spec bump to v1.02A) — §12 Propagation Completeness references this audit as the compliance mechanism.
- **BL-016** (CI lint locked) — needs a clean baseline from this audit.

## Open tasks

- Phase 4 per-app discovery × 6 apps. Expected scale: ~100-200 forms across the suite; 500-1500 individual fields to classify.
- Annotation convention for (c) derived fields — propose `// @derived-from <source>` JSDoc-style comment or a `type DerivedField<...>` wrapper. Decision in Phase 4 first-app audit.

---

## Revision log

- 2026-05-01 v1.00W — framework + empty per-app form lists + Phase 4 protocol. Matrix filled during Phase 4 WS-E.5 execution.
