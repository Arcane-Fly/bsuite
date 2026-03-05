# Auth Fix, URL Configuration & CRM7 Navigation Rebuild

Fix authentication across all apps by configuring Supabase redirect URLs and R8 env vars, provide complete URL lists for Google OAuth + Supabase, and rebuild CRM7's navigation to expose all 50+ existing routes.

---

## Findings

### Auth "Authentication Required" — Root Cause

- All deployed bundles (CRM7, R8, BSU) have the **correct** Supabase URL (`tuybltdrdefjblnplpqo`) ✅
- User account exists, last sign-in was today ✅
- **signInWithPassword** (email login) does NOT require redirect URLs — it's a direct API call
- However, PKCE flow (`detectSessionInUrl: true`, `flowType: 'pkce'`) may be interfering with session restoration
- The Supabase redirect URLs likely aren't configured for the new custom domains, which would break: email confirmation, password reset, and OAuth flows
- **R8 Vercel project** is missing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars (current deploy works from prior build, but future Vercel-triggered builds will break)

### BSU Missing `/auth/callback` Route

- `AuthContext.tsx` line 116 references `/auth/callback` as `emailRedirectTo`
- `AppContent.tsx` has NO route for `/auth/callback` — email confirmation/password reset redirects will 404
- Need to add an `/auth/callback` route that handles Supabase PKCE token exchange

### Supabase Site URL

- Currently set to `https://braden.com.au` — consent screen was on braden.com.au
- **Needs to change** to `https://suite.crm7.app` — consent screen now lives in BSU (`/oauth/consent` route exists in `AppContent.tsx`)

### CRM7 Navigation — Root Cause

- `CRM7Header.tsx` only has **4 nav links**: Dashboard, Contacts, Companies, Analytics
- `App.tsx` defines **50+ protected routes** (apprentices, WHS, financial, payroll, VET, etc.)
- Sidebar components (`CRM7Navigation.tsx`, `UnifiedNavigation.tsx`) exist but import from **non-existent config files** (`../../config/navigation`, `../../config/unified-navigation`)
- `MainLayout.tsx` only renders `CRM7Header` + `CRM7Footer` — **no sidebar navigation is wired in**

---

## Phase 1: URL Configuration (3 separate systems)

There are **three distinct** URL configs. Do not mix them up.

---

### 1A. Supabase OAuth 2.1 Server — Client Redirect URIs

