# Fix BSU Developer Access — All Service Cards Must Work

Fix 5 issues that prevent your developer account from actually accessing all BSU services: 4 missing routes, deprecated handoff, Conduit SSO, return_to redirect, and confusing tier badges.

---

## Issue A: Register 4 Missing Routes (Silent 404s)

**File:** `business-suite-unified/src/components/AppContent.tsx`

Pages exist (`GTO.tsx`, `Government.tsx`, `Documents.tsx`, `Branding.tsx`) but aren't registered in the `MainApp` router. Catch-all `*` redirects to `/` silently.

**Fix:** Add 4 lazy imports + 4 `<Route>` entries to `MainApp`:
```tsx
<Route path="/gto" element={<GTO />} />
<Route path="/government" element={<Government />} />
<Route path="/documents" element={<Documents />} />
<Route path="/branding" element={<Branding />} />
```

---

## Issue B: Switch Dashboard to Direct Navigation (Remove Deprecated Handoff)

**File:** `business-suite-unified/src/components/UnifiedDashboard.tsx`

Currently imports `ServiceCard` which does direct `window.location.href = service.url`. BUT the screenshot shows "Preparing secure session..." on Conduit which only comes from `ServiceCardWithHandoff`. Either the deployed version differs or another page uses it.

**Fix:**
1. Ensure `UnifiedDashboard.tsx` imports `ServiceCard` (not `ServiceCardWithHandoff`) — verify this is what's deployed
2. `ServiceCardWithHandoff.tsx` should be removed or have its `performHandoff` call stripped in favor of direct navigation, since cookie SSO handles same-TLD apps
3. If any other component imports `ServiceCardWithHandoff`, switch it to `ServiceCard`

---

## Issue C: Conduit Cookie SSO — storageKey Mismatch

**Files (3):**
- `conduit/src/lib/supabase/client.ts`
- `conduit/src/lib/supabase/server.ts`
- `conduit/src/lib/supabase/middleware.ts`

All 3 Supabase clients use the default storage key `sb-tuybltdrdefjblnplpqo-auth-token`. BSU/CRM7/R80.3 use `business_suite_auth`.

**Fix:** Add `storageKey: 'business_suite_auth'` to the `auth` config in all 3 files:
```ts
auth: {
  storageKey: 'business_suite_auth',
  flowType: 'pkce',
}
```

This makes Conduit read/write the same cookies as BSU, enabling cross-subdomain SSO.

---

## Issue D: BSU Login Ignores `return_to` for Authenticated Users

**File:** `business-suite-unified/src/components/AppContent.tsx` line 104

```tsx
element={user ? <Navigate to="/" replace /> : <AuthScreen />}
```

When already authenticated + `?return_to=conduit`, BSU redirects to `/` instead of the target app.

**Fix:** Check URL params before redirecting:
```tsx
element={user ? <AuthenticatedRedirect /> : <AuthScreen />}
```

Where `AuthenticatedRedirect` reads `return_to` + `return_path` from search params, calls `buildReturnUrl()`, and redirects to the external app (or falls back to `/`).

---

## Issue E: Developer Badge Shows "BASIC"/"PROFESSIONAL" Per-Service

**File:** `business-suite-unified/src/components/ServiceCard.tsx` lines 82-90

Currently displays `service.tier.toUpperCase()` — the minimum plan tier. For developer/enterprise accounts, this is misleading.

**Fix:** Pass `userTier` to `ServiceCard`. If `userTier === 'developer'` or `userTier === 'enterprise'`, show a "FULL ACCESS" badge (green) instead of the per-service tier badge. Otherwise show the service tier as-is.

Changes needed:
- `ServiceCard.tsx`: accept `userTier` prop, conditionally render badge
- `UnifiedDashboard.tsx`: pass `userTier` to each `ServiceCard`

---

## Implementation Order

| Step | Fix | Files Changed | Risk |
|------|-----|---------------|------|
| 1 | Register 4 missing routes | `AppContent.tsx` | Low — add imports + routes |
| 2 | BSU login return_to redirect | `AppContent.tsx` | Low — new small component |
| 3 | Conduit storageKey SSO | 3 conduit Supabase files | Medium — test cookie sharing |
| 4 | Developer badge | `ServiceCard.tsx`, `UnifiedDashboard.tsx` | Low — cosmetic |
| 5 | Remove deprecated handoff usage | Grep for `ServiceCardWithHandoff` | Low — already superseded |

## Verification

- [ ] Click every service card on BSU dashboard → correct page/app loads
- [ ] Log in at suite.crm7.app with `?return_to=conduit` → lands on conduit.crm7.app
- [ ] Already authenticated + visit suite.crm7.app/login?return_to=conduit → redirects to conduit
- [ ] Developer account shows "FULL ACCESS" badge on all cards
- [ ] `pnpm typecheck` passes in BSU and Conduit
- [ ] No "Preparing secure session..." hang on any card
