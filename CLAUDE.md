# BSuite — Claude Code Instructions

## Project Overview

BSuite is a multi-project workspace containing five web applications sharing a common Supabase backend, TypeScript/React stack, and unified contributing standards.

| Project | Purpose | Stack | Package Manager |
|---------|---------|-------|----------------|
| business-suite-unified | Portal connecting all services | React + Vite + Stripe | pnpm |
| crm7 | CRM with AI insights | React + Vite + AI SDK | pnpm |
| conduit | Recruitment ATS | React + Next.js 16 | pnpm |
| braden | Corporate website (braden.com.au) | React + Vite | pnpm |
| R80.3 | Wage calculator | React + Vite | pnpm |

## Critical Rules

### Code Quality

- **TypeScript strict mode** — `strict: true` everywhere, no untyped `any` without justification
- **No-Regex-by-Default** — only tiny anchored literals (≤30 chars, no quantifiers). Use parsers for structured data (URL, JSON.parse + Zod, cheerio, date-fns)
- **ESLint + Prettier** enforced — fix all warnings before committing
- **DRY** — barrel exports for directories with 3+ exports, centralized API handlers, shared Zod schemas, `cn()`/`clsx()` for repeated Tailwind classes

### Commit Conventions

Format: `type(scope): description`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`
Scopes: `bsu`, `crm7`, `conduit`, `braden`, `r80`, `shared`, `docs`, `deploy`

### Theme System

- **D2C Neon Electric theme** for: business-suite-unified, crm7, conduit, R80.3
  - See `docs/20260228-d2c-theme-specification-v1.00W.md` for full palette and implementation
  - Primary: Electric Blue `#2563eb`, Accent: Electric Cyan `#00cec9`
  - Dark mode: deep navy `#0a0e1a`, Light mode: off-white `#fefefe`
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

### Feature Protection

- Feature flags over hard deletions
- No downgrading features without human approval
- When unsure, ask rather than remove

### Database

- All schema changes through versioned migrations
- Follow Expand → Migrate → Contract pattern
- PRs with DB changes must include deployment notes

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
4. **`pnpm-workspace.yaml`** in submodule repos references `'../packages/*'` for **local development only**. This does NOT work on Vercel.
5. **Version pinning**: `packageManager: "pnpm@10.30.3"` and `.node-version: 24` — do not change without coordinating across all projects.
6. **Vercel install command**: All projects use `corepack enable && pnpm install` (defined in each project's `vercel.json`).

---

## Key Files

- `docs/20260227-contributing-standards-guide-v1.00W.md` — full quality standards
- `docs/20260228-d2c-theme-specification-v1.00W.md` — D2C theme specification
- `docs/DRY-ONE-SHOT-ARCHITECTURE.md` — entity ownership and DRY patterns
- `docs/AUTH-MAP.md` — authentication architecture

## Per-Project Notes

### business-suite-unified

- Entry point portal, Stripe integration
- Protected: `src/lib/supabase.ts`, `src/lib/stripeService.ts`

### crm7

- AI-powered features via `@ai-sdk/react` — never commit API keys
- Protected: `src/lib/supabase.ts`, `src/lib/ai/`
- **AI Gateway models** — default: `xai/grok-4.1-fast-reasoning`, fallback: `anthropic/claude-sonnet-4.6`, complex: `anthropic/claude-opus-4.6`
- Config: `src/lib/ai/config.ts`, Router: `src/lib/ai/model-router.ts`
- **NEVER replace grok-4.1-fast-reasoning as default** — it is the configured Vercel AI Gateway model

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
