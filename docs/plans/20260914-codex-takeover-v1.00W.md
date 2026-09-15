---
kind: plan
authority: operator
owner: bsuite
evidence:
  - AGENTS.md
  - AUTH_CANONICAL.md
  - docs/plans/20260914-codex-ide-closeout-refined-v1.00W.md
---

# Codex IDE takeover — unfinished reconciliation and remaining work

Status: READY TO USE AS A PROMPT; project work remains INCOMPLETE. This document supersedes the earlier kickoff's execution checkpoint and routing defaults. It incorporates the operator's subsequent usage correction. It is not a DoD approval or a claim that branches are synchronized.

## Paste this instruction into the new Codex IDE task

Read `/home/braden/Desktop/Dev/bsuite/docs/plans/20260914-codex-takeover-v1.00W.md` completely and execute its takeover instructions. Start in `/home/braden/Desktop/Dev/bsuite`. Take ownership of the preserved work from desktop task `01a09d84-39fa-7c42-b535-0ab8b04fb110`; do not restart the stocktake. First finish safe reconciliation of all BSuite repositories and independently assess the previous agent's work. Then continue the existing remaining-work plans. Apply the cost controls below before any delegation. Preserve OAuth 2.1, all features, user data and evidence. Do not claim development/main convergence until measured locally and remotely.

## Operator intent and scope, in order

1. Account for work in this project across Codex tasks, other CLI agents, local branches, registered and unregistered worktrees, stashes, remotes and recent records. Preserve unique work before cleanup. The previous census is the starting point, not something to repeat wholesale.
2. Bring accepted work through development and then main in each of the six app repositories and the parent. Resolve conflicts with source/evidence review. Retire only incorporated or demonstrably superseded branches/worktrees. Keep unresolved work explicitly owned and recoverable.
3. Align the BSuite silo, inbox, lane records, plans and prompts. Audit the previous task against all applicable DoD standards before relying on its claims.
4. Continue the remaining work in the IDE from the existing reconciled queue and original acceptance criteria. The old desktop task should have stopped at reconciliation/handoff; it instead expanded into repairs. Do not reproduce that uncontrolled expansion: distinguish required release blockers from later product backlog rows, and execute bounded batches with clear completion criteria.
5. Run `ops-ship-all-apps` and `ops-ship-close-out` for actual accepted releases and final closeout. A merged PR, archived branch, passing local suite or prepared prompt is not product completion.

The operator authorized production releases through the normal PR gates and necessary reversible development work. The parent gates a release under this plan must pass are `.github/workflows/promotion-gate.yml` (visual sign-off label), `.github/workflows/no-prerelease-in-production.yml` running `scripts/check-no-prerelease-in-production.mjs`, and the documentation gates `scripts/audit-doc-completion.mjs` and `scripts/check-doc-citations-resolve.mjs`; each app's own promotion PR carries that app's required checks. Do not repeatedly seek routine permission. Do not bypass failed gates to manufacture synchronization. If a genuine blocker prevents convergence, identify the exact blocker and retained refs; continue independent authorized work rather than inventing success.

## Cost and delegation contract — enforce before working

The previous task consumed roughly 84% of the weekly Codex allowance: the operator confirmed 100% was available at its start and no other tasks ran. Do not hide behind account-wide attribution. The primary retained too much execution and used Terra/Sol at high reasoning instead of adequately using low tiers, scripts and available external capacity.

- Use deterministic scripts first for inventories, comparisons, hashes, queue validation, test execution, log summaries and bounded CI polling. Do not use a high-end model as a polling loop or file copier.
- Use low-tier, low-reasoning workers for mechanical scoped work; standard-tier workers for bounded implementation. Native examples, if still available: Luna low for mechanical tasks and Terra medium for implementation. Do not default every worker to high reasoning.
- Reserve high/frontier calls for a specific architectural or irreversible decision, a defect surviving two sound attempts, or a bounded final security/merge review. Record the reason, files and exit condition before escalating. Do not automatically allocate the primary's model to children.
- At most two useful worker lanes across native and external providers combined; one writer per file set. Fan out genuinely independent work, with compact briefs and explicit model, reasoning level, allowed files, acceptance checks, evidence path and stop condition. Do not fork the entire long conversation into routine workers. Consolidate review lenses rather than spawning one premium agent per lens.
- Claude was exhausted: do not dispatch or retry it. The operator reported Grok almost fully available and Gemini/Qwen capacity through Hermes CLI; verify actual provider model IDs and access once. Do not invent a model from the duplicated “Gemini 3.8” shorthand. Prefer the already available suitable capacity; do not silently switch to paid APIs or buy credits.
- Use `agent-cli-cc-subagents` and `agent-run-cli-fanout` for routing discipline, without treating their Claude examples as permission to use exhausted Claude. No external Codex CLI worker dispatch; the IDE coordinator and deliberately tiered native workers are allowed. Hermes workers must be isolated, bounded one-shot calls, without changing Hermes state.
- Check usage at entry and meaningful phase boundaries, not every operation. Report consumed allowance and useful outcomes plainly. Avoid repeated full-suite reruns unless a new change or failure requires them. Preserve first failures and reuse still-valid evidence.

