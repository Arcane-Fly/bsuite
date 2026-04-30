# CRM7 Page Inventory v1.00W

> Generated 2026-03-01 | Post-RBAC-unification audit
> Total page files: 155 | Routed in App.tsx: 139 | Auth/utility: 7 | Unrouted/orphaned: 9

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total page files | 155 |
| Routed in App.tsx (protected) | 139 |
| Public auth routes | 5 |
| Utility (404, not-found) | 2 |
| Unrouted / orphaned / superseded | 9 |

### Data Source Breakdown

| Data Source | Count | Percentage |
|-------------|-------|------------|
| Zustand store | 40 | 26% |
| Direct Supabase (useQuery) | 45 | 29% |
| Mixed (store + Supabase) | 32 | 21% |
| Static / nav-only (no backend) | 28 | 18% |
| Component wrapper (delegates to child) | 10 | 6% |

### Status Breakdown

| Status | Count | Description |
|--------|-------|-------------|
| Functional | 98 | Fetches real data from Supabase/store, renders tables/forms |
| Partial | 32 | Some functionality wired, TODOs remain, or creation disabled |
| Stub | 16 | Minimal shell, no data fetching, navigation hub only |
| Wrapper | 9 | Thin wrapper delegating to child component |

### Data Criticality Breakdown

| Criticality | Count | Description |
|-------------|-------|-------------|
| Financial | 28 | Charge rates, billing, invoicing, payroll, claims, funding |
| Compliance | 27 | WHS, GTO standards, inspections, compliance alerts, BOOT |
| Operational | 55 | Apprentices, hosts, placements, contracts, field officers |
| Informational | 35 | Dashboard, reports, analytics, settings, CRM contacts |
| Auth/System | 10 | Login, register, SSO, portals, pricing |

---

## Page Inventory

### Auth Pages (Public)

| # | Page | Route | File | Data Source | Criticality | Status |
|---|------|-------|------|-------------|-------------|--------|
| 1 | Auth Callback | `/auth/callback` | `auth/callback.tsx` | supabase auth | auth | functional |
| 2 | Business Suite SSO | `/auth/business-suite-sso` | `auth/business-suite-sso.tsx` | BS OAuth | auth | functional |
| 3 | Reset Password | `/auth/reset-password` | `auth/reset-password.tsx` | supabase auth | auth | functional |
| 4 | Accept Invite | `/auth/accept-invite` | `auth/accept-invite.tsx` | tenantService | auth | functional |
| 5 | Login | (not routed -- via MarketingHome) | `auth/login.tsx` | supabase auth | auth | functional |
| 6 | Register | (not routed -- via MarketingHome) | `auth/register.tsx` | supabase auth | auth | functional |

### Dashboard

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 7 | Dashboard | `/dashboard` | `Dashboard.tsx` | supabase (counts), demo fallback | informational | functional |

### Core CRM (Contacts, Leads, Pipeline, Deals)

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 8 | Contacts | `/contacts` | `contacts/index.tsx` | contactStore | informational | functional |
| 9 | Modern Contacts | `/contacts/modern` | `contacts/modern-contacts.tsx` | shared types, validation | informational | partial |
| 10 | Contact Groups | `/contacts/groups` | `contacts/groups/index.tsx` | contactStore | informational | functional |
| 11 | Contact Tags | `/contacts/tags` | `contacts/tags/index.tsx` | contactStore | informational | functional |
| 12 | Clients | `/clients` | `clients/index.tsx` | clientStore | informational | functional |
| 13 | Leads | `/leads` | `leads/index.tsx` | leadStore | informational | functional |
| 14 | Opportunities | `/opportunities` | `opportunities/index.tsx` | opportunityStore | informational | functional |
| 15 | Pipeline | `/pipeline` | `pipeline/index.tsx` | opportunityStore | informational | functional |
| 16 | Deals | `/deals` | `deals/index.tsx` | opportunityStore | informational | functional |

