# R80.3 + CRM7 Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire R80.3's charge-rate calc engine to live Fair Work award data, payroll tax, EAs, and BOOT; push results to CRM7 via shared Supabase tables; extract AppSwitcher and cookie storage to `@bsuite/nav-core`; delete dead code.

**Architecture:** Shared Supabase backend as data layer (Option A+B: direct table writes + CRM7 API cross-check). Both apps read/write `award_rate_cache`, `host_charge_rates`, `enterprise_agreements`, and `apprentice_wage_schedules`. R80.3 generates, CRM7 consumes and validates.

**Tech Stack:** React + Vite (R80.3), React + Vite (CRM7), Next.js 16 (conduit), `@bsuite/charge-calc`, `@bsuite/nav-core`, Supabase (shared), pnpm workspaces

---

## Milestone 1: Foundation — DRY Cleanup + Schema + nav-core v0.2

---

### Task 1.1: Delete deprecated R80.3 calc files

**Files:**
- Delete: `R80.3/src/lib/r8Calc.ts`
- Delete: `R80.3/src/utils/calculationUtils.ts`
- Modify: `R80.3/src/utils/index.ts` (barrel — confirm these are excluded)

**Context:** `r8Calc.ts` (101L) and `calculationUtils.ts` (310L) have zero live importers. `calcBridge.ts` is the canonical bridge to `@bsuite/charge-calc`. The `utils/index.ts` barrel already excludes them.

**Step 1: Verify zero importers**
```bash
cd /home/braden/Desktop/Dev/bsuite/R80.3
grep -rn "from.*r8Calc\|from.*calculationUtils" src/ --include="*.ts" --include="*.tsx"
```
Expected: no output (only comments/docstrings in calcBridge.ts mentioning the names).

**Step 2: Delete the files**
```bash
rm src/lib/r8Calc.ts
rm src/utils/calculationUtils.ts
```

**Step 3: Confirm barrel excludes them**
```bash
cat src/utils/index.ts | grep -E "r8Calc|calculationUtils"
```
Expected: no output (already excluded per previous work).

**Step 4: Run tests**
```bash
pnpm test 2>&1 | tail -8
```
Expected: all passing, no failures referencing r8Calc or calculationUtils.

**Step 5: Commit**
```bash
cd /home/braden/Desktop/Dev/bsuite/R80.3
git add -A
git commit -m "refactor(r80): delete deprecated calc engines r8Calc + calculationUtils (#91)

Both files had zero live importers. calcBridge.ts delegates to @bsuite/charge-calc.
All tests pass."
```

---

### Task 1.2: Extract `createCookieStorage` to `@bsuite/nav-core`

**Files:**
- Create: `packages/nav-core/src/cookieStorage.ts`
- Modify: `packages/nav-core/src/index.ts`
- Modify: `packages/nav-core/package.json` (bump to 0.2.0)
- Modify: `R80.3/src/services/supabaseClient.ts` (consume from nav-core)
- Modify: `crm7/src/lib/supabase.ts` (consume from nav-core)
- Modify: `business-suite-unified/src/lib/supabase.ts` (consume + fix readCookieRaw bug)

**Context:** The chunked cookie storage (~100 lines) is triplicated across R80.3, CRM7, BSU. BSU has a known bug: one path calls `readCookie()` instead of `readCookieRaw()` when reassembling chunks, causing double-URI-decode corruption. The canonical implementation is in `crm7/src/lib/supabase.ts` (correct). Extract it to nav-core.

**Step 1: Read the correct implementation**
```bash
cat /home/braden/Desktop/Dev/bsuite/crm7/src/lib/supabase.ts | head -120
```
Note the `readCookieRaw()` function — this is the correct one to extract.

**Step 2: Write `packages/nav-core/src/cookieStorage.ts`**

```typescript
// packages/nav-core/src/cookieStorage.ts
/**
 * Shared chunked cookie storage for cross-subdomain Supabase sessions.
 *
 * Supabase session JSON can exceed the 4,096-byte browser cookie limit (RFC 6265 §6.1)
 * once URI-encoded. We split values across numbered chunks (`key.0`, `key.1`, …)
 * and reassemble on read — same approach as @supabase/ssr.
 *
 * Usage:
 *   const storage = createCookieStorage({ domain: '.crm7.app' })
 *   createClient(url, key, { auth: { storage } })
 */

export interface CookieStorageOptions {
  /** Cross-subdomain cookie domain, e.g. '.crm7.app'. Only set on matching hostnames. */
  domain?: string
  /** Max cookie age in seconds. Default: 2,592,000 (30 days). */
  maxAge?: number
  /** Chunk size in bytes. Default: 3,500 (leaves headroom under 4,096 limit). */
  chunkSize?: number
}

export interface CookieStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function createCookieStorage(options: CookieStorageOptions = {}): CookieStorageLike {
  const { domain, maxAge = 2_592_000, chunkSize = 3_500 } = options

  function cookieAttrs(): string {
    const parts: string[] = []
    if (domain && typeof window !== 'undefined' && window.location.hostname.endsWith(domain.replace(/^\./, ''))) {
      parts.push(`domain=${domain}`)
    }
    parts.push('path=/')
    parts.push(`max-age=${maxAge}`)
    parts.push('SameSite=Lax')
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      parts.push('Secure')
    }
    return parts.join('; ')
  }

  function deleteAttrs(): string {
    const parts: string[] = []
    if (domain && typeof window !== 'undefined' && window.location.hostname.endsWith(domain.replace(/^\./, ''))) {
      parts.push(`domain=${domain}`)
    }
    parts.push('path=/')
    parts.push('max-age=0')
    parts.push('SameSite=Lax')
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      parts.push('Secure')
    }
    return parts.join('; ')
  }

  /** Read raw (URI-encoded) cookie value without decoding. */
  function readCookieRaw(name: string): string | null {
    if (typeof document === 'undefined') return null
    const prefix = `${name}=`
    const entry = document.cookie.split('; ').find((c) => c.startsWith(prefix))
    return entry ? entry.slice(prefix.length) : null
  }

  function removeItem(key: string): void {
    if (typeof document === 'undefined') return
    const attrs = deleteAttrs()
    document.cookie = `${key}=; ${attrs}`
    for (let i = 0; i < 20; i++) {
      const chunk = readCookieRaw(`${key}.${i}`)
      if (chunk === null) break
      document.cookie = `${key}.${i}=; ${attrs}`
    }
  }

  return {
    getItem(key: string): string | null {
      // Try un-chunked first (fast path for small values / legacy cookies)
      const single = readCookieRaw(key)
      if (single) return decodeURIComponent(single)

      // Reassemble chunks — read raw to avoid splitting encoded sequences
      const chunks: string[] = []
      for (let i = 0; ; i++) {
        const chunk = readCookieRaw(`${key}.${i}`)
        if (chunk === null) break
        chunks.push(chunk)
      }
      // Decode once after joining all chunks
      return chunks.length > 0 ? decodeURIComponent(chunks.join('')) : null
    },

    setItem(key: string, value: string): void {
      if (typeof document === 'undefined') return
      const attrs = cookieAttrs()
      const encoded = encodeURIComponent(value)

      removeItem(key) // clear any previous chunks first

      if (encoded.length <= chunkSize) {
        document.cookie = `${key}=${encoded}; ${attrs}`
      } else {
        for (let i = 0; i * chunkSize < encoded.length; i++) {
          const slice = encoded.substring(i * chunkSize, (i + 1) * chunkSize)
          document.cookie = `${key}.${i}=${slice}; ${attrs}`
        }
      }
    },

    removeItem,
  }
}
```

