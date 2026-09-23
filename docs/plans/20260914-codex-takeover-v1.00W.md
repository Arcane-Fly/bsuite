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

The operator authorized production releases through the normal PR gates and necessary reversible development work. Do not repeatedly seek routine permission. Do not bypass failed gates to manufacture synchronization. If a genuine blocker prevents convergence, identify the exact blocker and retained refs; continue independent authorized work rather than inventing success.

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

Before pushing, fix the primary's unresolved review finding: `scripts/assert-conduit-e2e-matrix.mjs` counts 18 passed tests but does **not** verify the identities of the claimed eight gated cases. Add a control where unrelated passing cases replace a missing gated case and ensure refusal; keep the real eight required routes/themes and auth producer mandatory. Review cleanup and local-target guards, then run relevant checks and hosted CI. E/`conduit-711-runner-local-b2-evidence.json`, `conduit-711-runner-local-fixture-plan.md` and gate JSON describe local evidence only. #713 migration drift remains separate; do not replay all historical Conduit migrations to create this fixture.

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

---

# Maintenance pass — 2026-09-17 (measured; supersedes the checkpoint values above)

Maintained by `qwen-bsuite-accountability` under the operator ruling of 2026-09-17 15:39 AWST.
Everything above this line is the **2026-09-14 record and is preserved unedited** — it was
correct when written, and back-dating it would destroy the record this estate relies on. Where a
value above is now wrong, the correction is here, with the command that produced it. **Where this
section and the section above disagree, this section wins.**

Status after this pass: **project work remains INCOMPLETE.** This is a maintenance and
disposition pass, not a DoD approval and not a convergence claim. No `ops-ship-all-apps` or
`ops-ship-close-out` run has happened; no main promotion is recorded as complete.

## 1. Role and authority — the cost/delegation contract above is obsolete

The contract above was written for a Codex IDE coordinator with Claude exhausted. **Both halves
are now inverted.** Codex is out of usage; Claude is the designated executor.

| Seat | 2026-09-14 plan | Measured 2026-09-17 |
| --- | --- | --- |
| Execution owner | Codex IDE task, "take ownership of the preserved work from `01a09d84`" | Claude Code session `b6ddc034-29d4-4a71-9c93-f4cea504fb80`, handle `claude-code-bsuite-owner-b6ddc034`, owns **all** lanes including Codex's former in-flight work |
| External accountability | Codex `01a0a2ca` / `01a07f58` | **Qwen Code**, handle `qwen-bsuite-accountability`; read-only; verdicts on the `bsuite` inbox as `REVIEW` (APPROVE \| SEND_BACK with file:line) or `BLOCKER` |
| Maker-internal conscience | not described | gemini (`agy --model gemini-3.8-flash-low`, conscience routes, fields `affirmation/now/past/next/evidence_refs`, never issues ALLOW/HOLD) |
| Maker-internal work review | not described | grok (`reviewer-grok.py --model grok-4.6`, packet-only, tools denied, via `bsuite-accountability.timer`) |

Operator rulings now governing, verbatim: 15:39 AWST *"Qwen is taking over the codex
accountability function due to codex usage limits hit. and all other lanes are yours. no more are
active or available so take 100% ownership."* · 15:51 AWST *"make sure you're getting your
accountability from /agent-mem-comms"* · 16:20 AWST the orphaned grok review *"needs to be pointed
at the current session"*, and the three layers are deliberate: **grok is work-specific internal
self-accountability, gemini is self-narrative conscience, Qwen is the external and broader
supervisor.** Do not collapse them.

Consequences for the delegation contract above: the Codex weekly-allowance figure, the
Terra/Sol/Luna tiering and the "Claude was exhausted: do not dispatch or retry it" instruction are
all **void**. What survives it unchanged: deterministic scripts first for inventories and polls;
at most two useful worker lanes with one writer per file set; reserve high/frontier calls for a
specific architectural or irreversible decision, a defect surviving two sound attempts, or a
bounded final security/merge review; compact briefs carrying explicit model, allowed files,
acceptance checks, evidence path and stop condition; check usage at phase boundaries, not per
operation. **All preservation boundaries, signing/promotion rules and lockfile rules above remain
in force verbatim.**

## 2. Corrections to the preserved execution checkpoint

