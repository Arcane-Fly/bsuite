# BSuite Completeness Matrix

_Last Modified: 2026-03-09_
_Version: 1.00W (Working)_
_Status: Working_

## Purpose

This document reconciles `docs/00-master-roadmap.md` against current repo reality for the five active BSuite projects:

- `crm7`
- `conduit`
- `business-suite-unified`
- `braden`
- `R80.3`

It exists because the master roadmap is the canonical status source, but several roadmap items are now stale in both directions:

- some items listed as remaining are already built
- some items described as built are only partially complete
- some older donor requirements still have no proven implementation parity

## Canonical Inputs

- `docs/00-master-roadmap.md`
- `docs/20260227-bsuite-deep-audit-report-v1.00W.md`
- `docs/plans/20260228-bsuite-feature-gap-closure-plan-v1.00W.md`
- `crm7/docs/20260228-crm7-feature-gap-audit-v1.00W.md`
- active repo files in each project

## Status Legend

- `Built` — repo evidence confirms the feature exists in a meaningful way
- `Partial` — some implementation exists, but roadmap scope is not fully met
- `Missing` — no meaningful implementation was found in this audit pass
- `Unverified` — not enough repo evidence gathered yet to certify either way

## Cross-Project Reconciliation Summary

| Project | Area | Roadmap Claim Before Audit | Repo Reality | Status After Audit |
|---|---|---|---|---|
| CRM7 | PWA | Remaining | `vite-plugin-pwa`, manifest, service worker, `src/hooks/usePWA.ts` exist | Built |
| CRM7 | Kanban pipeline board | Remaining | `src/pages/pipeline/kanban.tsx` and DnD board components exist | Built |
| CRM7 | Data management | Remaining | `src/pages/settings/data-management.tsx` exists with tenant wipe flow | Partial |
| CRM7 | Complaints & appeals register | Unclear in older audits | `src/pages/gto-compliance/complaints.tsx`, `useGtoComplaintStore`, and `useGtoAppealStore` exist | Built |
| CRM7 | Insurance register | Unclear in older audits | `src/pages/compliance/insurance-tracker.tsx` and `src/lib/data/insuranceQueries.ts` exist | Built |
| CRM7 | Stand-down continuity management | Missing | migration, route, page, nav wiring, and service layer now exist | Built |
| CRM7 | Module visibility settings | Missing | `settings/module-visibility` now persists tenant module toggles to `tenant_settings.feature_flags` | Built |
| CRM7 | Access and equity adjustment register | Missing | `gto-compliance/access-equity` now persists adjustment records to `gto_access_equity_adjustments` | Built |
| CRM7 | Bulk operations admin tooling | Missing | `settings/bulk-operations` now exposes store-backed bulk update and delete flows for tenant datasets | Built |
| CRM7 | Audit-ready export bundles | Missing | `gto-compliance/evidence` now exports JSON audit bundles per element and per sub-standard | Built |
| CRM7 | `@bsuite/charge-calc` | Remaining | shared package is imported in CRM7 charge-rate and BOOT flows | Partial |
| Conduit | Scout AI assistant | Remaining | `src/app/api/ai/chat/route.ts`, `useAIChat.ts`, AI UI components exist | Built |
| Conduit | Advanced pipeline analytics | Remaining placeholder | analytics route and server data fetch exist | Partial |
| Conduit | Candidate documents UI | Remaining | no dashboard documents route found in this pass | Missing |
| BSU | Stripe billing portal | Remaining | billing page, checkout flow, customer portal flow, subscription hook exist | Partial |
| BSU | Session handoff + AppSwitcher | Remaining | `src/components/AppSwitcher.tsx` exists | Partial |
| BSU | Idea Hub | Remaining | no Idea Hub files found in this pass | Missing |
| Braden | SEO + lead capture | Remaining | prerender script, JSON-LD, lead-capture wiring all exist | Partial |
| Braden | Confirmation email | Remaining | form flow invokes `email-dispatcher` after lead capture | Built |
| R80.3 | PWA + offline | Remaining | `vite-plugin-pwa` and manifest exist | Partial |
| R80.3 | Wage calc test suite | Remaining | real Vitest suites exist, but 90%+ critical-path target unproven | Partial |
| R80.3 | `@bsuite/charge-calc` | Remaining | package dependency and bridge layer exist | Partial |

## Project Snapshots

### CRM7

**Verified built**

- PWA infrastructure
- Kanban pipeline board
- complaints and appeals register
- insurance register
- stand-down continuity management
- dead-surface cleanup across multiple owner flows
- settings data-management route
- shared calc package adoption in charge-rate and BOOT surfaces

**Verified partial**

- data management beyond wipe flow
- Tier 3-4 completeness in financial, compliance, WHS, comms, reports
- AI cost tracking
- compliance automation
- advanced reporting

**Verified missing or still unproven**

- full field-level parity against GTO standards evidence requirements

### Conduit

**Verified built**

- Scout AI route, hook, and UI
- analytics route with server-side data fetch

**Verified partial**

- analytics depth
- some secondary settings and edit-route completeness

**Verified missing or still unproven**

- candidate documents dashboard route/UI
- complete feature parity for all secondary flows claimed by donor docs

### business-suite-unified

**Verified built**

- billing page
- subscription hook
- checkout and customer portal client flows
- AppSwitcher component

**Verified partial**

- Stripe billing end-to-end completeness
- session handoff rollout across all apps

**Verified missing or still unproven**

- Idea Hub
- cross-app notifications
- unified settings management
- usage analytics dashboard

### Braden

**Verified built**

- SEO head component
- JSON-LD on key marketing pages
- prerender script
- lead-capture wiring
- confirmation email invocation

**Verified partial**

- GA4 rollout appears scaffolded but still uses placeholder measurement ID
- full SEO/performance optimization scope remains unproven

### R80.3

**Verified built**

- PWA scaffolding
- shared calc bridge to `@bsuite/charge-calc`
- multiple Vitest suites

**Verified partial**

- offline maturity
- legally critical coverage target
- shared calc convergence goal

## Immediate Conclusions

1. The suite is materially more complete than some roadmap rows still imply.
2. The roadmap must distinguish `Built`, `Partial`, and `Missing` instead of treating all remaining work as binary.
3. CRM7 still carries the largest remaining true completeness burden because GTO standards evidence coverage is not yet proven field-by-field even after complaints, insurance, and stand-down were verified.
4. BSU Idea Hub and Conduit candidate documents remain high-confidence missing features.
5. Braden and R80.3 are further along than the roadmap currently states, but still not fully closed out.

## Next Audit Artifacts

- `crm7/docs/20260309-crm7-gto-owner-flow-completeness-matrix-v1.00W.md`
- updates to `docs/00-master-roadmap.md`
