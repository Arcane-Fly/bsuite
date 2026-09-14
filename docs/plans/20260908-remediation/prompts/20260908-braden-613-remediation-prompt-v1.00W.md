---
kind: plan
authority: engineering
owner: bsuite
evidence:
  - scripts/check-plan-currency-markers.mjs
  - scripts/check-doc-classification.mjs
---

> **Current as of 2026-09-14:** This is an active engineering plan. Refresh its live issue and evidence before execution; this marker does not assert implementation or release completion.

# Kick off braden#613: [P2][site] Homepage service cards link to slugified /services/<title> paths that Service.tsx does not define — four dead-end routes (pre-existing since bdc1fd8)

Implement and verify https://github.com/GaryOcean428/braden/issues/613. This is one bounded issue in the existing canonical BSuite programme, not a launch of the whole backlog and not a replacement backlog. Re-read live issue/PR state and source; if a limb is already resolved, validate and reconcile exact evidence instead of rebuilding. Act after reading; do not stop at a plan or ask again whether to continue.

## Context, ownership, skills and paired tools

Repository: /home/braden/Desktop/Dev/bsuite/braden. Use an isolated worktree based on current development and preserve other lanes. Read parent/app AGENTS.md, CONTRIBUTING.md, relevant DESIGN.md, the BSuite truth index `bsuite_project_truth_index`, the current 370-row ledger, preserving the original 340 rows, and the 40-group feedback reconciliation. Objective lock: Preserve all BSuite work, consolidate safely through development then main, and reconcile and execute the existing canonical ledger plus 40 feedback groups without a replacement backlog.

Canonical dispatch owner: `codex-bsuite-closeout-01a09d84`. This row starts `pending`; implementation is unassigned until that owner claims it. Do not launch a duplicate writer. Dependencies/related rows: braden-610, braden-609, bsuite-3224. Feedback groups mapped by this reconciliation: 12, 13, 36. Feature-index and feedback-group counts remain separate denominators from issue rows.

Invoke **agent-run-master first**, then **agent-mem-truth** and **agent-skl-find**. Load and follow the dedicated applicable skills below from `/home/braden/.agents/skills`; record actual invocation receipts and currently available MCP/CLI routes. Current operator routing overrides stale prompt-era model assumptions.

- **agent-run-master** — load `/home/braden/.agents/skills/agent-run-master/SKILL.md` and apply only its relevant scope.
- **agent-mem-truth** — load `/home/braden/.agents/skills/agent-mem-truth/SKILL.md` and apply only its relevant scope.
- **agent-skl-find** — load `/home/braden/.agents/skills/agent-skl-find/SKILL.md` and apply only its relevant scope.
- **plan-roadmapping** — load `/home/braden/.agents/skills/plan-roadmapping/SKILL.md` and apply only its relevant scope.
- **git-github-issues** — load `/home/braden/.agents/skills/git-github-issues/SKILL.md` and apply only its relevant scope.
- **bsuite-fix-the-class-not-the-page** — load `/home/braden/.agents/skills/bsuite-fix-the-class-not-the-page/SKILL.md` and apply only its relevant scope.
- **bsuite-react-testing** — load `/home/braden/.agents/skills/bsuite-react-testing/SKILL.md` and apply only its relevant scope.
- **copy-editing** — load `/home/braden/.agents/skills/copy-editing/SKILL.md` and apply only its relevant scope.
- **agent-definition-of-done** — load `/home/braden/.agents/skills/agent-definition-of-done/SKILL.md` and apply only its relevant scope.
- **bsuite-false-complete-gates** — load `/home/braden/.agents/skills/bsuite-false-complete-gates/SKILL.md` and apply only its relevant scope.

Use at most two active implementation lanes estate-wide and one writer per repository/worktree. Reviewers remain read-only. Preserve accepted exact-SHA evidence, current production holds, client data, migration history, and unresolved failure paths.

## Issue-specific acceptance

1. Every homepage service-card href resolves to a defined, truthful service using the same canonical CMS/static mapping.
2. Keep indexed service URLs stable across prerender, sitemap, and llms surfaces.
3. Add a route-resolution regression test and verify each card journey on development and production SHAs.

Re-read the full live issue body below before implementation. Treat historical SHAs, paths, counts, screenshots, live-schema claims, and model statements as evidence to refresh, not as current truth. Resolve cited paths and verify live catalog/runtime state where the issue requires it. Credit working limbs and keep missing evidence explicit.

For any user-facing or page-consumed change, declare `ui_touched`, enumerate sibling surfaces by more than one axis, and perform the deployed exact-SHA D8 journey with the intended role, save/reload, negative authority, failure/retry, responsive widths, both themes, and a lossless return. For infrastructure, CI, security, or migration work, use positive controls that prove the guard bites and verify the actual consumer/runtime result.

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

This is the live GitHub issue body captured during the 2026-09-14 records reconciliation. It does not override later operator instructions or current repository rules. Live issue: https://github.com/GaryOcean428/braden/issues/613. Captured GitHub updatedAt: 2026-09-09T09:02:17Z.

---

Found while completing braden#611 (positioning sweep, worker report 2026-09-09).

`src/pages/Services.tsx` reads the CMS `services` table (4 rows) and builds card links through `PATH_BY_TITLE`; none of the CMS titles match the map, so every card falls back to a slugified path such as `/services/custom-saas-development`. `src/pages/Service.tsx` (route `/services/:serviceId`, `src/Routes.tsx` L135) only defines `compliance`, `mentoring`, `technology`, `future-services` — so the four homepage service cards land on a route with no `serviceData` entry. Pre-existing on production (commit `bdc1fd8` "wire Services.tsx to the CMS services table"); the positioning sweep preserved the four real slugs and their copy (#611) but did not change the wiring.

Requirement: the public product/service journeys must work end to end (bsuite#3224 interlinking programme, braden#609/#610 scope). Wire `Service.tsx` to the same CMS source (or map the CMS titles to the four canonical slugs), keep the four indexed URLs stable (prerender list, sitemap, llms.txt), add a test that every homepage card href resolves to a defined service, and verify on the deployed preview + production at the exact SHA.

Owner: Claude Desktop supervisor (remediation ledger `lane_queue`: `braden-services-routing`). Programme bsuite#3204.
