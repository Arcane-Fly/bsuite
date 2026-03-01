> [IMPORTED FROM CRM13] -- Reference only, not canonical

# Navigation Path Audit

This document provides an audit of the navigation paths defined in the Sidebar against the actual routes and page components available in the application.

## Navigation Audit Summary

| Navigation Section | Status | Issues |
|-------------------|--------|--------|
| Dashboard | ✅ Available | Route and page exist |
| Clients & Host Employers | ⚠️ Improving | Main route exists, some subroutes added |
| Apprentices & Trainees | ⚠️ Improving | Main route added, two subroutes added |
| Training & Development | ✅ Complete | Main route and all subroutes added |
| Human Resources | ⚠️ Partial | Main route exists, but subroutes incomplete |
| Safety & WHS | ⚠️ Improving | Route configured, some pages linked |
| Payroll & Finance | ⚠️ Improving | Route configured, some pages linked |
| Compliance & Quality | ⚠️ Improving | Route configured, some pages linked |
| Reports & Analytics | ⚠️ Partial | Main route exists, but subroutes missing |
| Notes | ✅ Available | Route and page exist |
| Calendar | ⚠️ Partial | Placeholder route added |
| Profile | ✅ Available | Route and page exist |

## Detailed Path Analysis

### 1. Dashboard

- Path: `/dashboard`
- Route Config: ✅ Defined
- Page Component: ✅ `src/pages/Dashboard.tsx`
- Status: **Complete**

### 2. Clients & Host Employers

- Primary Path: `/clients/*`
- Route Config: ✅ Defined as wildcard route
- Page Component: ✅ `src/pages/Clients.tsx`
- Subroutes:
  - All Clients: `/clients`
    - Status: ✅ Should work with wildcard route
  - Host Employers: `/employers/host`
    - Route Config: ❌ Missing
    - Page Component: ✅ `src/pages/employers/HostEmployersList.tsx`
    - Status: **Route configuration needed**
  - Site Visits: `/employers/visits`
    - Route Config: ❌ Missing
    - Page Component: ✅ `src/pages/employers/SiteVisitScheduler.tsx`
    - Status: **Route configuration needed**
  - Workplace Inspections: `/employers/inspections`
    - Route Config: ❌ Missing
    - Page Component: ❌ Missing
    - Status: **Route and page needed**

### 3. Apprentices & Trainees

- Primary Path: `/apprentices`
- Route Config: ✅ Added
- Subroutes:
  - All Apprentices: `/apprentices`
    - Route Config: ✅ Added
    - Page Component: ✅ `src/pages/apprentices/ApprenticesList.tsx`
    - Status: **Complete**
  - Training Contracts: `/apprentices/contracts`
    - Route Config: ✅ Added
    - Page Component: ✅ `src/pages/apprentices/TrainingContractsPage.tsx`
    - Status: **Complete**
  - Support Contacts: `/apprentices/support`
    - Route Config: ✅ Added
    - Page Component: ✅ `src/pages/apprentices/SupportContactsPage.tsx`
    - Status: **Complete**

### 4. Training & Development

- Primary Path: `/training`
- Route Config: ✅ Complete (using proper TrainingLayout)
- Subroutes:
  - Qualifications: `/training/qualifications`
    - Route Config: ✅ Added
    - Page Component: ✅ `src/pages/training/QualificationsPage.tsx`
    - Status: **Complete**
  - Competency Units: `/training/units`
    - Route Config: ✅ Added
    - Page Component: ✅ `src/pages/training/CompetencyUnitsPage.tsx`
    - Status: **Complete**
  - Competency Assessments: `/training/assessments`
    - Route Config: ✅ Added
    - Page Component: ✅ `src/pages/training/AssessmentsPage.tsx`
    - Status: **Complete**
  - Training Plan Reviews: `/training/reviews`
    - Route Config: ✅ Added
    - Page Component: ✅ `src/pages/training/TrainingReviewsPage.tsx`
    - Status: **Complete**

### 5. Human Resources

- Primary Path: `/employees/*`
- Route Config: ✅ Defined as wildcard route
- Page Component: ✅ `src/pages/Employees.tsx`
- Subroutes:
  - Employees: `/employees`
    - Status: ✅ Should work with wildcard route
  - Field Officers: `/employees/field`
    - Route Config: ❌ Missing specific route
    - Page Component: ❌ Missing
    - Status: **Route and page needed**
  - Staff Directory: `/employees/staff`
    - Route Config: ❌ Missing specific route
    - Page Component: ❌ Missing
    - Status: **Route and page needed**

### 6. Safety & WHS

