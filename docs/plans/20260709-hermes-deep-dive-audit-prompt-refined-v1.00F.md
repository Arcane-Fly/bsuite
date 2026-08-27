---
kind: record
authority: none
owner: bsuite
---

# Refined Prompt — Hermes Status Correction + Deep-Dive Docs-vs-Code Audit (2026-07-09)

## Intent

Operator wants (1) a corrected status reply to Hermes whose last message lists 4 "pending" production bugs and 2 critical styling items — all already resolved; and (2) a durable, comprehensive instruction document Hermes can execute over multiple long-running sub-agents (multi-model) to audit the entire BSuite codebase against ALL documentation: validate completes, surface outstanding work, archive superseded docs to the parent repo archive, and hunt known blindspot classes.

## Decomposition

- W1: Status correction — map each Hermes "pending"/"recommended" item → resolving commit + evidence. No dependencies.
- W2: Deep-dive instruction set — doc inventory map (parent + 6 submodules + packages), validation methodology, surfacing criteria, archive criteria, blindspot catalogue, sub-agent/model orchestration plan, output contract. Depends on W1 facts.

## Best-practice citations

- Internal: `docs/20260227-contributing-standards-guide-v1.01W.md` (doc naming/status codes), §12 Supabase gates in CLAUDE.md (live-catalog verification), FF-SELF-VALIDATION-20260507 (evidence discipline). No external library research required — this is doc authoring from session-verified state.

## Blindspots to counter

1. Citing SHAs from memory → all key SHAs verified via `git log` 2026-07-09 (61a3f4a, 1411a4ab, 52af8f6f, ebed964c, e13548c, 7fc6c66, d06de15, d00b9723, eece1cd, 46fe85d).
2. Hermes's prior audit verified from files/dashboards only, producing false gaps (conduit CSP, components.json, SECURITY.md) and the recorded-not-executed migration drift. Operator confirmed (2026-07-09): Hermes has FULL skill + MCP parity with Claude Code — instructions route DB-state claims through Supabase MCP execute_sql live catalogs + get_advisors; never assert from migration FILES.
3. Sending Hermes to re-investigate solved bugs → explicit DO-NOT-REDO list.
4. Archive destination ambiguity → operator ruled: superseded docs move to PARENT repo `docs/archive/2026-07/` (date-bucketed, with per-repo subfolders parent/crm7/bsu/conduit/r80/braden — structure already exists).

## Skills & MCPs for the executor (Hermes)

Full parity with Claude Code (operator-confirmed 2026-07-09). The instruction doc enumerates per-lane skills (`verification-before-completion`, `qa-and-verification`, `supabase` + `supabase-postgres-best-practices`, `documentation-compliance`, `security-audit`, `bsuite-brand-system`, `playwright`, `dispatching-parallel-agents`, `best-practice-research`, `git-workflow`) and MCPs (Supabase execute_sql/get_advisors/list_edge_functions/get_logs, Vercel deployments/build logs, GitHub, Context7, Tavily, Playwright/chrome-devtools).

## The refined prompt

Author `/home/braden/Documents/Work/bsuite/validation/20260709-hermes-deep-dive-audit-instructions-v1.00W.md` containing: Part A (status correction table with commits/evidence + updated next-steps advice) and Part B (full deep-dive audit instructions: doc locations, per-doc verdict taxonomy, verification method hierarchy with MCP routing, unfinished-work surfacing criteria, archive criteria + mechanics, blindspot catalogue from this session's institutional knowledge, multi-model sub-agent split with per-model strengths, output contract + evidence rules). Then summarize both for the operator to relay.
