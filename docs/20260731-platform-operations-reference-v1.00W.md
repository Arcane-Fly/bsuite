# Platform Operations Reference

**Status:** Working · **Relocated:** 2026-07-31

> **Relocated from `AGENTS.md` 2026-07-31** as part of the rulebook slim-down. This is the canonical detail; `AGENTS.md` keeps only the pointer.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Covers setup, package management, shared-package publishing, environment variables, Google Cloud auth, automated deployment checks, and the persistent-memory protocol.

## Quick Start & Lockfile Generation

```bash
cd <project-directory>

# Install (pnpm is standard across all projects)
pnpm install

# Development
pnpm dev        # Start dev server
pnpm build      # Production build
pnpm test       # Run tests
pnpm lint       # Lint check
pnpm typecheck  # Type checking
```

Environment variables: copy `.env.example` to `.env.local` and fill in Supabase credentials.

### pnpm Lockfile Generation

**CRITICAL**: Never run `pnpm install` from within the bsuite directory tree when updating a project's lockfile. The bsuite `pnpm-workspace.yaml` (scoped to `packages/*`) causes pnpm to embed workspace-relative paths (`..`) into the lockfile. Vercel clones only the individual project repo — `..` paths don't exist there, causing `ERR_PNPM_OUTDATED_LOCKFILE`.

