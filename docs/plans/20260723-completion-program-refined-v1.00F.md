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

# Refined Prompt — BSuite completion, competitive parity & docs program (2026-07-23)

## Intent

Take BSuite from "6.5/7 ledger items shipped" to **world-class, competitively-audited, fully-documented software**: (1) a verified remaining-work ledger reconciled against every roadmap doc in the parent + 6 submodules, (2) feature/capability parity analysis against the leading GTO/workforce competitors (Code House Workforce One + AnyTime, plus the AU GTO software landscape), (3) a first-party user-manual program, and (4) a continuous-compliance gate for Supabase OAuth 2.1 — executed with subagent orchestration under operator doctrine.

## Decomposition (workstreams + dependencies)

| # | Workstream | Depends on | Lane model |
|---|---|---|---|
| W1 | **Publish close-out chain** (held work): npm publish 1.0.0 ×4 packages → re-merge 3 app shims + BSU Item 6 → lockfile regen (isolated dir) → gates → promote | Operator `npm login` first (BLOCKER) | main agent |
| W2 | **Roadmap sweep**: 15 roadmap files (parent docs/, docs/plans/, docs/archive/ + crm7, conduit, BSU, R80.3, throughput, braden) → extract OPEN items → reconcile vs git/issues → one living ledger | none | read-only audit lane |
| W3 | **Competitor capability matrix**: local AnyTime Admin Guide (2,390 lines, full admin surface: timesheets, placements, leave, pay periods, pay item groups, penalty/allowance groups, work types, reports, WfO sync) + Code House document library (25+ articles: Payroll/MVR/RCTI/Payday Super ×3, OTS ×4, Client Pipeline, Consultant dashboards, Candidate Portal, SMTP relay) + landscape research (aXcelerate, Cloud Assess, ReadyTech/JobReady, Novojob, etc.) → capability matrix vs BSuite feature map | none (read-only research lanes ×2–3 parallel) | research lanes |
| W4 | **User-manual program**: design manual architecture (audiences: developer, enterprise admin, org admin, end user/apprentice, host contact), authoring surface (in-app docs vs docs-as-code vs both), coverage plan seeded from W3 matrix + BSuite feature map | W3 (matrix feeds coverage) | design first (brainstorming) |
| W5 | **OAuth 2.1 continuous-compliance gate**: run the 7-point verification recipe from `agents/supabase-auth-comprehensive` across all 5 apps + check for regressions since the 2026-06-29 COMPLIANT verdict; wire as a repeatable audit | none | audit lane + main agent |
| W6 | **Brainstorm → design → plan** for the completion program itself (this doc) → `writing-plans` | W2+W3 outputs | main agent |

## Best-practice citations

