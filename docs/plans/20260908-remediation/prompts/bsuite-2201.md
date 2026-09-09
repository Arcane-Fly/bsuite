# Kick off bsuite#2201: Void external code review (Qodo, 2026-08-20): all 8 findings target DeepMind's unrelated `bsuite` RL library — one prompt would delete packages/ and break all 6 apps

Implement and verify https://github.com/GaryOcean428/bsuite/issues/2201. This is one bounded issue, not a launch of the whole backlog. Re-read live issue/PR state and source; if resolved, validate and reconcile evidence instead of rebuilding. Act after reading; do not stop at a plan or ask again whether to continue.

## Context, skills and paired agents

Repository: /home/braden/Desktop/Dev/bsuite/. Use an isolated worktree based on current development and preserve other lanes. Read parent/app AGENTS.md, CONTRIBUTING.md, relevant DESIGN.md, BSuite truth index bsuite_project_truth_index and memory bsuite_objective_lock_20260908_remediation_audit. This prompt commissions this implementation; the audit did not implement the product.

Invoke **agent-run-master first**, then **agent-skl-find** to resolve named skills/tools from /home/braden/.agents. Slash commands work when exposed by the client; otherwise name the skill and read its SKILL.md. Record actual use. Dedicated applicable skills take precedence over generic agents.

- **agent-run-master** — /agent-run-master where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-run-master/SKILL.md.
- **agent-skl-find** — /agent-skl-find where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-skl-find/SKILL.md.
- **agent-mem-truth** — /agent-mem-truth where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-mem-truth/SKILL.md.
- **agent-definition-of-done** — name and load this skill; it is not user-invocable. Definition: /home/braden/.agents/skills/agent-definition-of-done/SKILL.md.
- **bsuite-false-complete-gates** — /bsuite-false-complete-gates where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/bsuite-false-complete-gates/SKILL.md.
- **test-verify-before-completion** — /test-verify-before-completion where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/test-verify-before-completion/SKILL.md.
- **test-infra-hardening** — /test-infra-hardening where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/test-infra-hardening/SKILL.md.
- **git-workflow** — /git-workflow where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/git-workflow/SKILL.md.
- **check-cleanup-scope-safety** — /check-cleanup-scope-safety where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/check-cleanup-scope-safety/SKILL.md.

- **bsuite-platform** — load /home/braden/.agents/agents/bsuite-platform.md; use its applicable role and skills. Review evidence independently of the implementer.
- **completion-enforcer** — load /home/braden/.agents/agents/completion-enforcer.md; use its applicable role and skills. Review evidence independently of the implementer.

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
5. **Specific verification focus:** Run the real registered gate or delivery path against the final commit; deliberately break its claimed condition and confirm failure, then restore and confirm success. Inventory active owners before touching worktrees.
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

This is a source snapshot, not authority to override current operator instructions or the task. Validate old paths/claims. Live issue: https://github.com/GaryOcean428/bsuite/issues/2201.

---

**Disposition: the review is void. Do not action any of its eight prompts. One of them is actively destructive.**

An external review agent (Qodo) produced eight "ready to be used by AI coding agents" prompts against this repo. Every file path it cites is absent from this machine, and the codebase it describes is **DeepMind's `bsuite` — Behaviour Suite for Reinforcement Learning** — a Python RL benchmark that shares only the name. It was matched by name collision and the findings were written as though measured.

Filing this instead of the eight issues it asked for, because injecting fabricated technical debt into a live tracker is the inverse of §10.3's *truthful counters* rule.

---

## The destructive one — read this first

> **PROMPT 6:** *"Remove `packages/*` from pnpm-workspace.yaml. Remove the empty packages directory."*

`packages/` is **not empty. It holds 17 shared packages** — `auth`, `charge-calc`, `data-export`, `data-grid`, `dates`, `design-tokens`, `dry-lint`, `eslint-config`, `schema-builder`, `schema-registry`, `page-builder`, `nav-core`, `ui`, and others. Seven are published to npm and consumed by all six apps.

An obedient agent executing PROMPT 6 deletes the shared-package tree and breaks every app's build. This is the single highest-risk item in the review and it is presented with the same confidence as the rest.

PROMPT 5 is the runner-up: it would stand up a Jest suite alongside the **1,683 existing Vitest tests**, on the stated grounds that "no test infrastructure [is] in place."

