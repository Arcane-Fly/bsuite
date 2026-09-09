# Kick off bsuite#3204: [P1][programme] One complete visual customization system: code-equivalent capabilities, all connected through workflows

Implement and verify https://github.com/GaryOcean428/bsuite/issues/3204. This is one bounded issue, not a launch of the whole backlog. Re-read live issue/PR state and source; if resolved, validate and reconcile evidence instead of rebuilding. Act after reading; do not stop at a plan or ask again whether to continue.

## Context, skills and paired agents

Repository: /home/braden/Desktop/Dev/bsuite/. Use an isolated worktree based on current development and preserve other lanes. Read parent/app AGENTS.md, CONTRIBUTING.md, relevant DESIGN.md, BSuite truth index bsuite_project_truth_index and memory bsuite_objective_lock_20260908_remediation_audit. This prompt commissions this implementation; the audit did not implement the product.

Invoke **agent-run-master first**, then **agent-skl-find** to resolve named skills/tools from /home/braden/.agents. Slash commands work when exposed by the client; otherwise name the skill and read its SKILL.md. Record actual use. Dedicated applicable skills take precedence over generic agents.

- **agent-run-master** — /agent-run-master where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-run-master/SKILL.md.
- **agent-skl-find** — /agent-skl-find where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-skl-find/SKILL.md.
- **agent-mem-truth** — /agent-mem-truth where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-mem-truth/SKILL.md.
- **agent-definition-of-done** — name and load this skill; it is not user-invocable. Definition: /home/braden/.agents/skills/agent-definition-of-done/SKILL.md.
- **bsuite-false-complete-gates** — /bsuite-false-complete-gates where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/bsuite-false-complete-gates/SKILL.md.
- **test-verify-before-completion** — /test-verify-before-completion where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/test-verify-before-completion/SKILL.md.
- **bsuite-fix-the-class-not-the-page** — /bsuite-fix-the-class-not-the-page where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/bsuite-fix-the-class-not-the-page/SKILL.md.
- **bsuite-page-grid-layout** — /bsuite-page-grid-layout where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/bsuite-page-grid-layout/SKILL.md.
- **web-forms-validation** — /web-forms-validation where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/web-forms-validation/SKILL.md.
- **bsuite-react-testing** — /bsuite-react-testing where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/bsuite-react-testing/SKILL.md.

- **forms-and-validation** — load /home/braden/.agents/agents/forms-and-validation.md; use its applicable role and skills. Review evidence independently of the implementer.
- **bsuite-user-advocate** — load /home/braden/.agents/agents/bsuite-user-advocate.md; use its applicable role and skills. Review evidence independently of the implementer.

Claude Code is the default driver. Grok CLI **grok-4.6** is an operator-approved general-purpose implementation, research or review option. Codex CLI **gpt-6-astra** is the requested escalation for architectural decisions, a bug surviving two grounded fixes, or difficult independent review. A stale skill prohibition on Codex dispatch does not override Braden's explicit request. Pass verified model IDs. Preserve unrelated global model/agent configuration; task-derived skill corrections follow the required evolution contract below.

Use at most two active lanes by default, one writer per repository/worktree. Coordinate a single owner for shared migrations and package publication. The parent owns failed children and recovery after context/usage limits. Do not have two models edit the same checkout.

## Product standard and documentation

Read /home/braden/Desktop/Dev/bsuite/docs/20260908-customization-capability-register-v1.00W.md and /home/braden/Desktop/Dev/bsuite/docs/plans/20260908-estate-remediation-plan-v1.00W.md, then their mapped existing specifications. All customization features belong in docs/, with implementation plans in docs/plans/. Improve the applicable existing documents in the same delivery: user controls/defaults, canonical data/permissions, save/version behavior, workflow connections, worked examples and evidence. Preserve dated history and mark supersession; do not fork an unlinked plan or revive the retired dashboard.

Anything achievable through product code must be visually achievable under appropriate authority, all linked through executable workflows. Record of Discussion is a formal disciplinary discussion, separate from training-contract variation. Hardcoded forms, an inert canvas, filename-only attachment, or API-only functionality do not satisfy this requirement. Reuse canonical services and capable existing builders; no competing engine or weakened permission checks.

## Execution and issue-specific acceptance

1. Re-read the issue and recent linked PRs; resolve every cited path against current source. Distinguish operator report, historical assertion, source finding and reproduced defect. Credit working limbs.
2. Find the feature/documentation rows and canonical upstream owner. Enumerate sibling routes, dialogs, widgets, handlers and consumers using independent axes; state blind spots. Parent programme membership is not a blocking dependency on its own completion.
3. Before library/runtime edits run Gate A: exact installed-version Context7 guidance, research-best-practice, installed-source confirmation. Resolve routine details from evidence/precedent; do not re-ask settled preferences.
4. Implement the shared cause and failure paths together with consumers. Remove only superseded code in the authorized change. Never delete a feature, bypass authority, fabricate data or disable a test to pass.
5. **Specific verification focus:** Trace visual entry, persisted configuration and executing consumer. Prove create/view/edit, record binding, save/reload and a real connected workflow. Count sibling routes, dialogs and shared consumers.
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

