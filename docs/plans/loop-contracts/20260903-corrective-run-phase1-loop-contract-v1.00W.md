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

> **Re-scoped 12:15 AWST (PI, with reasons):** the migration-audit limb is *Class C green on every PR* (J7); classes A and B on a development-based run list development’s unpromoted migrations by design and turn green on `main` with the parent promotion. The hook limbs (A1, A3, A4, C4, C6) are built by the hub lane under the audit PI (operator’s word, 10:3x); this run consumes the resolver SHA it sends. The required context for estate alignment is `align`, the job id, not the workflow name. The refresh-to-update notice (N1, N2) is added by the operator’s 10:48 directive and holds every app promotion to `main` until that app carries it, hotfixes excepted at a stated after-hours time.

## Contract (machine-readable)

Each item: `id`, `kind` (`gate` a CI check name that must be required and green · `pr` a merged PR · `count` a measured number with its command and the bound it must satisfy · `url` a live page · `key` a memory record · `hook` a local hook behaviour proven by a planted case), `check` (the command or query that decides it), `expected`, `status` (`open` · `done` with evidence · `blocked` with the issue), `evidence`.

```json
[
  {"id": "A1", "kind": "hook", "step": "done-contract read by the stop hook", "check": "planted case: a done-claim with an open item in this file is refused by ~/.agents/hooks/dod-gate.py; with every item done it is accepted", "expected": "refuse then accept", "status": "open", "evidence": ""},
  {"id": "A2", "kind": "hook", "step": "every turn ends with the next action in flight and the four-part layout", "check": "each PI turn's final message names a monitor, workflow, cron or open PR as in flight", "expected": "true on every turn", "status": "open", "evidence": ""},
  {"id": "A3", "kind": "hook", "step": "loop line on every turn", "check": "each PI turn's final message carries a line starting 'loop armed:' naming monitor, cron and wake-up state", "expected": "true on every turn", "status": "open", "evidence": ""},
  {"id": "A4", "kind": "hook", "step": "per-cycle named-skill checklist", "check": "the named skills of the commencement prompt have a recorded invocation in ~/.agents/telemetry/events.jsonl or ~/.claude.json skillUsage before a cycle is accepted", "expected": "recorded", "status": "open", "evidence": ""},
  {"id": "A5", "kind": "count", "step": "intake: every notes export registered and judged", "check": "node scripts/bsuite-notes-cycle.mjs (dry run) reports 0 paragraphs awaiting registration; jq of docs/00-roadmap/operator-notes-verdicts.json covers every D-id in the register; the F-verdict check in scripts/estate-align.mjs banks the unverdicted count and fails a row older than 7 days by registered_at", "expected": "0 awaiting; 0 register rows without a verdict (all 160 judged)", "status": "open", "evidence": "10:40 dry run: 0 awaiting, next id D-160; D-63 and D-140..D-145 judged 11:47 by the verdict lane and carried on #2970 (registered_at on every row; scripts/operator-verdict-baseline.json banked at 0)"},
  {"id": "C1", "kind": "gate", "step": "doc link and supersession gates wired", "check": "an ADVISORY parent check (doc-links-and-supersession.yml) runs scripts/check-docs-links-and-pins.mjs and scripts/audit-doc-supersession.mjs with baselines {findings, scanned} banked only from a CI run; dangling links a monotonic ceiling, supersession equality both ways; scripts/check-doc-citations-resolve.mjs keeps UNRESOLVED non-failing, exempts (planned), ceilings the count, and existence-checks evidence: paths; the context is required by C5 only after two green runs", "expected": "workflow present, baselines banked from CI, self-tests prove failure, then required", "status": "open", "evidence": "PR #2968 open (3 commits: wire, run-every-step, bank supersession from CI); independent review in flight"},
  {"id": "C2", "kind": "count", "step": "shrinking ratchets", "check": "baselines are JSON {origin_count, origin_date, current_count, current_date, scanned, per_week}; floors (classification 15/week from 175, grid 6/week from 192) evaluated ONLY in the nightly non-required lane that opens one issue per breach; PR-path rise and unbanked-fall fail; dod {655, 662} banked with its denominator, not floored (granularity contract is D4, Phase 3); every file importing @bsuite/data-grid without onRowClick fails above a shrinking ceiling", "expected": "JSON baselines committed; nightly floor job on development; ceilings shrink only", "status": "open", "evidence": "PR #2970 open, all checks green; correction: the required context for estate alignment is `align` (the job id), not the workflow name; review in flight"},
  {"id": "C3", "kind": "count", "step": "dead-man's switch on every scheduled control", "check": "public.pg_cron_watchdog_check() writes a check-in on EVERY run (healthy or not) to cron_watchdog_checkins; a parent scheduled workflow (cron-watchdog-observer.yml) fails and opens an issue on a missed or unhealthy check-in; a declared manifest default-denies unknown jobs and flags expected jobs with no cron.job row; http jobs judged on net._http_response; the two vault-failing jobs stay failing as the first proof case", "expected": "23 jobs + 2 unscheduled functions covered; observer red on a planted stale check-in; retention sweep untouched (destructive, Phase 2 pre-flight)", "status": "open", "evidence": "brief written (lanes/brief-c3.md); dispatch after 15:20 or on the hermes route"},
  {"id": "C4", "kind": "hook", "step": "DoD hook blocks a UI done-claim until D8 ran", "check": "planted case: a done-claim after editing a .tsx with no gate_report.py run is BLOCKED; the same claim with ui_touched=false declared is accepted", "expected": "block then accept", "status": "open", "evidence": ""},
  {"id": "C5", "kind": "count", "step": "gate self-tests and required checks", "check": "inventory of the 30 required parent checks: each maps to a workflow and script; count lacking --self-test; explicit-grant-lint required; path-filtered required checks = 0 or always-report", "expected": "inventory committed; explicit-grant-lint required; 0 silent-skip required checks", "status": "open", "evidence": ""},
  {"id": "C6", "kind": "count", "step": "hub self-check validates content", "check": "~/.agents/scripts/test-skill-hub.sh fails on an agent file with empty name/description or a Claude subagent with no skills pairing", "expected": "0 such files after the fix; the check fails on a planted one", "status": "open", "evidence": ""},
  {"id": "C7", "kind": "count", "step": "anon-executable SECURITY DEFINER and RLS-no-policy tables ruled", "check": "braden migration REVOKEs PUBLIC and anon EXECUTE on is_developer_admin after named grants are verified in routine_privileges; MANUAL_FIX_ADMIN_ACCESS.sql deleted; rehearsal assertion: no public SECURITY DEFINER function executable by PUBLIC, anon only per scripts/secdef-anon-allowlist.txt (7 named); the 14 RLS-no-policy tables banked exactly with no anon/authenticated grant or TRUNCATE; column-level-grant census for the email lane’s class", "expected": "REVOKE landed by the applier on promotion; rehearsal assertion fails on a planted PUBLIC grant", "status": "open", "evidence": "brief written (lanes/brief-c7.md); dispatch after 15:20 or on the hermes route"},
  {"id": "C8", "kind": "pr", "step": "click-through restored on the 16 converted crm7 grids", "check": "crm7 PR merged to development; files importing @bsuite/data-grid without onRowClick = 0 (or a recorded exception per file)", "expected": "0 of 22", "status": "open", "evidence": "owner: claude-code-bsuite-main"},
  {"id": "C9", "kind": "url", "step": "reports Name cell one line, on production", "check": "https://crm.crm7.app/reports templates grid: Name cell one line, Key its own column; per-user column width persists after reload", "expected": "true in both themes", "status": "open", "evidence": "owner: claude-code-bsuite-main (D-156); promotion: PI"},
  {"id": "C10", "kind": "gate", "step": "CSS-class gate", "check": "a required BSU check builds the CSS and fails on a class used in src with no emitted utility; baseline banked at 170 and dated", "expected": "check present, required; baseline shrinking", "status": "open", "evidence": "owner: claude-code-bsuite-main (D-149, F8); gate: PI"},
  {"id": "J7", "kind": "gate", "step": "migration-history audit green by fixing the checker", "check": "scripts/audit-prod-migration-history.mjs strips comments before comparing and reads scripts/migration-collision-allowlist.txt; --self-test plants a real DDL difference and fails; the scheduled run is green; git log shows no migration renamed", "expected": "green; self-test fails on the plant; 0 renames", "status": "done", "evidence": "PR #2971 merged to development at 364fd281 (12:11 AWST) after an independent Fable review (PASS; md5 table, marker handling, string-literal `--` case and stale-allowlist failure reproduced through the CLI); the PR job \"Class C (version collision), file-only, no DB\" is green on every PR; the run dispatched on the branch (33713620651) is red on class B, which lists development’s four unpromoted parent migrations (20261106000000..20261109000000): awaiting promotion by design, not drift; the scheduled run on main turns green with the parent promotion. Zero migrations renamed or edited; 12 harmless duplicates banked {12, 279}."},
  {"id": "GITLINK", "kind": "gate", "step": "every parent gitlink sits on its app’s own main; the pointer workflow advances what is safe and refuses loudly", "check": "scripts/check-gitlink-in-app-main.mjs (PRs into main) asserts merge-base --is-ancestor <gitlink> <app origin/main> per app with a planted development-only SHA failing its self-test; scripts/advance-submodule-pointers.mjs compares against app main and stages safe advances even when another app is refused; braden advanced to its main tip through the fixed script", "expected": "gate present; conduit, R80.4, throughput read already current; only crm7 refused (its gitlink is a development tip) until crm7 promotes", "status": "open", "evidence": "PR #2969 open (Advisor sweep red is non-required and estate-wide); reconcile PRs conduit#677 (green), throughput#464 (green) await merge; R80.4#300 merged by the main lane with a merge-tree proof; review in flight"},
  {"id": "C10", "kind": "gate", "step": "CSS-class gate: a class used in src with no emitted utility fails", "check": "scripts/check-css-classes-emitted.mjs (planned) builds each app’s CSS with @tailwindcss/cli, diffs used utility tokens against emitted selectors, honours the theme-audit-ok marker, banks per-app {findings, files_scanned} (BSU 170) that only shrink; registered in theme-gates.sh as C10 and as a theme-conformance.yml job; self-test plants an unregistered class", "expected": "BSU 170 banked today, 0 after the four-line @theme fix (F8, main lane); five apps 0", "status": "open", "evidence": "root cause measured 11:50: BSU shell tokens declared outside @theme, sweep b391c82 (May); gate continuing on branch pi/phase1-c10 (OpenRouter lane); F8 directed to the main lane (d0911566)"},
  {"id": "C11", "kind": "pr", "step": "DESIGN.md at the parent root as the judgment layer every lane reads (audit §7 C11, added by #2965)", "check": "DESIGN.md exists, names @bsuite/theme as the mechanics layer and the theme check scripts by name, carries the known answers (error red never purple; no pure white or black; role tokens; one line per cell; no trailing margin in an autoHeight measure; no bare font name); every fan-out brief cites it; the hub repoints bsuite-brand-system after it lands", "expected": "merged to development; PR number reported to the audit PI", "status": "open", "evidence": "assigned to a design-sheriff worker, next PR"},
  {"id": "N1", "kind": "pr", "step": "refresh-to-update notice, package half (operator 10:48; D-160)", "check": "@bsuite/nav-core minor: useAppUpdateAvailable (running __BUILD_COMMIT__ vs /version.json, content-type asserted, any change = versionChanged, updateCheckBroken never silent), UpdateAvailableBanner (role=status, role tokens, Refresh through the dirty guard, critical non-dismissible), useUnsavedChanges, ./vite versionJsonPlugin (generateBundle + define, throws with no commit); tests with positive and negative controls; merged and published", "expected": "merged to development; published on the parent promotion", "status": "open", "evidence": "design d160-v2-rulings.md after two red-teams (regression REDESIGN, mechanism FIX-THEN-SHIP); branch pi/d160-nav-core-update-notice continuing on the hermes route"},
  {"id": "N2", "kind": "count", "step": "refresh-to-update notice, app half: eleven mount points, four unconsented reloads removed, /version.json served as JSON on twelve domains", "check": "scripts/check-update-banner-mounted.mjs (planned) floor ≥1 mount per app (≥2 for R80.4); scripts/check-version-json-served.mjs (planned) = 200 + application/json on all twelve domains; grep window.location.reload( shows the four unconsented sites removed; Skew Protection state read for six projects", "expected": "11 mounts; 0 unconsented reloads; 12/12 JSON; Skew Protection on where the plan allows", "status": "open", "evidence": "rollout order R10: throughput, crm7, BSU, conduit dashboard then portal, braden, R80.4; app promotions to main held until each carries the banner; Skew Protection needs a Vercel login or token (runbook)"}
]
```

