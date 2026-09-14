# Kick off bsuite#2560: crm7: 171 of 292 page-builder slots draw a box inside a box — and the split is per-page, so there is no single lever

Implement and verify https://github.com/GaryOcean428/bsuite/issues/2560. This is one bounded issue, not a launch of the whole backlog. Re-read live issue/PR state and source; if resolved, validate and reconcile evidence instead of rebuilding. Act after reading; do not stop at a plan or ask again whether to continue.

## Context, skills and paired agents

Repository: /home/braden/Desktop/Dev/bsuite/. Use an isolated worktree based on current development and preserve other lanes. Read parent/app AGENTS.md, CONTRIBUTING.md, relevant DESIGN.md, BSuite truth index bsuite_project_truth_index and current memory bsuite_session_20260914 (the dated bsuite_objective_lock_20260908_remediation_audit is historical context). This prompt commissions this implementation; the audit did not implement the product.

Invoke **agent-run-master first**, then **agent-skl-find** to resolve named skills/tools from /home/braden/.agents. Slash commands work when exposed by the client; otherwise name the skill and read its SKILL.md. Record actual use. Dedicated applicable skills take precedence over generic agents.

- **agent-run-master** — /agent-run-master where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-run-master/SKILL.md.
- **agent-skl-find** — /agent-skl-find where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-skl-find/SKILL.md.
- **agent-mem-truth** — /agent-mem-truth where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-mem-truth/SKILL.md.
- **agent-definition-of-done** — name and load this skill; it is not user-invocable. Definition: /home/braden/.agents/skills/agent-definition-of-done/SKILL.md.
- **bsuite-false-complete-gates** — /bsuite-false-complete-gates where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/bsuite-false-complete-gates/SKILL.md.
- **test-verify-before-completion** — /test-verify-before-completion where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/test-verify-before-completion/SKILL.md.
- **check-feature-parity** — /check-feature-parity where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/check-feature-parity/SKILL.md.
- **bsuite-fix-the-class-not-the-page** — /bsuite-fix-the-class-not-the-page where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/bsuite-fix-the-class-not-the-page/SKILL.md.
- **test-qa-and-verification** — name and load this skill; it is not user-invocable. Definition: /home/braden/.agents/skills/test-qa-and-verification/SKILL.md.

- **bsuite-platform** — load /home/braden/.agents/agents/bsuite-platform.md; use its applicable role and skills. Review evidence independently of the implementer.
- **bsuite-user-advocate** — load /home/braden/.agents/agents/bsuite-user-advocate.md; use its applicable role and skills. Review evidence independently of the implementer.

Codex in the IDE coordinates this phase. Claude is unavailable. Do not dispatch external Codex CLI workers. Use deterministic scripts for mechanical tasks, low-tier models for bounded classification, standard-tier models for scoped implementation, and high/frontier only for justified hard planning or independent review. Verify actual Grok/Gemini/Qwen model IDs and access before dispatch; never silently fall back to paid API usage. Cap two active workers by default with one writer per worktree. Read the current [IDE kickoff](../../20260914-codex-ide-closeout-refined-v1.00W.md) and the parent remediation-execution rule before acting.

Use at most two active lanes by default, one writer per repository/worktree. Coordinate a single owner for shared migrations and package publication. The parent owns failed children and recovery after context/usage limits. Do not have two models edit the same checkout.

## Product standard and documentation

Read /home/braden/Desktop/Dev/bsuite/docs/20260908-customization-capability-register-v1.00W.md and /home/braden/Desktop/Dev/bsuite/docs/plans/20260908-estate-remediation-plan-v1.00W.md, then their mapped existing specifications. All customization features belong in docs/, with implementation plans in docs/plans/. Improve the applicable existing documents in the same delivery: user controls/defaults, canonical data/permissions, save/version behavior, workflow connections, worked examples and evidence. Preserve dated history and mark supersession; do not fork an unlinked plan or revive the retired dashboard.

