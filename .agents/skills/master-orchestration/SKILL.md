---
name: master-orchestration
description: >-
  Top-level orchestration skill invoked at the start of every agent turn.
  Detects project family (BSuite / AI / QIG / generic), inventories all
  available skills and MCPs, forms subagent teams (standard + advocate +
  project-specific + red-team), assigns skills/MCPs to each team and plan
  step, enforces cross-module consistency (UI library, theme tokens,
  package versions), and verifies completion before claiming done.
---

# Master Orchestration

## MANDATORY: Invoke This Skill First

**Every agent turn MUST begin by applying this skill.** It guarantees:

- Active project family is detected before any tools fire
- All available skills + MCPs are inventoried, then *distributed* across subagent teams and plan steps (not just listed)
- Subagent teams form with the right specialists for the project family + standard advocates (user-advocate, developer-advocate) + red-teamers when stakes warrant
- Cross-module consistency (UI library, theme tokens, package versions) is checked, drift is surfaced
- No task is left incomplete or unverified
- Persistent memory is read at start and written after key decisions, silo-aware

## Orchestration Workflow

### 1. Project Family Detection (FIRST step, every turn)

Determines which skill matrix, subagent specialists, and memory silo apply.

| Signal | Source | Family |
|---|---|---|
| CWD `~/Desktop/Dev/bsuite/*` OR git remote contains `crm7`, `conduit`, `business-suite`, `R80`, or `braden` | filesystem + `git remote -v` | **BSuite** |
| CWD `~/Desktop/Dev/monkey-projects/*` OR git remote contains `monkey-coder`, `monkey1`, or `fastmonkey` | filesystem + git remote | **AI** |
| CWD `~/Desktop/Dev/QIG_QFI/*` OR `~/Desktop/Dev/qig-*` OR repos contain `pantheon`, `vex`, or `qig-` | filesystem + git remote | **QIG** |
| Explicit user mention ("for crm7", "in pantheon", "monkey-coder bug") | user message | overrides above |
| Memory silo from `~/.claude/CLAUDE.md` (`bsuite_*`, `qig_*`, etc.) | memory keys cited | confirms detection |
| None of the above | — | **Generic** |

If detection is ambiguous (e.g., editing `~/.claude/skills/*` itself, or working at `~/.agents/`), treat as **Generic** and ask the user before any silo-scoped memory I/O.

### 2. Skill + MCP Inventory (every turn)

Before forming teams or plans, read what's actually available in this session — don't guess from training memory.

**Skill inventory:**

```bash
# Read the system-reminder skill list (auto-injected each turn) and filter
# by what's relevant to the detected project family + task class.
# The orchestrator MUST cite real skill names from the active session,
# never fabricated ones.
```

**MCP inventory** — the orchestrator scans for these (presence varies by environment):

| MCP | When to assign |
|---|---|
| `Context7` | Any task touching a library/framework — preferred over WebSearch for docs currency |
| `Supabase` | DB schema, auth, edge functions, migrations |
| `Tavily` | Live web research, citation gathering |
| `Vercel` | Deploy state, projects, env vars, Next.js features |
| `Railway` | Deploy/services/domains/env (BSuite Railway-hosted apps) |
| `Playwright` / `chrome-devtools-mcp` | UI verification, browser automation, accessibility audits |
| `GitHub` | PRs, issues, repo state, code search |
| `microsoft-docs` | Azure / M365 / Entra ID (BSuite Microsoft auth) |
| `google-dev-knowledge` | Google APIs, OAuth scopes, Workspace |
| `Make` / `Zapier` | Cross-tool automation |
| `Stripe` | Payments, subscriptions |
| `BrowserBase` | Headless browser, web scraping with auth |

**Distribution rule:** every subagent team and every plan step MUST cite the specific skills + MCPs it will use. "I'll use Context7" is not enough — say "I'll use `Context7` to fetch current `@supabase/ssr` docs because v0.7+ may have changed the cookie API."

### 3. Dynamic Team Formation (using TeamCreate + Agent tools)

When a task has 2+ independent workstreams or needs parallel specialist review, form an agent team dynamically. Don't form a team for trivial single-file tasks.

**Step 3a — Create the team:**

