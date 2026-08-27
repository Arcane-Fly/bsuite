# BSuite deep excellence program — refined prompt

> **Tier:** Heavy · **Silo:** BSuite only · **Date:** 2026-07-25  
> **Inputs:** user multi-stream ask + outstanding from audit loop (STA parsers blocked, DUPLICATE_CONSOLIDATE, WHS edge execution, Sydney #1322 scheduled)

## Intent

Drive BSuite from “shipped features” to **world-class GTO product**: (1) excavate every remaining bug however minor; (2) map every feature against real user types (GTO staff, apprentice, host) for access/UX/Jodie parity gaps; (3) ground opportunities in Fair Work, GTO guidelines, and federal/state apprentice incentive rules; (4) ship high-ROI fixes and a durable improvement ledger — not a wallpaper of ideas.

## Decomposition

| WS | Name | Mode | Output |
|----|------|------|--------|
| A | Outstanding from prior loop | implement / document-blocked | STA note, WHS edge status, package-dupe backlog |
| B | Industry/compliance research | research | cited GTO/FW/incentive matrix |
| C | Persona journeys (all roles) | analysis | journey + need matrix per persona |
| D | Deep bug excavation | read-only then fix | bug tables with severity + patches for P0/P1 |
| E | Feature opportunity + Jodie parity | analysis | opportunity backlog + Jodie gap list |
| F | UX flow improvements | analysis + small ships | prioritized UX wins |
| G | Synthesize + promote | ship | master ledger, manuals how-tos only if user-facing |

## Constraints

- STRICTLY BSuite — no QIG.
- Public manuals = **user how-tos**, never changelogs.
- Artifacts only under bsuite (except already-approved archive path).
- One mutation lane per repo; path-scoped commits; dev-first; promote `--merge` no squash.
- **Substantive-match = done** — do not reimplement alternate paths.
- Bug fixes: evidence file:line; verify with tests/typecheck.
- Do not invent compliance claims without citation.
- STA parsers: still blocked without live email samples — document only.
- Sydney migration: runbook only unless user starts cutover.

## Blindspots to counter

- **Blindspot:** Treating every open GitHub issue as a bug. **Counter:** Classify FEATURE vs BUG vs STALE vs OPS.
- **Blindspot:** Persona analysis from imagination. **Counter:** Ground in routes, portal_role, manuals sections, RLS.
- **Blindspot:** Jodie “can do everything” without tool inventory. **Counter:** Enumerate tools in jodie packages + per-app AI tools.
- **Blindspot:** Research without AU 2025–2026 currency. **Counter:** Web-search Fair Work + state incentives with dates.
- **Blindspot:** Scope explosion. **Counter:** Cap mutation to P0/P1 bugs + top 5 UX wins this loop; rest = ledger.

## Skills & MCPs

- prompt-enhancer, brainstorming, best-practice-research, subagent-orchestration, loop-engineering
- award-interpretation-boot, bsuite-brand-system, verification-before-completion
- qwen CLI `qwen3.8-max-preview` (load `~/.headroom/env`), glm/claude for code lanes
- web_search / web_extract for compliance citations

## The refined prompt (executor)

```
STRICTLY BSuite. Execute excellence program:

1) WRITE brainstorm design: docs/plans/20260725-gto-persona-excellence-design-v1.00D.md
   Personas: platform_developer, enterprise_admin, org_admin, field_officer, payroll_finance,
   employee_gto_staff, apprentice, host_employer, aasn (if present). For each: goals, must-view,
   must-act, Jodie parity, friction points.

2) RESEARCH (cited): Fair Work NES/award apprenticeship rules relevant to GTOs; BOOT;
   federal apprentice incentives (AASS/EIS where applicable); per-state STA incentives
   (at least WA GWS + federal + VIC/NSW/QLD pointers); GTO operational guidelines themes
   (safety, training plans, host monitoring, claims). Write docs/research/20260725-gto-compliance-ux-research-v1.00W.md

3) PARALLEL READ-ONLY LANES (subagents):
   D1 crm7 deep bugs (src/ services edge RLS forms)
   D2 conduit + R80 bugs
   D3 BSU + braden + throughput bugs
   E1 Jodie tool inventory vs UI actions (parity matrix)
   E2 Portal/role route coverage gaps
   Write under docs/audits/20260725-*.md

4) FIX P0/P1 bugs found (one mutation lane per repo). Skip FEATURE epics.

5) UX: implement only top 5 quick wins with tests if cheap; else ledger with acceptance criteria.

6) UPDATE action-plan + recurring-bugs catalogue §10 excellence program.
   Silo key bsuite_excellence_program_2026-07-25.
   Promote when gates green.
```
