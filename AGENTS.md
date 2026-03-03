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

Full spec in `Theme-best-practice.md`. Key colors:

| Color | Hex | Use |
|-------|-----|-----|
| Electric Blue | `#2563eb` | Primary actions |
| Electric Cyan | `#00cec9` | Accents, borders |
| Electric Green | `#22c55e` | Success |
| Electric Coral | `#ff4757` | Alerts, destructive |
| Electric Yellow | `#fdcb6e` | Warnings |

Dark mode: deep navy `#0a0e1a`. Light mode: off-white `#fefefe`.
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

### Authentication

- Supabase Auth across all projects
- See `docs/AUTH-MAP.md` for the auth architecture

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