### Quotes

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 17 | Quotes List | `/quotes` | `quotes/index.tsx` | quoteStore | financial | functional |
| 18 | Create Quote | `/quotes/create` | `quotes/create.tsx` | quoteStore, supabase | financial | functional |
| 19 | Quote Detail | `/quotes/:id` | `quotes/[id]/index.tsx` | quoteStore, supabase | financial | functional |

### Apprentice Management

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 20 | Apprentices List | `/apprentices` | `apprentices/index.tsx` | apprenticeStore, clientStore | operational | functional |
| 21 | Create Apprentice | `/apprentices/create` | `apprentices/create.tsx` | ApprenticeForm component | operational | partial |
| 22 | Apprentice Detail | `/apprentices/:id` | `apprentices/[id].tsx` | apprenticeStore, supabase | operational | functional |
| 23 | Apprentice Completion | `/apprentices/completion` | `apprentices/completion/index.tsx` | supabase | operational | functional |
| 24 | Apprentice Progress | `/apprentices/progress` | `apprentices/progress/index.tsx` | useQuery (mock data possible) | operational | partial |
| 25 | Apprentice Records | `/apprentices/records` | `apprentices/records/index.tsx` | static (no data fetch) | operational | stub |
| 26 | Apprentice Training | `/apprentices/training` | `apprentices/training/index.tsx` | supabase (training_plans) | operational | functional |
| 27 | Apprentice Recruitment | `/apprentices/recruitment` | `apprentices/recruitment/index.tsx` | static (no data fetch) | operational | partial |
| 28 | Apprentice Onboarding | `/apprentices/recruitment/onboarding` | `apprentices/recruitment/onboarding/index.tsx` | static (hardcoded data) | operational | partial |
| 29 | Recruitment Selections | `/apprentices/recruitment/selections` | `apprentices/recruitment/selections/index.tsx` | static (hardcoded data) | operational | partial |

### Host Employers

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 30 | Hosts List | `/hosts` | `hosts/index.tsx` | hostEmployerStore | operational | functional |
| 31 | Create Host | `/hosts/create` | `hosts/create.tsx` | hostEmployerStore | operational | functional |
| 32 | Host Detail | `/hosts/:id` | `hosts/[id].tsx` | supabase (employers, placements, qualifications) | operational | functional |
| 33 | Host Agreements | `/hosts/agreements` | `hosts/agreements/index.tsx` | supabase (host_agreements) | operational | functional |
| 34 | Host Agreement (single) | `/hosts/agreement` | `hosts/agreement.tsx` | supabase | operational | functional |
| 35 | New Host Agreement | `/hosts/agreements/new` | `hosts/agreements/new.tsx` | hostAgreementStore, supabase | operational | functional |
| 36 | Host Monitoring | `/hosts/monitoring` | `hosts/monitoring.tsx` | supabase | operational | functional |
| 37 | Host Reports | `/hosts/reports` | `hosts/reports.tsx` | supabase | informational | functional |
| 38 | Host Vacancies | `/hosts/vacancies` | `hosts/vacancies/index.tsx` | vacancyStore | operational | functional |
| 39 | New Vacancy | `/hosts/vacancies/new` | `hosts/vacancies/new.tsx` | vacancyStore, supabase | operational | functional |
| 40 | Host Agreements (legacy) | (not routed separately) | `hosts/agreements.tsx` | hostAgreementStore | operational | orphaned |
| 41 | Host Vacancies (legacy) | (not routed separately) | `hosts/vacancies.tsx` | vacancyStore | operational | orphaned |

### Placements

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 42 | Placements | `/placements` | `placements/index.tsx` | placementStore | operational | functional |

### Contracts

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 43 | Contracts List | `/contracts` | `contracts/index.tsx` | supabase | operational | functional |
| 44 | New Contract | `/contracts/new` | `contracts/new.tsx` | hostAgreementStore | operational | functional |
| 45 | Contract Detail | `/contracts/:id` | `contracts/[id].tsx` | hostAgreementStore | operational | functional |
| 46 | Training Contracts | `/contracts/training` | `contracts/training/index.tsx` | trainingContractStore, supabase | compliance | functional |
| 47 | Create Training Contract | `/contracts/training/new` | `contracts/training/create.tsx` | supabase | compliance | functional |
| 48 | Training Contract Detail | `/contracts/training/:id` | `contracts/training/[id]/index.tsx` | supabase | compliance | functional |