**Step 3: Write tests for `createCookieStorage`**

Create `packages/nav-core/src/__tests__/cookieStorage.test.ts`:
```typescript
import { createCookieStorage } from '../cookieStorage'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock document.cookie with a simple in-memory store
function mockDocumentCookie() {
  const store: Record<string, string> = {}
  let cookieStr = ''

  Object.defineProperty(document, 'cookie', {
    get: () => Object.entries(store).map(([k, v]) => `${k}=${v}`).join('; '),
    set: (val: string) => {
      const [keyVal, ...attrs] = val.split('; ')
      const [key, value] = keyVal.split('=')
      const maxAge = attrs.find(a => a.startsWith('max-age='))
      if (maxAge && parseInt(maxAge.split('=')[1]) === 0) {
        delete store[key]
      } else if (value !== undefined) {
        store[key] = value
      }
    },
    configurable: true,
  })
  return store
}

describe('createCookieStorage', () => {
  beforeEach(() => {
    mockDocumentCookie()
  })

  it('round-trips a short value', () => {
    const storage = createCookieStorage()
    storage.setItem('test', 'hello world')
    expect(storage.getItem('test')).toBe('hello world')
  })

  it('round-trips a value exceeding chunkSize', () => {
    const storage = createCookieStorage({ chunkSize: 10 })
    const long = 'a'.repeat(25)
    storage.setItem('big', long)
    expect(storage.getItem('big')).toBe(long)
  })

  it('returns null for missing key', () => {
    const storage = createCookieStorage()
    expect(storage.getItem('missing')).toBeNull()
  })

  it('removes item', () => {
    const storage = createCookieStorage()
    storage.setItem('key', 'value')
    storage.removeItem('key')
    expect(storage.getItem('key')).toBeNull()
  })

  it('removes chunked items on removeItem', () => {
    const storage = createCookieStorage({ chunkSize: 5 })
    storage.setItem('chunked', 'hello world long value')
    storage.removeItem('chunked')
    expect(storage.getItem('chunked')).toBeNull()
  })

  it('overwrites previous value without leaving stale chunks', () => {
    const storage = createCookieStorage({ chunkSize: 5 })
    storage.setItem('k', 'aaaaaaaaaa') // creates chunks
    storage.setItem('k', 'x')           // replaces with single cookie
    expect(storage.getItem('k')).toBe('x')
  })
})
```

**Step 4: Run tests**
```bash
cd /home/braden/Desktop/Dev/bsuite/packages/nav-core
pnpm test 2>&1 | tail -10
```
Expected: all cookie storage tests pass.

**Step 5: Export from nav-core index**

Add to `packages/nav-core/src/index.ts`:
```typescript
export { createCookieStorage } from './cookieStorage'
export type { CookieStorageOptions, CookieStorageLike } from './cookieStorage'
```

**Step 6: Bump nav-core version to 0.2.0**
```bash
cd /home/braden/Desktop/Dev/bsuite/packages/nav-core
npm version minor  # bumps to 0.2.0
```

**Step 7: Build and publish**
```bash
pnpm build
npm publish --access public
```
Expected: package published as `@bsuite/nav-core@0.2.0`.

**Step 8: Update consumers — R80.3**

In `R80.3/src/services/supabaseClient.ts`, replace the entire cookie storage block with:
```typescript
import { createCookieStorage } from '@bsuite/nav-core'

const cookieStorage = createCookieStorage({ domain: '.crm7.app' })
```
Remove the `CHUNK_SIZE`, `MAX_AGE`, `cookieAttrs`, `deleteAttrs`, `readCookie`, `readCookieRaw`, and `cookieStorage` object — replaced by the import.

**Step 9: Update consumers — CRM7**

Same replacement in `crm7/src/lib/supabase.ts`.

**Step 10: Update consumers — BSU (fixes the readCookieRaw bug)**

In `business-suite-unified/src/lib/supabase.ts`, same replacement.
The `readCookie()` call that should be `readCookieRaw()` is eliminated entirely by the shared implementation.

**Step 11: Update pnpm workspace deps**

In each consumer's `package.json`, change:
```json
"@bsuite/nav-core": "^0.1.0"
```
to:
```json
"@bsuite/nav-core": "^0.2.0"
```
Then run `pnpm install` in each project.

**Step 12: Verify TypeScript**
```bash
for d in R80.3 crm7 business-suite-unified; do
  echo "=== $d ===" && cd /home/braden/Desktop/Dev/bsuite/$d && npx tsc --noEmit 2>&1 | grep -v "^npm warn" | head -5
done
```
Expected: no errors.

**Step 13: Run tests in each project**
```bash
cd /home/braden/Desktop/Dev/bsuite/R80.3 && pnpm test 2>&1 | tail -5
cd /home/braden/Desktop/Dev/bsuite/crm7 && npx vitest run 2>&1 | tail -5
```

**Step 14: Commit**
```bash
cd /home/braden/Desktop/Dev/bsuite/packages/nav-core
git add -A && git commit -m "feat(nav-core): v0.2.0 — extract createCookieStorage (fixes BSU readCookieRaw bug)

Shared chunked cookie storage for cross-subdomain Supabase sessions.
6 tests. Eliminates 3x duplication across R80.3, CRM7, BSU."

cd /home/braden/Desktop/Dev/bsuite/R80.3
git add -A && git commit -m "refactor(r80): use @bsuite/nav-core createCookieStorage (#91)"

cd /home/braden/Desktop/Dev/bsuite/crm7
git add -A && git commit -m "refactor(crm7): use @bsuite/nav-core createCookieStorage (#91)"

cd /home/braden/Desktop/Dev/bsuite/business-suite-unified
git add -A && git commit -m "fix(bsu): use @bsuite/nav-core createCookieStorage — fixes readCookieRaw bug (#91)"
```

---

### Task 1.3: Extract `AppSwitcher` to `@bsuite/nav-core`

**Files:**
- Create: `packages/nav-core/src/AppSwitcher.tsx`
- Create: `packages/nav-core/src/__tests__/AppSwitcher.test.tsx`
- Modify: `packages/nav-core/src/index.ts`
- Modify: `R80.3/src/components/AppSwitcher.tsx` (thin wrapper)
- Modify: `crm7/src/components/AppSwitcher.tsx` (thin wrapper)
- Modify: `business-suite-unified/src/components/AppSwitcher.tsx` (thin wrapper)
- Modify: `conduit/src/components/AppSwitcher.tsx` (thin wrapper)

