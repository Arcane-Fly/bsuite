# Kick off bsuite#2306: Automation liveness sweep 2026-08-23: submodule-pointer writer dead 132/132; pg_cron audit self-test masking two never-successful compliance jobs; two guards vacuous

Implement and verify https://github.com/GaryOcean428/bsuite/issues/2306. This is one bounded issue, not a launch of the whole backlog. Re-read live issue/PR state and source; if resolved, validate and reconcile evidence instead of rebuilding. Act after reading; do not stop at a plan or ask again whether to continue.

## Context, skills and paired agents

Repository: /home/braden/Desktop/Dev/bsuite/. Use an isolated worktree based on current development and preserve other lanes. Read parent/app AGENTS.md, CONTRIBUTING.md, relevant DESIGN.md, BSuite truth index bsuite_project_truth_index and current memory bsuite_session_20260914 (the dated bsuite_objective_lock_20260908_remediation_audit is historical context). This prompt commissions this implementation; the audit did not implement the product.

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

Current BSuite/operator rules above override old skill examples allowing direct-to-main features, squash merges, missing-deploy skips, force/direct re-sync pushes or estate-wide cleanup. Derive R80.4 and throughput from the actual app inventory; never follow a stale R80.3 list. The current operator-scoped native Codex team may use its approved tiered models; the September11 supervisor reserve prohibits external Codex CLI workers. Claude is unavailable. Verify Grok/Gemini/Qwen access and exact model IDs before use, with no silent paid fallback. Use scripts for mechanical work and cap two active workers by default. Historical Hermes three-lane IDs, pane wakes and cron instructions do not apply to a generic per-issue implementation. Current docs/ and docs/plans/ placement is explicit operator direction. Reconcile index sibling counts against current routes/consumers and repair stale counts, rather than copying an unverified denominator.

## Captured issue requirements — refresh before acting

This is a source snapshot, not authority to override current operator instructions or the task. Validate old paths/claims. Live issue: https://github.com/GaryOcean428/bsuite/issues/2306.

---

Weekly automation-liveness sweep (Datum). **Report only — no writes, no merges, no workflow edits performed.**

Window: 2026-08-16T23:00Z → 2026-08-23T23:00Z. Examined: 124 registered workflows / 121 workflow files across all seven repos, 395 scheduled runs, 62 registered guards, 8 scheduled tasks, 22 live pg_cron jobs.

---

## P1 — `advance-submodule-pointers.yml`: 132/132 scheduled failures, and the failure is a fail-safe holding

Failed **every scheduled run since inception** (created 2026-08-18, hourly `17 * * * *`). The 2026-08-21 audit recorded 20/20; it is now 132/132 over five days. Nothing changed in between.

