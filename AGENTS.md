# BSuite — Agent & Developer Guide

## Project Overview

BSuite is a multi-project workspace of five web applications sharing Supabase, TypeScript/React, and unified standards.

### Projects

| Project | Role | Tech | PM | Deployment |
|---------|------|------|----|------------|
| **business-suite-unified** | Portal & entry point | React + Vite + Stripe | pnpm | Vercel |
| **crm7** | CRM with AI insights | React + Vite + AI SDK | npm | Vercel |
| **conduit** | Recruitment ATS | Next.js 16 App Router | yarn | Vercel |
| **braden** | Corporate site (braden.com.au) | React + Vite | yarn | Vercel/Railway |
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

# Install (use the project's package manager)
pnpm install    # bsu, R80.3
npm install     # crm7
yarn install    # conduit, braden

# Development
<pm> dev        # Start dev server
<pm> build      # Production build
<pm> test       # Run tests
<pm> lint       # Lint check
<pm> typecheck  # Type checking
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

## Project-Specific Notes

### conduit (Next.js)
- App Router with server components by default
- `'use client'` only when client interactivity is needed
- TanStack React Query for client data, server actions for mutations
- `@supabase/ssr` for server-side auth

### crm7 (AI Features)
- `@ai-sdk/react` for AI capabilities
- Never commit API keys
- AI-generated content must be labeled in UI
- Rate limiting on AI endpoints

### R80.3 (Compliance)
- Wage calculations are legally compliance-critical
- Extra test coverage on calculation logic
- Fair Work API responses must be cached
- PDF exports must be print-friendly and data-accurate

### braden (Security)
- CSP headers configured and enforced
- Bot protection active
- Do not weaken security headers without approval
