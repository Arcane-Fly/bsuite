---
kind: plan
authority: engineering
owner: bsuite
evidence:
  - scripts/check-plan-currency-markers.mjs
  - scripts/check-doc-classification.mjs
---

> **Current as of 2026-09-14:** This is an active engineering plan. Refresh its live issue and evidence before execution; this marker does not assert implementation or release completion.

# Continue conduit-705: [P1][auth] Recurring sign-in failure: overlapping OAuth flows and callback routing race

https://github.com/GaryOcean428/conduit/issues/705

## Current model routing

Codex in the IDE coordinates this phase. Claude is unavailable. Do not dispatch external Codex CLI workers. Use deterministic scripts for mechanical tasks, low-tier models for bounded classification, standard-tier models for scoped implementation, and high/frontier only for justified hard planning or independent review. Verify actual Grok/Gemini/Qwen model IDs and access before dispatch; never silently fall back to paid API usage. Cap two active workers by default with one writer per worktree. Read the current [IDE kickoff](../../20260914-codex-ide-closeout-refined-v1.00W.md) and the parent remediation-execution rule before acting.

## Execution contract

Continue the entire issue through signed feature PR → development → deployed real-user verification → production PR → verified production journey and operational closeout. Read live issue and PR state first; the issue snapshot below is preserved acceptance, not a claim of current completion. Preserve accepted exact-SHA evidence and existing implementations. Do not reimplement merged work.

Read repository AGENTS.md, CONTRIBUTING.md, DESIGN.md, AUTH_CANONICAL.md and .agents/rules/remediation-execution.md. Invoke agent-run-master, agent-mem-truth, agent-mem-comms and applicable dedicated skills. Use the BSuite silo only. Codex owns coordination (codex-bsuite-closeout-01a09d84); read bsuite_session_20260914 for the current handoff. Work only in an assigned isolated worktree after live ownership checks.

Maintain an acceptance matrix with current source/deployed SHAs, measured evidence, failures and unverified criteria. Count sibling surfaces; test negative, retry and reload behavior. ui_touched=true; require independent agent-definition-of-done D1–D8 and bsuite-false-complete-gates, plus applicable ops-open-run, ops-ship-all-apps and ops-ship-close-out. Missing evidence is not a pass. Keep the full issue open until its original scope is verified.

Futurebuild is a paying client: preserve records, relationships, documents, membership and access. Verify recovery coverage before tenant-affecting data changes. No production fixtures/reset/reseed or automatic historical-status rewriting. Supabase OAuth 2.1 PKCE remains canonical: own-origin storage, state/nonce validation and setSession bridge; no shared-domain cookie workaround. Safe necessary release work is authorized; repair failed gates rather than asking the user again for routine decisions.

## Current continuation pointers

Use auth-supabase and auth-e2e-sso-testing. Read parent PR3250 and the current auth package/Conduit callback work before editing. The platform-account happy path and CRM reload have been observed, but concurrent/expired/denied/network-retry flows, both authorized subtenant accounts, exact package provenance and production acceptance remain required. Development Conduit CRM/R8 navigation overrides were corrected and deployment dpl_9b9R8Wj9UsCczBUnyL645tDSQzhm verified; do not undo them. Read current issue comments for evidence boundaries. Never log credentials or tokens.

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

Run the verifier documented in each edited skill's SKILL.md and the relevant trigger/chain evaluations; update agent discovery/sync only when the change requires it. Log actual use/steer/false_complete through skill-event.sh. Run ops-open-run's route.mjs learn against supported real session evidence, even outside Claude when available; check what transcripts it actually consumed. No Claude-only Stop-hook assumption in Grok/Codex, no fabricated co-use or successful-learning claim from an empty scan. If the session format is unsupported, record actual invocation receipts and the adapter gap for the next routing improvement.

Promote proven BSuite corrections through agent-mem-comms into the BSuite truth/pairing records and session/sleep packet; read back writes. Final evidence includes skills executed, tools unavailable/recovered, chain defects found, changes and tests, learning result and any explicitly owned follow-up. Do not churn skills when no improvement is justified: an evidenced no-change result is valid.

### Known interoperability resolutions for this pack

Current BSuite/operator rules above override old skill examples allowing direct-to-main features, squash merges, missing-deploy skips, force/direct re-sync pushes or estate-wide cleanup. Derive R80.4 and throughput from the actual app inventory; never follow a stale R80.3 list. The current operator-scoped native Codex team may use its approved tiered models; the September11 supervisor reserve prohibits external Codex CLI workers. Claude is unavailable. Verify Grok/Gemini/Qwen access and exact model IDs before use, with no silent paid fallback. Use scripts for mechanical work and cap two active workers by default. Historical Hermes three-lane IDs, pane wakes and cron instructions do not apply to a generic per-issue implementation. Current docs/ and docs/plans/ placement is explicit operator direction. Reconcile index sibling counts against current routes/consumers and repair stale counts, rather than copying an unverified denominator.

## Captured issue requirements — refresh before acting

## Full issue acceptance snapshot (2026-09-11)

Braden reports a recurring brief “Authentication failed” during normal sign-in, previously raised with Claude. This remains a reported production defect; a forced error-page recovery check is not a reproduction.

Read-only investigation against installed @bsuite/auth 1.0.0 identifies reproducible race conditions:
- Conduit /auth/login awaits attemptSilentAuth(), which initiates prompt=none navigation but resolves false; login then initiates a second interactive authorization flow.
- Completing flow A removes the legacy flat bs_oauth_state while flow B still exists in the state-keyed map. Conduit /auth/callback dispatch checks only the flat key, so B can incorrectly enter the native Supabase exchange.
- Callback error=login_required is rendered as a failure rather than the expected silent-to-interactive fallback.
Additional shared-package exchange cleanup and concurrency findings need independently scoped regression evidence before acceptance.

Auth contract: AUTH_CANONICAL.md and auth-supabase skill, Supabase OAuth 2.1 Server PKCE, per-client state/nonce/JWKS validation, own-origin token storage and Supabase setSession bridge. Never weaken state checks, share domain cookies, or suppress genuine auth errors.

Acceptance:
- Reproduce the reported normal-flow symptom or explicitly distinguish the tested race from the still-unreproduced symptom.
- One authorization attempt per login transition; correct state-keyed callback dispatch; login_required falls back once without a loop or error flash; genuine failures remain actionable.
- Concurrent tabs, stale/expired sessions, retry after network failure, denied consent and unknown state covered with meaningful regression tests.
- Verify deployed development and production exact SHAs, real developer account plus both authorized subtenant accounts, tenant isolation, original destination, reload and cross-app navigation. No credential/token values in evidence.

Tracked within the existing BSuite remediation ledger and architecture issue GaryOcean428/bsuite#1315. Current owner: Codex task 01a0858d-882e-7241-8a54-43adc8ee0b35. Status IN-PROGRESS; ui_touched=true; D8 pending.