Always regenerate lockfiles from an isolated directory **outside** the bsuite tree:

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
# Example for crm7 — same pattern for all projects
mkdir ~/crm7_lockgen
cp crm7/package.json ~/crm7_lockgen/
cp crm7/pnpm-workspace.yaml ~/crm7_lockgen/  # REQUIRED — see warning below
cp -r crm7/patches ~/crm7_lockgen/        # if patches/ exists (crm7 has one)
cp crm7/pnpm-lock.yaml ~/crm7_lockgen/    # base lockfile prevents transitive churn
cd ~/crm7_lockgen && pnpm install --lockfile-only --no-frozen-lockfile
cp ~/crm7_lockgen/pnpm-lock.yaml crm7/pnpm-lock.yaml
rm -rf ~/crm7_lockgen
```

**`pnpm-workspace.yaml` MUST be copied too — omitting it silently drops every `overrides:` entry.**
pnpm 11 no longer reads the `pnpm.overrides` field in `package.json`; every app in this estate
has already moved its overrides into `pnpm-workspace.yaml` (the parent `bsuite/pnpm-workspace.yaml`
made the same move 2026-08-03). Those entries are security floors — conduit alone carries 13,
mostly Dependabot-driven pins (nanoid, js-yaml, sharp, brace-expansion, and others). A lockgen
directory built from `package.json` + `pnpm-lock.yaml` alone still runs and still produces a
lockfile — it just resolves every overridden package back to whatever range its dependents
naturally request, with no error and no warning. The tell is `git diff --stat`: a regen missing
the workspace file produces a diff of **hundreds of lines** (every transitively-affected package
re-resolving), not the few lines the change under way should cost.

**Verify (mandatory — bsuite#1612):**
1. The lockfile has `.:` as the only importer. A broken workspace lockfile will have `..` or `../packages/*` as importers:
   ```bash
   grep "^importers:" -A 3 crm7/pnpm-lock.yaml | head -5
   ```
2. `git diff --stat pnpm-lock.yaml` shows only the intended version bump (a few lines), NOT hundreds of transitive dependency changes. A large diff means the base lockfile — or `pnpm-workspace.yaml` — was not copied. Redo with both the existing lockfile and the existing workspace file as inputs.
3. If the app's `pnpm-workspace.yaml` declares `overrides:`, confirm the regenerated lockfile still resolves them: `grep -A2 "^overrides:" pnpm-lock.yaml` should list the same packages the source `pnpm-workspace.yaml` does, not `overrides: {}`.

See the `bsuite-pnpm-monorepo` skill for the full mechanics (local installs, stale `node_modules` symlinks, Vercel build-script divergence, submodule pre-commit hooks) — this section covers only what a shared-package version bump needs.

### Dependency Version Policy

1. All apps and shared packages MUST use the latest mutually-compatible versions of React, React DOM, `@types/react`, `@types/react-dom`, and related React libraries.
2. When any of the 6 apps bumps React, `packages/schema-registry`, `packages/page-builder`, and `packages/nav-core` MUST be bumped in the same PR or the next PR. CI blocks if a shared package is behind the lowest consumer app version by more than one minor.
3. Peer-dependency ranges for shared packages stay liberal, but devDependencies in each package MUST match the current consumer React version.
4. Use caret ranges (`^X.Y.Z`) for all dependencies that follow semver.
5. Tailwind CSS MUST be v4 or later in every app/package that declares `tailwindcss`. Tailwind v3 is not permitted in package manifests, resolved lockfile entries, docs, or new implementation paths; run `pnpm lint:tailwind-v4` after dependency changes.
6. Run `pnpm update --latest --interactive` monthly.
7. Triage `pnpm audit` security advisories weekly.

---


## Google Cloud Authentication

**CRITICAL**: All Google API access MUST use Workload Identity Federation (WIF). Static service account keys are **BANNED**.

- **GCP Project:** `claritycrm-hpofn` (project number `111744121676`)
- **Service Account:** `firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com` (key-less — WIF only)
- **WIF Pool:** `supabase-edge-functions` (global, Supabase OIDC as IdP)
- **WIF Provider:** `supabase-auth` (trusts issuer `https://tuybltdrdefjblnplpqo.supabase.co/auth/v1`)
- **Auth flow:** Supabase JWT → Google STS token exchange → SA impersonation → short-lived access token
- **NEVER create or store service account JSON keys** — use WIF for all Google API access
- **Reference impl:** `crm7/supabase/functions/generate-document/index.ts`
- **Supabase secrets (non-sensitive metadata):** `GCP_PROJECT_NUMBER`, `GCP_WIF_POOL_ID`, `GCP_WIF_PROVIDER_ID`, `GCP_SA_EMAIL`

---

## Feature Protection

- Feature flags over hard deletions
- No downgrading feature status without human approval
- When unsure about a feature, **ask** — don't remove
- Protected files per project are listed in each `CONTRIBUTING.md`

---


## Environment, Package Manager & Shared Packages

All projects use `.env.example` → `.env.local` pattern. Key conventions:

| Project | Prefix | Auth |
|---------|--------|------|
| **business-suite-unified** | `VITE_` | Supabase Auth |
| **crm7** | `VITE_` | Supabase Auth |
| **conduit** | `NEXT_PUBLIC_` | Supabase SSR Auth |
| **braden** | `VITE_` | Supabase Auth |
| **R80.4** | `VITE_` | Supabase Auth |
| **throughput** | `VITE_` | Supabase Auth + BS OAuth 2.1 |

- Never commit `.env` / `.env.local` files
- All client-side vars: `VITE_` (Vite) or `NEXT_PUBLIC_` (Next.js)
- Server-only vars (API keys): no prefix, access via `process.env`
- Canonical app URL env var map (`VITE_APP_URL`) for all 6 apps:
  - BSU: prod `https://suite.crm7.app`, dev `https://d.suite.crm7.app`
  - CRM7: prod `https://crm.crm7.app`, dev `https://d.crm.crm7.app`
  - Conduit: prod `https://conduit.crm7.app`, dev `https://d.conduit.crm7.app`
  - R80.4: prod `https://r8.crm7.app`, dev `https://d.r8.crm7.app`
  - Throughput: prod `https://ideas.crm7.app`, dev `https://d.ideas.crm7.app`
  - Braden: prod `https://www.braden.com.au`, dev `https://d.braden.com.au`
- Stripe key policy: client bundles may use publishable keys only (`VITE_STRIPE_PUBLISHABLE_KEY` = `pk_*`); secret keys (`sk_*`) must remain server-only and unprefixed.

---

## Package Manager

**pnpm** is the standard package manager for all 5 projects. Lock file: `pnpm-lock.yaml`.

```bash
corepack enable && corepack prepare pnpm@10.30.3 --activate
pnpm install
```

---

## Shared Packages (npm)

**CRITICAL — DO NOT REVERT**: The following `@bsuite/*` packages are published to npm under the `@bsuite` org. Each submodule project deploys independently on Vercel from its own GitHub repo. Vercel clones **only** that repo — the parent monorepo's `packages/` directory does NOT exist in the Vercel build context.

### Published Packages

> **Re-measured 2026-08-17** with `node scripts/check-own-package-freshness.mjs` (6 apps, **52
> `@bsuite/*` dependency edges**, 12 published packages, resolved against the npm registry). Every
> row of the previous table was wrong: each `latest` was one to seven minors behind, `R80.3` was
> listed as a consumer three months after it left the submodule set, and nine published packages
> were missing entirely.
>
> **Read the LOCK column, not the declared range.** The declared range is an intention; the lockfile
> is what Vercel installs. Three edges differ between the two today.
>
> Do not trust the numbers below either — run the guard. It refuses to report clean against an
> uninitialised submodule rather than counting an empty directory as a passing app.

| Package | Declared | Lock resolves | npm latest | Consumers (6 apps) | Source |
|---------|----------|---------------|------------|--------------------|--------|
| `@bsuite/auth` | `0.2.8` pinned (R80.4 `^0.2.8`) | `0.2.8` | `0.2.8` | **all 6** | `packages/auth/` |
| `@bsuite/charge-calc` | `^0.12.0` | `0.12.0` | `0.12.0` | Conduit, CRM7 | `packages/charge-calc/` |
| `@bsuite/data-export` | `^0.1.4` | `0.1.4` | `0.1.4` | BSU, CRM7 | `packages/data-export/` |
| `@bsuite/data-grid` | `^0.1.0` | `0.1.0` | `0.1.0` | CRM7 | `packages/data-grid/` |
| `@bsuite/dates` | `^0.1.0` | `0.1.1` | `0.1.1` | BSU, Braden, Conduit, CRM7, Throughput | `packages/dates/` |
| `@bsuite/dry-lint` | `^1.0.1` | `1.0.1` | `1.0.1` | **all 6** | `packages/dry-lint/` |
| `@bsuite/nav-core` | `^0.9.0` (Braden `^0.9.1`) | `0.9.1` | `0.9.1` | **all 6** | `packages/nav-core/` |
| `@bsuite/page-builder` | `^0.9.0` | `0.9.0` | `0.9.0` | BSU, Braden, Conduit, CRM7, Throughput | `packages/page-builder/` |
| `@bsuite/schema-builder` | `^1.3.0` | `1.3.0` | `1.3.0` | BSU, Conduit, CRM7 | `packages/schema-builder/` |
| `@bsuite/schema-registry` | `^1.0.2` | `1.0.2` | `1.0.2` | **all 6** | `packages/schema-registry/` |
| `@bsuite/theme` | `^0.11.1` | `0.11.2` | `0.11.2` | **all 6** | `packages/theme/` |
| `@bsuite/ui` | `^1.0.2` (BSU `^1.1.0`) | **`1.0.3`** ⚠ | `1.1.0` | BSU, Conduit, CRM7, Throughput | `packages/ui/` |

**Per-app edge counts:** CRM7 12 · BSU 10 · Conduit 10 · Throughput 8 · Braden 7 · R80.4 5.

**One live freshness failure — 3 of 52 edges.** Conduit, CRM7 and Throughput resolve
`@bsuite/ui@1.0.3` while `1.1.0` is published (BSU is already on `^1.1.0`). Their declared `^1.0.2`
**already admits 1.1.0** — only the lockfile pin holds them back, so this is fixed by regenerating
each app's lockfile **outside** the bsuite tree, with no `package.json` edit and no version risk.

**Not published / internal only:** `@bsuite/eslint-config` (`0.3.0`), `@bsuite/jodie` (`0.2.0`),
`@bsuite/theme-codemod` (`1.0.0`), `@bsuite/tsconfig` (`0.1.0`) — consumed by path inside the parent
repo, not from npm.

**A caret on a `0.x` version pins the MINOR.** `^0.9.0` will never take `0.10.0`. Seven of the
twelve packages above are still `0.x`, so bumping any of their minors requires editing every
consumer manifest — a lockfile refresh alone will not do it.

**Consumer-set correction:** `R80.3` appears in no row. It left the submodule set on 2026-08-06
(`5e000c35`) to `~/Desktop/Dev/archived-repos-docs/R80.3` and was replaced by **R80.4**, which
consumes five packages (`auth`, `dry-lint`, `nav-core`, `schema-registry`, `theme`) and is live at
`r8.crm7.app`. Braden consumes neither `@bsuite/ui` nor `charge-calc`, `data-export`, `data-grid`
or `schema-builder`.

### Rules (all agents MUST follow)

1. **NEVER use `workspace:*`** for `@bsuite/*` dependencies in consumer projects. Always use the npm version (e.g., `"^0.1.0"`).
2. **NEVER use `file:../packages/*`** — this also fails on Vercel since the parent directory doesn't exist.
3. **When modifying a shared package** (e.g., `packages/charge-calc/`):
   - Build locally: `pnpm build` in the package directory
   - Bump version in `package.json` (follow semver)
   - Publish by merging the package release PR to `main` so the matching `.github/workflows/publish-*.yml` workflow runs through npm Trusted Publishers (GitHub Actions OIDC)
   - Trusted publishing is the standard for `@bsuite/*`; do not default back to `NPM_TOKEN` or manual token-based publishing unless an operator explicitly approves an emergency fallback
   - Update consumers: change the version in **every** consumer `package.json` named in the table
     above — not a remembered subset. A caret on a `0.x` package pins the minor, so a `0.9.x → 0.10.0`
     bump reaches no consumer until each manifest is edited.
   - Run `pnpm install` in each consumer to update lockfile
4. **`pnpm-workspace.yaml`** in submodule repos (e.g., `crm7/pnpm-workspace.yaml`) references `'../packages/*'` for **local development only**. This does NOT work on Vercel.
5. **Version pinning**: `packageManager: "pnpm@10.33.3"` and `.node-version: 24.x` (the `.x` suffix is required) — do not change without coordinating across all projects. Verified against all 6 apps + parent 2026-07-31.
6. **Vercel install command**: All projects use `corepack enable && pnpm install` (defined in each project's `vercel.json`).

### Publish → Reach Procedure

**A shared package fix is not done when it merges, and it is not done when it publishes to npm
either — it is done when the running app resolves it.** `check-shared-package-reach.mjs`
(`.github/workflows/shared-package-reach-lint.yml`) exists because that gap was measured live
twice in 48 hours: `@bsuite/schema-builder` (bsuite#2190) and `@bsuite/page-builder`
(bsuite#2189) both merged, both published, and both stayed unreached in every consumer because
`pnpm install --frozen-lockfile` — the `installCommand` in every app's `vercel.json` — refuses to
move a lockfile's resolved version on its own, even when the declared `^` range would accept the
new one. **The publish path has no lockfile-refresh step**, and nothing before this guard checked
for one.

There is exactly one correct order for landing a shared-package change, and every step in it is
load-bearing — skip one and the fix sits merged, published, even promoted, while the app the
operator opens still runs the old code:

1. **Merge the package change to `development`.** This bumps `packages/<name>/package.json` and
   lands the source fix, but reaches nobody yet — `development` is never what Vercel builds for a
   consumer app.
2. **Promote `development` → `main`.** This is what actually fires `publish-<name>.yml` (each
   workflow triggers on push to `main` with `packages/<name>/**` changed) — the version bump alone,
   sitting on `development`, publishes nothing.
3. **Wait for the publish to land on npm and verify it — do not assume the workflow succeeded
   because it was merged.** `npm view @bsuite/<name> version` must return the version just bumped.
   This step is why the order matters: **a lockfile cannot pin a version that does not exist on the
   registry yet.** Attempting step 4 before step 3 either fails outright (pnpm cannot resolve a
   nonexistent version) or, worse, silently re-resolves to whatever the OLD latest still is,
   producing a lockfile that looks refreshed and is not.
4. **Refresh each consumer's lockfile to the new version**, from an isolated directory **outside**
   the bsuite tree (see "pnpm Lockfile Generation" above) — never `pnpm install` inside the
   monorepo tree, which embeds `..` workspace paths Vercel cannot resolve. **Copy
   `pnpm-workspace.yaml` along with `package.json` and the base `pnpm-lock.yaml`.** Every one of
   the six apps keeps its dependency-security `overrides:` in `pnpm-workspace.yaml`, not
   `package.json` (pnpm 11 stopped reading `pnpm.overrides` there); conduit alone carries 13 such
   entries, mostly Dependabot-driven CVE pins. Omitting the workspace file does not error — it
   just silently drops every override back to its natural (older, sometimes vulnerable)
   resolution. **A large `git diff --stat pnpm-lock.yaml` is the tell that an input was missing**:
   a correct regen against the same base lockfile changes only the lines the version bump touches;
   hundreds of changed lines means the base lockfile or the workspace file was not copied, and the
   regen must be redone rather than committed.
5. **Promote the consumers** whose lockfiles just changed — this is what actually deploys the new
   `node_modules` to Vercel.
6. **Measure on the running host — not on a merge, not on a green CI, not on "published".** Open
   the live URL (or hit the API) and confirm the fix is actually present. `check-own-package-
   freshness.mjs` and `check-shared-package-reach.mjs` both prove the *lockfile* is correct; neither
   proves Vercel served a build from that lockfile. D-85: closed with evidence means measured on
   the host the operator opens.

**Three related, non-duplicate guards cover different parts of this sequence — know which one
told you what:**

| Guard | Compares | Catches |
|---|---|---|
| `scripts/check-shared-package-reach.py` | consumer's declared **range** vs npm **latest** | a caret that can never structurally reach latest (a `0.x` minor lock) |
| `scripts/check-shared-package-reach.mjs` | consumer's **lockfile pin** vs the **repo's own** `packages/<name>/package.json` version | step 1–2 landed but step 4 has not — visible even before step 3 (npm) has happened |
| `scripts/check-own-package-freshness.mjs` | consumer's **lockfile pin** vs npm **latest** | the same defect, but only visible *after* step 3 — the guard this estate had until `check-shared-package-reach.mjs` closed the earlier-detection gap |

Run `node scripts/check-shared-package-reach.mjs` for the live table of every `@bsuite/*`
package's reach across all six apps — declared repo version, what each lockfile actually pins, and
current npm latest.

---

## Automated Deployment Checks (Ship-All-Apps Cron)

The Ship-All-Apps cron runs every 6 hours (`25 */6 * * *`) and enforces the following checks beyond basic deploy health. Any agent modifying auth, RLS, or shared infra must be aware of what the cron validates.

### RLS Policy Standing Audit

On every run, the cron queries Supabase project `tuybltdrdefjblnplpqo` to verify these five policies remain `{authenticated}` — never `{public}`:

| Table | Policy | CMD |
|-------|--------|-----|
| `tenants` | Tenant owners can update their tenant | UPDATE |
| `tenants` | Users can view their own tenants | SELECT |
| `user_tenants` | Admins can invite users to their tenants | INSERT |
| `user_tenants` | Admins can update user roles in their tenants | UPDATE |
| `user_tenants` | Users can view tenant memberships | SELECT |

If any policy regresses to `{public}`, the cron re-applies the fix and files a GitHub issue on crm7 with label `security`. Migration reference: `20260413062306_fix_rls_public_to_authenticated_tenant_policies`.

### Supabase URI Allow-List (Do Not Prune)

The following redirect URIs must always be present in the Supabase allow-list. Removing any will break OAuth callbacks for that app:

```
https://r8.crm7.app/auth/callback
https://www.braden.com.au/auth/callback
https://suite.crm7.app/auth/callback
http://localhost:*/**
https://*.vercel.app
https://*.vercel.app/**
https://crm.crm7.app/auth/callback
https://*.vusercontent.net/auth/callback
https://ideas.crm7.app/auth/callback
https://conduit.crm7.app/auth/callback
```

### Auth Routing Architecture (Expected Behaviour — Not Bugs)

- **Conduit** (`conduit.crm7.app`) uses Conduit-local `/auth/login` and `/auth/callback` surfaces, then performs BS OAuth 2.1 PKCE against BSU as the OAuth server. It also uses `@supabase/ssr` server-managed cookies on its own host only. No cross-domain cookie sharing.
- **R80.4** (`r8.crm7.app`) uses BS OAuth 2.1 PKCE + JWKS for cross-app SSO. Cookie SSO (`business_suite_auth` on `domain=.crm7.app`) is removed and must not be reintroduced.
- **Braden** (`www.braden.com.au`) is a different TLD and uses the same BS OAuth 2.1 PKCE + JWKS client pattern with Braden-specific client ID/callbacks.
- **All client apps** keep their Supabase native sessions per-domain; silent cross-app SSO happens through BSU `/oauth/authorize?prompt=none`, not shared cookies.

### Separate Project Warning

`monkey-projects` org has its own GitHub OAuth app ("Monkey") deployed on Railway/Vercel. It is entirely separate from BSuite. Never apply BSuite auth, RLS, or provider changes to that org.

### Known Platform Issues (Do Not Action)

- **bsuite#106** — NULL `client_secret_hash` on public OAuth clients (Conduit, Throughput). Supabase platform bug. Dashboard-only; app auth flows are unaffected. No support ticket. No workaround.

---


## Persistent Memory Protocol

This project uses the QIG Memory API for cross-session continuity.

**At session start — run these before any work:**

```bash
curl -s https://qig-memory-api.vercel.app/api/memory/bsuite_session_latest | jq -r '.content'
curl -s https://qig-memory-api.vercel.app/api/memory/bsuite_pending_actions | jq -r '.content'
curl -s https://qig-memory-api.vercel.app/api/memory/bsuite_decisions | jq -r '.content'
```

**Write immediately after every commit, decision, or error fix — do NOT wait for session end:**

```bash
curl -X PUT https://qig-memory-api.vercel.app/api/memory/bsuite_session_latest \
  -H "Content-Type: application/json" \
  -d '{"category":"session_summary","content":"[summary]","updated":"[ISO timestamp]"}'