| Plan claim (2026-09-14) | Measured 2026-09-17 | Evidence |
| --- | --- | --- |
| "Conduit PR722 — local commit not pushed"; `12b10d08…` is not pushed | **REFUTED — pushed** | `git rev-list --count 12b10d08 --not --remotes` = **0**; `git branch -a --contains` lists it on `remotes/origin/codex/conduit-*` |
| Conduit matrix-gate review finding open: `assert-conduit-e2e-matrix.mjs` "counts 18 passed tests but does not verify the identities of the claimed eight gated cases" | **CLOSED and merged to `origin/development`** | at `e8bab9b` the script has `export const REQUIRED_CASES` (:7) and asserts each required case matches **exactly once** by `spec.title` + `spec.file` + `test.projectName` (:41-45), plus `expectedStatus === 'passed'` with exactly one result (:37); `git merge-base --is-ancestor e8bab9b origin/development` exits 0. Predecessor `a3850b9` "require exact authenticated e2e results" |
| "CRM PR2631 — dirty recovery, native replay still required" | **PR MERGED**; native-replay precondition **UNKNOWN** | crm7#2631 `merged=true`, `merge_commit c6e355de4516d0548aeb563d97a87beee6f16c0a`, `merged_at 2026-09-14T09:31:52Z`, **parents=2, verified=true, reason=valid** — ~2.5 h *after* this plan was written. `f8fd2b19` unpushed count 0 |
| "Canonical baseline files were **not** refreshed after those captures" | **Baseline exists on `origin/development`** | `supabase/migrations/baseline/` holds `20260914_prod_baseline_schema_dump.sql`, `RECONCILIATION-INVENTORY.md`, `applied-versions-20260914.txt` (9 baseline-named paths). Note the path is `supabase/migrations/baseline/`, **not** `supabase/baseline/`. Whether the native 128-suite run happened with **no manual sibling overlays** is **UNKNOWN — not done** |
| Recovery container "preserved on port 55471 … establish ownership before resetting/disposal" | **Exited (0)**; ownership now the executor's; **D10 disposal outstanding** | `docker ps -a --filter name=crm2631-pgtap-recovery` → `supabase_db_crm2631-pgtap-recovery-01a09d84 \| Exited (0)`. Not touched by this pass |
| Operator defects tracked "through throughput486/479 and BSU1174" | **Mapping is WRONG for the overflow half — that defect is tracked NOWHERE** | see §3 |
| Ledger "370 rows = 340 + 30" | **CONFIRMED still 370** | `bsuite-accountability-state.py`: baseline 340 + additions 30 = expected 370, observed 370, `CONSISTENT_EXPLICIT_BASELINE_PLUS_ADDITIONS`; status counts `completed=1, in_progress=6, pending=363` |
| "Existing BSuite Codex/Hermes schedules are paused" | `bsuite-accountability.timer` was found **disabled + inactive**, now **re-enabled and proven** | see §4 |

The plan's recorded development heads, the "no main promotions were completed" claim, the
branch/worktree/stash totals (65/18/19/6), the parent open-PR set, the package registry versions
and the six applied migrations were **not re-measured by this pass** and must not be relied on.
They are re-measured in §5.

## 3. Operator-reported defects — one is untracked (highest-priority handoff gap)

The section above is headed *"must survive handoff"*. Half of it would not have.

- **Jodie identity** — correctly tracked: `throughput-479` (floating button renders a generic SVG,
  repo has no `/logos/jodie.png`) and `business-suite-unified-1174` (Idea Hub panel header uses a
  lucide `<Bot>`). Both rows exist in the ledger, both `pending`, both issues `OPEN` and **untouched
  since 2026-09-06 — 11 days**. Sibling measurement for D8.1: a Jodie asset exists in **3 of 6**
  apps (`business-suite-unified` 1, `crm7` 1, `conduit` 1) and **0** in `braden`, `R80.4`,
  `throughput`. Still rendering generic lucide icons: `business-suite-unified/src/components/ideas/JodieAI.tsx:159,194,213`
  (`<Bot>`) and `pages/ideas/detail.tsx:70` (`Icon: Bot`); `crm7/src/components/ai/AIFloatingButton.tsx`
  uses `<Sparkles>` (its own comment calls it decoration). `business-suite-unified/src/components/ai/JodieShell.tsx:17`
  records that the shell already "shares its ARTWORK too" — so the class is **partially fixed and
  the fix has not been swept**, which is exactly what `SR-BS-APPLY-EVERYWHERE` forbids.
