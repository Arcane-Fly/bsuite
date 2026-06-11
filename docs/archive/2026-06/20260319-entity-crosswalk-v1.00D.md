# CRM7 Entity Crosswalk & Traceability

**Status:** Draft (v1.00D) — 2026-03-19  
**Purpose:** Maps every CRM7 entity to its DB table, Zustand store, primary route, EntitySelector component (if any), and gaps. Serves as the prerequisite gate before new EntitySelectors are created.

---

## Existing EntitySelectors (7)

| Selector | File | Entity | Store |
|----------|------|--------|-------|
| `ApprenticeSelector` | `selectors/ApprenticeSelector.tsx` | Person (apprentice) | `peopleStore` |
| `ClientSelector` | `selectors/ClientSelector.tsx` | Client | `clientStore` |
| `ContactSelector` | `selectors/ContactSelector.tsx` | Contact | `contactStore` |
| `EmployerSelector` | `selectors/EmployerSelector.tsx` | Host Employer | `hostEmployerStore` |
| `FundingSourceSelector` | `selectors/FundingSourceSelector.tsx` | Funding Source | `fundingSourceStore` |
| `PersonSelector` | `selectors/PersonSelector.tsx` | Person (unified) | `peopleStore` |
| `QualificationSelector` | `selectors/QualificationSelector.tsx` | Qualification | `qualificationStore` |

---

## Core CRM Entities

| Entity | DB Table | Store | Primary Route | Selector | Gap |
|--------|----------|-------|---------------|----------|-----|
| Contact | `contacts` | `contactStore` | `/contacts` | ✅ `ContactSelector` | — |
| Client | `clients` | `clientStore` | `/clients` | ✅ `ClientSelector` | — |
| Person (unified) | `people` | `peopleStore` | `/people` | ✅ `PersonSelector` / `ApprenticeSelector` | — |
| Lead | `leads` | `leadStore` | `/leads` | 🔲 | Need `LeadSelector` |
| Opportunity | `opportunities` | `opportunityStore` | `/opportunities` | 🔲 | Need `OpportunitySelector` |
| Deal | `deals` | (dealStore via createEntityStore) | `/deals` | 🔲 | Low priority |
| Quote | `quotes` | `quoteStore` | `/quotes` | 🔲 | Need `QuoteSelector` for invoice line items |
| Task | `tasks` | `taskStore` | `/tasks` | 🔲 | — |
| Activity | `activities` | — (redirects to /dashboard) | — | 🔲 | — |
| Placement | `placements` | `placementStore` | `/placements` | 🔲 | Need `PlacementSelector` |
| Mentor | `mentors` | `mentorStore` | `/mentors` | 🔲 | — |

---

## People & Workforce

| Entity | DB Table | Store | Primary Route | Selector | Gap |
|--------|----------|-------|---------------|----------|-----|
| Person (apprentice/worker) | `people` | `peopleStore` | `/people` | ✅ `ApprenticeSelector` | — |
| Worker | `people` | `workerStore` | `/people` (via redirect) | ✅ `PersonSelector` | — |
| Host Employer | `host_employers` | `hostEmployerStore` | `/hosts` | ✅ `EmployerSelector` | — |
| Host Site | `host_sites` | `hostSiteStore` | `/hosts/:id` | 🔲 | Need `HostSiteSelector` |
| Field Officer | `field_officers` | `fieldOfficerStore` | `/field-officers` | 🔲 | Need `FieldOfficerSelector` |
| Mentor | `mentors` | `mentorStore` | `/mentors` | 🔲 | — |

---

## Training & VET

| Entity | DB Table | Store | Primary Route | Selector | Gap |
|--------|----------|-------|---------------|----------|-----|
| Training Plan | `training_plans` | `trainingPlanStore` | `/training/plans` | 🔲 | Need `TrainingPlanSelector` |
| Training Contract | `training_contracts` | `trainingContractStore` | `/contracts/training` | 🔲 | — |
| Training Plan Review | `training_plan_reviews` | `trainingPlanReviewStore` | nested under plan | 🔲 | — |
| Training Provider | `training_providers` | `trainingProviderStore` | via settings | 🔲 | Need `TrainingProviderSelector` |
| Training Package | `training_packages` | `trainingPackageStore` | `/vet/training-packages` | 🔲 | Need `TrainingPackageSelector` |
| Qualification | `qualifications` | `qualificationStore` | `/vet/qualifications` | ✅ `QualificationSelector` | — |
| Unit of Competency | `units` | `unitStore` | `/vet/units` | 🔲 | Need `UnitSelector` |
| Competency | `competencies` | `competencyStore` | `/competencies` | 🔲 | — |
| Competency Assessment | `competency_assessments` | `competencyAssessmentStore` | nested | 🔲 | — |
| VET Assessment | `vet_assessments` | `assessmentStore` | `/vet/assessments` | 🔲 | Need `VETAssessmentSelector` |
| Apprentice Completion | `apprentice_completions` | (via trainingPlanStore) | `/people/completion` | 🔲 | — |
| Enrichment Program | `enrichment_programs` | — | `/enrichment` | 🔲 | — |
| Skill Record | `skill_records` | `skillRecordStore` | `/skills` | 🔲 | — |