**Context:** 4 near-identical AppSwitcher components (~149L each). Key difference: conduit uses `process.env.NEXT_PUBLIC_*`, others use `import.meta.env.VITE_*`. The shared component accepts `apps` as props — each project resolves its own env vars and passes them in.

**Step 1: Write the shared component**

`packages/nav-core/src/AppSwitcher.tsx`:
```tsx
'use client'
/**
 * AppSwitcher — Cross-app navigation dropdown, shared by all BSuite apps.
 *
 * Each consuming project passes its app list as props (resolving env vars locally).
 * The component has no dependency on import.meta.env or process.env.
 *
 * Usage (Vite project):
 *   const apps = [
 *     { key: 'bsu', name: 'Business Suite', shortName: 'BSU', icon: Grid3X3,
 *       url: import.meta.env.VITE_BSU_URL || 'https://suite.crm7.app',
 *       description: 'Portal & dashboard', current: false },
 *   ]
 *   <AppSwitcher apps={apps} currentApp="r8" />
 */

import { ChevronDown, Grid3X3 } from 'lucide-react'
import { type ElementType, useEffect, useRef, useState } from 'react'

export interface AppEntry {
  key: string
  name: string
  shortName: string
  icon: ElementType
  url: string
  description: string
  current?: boolean
}

export interface AppSwitcherProps {
  apps: AppEntry[]
  currentApp?: string
  className?: string
}

export function AppSwitcher({ apps, currentApp, className = '' }: AppSwitcherProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = apps.find((a) => a.key === currentApp) ?? apps[0]

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
      >
        {current && <current.icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
        <span className="hidden sm:inline">{current?.shortName ?? 'Apps'}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-popover shadow-lg"
        >
          <div className="p-1">
            {apps.map((app) => (
              <a
                key={app.key}
                href={app.url}
                role="menuitem"
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-accent ${
                  app.key === currentApp ? 'bg-accent/50 font-medium' : ''
                }`}
                aria-current={app.key === currentApp ? 'page' : undefined}
              >
                <app.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{app.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{app.description}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Write tests**

`packages/nav-core/src/__tests__/AppSwitcher.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AppSwitcher } from '../AppSwitcher'
import { Grid3X3, Users } from 'lucide-react'

const apps = [
  { key: 'bsu', name: 'Business Suite', shortName: 'BSU', icon: Grid3X3, url: '/bsu', description: 'Portal' },
  { key: 'crm7', name: 'CRM7', shortName: 'CRM7', icon: Users, url: '/crm7', description: 'CRM' },
]

it('renders current app button', () => {
  render(<AppSwitcher apps={apps} currentApp="bsu" />)
  expect(screen.getByText('BSU')).toBeInTheDocument()
})

it('opens dropdown on click', () => {
  render(<AppSwitcher apps={apps} currentApp="bsu" />)
  fireEvent.click(screen.getByRole('button'))
  expect(screen.getByRole('menu')).toBeInTheDocument()
  expect(screen.getByText('Business Suite')).toBeInTheDocument()
  expect(screen.getByText('CRM7')).toBeInTheDocument()
})

it('closes on escape key', () => {
  render(<AppSwitcher apps={apps} currentApp="bsu" />)
  fireEvent.click(screen.getByRole('button'))
  expect(screen.getByRole('menu')).toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

it('marks current app with aria-current', () => {
  render(<AppSwitcher apps={apps} currentApp="bsu" />)
  fireEvent.click(screen.getByRole('button'))
  const bsuLink = screen.getByRole('menuitem', { name: /Business Suite/ })
  expect(bsuLink).toHaveAttribute('aria-current', 'page')
})
```

**Step 3: Run tests**
```bash
cd /home/braden/Desktop/Dev/bsuite/packages/nav-core && pnpm test 2>&1 | tail -10
```

**Step 4: Export from index**

Add to `packages/nav-core/src/index.ts`:
```typescript
export { AppSwitcher } from './AppSwitcher'
export type { AppEntry, AppSwitcherProps } from './AppSwitcher'
```

**Step 5: Build and publish**
```bash
pnpm build && npm publish --access public
# Already at 0.2.0 — no bump needed (AppSwitcher is part of same minor release as cookie storage)
```

**Step 6: Replace each project's AppSwitcher with a thin wrapper**

For each of R80.3, CRM7, BSU, conduit — replace the existing `AppSwitcher.tsx` with a thin wrapper that resolves env vars and passes them as props. Example for R80.3:

```tsx
// R80.3/src/components/AppSwitcher.tsx
import { AppSwitcher as NavCoreAppSwitcher, type AppEntry } from '@bsuite/nav-core'
import { Calculator, Grid3X3, UserSearch, Users } from 'lucide-react'

const APPS: AppEntry[] = [
  {
    key: 'bsu', name: 'Business Suite', shortName: 'BSU', icon: Grid3X3,
    url: import.meta.env.VITE_BSU_URL || 'https://suite.crm7.app',
    description: 'Portal & dashboard',
  },
  {
    key: 'crm7', name: 'CRM7 Professional', shortName: 'CRM7', icon: Users,
    url: import.meta.env.VITE_CRM7_URL || 'https://crm.crm7.app',
    description: 'CRM with AI insights',
  },
  {
    key: 'conduit', name: 'Conduit ATS', shortName: 'Conduit', icon: UserSearch,
    url: import.meta.env.VITE_CONDUIT_URL || 'https://conduit.crm7.app',
    description: 'Recruitment & talent',
  },
  {
    key: 'r8', name: 'R8 Calculator', shortName: 'R8', icon: Calculator,
    url: import.meta.env.VITE_R8_URL || 'https://r8.crm7.app',
    description: 'Wage calculator',
  },
]

export function AppSwitcher() {
  return <NavCoreAppSwitcher apps={APPS} currentApp="r8" />
}
export default AppSwitcher
```

Repeat the pattern for CRM7 (`currentApp="crm7"`), BSU (`currentApp="bsu"`), conduit (`currentApp="conduit"`, use `process.env.NEXT_PUBLIC_*` instead of `import.meta.env.VITE_*`).

**Step 7: Verify build in each project**
```bash
for d in R80.3 crm7 business-suite-unified; do
  echo "=== $d ===" && cd /home/braden/Desktop/Dev/bsuite/$d && npx tsc --noEmit 2>&1 | grep -v "^npm warn" | head -5
done
cd /home/braden/Desktop/Dev/bsuite/conduit && pnpm build 2>&1 | tail -5
```

**Step 8: Commit**
```bash
git add -A && git commit -m "refactor: extract AppSwitcher to @bsuite/nav-core v0.2.0 (#91)

Eliminates 4x copy-paste (~600L). Each project provides env-resolved app list
as props. nav-core component is env-agnostic, works in Vite and Next.js."
```

---

### Task 1.4: Schema migration — 4 new shared tables

**Files:**
- Create: `crm7/supabase/migrations/20260304100000_wage_conditions_schema.sql`

**Context:** Creates `award_rate_cache`, `enterprise_agreements`, `host_charge_rates`, `apprentice_wage_schedules` in the shared Supabase backend. All additive — no existing tables modified.

**Step 1: Write the migration**

Create `crm7/supabase/migrations/20260304100000_wage_conditions_schema.sql`:

```sql
-- ============================================================================
-- Wage/Conditions Integration Schema
-- Shared tables for R80.3 ↔ CRM7 bidirectional charge rate sync
-- ============================================================================

-- ---------------------------------------------------------------------------
-- award_rate_cache
-- Shared cache for Fair Work API award rates. Both apps read/write.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS award_rate_cache (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
  award_code          TEXT NOT NULL,
  classification_code TEXT,
  year_of_trade       INT,
  effective_date      DATE NOT NULL,
  hourly_rate         DECIMAL(10,4) NOT NULL,
  source              TEXT NOT NULL DEFAULT 'fwc-api'
                        CHECK (source IN ('fwc-api','manual','jodie','wc-state-minimum','payroll-tax')),
  state_code          TEXT,        -- For payroll-tax and wc-state-minimum records: 'WA','VIC',...
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ,
  UNIQUE (tenant_id, award_code, classification_code, year_of_trade, effective_date, COALESCE(state_code,''))
);

ALTER TABLE award_rate_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON award_rate_cache
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status = 'active'));
CREATE INDEX idx_award_rate_cache_lookup
  ON award_rate_cache (tenant_id, award_code, year_of_trade, effective_date);

-- ---------------------------------------------------------------------------
-- enterprise_agreements
-- GTOs are not signatories; they link/upload EAs for host mirroring.
-- FWC approval implies BOOT passed.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enterprise_agreements (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID REFERENCES tenants(id) ON DELETE CASCADE,
  fwc_agreement_id        TEXT,
  fwc_document_url        TEXT,
  name                    TEXT NOT NULL,
  employer_name           TEXT,
  commencement_date       DATE,
  expiry_date             DATE,
  status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','expired','suspended')),
  storage_path            TEXT,
  underpinning_award_code TEXT,
  boot_approved           BOOLEAN NOT NULL DEFAULT TRUE,
  classifications         JSONB,
  created_by              UUID REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE enterprise_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON enterprise_agreements
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status = 'active'));

-- ---------------------------------------------------------------------------
-- host_charge_rates
-- Canonical charge rates per host employer. Both apps write (source_app tag).
-- CRM7 cross-checks R80.3 rates and sets crm7_verified.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS host_charge_rates (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID REFERENCES tenants(id) ON DELETE CASCADE,
  host_employer_id        UUID REFERENCES host_employers(id) ON DELETE CASCADE,
  source_app              TEXT NOT NULL CHECK (source_app IN ('r80','crm7','manual')),
  rate_source_type        TEXT NOT NULL CHECK (rate_source_type IN ('award','enterprise_agreement','custom')),
  enterprise_agreement_id UUID REFERENCES enterprise_agreements(id),
  charge_rate_hourly      DECIMAL(10,2) NOT NULL,
  effective_from          DATE NOT NULL,
  effective_to            DATE,
  calc_config             JSONB,
  calc_result             JSONB,
  crm7_verified           BOOLEAN,
  crm7_verified_at        TIMESTAMPTZ,
  notes                   TEXT,
  created_by              UUID REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE host_charge_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON host_charge_rates
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status = 'active'));
CREATE INDEX idx_host_charge_rates_employer
  ON host_charge_rates (tenant_id, host_employer_id, effective_from DESC);

-- ---------------------------------------------------------------------------
-- apprentice_wage_schedules
-- Wage schedule for an apprentice at a specific host employer.
-- rate_source_type determines which on-costs apply.
-- Custom rates require boot_status = 'passed' before save.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS apprentice_wage_schedules (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID REFERENCES tenants(id) ON DELETE CASCADE,
  apprentice_id           UUID NOT NULL,
  host_employer_id        UUID REFERENCES host_employers(id),
  rate_source_type        TEXT NOT NULL CHECK (rate_source_type IN ('award','enterprise_agreement','custom')),
  enterprise_agreement_id UUID REFERENCES enterprise_agreements(id),
  award_code              TEXT,
  classification_code     TEXT,
  year_of_trade           INT,
  base_hourly_rate        DECIMAL(10,4) NOT NULL,
  super_rate              DECIMAL(6,4) NOT NULL DEFAULT 0.12,
  payroll_tax_rate        DECIMAL(6,4),
  payroll_tax_state       TEXT,
  wc_rate                 DECIMAL(6,4),
  leave_loading           DECIMAL(6,4) NOT NULL DEFAULT 0.175,
  hours_per_week          DECIMAL(5,2) NOT NULL DEFAULT 38,
  employment_type         TEXT NOT NULL DEFAULT 'full_time'
                            CHECK (employment_type IN ('full_time','part_time','school_based')),
  boot_status             TEXT CHECK (boot_status IN ('passed','failed','not_required','pending')),
  boot_checked_at         TIMESTAMPTZ,
  boot_result             JSONB,
  effective_from          DATE NOT NULL,
  effective_to            DATE,
  sync_source             TEXT CHECK (sync_source IN ('r80','crm7','manual')),
  last_synced_at          TIMESTAMPTZ,
  created_by              UUID REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE apprentice_wage_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON apprentice_wage_schedules
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status = 'active'));
CREATE INDEX idx_wage_schedules_apprentice
  ON apprentice_wage_schedules (tenant_id, apprentice_id, effective_from DESC);

-- Add trigger to update updated_at on all new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER award_rate_cache_updated_at
  BEFORE UPDATE ON award_rate_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER enterprise_agreements_updated_at
  BEFORE UPDATE ON enterprise_agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER host_charge_rates_updated_at
  BEFORE UPDATE ON host_charge_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER apprentice_wage_schedules_updated_at
  BEFORE UPDATE ON apprentice_wage_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Apply the migration locally (if Supabase CLI available)**
```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
supabase db push 2>&1 | tail -10
```
If CLI not available, apply via Supabase dashboard SQL editor.

**Step 3: Add types to CRM7 entities**

Add to `crm7/src/types/entities.ts` (append before last line):
```typescript
// ---------------------------------------------------------------------------
// Wage/Conditions Integration (R80.3 ↔ CRM7 bidirectional sync)
// ---------------------------------------------------------------------------
export interface AwardRateCache extends BaseEntity {
  tenant_id: string
  award_code: string
  classification_code?: string
  year_of_trade?: number
  effective_date: string
  hourly_rate: number
  source: 'fwc-api' | 'manual' | 'jodie' | 'wc-state-minimum' | 'payroll-tax'
  state_code?: string
  fetched_at: string
  expires_at?: string
}

export interface EnterpriseAgreement extends BaseEntity {
  tenant_id: string
  fwc_agreement_id?: string
  fwc_document_url?: string
  name: string
  employer_name?: string
  commencement_date?: string
  expiry_date?: string
  status: 'active' | 'expired' | 'suspended'
  storage_path?: string
  underpinning_award_code?: string
  boot_approved: boolean
  classifications?: Array<{ code: string; title: string; hourly_rate: number }>
}

export interface HostChargeRate extends BaseEntity {
  tenant_id: string
  host_employer_id: string
  source_app: 'r80' | 'crm7' | 'manual'
  rate_source_type: 'award' | 'enterprise_agreement' | 'custom'
  enterprise_agreement_id?: string
  charge_rate_hourly: number
  effective_from: string
  effective_to?: string
  calc_config?: Record<string, unknown>
  calc_result?: Record<string, unknown>
  crm7_verified?: boolean
  crm7_verified_at?: string
  notes?: string
}

export interface ApprenticeWageSchedule extends BaseEntity {
  tenant_id: string
  apprentice_id: string
  host_employer_id?: string
  rate_source_type: 'award' | 'enterprise_agreement' | 'custom'
  enterprise_agreement_id?: string
  award_code?: string
  classification_code?: string
  year_of_trade?: number
  base_hourly_rate: number
  super_rate: number
  payroll_tax_rate?: number
  payroll_tax_state?: string
  wc_rate?: number
  leave_loading: number
  hours_per_week: number
  employment_type: 'full_time' | 'part_time' | 'school_based'
  boot_status?: 'passed' | 'failed' | 'not_required' | 'pending'
  boot_checked_at?: string
  boot_result?: Record<string, unknown>
  effective_from: string
  effective_to?: string
  sync_source?: 'r80' | 'crm7' | 'manual'
  last_synced_at?: string
}
```

**Step 4: Run CRM7 tests**
```bash
cd /home/braden/Desktop/Dev/bsuite/crm7 && npx vitest run 2>&1 | tail -6
```
Expected: all passing.

**Step 5: Commit**
```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
git add supabase/migrations/20260304100000_wage_conditions_schema.sql src/types/entities.ts
git commit -m "feat(crm7): wage/conditions schema — 4 shared tables for R80.3↔CRM7 sync (#91)

Tables: award_rate_cache, enterprise_agreements, host_charge_rates,
apprentice_wage_schedules. RLS enabled, tenant-isolated. Additive — no
existing tables modified."
```

---

## Milestone 2: R80.3 Live Data Wiring + Push-to-CRM7

---

### Task 2.1: `resolveAwardRate` — live Fair Work API with Supabase cache

**Files:**
- Modify: `R80.3/src/utils/calcBridge.ts` (add `resolveAwardRate`)
- Modify: `R80.3/src/services/fairworkApi.ts` (ensure classification + year_of_trade support)
- Create: `R80.3/src/utils/calcBridge.test.ts` (new tests for resolveAwardRate)

**Context:** `calcBridge.ts` already has `calculateAllApprenticesWithWageUpdate`. `fairworkApi.ts` already calls the Fair Work MAPD API. The new `resolveAwardRate` function checks `award_rate_cache` first; if stale, fetches from FWC API and writes back.

**Step 1: Write failing test for `resolveAwardRate`**
```typescript
// R80.3/src/utils/calcBridge.test.ts (add to existing tests)
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveAwardRate } from './calcBridge'

