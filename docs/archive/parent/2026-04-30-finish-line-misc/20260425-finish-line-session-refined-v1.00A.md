# BSuite Finish-Line Session — Refined Operating Prompt (v1.00W)

**Status:** REFINED — supersedes the unrefined operating prompt of 2026-04-25. Heavy-tier prompt-enhancer pass complete.
**Profile (locked by user):** Single session, attempt all 10 workstreams · Operator real-time, batched every ~90 min · Auto-promote dev → main if all green at end of session.
**Author of refinement:** prompt-enhancer (Heavy tier) · 2026-04-25

---

## Intent

Close every documented and undocumented BSuite deferral across the parent monorepo plus six submodules in one session: e2e hang RCA, orphan-branch triage, throughput pnpm migration, colour-token republish, CRM7 typecheck unblock, conduit Next 16 cacheComponents proper fix, agent-doable share of operator checklist (with handoff doc for the remainder), doc archival, cross-app one-shot enforcement, full 360 smoke + DoD scorecard, then auto-promote development → main on every repo whose evidence gate is green. No silent deferrals; every "operator-only" item carries an exact dashboard path AND an agent-runnable verification command for next session.

---

## Decomposition (workstreams + dependency graph)

| WS | Title | Depends on | Output gates dev→main eligibility |
|----|-------|-----------|-----------------------------------|
| **A** | BSU e2e Playwright hang RCA + fix | Pre-flight only | BSU |
| **B** | 9 orphan branches across 7 repos — triage + resolve | Pre-flight only | All 7 (deletes/PRs) |
| **C** | Throughput PR #41 (npm → pnpm) — land | Pre-flight only | Throughput |
| **D** | `bsuite#229` colour-token cleanup + `@bsuite/theme` republish | None (republish is independent) | All D2C apps (BSU, CRM7, Conduit, R80.3, Throughput) |
| **E** | CRM7 full typecheck blockers (`@bsuite/nav-core`, `@bsuite/schema-registry/react`, `@sentry/react`) | D's `@bsuite/theme` republish if minor versions cascade; otherwise none | CRM7, Throughput |
| **F** | Conduit Next 16 `cacheComponents` proper fix + PPR caching reintroduction | None | Conduit |
| **G** | Operator-checklist execution (agent-doable share) + handoff doc (operator-only share) + BSU `/admin/team-members` build | None | BSU (for team-members route); cross-cutting for everything else |
| **H** | Documentation hygiene + archival sweep | A–G complete (so doc states reflect reality) | Parent monorepo |
| **I** | Cross-app write audit final pass + `dry-lint` ESLint enforcement | None (independent) | All 7 |
| **J** | 360 smoke + DoD scorecard sign-off + auto-promote gate | A–I complete | Whole-suite gate |

**Critical path:** A and B can run in parallel; D blocks E only if `@bsuite/theme` republish causes peer-dep cascades; H must run after A–G; J is the final gate. WS-G's `/admin/team-members` route is parallelizable but produces a BSU change that must be folded into J's BSU smoke.

**Minimum-viable scope ladder** (if wall-clock pressure forces a drop, drop in this order — never out of order):
1. WS-J auto-promote — drop, leave `development` green and hand off to next session
2. WS-H doc archival — defer to next session with a "what to archive" memo
3. WS-I `dry-lint` enforcement (keep the audit pass; defer the static-check rollout)
4. WS-D republish (keep BSU local override; defer republish)

WS-A, WS-B, WS-C, WS-E, WS-F, WS-G are the **non-negotiable core**. If any of these drop, the session has failed its profile.

---

## Best-practice citations (research pass output)