- Primary Path: `/safety`
- Route Config: ✅ Added (using Dashboard as placeholder layout)
- Subroutes:
  - Incident Reports: `/safety/incidents`
    - Route Config: ✅ Added
    - Page Component: ✅ `src/pages/safety/Incidents.tsx`
    - Status: **Complete**
  - Compliance Records: `/safety/compliance`
    - Route Config: ✅ Added
    - Page Component: ✅ `src/pages/safety/ComplianceRecords.tsx`
    - Status: **Complete**
  - WHS Inspections: `/safety/inspections`
    - Route Config: ❌ Missing
    - Page Component: ❌ Missing
    - Status: **Route and page needed**

### 7. Payroll & Finance

- Primary Path: `/payroll`
- Route Config: ✅ Added (using Dashboard as placeholder layout)
- Subroutes:
  - Rate Management: `/payroll/rates`
    - Route Config: ✅ Added
    - Page Component: ✅ `src/pages/payroll/RateManagement.tsx`
    - Status: **Complete**
  - Funding Claims: `/payroll/claims`
    - Route Config: ✅ Added
    - Page Component: ✅ `src/pages/payroll/FundingClaims.tsx`
    - Status: **Complete**
  - Contract Finances: `/payroll/contracts`
    - Route Config: ❌ Missing
    - Page Component: ❌ Missing
    - Status: **Route and page needed**

### 8. Compliance & Quality

- Primary Path: `/compliance`
- Route Config: ✅ Added (using Dashboard as placeholder layout)
- Subroutes:
  - Audits: `/compliance/audits`
    - Route Config: ✅ Added
    - Page Component: ✅ `src/pages/compliance/Audits.tsx`
    - Status: **Complete**
  - Documents: `/compliance/documents`
    - Route Config: ✅ Added
    - Page Component: ✅ `src/pages/compliance/Documents.tsx`
    - Status: **Complete**
  - Qualification Compliance: `/compliance/qualifications`
    - Route Config: ❌ Missing
    - Page Component: ❌ Missing
    - Status: **Route and page needed**

### 9. Reports & Analytics

- Primary Path: `/reports`
- Route Config: ✅ Defined
- Page Component: ✅ `src/pages/Reports.tsx`
- Subroutes:
  - Apprentice Reports: `/reports/apprentices`
    - Route Config: ❌ Missing specific route
    - Page Component: ❌ Missing
    - Status: **Route and page needed**
  - Employer Reports: `/reports/employers`
    - Route Config: ❌ Missing specific route
    - Page Component: ❌ Missing
    - Status: **Route and page needed**
  - Training Reports: `/reports/training`
    - Route Config: ❌ Missing specific route
    - Page Component: ❌ Missing
    - Status: **Route and page needed**
  - Financial Reports: `/reports/financial`
    - Route Config: ❌ Missing specific route
    - Page Component: ❌ Missing
    - Status: **Route and page needed**

### 10. Notes

- Path: `/notes`
- Route Config: ✅ Defined
- Page Component: ✅ `src/pages/notes/index.tsx`
- Status: **Complete**

### 11. Calendar

- Path: `/calendar`
- Route Config: ✅ Added (using Dashboard as placeholder)
- Page Component: ❌ Missing (using Dashboard as placeholder)
- Status: **Placeholder added**

### 12. Profile

- Path: `/profile`
- Route Config: ✅ Defined
- Page Component: ✅ `src/pages/Profile.tsx`
- Status: **Complete**

## Additional Routes in Config Not in Sidebar

- `/reimbursements` - Route and page exist
- `/reimbursements/:id` - Route and page exist

## Implementation Progress

### Completed Tasks

- ✅ Added route configuration for existing pages
- ✅ Created components for key training features (Qualifications, Competency Units, Assessments, Reviews)
- ✅ Created common UI components (PageHeader, ActionPanel, Card, Button variants)
- ✅ Created all required Training & Development section pages
- ✅ Implemented proper TrainingLayout with tab navigation
- ✅ Connected each Training section page with the appropriate route
- ✅ Created pages for apprentice management (Training Contracts, Support Contacts)

### Next Steps

1. **High Priority:**

   - Create missing pages for remaining critical routes:
     - Workplace inspections
   - Implement similar layout components for other sections (Payroll, Safety, Compliance)
   - Connect UI components to the database via API services

2. **Medium Priority:**

   - Implement backend connectivity for new components
   - Add proper state management
   - Connect to the database through Supabase

3. **Low Priority:**

   - Enhance UI with more interactive elements
   - Add data visualization for reports
   - Improve mobile responsiveness
