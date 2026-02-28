# CRM7 Page Inventory v1.00W

> Generated 2026-02-28 via automated audit
> Total files: 148 | Routed: 130 | Unrouted/orphaned: 9 | Sub-components: 3 | Superseded: 2 | Utility: 4

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total page files | 148 |
| Routed in App.tsx | 130 |
| Unrouted (orphaned / dev-only) | 9 |
| Sub-components (imported by parent page) | 3 |
| Superseded (replaced by newer file) | 2 |
| Utility (404 etc.) | 4 |

### Data Source Breakdown

| Data Source | Count | Percentage |
|-------------|-------|------------|
| store | 38 | 26% |
| direct-supabase | 48 | 32% |
| mixed (store + supabase) | 36 | 24% |
| static (no backend data) | 26 | 18% |

### Status Breakdown

| Status | Count |
|--------|-------|
| functional | 145 |
| partial (hardcoded stats) | 3 |
| stub | 0 |

---

## Auth Pages (public routes)

| Page Path | Route | Data Source | Status | Lines | Notes |
|-----------|-------|-------------|--------|-------|-------|
| `auth/login.tsx` | `/auth/login` | direct-supabase | functional | 243 | Supabase auth |
| `auth/register.tsx` | `/auth/register` | static | functional | 284 | Form with validation |
| `auth/callback.tsx` | `/auth/callback` | mixed | functional | 143 | Session handling |
| `auth/reset-password.tsx` | `/auth/reset-password` | direct-supabase | functional | 216 | Password reset |
| `auth/accept-invite.tsx` | `/auth/accept-invite` | direct-supabase | functional | 122 | Invite handling |
| `auth/business-suite-sso.tsx` | `/auth/business-suite-sso` | static | functional | 74 | OAuth 2.1 PKCE |

## Dashboard

| Page Path | Route | Data Source | Status | Lines |
|-----------|-------|-------------|--------|-------|
| `Dashboard.tsx` | `/dashboard` | direct-supabase | functional | 383 |

## Contacts & Communications

| Page Path | Route | Data Source | Status | Lines | Notes |
|-----------|-------|-------------|--------|-------|-------|
| `contacts/index.tsx` | `/contacts` | direct-supabase | functional | 954 | Full CRUD |
| `contacts/modern-contacts.tsx` | `/contacts/modern` | mixed | functional | 300 | |
| `contacts/groups/index.tsx` | `/contacts/groups` | direct-supabase | functional | 414 | |
| `contacts/tags/index.tsx` | `/contacts/tags` | direct-supabase | functional | 399 | |
| `communications/index.tsx` | `/communications` | mixed | functional | 364 | |
| `communications/compose.tsx` | `/communications/compose` | store | functional | 263 | |
| `communications/templates.tsx` | `/communications/templates` | store | functional | 333 | |
| `communications/mail-merge.tsx` | `/communications/mail-merge` | store | functional | 255 | |

## CRM Core (Leads, Clients, Opportunities, Deals, Pipeline)

| Page Path | Route | Data Source | Status | Lines |
|-----------|-------|-------------|--------|-------|
| `leads/index.tsx` | `/leads` | store | functional | 911 |
| `clients/index.tsx` | `/clients` | store | functional | 734 |
| `opportunities/index.tsx` | `/opportunities` | store | functional | 904 |
| `pipeline/index.tsx` | `/pipeline` | store | functional | 146 |
| `deals/index.tsx` | `/deals` | store | functional | 171 |

## Apprentices

| Page Path | Route | Data Source | Status | Lines | Notes |
|-----------|-------|-------------|--------|-------|-------|
| `apprentices/index.tsx` | `/apprentices` | store | functional | 543 | |
| `apprentices/create.tsx` | `/apprentices/create` | static | functional | 68 | Form shell |
| `apprentices/[id].tsx` | `/apprentices/:id` | direct-supabase | functional | 480 | |
| `apprentices/completion/index.tsx` | `/apprentices/completion` | direct-supabase | functional | 467 | |
| `apprentices/progress/index.tsx` | `/apprentices/progress` | mixed | functional | 594 | |
| `apprentices/records/index.tsx` | `/apprentices/records` | mixed | functional | 177 | |
| `apprentices/training/index.tsx` | `/apprentices/training` | direct-supabase | functional | 343 | |
| `apprentices/recruitment/index.tsx` | `/apprentices/recruitment` | mixed | functional | 273 | |
| `apprentices/recruitment/onboarding/index.tsx` | `/apprentices/recruitment/onboarding` | mixed | functional | 841 | |
| `apprentices/recruitment/selections/index.tsx` | `/apprentices/recruitment/selections` | mixed | functional | 477 | |

