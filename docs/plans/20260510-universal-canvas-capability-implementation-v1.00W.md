---
title: Universal Canvas Capability Implementation Plan
date: 2026-05-10
status: W (Working — not yet executed)
version: 1.00W
authors: [claude-code (opus-4-7-1M), operator]
scope: cross-cutting / all 6 BSuite apps
tier: Heavy (multi-app, persistent bug, production blast radius)
master_orchestration: required
self_validation: FF-SELF-VALIDATION-20260507 (§9 of each app CLAUDE.md applies)
dashboard_protocol: FF-DASHBOARD-20260508 (§10 of parent CLAUDE.md applies — update after every phase)
---

# Universal Canvas Capability — Implementation Plan v1.00W

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
| `dispatching-parallel-agents` + `subagent-driven-development` | Parallel agent execution | B.* per-app parallelisation |
| `dnd-kit` | DnD-Kit patterns | B.* DnD primitives, C.* node drag |
| `tanstack-query` + `tanstack-table` + `tanstack-router` | TanStack family | B.* data layer, optional Router migration (out-of-scope this cycle) |
| `shadcn-ui` + `tailwind-css-v4-best-practices` + `vercel-react-best-practices` | UI primitives | Every UI step |
| `bsuite-brand-system` | Brand enforcement (oklch tokens, D2C-Neon for 5 apps; Corporate for braden) | Every UI step |
| `dry-one-shot-architecture` | DRY enforcement — entity-ownership, no app-local mirror tables | Every step |
| `forms-and-validation` | RHF + Zod patterns | A.4 (Reports control), C.* (flow-node config) |
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
| Canvas fix breaks an existing saved layout for production tenants | High | Bump `layoutVersion` on each touched page; provide a localStorage backup of the old layout before invalidation; ship a one-time "Layout updated — your old custom layout has been archived" toast linked to a restore action (deferred to Phase D if needed). |
| `@bsuite/page-builder@0.2.6` has an undiscovered regression vs 0.2.1 | Medium | Phase A.0 runs the Output-Equivalence loop (§9.1) on a frozen test layout set BEFORE any consumer bump. If diff is non-empty, fix the package first, republish, then bump consumers. |
| React-flow bundle adds significant kB to initial entry | Medium | Phase C lazy-loads react-flow per-route (next dynamic import / React `lazy`); never imported in the entry bundle. Performance Agent verifies via Vercel MCP build logs. |
| Auth flow regression (the operator's explicit "don't break login" constraint) | High | Phase 0 (isolated) lands the OAuth-state-helper test pin first; every subsequent phase exit re-runs the auth-flow smoke (Playwright login on `d.<app>.crm7.app`). Canvas + auth are disjoint modules per the inventory — risk is verification, not architecture. |
| Cross-app drift returns (the recurring frustration) | High | Multi-App-Sync Agent runs in every phase exit; the consistency check produces a single matrix in the PR description showing version pins, primitive choice, persistence key naming across all 6 apps. No PR ships with drift. |
| Operator's "50th time" frustration recurs because some app gets skipped | Critical | Phase B walks all 6 apps in fixed order with a per-app go/no-go gate; the completeness-agent refuses to mark Phase B done until every app has a green PR + green deploy. |
| Squash-merge erases parent linkage (memory `feedback_squash_loses_parent_linkage.md`) | Medium | Use `--merge` (not `--squash`) on any sync-conflict PRs. Promote PRs use `--squash` as standard. |
| Vercel build pulls stale lockfile (CLAUDE.md §Shared Packages rule 7) | Medium | Every `pnpm install` for lockfile regen runs OUTSIDE the bsuite tree per the doc'd recipe. |

---

## 4. Phases

The plan has 5 phases (0 → A → B → C → Ship). Each phase has its own go-signal gate; the
completeness-agent guards each gate.

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
| 0.5 | Red-Team Security: attempt to bypass state validation (replay, expired state, mismatched verifier, stripped state). | `security-audit` | — | Adversarial report; any new tests added if a hole found |
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
| A.5 | Fix the floating "Edit Page" button (find its render site via Explore — likely a shared `CanvasFloatingActions` component) so it dispatches `crm7-open-page-editor`. | `Explore` + `react-code-fix-linter` | — | Fix commit |
| A.6 | Unbundle Reports `card2` into 4 sibling `<CanvasCard cardKey="stat-categories|apprentices|hosts|clients" w={3} h={4}>`. Update `DEFAULT_LAYOUTS`. Bump `layoutVersion`. | `bsuite-brand-system` (oklch tokens preserved) | — | Reports diff |
| A.7 | Output-Equivalence (§9.1) post: re-snapshot the same 5 pages under v0.2.6 + fixes. Compare. Diff must be empty for the 4 unchanged pages; Reports diff must show 4 distinct grid items where before there was 1. | `verification-before-completion` + `qa-and-verification` | `chrome-devtools-mcp` (`evaluate_script` for layout JSON extraction) | Diff report |
| A.8 | Visual-Equivalence (§9.2): chrome-devtools-mcp screenshots at 375/768/1440 for Dashboard + Reports pre/post on `d.crm.crm7.app`. | `chrome-devtools-mcp` | `mcp__plugin_chrome-devtools-mcp_chrome-devtools__*` | Screenshot pairs |
| A.9 | Red-Team Reliability: attempt reload-mid-drag, two-tab simultaneous edit, mobile touch-cancel, browser-zoom + drag, oversized layout (1000 widgets). | `systematic-debugging` | Playwright | Adversarial report |
| A.10 | Brand check: grep affected files for new hex/rgb; assert zero. Light + dark mode WCAG-AA contrast on every modified page. | `bsuite-brand-system` | `chrome-devtools-mcp` `lighthouse_audit` | Brand-pass note |
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
  - Decision required: is braden a canvas-needing app? It's a corporate website + small admin. Recommendation: add `@bsuite/page-builder` to admin pages only (`/admin/*`); leave the public marketing pages static. Lock the brand pass — Corporate (Red `#ab233a`, Gold `#cbb26a`) NOT D2C-Neon.

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

### Phase C — React-flow activation, inspired by threaded.git

**Goal**: `@xyflow/react@12` stops being dead-loaded. Three concrete react-flow surfaces ship,
each in its appropriate app:

1. **Sales Pipeline visual flow** (`crm7/src/pages/sales/pipeline-flow.tsx` — new). Shows the
   deal stages as nodes; deals as edge-cards; drag-to-move-stage; aggregate metrics per node.
   Complements (does not replace) the existing kanban.
2. **Workflow Builder** (`crm7/src/components/workflows/WorkflowBuilder.tsx` — extend). The
   existing step-reorder UI graduates to a full flow editor. Inspired by threaded.git's
   activepieces fork — node types, custom node UI, edge labels.
3. **AI Flow Designer** (`crm7/src/pages/ai/flow-designer.tsx` — new, optional this cycle). For
   the AI agents (Jodie, Apprentice-Assistant) — visual flow of tool-call sequences. Out-of-scope
   if Phase A+B+C-1+C-2 alone fill the cycle; flagged as Phase D.

**Inspiration source**: <https://github.com/GaryOcean428/threaded.git> (fork of
[activepieces/activepieces](https://github.com/activepieces/activepieces) — open-source Zapier
replacement built on react-flow + TypeScript). Patterns to reuse: piece-based node types,
type-safe action/trigger composition, hot-reload during local dev, MCP integration on top of the
flow (every action becomes an MCP server entry).

**Skills + MCPs**: `dnd-kit` (drag between palette and canvas) + `tanstack-query` (node data) +
`Context7` (`@xyflow/react@12` API surface) + `vercel-ai-sdk` (for AI Flow Designer if scoped in)
+ `bsuite-brand-system` (node + edge colours respect oklch tokens) +
`vercel-composition-patterns` (custom node API design) + `Playwright` (e2e drag-create-edge tests).

**Sub-agents**: User-Advocate (canvas affordances), Performance Agent (lazy-load, no entry-bundle
impact), Code-Quality Agent (custom node API), Reliability Agent (large-graph perf, edge-case
clipping), Red-Team Reliability (1000-node stress, undo/redo, paste/serialize round-trip),
Brand-Consistency Agent.

**Steps**:

| # | Action | Skill | MCP | Output |
|---|---|---|---|---|
| C.0 | Gate A: Context7 → `@xyflow/react@12.x` current API; verify `<ReactFlow>`, `useNodesState`, `useEdgesState`, `MiniMap`, `Controls`, `Background`, custom-node props. | `best-practice-research` | `Context7` | Docs cite |
| C.1 | Fetch threaded.git README + key source files; extract the activepieces piece-framework patterns (action vs trigger nodes, type-safe config). | `Explore` | `WebFetch` + `claude_ai_github` | Pattern note |
| C.2 | Lazy-load setup: `@xyflow/react` is imported via React `lazy()` per route (NEVER in entry). Performance Agent verifies bundle stays the same size for routes that don't render flows. | `vercel-react-best-practices` | Vercel MCP build logs | Bundle diff |
| C.3 | Sales Pipeline visual flow — schema, default layout, node types (`DealStage`, `Deal`), edge styling. RHF + Zod for node config. | `dnd-kit` + `forms-and-validation` | — | New page |
| C.4 | Workflow Builder — extend existing component to render as `<ReactFlow>` + palette panel. Migration: existing step-arrays become nodes with sequential edges (default linear). | TDD | — | Extended component |
| C.5 | (Optional) AI Flow Designer — basic node palette for tool calls. Scope-cap: ship the canvas + a single node type; full library is Phase D. | `vercel-ai-sdk` | — | New page (if scope allows) |
| C.6 | Visual-Equivalence (§9.2) + brand check on every new page. | `chrome-devtools-mcp` + `bsuite-brand-system` | Playwright + Lighthouse | Screenshots |
| C.7 | Red-Team Reliability: 1000-node stress, undo/redo, copy-paste serialize round-trip, RTL/LTR layout. | `systematic-debugging` | Playwright | Adversarial report |
| C.8 | Auth smoke. | `playwright` | Playwright MCP | Smoke |
| C.9 | Open PRs (one per page, so blast-radius is contained). Each PR has the `## Evidence` block. | `git-workflow` | `claude_ai_github` | PR URLs |
| C.10 | CI + preview + merge each in turn. | — | Vercel MCP | Merged PRs |
| C.end | Completeness-agent runs Phase C checklist. | inline | — | Pass/fail |

**Self-validation loop**: §9.2 visual-equivalence (each new page screenshot pair vs design
intent) + §9.1 output-equivalence (serialise → deserialise a flow; assert identical).

**Phase C exit criteria**: At least the Sales Pipeline flow + Workflow Builder ship to
`development` and verify on `d.crm.crm7.app`; AI Flow Designer either ships or is explicitly
deferred to Phase D in a tracked issue.

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
| Ship.4 | Post-deploy live-test: login + open `/dashboard` + open `/reports` + drag a card + resize a card + open Sales Pipeline flow + add a node — on EVERY app. | `playwright` + `chrome-devtools-mcp` | Playwright MCP | Screenshot set |
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
- [ ] Phase C merged with at least Sales Pipeline flow + Workflow Builder; AI Flow Designer either shipped or tracked as Phase D issue
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
- DRY one-shot doctrine: `/home/braden/Desktop/Dev/bsuite/docs/20260227-dry-one-shot-architecture-v1.01A.md`
- D2C theme spec: `/home/braden/Desktop/Dev/bsuite/docs/20260228-d2c-theme-specification-v1.00A.md`
- Auth canonical: `/home/braden/Desktop/Dev/bsuite/AUTH_CANONICAL.md`
- Shared packages rule: parent CLAUDE.md §Shared Packages (especially rule 7 — lockfile gen outside tree)
- Squash-vs-merge memory: `~/.claude/projects/-home-braden-Desktop-Dev-bsuite/memory/feedback_squash_loses_parent_linkage.md`
- Minimal-diff antipattern memory: `~/.claude/projects/-home-braden-Desktop-Dev-bsuite/memory/feedback_minimal_diff_antipattern.md`
- Universal canvas memory: `~/.claude/projects/-home-braden-Desktop-Dev-bsuite/memory/project_universal_canvas_status.md`
- React-flow inspiration: <https://github.com/GaryOcean428/threaded.git> (fork of activepieces)

---

*Plan author: claude-code (opus-4-7-1M). Authored 2026-05-10. Operator approvals captured: Phase A starts now / react-flow wire / crm7#579 isolated. Plan-red-team checkpoint pending operator sign-off before execution begins.*
