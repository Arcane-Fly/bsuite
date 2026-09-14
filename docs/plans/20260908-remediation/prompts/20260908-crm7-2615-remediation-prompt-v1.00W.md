---
kind: plan
authority: engineering
owner: bsuite
evidence:
  - scripts/check-plan-currency-markers.mjs
  - scripts/check-doc-classification.mjs
---

> **Current as of 2026-09-14:** This is an active engineering plan. Refresh its live issue and evidence before execution; this marker does not assert implementation or release completion.

# Kick off crm7#2615: [P1][security] Jodie carries the previous tenant's conversation into the next tenant's request after a tenant switch

Implement and verify https://github.com/GaryOcean428/crm7/issues/2615. This is one bounded issue in the existing canonical BSuite programme, not a launch of the whole backlog and not a replacement backlog. Re-read live issue/PR state and source; if a limb is already resolved, validate and reconcile exact evidence instead of rebuilding. Act after reading; do not stop at a plan or ask again whether to continue.

## Context, ownership, skills and paired tools

Repository: /home/braden/Desktop/Dev/bsuite/crm7. Use an isolated worktree based on current development and preserve other lanes. Read parent/app AGENTS.md, CONTRIBUTING.md, relevant DESIGN.md, the BSuite truth index `bsuite_project_truth_index`, the current 370-row ledger, preserving the original 340 rows, and the 40-group feedback reconciliation. Objective lock: Preserve all BSuite work, consolidate safely through development then main, and reconcile and execute the existing canonical ledger plus 40 feedback groups without a replacement backlog.

Canonical dispatch owner: `codex-bsuite-closeout-01a09d84`. This row starts `pending`; implementation is unassigned until that owner claims it. Do not launch a duplicate writer. Dependencies/related rows: conduit-710. Feedback groups mapped by this reconciliation: 27, 36. Feature-index and feedback-group counts remain separate denominators from issue rows.

Invoke **agent-run-master first**, then **agent-mem-truth** and **agent-skl-find**. Load and follow the dedicated applicable skills below from `/home/braden/.agents/skills`; record actual invocation receipts and currently available MCP/CLI routes. Current operator routing overrides stale prompt-era model assumptions.

- **agent-run-master** — load `/home/braden/.agents/skills/agent-run-master/SKILL.md` and apply only its relevant scope.
- **agent-mem-truth** — load `/home/braden/.agents/skills/agent-mem-truth/SKILL.md` and apply only its relevant scope.
- **agent-skl-find** — load `/home/braden/.agents/skills/agent-skl-find/SKILL.md` and apply only its relevant scope.
- **plan-roadmapping** — load `/home/braden/.agents/skills/plan-roadmapping/SKILL.md` and apply only its relevant scope.
- **git-github-issues** — load `/home/braden/.agents/skills/git-github-issues/SKILL.md` and apply only its relevant scope.
- **check-security** — load `/home/braden/.agents/skills/check-security/SKILL.md` and apply only its relevant scope.
- **auth-supabase** — load `/home/braden/.agents/skills/auth-supabase/SKILL.md` and apply only its relevant scope.
- **bsuite-rls-authz-red-team** — load `/home/braden/.agents/skills/bsuite-rls-authz-red-team/SKILL.md` and apply only its relevant scope.
- **agent-definition-of-done** — load `/home/braden/.agents/skills/agent-definition-of-done/SKILL.md` and apply only its relevant scope.
- **bsuite-false-complete-gates** — load `/home/braden/.agents/skills/bsuite-false-complete-gates/SKILL.md` and apply only its relevant scope.

Use at most two active implementation lanes estate-wide and one writer per repository/worktree. Reviewers remain read-only. Preserve accepted exact-SHA evidence, current production holds, client data, migration history, and unresolved failure paths.

## Issue-specific acceptance

1. Key chat state by user, tenant, and conversation so no prior-tenant message reaches the next tenant request.
2. Stop in-flight answers on identity change and restore only the current tenant's saved session.
3. Test A-to-B-to-A, streaming switches, user changes, and unknown identity with the real AI SDK state behavior.

Re-read the full live issue body below before implementation. Treat historical SHAs, paths, counts, screenshots, live-schema claims, and model statements as evidence to refresh, not as current truth. Resolve cited paths and verify live catalog/runtime state where the issue requires it. Credit working limbs and keep missing evidence explicit.

