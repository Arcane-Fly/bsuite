# CRM8U Repository Analysis

## Purpose
**CRM8U (CRM7R)** is a comprehensive Group Training Organisation (GTO) and labour hire management system designed for WA-based GTOs and labour hire companies. It automates:
- Apprentice/trainee management and lifecycle
- Host employer management and capacity assessment
- Training coordination and compliance
- Payroll and charge rate calculations
- Safety management and incident tracking
- Reporting, analytics, and funding claims

## Tech Stack

### Frontend
- **Framework**: React 18.2.0 + Vite (primary), Next.js 15 (documented, not yet implemented)
- **Languages**: TypeScript 5.3
- **Styling**: Tailwind CSS 3.4 + shadcn/ui
- **State**: Zustand 4.5 (planned), React Query 5.17 (planned)
- **UI Components**: Radix UI icons, Lucide React icons
- **Monorepo**: pnpm 8.15.1 with workspaces (8 modules)
- **Data viz**: Recharts 2.12
- **Forms**: React Hook Form 3.3 + Zod 3.22 validation

### Backend
- **Database**: Supabase (PostgreSQL)
  - Auth via Supabase + SSR patterns (server-side session management)
  - Role-based access control (RBAC) planned
  - Planned: WebSocket for real-time features
- **API**: Stub Express.js backend (rates-payroll module only)
- **File Storage**: Vercel Blob (planned)
- **Caching**: Redis (planned)

### Infrastructure & DevOps
- **Hosting**: Vercel (with custom domain setup)
- **CI/CD**: GitHub Actions (configured, basic)
- **Testing**: Jest 29.7 + React Testing Library + Vitest (configured, minimal tests)
- **Containerization**: Docker (planned)

## Monorepo Structure (8 Workspaces)

```
crm8u/
├── central-shell/          # Main entry point & dynamic routing (1163 LOC)
│   └── src/
│       ├── components/     # UI: button, input, table, form-field, data-table, auth, nav
│       ├── hooks/          # useAuth (auth context)
│       ├── portals/        # AdminPortal, ClientPortal, EmployeePortal (mostly stubs)
│       ├── services/       # auth.service.ts (login/signup/logout API stubs)
│       ├── stores/         # Zustand stores (notification.store)
│       └── integrations/   # Supabase client config
│
├── admin-portal/           # Admin dashboard (partial)
│   └── src/
│       ├── components/     # Stats cards, compliance alerts, charts
│       ├── pages/          # Dashboard, Index
│       └── types/          # Chart types
│
├── client-portal/          # Client-facing portal (stub)
├── employee-portal/        # Employee dashboard (stub)
├── employment-services/    # Employment API backend (stub)
├── integration-services/   # External integrations (stub)
│
├── rates-payroll/          # Charge rate calculation engine (485 LOC)
│   └── src/
│       └── ratesCalculation.ts
│           - calculateStandardModel()        # 3-leave model with all accruals
│           - calculateALEXModel()            # Excludes PHOLIDAY, sick, OTJ
│           - calculate52WeekModel()          # Fixed costs only
│           - calculateFlexibleChargeRate()   # Parameterized for custom rates
│           - fetchFairworkWageData() [STUB] # Fair Work API (timeout simulator)
│           - fetchSuperRateData() [STUB]    # Superannuation rates (timeout simulator)
│           - parseEnterpriseAgreement() [STUB] # EA file parsing
│
└── training-management/    # Training coordination (stub)
    └── src/
        └── index.ts
```

## Key Features Implemented

### Working/Partial
1. **Authentication Flow**
   - Supabase SSR integration (server-side session validation)
   - AuthProvider context + useAuth hook
   - Auth service stubs (login, signup, logout, resetPassword)
   - Protected routes component with role checking

2. **Central Shell / Navigation**
   - Dynamic portal loading via manifest (DynamicRoutes component)
   - Subscription-based routing framework
   - Three-tier nav system (top bar, sidebar, context panel)
   - Theme toggle component
   - Skeleton UI for multi-portal architecture

3. **Admin Features** (partial)
   - Dashboard stub with stats cards
   - Compliance alerts component
   - Placement charts (Recharts)
   - User management stub
   - Settings placeholder

4. **Rates & Payroll Calculation**
   - Three charge rate models (Standard, ALEX, 52-Week)
   - 14 cost components (pay, leave, public holidays, OTJ, super, workers comp, etc.)
   - Flexible parameterized calculation engine
   - Markup percentage + final charge rate
   - Enterprise agreement data interface (parsing logic stubbed)

5. **UI Component Library**
   - Tailwind + Radix UI foundation
   - Button, input, table, form-field, data-table
   - Error boundary
   - Theme toggle

### Stubbed/Incomplete
- **Employment Services API**: Only index.ts skeleton (333 LOC stub)
- **Training Management**: Only index.ts skeleton (333 LOC stub)
- **Integration Services**: Only index.ts skeleton (333 LOC stub)
- **Fair Work API integration**: Timeout simulators, not actual HTTP
- **Enterprise agreement parsing**: Interface only, no file parsing
- **Employee/Client Portals**: Placeholder TSX files
- **LMS integration**: Documented, not implemented
- **Payment processing**: Documented, not implemented
- **Reporting/analytics**: Dashboard stubs only
- **Real-time features**: WebSocket planned but not coded

## Code Quality Assessment

### Strengths
- TypeScript strict mode enabled throughout
- Modular monorepo architecture with clear separation
- Consistent file structure (components, hooks, services, types)
- Supabase SSR patterns (security-conscious)
- Error boundary implementation
- Protected routes pattern established
- Charge calculation logic well-documented with interfaces

