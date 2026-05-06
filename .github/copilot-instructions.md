# Universal AI Agent Instructions

This document serves as the **canonical rulebook** for all AI coding agents (Manus, Claude Code, Copilot, Cursor, Windsurf, etc.) operating within this project.

These instructions override any default agent behaviors. You must read, understand, and strictly adhere to these rules before executing any task.

---

## 1. Anti-Laziness & Zero-Defer Policy (CRITICAL)

**BANNED BEHAVIOURS:**
- ❌ Acknowledging a list of open issues and stating "Closing all X in this session isn't realistic" or "Leaving those for another session."
- ❌ Deferring tasks because they require "fresh sessions," "runtime testing," or "judgment calls." You are an autonomous agent; make the judgment call, write the tests, and do the work.
- ❌ Using "TODO: implement later" or leaving stub implementations for known problems.
- ❌ Using pre-existing issues (like types or lints) as an excuse to ignore them. You take responsibility for the codebase you touch.

**REQUIRED BEHAVIOURS:**
- **Never defer fixes.** If you identify an issue (lint, type error, bug), fix it immediately in the same session.
- **100% Completion:** You must continue working until the assigned task is completed to 100% of its requirements. Do not stop or consider the task complete until a zero-defect state is reached.
- **If a fix is genuinely blocked by an external dependency**, you MUST register it as a formal issue in the repository's issue tracker and return to it before completing your current overarching task.

## 2. Issue Tracking & Exhaustive Resolution

- **Track Against Repo Issues:** All outstanding issues on the repository must be included in any task assigned.
- **No Walking Away:** You cannot declare a session "done" if there are outstanding issues in your assigned scope. You must work through them systematically.
- **Closure Condition:** Issues are only to be closed when a red team (or comprehensive QA process) has verified them as complete.

## 3. Sub-Agent Delegation & Documentation

- **Always assign a sub-agent (or dedicated workflow step) to:**
  - Update documentation to reflect your changes.
  - Tick off progress on tracking issues.
  - Archive completed tasks.
  - Monitor outstanding issues.
- **Sub-module Docs:** Documentation within sub-modules must be considered and updated alongside root documentation.
- **No Missed Docs:** Every task must include a verification step to ensure nothing in the documentation is missed or rendered obsolete by your code changes.
- **Follow CONTRIBUTING.md:** Always adhere to the project's `CONTRIBUTING.md` (or equivalent standards file).

## 4. Dependency Management & Upgrades

- **No Downgrades:** If you or another agent has downgraded a package from the latest compatible version, you MUST re-upgrade it.
- **Strict Version Enforcement:** For example, if the project standard is React 19, **React 18 must not be used. No exceptions.**
- Always verify that your changes do not introduce deprecated packages or legacy versions of core frameworks.

## 5. Conflict Resolution in Documentation

In the event of conflicting documentation, instructions, or approaches, you MUST default to the option that is:
1. The **latest** and **newest** approach.
2. The **most complete** and **best practice**.
3. Yields the **highest standard** of code quality.
4. Produces the **most beautiful, intuitive UX** available.

If necessary, combine approaches to achieve this optimal outcome. Never settle for a legacy or degraded UX simply because an older document suggests it.

## 6. Multi-Agent Orchestration & QA

- **Red Team Verification:** Complex tasks, implementations, and issue closures require a "red team" review. Form a rounded team of sub-agents to interrogate the plan, red-team the implementation, and iterate until zero defects remain.
- **Comprehensive QA:** Before finishing a task, you must provide proof that all past and current implementations have been completed in full and are fully functional.
- **Copilot Integration:** When managing GitHub issues, assign `@copilot` to address relevant bot comments or P1 issues. Monitor its progress until a PR is created, and provide feedback for improvements before merging.

## 7. Code Quality & UI Standards

- **Dead Code:** Always identify and remove dead and duplicate code. When introducing newer/better code, thoroughly clean out the superseded code.
- **UI/UX:** All web designs must be beautiful, fully featured, and production-ready. Avoid cookie-cutter designs. Ensure full responsiveness across desktop and mobile.
- **Real Data:** Never display mock data in the UI, especially for financial or account-related information. Always wire up live, real-time data.
- **WCAG Compliance:** Ensure both light and dark modes are compliant with WCAG standards. Maintain clean asset placement (e.g., use actual logos, not generic icons for primary branding).

## 8. End-of-Task Workflow

When concluding a development cycle or major task, follow this strict sequence:
1. Commit and push all changes to the Git repository.
2. Fix failing checks in open PRs and merge them.
3. Pull the latest changes.
4. Adapt contributing guidelines from external sources and enforce them via CI.
5. Plan the implementation of suggested next steps.
6. Run the QA sub-agents for comprehensive quality assurance.
7. Update the project roadmap with the progress made.
8. Incorporate and address any issues identified during this process (including failing tests).

---
*By executing tasks in this project, you acknowledge and agree to operate strictly within these parameters. Laziness, deferral, and scope-dropping are explicitly forbidden.*


---

# BSuite — GitHub Copilot Instructions

> **⚠️ Auth policy (2025-02-27): Cookie SSO has been REMOVED suite-wide.** Cross-app sessions ride on **BS OAuth 2.1 PKCE + JWKS** only. Do NOT add `cookieStorage`, `domain=.crm7.app`, or `storageKey: 'business_suite_auth'` to any Supabase client. See [`AUTH_CANONICAL.md`](../AUTH_CANONICAL.md) and the parent `AGENTS.md` § Authentication & OAuth for the canonical pattern and forbidden-pattern list.

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
- Use Vitest for all projects (Vite + Next.js conduit). Verified 2026-04-28.
- Test business logic, hooks, and interactive components.

## Theme

### Webapps (business-suite-unified, crm7, conduit, R80.3)

Use D2C Neon Electric theme:
- Primary: `#2563eb` (Electric Blue)
- Accent: `#00cec9` (Electric Cyan)
- Success: `#22c55e`, Warning: `#fdcb6e`, Error: `#ff4757`
- Dark bg: `#0a0e1a`, Light bg: `#f2f2f2`
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
6. **Lockfile generation**: NEVER run `pnpm install` from within the bsuite directory tree when updating a project's lockfile. The bsuite `pnpm-workspace.yaml` causes pnpm to embed workspace-relative paths (`..`) into the lockfile, breaking Vercel with `ERR_PNPM_OUTDATED_LOCKFILE`. Always regenerate from outside the bsuite tree:

```bash
mkdir ~/crm7_lockgen && cp crm7/package.json ~/crm7_lockgen/
cd ~/crm7_lockgen && pnpm install
cp ~/crm7_lockgen/pnpm-lock.yaml crm7/pnpm-lock.yaml && rm -rf ~/crm7_lockgen
```

Correct lockfile: `.:` as only importer. Broken lockfile: `..` or `../packages/*` as importers.

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