vi.mock('../services/fairworkApi', () => ({
  fetchAwardClassificationRate: vi.fn().mockResolvedValue({
    hourly_rate: 23.45, effective_date: '2025-07-01'
  })
}))

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  upsert: vi.fn().mockResolvedValue({ error: null }),
}

describe('resolveAwardRate', () => {
  it('returns cached rate if fresh', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { hourly_rate: 22.00, source: 'fwc-api', fetched_at: new Date().toISOString() },
      error: null
    })
    const result = await resolveAwardRate('MA000025', 'C10', 1, 'tenant-1', mockSupabase as any)
    expect(result.hourlyRate).toBe(22.00)
    expect(result.source).toBe('cache')
  })

  it('fetches from FWC API when cache is empty', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
    const result = await resolveAwardRate('MA000025', 'C10', 1, 'tenant-1', mockSupabase as any)
    expect(result.hourlyRate).toBe(23.45)
    expect(result.source).toBe('fwc-api')
  })
})
```

**Step 2: Run test to confirm it fails**
```bash
cd /home/braden/Desktop/Dev/bsuite/R80.3 && pnpm test src/utils/calcBridge.test.ts 2>&1 | tail -5
```
Expected: FAIL — `resolveAwardRate` not exported.

**Step 3: Implement `resolveAwardRate` in `calcBridge.ts`**

Add near the bottom of `calcBridge.ts`:
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAwardClassificationRate } from '../services/fairworkApi'

export interface ResolvedAwardRate {
  hourlyRate: number
  effectiveDate: string
  source: 'cache' | 'fwc-api' | 'fallback'
}

const CACHE_TTL_DAYS = 7

/**
 * Resolve the award hourly rate for a given classification and year of trade.
 * Checks award_rate_cache first; fetches from Fair Work API if stale.
 * Writes fresh data back to the cache.
 *
 * @param awardCode        - e.g. 'MA000025'
 * @param classificationCode - e.g. 'C10'
 * @param yearOfTrade      - 1–4 for apprentices
 * @param tenantId         - for RLS isolation
 * @param supabase         - Supabase client (passed in for testability)
 */
export async function resolveAwardRate(
  awardCode: string,
  classificationCode: string,
  yearOfTrade: number,
  tenantId: string,
  supabase: SupabaseClient,
): Promise<ResolvedAwardRate> {
  const staleThreshold = new Date()
  staleThreshold.setDate(staleThreshold.getDate() - CACHE_TTL_DAYS)

  // 1. Check cache
  const { data: cached } = await supabase
    .from('award_rate_cache')
    .select('hourly_rate, effective_date, source, fetched_at')
    .eq('tenant_id', tenantId)
    .eq('award_code', awardCode)
    .eq('classification_code', classificationCode)
    .eq('year_of_trade', yearOfTrade)
    .gte('fetched_at', staleThreshold.toISOString())
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  if (cached) {
    return { hourlyRate: cached.hourly_rate, effectiveDate: cached.effective_date, source: 'cache' }
  }

  // 2. Fetch from Fair Work API
  try {
    const live = await fetchAwardClassificationRate(awardCode, classificationCode, yearOfTrade)
    if (live) {
      // Write back to cache (fire and forget — don't block UI)
      void supabase.from('award_rate_cache').upsert({
        tenant_id: tenantId,
        award_code: awardCode,
        classification_code: classificationCode,
        year_of_trade: yearOfTrade,
        effective_date: live.effective_date,
        hourly_rate: live.hourly_rate,
        source: 'fwc-api',
        fetched_at: new Date().toISOString(),
        expires_at: null,
      })
      return { hourlyRate: live.hourly_rate, effectiveDate: live.effective_date, source: 'fwc-api' }
    }
  } catch (err) {
    console.error('[resolveAwardRate] FWC API fetch failed:', err)
  }

  // 3. Fallback — return the most recent cached value regardless of staleness
  const { data: stale } = await supabase
    .from('award_rate_cache')
    .select('hourly_rate, effective_date')
    .eq('tenant_id', tenantId)
    .eq('award_code', awardCode)
    .eq('classification_code', classificationCode)
    .eq('year_of_trade', yearOfTrade)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()

  if (stale) {
    return { hourlyRate: stale.hourly_rate, effectiveDate: stale.effective_date, source: 'fallback' }
  }

  throw new Error(`Cannot resolve award rate for ${awardCode} ${classificationCode} year ${yearOfTrade}`)
}
```