### Charge Rates

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 49 | Charge Rates List | `/charge-rates` | `charge-rates/index.tsx` | supabase (charge_rate_quotes) | financial | functional |
| 50 | Create Charge Rate | `/charge-rates/create` | `charge-rates/create.tsx` | supabase, @bsuite/charge-calc, crmCalcBridge | financial | functional |
| 51 | Charge Rate Detail | `/charge-rates/:id` | `charge-rates/[id]/index.tsx` | supabase | financial | functional |

### Financial Management

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 52 | Financial Hub | `/financial` | `financial/index.tsx` | static (nav links) | financial | stub |
| 53 | Budget Management | `/financial/budget` | `financial/budget/index.tsx` | useQuery | financial | functional |
| 54 | Expense Management | `/financial/expenses` | `financial/expenses/index.tsx` | useQuery | financial | functional |
| 55 | Invoicing | `/financial/invoicing` | `financial/invoicing/index.tsx` | invoiceStore | financial | functional |
| 56 | Payment Tracking | `/financial/payments` | `financial/payments/index.tsx` | invoiceStore, paymentStore | financial | functional |
| 57 | Financial Reports | `/financial/reports` | `financial/reports/index.tsx` | useQuery | financial | functional |

### Payroll

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 58 | Payroll Hub | `/payroll` | `payroll/index.tsx` | payrollStore, usePermissions | financial | partial |
| 59 | Award Rates | `/payroll/award-rates` | `payroll/award-rates/index.tsx` | awardStore | financial | functional |
| 60 | Payroll Timesheets | `/payroll/timesheets` | `payroll/timesheets/index.tsx` | timesheetStore | financial | functional |

### Awards

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 61 | Awards List | `/awards` | `awards/index.tsx` | fairWorkAwardStore | financial | functional |
| 62 | Create Award | `/awards/create` | `awards/create.tsx` | supabase | financial | functional |
| 63 | Award Detail | `/awards/:id` | `awards/[id]/index.tsx` | useQuery | financial | functional |
| 64 | Edit Award | `/awards/:id/edit` | `awards/[id]/edit.tsx` | awardStore, useQuery | financial | functional |
| 65 | Award Updates (Admin) | `/admin/award-updates` | `admin/award-updates.tsx` | supabase, useMutation | financial | functional |

### Claims & Funding Sources

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 66 | Claims Hub | `/claims` | `claims/index.tsx` | wrapper (tabs to dashboard/list) | financial | wrapper |
| 67 | Claims Dashboard | `/claims/dashboard` | `claims/dashboard.tsx` | fundingClaimStore | financial | functional |
| 68 | Claims List | `/claims/list` | `claims/list.tsx` | fundingClaimStore, fundingSourceStore | financial | functional |
| 69 | New Claim | `/claims/new` | `claims/new.tsx` | fundingClaimStore, eligibilityEngine | financial | functional |
| 70 | Claim Detail | `/claims/:id` | `claims/[id].tsx` | fundingClaimStore, FundingService | financial | functional |
| 71 | Funding Sources Hub | `/funding-sources` | `funding-sources/index.tsx` | wrapper (overview coming soon) | financial | partial |
| 72 | Funding Sources List | `/funding-sources/list` | `funding-sources/list.tsx` | fundingSourceStore | financial | functional |
| 73 | New Funding Source | `/funding-sources/new` | `funding-sources/new.tsx` | fundingSourceStore | financial | functional |
| 74 | Funding Source Detail | `/funding-sources/:id` | `funding-sources/[id].tsx` | fundingSourceStore | financial | functional |

### Leave Management

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 75 | Leave Management | `/leave` | `leave/index.tsx` | leaveRequestStore, leaveBalanceStore | operational | functional |
| 76 | Request Leave | `/leave/request` | `leave/request.tsx` | leaveRequestStore, apprenticeStore | operational | functional |

