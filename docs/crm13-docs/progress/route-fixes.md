# Navigation and Routing Fixes

This document outlines the changes made to fix navigation and routing issues in the CRM13 application.

## Issue Overview

Several navigation links in the sidebar were not correctly routing to their respective pages. Instead, they were falling back to the Dashboard component. The specific issues included:

1. Host Employers and Site Visits routes were defined but not properly configured in the routes configuration
2. Field Officers and Staff Directory links were not working
3. Safety section subroutes (Incidents, Compliance) were not properly linked
4. Payroll section subroutes (Rates, Claims) were not properly linked
5. Compliance section subroutes (Audits, Documents) were not properly linked
6. Training section had working routes but needed proper configuration

## Applied Fixes

### 1. Apprentice Management

- Added new pages:
  - Training Contracts page (`/apprentices/contracts`)
  - Support Contacts page (`/apprentices/support`)
- Updated route configuration to correctly link these pages
- Ensured proper navigation from the sidebar to these pages

### 2. Host Employers and Site Visits

- Updated route configuration to properly link to:
  - Host Employers List (`/employers/host`)
  - Site Visit Scheduler (`/employers/visits`)
- Changed `showInNav` property to `true` to ensure visibility in navigation

### 3. Human Resources Section

- Fixed route configuration for:
  - Main Employees page (`/employees`)
  - Field Officers page (`/employees/field`)
  - Staff Directory page (`/employees/staff`)
- Added proper labels and set `showInNav` to `true`

### 4. Safety & WHS Section

- Updated route configuration for safety subroutes:
  - Incident Reports (`/safety/incidents`)
  - Compliance Records (`/safety/compliance`)
- Added proper labels and set `showInNav` to `true`

### 5. Payroll & Finance Section

- Updated route configuration for payroll subroutes:
  - Rate Management (`/payroll/rates`)
  - Funding Claims (`/payroll/claims`)
- Added proper labels and set `showInNav` to `true`

### 6. Compliance & Quality Section

- Updated route configuration for compliance subroutes:
  - Audits (`/compliance/audits`)
  - Documents (`/compliance/documents`)
- Added proper labels and set `showInNav` to `true`

## Testing Performed

All navigation links were tested to ensure they route to the correct pages:

- Host Employers and Site Visits now correctly route to their respective components
- Field Officers and Staff Directory now work (although they still use placeholder components)
- All Safety section links now route to their respective pages
- All Payroll section links now route to their respective pages
- All Compliance section links now route to their respective pages
- All Training & Development section links continue to work correctly through the TabLayout

## Remaining Work

1. Create dedicated components for:
   - Field Officers (currently reusing Employees component)
   - Staff Directory (currently reusing Employees component)
   - Workplace Inspections (missing)
   - WHS Inspections (missing)
   - Contract Finances (missing)
   - Qualification Compliance (missing)
   - Calendar (currently reusing Dashboard)

2. Create custom layout components for:
   - Safety & WHS (currently using Dashboard as layout)
   - Payroll & Finance (currently using Dashboard as layout)
   - Compliance & Quality (currently using Dashboard as layout)

3. Connect all components to their corresponding backend API endpoints
