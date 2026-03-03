# BSuite — GitHub Copilot Instructions

## Context

BSuite is a multi-project workspace with five web applications: business-suite-unified (portal), crm7 (CRM), conduit (ATS), braden (corporate site), and R80.3 (wage calculator). All share Supabase, TypeScript strict mode, React, TailwindCSS, and Zustand.

## Code Generation Rules

### TypeScript

- Always use strict TypeScript. Never use `any` without a justifying comment.
- Use `interface` for object shapes, `type` for unions/intersections.
- Prefer `const` over `let`. Never use `var`.
- Use async/await, never raw Promise chains.
- Name: `camelCase` for variables/functions, `PascalCase` for components/types, `SCREAMING_SNAKE_CASE` for constants.

### React

- Functional components only. No class components.
- Use Zustand for state management, not Redux or raw Context for global state.
- Forms use React Hook Form + Zod validation.
- UI primitives from Radix UI. Icons from Lucide React.

### No-Regex-by-Default

Do not generate regex for parsing structured data. Use:
- `new URL()` / `URLSearchParams` for URLs
- `JSON.parse()` + Zod for JSON
- `date-fns` for dates
- Regex is only acceptable for tiny anchored literals (≤30 chars, e.g., `/^[A-Z]{3}$/`)

### DRY

- Create barrel `index.ts` files for directories with 3+ exports.
- Use `cn()` or `clsx()` for conditional Tailwind classes.
- Extract repeated UI patterns into shared components.
- Centralize API error handling.

### Testing

- Co-locate tests with source: `ComponentName.test.ts`
- Use Vitest for Vite projects, Jest for Next.js (conduit).
- Test business logic, hooks, and interactive components.

## Theme

### Webapps (business-suite-unified, crm7, conduit, R80.3)

Use D2C Neon Electric theme:
- Primary: `#2563eb` (Electric Blue)
- Accent: `#00cec9` (Electric Cyan)
- Success: `#22c55e`, Warning: `#fdcb6e`, Error: `#ff4757`
- Dark bg: `#0a0e1a`, Light bg: `#fefefe`
- Font: Inter, code: JetBrains Mono

### braden (braden.com.au)

Uses corporate branding — NOT the D2C theme:
- Primary: `#ab233a` (Braden Red)
- Accent: `#cbb26a` (Braden Gold)
- Font: Montserrat (headings), Inter (body)

## Shared Packages (npm)

**CRITICAL — DO NOT REVERT**: `@bsuite/*` packages are published to npm. Each submodule deploys on Vercel from its own repo — the parent monorepo's `packages/` directory does NOT exist in the Vercel build context.

| Package | npm | Consumers |
|---------|-----|-----------|
| `@bsuite/charge-calc` | `^0.1.0` | CRM7, R80.3 |
| `@bsuite/nav-core` | `^0.1.0` | braden |

**Rules:**
1. **NEVER use `workspace:*`** for `@bsuite/*` deps. Always use npm version (`"^0.1.0"`).
2. **NEVER use `file:../packages/*`** — fails on Vercel.
3. **When modifying a shared package**: build → bump version → `npm publish --access public` → update consumers.
4. **Version pinning**: `packageManager: "pnpm@10.30.3"`, `.node-version: 24` — do not change.
5. **Vercel install**: All projects use `corepack enable && pnpm install`.

## Commits

Conventional Commits: `type(scope): description`
Scopes: `bsu`, `crm7`, `conduit`, `braden`, `r80`, `shared`, `docs`, `deploy`

## Documentation

New docs follow: `YYYYMMDD-name-type-vMAJOR.MINOR[STATUS].md`
Status: W=Working, D=Draft, R=Review, A=Approved, F=Frozen

## Project-Specific

- **conduit** uses Next.js 16 App Router — server components by default, `'use client'` only when needed
- **crm7** has AI features via `@ai-sdk/react` — never hardcode API keys
- **R80.3** wage calculations are compliance-critical — always test with known correct values
- **braden** has strict CSP headers — don't weaken without approval