### Timesheets

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 77 | Timesheets | `/timesheets` | `timesheets/index.tsx` | timesheetStore, apprenticeStore | operational | functional |

### Documents

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 78 | Documents | `/documents` | `documents/index.tsx` | useQuery | operational | functional |
| 79 | Document Management | `/documents/management` | `documents/management.tsx` | documentRecordStore, supabase | operational | functional |
| 80 | Digital Signatures | `/documents/signatures` | `documents/signatures.tsx` | signatureRequestStore | operational | functional |

### Competencies

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 81 | Competencies | `/competencies` | `competencies/index.tsx` | competencyAssessmentStore, supabase | operational | functional |

### Compliance

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 82 | Compliance Hub | `/compliance` | `compliance/index.tsx` | complianceStore | compliance | functional |
| 83 | Compliance Alerts | `/compliance/alerts` | `compliance/alerts.tsx` | supabase, alertEngine | compliance | functional |
| 84 | Create Compliance Record | `/compliance/create` | `compliance/create.tsx` | complianceStore | compliance | functional |

### GTO Compliance

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 85 | GTO Compliance Hub | `/gto-compliance` | `gto-compliance/index.tsx` | gtoOrganizationStore, gtoStandardStore, supabase | compliance | functional |
| 86 | Access & Equity | `/gto-compliance/access-equity` | `gto-compliance/access-equity.tsx` | gtoStandardStore, supabase | compliance | functional |
| 87 | Complaints | `/gto-compliance/complaints` | `gto-compliance/complaints.tsx` | gtoComplaintStore | compliance | functional |
| 88 | Records Management | `/gto-compliance/records-management` | `gto-compliance/records-management.tsx` | gtoRecordStore, gtoStandardStore, supabase | compliance | functional |
| 89 | Risk Management | `/gto-compliance/risk-management` | `gto-compliance/risk-management.tsx` | gtoRiskStore, gtoStandardStore, supabase | compliance | functional |
| 90 | Standard Assessment | `/gto-compliance/standard-assessment` | `gto-compliance/standard-assessment.tsx` | gtoStandardStore, useMutation | compliance | functional |

### WHS (Work Health & Safety)

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 91 | WHS Hub | `/whs` | `whs/index.tsx` | static (nav + WHSDashboard component) | compliance | partial |
| 92 | WHS Host Employers | `/whs/host-employers` | `whs/host-employers/index.tsx` | wrapper (HostEmployerWHSManager) | compliance | wrapper |
| 93 | WHS Incidents (v1) | (not routed) | `whs/incidents.tsx` | wrapper (IncidentsList) | compliance | orphaned |
| 94 | WHS Incidents (v2) | `/whs/incidents` | `whs/incidents/index.tsx` | wrapper (IncidentsList + NewIncidentForm) | compliance | wrapper |
| 95 | WHS Inspections (v1) | (not routed) | `whs/inspections.tsx` | wrapper (InspectionsList) | compliance | orphaned |
| 96 | WHS Inspections (v2) | `/whs/inspections` | `whs/inspections/index.tsx` | wrapper (EnhancedInspectionScheduleManager) | compliance | wrapper |
| 97 | WHS Policies | `/whs/policies` | `whs/policies.tsx` | wrapper (SafetyPoliciesList) | compliance | wrapper |
| 98 | WHS Reports | `/whs/reports` | `whs/reports/index.tsx` | wrapper (AdvancedReportingManager) | compliance | wrapper |
| 99 | WHS Risk Assessments | `/whs/risk-assessments` | `whs/risk-assessments.tsx` | wrapper (RiskAssessmentsList) | compliance | wrapper |
| 100 | WHS Training | `/whs/training` | `whs/training/index.tsx` | wrapper (TrainingModuleManager) | compliance | wrapper |
| 101 | WHS Workflow | `/whs/workflow` | `whs/workflow/index.tsx` | wrapper (WorkflowManager) | compliance | wrapper |
| 102 | Return-to-Work Plans | `/whs/return-to-work` | `whs/return-to-work/index.tsx` | rtwPlanStore | compliance | functional |
| 103 | RTW Plan Detail | `/whs/return-to-work/:id` | `whs/return-to-work/[id]/index.tsx` | rtwPlanStore, rtwMilestoneStore | compliance | functional |

