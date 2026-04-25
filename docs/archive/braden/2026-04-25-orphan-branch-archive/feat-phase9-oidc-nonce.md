# Archive: `braden/feat/phase9-oidc-nonce`

**Captured:** 2026-04-25
**Classification:** (d) unique-but-superseded
**Action:** archive + delete

## Why superseded

This branch is a docs-only commit that adds a JSDoc block to `src/lib/business-suite-oauth.ts` describing the OIDC nonce flow. It was created on 2026-04-23 by `Phase10 Bot`.

In the meantime main moved through Phase 9.4 / Phase 10 and the local `src/lib/business-suite-oauth.ts` was either replaced by direct `@bsuite/auth` package usage or significantly restructured. The same nonce flow is documented elsewhere in the BSuite docs corpus (e.g. `docs/20260227-auth-map-reference-v1.00A.md`) and inside `@bsuite/auth` itself.

A separate landed commit (`e6daad5 security(braden): backport bs-oauth-expired event + add OIDC nonce support`) covers the functional + documentation requirement.

## Two-signal check

- **grep** `git log origin/main --grep "OIDC nonce"` → `e6daad5 security(braden): backport bs-oauth-expired event + add OIDC nonce support` (different commit, same intent — superseded).
- **content** `git log origin/main -S "OIDC nonce"` → no match for THIS branch's diff (the JSDoc text "OIDC Core §3.1.2.1 / §3.1.2.2" is not present in main's `src/lib/business-suite-oauth.ts`, which itself may no longer exist in main).

Conclusion: same feature already in main via different implementation; THIS commit's text is not present and is not needed.

## Full `git log -p <branch> --not main`

```
commit 3050754f3009b15d20564e391f53b9fffab1532f
Author: Phase10 Bot <phase10-bot@bsuite.dev>
Date:   Thu Apr 23 04:21:14 2026 +0000

    docs(braden): Phase 9.3 — document OIDC nonce flow in business-suite-oauth.ts

    Document that OIDC nonce (OIDC Core §3.1.2.1/§3.1.2.2) is enforced
    by @bsuite/auth v0.1.0 createOAuthClient. The nonce lifecycle:
    - Generated in signInWithBusinessSuite (CSPRNG, 32-char hex)
    - Stored in sessionStorage as 'bs_oauth_nonce'
    - Sent to BSU /oauth/authorize endpoint
    - Verified against id_token claims in exchangeCodeForTokens
    - Mismatch → 'id_token nonce mismatch — possible replay attack'

    No functional changes.

diff --git a/src/lib/business-suite-oauth.ts b/src/lib/business-suite-oauth.ts
index 35660f9..c0908e0 100644
--- a/src/lib/business-suite-oauth.ts
+++ b/src/lib/business-suite-oauth.ts
@@ -3,6 +3,28 @@
  *
  * OAuth Client ID: dcb7af18-254a-4946-b94d-5c606b01fc3f
  * @see https://supabase.com/docs/guides/auth/oauth-server/getting-started
+ *
+ * Phase 9 (9.3) — OIDC nonce is implemented inside @bsuite/auth v0.1.0
+ * (`packages/auth/src/oauth-client.ts`). The consumer boundary here is
+ * intentionally thin so all apps receive nonce protection automatically
+ * when the package version is bumped.
+ *
+ * OIDC nonce flow (OIDC Core §3.1.2.1 / §3.1.2.2):
+ *   signInWithBusinessSuite():
+ *     1. crypto.getRandomValues(Uint8Array(16)) → 32-char hex nonce
+ *     2. sessionStorage.setItem('bs_oauth_nonce', nonce)
+ *     3. nonce passed in authorizationParams to the BSU /oauth/authorize endpoint
+ *
+ *   exchangeCodeForTokens(code, state):
+ *     1. sessionStorage.getItem('bs_oauth_nonce') → storedNonce
+ *     2. After token exchange, if tokens.id_token present:
+ *        jwtVerify(id_token, JWKS) → payload.nonce must === storedNonce
+ *        (mismatch throws "id_token nonce mismatch — possible replay attack")
+ *     3. sessionStorage.removeItem('bs_oauth_nonce') on cleanup
+ *
+ * startBSTokenRefresh():
+ *   Called once on app mount. Polls every 60 seconds and refreshes the
+ *   access token 5 minutes before expiry.
  */

 import { createOAuthClient } from '@bsuite/auth';
```