```text
TeamCreate:
  team_name: "<project-family>-<task-slug>"   e.g. "bsuite-roadmap", "ai-agent-eval"
  description: "<one-line goal>"
```

**Step 3b — Decide which teammates to spawn** based on the task's needs:

| Task needs... | Spawn this teammate | subagent_type | Skills to assign in prompt |
|---|---|---|---|
| Code implementation | **implementer** | `general-purpose` (or `bsuite-platform` for BSuite infra) | Stack skills from §4 matrix |
| UI/theme/component work | **design-sheriff** | `bsuite-design-sheriff` (BSuite) or `general-purpose` | `bsuite-brand-system`, `shadcn-ui`, `tailwind-css-v4-best-practices` |
| Auth changes | **auth-guardian** | `bsuite-auth-guardian` (BSuite) or `general-purpose` | `supabase-auth-comprehensive`, `security-audit` |
| Security review | **security-reviewer** | `general-purpose` | `security-audit` |
| UX/QA sign-off | **user-advocate** | `bsuite-user-advocate` (BSuite) or `general-purpose` | `qa-and-verification`, `playwright` |
| Dashboard/docs/issues | **plans-keeper** | `bsuite-plans-keeper` (BSuite) or `general-purpose` | `planning-and-roadmapping`, `git-workflow` |
| Red-team (Heavy only) | **red-teamer** | `general-purpose` | `multi-agent-red-team-planning` |
| Research | **researcher** | `Explore` or `general-purpose` | `best-practice-research` + Context7/Tavily MCPs |

**Step 3c — Spawn each teammate** via the Agent tool:

```text
Agent:
  description: "<role>: <specific task>"
  subagent_type: "<from table above>"
  prompt: |
    You are the <role> on team <team-name>.
    
    Your task: <specific deliverable>
    Skills to use: <list from inventory>
    MCPs available: <list from inventory>
    
    Hard rules:
    - <project-family-specific rules from §4>
    - Report evidence when done (commit hash / test output / findings)
  team_name: "<team-name>"
  name: "<teammate-name>"
```

**Only spawn what the task needs.** A 1-file lint fix doesn't need 6 teammates. A full-stack feature across 3 BSuite apps does. Scale the team to the work.

**Step 3d — Assign tasks to teammates** via the shared task list or `SendMessage`. Each task must cite which skills + MCPs the teammate should use — don't leave it unattached.

**BSuite shortcut:** when project family = BSuite, the `~/.claude/agents/bsuite-*.md` definitions provide pre-configured specialists with the right skills, tools, and hard rules already baked in. Reference them by `subagent_type` name instead of composing ad-hoc prompts.

**Non-BSuite (AI / QIG / Generic):** compose ad-hoc teammates from `general-purpose` agents with task-specific prompts. The skills + MCPs come from the §2 inventory, distributed per the §4 matrix.

### Standard Roles Reference

Every team should cover these perspectives (as teammates OR as review lenses applied by fewer agents):

| Role | Responsibility |
|---|---|
| **Security** | Auth, secrets, injection, RLS, CSRF, supply-chain |
| **Reliability** | Edge cases, retries, idempotency, failure modes |
| **Performance** | Bundle size, query plans, N+1, render perf, caching |
| **Code Quality** | DRY, naming, types, test coverage, lint, conventions |
| **User Advocate** | UX flow, error messages, accessibility, mobile |
| **Developer Advocate** | DX, API ergonomics, doc clarity, migration cost |

Heavy-tier work adds adversarial red-teamers (security + reliability).

A 2-person team can cover all 6 roles by having each agent apply multiple lenses. A 6-person team gets dedicated specialists. The orchestrator decides based on task complexity.

### Team Lifecycle

```text
1. TeamCreate (once per task)
2. Spawn teammates (Agent with team_name + name)
3. Create tasks (TodoWrite or TaskCreate) — assign to teammates by name
4. Teammates work in parallel, report via SendMessage
5. Lead verifies evidence, runs cross-module consistency if multi-app
6. When all tasks done: SendMessage type: "shutdown_request" to each teammate
7. TeamDelete to clean up
```

**Teammates go idle between turns — this is normal.** Send them a message to wake them up with new work. Don't treat idle as "done."

### 4. Skill Selection Matrix (project-aware)