Anything achievable through product code must be visually achievable under appropriate authority, all linked through executable workflows. Record of Discussion is a formal disciplinary discussion, separate from training-contract variation. Hardcoded forms, an inert canvas, filename-only attachment, or API-only functionality do not satisfy this requirement. Reuse canonical services and capable existing builders; no competing engine or weakened permission checks.

## Execution and issue-specific acceptance

1. Re-read the issue and recent linked PRs; resolve every cited path against current source. Distinguish operator report, historical assertion, source finding and reproduced defect. Credit working limbs.
2. Find the feature/documentation rows and canonical upstream owner. Enumerate sibling routes, dialogs, widgets, handlers and consumers using independent axes; state blind spots. Parent programme membership is not a blocking dependency on its own completion.
3. Before library/runtime edits run Gate A: exact installed-version Context7 guidance, research-best-practice, installed-source confirmation. Resolve routine details from evidence/precedent; do not re-ask settled preferences.
4. Implement the shared cause and failure paths together with consumers. Remove only superseded code in the authorized change. Never delete a feature, bypass authority, fabricate data or disable a test to pass.
5. **Specific verification focus:** Trace the actual outcome through entry point, persistence and consumers. Reproduce the cited defect, repair its shared cause and prove success plus failure/retry across enumerated siblings.
6. Fulfil every current acceptance criterion below. For user-facing work exercise the actual deployed d.* journey on its exact deployed SHA with the intended role, save/reload and downstream IDs. Test failure/retry, denied permissions, keyboard and responsive use. Count siblings and intent-to-result actions. Ask literally whether finishing requires leaving the page; prefer inline creation or prove automatic lossless return with the new detail applied.
7. Use signed commits and PRs through development; never direct-push main. Verify actual published package/consumer versions and live schema where applicable. Follow current deployment and bot-review gates. Do not expand scope to production data cleanup, real disciplinary decisions or external messages without authorization.
8. Update the same issue and applicable docs with final SHA, routes/roles, exact tests/output, screenshots, saved/run IDs and failure/consumer evidence. Run agent-definition-of-done and bsuite-false-complete-gates; explicitly declare UI impact. Missing runtime evidence is a precise remaining blocker, never a done claim. Parent owns recovery.

## Escalation packet for Grok or Astra

Carry this prompt plus isolated worktree/repo/branch; exact HEAD and dirty status; issue/specification links; reproduced trigger; exact error/output; current relevant paths; attempted fixes and why they failed; tests run; canonical owner/schema evidence; preserved drafts/data; remaining acceptance criteria; and one precise decision to resolve. Stop the prior writer first. Review model output and diffs before accepting; a model verdict does not authorize merge.

## Mandatory release, operational closeout and skill evolution — contract v2

**The destination is production through development, then verified operational closeout.** Launching this implementation prompt carries Braden's direction to complete that sequence for this issue and its affected consumers; do not stop at a development merge or re-ask the already specified destination. This does not authorize unrelated releases, destructive production-data changes, genuine disciplinary decisions or messages to third parties. A real policy/access/approval blocker stops the affected transition and is reported precisely; it is never waived by this text.

### Execute this skill chain

Invoke agent-run-master → agent-mem-truth → agent-skl-find → **ops-open-run** with feature scope and the BSuite profile; record the opening done-contract, issue, owned repositories, affected consumers, skill/MCP/CLI routing and UI impact before edits. Use the dedicated implementation/research/red-team/testing skills matched to the issue. Re-inventory on task-class/module/tool changes.

Then invoke **ops-ship-close-out** as the closeout orchestrator with that same feature scope and done-contract. Its release work invokes **bsuite-ship-visual-promote** and **ops-ship-all-apps** for the affected multi-app/package-consumer release. For a genuinely single-app change, explicitly load ops-ship-all-apps, record its scoped applicability decision, and use bsuite-ship-visual-promote as the single-change driver; do not mass-ship unrelated dirty apps to satisfy a skill name. Never recursively restart completed macro phases.

