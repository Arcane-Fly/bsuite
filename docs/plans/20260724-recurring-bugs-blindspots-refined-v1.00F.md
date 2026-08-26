# Recurring Bugs & Unexamined Blindspots — Refined Prompt

> **Naming:** `20260724-recurring-bugs-blindspots-refined-v1.00F.md` · Status **D** · prompt-enhancer Standard tier (3 passes). Input: "what are recurring bugs and issues you have found in this codebase. what should we be looking into but haven't." Silo: BSuite.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## Intent

Produce an evidence-backed catalogue of (A) **recurring bug classes** already observed in this monorepo (patterns that repeated 2+ times), and (B) **unexamined / under-looked areas** that the recent ship window (docs program, bug-hunt, email/funding, one-shot audit) did **not** touch. Output is a prioritised investigation ledger — **not** a fix pass. No code changes unless the user later approves a fix lane.

## Decomposition

1. **Recurring bug classes** — patterns seen ≥2 times this session or in open issues (FK indexes, free-text-where-FK, RLS TO clause drift, ownership-map lag, flaky parallel tests, WCAG e2e vacuity, LocalisedDateInput copy-paste, etc.).
2. **Open-issue clusters still real** — group remaining open GH issues by class (reports pipeline, CI/linter false-greens, onboarding-360 ops, advisor/SECDEF, page-builder backlog, region migration).
3. **Unexamined surfaces** — areas not audited in the 2026-07-22→24 window (auth OAuth consolidation #1315, CSP #1139, STP extract #320, online assessment #223, reports empty-params, WCAG real-page e2e, vault keys, etc.).
4. **Process / agent-caused recurrence** — max-turns salvage, Claude weekly limit, worktrees outside bsuite, pgTAP A1 miss on every new FK table, lane dual-write paths.
5. **Prioritised "look into next" ledger** — P0/P1/P2 with evidence + recommended next action (investigate / fix / defer / operator).

## Constraints

- STRICTLY BSuite — no QIG.
- Analysis + ledger only; **no implementation** in this pass (brainstorming hard-gate for creative work; this is discovery).
- Evidence hierarchy: live code/grep → open issues → prior session silo keys → docs. Never claim from memory alone.
- Do not re-open closed issues as "still broken" without fresh verification.
- Public manuals are user how-tos, not bug changelogs (operator ruling).

## Best-practice citations

- **DRY one-shot** (`docs/20260227-dry-one-shot-architecture-v1.04A.md` v1.04A): entity ownership + lifecycle-handover exception — primary lens for cross-app bugs.
- **pgTAP A1 / FK indexes**: every public FK needs a leading btree index in the **same** migration (caught 3× this session: org_documents, email_message_links, and the audit class).
- **Vitest parallel flakes**: isolate load-sensitive suites; known class encryptionService/documentService/people/new under full-suite load.
- **WCAG e2e**: must hit authenticated real pages, not the Supabase-not-configured error shell (crm7#1157).
- **Supabase region migration**: dump/restore only; Vault root key is the irreversible step (runbook scheduled Wed 2026-07-29 07:00).

## Blindspots to counter

- **Blindspot:** Treating the just-closed bug-hunt as "all bugs fixed." **Counter:** Re-list open issues by class; only cite closed work as *resolved class*, not empty backlog.
- **Blindspot:** Recommending fixes for items already deferred by operator design (e.g. #340 theme canonicalisation). **Counter:** Label deferred-by-design separately from unexamined.
- **Blindspot:** Inventing "recurring" from one occurrence. **Counter:** Require ≥2 independent sightings or an open issue + code evidence.
- **Blindspot:** Scope-creep into implementing the ledger. **Counter:** Analysis-only; end with "approve a fix lane?" not auto-dispatch.
- **Blindspot:** Missing process bugs (agent/tooling) that cause product bugs. **Counter:** Include agent-caused recurrence class (FK index miss, dual-write ownership, worktrees outside repo).

## Skills & MCPs to use

- `agents/brainstorming` — structure discovery; no implementation.
- `agents/prompt-enhancer` — this refinement.
- `subagent-orchestration` — optional parallel greps if needed; prefer direct terminal for mechanical evidence.
- `verification-before-completion` — every claim needs file:line or issue#.
- Memory silo: `bsuite_*` only (oneshot audit, bug-hunt, email/funding keys).
- gh CLI for open issues; no Vercel/prod mutations.

## The refined prompt (executor acts on this)

```
STRICTLY BSuite. Analysis only — no code changes, no PRs, no migrations.

Produce a prioritised catalogue with two halves:

HALF A — RECURRING BUG CLASSES (seen ≥2 times in this monorepo / this session)
For each class: name, evidence (issue#s and/or file:line × N), root pattern,
why it recurs, recommended permanent control (lint rule / migration template /
test contract / process rule).

Include at minimum if evidenced:
- pgTAP A1 FK-index miss on new tables
- free-text where EntitySelector/FK exists (one-shot §3)
- RLS TO PUBLIC vs authenticated source↔prod drift
- ownership-map lag behind new tables
- LocalisedDateInput / shared-component copy-paste divergence
- Vitest load-dependent flakes under full suite
- WCAG e2e vacuity (error page, not real app)
- SQL migration linter false-greens (revoke-anon, secdef search_path)
- Agent/process recurrence: max-turns salvage, dual-write edge fns, artifacts outside bsuite

HALF B — UNEXAMINED / UNDER-LOOKED (not covered by 2026-07-22→24 ship window)
Group remaining open issues + known gaps into clusters. For each: why it matters,
risk if ignored, suggested next step (investigate / fix lane / operator / defer).

Must cover if still open:
- Reports pipeline (empty params, multi:*, required-param tests) crm7#1161–1169, #1162–1163
- CI/linter false-greens crm7#1175, #1158, #1157, #1173; BSU#570 gitleaks
- LocalisedDateInput cross-app bsuite#1610
- Onboarding-360 ops/compliance crm7#1130, #1128, #1127
- Auth OAuth consolidation bsuite#1315
- CSP tighten bsuite#1139
- Advisor/SECDEF backlog bsuite#1261, #1542
- Online assessment conduit#223; STP extract R80.3#320
- Sydney migration bsuite#1322 (scheduled, not unexamined — mark as scheduled)
- Feature backlog (page-builder, attendance, MYOB) — list as backlog not "bugs"

OUTPUT FORMAT:
1. Executive summary (10 lines)
2. Recurring classes table
3. Unexamined clusters table
4. Recommended next 5 investigations (ordered), each with one-line why
5. Explicit non-goals (what we already closed — do not re-open)

Evidence hierarchy: gh issues + code grep > silo keys > narrative memory.
Write the final report to docs/20260724-recurring-bugs-and-blindspots-v1.00W.md
and index it in docs/README.md. Commit docs only.
```