## Rows (the PI ticks with the evidence pointer, never on a code trace)

| Id | Owner | PR | Status | Evidence |
|---|---|---|---|---|
| A1 | hub lane (audit PI) | | open | d93866d landed D9/D10 and the D8 hook kill switch; loop gate and contract resolver to follow |
| A2 | pi | | open | four-part layout used from 12:00; enforcement rides on the hub loop gate |
| A3 | hub lane (audit PI) | | open | arming record + Stop-payload match (ruling 3) |
| A4 | hub lane (audit PI) | | open | advisory, transcript-sourced (ruling 9) |
| A5 | pi | #2970 | open | 160/160 judged; registered_at on every row; F-verdict banked at 0 |
| C1 | pi | #2968 | open | advisory workflow + CI-banked supersession baseline; review in flight |
| C2 | pi | #2970 | open | JSON baselines, nightly floor job on development, onRowClick ceiling; context `align` |
| C3 | db-worker (crm7 clone + parent observer) | | open | brief lanes/brief-c3.md; heartbeat-on-every-run design |
| C4 | hub lane (audit PI) | | open | d93866d: dod-gate.py kill switch, per-hook marker, fixtures |
| C5 | pi worker | | open | POST not PUT; protection dumps; grant-lint unfiltered first; meta-gate; `align` and the C1/C10/GITLINK contexts |
| C6 | hub lane (audit PI) | | open | item 4 amendments adopted (fb57b988) |
| C7 | db-worker (braden clone + parent gate) | | open | brief lanes/brief-c7.md |
| C8 | main | | open | directive 01d27eda; C2 ceiling banked at 17 of 22 |
| C9 | main, promotion pi | | open | Name/Key fix on crm7 development; promotion window 18:00 AWST; column-width persistence still open |
| C10 | gate pi, F8 main | | open | root cause measured; gate continuing (pi/phase1-c10); F8 directed (d0911566) |
| C11 | design-sheriff worker | | open | added by #2965 |
| J7 | pi | #2971 | **done** | merged 364fd281; Fable review PASS; Class C green on every PR |
| GITLINK | pi | #2969 | open | review in flight; conduit#677 and throughput#464 green, R80.4#300 merged |
| N1 | pi (opus, continuing on hermes) | | open | branch pi/d160-nav-core-update-notice |
| N2 | pi + main + app workers | | open | after N1 publishes; rollout R10 |

## Stopping conditions

- **Success:** every row `done` with evidence, the phase red-teamed by two independent models, `gate_report.py` APPROVE with `ui_touched` and `ephemera` declared, promotion to `main` scheduled by the PI.
- **Blocked:** a row whose closure needs an external party is marked `blocked` with the issue number and the one-shot runbook; the phase does not wait for it.
- **Never:** a row ticked on a code trace; a baseline reset upward; a migration renamed; a write to FutureBuild Academy data.

## Tasks

- [ ] A1 to A5 shipped with evidence
- [ ] C1 to C10 shipped with evidence
- [x] J7 shipped with evidence (#2971, 364fd281)
- [ ] Phase red-teamed by two independent models; `gate_report.py` APPROVE recorded here