Load these exact canonical definitions through agent-skl-find: /home/braden/.agents/skills/ops-open-run/SKILL.md; /home/braden/.agents/skills/ops-ship-all-apps/SKILL.md; /home/braden/.agents/skills/ops-ship-close-out/SKILL.md; /home/braden/.agents/skills/bsuite-ship-visual-promote/SKILL.md; /home/braden/.agents/skills/git-github-issue-closeout/SKILL.md; /home/braden/.agents/skills/agent-definition-of-done/SKILL.md; /home/braden/.agents/skills/bsuite-false-complete-gates/SKILL.md. Use slash commands only where actually exposed and user-invocable; otherwise name/read/execute the skill.

**chains_with and related_skills are discovery metadata, not executed chains.** Explicitly invoke the required macro/micro-skills and record receipts: skill name, phase, inputs, relevant tools, evidence path, verdict and next consumer. Missing Skill-tool support means directly follow the canonical procedure and record that mechanism, not pretend a tool was called. Missing MCP/auth/model capacity requires a verified equivalent or a specific blocker, not skipped coverage.

### Release states — this order overrides conflicting older examples

1. **PREPARED:** confirm current main/development state and protected-branch rules; preserve production-only work, live lanes and dirty changes. Derive apps from current .gitmodules, identify all affected consumers, and own an isolated development-based feature worktree. Use signed commits; verify signatures across the introduced range, not only the signed merge HEAD. Complete applicable build/lint/type/test, schema/policy, package and adversarial checks. Identify operational dependencies, monitoring and a credible rollback path.
2. **DEVELOPMENT_MERGED:** update the feature branch against its target, resolve actionable human/bot review comments on the final code, pass required checks and merge its PR into development. Use gh pr merge --merge; never --squash, --admin, or --delete-branch on a long-lived branch. Feature → main is forbidden. No direct pushes to protected long-lived branches.
3. **DEVELOPMENT_VERIFIED:** wait for each affected development deployment and match its live SHA to the merge being tested. Resolve actual deployment/project mappings even if local Vercel metadata is missing. Perform authenticated d.* visual/functional verification as the intended roles: both themes, four responsive widths, appropriate tenant/delegation contexts, full create/save/reload/workflow effects, negative authority and failure/retry. Use bsuite-ship-visual-promote and bsuite-false-complete-gates. FAIL, UNKNOWN or INCOMPLETE blocks promotion. Agent-performed evidence is required; never hand the visual test back to Braden. If the tested code/target changes, re-evaluate affected evidence.
4. **PRODUCTION_PROMOTED:** only after development verification, open development → main (or established master) PRs for the owned release. Review the full promotion diff so unrelated unfinished work is not swept in. Update against the target and resolve actionable reviews/checks before each merge; a changed SHA requires fresh relevant validation. Merge commits only, no bypass, no direct production push.
5. **PRODUCTION_VERIFIED:** wait for actual production readiness, verify exact deployed SHA, runtime logs/health, critical user journeys and affected integrations/queues/schedules. Prove schema intent, deployed functions, secrets/config references, published package contents and resolved consumer lockfiles where applicable. A migration ledger, npm export, green build or provider READY alone is insufficient. Use the authorized rollback/recovery path on failure, then re-verify; do not claim done after rollback leaves the issue unresolved.
6. **CLOSED_OUT:** finish ops-ship-close-out correctness, architecture, experience, currency, records, owned-artifact disposal and convergence. Run git-github-issue-closeout; reconcile GitHub issues/PRs, docs/plans, feature/component registries and actual deployment evidence. An issue automatically closed on development merge does not prove production completion: preserve the release evidence/remaining status on the issue or owning programme until production is verified. Use established set-dod-status only after gate APPROVE; never mass-approve untested rows. Compare development/main contents and both log directions: content-identical promotion merge-commit debt is not a reason for endless back-merges. Reconcile genuine divergent changes through protected PRs. Clean only owned, proven-merged, inactive feature branches/worktrees; preserve live/unrelated work and both long-lived branches. Do not rewind gitlinks.

### DoD receipts and final verdict