## Host Employers

| Page Path | Route | Data Source | Status | Lines | Notes |
|-----------|-------|-------------|--------|-------|-------|
| `hosts/index.tsx` | `/hosts` | store | functional | 646 | |
| `hosts/create.tsx` | `/hosts/create` | direct-supabase | functional | 404 | |
| `hosts/[id].tsx` | `/hosts/:id` | direct-supabase | functional | 810 | |
| `hosts/agreement.tsx` | `/hosts/agreement` | direct-supabase | functional | 305 | |
| `hosts/agreements/index.tsx` | `/hosts/agreements` | direct-supabase | functional | 642 | |
| `hosts/agreements/new.tsx` | _unrouted_ | direct-supabase | functional | 412 | Missing route |
| `hosts/agreements.tsx` | _superseded_ | store | functional | 259 | Replaced by agreements/index |
| `hosts/monitoring.tsx` | `/hosts/monitoring` | direct-supabase | functional | 428 | |
| `hosts/reports.tsx` | `/hosts/reports` | direct-supabase | functional | 560 | |
| `hosts/vacancies/index.tsx` | `/hosts/vacancies` | store | functional | 231 | |
| `hosts/vacancies/new.tsx` | `/hosts/vacancies/new` | direct-supabase | functional | 652 | |
| `hosts/vacancies.tsx` | _superseded_ | store | functional | 264 | Replaced by vacancies/index |

## Quotes & Contracts

| Page Path | Route | Data Source | Status | Lines | Notes |
|-----------|-------|-------------|--------|-------|-------|
| `quotes/index.tsx` | `/quotes` | store | functional | 333 | |
| `quotes/create.tsx` | `/quotes/create` | mixed | functional | 437 | |
| `quotes/[id]/index.tsx` | `/quotes/:id` | mixed | functional | 475 | |
| `contracts/index.tsx` | `/contracts` | direct-supabase | functional | 550 | |
| `contracts/new.tsx` | `/contracts/new` | store | functional | 377 | |
| `contracts/[id].tsx` | `/contracts/:id` | mixed | functional | 431 | |
| `contracts/training/index.tsx` | `/contracts/training` | mixed | functional | 408 | |
| `contracts/training/create.tsx` | `/contracts/training/new` | direct-supabase | functional | 423 | |
| `contracts/training/[id]/index.tsx` | `/contracts/training/:id` | direct-supabase | functional | 891 | |

## Charge Rates & Awards

| Page Path | Route | Data Source | Status | Lines | Notes |
|-----------|-------|-------------|--------|-------|-------|
| `charge-rates/index.tsx` | `/charge-rates` | direct-supabase | functional | 371 | |
| `charge-rates/create.tsx` | _unrouted_ | direct-supabase | functional | 1295 | DRY violation with R80.3 |
| `charge-rates/[id]/index.tsx` | `/charge-rates/:id` | direct-supabase | functional | 327 | |
| `awards/index.tsx` | `/awards` | store | functional | 271 | |
| `awards/create.tsx` | _unrouted_ | direct-supabase | functional | 311 | Missing route |
| `awards/[id]/index.tsx` | `/awards/:id` | mixed | functional | 161 | |
| `awards/[id]/edit.tsx` | `/awards/:id/edit` | direct-supabase | functional | 284 | |

## Claims & Funding

| Page Path | Route | Data Source | Status | Lines | Notes |
|-----------|-------|-------------|--------|-------|-------|
| `claims/index.tsx` | `/claims` | static | functional | 56 | Tab shell |
| `claims/dashboard.tsx` | _sub-component_ | store | functional | 304 | |
| `claims/list.tsx` | _sub-component_ | store | functional | 482 | |
| `claims/new.tsx` | `/claims/new` | store | functional | 1067 | |
| `claims/[id].tsx` | `/claims/:id` | mixed | functional | 796 | |
| `funding-sources/index.tsx` | `/funding-sources` | static | functional | 57 | Tab shell |
| `funding-sources/list.tsx` | `/funding-sources/list` | store | functional | 516 | |
| `funding-sources/new.tsx` | _unrouted_ | store | functional | 490 | Missing route |
| `funding-sources/[id].tsx` | `/funding-sources/:id` | store | functional | 554 | |