## Mandatory preservation boundaries

- BSuite only. The separate Hermes Monkey Projects thread is outside this task. The earlier general cache-cleanup Hermes thread stopped; its A–K completion was reported, not exhaustively verified. Do not repeat those deletions blindly.
- Do not touch Ollama, Unsloth, Monkey Projects, unrelated real documents or live Docker volumes. Preserve existing data holds, including FutureBuild tenant holds. Do not turn a repo reconciliation into another machine-wide cleanup.
- Preserve Supabase OAuth **2.1** authorization-code/PKCE, registered clients, exact redirect allowlists, OIDC/JWKS validation and callback `supabase.auth.setSession()` bridging. No shared-domain cookie substitute, `cookieStorage`, legacy `business_suite_auth` storage key, browser service-role key, weakened tenant RLS or fabricated business data.
- Commits must be signed with `5200D84D2CE96AED`, author `GaryOcean428 <braden.lang77@gmail.com>`; verify `G`. Feature work goes to development by PR, production by reviewed PR; never direct-push main or force protected refs. Fast-forward development after production merges. Parent gitlinks move last and must reference each app's accepted main.
- Never regenerate standalone app lockfiles inside the parent workspace. Use isolated lockgen roots. Preserve React 19 floor and features; do not downgrade/delete to get green checks.

## Read first — existing sources, not a new investigation

Evidence root **E** is `/home/braden/.codex/visualizations/2026/09/14/01a09d84-39fa-7c42-b535-0ab8b04fb110`.

Read E/`task-delta.json`, especially `live_policy_release_20260914` and `usage_checkpoint_20260914`. Older progress strings inside that file are historical and stale; the later checkpoints and this document take precedence until live verification. Both former workers are paused and have returned ownership; none should be assumed active.

Read the existing `docs/plans/20260914-codex-ide-closeout-refined-v1.00W.md` for the original enhanced scope, standards and citations, but use this document's corrected state. Canonical backlog is `docs/plans/20260908-remediation/`. The execution queue is `/home/braden/.codex/visualizations/2026/09/08/01a07f58-73a6-71f2-a57d-5cf3b6b148dc/bsuite-remediation/hermes-queue.json`; preserve its lock/atomic-update protocol.

The reconciled checkpoint contained **370 rows = 340 + 30**, with 377 open issue links accounted for as 368 primary plus nine related links; two primary issues were closed pending acceptance. Earlier 333→338→340→370 figures describe different snapshots. The exact remembered “380” remains unverified. Forty feedback groups and 661 feature-matrix rows are separate denominators. Re-measure live deltas; do not invent a completion percentage or rewrite dated historical counts.

Use the existing seven-day records review and capture index first. Follow targeted gaps into other Codex task records, `~/.claude`, `~/.codex`, recent `docs/` and `docs/plans/`, and agent CLI records. Do not rescan all transcripts, all history or all home directories without a concrete missing item. Validate external review paths with `scripts/check-review-citations.mjs` before triaging.

## Preserved execution checkpoint — verify before mutation

### Merged source and cleanup

Last measured development heads:

| Repository | Development SHA |
| --- | --- |
| bsuite | `6cd83e1229dec6b61f0995fe713315efaca2e96c` |
| crm7 | `3a914d380b2f50c8cef1f9e3cd2d8234d2964efe` |
| business-suite-unified | `a6d907871f4450fe73a1626810bfbc55e3429462` — PR1242 |
| R80.4 | `d589404ab9d50f5fedc1e9309cbeb72ef3610f0f` — PR327 |
| braden | `571b11482acbb8a5cf935dd0d169eb3c6d206802` — PR621 |
| conduit | `5147285390918e6bf758d174a1f63339af331051` |
| throughput | `463f113392866cac716fb24c9a918243ccf9d403` |

These are checkpoint values, not a fresh ref census. Local app branches can lag. Parent checkout has modified gitlinks. **No main promotions were completed; development and main are not synchronized.**

