---
kind: plan
authority: operator
owner: bsuite
evidence:
  - scripts/check-docs-links-and-pins.mjs
  - scripts/audit-doc-supersession.mjs
  - scripts/check-doc-citations-resolve.mjs
  - scripts/estate-align.mjs
  - scripts/check-airtable-grid-adoption.mjs
  - scripts/audit-prod-migration-history.mjs
  - .github/workflows/estate-alignment.yml
---

# Corrective run, Phase 1: loop contract (R-A, R-C, J7)

> **File:** `20260903-corrective-run-phase1-loop-contract-v1.00W.md`
> **Status:** W · **Created:** 2026-09-03 · **Owner:** bsuite · **Lane:** `claude-code-bsuite-pi`
> **The plan:** [`../../audits/20260903-week-in-review-estate-audit-and-remediation-v1.00W.md`](../../audits/20260903-week-in-review-estate-audit-and-remediation-v1.00W.md) §7, rows A1 to A5, C1 to C10, J7.
> **The method:** [`../../00-roadmap/20260903-corrective-run-commencement-prompt-v1.00W.md`](../../00-roadmap/20260903-corrective-run-commencement-prompt-v1.00W.md).
> **Lock:** qig-memory `bsuite_objective_lock_20260903_corrective_run_phase1`.

## Why this file exists

The audit's root cause RC-A: a loop whose exit condition is prose ("everything, 100%") cannot evaluate true, so the stop hook re-fires forever and every turn ends in a report. This file is the exit condition. Every item below is a named PR, a named gate, a named count or a named live URL with the command that measures it. The stop hook reads the machine-readable block, never the prose; the PI ticks a row only with the evidence pointer in the last column.

## Exit condition, in the operator's words

From the commencement prompt: *"Phase 1, R-A and R-C: the run can prove it is working and prove it is done. Exit: the loop line shows on every turn, the two doc gates are wired, `dod_status` and the grid ratchet have shrinking baselines, every pg_cron job has a dead-man's switch, the DoD hook blocks a UI claim until D8 ran, and the migration audit is green because the checker was fixed, not because anything was renamed."*

## Contract (machine-readable)

Each item: `id`, `kind` (`gate` a CI check name that must be required and green · `pr` a merged PR · `count` a measured number with its command and the bound it must satisfy · `url` a live page · `key` a memory record · `hook` a local hook behaviour proven by a planted case), `check` (the command or query that decides it), `expected`, `status` (`open` · `done` with evidence · `blocked` with the issue), `evidence`.

