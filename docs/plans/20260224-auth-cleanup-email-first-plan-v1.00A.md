# Auth Cleanup: Email Auth First, Then Google

Comprehensive cleanup of auth across CRM7, R8, and braden.com.au — fix stale Supabase env vars, remove broken OAuth consent code, get email/password auth working on all three apps, then tackle Google social auth as a follow-up.

---

## Root Causes Found

| Issue | Root Cause |
|-------|-----------|
| CRM7 hitting `bporufzcbnosmernrwry.supabase.co` | Stale `VITE_SUPABASE_URL` env var on Vercel (407d old) shadows the correct integration vars |
| `getAuthorizationDetails` crash on braden consent page | `supabase.auth.oauth` namespace doesn't exist in `@supabase/supabase-js` v2.x client SDK |
| braden.com.au `/login` 404 / white page | No `/login` route in `Routes.tsx` — SPA fallback serves blank shell |
| braden.com.au `/braden` white page | No `/braden` route exists |
| CRM7 `/crm7` 404 | No `/crm7` route in `App.tsx` — falls to 404 handler |
| CRM7 Google OAuth redirect to old Supabase | `signInWithOAuth` uses the stale Supabase client pointing to wrong project |

## Phase 1: Fix CRM7 Vercel Env Vars (Critical)

1. **Delete stale `VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** (407d old, pointing to `bporufzcbnosmernrwry`)
2. **Re-add** both with the correct values from project `tuybltdrdefjblnplpqo`:
   - `VITE_SUPABASE_URL` = `https://tuybltdrdefjblnplpqo.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = the correct anon key
3. **Redeploy CRM7** to pick up new env vars

**Files**: No code changes needed — Vercel env var update only.

## Phase 2: Fix braden.com.au OAuthConsent

The `OAuthConsent.tsx` component calls `supabase.auth.oauth.getAuthorizationDetails()` which does **not exist** in the Supabase JS client SDK v2. This is a server-side API only available via GoTrue REST endpoints.

4. **Rewrite `OAuthConsent.tsx`** to call the GoTrue REST API directly:
   - `GET /auth/v1/oauth/authorize/details?authorization_id=...` (with Bearer token)
   - `POST /auth/v1/oauth/authorize/approve` / `deny`
   - Remove the `(supabase.auth as any).oauth.*` casts

**Files**: `braden/src/pages/oauth/OAuthConsent.tsx`

## Phase 3: Verify Email/Password Auth on All 3 Apps

### CRM7
5. After env var fix, **verify** `LoginModal.tsx` email/password sign-in works against `tuybltdrdefjblnplpqo`
6. **Temporarily hide Google + GitHub OAuth buttons** in `LoginModal.tsx` (they call `signInWithOAuth` which redirects to Supabase's social auth — providers not yet configured on the new project)
7. Verify `SignupModal.tsx` sign-up flow works
8. Verify `/auth/callback` handles Supabase PKCE code exchange correctly

### braden.com.au
9. **Verify** `AdminAuth.tsx` → `useAdminAuth.ts` email/password login works against `tuybltdrdefjblnplpqo`
10. **Remove spurious `useEffect` hooks** in `AdminAuth.tsx` that fetch `/admin/auth` and `/api/check-config` (these 404 on a static SPA and trigger error toasts)
11. **Add catch-all redirect** in `Routes.tsx` for unmatched routes (e.g. `/login`, `/braden`) → redirect to `/` instead of showing white page

### R8
12. **Verify** R8 email/password auth via `supabaseClient.ts` `signIn()` works (env vars already added in previous session)
13. Verify `AuthCallback.tsx` handles Business Suite OAuth callback

## Phase 4: Commit, Push, Redeploy

14. Commit all code changes to each repo
15. Push to `main`
16. Redeploy CRM7, braden, R8 via Vercel CLI
17. Smoke-test email login on all three deployed apps

## Phase 5 (NEXT STEP — after cleanup): Google Social Auth

*Not part of this implementation — noted for follow-up:*

- Enable Google provider in Supabase dashboard (`tuybltdrdefjblnplpqo`)
- Add all callback URLs to Google OAuth consent screen
- Re-enable Google button in CRM7 `LoginModal.tsx`
- Optionally add Google sign-in to braden.com.au and R8

---

## Files to Modify

| App | File | Change |
|-----|------|--------|
| CRM7 | Vercel env vars | Delete + re-add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| CRM7 | `src/components/LoginModal.tsx` | Comment out / hide Google+GitHub OAuth buttons |
| braden | `src/pages/oauth/OAuthConsent.tsx` | Rewrite to use GoTrue REST API instead of non-existent SDK methods |
| braden | `src/pages/auth/AdminAuth.tsx` | Remove broken `/admin/auth` and `/api/check-config` fetch effects |
| braden | `src/Routes.tsx` | Add catch-all route redirecting to `/` for unmatched paths |

## Verification Criteria

- [ ] CRM7 email login works on `www.crm7.app` (no `bporufzcbnosmernrwry` errors)
- [ ] braden.com.au admin login works on `www.braden.com.au/admin/auth`
- [ ] braden.com.au `/oauth/consent` no longer crashes with `getAuthorizationDetails` error
- [ ] braden.com.au `/login` and `/braden` redirect to `/` instead of white page
- [ ] R8 auth continues to work on `r8-c.vercel.app`
- [ ] No Google/GitHub OAuth buttons visible until providers are configured