**Step 4: Run tests**
```bash
pnpm test src/utils/calcBridge.test.ts 2>&1 | tail -6
```
Expected: all pass.

**Step 5: Commit**
```bash
git add src/utils/calcBridge.ts src/utils/calcBridge.test.ts
git commit -m "feat(r80): resolveAwardRate — live FWC API with 7-day Supabase cache"
```

---

### Task 2.2: Payroll tax resolver (Jodie AI web search fallback)

**Files:**
- Create: `R80.3/src/services/payrollTaxService.ts`
- Create: `R80.3/src/services/payrollTaxService.test.ts`

**Context:** Payroll tax varies by state and threshold. Resolution order: (1) award_rate_cache for `payroll-tax:{state}`, (2) RAM credential → state revenue API (when available), (3) Jodie AI web search via CRM7 API, (4) hardcoded state minimums as final fallback.

**Step 1: Write tests**
```typescript
// R80.3/src/services/payrollTaxService.test.ts
import { describe, it, expect, vi } from 'vitest'
import { resolvePayrollTaxRate } from './payrollTaxService'

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  upsert: vi.fn().mockResolvedValue({ error: null }),
}

describe('resolvePayrollTaxRate', () => {
  it('returns cached rate when fresh', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { hourly_rate: 0.055, source: 'payroll-tax', fetched_at: new Date().toISOString() },
      error: null
    })
    const rate = await resolvePayrollTaxRate('WA', 'tenant-1', mockSupabase as any)
    expect(rate).toBeCloseTo(0.055)
  })

  it('falls back to hardcoded WA rate when cache empty and no API', async () => {
    const rate = await resolvePayrollTaxRate('WA', 'tenant-1', mockSupabase as any)
    expect(rate).toBeGreaterThan(0)
    expect(rate).toBeLessThan(0.1) // sanity: payroll tax < 10%
  })
})
```