---

## Financial

| Entity | DB Table | Store | Primary Route | Selector | Gap |
|--------|----------|-------|---------------|----------|-----|
| Invoice | `invoices` | `invoiceStore` | `/financial/invoicing` | 🔲 | Need `InvoiceSelector` |
| Quote | `quotes` | `quoteStore` | `/quotes` | 🔲 | — |
| Payment | `payments` | `paymentStore` | `/financial/payments` | 🔲 | — |
| Funding Source | `funding_sources` | `fundingSourceStore` | `/funding-sources` | ✅ `FundingSourceSelector` | — |
| Funding Claim | `funding_claims` | `fundingClaimStore` | `/claims` | 🔲 | Need `FundingClaimSelector` |
| Charge Rate | `charge_rates` | `chargeRateStore` | `/charge-rates` | 🔲 | Need `ChargeRateSelector` |
| Rate Schedule | `rate_schedules` | `rateScheduleStore` | nested | 🔲 | — |
| RCTI | `rctis` | `rctiStore` | `/payroll/rcti` | 🔲 | — |
| Reimbursement | `reimbursements` | `reimbursementStore` | nested | 🔲 | — |
| Billing (GTO) | `billing` | — | `/billing` | 🔲 | — |

---

## Payroll

| Entity | DB Table | Store | Primary Route | Selector | Gap |
|--------|----------|-------|---------------|----------|-----|
| Payroll Record | `payroll_records` | `payrollStore` | `/payroll` | 🔲 | — |
| Pay Period | `pay_periods` | `payPeriodStore` | `/payroll/pay-periods` | 🔲 | Need `PayPeriodSelector` |
| Timesheet | `timesheets` | `timesheetStore` | `/timesheets` | 🔲 | — |
| Leave Request | `leave_requests` | `leaveStore` | `/leave` | 🔲 | — |
| Award | `awards` | `awardStore` | `/awards` | 🔲 | Need `AwardSelector` |
| Fair Work Award | `fair_work_awards` | `fairWorkAwardStore` | via payroll | 🔲 | — |

---

## Compliance & WHS

| Entity | DB Table | Store | Primary Route | Selector | Gap |
|--------|----------|-------|---------------|----------|-----|
| Compliance Record | `compliance_records` | `complianceStore` | `/compliance` | 🔲 | — |
| Compliance Alert | `compliance_alerts` | `complianceAlertStore` | `/compliance/alerts` | 🔲 | — |
| WHS Incident | `whs_incidents` | `whsIncidentStore` | `/whs/incidents` | 🔲 | Need `WHSIncidentSelector` |
| WHS Risk Assessment | `whs_risk_assessments` | `whsRiskAssessmentStore` | `/whs/risk-assessments` | 🔲 | — |
| WHS Policy | `whs_policies` | `whsPolicyStore` | `/whs/policies` | 🔲 | — |
| Workplace Inspection | `workplace_inspections` | `workplaceInspectionStore` | `/whs/inspections` | 🔲 | — |
| Return-to-Work | `rtw_plans` | `rtwStore` | `/whs/return-to-work` | 🔲 | — |
| BOOT Assessment | `boot_assessments` | `bootAssessmentStore` | `/compliance/boot` | 🔲 | — |
| Disciplinary Case | `disciplinary_cases` | `disciplinaryCaseStore` | `/hr/disciplinary` | 🔲 | — |
| Probation Record | `probation_records` | `probationRecordStore` | `/hr/probation-completion` | 🔲 | — |
| Contract Variation | `contract_variations` | `contractVariationStore` | nested | 🔲 | — |
| Performance Review | `performance_reviews` | `performanceReviewStore` | `/progress-reviews` | 🔲 | — |
| RTW Plan | `rtw_plans` | `rtwStore` | `/whs/return-to-work` | 🔲 | — |

---

## GTO Compliance

| Entity | DB Table | Store | Primary Route | Selector | Gap |
|--------|----------|-------|---------------|----------|-----|
| GTO Record | `gto_records` | `gtoRecordStore` | `/gto-compliance` | 🔲 | — |
| GTO Risk | `gto_risks` | `gtoRiskStore` | `/gto-compliance/risk-management` | 🔲 | — |
| GTO Standard | `gto_standards` | `gtoStandardStore` | nested | 🔲 | — |
| GTO Compliance Evidence | `gto_compliance_evidence` | `gtoComplianceEvidenceStore` | `/gto-compliance/evidence` | 🔲 | — |
| GTO Complaint | `gto_complaints` | `gtoComplaintStore` | `/gto-compliance/complaints` | 🔲 | — |
| GTO Appeal | `gto_appeals` | `gtoAppealStore` | nested | 🔲 | — |
| GTO Organisation | `gto_organisations` | `gtoOrganizationStore` | nested | 🔲 | — |

