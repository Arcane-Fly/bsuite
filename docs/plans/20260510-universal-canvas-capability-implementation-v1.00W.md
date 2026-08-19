> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---
title: Universal Canvas Capability Implementation Plan
date: 2026-05-10
status: W (Working — not yet executed)
version: 1.01W (red-team amendments applied 2026-05-10)
authors: [claude-code (opus-4-7-1M), operator]
scope: cross-cutting / all 6 BSuite apps
tier: Heavy (multi-app, persistent bug, production blast radius)
master_orchestration: required
self_validation: FF-SELF-VALIDATION-20260507 (§9 of each app CLAUDE.md applies)
dashboard_protocol: FF-DASHBOARD-20260508 (§10 of parent CLAUDE.md applies — update after every phase)
---

## Revision history

| Version | Date | Author | Change |
|---|---|---|---|
| 1.00W | 2026-05-10 | claude-code | Initial draft |
| 1.01W | 2026-05-10 | claude-code (post-red-team) | Applied 20 red-team findings: Phase B sub-split (P0 #1), If-Match precondition for layout writes (P0 #2), per-page evidence table mandatory (P0 #3), Layout-Updated toast ships in Phase A not deferred (P0 #4), Phase C scoped to Sales Pipeline only — Workflow Builder + AI Flow Designer moved to Phase D + E as separate plans (P0 #5), 500ms preference write debounce (P1 #6), stale-tab guard (P1 #7), cross-app OAuth contract test in Phase 0 (P1 #8), a11y contract for edit mode (P1 #9), bundle delta ≤2 kB (P1 #10), bundle analyser proof for Phase C (P1 #11), `<DraggableCardPage brand="corporate">` for braden (P1 #12), explicit RLS predicate audit (P1 #13), plus P2 amendments inline. |
| 1.02W | 2026-05-11 | claude-code (operator directive) | Added Phase F — Universal date-format localisation. Default `en-AU` with BSU-level per-user toggle to `en-US`. Captures the cross-app doctrine the operator surfaced 2026-05-11: dates currently rendered in mixed formats, must default to Australian, must be switchable. |

# Universal Canvas Capability — Implementation Plan v1.00W

> ## ⚠ SUPERSEDED — 2026-08-17
>
> **Shipped.** The universal-canvas capability this plan specifies was delivered as
> **`@bsuite/page-builder`**, published `0.9.0` and consumed by all five apps
> (BSU, Braden, Conduit, CRM7, Throughput at `^0.9.0` — verified 2026-08-17 via `npm view` and each
> submodule's `package.json`).
>
> The plan header still reads *"not yet executed"*. That was true when written and is not true now.
>
> **Do not re-implement from this document.** For how the shipped grid actually behaves — the
> per-card registration pattern, `autoHeight`, `layoutVersion` invalidation and the resize
> regressions fixed along the way — read `packages/page-builder/` and the `bsuite-page-grid-layout`
> skill. Retained for its red-team amendments, which record *why* the shipped design is what it is.


## Why this plan exists (operator brief)

The operator has flagged the same class of complaint **~50 times**: pages that should be customisable
canvases (drag, resize, reorder cards) are not. Each prior attempt has been a surface patch on a single
page, leaving the underlying primitives in the same half-wired state. This plan ends that pattern by
landing the **systemic** fix: every page across every app that should be a canvas gets the same
draggable/resizable/reorderable behaviour, sharing one source of truth (`@bsuite/page-builder`,
`@dnd-kit`, `@xyflow/react`, `@tanstack/*`).

**Three operator-explicit decisions captured (2026-05-10):**

1. Phase A starts immediately (`go`).
2. `@xyflow/react` is **wired**, not removed. Inspiration source: <https://github.com/GaryOcean428/threaded.git> (a fork of activepieces — visual workflow builder built on react-flow).
3. **crm7#579** (OAuth state-helper test contract, currently red CI) ships as its own **isolated PR (Phase 0)** so the canvas work has no auth blast-radius.

**Work-preservation prerequisite (already executed 2026-05-10 before plan was written):**

- crm7#569, #570, #571, #572, #573, #574, #575 retargeted `main` → `development`. Zero work lost.
- crm7#567 (NAT00100 AVETMISS) retarget failed — it is a duplicate of #577 (same head branch, already targeting dev). Will close #567 as `superseded-by #577` during Phase 0. Commits remain in #577. Zero work lost.

---

## 1. Master orchestration metadata (per master-orchestration §1–§3)

### 1.1 Project family

**BSuite.** Detected via CWD (`/home/braden/Desktop/Dev/bsuite/`), git remotes containing `crm7`,
`business-suite-unified`, `conduit`, `braden`, `R80.3`, `throughput`, and memory silo `bsuite_*`.

### 1.2 Skills inventory + distribution (per phase, per sub-agent)

Each phase below has a **Skills + MCPs** sub-section that names the exact skill or MCP to load. The
table here is the reference index; do NOT proceed if a step lacks a named skill/MCP.

| Skill | Purpose | Used in phases |
|---|---|---|
| `master-orchestration` | Top-level orchestration discipline | Every turn |
| `writing-plans` + `multi-agent-red-team-planning` | Plan drafting + red-team | Plan-author phase (this document) |
| `using-superpowers` | Skill-invocation discipline | Every turn |
| `best-practice-research` | Current-best-practice (Gate A research) | A.1, A.2, B.0, C.0 (any new library API question) |
| `Explore` agent | Codebase exploration | A.1 inventory, B.1 page-survey, C.1 threaded-source-survey |
| `feature-dev:code-reviewer` | Confidence-filtered code review | After every implementation step |
| `multi-agent-red-team-implementation` | Implementation red-team | Between Phase A→B, Phase B→C, Phase C→ship |
| `verification-before-completion` + `qa-and-verification` | Pre-claim verification discipline | Every phase exit |
| `test-driven-development` | TDD for new behaviour | A.2 (DraggableCardPage), C.2+ (react-flow nodes) |
| `dispatching-parallel-agents` + `subagent-driven-development` | Parallel agent execution | Phase B (per-app parallelisation) |
| `dnd-kit` | DnD-Kit patterns | Phase B (DnD primitives) + Phase C (node drag) |
| `tanstack-query` + `tanstack-table` + `tanstack-router` | TanStack family | Phase B (data layer); Router migration out-of-scope this cycle |
| `shadcn-ui` + `tailwind-css-v4-best-practices` + `vercel-react-best-practices` | UI primitives | Every UI step |
| `bsuite-brand-system` | Brand enforcement (oklch tokens, D2C-Neon for 5 apps; Corporate for braden) | Every UI step |
| `dry-one-shot-architecture` | DRY enforcement — entity-ownership, no app-local mirror tables | Every step |
| `forms-and-validation` | RHF + Zod patterns | A.4 (Reports control), C.3 (flow-node config) |
| `framer-motion` | Animation primitives | Edit-mode transitions |
| `security-audit` + `supabase-auth-comprehensive` | Auth-flow gate | Phase 0 (crm7#579) + final-ship verification |
| `playwright` + `chrome-devtools-mcp` | Live-test (Gate B) | Every phase exit + post-deploy smoke |
| `vercel-web-design-guidelines` + `ui-ux-pro-max` | UX review | Every UI step |
| `code-quality-enforcement` + `react-code-fix-linter` | Lint + React 19 patterns | Every implementation step |
| `cross-platform-sync` | AGENTS.md / CLAUDE.md sync | Final docs step |
| `ship-all-apps` | Multi-app ship orchestration | Final ship |
| `tandem-dev-main-reconcile` | dev↔main reconciliation if conflicts arise | Mid-cycle if any sync conflict surfaces |
| `git-workflow` | Conventional commits + branch hygiene | Every commit |
| `using-git-worktrees` | Worktree isolation per phase per app | Optional per app |

### 1.3 MCP inventory + distribution

| MCP | Used for | Phases |
|---|---|---|
| `Context7` (`mcp__plugin_context7_context7__*`) | Library API verification (Gate A) — `react-grid-layout@2.2.3`, `@xyflow/react@12.x`, `@dnd-kit/core@6.3.x + sortable@10.x`, `@tanstack/react-query@latest`, `@bsuite/page-builder@0.2.6` | A.1, B.0, C.0 |
| `Supabase` (`mcp__claude_ai_Supabase__*`) | DB advisors, RLS verification, migration (none expected this cycle — confirm none needed) | Audit only |
| `Vercel` (`mcp__claude_ai_Vercel__*` + `mcp__plugin_vercel_vercel__*`) | Build logs + deploy-state polling | A.5, B.5, C.5, ship |
| `chrome-devtools-mcp` (`mcp__plugin_chrome-devtools-mcp_chrome-devtools__*`) | Gate B runtime verification on `d.<app>.crm7.app` after each preview | Every phase exit |
| `Playwright` (`mcp__plugin_playwright_playwright__*`) | E2E regression suite (drag, resize, persist, edit-mode toggle) | A.6, B.6, C.6 |
| `GitHub` (`mcp__claude_ai_github__*`) | PR open/edit/merge, label, branch-protection state, copilot follow-up | Every PR step |
| `Tavily` / `tavily-api-expert` skill | Web research backup if Context7 doesn't cover a topic | Rare — A.1 fallback only |
| `microsoft-docs` | Azure / Entra ID auth (NOT needed unless auth-flow regression suspected) | Phase 0 only if needed |

### 1.4 Sub-agent team formation (master-orchestration §3)

**Standard roles (assigned to every phase):**

- **Security Agent** — `security-audit` + `supabase-auth-comprehensive` + Context7. Phase 0 lead; advisory in A–C.
- **Reliability Agent** — `systematic-debugging` + Playwright. Verifies edge cases (race, mobile, touch, reload-during-edit).
- **Performance Agent** — `vercel-react-best-practices` + `vercel-next-cache-components` (for conduit) + bundle-size discipline. Lead in A.0 (preconnect, lazy-load) and C.3 (react-flow chunking).
- **Code-Quality Agent** — `feature-dev:code-reviewer` + `code-quality-enforcement` + `react-code-fix-linter`. Reviews every PR.
- **User-Advocate** — `vercel-web-design-guidelines` + `ui-ux-pro-max` + `chrome-devtools-mcp`. Verifies the canvas is intuitive (drag affordance visible, edit-mode discoverable, persistence stable).
- **Developer-Advocate** — `dry-one-shot-architecture` + `cross-platform-sync`. Ensures the abstraction is clean and replicable.

**BSuite-specific specialists:**

- **Brand-Consistency Agent** — `bsuite-brand-system`. Verifies D2C-Neon oklch tokens preserved (CRM7/BSU/Conduit/R80.3/Throughput); Corporate brand on Braden. No hex/rgb regression.
- **Multi-App-Sync Agent** — Compares the same canvas behaviour across all 6 apps; flags drift. Lead in B.5 and B.6.
- **RLS-Aware Agent** — `supabase-postgres-best-practices`. Verifies user-preferences writes still respect `auth.uid()` + `client_id` scoping. Audit only — no schema changes expected.

**Heavy-tier red-team (mandatory for this plan per master-orchestration §3):**

- **Red-Team Security** — Adversarial. Attempts to bypass canvas-write authz via crafted preference payloads, oversized layouts, layout-version downgrades. Phase 0 + final-ship.
- **Red-Team Reliability** — Adversarial. Attempts to reproduce race during simultaneous tab edits, server-side conflict (CRDT-like resolution), reload-mid-drag, mobile touch-cancel, browser zoom + drag combinations.

**Continuous sub-agents (per master-orchestration §8):**

- **`accountability-agent`** (`~/.agents/agents/accountability-agent.md`) — running watchdog. Interrupts on hard-rule violations (work-loss risk, auth blast-radius leak, scope creep beyond §1 spec). Always proposes ≥1 resolution. Runs `run_in_background: true` for every phase.
- **`memory-synapse`** (`~/.agents/agents/memory-synapse.md`) — silo-aware (`bsuite_*` only — never reads `qig_*` / `vex_*` / `pantheon_*`). Writes session-summary + sleep-packet after each phase exit.
- **`completeness-agent`** (defined inline below — extends `verification-before-completion` skill) — refuses to flip any phase to `done` without observable proof: PR URL, CI green snapshot, live-deploy screenshot, console-clean snapshot, drag-test recording.

#### 1.4.1 Completeness Agent definition (inline)

A small, focused agent that runs at each phase-exit checkpoint with this single duty:

```
For phase <X>, verify ALL of:
  [ ] Every step in <X> has a PR URL or commit SHA.
  [ ] CI is green on the head of every PR (`gh pr checks <N>`).
  [ ] Vercel preview is READY (Vercel MCP `get_deployment` returns readyState=READY).
  [ ] chrome-devtools-mcp Gate-B snapshot was captured (path in PR description).
  [ ] Playwright e2e for the phase's scope ran and passed.
  [ ] Brand check: no new hex/rgb in any D2C app; no brand bleed into braden.
  [ ] Memory write happened: `bsuite_session_YYYYMMDD<letter>` exists with this phase logged.
  [ ] Dashboard updated per FF-DASHBOARD-20260508 (counter + evidence_url for each shipped item).
  [ ] Cross-platform sync: AGENTS.md ≡ CLAUDE.md across affected apps.
If ANY box is unchecked, FAIL the phase exit. Propose the minimum next step to unblock.
```

The completeness-agent invocation is a numbered step at the end of every phase below (`X.end`).

---

## 2. Acceptance criteria (per FF-SELF-VALIDATION-20260507)

A canvas page passes acceptance when:

1. Every top-level visual block on the page is its own grid item with an individually adjustable position and size.
2. Drag works on the card surface (not just an obscure handle); resize works via the SE handle; both gated on Edit Mode.
3. Edit Mode toggles via the visible "Edit Page" floating button (and an `Esc` / "Done" exit).
4. Layout persists per-user, per-tenant, per-page via `useScopedPreference` → Supabase `user_preferences` JSONB + localStorage fallback. Survives reload.
5. `layoutVersion` bumps invalidate stale saved layouts cleanly (existing tenants see the new default layout, can re-customise, save).
6. Mobile (`<md` breakpoint): drag is disabled by default but a "Customise" link routes to a desktop-only edit experience (matches Dashboard behaviour — no drift).
7. Brand: D2C-Neon oklch tokens preserved; no new hex/rgb; light + dark mode both WCAG-AA contrast.
8. Login flow regression test passes (`supabase.auth.signInWithPassword`, BS OAuth round-trip, `setSession` bridge intact) after every phase exit.

**Validation loop**: §9.1 output-equivalence (saved layouts identical between v0.2.5 and v0.2.6 for a frozen set of pages) **AND** §9.2 visual-equivalence (per-page screenshot pair pre/post-fix at 375/768/1440 breakpoints).

---

## 3. Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| Canvas fix breaks an existing saved layout for production tenants | High | Bump `layoutVersion` on each touched page; provide a localStorage backup of the old layout before invalidation; ship a one-time "Layout updated — your old custom layout has been archived" toast linked to a restore action. **RT amendment #4: this toast is in Phase A scope (Step A.4e), NOT deferred — §1 anti-defer doctrine applies.** |
| `@bsuite/page-builder@0.2.6` has an undiscovered regression vs 0.2.1 | Medium | Phase A.0 runs the Output-Equivalence loop (§9.1) on a frozen test layout set BEFORE any consumer bump. If diff is non-empty, fix the package first, republish, then bump consumers. |
| React-flow bundle adds significant kB to initial entry | Medium | Phase C lazy-loads react-flow per-route (next dynamic import / React `lazy`); never imported in the entry bundle. Performance Agent verifies via Vercel MCP build logs. |
| Auth flow regression (the operator's explicit "don't break login" constraint) | High | Phase 0 (isolated) lands the OAuth-state-helper test pin first; every subsequent phase exit re-runs the auth-flow smoke (Playwright login on `d.<app>.crm7.app`). Canvas + auth are disjoint modules per the inventory — risk is verification, not architecture. |
| Cross-app drift returns (the recurring frustration) | High | Multi-App-Sync Agent runs in every phase exit; the consistency check produces a single matrix in the PR description showing version pins, primitive choice, persistence key naming across all 6 apps. No PR ships with drift. |
| Operator's "50th time" frustration recurs because some app gets skipped | Critical | Phase B walks all 6 apps in fixed order with a per-app go/no-go gate; the completeness-agent refuses to mark Phase B done until every app has a green PR + green deploy. |
| Squash-merge erases parent linkage (memory `feedback_squash_loses_parent_linkage.md`) | Medium | Use `--merge` (not `--squash`) on any sync-conflict PRs. Promote PRs use `--squash` as standard. |
| Vercel build pulls stale lockfile (CLAUDE.md §Shared Packages rule 7) | Medium | Every `pnpm install` for lockfile regen runs OUTSIDE the bsuite tree per the doc'd recipe. |

---

## 3.5. Red-team findings (post-amendment status)

All 20 findings from the `multi-agent-red-team-planning` pass (2026-05-10) have been incorporated.
Cross-reference for traceability:

| # | Severity | Finding (summary) | Plan landing site |
|---|---|---|---|
| 1 | P0 | Phase B sub-split ≤15 pages per PR | §4 Phase B sub-split table |
| 2 | P0 | Two-tab LWW destroys layouts → If-Match precondition + conflict toast | Step A.4c |
| 3 | P0 | Per-page evidence table mandatory in every B PR | §4 Phase B per-PR evidence table |
| 4 | P0 | Layout-Updated toast ships in Phase A, not deferred | Step A.4e + Risk row 1 amendment |
| 5 | P0 | Phase C narrowed to Sales Pipeline only; Workflow Builder + AI Flow Designer → Phase D + E plans | §4 Phase C scope narrowing |
| 6 | P1 | 500ms debounce on `useScopedPreference` writes | Step A.4b |
| 7 | P1 | Stale-tab edit guard before opening edit mode | Step A.4d |
| 8 | P1 | Cross-app OAuth contract test in Phase 0 | Step 0.5b |
| 9 | P1 | a11y contract for edit mode (FAB aria-label, drag-handle announcements, Esc exit, focus return) | Step A.5b |
| 10 | P1 | Bundle delta ≤2 kB on `@bsuite/page-builder` bump | Step A.7b |
| 11 | P1 | Bundle analyser proof for Phase C react-flow lazy-load | Step C.2 |
| 12 | P1 | braden Corporate brand override (`brand="corporate"` prop) | §4 Phase B braden line |
| 13 | P1 | Explicit RLS predicate audit on `user_preferences` writes | Step A.10b |
| 14 | P2 | 375 px viewport per-breakpoint acceptance (≤1 card/row, no overflow) | Step A.8 |
| 15 | P2 | Max 50 widgets per page-key (413 on overflow) | Step A.10c |
| 16 | P2 | Flow node/edge oklch token map before C.3 | Step C.3b |
| 17 | P2 | Undo/redo scope clarified — IN SCOPE this cycle (useUndoRedo hook, depth 50) | Step C.7 |
| 18 | P2 | Per-app conditional smoke at Ship.4 (Sales Pipeline only on crm7) | Step Ship.4 |
| 19 | P2 | Phase 0 scope-widening rule pre-stated (new bypass → separate issue) | Step 0.5 |
| 20 | P2 | Flow serialise/deserialise Zod validation | Step C.3 |

**Red-team verdict**: CONDITIONAL GO → with all amendments now landed in v1.01W, the verdict is
**unconditional GO** for Phase 0 execution.

## 4. Phases

The plan has **6 phases (0 → A → B → C → F → Ship)**. Each phase has its own go-signal gate; the
completeness-agent guards each gate.

Phase F (Universal date-format localisation) was added 2026-05-11 per operator directive — it is
**orthogonal** to A/B/C (canvas + react-flow are unaffected by date rendering) and can ship in
parallel with Phase B or sequentially after Ship. The plan author recommends after-Ship sequencing.

### Phase 0 — Auth-flow isolation: ship crm7#579 standalone

**Goal**: Land the OAuth state-helper test contract (`_shared/oauth-state.ts`) before any other
work, so all subsequent phases run with verified auth coverage.

**Scope (frozen)**: ONLY crm7#579's failing build-and-test step is fixed. No code outside the test
file or the helper-under-test is changed.

**Skills + MCPs**: `security-audit` + `supabase-auth-comprehensive` + `test-driven-development` +
`Context7` (verify `@bsuite/auth@0.2.3` JWKS API) + `Playwright` (smoke login round-trip).

**Sub-agents**: Security Agent (lead), Reliability Agent (race + replay), Red-Team Security
(adversarial bypass attempts), Code-Quality Agent (review).

**Steps**:

| # | Action | Skill | MCP | Output |
|---|---|---|---|---|
| 0.1 | Check out `crm7#579` branch locally; read `_shared/oauth-state.ts` and the test file. | Bash (no skill needed) | — | Local checkout |
| 0.2 | Identify CI failure root cause (lint, type, assertion mismatch). | `feature-dev:code-reviewer` | — | Root-cause note in PR comment |
| 0.3 | Fix the failure; do NOT widen scope. | TDD discipline | — | Fix commit |
| 0.4 | Push; wait for CI green. | `git-workflow` | `claude_ai_github` | Green CI snapshot |
| 0.5 | Red-Team Security: attempt to bypass state validation (replay, expired state, mismatched verifier, stripped state). | `security-audit` | — | Adversarial report. **Scope-widening rule (RT amendment #19)**: if a new bypass is found, file as a separate `crm7#NEW` issue and merge #579 anyway (do not balloon Phase 0). |
| 0.5b | **Cross-app OAuth contract test (RT amendment #8)**: run `pnpm test oauth-contract` in all 5 client apps (crm7, R80.3, braden, throughput, conduit). Each must pass. Confirms the `setSession` bridge per `feedback_oauth_session_bridge.md` is intact across consumers. | `supabase-auth-comprehensive` | — | 5 green test outputs |
| 0.6 | Live-test (Gate B): login flow on `d.crm.crm7.app` using `braden.lang77@gmail.com` + dev password. Capture screenshot + console-clean snapshot. | `chrome-devtools-mcp` | `mcp__plugin_chrome-devtools-mcp_chrome-devtools__*` | Screenshot + snapshot |
| 0.7 | Merge crm7#579 into `development` (squash). Close crm7#567 as `superseded-by #577` (work preserved in #577). | `git-workflow` | `claude_ai_github` | Merged PR URL + closed-with-comment URL |
| 0.end | Completeness-agent runs Phase 0 checklist. | inline | — | Pass/fail report |

**Self-validation loop**: §9.1 output-equivalence — `signInWithBusinessSuite` produces the same
state token shape before/after the fix (test asserts).

**Phase 0 exit criteria**: crm7#579 merged green; crm7#567 closed with link to #577; auth-flow
smoke screenshot in PR; bsuite memory `bsuite_session_20260510a` written.

---

### Phase A — Foundation fix (one combined PR per affected app)

**Goal**: Land the canvas plumbing fix at the source so all ~135 pages that already wrap in
`DraggableCardPage` / `PageGridLayout` get fixed by one change-set.

**Scope (frozen)**:

- `@bsuite/page-builder` bump `^0.2.5` → `^0.2.6` in crm7, conduit, R80.3, throughput (BSU is already 0.2.6).
- `crm7/src/components/platform/DraggableCardPage.tsx` — pass-through `defaultCols={12}`; ensure each `<CanvasCard>` becomes a top-level grid item, not bundled.
- Fix the floating "Edit Page" button across all apps so it dispatches the correct event.
- `crm7/src/pages/reports/index.tsx` — split `card2` into 4 sibling `<CanvasCard>`s (the operator's literal complaint surface).
- `crm7/src/pages/Dashboard.tsx` — verify the floating button now works (was broken too).

**Skills + MCPs**: `dnd-kit` + `shadcn-ui` + `tailwind-css-v4-best-practices` +
`bsuite-brand-system` + `dry-one-shot-architecture` + `vercel-react-best-practices` + `Context7`
(`react-grid-layout@2.2.3`) + `chrome-devtools-mcp` + `Playwright`.

**Sub-agents**: User-Advocate (lead — this is the user-visible fix), Performance Agent (bundle
impact), Brand-Consistency Agent, Code-Quality Agent, Reliability Agent, Red-Team Reliability.

**Steps**:

| # | Action | Skill | MCP | Output |
|---|---|---|---|---|
| A.0 | Gate A (mandatory): Context7 → fetch current `react-grid-layout@2.2.3` API (`dragConfig`/`resizeConfig`/`cols` shape); confirm `@bsuite/page-builder@0.2.6` source matches the consumed API. | `best-practice-research` | `Context7` | Docs cite in PR |
| A.1 | Output-Equivalence (§9.1) baseline: snapshot the saved layouts for Dashboard + Reports + 3 sample wrapped pages under v0.2.1, save to `docs/evidence/20260510-canvas-baseline.json`. | `Explore` | — | Baseline JSON |
| A.2 | TDD: write a failing test for "DraggableCardPage with 4 CanvasCard children produces 4 distinct grid items" + "Edit Page button dispatch produces dragHandleCount>0". | `test-driven-development` | — | Failing test commit |
| A.3 | Bump `@bsuite/page-builder` in 4 consumer `package.json`s. Regenerate each lockfile from outside bsuite tree per CLAUDE.md §Shared Packages rule 7. | `git-workflow` | — | Lockfile diffs |
| A.4 | Fix `DraggableCardPage.tsx` — plumb `defaultCols`, stop bundling, ensure `compactType={null}` is propagated, ensure `<CanvasCard>` siblings become grid items. | TDD passes | — | Fix commit; failing test from A.2 now green |
| A.4b | **Write debounce (RT amendment #6)**: `useScopedPreference` write path is debounced at 500 ms via `useDebouncedCallback`. Verified: counting network requests during a 3-second continuous drag must be ≤2. | `vercel-react-best-practices` | `chrome-devtools-mcp` (`list_network_requests`) | Network-request count snapshot |
| A.4c | **If-Match precondition (RT amendment #2)**: `useScopedPreference` PATCH includes `If-Match: <updated_at>`. On 412 Precondition Failed, surface a "Your layout was updated in another tab — refresh to keep both versions" toast (shadcn `<Toast>` + brand tokens). NO silent overwrites. | `forms-and-validation` + `bsuite-brand-system` | — | Conflict-handling commit |
| A.4d | **Stale-tab edit guard (RT amendment #7)**: entering edit mode re-fetches the server `layoutVersion`. If higher than the tab's loaded version, refuse edit mode and surface a "Page layout updated since you opened — please refresh" toast. | `forms-and-validation` | — | Guard commit |
| A.4e | **Layout-Updated toast (RT amendment #4, undefers Risk row 1)**: when `layoutVersion` bumps server-side and a user has an older saved layout, render a toast on next visit: "Your custom layout was archived because the page was updated. [View archived layout]". The archived layout is stored under `user_preferences.archived_layouts[]` with a 30-day TTL. NOT deferred. | `forms-and-validation` + `supabase-postgres-best-practices` | `Supabase MCP` | Toast + archive logic |
| A.5 | Fix the floating "Edit Page" button (find its render site via Explore — likely a shared `CanvasFloatingActions` component) so it dispatches `crm7-open-page-editor`. | `Explore` + `react-code-fix-linter` | — | Fix commit |
| A.5b | **a11y contract for edit mode (RT amendment #9)**: FAB has accessible name "Edit page layout"; drag handles announce "draggable card, press space to lift, arrow keys to move, space to drop"; resize handles have `aria-label="resize <card-title>"`; Esc exits edit mode; focus returns to the FAB on exit. Verified via `axe-core` + manual keyboard nav. | `vercel-web-design-guidelines` + `chrome-devtools-mcp` (`browser_snapshot`) | `chrome-devtools-mcp` | a11y-pass note + Lighthouse a11y score ≥95 |
| A.6 | Unbundle Reports `card2` into 4 sibling `<CanvasCard>` widgets (cardKeys: `stat-categories`, `stat-apprentices`, `stat-hosts`, `stat-clients`), each `w={3} h={4}`. Update `DEFAULT_LAYOUTS`. Bump `layoutVersion`. | `bsuite-brand-system` (oklch tokens preserved) | — | Reports diff |
| A.7 | Output-Equivalence (§9.1) post: re-snapshot the same 5 pages under v0.2.6 + fixes. Compare. Diff must be empty for the 4 unchanged pages; Reports diff must show 4 distinct grid items where before there was 1. | `verification-before-completion` + `qa-and-verification` | `chrome-devtools-mcp` (`evaluate_script` for layout JSON extraction) | Diff report |
| A.7b | **Bundle-size delta (RT amendment #10)**: capture entry-bundle gzip size pre/post via `vite-bundle-visualizer` (Vite apps) or `next build --analyze` (conduit). Assert delta ≤2 kB for the entry chunk. Reject the PR if exceeded; root-cause the leak. | `vercel-react-best-practices` | `Vercel MCP` (`get_deployment_build_logs`) | Bundle-delta report |
| A.8 | Visual-Equivalence (§9.2): chrome-devtools-mcp screenshots at 375/768/1440 for Dashboard + Reports pre/post on `d.crm.crm7.app`. **Per-breakpoint acceptance (RT amendment #14)**: at 375 px viewport — ≤1 card per row, no horizontal overflow, vertical scroll only; at 768 — 2-col stat row; at 1440 — 4-col stat row. | `chrome-devtools-mcp` | `mcp__plugin_chrome-devtools-mcp_chrome-devtools__*` | Screenshot pairs + per-breakpoint pass note |
| A.9 | Red-Team Reliability: attempt reload-mid-drag, two-tab simultaneous edit, mobile touch-cancel, browser-zoom + drag, oversized layout (1000 widgets). | `systematic-debugging` | Playwright | Adversarial report |
| A.10 | Brand check: grep affected files for new hex/rgb; assert zero. Light + dark mode WCAG-AA contrast on every modified page. **AA = 4.5:1 body / 3:1 large** per breakpoint per mode via Lighthouse contrast audit. | `bsuite-brand-system` | `chrome-devtools-mcp` (`lighthouse_audit`) | Brand-pass note with explicit contrast ratios |
| A.10b | **RLS predicate audit (RT amendment #13)**: RLS-Aware Agent runs an explicit predicate audit on `user_preferences` write paths. Predicate must require both `auth.uid() = user_id` AND `client_id = current_client_id()`. Any preference write without the dual predicate fails the audit. | `supabase-postgres-best-practices` + `security-audit` | `Supabase MCP` (`execute_sql` to read policies) | Predicate-audit report |
| A.10c | **Max widget cap (RT amendment #15)**: server-side enforce ≤50 widgets per page-key per user. PATCH with >50 returns 413 Payload Too Large with a Zod error message. Tested. | `forms-and-validation` | `Supabase MCP` | Cap-test commit |
| A.11 | Auth smoke (mandatory after every phase): Playwright login round-trip on `d.crm.crm7.app`. | `playwright` | `Playwright MCP` | Auth smoke screenshot |
| A.12 | Open one combined PR per app (4 PRs total: crm7, conduit, R80.3, throughput). Body includes `## Evidence` block per FF-SELF-VALIDATION-20260507. | `git-workflow` | `claude_ai_github` | 4 PR URLs |
| A.13 | CI green on all 4; Vercel preview READY on all 4; chrome-devtools snapshot from each preview. | — | `Vercel MCP` | Green snapshot |
| A.14 | Merge into each app's `development` branch (squash). | — | `claude_ai_github` | Merged PR URLs |
| A.15 | Update parent bsuite submodule pointers PR. | — | `claude_ai_github` | Parent PR + merge |
| A.end | Completeness-agent runs Phase A checklist. | inline | — | Pass/fail report |

**Self-validation loop**: §9.1 (output-equivalence on layout JSON) **AND** §9.2 (visual-equivalence
on the 5 canonical pages at 3 breakpoints).

**Phase A exit criteria**: 4 app PRs + 1 parent PR merged green; user-visible bug confirmed fixed
on `d.crm.crm7.app/reports` (4 distinct cards, drag works, resize works, edit-mode toggles via the
button); dashboard JSON updated.

---

### Phase B — Universal rollout, CRM7-first, then all 6 apps

**Goal**: Every page across every app that should be a customisable canvas IS one. Each
"dashboard/reports/analytics/overview/admin/kpi/metrics"-style page wraps in `<DraggableCardPage>`
(or `<PageGridLayout>` directly where the page is the canvas) with proper `defaultCols={12}` and
individual `<CanvasCard>` widgets per visual block.

**Order (mandatory — operator's "CRM7 priority" + "do all 6 because 50th time"):**

```
crm7 → business-suite-unified → conduit → R80.3 → throughput → braden
```

**Phase B sub-split (RT amendment #1 — mandatory)**: Each app's Phase B is itself split into
slices of **≤15 pages per PR** so reviews stay tractable and rollback is per-slice. Slicing
strategy per app:

| App | Estimated slices | Slice criteria |
|---|---|---|
| crm7 (~110 wrapped pages) | B.crm7.1: high-traffic (Dashboard, Reports/*, Analytics, Insights — ~10 pages) → B.crm7.2: HR + People + Field-Officers + Communications (~15 pages) → B.crm7.3: VET + Training + Compliance + WHS (~15 pages) → B.crm7.4: Awards + Quotes + Contracts + Documents (~15 pages) → B.crm7.5: Settings + admin + remaining (~15 pages) → B.crm7.6 verification sweep (catch-all + plugin pages) | ~6 slices |
| BSU (14 wrapped pages) | B.bsu.1: Admin/* (5 pages) → B.bsu.2: Developer/* (4 pages) → B.bsu.3: feature pages CRM7/Documents/Calculator/Analytics/GTO/Government/Billing (~5 pages) | ~3 slices |
| conduit (8 wrapped) | B.conduit.1: candidates + offers + pipeline + jobs (4 pages) → B.conduit.2: analytics + onboarding + interviews + talent-pools (4 pages) | ~2 slices |
| R80.3 (2 wrapped + others to add) | B.r803.1: SettingsPage + R8Calculator + admin sweep | 1 slice |
| throughput (0 wrapped currently) | B.throughput.1: ideas + capture + dashboard + analytics views | 1 slice |
| braden (0 wrapped, admin-only adds) | B.braden.1: admin pages with `<DraggableCardPage brand="corporate">` | 1 slice |

**Total Phase B PRs: ~14 across 6 apps.** Each slice has its own PR, its own CI, its own preview,
its own per-page evidence table. No slice exceeds 15 pages. Multiple slices per app may merge in
parallel once each passes the per-slice completeness-agent gate.

**Per-PR evidence table (RT amendment #3 — completeness-agent rejects without it)**:

Every Phase B PR description MUST contain this table, fully populated, before the
completeness-agent flips the PR to `mergeable`:

```markdown
## Per-page evidence (mandatory — FF-SELF-VALIDATION-20260507 + RT amendment #3)

| Page path | Wrapped? | Grid items count | Drag test | Resize test | Persist test | Brand pass | Screenshot |
|---|---|---|---|---|---|---|---|
| /dashboard | ✅ | 11 | pass | pass | pass | oklch ✓ | [link] |
| /reports | ✅ | 7 (was 5) | pass | pass | pass | oklch ✓ | [link] |
| /reports/deliveries | ✅ | N | pass | pass | pass | oklch ✓ | [link] |
| ... (one row per page in this slice) |
```

A row is "pass" only if chrome-devtools-mcp evidence (DOM inspection + screenshot at 1440 px) is
linked. The completeness-agent reads the table and rejects with `FAIL: incomplete evidence` if
any row has empty cells or N/A without a `Justification:` line below the table.

**Scope per app**:

- **crm7** (~110 pages already wrapped, primarily verification + a handful of unwrapped pages):
  - Verify each wrapped page renders 4+ grid items where the design intends multiple cards.
  - Wrap any remaining unwrapped pages: `analytics/*`, `insights`, any admin overview, any KPI surface, any module home page that shows ≥3 cards.
  - Specifically check the pages the operator has flagged in past sessions (frustration pattern):
    `reports/*` (Phase A fixed primary; verify the deliveries/saved/scheduled sub-pages),
    `dashboard`, `field-officers`, `communications`, `compliance`, any `*/index.tsx` page-home.
- **business-suite-unified** (14 pages wrapped):
  - Each wrapped page already uses `<PageGridLayout>` directly — verify `defaultCols={12}` is set, layoutVersion is sane, each visual block is a separate widget.
- **conduit** (8 pages wrapped, Next.js App Router):
  - `(dashboard)/{candidates,offers,pipeline,analytics,jobs,onboarding,interviews,talent-pools}/_view.tsx` — verify canvas behaviour; ensure server-component → client-component boundary respects the `<DndContext>` requirements (client-only).
  - Wrap any remaining dashboard/admin views.
- **R80.3** (2 pages wrapped):
  - `SettingsPage.tsx` + `R8Calculator.tsx` — verify; wrap any remaining admin pages.
- **throughput** (0 pages wrapped despite dep):
  - Audit ideas-list / capture-stage / dashboard / analytics views; wrap the ones that show multiple cards.
- **braden** (0 pages, no `@bsuite/page-builder` dep):
  - Add `@bsuite/page-builder` to admin pages only (`/admin/*`); leave public marketing pages static. Lock the brand pass — Corporate (Red `#ab233a`, Gold `#cbb26a`) NOT D2C-Neon. **RT amendment #12**: implement a `<DraggableCardPage brand="corporate">` prop OR a theme-context override; the page-builder's default tokens MUST resolve to braden's corporate brand on these pages. No silent D2C bleed.

**Skills + MCPs (per app)**: same as Phase A plus `Multi-App-Sync Agent`'s consistency matrix.

**Steps per app (parallel-dispatch where independent)**:

| # | Action | Skill | MCP | Output |
|---|---|---|---|---|
| B.app.0 | Inventory the app's pages — produce a per-page status table (wrapped / unwrapped / needs-wrap / N/A). | `Explore` | — | Per-app table |
| B.app.1 | TDD: per page, write a "renders N distinct grid items in edit mode" test. | TDD | — | Failing tests |
| B.app.2 | Wrap each `needs-wrap` page; convert top-level cards/panels to `<CanvasCard>` siblings. | `dnd-kit` + `shadcn-ui` + brand skill | — | Wrap commits |
| B.app.3 | Visual-Equivalence (§9.2) per page at 3 breakpoints. | `chrome-devtools-mcp` | Playwright MCP | Screenshot set |
| B.app.4 | Brand check + WCAG audit per page. | `bsuite-brand-system` | Lighthouse via chrome-devtools | Brand-pass per page |
| B.app.5 | Auth smoke for the app on `d.<app>.crm7.app`. | `playwright` | Playwright MCP | Smoke screenshot |
| B.app.6 | Cross-App-Sync matrix: compare this app's canvas behaviour to crm7's; flag any drift. | Multi-App-Sync sub-agent | — | Consistency matrix |
| B.app.7 | Open PR; CI green; preview READY; merge. | `git-workflow` | `claude_ai_github` + Vercel MCP | Merged PR |
| B.app.end | Completeness-agent runs the per-app checklist BEFORE moving to the next app. | inline | — | Pass/fail |

**Mid-phase red-team**: After CRM7 (the highest-volume app) and BEFORE moving to BSU, the
**`multi-agent-red-team-implementation`** skill runs over the crm7 PR to interrogate it
adversarially. Findings either land as follow-up commits on the same PR or as new tracked issues.

**Phase B exit criteria**: All 6 apps have green PRs merged; per-app live-deploy verification on
`d.<app>.crm7.app`; cross-app consistency matrix shows zero drift; dashboard updated; memory
written.

---

### Phase C — React-flow activation (Sales Pipeline only — narrowed per RT amendment #5)

**Goal**: `@xyflow/react@12` stops being dead-loaded. ONE concrete react-flow surface ships this
cycle: the Sales Pipeline visual flow. The other two surfaces (Workflow Builder extension, AI
Flow Designer) move to **separate plans (Phase D / Phase E)** to respect scope discipline.

**In scope for this cycle**:

- **Sales Pipeline visual flow** (`crm7/src/pages/sales/pipeline-flow.tsx` — new). Shows deal
  stages as nodes; deals as cards on each node; drag-to-move-stage; aggregate metrics per node.
  Complements (does not replace) the existing kanban. Greenfield = contained blast radius.

**Moved OUT of scope (tracked as separate plan documents — RT amendment #5)**:

- **Phase D plan (to be authored before execution)**:
  `docs/plans/<future-date>-workflow-builder-react-flow-migration-v1.00W.md` —
  extending `crm7/src/components/workflows/WorkflowBuilder.tsx` to render as `<ReactFlow>`. High
  integration risk (existing consumers, state contract changes); needs its own scope + red-team.
- **Phase E plan (to be authored before execution)**:
  `docs/plans/<future-date>-ai-flow-designer-v1.00W.md` —
  brand-new product surface tied to AI agents (Jodie, Apprentice-Assistant); depends on a
  tool-call schema not yet defined. Out of scope for this cycle by design.

The operator's directive "wire in react flow, it is there for a reason" is honoured: the dep
moves from dead-loaded → actually rendered in production (Sales Pipeline). The other surfaces
remain on the roadmap with explicit follow-up plans rather than being silently shelved.

**Inspiration source**: <https://github.com/GaryOcean428/threaded.git> (fork of
[activepieces/activepieces](https://github.com/activepieces/activepieces) — open-source Zapier
replacement built on react-flow + TypeScript). Patterns to reuse: piece-based node types,
type-safe action/trigger composition, hot-reload during local dev, MCP integration on top of the
flow (every action becomes an MCP server entry).

**Skills + MCPs**: `dnd-kit` (drag between palette and canvas), `tanstack-query` (node data), `Context7` (`@xyflow/react@12` API surface), `bsuite-brand-system` (node + edge colours respect oklch tokens), `vercel-composition-patterns` (custom node API design), `Playwright` (e2e drag-create-edge tests).

**Sub-agents**: User-Advocate (canvas affordances), Performance Agent (lazy-load, no entry-bundle
impact), Code-Quality Agent (custom node API), Reliability Agent (large-graph perf, edge-case
clipping), Red-Team Reliability (1000-node stress, undo/redo, paste/serialize round-trip),
Brand-Consistency Agent.

**Steps**:

| # | Action | Skill | MCP | Output |
|---|---|---|---|---|
| C.0 | Gate A: Context7 → `@xyflow/react@12.x` current API; verify `<ReactFlow>`, `useNodesState`, `useEdgesState`, `MiniMap`, `Controls`, `Background`, custom-node props. | `best-practice-research` | `Context7` | Docs cite |
| C.1 | Fetch threaded.git README + key source files; extract the activepieces piece-framework patterns (action vs trigger nodes, type-safe config). | `Explore` | `WebFetch` + `claude_ai_github` | Pattern note |
| C.2 | Lazy-load setup: `@xyflow/react` imported via React `lazy()` ONLY on the Sales Pipeline route (NEVER in entry). **RT amendment #11**: run `vite-bundle-visualizer` post-build; assert `@xyflow/react` appears ONLY in the `pipeline-flow` chunk. Print chunk-attribution graph in PR. Reject if `@xyflow/react` leaks into the entry chunk. | `vercel-react-best-practices` | Vercel MCP build logs + bundle analyser | Bundle chunk graph |
| C.3 | Sales Pipeline visual flow — schema, default layout, node types (`DealStage`, `Deal`), edge styling. RHF + Zod for node config. **RT amendment #20**: every node config passes Zod validation on serialise/deserialise round-trip; reject malformed inputs at parse time. | `dnd-kit` + `forms-and-validation` | — | New page |
| C.3b | **Node/edge token map (RT amendment #16)**: define explicit oklch token table for flow elements — node fill, node stroke, node selected fill, node hover stroke, edge stroke, edge selected, label text, label background. Reference in `packages/theme/docs/TOKEN-MAPPING.md`. | `bsuite-brand-system` + `design-system` | — | Token-map commit |
| C.6 | Visual-Equivalence (§9.2) + brand check on the Sales Pipeline page. | `chrome-devtools-mcp` + `bsuite-brand-system` | Playwright + Lighthouse | Screenshots |
| C.7 | Red-Team Reliability: 1000-node stress, **undo/redo (RT amendment #17 — IN SCOPE this cycle; implementation pattern: `useUndoRedo` hook over `useNodesState`/`useEdgesState` with stack depth 50)**, copy-paste serialize round-trip, RTL/LTR layout. | `systematic-debugging` | Playwright | Adversarial report |
| C.8 | Auth smoke. | `playwright` | Playwright MCP | Smoke |
| C.9 | Open PR (just one — the Sales Pipeline page). PR has the `## Evidence` block. | `git-workflow` | `claude_ai_github` | PR URL |
| C.10 | CI + preview + merge. | — | Vercel MCP | Merged PR |
| C.end | Completeness-agent runs Phase C checklist. | inline | — | Pass/fail |

**Self-validation loop**: §9.2 visual-equivalence (each new page screenshot pair vs design
intent) + §9.1 output-equivalence (serialise → deserialise a flow; assert identical).

**Phase C exit criteria**: At least the Sales Pipeline flow + Workflow Builder ship to
`development` and verify on `d.crm.crm7.app`; AI Flow Designer either ships or is explicitly
deferred to Phase D in a tracked issue.

---

### Phase F — Universal date-format localisation (Australian default, American opt-in)

**Goal**: Every date rendered in any BSuite app defaults to **`en-AU`** format
(`DD/MM/YYYY` numeric, `D MMMM YYYY` long, `D MMM YYYY` short). Users with American
preference set in BSU master toggle render `en-US` (`MM/DD/YYYY` etc).
No app silently emits American format because of `new Date().toLocaleDateString()`
without an explicit locale.

**Why this phase exists (operator brief, 2026-05-11)**: dates currently appear in
mixed formats across CRM7 + sibling apps. The operator is Australian (WA);
default must be `en-AU`. American format must remain an option (some users + some
external integrations). The current half-finished state — some dates correct,
some American by accident — must end here, not get half-fixed again.

**Scope (frozen)**:

- New package: `packages/dates/` → `@bsuite/dates@0.1.0`. Single source of truth for
  date rendering across all 6 apps. Wraps `Intl.DateTimeFormat` (no moment / dayjs /
  date-fns — native is sufficient). Exports `formatDate`, `formatDateTime`,
  `formatTime`, `formatRelative`, `formatDateRange`, `parseDate`, `parseDateRange`,
  `parseIsoDate`. All take an optional `locale` arg defaulting to the resolved
  user locale; resolution order: explicit arg → `useLocale()` context → user
  preference → app default `en-AU`.
- BSU master preference: extend `user_preferences` with `date_format` enum
  (`'au' | 'us'`), default `'au'`. Settings page (`/settings/locale` in BSU) lets
  the user pick. Propagation: BSU is the only writer; consumer apps read via the
  existing `useScopedPreference` hook with `key='date_format'`, scope=`'global'`
  (cross-app, not per-app — locale is a user-wide preference).
- Locale context provider (`<LocaleProvider>`) ships in `@bsuite/dates` with the
  same React-context shape as `BrandingProvider`. Each app wraps its root with
  `<LocaleProvider supabaseClient={supabase}>` inside `<ThemeProvider>`.
- ESLint rule (extend `@bsuite/dry-lint` or add `@bsuite/no-naked-dates`): error
  on `new Date(...).toLocaleDateString()`, `.toLocaleString()`, `.toString()` for
  date-rendering paths. Allowed: `formatDate(date)` / `formatDateTime(date)` from
  the shared package, OR `Intl.DateTimeFormat(locale, opts)` with an explicit
  non-undefined locale arg sourced from the context. Migration grace: existing
  call-sites flagged as `warn` (not `error`) during Phase F; flip to `error`
  after migration sweep.
- Migration sweep: grep across all 6 apps for `toLocaleDateString`, `toLocaleString`,
  `.toString().slice(...)` patterns over `Date` objects, and direct
  `Intl.DateTimeFormat()` calls without an explicit locale. Convert each to
  `formatDate(...)` or pass an explicit locale.

**Skills + MCPs**: `dry-one-shot-architecture` + `forms-and-validation` (Zod for
preference schema) + `supabase-postgres-best-practices` (migration for
`user_preferences.date_format`) + `cross-platform-sync` (AGENTS.md ≡ CLAUDE.md
amendment) + `Context7` (`Intl.DateTimeFormat` MDN spec confirmation) +
`react-code-fix-linter` (ESLint rule wiring).

**Sub-agents**: Code-Quality Agent (lead — the migration sweep is large and DRY),
User-Advocate (default-AU UX rationale + Settings affordance), Reliability Agent
(timezone + DST handling — Australia spans multiple TZ), Multi-App-Sync Agent
(all 6 apps must adopt the package; no app left on naked Date methods),
Brand-Consistency Agent (date typography is part of the design system).

**Steps**:

| # | Action | Skill | MCP | Output |
|---|---|---|---|---|
| F.0 | Gate A: `Context7` → confirm `Intl.DateTimeFormat` API surface for `en-AU` + `en-US` (`{dateStyle}`, `{day,month,year}`, `formatToParts`). Confirm Node 24 + supported Vercel runtimes both support it. | `best-practice-research` | `Context7` | Docs cite in PR |
| F.1 | Scaffold `packages/dates/` (mirror `packages/charge-calc` structure). `package.json` with `@bsuite/dates@0.1.0` + `tsconfig` + `vitest.config`. Source files: `formatDate.ts`, `parseDate.ts`, `useLocale.ts`, `LocaleProvider.tsx`, `index.ts`. | `dry-one-shot-architecture` | — | New package |
| F.2 | TDD: 20+ vitest cases — `en-AU` numeric / long / short / time / range / relative; `en-US` equivalents; round-trip parse; invalid input returns null; DST boundaries (Apr 1 + Oct 1 in `Australia/Perth`, `Australia/Sydney`); `Intl.DateTimeFormat` parts assertion. | `test-driven-development` | — | Test suite |
| F.3 | Implement `formatDate`, `formatDateTime`, `formatTime`, `formatRelative`, `formatDateRange`, `parseDate`, `parseDateRange`, `parseIsoDate`. Each takes optional `locale` arg defaulting to context. | `dry-one-shot-architecture` | — | Implementation commits |
| F.4 | Implement `<LocaleProvider>` — reads `user_preferences.date_format` via `useScopedPreference` global scope; falls back to `en-AU`. Exposes `useLocale()` hook returning `{ locale, dateFormat, setDateFormat }`. | `forms-and-validation` | `Supabase MCP` | Provider commit |
| F.5 | Supabase migration: add `date_format` column to `user_preferences` (enum `'au'`, `'us'`; default `'au'`). RLS predicate matches existing rows (`auth.uid() = user_id`). | `supabase-postgres-best-practices` | `Supabase MCP` (`apply_migration`) | Migration SQL |
| F.6 | Build + publish `@bsuite/dates@0.1.0` to npm under `@bsuite` org. | `git-workflow` | — | npm publish log |
| F.7 | BSU Settings UI: `/settings/locale` page renders `<RadioGroup>` for `Australian (DD/MM/YYYY)` vs `American (MM/DD/YYYY)`. Saves to `user_preferences.date_format`. Brand: shadcn `<RadioGroup>` + oklch tokens. | `shadcn-ui` + `forms-and-validation` + `bsuite-brand-system` | — | Settings page |
| F.8 | Migration sweep — for each of the 6 apps in parallel: grep for `toLocaleDateString`, `toLocaleString`, `Intl.DateTimeFormat(` (no arg) — replace with `formatDate(...)` from `@bsuite/dates`. Add `<LocaleProvider>` to each app root. | `Explore` + `react-code-fix-linter` | — | Sweep commits per app |
| F.9 | ESLint rule: extend `@bsuite/dry-lint` with `bsuite/no-naked-dates` (warn first, error after sweep). | `react-code-fix-linter` | — | Lint-rule commit |
| F.10 | Visual-Equivalence (§9.2): per-app screenshots before/after for the 5 most-visited date-rendering surfaces (dashboard recent activity, reports table dates, settings audit log, financial invoice dates, communications timestamps). Confirm AU format renders + the BSU toggle flips a user to US format. | `chrome-devtools-mcp` | `mcp__plugin_chrome-devtools-mcp_chrome-devtools__*` | Screenshot set |
| F.11 | Brand check: date typography lines up with shadcn body/caption text scales; no off-pattern naked `<span>` with custom date format. | `bsuite-brand-system` | — | Brand-pass note |
| F.12 | Auth smoke (per phase). | `playwright` | Playwright MCP | Smoke |
| F.13 | Open PR per app (6 PRs total + parent submodule PR). Each PR has `## Evidence` block + counts of files changed in the sweep. | `git-workflow` | `claude_ai_github` | PR URLs |
| F.14 | CI green + preview READY + merge each. | — | Vercel MCP | Merged PRs |
| F.end | Completeness-agent runs Phase F checklist. | inline | — | Pass/fail |

**Self-validation loop**: §9.1 output-equivalence (every legacy date string → `formatDate(...)` produces identical visible output for `en-AU` users; for `en-US` users the visible output flips to American format ONLY where the user has explicitly opted in).

**Phase F exit criteria**:
- `@bsuite/dates@0.1.0` published + adopted by all 6 apps
- Zero remaining naked `.toLocaleDateString()` / `.toLocaleString()` / undefined-locale `Intl.DateTimeFormat` calls in `src/`
- BSU `/settings/locale` page shipped; toggle persists; AU default
- ESLint rule active (`error` post-sweep)
- All 6 production deploys verified showing AU dates by default
- Memory written: `bsuite_session_<YYYYMMDD>f`

**Ordering vs other phases**: Phase F is independent of Phase A/B/C (orthogonal concern). It can ship **in parallel** with Phase B (different code paths) or **after** Phase Ship. Recommend **after Ship**, because the locale-aware date formatter then naturally flows into any new dates added by canvas pages in Phase B + Sales Pipeline node labels in Phase C.

---

### Phase Ship — /ship-all-apps to production

**Goal**: Promote all phase outputs from `development` to `main` across all 6 apps + parent
monorepo, verify production deploys, capture final evidence.

**Skills + MCPs**: `ship-all-apps` (orchestrating skill) + `tandem-dev-main-reconcile` (if any
dev↔main divergence) + `Vercel` MCP + `claude_ai_github` MCP + `chrome-devtools-mcp` (post-deploy
smoke) + `playwright` (auth + canvas + flow smoke).

**Sub-agents**: All standard + Red-Team Security (production auth attack surface) + Red-Team
Reliability (production load patterns).

**Steps**:

| # | Action | Skill | MCP | Output |
|---|---|---|---|---|
| Ship.0 | Pre-flight: confirm every app's `development` is green; no divergence vs `main` other than the merged work; dashboard reflects current state. | `ship-all-apps` Phase 0 | `claude_ai_github` | Pre-flight report |
| Ship.1 | Open promote PRs (`development → main`) for each app + parent. Use `--squash` per project standard. | `ship-all-apps` | `claude_ai_github` | Promote PR URLs |
| Ship.2 | CI green; preview READY; merge each promote PR. | — | Vercel MCP | Merged URLs |
| Ship.3 | Watch production deploys until `readyState=READY` on every app. | — | Vercel MCP `list_deployments` + `get_deployment` | Production URLs |
| Ship.4 | Post-deploy live-test (per-app conditional, RT amendment #18): login + open `/dashboard` + open `/reports` + drag a card + resize a card on EVERY app where those routes exist. Open Sales Pipeline flow + add a node ONLY on `d.crm.crm7.app` (the only app that ships Phase C this cycle). | `playwright` + `chrome-devtools-mcp` | Playwright MCP | Screenshot set per app |
| Ship.5 | Post-deploy auth smoke: BS OAuth round-trip across all 5 client apps + Supabase Native on BSU. | `supabase-auth-comprehensive` | Playwright MCP | Smoke set |
| Ship.6 | Dashboard final update (FF-DASHBOARD-20260508) with all evidence URLs. | `cross-platform-sync` | — | Updated dashboard |
| Ship.7 | Memory write: `bsuite_session_20260510z` (or appropriate letter) — final session summary; `bsuite_sleep_packet_20260510` — sleep packet. | `memory-synapse` | — | Memory keys written |
| Ship.end | Completeness-agent final pass — all phases must be green, all evidence present, all sub-agents have signed off. | inline | — | Final pass/fail |

**Production rollback plan**: each promote PR is independently mergeable; any production deploy
that goes red can be rolled back via Vercel "Promote previous deploy" without affecting siblings.
Branch protection on `main` requires green CI before merge.

---

## 5. Master skills/MCPs distribution audit (master-orchestration §2)

Every numbered step in §4 has a Skill column and an MCP column. No step has `—` in BOTH columns
except trivial Bash invocations. Audit:

```
$ grep -E '^\| [A-Z]\.' docs/plans/20260510-universal-canvas-capability-implementation-v1.00W.md \
    | awk -F'|' 'NF>=5 { if ($4 ~ /^ *— *$/ && $5 ~ /^ *— *$/) print "MISSING:", $2 }'
```

(That grep must return empty before Phase 0 starts.)

---

## 6. Continuous discipline (the things that fail without watchdogs)

### 6.1 Accountability agent (running for every phase)

`run_in_background: true`. Watches for:

- Scope creep (any commit that touches files outside the phase's frozen-scope spec).
- Memory-cross-contamination (any read/write to `qig_*` / `vex_*` / `pantheon_*` from a `bsuite_*` session).
- Dependency downgrades (CLAUDE.md §4 — banned).
- Mocks of the database in tests where integration is required (per `feedback_test_mocks_db_banned` memory pattern).
- Squash-of-sync-merge (memory `feedback_squash_loses_parent_linkage.md`).
- Lockfile generation inside the bsuite tree (CLAUDE.md §Shared Packages rule 7 — must regenerate outside).
- README polish that fails the husky pre-commit due to stale deps — must `pnpm install` from outside the tree first.

Interrupts on hard-rule violation only. Always proposes ≥1 remediation.

### 6.2 Memory protocol (per CLAUDE.md §Persistent Memory)

After every phase exit (0, A, B, C, Ship) AND after every significant commit/decision, write to:

```
PUT https://qig-memory-api.vercel.app/api/memory/bsuite_session_20260510<letter>
PUT https://qig-memory-api.vercel.app/api/memory/bsuite_sleep_packet_20260510   (final only)
```

Categories: `session_summary`, `frozen_facts`, `pending_actions`, `incident` (if anything goes red).
Silo: `bsuite_*` ONLY.

### 6.3 Dashboard protocol (per CLAUDE.md §10 FF-DASHBOARD-20260508)

After every phase exit:

1. Edit `docs/dashboard/data/dashboard-data.json` — bump counters; add an `evidence_url` per shipped item.
2. Run `python3 docs/dashboard/refresh-data.py > docs/dashboard/data/dashboard-data.json` if `plans[]` changes.
3. Run `bash docs/dashboard/inline-data.sh`.
4. Commit with `chore(dashboard): <reason>` (no `[skip ci]` if `index.html` rendering changed).

### 6.4 Cross-platform sync

After Phase B (when consumer apps change pattern), verify:

```
AGENTS.md ≡ CLAUDE.md (per app)
AGENTS.md ≡ copilot-instructions.md (per app)
```

via `cross-platform-sync` skill.

---

## 7. Verification gate index (the unavoidable checks)

| Gate | When | What | If skipped |
|---|---|---|---|
| **Gate A** (Context7 pre-edit) | Before A.0, B.0, C.0 | Fetch current API docs for the library being touched | Hard fail; orchestration is wrong |
| **Gate B** (live-test) | After every UI step | chrome-devtools-mcp / Playwright on `d.<app>.crm7.app` with real login | Hard fail per CLAUDE.md global rule |
| **Gate C** (named-skill) | Every sub-agent dispatch | Use the dedicated skill, not general-purpose | Lower-quality output, audit failure |
| **Gate D** (re-inventory) | Start of every new phase | Re-list available skills + MCPs; cite the list in the response | Drift into general-purpose mode |
| **Gate E** (no retroactive admission) | Always | Never write "Honest answer: I didn't do X" — run the gate first, then write the response | The orchestration is failing |
| **§9.1 Output-Equivalence** | Refactors / migrations | Capture baseline; assert diff is empty/within tolerance | PR is not §17-eligible |
| **§9.2 Visual-Equivalence** | UI changes | Reference + after screenshots at 3 breakpoints | PR is not §17-eligible |
| **§9.3 Self-Report** | Always | Name divergence + ask for input; do not rationalise | Production regression risk |

---

## 8. Definition of done (this entire plan)

This plan flips to `status: A` (Approved → shipped) when:

- [ ] Phase 0 merged + deployed + auth smoke green
- [ ] Phase A merged + deployed + Reports cards 4-distinct + drag + resize + edit-mode toggle all visually confirmed via chrome-devtools-mcp on `d.crm.crm7.app`
- [ ] Phase B merged for all 6 apps + per-app live-deploy verified + cross-app drift matrix shows zero drift
- [ ] Phase C merged with Sales Pipeline flow (Workflow Builder + AI Flow Designer scoped to Phase D + E plans)
- [ ] Phase F merged: `@bsuite/dates@0.1.0` adopted in all 6 apps; BSU `/settings/locale` toggle ships; zero remaining naked `toLocale*` calls; all production deploys verified rendering AU dates by default
- [ ] All production deploys verified READY on Vercel MCP
- [ ] Dashboard JSON reflects every shipped item with `evidence_url`
- [ ] Memory written: `bsuite_session_20260510<letter>` for every phase + `bsuite_sleep_packet_20260510` final
- [ ] AGENTS.md ≡ CLAUDE.md ≡ copilot-instructions.md across all 6 apps + parent
- [ ] No regression in login flow across any app (final Playwright smoke captured)
- [ ] Operator confirms the persistent issue is resolved on their next visit

If ANY of the above is unchecked at the proposed close, the plan reverts to `status: W` and the
operator is informed with a self-report under §9.3 — never rationalised closed.

---

## 9. Out of scope (explicit non-goals for this plan)

- TanStack Router migration across apps (different scope, different cycle; multiple meta-frameworks in play).
- Re-platforming kanban / sortable lists onto PageGridLayout (kanban paradigm ≠ canvas paradigm; correct as-is).
- Re-platforming braden's public marketing pages onto PageGridLayout (corporate brand, static-by-design).
- Mobile-native canvas editing (drag is disabled below `md`; "Customise" link routes to desktop — matches Dashboard precedent).
- Multi-user real-time collaborative editing of canvas layouts (out of scope; flagged as Phase E if requested).
- AI Flow Designer full node library (Phase D — see §4 C.5).

---

## 10. Reference index

- Master orchestration discipline: `~/.claude/skills/master-orchestration/SKILL.md`
- Self-validation FF: `FF-SELF-VALIDATION-20260507` (every app's CLAUDE.md §9)
- Dashboard FF: `FF-DASHBOARD-20260508` (parent CLAUDE.md §10)
- DRY one-shot doctrine: `/home/braden/Desktop/Dev/bsuite/docs/20260227-dry-one-shot-architecture-v1.04A.md`
- D2C theme spec: `/home/braden/Desktop/Dev/bsuite/docs/20260228-d2c-theme-specification-v1.00A.md`
- Auth canonical: `/home/braden/Desktop/Dev/bsuite/AUTH_CANONICAL.md`
- Shared packages rule: parent CLAUDE.md §Shared Packages (especially rule 7 — lockfile gen outside tree)
- Squash-vs-merge memory: `~/.claude/projects/-home-braden-Desktop-Dev-bsuite/memory/feedback_squash_loses_parent_linkage.md`
- Minimal-diff antipattern memory: `~/.claude/projects/-home-braden-Desktop-Dev-bsuite/memory/feedback_minimal_diff_antipattern.md`
- Universal canvas memory: `~/.claude/projects/-home-braden-Desktop-Dev-bsuite/memory/project_universal_canvas_status.md`
- React-flow inspiration: <https://github.com/GaryOcean428/threaded.git> (fork of activepieces)

---

*Plan author: claude-code (opus-4-7-1M). Authored 2026-05-10. Operator approvals captured: Phase A starts now / react-flow wire / crm7#579 isolated. Plan-red-team checkpoint pending operator sign-off before execution begins.*