## Financial

| Page Path | Route | Data Source | Status | Lines | Notes |
|-----------|-------|-------------|--------|-------|-------|
| `financial/index.tsx` | `/financial` | static | **partial** | 93 | Hardcoded stats |
| `financial/budget/index.tsx` | `/financial/budget` | mixed | functional | 676 | |
| `financial/expenses/index.tsx` | `/financial/expenses` | mixed | functional | 434 | |
| `financial/invoicing/index.tsx` | `/financial/invoicing` | store | functional | 552 | |
| `financial/reports/index.tsx` | `/financial/reports` | mixed | functional | 544 | |

## Payroll & Leave

| Page Path | Route | Data Source | Status | Lines |
|-----------|-------|-------------|--------|-------|
| `payroll/index.tsx` | `/payroll` | store | functional | 270 |
| `payroll/award-rates/index.tsx` | `/payroll/award-rates` | store | functional | 218 |
| `payroll/timesheets/index.tsx` | `/payroll/timesheets` | store | functional | 601 |
| `leave/index.tsx` | `/leave` | store | functional | 422 |
| `leave/request.tsx` | `/leave/request` | store | functional | 404 |
| `timesheets/index.tsx` | `/timesheets` | store | functional | 355 |

## Compliance & GTO Compliance

| Page Path | Route | Data Source | Status | Lines |
|-----------|-------|-------------|--------|-------|
| `compliance/index.tsx` | `/compliance` | store | functional | 328 |
| `compliance/alerts.tsx` | `/compliance/alerts` | direct-supabase | functional | 556 |
| `compliance/create.tsx` | _unrouted_ | direct-supabase | functional | 370 |
| `gto-compliance/index.tsx` | `/gto-compliance` | direct-supabase | functional | 320 |
| `gto-compliance/standard-assessment.tsx` | `/gto-compliance/standard-assessment` | direct-supabase | functional | 417 |
| `gto-compliance/access-equity.tsx` | `/gto-compliance/access-equity` | direct-supabase | functional | 419 |
| `gto-compliance/complaints.tsx` | `/gto-compliance/complaints` | direct-supabase | functional | 532 |
| `gto-compliance/records-management.tsx` | `/gto-compliance/records-management` | direct-supabase | functional | 702 |
| `gto-compliance/risk-management.tsx` | `/gto-compliance/risk-management` | direct-supabase | functional | 925 |

## Progress Reviews

| Page Path | Route | Data Source | Status | Lines |
|-----------|-------|-------------|--------|-------|
| `progress-reviews/index.tsx` | `/progress-reviews` | direct-supabase | functional | 258 |
| `progress-reviews/reviews/index.tsx` | `/progress-reviews/reviews` | direct-supabase | functional | 237 |
| `progress-reviews/templates/index.tsx` | `/progress-reviews/templates` | direct-supabase | functional | 240 |
| `progress-reviews/templates/create.tsx` | `/progress-reviews/templates/create` | direct-supabase | functional | 488 |

## VET Management

| Page Path | Route | Data Source | Status | Lines |
|-----------|-------|-------------|--------|-------|
| `vet/index.tsx` | `/vet` | static | **partial** | 107 |
| `vet/assessments/index.tsx` | `/vet/assessments` | direct-supabase | functional | 615 |
| `vet/qualifications/index.tsx` | `/vet/qualifications` | mixed | functional | 340 |
| `vet/qualifications/create.tsx` | `/vet/qualifications/create` | direct-supabase | functional | 220 |
| `vet/qualifications/import.tsx` | `/vet/qualifications/import` | mixed | functional | 233 |
| `vet/qualifications/[id]/index.tsx` | `/vet/qualifications/:id` | mixed | functional | 533 |
| `vet/qualifications/[id]/edit.tsx` | `/vet/qualifications/:id/edit` | direct-supabase | functional | 1049 |
| `vet/qualifications/[id]/structure.tsx` | `/vet/qualifications/:id/structure` | mixed | functional | 687 |
| `vet/training-packages/index.tsx` | `/vet/training-packages` | direct-supabase | functional | 558 |
| `vet/training-packages/[id]/index.tsx` | `/vet/training-packages/:id` | direct-supabase | functional | 196 |
| `vet/units/index.tsx` | `/vet/units` | direct-supabase | functional | 290 |
| `vet/units/create.tsx` | `/vet/units/create` | direct-supabase | functional | 337 |
| `vet/units/[id]/index.tsx` | `/vet/units/:id` | mixed | functional | 273 |
| `vet/units/[id]/edit.tsx` | `/vet/units/:id/edit` | direct-supabase | functional | 450 |