### Progress Reviews

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 104 | Progress Reviews Hub | `/progress-reviews` | `progress-reviews/index.tsx` | supabase (performance_reviews, review_templates) | compliance | functional |
| 105 | Reviews List | `/progress-reviews/reviews` | `progress-reviews/reviews/index.tsx` | supabase | compliance | functional |
| 106 | Review Templates | `/progress-reviews/templates` | `progress-reviews/templates/index.tsx` | progressReviewTemplateStore, supabase | compliance | functional |
| 107 | Create Review Template | `/progress-reviews/templates/create` | `progress-reviews/templates/create.tsx` | progressReviewTemplateStore | compliance | functional |

### Field Officers

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 108 | Field Officers List | `/field-officers` | `field-officers.tsx` | fieldOfficerStore | operational | functional |
| 109 | Field Officer Actions | `/field-officers/actions` | `field-officers/actions/index.tsx` | useQuery | operational | functional |
| 110 | Case Notes | `/field-officers/case-notes` | `field-officers/case-notes/index.tsx` | useQuery | operational | functional |
| 111 | Field Officer Competency | `/field-officers/competency` | `field-officers/competency/index.tsx` | useQuery | operational | functional |
| 112 | Field Officer Incidents | `/field-officers/incidents` | `field-officers/incidents/index.tsx` | useQuery | operational | functional |
| 113 | Site Assessment | `/field-officers/site-assessment` | `field-officers/site-assessment.tsx` | static (form, no backend) | operational | partial |

### Communications

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 114 | Communications Hub | `/communications` | `communications/index.tsx` | communicationStore, supabase | informational | functional |
| 115 | Compose Message | `/communications/compose` | `communications/compose.tsx` | communicationStore, communicationTemplateStore | informational | functional |
| 116 | Message Templates | `/communications/templates` | `communications/templates.tsx` | communicationTemplateStore | informational | functional |
| 117 | Mail Merge | `/communications/mail-merge` | `communications/mail-merge.tsx` | communicationTemplateStore, documentTemplateStore, mailMergeBatchStore | informational | functional |

### Calendar, Tasks, Notifications

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 118 | Calendar | `/calendar` | `calendar/index.tsx` | calendarStore | informational | functional |
| 119 | Tasks | `/tasks` | `tasks/index.tsx` | taskStore | informational | functional |
| 120 | Notifications | `/notifications` | `notifications/index.tsx` | notificationStore | informational | functional |

### Analytics & Reporting

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 121 | Analytics | `/analytics` | `analytics/index.tsx` | supabase (counts) | informational | functional |
| 122 | Reports | `/reports` | `reports/index.tsx` | supabase | informational | functional |
| 123 | Insights | `/insights` | `insights/index.tsx` | supabase (counts) | informational | functional |

