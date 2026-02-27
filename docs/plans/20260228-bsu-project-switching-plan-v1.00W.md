# P1 #16: BSU Project Switching with Session Handoff & Interapp Navigation

**Version:** 1.00W
**Date:** 2026-02-28
**Status:** Working
**Project:** business-suite-unified (primary), crm7, conduit, R80.3 (consumers)
**Effort:** 2 days
**Depends on:** Supabase Auth shared across all projects, chunked cookie storage in BSU

---

## Problem Statement

BSU currently links to external apps (CRM7, R80.3, Conduit) via `window.open` with no session continuity. Users must re-authenticate in each app. The `SUITE_SERVICES` config has hardcoded URLs with no Conduit entry. There is no unified app switcher or navigation bar that persists across apps.

### Current State

- `ServiceCard.tsx` opens external URLs in new tabs via `window.open`
- `SUITE_SERVICES` in `supabase.ts` has entries for crm7, r8, throughput — but **no conduit entry**
- BSU uses `cookieStorage` with `domain=.crm7.app` for cross-subdomain auth
- CRM7/R80.3 already share the `business_suite_auth` cookie on `*.crm7.app`
- Conduit uses `@supabase/ssr` with its own cookie handling

---

## Architecture Decision

### Session Handoff Strategy: Shared Domain Cookie

All BSuite apps deployed to `*.crm7.app` subdomains already share the `business_suite_auth` cookie (set with `domain=.crm7.app`). This means:

- **No token-passing needed** — Supabase session is already shared via cookie
- **Conduit needs `@supabase/ssr` configured** to read the shared cookie name `business_suite_auth`
- **Local dev** uses different ports on localhost — session sharing works via Supabase's default behavior

### Navigation Strategy: Shared App Switcher Component

A lightweight `AppSwitcher` dropdown that:

1. Lives in each app's header/sidebar
2. Shows all BSuite apps with access status
3. Navigates via `window.location.href` (same tab, preserving cookies)
4. Highlights the current app
5. Uses env vars for URLs (no hardcoding)

---

## Phase 1: BSU Service Registry Update (2h)

### 1a. Add Conduit to SUITE_SERVICES

Update `business-suite-unified/src/lib/supabase.ts`:

```typescript
const getConduitUrl = () => {
  const url = import.meta.env.VITE_CONDUIT_URL
  return url ? String(url).replace(/\/$/, '') : ''
}

// Add to SUITE_SERVICES:
conduit: {
  key: 'conduit',
  name: 'Conduit ATS',
  description: 'Recruitment and talent acquisition management',
  icon: 'Briefcase',
  url: getConduitUrl() || '/conduit',
  tier: 'professional'
}
```

### 1b. Add env vars

```env
# BSU .env.local
VITE_CONDUIT_URL=http://localhost:5680        # dev
# VITE_CONDUIT_URL=https://conduit.crm7.app   # prod
```

### 1c. Update ServiceCard navigation

Change `ServiceCard.tsx` to navigate in same tab for BSuite apps (not `window.open`):

```typescript
if (service.url.startsWith('http')) {
  // BSuite sibling app — same tab for session continuity
  window.location.href = service.url
} else {
  // Internal BSU route
  window.location.href = service.url
}
```

---

## Phase 2: Shared App Switcher Component (4h)

### 2a. Create shared config

Create `src/lib/app-switcher-config.ts` in each project (or a shared package):

```typescript
export interface BSuiteApp {
  key: string
  name: string
  shortName: string
  icon: string // Lucide icon name
  getUrl: () => string
  description: string
}

export const BSUITE_APPS: BSuiteApp[] = [
  {
    key: 'bsu',
    name: 'Business Suite',
    shortName: 'Suite',
    icon: 'LayoutDashboard',
    getUrl: () => import.meta.env.VITE_BSU_URL || 'https://suite.crm7.app',
    description: 'Dashboard & billing',
  },
  {
    key: 'crm7',
    name: 'CRM7 Professional',
    shortName: 'CRM7',
    icon: 'Users',
    getUrl: () => import.meta.env.VITE_CRM7_URL || 'https://crm7.crm7.app',
    description: 'Customer management',
  },
  {
    key: 'conduit',
    name: 'Conduit ATS',
    shortName: 'Conduit',
    icon: 'Briefcase',
    getUrl: () => import.meta.env.VITE_CONDUIT_URL || 'https://conduit.crm7.app',
    description: 'Recruitment & hiring',
  },
  {
    key: 'r8',
    name: 'R8 Calculator',
    shortName: 'R8',
    icon: 'Calculator',
    getUrl: () => import.meta.env.VITE_R8_URL || 'https://r8.crm7.app',
    description: 'Charge rate calculator',
  },
]
```

### 2b. AppSwitcher component (per project)

Create `AppSwitcher.tsx` in each project's components:

**Behavior:**

- Dropdown trigger: current app icon + name
- Dropdown content: list of all apps with icons, names, descriptions
- Current app highlighted with check icon
- Click navigates via `window.location.href` (same tab)
- Disabled state for apps user doesn't have access to (BSU tier check)
- D2C Neon Electric theme styling