```json
[
  {"id": "A1", "kind": "hook", "step": "done-contract read by the stop hook", "check": "planted case: a done-claim with an open item in this file is refused by ~/.agents/hooks/dod-gate.py; with every item done it is accepted", "expected": "refuse then accept", "status": "open", "evidence": ""},
  {"id": "A2", "kind": "hook", "step": "every turn ends with the next action in flight and the four-part layout", "check": "each PI turn's final message names a monitor, workflow, cron or open PR as in flight", "expected": "true on every turn", "status": "open", "evidence": ""},
  {"id": "A3", "kind": "hook", "step": "loop line on every turn", "check": "each PI turn's final message carries a line starting 'loop armed:' naming monitor, cron and wake-up state", "expected": "true on every turn", "status": "open", "evidence": ""},
  {"id": "A4", "kind": "hook", "step": "per-cycle named-skill checklist", "check": "the named skills of the commencement prompt have a recorded invocation in ~/.agents/telemetry/events.jsonl or ~/.claude.json skillUsage before a cycle is accepted", "expected": "recorded", "status": "open", "evidence": ""},
  {"id": "A5", "kind": "count", "step": "intake: every notes export registered and judged", "check": "node scripts/bsuite-notes-cycle.mjs (dry run) reports 0 paragraphs awaiting registration; jq of docs/00-roadmap/operator-notes-verdicts.json covers every D-id in the register", "expected": "0 awaiting; 0 rows without verdict (D-140..D-145 excepted until judged)", "status": "open", "evidence": "10:40 dry run: 0 awaiting, next id D-160"},
  {"id": "C1", "kind": "gate", "step": "doc link and supersession gates wired", "check": "a required parent check runs scripts/check-docs-links-and-pins.mjs and scripts/audit-doc-supersession.mjs with a banked baseline; scripts/check-doc-citations-resolve.mjs fails on UNRESOLVED against a baseline and checks evidence: paths", "expected": "check present, required, green at the banked numbers", "status": "open", "evidence": ""},
  {"id": "C2", "kind": "count", "step": "shrinking ratchets", "check": "docs/.dod-unevaluated-baseline, the grid-adoption baseline and docs/.classification-baseline each carry a count and a date; the gate fails when current > floor(count, date); a converted @bsuite/data-grid page without onRowClick fails", "expected": "three dated baselines; floor drops weekly", "status": "open", "evidence": ""},
  {"id": "C3", "kind": "count", "step": "dead-man's switch on every scheduled control", "check": "select count(*) from cron.job where not exists (monitor) = 0; document-retention-sweep-daily last run succeeded; email-token-refresh has a cron row", "expected": "0 unmonitored; retention sweep green; token refresh scheduled", "status": "open", "evidence": ""},
  {"id": "C4", "kind": "hook", "step": "DoD hook blocks a UI done-claim until D8 ran", "check": "planted case: a done-claim after editing a .tsx with no gate_report.py run is BLOCKED; the same claim with ui_touched=false declared is accepted", "expected": "block then accept", "status": "open", "evidence": ""},
  {"id": "C5", "kind": "count", "step": "gate self-tests and required checks", "check": "inventory of the 30 required parent checks: each maps to a workflow and script; count lacking --self-test; explicit-grant-lint required; path-filtered required checks = 0 or always-report", "expected": "inventory committed; explicit-grant-lint required; 0 silent-skip required checks", "status": "open", "evidence": ""},
  {"id": "C6", "kind": "count", "step": "hub self-check validates content", "check": "~/.agents/scripts/test-skill-hub.sh fails on an agent file with empty name/description or a Claude subagent with no skills pairing", "expected": "0 such files after the fix; the check fails on a planted one", "status": "open", "evidence": ""},
  {"id": "C7", "kind": "count", "step": "anon-executable SECURITY DEFINER and RLS-no-policy tables ruled", "check": "select count(*) of SECDEF functions in public executable by PUBLIC = 0; each of the 8 anon-executable functions has a written call-path ruling; each of the 14 RLS-on-no-policy tables has a written ruling", "expected": "is_developer_admin loses anon and PUBLIC; 22 rulings recorded", "status": "open", "evidence": ""},
  {"id": "C8", "kind": "pr", "step": "click-through restored on the 16 converted crm7 grids", "check": "crm7 PR merged to development; files importing @bsuite/data-grid without onRowClick = 0 (or a recorded exception per file)", "expected": "0 of 22", "status": "open", "evidence": "owner: claude-code-bsuite-main"},
  {"id": "C9", "kind": "url", "step": "reports Name cell one line, on production", "check": "https://crm.crm7.app/reports templates grid: Name cell one line, Key its own column; per-user column width persists after reload", "expected": "true in both themes", "status": "open", "evidence": "owner: claude-code-bsuite-main (D-156); promotion: PI"},
  {"id": "C10", "kind": "gate", "step": "CSS-class gate", "check": "a required BSU check builds the CSS and fails on a class used in src with no emitted utility; baseline banked at 170 and dated", "expected": "check present, required; baseline shrinking", "status": "open", "evidence": "owner: claude-code-bsuite-main (D-149, F8); gate: PI"},
  {"id": "J7", "kind": "gate", "step": "migration-history audit green by fixing the checker", "check": "scripts/audit-prod-migration-history.mjs strips comments before comparing and reads scripts/migration-collision-allowlist.txt; --self-test plants a real DDL difference and fails; the scheduled run is green; git log shows no migration renamed", "expected": "green; self-test fails on the plant; 0 renames", "status": "open", "evidence": ""}
]
```

## Rows (the PI ticks with the evidence pointer, never on a code trace)

| Id | Owner | PR | Status | Evidence |
|---|---|---|---|---|
| A1 | pi (hub) | | open | |
| A2 | pi | | open | |
| A3 | pi | | open | |
| A4 | pi (hub) | | open | |
| A5 | pi | | open | notes cycle 10:40: 0 awaiting, next D-160 |
| C1 | pi | | open | |
| C2 | pi | | open | |
| C3 | db-worker (BSU worktree) | | open | |
| C4 | pi (hub) | | open | |
| C5 | pi | | open | |
| C6 | pi (hub) | | open | |
| C7 | db-worker (BSU worktree) | | open | |
| C8 | main | | open | directive 01d27eda |
| C9 | main, promotion pi | | open | directive 01d27eda |
| C10 | main (F8), gate pi | | open | directive 01d27eda |
| J7 | pi | | open | |

## Stopping conditions

- **Success:** every row `done` with evidence, the phase red-teamed by two independent models, `gate_report.py` APPROVE with `ui_touched` and `ephemera` declared, promotion to `main` scheduled by the PI.
- **Blocked:** a row whose closure needs an external party is marked `blocked` with the issue number and the one-shot runbook; the phase does not wait for it.
- **Never:** a row ticked on a code trace; a baseline reset upward; a migration renamed; a write to FutureBuild Academy data.

## Tasks

- [ ] A1 to A5 shipped with evidence
- [ ] C1 to C10 shipped with evidence
- [ ] J7 shipped with evidence
- [ ] Phase red-teamed by two independent models; `gate_report.py` APPROVE recorded here