For any user-facing or page-consumed change, declare `ui_touched`, enumerate sibling surfaces by more than one axis, and perform the deployed exact-SHA D8 journey with the intended role, save/reload, negative authority, failure/retry, responsive widths, both themes, and a lossless return. For infrastructure, CI, security, or migration work, use positive controls that prove the guard bites and verify the actual consumer/runtime result.

## Related live issues and retained acceptance

These issues remain mapped to this existing row; refresh their live status and satisfy the full linked acceptance before claiming closure.

```json
[
  {
    "id": "business-suite-unified-1238",
    "url": "https://github.com/GaryOcean428/business-suite-unified/issues/1238",
    "title": "[security] Jodie transcript survives an in-page organisation switch (JodieShell/JodieAI; crm7#2615 class)",
    "status": "pending",
    "relationship": "acceptance_or_sibling_evidence",
    "feedback_groups": [
      27,
      36
    ],
    "acceptance": [
      "Add BSU JodieShell and JodieAI as two sibling surfaces under crm7#2615.",
      "Prove A-to-B-to-A and streaming-switch behavior without model-context or on-screen cross-tenant leakage."
    ],
    "rationale": "Sibling-app manifestation of the same tenant-scoped Jodie conversation class; one class row should own the BSU, CRM7, and Conduit sweep while each app keeps its issue identity."
  },
  {
    "id": "conduit-719",
    "url": "https://github.com/GaryOcean428/conduit/issues/719",
    "title": "[security] Jodie keeps the previous organisation's conversation across a switch (fixed useChat id 'conduit-jodie'; crm7#2615 class)",
    "status": "pending",
    "relationship": "acceptance_or_sibling_evidence",
    "feedback_groups": [
      27,
      36
    ],
    "acceptance": [
      "Add Conduit useAIChat as a sibling consumer under crm7#2615 after #710 merge reconciliation.",
      "Prove fixed-id removal, stream cancellation, tenant session isolation, and positive restoration."
    ],
    "rationale": "Sibling-app manifestation of the same useChat tenant-scope class; it also overlaps the existing Conduit #710 lane and must not start a competing writer."
  }
]
```

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

This is the live GitHub issue body captured during the 2026-09-14 records reconciliation. It does not override later operator instructions or current repository rules. Live issue: https://github.com/GaryOcean428/crm7/issues/2615. Captured GitHub updatedAt: 2026-09-11T05:09:30Z.

---

## What happens

After a user switches tenant, Jodie (the AI assistant) keeps the previous tenant's conversation on screen, and the next message sends that conversation to the server along with the new question.

Reproduced on crm7 `origin/development`. The test uses the real `@ai-sdk/react` 3.0.237 and `ai` 6.0.235, with only `fetch` and the SQLite chat service mocked. A message was sent under tenant A, then the same hook was re-rendered with tenant B and a second message sent. The second request body carried:

```
tenantId: "tenant-B"
messages: ["Secret tenant-A detail: invoice #A-9001", "tenant-B question"]
```

## Why

- `src/layouts/MainLayout.tsx:213` mounts `<AIAssistant>` once, with no `key` on the tenant, so a tenant switch is only a prop change.
- `src/hooks/useAIChat.ts:129` calls `useChat({ transport, onFinish, onError })` with no `id`. In `@ai-sdk/react` (dist `index.mjs:189-195`) the `Chat` instance that owns `messages` is created once and replaced only when `id` changes, so it survives the switch. The transport is rebuilt with the new `tenantId`, but the message list is not.
- `ai`'s `Chat.makeRequest` posts `this.state.messages`, the whole accumulated history (dist `index.mjs:13965-13974`).
- The server ignores the body's `tenantId` and derives the tenant from the JWT and `acting_scope_tenant_id()` (`api/ai/chat.ts:437-651`). So billing and authorization are not fooled. The defect is that tenant A's conversation, including any tool output the model read while scoped to tenant A, reaches the model in a session authenticated for tenant B.

## Fix

Give `useChat` an id that changes with the user and tenant (`id: \`${userId}:${tenantId}\``), so the library starts a new, empty `Chat` on a switch. Verified in a throwaway checkout: the new test passes with the fix and fails with it reverted. Ship it with a regression test that asserts neither `messages` nor the next request body carries the previous tenant's content. Separately, decide whether the new chat should load the new tenant's saved session from `useAISession`. Today that store is loaded but never rendered.

This is the only `useChat` call site in crm7. The same class of defect was found and fixed in conduit on conduit#710, qodo finding "Tenant switches retain private chat history".