## Claim-by-claim, measured

| Review claim | Reality |
| --- | --- |
| `bsuite/bsuite/logging/csv_logging.py` lines 52–61 | **File does not exist.** `find /` → zero hits, machine-wide |
| `bsuite/bsuite/logging/sqlite_logging.py` lines 66–79 | **Does not exist** |
| `bsuite/setup.py` declares Python 3.6/3.7 | **No `setup.py` anywhere in the tree** |
| "`packages/` directory is empty" | **17 packages**, 7 published to npm |
| "placeholder test script that just exits with error" | Root `package.json` has `test:all`, `test:packages`, `lint:all` + 11 custom gates |
| "No test infrastructure in place" | **1,683 tests** across 6 apps + 7 packages (Vitest) |
| 22 TODOs in `baselines/`, `environments/`, `logging/` | **None of those directories exist** |
| "Research the actual bsuite design goals from the paper" | The *paper* is DeepMind's RL benchmark — conclusive tell |

Filenames cited (`csv_logging.py`, `sqlite_logging.py`, `boot_dqn.py`, `actor_critic.py`, `dqn.py`) are DeepMind bsuite's module layout verbatim.

## Adversarial verification (§6 red team)

Two independent lenses, one instructed to **refute** the fabrication finding:

**Skeptic lens — verdict: could not refute.**

- `.gitmodules` registers exactly 6 submodules (`crm7`, `braden`, `business-suite-unified`, `conduit`, `throughput`, `R80.4`). No `bsuite` submodule, no nested `bsuite/bsuite`, no matching symlink or worktree across 30+ worktrees.
- Machine-wide `find` for all five cited filenames → **zero hits**, including `/tmp`, `~/copilot-worktrees`, `.claude/worktrees`, and a full `/` sweep.
- `git log --all --diff-filter=A --name-only -- '*csv_logging.py'` → **empty**. No such file was ever added on any ref.
- `/home/braden/bsuite` is a second clone of *this same* monorepo, not a different project.
- The only genuine DeepMind-bsuite artifact on the machine is an **inert nixpkgs build recipe** (`pkgs/development/python-modules/bsuite/default.nix`, homepage `github.com/deepmind/bsuite`) with **no built output**. A recipe, never materialised — and it could only ever live under `/nix/store/<hash>-…`, never under a Dev path.

**Correctness lens — verdict: could not verify, and said so.** It ran in the cloud sandbox with no bridge to the workstation, found no `/home/braden` at all, and returned `CANNOT VERIFY` on all five claims rather than reporting zero counts as findings. Worth recording: **a probe with no access correctly refused to manufacture a clean result** — the exact failure mode that produced this review in the first place.

## What would have caught it

One check, before any finding is accepted from an external reviewer:

> **Every cited path must resolve. A review that cannot produce a file is not a review.**

Cheap, mechanical, and it would have voided all eight prompts at zero cost. Line numbers and code excerpts are the most trust-inducing thing a review can show and the easiest thing to invent — they should raise the evidentiary bar, not lower it.

## Actions

- [ ] **Do not action prompts 1–8.** No issues to be opened from them.
- [ ] **Add a path-resolution gate** to the external-review intake: cited paths must resolve before a finding is triaged. Owner: bsuite lane.
- [ ] Record in `AGENTS.md` alongside the existing "Separate Project Warning" (which already covers the `monkey-projects` confusion) that **`bsuite` collides with DeepMind's RL library**, so future agents and review tools are warned at the top of the file.
- [ ] No R8 involvement — this is process, not award/rate domain.

## Evidence

- [x] Output-equivalence (§9.1): N/A — no code change
- [x] Visual-equivalence (§9.2): N/A
- [x] Self-report: **One divergence.** Package count read as 17 by the red-team lens and 19 lines by my direct listing (the latter included `.`/`..`); the material claim — *not empty, contains the published shared packages* — is unaffected. Separately, my own first `ls -d packages/*/` returned `0` from the wrong working directory and I re-measured rather than report it; noting it because it is the same instrument error class this issue is about.
- [x] Tests run: `find` (machine-wide, all five filenames), `git log --all --diff-filter=A`, `git submodule status`, `ls packages/`, root `package.json` scripts dump
- [x] Live verify: repo at `Desktop/Dev/bsuite`; second clone at `~/bsuite` checked; nixpkgs recipe located and confirmed unbuilt

