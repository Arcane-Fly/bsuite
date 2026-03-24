# BSuite — Agent & Developer Guide

## Project Overview

BSuite is a multi-project workspace of five web applications sharing Supabase, TypeScript/React, and unified standards.

### Projects

| Project | Role | Tech | PM | Deployment |
|---------|------|------|----|------------|
| **business-suite-unified** | Portal & entry point | React + Vite + Stripe | pnpm | Vercel |
| **crm7** | CRM with AI insights | React + Vite + AI SDK | pnpm | Vercel |
| **conduit** | Recruitment ATS | Next.js 16 App Router | pnpm | Vercel |
| **braden** | Corporate site (braden.com.au) | React + Vite | pnpm | Vercel/Railway |
| **R80.3** | Wage calculator | React + Vite | pnpm | Vercel |

### Common Stack

- **Frontend:** React 18/19, TypeScript (strict), TailwindCSS
- **UI:** Radix UI + Lucide icons
- **State:** Zustand
- **Forms:** React Hook Form + Zod
- **Database:** Supabase (Auth, DB, Storage, Edge Functions)
- **Testing:** Vitest (Vite projects), Jest (Next.js)

---

## Quick Start

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

```bash
# Example for crm7 — same pattern for all projects
mkdir ~/crm7_lockgen
cp crm7/package.json ~/crm7_lockgen/
cd ~/crm7_lockgen && pnpm install
cp ~/crm7_lockgen/pnpm-lock.yaml crm7/pnpm-lock.yaml
rm -rf ~/crm7_lockgen
```

The correct lockfile has `.:` as the only importer. A broken workspace lockfile will have `..` or `../packages/*` as importers.

---

## Quality Standards

All standards are documented in `docs/20260227-contributing-standards-guide-v1.00W.md`. Key rules:

### Code

- TypeScript strict mode, no untyped `any`
- No-Regex-by-Default: only anchored literals ≤30 chars. Use parsers for structured data.
- ESLint + Prettier enforced
- DRY: barrel exports, centralized handlers, shared Zod schemas

### Commits

Conventional Commits: `type(scope): description`

```bash
feat(crm7): add AI-powered contact scoring
fix(conduit): resolve talent pool filter persistence
docs(r80): update Fair Work API reference
```

### Testing

- 70% minimum coverage for critical paths
- Co-located test files: `*.test.ts` / `*.spec.ts`
- Unit + component + integration tests

### Documentation

- Naming: `YYYYMMDD-name-type-vMAJOR.MINOR[STATUS].md`
- Status codes: W=Working, D=Draft, R=Review, A=Approved, F=Frozen
- Every `docs/` folder has a README.md index
- New features documented before merging

---

## Theme System

### D2C Neon Electric (business-suite-unified, crm7, conduit, R80.3)

Full spec in `docs/20260228-d2c-theme-specification-v1.00W.md`. Key colors:

| Color | Hex | Use |
|-------|-----|-----|
| Electric Blue | `#2563eb` | Primary actions |
| Electric Cyan | `#00cec9` | Accents, borders |
| Electric Green | `#22c55e` | Success |
| Electric Coral | `#ff4757` | Alerts, destructive |
| Electric Yellow | `#fdcb6e` | Warnings |

Dark mode: deep navy `#0a0e1a`. Light mode: off-white `#f2f2f2`.
Typography: Inter (body), JetBrains Mono (code).

### Corporate Branding (braden only)

| Color | Hex | Use |
|-------|-----|-----|
| Braden Red | `#ab233a` | Primary |
| Braden Dark Red | `#811a2c` | Secondary headers |
| Braden Gold | `#cbb26a` | Accent |
| Braden Navy | `#2c3e50` | Business elements |

Typography: Montserrat (headings), Inter (body).
See braden project docs for full brand guide.

---

## Architecture

### DRY One-Shot Pattern

Each entity has a single owning app for create/edit. See `docs/DRY-ONE-SHOT-ARCHITECTURE.md`.

### Database

- Supabase shared across all projects
- Schema changes via versioned migrations only
- Expand → Migrate → Contract pattern
- Row Level Security on all tables