### Weaknesses
- **Low test coverage**: Only 5 test files (AdminDashboard.test.tsx + DynamicRoutes.test.tsx), ~60% of tests are placeholder/stubs
- **Significant stubbing**: 3 backend modules are pure stubs with minimal implementation
- **Implementation status**: ~30-40% feature complete
- **API integration**: All external integrations stubbed (Fair Work API, super rates, EA parsing)
- **Documentation debt**: Architecture.md is comprehensive, but implementation status shows gaps
- **Mixed file artifacts**: Dual .tsx/.js files in some directories (build artifact clutter)
- **No database migrations**: Supabase config is minimal (config.toml only)

## File Count & Codebase Size

| Metric | Value |
|--------|-------|
| **Total LOC** | ~8,365 (TypeScript + TSX, excluding .d.ts) |
| **Central Shell** | 1,163 LOC |
| **Rates Calculation** | 485 LOC |
| **Test files** | 5 |
| **Documentation** | 11 docs/ folders with architecture, API, payroll, security guides |
| **Total size on disk** | 9.9 MB (includes node_modules dependencies) |

## Implementation Completeness

| Module | Status | Est. Completion |
|--------|--------|-----------------|
| **Central Shell** | 60% | Dynamic routing + portal loading working; auth incomplete |
| **Admin Portal** | 25% | Dashboard UI stubs; no data binding |
| **Rates & Payroll** | 35% | Models designed, calculations hardcoded; APIs stubbed |
| **Auth System** | 30% | Flow architecture clear; API integration stubbed |
| **Client/Employee Portals** | 5% | Stub files only |
| **Backend Services** | 5% | Express stubs only |
| **Testing** | 10% | Jest config; minimal test implementation |
| **Database** | 15% | Supabase connected; no migrations committed |

## Salvageable Assets for CRM7/BSuite

### High-Value Reuse
1. **Charge Rate Calculation Engine** (rates-payroll)
   - Three models (Standard, ALEX, 52-Week) + flexible parameterized approach
   - Well-structured `ChargeRateBreakdown` interface
   - **Directly applicable**: CRM7 charge-rates page duplicates R80.3 logic — this design could unify both
   - **Risk**: Hardcoded sample data (16.63 hourly rate); needs parameterization

2. **Monorepo Portal Architecture** (central-shell)
   - Dynamic route manifest pattern for multi-portal loading
   - Subscription-based routing framework
   - **Applicable**: Similar to BSuite's multi-project structure
   - **Risk**: Not yet battle-tested; portal loading is still framework-level

3. **Supabase SSR Auth Pattern**
   - Server-side session validation approach
   - AuthProvider context + useAuth hook
   - **Applicable**: BSU currently uses client-side patterns (readCookie bug noted in audit)

4. **UI Component Library Scaffolding**
   - Radix UI + Tailwind foundation (shadow/cn() utilities)
   - Form field + data table patterns
   - **Applicable**: Can inform shadcn/ui consolidation across BSuite projects

### Medium-Value Reuse
5. **Error Boundary Component**
   - React error boundary pattern for graceful failure
   - **Applicable**: Add to CRM7 error handling

6. **Protected Route Pattern**
   - Role-based route protection component
   - **Applicable**: Enhance CRM7/BSU auth guards

### Low-Value / Already Covered
- Authentication flow (BSU + CRM7 already have Supabase auth)
- Tailwind theming (BSuite has D2C theme spec)
- TypeScript config (BSuite has strict mode)

## Not Suitable for Direct Import
- **Stubbed backend**: employment-services, training-management, integration-services — pure skeletons
- **Incomplete portals**: client/employee portals are placeholders
- **Hardcoded rates data**: 16.63 hourly rate + fixed breakdowns in rates calculation

## Next Steps for CRM8U

1. **Immediate**: Implement Fair Work API integration (replace timeout simulators)
2. **High Priority**: Build out training-management and employment-services backend logic
3. **Data Layer**: Supabase migrations (apprentice, host, training, payroll schemas)
4. **Testing**: Achieve 70%+ coverage (currently ~10%)
5. **Portals**: Implement client/employee portal features
6. **Integration**: DTWD adapter, RTO systems, payment gateway

## Comparison to BSuite

| Aspect | CRM8U | BSuite |
|--------|-------|--------|
| **Maturity** | Early stage (30-40% complete) | CRM7: 35-40% production-ready |
| **Charge calc** | Designed, hardcoded; 3 models | R80.3: Dual engines (DRY violation) |
| **Portals** | Framework in place | Unified entry point (BSU) + submodules |
| **Testing** | ~10% coverage | CRM7: ~80% critical paths |
| **Fair Work integration** | Stubbed | CRM7: Live API + DB cache fallback |
| **Auth** | SSR pattern started | Production Supabase auth |
| **Stack alignment** | React + Vite + Supabase | Same (React + Vite + Supabase) |

## Recommendation for BSuite Integration

**Salvage the rates calculation models and monorepo portal architecture, but do NOT fork entire codebase.** CRM8U is too early-stage for production adoption. Instead:

1. Extract `ratesCalculation.ts` → Enhance `@bsuite/charge-calc` package
2. Review central-shell's dynamic routing for future BSuite portal consolidation
3. Use Supabase SSR patterns to fix BSU auth bug (readCookie → readCookieRaw)
4. Reference architecture docs for multi-service integration patterns

The codebases are architecturally aligned (same stack, similar domain), but CRM8U needs 6-12 months of development before being production-ready.
