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
- Vitest for all projects (Vite + Next.js conduit) — verified 2026-04-28
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

#### Cross-app SSO (post-2025-02-27)

Cookie SSO has been **removed**. Each app's Supabase client uses per-domain default `localStorage` (`sb-<project-ref>-auth-token`). Cross-app SSO is provided exclusively by **BS OAuth 2.1 PKCE + JWKS** via `@bsuite/auth`. BSU is the OAuth server; CRM7, R80.3, Braden, Throughput, and Conduit are clients. See [`AUTH_CANONICAL.md`](./AUTH_CANONICAL.md) for the full migration rationale.

#### Critical Auth Rules

1. **NEVER add `cookieStorage`, `domain=.crm7.app`, or `storageKey: 'business_suite_auth'`** to any Supabase client — these are forbidden patterns. Cross-app SSO is exclusively via BS OAuth 2.1 PKCE.
2. **All Supabase clients MUST use `flowType: 'pkce'`** — implicit flow is deprecated
3. **Never duplicate the OAuth consent screen** — BSU is the only OAuth server
4. **Conduit + CRM7 callbacks are dual-purpose** — check `sessionStorage` for `bs_oauth_state` to distinguish BS OAuth flow from Supabase native PKCE
5. **BS OAuth tokens are Supabase-compatible JWTs, but not automatic supabase-js sessions** (corrected 2026-05-06) — the OAuth Server `/auth/v1/oauth/token` endpoint issues standard Supabase JWTs (`aud=authenticated`, `role=authenticated`, `sub=<user-uuid>`, plus a `client_id` claim). Each client app's callback MUST bridge them via `supabase.auth.setSession({access_token, refresh_token})` so PostgREST/RPC/Realtime authenticate as the user. Without the bridge, the per-domain supabase client falls back to anon and RLS-protected reads 401/406 immediately after the BSU→app handoff (BSU→CRM7 logged-out incident, 2026-05-06). The `bs_*` localStorage entries are kept for `startBSTokenRefresh()` to drive the OAuth refresh endpoint; an additional 60s sync in `AuthContext` re-seeds the Supabase session whenever `bs_access_token` rotates. Verified by `(crm7|R80.3|throughput|conduit|braden)/src/__tests__/oauth-contract.test.ts` (CI-enforced); enforced at lint time by `bsuite/oauth-callback-must-bridge` (`@bsuite/dry-lint` v0.4.0). `@bsuite/auth` is pinned to an exact version in each consumer `package.json` — bumps follow `docs/DEPENDENCY-BUMP-CHECKLIST.md`.
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

## Autonoma E2E Testing (Vercel Integration)

All 6 BSuite apps (CRM7, R80.3, Braden, BSU, Conduit, Throughput) are connected to **Autonoma AI** via the Vercel integration. Autonoma is an agentic e2e testing platform — AI agents navigate the deployed app end-to-end to find bugs.

**Auth env vars (auto-provisioned by Vercel integration in Production + Preview):**

- `AUTONOMA_CLIENT_ID` — public client ID
- `AUTONOMA_SECRET_ID` — secret (Vercel integration uses this naming; despite the name it is the client secret)

The Vercel integration provisions these per-app on Production + Preview environments. For local development, they live in `.env.local` at the parent monorepo root.

**HTTP header mapping** (when calling the Autonoma API):

```
autonoma-client-id:     <AUTONOMA_CLIENT_ID value>
autonoma-client-secret: <AUTONOMA_SECRET_ID value>
```

**Documentation index:** <https://docs.autonoma.app/llms.txt>

**Deployment checks:** Once an Application + Version is registered via the Autonoma dashboard (e.g. BSU production has Application ID `cmouwgrq209t4013ps6ikkm10`), Autonoma deployment checks run automatically against the deployed Vercel URL on every push that targets that Version.

**API operations supported:**

- Register a web app version: `POST https://autonoma.app/api/web` with `x-platform: web`, multipart-form `name`, `path` (URL), optional `cookies`, `version`, `customID`
- Trigger a test run: `POST https://autonoma.app/api/test/{test_id}/run` with JSON body `{ application_version_id, source: "api", runtime_metadata: {...} }`
- Trigger a folder of tests: `POST https://autonoma.app/api/run/folder/{folder_id}`

**Authoring tests:** done via the Autonoma dashboard UI (canvas + natural-language prompts) — not in code. See "Your First Test" guide at <https://docs.autonoma.app/your-first-test>.

**Operator notes:**