Run **agent-definition-of-done** and **bsuite-false-complete-gates**, with the skill-owned verifiers and fresh evidence. D1–D7 always; explicitly declare ui_touched and evaluate every applicable D8 limb, including current sibling denominator, real entry/wiring, clarity, powerful common path, lossless round trip, better alternative and action count. D9 requires actual authorized use/consumer resolution/engine run as applicable, with query/results; D10 requires owned temporary-artifact inventory and deletion evidence. Do not invent non-demo production transactions to pass D9.

Pre-promotion readiness is not final completion: production-dependent D9 can only finish after the production state exists. Do not demand a final production-use APPROVE before allowing an otherwise validated promotion, and do not call readiness APPROVE for the whole issue. Final ops-ship-close-out verdict comes from gate_report.py with all required evidence and clean child verdicts. SEND_BACK stays parent-owned with the exact failed gate, retained work and next recovery action. No “done”, “shipped” or issue-scope closure claim before final APPROVE and production proof.

### Skill interoperability and evolution are required work

At start and each major phase, load bsuite_skill_mcp_pairings and /home/braden/.agents/skills/_shared/skill-mcp-pairings.json; route with ops-open-run's route.mjs plan and verify actual connected tools, installed skills, agent paths and model IDs. Map each handoff's producer/output/consumer and acceptance gate; do not rely on chaining beyond the client's stacking limit or on non-user-invocable slash expansion. Keep high-impact actions serial and at most two active lanes by default.

For each missing capability, bad trigger, conflicting instruction, broken pairing or repeat failure uncovered, record the concrete example and improve the appropriate canonical layer in the same task: deterministic check first; shared script/reference next; SKILL.md judgment only when neither suffices. Update relevant related_skills/chains_with/suggested_agents or routing pairings when supported by evidence; do not create a second skill copy or weaken the gate. Read the hub's instructions/protection policy before editing global skills; preserve unrelated agent/model configuration. If another owner or a real protection rule prevents the correction, record a named linked follow-up and keep the explicit safe override in this task.

Verify every edited skill with its scripts/verify.sh and relevant trigger/chain evaluations; update agent discovery/sync only when the change requires it. Log actual use/steer/false_complete through skill-event.sh. Run ops-open-run's route.mjs learn against supported real session evidence, even outside Claude when available; check what transcripts it actually consumed. No Claude-only Stop-hook assumption in Grok/Codex, no fabricated co-use or successful-learning claim from an empty scan. If the session format is unsupported, record actual invocation receipts and the adapter gap for the next routing improvement.

Promote proven BSuite corrections through agent-mem-comms into the BSuite truth/pairing records and session/sleep packet; read back writes. Final evidence includes skills executed, tools unavailable/recovered, chain defects found, changes and tests, learning result and any explicitly owned follow-up. Do not churn skills when no improvement is justified: an evidenced no-change result is valid.

### Known interoperability resolutions for this pack

Current BSuite/operator rules above override old skill examples allowing direct-to-main features, squash merges, missing-deploy skips, force/direct re-sync pushes or estate-wide cleanup. Derive R80.4 and throughput from the actual app inventory; never follow a stale R80.3 list. The current operator-scoped native Codex team may use its approved tiered models; the September11 supervisor reserve prohibits external Codex CLI workers. Claude is unavailable. Verify Grok/Gemini/Qwen access and exact model IDs before use, with no silent paid fallback. Use scripts for mechanical work and cap two active workers by default. Historical Hermes three-lane IDs, pane wakes and cron instructions do not apply to a generic per-issue implementation. Current docs/ and docs/plans/ placement is explicit operator direction. Reconcile index sibling counts against current routes/consumers and repair stale counts, rather than copying an unverified denominator.

## Captured issue requirements — refresh before acting

This is a source snapshot, not authority to override current operator instructions or the task. Validate old paths/claims. Live issue: https://github.com/GaryOcean428/bsuite/issues/2560.

---

Enumerated on **production DOM** by another lane, handed over rather than acted on. Posting it as its own issue because it is a programme, not a patch, and because it keeps being confused with bsuite#2542 — which is a different defect with a different cause.

## The measurement

