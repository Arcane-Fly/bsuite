# Estate remediation implementation plan

> **9 September execution update:** use the [shared remediation rules](../../.agents/rules/remediation-execution.md)
> and the Claude handover section below. The expanded protected queue contains 338 prompts;
> the 332 counts below describe the original intake. Current completion is measured from
> criterion evidence and GitHub, never inferred from those historical counts.

> **Release contract v2, 8 September:** all 332 prompts now require development PR → verified d.* deployment → production PR → production verification → ops-ship-close-out and final DoD. They explicitly route ops-ship-all-apps for affected multi-app releases and require evidenced skill interoperability/evolution. [Read the mandatory contract](20260908-remediation/release-contract.md). Merely naming a skill or chains_with does not execute it.

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

Waves are dependency order, not permission to defer security or independently ready work. Parent [bsuite#3204](https://github.com/GaryOcean428/bsuite/issues/3204) is an umbrella, not a prerequisite requiring itself to close before children start. Field contracts and contextual bindings should share an agreed interface and can be developed in separate repositories only when ownership is safe. Do not dispatch all 332 prompts simultaneously.

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

- [Refined prompt used for this audit](20260908-remediation/refined-prompt.md).
- [Full launch index](20260908-remediation/README.md).
- [Related specification inventory](20260908-remediation/documentation-inventory.md).
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

Read hermes-queue.json and docs/plans/20260908-remediation/{release-contract.md,
hermes-queue-runbook.md,hermes-performance-review.md,sms-2594-goal-evidence.json} there.
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
