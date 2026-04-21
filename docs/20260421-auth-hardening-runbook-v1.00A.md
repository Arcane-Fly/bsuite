# Auth hardening runbook — M.7 closure

**Status:** A (Approved — runbook is authoritative; the human actions below move it to F once executed)
**Date:** 2026-04-21
**Part:** M.7 of the 2026 world-class audit
**Supabase project:** `tuybltdrdefjblnplpqo` (claritycrm / bsuite)

Closes Part B.2 + Part M.7 from the master audit plan. Three operational tasks, each requires dashboard access (Supabase / Azure / Vercel). Code for each path is already in place; this runbook executes the configuration.

---

## 1. Azure `xms_edov` optional claim (B.2.1)

**Why:** Without `xms_edov`, Microsoft does NOT attest the `email` claim on an Azure AD ID token. A rogue tenant user could set their profile email to anything and BSU would accept it as identity. Runtime `isAzureUserVerified()` in [business-suite-unified/src/lib/azureEmailVerification.ts](../business-suite-unified/src/lib/azureEmailVerification.ts) already rejects sessions where `xms_edov !== true`. This step enables the claim on the Azure side so real Microsoft sign-ins start carrying it.

**Click-path (~4 minutes):**

1. Sign in to [Azure Portal](https://portal.azure.com) as a tenant global admin.
2. Go to **Microsoft Entra ID** → **App registrations** → **BSuite** (or whatever the BSU registration is named; there's exactly one).
3. Open **Token configuration** in the left nav.
4. Click **Add optional claim**.
5. Token type: **ID**. Claim: **`xms_edov`**. Click **Add**.
6. A dialog asks about enabling the required permission (`email`); accept.
7. Save.

**Verification:**

1. Sign out of any active BSuite session.
2. Sign in via "Continue with Microsoft" on [suite.crm7.app/login](https://suite.crm7.app/login).
3. Open DevTools → Application → Cookies → `business_suite_auth.0`/`1`. Reassemble + decode. Look at `parsed.user.identities[0].identity_data.custom_claims.xms_edov` — it should be `true` (or `1`).
4. Playwright spec: `tests/e2e/azure-xms-edov.spec.ts` (to be written in the M.7 follow-up) navigates + signs in + asserts the claim is present.

**Rollback:** delete the optional claim in the same Token configuration page. Immediate effect on next sign-in.

---

## 2. Remove `*.vercel.app` wildcard redirect URIs (B.2.2)

**Why:** OAuth 2.1 §7.6 requires exact-match redirect URIs. A wildcard `https://*.vercel.app` lets an attacker register a fresh Vercel preview URL (cost: $0, time: 10s) and craft an OAuth flow that sends the auth code to their URL. The Supabase OAuth server would happily redirect there because the pattern matches.

**Click-path (~3 minutes):**

1. Sign in to [Supabase Dashboard](https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo) (project `tuybltdrdefjblnplpqo`).
2. **Authentication** → **URL Configuration** (left nav).
3. In **Redirect URLs**, find and **DELETE** every entry that contains a `*`:
   - `https://*.vercel.app`
   - `https://*.vercel.app/**`
   - `https://*.vusercontent.net/auth/callback`
4. Keep the exact-match entries:
   - `https://suite.crm7.app/auth/callback`
   - `https://crm.crm7.app/auth/callback`
   - `https://r8.crm7.app/auth/callback`
   - `https://ideas.crm7.app/auth/callback`
   - `https://www.braden.com.au/auth/callback`
   - `https://conduit.crm7.app/auth/callback`
   - `http://localhost:5173/auth/callback` (dev)
   - `http://localhost:5680/auth/callback` (conduit dev)
5. Save.

**Before saving, capture the current list** — screenshot or copy-paste — and commit it under `docs/supabase-config/20260421-redirect-urls-pre-m7.txt`. This is the restore artefact if rollback is needed.

**Verification:**

1. Navigate to a fake preview URL you control, e.g. `https://evil-preview-7b3a.vercel.app/auth/callback`.
2. Trigger a sign-in flow that would redirect there:
   ```
   https://tuybltdrdefjblnplpqo.supabase.co/auth/v1/authorize?provider=google&redirect_to=https://evil-preview-7b3a.vercel.app/auth/callback
   ```
3. Expected response: `400 Invalid redirect URL` (or a redirect to the Supabase auth error page).

Playwright spec `tests/e2e/oauth-redirect-whitelist.spec.ts` (M.7 follow-up) asserts the same programmatically.

**Rollback:** re-add the wildcards from the pre-change artefact. Immediate effect.

---

## 3. Revoke HS256 "Previous" JWK (operational follow-through on 2026-04-21 ES256 rotation)

**Why:** The 2026-04-21 JWT rotation moved signing from HS256 to ES256 (a prerequisite for the app to stop hitting the lock deadlock with the old key). The "Previous" HS256 JWK was kept in a grace window so in-flight tokens continued to verify. The grace window is 1 hour. It has elapsed.

**Click-path (~1 minute):**

1. Supabase Dashboard → **Authentication** → **JWT Keys**.
2. Find the HS256 entry marked "Previous" (kid starts with something pre-ES256).
3. Click **Revoke**.
4. Confirm.

**Verification:**

1. Any session issued under the old HS256 kid will now 401 on its next refresh.
2. Current sessions (post-rotation, under ES256 kid `7fd86fde-9917-403c-a895-a38f325e76cf` as of the last observation) continue to work.
3. Playwright: `tests/e2e/jwt-key-revoke.spec.ts` attempts to use a synthesised token signed by the old HS256 secret and expects 401.

**Rollback:** un-revoking a JWT key is **not possible** without rotating again. Only do this step after confirming no active sessions rely on the old HS256 kid (check auth logs for any `token_refreshed` events with that kid in the last 60 min).

---

## Execution record (to be filled in by the human operator)

| Task | Operator | Date / Time (UTC) | Artefact committed | Verification run |
|---|---|---|---|---|
| 1. xms_edov claim | _tbd_ | _tbd_ | Screenshot of Token configuration post-add | Playwright spec green |
| 2. Remove wildcards | _tbd_ | _tbd_ | docs/supabase-config/20260421-redirect-urls-pre-m7.txt | OAuth redirect spec green |
| 3. Revoke HS256 Previous | _tbd_ | _tbd_ | Screenshot of JWT Keys panel post-revoke | JWT-key-revoke spec green |

Once all three rows are filled + the verification column is green, this document's status moves to F (Frozen).

---

## K.8 checklist (M.7 meta)

- Skills invoked: `/master-orchestration`, `/supabase-auth-comprehensive`, `/auth-setup`, `/security-audit`
- MCPs consulted: `Context7 query-docs @supabase/ssr oauth-redirect-validation`, `Supabase MCP get_logs` for auth-layer 4xx spike monitoring post-change.
- Samples referenced: [supabase docs: OAuth 2.1 §7.6 redirect matching](https://supabase.com/docs/guides/auth/redirect-urls).
- Red-team (K.5): Security — the wildcard removal is the only item with a non-zero attacker-use history; the xms_edov and HS256 revoke are hygiene. Reliability — HS256 revoke can lock out any session still riding the old kid; mitigated by the 1h grace observation window.
- Memory (K.6): `bsuite_session_20260421e` written after the human executes the 3 steps.