### Authentication & OAuth

Full details in `docs/AUTH-MAP.md`. Key facts every agent must know:

**Supabase Project:** `tuybltdrdefjblnplpqo`

**Two auth mechanisms coexist:**

| Mechanism | Purpose | Used By |
|-----------|---------|---------|
| **Supabase Native Auth** | Email/password + Google/Azure AD OAuth via GoTrue | All 5 apps |
| **BS OAuth 2.1 PKCE** | SSO across apps — BSU is the OAuth server, others are clients | CRM7, R80.3, Braden (as clients) |

**Conduit** uses Supabase Native Auth only (via `@supabase/ssr`). It does **not** participate in BS OAuth.

#### OAuth Client Registry

| Client App | Client ID | Domain | Redirect URI |
|------------|-----------|--------|--------------|
| **CRM7** | `30f76744-3e0b-40bf-abb8-8c587389802e` | `crm.crm7.app` | `{origin}/auth/callback` |
| **R80.3** | `5d804d20-cd1b-4724-9107-86d2a9e51e09` | `r8.crm7.app` | `{origin}/auth/callback` |
| **Braden** | `dcb7af18-254a-4946-b94d-5c606b01fc3f` | `www.braden.com.au` | `{origin}/auth/callback` |
| **Throughput** | `35f0db49-ef62-4115-baba-7b961f034cc3` | `ideas.crm7.app` | `{origin}/auth/callback` |

**OAuth Server:** BSU (`suite.crm7.app`) — consent screen at `/oauth/consent`

#### Cross-Domain Session Sharing (Cookie SSO)

BSU, CRM7, and R80.3 share a Supabase session via `cookieStorage` with `domain=.crm7.app` and key `business_suite_auth`. This enables seamless SSO across all `.crm7.app` subdomains.

- **BSU** (`suite.crm7.app`): Sets the cookie — `src/lib/supabase.ts`
- **CRM7** (`crm.crm7.app`): Reads the cookie — `src/lib/supabase.ts`
- **R80.3** (`r8.crm7.app`): Reads the cookie — `src/services/supabaseClient.ts`
- **Throughput** (`ideas.crm7.app`): Reads the cookie — `src/lib/supabase.ts`
- **Braden** (`www.braden.com.au`): ❌ Different TLD — uses BS OAuth 2.1 for SSO instead
- **Conduit** (`conduit.crm7.app`): Server-managed cookies via `@supabase/ssr` (no cross-domain)

#### Cookie Hardening (Applied)

- **Chunked storage**: Values >3 500 bytes split across `key.0`, `key.1`, … cookies
- **`Secure` flag**: Only on HTTPS (disabled for localhost dev)
- **`max-age`**: 30 days (aligned with Supabase refresh token lifetime)
- **`SameSite=Lax`**: Standard cross-site protection

#### BS OAuth PKCE Flow (Summary)

1. Client generates PKCE `code_verifier` + `code_challenge`, stores `state` in `sessionStorage`
2. Redirect to Supabase `/auth/v1/oauth/authorize` with client ID + challenge
3. Supabase redirects to BSU `/oauth/consent` — user approves/denies
4. Auth code returned to client's `/auth/callback`
5. Client exchanges code + verifier at `/auth/v1/oauth/token`
6. Client verifies JWT via JWKS (`jose` library, RS256/ES256)
7. Tokens stored in localStorage: `bs_access_token`, `bs_refresh_token`, `bs_user`, `bs_id_token`

#### Key Auth Files Per Project