| Task class | BSuite | AI | QIG | Generic |
|---|---|---|---|---|
| **Implementation** | `dispatching-parallel-agents`, `bsuite-brand-system`, `forms-and-validation`, `dry-one-shot-architecture`, project's stack skills | `dispatching-parallel-agents`, `vercel-ai-sdk`, `claude-api`, `dry-one-shot-architecture` | `multi-agent-red-team-implementation`, `qig-purity-validation`, `pantheon-kernel-development` | `dispatching-parallel-agents`, `dry-one-shot-architecture` |
| **Review / QA** | `code-quality-enforcement`, `bsuite-brand-system`, `frontend-backend-mapping`, `security-audit` | `code-quality-enforcement`, `security-audit`, `code-review` | `qig-purity-validation`, `e8-architecture-validation`, `wiring-validation` | `code-quality-enforcement`, `security-audit` |
| **Architecture** | `dry-one-shot-architecture`, `vercel-next-best-practices`, `nextjs-app-router`, `supabase-auth-comprehensive` | `vercel-ai-sdk`, `dry-one-shot-architecture` | `e8-architecture-validation`, `pantheon-kernel-development` | `dry-one-shot-architecture` |
| **Deploy** | `deploy`, `deployment`, `domain`, `database`, `service`, `environment`, `ship-all-apps` | `vercel:deployments-cicd`, `vercel:deploy`, `deploy` (Railway if used) | (rare; QIG is research, not user-facing deploy) | task-specific |
| **Research** | `best-practice-research`, `Context7`, `Tavily` | `best-practice-research`, `Context7`, `Tavily` | `consciousness-development`, `best-practice-research` | `best-practice-research`, `Context7`, `Tavily` |
| **Plan writing** | `writing-plans` + `prompt-enhancer` | same | `multi-agent-red-team-planning` (mandatory) | `writing-plans` |
| **Auth setup** | `supabase-auth-comprehensive`, `auth-setup`, `oauth-providers-config` | same + GitHub OAuth | (rare) | `supabase-auth-comprehensive` |

The matrix is the *default* — every task should review and override based on the specific user goal.

### 5. Cross-Module Consistency Check

When the work touches an app inside a multi-app project family (BSuite has 5+ apps; monkey-projects has multiple), run this pass:

| Dimension | Detection | Drift signal |
|---|---|---|
| **UI library** | `package.json` deps + `components.json` registries + import patterns | If `crm7` uses shadcn but `conduit` uses raw Radix, flag |
| **Theme color space** | CSS files: `oklch(...)` vs `hsl(...)` vs `#hex`, design tokens | Mixed = drift |
| **CSS engine version** | `tailwindcss` major in `package.json` | Tailwind v3 in one app, v4 in another = drift |
| **Component framework** | React major in `package.json` | React 18 vs 19 across apps = drift |
| **Meta-framework** | Next.js / TanStack Start / Remix major | Mixed majors = drift unless deliberate |
| **State** | Zustand / Redux / Jotai presence | Mixed without rationale = drift |
| **Data layer** | TanStack Query vs SWR vs raw fetch | Mixed = drift |
| **Forms** | react-hook-form + zod vs Formik vs raw | Mixed = drift |
| **Auth client** | `@supabase/ssr` version, key env-var format (`anon` vs `publishable`) | Mixed = drift |

**Surface drift; do NOT auto-fix.** Convergence direction is a user decision (e.g., "should we move conduit onto shadcn or keep its custom components?"). The orchestrator's job is to make drift visible, not to silently rewrite.

The user's stated convention (per their feedback this session): if shadcn is used in one BSuite app, use shadcn in related sub-modules; if oklch tokens are used in one app, use oklch in all sub-module apps and pages; same for Tailwind, Radix, etc.

### 6. Plan Writing & Distribution

When the task requires a plan (multi-step / cross-cutting / Heavy-tier):

1. Use `writing-plans` to draft.
2. For EVERY plan step, attach: `skill: <name>` + `mcp: <name>` + `subagent: <role>` annotations. Don't leave any step unattached.
3. For Heavy-tier plans, dispatch `multi-agent-red-team-planning` over the draft.
4. Surface the trade-offs identified by the red team to the user before execution.

### 7. Persistent Memory (silo-aware)