### VET & Training

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 124 | VET Hub | `/vet` | `vet/index.tsx` | static (nav links) | compliance | stub |
| 125 | VET Assessments | `/vet/assessments` | `vet/assessments/index.tsx` | supabase | compliance | functional |
| 126 | VET Qualifications | `/vet/qualifications` | `vet/qualifications/index.tsx` | useQuery | compliance | functional |
| 127 | Create Qualification | `/vet/qualifications/create` | `vet/qualifications/create.tsx` | qualificationStore | compliance | functional |
| 128 | Import Qualifications | `/vet/qualifications/import` | `vet/qualifications/import.tsx` | tgaService, useMutation | compliance | functional |
| 129 | Qualification Detail (v1) | (not routed separately) | `vet/qualifications/[id].tsx` | useQuery | compliance | orphaned |
| 130 | Qualification Detail (v2) | `/vet/qualifications/:id` | `vet/qualifications/[id]/index.tsx` | useQuery | compliance | functional |
| 131 | Edit Qualification | `/vet/qualifications/:id/edit` | `vet/qualifications/[id]/edit.tsx` | useQuery, useMutation | compliance | functional |
| 132 | Qualification Structure | `/vet/qualifications/:id/structure` | `vet/qualifications/[id]/structure.tsx` | useQuery, useMutation | compliance | functional |
| 133 | Training Packages | `/vet/training-packages` | `vet/training-packages/index.tsx` | useQuery, useMutation | compliance | functional |
| 134 | Training Package Detail | `/vet/training-packages/:id` | `vet/training-packages/[id]/index.tsx` | supabase | compliance | functional |
| 135 | VET Units | `/vet/units` | `vet/units/index.tsx` | unitStore, trainingPackageStore | compliance | functional |
| 136 | Create Unit | `/vet/units/create` | `vet/units/create.tsx` | unitStore | compliance | functional |
| 137 | Unit Detail | `/vet/units/:id` | `vet/units/[id]/index.tsx` | useQuery | compliance | functional |
| 138 | Edit Unit | `/vet/units/:id/edit` | `vet/units/[id]/edit.tsx` | unitStore, useQuery | compliance | functional |
| 139 | Training Hub | `/training` | `training/index.tsx` | static (nav links) | compliance | stub |

### Enrichment Programs

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 140 | Enrichment Hub | `/enrichment` | `enrichment/index.tsx` | static (nav links), usePermissions | operational | stub |
| 141 | Enrichment Programs | `/enrichment/programs` | `enrichment/programs/index.tsx` | useQuery | operational | functional |

### External Employees

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 142 | External Employees Hub | `/external-employees` | `external-employees/index.tsx` | static (nav links) | operational | partial |
| 143 | External Apprentices | `/external-employees/apprentices` | `external-employees/apprentices/index.tsx` | static (hardcoded data) | operational | partial |
| 144 | External Workers | `/external-employees/workers` | `external-employees/workers/index.tsx` | useQuery (LabourHireWorker) | operational | functional |

### Labour Hire

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 145 | Labour Hire Workers | `/labour-hire/workers` | `labour-hire/workers/index.tsx` | useQuery (LabourHireWorker) | operational | functional |
| 146 | Labour Hire Worker Detail | `/labour-hire/workers/:id` | `labour-hire/workers/[id].tsx` | useQuery | operational | functional |

### Mentors

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 147 | Mentors | `/mentors` | `mentors/index.tsx` | mentorStore, apprenticeStore, supabase | operational | functional |

### Skills Matrix

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 148 | Skills Matrix | `/skills` | `skills/index.tsx` | skillRecordStore | operational | functional |

### AI & Workflows

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 149 | AI Plugins | `/ai-plugins` | `ai-plugins/index.tsx` | ai/plugins | informational | stub |
| 150 | Workflows | `/workflows` | `workflows/index.tsx` | workflowStore | informational | functional |

### Settings

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 151 | Settings Hub | `/settings` | `settings/index.tsx` | static (nav links) | informational | partial |
| 152 | User Management | `/settings/users` | `settings/user-management.tsx` | useQuery, useMutation | informational | functional |
| 153 | Permissions | `/settings/permissions` | `settings/permissions.tsx` | useQuery, useMutation | informational | functional |
| 154 | Configuration | `/settings/configuration` | `settings/configuration.tsx` | useMutation | informational | functional |
| 155 | Organization | `/settings/organization` | `settings/organization.tsx` | supabase | informational | functional |
| 156 | Custom Fields | `/settings/custom-fields` | `settings/custom-fields.tsx` | static (self-service config) | informational | partial |
| 157 | Custom Fields Admin | `/settings/custom-fields-admin` | `settings/custom-fields-admin.tsx` | customFieldDefinitionStore | informational | functional |
| 158 | Data Sharing | `/settings/data-sharing` | `settings/data-sharing.tsx` | static (config UI) | informational | partial |
| 159 | Tester Licenses | `/settings/tester-licenses` | `settings/tester-licenses.tsx` | usePlatformRole | informational | partial |
| 160 | Audit Log | `/settings/audit-log` | `settings/audit-log.tsx` | supabase (audit_events) | informational | functional |
| 161 | Data Management | `/settings/data-management` | `settings/data-management.tsx` | supabase | informational | functional |
| 162 | Data Import/Export | `/settings/import-export-data` | `settings/import-export-data.tsx` | dataImportJobStore | informational | functional |
| 163 | Import & Export | `/settings/import-export` | `settings/import-export.tsx` | useQuery | informational | functional |
| 164 | Govt Integrations | `/settings/govt-integrations` | `settings/govt-integrations.tsx` | govtIntegrationLogStore | informational | functional |
| 165 | Integrations | `/settings/integrations` | `settings/integrations.tsx` | tgaService, useQuery, useMutation | informational | functional |
| 166 | Permissions Demo | `/settings/permissions-demo` | `settings/permissions-demo.tsx` | usePermissions (old System B) | informational | partial |