Current BSuite/operator rules above override old skill examples allowing direct-to-main features, squash merges, missing-deploy skips, force/direct re-sync pushes or estate-wide cleanup. Derive R80.4 and throughput from the actual app inventory; never follow a stale R80.3 list. The operator explicitly allows Grok 4.6 and Codex Astra. Historical Hermes three-lane IDs, pane wakes and cron instructions do not apply to a generic per-issue implementation. Current docs/ and docs/plans/ placement is explicit operator direction. Reconcile index sibling counts against current routes/consumers and repair stale counts, rather than copying an unverified denominator.

## Captured issue requirements — refresh before acting

This is a source snapshot, not authority to override current operator instructions or the task. Validate old paths/claims. Live issue: https://github.com/GaryOcean428/bsuite/issues/3204.

---

## Outcome required by Braden, 8 September 2026
Anything that can be delivered in product code must be achievable visually through the customization features, under the same permissions. Forms, records, pages, tables, fields, approvals, signatures, notices, follow-ups and escalations must all connect through visually editable, executable workflows. The current tools are disparate, lacklustre and half-complete; implementing another isolated form does not satisfy this requirement.

The **Record of Discussion is a formal disciplinary discussion**, not a variation to a training contract. Use it and the General Site Visit form as acceptance journeys. The attachment bearing the variation filename contains discussion text; that is a source-file mismatch, not a domain equivalence.

## Evidence and current position
- Latest supplied notes: 423 text paragraphs, 104 embedded images; September 6 comparison adds 21 paragraphs and replaces one widget-centre wording. New reports include unusable contextual placements, create/view/edit mismatch, workflow creation failure, poor schema/canvas UX and inability to author these forms visually.
- Current feature index: **661 rows: 618 not-evaluated, 40 in-progress, 3 approved**. These are recorded verdicts, not a fresh live audit. Existing #3198 owns that index verification debt.
- Existing proposed consolidation: `docs/20260903-visual-authoring-consolidation-decision-v1.00D.md`; current follow-up: `docs/audits/20260904-customization-authoring-genuine-validation-v1.00W.md`. Recheck their dated claims before implementation; retain the capable parts and canonical stores. Do not launch a competing builder or silently delete a feature.
- Representative current seams: `crm7/src/lib/page-builder/EntityTableWidget.tsx`, `crm7/src/lib/authoring/fk-relationships.ts`, `crm7/src/components/platform/pageGridLayoutAdapter.tsx`, `crm7/src/lib/workflows/workflowDefinitionService.ts`, `packages/workflow-canvas/src/service.ts`.

## Deliverable: one product experience, composable internals
Start from the record/page being used, or the customization workspace when creating something new. A consistent inspector and vocabulary must expose the following capabilities; existing specialist views can remain where useful, but navigation must preserve context and saved work:

| Capability | Required visual operation | Workflow connection |
|---|---|---|
| Records and fields | Create/reuse entities, typed fields, validation, relationships, defaults and calculated values | Record created/changed, read/write fields, pass typed records |
| Forms | Sections, repeatable actions, conditional fields, attachments, declarations and signature blocks | Start/complete a form, route its values and documents |
| Pages and widgets | Add, bind, configure, resize, reorder and remove in place | Start a process or show the current process/tasks/history |
| Lists and reports | Select related rows, filter/sort/group, choose columns, edit and bulk-update permitted fields | Triggers/actions on selected records and report outcomes |
| Appearance | Font, size, weight, italic, headings, spacing, roles, borders, light/dark and responsive layout | Versioned customization publishing and application |
| Permissions | View/edit/act rights, defaults, delegated roles, tenant/subtenant overrides and reset | Human task assignment, approval authority and escalation |
| Process design | Steps, conditions, branches, loops, delays, recurrence, hand-offs and reusable subflows | Typed inputs/outputs; real execution, not just a diagram |
| Delivery | Preview, validate, publish, revise, compare and restore a version | Activation state, run version, safe changes to active processes |