## WHS (Workplace Health & Safety)

| Page Path | Route | Data Source | Status | Lines |
|-----------|-------|-------------|--------|-------|
| `whs/index.tsx` | `/whs` | static | functional | 230 |
| `whs/incidents/index.tsx` | `/whs/incidents` | static | functional | 73 |
| `whs/inspections/index.tsx` | `/whs/inspections` | static | functional | 45 |
| `whs/reports/index.tsx` | `/whs/reports` | static | functional | 45 |
| `whs/training/index.tsx` | `/whs/training` | static | functional | 45 |
| `whs/workflow/index.tsx` | `/whs/workflow` | static | functional | 45 |
| `whs/host-employers/index.tsx` | `/whs/host-employers` | static | functional | 45 |
| `whs/return-to-work/index.tsx` | `/whs/return-to-work` | store | functional | 539 |
| `whs/return-to-work/[id]/index.tsx` | `/whs/return-to-work/:id` | store | functional | 820 |

## Field Officers

| Page Path | Route | Data Source | Status | Lines |
|-----------|-------|-------------|--------|-------|
| `field-officers.tsx` | `/field-officers` | store | functional | 402 |
| `field-officers/actions/index.tsx` | `/field-officers/actions` | mixed | functional | 459 |
| `field-officers/case-notes/index.tsx` | `/field-officers/case-notes` | mixed | functional | 508 |
| `field-officers/competency/index.tsx` | `/field-officers/competency` | mixed | functional | 435 |
| `field-officers/incidents/index.tsx` | `/field-officers/incidents` | mixed | functional | 509 |
| `field-officers/site-assessment.tsx` | `/field-officers/site-assessment` | static | functional | 304 |

## External Employees & Labour Hire

| Page Path | Route | Data Source | Status | Lines |
|-----------|-------|-------------|--------|-------|
| `external-employees/index.tsx` | `/external-employees` | static | functional | 248 |
| `external-employees/apprentices/index.tsx` | `/external-employees/apprentices` | static | functional | 379 |
| `external-employees/workers/index.tsx` | `/external-employees/workers` | mixed | functional | 354 |
| `labour-hire/workers/index.tsx` | `/labour-hire/workers` | mixed | functional | 540 |
| `labour-hire/workers/[id].tsx` | `/labour-hire/workers/:id` | mixed | functional | 572 |

## Documents

| Page Path | Route | Data Source | Status | Lines |
|-----------|-------|-------------|--------|-------|
| `documents/index.tsx` | `/documents` | mixed | functional | 342 |
| `documents/management.tsx` | `/documents/management` | mixed | functional | 342 |
| `documents/signatures.tsx` | `/documents/signatures` | store | functional | 142 |

## Portals

| Page Path | Route | Data Source | Status | Lines |
|-----------|-------|-------------|--------|-------|
| `portal/index.tsx` | `/portal` | mixed | functional | 132 |
| `portal/worker-portal.tsx` | `/portal/worker` | mixed | functional | 266 |
| `portal/host-employer.tsx` | `/portal/host-employer` | direct-supabase | functional | 332 |
| `portal/training-provider.tsx` | `/portal/training-provider` | direct-supabase | functional | 303 |
| `portal/workplace-portal.tsx` | `/portal/workplace` | direct-supabase | functional | 278 |

## Analytics, Reports & Insights

| Page Path | Route | Data Source | Status | Lines |
|-----------|-------|-------------|--------|-------|
| `analytics/index.tsx` | `/analytics` | direct-supabase | functional | 219 |
| `reports/index.tsx` | `/reports` | direct-supabase | functional | 491 |
| `insights/index.tsx` | `/insights` | direct-supabase | functional | 210 |

## Tasks, Calendar, Notifications

| Page Path | Route | Data Source | Status | Lines |
|-----------|-------|-------------|--------|-------|
| `tasks/index.tsx` | `/tasks` | store | functional | 931 |
| `calendar/index.tsx` | `/calendar` | store | functional | 368 |
| `notifications/index.tsx` | `/notifications` | store | functional | 265 |

