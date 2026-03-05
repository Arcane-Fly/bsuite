# Business Suite OAuth Server Implementation Plan
This plan details the steps to turn the Business Suite Vite SPA into an OAuth 2.1 Server using Supabase's native capabilities, allowing other micro-frontends (R8, CRM7, etc.) to authenticate via it.

## 1. Context & Architecture
- **Goal:** Business Suite acts as the central identity provider (IdP) for the ecosystem.
- **Provider:** Supabase OAuth 2.1 Server capabilities (currently in beta, but native to Supabase).
- **Client App:** The Business Suite Vite SPA.
- **Mechanism:** Supabase handles the actual OAuth flows (token generation, PKCE, etc.). Business Suite provides the **Authorization UI** (the Consent Screen) where a logged-in user approves or denies access to a third-party client (e.g., R8, CRM7).

## 2. Implementation Steps

### Phase 1: Consent Screen UI (`src/pages/OAuthConsent.tsx`)
1. Create a new page component `OAuthConsent.tsx`.
2. Extract the `authorization_id` from the URL search parameters (`?authorization_id=...`).
3. If no `authorization_id` is present, show an error.
4. Check authentication status via `useAuth()`.
5. If the user is *not* logged in, redirect them to the login page, preserving the `authorization_id` so they can return to the consent screen post-login.
6. If the user *is* logged in, call `supabase.auth.oauth.getAuthorizationDetails(authorization_id)`.
7. Display the client name (`details.client.name`) and requested scopes to the user.
8. Render "Approve" and "Deny" buttons.

### Phase 2: Action Handlers (Approve/Deny)
1. **Approve Action:** Call `supabase.auth.oauth.approveAuthorization(authorization_id)`.
   - On success, redirect the user's browser to the returned `data.redirect_url`.
2. **Deny Action:** Call `supabase.auth.oauth.denyAuthorization(authorization_id)`.
   - On success, redirect the user's browser to the returned `data.redirect_url`.

### Phase 3: Routing Integration
1. Update `src/App.tsx` or `src/components/AppContent.tsx` (wherever routing is handled) to include the new `/oauth/consent` route.
2. Update the Login component/flow to recognize `next=oauth` or `authorization_id` in the URL, ensuring a seamless return to the consent screen after a user authenticates.

### Phase 4: Supabase Dashboard Configuration (Manual step for user)
1. Instruct the user to go to their Supabase Dashboard -> Authentication -> OAuth Server.
2. Enable "OAuth 2.1 server capabilities".
3. Set the "Authorization Path" to `/oauth/consent`.
4. Add the OAuth clients (R8, CRM7, etc.) to generate Client IDs.

## 3. Review & Verification
- Verify that `@supabase/supabase-js` version is recent enough to support `.oauth` namespace (version `^2.56.0` is installed, which is sufficient).
- Ensure UI matches the existing dark/neon theme of Business Suite.
