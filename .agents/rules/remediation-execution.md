# BSuite remediation execution contract

Owner: bsuite#3204. Revised 2026-09-14 from observed Claude/Hermes/SMS failures
and the 2026-09-11 Codex/Astra supervisor-reserve ruling.
Canonical source: BSuite parent `.agents/rules/remediation-execution.md`.
Submodule copies are generated for standalone checkouts; edit the parent and run
`python3 scripts/sync-remediation-rules.py --write`, then `--check`.

## Outcome and ownership

- Restore the current issue, acceptance criteria, evidence and active worker before acting.
  Preserve accepted work across compaction, model changes and controller handovers.
- Map the complete user journey and dependencies first: entry → visual configuration →
  publish/activate → real event/action → persisted effect → reload. A backend capability
  without its required visual controls is incomplete. Record of Discussion means a formal
  disciplinary discussion, distinct from a training-contract variation.
- One supervisor owns dispatch; one writer owns each worktree. Default to at most two
  useful independent worker lanes. A reviewer stays read-only on a maker's tree. Never
  stage another lane's changes or reset its checkout. Discover actual owners, not Git author names.
- Prioritize finishing a usable issue. File/link discovered dependencies and continue
  independent authorized work; do not silently enlarge, shrink or abandon the current goal.

## Brief, execute, collect

- A worker brief names issue, exact baseline SHA, owned paths, outcome, caller compatibility,
  negative/retry cases, applicable skills/tools and required receipts. Suggested pseudocode
  is a hypothesis, not authority. Read source/schema before prescribing its implementation.
- Verify model identifier and availability in the executing client. Respect the operator's
  selected model and usage exclusions; no silent fallback. Codex/Astra belongs to the
  supervising Codex/Astra agent: workers and automatic fallback routes must not dispatch
  Codex CLI or spend that reserve. A current operator-scoped native Codex team may use its
  assigned native team lanes; this does not authorize worker CLI dispatch or change the
  product's AI model configuration.
- Preflight prompt file, cwd, ownership and command; retain session/PID, log, exit status,
  final output and resulting SHA. A queued instruction, running label or echoed prompt is
  not execution proof. Use the actual client API/UI; never assume inbox delivery wakes it.
- Collect and review worker results. An unfinished goal must have an executable next step
  underway, a verified running worker to collect, or a named external blocker with a receipt.
  A scheduler is continuity support, not completion or evidence the current worker is alive.
- After two failed corrections of the same defect, escalate with the actual failing validator,
  attempted diffs and current evidence. Reuse accepted exact-SHA reviews; repeat only for
  changed code, affected assumptions or new evidence. Avoid recap loops and rapid idle polling.

## Evidence and completion

- Every claim identifies its boundary and source. Code review, database catalog, runtime
  delivery, user journey and release approval are separate claims. Never generalize one to all.
- Measurements include predicates, exclusions and representative controls. Reconcile a second
  enumeration axis before reporting class coverage. A suspicious zero first indicts the probe.
- Tests exercise the changed production boundary and failure behavior. Relevant regression
  tests must fail with the correction reverted; copied skeletons, equal incomplete payloads
  and unrelated passing suites do not establish correctness. Use actual SQL/runtime for
  database durability and concurrency claims.
- Query migration identity by version AND name; execution timestamps may differ from filename
  versions. Repairing the ledger is bookkeeping. Verify actual functions, ACLs, constraints,
  indexes and scheduled jobs. Do not replay a migration solely because a narrow filter missed it.
- Preserve caller compatibility and test rollback, retry, duplicate and partial-write paths.
  A screenshot must show the claimed usable state. SQL-seeded fixtures prove only the path
  exercised, not provider delivery or visual authoring. Clearing user storage is diagnosis,
  not a fix; preserve drafts, layout and context.
- Signed feature PR → development → verified deployed SHA and complete real-user UX →
  production PR → verified production SHA/UX → applicable `ops-ship-all-apps` →
  `ops-ship-close-out` → independent `agent-definition-of-done` D1–D7 and D8 when user-facing.
  Run `bsuite-false-complete-gates`; resolve skill names through `agent-skl-find`.
  Never direct-push production or close full-scope issues on partial acceptance.
- Record each criterion as unverified, failed, blocked or verified with exact evidence.
  Parent owns child SEND_BACK. Missing evidence is not a pass. Existing programme validators
  and live GitHub state govern closure; this rule document is not itself an enforcement hook.

## Learning and handover

- For each repeated failure: record evidence → cause → changed rule/skill → check that would
  catch recurrence. Improve existing docs/skills in place; avoid competing plans and copied rules.
- Keep stable rules separate from volatile state. Handover carries queue path, current issue,
  criteria, accepted SHAs, active worker ownership, blockers, next action and named skill chain.
- A receiving supervisor must demonstrate access, restore that state, collect one bounded result
  and record its disposition. Transfer dispatch ownership and disable the old scheduler before
  the new supervisor dispatches. Never run two supervising schedules over the same queue.
- Evaluate agents by accepted criteria, rework, stalls and verified outcomes. Attribute a failure
  to the recorded model/session and brief; do not infer model quality from names or benchmarks.
