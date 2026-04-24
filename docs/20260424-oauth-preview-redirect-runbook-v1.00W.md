# OAuth Preview-Branch Redirect Runbook

**Date:** 2026-04-24
**Status:** W (Working — sequenced deployment in progress)
**Plan:** `~/.claude/plans/completed-the-current-development-branch-composed-flame.md` §WS-5
**Owner:** Claude Code + operator (for Supabase dashboard step)
**Prereq:** BSU commit `f75b4b6` (fix: WS-4 OAuth preview-branch redirect support) landed on `development`.

---

## Context — the bug being closed

User reported 2026-04-24: "I am unable to login to any preview branches since auth takes me back through and places me back on production once oauth is complete."

Root cause (cross-app-write-audit V10): `business-suite-unified/src/lib/redirectTargets.ts:9-15` hardcoded production-only URLs. When a preview deploy like `crm7-git-development-braden-pty-ltd.vercel.app` initiated OAuth to BSU, BSU had no mechanism to know the caller was on a preview; it always fell back to `REDIRECT_TARGETS['crm7'] = 'https://crm.crm7.app'` and sent the user to production.

Secondary causes:

- Client apps' BS-OAuth login redirect builders don't send the caller's `window.location.origin` to BSU.
- Supabase's `auth.oauth_clients.allowed_redirect_uris` column only lists the canonical production URL for each of the 4 OAuth clients (CRM7, R80.3, Braden, Throughput). Any `*-braden-pty-ltd.vercel.app/auth/callback` incoming redirect_uri is rejected by Supabase Auth server-side.

The fix is three-part: BSU-side code (landed in `f75b4b6`), client-app code patches (pending per-client PRs), and the Supabase dashboard action below.

---

## Part A — BSU server-side change (DONE in `f75b4b6`)

`buildReturnUrl(appKey, returnPath, requestedOrigin?)` now validates the `requestedOrigin` query param against a per-app Vercel preview prefix allowlist. Valid origins are used verbatim; invalid/missing ones fall back to the hardcoded production URL (back-compat preserved). 16 new unit tests cover the validation matrix.

No action needed for Part A — it's live on the BSU development branch.

---

## Part B — Client-app code patches (PENDING, one PR per app)

Each of the 4 BS-OAuth client apps needs the same pattern: when building the BSU login URL, append the current origin as `return_origin`. The BSU-side code already validates it.

### B.1 — CRM7

File: `src/lib/business-suite-oauth.ts` (per parent `CLAUDE.md` Key Auth Files table).

Find the function that builds the BSU login URL (likely named `buildLoginUrl`, `initiateLogin`, or similar). In the URL builder:

```typescript
// Before
const url = `${BSU_URL}/auth/login?return_to=crm7&return_path=${encodeURIComponent(returnPath)}`;

// After (add return_origin)
const url = `${BSU_URL}/auth/login?return_to=crm7&return_path=${encodeURIComponent(returnPath)}&return_origin=${encodeURIComponent(window.location.origin)}`;
```

Verification:

- Grep `src/` for `return_to=crm7` and ensure every callsite appends `&return_origin=`.
- Unit test: mock `window.location.origin` as a preview URL and confirm the built URL includes `return_origin=https%3A%2F%2Fcrm7-git-...braden-pty-ltd.vercel.app`.

### B.2 — R80.3

File: `src/lib/business-suite-oauth.ts`.

Same pattern as CRM7. Also, the existing hardcoded-production-URL fallback at `src/pages/AuthCallback.tsx:44` is benign as long as `VITE_BSU_URL` is set on the Vercel project (it is, for both prod and preview). Optional follow-up: remove the hardcoded string and require `VITE_BSU_URL` at build time — cleaner but not functionally urgent.

### B.3 — Braden — NO CODE PATCH NEEDED

**Correction to earlier v1.00W draft:** braden does **not** use the `${bsuUrl}/auth/login?return_to=...` URL pattern that the other 3 client apps use. Braden's BS-OAuth entry point is `signInWithBusinessSuite()` from `@bsuite/auth` (the shared package), which redirects directly to Supabase's `/auth/v1/oauth/authorize` endpoint — a different flow that's out of scope for BSU's `buildReturnUrl(requestedOrigin?)` validator.

Grep verification on 2026-04-25: `grep -rn "return_to\|buildLoginUrl\|\${bsuUrl}/auth/login" braden/src/` returned zero matches. The only BS-OAuth call is `signInWithBusinessSuite()` (sourced from the shared `@bsuite/auth` package), plus native `supabase.auth.signInWithPassword()` for the admin login.

Braden's code path is already preview-safe — per the WS-1 discovery, `packages/auth/src/oauth-client.ts` line 40 uses dynamic `window.location.origin` for the redirect URI when calling `signInWithBusinessSuite()`. No braden-side patch required.

**What braden DOES need:** Part C (Supabase dashboard allowlist) must add braden's preview URL patterns to the Supabase OAuth-client config, same as the other clients. This is the only step that unblocks braden preview logins.

### B.4 — Throughput

File: `src/lib/business-suite-oauth.ts`.

Throughput uses npm (not pnpm) so the patch flow for this repo uses `npm install` rather than `pnpm install`. Otherwise identical pattern.

### B.5 — Conduit (NOT applicable)

Conduit uses Supabase Native Auth (not BS OAuth) per parent `CLAUDE.md §Authentication & OAuth`. Its `src/app/auth/callback/route.ts` already uses the request's `origin` header for the callback destination — no patch needed. Conduit preview logins already work.

