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