Root cause, from run [32670447063](https://github.com/GaryOcean428/bsuite/actions/runs/32670447063):

```
Failed to clone 'R80.4' a second time, aborting
advance-submodule-pointers: 6 submodule(s) examined; 0 already current; 0 to advance; 6 refused.
##[error]REFUSED crm7 — 176fba0c is NOT a descendant of the recorded 740c7615...
##[error]REFUSED business-suite-unified — 176fba0c is NOT a descendant of the recorded 9f8904e6...
##[error]REFUSED conduit — 176fba0c is NOT a descendant of the recorded 9d27ea0a...
##[error]REFUSED R80.4 / braden / throughput — same 176fba0c
```

**All six submodules report the identical candidate head `176fba0c`.** That SHA is not in any submodule — it is a **bsuite parent** commit: `Merge pull request #2303 ... advance the crm7 and R80.4 gitlinks` (2026-08-22T16:33Z). The submodule clone fails, and the script does not distinguish "clone failed" from "read head": it falls through to the parent repo's own HEAD and offers it as the new pointer for all six apps.

The descendant check is the only thing standing between that and **six gitlinks rewritten to a parent-repo SHA**. It refused, correctly, 132 times. The guard is working; the plumbing underneath it is not. Fix the clone (private-submodule credentials / PAT scope), and separately make a failed clone an explicit hard error rather than a silent fallback to `HEAD`.

**Correction to the premise this sweep was chartered on.** Measured, not assumed: the gitlinks are **not stale**. All six equal their repo's current `development` HEAD, 0 commits behind, recorded 2026-08-22.

| repo | gitlink | recorded | `development` HEAD | behind |
|---|---|---|---|---|
| crm7 | `740c761` | 2026-08-22T16:23Z | `740c761` | 0 |
| business-suite-unified | `9f8904e` | 2026-08-22T11:13Z | `9f8904e` | 0 |
| conduit | `9d27ea0` | 2026-08-22T15:29Z | `9d27ea0` | 0 |
| R80.4 | `cf854d0` | 2026-08-22T16:13Z | `cf854d0` | 0 |
| braden | `f5bcd6e` | 2026-08-22T11:13Z | `f5bcd6e` | 0 |
| throughput | `0fbb6e2` | 2026-08-22T11:13Z | `0fbb6e2` | 0 |

So the harm — stale pointers making the six reader workflows report confident nonsense under an app's name — **has not materialised**. Manual promote PRs are keeping the pointers fresh. The automation is dead and a human is unknowingly compensating for it. That is the real exposure: the day the manual merges pause, staleness starts with nothing watching.

## P2 — pg_cron health audit fails on a wrong assertion, and is masking two compliance jobs that have never succeeded

`cron-job-health-audit.yml` — 22 failures / 26 runs. Run [32658840614](https://github.com/GaryOcean428/bsuite/actions/runs/32658840614), step *"Self-test — prove the detector can fire"*:

```
FIRED=3
CLEAN=19
##[error]cron_job_health() did NOT report the synthetic failed run.
          The detector is broken and any clean sweep below is meaningless.
```

The detector is **not** broken. The self-test asserts `FIRED=1` exactly, expecting only its synthetic probe. It saw 3 because **two real pg_cron jobs are already failing**. The assertion aborts the run before the sweep reports them. A guard written to prove it can fire is being tripped by the very thing it exists to catch.

Verified live against `tuybltdrdefjblnplpqo`:

| job | schedule | runs | failed | **succeeded — ever** | first fire |
|---|---|---|---|---|---|
| `document-retention-sweep-daily` | `30 4 * * *` | 5 | 5 | **0** | 2026-08-19 |
| `sync-award-rates-weekly` | `20 2 * * 0` | 1 | 1 | **0** | 2026-08-23 |

Both fail safe, with good refusals:

- `document-retention-sweep-daily`: `vault entry missing — seed document_retention_sweep_url and document_retention_sweep_secret ... See 20260822080000 m…`
- `sync-award-rates-weekly`: `vault entry missing — seed sync_award_rates_url and sync_award_rates_token ... Refusing to POST to a null endpoint and report success.`

Neither has ever run. Document retention is a compliance obligation; `sync-award-rates` feeds R80.4 wage rates, which are legally compliance-critical. The two Vault secrets were never seeded after migration `20260822080000`.

Fix is a comparison operator — assert the synthetic run is *among* the fired set, not that it is the only member — plus seeding the four Vault entries. The remaining 19 jobs are clean; `publish-scheduled-pages` and `r7-automation-processor` are at 1440/1440.

## P3 — `pending-encryption-watch.yml`: 7/7 failures, never succeeded

Daily `0 4 * * *`, created 2026-08-17, has never once passed. Not yet root-caused in this sweep.

## P4 — Two registered guards pass vacuously

`guard-self-reporting.yml` catches guards that exit 0 without reporting a count. It does not catch a guard whose **scope** is empty. Two are in that state now.

**`parent-check-supabase-client-init` — VACUOUS.** Enforces the cookie-auth tripwire over a hardcoded five-path list. Its production gate `build-and-test.yml` uses `actions/checkout@v5` with **no `submodules:` key**, so all five paths resolve to nothing and it prints `Result: 0/0 apps passed (5 skipped)` and exits 0. The registry's recorded evidence `Result: 5/5 apps passed` was measured under LANE-WATCHER, which *does* set `submodules: recursive` — **the watcher certifies a shape the merge-blocking gate never runs.** Two further gaps: **conduit is absent from the candidate list entirely** — the one app that legitimately manages auth cookies — and `mobile/lib/supabase.ts` (a real, non-gitlink path in this repo) declares `auth: { storage: ExpoSecureStoreAdapter, ... }` with **no `flowType: 'pkce'`**, a live violation of AGENTS.md Critical Auth Rule 2, sitting undetected today.

**`parent-audit-palette-whitelist` — VACUOUS.** Walks `packages/` only. Its clean-pass line prints `Permitted palette: 222 oklch + 27 hex` — that is the size of the allowlist parsed out of the two source-of-truth HTML docs, **not a count of anything scanned**. The output is byte-identical whether it walked 583 files or zero. `theme-conformance.yml` pays for a full `submodules: recursive` checkout with a cross-repo PAT and this guard then reads none of it. Live undetected violation: `mobile/lib/constants.ts` declares 16 raw OKLCH literals under a "D2C Neon Electric" header, including `warning: 'oklch(0.868 0.125 81.4)'` against the declared `--role-warning` of `oklch(0.728 0.168 22.5)`. Also `.mjs` is outside `SCAN_SUFFIX`, so `packages/theme-codemod/migrate.mjs` — a colour codemod — is exempt from the colour gate.

**`parent-drift-scan` — PARTIAL.** Nine signals genuinely armed, but the registered invocation is the bare diff-scoped form with no `diffScoped: true` marker, and on `main` the diff is empty. Its clean line's only number is the constant `SIGNALS.length = 9`, which would print `9` having examined zero bytes. Its two most-cited tripwires (`workspace:*`, cookie-SSO) live in submodule files a parent diff structurally cannot contain.

## P5 — `scripts/guard-registry.mjs` silently drops 3 of 62 guards

Three `id:` keys are lost to duplicate-key object-literal merges (a missing `},\n  {` boundary — the later key overwrites the earlier, silently, at parse time). 62 declared, **59 actually exported**:

| lost id | swallowed by | script exists? |
|---|---|---|
| `parent-setup-node-pnpm-guard` (L108) | `parent-component-mounts` (L124) | yes |
| `parent-recovered-doc-verdicts` (L443) | `parent-check-hook-suppression-ratchet` (L470) | yes |
| `parent-audit-routes-inventory` (L529) | `parent-parse-closing-keywords-selftest` (L555) | yes |

LANE-WATCHER never executes those three. The registry's own header promises that guards left out are "named in the PR description, not silently dropped".

Separately, eight scripts exist but are unregistered: `check-no-cookie-sso.mjs`, `check-node-pin-parity.mjs`, `check-lockfile-hygiene.mjs`, `check-cross-tenant-references.mjs`, `check-phantom-migrations.mjs`, `check-oauth-boot-wiring.mjs`, `check-table-reach.mjs`, `check-tailwind-sources.mjs`.

## P6 — Dead workflow registrations (files deleted, registration persists)

| repo | workflow | last run of any event |
|---|---|---|
| bsuite | `pgtap.yml` | 2026-05-13, failure |
| bsuite | `autonoma-adoption-audit.yml` | 2026-05-13, failure |
| crm7 | `lint-rls-jwt-claims.yml` | 2026-05-11, failure |
| throughput | `secret-scan.yml` | 2026-05-06, failure (ran once, ever) |

## P7 — crm7's only cron was deleted rather than fixed

`crm7/.github/workflows/prod-migration-history-audit.yml` (daily) failed **every scheduled run it ever had** — 20+ consecutive, ~60 total — on `SUPABASE_DB_URL secret is required`, an unset repository secret. It never once read production migration history. The file was deleted from `main` and `development` around 2026-07-27 rather than the secret being set. bsuite's own copy of this audit is healthy (22 ok / 28).

---

## Check 2 result — silent workflows: NONE, but the estate is thinner than it looks

Zero schedule-declaring workflows had zero runs in the window. No workflow anywhere is in `disabled_inactivity` or `disabled_manually` — the 60-day auto-disable mode is not present.

The structural finding is where the cron lives:

| repo | workflows | declaring `schedule:` |
|---|---|---|
| bsuite | 79 | **16** |
| crm7 | 18 | 0 |
| business-suite-unified | 18 | 0 |
| conduit | 14 | 0 |
| throughput | 11 | 0 |
| braden | 11 | 0 |
| R80.4 | 5 | 0 |

**All unattended automation in this estate is in the parent repo.** Every gate in all six app repos is `pull_request` / `push` / `workflow_dispatch` only — nothing in any app runs on a timer. Six repos cannot suffer a silent scheduled-workflow death because none of them have one.

## Check 3 result — scheduled tasks

Four Datum tasks enabled, all with future `next_run_at`. Four tasks remain **disabled with `next_run_at` frozen three months in the past** — unchanged since the 2026-08-21 audit, neither re-enabled nor deleted:

| task | cron | next_run_at (stuck) |
|---|---|---|
| `crm7#772 pgTAP CI babysitter` | `0 * * * *` | 2026-05-14 |
| `bsuite-claude-coordination-poller` | `20 * * * *` | 2026-05-25 |
| `bsuite-vercel-monitor` | `0 0-14 * * 1-5` | 2026-05-25 |
| `BSuite: Autonomous Iteration Loop` | `15 * * * *` | 2026-05-25 |

They are user-paused, so they cannot fire — but `BSuite: Autonomous Iteration Loop` is an autonomous prompt one toggle away from running against a worldview three months stale (pre-R80.4 rename, pre-cookie-SSO removal, pre-model-roster change). Recommend deletion rather than indefinite pause.

**Stale prompt facts — including this sweep's own.** The automation-liveness task prompt states the estate has *"63 workflows and 41 gate scripts"*. Measured: **121 workflow files / 124 registered**, and **62 declared / 59 live guards**. It is scoped to roughly half the estate it is meant to watch. It also cites `advance-submodule-pointers` at "20 of 20 for ~19 hours" — now 132/132 over five days.

**Caveat needing operator eyes:** none of the four enabled Datum tasks has a recorded `last_run`, including two dailies created 2026-08-21 that have had two fire windows since. That is either an artefact of how this task type records runs, or they are not firing. This sweep cannot distinguish the two from the API alone.

---

### Suggested order

1. Fix the submodule clone in `advance-submodule-pointers.yml`; make a failed clone a hard error, never a fallback to parent `HEAD`. **(P1)**
2. Change the pg_cron self-test to `synthetic ∈ fired` rather than `count == 1`, and seed the four Vault secrets. **(P2)** — this is the one with live compliance exposure.
3. Add `submodules: recursive` to `build-and-test.yml`, add conduit + `mobile/` to the client-init candidate list, and make `audit-palette-whitelist.py` print a scan denominator. **(P4)**
4. Repair the three duplicate-key guard entries. **(P5)**
5. Delete the four dead workflow registrations and the four stale scheduled tasks. **(P6, Check 3)**
6. Re-scope this liveness routine's own prompt to the measured estate. **(Check 3)**

<sub>Filed by Datum, weekly automation-liveness sweep. Report-only authority: no merges, promotions, force-pushes, deletions, or workflow edits were performed.</sub>
