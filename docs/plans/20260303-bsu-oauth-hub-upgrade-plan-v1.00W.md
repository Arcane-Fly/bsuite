# BSU → OAuth + Subscription + Account Management Hub

Upgrade business-suite-unified to serve as the centralized OAuth 2.1 server, subscription billing hub, and account management center for all BSuite projects — modeled after how monkey-oauth serves the Monkey ecosystem.

---

## Current State vs Target State

### What monkey-oauth does well (our reference model)

| Feature | monkey-oauth | BSU today | Gap |
|---------|-------------|-----------|-----|
| **OAuth 2.1 consent screen** | Next.js RSC, server-side `getClaims()` validation, `POST /api/oauth/decision` route | Client-side React SPA with `useEffect` + `useState` | BSU consent is client-side only — no server-side JWT validation |
| **Cross-subdomain cookies** | `@supabase/ssr` with configurable `COOKIE_DOMAIN`, hostname guard | Custom `cookieStorage` with chunking, hardcoded `.crm7.app` fallback | BSU's approach works but is hand-rolled; monkey uses `@supabase/ssr` natively |
| **Account Center** | Full account hub: Profile, Security, Subscription, Usage, API Keys — all server-rendered | Stub `Settings.tsx` (non-functional save), basic `Billing.tsx` (Stripe checkout exists) | No centralized Account Center; Settings page is a shell |
| **Subscription management** | Edge Functions (`account-profile`, `billing-summary`, `billing-usage-rollup`, `account-security`) | `useSubscription` hook + `create-subscription` Edge Function + Stripe portal | BSU has Stripe wiring but no centralized account/subscription UI like monkey-oauth |
| **Session security** | `getClaims()` (local JWKS validation), `revokeOtherSessions`, `revokeAllSessions` | `getSession()` only | No session revocation, no local JWT validation |
| **Redirect target registry** | `REDIRECT_TARGETS` map with sanitized URLs for each client app | Hardcoded URL helpers (`getCRM7Url`, `getConduitUrl`, etc.) | No unified redirect target registry |
| **Auth actions (server)** | Next.js server actions: `login`, `signup`, `signInWithOAuth`, `signOut` | Client-side auth via `AuthContext` methods | N/A — BSU is React+Vite SPA, not Next.js |
| **Return-to flow** | `?return_to=one&return_path=/dashboard` propagated through OAuth + login | No return-to propagation | Client apps can't deep-link back after account management |
| **Shared type contracts** | `@fastmonkey/auth-contracts` npm package | No shared auth types | Each client app defines its own types |
| **Conduit BS OAuth** | N/A (monkey has no Next.js client) | Conduit has NO BS OAuth integration | Conduit is the only project not in the OAuth client registry |

### Key architectural difference