---

## Part C — Supabase dashboard OAuth client allowlist (MANUAL — operator only)

Even with Parts A + B, Supabase Auth still validates every incoming `redirect_uri` server-side against the `auth.oauth_clients.allowed_redirect_uris` column. Until those DB rows include preview-URL patterns, the user sees a 400 from Supabase before BSU's code ever runs.

### Steps

1. Open the Supabase dashboard for project `tuybltdrdefjblnplpqo` (the shared BSuite Supabase project per parent `CLAUDE.md §Authentication & OAuth`).

2. Navigate to **Authentication → OAuth Server → Registered Clients** (or equivalent in the current dashboard UI — Supabase has moved the OAuth clients page around across releases; if missing, use the SQL editor with `SELECT id, client_id, allowed_redirect_uris FROM auth.oauth_clients;`).

3. For each of the 4 clients, update the `allowed_redirect_uris` list to add the matching Vercel preview-URL patterns. Client IDs from `CLAUDE.md`:

   | Client | Client ID | Production URI (keep) | Preview URI patterns to ADD |
   |---|---|---|---|
   | CRM7 | `30f76744-3e0b-40bf-abb8-8c587389802e` | `https://crm.crm7.app/auth/callback` | `https://crm7-git-*-braden-pty-ltd.vercel.app/auth/callback` AND specifically `https://crm7-git-development-braden-pty-ltd.vercel.app/auth/callback` |
   | R80.3 | `5d804d20-cd1b-4724-9107-86d2a9e51e09` | `https://r8.crm7.app/auth/callback` | `https://r80.3-git-*-braden-pty-ltd.vercel.app/auth/callback`, `https://r8-git-*-braden-pty-ltd.vercel.app/auth/callback` |
   | Braden | `dcb7af18-254a-4946-b94d-5c606b01fc3f` | `https://www.braden.com.au/auth/callback` | `https://braden-git-*-braden-pty-ltd.vercel.app/auth/callback` |
   | Throughput | `35f0db49-ef62-4115-baba-7b961f034cc3` | `https://ideas.crm7.app/auth/callback` | `https://throughput-git-*-braden-pty-ltd.vercel.app/auth/callback` |

4. **If Supabase's allowlist doesn't support wildcards:** add the specific development-branch preview URL per app (e.g., `https://crm7-git-development-braden-pty-ltd.vercel.app/auth/callback`) as a concrete entry. Add more entries when additional feature branches are opened. Slower but definite.

5. Save each client row.

### Verification

1. Push an empty commit to `crm7/development` to re-trigger a preview deploy:

   ```bash
   cd /home/braden/Desktop/Dev/bsuite/crm7
   git commit --allow-empty -m "chore(deploy): redeploy trigger — OAuth preview-redirect verification"
   git push origin development
   ```

2. Wait for the Vercel preview build to land READY (~2–3 min).

3. Open the preview URL `https://crm7-git-development-braden-pty-ltd.vercel.app` in an incognito window (no cached session).

4. Click the login button. Expected: BSU login page at `suite.crm7.app/auth/login`, with `return_origin` param visible in the URL (confirms Part B.1 patch is deployed).

5. Complete OAuth with a test account. Expected: callback lands on the preview URL (`https://crm7-git-development-braden-pty-ltd.vercel.app/auth/callback`), session established, user stays on the preview deploy.

6. **If still bouncing to production:** check Supabase Auth → Logs for the exact `redirect_uri` value being rejected. Copy it verbatim into the client's `allowed_redirect_uris` list (may need to escape special characters). Re-test.

---

## Part D — Sequenced rollout

Recommended order to minimise preview-login downtime:

1. ✅ BSU server-side (DONE — `f75b4b6` on development).
2. Supabase dashboard allowlist update (Part C — operator).
3. CRM7 client patch (Part B.1 — one PR to crm7).
4. R80.3, Braden, Throughput client patches (Part B.2/B.3/B.4 — parallel PRs).
5. End-to-end verification per Part C §Verification for each app.

Steps 1+2 together make preview-login work for any client app that has already been patched (B.1–B.4). Step 5 closes the loop.

Until all 4 client patches land, preview-branch login works ONLY for apps that have been patched; un-patched apps continue bouncing to production (current behaviour — no regression).

---

## Rollback

The BSU-side change is fully back-compatible. Callers that don't send `return_origin` (i.e., all 4 clients today) behave exactly as before. No rollback needed for Part A.

If the Supabase allowlist update causes problems (e.g. a misconfigured pattern rejects production URLs), remove the preview patterns and leave only the production URL. Production login continues to work from the moment the production URI is restored.

Client-app patches (Part B) are simple string appends to URL builders — revert via `git revert <commit-sha>` on the affected app's `development` branch. No data or schema impact.

---

## Sign-off

- [x] Part A: BSU code change + tests landed (`f75b4b6`)
- [ ] Part C: Supabase dashboard allowlist update (operator action)
- [ ] Part B.1: CRM7 client patch
- [ ] Part B.2: R80.3 client patch
- [ ] Part B.3: Braden client patch
- [ ] Part B.4: Throughput client patch
- [ ] End-to-end verification: preview login completes on all 4 client apps

Status moves to **A (Approved)** once all 6 checkboxes are ticked.

---

_— discovered during 2026-04-24 archive pass (plan: completed-the-current-development-branch)_