**Implementation:**

- Uses Radix `DropdownMenu` (already installed in all projects)
- Lucide icons for app identification
- `currentApp` prop to highlight active app
- Env var URLs for each app

### 2c. Integration points

| Project | Location | Integration |
|---------|----------|-------------|
| BSU | `UnifiedDashboard.tsx` header | Replace hardcoded CRM7/R8 links |
| CRM7 | Sidebar header area | Add AppSwitcher below logo |
| Conduit | `(dashboard)/layout.tsx` sidebar header | Add AppSwitcher below "C" logo |
| R80.3 | Top nav bar | Add AppSwitcher to header |

---

## Phase 3: Conduit Cookie Alignment (2h)

### 3a. Align Supabase cookie name

Conduit uses `@supabase/ssr` which defaults to `sb-<project-ref>-auth-token`. For cross-app session sharing, configure it to use `business_suite_auth`:

Update `conduit/src/lib/supabase/client.ts`:

```typescript
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: 'business_suite_auth',
        domain: '.crm7.app', // shared across subdomains
        path: '/',
        sameSite: 'lax',
        secure: true,
      },
    }
  )
}
```

Update `conduit/src/lib/supabase/server.ts` similarly for server-side client.

### 3b. Middleware update

Update `conduit/src/middleware.ts` to read the `business_suite_auth` cookie name.

---

## Phase 4: Environment Configuration (1h)

### Dev environment (.env.local per project)

```env
# BSU
VITE_CRM7_URL=http://localhost:5676
VITE_CONDUIT_URL=http://localhost:5680
VITE_R8_URL=http://localhost:5690
VITE_BSU_URL=http://localhost:5675

# CRM7
VITE_BSU_URL=http://localhost:5675
VITE_CONDUIT_URL=http://localhost:5680
VITE_R8_URL=http://localhost:5690

# Conduit (Next.js uses NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_BSU_URL=http://localhost:5675
NEXT_PUBLIC_CRM7_URL=http://localhost:5676
NEXT_PUBLIC_R8_URL=http://localhost:5690

# R80.3
VITE_BSU_URL=http://localhost:5675
VITE_CRM7_URL=http://localhost:5676
VITE_CONDUIT_URL=http://localhost:5680
```

### Production (Vercel env vars)

```env
VITE_CRM7_URL=https://crm7.crm7.app
VITE_CONDUIT_URL=https://conduit.crm7.app
VITE_R8_URL=https://r8.crm7.app
VITE_BSU_URL=https://suite.crm7.app
```

---

## Phase 5: Testing & Verification (1h)

- Verify cookie sharing between BSU and CRM7 (already working)
- Verify Conduit reads `business_suite_auth` cookie
- Test AppSwitcher navigation in all 4 apps
- Test access control (tier-gated apps show disabled)
- Test local dev with different ports
- Verify no auth prompt when switching between apps

---

## Files to Create/Modify

### New files

```
business-suite-unified/src/components/AppSwitcher.tsx
business-suite-unified/src/lib/app-switcher-config.ts
crm7/src/components/AppSwitcher.tsx
crm7/src/lib/app-switcher-config.ts
conduit/src/components/common/AppSwitcher.tsx
conduit/src/lib/app-switcher-config.ts
R80.3/src/components/AppSwitcher.tsx
R80.3/src/lib/app-switcher-config.ts
```

### Modified files

```
business-suite-unified/src/lib/supabase.ts          # Add Conduit to SUITE_SERVICES
business-suite-unified/src/components/ServiceCard.tsx # Same-tab navigation
business-suite-unified/src/components/UnifiedDashboard.tsx # AppSwitcher integration
crm7/src/components/layout/Sidebar.tsx               # AppSwitcher in sidebar
conduit/src/app/(dashboard)/layout.tsx               # AppSwitcher in sidebar
conduit/src/lib/supabase/client.ts                   # Cookie name alignment
conduit/src/lib/supabase/server.ts                   # Cookie name alignment
conduit/src/middleware.ts                             # Cookie name alignment
R80.3/src/components/Header.tsx                      # AppSwitcher in header
```

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| Cookie domain mismatch in dev (localhost) | Supabase default cookies work on localhost without domain attr |
| Conduit SSR cookie name change breaks existing sessions | Deploy during low-traffic window; users re-login once |
| DRY violation with app-switcher-config in each project | Acceptable for now; shared package is P2 scope |
| Cross-origin cookie blocking (Safari ITP) | All apps on same `.crm7.app` domain — first-party cookies |

---

## Definition of Done

- [ ] Conduit added to BSU SUITE_SERVICES
- [ ] ServiceCard navigates same-tab for BSuite sibling apps
- [ ] AppSwitcher component in all 4 apps (BSU, CRM7, Conduit, R80.3)
- [ ] Conduit cookie aligned to `business_suite_auth`
- [ ] Session persists when switching between apps (no re-login)
- [ ] AppSwitcher highlights current app
- [ ] Environment variables configured for dev and documented for prod
- [ ] Roadmap updated to mark P1 #16 as complete
