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
  - See `Theme-best-practice.md` for full palette and implementation
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

## Key Files

- `docs/20260227-contributing-standards-guide-v1.00W.md` — full quality standards
- `Theme-best-practice.md` — D2C theme specification
- `docs/DRY-ONE-SHOT-ARCHITECTURE.md` — entity ownership and DRY patterns
- `docs/AUTH-MAP.md` — authentication architecture

## Per-Project Notes

### business-suite-unified
- Entry point portal, Stripe integration
- Protected: `backend/tables/`, `src/lib/supabase.ts`, `src/lib/stripe.ts`

### crm7
- AI-powered features via `@ai-sdk/react` — never commit API keys
- Protected: `src/lib/supabase.ts`, `src/ai/`

### conduit
- **Next.js 16 App Router** — not Vite. Use server components by default, `'use client'` only when needed
- TanStack React Query for client data, server actions for mutations
- Protected: `next.config.ts`, `src/types/entities.ts`

### braden
- Corporate website — uses company branding, NOT D2C theme
- Security-sensitive: CSP headers, bot protection
- Protected: CSP config, `src/lib/supabase.ts`

### R80.3
- Wage calculations are compliance-critical — extra test coverage required
- Fair Work API integration — cache responses, respect rate limits
- Protected: `src/utils/` (calculation engine), Fair Work API modules
