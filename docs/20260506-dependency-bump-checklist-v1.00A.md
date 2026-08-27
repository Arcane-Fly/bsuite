# Dependency Bump Checklist — `@bsuite/*` packages

**Status:** v1.00A — Approved 2026-05-06
**Authority:** This is the **canonical** ceremony. Each child repo (`crm7/`, `R80.4/`, `throughput/`, `conduit/`, `braden/`) carries a copy of this file at `docs/DEPENDENCY-BUMP-CHECKLIST.md`. They MUST stay in sync.

> **R80.3 → R80.4 corrected 2026-08-17.** The repo list above originally read `R80.3/`. R80.3 left
> the submodule set on 2026-08-06 (`5e000c35`, operator directive) and R80.4 took its place.
> **Unverified in this session:** whether `R80.4/docs/DEPENDENCY-BUMP-CHECKLIST.md` exists and is in
> sync — the submodule was not checked out here. Confirm before relying on the "MUST stay in sync"
> claim above.

---

## Why this exists

The `@bsuite/auth@^0.1.0 → ^0.2.0` auto-bump on 2026-05-06 silently activated `prompt=none` redirect behaviour in `attemptSilentAuth` and broke OAuth across all 5 client apps. Caret ranges + multi-repo + AI agents = inevitable drift. **All `@bsuite/*` versions are now pinned to exact versions** in consumer `package.json` files (no caret, no tilde). Bumping requires this ceremony.

The ESLint rule `bsuite/oauth-callback-must-bridge` and the per-app `oauth-contract.test.ts` files enforce the technical invariants. This checklist enforces the **process**.

---

## Pre-bump — pick the package and read its CHANGELOG

1. Identify which `@bsuite/*` package you're bumping and the target version.
2. Read **the entire** CHANGELOG entry for the target version. Do not skim. Identify any of these markers:
   - "Behaviour change" / "behavior change"
   - "Breaking" / "BREAKING"
   - "doctrine" — these are suite-wide policy shifts that need consumer-side guards
   - New named exports — agents may auto-import them on next refactor
   - Changes to default values for options
3. If the bump is `@bsuite/auth`, **also** check for changes to:
   - `signInWithBusinessSuite` signature
   - `attemptSilentAuth` signature or behaviour
   - `exchangeCodeForTokens` return shape
   - `startBSTokenRefresh` semantics
   - JWKS endpoint URL
4. If anything in step 3 changed: **STOP**. The bump requires consumer-side changes in all 5 client apps before pinning. Coordinate with the human owner before proceeding.

---

## Build + publish (parent monorepo only)

These steps run inside `bsuite/packages/<pkg>/`.

```bash
cd /path/to/bsuite/packages/auth   # or whichever package

# 1. Build cleanly
pnpm build
pnpm test                          # all package tests must pass
pnpm typecheck

# 2. Bump version
#    Use the highest-impact level the changes warrant — never a patch
#    bump for behaviour changes (see @bsuite/auth 0.2.0 incident).
#    Patch (x.y.Z): bug fixes, internal refactors only
#    Minor (x.Y.0): new features, observable behaviour changes (DEFAULT)
#    Major (X.0.0): breaking signature changes, removal of public exports
npm version <patch|minor|major>    # updates package.json + creates git tag

# 3. Update CHANGELOG.md with:
#    - The new version + date
#    - "Added", "Changed", "Fixed", "Removed" sections
#    - For Changed: an explicit "Why a minor (not a patch)" justification
#    - For consumers: a "Migration" section listing concrete code changes
#      they need to make. If any are required, the bump is at minimum minor.

# 4. Publish
#    Standard path: merge the package release PR to main and let the matching
#    .github/workflows/publish-*.yml workflow publish through npm Trusted
#    Publishers (GitHub Actions OIDC). Do not default back to NPM_TOKEN/local
#    token publishing.
#
#    npm package Trusted Publisher settings must match:
#      organization/user: GaryOcean428
#      repository: bsuite
#      workflow filename: publish-<package-slug>.yml
#      environment name: blank unless the workflow declares one
#      allowed action: Allow npm publish
gh workflow run publish-<package-slug>.yml --ref main

# 5. Verify the tarball is clean — no leaked test artifacts
npm view @bsuite/<pkg>@<new-version> files
# Must NOT include __tests__/, *.test.ts, setup.ts, etc.
```

---

## Update each consumer repo

For each app that depends on the bumped package (typically all 5 client apps for `@bsuite/auth`):