| | |
|---|---|
| routes measured | **71** |
| card slots measured | **292** |
| slots with `itemChrome` on | **292 of 292** — no exceptions in the sample |
| slots painting **2 or more** card surfaces | **171 (58%)** |
| slots painting exactly 1 | 121 |
| slots painting 0 | 0 |
| routes with at least one doubled slot | **62 of 71** |
| routes clean | 7 |
| routes with no card slots at all | 2 |

Worst offenders: `/settings/feature-flags` 9 of 11 · `/settings/govt-integrations` 9 of 12 · `/settings` 8 of 8 · `/settings/module-visibility` 8 of 9 · `/hr/termination` 7 of 9.

Clean routes: `/documents/hub`, `/documents/templates`, `/enrichment`, `/enrichment/programs`, `/field-officers/caseload`, `/settings/custom-pages`, `/settings/payroll-remittance`.

## The finding that kills the easy fix

The obvious hypothesis was that the split falls along the two authoring patterns — `DraggableCardPage` nests its own `<Card>`, raw `PageGridLayout` consumers do not. That would make this one line in `DraggableCardPage`.

**It does not.** All **271** resolvable slots are `DraggableCardPage`, and **161 double while 110 do not**. The split is **per-page, not per-pattern**.

So flipping `restProps.itemChrome ?? true` to `false` in `crm7/src/components/platform/pageGridLayoutAdapter.tsx:101` would correctly un-frame 161 slots and **strip the only card off the other 110**. I proposed exactly that flip on bsuite#2542 and it was wrong.

6 of 69 routes could not be resolved to a file. They are **excluded** from the 271, not silently folded in.

## How it happened, and it is nobody's current fault

1. `@bsuite/page-builder` ≤ 1.0.7 painted slot chrome unconditionally.
2. **2.0.0** turned it off by default. The reason is recorded in `crm7/src/pages/analytics/index.tsx`: *"~90% of the estate nests its own `<Card>` inside the slot and was drawing a box inside a box."*
3. crm7 then set `itemChrome` page-wide in the adapter, to restore the ~45 slots 2.0.0 had left bare.

Both changes were correct in isolation. Their **composition** re-created the exact defect 2.0.0 existed to fix.

## The direction is already ruled

`analytics/index.tsx` settles it: *"Giving the widget its own `<Card>` is durable, is what the other ~988 crm7 slots already do, and carries the 12px card radius ruling for free."*

Read with the operator ruling of 2026-08-26 in `crm7/src/components/ui/card.tsx` — corner radius 12, *"12 INSIDE 24 is the point… a card nested in it needs outer minus padding to sit concentrically"* — **concentric nesting is intended design**. The defect is never that two surfaces exist; it is that here the outer one is redundant and its inset is uneven.

**Endgame:** adapter default `false`, and the ~110 bare slots gain a `<Card>` of their own.

## Not the same defect as bsuite#2542

| | #2542 | this |
|---|---|---|
| symptom | **bottom edge only** — three sides show the border, the bottom shows border **+** remainder | a full second card outline, all four sides |
| cause | `computeAutoHeightRows` rounds up to whole 32px rows; `h-full` cannot resolve against the unconstrained `measureRef` wrapper | 110 of 271 slots have no card of their own, and the adapter chrome the other 161 duplicate |
| measured | 6.6px at 1440 and 768, 28.6px at 1024, on `/placements` | 171 of 292 slots, 62 of 71 routes |
| reachable by | `@bsuite/page-builder` 2.3.x | a per-slot refactor plus an adapter default change |

`2.3.1` changes the row arithmetic and **cannot** remove a second painted surface. If re-measuring the bottom border after 2.3.1 shows it fixed, that settles #2542 and leaves these 171 untouched. Neither issue closes the other.

## Why it is not being fixed tonight

A ~110-slot refactor plus an adapter default flip, with an estate-wide visual consequence. `page-builder` 2.0.0 is the standing reminder of what a confidently-scoped chrome change costs here — it discarded every saved layout across 1,729 cards.

## Related

- Operator ask **D-136** — *"Doubled bottom border gone, estate-wide"* — is cross-cutting and names every card surface, so it covers both this and #2542.
- bsuite#2542 for the row-quantisation defect.