- Vercel `x-vercel-protection-bypass` headers are required for Autonoma to access deployments behind Vercel auth — provision per-version in the Autonoma dashboard.
- Do NOT commit `AUTONOMA_SECRET_ID` to source. The Vercel integration handles distribution.
- Adoption status: env vars distributed across all 6 apps on Production + Preview (2026-05-07). BSU Application + production/preview Versions registered in Autonoma dashboard. Other 5 apps pending operator-driven registration via dashboard.

---

## Key Files

- `docs/20260227-contributing-standards-guide-v1.01W.md` — full quality standards
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
- React 19 + Vite + TypeScript stack (throughput is the only known migration holdout until Phase 5.5 completes)
- AI integration via **Groq** (`gpt-oss-120b`) — see `throughput/GROQ_SETUP.md` and `throughput/docs/GROQ_INTEGRATION.md` (submodule-local paths)
- Auth: Supabase Native Auth + BS OAuth 2.1 PKCE client (id `35f0db49-ef62-4115-baba-7b961f034cc3`)
- Reads cookie SSO `business_suite_auth` on `.crm7.app` — same pattern as CRM7/R80.3
- Package manager: **pnpm** (migrated from npm in PR #41, merged 2026-04-25)


---

## 9. Self-Validation Loop (FF-SELF-VALIDATION-20260507)

**Source:** [How to Make Claude Code Validate its own Work](https://towardsdatascience.com/how-to-make-claude-code-validate-its-own-work/) (Eivind Kjosbakken, 2026-05-05). Adopted as Frozen Fact `FF-SELF-VALIDATION-20260507` and integrated with the Cross Red-Team (§17), Mutual Reminder (§17/§18), Forward Motion (§19), and Obvious-Fix Autonomy (§20) doctrines.

### Why this rule exists

You are not graded on first-try perfection. You are graded on **the gap between your final claim and reality**. A human writing a Fibonacci function runs it before claiming it works; you must do the same. Submitting a "looks done" PR without running the code, opening the page, or comparing the screenshot is a §1 (Zero-Defer) violation — *the work is not done until evidence proves it is*.

### Mandatory validation patterns

#### 9.1. Output-Equivalence Loop (refactors / extractions / migrations)

When you change *how* something is computed but not *what* it should produce:

1. **Capture baseline outputs first.** Run the existing implementation on a representative input set; record the outputs verbatim (numbers, strings, status codes, response shapes).
2. **Implement the change.**
3. **Run the new implementation on the same inputs** and assert near-equivalence (allow for stochastic variance only where the underlying system is non-deterministic — and document the tolerance).
4. **Iterate until the diff is empty (or within documented tolerance).** Do not push until then.

Apply this to: SQL refactors, function extractions, library migrations, prompt reworks, batching changes, edge-function splits, type-system migrations.

#### 9.2. Visual-Equivalence Loop (UI tasks)

When you implement a design from a screenshot, mockup, or live reference:

1. **Anchor on the target.** Save the reference image into the workspace.
2. **Implement.**
3. **Open the page in a real browser** (Playwright, Puppeteer, or `pplx-tool screenshot_page`) and capture a screenshot at the breakpoints declared in the spec (mobile 375, tablet 768, desktop 1440 minimum).
4. **Compare side-by-side** with the reference. Note every divergence (spacing, alignment, colour, type weight, focus rings, dark-mode contrast).
5. **Iterate until the divergences are intentional and documented**, not accidental.

Apply this to: shadcn component placement, layout changes, branding updates, FAB positioning, Tailwind v4 tweaks, responsive-grid adjustments.

#### 9.3. Self-Report Uncertainty (always)

When the loop cannot reach equivalence — visual diff persists, output drift exceeds tolerance, runtime constraint blocks a step, dependency missing — **stop, name the divergence, and ask for input** via the inbox or a tracker comment. Do **not** push, do **not** mark "done", do **not** rationalise the gap. A §17 challenge from a peer is cheaper than a production regression.

### How this composes with existing rules

- **§1 Zero-Defer**: validation IS part of the task, not a follow-up. "Tested locally" without evidence rows is a deferral.
- **§6 Multi-Agent Orchestration**: a peer in the cross red-team MUST verify that the validation evidence (commit SHA, screenshot path, baseline diff) is real and reproducible before flipping queue items to `done`.
- **§17 Mutual Reminder**: every PR description must include an "Evidence" section with at least one of: passing test output, visual-diff screenshot pair, output-equivalence assertion, or live-deploy URL with the relevant page captured.
- **§19 Forward Motion**: a no-claim cycle is not "no work" — running the validation loop on someone else's open PR and writing a verification comment IS forward motion.
- **§20 Obvious-Fix Autonomy**: ship the obvious fix, but the fix must still pass §9.1 or §9.2 before the queue item flips.

### PR description rule (mandatory)

Every PR description must include this `## Evidence` block:

```markdown
## Evidence

- [ ] Output-equivalence (§9.1) baseline + diff: <path or N/A>
- [ ] Visual-equivalence (§9.2) reference + after screenshots: <path or N/A>
- [ ] Self-report block: known divergences from spec or "none"
- [ ] Tests run: <command + result>
- [ ] Live verify: <URL + observation>
```

PRs without this block are not §17-eligible for review.

### Issue / plan filing rule (mandatory)

Every issue and every plan **must include**:

1. **Acceptance criteria** phrased as the validation target (what output / what visual / what assertion).
2. **A "Cross Red-Team" line** naming the agent who will verify (claude-code, perplexity-computer, codebuff, copilot).
3. **A "Skills to load" line** listing the relevant skills (e.g., `supabase-postgres-best-practices`, `playwright-skill`, `qa-and-verification`, `verification-before-completion`, `shadcn-ui`, `tailwind`, etc.) the implementer should pre-load.
4. **A "Validation loop" line** stating which loop (§9.1, §9.2, or both) applies and what the equivalence target is.

Reminder template (paste into every issue body, every plan front-matter):

```markdown
## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: §9.1 output-equivalence | §9.2 visual-equivalence | both
- **Equivalence target**: <baseline output | reference screenshot | live-deploy URL>
- **Cross red-team**: <peer agent name> verifies evidence rows before flip-to-done
- **Skills to load**: <comma-separated list>
- **Self-report on divergence**: yes (mandatory; do not rationalise gaps)
```

### Anti-patterns (banned)

- "Looks correct" without a screenshot.
- "Should work" without running it.
- "Tests will be added later" without an issue link.
- "Visually matches" without a side-by-side image pair.
- Pushing a UI change without opening the page in a browser at all.
- Skipping the self-report when the loop did not converge ("close enough").
- Marking your own work `done` without peer verification per §6 and §17.

### Tooling

- Headless browser: Playwright (preferred — already in BSuite stack), Puppeteer (acceptable), or `pplx-tool screenshot_page`.
- Visual diff: human side-by-side is sufficient for now; structured diff via `pixelmatch` if a regression suite is set up.
- Output diff: `diff -u`, JSON canonicalisation, or a domain-specific equivalence helper (e.g., currency rounding to 2dp before compare).
- Runtime: every implementation PR must list the exact commands run + their output. CI is not a substitute for local validation when the change is visual or behavioural.

---

*Frozen Fact: `FF-SELF-VALIDATION-20260507`. Adopted 2026-05-07 by operator directive. Sourced from Kjosbakken 2026. Applies to all AI agents (claude-code, perplexity-computer, codebuff, copilot, manus, cursor, windsurf) operating in any BSuite or related repo.*

---

## 10. Roadmap Dashboard Update Protocol (FF-DASHBOARD-20260508)

**Live URL**: https://garyocean428.github.io/bsuite/dashboard/
**Source of truth**: `docs/dashboard/data/dashboard-data.json` (in the **bsuite** parent repo) + every `docs/plans/**/*.md` across the parent and all 6 submodules (crm7, conduit, business-suite-unified, R80.3, braden, throughput).
**Refresh script**: `python3 docs/dashboard/refresh-data.py > docs/dashboard/data/dashboard-data.json`
**Inline script**: `bash docs/dashboard/inline-data.sh` (re-inlines JSON into `index.html` for self-contained rendering)

### 10.1. When you MUST update the dashboard

- After **filing or closing an issue** that affects scope (bump `summary.*` counter and add a row under the relevant section)
- After **merging a plan PR** under `docs/plans/**` (run `refresh-data.py` so `plans[]` re-syncs)
- After **landing a feature** previously claimed in the dashboard (move from `in_progress` → `done` with an `evidence_url`)
- After **publishing a new artefact** (XLSX/PDF/MD report) — add a new top-level key with `schema_version: "1.0"`
- **Before declaring a session complete** — verify the dashboard reflects current state. The Anti-Laziness rule (§1) applies: never claim "I'll update the dashboard later".

### 10.2. How to update

| Type of change | Action |
|---|---|
| Plan added/edited/removed | Edit the `.md` under `docs/plans/`; run `refresh-data.py` to regenerate `plans[]` |
| Counter change (e.g. issues closed) | Edit `summary.*` directly in `dashboard-data.json` |
| Auto-generated section (`plans`, branch alignment, package versions) | Run `refresh-data.py` — do NOT hand-edit |
| Manual section (`parity_status`, `feature_360_status`, `gto_compliance_catalogue`, `dashboard_update_protocol`) | Edit JSON directly; bump that section's `schema_version` if shape changes |
| New top-level section | Add render code to `docs/dashboard/index.html` AND document the new key in `dashboard_update_protocol.what_to_update` |

After any edit:

```bash
# 1. (if auto sections changed) refresh
python3 docs/dashboard/refresh-data.py > docs/dashboard/data/dashboard-data.json

# 2. inline JSON into HTML
bash docs/dashboard/inline-data.sh

# 3. verify locally
xdg-open docs/dashboard/index.html   # or `open` on macOS

# 4. commit & push (bundle with the change that motivated it)
git add docs/dashboard/data/dashboard-data.json docs/dashboard/index.html
git commit -m "chore(dashboard): <what changed and why> [skip ci]"
git push
```

The `[skip ci]` marker is only for **data-only** updates. If `index.html` rendering logic changed, omit `[skip ci]` so the deploy workflow runs.

### 10.3. Rules for AI agents (non-negotiable)

1. **No deferral** — update the dashboard in the **same PR/session** as the change that motivated it. "I'll update later" is banned per §1.
2. **Evidence required** — every status change needs a URL (PR / commit / issue) in an `evidence_url` field. No orphan claims.
3. **Schema versioning** — when extending a section, bump its `schema_version` (`1.0` → `1.1` for additive, `2.0` for breaking shape changes).
4. **Truthful counters** — if you cannot verify a count from primary state (issues / PRs / files), use `null` and explain in a `note` field. Never invent counts.
5. **No orphan keys** — every top-level JSON key must be rendered by `index.html` OR documented in `dashboard_update_protocol.what_to_update` as `"data-only, machine-consumable"`.
6. **Don't edit auto sections by hand** — `plans[]` and per-repo branch-alignment fields are regenerated; manual edits will be overwritten.
7. **Don't edit `index.html` directly to change data** — edit the JSON and re-inline. Direct HTML edits are reserved for rendering logic changes.

### 10.4. Common mistakes (banned)

- ❌ Forgetting to run `inline-data.sh` after editing the JSON (Pages stays stale)
- ❌ Editing `index.html` directly to add data (will be overwritten on next inline)
- ❌ Updating counters without filing the underlying issue (claims without evidence)
- ❌ Hand-editing the `plans[]` array (it's auto-generated; edit source `.md` files instead)
- ❌ Missing the `[skip ci]` marker on data-only updates (causes redundant workflow runs)
- ❌ Filing a "docs only" PR for a dashboard update — bundle with the change that motivated it

### 10.5. Verification checklist (before commit)

- [ ] JSON parses cleanly (`python3 -c "import json; json.load(open('docs/dashboard/data/dashboard-data.json'))"`)
- [ ] `index.html` opened in browser — affected section renders without console errors
- [ ] Counter math matches reality (cross-checked against `gh issue list` / `gh pr list`)
- [ ] Every new claim has an `evidence_url`
- [ ] If shape changed, the section's `schema_version` is bumped
- [ ] Commit message follows `chore(dashboard): <reason>` convention

### 10.6. What's tracked

The dashboard surfaces (live as of 2026-05-08):

- `summary` — top-line counters
- `repos` — 7-repo status (parent + 6 submodules)
- `plans[]` — every `docs/plans/**/*.md` file across all repos (auto-generated)
- `operator_blockers` — items only the human operator can resolve
- `production_state` — Vercel + auth canonical status
- `gap_report.categories` — OAuth-freeze gap analysis
- `parity_status` — Codehouse parity matrix coverage
- `feature_360_status` — 9-portal coverage doctrine
- `visual_feature_builder` — phase-by-phase status
- `portal_coverage` — per-portal RLS / theme / shadcn checks
- `apprentice_placements_status` — placement queue
- `doc_drift_status` — documentation drift PRs
- **`gto_compliance_catalogue`** (added 2026-05-08) — 50-report coverage, 8 active gaps tracked as `crm7#527`–`#534`
- **`dashboard_update_protocol`** (added 2026-05-08) — this protocol, machine-readable

When you add a new top-level section, append it to this list in §10.6 of every agent doc.

---