| Project | Supabase Client | OAuth Client | Auth Context/Store | Callback |
|---------|----------------|--------------|-------------------|----------|
| **BSU** | `src/lib/supabase.ts` | N/A (is the server) | `src/contexts/AuthContext.tsx` | `src/pages/auth/AuthCallback.tsx` |
| **CRM7** | `src/lib/supabase.ts` | `src/lib/business-suite-oauth.ts` | `src/contexts/AuthContext.tsx` | `src/pages/auth/callback.tsx` (dual) |
| **R80.3** | `src/services/supabaseClient.ts` | `src/lib/business-suite-oauth.ts` | `src/stores/authStore.ts` | `src/pages/AuthCallback.tsx` |
| **Braden** | `src/integrations/supabase/client.ts` | `src/lib/business-suite-oauth.ts` | `src/hooks/useAdminAuth.ts` | `src/pages/auth/AuthCallback.tsx` |
| **Throughput** | `src/lib/supabase.ts` | `src/lib/business-suite-oauth.ts` | `src/lib/auth/AuthProvider.tsx` | `src/pages/auth/AuthCallback.tsx` |
| **Conduit** | `src/lib/supabase/{client,server,middleware}.ts` | N/A | `src/middleware.ts` | `src/app/auth/callback/route.ts` |

#### Critical Auth Rules

1. **All `.crm7.app` Supabase clients MUST use `cookieStorage`** with `domain=.crm7.app` and `storageKey: 'business_suite_auth'` — this enables cookie SSO
2. **All Supabase clients MUST use `flowType: 'pkce'`** — implicit flow is deprecated
3. **Never duplicate the OAuth consent screen** — BSU is the only OAuth server. It was previously copied to Braden by mistake and deleted
4. **CRM7 callback is dual-purpose** — checks `sessionStorage.getItem('bs_oauth_state')` to distinguish BS OAuth from native Supabase PKCE
5. **BS OAuth tokens are NOT Supabase sessions** — they are separate token sets in localStorage. The two auth systems run in parallel.
6. **`startBSTokenRefresh()` is wired** in all 3 client apps — checks every 60s, refreshes 5min before expiry, clears tokens on failure

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

## AI Implementation Standards

**Applies to all projects using Vercel AI SDK (`ai`, `@ai-sdk/react`).**

These rules exist because an agent shipped broken AI code that silently disabled all tool calls. Every rule here prevents a real bug.

### SDK Usage (prevents API hallucination)

1. **Always use `DefaultChatTransport`** — never `TextStreamChatTransport` (strips tool calls, usage info, finish reasons)
2. **Always use `toUIMessageStreamResponse()`** — never `toTextStreamResponse()` or `toDataStreamResponse()` (strips structured data)
3. **Always convert messages** — call `convertToModelMessages(messages)` before passing `UIMessage[]` to `streamText()`
4. **`UIMessage` content is in `parts[]`** — never access `.content` directly. Filter for `part.type === 'text'` and read `.text`
5. **When porting between projects**, verify every import path and type against the target project's installed SDK version — do not assume API surfaces match
6. **When in doubt, check the reference implementation** — CRM7's `useAIChat.ts` and `api/ai/chat.ts` are the canonical working examples

### Production Hardening (ships with the feature)

7. **`export const maxDuration = 30`** on all Vercel edge AI routes — default 10s is too short for streaming
8. **Rate limiting is mandatory** on all AI endpoints — wire `AI_CONFIG.rateLimits` into the route, return 429 with `Retry-After`
9. **Config must be wired** — if you define config (rate limits, quotas, feature flags), it must be consumed. Dead config is a bug.

### Verification Checklist (before marking AI work complete)

10. **TypeScript compiles** — run `pnpm typecheck` on the project
11. **Tool calls work** — verify transport + response method support tools
12. **Rate limiting returns 429** — verify the limiter is imported and called
13. **JSDoc matches code** — if docs say one method, code must use that same method

---

## Project-Specific Notes

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
- **AI Gateway models** — default: `xai/grok-4.1-fast-reasoning`, fallback: `anthropic/claude-sonnet-4.6`, complex: `anthropic/claude-opus-4.6`
- Config: `src/lib/ai/config.ts`, Router: `src/lib/ai/model-router.ts`
- **NEVER replace grok-4.1-fast-reasoning as default** — it is the configured Vercel AI Gateway model

### R80.3 (Compliance)

- Wage calculations are legally compliance-critical
- Extra test coverage on calculation logic
- Fair Work API responses must be cached
- PDF exports must be print-friendly and data-accurate