Recorded cleanup: earlier 60 local branches, 16 remote branches, 16 worktrees and six stashes; latest verified delta adds five local branches, two remote branches and three owned worktrees. Thus recorded totals are 65/18/19/six, subject to checking the existing receipts rather than another blanket deletion. BSU/R80/Braden recovery worktrees were removed after their source merged. The manifests retain old source paths: use merged Git objects for those files. Verified preservation bundles and historical archives must remain accessible.

Retain dirty BSU worktree `../.worktrees/claude-bsu-1233-followup`, unresolved CRM worktrees and salvage branches/stashes. Parent historical-doc stashes and unread `.codex` configuration quarantine are not disposable. R80 award salvage contains unique lines and would delete later work if blindly reapplied. Archive does not mean integrated.

### Production database — six migrations ARE ALREADY APPLIED

Shared project: `tuybltdrdefjblnplpqo`. Applied in order after independent review and development merges:

- BSU `20261201010100`: eight messaging policy roles narrowed to authenticated.
- R80 `20261201010200`: five quote/WIC policy roles narrowed to authenticated.
- BSU `20261201010300`: caller-bound invitation capacity helper and shared advisory lock.
- BSU `20261201010500`: bounded legacy hierarchy walkers; DISTINCT is required against the real subtree helper.
- BSU `20261201010600`: consented membership policy self-recursion repair.
- BSU `20261201010700`: consented feature policy recursion repair and guarded redundant-index removal.

Do not reapply these as if pending. Each exact source was hash-checked, rehearsed, applied atomically with five-second lock timeout/45-second statement timeout, validated before commit and recorded with source statements. E/`six-policy-migrations-application-manifest.json`, `live-apply-*.json`, `bsu-r80-policy-live-application-review.md` and `six-policy-live-anon-control.json` are the receipts. Postcheck: **844 ledger versions, 13 authenticated policies, anonymous walker access denied, duplicate index absent, canonical index retained**, and eight-table anonymous denial control passed.

This is applied database state, not complete D8 acceptance. Teams still lack a durable tenant anchor; do not claim the capacity repair solves that model gap.

### CRM PR2631 — dirty recovery, native replay still required

Worktree: `/home/braden/Desktop/Dev/.worktrees/codex-crm7-pr2618-pass4-repair`; committed/pushed head `f8fd2b1907a22fe6d8e64181b5d8c199f4541199`. Preserve all subsequent dirty files.

Critical fixes: Jodie migration renamed to **20261201010400** because `20261127000000` is already a different live BSU SMS migration; three tests' path references were corrected and 18 focused assertions pass. The old quarantined baseline could partially overwrite functions before failure: a frozen-hash transaction helper now protects four replay paths. Local bootstrap and schema-diff failure exits were corrected and negative-tested. Do not weaken policy tests or treat a failed replay as ready.

The passing **128 files / 2,163 assertions** used a disposable PostgreSQL **17.6.1.165** database with six sibling overlays. It is not yet a native run from the checked-in CRM baseline. PostgreSQL 17.6.1.106 caused real crashes; do not “fix” those by removing permission tests.

Next: compose the baseline from the actual post-apply capture, preserve explicitly labelled CI-only compatibility/reference seed material, refresh the actual 844-version ledger, then run native 128 suites with **no manual sibling overlays**. Raw captures exist:

- E/`crm2631-postapply-public-schema-raw.sql`, SHA256 `f7db9331e024d6a5a6a6385cabca4ebd8e2c60a3775ea7c72b5559fd6d3ce61b`.
- E/`crm2631-postapply-ledger-raw.sql`, SHA256 `26734321a7b2a3ccc4c6a47cdf7ca16fc956bdf056a3d2acf8532313e07ddc52`.

Canonical baseline files were **not** refreshed after those captures; replay did not start. See E/`crm2631-baseline-refresh-receipt.json` and `crm2631-final-harness-review.md`. Disposable container `supabase_db_crm2631-pgtap-recovery-01a09d84` was preserved on port55471, rooted at `/home/braden/tmp/crm2631-pgtap-recovery-01a09d84`; establish ownership before resetting/disposal. Jodie10400 remains unapplied.

### Conduit PR722 — local commit not pushed; review finding open

Worktree: `/home/braden/Desktop/Dev/.worktrees/codex-conduit-permission-recovery`. Remote head `5d069599610d2dd2c7a87e6d9c88238f29007599`; latest local signed commit **`12b10d0838fe043152fca5b4738c65a6b016d9f7` is not pushed**.