- **Supabase OAuth 2.1**: `agents/supabase-auth-comprehensive` is authoritative locally (JWKS-only verification, PKCE localStorage doctrine, idempotent callbacks, exact-match redirect URIs, `authorization_code,refresh_token` only, ID-token `aud` = client_id). 2026-06-29 audit verdict was COMPLIANT across 6 apps — W5 re-verifies, not rebuilds.
- **Docs-as-code for user manuals**: Docusaurus or in-app markdown rendering; BSuite already has a CustomPageRenderer + page-builder that could host in-app manuals (DRY: reuse, don't build a parallel docs site unless the design says so).
- **Competitive analysis method**: capability matrix (rows = capabilities, cols = products, cells = ✅/🟡/❌/❓) with evidence links per cell — never unsourced claims.
- **Lockfile doctrine**: regen lockfiles ONLY in an isolated dir outside the bsuite tree (parent pnpm-workspace.yaml poisons importers with `..` paths → Vercel `ERR_PNPM_OUTDATED_LOCKFILE`).

## Blindspots to counter (this model, this task)

1. **Stale roadmap trust** — roadmap files contradict each other across dates (archive/ contains superseded versions). Counter: rank by date + status letter (W/D/R/A/F), cross-check every "OPEN" claim against `gh issue list` + git log before adding to the ledger.
2. **Competitor feature hallucination** — claiming competitor capabilities not evidenced in the extracted docs. Counter: every matrix cell needs a source (doc section/URL).
3. **Scope creep into implementation** — the ask is brainstorm/design/plan + audits, NOT building manuals or features yet. Counter: HARD-GATE on implementation; terminal state is writing-plans.
4. **OAuth audit theatre** — re-running the audit recipe without checking outputs against expected values (the skill's Verification section gives exact expected outputs). Counter: compare every probe to its expected output; surface diffs.
5. **Silo contamination** — mixed QIG/BSuite environment. Counter: bsuite_ keys only.
6. **Forgetting the held publish chain (W1)** — it is the only true P0; everything else is audit/design. Counter: W1 is first in every plan.

## Skills & MCPs to use during the work

- `agents/brainstorming` (design gate for W4 + the program), `agents/prompt-enhancer` (this pass), `subagent-orchestration` (lane discipline: one mutation lane per repo; parallel across repos; read-only audit lanes may run concurrent), `agents/supabase-auth-comprehensive` (W5's canonical recipe + references/), `writing-plans` (terminal output), `executing-plans` (post-approval), `best-practice-research` (W3 landscape), `crawl-url` (Code House library depth), `agents/master-orchestration`, `verification-before-completion`.
- MCPs/tools: qig-memory REST (bsuite_ silo keys), `gh` CLI (issue reconciliation), browser (Code House Salesforce community nav), `supabase db query --linked` (W5 probes), delegate_task/Claude Code CLI (lanes; glm-5.2:cloud quota-aware, opus for complex audits).

## The refined prompt (executor acts on this)

> Execute the BSuite completion program in this order:
>
> **P0 (blocked on operator):** W1 publish chain — after `npm login`, publish @bsuite/schema-registry, schema-builder, ui, dry-lint at 1.0.0; re-merge R80.3/conduit/braden `feat/schema-registry-consolidation` branches + BSU `feat/remaining-work-bsu` Item 6; regen lockfiles in isolated dirs; gates green; promote per doctrine.
>
> **P1 (parallel read-only lanes, no mutations):**
> - Lane A (W2): sweep all 15 roadmap files; output a dated, deduped, status-ranked OPEN-items ledger with per-item evidence (file:section + issue# or commit).
> - Lane B (W3-local): extract the full capability surface from `docs/20260723-anytime-workforceone-admin-guide-v1.00W.md` (all TOC sections) into a structured capability list.
> - Lane C (W3-remote): crawl the Code House document library (browser; "Load more" paginates — click through) and extract every article's capability claims; then research 3–5 leading AU GTO/apprenticeship management platforms for their publicized feature sets.
> - Lane D (W5): run the 7-probe OAuth 2.1 verification from `agents/supabase-auth-comprehensive` §Verification against project tuybltdrdefjblnplpqo + all 5 app codebases (PKCE storage grep, JWKS health, oauth_clients shape, claim structure, refresh-rotation handling, audit-log vocabulary). Output COMPLIANT/DRIFT per app with evidence.
>
> **P2 (synthesis, main agent):** merge Lane B+C into a competitor-vs-BSuite capability matrix (✅/🟡/❌/❓ + evidence); fold Lane A's ledger + matrix gaps + W5 drift into the living remaining-work ledger (qig-memory `bsuite_remaining_work_2026-07-23`); then per `agents/brainstorming`, design the user-manual program (W4) and present sections for operator approval — NO implementation until approved. Terminal state: `writing-plans` for the approved design.

## Operator clarifications needed (max 4, before lanes dispatch)

1. Manual hosting: in-app (reuse CustomPageRenderer) vs separate docs site (Docusaurus) vs decide-in-design?
2. Competitor set: Code House only, or also aXcelerate/Cloud Assess/ReadyTech/Novojob landscape?
3. Manual audiences priority: developer → enterprise admin → org admin → end users — agree?
4. OAuth gate cadence: one-shot re-audit now, or also wire as recurring CI/cron audit?
