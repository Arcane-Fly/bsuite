# Kick off bsuite#1996: [D-78] Theme: five near-white app-local surface tokens shadow the fixed shared token; plus invisible card border, missing nav gradient, uneven gradient headers

Implement and verify https://github.com/GaryOcean428/bsuite/issues/1996. This is one bounded issue, not a launch of the whole backlog. Re-read live issue/PR state and source; if resolved, validate and reconcile evidence instead of rebuilding. Act after reading; do not stop at a plan or ask again whether to continue.

## Context, skills and paired agents

Repository: /home/braden/Desktop/Dev/bsuite/. Use an isolated worktree based on current development and preserve other lanes. Read parent/app AGENTS.md, CONTRIBUTING.md, relevant DESIGN.md, BSuite truth index bsuite_project_truth_index and current memory bsuite_session_20260914 (the dated bsuite_objective_lock_20260908_remediation_audit is historical context). This prompt commissions this implementation; the audit did not implement the product.

Invoke **agent-run-master first**, then **agent-skl-find** to resolve named skills/tools from /home/braden/.agents. Slash commands work when exposed by the client; otherwise name the skill and read its SKILL.md. Record actual use. Dedicated applicable skills take precedence over generic agents.

- **agent-run-master** — /agent-run-master where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-run-master/SKILL.md.
- **agent-skl-find** — /agent-skl-find where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-skl-find/SKILL.md.
- **agent-mem-truth** — /agent-mem-truth where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-mem-truth/SKILL.md.
- **agent-definition-of-done** — name and load this skill; it is not user-invocable. Definition: /home/braden/.agents/skills/agent-definition-of-done/SKILL.md.
- **bsuite-false-complete-gates** — /bsuite-false-complete-gates where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/bsuite-false-complete-gates/SKILL.md.
- **test-verify-before-completion** — /test-verify-before-completion where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/test-verify-before-completion/SKILL.md.
- **bsuite-brand-system** — /bsuite-brand-system where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/bsuite-brand-system/SKILL.md.
- **bsuite-shared-ui-rollouts** — /bsuite-shared-ui-rollouts where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/bsuite-shared-ui-rollouts/SKILL.md.
- **bsuite-page-grid-layout** — /bsuite-page-grid-layout where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/bsuite-page-grid-layout/SKILL.md.
- **test-playwright** — /test-playwright where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/test-playwright/SKILL.md.

- **bsuite-design-sheriff** — load /home/braden/.agents/agents/bsuite-design-sheriff.md; use its applicable role and skills. Review evidence independently of the implementer.
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
5. **Specific verification focus:** Measure actual rendered controls in both themes and relevant viewports/roles. Prove the shared fix reaches every consumer; test persisted preferences, keyboard, navigation and lossless return.
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

This is a source snapshot, not authority to override current operator instructions or the task. Validate old paths/claims. Live issue: https://github.com/GaryOcean428/bsuite/issues/1996.

---

Operator defect **D-78**. Four related theme findings. The headline is that **the shared token layer is already correct — every surviving violation is an app-local override that shadows the fixed token, and the CI gate is structurally unable to see any of them.**

## 1. The shared layer is CORRECT (do not "fix" it again)

Verified in `packages/theme/src/css/vars.css`:

- Nothing emits pure white or pure black.
- `--light-bg-accent` was already fixed from `0.994` → `oklch(0.98 0.006 260)`.
- Dark-mode text is capped at `oklch(0.94)`.
- `text-white` / `bg-white` / `text-black` / `bg-black`: **zero occurrences in `src/` across all six repos.**

Any PR that edits `vars.css` to chase this defect is working the wrong layer.

## 2. Five app-local near-white overrides (the actual defect)

| File | Token | Value | Reach |
|---|---|---|---|
| `crm7/src/styles/theme.css` | `--bg-shell-elevated` | `oklch(0.994 0.002 260 / 0.96)` | **84 consumer files** |
| `crm7/src/styles/theme.css` | `--bg-shell-hero` | `oklch(0.994 0.003 247.9 / 0.9)` | |
| `crm7/src/index.css` | `--color-document-surface` | `oklch(0.994 0.002 260)` | |
| `conduit/src/app/globals.css` | `--bg-shell-hero` | `oklch(0.994 …)` | |
| `throughput/src/index.css` | `--bg-shell-hero` | `oklch(0.994 …)` | |

