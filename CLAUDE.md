# BSuite — Claude Code Instructions

## Project Overview

BSuite is a multi-project workspace containing six web applications sharing a common Supabase backend, TypeScript/React stack, and unified contributing standards.

| Project | Purpose | Stack | Package Manager |
|---------|---------|-------|----------------|
| business-suite-unified | Portal connecting all services | React + Vite + Stripe | pnpm |
| crm7 | CRM with AI insights | React + Vite + AI SDK | pnpm |
| conduit | Recruitment ATS | React + Next.js 16 | pnpm |
| braden | Corporate website (braden.com.au) | React + Vite | pnpm |
| R80.3 | Wage calculator | React + Vite | pnpm |
| throughput | Idea management platform (Groq AI) | React + Vite | pnpm |

## Critical Rules

### Code Quality

- **TypeScript strict mode** — `strict: true` everywhere, no untyped `any` without justification
- **No-Regex-by-Default** — only tiny anchored literals (≤30 chars, no quantifiers). Use parsers for structured data (URL, JSON.parse + Zod, cheerio, date-fns)
- **ESLint + Prettier** enforced — fix all warnings before committing
- **DRY** — barrel exports for directories with 3+ exports, centralized API handlers, shared Zod schemas, `cn()`/`clsx()` for repeated Tailwind classes

### Commit Conventions

Format: `type(scope): description`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`
Scopes: `bsu`, `crm7`, `conduit`, `braden`, `r80`, `throughput`, `shared`, `docs`, `deploy`

### Theme System

- **D2C Neon Electric theme** for: business-suite-unified, crm7, conduit, R80.3
  - See `docs/20260228-d2c-theme-specification-v1.00A.md` for the active palette and implementation
  - Primary: Electric Blue `#2563eb`, Accent: Electric Cyan `#00cec9`
  - Dark mode: deep navy `#0a0e1a`, Light mode: off-white `#f2f2f2`
- **Corporate branding** for: braden (braden.com.au)
  - Primary: Braden Red `#ab233a`, Accent: Braden Gold `#cbb26a`
  - Do NOT apply D2C theme to braden

### Documentation

- **Naming convention:** `YYYYMMDD-descriptive-name-type-vMAJOR.MINOR[STATUS].md`
- **Status codes:** W=Working, D=Draft, R=Review, A=Approved, F=Frozen
- **Indexing:** Every `docs/` folder has a README.md index
- **New features** must be documented before merging

### Testing

- Minimum 70% coverage for critical paths
- Vitest for Vite projects, Jest for Next.js (conduit)
- Test files co-located with source: `*.test.ts` or `*.spec.ts`

### Google Cloud Authentication

**CRITICAL**: All Google API access MUST use Workload Identity Federation (WIF). Static service account keys are **BANNED**.

- **GCP Project:** `claritycrm-hpofn` (project number `111744121676`)
- **Service Account:** `firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com` (key-less — WIF only)
- **WIF Pool:** `supabase-edge-functions` (global, Supabase OIDC as IdP)
- **WIF Provider:** `supabase-auth` (trusts issuer `https://tuybltdrdefjblnplpqo.supabase.co/auth/v1`)
- **Auth flow:** Supabase JWT → Google STS token exchange → SA impersonation → short-lived access token
- **NEVER create or store service account JSON keys** — use WIF for all Google API access
- **Reference impl:** `crm7/supabase/functions/generate-document/index.ts`
- **Supabase secrets (non-sensitive metadata):** `GCP_PROJECT_NUMBER`, `GCP_WIF_POOL_ID`, `GCP_WIF_PROVIDER_ID`, `GCP_SA_EMAIL`

### Feature Protection

- Feature flags over hard deletions
- No downgrading features without human approval
- When unsure, ask rather than remove

### Database

- All schema changes through versioned migrations
- Follow Expand → Migrate → Contract pattern
- PRs with DB changes must include deployment notes