**Step 2: Implement**

Create `R80.3/src/services/payrollTaxService.ts`:
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../utils/logger'

export type AustralianState = 'WA' | 'VIC' | 'QLD' | 'NSW' | 'SA' | 'TAS' | 'ACT' | 'NT'

// Fallback rates (2025-26) — update via Jodie or RAM when available
const FALLBACK_PAYROLL_TAX_RATES: Record<AustralianState, number> = {
  WA:  0.055,  // 5.5% (threshold $1M)
  VIC: 0.0485, // 4.85%
  QLD: 0.0475, // 4.75%
  NSW: 0.0545, // 5.45%
  SA:  0.0450, // 4.5%
  TAS: 0.0430, // 4.3%
  ACT: 0.0650, // 6.5%
  NT:  0.0550, // 5.5%
}

const CACHE_TTL_DAYS = 90  // payroll tax rates change rarely

/**
 * Resolve payroll tax rate for a given Australian state.
 * Cache key: award_rate_cache row with source='payroll-tax' and state_code=state.
 */
export async function resolvePayrollTaxRate(
  state: AustralianState,
  tenantId: string,
  supabase: SupabaseClient,
): Promise<number> {
  const staleThreshold = new Date()
  staleThreshold.setDate(staleThreshold.getDate() - CACHE_TTL_DAYS)

  // 1. Check cache
  const { data: cached } = await supabase
    .from('award_rate_cache')
    .select('hourly_rate, fetched_at')
    .eq('tenant_id', tenantId)
    .eq('source', 'payroll-tax')
    .eq('state_code', state)
    .gte('fetched_at', staleThreshold.toISOString())
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()

  if (cached) return cached.hourly_rate

  // 2. TODO: RAM credential → state revenue office API (when credentials configured)
  // 3. TODO: Jodie AI web search via CRM7 API endpoint
  //    POST https://crm.crm7.app/api/ai/tools/web-search
  //    body: { query: `${state} payroll tax rate 2026 current percentage` }

  // 4. Fallback to hardcoded rates
  const fallback = FALLBACK_PAYROLL_TAX_RATES[state]
  if (!fallback) {
    logger.warn(`[payrollTax] No rate for state ${state}, using 0`)
    return 0
  }

  // Cache the fallback so future calls are fast
  void supabase.from('award_rate_cache').upsert({
    tenant_id: tenantId,
    award_code: `payroll-tax:${state}`,
    source: 'payroll-tax',
    state_code: state,
    effective_date: new Date().toISOString().split('T')[0],
    hourly_rate: fallback,
    fetched_at: new Date().toISOString(),
  })

  return fallback
}
```

**Step 3: Run tests**
```bash
pnpm test src/services/payrollTaxService.test.ts 2>&1 | tail -6
```

**Step 4: Commit**
```bash
git add src/services/payrollTaxService.ts src/services/payrollTaxService.test.ts
git commit -m "feat(r80): payrollTaxService — resolve rates from cache or hardcoded fallback

TODOs marked for RAM credential + Jodie AI search integration.
8 Australian states covered."
```

---

### Task 2.3: EA selector and upload

**Files:**
- Modify: `R80.3/src/services/enterpriseAgreementService.ts` (wire to Supabase table)
- Create: `R80.3/src/components/EASelector.tsx` (UI: link FWC URL or upload PDF)

**Context:** R80.3 already has `enterpriseAgreementService.ts` but it likely uses localStorage or mock data. Rewire to the new `enterprise_agreements` Supabase table.

**Step 1: Read the existing service**
```bash
cat /home/braden/Desktop/Dev/bsuite/R80.3/src/services/enterpriseAgreementService.ts | head -60
```

**Step 2: Rewrite the service to use Supabase**

The service should provide:
```typescript
fetchEAs(tenantId, supabase): Promise<EnterpriseAgreement[]>
createEAFromUrl(tenantId, fwcUrl, name, supabase): Promise<EnterpriseAgreement>
uploadEAPdf(tenantId, file, name, supabase): Promise<EnterpriseAgreement>
```

For `createEAFromUrl`: parse the FWC agreement ID from the URL (`/document-search?id=XX`), then insert into `enterprise_agreements` with `boot_approved = true`.

For `uploadEAPdf`: upload to Supabase Storage bucket `enterprise-agreements/{tenant_id}/{filename}`, get the path, insert the record.

**Step 3: Create `EASelector.tsx` component**

Simple UI:
- Radio: "Award" / "Enterprise Agreement" / "Custom"
- When EA selected: show a dropdown of existing EAs + "Add New" button
- "Add New" opens a dialog:
  - Option A: Paste FWC URL (`https://www.fwc.gov.au/document-search?...`)
  - Option B: Upload PDF
  - Name field
  - Submit → calls service → refreshes list

**Step 4: Write tests for service**

Test `createEAFromUrl` and `fetchEAs` with a mocked Supabase client.