```

Key naming: all bsuite keys prefixed `bsuite_`. Session keys: `bsuite_session_YYYYMMDD[a-z]`. Update `bsuite_session_latest` pointer after every write.

See `MEMORY_PROTOCOL.md` at project root for full protocol.

---

---

## Project-Specific Notes

> Relocated from `AGENTS.md` 2026-07-31. Per-project protected-file lists remain in each project's `CONTRIBUTING.md`.

### conduit (Next.js)

- App Router with server components by default
- `'use client'` only when client interactivity is needed
- TanStack React Query for client data, server actions for mutations
- `@supabase/ssr` for server-side auth
- AI routes must use `DefaultChatTransport` + `toUIMessageStreamResponse()` + rate limiting (see AI Implementation Standards)

### crm7 (AI Features)

- `@ai-sdk/react` for AI capabilities
- Never commit API keys
- AI-generated content must be labeled in UI
- Rate limiting on AI endpoints
- CRM7 is the canonical reference for AI SDK patterns — other projects port from here
- **The model roster lives in code, not here** — `crm7/src/lib/ai/config.ts` (`AI_MODELS` +
  `DEFAULT_MODEL`) is the single source of truth, with `src/lib/ai/model-router.ts` doing the
  tier routing. Every ID and price there was verified live against the gateway `/v1/models`
  endpoint when the roster was last approved. Do not restate model IDs, context windows, or
  prices in prose — that is exactly what drifted before.
- Current shape (operator-approved 2026-07-31, IDs and prices re-verified live against the
  gateway that day): a cost-tiered roster — a cheap simple tier, `xai/grok-4.3` as the
  medium/primary model, a non-Anthropic fallback, and `anthropic/claude-opus-5` as the
  escalation tier for the hardest work. Read `config.ts` for the authoritative values.
- Two things that changed on 2026-07-31 and are easy to get wrong: `grok-4.3` is a **single
  unified model**, so the former medium/primary split now resolves to one model (the tier
  argument is kept for API compatibility); and the fallback is now cheaper than the primary
  on **input** while dearer on **output**, so "the primary is cheapest on every axis" is no
  longer true. `config.test.ts` documents what is asserted instead.
- **Do not swap providers or model versions without re-confirming against the live gateway
  roster first**, and never downgrade a tier without explicit operator approval.

### R80.4 (Compliance)

- Wage calculations are legally compliance-critical
- Extra test coverage on calculation logic
- Fair Work API responses must be cached
- PDF exports must be print-friendly and data-accurate

### braden (Security)

- CSP headers configured and enforced
- Bot protection active
- Do not weaken security headers without approval

---