---

## Communications

| Entity | DB Table | Store | Primary Route | Selector | Gap |
|--------|----------|-------|---------------|----------|-----|
| Communication | `communications` | `communicationStore` | `/communications` | 🔲 | — |
| Communication Template | `communication_templates` | `communicationTemplateStore` | `/communications/templates` | 🔲 | Need `CommunicationTemplateSelector` |
| Mail Merge Batch | `mail_merge_batches` | `mailMergeBatchStore` | `/communications/mail-merge` | 🔲 | — |
| Notification | `notifications` | `notificationStore` | `/notifications` | 🔲 | — |

---

## Government & Workforce Integrations

| Entity | DB Table | Store | Primary Route | Selector | Gap |
|--------|----------|-------|---------------|----------|-----|
| MAPD Webhook | `mapd_webhooks` | — | `/settings/govt-integrations` | 🔲 | — |
| STA Submission | `sta_submissions` | `staSubmissionStore` | nested | 🔲 | — |
| AASN Registration | `aasn_registrations` | `aassRegistrationStore` | nested | 🔲 | — |
| Govt Integration Log | `govt_integration_logs` | `govtIntegrationLogStore` | nested | 🔲 | — |
| COY Apprentice Change | `coy_apprentice_changes` | `coyApprenticeChangeStore` | nested | 🔲 | — |
| COY Batch | `coy_batches` | `coyBatchStore` | nested | 🔲 | — |
| Incentive Claim | `incentive_claims` | `incentiveClaimStore` | nested | 🔲 | — |

---

## Documents

| Entity | DB Table | Store | Primary Route | Selector | Gap |
|--------|----------|-------|---------------|----------|-----|
| Document Record | `document_records` | `documentRecordStore` | `/documents/management` | 🔲 | — |
| Document Template | `document_templates` | `documentTemplateStore` | `/documents/templates` | 🔲 | Need `DocumentTemplateSelector` |
| Signature Request | `signature_requests` | `signatureRequestStore` | `/documents/signatures` | 🔲 | — |

---

## Host Agreements & Vacancies

| Entity | DB Table | Store | Primary Route | Selector | Gap |
|--------|----------|-------|---------------|----------|-----|
| Host Agreement | `host_agreements` | `hostAgreementStore` | `/hosts/agreements` | 🔲 | Need `HostAgreementSelector` |
| Vacancy | `vacancies` | `vacancyStore` | `/hosts/vacancies` | 🔲 | Need `VacancySelector` |
| Site Visit | `site_visits` | `siteVisitStore` | `/field-officers/site-visits` | 🔲 | — |
| Support Contact | `support_contacts` | `supportContactStore` | nested | 🔲 | — |

---

## AI & Platform

| Entity | DB Table | Store | Primary Route | Selector | Gap |
|--------|----------|-------|---------------|----------|-----|
| AI Session | `ai_sessions` | `aiStore` | via AI assistant | 🔲 | — |
| AI Message | `ai_messages` | `aiStore` | via AI assistant | 🔲 | — |
| Case Note | `case_notes` | `caseNoteStore` | `/field-officers/case-notes` | 🔲 | — |

---

## Priority New Selectors Queue

Based on gap analysis, the following selectors are needed for Tier 3-4 page form wiring (ordered by frequency of cross-entity use):

| Priority | Selector | Used By |
|----------|----------|---------|
| P1 | `AwardSelector` | Payroll, Training Contract, Charge Rate |
| P1 | `TrainingPlanSelector` | People detail, VET Assessments |
| P1 | `PlacementSelector` | Timesheets, WHS Incidents, Field Officer Assignments |
| P1 | `ChargeRateSelector` | Invoicing, Billing, Funding Claims |
| P2 | `TrainingProviderSelector` | Training Plans, VET Assessments |
| P2 | `FundingClaimSelector` | Invoicing, Claims |
| P2 | `VacancySelector` | Placements, Host Agreements |
| P2 | `HostAgreementSelector` | Placements, Timesheets |
| P3 | `LeadSelector` | Opportunities, Pipeline |
| P3 | `DocumentTemplateSelector` | Document generation flows |
| P3 | `CommunicationTemplateSelector` | Mail merge, comms compose |
| P3 | `InvoiceSelector` | Payments, RCTI |

---

## Notes

- All entity stores use the `createEntityStore` factory (`src/stores/createEntityStore.ts`)
- `EntitySelector` base component (`src/components/entity/EntitySelector.tsx`) provides the search-combobox shell — new selectors extend this
- `CrossEntitySearch.tsx` and `EntityRelationshipTabs.tsx` handle cross-entity display but are not selectors
- New selectors should follow the pattern in `PersonSelector.tsx` (most complete example with avatar + subtitle)
- Entity Selector barrel: `src/components/entity/selectors/index.ts` — add new selectors here

---

*Document owner: Cascade | Last updated: 2026-03-19 | Next review: after Tier 3-4 wiring sprint*