> **THE COMMAND BELOW CANNOT UPGRADE A SATISFIED RANGE — corrected 2026-08-27.**
>
> `pnpm install --lockfile-only` RE-RESOLVES; it does not UPGRADE. An entry that
> already satisfies its range is left exactly where it is, so a lockfile pinning
> `2.2.0` under a `^2.1.0` specifier is satisfied, install keeps `2.2.0`, and it
> reports success. Measured on throughput, identical inputs, same temp lab:
>
> | command | result |
> | --- | --- |
> | `pnpm install --lockfile-only --no-frozen-lockfile` | **2.2.0 — no change** |
> | `pnpm install --lockfile-only --resolution-mode=highest` | **2.2.0 — no change** |
> | `pnpm update '@bsuite/*' --lockfile-only` | **2.3.1** |
>
> This is why five apps sat a published privacy fix behind for hours while three
> separate checks reported the drift: detection said stale, the remedy reported
> current, and the estate believed the remedy.
>
> `pnpm update` also **rewrites the range in package.json** (`^2.1.0` → `^2.3.1`)
> and records it as the lockfile's `specifier:`, which then disagrees with
> package.json unless you handle it — and `--frozen-lockfile` rejects exactly
> that. Narrowing what an app declares it requires is a decision; it must not
> ride in unnoticed on a lockfile refresh.
>
> **Use `scripts/regen-consumer-lockfile.mjs`**, which does the two passes and
> all three verifications:
>
> ```bash
> node scripts/regen-consumer-lockfile.mjs --app=crm7           # dry run
> node scripts/regen-consumer-lockfile.mjs --app=crm7 --write   # apply
> node scripts/regen-consumer-lockfile.mjs --all --write         # every consumer
> ```
>
> The steps below remain accurate for WHICH FILES must be copied (all five — a
> missing `pnpm-workspace.yaml` silently drops every override). Only the
> resolution command was wrong.

```bash
cd /path/to/<consumer-repo>     # e.g., crm7/

# 1. Edit package.json — pin to the EXACT new version (no caret, no tilde)
#    NEVER use "@bsuite/auth": "^0.2.1" — always "@bsuite/auth": "0.2.1"
#    The OAuth contract test will fail if a caret/tilde is reintroduced.

# 2. Regenerate the lockfile OUTSIDE the bsuite tree (per CLAUDE.md):
#    Copy package.json + patches/ (if it exists) + the EXISTING lockfile as base.
#    The base lockfile prevents pnpm from re-resolving all transitive deps
#    from scratch, which causes ~900 lines of churn (bsuite#1612).
mkdir ~/lockgen-tmp && cp package.json ~/lockgen-tmp/
cp -r patches ~/lockgen-tmp/ 2>/dev/null || true              # if patches/ exists
cp pnpm-lock.yaml ~/lockgen-tmp/                              # base lockfile
cd ~/lockgen-tmp && pnpm install --lockfile-only --no-frozen-lockfile
cp ~/lockgen-tmp/pnpm-lock.yaml /path/to/<consumer-repo>/pnpm-lock.yaml
rm -rf ~/lockgen-tmp

cd /path/to/<consumer-repo>

# 3. Verify the lockfile has `.:` as the only importer (NOT `..` or `../packages/*`)
grep "^importers:" -A 3 pnpm-lock.yaml | head -5

# 3b. Verify minimal churn — git diff should show only the intended version bump,
#     NOT hundreds of transitive dependency changes (bsuite#1612)
git diff --stat pnpm-lock.yaml

# 4. Run the OAuth contract test
pnpm vitest run src/__tests__/oauth-contract.test.ts
# All tests including "pins @bsuite/auth to an exact version" must pass.

# 5. Run typecheck + lint + full test suite
pnpm typecheck
pnpm lint
pnpm test
```

---

## Smoke-test the BSU→app SSO flow before merging

Before merging any `@bsuite/auth` bump into `main`:

1. Deploy the dev preview (Vercel preview URL).
2. Log into BSU on the matching dev domain.
3. Click across to the app being bumped (matching `d.<app>.<host>` URI from `auth.oauth_clients.redirect_uris`).
4. Verify the destination app:
   - Renders authenticated content (no redirect to login)
   - Browser DevTools → Network: no 401 / 406 on `profiles`, `platform_branding`, or RPC calls
   - Browser DevTools → Application → localStorage shows BOTH `bs_*` keys AND `sb-tuybltdrdefjblnplpqo-auth-token`
5. Wait 70 seconds, then trigger any RLS-protected query. Confirm the Supabase session is being kept in sync with `bs_access_token` rotations (no 401 spike at the ~60s mark).

If any of these fail: **revert the pin in package.json, regenerate lockfile, and reopen the bump as a coordinated multi-repo PR with consumer-side guards in place first.**

---

## Branch naming + PR template

```
chore(<scope>): bump @bsuite/<pkg> to <new-version>
```

PR description must include:
- Link to the package CHANGELOG entry
- The "Migration" section verbatim (or "no migration required" if patch)
- A line: "Smoke-tested BSU→<app> SSO on preview deploy <URL>" — checked
- A line: "OAuth contract test passes" — checked
- For `@bsuite/auth` bumps, also: "All 5 client apps bumped together in coordinated PRs <#1, #2, #3, #4, #5>"

**Never bump `@bsuite/auth` in only one consumer.** All 5 must move together to keep the OAuth Server's expected client behaviour consistent.

---

## When NOT to bump

- A patch CHANGELOG with the words "fixed published tarball" — no behaviour change. Safe to skip until the next minor.
- Mid-incident — never bump shared auth code while debugging an auth incident. Pin the known-good version, fix the consumer first, bump after.
- During merge freeze (see CLAUDE.md memory `bsuite_pending_actions` — current freeze windows).

---

## References

- `bsuite_incident_20260506_bsoauth_supabase_session_bridge` (memory) — root incident
- `bsuite_incident_20260506_silent_auth_redirect_loop` (memory) — `@bsuite/auth@0.2.0` regression
- `packages/auth/CHANGELOG.md` — version history
- `<repo>/src/__tests__/oauth-contract.test.ts` — automated freeze enforcement
- `<repo>/.github/CODEOWNERS` — human review gate