`--bg-shell-elevated` at `oklch(0.994 0.002 260 / 0.96)` is **exactly the operator's DevTools reading of `lab(100 0 0 / 0.96)`**. That is the smoking gun — the operator inspected a card, saw effectively pure white, and this is the declaration producing it.

**Three of the five carry the comment "pure white banned"** while declaring a value 0.6 lightness points off pure white. `vars.css` already documents this exact failure mode:

> "0.6 points is below any perceptual threshold, so the panel still READ as white even though it no longer WAS white. A colour rule enforced by string match will keep accepting values like that."

## 3. The CI gate cannot see any of them

`theme-conformance.yml`'s C1 scanner is a **string matcher**. `oklch(0.994 …)` is not pure white *by string match*, so all five pass. **The baseline currently reads 7/7 green while five near-white card surfaces ship to production.**

Required, and required **in the same PR**:

1. Add a **lightness-threshold rule** — flag `oklch(0.99x …)` on a surface token as a real C1 violation, not a string comparison.
2. **Re-bank the baseline in the same PR.** The gate asserts *equality*, not a ceiling — adding detections without re-banking turns the gate red and the next agent will "fix" it by reverting the rule.

## 4. Blurry card border — confirmed root cause

`crm7/src/components/common/StatCard/StatCard.tsx` sets `borderColor: var(--border-shell)` = `oklch(0.3 0.03 260 / 0.09)` — **9% alpha, effectively invisible.**

What the operator actually perceives as "the border" is not that border at all: it is the ring inside `--shadow-shell`, `0 0 0 1px oklch(0.546 0.215 262.9 / 0.05)` — **5% alpha, composited under `backdrop-blur-sm`**. That is precisely why it reads as blurry rather than as a line.

Fix: raise `--border-shell` toward the **WCAG 1.4.11 non-text contrast floor of 3:1**, and **drop the `0 0 0 1px` ring out of `--shadow-shell`** so the border is a border and the shadow is a shadow.

## 5. Nav gradient is unimplementable in five of six apps

`.bsuite-gradient-underline-span` exists in exactly **3 files, all crm7**: `TenantSwitcher.tsx`, `CRM7Navigation.tsx`, `index.css`.

It is **not in `@bsuite/theme`**. The operator's request for the nav gradient therefore cannot be satisfied in the other five apps until the class is **promoted into the package**. That promotion is a prerequisite, not an optional refactor.

## 6. Gradient headers are unevenly adopted

`.text-gradient-accent` has **13 call sites estate-wide**: conduit 9, crm7 1, braden 1, **BSU 0**.

## Acceptance criteria

- [ ] All five app-local near-white overrides removed or corrected; the shared token is no longer shadowed. Confirmed by DevTools: `--bg-shell-elevated` no longer computes to `lab(100 0 0 / 0.96)`.
- [ ] `theme-conformance.yml` C1 gains a **lightness-threshold rule** that catches `oklch(0.99x)` on surface tokens, **and the baseline is re-banked in the same PR** (gate asserts equality).
- [ ] Proof the new rule works: it flags the five current values when run against the pre-fix tree.
- [ ] `--border-shell` meets **WCAG 1.4.11 3:1**; the `0 0 0 1px` ring is removed from `--shadow-shell`; card borders read as crisp lines in both light and dark mode.
- [ ] `.bsuite-gradient-underline-span` is **promoted into `@bsuite/theme`** and consumed by more than crm7.
- [ ] `.text-gradient-accent` adoption is levelled — in particular BSU moves off 0 call sites.
- [ ] **Surface count** (D-62): the PR states how many app-local token overrides were audited across all six repos and **how they were enumerated** (the enumeration method must catch near-white by lightness, not by string). Fixing only the five listed here without stating how the full override population was swept is a failed PR.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: both
- **Equivalence target**: §9.2 — DevTools computed-value capture of `--bg-shell-elevated` before/after plus card screenshots in light and dark at 375 / 768 / 1440 showing a crisp border; §9.1 — `theme-conformance` C1 scanner output before vs after, demonstrating the five values flagged pre-fix and zero post-fix with the baseline re-banked
- **Cross red-team**: perplexity-computer verifies the lightness-threshold rule genuinely catches the five values (run it against the pre-fix tree) before flip-to-done
- **Skills to load**: `bsuite-brand-system`, `theme-factory`, `tailwind`, `shadcn-ui`, `design:accessibility-review`, `playwright-skill`, `qa-and-verification`, `verification-before-completion`
- **Self-report on divergence**: yes (mandatory; do not rationalise gaps)
