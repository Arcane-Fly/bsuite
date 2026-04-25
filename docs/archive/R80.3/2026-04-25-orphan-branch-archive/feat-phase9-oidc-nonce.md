# Archive: `R80.3/feat/phase9-oidc-nonce`

**Captured:** 2026-04-25
**Classification:** (d) unique-but-superseded
**Action:** archive + delete

## Why superseded

Identical situation to braden's `feat/phase9-oidc-nonce`: docs-only commit by `Phase10 Bot` (2026-04-23) adding a JSDoc block to `src/lib/business-suite-oauth.ts`. Main has since landed `b77804d security(r80): backport bs-oauth-expired event + add OIDC nonce support (#60)` (and `386cc93`) which delivers the equivalent functional + doc coverage via `@bsuite/auth` package usage.

## Two-signal check

- **grep** `git log origin/main --grep "Phase 9.3"` → no match. `git log origin/main --grep "OIDC nonce"` → `b77804d security(r80): backport bs-oauth-expired event + add OIDC nonce support (#60)` (different commit, same intent).
- **content** `git log origin/main -S "OIDC nonce"` → no match for THIS branch's distinctive text "OIDC Core §3.1.2.1 / §3.1.2.2". Main's `src/lib/business-suite-oauth.ts` either no longer exists or has been restructured.

Conclusion: superseded by PR #60 backport.

## Full `git log -p <branch> --not main`

```
commit 2df1af132ed93e89da21d4128c03463744483e26
Author: Phase10 Bot <phase10-bot@bsuite.dev>
Date:   Thu Apr 23 04:21:12 2026 +0000

    docs(r80): Phase 9.3 — document OIDC nonce flow in business-suite-oauth.ts

    Document that OIDC nonce (OIDC Core §3.1.2.1/§3.1.2.2) is enforced
    by @bsuite/auth v0.1.0 createOAuthClient. The nonce lifecycle:
    - Generated in signInWithBusinessSuite (CSPRNG, 32-char hex)
    - Stored in sessionStorage as 'bs_oauth_nonce'
    - Sent to BSU /oauth/authorize endpoint
    - Verified against id_token claims in exchangeCodeForTokens
    - Mismatch → 'id_token nonce mismatch — possible replay attack'

    No functional changes.

diff --git a/src/lib/business-suite-oauth.ts b/src/lib/business-suite-oauth.ts
index b67d949..8852265 100644
--- a/src/lib/business-suite-oauth.ts
+++ b/src/lib/business-suite-oauth.ts
@@ -3,6 +3,28 @@
  *
  * OAuth Client ID: 5d804d20-cd1b-4724-9107-86d2a9e51e09
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