**Step 5: Commit**
```bash
git add src/services/enterpriseAgreementService.ts src/components/EASelector.tsx
git commit -m "feat(r80): EA selector — link FWC document or upload PDF to enterprise_agreements"
```

---

### Task 2.4: Push-to-CRM7 button + subscription gate

**Files:**
- Create: `R80.3/src/services/crm7SyncService.ts`
- Modify: `R80.3/src/components/ChargeRateResult.tsx` (add push button)
- Modify: `R80.3/src/hooks/useSubscription.ts` (gate the calc engine and push)

**Context:** After a successful charge rate calculation, a "Save to CRM7" button writes to `host_charge_rates`. The button is only shown if:
1. User is logged in with an active R80.3 subscription
2. The calculation includes a host employer ID

**Step 1: Create `crm7SyncService.ts`**
```typescript
// R80.3/src/services/crm7SyncService.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CalculationResult, CalcConfig } from '@bsuite/charge-calc'

export interface PushChargeRateInput {
  tenantId: string
  hostEmployerId: string
  chargeRateHourly: number
  effectiveFrom: string
  rateSourceType: 'award' | 'enterprise_agreement' | 'custom'
  enterpriseAgreementId?: string
  calcConfig: CalcConfig
  calcResult: CalculationResult
  notes?: string
}

export async function pushChargeRateToCRM7(
  input: PushChargeRateInput,
  supabase: SupabaseClient,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('host_charge_rates')
    .upsert({
      tenant_id: input.tenantId,
      host_employer_id: input.hostEmployerId,
      source_app: 'r80',
      rate_source_type: input.rateSourceType,
      enterprise_agreement_id: input.enterpriseAgreementId,
      charge_rate_hourly: input.chargeRateHourly,
      effective_from: input.effectiveFrom,
      calc_config: input.calcConfig,
      calc_result: input.calcResult,
      notes: input.notes,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to sync rate to CRM7: ${error.message}`)
  return { id: data.id }
}
```

**Step 2: Write tests**
```typescript
// R80.3/src/services/crm7SyncService.test.ts
import { describe, it, expect, vi } from 'vitest'
import { pushChargeRateToCRM7 } from './crm7SyncService'

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: 'new-rate-id' }, error: null }),
}

it('writes to host_charge_rates with source_app=r80', async () => {
  const result = await pushChargeRateToCRM7({
    tenantId: 't1', hostEmployerId: 'h1', chargeRateHourly: 55.00,
    effectiveFrom: '2026-01-01', rateSourceType: 'award',
    calcConfig: {} as any, calcResult: {} as any,
  }, mockSupabase as any)
  expect(result.id).toBe('new-rate-id')
  expect(mockSupabase.from).toHaveBeenCalledWith('host_charge_rates')
})
```

**Step 3: Add subscription gate**

In `R80.3/src/hooks/useSubscription.ts` (or create if absent):
```typescript
export function useIsSubscribed(): boolean {
  // Check tenant subscription via Supabase. Gate the calc engine.
  // Free users can view award rates but cannot calculate or push.
  const { data } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { subscribed: false }
      const { data } = await supabase
        .from('tenant_settings')
        .select('subscription_tier, subscription_status')
        .eq('user_id', user.id)
        .single()
      return {
        subscribed: data?.subscription_status === 'active' &&
                    (data?.subscription_tier === 'r80' || data?.subscription_tier === 'crm7')
      }
    },
    staleTime: 5 * 60 * 1000,
  })
  return data?.subscribed ?? false
}
```

**Step 4: Add "Save to CRM7" button to the calculation results UI**

In `ChargeRateResult.tsx` (or equivalent), add:
```tsx
const isSubscribed = useIsSubscribed()
const [hostEmployerId, setHostEmployerId] = useState<string | null>(null)

{isSubscribed && hostEmployerId && (
  <Button onClick={handlePushToCRM7} variant="outline" size="sm">
    <ArrowUpRight className="h-4 w-4 mr-2" />
    Save to CRM7
  </Button>
)}
```

**Step 5: Commit**
```bash
git add -A
git commit -m "feat(r80): push charge rate to CRM7 — crm7SyncService + subscription gate"
```

---

## Milestone 3: CRM7 Wage Schedule + Bidirectional Sync

---

### Task 3.1: CRM7 service layer for new tables

**Files:**
- Create: `crm7/src/lib/wageScheduleService.ts`
- Create: `crm7/src/lib/wageScheduleService.test.ts`

**Context:** Service functions for reading/writing `apprentice_wage_schedules`, `enterprise_agreements`, and `host_charge_rates` from CRM7.

**Step 1: Write tests first**

```typescript
// crm7/src/lib/wageScheduleService.test.ts
import { describe, it, expect, vi } from 'vitest'
import { getApprenticeWageSchedule, saveApprenticeWageSchedule } from './wageScheduleService'

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  upsert: vi.fn().mockResolvedValue({ data: [{ id: 'ws-1' }], error: null }),
}

it('fetches wage schedule for apprentice at host', async () => {
  await getApprenticeWageSchedule('app-1', 'host-1', 'tenant-1', mockSupabase as any)
  expect(mockSupabase.from).toHaveBeenCalledWith('apprentice_wage_schedules')
})

it('saves wage schedule with crm7 sync source', async () => {
  await saveApprenticeWageSchedule({
    tenantId: 't1', apprenticeId: 'a1', hostEmployerId: 'h1',
    rateSourceType: 'award', baseHourlyRate: 22.00,
    superRate: 0.12, leaveLoading: 0.175, hoursPerWeek: 38,
    employmentType: 'full_time', effectiveFrom: '2026-01-01',
    awardCode: 'MA000025', yearOfTrade: 1,
  }, mockSupabase as any)
  expect(mockSupabase.upsert).toHaveBeenCalledWith(
    expect.objectContaining({ sync_source: 'crm7' })
  )
})
```

**Step 2: Implement**

```typescript
// crm7/src/lib/wageScheduleService.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ApprenticeWageSchedule } from '@/types/entities'