## Skills, Mentors, Placements, Competencies

| Page Path | Route | Data Source | Status | Lines |
|-----------|-------|-------------|--------|-------|
| `skills/index.tsx` | `/skills` | store | functional | 232 |
| `mentors/index.tsx` | `/mentors` | mixed | functional | 516 |
| `placements/index.tsx` | `/placements` | store | functional | 816 |
| `competencies/index.tsx` | `/competencies` | mixed | functional | 886 |

## Enrichment

| Page Path | Route | Data Source | Status | Lines | Notes |
|-----------|-------|-------------|--------|-------|-------|
| `enrichment/index.tsx` | `/enrichment` | static | functional | 96 | Permission-gated feature cards |
| `enrichment/programs/index.tsx` | `/enrichment/programs` | mixed | functional | 225 | |

## AI & Workflows

| Page Path | Route | Data Source | Status | Lines |
|-----------|-------|-------------|--------|-------|
| `ai-plugins/index.tsx` | `/ai-plugins` | static | functional | 51 |
| `workflows/index.tsx` | `/workflows` | store | functional | 169 |

## Settings

| Page Path | Route | Data Source | Status | Lines | Notes |
|-----------|-------|-------------|--------|-------|-------|
| `settings/index.tsx` | `/settings` | static | functional | 166 | |
| `settings/configuration.tsx` | `/settings/configuration` | mixed | functional | 1150 | Large config page |
| `settings/organization.tsx` | `/settings/organization` | direct-supabase | functional | 612 | |
| `settings/permissions.tsx` | `/settings/permissions` | mixed | functional | 849 | |
| `settings/permissions-demo.tsx` | _unrouted_ | mixed | functional | 570 | Dev/test only |
| `settings/user-management.tsx` | `/settings/users` | mixed | functional | 698 | |
| `settings/custom-fields.tsx` | `/settings/custom-fields` | direct-supabase | functional | 370 | |
| `settings/custom-fields-admin.tsx` | `/settings/custom-fields-admin` | store | functional | 413 | |
| `settings/data-sharing.tsx` | `/settings/data-sharing` | direct-supabase | functional | 282 | |
| `settings/data-management.tsx` | `/settings/data-management` | direct-supabase | functional | 239 | |
| `settings/import-export.tsx` | `/settings/import-export` | mixed | functional | 212 | |
| `settings/import-export-data.tsx` | `/settings/import-export-data` | store | functional | 138 | |
| `settings/integrations.tsx` | _unrouted_ | mixed | functional | 1322 | Large page, no route |
| `settings/audit-log.tsx` | `/settings/audit-log` | direct-supabase | functional | 611 | |
| `settings/govt-integrations.tsx` | `/settings/govt-integrations` | store | functional | 190 | |
| `settings/tester-licenses.tsx` | `/settings/tester-licenses` | direct-supabase | functional | 214 | |

## Pricing & Admin

| Page Path | Route | Data Source | Status | Lines | Notes |
|-----------|-------|-------------|--------|-------|-------|
| `pricing.tsx` | `/pricing` | static | **partial** | 109 | Stripe TODO |
| `admin/award-updates.tsx` | _unrouted_ | direct-supabase | functional | 437 | |

## Dev/Test Pages

| Page Path | Route | Data Source | Status | Lines |
|-----------|-------|-------------|--------|-------|
| `api-test.tsx` | _unrouted_ | static | functional | 75 |
| `fair-work-demo.tsx` | _unrouted_ | static | functional | 429 |

---

## Unrouted Pages Requiring Attention

| Page | Lines | Likely Issue |
|------|-------|-------------|
| `charge-rates/create.tsx` | 1295 | Orphaned DRY violation with R80.3 |
| `awards/create.tsx` | 311 | Missing route registration |
| `compliance/create.tsx` | 370 | Missing route registration |
| `admin/award-updates.tsx` | 437 | No admin section in router |
| `settings/integrations.tsx` | 1322 | Large page with no route |
| `hosts/agreements/new.tsx` | 412 | Missing route registration |
| `funding-sources/new.tsx` | 490 | Missing route registration |

## Superseded Files (can be removed)

| File | Replaced By |
|------|------------|
| `hosts/agreements.tsx` | `hosts/agreements/index.tsx` |
| `hosts/vacancies.tsx` | `hosts/vacancies/index.tsx` |
