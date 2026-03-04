# CRM8U Code Snippets & Patterns (For Reference)

## Key Files Location in CRM8U Repository

```
https://github.com/GaryOcean428/crm8u.git

rates-payroll/src/ratesCalculation.ts     # 485 LOC - Charge rate models
central-shell/src/services/auth.service.ts # Auth patterns
central-shell/src/hooks/useAuth.ts         # Auth context hook
central-shell/src/components/            # UI component library
central-shell/src/portals/               # Portal architecture
```

## 1. Charge Rate Calculation Models (Directly Applicable to @bsuite/charge-calc)

### ChargeRateBreakdown Interface
```typescript
export interface ChargeRateBreakdown {
  payRate: number;                   // Base hourly wage
  annualLeave: number;               // Annual leave accrual
  annualLeaveAdjustment: number;     // Leave loading on annual leave
  leaveLoading: number;              // Leave loading cost
  publicHolidays: number;            // Public holiday cost
  sickLeave: number;                 // Sick leave cost
  offTheJobTraining: number;         // OTJ training cost
  studyCosts: number;                // Study/training expenses
  protectiveClothing: number;        // Protective clothing
  superannuation: number;            // Super contribution (e.g., 11.5%)
  workersCompensation: number;       // Workers comp insurance
  totalCost: number;                 // Sum of all components
  markUpPercentage: number;          // Markup applied (e.g., 15%)
  chargeRate: number;                // Final hourly charge rate
}
```

### FlexibleChargeParams Interface
```typescript
export interface FlexibleChargeParams {
  hourlyRateAward: number;        // From Fair Work API or manual entry
  weeklyHours: number;            // e.g., 38
  totalPaidWeeks: number;         // e.g., 52
  annualLeaveWeeks: number;       // e.g., 4
  trainingWeeks: number;          // e.g., 5
  leaveLoadingPercent: number;    // e.g., 0.175 (17.5%)
  superRate: number;              // e.g., 0.115 (11.5%)
  workersCompRate: number;        // e.g., 0.047 (4.7%)
  trainingFees: number;           // Annual training fees
  otherOnCosts: number;           // Additional oncosts
  fundingOffset: number;          // Government funding reduction
  marginRate: number;             // Markup percentage (0.15 = 15%)
  onSiteWeeks: number;            // Weeks on-site vs OTJ
}
```

### Three Models
- **Standard Model**: Includes all leave accruals, OTJ, public holidays
- **ALEX Model**: Excludes public holidays, sick leave, OTJ training
- **52 Week Model**: Fixed costs only, excludes all leave accruals

## 2. Supabase SSR Auth Pattern (For BSU Fix)

### AuthService Implementation
```typescript
class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    if (response.error) throw response.error;
    return response.data;
  }

  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/signup', data);
    if (response.error) throw response.error;
    return response.data;
  }

  async logout(): Promise<void> {
    const response = await api.post<void>('/auth/logout');
    if (response.error) throw response.error;
  }

  async resetPassword(email: string): Promise<void> {
    const response = await api.post<void>('/auth/reset-password', { email });
    if (response.error) throw response.error;
  }

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    if (response.error) throw response.error;
    return response.data;
  }
}
```

### useAuth Hook Pattern
```typescript
import { useContext } from 'react';
import { AuthContext } from '@/AuthProvider';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export { AuthContext };
```

## 3. Protected Routes Pattern

```typescript
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/protected-route';
import AdminDashboard from './AdminDashboard';
import ManageUsers from './ManageUsers';

const AdminPortal: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredRole="admin">
            <ManageUsers />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default AdminPortal;
```

## 4. Central Shell Dynamic Portal Loading

From `projects_outline.md` section on "Central Shell Advanced Integration":

- **AuthProvider** wraps entire application for global session management
- **Subscription-based routing**: After auth, portals load dynamically based on user subscription level
- **Manifest-based approach**: Each portal provides a manifest detailing routes and features
- **DynamicRoutes component**: Lazy-loads components, handles unimplemented gracefully
- **Environment variables**: Supabase config via central shell environment

This pattern is similar to BSuite's need to unify business-suite-unified + submodules.

## 5. Monorepo Configuration