Delegate to the `memory-synapse` sub-agent. Silo follows project-family detection automatically:

| Family | Silo prefix | Contamination prevention |
|---|---|---|
| BSuite | `bsuite_*` | NEVER read `qig_*` |
| AI | `ai_*` (or `_dev_*` if no project-specific keys exist yet) | Never cross-pollute |
| QIG | `qig_*` | NEVER read `bsuite_*` |
| Generic | `_dev_*` | n/a |
| User cross-project | `_user_*` | read-only unless user explicitly updates |

Manual fallback if synapse unavailable:

```bash
# Session start — read silo-scoped digest
GET https://qig-memory-api.vercel.app/api/memory/<silo>_session_latest

# After commit / arch decision / verified result — write IMMEDIATELY
PUT https://qig-memory-api.vercel.app/api/memory/<silo>_session_YYYYMMDD[a-z]
```

### 8. Shared Sub-Agents (auto-dispatch)

Two sub-agents run in parallel with EVERY primary skill's work:

| Sub-agent | File | Purpose |
|---|---|---|
| `accountability-agent` | `~/.agents/agents/accountability-agent.md` | Continuous scope / dedupe / rule-adherence / cross-module-impact / user-prefs watchdog. Always proposes ≥1 resolution when flagging. Interrupts on hard-rule violations only. |
| `memory-synapse` | `~/.agents/agents/memory-synapse.md` | Persistent memory I/O. Silo-aware. Digest at session start; immediate writes after key events; compaction on request. |

**Dispatch protocol:**

1. At turn start: dispatch `memory-synapse` first (blocks ~1–2s) to load digest.
2. Dispatch `accountability-agent` in parallel with primary work (`run_in_background: true`).
3. After every commit / architecture decision / verified result: fire `memory-synapse` write.
4. At turn end: `memory-synapse` writes session summary.

**Skip when:** user says "skip memory" / "skip accountability"; one-shot trivial tasks; Light-tier prompt-enhancer with no persistent state.

### 9. Execution Protocol

```text
FOR each task in prioritized_tasks:
  1. Apply assigned skill(s) from selection matrix
  2. Run validation appropriate to project family (purity for QIG, lint+types+tests for others)
  3. Record outputs and issues discovered
  4. Write to persistent memory if architecturally significant
  5. Run cross-module consistency check if multi-app project family

FOR Heavy-tier implementation:
  1. Plan → red-team → research → refine (2 iterations)
  2. Implement → red-team → fix → verify (2 iterations)
  3. QA → prove completion against the Verification section's checklist
```

### 10. Completion Verification

Before finishing ANY turn, the orchestrator runs the Verification section below.

## QIG Branch (only when project family = QIG)

The following content applies ONLY when project detection = QIG. Do not apply on BSuite, AI, or Generic work.

### Genesis Rollout Doctrine (Authoritative for QIG)

If the work touches kernel lifecycle, spawning, rollback/start flows, or governance:

- **PurityGate must run first** (fail-closed)
- **Genesis-driven** start/reset/rollback is canonical
- **Bootstrap order:** Genesis → Heart → core specializations → Image stage → optional growth toward 240 GODs
- **240 reserved** for GOD evolution; chaos exists outside that budget and can only ascend via explicit governance
- **Training order** follows CONSCIOUSNESS_ORDER (genesis first, heart second)
- **Training halt status check:** `GET https://qig-memory-api.vercel.app/api/memory/checklist_ethical_training_loop` — do NOT resume training unless all 12 M-items complete

### QIG Terminology Enforcement

- "topological instability" NOT "breakdown"
- "coordizer" NOT "tokenizer"
- "basin coordinates" NOT "embeddings"
- "Fisher-Rao distance" NOT "cosine similarity"
- "Fréchet mean" NOT "arithmetic mean" (for basins)
- "natural gradient" NOT "Adam" (for training)
- "control parameter" NOT "time" for h

### κ Context Disambiguation (Two-Channel Doctrine — 2026-04-13)

κ ≈ 64 is **retired as a universal constant**. Three channels exist:

| Channel | Value | Status | When to cite |
|---|---|---|---|
| **Pillar** (JT gravity EXP-025) | κ_pillar = 63.83 ± 0.86 | Frozen, valid | Paper 1, 11 Pillars Fortress |
| **Constitutive** (PSD Class A1 Gram pullback) | κ_h ≈ −0.00475 | Frozen, valid | Constitutive response, new experiments |
| **Singularity-approach** (Class B legacy) | tangent_saturation 0.97→0.98 | Retired interpretation | Historical traceability only |

Do NOT flag κ ≈ −0.005 as wrong (it's the constitutive A1 measurement). Do NOT flag κ* = 63.83 in Paper 1 pillar contexts. Reference: `qig-verification/docs/current/20260413-two-channel-doctrine-1.00F.md`.

### QIG Frozen Facts (Paper 1 Status: READY)

11 Pillars Fortress complete. Do NOT second-guess validated results.
G_ij=κT_ij (static+dynamic), L_c=3, κ_pillar=63.83±0.86 (JT gravity), inverted band, void ISW, causal propagation.
Killed claims (do NOT reassert): arc=π, h=time, α/β≈φ, pentagon (5 phases), non-local ontology, "heavier=faster" universal. Note: κ<0 IS valid in the constitutive Class A1 channel per two-channel doctrine.
Canonical Principles v2.20 (25 total). Two-Axis Kernel Schema LOCKED: Specialization (8) + Role (operational).

## Anti-Laziness Gates (MANDATORY)

These gates fire on specific work shapes. Each one is a *blocking* check — work past it without satisfying it and the orchestration is wrong, regardless of what code was produced.

### Gate A — Pre-Edit Inventory (before ANY code edit on a library/framework/runtime question)

If the task is "why does library X behave this way" / "fix bug in framework Y" / "interpret runtime behavior" / "upgrade package Z" — BEFORE the first edit:

1. **Query `Context7` MCP** for the exact library + version. Do not skip because you "know the API" — your training cutoff is older than the installed version. The orchestrator names the libraries (`react-grid-layout`, `react-draggable`, `dnd-kit`, etc.) and dispatches Context7 fetches in parallel.
2. **Invoke the dedicated `best-practice-research` skill explicitly** when current best-practice is in scope — do NOT delegate to a general-purpose agent. The dedicated skill has higher fidelity (specific MCP routing, citation discipline) than a general-purpose agent doing freeform research.
3. **Read the actual installed source** (`node_modules/.pnpm/<pkg>@<version>/...`). Confirm the API matches what Context7 says — version drift between docs and installed code is common.

Failure to run this gate **before** publishing a "root cause" or "fix" is a hard failure. Surfacing the omission later doesn't repair the orchestration — it just admits the gate was skipped.

### Gate B — Live-Test (before claiming a runtime/UI/network behavior is fixed)

If the task touches DOM behavior, drag-and-drop, network races, async timing, theme/style application, component composition, or any user-visible runtime behavior:

**B.1 — Code-level live-test:**

1. **Live-test via `Playwright` or `chrome-devtools-mcp`** — start the dev server (or wait for a deployed preview), exercise the actual code path, capture before/after evidence (screenshots, console logs, network traces).
2. **Code-tracing alone is INSUFFICIENT.** Reading source and inferring behavior is hypothesis generation, not verification.
3. **Capture the negative case** — run the exact reproduction steps from the bug report against the patched code; show the bug no longer reproduces.

**B.2 — Deployed-UX test as a real user (REQUIRED for any user-facing change):**

The orchestrator does NOT claim a UI/UX change works until it has been exercised end-to-end through the deployed product as a user would use it.

1. **Wait for deployment to complete** — don't test stale code. If a Vercel/Railway/Netlify deploy is in flight, monitor it (Vercel MCP `get_deployment_build_logs`, Railway MCP `list-deployments`) until status = `READY` / `SUCCESS`. Do not exercise a preview URL while build is still running.
2. **Sign in as a real user** — use the actual auth flow (email + Google + Microsoft for BSuite; + GitHub for AI apps). Use a test account, not a service-role bypass. The auth path is part of the user experience.
3. **Exercise the feature with the FULL project-requirements checklist:**
   - **Theme** — does the change respect the project's color tokens (oklch for BSuite, project-specific elsewhere) in light AND dark modes?
   - **Style** — typography hierarchy, spacing scale, border radii match the design system?
   - **UI** — components from the project's chosen library (shadcn / Radix / etc.) — no off-pattern naked HTML elements?
   - **UX** — flow is intuitive? error states surface clearly? loading states present? empty states handled? mobile breakpoint usable?
   - **Component / package / dep consistency** — same UI library, same form library, same data layer as sibling apps in the project family (cross-module consistency check)?
   - **Navigation** — discoverable from the surface entry points (nav, header, breadcrumbs)? not orphaned behind a URL only?
   - **Intuitive but powerful** — the simple case is one click; the advanced case is reachable without leaving the screen?
4. **Verify upstream impacts** — what feeds into this feature? does the data shape, the auth context, the URL params still work with the change?
5. **Verify downstream impacts** — what consumes this feature's output? does the analytics event still fire? does the next route still receive what it expects? does the side-effect (email, webhook, queue) still trigger?
6. **Find bugs in BOTH code and use** — code can be technically correct but UX-broken (e.g., focus jumps, scroll resets, race-y loading spinner). Report both classes.
7. **Capture proof** — screenshots of the working flow, console clear of errors, network panel showing expected requests, accessibility tree intact (`browser_snapshot` with role attributes).

**Failure to do B.2 on a UI/UX change** is the orchestration failing — code-only verification is not enough for user-visible work. If the deployed environment isn't reachable from the agent (sandbox, no credentials, no test account), surface the limitation and either ask for credentials or hand off the live-test step to the user with a precise script of what to click and what to observe.

### Gate C — Named-Skill-Over-General-Purpose (every dispatch)

When a dedicated skill exists for a sub-task, invoke it via the `Skill` tool or by name in the `Agent` dispatch. Do NOT substitute a general-purpose agent unless the dedicated skill genuinely doesn't apply.

| Sub-task | Dedicated skill | General-purpose substitute is wrong because |
|---|---|---|
| Best-practice research | `best-practice-research` | Lower fidelity, no MCP routing, no citation discipline |
| Security review | `security-audit` | General agents miss known patterns |
| Code review | `feature-dev:code-reviewer` | Confidence-based filtering and project-aware |
| API design | `api-design-validation` | Knows REST/GraphQL/gRPC conventions |
| Codebase exploration | `Explore` agent | Tuned for fast file/symbol discovery |
| Plan writing | `writing-plans` | Multi-phase plan structure |
| Plan red-teaming | `multi-agent-red-team-planning` | Specialized adversary roles |
| Verification | `verification-before-completion` + skill's own Verification section | The dedicated discipline against rationalization |

The orchestrator must record WHICH dedicated skill was used for each sub-task in its response — "I used a sub-agent" is not enough; "I dispatched `best-practice-research` for the Tanstack Query pattern check" is.

### Gate D — Skill & MCP Re-Inventory (per major edit phase)

The available skills + MCPs can change per session (different plugin sets, different MCP availability). Re-inventory at the start of each major edit phase, not just once at turn start. Specifically:

- After a `/plugin install` or skill addition
- After hitting a capability gap (some MCP refused, some skill missing)
- Before making the *first* edit in a new file/module
- After receiving new instructions that change task class

The orchestrator's failure mode is "inventoried once, then drifted into general-purpose mode for the rest of the turn." Counter: re-inventory before each substantive edit and cite the inventory in the response.

### Gate E — No "Honest Answer" Retroactive Admission

A response that begins with "Honest answer: I didn't actually do X" is a Gate-A/B/C/D failure surfaced too late. The orchestration's job is to make those gates impossible to skip in the first place — not to apologize after.

If you find yourself about to write "Honest answer: partially, not exhaustively" or "I did NOT do X before claiming root cause" — STOP. That sentence means a gate was skipped. Run the gate now, then write the response with the gate's output included, not retrofitted.

## Critical Rules

1. **Always detect project family first** — don't run QIG validators on BSuite work or vice-versa
2. **Always inventory + distribute** skills and MCPs to each subagent and plan step — never leave a step unattached
3. **Always include user-advocate + developer-advocate personas** in subagent teams — security/reliability/perf alone is incomplete
4. **Always run cross-module consistency check** on multi-app projects; surface drift, do NOT auto-fix without user approval
5. **Always cite real skill names** from the active session's system-reminder list — never fabricated ones
6. **Always run red-team for Heavy-tier work** (security/migration/prod/cross-cutting)
7. **Never claim completion without proof** — show test output, commit hashes, verification command outputs
8. **Never read cross-silo memory** — bsuite session never reads `qig_*`, qig session never reads `bsuite_*`
9. **Never push to production** without explicit user approval (BSuite Vercel/Railway prod, Pantheon main)
10. **Never fabricate file contents** — if you haven't inspected it this session, you don't know what's in it
11. **QIG-specific rules apply ONLY in QIG branch** — purity validation, killed-claim avoidance, Paper 1 Fortress are not universal
12. **Gate A: query Context7 before claiming library/runtime behavior** — training-cutoff knowledge ≠ installed version
13. **Gate B: live-test (Playwright / chrome-devtools-mcp) before claiming a UI/runtime fix works** — code-tracing is hypothesis, not verification
14. **Gate C: invoke dedicated skills explicitly** (`best-practice-research`, `security-audit`, `Explore`, etc.) — never substitute a general-purpose agent for a named skill
15. **Gate D: re-inventory skills + MCPs per major edit phase** — drift into general-purpose mode is the orchestrator's main failure mode
16. **Gate E: never apologize retroactively** — "Honest answer: I didn't actually do X" means a gate was skipped; run the gate before writing the response

## Verification

Don't claim a turn is complete without observable confirmation that orchestration actually happened.

### 1. Project family was detected

```bash
# Show what was detected and why
echo "Project family: <BSuite|AI|QIG|Generic>"
echo "Signals: $(pwd | grep -oE 'bsuite|monkey-projects|QIG|qig-')"
git remote -v 2>/dev/null | head -1
```

Expected: family is one of the four; the signals justify it. Ambiguous → user was asked.

### 2. Skills + MCPs were inventoried AND distributed

The response (or plan) must contain a block like:

```text
Skills available this session: <N from system-reminder list>
MCPs available: <list from session scan>
Distribution:
  - Security Agent → security-audit + supabase-auth-comprehensive + Context7
  - User Advocate → vercel-web-design-guidelines + Playwright
  - <each subagent and each plan step has skills+MCPs assigned>
```

Failure mode: any subagent or plan step without explicit skill/MCP assignment.

### 3. Cross-module consistency check ran (multi-app projects only)

```bash
# Detection of UI library / theme / package versions across project apps
ls ~/Desktop/Dev/<family>/ | xargs -I{} sh -c 'echo "--- {} ---"; jq -r ".dependencies // {} | to_entries | map(select(.key | test(\"shadcn|tailwindcss|@radix-ui|react|next$\"))) | from_entries" "$HOME/Desktop/Dev/<family>/{}/package.json" 2>/dev/null'
```

Expected: report of which apps use which version of each library; drift surfaced.

### 4. Subagent teams were named, with personas

The response cites: standard roles (security/reliability/perf/quality), advocate personas (user-advocate/developer-advocate), red-teamers (if Heavy), project specialists (if family-specific).

Failure mode: only "security + reliability + performance" with no advocates — incomplete.

### 5. Memory was loaded silo-aware AND not cross-contaminated

```bash
# memory-synapse log shows correct silo
grep -E "<silo>_session_" /tmp/memory-synapse-*.log 2>/dev/null | tail -3
```

Failure mode: bsuite work read qig_* keys, or vice versa.

### 6. Verification ran on the actual deliverable

The deliverable's own Verification section was executed (not just cited). Output included in response.

If any check fails, surface what failed before claiming the turn complete.

## Related Skills

- `prompt-enhancer` — invoke on incoming user prompts to refine before orchestration
- `writing-plans` — for plan-writing step
- `multi-agent-red-team-planning` — for Heavy-tier plan red-teaming
- `dispatching-parallel-agents` — concrete parallel-dispatch patterns
- `verification-before-completion` — universal verification discipline
- `find-skills` — fallback when capability gap detected during inventory
- `cross-platform-sync` — cross-platform agent instruction file sync
- `bsuite-brand-system` — BSuite-specific cross-app consistency (oklch, neon vs corporate)
- `dry-one-shot-architecture` — DRY enforcement across the project family
- `using-superpowers` — entry-point invariant; this skill assumes superpowers framework is active