Recovery includes ten confirmation consumers' authority/lifecycle guards, tenant-bound request generations, provider-ID retention before persistence, same-tab retries without creating another event, and four recovered Deno/preflight commits. Earlier 1,960 unit assertions and 18 Deno tests passed. Durable calendar idempotency across reloads/tabs remains open: E/`bsu-calendar-create-idempotency-plan.md`; do not claim it solved.

New #711 fixture uses a hash-bound public-schema-only snapshot, config-only scratch Supabase CLI2.116.0, real local GoTrue Admin/password login and ordinary tenant owner membership. Local full E2E: **18/18, zero skipped/failed/flaky**, including eight gated route/theme cases. No paid branch or production credential is required. Existing untracked `supabase/.temp/` was preserved.

Before pushing, fix the primary's unresolved review finding: `conduit/scripts/assert-conduit-e2e-matrix.mjs (planned)` (on conduit `development` at `e76d925`; it reaches this parent's tree when the conduit gitlink advances) counts 18 passed tests but does **not** verify the identities of the claimed eight gated cases. Add a control where unrelated passing cases replace a missing gated case and ensure refusal; keep the real eight required routes/themes and auth producer mandatory. Review cleanup and local-target guards, then run relevant checks and hosted CI. E/`conduit-711-runner-local-b2-evidence.json`, `conduit-711-runner-local-fixture-plan.md` and gate JSON describe local evidence only. #713 migration drift remains separate; do not replay all historical Conduit migrations to create this fixture.

### Braden, packages and other remaining refs

Braden621 merged after signed `fc75a032eade1087dbb5fd0969d8aab900e54940`, all nine hosted checks and final-preview verification of four live service card/detail/return journeys, research category selection and sticky-header jump clearance. Three research grid cards fit measured viewports; status is explicitly dated. No enquiry was sent. Full development/production D8 and persisted enquiry acceptance are not complete. Migration `20261119221503` remains unapplied; earlier slug DDL exists live without matching ledger entries, so reconcile honestly. Evidence E/`braden621-current-pr-body.md`, `braden621-review-response.md` and preview records.

Parent open PRs: **3256** Conduit security allowlists (coordinate pending 27→26 argument contraction); **3254 MERGE LAST** scrollbar consumer gate; **3250** selective stable auth; **3236** development→main release with stale narrow title. Never merge a stale production description blindly.

Auth3250 head `92395122cff5f19252fd9a7b0485db7cecd2c44e`: source matches accepted development `ae8630cc2d4864258c987a4e86ada39d5d1e142d`; 113 tests and 12/12 built files matching `1.0.1-next.1` were recorded. Final independent security trace remained unfinished. No visual sign-off label was applied. Required Conduit d.* evidence includes tenantA/B login, A logout with B isolation, consumed callback recovery without a second exchange, exact SHA and UI/network proof. Do not manufacture that label.

Last registry check: auth latest1.0.0 / next1.0.1-next.1; theme latest1.5.1 / next1.5.2-next.0; data-grid latest3.0.3 / next3.0.4-next.2; workflow-canvas latest0.2.3 / next0.3.0-rc.4. Development consumers still contain prerelease pins. Resolve stable publication and consumer lockfiles in dependency order before production; do not downgrade or silently promote prereleases. Parent gitlinks last.

CRM2623 main→development synchronization remains open. Local `fix/crm7-2604-workflow-canvas-rc4` at `22fd2c1a5` includes `codex/workflow-chrome-regions` at `bec7f723e`; do not double-apply them. `fix/encryption-pass-mime-and-failure-paths` at `214d37b51` is unique security-sensitive work requiring review. Old CRM2618 and Conduit710 should be closed/retired only after their recovery PRs fully account for their work. Discover remaining refs from the preserved census, then check current content.

## User-reported product defects that must survive handoff

At `https://ideas.crm7.app/`, the operator marked the “Ready to Launch →” action overflowing its card at viewport672×699 and the floating Jodie launcher using a missing/wrong logo. These are platform-wide sibling-pattern concerns, not just one label. Track through throughput486/479 and BSU1174 and the existing queue; verify mappings live before creating duplicates. E/`operator-throughput-672x699-measurement.json` recorded about49.77px overflow. Neither defect was fixed in this task. Require actual responsive action containment and the canonical shared Jodie identity across enumerated apps, while preserving working actions and accessibility.

## Memory, schedules and acceptance

Use qig-memory MCP **BSuite silo only**, including `bsuite_project_truth_index`, current session/sleep packets and BSuite inbox. “Align all qig-memories” means align BSuite records hosted by that service; never read/write unrelated `qig_`, `vex_` or `pantheon_` namespaces. Read messages before acknowledging action. Supersede stale current pointers without erasing dated evidence. The last memory PUT/readback covered the six live migrations, but later pause/routing corrections may exist only in E; align those now.

