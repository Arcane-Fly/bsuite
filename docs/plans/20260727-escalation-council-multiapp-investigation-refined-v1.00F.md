---
kind: record
authority: none
---

> **This is a spent prompt, kept as a record.** It is the brief that was handed to a
> thread on the date in its filename — not a description of how the system works now, and
> not a claim that the work it asks for is finished. Frozen (`F`) because a record of what
> was asked must not drift; per the operator ruling of 2026-08-26, `F` governs the
> document's mutability and is not a statement about the current truth of the work.
> The classification standard requires `kind: record` to carry `authority: none`: a dated
> record is history, not a live document.

# Refined prompt — Escalation council + multi-app BSuite close-out

**Tier:** Heavy (6+ workstreams, multi-app platform, production stakes)  
**Silo:** bsuite  
**Skills:** fable-reasoning, loop-engineering, prompt-enhancer, project-truth, definition-of-done, cli-subagent-orchestration, bsuite-shared-ui-rollouts, verification-before-completion  
**MCPs:** qig-memory, tavily-remote / firecrawl, filesystem, playwright  
**CLI council:** qwen3.8-max-preview (Bailian) + kimi-k3 via Moonshot API (`KIMI_API_KEY`, `https://api.moonshot.ai/v1`)  
**Pairing keys:** `bsuite_skill_mcp_pairings`, `_user_skill_mcp_pairings`

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## Intent

Run a **self-verifying loop** that (1) finishes in-flight BSuite multi-app work (unglue burn-down, cross-app contracts, docs archive residuals, branch-protection hazard), and (2) convenes a **Qwen + Kimi escalation council** to produce a **search-validated investigation backlog** of coding-agent failure modes that drive user dissatisfaction on **multi-app SaaS platforms like BSuite** (shared Supabase, multi-submodule monorepo, Vercel multi-deploy, OAuth SSO, money/RLS surfaces).

## Decomposition (workstreams)

| ID | Workstream | Depends | Owner |
|----|------------|---------|-------|
| W1 | Finish parent pointer PR if open; ensure crm7 `development` exists after promotes | — | main |
| W2 | crm7 unglue burn-4 (next 12 ledger pages, per-page commits) | W1 | qwen CLI |
| W3 | Conduit unglue/PageGrid contract port (+ top glued pages) | W1 | qwen CLI (separate repo) |
| W4 | R80.3 / throughput contract **read-only applicability scan** + minimal contract if cheap | W1 | qwen or main |
| W5 | Web/Tavily research: agent blindspots multi-tenant SaaS 2025–2026 | — | tavily + web_search |
| W6 | Escalation council (Qwen + Kimi): draft 30 areas ranked poor→extremely poor; extend +15 from research | W5 | qwen + kimi |
| W7 | Synthesize single ordered investigation list doc; write silo memory; promote pairings | W2–W6 | main |
| W8 | Loop verifier: tests green, PRs merged or blocked with evidence, list has 45 items with citations | all | main |

## Best-practice citations (seed; council must refresh)

- Multi-tenant SaaS failure modes: RLS/authz gaps, shared-cookie SSO removal, cross-app session desync, env/redirect allowlists  
- Coding-agent weaknesses literature: incomplete multi-file edits, false completion, weak e2e, ignored edge auth paths, stale docs  
- BSuite-local doctrine: SR-BS-APPLY-EVERYWHERE, no glued cards, header Pencil not FAB, `auth_tenant_id()` SETOF, no hardcoded pay rates, one mutation lane per repo  

## Blindspots to counter

1. **False complete** — claim done without vitest/tsc/PR evidence  
2. **Cross-app blindness** — fix crm7 only; skip conduit/BSU/R80/throughput  
3. **Promote deletes `development`** — GitHub auto-delete head branches  
4. **Stale agent failure taxonomies** — must search-validate 2025–2026  
5. **Council without makers** — list without continuing ship work  
6. **Tool-call caps** — per-part commits; salvage WIP  
7. **Silo contamination** — bsuite only; no qig writes  

## Skills & MCPs to use

- `project-truth`, `cli-subagent-orchestration`, `bsuite-shared-ui-rollouts`, `loop-engineering`, `fable-reasoning`, `definition-of-done`  
- qig-memory (`bsuite_*`), tavily-remote / web_search, filesystem, gh  

## Success conditions (binary)

1. Investigation doc at `docs/20260727-multiapp-agent-blindspot-investigation-ledger-v1.00W.md` with **≥45** numbered items in categories, ordered poor→extremely poor, each with **search or code citation**.  
2. crm7 burn-4: either PR opened/merged or blocked with failing evidence; ledger count decreased or legit-composite reasons updated.  
3. Conduit: contract test committed on branch OR explicit N/A with code evidence.  
4. Silo keys updated: `bsuite_now_lane_2026-07-27`, `bsuite_session_latest_v2`, pairings if council recipe changes.  
5. `development` branch exists on crm7 after any promote.

## The refined prompt (executor acts on this)

You are orchestrating BSuite multi-app close-out + an escalation council.

**A. Ship loop (parallel, one mutation lane per repo):**  
- crm7 `feat/unglue-burn-4`: burn next 12 `PENDING_UNGLUE_EXCLUSIONS` (skip legit composites). Per-page commits. vitest contract + tsc. PR → development.  
- conduit: port card-unglue/PageGrid contract pattern from crm7/BSU; unglue top 3 if applicable.  
- After promotes: assert `refs/heads/development` exists; recreate from main if deleted.  

**B. Research:** Tavily/web_search for (1) coding agent failure modes 2025–2026, (2) multi-tenant SaaS production bugs, (3) multi-repo monorepo agent mistakes.  

**C. Council:** Independently run Qwen 3.8 max preview and Kimi K3 (Moonshot). Each produces categorized investigation areas for multi-app platforms like BSuite. Merge: 30 base ranked by how poorly coding agents typically handle them (1=poor … 30=extremely poor), then +15 from research (31–45). Validate each with a citation.  

**D. Output:** Write the ledger doc; update memory; report ship status + top 10 extreme-poor items for next loops.

## Loop controls

- MAX parallel mutation lanes: 1 per repo  
- MAX burn pages per batch: 12  
- Verifier ≠ maker: main runs vitest/tsc/gh checks after CLI lanes  
- Budget: prefer qwen/kimi/grok; Claude sparingly  