export async function getApprenticeWageSchedule(
  apprenticeId: string,
  hostEmployerId: string,
  tenantId: string,
  supabase: SupabaseClient,
): Promise<ApprenticeWageSchedule | null> {
  const { data } = await supabase
    .from('apprentice_wage_schedules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('apprentice_id', apprenticeId)
    .eq('host_employer_id', hostEmployerId)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single()
  return data
}

export async function saveApprenticeWageSchedule(
  schedule: Omit<ApprenticeWageSchedule, 'id' | 'created_at' | 'updated_at'> & {
    tenantId: string; apprenticeId: string; hostEmployerId: string;
    rateSourceType: 'award' | 'enterprise_agreement' | 'custom';
    baseHourlyRate: number; superRate: number; leaveLoading: number;
    hoursPerWeek: number; employmentType: string; effectiveFrom: string;
    awardCode?: string; yearOfTrade?: number;
  },
  supabase: SupabaseClient,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('apprentice_wage_schedules')
    .upsert({
      tenant_id: schedule.tenantId,
      apprentice_id: schedule.apprenticeId,
      host_employer_id: schedule.hostEmployerId,
      rate_source_type: schedule.rateSourceType,
      base_hourly_rate: schedule.baseHourlyRate,
      super_rate: schedule.superRate,
      leave_loading: schedule.leaveLoading,
      hours_per_week: schedule.hoursPerWeek,
      employment_type: schedule.employmentType,
      effective_from: schedule.effectiveFrom,
      award_code: schedule.awardCode,
      year_of_trade: schedule.yearOfTrade,
      sync_source: 'crm7',
      last_synced_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) throw new Error(`Failed to save wage schedule: ${error.message}`)
  return { id: data.id }
}

export async function getHostChargeRates(
  hostEmployerId: string,
  tenantId: string,
  supabase: SupabaseClient,
) {
  const { data } = await supabase
    .from('host_charge_rates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('host_employer_id', hostEmployerId)
    .order('effective_from', { ascending: false })
  return data ?? []
}
```

**Step 3: Run tests**
```bash
cd /home/braden/Desktop/Dev/bsuite/crm7 && npx vitest run src/lib/wageScheduleService.test.ts 2>&1 | tail -6
```

**Step 4: Commit**
```bash
git add src/lib/wageScheduleService.ts src/lib/wageScheduleService.test.ts
git commit -m "feat(crm7): wageScheduleService — CRUD for apprentice wage schedules and host charge rates"
```

---

### Task 3.2: CRM7 apprentice wage schedule page

**Files:**
- Create: `crm7/src/pages/people/[id]/WageScheduleTab.tsx`
- Modify: `crm7/src/pages/people/[id].tsx` (add wage schedule tab)

**Context:** Add a "Wage Schedule" tab to the apprentice detail page. Shows current wage schedule (rate source, hourly rate, on-costs). Allows editing. Shows R80.3 sync status when a host charge rate exists.

**Step 1: Create `WageScheduleTab.tsx`**

The tab shows:
- Current rate source selector (Award / EA / Custom)
- If Award: show `award_code`, `classification_code`, `year_of_trade` → auto-fills hourly rate from `award_rate_cache`
- If EA: select from `enterprise_agreements` list for the tenant
- If Custom: input field for hourly rate + BOOT check required
- On-costs breakdown: super, payroll tax, workers comp, leave loading
- "R80.3 Sync" badge if a `host_charge_rates` record exists from `source_app='r80'`
- Save button → calls `saveApprenticeWageSchedule`

**Step 2: Integrate with award_rate_cache**

When award is selected, call:
```typescript
const { data: rate } = useQuery({
  queryKey: ['award-rate', awardCode, classCode, yearOfTrade, tenantId],
  queryFn: () => supabase
    .from('award_rate_cache')
    .select('hourly_rate, effective_date')
    .eq('tenant_id', tenantId)
    .eq('award_code', awardCode)
    .eq('classification_code', classCode)
    .eq('year_of_trade', yearOfTrade)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()
    .then(r => r.data),
})
```

**Step 3: CRM7 writes back to `award_rate_cache`**

When CRM7's fairworkEnhancedService fetches a rate, also write to `award_rate_cache`:
```typescript
// In fairworkEnhancedService.ts, after fetching from FWC API:
void supabase.from('award_rate_cache').upsert({
  tenant_id, award_code, classification_code, year_of_trade,
  effective_date, hourly_rate, source: 'fwc-api', fetched_at: new Date().toISOString()
})
```
This is the bidirectional sync: R80.3 and CRM7 share the cache.

**Step 4: Run all tests**
```bash
cd /home/braden/Desktop/Dev/bsuite/crm7 && npx vitest run 2>&1 | tail -6
```

**Step 5: Commit**
```bash
git add -A
git commit -m "feat(crm7): apprentice wage schedule tab — award/EA/custom rates, R80.3 sync badge (#91)"
```

---

### Task 3.3: Final integration — commit, push all submodules, update parent

**Step 1: Verify all test suites**
```bash
cd /home/braden/Desktop/Dev/bsuite/R80.3 && pnpm test 2>&1 | tail -5
cd /home/braden/Desktop/Dev/bsuite/crm7 && npx vitest run 2>&1 | tail -5
```
Expected: all passing.

**Step 2: Push all submodules**
```bash
cd /home/braden/Desktop/Dev/bsuite/R80.3 && git push origin development
cd /home/braden/Desktop/Dev/bsuite/crm7 && git push origin development
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified && git push origin development
cd /home/braden/Desktop/Dev/bsuite/conduit && git push origin development
```

**Step 3: Update parent repo**
```bash
cd /home/braden/Desktop/Dev/bsuite
git add R80.3 crm7 business-suite-unified conduit packages/nav-core
git commit -m "chore: update all submodules — R80.3↔CRM7 integration + nav-core v0.2 (#91)

Milestone 1: DRY cleanup (dead calc files deleted, AppSwitcher extracted to
@bsuite/nav-core v0.2, createCookieStorage fixes BSU readCookieRaw bug,
wage/conditions schema migration)

Milestone 2: R80.3 live data (FWC award rates, payroll tax resolver, EA
selector, push-to-CRM7 button, subscription gate)

Milestone 3: CRM7 wage schedule page, bidirectional award_rate_cache sync"
git push origin development
```

**Step 4: Close issue #91**
```bash
gh issue close 91 --repo GaryOcean428/crm7 --comment "Implemented across 3 milestones. See design doc: docs/plans/20260304-r80-crm7-integration-design-v1.00D.md"
```

---

## Test Coverage Summary

| Component | Tests Added |
|-----------|-------------|
| `createCookieStorage` | 6 unit tests |
| `AppSwitcher` (nav-core) | 4 unit tests |
| `resolveAwardRate` | 2 unit tests |
| `resolvePayrollTaxRate` | 2 unit tests |
| `pushChargeRateToCRM7` | 1 unit test |
| `wageScheduleService` | 2 unit tests |
| **Total new** | **17 tests** |

---

## Notes for Implementer

1. **`@bsuite/nav-core` must be published** before any consumer project can install it. Use `npm publish --access public` from `packages/nav-core/` after building.

2. **Supabase migration** assumes the `host_employers` and `tenants` tables exist (they do — they're in the existing CRM7 schema). The `people` table equivalent for apprentice_id may be `r7_candidates` in conduit or `people` in CRM7 — check `src/types/entities.ts` and use the correct FK or leave as UUID without FK constraint.

3. **Fair Work API endpoint** for classification rates: check `R80.3/src/services/fairworkApi.ts` for the existing `fetchAwardClassificationRate` function. If it doesn't exist, you'll need to add it using the MAPD API pattern from `fairworkApi.ts`.

4. **Payroll tax Jodie integration** is marked TODO in `payrollTaxService.ts`. The pattern is a POST to `/api/ai/tools/web-search` in CRM7 (once available). Hardcoded fallbacks cover all 8 states for now.

5. **BOOT gate for custom wages**: `@bsuite/charge-calc` already has a `boot/` module. Use `runBootTest(customWageConfig, awardWageConfig)` from that module before allowing save.