### Playwright CI hang (WS-A)
Authoritative root-cause patterns from current corpus:
- `page.waitForLoadState('networkidle')` on pages with continuous background activity (websockets, analytics, live chat, real-time channels) **will never resolve** → defaults to a 30s timeout per navigation. **Solution: replace with `'load'` + explicit element waits, or use `page.waitForResponse`/`waitForSelector` for the specific signal.** ([browserstack.com/guide/playwright-waituntil](https://www.browserstack.com/guide/playwright-waituntil))
- Headless CI reporter hang: `reporter: 'html'` defaults to `open: true` which spawns a server and blocks the runner. **Solution: `['html', { outputFolder: 'playwright-report', open: 'never' }]`.** (Hands-On Automated Testing with Playwright, ch. on CI/CD)
- Resource-affected flakes: 46.5% of CI-only flakes are CPU/memory-starvation driven. **Solution: pin `--workers=2` or `--workers=1` in CI; add `--trace on-first-retry` permanently.** ([testdino.com/blog/playwright-test-failure](https://testdino.com/blog/playwright-test-failure/))
- Suspected applicability to BSU: BSU is a real-time portal (Supabase channels) — `networkidle` is a strong suspect. Verify by capturing trace on the hung run.

### Next.js 16 `cacheComponents` + `'use cache'` (WS-F)
Use Context7 ID `/vercel/next.js` (v16.2.2 current) — query `'use cache directive Suspense PPR cacheComponents migration from force-dynamic'` at WS-F start. Key constraints already known:
- `'use cache'` directive replaces `force-dynamic` in cacheComponents mode (per session-D R4 memory).
- `cacheComponents` requires Suspense boundaries around dynamic data — orphaned `await`s in segments default to dynamic and break prerender.
- `cacheLife`/`cacheTag` for granular invalidation; `updateTag` for mutation-driven busting.
- **Tenant-scope blindspot:** cookie-less Supabase client for PPR caching MUST include tenant in cache key, or per-tenant data leaks across the shared cache.

### Supabase Management API (WS-G)
Docs surface didn't return clean Tavily results — **executor must verify per item via `Supabase` MCP** (`apply_migration`, `execute_sql`, `get_advisors`, `list_organizations`, `list_projects`) before declaring an item "operator-only." Specifically:
- **OAuth state secret + edge function redeploy:** likely API-doable via `Supabase:execute_sql` + `Supabase:deploy_edge_function`. Verify, don't assume dashboard.
- **OAuth redirect URL config (`auth.url`):** likely Management API (`supabase auth update --project-ref ...` CLI may exist). Verify.
- **JWK rotation:** likely dashboard-only as of 2026-04 (verify with `Supabase:search_docs`).
- **`xms_edov` Azure claim:** Microsoft Entra ID portal-only (this one is genuinely dashboard).
- **Xero developer-portal app registration:** developer.xero.com only (genuinely dashboard).

### pnpm + Vercel monorepo (WS-C, WS-E)
- pnpm pin: **10.30.3** — 10.32.1 has the `_linkBins Invalid Version` bug per `bsuite_errors_20260424` #1. **Do not upgrade.**
- Vercel CLI v52: env-add path bug per `bsuite_errors_20260424` #6. **Use Vercel MCP for env writes**, not CLI.
- **Lockfile generation MUST happen outside the bsuite parent tree** (per CLAUDE.md and `bsuite_errors_20260424` #2). Recipe: `mkdir ~/throughput_lockgen && cp throughput/package.json ~/throughput_lockgen/ && cd ~/throughput_lockgen && pnpm install && cp ~/throughput_lockgen/pnpm-lock.yaml throughput/pnpm-lock.yaml && rm -rf ~/throughput_lockgen`. Verify the resulting lockfile has `.:` as the only importer (broken lockfiles have `..`).

### Vercel auto-promote gate (WS-J)
- Use `mcp__claude_ai_Vercel__list_deployments` to confirm READY state per project before triggering merge.
- Use `gh pr merge --admin --merge` (per session-D pattern) — admin bypass needed because base-branch policy enforces status checks + linear history.
- **Skew protection:** for any merge that flips a client/server contract this session, set `skewProtection` config in `vercel.json` per Vercel docs (project files `Vercel_Docs`).

### Tailwind v4 + OKLCH (WS-D)
- Use `@bsuite/theme` v0.2.0+ as the SoT (per CLAUDE.md). Republish bumps minor — consumers stay on `^0.2.0` ranges.
- WCAG AA contrast verification: APCA-compliant tooling (the previous WCAG2 ratio is mathematically inferior for OKLCH dark-mode validation). Use a deuteranopia simulator over before/after screenshots to enforce the no-red-green rule.

### Cross-app write audit (WS-I)
- Authoritative doc: `docs/20260423-cross-app-write-audit-v1.00W.md` (file confirmed present).
- `dry-lint` rule shape: ESLint custom rule that imports an ownership map (JSON) and errors on `from('<table>').{insert,update,upsert,delete}` calls in any project not listed as the table's owner. Add to `eslint.config.js` of the four largest consumer projects first; tune for false positives before flipping to required CI status check.

---

## Blindspots to counter (this model, this task — with explicit counters)

### Memory-state blindspots (corrections to the input prompt)

1. **`bsuite_session_20260425c` does not exist in memory.** The input prompt cites it as containing "universal canvas waves 1–5, top-5 operator-gated." That content is actually in `bsuite_backlog_2026_post_n` (Part O catalogue + post-N backlog) and `bsuite_session_20260425d` itself.
   **Counter:** Do NOT fabricate "what session C said." On preflight, treat the missing key as missing — read `bsuite_backlog_2026_post_n` instead. If the executor is unsure, escalate to user before acting.
2. **`bsuite_pending_actions` is dated 2026-04-23 (predates session D).** Several items in it (e.g., parent submodule pointer bumps, dev branches recreated) were ALREADY actioned in session D.
   **Counter:** Reconcile `bsuite_pending_actions` against `bsuite_session_20260425d` line-by-line at preflight. Strike-through items that session D shipped. The "true outstanding" list is the symmetric difference.
3. **The signoff doc and operator-handoff doc the input prompt requires as deliverables DO NOT EXIST yet.** They are session outputs to create, not docs to read.
   **Counter:** WS-J creates `docs/20260425-finish-line-signoff-v1.00W.md`; WS-G creates `docs/20260425-operator-handoff-v1.00W.md`.
4. **The "9 orphan branches" reference in session D does not enumerate the branch names.**
   **Counter:** WS-B's first action is discovery via `gh api repos/<owner>/<repo>/branches?per_page=100` per repo + cross-reference against open PRs. Don't assume the count is exact.
5. **The input prompt's frozen constraint #9 says CRM7 default is `xai/grok-4.20-reasoning`** but the project CLAUDE.md says `xai/grok-4.1-fast-reasoning`. There's an apparent newer-model directive at the top of CLAUDE.md (the 4.20-reasoning bump dated 2026-04-24).
   **Counter:** Treat the CLAUDE.md "AI Gateway models" section as authoritative. Use `xai/grok-4.20-reasoning`. If model usage actually changes during this session (e.g., a programmatic AI Gateway config commit), note the divergence in `bsuite_decisions` for resolution.

### Opus 4.7 long-session blindspots

6. **Memory-write fatigue (drift from per-WS to batched-at-end).** Cure: write `bsuite_session_in_progress` checkpoint at the **start** of every WS naming the WS letter and last verified evidence link, **before** doing any code work in that WS. End-of-WS write is `bsuite_ws_<letter>_complete`. Two writes per WS minimum.
7. **Overclaim ("looks good", "all green", "complete") without four-evidence gate.** Cure: every "complete" claim in a memory write or PR comment MUST include all four: (a) commit hash, (b) CI status check name + result URL, (c) Vercel deployment ID + READY state, (d) smoke artefact (Playwright trace path / BrowserBase screenshot URL / vitest run summary). If any of the four are missing, status is "in progress" not "complete."
8. **Sycophancy under fatigue ("Great work", "Almost there", "You're absolutely right").** Cure: language is banned. Lead with the action or the answer. If you catch yourself drafting a soft phrase, delete it.
9. **Scope creep ("while I'm here").** Cure: the surgical-precision rule is enforced by red-team subagent at every WS gate. Out-of-scope changes get reverted before merge; if genuinely warranted, document the reason in `bsuite_decisions` first.
10. **Premature RCA on WS-A.** Risk: declare root cause based on the first plausible hypothesis (e.g., "must be `networkidle`") without proof. Cure: the RCA must name a specific hook, a specific selector, and a specific network call from the hung trace. If you cannot capture a hung trace locally, capture from CI re-run with `--trace on` and `--retries=0`.
11. **Orphan-branch misclassification (WS-B).** Risk: declare a branch "integrated" because the commit message reused a phrase, when actually only the message was reused. Cure: classification requires BOTH (a) `git log --all --grep` for message + (b) `git log --all -S` for content. Both must hit. If only one hits, escalate, don't assume.
12. **Operator-only escape hatch abuse (WS-G).** Risk: declare an item "operator-only" because the Supabase Management API is unfamiliar. Cure: each "operator-only" declaration must cite (a) the Supabase Management API endpoint that DOES NOT exist for this operation (with URL), or (b) the dashboard-API parity gap doc, or (c) an explicit `Supabase:search_docs` query result confirming no API surface.
13. **Doc archive over-confidence (WS-H).** Risk: delete or move a doc that turns out to be load-bearing. Cure: default = keep in repo. Surface ambiguous docs as a list under `bsuite_doc_archive_proposals` and let the user adjudicate. Only act on the unambiguous moves.
14. **Auto-promote gate triggered too eagerly (WS-J).** Risk: a "green" CI is actually still pending or has only the PR-required checks green (not the full check suite). Cure: gate requires `gh pr checks <pr> --required` returns ALL pass AND `mcp__claude_ai_Vercel__get_deployment` returns READY for the production-equivalent deployment AND smoke artefact saved to BrowserBase or local path. Three-of-three required, not two-of-three.

### Tooling-trap blindspots (from `bsuite_errors_20260424`)

15. pnpm 10.32.1 `_linkBins Invalid Version` — never upgrade past 10.30.3.
16. Lockfile generation in monorepo tree breaks Vercel — always use temp dir.
17. CRM7 `@bsuite/nav-core`, `@bsuite/schema-registry/react`, `@sentry/react` unresolved imports — these are WS-E's primary scope; do not pretend they're already fixed.
18. `supabase migration list --local` requires local Postgres — confirm Postgres running OR mark migration listing as "deferred to CI" explicitly (don't pretend you ran it).
19. Vercel CLI v52 env-add path bug — use Vercel MCP for env writes.
20. `@bsuite/charge-calc` already at npm 0.2.2 (per session D + project_state memory) — don't republish unless changing.

---

## Skills & MCPs to use

### Skills (invoke via `Skill` tool — these are confirmed in the active session)

| Skill | When to use in this session |
|-------|-----------------------------|
| `master-orchestration` | Auto-invoked at top of session; coordinates accountability + memory-synapse |
| `multi-agent-red-team-implementation` | At the gate of every WS (A through I) before merge — security/reliability/perf/UX/code-quality reviewer roles |
| `verification-before-completion` | Before any "complete" claim or commit — enforces four-evidence gate |
| `dispatching-parallel-agents` | WS-B (orphan triage per repo), WS-H (doc archival per scope), WS-J (multi-app smoke) |
| `git-workflow` | Every commit + PR + merge — conventional commits + Gitflow + branch hygiene |
| `best-practice-research` | First action of every WS — emit 3-5 line research summary into the WS's memory entry |
| `executing-plans` | If WS-A or WS-F balloons into >5 substeps, write a sub-plan and execute it |
| `ship-all-apps` | The end-of-session auto-promote gate maps directly to this skill |
| `find-skills` | Capability gap fallback (e.g., if a Supabase Management API skill is needed) |
| `ui-ux-consistency` | WS-D colour-token review + WS-J visual smoke baseline |
| `frontend-backend-mapping` | WS-I cross-app one-shot violations |
| `cross-platform-sync` | Parent monorepo CLAUDE.md ↔ submodule CLAUDE.md ↔ AGENTS.md sync after WS-H |
| `supabase` | WS-G migrations, RLS, edge functions, secrets |
| `supabase-auth-comprehensive` | WS-G OAuth state secret + redirect URL hardening |
| `nextjs-app-router` | WS-F segment + cache strategy |
| `vercel-next-cache-components` | WS-F `'use cache'` directive specifically |
| `playwright` | WS-A trace capture + fix |
| `vercel:deployment-expert` | WS-J auto-promote gate logic |
| `vercel:performance-optimizer` | WS-J smoke baseline (Core Web Vitals reference) |
| `bsuite-brand-system` | WS-D D2C vs Braden corporate brand enforcement |
| `code-quality-enforcement` | Red-team passes |
| `security-audit` | WS-G OAuth + secret rotation steps |
| `tandem-dev-main-reconcile` | WS-J end-of-session main promotion if any submodule's dev↔main has drifted |

### MCPs (confirmed in the active session — see deferred-tools list at session start)

| MCP | Purpose this session | Pre-load via ToolSearch when needed |
|-----|----------------------|-------------------------------------|
| `Context7` (`mcp__plugin_context7_context7__*` and `mcp__claude_ai_Context7__*`) | Current docs for Next.js 16, Playwright, Supabase, pnpm, Tailwind v4 | `select:mcp__plugin_context7_context7__resolve-library-id,mcp__plugin_context7_context7__query-docs` |
| `Tavily` (`mcp__claude_ai_Tavily__tavily_search`) | Best-practice research for items not in Context7 (CI hang patterns, OKLCH tooling) | `select:mcp__claude_ai_Tavily__tavily_search` |
| `Vercel` (`mcp__claude_ai_Vercel__*`) | Deployment status, env writes, runtime logs, Vercel Agent Review status, list_deployments for auto-promote gate | Per-call via ToolSearch |
| `Supabase` (`mcp__claude_ai_Supabase__*`) | Migrations (`apply_migration`), SQL exec (`execute_sql`), edge function deploy (`deploy_edge_function`), secrets, advisors, list_migrations | Per-call via ToolSearch |
| `github` (`mcp__claude_ai_github__*`) | PR / issue / branch protection / merge across all 7 repos | Per-call via ToolSearch |
| `BrowserBase` (`mcp__claude_ai_BrowserBase__*`) | Visual smoke + 360 walkthrough screenshots (WS-J) | Per-call via ToolSearch |
| `chrome-devtools-mcp` (`mcp__plugin_chrome-devtools-mcp_chrome-devtools__*`) | Functional smoke deeper inspection (LCP, network requests, console errors during smoke) | Per-call via ToolSearch |
| `Stripe` (`mcp__claude_ai_Stripe__*`) | Only if Part O.2 Xero billing surfaces touched; otherwise SKIP | Per-call via ToolSearch only if needed |
| `microsoft-docs` (`mcp__plugin_microsoft-docs_*`) | If WS-G `xms_edov` Azure claim documentation lookup needed | Per-call via ToolSearch |
| `Railway` (`mcp__railway-mcp__*`) | Skip — BSuite does not currently deploy on Railway | Do not load |

### Persistent memory

- API: `https://qig-memory-api.vercel.app/api/memory`
- Silo: `bsuite_*` keys ONLY. Do NOT touch `qig_*` / `vex_*` / `pantheon_*` / general `_dev_*`.
- Read at preflight: `bsuite_session_20260425d`, `bsuite_pending_actions`, `bsuite_pending_actions_20260424f`, `bsuite_decisions`, `bsuite_errors_20260424`, `bsuite_backlog_2026_post_n`, `bsuite_project_crm7_20260424f`. **Do NOT attempt `bsuite_session_20260425c` — it does not exist.**
- Write cadence: at start of each WS, write `bsuite_session_in_progress` with WS letter + state. At end of each WS, write `bsuite_ws_<letter>_complete` with the four-evidence gate satisfied. End of session: `bsuite_session_20260425e` summary + `bsuite_decisions` if any new doctrine emerged.
- Operator batching cadence: every ~90 min wall-clock, post a single batched message to the user with all operator-only items collected since last batch (exact dashboard path + verification command). Do NOT block on user response — continue the next WS.

---

## The refined prompt (the executor reads from here)

> **Session intent:** Close every documented and undocumented deferred item across BSuite (parent + 6 submodules). No new deferrals. Every "operator-only" item carries an exact dashboard path AND an agent-runnable verification command. Every "complete" claim carries the four-evidence gate. Single session, attempt all 10 workstreams. Operator (Braden) is real-time but non-blocking — batch operator items every ~90 min. End-of-session auto-promote development → main on every repo whose evidence gate is fully green; stop at green development for any repo whose gate is partial.

### §0 — Operating contract (read once, enforce throughout)

1. **Memory protocol.** Persistent memory at `https://qig-memory-api.vercel.app/api/memory`. Silo: `bsuite_*` only. Read keys listed in §Skills/MCPs/Memory above at preflight. Do NOT attempt `bsuite_session_20260425c` (it does not exist). Write `bsuite_session_in_progress` at the **start** of every WS; write `bsuite_ws_<letter>_complete` at the **end**. Final write: `bsuite_session_20260425e`.
2. **Four-evidence gate (`Definition of Complete`).** No claim of "complete" — in memory, in PR comments, or in user messages — without all four: commit hash, CI status check name + green URL, Vercel deployment ID + READY state, smoke artefact (Playwright trace / BrowserBase screenshot / vitest summary). Three-of-four = "in progress."
3. **Operator batching.** Every ~90 min wall-clock, post ONE batched message to the user titled "Operator items — batch N" with each item formatted as: (a) what to do, (b) exact dashboard URL or CLI command, (c) verification command an agent will run next time. Do NOT block on response; continue next WS.
4. **No deferrals.** Words "deferred", "follow-up later", "would be nice", "in next session" are banned for actionable agent work. If an item hits a true operator-only wall, document it in the operator handoff doc (WS-G) with verification command — then continue.
5. **Intellectual honesty.** "I was wrong because X" — never "we previously thought." Never agree to be agreeable. Sycophancy is banned ("great", "excellent", "absolutely right"). Lead with the action or the answer.
6. **Surgical precision.** Targeted, well-researched changes. No "while I'm here" sweeps. If scope creep is genuinely warranted, write a `bsuite_decisions` entry first.
7. **Kill-switches (stop and escalate, do not defer):** (a) frozen-decision violation proposed; (b) any production main push not authorized by the auto-promote gate; (c) migration that drops data; (d) secret rotation affecting live users without operator approval; (e) red-team subagent disagrees with implementation subagent; (f) memory write fails after one retry; (g) research finds canonical best-practice has changed since last session memory.

### §1 — Pre-flight (do these before WS-A)

Run in parallel where independent:

- **Memory reads** (parallel curl): `bsuite_session_20260425d`, `bsuite_pending_actions`, `bsuite_pending_actions_20260424f`, `bsuite_decisions`, `bsuite_errors_20260424`, `bsuite_backlog_2026_post_n`, `bsuite_project_crm7_20260424f`. Reconcile `bsuite_pending_actions` (dated 2026-04-23) against `bsuite_session_20260425d` line-by-line. Produce a "true outstanding" list as the first memory write of the session: `bsuite_session_in_progress` content = the reconciled outstanding + WS plan.
- **Doc reads:** `docs/20260425-bsuite-finish-line-roadmap-v1.00W.md` (370 lines, the action queue), `docs/20260425-universal-canvas-master-execution-plan-v1.00W.md` §8 DoD scorecard, `docs/20260425-wave5-red-team-qa-report-v1.00W.md`, `docs/20260423-cross-app-write-audit-v1.00W.md` §V5–V10, `docs/20260317-bsuite-gap-report-v2.00W.md` §11, `docs/OUTSTANDING.md`, each submodule's CLAUDE.md.
- **Tooling sanity (parallel bash):** `pnpm --version` must be 10.30.3; `node --version` must be 24.x; `gh auth status` must show admin; `vercel --version` must be ≥45 (note v52 path bug); confirm `playwright` browsers installed (`pnpm exec playwright install --with-deps` if not); confirm `supabase --version`; confirm local Postgres running OR mark migration listing as deferred-to-CI explicitly.
- **Branch hygiene:** confirm each repo's `development` HEAD matches `bsuite_session_20260425d` expected commits. If parent submodule pointers are stale relative to current submodule dev HEADs, batch the bumps into ONE parent commit at the **end** of preflight (not interleaved with feature work).
- **Pre-flight memory write:** `bsuite_session_in_progress` = "{date} preflight done; reconciled outstanding = [list]; tooling green; entering WS-A".

### §2 — Frozen constraints (non-negotiable)

(Identical to the input prompt §2 — restating the most-load-bearing items here for executor recall.)

1. All work lands on `development` first. Production main merge requires the §J auto-promote gate ALL true.
2. **DRY one-shot:** each entity has exactly one create/edit owner app; others read/aggregate/deep-link only.
3. `@bsuite/*` packages: published to npm, semver, never `workspace:*` or `file:../packages/*` in deployable `package.json`.
4. pnpm 10.30.3, Node 24, suite-wide.
5. BSU is the OAuth 2.1 server. CRM7/R80.3/Braden/Throughput are clients. Conduit is Supabase SSR-only.
6. Auth providers: Google + Microsoft (Supabase provider id `azure`) only. GitHub absent.
7. `.crm7.app` Supabase clients: `cookieStorage` domain `.crm7.app`, `storageKey` `business_suite_auth`, PKCE.
8. Google API access: WIF only. No static SA JSON keys.
9. CRM7 default AI model: `xai/grok-4.20-reasoning` per CRM7 CLAUDE.md (NOT 4.1-fast as input prompt §2.1 claims). 2M ctx, 2M out, $2/$6 per M.
10. New colour tokens: OKLCH only (BSU/CRM7/Conduit/R80.3/Throughput). Braden uses corporate brand colours.
11. Universal canvas = `PageGridLayout.tsx` + `usePageGridLayout.ts`. Wire/extend; never rebuild.
12. Finish-line roadmap (`v1.00W`) is implementation spine. Published-package + one-shot constraints override stale roadmap detail.
13. Accessibility: colourblind-safe. No red-green pairs. Use purple/blue/amber.

### §3 — Workstreams (execute in this order; each gated by red-team + smoke + memory write)

For every WS: **(1) memory write `bsuite_session_in_progress`** → research pass (3-5 line summary in memory) → branch → implement → verify locally → red-team subagent → fix → push → CI green + Vercel READY → smoke → **(2) memory write `bsuite_ws_<letter>_complete`** with four-evidence gate → next WS.

#### WS-A — BSU e2e Playwright hang RCA + fix

**Working hypothesis (from research pass):** `page.waitForLoadState('networkidle')` on Supabase real-time channels never resolves; or `reporter: 'html'` defaulting to `open: true` in CI. Capture trace before declaring RCA.

**Steps:**
1. `pnpm --filter business-suite-unified exec playwright test --trace on --retries 0 --reporter list` locally; if hung, capture stack via Ctrl+\ and trace.
2. If not reproducible locally, re-run failed CI with `--trace on` + `workers=1`; download trace artefact.
3. Open `trace.zip` in Playwright UI; identify the specific hook + selector + network call that hangs.
4. Apply the matching fix: replace `networkidle` with `load` + explicit selector wait, OR set reporter `open: 'never'`, OR pin `--workers=2` in CI, OR fix flaky network mock — whichever the trace reveals.
5. Add `--trace on-first-retry` and `reporter: [['list'], ['html', { open: 'never' }]]` permanently to `playwright.config.ts`.
6. Document RCA in `business-suite-unified/docs/20260425-e2e-hang-rca-v1.00A.md` with the named hook/selector/network call.
7. Verify: full suite green locally <10 min AND on CI PR onto `development`.

**Red-team:** Does fix mask a real bug? Run `--workers=1` AND `--workers=4`. Cross-browser chromium + firefox + webkit. Run on a clean clone (no cached `node_modules`).

**Smoke (BrowserBase):** `/login`, `/admin`, `/admin/team-members` (note: built in WS-G), `/idea-feed`, `/lead-capture` × {light, dark}.

**Memory write:** `bsuite_ws_a_e2e_complete` with named RCA + commit + CI URL + Vercel deploy ID + smoke screenshot bucket.

#### WS-B — 9 orphan branches across 7 repos

**Discovery first** (do not assume the count or names from memory — they're not enumerated):
- `gh api repos/<owner>/<repo>/branches?per_page=100` for each of: `bsuite`, `business-suite-unified`, `crm7`, `conduit`, `braden`, `R80.3`, `throughput`. Filter to non-`development`, non-`main`, non-PR-tracked branches.
- For each candidate branch, `gh pr list --head <branch> --state all --json url,state` to detect closed/merged PRs.

**Per branch classification:**
- `git log --oneline development..<orphan>` → unique commits.
- For each commit: BOTH `git log --all --grep="<msg-prefix>"` AND `git log --all -S "<distinctive-string>"` must hit for "integrated" classification. Only one hit = escalate.

**Action per classification:**
- (a) Fully integrated → `gh api -X DELETE repos/<o>/<r>/git/refs/heads/<branch>`. One-line memory note proving integration (commit hash where it landed).
- (b) Partial → cherry-pick deltas onto `dev/orphan-<n>-recover` and PR.
- (c) Unique valuable → PR onto `development`.
- (d) Unique abandoned → `docs/archive/<repo>/2026-04-25-orphan-branch-archive/<branch>.md` with `git log -p` capture, then delete.

**Red-team:** Dispatch per-repo subagent (parallel) to independently audit your classification table. Disagreement = stop-and-discuss, not merge.

**Memory write:** `bsuite_ws_b_orphan_triage_complete` with per-branch classification table.

#### WS-C — Throughput PR #41 (npm → pnpm) — land

**Pre-check:** `gh pr view 41 --repo GaryOcean428/throughput --json state,mergeable,statusCheckRollup` to see current state.

**Steps:**
1. Rebase PR #41 onto current `development`.
2. Resolve conflicts.
3. **Lockfile generation in isolated temp dir** (per `bsuite_errors_20260424` #2): `mkdir ~/throughput_lockgen && cp throughput/package.json ~/throughput_lockgen/ && cd ~/throughput_lockgen && pnpm install && cp ~/throughput_lockgen/pnpm-lock.yaml throughput/ && rm -rf ~/throughput_lockgen`. Verify lockfile has `.:` only as importer.
4. Delete `package-lock.json` in same PR.
5. Confirm Vitest 4 + Node 24 working (per session D R5 fix).
6. Preserve `tailwind.config.js` exemption + DRY exemptions on REFERENCE-ONLY migration.
7. CI green; trigger fresh Vercel preview from `development` post-merge; confirm READY.

**Red-team:** Verify `vercel.json` `installCommand` works post-merge. Confirm pnpm-lockfile-installable on Vercel build image.

**Smoke:** Throughput `/`, `/team`, `/team-members`, `/admin`, schema-builder routes — BrowserBase visual + functional.

**Memory write:** `bsuite_ws_c_throughput_pnpm_complete` with PR #41 merge commit + Vercel deploy ID + smoke screenshot bucket.

#### WS-D — `bsuite#229` colour-token cleanup + `@bsuite/theme` republish

**Steps:**
1. **Audit:** `rg --type css --type ts --type tsx '\-\-muted-foreground' .` across all 6 submodules. Capture in `docs/20260425-colour-token-audit-v1.00W.md`.
2. **Republish `@bsuite/theme`:** bake darkened (light) + lightened (dark) `--muted-foreground` into the package. Bump minor version (0.2.0 → 0.3.0). Build → version bump → `npm publish --access public`.
3. **Update consumers:** remove BSU `--muted-foreground` overrides; bump `@bsuite/theme` to `^0.3.0` in BSU/CRM7/Conduit/R80.3/Throughput `package.json`. Lockfiles regen via temp-dir recipe.
4. **WCAG AA verification:** APCA-compliant tooling on every updated surface; record before/after ratios in the audit doc.
5. **Conduit `text-white` allowlist:** enumerate, justify each, remove unjustified.
6. **Throughput palette-class cleanup:** align to `@bsuite/theme` tokens; remove hardcoded hex.
7. **Demote `no-hardcoded-colours` from warn back to error in throughput.**
8. Close issue `#229` with commit references.

**Red-team:** Deuteranopia simulator over before/after screenshots. Confirm purple/blue/amber palette preserved. No new red-green pairs.

**Smoke:** All 6 submodules' primary routes × {light, dark, system-preference} — BrowserBase visual diff.

**Memory write:** `bsuite_ws_d_colour_tokens_complete` with `@bsuite/theme` new version + before/after WCAG ratios.

#### WS-E — CRM7 typecheck blockers

**Steps:**
1. **`@bsuite/nav-core`:** bump to ≥0.5.0 (per `bsuite_session_20260425d` schema-registry note); verify `package.json` exports surface includes what CRM7 imports.
2. **`@bsuite/schema-registry/react`:** confirm 0.2.0 published with `react` subpath export. If extensionless internal imports cause Node strict ESM failures (per session-D follow-up), fix the package source to use `.js` extensions on internal imports, republish 0.2.x, remove BSU's local vitest workaround.
3. **`@sentry/react`:** apply runtime dynamic-import pattern (per session-A WS-4 BONUS). Strip type-side imports if needed. Confirm Sentry initialises in browser (test-event in preview).
4. `pnpm --filter crm7 typecheck` exits 0 on a clean clone.
5. `pnpm --filter crm7 build` against prod env vars → no warnings, no type errors.
6. Vercel preview deploy READY.

**Red-team:** Does production runtime Sentry still capture errors after dynamic-import refactor? Confirm with deliberate test error in preview + check Sentry dashboard.

**Smoke:** CRM7 prod-equivalent build + Vercel preview functional walkthrough (BrowserBase) — `/`, `/dashboard`, `/clients`, `/candidates`, `/payroll`, `/admin/schema-builder`.

**Memory write:** `bsuite_ws_e_crm7_typecheck_complete` + UPDATE `bsuite_errors_20260424` removing items #4 + the schema-registry workaround note.

#### WS-F — Conduit Next 16 `cacheComponents` proper fix + PPR caching reintroduction

**Research pass:** Context7 query `/vercel/next.js` — `'use cache directive Suspense PPR cacheComponents tenant-scoped cache key migration from force-dynamic'`. Append 3-5 line summary to `bsuite_session_in_progress`.

**Steps:**
1. Apply correct pattern per route (`/analytics`, `/settings/schema-builder`): either `'use cache'` on data-fetching segments, OR `<Suspense>` boundaries around dynamic data.
2. Reintroduce PPR caching via cookie-less Supabase client on `fetchCandidatesCached`, `fetchPipelineCached`, `fetchPublicJobs`, `fetchPublicJob` (per `bsuite_backlog_2026_post_n` follow-up).
3. **Tenant-scope guard:** any cache key MUST include tenant scope where data is per-tenant. Audit and assert.
4. `pnpm --filter conduit build` exits 0 with `/analytics` + `/settings/schema-builder` prerendered.
5. Vercel preview deploy READY with all routes responding 200.

**Red-team:** Verify cookie-less client doesn't leak per-tenant data into shared cache. Audit cache keys.

**Smoke:** Functional smoke against preview — `/analytics`, `/settings/schema-builder`, `/jobs`, `/candidates`. Confirm correct data + cache headers.

**Memory write:** `bsuite_ws_f_conduit_cachecomponents_complete`.

#### WS-G — Operator-checklist execution + handoff doc + BSU `/admin/team-members` build

**Per-item resolution (decide agent-doable vs operator-only via `Supabase:search_docs` and Management API check before declaring):**

**Agent-doable (Supabase MCP):**
- W1-C migrations (`phase6_11_seed_enterprise_subscriptions`, `phase12_tenant_hierarchy_hardening`, `phase12_hierarchy_rls`): `Supabase:apply_migration` + `Supabase:list_migrations` to verify. Snapshot RLS via `Supabase:execute_sql` before/after.
- `CREATE EXTENSION pg_cron` + `pg_net` + GUCs `app.tga_sync_url` + `app.tga_sync_secret`: `Supabase:execute_sql`. If GUC SET fails on tier, escalate via batched operator message — don't pretend.
- `TGA_SYNC_ENABLED=true`: flip via `Supabase:execute_sql` AFTER sandbox dry-run with non-prod data.
- `OAUTH_STATE_SECRET` + redeploy `oauth-google-email` + `oauth-microsoft-email`: generate via `openssl rand -base64 32`; set via `Supabase:execute_sql` (`secrets`); redeploy via `Supabase:deploy_edge_function`. If secrets API path fails, document exact CLI command in operator handoff.
- `phase3_uoc_drop_legacy_contract.sql`: apply only after consumer-rollout-stable check via feature flag.

**Agent-doable (gh MCP):**
- Add `dry-lint` (created in WS-I) as required status check on `development` + `main` for all 7 repos: `mcp__claude_ai_github__update_pull_request` patterns + `repos.updateBranchProtection`.
- Disable "Automatically delete head branches" in 4 repos (crm7, R80.3, braden, bsuite parent): branch-protection update via gh MCP.

**Agent-doable (BSU code):**
- **BSU `/admin/team-members` route** — list view + invite + role edit + remove. Wire BSU permissions; surface only to BSU admins. Make it the W4-TP throughput deep-link target (commit `63b79af`). Full-stack agent build.

**Agent-doable (doc):**
- Master roadmap `v5.03W` rollup: update `docs/master-roadmap-v5.03W.md` reflecting all 20260425a–d outcomes. Strike-through completed; cross-link finish-line roadmap.

**Operator-only (handoff doc):**
- Supabase OAuth dashboard preview redirect allowlist (Project → Auth → URL Config → Redirect URLs). Provide allowlist patterns generated by `Supabase:execute_sql` query of allowed orgs. Verify NO `*.vercel.app` wildcard.
- Remove `*.vercel.app` wildcard redirect URIs (after replacement is in place).
- Revoke HS256 Previous JWK in Supabase dashboard (Project → Auth → JWT Keys).
- Enable Azure `xms_edov` optional claim (Azure Portal → App Registrations → Token Configuration). Provide exact click-path.
- Xero developer-portal app registration (Part O.2). Provide exact form field values; agent will write `VITE_XERO_CLIENT_ID` + `XERO_CLIENT_ID/SECRET/REDIRECT_URI` to Vercel + Supabase secrets via MCP **after** operator supplies the client ID.

**Each operator-only item in `docs/20260425-operator-handoff-v1.00W.md` must include:**
- (a) what to do (one sentence);
- (b) exact dashboard URL or CLI command;
- (c) screenshot reference if dashboard;
- (d) `verification_command` an agent will run next session.

**Red-team:** For each "operator-only" declaration, re-audit: cite `Supabase:search_docs` result OR explicit Management API endpoint URL that does NOT exist. No fabricated "dashboard-only" claims.

**Memory write:** `bsuite_ws_g_operator_checklist_complete` + REPLACE `bsuite_pending_actions` content with the new minimal list.

#### WS-H — Documentation hygiene + archival sweep

**Archive taxonomy:**
- Completed-and-still-referenced → `docs/archive/<scope>/2026-04-25-finish-line/` (in repo).
- Superseded → same archive + `SUPERSEDED-BY: <new-doc-path>` header.
- Truly dead → `/home/braden/Desktop/Dev/archived-repos-docs/2026-04-25-bsuite-finish-line/` (off-repo). `git rm` + `mv` + bucket README.

**Per-doc decision rule:** If unsure, KEEP. Surface ambiguous docs under `bsuite_doc_archive_proposals` for user adjudication.

**Mandatory sweeps:**
- `docs/20260317-bsuite-gap-report-v2.00W.md` §11 — strike shipped items with commit refs; cross-link still-open items to finish-line roadmap.
- `docs/OUTSTANDING.md` — reconcile to current state.
- Per-submodule `docs/` — duplicate of parent → archive submodule copy + leave `SEE: ../../<parent-path>` stub.
- All `STATUS: SUPERSEDED` plan docs → archive.

**DoD:** All shipped items marked shipped with commit hashes. All superseded docs moved with `SUPERSEDED-BY:` headers. All dead docs in off-repo archive. One commit per scope (not one mega-commit).

**Red-team:** `git log --all --diff-filter=D --name-only --since="30 days ago"` — confirm no doc was deleted that should have been archived. Post-sweep: `grep -r "deferred" docs/` should be near zero.

**Memory write:** `bsuite_ws_h_doc_hygiene_complete` with full move log.

#### WS-I — Cross-app write audit final pass + `dry-lint` rule

**Source of truth:** `docs/20260423-cross-app-write-audit-v1.00W.md` §V5–V10.

**Per remaining violation (P1-1 BSU LeadForm, P1-2 BSU ideaService, P1-4 BSU surface vs ownership-map decision, P1-5 rate_configs, P1-6 throughput teamPermissions):**
- (a) Offending app stops writing and uses deep-link/edge-function proxy, OR
- (b) Audit's ownership map is corrected with explicit user-confirmed decision (recorded in `bsuite_decisions`).

**Update audit doc** with `RESOLVED:` lines + commit hash per violation.

**Build `dry-lint`:** ESLint custom rule that imports an ownership map JSON (`packages/dry-lint/ownership-map.json`) and errors on disallowed `from('<table>').{insert,update,upsert,delete}` calls. Add to `eslint.config.js` of CRM7/BSU/Conduit/Throughput first. Tune until clean on `development` HEAD. Then enable as required CI check (action handed to WS-G's gh-MCP step).

**Red-team:** Run `dry-lint` in dry-run against all 7 repos. False positives = tune; do not flip required until clean.

**Memory write:** `bsuite_ws_i_one_shot_complete` with violation-by-violation resolution log.

#### WS-J — 360 smoke + DoD scorecard sign-off + auto-promote gate

**Visual smoke (BrowserBase MCP):** 6 deployable apps × top 10 routes per app × {light, dark} = ~120 screenshots. Mobile (375×812) AND desktop (1440×900). Diff against last-known-good baseline; establish baseline if none.

**Functional smoke (per app):**
- Auth login flow (BSU OAuth + each client app's flow).
- Primary CRUD (e.g., CRM7 client create/edit/delete).
- Cross-app deep-link (R80→CRM7 candidate, throughput→BSU `/admin/team-members`).
- Schema-builder happy path.
- Page edit mode + drag/drop + resize on at least 1 page per app.

**DoD scorecard:** Update `docs/20260425-universal-canvas-master-execution-plan-v1.00W.md` §8 — every must-have rated ✅ / 🟡 / ❌ with evidence link.

**Auto-promote gate (per repo, in this order):**
1. `gh pr checks <pr> --required` returns ALL pass.
2. `mcp__claude_ai_Vercel__get_deployment <deployment-id>` returns READY for the production-equivalent deployment.
3. Smoke artefact saved.
4. **All three true →** `gh pr merge <pr> --merge --admin` (per session-D pattern).
5. **Any one false →** stop at green development for that repo; document in signoff doc with reason.

**Final sign-off doc:** `docs/20260425-finish-line-signoff-v1.00W.md` — commit hashes per WS, Vercel deploy IDs all READY, CI green per repo, visual smoke artefact bucket, functional smoke pass log, outstanding items (only true operator-only), operator handoff doc reference.

**Final memory writes:**
- `bsuite_session_20260425e` — full session summary.
- `bsuite_decisions` — append any new frozen facts that emerged.
- `bsuite_pending_actions` — REPLACED by WS-G with the minimal operator-only list.

### §4 — Final sign-off (do not declare session complete until ALL true)

- [ ] `bsuite_ws_a` through `bsuite_ws_j_complete` memory keys written, each with the four-evidence gate satisfied.
- [ ] `bsuite_pending_actions` rewritten — only true operator-only items remain, each with verification command.
- [ ] `bsuite_session_20260425e` final summary written.
- [ ] All 7 repos: `development` HEAD green CI + Vercel preview READY.
- [ ] Auto-promote gate per repo → main merge complete OR signoff doc records the reason for stopping at development.
- [ ] Parent monorepo submodule pointers point to current submodule HEADs (post-promotion if promoted, dev otherwise).
- [ ] DoD scorecard ≥ 5/6 ✅, with any 🟡 explicitly justified.
- [ ] `docs/20260425-finish-line-signoff-v1.00W.md` exists and is committed.
- [ ] `docs/20260425-operator-handoff-v1.00W.md` exists and is committed.
- [ ] Visual smoke artefact bucket exists and is referenced.
- [ ] Zero "deferred" tokens in any new doc this session.
- [ ] `grep -rn "TODO\|FIXME\|HACK" docs/2026042*` — every hit either resolved or has a justified ticket reference.
- [ ] Final batched message to operator with handoff doc link + verification commands.

When ALL boxes are true, declare done. Until then, keep working.

---

**Begin with §1 pre-flight. Announce the workstream you're entering before each one. Write to memory at the START and END of every WS. Don't defer.**