### Authentication & OAuth

Full details in `docs/20260227-auth-map-reference-v1.00A.md`. Key facts:

**Supabase Project:** `tuybltdrdefjblnplpqo`

**Two auth mechanisms coexist:**

| Mechanism | Purpose | Used By |
|-----------|---------|---------|
| **Supabase Native Auth** | Email/password + Google/Azure AD via GoTrue | All 6 apps |
| **BS OAuth 2.1 PKCE** | SSO across apps — BSU is OAuth server | CRM7, R80.3, Braden, Throughput, **Conduit** (as clients) |

**All five client apps — CRM7, R80.3, Braden, Throughput, AND Conduit — are full BSU OAuth 2.1 PKCE clients.** No app maintains its own separate OAuth flow. (Frozen #5 corrected 2026-04-28; WS-α — superseded the prior 2026-04-27 "Conduit cookie-SSO with delegated UI" doctrine carve-out, which was a doctrine-investigation anti-pattern. Conduit now mirrors the throughput pattern: imports `signInWithBusinessSuite` / `exchangeCodeForTokens` / `startBSTokenRefresh` from `@bsuite/auth`, dual-purpose callback at `/auth/callback`, BS OAuth tokens stored in localStorage with `bs_*` prefix.)

#### OAuth Client Registry

| Client App | Client ID | Domain |
|------------|-----------|--------|
| **CRM7** | `30f76744-3e0b-40bf-abb8-8c587389802e` | `crm.crm7.app` |
| **R80.3** | `5d804d20-cd1b-4724-9107-86d2a9e51e09` | `r8.crm7.app` |
| **Braden** | `dcb7af18-254a-4946-b94d-5c606b01fc3f` | `www.braden.com.au` |
| **Throughput** | `35f0db49-ef62-4115-baba-7b961f034cc3` | `ideas.crm7.app` |
| **Conduit** | `da925c19-8f32-40a0-b74d-4eb9540c422f` | `conduit.crm7.app` |

**OAuth Server:** BSU (`suite.crm7.app`) — consent screen at `/oauth/consent`
**Redirect URI pattern:** `{origin}/auth/callback` for all clients

#### Cookie SSO (`.crm7.app` subdomains)

BSU, CRM7, R80.3, Throughput, and Conduit share a Supabase session via `cookieStorage` with `domain=.crm7.app`, key `business_suite_auth`. Braden is on a different TLD so uses BS OAuth 2.1 only (no shared cookie). Conduit additionally uses `@supabase/ssr` for server-managed cookies — both layers coexist (the BS OAuth tokens live in localStorage with `bs_*` prefix, the Supabase session lives in the shared `business_suite_auth` cookie).

#### Critical Auth Rules

1. **All `.crm7.app` Supabase clients MUST use `cookieStorage`** with `domain=.crm7.app` and `storageKey: 'business_suite_auth'`
2. **All Supabase clients MUST use `flowType: 'pkce'`** — implicit flow is deprecated
3. **Never duplicate the OAuth consent screen** — BSU is the only OAuth server
4. **Conduit + CRM7 callbacks are dual-purpose** — check `sessionStorage` for `bs_oauth_state` to distinguish BS OAuth flow from Supabase native PKCE
5. **BS OAuth tokens are NOT Supabase sessions** — separate token sets in localStorage (`bs_*` prefix), systems run in parallel
6. **`startBSTokenRefresh()` is wired** in all 5 client apps (CRM7, R80.3, Braden, Throughput, Conduit) — checks every 60s, refreshes 5min before expiry, clears tokens on failure

#### Key Auth Files

| Project | Supabase Client | OAuth Client | Callback |
|---------|----------------|--------------|----------|
| **BSU** | `src/lib/supabase.ts` | N/A (server) | `src/pages/auth/AuthCallback.tsx` |
| **CRM7** | `src/lib/supabase.ts` | `src/lib/business-suite-oauth.ts` | `src/pages/auth/callback.tsx` (dual) |
| **R80.3** | `src/services/supabaseClient.ts` | `src/lib/business-suite-oauth.ts` | `src/pages/AuthCallback.tsx` |
| **Braden** | `src/integrations/supabase/client.ts` | `src/lib/business-suite-oauth.ts` | `src/pages/auth/AuthCallback.tsx` |
| **Throughput** | `src/lib/supabase.ts` | `src/lib/business-suite-oauth.ts` | `src/pages/auth/AuthCallback.tsx` |
| **Conduit** | `src/lib/supabase/{client,server,middleware}.ts` | `src/lib/business-suite-oauth.ts` | `src/app/auth/callback/page.tsx` (dual) |

## Shared Packages (npm)

**CRITICAL — DO NOT REVERT**: The following `@bsuite/*` packages are published to npm under the `@bsuite` org. Each submodule project deploys independently on Vercel from its own GitHub repo. Vercel clones **only** that repo — the parent monorepo's `packages/` directory does NOT exist in the Vercel build context.

| Package | npm | Consumers | Source |
|---------|-----|-----------|--------|
| `@bsuite/charge-calc` | `^0.1.0` | CRM7, R80.3 | `packages/charge-calc/` |
| `@bsuite/nav-core` | `^0.1.0` | braden | `packages/nav-core/` |

### Rules

1. **NEVER use `workspace:*`** for `@bsuite/*` dependencies in consumer projects. Always use the npm version (e.g., `"^0.1.0"`).
2. **NEVER use `file:../packages/*`** — this also fails on Vercel since the parent directory doesn't exist.
3. **When modifying a shared package**: build → bump version → `npm publish --access public` → update consumers → `pnpm install`.
4. **`pnpm-workspace.yaml`** lives only at the bsuite root (scoped to `packages/*`). Individual project repos deployed on Vercel have no workspace config — they are fully standalone.
5. **Version pinning**: `packageManager: "pnpm@10.30.3"` and `.node-version: 24` — do not change without coordinating across all projects.
6. **Vercel install command**: All projects use `corepack enable && pnpm install` (defined in each project's `vercel.json`).
7. **Lockfile generation**: NEVER run `pnpm install` from within the bsuite directory tree when updating a project's lockfile. pnpm embeds workspace-relative paths (`..`) into the lockfile, breaking Vercel with `ERR_PNPM_OUTDATED_LOCKFILE`. Always regenerate from outside the bsuite tree:

```bash
mkdir ~/crm7_lockgen && cp crm7/package.json ~/crm7_lockgen/
cd ~/crm7_lockgen && pnpm install
cp ~/crm7_lockgen/pnpm-lock.yaml crm7/pnpm-lock.yaml && rm -rf ~/crm7_lockgen
```

Verify: correct lockfile has `.:` as the only importer. Broken lockfile has `..` or `../packages/*`.

### Dependency Version Policy

1. All apps and shared packages MUST use the latest mutually-compatible versions of React, React DOM, `@types/react`, `@types/react-dom`, and related React libraries.
2. When any of the 6 apps bumps React, `packages/schema-registry`, `packages/page-builder`, and `packages/nav-core` MUST be bumped in the same PR or the next PR. CI blocks if a shared package is behind the lowest consumer app version by more than one minor.
3. Peer-dependency ranges for shared packages stay liberal, but devDependencies in each package MUST match the current consumer React version.
4. Use caret ranges (`^X.Y.Z`) for all dependencies that follow semver.
5. Run `pnpm update --latest --interactive` monthly.
6. Triage `pnpm audit` security advisories weekly.

---

## Key Files

- `docs/20260227-contributing-standards-guide-v1.00A.md` — full quality standards
- `docs/20260228-d2c-theme-specification-v1.00A.md` — active D2C theme specification
- `docs/20260227-dry-one-shot-architecture-v1.00A.md` — entity ownership and DRY patterns
- `docs/20260227-auth-map-reference-v1.00A.md` — authentication architecture

## Persistent Memory Protocol

Cross-session memory is stored at `https://qig-memory-api.vercel.app/api/memory`.

### Session Protocol (REQUIRED)

**On start:** Read relevant keys to restore context:

```bash
curl https://qig-memory-api.vercel.app/api/memory?keys_only=true   # list all keys
curl https://qig-memory-api.vercel.app/api/memory/bsuite_pending_actions
curl https://qig-memory-api.vercel.app/api/memory/bsuite_sleep_packet_20260321   # latest
```

**Before compaction / session end:** Write session summary + sleep packet:

```bash
curl -X PUT https://qig-memory-api.vercel.app/api/memory/bsuite_session_YYYYMMDD \
  -H "Content-Type: application/json" \
  -d '{"category":"session_summary","content":"...","updated":"YYYY-MM-DDT00:00:00Z"}'

curl -X PUT https://qig-memory-api.vercel.app/api/memory/bsuite_sleep_packet_YYYYMMDD \
  -H "Content-Type: application/json" \
  -d '{"category":"sleep_packet","content":"...","updated":"YYYY-MM-DDT00:00:00Z"}'
```

**After significant actions** (commits, arch decisions, env changes): Write immediately — don't wait.

### Namespace Rules (CRITICAL)

- BSuite work → prefix `bsuite_`
- **NEVER write to `qig_`, `vex_`, `pantheon_` prefixes** — those are separate physics/AI projects
- General dev → `_dev_`, user prefs → `_user_`

### Categories

`session_summary` | `sleep_packet` | `pending_actions` | `frozen_facts` | `architecture` | `toolchain` | `incident`

---

## Per-Project Notes

### business-suite-unified

- Entry point portal, Stripe integration
- Protected: `src/lib/supabase.ts`, `src/lib/stripeService.ts`

### crm7

- AI-powered features via `@ai-sdk/react` — never commit API keys
- Protected: `src/lib/supabase.ts`, `src/lib/ai/`
- **AI Gateway models** — default: `xai/grok-4.20-reasoning`, fallback: `anthropic/claude-sonnet-4.6`, complex: `anthropic/claude-opus-4.6`
- Config: `src/lib/ai/config.ts`, Router: `src/lib/ai/model-router.ts`
- **Primary model is `xai/grok-4.20-reasoning`** (supersedes `grok-4.1-fast-reasoning` per 2026-04-24 Vercel AI Gateway roster update). 2M context, 2M max output, $2/M input + $6/M output. Do not downgrade without explicit user approval.

### conduit

- **Next.js 16 App Router** — not Vite. Use server components by default, `'use client'` only when needed
- TanStack React Query for client data, server actions for mutations
- Protected: `next.config.ts`, `src/types/entities.ts`

### braden

- Corporate website — uses company branding, NOT D2C theme
- Security-sensitive: CSP headers, bot protection
- Protected: CSP config, `src/integrations/supabase/`

### R80.3

- Wage calculations are compliance-critical — extra test coverage required
- Fair Work API integration — cache responses, respect rate limits
- Protected: `src/utils/` (calculation engine), Fair Work API modules

### throughput

- Idea Management Platform at `ideas.crm7.app` — capture, refine, launch ideas with AI assistance
- React 18 + Vite + TypeScript stack (matches the four other Vite apps)
- AI integration via **Groq** (`gpt-oss-120b`) — see `throughput/GROQ_SETUP.md` and `throughput/docs/GROQ_INTEGRATION.md` (submodule-local paths)
- Auth: Supabase Native Auth + BS OAuth 2.1 PKCE client (id `35f0db49-ef62-4115-baba-7b961f034cc3`)
- Reads cookie SSO `business_suite_auth` on `.crm7.app` — same pattern as CRM7/R80.3
- Package manager: **pnpm** (migrated from npm in PR #41, merged 2026-04-25)