Per [Supabase OAuth Server docs](https://supabase.com/docs/guides/auth/oauth-server/getting-started), these are per-client redirect URIs stored in `auth.oauth_clients`. These control where Business Suite (the IdP) redirects users after they approve/deny OAuth consent.

**Current state** (needs updating for new domains):

| Client | Current redirect_uri | New redirect_uri |
|--------|---------------------|-----------------|
| CRM7 | `https://www.crm7.app/auth/callback` | `https://crm.crm7.app/auth/callback` |
| R8 | `https://r8-c.vercel.app/auth/callback` | `https://r8.crm7.app/auth/callback` |
| Braden | `https://braden.com.au/auth/callback` | `https://www.braden.com.au/auth/callback` |

Action: SQL UPDATE on `auth.oauth_clients` to set new redirect_uris (done in Phase 2).

Also verify:

- **Site URL** (Auth → URL Configuration): should be `https://suite.crm7.app` since BSU is the IdP hosting the consent screen
- **Authorization Path** (Auth → OAuth Server): `/oauth/consent`

---

### 1B. Supabase Dashboard → Auth → URL Configuration → Redirect URLs

These control where Supabase Auth is allowed to redirect users after **standard auth flows** (email confirmation, password reset, social login via Google/GitHub). Wildcards `**` are supported.

Add all of these:

```text
https://suite.crm7.app/**
https://crm.crm7.app/**
https://www.crm7.app/**
https://crm7.app/**
https://www.braden.com.au/**
https://braden.com.au/**
https://r8.crm7.app/**
https://r8-c.vercel.app/**
https://crm7.vercel.app/**
https://braden.vercel.app/**
http://localhost:5173/**
http://localhost:5174/**
http://localhost:5675/**
```

---

### 1C. Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client

Per [Supabase docs](https://supabase.com/docs/guides/auth/social-login/auth-google), Google OAuth through Supabase works like this:

1. App calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
2. Browser goes to Supabase → Supabase redirects to Google
3. User authenticates with Google
4. **Google redirects back to Supabase** (not directly to your app)
5. Supabase then redirects to the app's `redirectTo` URL (controlled by 1B above)

Therefore, Google Console only needs the **Supabase callback URL**:

**Authorized JavaScript origins:**

```text
https://tuybltdrdefjblnplpqo.supabase.co
```

**Authorized redirect URIs:**

```text
https://tuybltdrdefjblnplpqo.supabase.co/auth/v1/callback
```

That's it for Google Console. Your app domains do NOT go in Google Console — they go in Supabase URL Configuration (1B above).

### 1D. Supabase Dashboard → Auth → Providers → Google

- Enable Google provider
- Paste Google Client ID and Client Secret from Google Cloud Console

---

## Phase 2: Database + Config Fixes

1. **Update OAuth client redirect URIs** — SQL UPDATE on `auth.oauth_clients` for new domains (see 1A table)
2. **Change Supabase Site URL** — `https://braden.com.au` → `https://suite.crm7.app` (in Supabase Dashboard → Auth → URL Configuration)
3. **Add Supabase redirect URLs** — add all URLs from 1B to Supabase Dashboard
4. **Add R8 Vercel env vars** — `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` to `r8` Vercel project

---

## Phase 3: BSU Auth Callback + Auth Debug

1. **Add `/auth/callback` route to BSU** — create `src/pages/auth/AuthCallback.tsx` that handles Supabase PKCE token exchange (`supabase.auth.exchangeCodeForSession`), add route in `AppContent.tsx`
2. **Debug CRM7 + R8 auth** — test email login, check browser console for errors, verify session persistence
3. **Verify ProtectedRoute logic** — confirm the `loading` → `!user` flow works correctly after login

---

## Phase 4: Rebuild CRM7 Navigation

1. **Create `src/config/navigation.ts`** — all route groups matching 50+ routes in `App.tsx`:
   - Core CRM (Dashboard, Contacts, Clients)
   - Apprentice Management (8 sub-routes)
   - Sales Pipeline (Leads, Opportunities, Pipeline, Deals, Quotes)
   - Analytics & Reporting
   - Financial Management (Budget, Expenses, Invoicing, Payroll, Awards)
   - WHS & Compliance (6+ sub-routes)
   - Communication & Collaboration (Communications, Tasks, Calendar)
   - Documents & Resources (Documents, Timesheets, Contracts, Competencies)
   - HR (External Employees, Field Officers, Host Employers, Labour Hire, Mentors, Placements)
   - VET & Training
   - Settings

2. **Create `src/config/unified-navigation.ts`** — fixes the broken import in `UnifiedNavigation.tsx`

3. **Update `MainLayout.tsx`** — add collapsible sidebar navigation alongside header

4. **Update `CRM7Header.tsx`** — optionally expand with dropdown menus, or keep minimal and let sidebar handle deep nav

---

## Execution Order

| Step | Task | Effort |
| ---- | ---- | ------ |
| 1 | URL lists compiled (this plan) | Done |
| 2 | SQL update OAuth client redirect URIs | 2 min |
| 3 | Change Supabase Site URL (manual in dashboard) | 1 min |
| 4 | Add Supabase redirect URLs (manual in dashboard) | 2 min |
| 5 | Add R8 Vercel env vars (manual in Vercel) | 2 min |
| 6 | Add `/auth/callback` route to BSU + redeploy | 10 min |
| 7 | Debug auth flow on CRM7 + R8 | 15 min |
| 8 | Create navigation configs + wire sidebar into MainLayout | 30 min |
| 9 | Redeploy CRM7 with navigation fix | 5 min |