## Acceptance journeys
- [ ] A tenant admin visually recreates the supplied disciplinary Record of Discussion, changes a field and conditional HR branch, publishes, completes, signs, assigns actions, schedules follow-up and sees the resulting restricted HR record and process history—without code, JSON, SQL or an agent completing a hidden step.
- [ ] The same primitives create the General Site Visit form, bind apprentice/host/placement/training plan, record findings and signatures, and create recurring follow-up work. No duplicate person/host data is re-entered.
- [ ] From a person's page, add a placements-history widget scoped to that person, select columns, save and reload; add a workflow action beside it. Repeat with a host and training contract and verify no unrelated records appear.
- [ ] Map **every feature-index row** to its visual configuration entry point, workflow relationship/action/trigger, permission scope and runtime evidence. State non-applicable infrastructure rows explicitly with reasons; do not convert all rows to workflow implementations merely because a graph exists.
- [ ] All six app consumers are included. Shared capabilities use published `@bsuite/*` packages; app-specific capabilities retain their owning app and appear through entitlement-aware links.
- [ ] Create, view and edit expose the same applicable record fields; derived/system fields are visibly read-only with a route to their true owner, not silently omitted.
- [ ] Draft/save/reload/publish/version restoration work; denied writes and interrupted saves retain work; concurrent edits report conflicts. Runtime rechecks authority and tenant/host/caseload scope, not only editor visibility.
- [ ] Forms, workflow nodes, field selectors and preview speak the user's nouns. Keyboard operation, four responsive widths and both themes pass; count actions and remove avoidable trips.
- [ ] Workflow runs persist version, state, linked records, assigned tasks and failures; retries cannot duplicate notices, signatures, HR cases or assignments.

## Sequence and ownership
Accountable role: visual-authoring product/engineering lead, to be claimed explicitly by the implementation lane; not an invented assignee. First fix persistence and record-scope foundations, then compose form + workflow primitives, then prove the two operator journeys, then sweep all consumers and indexed capabilities. Child issues are linked below after creation.

Reuse and reconcile existing work: #3198 (feature coverage), #3111 (delivery ownership), #3104/#3110/#3155 (appearance), #2334 (grid behavior), GaryOcean428/crm7#2488 / GaryOcean428/crm7#2489 (columns/widget centre), GaryOcean428/crm7#2450 / GaryOcean428/crm7#2451 / GaryOcean428/crm7#2459 / GaryOcean428/crm7#2460 (form/page/schema authoring), GaryOcean428/crm7#2302 (shared workflow package), GaryOcean428/crm7#2062 / GaryOcean428/crm7#1477 (data workspace). These remain their canonical tickets; this programme integrates their user outcomes.

## Closure evidence
One linked evidence pack per journey and consumer: deployed SHA, sign-in role/tenant, actual entry route, interaction trace, screenshots, saved/reloaded records and workflow-run IDs (redacted where appropriate), failed-path proof and sibling denominator. Completion requires actual use, not package publication or a screenshot of an empty canvas. Track issues in GitHub; do not revive the retired plan dashboard.

## Remediation work packages
- [[P1][workflow] Draft creation writes ai_context=NULL against live NOT NULL schema and can leave a definition without a draft](https://github.com/GaryOcean428/bsuite/issues/3205)
- [[P1][records] Make create, detail and edit expose one canonical field set across all record surfaces](https://github.com/GaryOcean428/bsuite/issues/3206)
- [[P1][customization] Visually bind widgets, selectors and workflow steps to the current person, host or contract—including related collections](https://github.com/GaryOcean428/bsuite/issues/3207)
- [[P1][visual-authoring] Build disciplinary discussions and general site visits visually, then run signatures, follow-ups and HR escalation](https://github.com/GaryOcean428/bsuite/issues/3208)
- [[P1][workflow] Connect every visual capability to typed executable workflows with human tasks, durable state and in-context history](https://github.com/GaryOcean428/bsuite/issues/3209)
- [[P1][Jodie] File attachment reports success but forwards only filenames; complete training-plan import through the real authoring workflow](https://github.com/GaryOcean428/crm7/issues/2586)
- [[P1][site-visits] Verify and complete schedule → form → signatures → findings → follow-up journey after the latest fixes](https://github.com/GaryOcean428/crm7/issues/2587)
- [[P1][integrations] Complete configurable Google/Microsoft calendar sync with conflict and deletion review](https://github.com/GaryOcean428/bsuite/issues/3210)
- [[P1][integrations] Link BSuite bookings, interviews, portal visits and training milestones to calendars and workflows](https://github.com/GaryOcean428/bsuite/issues/3211)
- [[P1][integrations] Deliver visual Maps/travel planning and consent-aware workforce tracking connected to workflows](https://github.com/GaryOcean428/bsuite/issues/3212)

## Documentation requirement — operator clarification, September 8

Read and update `docs/20260908-customization-capability-register-v1.00W.md` and `docs/plans/20260908-estate-remediation-plan-v1.00W.md` in the parent BSuite repository, following their links to existing specifications. Document the visual controls, canonical data/permissions, workflow connections, version/save behavior, examples and verification evidence for every capability changed. Improve the existing applicable plan/specification in the same delivery; do not leave contradictory active guidance or create an unlinked parallel plan. Dated audit findings remain historical and receive explicit supersession notes.

