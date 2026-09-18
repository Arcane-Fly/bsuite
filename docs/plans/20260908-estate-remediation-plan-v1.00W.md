---
kind: plan
authority: engineering
owner: bsuite
evidence:
  - docs/plans/20260908-remediation/backlog.json
  - docs/plans/20260908-remediation/evidence/release-contract-manifest.json
---

> **Historical 8 September plan; execution routing superseded on 14 September and again on 17 September.** Current authority is the [Codex takeover plan](20260914-codex-takeover-v1.00W.md); the [Codex IDE kickoff](20260914-codex-ide-closeout-refined-v1.00W.md) is historical, because Codex CLI is out of usage (operator ruling 2026-09-17 15:39 AWST). The [remediation pack](20260908-remediation/README.md) ~~is **not** reconciled: its ledger holds 373 rows while `closeout_stocktake_20260914.issue_reconciliation` still records 340 + 30 = 370~~ **is reconciled, corrected 2026-09-17 ~22:35 AWST**: the ledger holds 376 rows and `queue_reconciliation_20260917` records `expected_rows` 376 == `observed_items_rows` 376 with all six additions named (at/by/why), superseding `closeout_stocktake_20260914.issue_reconciliation` (340 + 30 = 370), which is preserved as dated evidence rather than rewritten. The struck claim was correct when written; it outlived its measurement, and the mismatch it reported was an artefact of a probe that read only the 2026-09-14 key — see §8. The embedded338 count, Claude handover, model dispatch and scheduler commands below are preserved provenance only and must not be executed. ~~Current BSuite schedules remain paused.~~ **Refuted 2026-09-17 — two schedules are live; see the maintenance pass below.** Preserve the underlying product acceptance requirements and refresh their live evidence.

# Estate remediation implementation plan

> **9 September execution update:** use the [shared remediation rules](../../.agents/rules/remediation-execution.md)
> and the Claude handover section below. The expanded protected queue contains 338 prompts;
> the 332 counts below describe the original intake. Current completion is measured from
> criterion evidence and GitHub, never inferred from those historical counts.

> **Release contract v2, 8 September:** all 370 prompts now require development PR → verified d.* deployment → production PR → production verification → ops-ship-close-out and final DoD. They explicitly route ops-ship-all-apps for affected multi-app releases and require evidenced skill interoperability/evolution. [Read the mandatory contract](20260908-remediation/20260908-remediation-release-contract-v1.00W.md). Merely naming a skill or chains_with does not execute it.

8 September 2026. Working execution specification for the published issues. Product implementation remains open. Current issue status lives on GitHub; this plan defines order and acceptance, not a parallel dashboard.

## Required result

A user can visually create and customize the same product capabilities an engineer can implement, under the appropriate authority, and connect them through executable workflows. The exemplar is a formal disciplinary discussion, not a training-contract variation, alongside the supplied General Site Visit. Customization documentation is maintained in docs/ and docs/plans/, improving existing specifications.

Read the [capability register](../20260908-customization-capability-register-v1.00W.md) and its existing-specification links before choosing architecture. Use the current canonical entity/page/workflow services and published shared packages; no new competing builder or engine. A unified experience may compose specialist internals.

## Sequence and dependencies