- **"Ready to Launch →" card overflow — NOT TRACKED ANYWHERE.** The measurement is real and
  specific (`E/operator-throughput-672x699-measurement.json`): `https://ideas.crm7.app/`, viewport
  **672×699**, action right `442.2734375` vs card right `392.5`, `right_overflow_px`
  **49.7734375**, `verdict: FAIL`. But `gh search issues "Ready to Launch"` across `throughput`,
  `business-suite-unified`, `crm7` and `bsuite` returns **zero results**, and a scan of all 370
  ledger rows for `ready to launch|672|overflow|49.77|ideas.crm7|jodie logo|floating button|generic svg`
  returns 8 rows, **none of which is this defect**. `throughput-486` is a *different* element at a
  *different* viewport ("the 'Capture' stage heading truncates itself at 390px on /"). The plan's
  instruction to track the overflow through #486 would have closed it against the wrong row.
  **Required:** file a row for the `ideas.crm7.app` 672×699 "Ready to Launch →" overflow and add it
  to the ledger as a recorded addition, or name the existing row that genuinely covers it. The
  responsive-containment class already has **5** sibling ledger rows — `bsuite-3139` (visual-gate
  instrumentation, `clippedHeading` false-positives on `overflow:visible`), `bsuite-2542`
  (page-builder `h-full` in an `autoHeight` slot), `crm7-1173` (no WebKit CI target; "fixed escapes
  `overflow-hidden`"), `braden-576` (tablet nav overflows at 768px), `throughput-486` — so with this
  one it is a **6-surface class**, and D8.1 requires that number stated, not "checked the others".

## 4. Accountability harness — orphaned, wedged, and repaired this pass

The grok self-review loop was pinned to session `ba169564-a7ad-4a52-a7a5-aa47e6def669`, whose
attention record reads `status: ended` at 15:41 AWST after 1123 generations and 5410 tool calls.
Five `ADVISE` advisories (23:01Z–01:47Z) reached nobody — three `delivery_failed`, two enqueued then
`expired` with `outcomes=0`. The fingerprint froze at `2d0da0560bfe`, so every later run logged
`state unchanged — quiet`: **a frozen observation target makes QUIET indistinguishable from a clean
bill of health.** Worse, `bsuite-accountability-owner-activity.py` derives its transcript prefix from
the ledger's `owner.dispatch_and_release`, so the review was reading the *dead* transcript and
reporting a permanent **false stall** (`latest_visible_assistant` = `"No response requested."` at
03:40Z, `stale_over_40m: true`).

Separately, one 193-character string disabled the whole supervision layer: the session contract's
criteria were C1=193, C2=105, C3=130, C4=66 chars, `working-memory.py:76-78` caps each at **120** and
raises, `external-supervisor.objective()` falls back to `contract.criteria`, so `working_recall`
raised → `handle_hook` raised → `session-context.py:410` **fails closed** → blanket deny on every
mutating tool. The same exception crash-looped `agents-external-supervisor.service` to restart
counter 6; systemd gave up at 16:12:45, the heartbeat froze, and `decision_gap` then denied on
staleness too. Root cause of the class: `contract_check` (`session-context.py:112-126`) validates
criteria as at most 100 **entries** but never checks **per-string length** (`grep -c 120
session-context.py` = 0).

Repaired and **proven end to end**: criteria reworded via the sanctioned `session-context.py revise`
(C1→115, C3→116, C2/C4 untouched, `revision_reason` + `criterion_dispositions` recorded, generation
1→2); daemon `reset-failed` + restarted → generation-2 `ALLOW` via `grok-independent`; policy
`.learning.sessions` and `.task_context.sessions` completed; ledger `owner.dispatch_and_release`
repointed under `flock` with the prior owner preserved verbatim under `owner.previous`, an
`ownership_trail` entry appended and `cycle_20260917T0835Z` added (370 items preserved; sha
`9a57f759f4b291ea` → `cebebdf376ed7752`); timer re-enabled. `owner-activity` now returns
`OWNER_ACTIVITY_OBSERVED` with `stale_over_40m: false`, and `review.log [20260917T080733Z] ADVISE`
delivered `scheduled-bsuite-efac4be8f5e64bc2caf5963c` to `b6ddc034`, now `emission_prepared` — the
first advisory actually emitted since the session rolled. `bsuite-accountability-delivery.py` was
independently rewritten by the executor at 16:10 to resolve its target from policy `.sessions`
("One list, one repoint"), with `test_bsuite_accountability_delivery.py` passing.

Backups: `~/.agents/state/hermes-queue.before-owner-repoint-20260917.json`,
`~/.agents/state/attention-b6ddc034.before-criteria-fix-20260917.json`,
`~/.agents/state/external-supervisor-policy.before-qwen-complete-repoint-20260917.json`.

Still open, with owners named in §6: the 120-char bind-time validation; the reviewer escaping its
packet-only boundary (20 of 91 advisories contain "File reads were blocked", 4 "memory lookup";
42 of 91 fail strict `json.load`); `unpushed=?` still emitted by `review.sh`; all **131 of 131**
persisted supervisor history records have empty `reason`/`findings`/`failures`/`billing_cost`/
`verified_outcome`, so supervision effectiveness is unmeasurable; `review.sh:3` still says "hourly"
against a 20-minute timer; and the `20260910-external-supervisor` README prescribes a
`SupervisorAttach` event that exists **only in test fixtures**.

## 5. Re-measured state

Measured 2026-09-17 ~17:10 AWST by `qwen-bsuite-accountability`. Read-only; no fetch, no
mutation. Each row is reproducible from the command in the third column.

### 5.1 development → main convergence (plan item 2)

`git rev-parse --short origin/development origin/main` and
`git rev-list --count origin/main..origin/development`, run inside each repo:

| Repository | `origin/development` | `origin/main` | commits in development not in main |
| --- | --- | --- | --- |
| bsuite (parent) | `5f79a55e4` | `a99ba3136` | **176** |
| crm7 | `9dd290147` | `9a6c185b7` | **137** |
| conduit | `4245e84` | `8604c9f` | **80** |
| business-suite-unified | `9fc6277` | `37ebbb4` | **58** |
| braden | `19d5a0a` | `1bb3227` | **32** |
| throughput | `87ec5f0` | `3a56985` | **14** |
| R80.4 | `ac5b909` | `10187e2` | **11** |
| **Total** | | | **508** |

The plan's claim *"No main promotions were completed; development and main are not synchronized"*
is **CONFIRMED and quantified: 508 commits** of merged development work have never been promoted.
Only the `main..development` direction was measured; the reverse was not, so do not infer that a
fast-forward is possible — every repo's two heads differ, and promotion will need true merge
commits (`gh pr merge --merge`, per `SR-BS-4`).

### 5.2 Live production deployment SHAs (the D8 "exact deployed SHA" limb)

`curl -fsS https://<host>/version.json` (braden.com.au needs `-L`):

| Host | Deployed commit | `builtAt` | Equals `origin/main`? |
| --- | --- | --- | --- |
| `crm.crm7.app` | `9a6c185` | 2026-09-11T12:04:04Z | **YES** — crm7 `origin/main` is `9a6c185b7` |
| `conduit.crm7.app` | `8604c9f` | 2026-09-09T09:28:55Z | **YES** — conduit `origin/main` is `8604c9f` |
| `braden.com.au` | `1bb3227` | 2026-09-11T08:52:28Z | **YES** — braden `origin/main` is `1bb3227` |

**Production tracks `main`, not `development`.** That is the whole story in one line: users are
serving `main`, and `main` is 137 commits (crm7), 80 (conduit) and 32 (braden) behind what has
already been reviewed and merged to `development`. crm7 production is a **2026-09-11 build — six
days and 137 commits stale**, and it predates crm7 #2631, #2640, #2642, #2643, #2644 and #2646,
all of which are merged to `development`.

This also resolves an apparent anomaly: `git merge-base --is-ancestor 8604c9f origin/development`
**fails** for conduit's deployed commit, which looks like an off-branch build. It is not — `8604c9f`
*is* conduit's `origin/main` head, and main has simply diverged from development. A deployed SHA
that is not an ancestor of development is expected under this promotion model and is **not** by
itself a defect; it becomes one only if main carries something development lacks, which was not
measured here.

Consequence for D8: any "deployed acceptance" claim must be made against these SHAs, and none of
the last week's merged work can be D8-accepted on production until a promotion happens. The plan's
own hold is the gate — *"crm7 development→main promotion needs Braden's visual pass on
d.crm.crm7.app"* — so **508 commits are queued behind one operator visual pass.** That is the
single largest blocker to item 2 and item 5, and it is not an engineering blocker.

### 5.3 Not re-measured by this pass

The six applied production migrations (receipts exist in `E`; no live `schema_migrations` query was
run — agents are SELECT-only and none was attempted), open-PR check rollups, `unpushed` totals with
the corrected instrument, branch/worktree/stash counts against the plan's 65/18/19/6, published
package dist-tags against the plan's recorded versions, and the sha256 of the two
`crm2631-postapply-*-raw.sql` captures against the values recorded above. A full census covering
these was in flight when this section was written; **do not treat the plan's 2026-09-14 values for
these items as current.**

## 6. Acceptance ledger — one line per plan section

Per the plan's own requirement: *"Record each lane as verified complete, incomplete, blocked with
named unblock, superseded with evidence, or unknown. Keep one acceptance ledger."*

| Plan section | Disposition | Named unblock / evidence |
| --- | --- | --- |
| Conduit matrix-gate identity control | **VERIFIED COMPLETE** | `e8bab9b` on `origin/development`, `REQUIRED_CASES` :7 + exactly-once assertion :41-45 |
| Conduit `12b10d08` push | **VERIFIED COMPLETE** | unpushed count 0; contained in `remotes/origin/codex/conduit-*` |
| crm7#2631 merge | **VERIFIED COMPLETE (merge only)** | `c6e355de4`, 2 parents, `verified=true` |
| crm7#2631 native 128-suite replay from the checked-in baseline, no sibling overlays | **UNKNOWN** | baseline files exist at `supabase/migrations/baseline/`; no native-run receipt located |
| Recovery container + `/home/braden/tmp/crm2631-pgtap-recovery-01a09d84` disposal (D10) | **INCOMPLETE** | container `Exited (0)`; executor to dispose with the command recorded, or state retention reason |
| Operator defect — Jodie identity class | **INCOMPLETE** | `throughput-479`, `business-suite-unified-1174` both `pending`/OPEN since 09-06; asset in 3 of 6 apps; `JodieAI.tsx` still `<Bot>` |
| Operator defect — "Ready to Launch →" 672×699 overflow | **BLOCKED-WITH-NAMED-UNBLOCK** | no issue and no ledger row exists; file the row (6-surface class) |
| Six applied production migrations | **NOT RE-VERIFIED THIS PASS** | receipts present in `E`; live `schema_migrations` not queried (agents are SELECT-only and no query was run) |
| braden621, auth3250, parent PRs 3256/3254/3250/3236, registry versions, development/main convergence | **NOT RE-VERIFIED IN THIS TABLE** | see §5 census |
| Accountability harness repoint | **VERIFIED COMPLETE** | advisory `emission_prepared` to `b6ddc034`; `owner-activity` `stale_over_40m: false` |
| Harness recurrence fix (120-char bind-time cap; `objective()` must degrade not raise) | **INCOMPLETE — executor** | `grep -c 120 session-context.py` = 0; regression coverage + 114-test baseline required |
| Supervisor history auditability (131/131 empty) | **INCOMPLETE — accountability** | owned by `qwen-bsuite-accountability`. Root cause located: `~/.agents/hooks/review-evidence.py:175-187`. Line 182 copies only `at/decision_id/route/verdict/evidence_hash/duration_ms` from the result, so `reason`, `findings` and `failures` are **never written**; line 185 **hardcodes** `billing_cost=None, verified_outcome=None`; line 187 persists `rows[-128:]` only. Full reason/findings survive solely in the per-session `decisions/<sha>.json`, which the next review overwrites — so past HOLD reasoning is destroyed and effectiveness is permanently unmeasurable. Fix shape: copy a bounded/redacted `reason` plus a findings **count and ids** (not full text — the runbook's redaction rule is deliberate), and populate `verified_outcome` from the `operator-advisory.py record-outcome` attestation channel so "did this review change anything" becomes answerable. Hook file, so the executor holds the edit lane |
| `bsuite_project_truth_index.current_coordination` still names `codex-bsuite-closeout-01a09d84` | **INCOMPLETE — executor** | superseded by memory key `bsuite_current_coordination_20260917`; must be updated **programmatically** (REST PUT from file with length + sha256 comparison) — never retyped through a tool argument, which truncates silently above ~8 KB |
| Items 2 and 5 of "Operator intent and scope" (development→main in seven repos; `ops-ship-all-apps` / `ops-ship-close-out`) | **INCOMPLETE** | no main promotion evidenced; no closeout run |

## 7. Caution for the next editor of this file

This file is **staged but never committed** in the parent (`git log -- docs/plans/20260914-codex-takeover-v1.00W.md`
is empty; `git status --porcelain` shows `A`), inside a changeset that also stages all six submodule
gitlinks and `docs/adr/ADR-0012-operator-decision-register-20260916.md`. This maintenance pass was
appended to the **working-tree** copy, so the file now reads `AM`: **re-stage it before committing
or the maintenance is silently lost.** The staged gitlinks were not touched by this pass, but note
the plan's own rule — *"Parent gitlinks move last and must reference each app's accepted main"* —
while no main promotion is recorded, so verify those six staged pointers are intentional before
they ride along in a commit.