### braden (Security)

- CSP headers configured and enforced
- Bot protection active
- Do not weaken security headers without approval

---

## Environment Variables

All projects use `.env.example` → `.env.local` pattern. Key conventions:

| Project | Prefix | Auth |
|---------|--------|------|
| **business-suite-unified** | `VITE_` | Supabase Auth |
| **crm7** | `VITE_` | Supabase Auth |
| **conduit** | `NEXT_PUBLIC_` | Supabase SSR Auth |
| **braden** | `VITE_` | Supabase Auth |
| **R80.3** | `VITE_` | Supabase Auth |

- Never commit `.env` / `.env.local` files
- All client-side vars: `VITE_` (Vite) or `NEXT_PUBLIC_` (Next.js)
- Server-only vars (API keys): no prefix, access via `process.env`

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

| Package | npm | Consumers | Source |
|---------|-----|-----------|--------|
| `@bsuite/charge-calc` | `^0.1.0` | CRM7, R80.3 | `packages/charge-calc/` |
| `@bsuite/nav-core` | `^0.1.0` | braden | `packages/nav-core/` |

### Rules (all agents MUST follow)

1. **NEVER use `workspace:*`** for `@bsuite/*` dependencies in consumer projects. Always use the npm version (e.g., `"^0.1.0"`).
2. **NEVER use `file:../packages/*`** — this also fails on Vercel since the parent directory doesn't exist.
3. **When modifying a shared package** (e.g., `packages/charge-calc/`):
   - Build locally: `pnpm build` in the package directory
   - Bump version in `package.json` (follow semver)
   - Publish: `cd packages/charge-calc && npm publish --access public`
   - Update consumers: change version in CRM7/R80.3/braden `package.json`
   - Run `pnpm install` in each consumer to update lockfile
4. **`pnpm-workspace.yaml`** in submodule repos (e.g., `crm7/pnpm-workspace.yaml`) references `'../packages/*'` for **local development only**. This does NOT work on Vercel.
5. **Version pinning**: `packageManager: "pnpm@10.30.3"` and `.node-version: 24` — do not change without coordinating across all projects.
6. **Vercel install command**: All projects use `corepack enable && pnpm install` (defined in each project's `vercel.json`).

---

## Branch Strategy

- **Working branch**: `development` (all projects)
- **Default branch**: `main` (most projects), `master` (business-suite-unified)
- Solo dev workflow: single `development` branch per project
- Merge to main/master when ready for production

---

## Zero-Defer Policy

**MANDATORY for all agents (Windsurf, Claude Code, Copilot, Cursor):**

- **Never defer fixes.** If you identify an issue, fix it now in the same session.
- **No "TODO: implement later"** for known problems. Stub implementations are acceptable only for features not yet designed.
- **No "beyond scope" excuses.** If the scope needs expanding to ship correct code, expand it.
- **Rate limiting, error handling, validation, tests** — these are not optional extras. They ship with the feature.
- If a fix genuinely requires user input (e.g., which API key to use, design decision), ask immediately — don't defer.

---

## Multi-Agent Orchestration

When multiple AI agents work simultaneously:

1. **Scope isolation** — each agent works on one project or one clearly defined task
2. **No overlapping files** — agents must not edit the same files concurrently
3. **Build verification** — every agent must verify build passes before committing
4. **Conventional commits** — all agents follow `type(scope): description`
5. **Protected files** — listed in each project's `CONTRIBUTING.md`

---

## Recent Changes (2025-02-27)

- **Conduit**: Replaced all native `confirm()` with `ConfirmDialog` component + `useConfirmDialog` hook
- **Conduit**: Added `Breadcrumbs` component to dashboard layout
- **CRM7**: Replaced 260+ raw `console.*` calls with centralized `logger` utility
- **All projects**: Fixed Tailwind v4 deprecation (`flex-shrink-0` → `shrink-0`)
- **BSU**: Removed stale Auth0 references from `.env.example`
- **braden**: Fixed CONTRIBUTING.md (was referencing yarn, now correctly pnpm)

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