### pnpm-workspace.yaml
```yaml
packages:
  - 'central-shell'
  - 'admin-portal'
  - 'client-portal'
  - 'employee-portal'
  - 'employment-services'
  - 'integration-services'
  - 'rates-payroll'
  - 'training-management'
```

### Central Shell package.json Exports
```json
{
  "exports": {
    "./components/*": "./src/components/*",
    "./lib/*": "./src/lib/*"
  },
  "peerDependencies": {
    "@supabase/supabase-js": "^2.39.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

## 6. Fair Work API Integration Points (Currently Stubbed)

### Fair Work Wage Data Stub
```typescript
export async function fetchFairworkWageData(occupation: string, level: string): Promise<FairworkWageData> {
  // Currently timeout simulator - needs HTTP integration
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ baseHourlyRate: 16.63 });
    }, 500);
  });
}
```

### To Replace With Real API
- Fair Work MAPD API endpoint: `https://www.fairwork.gov.au/...`
- Award code lookup (e.g., MA000025 for apprentices)
- Year/level-based wage extraction
- Cache strategy (DB → fallback to API)

### Enterprise Agreement Parsing Stub
```typescript
export async function parseEnterpriseAgreement(fileContent: string): Promise<EnterpriseAgreementData> {
  // Stub: Parse EA PDF or text file
  // Extract: baseHourlyRate, superRate, leave provisions, etc.
  // Currently unimplemented
  return { baseHourlyRate: 0, superRate: 0 };
}
```

## 7. UI Component Library Foundation

### Available Components
- Button, Input, Table, Form Field, Data Table
- Error Boundary
- Theme Toggle
- Navigation components (UserNav, Sidebar)
- Protected Route wrapper

### shadcn/ui Integration Pattern
```typescript
// Radix UI + Tailwind CSS + class-variance-authority
// Directly compatible with BSuite's D2C theme

import { cn } from '@/lib/utils';
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      },
    },
  }
)
```

## Key Differences from BSuite

| Aspect | CRM8U | BSuite Approach |
|--------|-------|-----------------|
| **Auth** | SSR + context pattern | Client + SSR hybrid (has readCookie bug) |
| **Charge Calc** | 3 models + flexible params | R80.3: Dual engines (DRY issue) |
| **Portals** | Manifest-based dynamic load | Separate submodule repos |
| **Testing** | Jest configured, ~10% coverage | CRM7: ~80% coverage |
| **Fair Work API** | Stubbed timeout simulators | CRM7: Live API + DB cache |

## Recommendations for Adoption

### Immediate (Low Risk)
1. Review `ratesCalculation.ts` patterns for `@bsuite/charge-calc` enhancement
2. Copy error boundary pattern to CRM7
3. Reference protected route pattern for CRM7/BSU auth guards

### Medium Term (Requires Adaptation)
1. Extract Fair Work integration approach (stub → real API pattern)
2. Review monorepo portal loading for future BSuite consolidation
3. Adapt Supabase SSR patterns to fix BSU `readCookie` bug

### Long Term (Not Recommended Now)
1. Do NOT fork entire CRM8U codebase into BSuite
2. CRM8U is too early-stage (30-40% complete vs CRM7's 35-40% production-ready)
3. Wait for CRM8U to reach 70%+ maturity before deeper integration

## Testing & Documentation Status

### Tests Available
- `central-shell/src/__tests__/integration/DynamicRoutes.test.tsx`
- `central-shell/src/__tests__/integration/ErrorBoundary.test.tsx`
- `central-shell/src/portals/AdminDashboard.test.tsx`
- 5 test files total, ~60% placeholder stubs

### Documentation Available
```
docs/
├── architecture/README.md           # System design, auth flow, integrations
├── implementation/STATUS.md         # Current priorities & roadmap
├── api/README.md                    # API documentation (planned)
├── payroll/WAGE_CALCULATION.md      # Charge rate details
└── deployment/, security/, etc.
```

## Supabase Configuration

CRM8U uses minimal Supabase config (`config.toml` only), no migrations committed. For production adoption would need:
- User table schema
- Apprentice/trainee tables
- Host employer tables
- Training records
- Payroll/charge rate tables
- RBAC policies

Compare to BSuite's comprehensive Supabase setup in submodule repos.