| Wave | Outcome / work | Exit condition |
|---|---|---|
| 0 | Triage live security/data-integrity blockers from existing backlog; coordinate worktree/migration owners; refresh issue/PR/feature state. Expanded bsuite#3111/#1966/#3198 and existing #3118/#3199. | Current owner/scope/evidence for each lane; no unowned blocking dependency or stale done claim. |
| 1 | [bsuite#3205](https://github.com/GaryOcean428/bsuite/issues/3205) workflow persistence; [bsuite#3206](https://github.com/GaryOcean428/bsuite/issues/3206) canonical fields; [bsuite#3207](https://github.com/GaryOcean428/bsuite/issues/3207) contextual binding; expanded crm7#2063 bulk caseload and #2581 draft/inspection lifecycle. | Blank create/save/reload works; failures preserve drafts; authorized same-tenant record scoping and retry are proved. |
| 2 | [bsuite#3209](https://github.com/GaryOcean428/bsuite/issues/3209) capability catalog/execution; existing schema/form/widget/appearance tickets; [crm7#2586](https://github.com/GaryOcean428/crm7/issues/2586) actual attachment/import. | Visually configured capabilities persist and invoke real canonical operations; full package consumer proof. |
| 3 | [bsuite#3208](https://github.com/GaryOcean428/bsuite/issues/3208) / [crm7#2587](https://github.com/GaryOcean428/crm7/issues/2587) complete operator form journeys. | Admin visually authors/modifies both forms and workflows, then real authorized users complete/sign/follow up with exact version/run/action evidence. |
| 4 | [bsuite#3210](https://github.com/GaryOcean428/bsuite/issues/3210) / [bsuite#3211](https://github.com/GaryOcean428/bsuite/issues/3211) / [bsuite#3212](https://github.com/GaryOcean428/bsuite/issues/3212) and existing mailbox/provider/portal work. | End-to-end provider/portal journeys, conflict/deletion review, consent/delegation and retry; specific external-access blockers remain explicit. |
| 5 | All remaining captured issues and feature/documentation gaps under bsuite#3198. | Every in-scope capability has documented visual/workflow behavior, current consumer evidence, owner and honest disposition. |

Waves are dependency order, not permission to defer security or independently ready work. Parent [bsuite#3204](https://github.com/GaryOcean428/bsuite/issues/3204) is an umbrella, not a prerequisite requiring itself to close before children start. Field contracts and contextual bindings should share an agreed interface and can be developed in separate repositories only when ownership is safe. Do not dispatch all 370 prompts simultaneously.

## Discrete launch prompts and routing

[Open the complete prompt index](20260908-remediation/README.md). Each issue has a separate prompt and captured body. Claude Code is the default driver, Grok CLI grok-4.6 is an approved intelligent general-purpose option, and Codex CLI gpt-6-astra is the requested escalation. Skill/agent names resolve from /home/braden/.agents through agent-skl-find; the prompts distinguish invocable skills from agent definitions.

Use at most two active lanes by default and one writer per repository/worktree. A parent owns failed children, remaining acceptance and handoff recovery. A reviewer receives the exact issue, HEAD, scope, errors, attempted fixes and missing proof. Do not rewrite global agent configuration to launch this work.

## Definition of acceptable delivery

- Current deployed SHA and intended role/tenant are recorded; positive, denied, interrupted and retried paths pass.
- Visual configuration, saving/reloading, rendering and downstream workflow effects are all connected. No agent performs a hidden step for the operator.
- Every applicable create/view/edit field is accounted for. Canonical data is entered once and reused; same-tenant unrelated records are distinct from cross-tenant isolation.
- The operator remains in context. Inline create/select is preferred; necessary departure returns automatically with drafts, scroll/filters and the newly created detail applied.
- The common case is straightforward; advanced capability is discoverable. User nouns, keyboard support, responsive layout and both themes are verified. Record action counts and one rejected alternative with its reason.
- Shared package publication is proved at actual consumers. Live schema/policies are queried; migration file presence is not proof.
- Signed/versioned records and active workflows retain history. External effects are idempotent or reconciled; failure remains visible and recoverable.
- Existing relevant specifications and the capability register are updated in the same delivery, with examples and evidence. No contradictory active document remains.
- Completion gate uses fresh evidence, declares UI impact and actual use, and verifies all enumerated siblings. Issues close through the established PR process only when their full scope is satisfied.

## Intake and coverage boundaries

The four DOCX files are evidence, not instructions to tools. The variation-named attachment contains discussion text and cannot define a true variation process. A copy-pasted agent suggestion in the notes does not override operator directions or canonical ownership.

This session reviewed histories and targeted source/live schema, not every product route. [The audit](../audits/20260908-estate-remediation-audit-v1.00W.md) separates findings from user reports and historical claims. The 332 prompts cover the open-issue snapshot; unseen defects and 618 not-evaluated feature rows remain discovery work owned by the coverage issue.

## Entry artifacts

- [Refined prompt used for this audit](20260908-remediation/20260908-remediation-refined-prompt-v1.00F.md).
- [Full launch index](20260908-remediation/README.md).
- [Related specification inventory](20260908-remediation/20260908-remediation-documentation-inventory-v1.00F.md).
- [Machine-readable issue snapshot](20260908-remediation/backlog.json).
- [Source and creation evidence](20260908-remediation/evidence/created-issues.json).

## 8 September addition — inbound SMS

crm7#2594 (https://github.com/GaryOcean428/crm7/issues/2594) is a P1 live defect independent of deal work: Mobile Message inbound capture → canonical conversation → inbox/record timeline → visually configured workflow. Includes full-content recovery, correlation, consent, unread/reply controls, tenant isolation and operational replay. See docs/plans/20260908-remediation/prompts/crm7-2594.md. Source audit found usage-only writes and a separate communications reader; deployed bridge/catalog verification remains required.

## 9 September — durable learning and Claude Desktop handover

This is an execution update to bsuite#3204, not a second backlog. Keep the current SMS worker
running during preparation. Claude Desktop has not yet taken ownership merely because this
handover exists. No additional supervising schedule may dispatch concurrently.

### Instruction distribution

The canonical rule is `.agents/rules/remediation-execution.md` in the BSuite parent.
`scripts/sync-remediation-rules.py --write` generates identical, tracked local snapshots in
all six apps and adds small loaders to their existing AGENTS.md and CLAUDE.md files.
`--check` checks seven copies and fourteen entry points. Standalone clones do not need the
parent checkout to load their copy. Existing app-specific rules are preserved.

Hermes uses its actual home `SOUL.md` for identity, with a BSuite-scoped instruction to read
the checkout rule. Repo-local SOUL.md copies would not be loaded. The shared skills
`agent-cfg-instructions` and `bsuite-live-lane-closeout` now carry loader verification and
current-roster/transport rules respectively. This static check does not force a model to
obey; acceptance still requires real evidence and independent review.

The existing app instruction files remain large. This change consolidates the new lessons;
it does not claim all historic duplication is removed. Future extraction must preserve
unique app rules and compare behavior before deleting text. Prefer path-scoped rules for
specialized guidance and skills for procedures. Imports organize text but still load it.

Primary sources checked 2026-09-09: [Claude memory and modular rules](https://code.claude.com/docs/en/memory),
[Claude Desktop scheduling](https://code.claude.com/docs/en/desktop-scheduled-tasks), and
[Hermes file loading](https://hermes-agent.nousresearch.com/docs/user-guide/which-file-does-what).
Installed Hermes `agent/prompt_builder.py` also confirms the identity/project separation.
Claude Code and Cowork are distinct execution environments: verify filesystem, CLI and
browser access in the actual chosen mode. Do not assume a cloud schedule reaches this host.

### Evidence behind the changes

Only visible conversation text, model metadata and tool outcomes were inspected.
Local logs are under `~/.claude/projects/`:

| Observation | Source | Recurrence control |
|---|---|---|
| Repeated status-and-stop despite available work | `-home-braden-Desktop-Dev-bsuite/1dcc7459-f640-4486-8876-20d48662ba38.jsonl`, assistant lines 1769, 1871, 2357, 2389; recorded `claude-fable-5-1` | Restore the next unmet criterion, execute or collect a real result, and retain ownership. |
| Repaired components without usable dependencies | `-home-braden-Desktop-Dev-bsuite/778b8745-6051-47ca-82ad-6862e77d5f1b.jsonl`, line 44149; SMS visual-trigger gap | Map and test complete user journey before accepting component repair. |
| Incorrect predicate reconciled by explanation | Same mixed session, lines 44419, 45509 | Validate positive/negative controls and second enumeration axis; correct the probe. |
| Irrelevant tests and invented schema mocks | Same mixed session, lines 45776, 45830 | Bind tests to production boundary and use relevant regression negative controls. |
| Ungated merges | Same mixed session, line 45436; recorded `claude-opus-5` | Exact-SHA independent acceptance before merge; full-scope closure only. |
| Brief errors propagated to SMS implementation | Existing `hermes-performance-review.md`; BSU Claude sessions `209a48fc-0c7d-4a40-864b-df24a3ecad38`, `8330f1bc-51ad-423b-8a9d-45659970bf91` | Preflight dispatch and specify outcomes/caller compatibility rather than unverified pseudocode. |

Do not attribute the mixed-session Opus findings to Fable. This sample does not establish
a fair comparative model ranking. Measure accepted criteria per run, rework, stalled
handoffs and intervention count. Preserve improvements already accepted at an exact SHA.

### Recommended ownership and budget

Claude Desktop Fable 5.1 is the operator-reported available supervisor. Confirm its actual
selection in that client; do not invent a CLI alias. Prefer a host-local Code task for CLI
and repository work, with the user's browser-capable desktop mode for real UX as available.
Claude Code handles most bounded implementation using an explicitly verified available
model. Keep one maker and, where useful, one independent reviewer; no nested coordinator
chain of Claude → Hermes → Claude → Astra. Hermes can remain the existing execution lane
while Claude takes over supervision after a controlled handover.

Use authorized Codex CLI `gpt-6-astra` for two failed corrections of one defect, disputed
security/architecture or difficult independent pre-merge review. Brief the exact failing
boundary and accepted baseline; do not spend Astra calls rereading the entire backlog.
Verify the CLI accepts the model and preserve final output/exit receipts. Do not assume
CLI use provides an independent quota or unlimited access. No silent fallback to exhausted
Grok/Kimi or unselected Nemotron/Alibaba. Agent routing does not modify product AI settings.

### Launch prompt for Claude Desktop

```text
Take over preparation for BSuite remediation supervision using the currently selected
Fable 5.1 model. Work in /home/braden/Desktop/Dev/bsuite. Read AGENTS.md,
.agents/rules/remediation-execution.md and this plan's 9 September handover section.
Invoke agent-run-master and agent-skl-find, then load agent-mem-truth,
bsuite-live-lane-closeout, bsuite-false-complete-gates, agent-definition-of-done and
the task-specific skills from /home/braden/.agents. Read the skills before applying them.

Protected execution root:
/home/braden/.codex/visualizations/2026/09/08/01a07f58-73a6-71f2-a57d-5cf3b6b148dc/bsuite-remediation

Read hermes-queue.json and docs/plans/20260908-remediation/{20260908-remediation-release-contract-v1.00W.md,
20260908-remediation-hermes-queue-runbook-v1.00F.md,hermes-performance-review.md,sms-2594-goal-evidence.json} there.
Run verify_sms_goal.py using its documented invocation; restore every C1–C12 criterion.
Read the current crm7#2594 issue and live worker/PR state. The queue has 338 entries;
do not equate pending metadata with a fresh verified GitHub count. Preserve existing work.

First prove access to the actual host repo, authenticated browser and required CLI/tools.
Read the current Hermes runtime/session IDs from the queue, not this prompt. Inspect its
actual activity; do not create another Hermes session or interrupt a running maker.
SMS backend code review at 6530b9c was accepted; PR BSU#1225 merged development at
de6395d. Narrow live SMS catalog reconciliation was independently accepted, with duplicate
migration-27 bookkeeping and small body differences explicitly noted. These are partial
receipts, not full UX, provider delivery or release completion. Refresh current state.
The last known next gap was the visual inbound-SMS trigger and executable workflow;
collect the current worker's result before deciding what remains. Do not redo accepted work.

Before dispatching, arrange a single-owner transfer: record your task ID/owner and current
worker in the existing queue; coordinate pausing Codex automation
bsuite-hermes-remediation-queue through the old supervisor's supported app tool, then
verify it is paused. If you lack that tool, request this specific transition from the
old supervisor; continue read-only preparation in parallel. Do not run two dispatchers.
Only after transfer create one local recurring supervisor task if supported, with real
host access. A scheduled prompt must restore state, collect results and advance an unmet
criterion; remain quiet when unchanged. Verify a first run actually performs the action.

Default implementation to Claude Code, one writer per worktree and at most two useful
worker lanes. Escalate concrete failed validators/difficult independent review to authorized
Codex CLI gpt-6-astra; verify availability, never silently substitute models. Preserve
accepted reviews, signed feature→development→production PRs, exact deployed SHA and real
UX evidence, ops-ship-all-apps, ops-ship-close-out and independent DoD including D8.
Do not close crm7#2594 until all required criteria pass. Then take the next eligible prompt.

Your takeover acceptance is a restored criterion ledger, verified sole ownership, and one
bounded worker result collected and dispositioned with evidence—not “I am monitoring”.
Update existing docs/queue rather than creating another programme plan. Finish executable
steps without asking for routine permission; report a genuine blocker with its receipt.
Exclude Get Muscles and the separate Xero/GST task. Maintain visual/code customization
parity, disciplinary Record of Discussion semantics, and executable workflow linkage.
```

## 16 September — scoped record-section takeover

Codex owns the operator-requested Callibre consolidation, record create/edit/view parity and in-context related-record controls; Claude retains unrelated active lanes. Continue from the existing bsuite#3206 and crm7#2474/#2477/#2061 launch prompts. This is not a new backlog and does not change their full acceptance requirements.

Callibre's bounded live data correction has fresh evidence in [crm7#2474](https://github.com/GaryOcean428/crm7/issues/2474#issuecomment-5692979299). Record UI work remains under implementation and must pass the [capability-register round trip](../20260908-customization-capability-register-v1.00W.md#16-september--clienthost-record-parity-and-linking), exact development/production deployment checks and full DoD before it is accepted. Preserve the distinction between the original client and its linked host storage: consolidation must not make either set of documents or the person's host relationship disappear from the screen.

## Maintenance pass — 2026-09-17 (Qwen, read-only external supervisor)

Measured 2026-09-17 18:40–19:00 AWST against live `gh`, live git refs and the on-disk ledger.
Everything above this line is preserved unedited. **Where the two disagree, this section wins.**
No claim here is a completion claim; each carries the command that produced it.

### 1. The schedules are not paused

The header's "Current BSuite schedules remain paused" is refuted. Two mechanisms are live:

| Mechanism | Measured state | Command |
|---|---|---|
| `bsuite-accountability.timer` | `active` + `enabled`; last fired 18:47:46 AWST, next 19:07:51 (every 20 min) | `systemctl --user list-timers bsuite-accountability.timer` |
| `agents-external-supervisor.service` | `active` | `systemctl --user is-active` |
| Codex automation `bsuite-hermes-remediation-queue` | registered `status = "ACTIVE"`, `RRULE:FREQ=MINUTELY;INTERVAL=20`, `target_thread_id = 01a0a2ca…` | `~/.codex/automations/bsuite-hermes-remediation-queue/automation.toml` |

Registration is not liveness: the Codex automation targets a Codex thread and Codex CLI is out
of usage, so whether it still fires is **not established** by its `status` field. The systemd
timer's firing *is* established — it ran three minutes before this measurement.

That automation's prompt also still names `ba169564-a7ad-4a52-a7a5-aa47e6def669` as the Claude
executor to verify. That session ended 2026-09-17 15:41 AWST. Any run of that prompt is
reviewing a dead session's transcript. Current executor is `claude-code-bsuite-owner-b6ddc034`;
current accountability is Qwen.

### 2. The 9 September rule distribution holds on `development` only — not on `main`

The plan states `scripts/sync-remediation-rules.py --write` "generates identical, tracked local
snapshots in all six apps and adds small loaders to their existing AGENTS.md and CLAUDE.md
files" and that "standalone clones do not need the parent checkout to load their copy".
Measured per ref, in all six apps:

| Ref | `.agents/rules/remediation-execution.md` | Loaders in AGENTS.md / CLAUDE.md |
|---|---|---|
| `origin/development`, all 6 apps | present, **5962 bytes**, blob `9551612a` = the parent canonical copy | 1 / 1 |
| `origin/main`, all 6 apps | **ABSENT** | 0 / 0 |

Commands: `git cat-file -s origin/development:.agents/rules/remediation-execution.md`,
`git cat-file -e origin/main:.agents/rules/remediation-execution.md`,
`git show origin/main:AGENTS.md | grep -c remediation-execution`, run inside each app.

So a standalone clone of any app's **default branch** gets neither the rule nor a loader. The
claim is true of `development` and false of `main`. It converges on the outstanding
development→main promotion; it is recorded here once and is not a separate work item.

### 3. `--check` exits 1 on this checkout, and that is a checkout artefact — do not "fix" it with `--write`

`python3 scripts/sync-remediation-rules.py --check` → **exit 1**, 12 divergences:
business-suite-unified, crm7, conduit and braden each report a divergent rule *and* two
divergent loaders. R80.4 and throughput pass.

Attribution, because the obvious remedy is the wrong one:

- Those four submodule checkouts are on **feature branches behind development** — crm7
  `fix/crm7-2594-workflow-corrections` at `96dfc1b4e`, 155 behind; conduit
  `fix/next-16.3.3-ghsa-2xp9` at `a2620df`, 81 behind; braden `fix/braden-613-services-routing`
  at `13961d9`, 24 behind; business-suite-unified `fix/tasks-automation-queue-idempotency` at
  `468c96f`.
- Their working-tree rule is the **9 September** copy: 5769 bytes, blob `29c459fc`. Development
  carries 5962 / `9551612a`. Their working-tree AGENTS.md and CLAUDE.md carry 0 loader hits
  while `origin/development` carries 1 each.
- Therefore the divergence is *stale checkouts*, not a broken distribution. Running `--write`
  from the parent now would overwrite four apps' working trees **while makers hold those
  branches**, injecting uncommitted doc edits into live lanes. Do not do that. `--check` must be
  judged from a checkout whose submodules sit at the ref being judged.

The gap worth fixing is in the documentation, not the tool: neither this plan nor the script
states that precondition, so the next reader sees 12 divergences and reaches for `--write`.
The tool's own arithmetic is correct — 7 rule copies (parent + 6 apps) and 14 entry points
(6 apps × 2 loaders + the parent's AGENTS.md and CLAUDE.md).

### 4. Every wave anchor is still open — no wave exit condition has closed at issue level

All 19 issues this plan routes work through were queried live; **19 of 19 are OPEN, none has a
`closedAt`**:

- bsuite: #3204, #3205, #3206, #3207, #3208, #3209, #3210, #3211, #3212, #3111, #1966, #3198,
  #3118, #3199
- crm7: #2063, #2581, #2586, #2587, #2594

Command: `gh issue view <n> --repo <owner/repo> --json number,state,closedAt,title`.

The wave table's exit conditions ("blank create/save/reload works; failures preserve drafts…")
are product-acceptance statements, not issue states, so an open issue does not by itself mean
no progress — merged PRs against these issues exist (crm7#2643, #2649, #2651, #2652, BSU#1256,
#1254). What it does mean: **no wave in this plan can be declared exited on issue evidence
today**, and any completion label must cite the deployed SHA and the D1–D8 pack, per this
plan's own "Definition of acceptable delivery".

### 5. Lane discipline in this plan is being honoured — validated, not corrected

"Use at most two active lanes by default and one writer per repository/worktree" and "Do not
dispatch all 370 prompts simultaneously" are both consistent with the executor's recorded
practice on 2026-09-17: after Grok Build returned HTTP 402 at 18:06 and killed three lanes,
writers were restarted as Sonnet subagents **with a cap of 2** from the dead lanes' exact
state, and `dispatch.sh` now stops at once on 402 with a BLOCKER marker. Recorded as a
validated control so it is not re-litigated.

### 6. Counts: this plan carries four different row counts

332 (original intake), 338 (expanded protected queue), 370 (release contract v2 and the
reconciliation record), **373 (live ledger, `hermes-queue.json` mtime 2026-09-17 18:21:56 AWST)**.
The live count is the only one that is current, and it is unreconciled against the 370 record:
`len(items) = 373` vs `previous_rows 340 + added_rows 30 = 370`. Three rows were added without
the reconciliation block being updated. Status counts: `pending 365`, `in_progress 7`,
`completed 1`.

The estate's own invariant is that the row count equals the recorded baseline plus explicitly
recorded additions. Until `issue_reconciliation` names the three additions, every future
reviewer reads a mismatch they cannot attribute.

### 7. Maintenance pass by `qwen-bsuite-accountability`, 2026-09-17 ~20:50 AWST

Full receipts, including every command, are in
`~/.agents/state/loop-contracts/estate-remediation-plan-maintenance-20260917.md`. Summary:

- The ledger has moved again: **376 rows** (373 at §6), statuses over all rows
  `completed 1 / in_progress 13 / pending 362`. The 376-vs-370 gap is now **six rows with no
  `prompt` field at all** — the entire reconciliation mismatch, and it is a mapping gap, not
  lost work. Naming or excluding those six rows is what stops the mismatch firing.
- Progress against the 370 prompts, measured from GitHub rather than from the queue's own
  labels: **49 of 370 (13.2%)** show any signal of work; **211 PRs** have merged since
  2026-09-08 and only **45** reference a prompt. The estate ships steadily around this plan
  rather than through it; `bsuite-370-progress.py` now measures that gap every iteration.
- **Orphan cleanup executed, correctly.** Local branches **115 → 89**. 26 deleted, each
  satisfying: 0 unpushed commits, ancestor of `origin/development`, not current, not in a
  worktree, not a trunk, not `salvage/*`. 14 via `git branch -d`, 12 via `-D` only after both
  zero-loss conditions were measured. `git fetch --prune` ran in all seven repos first.
  Retained: trunks, all `salvage/stash-*` branches (this plan's own preservation boundary),
  four pushed-but-unincorporated lines, 53 in-worktree branches, 7 current. **No worktree
  pruned, no remote branch deleted** — Gate F, and four worktrees were touched within 90
  minutes of the census. A first-pass "orphan = 0 unpushed" definition flagged the trunks and
  every salvage branch and was rejected before any deletion.
- Visual pass on `d.crm.crm7.app` (`b508420`, today 12:03Z): 1440 light, 768 and 1440 dark
  **PASS**; **375 FAIL** — wordmark under the theme toggle, 25.7px overlap, SEND_BACK issued
  against `crm7/src/components/marketing/MarketingHome.tsx:225-229` and
  `crm7/src/index.css:1351`. A first-load asset 404 was disproven as a stale cached bundle
  across a redeploy boundary. `ideas.crm7.app` at 672×699 is not reproducible on the empty e2e
  tenant; the operator's 49.77px measurement stands against production `3a56985`.
- Promotion remains the binding gate: `main_behind_dev_total` **560** and crm7 production
  **183** commits stale, both widening through the day. The operator's ruling is to promote
  routinely once checks pass; the 375px FAIL is a live defect on the candidate, so it is fixed
  or explicitly accepted first.

### 8. Maintenance pass by `qwen-bsuite-accountability`, 2026-09-17 ~22:20–22:45 AWST

Cross-references rather than duplicates: the full receipts for this iteration are in
[`20260914-codex-takeover-v1.00W.md`](20260914-codex-takeover-v1.00W.md) §13 and
`~/.agents/state/loop-contracts/estate-remediation-plan-maintenance-20260917.md` (iterations 22–23).
What belongs in *this* plan is the correction to its own banner and a content-destruction repair.

**8.1 The banner's "not reconciled" claim is corrected, and the mismatch was my probe's fault.**
§6 above recorded four row counts and an unreconciled delta; the banner said the pack is **not**
reconciled. Both were correct when written and have now been superseded. The ledger holds **376**
rows and `queue_reconciliation_20260917` records `expected_rows: 376` == `observed_items_rows: 376`
with all six additions named (at/by/why), following this estate's convention of adding a new dated
key rather than rewriting `closeout_stocktake_20260914` (which asserts `original_rows_preserved:
true`). `bsuite-370-rollup.py` reported mismatch=1 regardless, because v1 read only
`closeout_stocktake_20260914.issue_reconciliation` = 340 + 30 = 370 — **the maker could never have
cleared it**. Predicate widened to resolve the newest dated reconciliation record *and* require every
prompt-less row to be named there; **17/17 negative controls** pass
(`test_bsuite_370_rollup_reconciliation.py`), including one that reverts to the v1 predicate and
re-fires on today's reconciled ledger, which is what proves the widening is load-bearing rather than
a moved goalpost. Now `ledger_reconciliation_mismatch=0`, `source=queue_reconciliation_20260917`.
The same single-key blind spot is still live in `~/.agents/scripts/bsuite-accountability-state.py:45-47,80`
— reported to the maker, not edited here, because it is harness-owned with its own tests.

**8.2 This file had lost a committed section, and the loss was invisible to every gate.** The
2026-09-17 maintenance pass was inserted at line 198, which **overwrote** the file's committed final
section rather than being appended after it:

```
## 16 September — scoped record-section takeover
```

plus its two paragraphs — Codex owning the operator-requested Callibre consolidation, record
create/edit/view parity and in-context related-record controls; continuation from bsuite#3206 and
crm7#2474/#2477/#2061; and the requirement to preserve the original-client vs linked-host-storage
distinction so consolidation cannot make either set of documents or the person's host relationship
disappear from the screen. Those are `origin/development` lines 198–202. **Restored verbatim** —
`diff` of the restored five lines against `git show origin/development:<this file>` is identical — so
the file is 340 → **346** lines with the heading back at 198 and the maintenance pass intact below it.

The reason this matters more than the five lines: the maintenance pass asserted *"Everything above
this line is preserved unedited"* while a committed section above it had been deleted, and nothing
caught it. The doc gates check naming and citations, not whether an edit dropped a section; `git diff
--numstat` reported `145 1`, and a single deleted line reads as the intentional banner correction, so
the count hid the loss. Only `git diff origin/development -- <file> | grep '^-[^-]'` — listing every
deleted line and asking whether each was intended — exposed it. After the repair that command returns
exactly one deletion, the banner sentence corrected in 8.1.

**The rule, and it is the same one §13.4 of the takeover plan records from the other direction:** an
insertion point is a claim about where the existing content ends. Before appending to a maintained
document, diff the portion you believe is unchanged against the committed version, and enumerate
every deletion. "I only added to the end" is a claim about the file, and the file is the only
authority. Two independent instances of this in one evening, in two different plans, both by this
role — the check has to be mechanical, not remembered.

**8.3 Both gating visual FAILs now have maker PRs, so promotion is closer but not unblocked.**
crm7#2664 `fix/crm7-marketing-header-375` (head `41a7c22ec`, 21 checks, 3 pending, 0 failing) and
BSU#1258 `fix/bsu-marketing-375-containment` (head `4b58db7f4`; the `lighthouse`+`Vercel` failures I
observed were on the superseded head `51ba2dbe9` and cleared). BSU#1258's new
`tests/e2e/smoke.spec.ts` asserts the **document** (`documentElement.scrollWidth` vs `innerWidth`) and
encodes the R80 counter-example — 72 overflowing elements, `scrollWidth` 365, correct — so it cannot
pass on a fix that merely hides one span; APPROVED as the right control shape. Neither PR is merged,
so neither preview serves the fix (`d.crm` `e59bc6a`, `d.suite` `79631e3`) and **both 375 gates still
FAIL**. crm7 was re-measured because its build changed: overlap 25.69px, identical, 0 console errors,
`scrollWidth` 365 ≤ 375. BSU unchanged, so not re-measured — its FAIL stands by determinism. No
duplicate verdicts; `04938cc0` and `5f41be42` remain the single verdicts for those two defects.

**8.4 Overnight arming and the maker-quota boundary.** The operator went to bed at ~22:20 AWST asking
that the loop be set and firing, and pre-authorized sub-agents in Claude Code's place on exhaustion.
Armed: durable cron `o51n2fz8` (≈420 s, inside the 300–600 s band; superseded `a1yvdacc` at a 30-min
cadence deleted rather than left double-firing), monitor `mon_4610b38af92c47dd` on both preview
commits and both PR states with a 9-min heartbeat so it cannot die silently inside the idle cap, and
a 420 s wakeup; record `state/loop-armed/b324d5c3-75f5-4497-9e4c-fe2874d13e7e.json`. Maker liveness
measured, not assumed: three live `claude` processes plus a PR monitor loop; Claude 7-day utilisation
**0.92** `allowed_warning`. On exhaustion sub-agents take the **pack**, but not the two marketing
files while crm7#2664 and BSU#1258 are live lanes — one writer per file set — and maker ≠ verifier is
preserved by having a sub-agent make and this role verify.

**8.5 Carried forward.** `crm7-2654` (P1 security: base tenant roles can permanently delete or
overwrite stored documents via the Storage API) and `crm7-2656` are still `pending` with `prompt:
null`, no owner and no lane, so BLOCKER `82c2cf99` stands unactioned; the other four prompt-less rows
are correctly owned. `main_behind_dev_total` 578 → **591**, `prod_crm7_lag_commits` 183 → **199**,
production still serving `9a6c185` built 2026-09-11T12:04:04Z — widening. `staged_gitlinks_off_main`
**0**. The takeover plan's 1061-line maintained copy is still uncommitted because the daemon guard
denies mutating git for this role; the maker has the exact `git add`-first instruction and a
byte-identical backup at
`~/.agents/state/loop-contracts/takeover-plan-maintenance-20260917-FINAL-1061.md`.