- **monkey-oauth** is a Next.js app with server-side rendering → consent screen and account pages use RSC + server actions
- **BSU** is a React + Vite SPA → all auth is client-side, no server actions available
- **Deployment**: Both use Vercel only (monkey also has Railway for monkey-coder's Python backend, but auth hub is Vercel-only — same as BSU)

---

## Clarifying Questions

Before implementing, I need confirmation on these decisions:

### Q1: Keep BSU as React+Vite SPA or migrate to Next.js?

**Option A — Keep SPA**: Enhance the existing Vite SPA with client-side Account Center pages. The OAuth consent screen stays client-side (it works today). Subscription/account management uses Supabase Edge Functions (like monkey-oauth's edge functions) called from client components.

**Option B — Migrate BSU to Next.js**: Follow monkey-oauth's architecture exactly. Server-rendered consent screen with `getClaims()`, server actions for login/signup, RSC for account pages. This is more secure (server-side JWT validation) but is a large migration.

**My recommendation**: **Option A** for now. BSU already works as an SPA with Stripe + OAuth consent. The Supabase Edge Functions pattern (which monkey-oauth already uses for account data) works equally well from a client-side SPA. We can migrate to Next.js later as a P2 if needed.

### Q2: Should Conduit get BS OAuth integration?

Conduit is the only BSuite project without a `business-suite-oauth.ts` client. It uses Supabase Native Auth only and shares cookies via `@supabase/ssr`. Should it also support "Sign in with Business Suite" SSO like CRM7/R80.3/braden?

**My recommendation**: Yes — add Conduit as an OAuth client. It's a Next.js app so we can follow monkey-oauth's patterns even more closely (server-side consent redirect, server-side token exchange).

### Q3: Shared `@bsuite/auth-contracts` package?

monkey-projects has `@fastmonkey/auth-contracts` with shared types (`AccountProfile`, `SubscriptionSummary`, `OAuthClientPolicy`). Should we create `@bsuite/auth-contracts` similarly?

**My recommendation**: Yes — publish `@bsuite/auth-contracts` to npm (following the existing `@bsuite/charge-calc` pattern). This prevents type drift across 5 projects.

---

## Implementation Plan

### Phase 1: BSU Account Center (P1 — highest value, ~3-5 days)

Port monkey-oauth's Account Center pattern to BSU's SPA architecture.

1. **Create Supabase Edge Functions** for account management:
   - `account-profile` — GET (fetch profile + subscription snapshot) / PATCH (update profile)
   - `account-security` — GET (audit events) / POST (revoke sessions)
   - `billing-summary` — GET (subscription + usage by product + totals)
   - `billing-usage-rollup` — GET (usage by product + model, configurable days)
   
2. **Build Account Center pages** in BSU (`src/pages/account/`):
   - `AccountOverview.tsx` — Profile form + identity card + subscription snapshot (port from monkey-oauth `app/account/page.tsx`)
   - `AccountSecurity.tsx` — Session controls + security audit log (port from `app/account/security/page.tsx`)
   - `AccountSubscription.tsx` — Replace current `Billing.tsx` with proper subscription summary + usage bar + Stripe portal link
   - `AccountUsage.tsx` — Usage rollup by product/model
   
3. **Wire into router** (`AppContent.tsx`):
   - `/account` → Overview
   - `/account/security` → Security
   - `/account/subscription` → Subscription (replaces `/billing`)
   - `/account/usage` → Usage

4. **Add return-to flow** — Account Center pages accept `?return_to=crm7&return_path=/dashboard` so client apps can deep-link to account management and return afterwards.

### Phase 2: Unify BS OAuth Client Library (P1 — ~2 days)

5. **Create `@bsuite/auth-contracts`** package in `packages/auth-contracts/`:
   - `AccountProfile`, `SubscriptionSummary`, `UsageRollup`, `OAuthClientPolicy` types
   - Shared constants: client IDs, redirect URI patterns, scope definitions
   
6. **Create `@bsuite/oauth-client`** package in `packages/oauth-client/`:
   - Extract the near-identical `business-suite-oauth.ts` from CRM7/R80.3/braden into one shared package
   - Parameterized by `CLIENT_ID` and `REDIRECT_URI`
   - Include `refreshBusinessSuiteToken()` actually wired into a refresh loop (fixes the dead code issue from AUTH-MAP.md §7)
   - Include `getUserInfo()` wired into profile hydration
   
7. **Update consumers** (CRM7, R80.3, braden):
   - Replace local `business-suite-oauth.ts` with `@bsuite/oauth-client`
   - Wire token refresh into auth effects
   - Publish to npm, update `package.json` versions

### Phase 3: Conduit OAuth Integration (P1 — ~2 days)

8. **Register Conduit as OAuth client** in Supabase project `tuybltdrdefjblnplpqo`
9. **Add BS OAuth to Conduit** — Since Conduit is Next.js, follow monkey-oauth's client pattern:
   - Server action for initiating BS OAuth flow
   - Callback route handler for token exchange
   - "Sign in with Business Suite" button on login page
10. **Add cross-subdomain cookie domain** to Conduit's `@supabase/ssr` config (`domain=.crm7.app`)

### Phase 4: OAuth Consent Hardening (P2 — ~1 day)

11. **Harden BSU consent screen** — Add input validation matching monkey-oauth's patterns:
    - `sanitizeAuthorizationId()` with length limit
    - Move approve/deny to a form-based POST (currently direct Supabase SDK calls from client)
    - Add CSRF protection via hidden state token
    
12. **Add consent redirect-after-login flow** — When unauthenticated users hit `/oauth/consent`, redirect to `/login` with `state.from` preserved (already partially implemented but not tested end-to-end)

### Phase 5: Session Handoff & Security (P2 — ~1 day)

13. **Implement `getClaims()` pattern** where possible — Conduit can use it natively (server-side). For Vite SPAs, validate tokens client-side via JWKS (already done in BS OAuth client).

14. **Wire session revocation** — Add "Sign Out Other Sessions" and "Revoke All Sessions" to BSU Account Security page, calling the `account-security` Edge Function.

---

## Files Affected

### New files
- `supabase/functions/account-profile/index.ts`
- `supabase/functions/account-security/index.ts`
- `supabase/functions/billing-summary/index.ts`
- `supabase/functions/billing-usage-rollup/index.ts`
- `packages/auth-contracts/src/index.ts`
- `packages/auth-contracts/package.json`
- `packages/oauth-client/src/index.ts`
- `packages/oauth-client/package.json`
- `business-suite-unified/src/pages/account/AccountOverview.tsx`
- `business-suite-unified/src/pages/account/AccountSecurity.tsx`
- `business-suite-unified/src/pages/account/AccountSubscription.tsx`
- `business-suite-unified/src/pages/account/AccountUsage.tsx`
- `business-suite-unified/src/pages/account/AccountLayout.tsx`
- `business-suite-unified/src/lib/account-center.ts` (Edge Function caller)
- `conduit/src/lib/business-suite-oauth.ts` (or use `@bsuite/oauth-client`)

### Modified files
- `business-suite-unified/src/components/AppContent.tsx` — Add account routes
- `business-suite-unified/src/pages/oauth/OAuthConsent.tsx` — Harden validation
- `conduit/src/app/auth/login/page.tsx` — Add "Sign in with Business Suite" button
- `conduit/src/app/auth/callback/route.ts` — Handle BS OAuth code exchange
- `conduit/src/lib/supabase/client.ts` — Add cookie domain config
- `crm7/src/lib/business-suite-oauth.ts` → replace with `@bsuite/oauth-client`
- `R80.3/src/lib/business-suite-oauth.ts` → replace with `@bsuite/oauth-client`
- `braden/src/lib/business-suite-oauth.ts` → replace with `@bsuite/oauth-client`
- `docs/AUTH-MAP.md` — Update with new architecture

---

## Domain & Deployment Notes

| Project | Domain | Deployment | Cookie Sharing |
|---------|--------|------------|----------------|
| BSU (hub) | `suite.crm7.app` | Vercel | Sets `.crm7.app` cookies |
| CRM7 | `crm.crm7.app` | Vercel | Reads `.crm7.app` cookies |
| Conduit | `conduit.crm7.app` | Vercel | Reads `.crm7.app` cookies (to be added) |
| R80.3 | `r8.crm7.app` | Vercel | Reads `.crm7.app` cookies |
| braden | `www.braden.com.au` | Vercel | BS OAuth only (different TLD) |

All projects deploy to Vercel only (no Railway needed for auth hub, unlike monkey-projects where monkey-coder has a Railway Python backend).

---

## Risk Assessment

- **Low risk**: Edge Functions, Account Center UI, auth-contracts package — additive, no breaking changes
- **Medium risk**: Replacing per-project `business-suite-oauth.ts` with `@bsuite/oauth-client` — requires coordinated publish + update across 3 repos
- **Medium risk**: Conduit OAuth integration — new auth flow in Next.js, needs thorough testing
- **Low risk**: Consent screen hardening — improves existing working flow