Existing BSuite Codex/Hermes schedules are paused. Do not restart them or create new ones just because work exists. If a concrete recurring task is needed, inspect existing automation first; prefer a locked, bounded script, otherwise the lowest capable explicit model, narrow input, clear escalation and silence on unchanged state. No premium estate-wide polling agents.

Assess the previous task independently against `agent-definition-of-done`, `general-what-done-looks-like`, `bsuite-false-complete-gates`, `ops-ship-close-out`, the repository's Supabase/consumer gates and applicable D1–D10. Explicitly declare ui_touched, sibling counts, upstream/downstream reach, exact evidence, skipped tests, ownership, D9 real use and D10 disposal. D8 needs real entry→action→persisted effect→reload, clarity, minimal repeated entry and lossless return. Library/source equality is not deployed acceptance. Do not substitute a skill-install verifier for a task gate.

Record each lane as verified complete, incomplete, blocked with named unblock, superseded with evidence, or unknown. Keep one acceptance ledger. Finish with measured local/remote development/main refs, live deployment SHAs, exact applied migrations, package versions, preserved unresolved refs, disposed ephemera and remaining issues. No claim of “no regressions” without the corresponding evidence and limits.

## Use these skills/MCPs during the work

Skill root: `/home/braden/.agents/skills/<name>/SKILL.md`. Invoke `agent-run-master` first; run its filesystem inventory via `agent-skl-find`. Read only relevant skills per lane rather than loading every skill into every worker.

| Work | Required skills | MCP/tool use |
| --- | --- | --- |
| Boot, records, lanes | agent-run-master, agent-skl-find, agent-mem-truth, agent-mem-comms | qig-memory BSuite index/inbox; task tools and narrow local record searches |
| Prompt, execution and tiering | plan-prompt-enhancer, agent-cli-cc-subagents, agent-run-cli-fanout, agent-red-plan | Explicit bounded native/external workers; provider availability check, no exhausted Claude |
| Git recovery and cleanup | git-workflow, check-cleanup-scope-safety, check-code-quality, check-security | GitHub MCP or gh, local Git, verified bundles and content comparisons |
| Auth, migrations, fixture | research-best-practice, auth-supabase, auth-e2e-sso-testing, bsuite-supabase-migrations, bsuite-rls-authz-red-team, bsuite-conduit-deploy-testing | Context7 exact installed versions; Supabase live catalog/ledger; actual browser auth; isolated local DB |
| UI and shared patterns | bsuite-fix-the-class-not-the-page, bsuite-brand-system, bsuite-react-testing, bsuite-reliability-red-team | Playwright/chrome-devtools or governed available browser; required theme/viewport matrix and actual saved-state journeys |
| Release and closeout | ops-ship-all-apps, bsuite-ship-visual-promote, bsuite-live-lane-closeout, ops-ship-close-out, agent-definition-of-done, general-what-done-looks-like, bsuite-false-complete-gates | GitHub checks, Vercel exact-SHA deployment, visual probe, DoD report and cleanup receipts |

Capability observations from the old task are dated: Supabase MCP and GitHub CLI worked; Vercel MCP authentication failed but CLI worked; Context7 quota was exhausted; qig-memory MCP was absent and its documented authenticated REST fallback worked. Probe availability once and use documented fallbacks without bypassing auth or exposing credentials. For actual runtime edits, query Context7, use official docs if blocked, and inspect installed source. Relevant official references already used: Supabase OAuth server/token security, CLI local development and Admin createUser documentation; local `AUTH_CANONICAL.md` remains binding.

Canonical standards to read when applicable: `docs/20260227-contributing-standards-guide-v1.01W.md`, `docs/20260227-dry-one-shot-architecture-v1.04A.md`, `docs/20260731-platform-operations-reference-v1.00W.md`, `docs/20260731-supabase-verification-gates-v1.00W.md`, `docs/20260507-ff-self-validation-doctrine-v1.00W.md`, `docs/testing/README.md`, `DESIGN.md` and each app's `CONTRIBUTING.md`. The retired plan dashboard is not the live status authority; use issues, PRs, deployments and actual catalog state.

Start by confirming the preserved dirty work, capturing a compact ref/ownership delta, and assigning one low-cost bounded lane to the CRM baseline/replay gap and one to the Conduit matrix-gate gap where safe. High-end coordination should make decisions, not repeat the entire prior investigation. This takeover prompt is permission to continue the authorized work in the new task; it is not a claim that the previous task completed it.