### Portal Pages

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 167 | Portal Router | `/portal` | `portal/index.tsx` | usePortalContext | auth | functional |
| 168 | Host Employer Portal | `/portal/host-employer` | `portal/host-employer.tsx` | supabase (KPIs), usePortalContext | operational | functional |
| 169 | Training Provider Portal | `/portal/training-provider` | `portal/training-provider.tsx` | supabase (KPIs), usePortalContext | compliance | functional |
| 170 | Worker Portal | `/portal/worker` | `portal/worker-portal.tsx` | useAuth, usePortalContext | operational | partial |
| 171 | Workplace Portal | `/portal/workplace` | `portal/workplace-portal.tsx` | supabase (KPIs), usePortalContext | operational | functional |

### Pricing & Demo

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 172 | Pricing | `/pricing` | `pricing.tsx` | pricing-data, useAuth | informational | partial |
| 173 | Fair Work Demo | (not routed) | `fair-work-demo.tsx` | static (demo page) | informational | orphaned |
| 174 | API Test | (not routed) | `api-test.tsx` | fairworkEnhancedService | informational | orphaned |

### Utility

| # | Page | Route | File | Store/Entity | Criticality | Status |
|---|------|-------|------|--------------|-------------|--------|
| 175 | Not Found | (inline in App.tsx) | `not-found.tsx` | static | system | stub |

---

## Orphaned / Unrouted Files

These files exist in `src/pages/` but are not referenced in `App.tsx` routing:

| File | Notes |
|------|-------|
| `auth/login.tsx` | Rendered via MarketingHome component, not directly routed |
| `auth/register.tsx` | Rendered via MarketingHome component, not directly routed |
| `hosts/agreements.tsx` | Superseded by `hosts/agreements/index.tsx` |
| `hosts/vacancies.tsx` | Superseded by `hosts/vacancies/index.tsx` |
| `whs/incidents.tsx` | Superseded by `whs/incidents/index.tsx` (13 lines, thin wrapper) |
| `whs/inspections.tsx` | Superseded by `whs/inspections/index.tsx` (13 lines, thin wrapper) |
| `vet/qualifications/[id].tsx` | Superseded by `vet/qualifications/[id]/index.tsx` |
| `fair-work-demo.tsx` | Dev/demo page, never routed |
| `api-test.tsx` | Dev test page, never routed |
| `funding-sources/list.tsx` | Listed separately in routing as `/funding-sources/list` |

---

## Key Findings

1. **155 page files** across 30+ functional domains -- this is a large application surface
2. **~63% functional** pages with real Supabase data or Zustand store integration
3. **~21% partial** pages with some hardcoded data, incomplete forms, or TODOs
4. **~10% stubs** that are navigation hubs only (no data fetching)
5. **9 orphaned files** that should be cleaned up or formally deprecated
6. **All 139 protected routes** use `ProtectedRoute` (auth required) and most use `PermissionGate` for RBAC
7. **WHS module** largely delegates to child components -- actual data logic lives in `src/components/whs/`
8. **Charge rate create** is the most complex page at 1,450 lines with @bsuite/charge-calc integration
9. **Settings section** has 15 pages, many with full CRUD wired to Supabase
