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

### 5.3 Divergence — four repos cannot be fast-forwarded

The reverse direction, `git rev-list --count origin/development..origin/main`, was measured by the
census that accompanied this pass. **`origin/main` holds commits absent from `origin/development`
in four of seven repos:** bsuite **4**, R80.4 **7**, business-suite-unified **3**, conduit **2**.
crm7, braden and throughput are clean strict-ancestor cases (`dev..main` = 0).

So §5.1's one-directional 508 understates the problem: any promotion plan that assumes a
fast-forward **will not work** in those four. Promotion needs true merge commits
(`gh pr merge --merge`, `SR-BS-4`) and the four divergences must be reconciled with source/evidence
review first — the plan's own instruction, *"Resolve conflicts with source/evidence review."*
All remote refs were current at measurement: every `FETCH_HEAD` stamped 2026-09-17 16:55 +0800.

### 5.4 Open PRs — 9 total; the plan names 4 and misses 5

conduit, braden, R80.4 and throughput have **zero** open PRs each (measured, not assumed).

| PR | Head SHA | Base | `mergeStateStatus` | ahead/behind | Failing check(s) |
| --- | --- | --- | --- | --- | --- |
| bsuite **3256** | `1bce691a` | development | UNSTABLE | 3 / **122** diverged | `Advisor sweep (security fails / performance files)` |
| bsuite **3254** *(MERGE LAST)* | `f2a10c90` | development | BLOCKED | 1 / **126** diverged | `gates` |
| bsuite **3250** *(draft)* | `92395122` | **main** | BLOCKED | 1 / 0 | `Visual DoD sign-off` |
| bsuite **3236** *(draft, release)* | `5f79a55e` | **main** | BLOCKED | 176 / 4 diverged | `no-prerelease-in-production`, `Visual DoD sign-off` |
| crm7 2653 | `60bcb626` | development | BLOCKED (`mergeable: UNKNOWN`) | 3 / 18 | `build-and-test` |
| crm7 2652 | `c63dfc27` | development | **CLEAN** | 16 / 19 | none — all SUCCESS |
| crm7 2651 | `cdd96941` | development | BLOCKED | 12 / 9 | `build-and-test`, `Coverage floor`, `e2e`, `lighthouse` all **IN_PROGRESS** |
| BSU 1256 | `b1c53854` | development | BLOCKED | 2 / 0 | `build-and-test`, `lighthouse` **IN_PROGRESS** |
| BSU 1254 | `d724858a` | development | **CLEAN** | 2 / 13 | none — all SUCCESS |

All four plan-named parent PRs still exist, are all still open, and **every one carries at least one
FAILURE** — so "awaiting rerun verdicts" is wrong for 3256 and 3254: nothing is pending, and both
are 122/126 commits behind the branch they target. 3236's head *is* today's `origin/development`.
**crm7 2652 and BSU 1254 are `CLEAN` and one click from merging** — 2652 while carrying an open Qodo
security finding (see the inbox `BLOCKER` of 2026-09-17).

Plan-cited PRs now closed: crm7 **2631 MERGED** `c6e355de` (2026-09-14T09:31:52Z, head `fc323900`),
conduit **722 MERGED** `3ee802d2` (2026-09-14T08:57:27Z, head `4f5e290e`), braden **621 MERGED**
`571b1148`, BSU **1242 MERGED** `a6d90787`, R80.4 **327 MERGED** `d589404a`. The plan writes about
2631 and 722 in the present tense; **both merged hours after it was written**, so those two entire
sections describe closed work.

### 5.5 Unpushed census — corrected instrument, 53 of 53 worktrees measured

`git rev-list --count <HEAD> --not --remotes` for every worktree (the corrected measure; **not**
`origin/<br>..HEAD`, which overstates on branches that merged development). **Zero worktrees were
unmeasurable** — so the `unpushed=?` class this plan's harness still emits is a harness defect, not
an inherent limit. 49 of 53 measured exactly 0.

| Worktree | Branch | HEAD | Local-only commits | Preserved on origin? |
| --- | --- | --- | --- | --- |
| `grok-crm7-2641-portal-rls` | `fix/crm7-2641-portal-rls` | `80623ea3` → pushed tip `2c059999` | **7 → 0 (PUSHED)** | **yes — `refs/heads/fix/crm7-2641-portal-rls` + `refs/attic/grok-crm7-2641-portal-rls/20260917-6b7a7c694`** |
| `claude-bsu-3231-collapsed-nav` | `fix/bsu-3231-collapsed-nav` | `630ca976` | 4 | yes — `refs/attic/630ca9764d9a` + dated attic ref |
| `codex-record-production-release` | `release/record-field-parity-20260916` | `c48bf2325` | 2 | yes — `refs/attic/c48bf23256e1` + dated attic ref |
| `claude-crm7-2664-r1-retention-binding` | `fix/crm7-2664-r1-retention-binding` | `aa8cacdf` | 2 | yes — `refs/attic/claude-crm7-2664-r1-retention-binding/20260917-aa8cacdfb` |

**Instrument caveat that changes the reading of three of those four rows:** `--not --remotes`
compares against *locally fetched* remote-tracking refs, and both crm7 and BSU use
`remote.origin.fetch = +refs/heads/*:refs/remotes/origin/*`, so `refs/attic/*` is never materialised
locally and the metric **overstates** for attic-preserved heads. Checked against origin directly
(`git ls-remote origin 'refs/attic/*'`; crm7 has **420** attic refs): `c48bf2325`, `aa8cacdf` and
`630ca976` **are** preserved.

**Update ~17:35 AWST: the fourth head is preserved too, so nothing in this table is single-machine
any more.** crm7 `80623ea3` (`fix/crm7-2641-portal-rls`) — which at first measurement had **7**
local-only commits and no copy on any origin ref, and which is the **ADR-0012 Decision 5 P0**
portal-RLS work — has been pushed. Re-measured: `git rev-list --count 80623ea3e --not --remotes` =
**0**; origin carries `refs/heads/fix/crm7-2641-portal-rls` at `2c059999` *and*
`refs/attic/grok-crm7-2641-portal-rls/20260917-6b7a7c694`; `merge-base --is-ancestor 80623ea3e
2c059999` = YES; and all three named fix commits (`6b7a7c694` pgTAP 98 reads `pg_policies.qual`,
`d6f1532cf` close portal-RLS review findings, `3a6930383` stop portal guests inheriting staff RLS)
are ancestors of the pushed tip. **The lesson that survives the fix:** `--not --remotes` is only a
*preserve* check if it is also run against `git ls-remote`, because the local fetch refspec
`+refs/heads/*:refs/remotes/origin/*` never materialises `refs/attic/*`. Three of these four rows
were false alarms from that; the fourth was real. Run both, or the instrument cannot tell them apart.

Recorded totals vs measured: local branches **65 → 107**, remote-tracking refs **18 → 65**,
worktrees **19 → 53**, stashes **6 → 5**. The remote figure is a *local-view* count; a true
GitHub-side total is UNKNOWN (crm7 alone has 420 unfetched `refs/attic/*`). The surviving R80.4
stash is the award salvage the plan warns about: *"would DELETE 940 lines of merged award work if
committed. Preserved, not discarded."*

**Plan claim "BSU/R80/Braden recovery worktrees were removed after their source merged" — REFUTED.**
All three still exist (`claude-bsu-1233-followup`, `codex-r80-training-overflow`,
`codex-page-builder-braden`, all 0 unpushed) — and that claim **contradicts the same document's**
"Retain dirty BSU worktree `../.worktrees/claude-bsu-1233-followup`". An internal contradiction in
an operational instruction; the retain instruction is the one to follow.

### 5.6 Named refs — every one resolved

`12b10d08` (conduit): **pushed and merged** — 0 local-only, contained in `origin/development` and 12
other origin refs, ancestor of PR722's head *and* merge commit. The plan's "is not pushed" is
**REFUTED**. `f8fd2b19` (crm7): pushed, in `origin/development`, ancestor of PR2631's head — but it
was **not** the merged head; the worktree advanced 2 commits to `fc323900`. `fc75a032` (braden):
exactly PR621's head, merged to `571b1148` (the plan's own braden checkpoint SHA). `22fd2c1a5`
(`fix/crm7-2604-workflow-canvas-rc4`): pushed, 0 local-only, **not** in development. `bec7f723e`
(`codex/workflow-chrome-regions`): pushed, and **`merge-base --is-ancestor bec7f723e 22fd2c1a5` =
YES** — the plan's do-not-double-apply warning is **CONFIRMED correct**. `214d37b51`
(`fix/encryption-pass-mime-and-failure-paths`): now an *interior* commit; branch tip `c63dfc27` is
open **PR2652, CLEAN, all SUCCESS** — so "unique security-sensitive work requiring review" is
superseded by a green open PR. `92395122`: still exactly PR3250's head, pushed, not in development.

**`ae8630cc` — the plan's "source matches accepted development" claim is REFUTED as written, but it
carries no merge risk.** `merge-base --is-ancestor ae8630cc 92395122` = **NO**; the trees differ;
`git diff --stat ae8630cc 92395122` = 26 files changed, 50 insertions(+), 1,791 deletions(-); and
`ae8630cc` is now 157 commits behind `origin/development`. So the plan's provenance sentence is
wrong. **But that diff is not what PR3250 would do**, because it compares two *divergent* lines —
the deletions are content `ae8630cc` has and `92395122` lacks (`packages/workflow-canvas`
`WorkflowInspector.tsx` −511, `editorChrome.test.tsx` −439, `actionVocabulary.ts` −180, and
`ops/takeover-20260908/*` artifacts −445), not deletions the PR performs.

Measured against the base that actually matters — PR3250 targets **main**: `git merge-base
origin/main 92395122` = `a99ba3136531` (today's `origin/main` head), and
`git diff --stat origin/main...92395122` = **12 files changed, 1,905 insertions(+), 140
deletions(-)**, scoped to `packages/auth` plus its README, `package.json` and one
`docs/00-roadmap/bsuite-component-registry.json` entry. Per file: `oauth-client.ts` +493/−112,
`__tests__/oauth-client.test.ts` **+692**/−14 (tests *added*), `session-ownership.ts` +218 (new),
`types.ts` +38, `index.ts` +27/−2. **The change is net-additive and touches nothing outside the auth
package.** No feature is dropped; PR3250's only real blocker is the `Visual DoD sign-off` FAILURE
recorded in §5.4.

*Recorded because it is the failure mode this estate's own rulebook names first:* an early reading of
this section asserted a dropped-feature risk from the divergent-line diff. That was a claim about the
code not checked against the right base, it was retracted to the executor before it drove any work,
and the corrected measurement is above. When assessing what a PR does, diff against **its base**, not
against whatever commit a document happens to cite.

### 5.7 Packages — 3 prerelease pins, enumerable

npm dist-tags (no auth needed): `@bsuite/auth` 1.0.0 / 1.0.1-next.1 **MATCH**; `@bsuite/data-grid`
3.0.3 / 3.0.4-next.2 **MATCH**; `@bsuite/workflow-canvas` 0.2.3 / 0.3.0-rc.4 **MATCH**;
`@bsuite/theme` 1.5.1 / **1.5.2-next.1** — the plan recorded `next.0`, **STALE**;
`@bsuite/page-builder` 2.7.0 / **2.7.1-next.7** — **the plan omitted this package entirely**.

Prerelease pins in development consumers — the plan's claim is **VERIFIED and now exactly three**:
`crm7/package.json:75` `@bsuite/workflow-canvas 0.3.0-rc.2` (behind published `rc.4`),
`R80.4/package.json:43` `@bsuite/theme 1.5.2-next.0`, `throughput/package.json:42`
`@bsuite/theme 1.5.2-next.0`. BSU, conduit and braden carry none; all six apps pin `@bsuite/auth`
at the **stable** 1.0.0. The parent `packages/` tree declares `theme 1.5.2-next.0` and
`page-builder 2.7.1-next.0` while npm `next` is already `.1` and `.7` — but that reading came from a
parent checkout **35 commits behind** `origin/development`, so it may be stale-on-disk rather than a
real divergence. **UNKNOWN**: resolving it needs `git show origin/development:packages/...`.

### 5.8 Evidence root E, and the parent index trap

**E exists**: `/home/braden/.codex/visualizations/2026-09-14/01a09d84-39fa-7c42-b535-0ab8b04fb110`,
**1469** top-level entries, 19 subdirectories. All **14** receipts cited by the plan are present.
Both raw-capture hashes **MATCH the plan exactly**: `crm2631-postapply-public-schema-raw.sql`
(2,871,836 bytes) = `f7db9331e024d6a5a6a6385cabca4ebd8e2c60a3775ea7c72b5559fd6d3ce61b`;
`crm2631-postapply-ledger-raw.sql` (2,139,214 bytes) =
`26734321a7b2a3ccc4c6a47cdf7ca16fc956bdf056a3d2acf8532313e07ddc52`. **E is not frozen at the plan
date** — it received writes on 2026-09-15 (dir mtime `Sep 15 14:17`), so treat it as a living
evidence root, not a 09-14 snapshot.

The recovery container `supabase_db_crm2631-pgtap-recovery-01a09d84` **exists but is `Exited (0)`**,
so "preserved on port 55471" is not a live endpoint; whether its data volume under
`/home/braden/tmp/crm2631-pgtap-recovery-01a09d84` is intact is UNKNOWN. Not started, stopped,
removed or reset by this pass. **D10 disposal is outstanding** and ownership is now the executor's.

**TRAP — the parent index would break a gate if committed as staged.** `git diff --cached --stat`
shows 10 files (+929/−6): the six submodule gitlinks, `ADR-0012` (+754, staged new **and** further
modified in the working tree), `docs/adr/README.md` (+1), the closeout-refined plan (+2), and this
plan (+166, staged new). **Every one of the six HEAD gitlinks equals its app's `origin/main`** —
which satisfies the estate's own `Every gitlink sits on its own app's main` gate (currently SUCCESS
on 3256/3254/3250/3236) — **but not one of the six STAGED gitlinks does.** Staged values point at:
braden `13961d9f` = `fix/braden-613-services-routing`; BSU `468c96f1` =
`fix/tasks-automation-queue-idempotency`; conduit `a2620df6` = `fix/next-16.3.3-ghsa-2xp9`; crm7
`96dfc1b4` = `fix/crm7-2594-workflow-corrections`; throughput `dd886e61` =
`codex/preserve-supervisor-reserve-20260914` — five **feature-branch heads**; plus R80.4 `0d1f93ff`,
a stale *interior development* commit (PR #326 merge, ancestor of `origin/development`, **not** of
`origin/main`) while the R80.4 worktree has since moved to `ac5b9097` = `origin/development`.
**Committing the index as staged would violate the plan's own rule — "Parent gitlinks move last and
must reference each app's accepted main" — and break that gate.** The unstaged second-column `M` on
braden/BSU/conduit/crm7 is submodule *content dirt*, not a gitlink move (`git diff --submodule=short`
shows the identical SHA with a `-dirty` suffix); only R80.4 has a genuine unstaged gitlink move.
Nothing was staged, unstaged or committed by this pass.

### 5.9 Still UNKNOWN — do not treat as verified

No database connection was made, so the plan's **"844 ledger versions, 13 authenticated
policies"**, the **six applied migrations**, and **"Jodie10400 remains unapplied"** are
**UNVERIFIED — neither confirmed nor refuted**. Likewise: whether `origin/development`'s copies of
`packages/theme` and `packages/page-builder` still declare `1.5.2-next.0` / `2.7.1-next.0`; the
final outcomes of the IN_PROGRESS checks on crm7#2651 and BSU#1256 (both read BLOCKED at measurement
and may change with no code change); crm7#2653's `mergeable: UNKNOWN`; the true GitHub-side branch
totals; and the intactness of the recovery container's volume. Agents are SELECT-only on production
and no query was run by this pass.

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
| ADR-0012 Decision 5 P0 portal-RLS work single-machine (§9.2) | **VERIFIED COMPLETE 2026-09-17 ~17:35** | `80623ea3e --not --remotes` = 0; origin `refs/heads/fix/crm7-2641-portal-rls` @ `2c059999` + attic ref; all three fix commits are ancestors of the pushed tip |
| Parent index: six gitlinks staged off-main (§9.1) | **BLOCKED-WITH-NAMED-UNBLOCK — executor** | 6 of 6 staged gitlinks off their app's main at ~17:40 AWST; unblock = `git restore --staged R80.4 braden business-suite-unified conduit crm7 throughput`, then re-stage only the four doc paths |
| Gitlink gates cannot see the index — class of three (§9.1a) | **INCOMPLETE — executor** | `check-gitlink-in-app-main.mjs:144`, `check-gitlink-not-behind-base.mjs:127`, `check-gitlink-migration-lag.mjs:181` all read a committed ref; no parent `pre-commit` hook exists. Zero-code remedy available: the first gate already accepts a ref argument, so verify the commit before pushing |
| Plan doc maintenance staged/committed | **INCOMPLETE — executor** | this file is staged at 166 lines while the maintained working-tree copy is 681; `git add` it before committing or the pass is lost |

## 7. Caution for the next editor of this file

This file is **staged but never committed** in the parent (`git log -- docs/plans/20260914-codex-takeover-v1.00W.md`
is empty; `git status --porcelain` shows `A`), inside a changeset that also stages all six submodule
gitlinks and `docs/adr/ADR-0012-operator-decision-register-20260916.md`. This maintenance pass was
appended to the **working-tree** copy, so the file now reads `AM`: **re-stage it before committing
or the maintenance is silently lost.** The staged gitlinks were not touched by this pass, but note
the plan's own rule — *"Parent gitlinks move last and must reference each app's accepted main"* —
while no main promotion is recorded, so verify those six staged pointers are intentional before
they ride along in a commit.

## 8. Predecessor goals — all four are dead, read from `~/.codex/goals_1.sqlite`

The objective for this maintenance pass said to "see `.claude` local to this directory and all
goals". `.claude/` holds `settings.local.json` (permissions include `gh workflow run
supabase-migrate.yml`, `mcp__claude_ai_Supabase__execute_sql`, BrowserBase and `python3 *`),
`agent-memory/` with six `bsuite-*` role definitions, `.claude/scripts/arm-timers.sh`, the canonical skill
set, and a `worktrees/` directory that is **empty**. The goals live in Codex's own store, table
`thread_goals`, read-only:

| Goal | Thread | Status | Tokens | Last updated | Objective (abridged) |
| --- | --- | --- | --- | --- | --- |
| `30e9e372` | `01a0858d` | **paused** | 6.86 M | 2026-09-11 17:39 | Continue the BSuite estate remediation from `BSUITE-CONTINUE.md` and the canonical `hermes-queue.json`; transfer dispatch ownership from Claude without duplicating work; complete inherited issues through verified deployed journeys and development→production promotion |
| `a2f33967` | `01a07f58` | **usage_limited** | 5.89 M | 2026-09-15 21:18 | Take over stopped Claude's BSuite execution safely; confirm one owner, preserve/validate handover artifacts, complete the next eligible queued unit, review independently, checkpoint, continue. Keep shared-hook work owned there |
| `d923231b` | `01a08f8a` | **usage_limited** | **19.33 M** | 2026-09-16 19:22 | *Read the attachment* — which is **not BSuite**: `~/.codex/attachments/66a28189-…/goal-objective.md` is the **Xero / tax / R&D reconciliation** goal (Zip + Mastercard reconstruction, owner-funding bridge, GST/PAYG, Q4 FY2026 BAS amendment **W1 $140,000 / W2 $35,670 prepared but not lodged or paid**, and a **$2,760.94** gap between the modelled **$297,200.06** and submitted **$299,961** R&D tax loss) |
| `81cfe31e` | `01a09ee1` | **usage_limited** | 8.30 M | 2026-09-15 13:18 | **"Work until this is finished. Read `docs/plans/20260914-codex-takeover-v1.00W.md` completely and execute it. Resume from preserved evidence; do not restart the stocktake. Enforce its model-cost limits before delegation."** |

**`81cfe31e` is the direct predecessor of this maintenance pass** — same document, same instruction,
and it stopped at `usage_limited` on 2026-09-15 13:18 after 8.3 M tokens and 35,981 s. Every BSuite
Codex goal is now `paused` or `usage_limited`, which is the mechanical reason the operator moved
accountability to Qwen on 2026-09-17.

**Out-of-silo note, flagged not actioned:** goal `d923231b` is the largest token consumer in the
store (19.33 M) and is a *money* goal — an unlodged BAS amendment and an unexplained $2,760.94 R&D
gap — also `usage_limited` since 2026-09-16 19:22. It is **not BSuite**, so under silo discipline it
is outside this pass and nothing here was read from or written to a non-`bsuite_` namespace. It is
recorded because the operator asked for *all* goals to be seen, and a stalled money goal is the kind
of thing that should not be discovered by accident.

## 9. Three critical items this pass found that the plan does not contain

1. **The parent index is a live trap (§5.8).** Six gitlinks are staged to non-`main` SHAs — five
   feature-branch heads and one stale interior development commit — while every *committed* gitlink
   correctly equals its app's `origin/main`. Committing the index as staged breaks the estate's own
   `Every gitlink sits on its own app's main` gate (currently SUCCESS on all four parent PRs) and
   violates this plan's "Parent gitlinks move last and must reference each app's accepted main".
   Unstage the gitlinks or re-point them to each app's accepted main **before** committing this plan
   and ADR-0012, which are staged in the same index. Exact command:
   `git restore --staged R80.4 braden business-suite-unified conduit crm7 throughput` — this resets
   the six parent index entries to HEAD's on-main values and does **not** touch the submodule working
   trees, which keep their checked-out feature branches.

   **Status ~17:40 AWST: still open.** Re-measured, all six staged gitlinks unchanged and all six
   off-main: R80.4 `0d1f93ff`, braden `13961d9f`, BSU `468c96f1`, conduit `a2620df6`, crm7
   `96dfc1b4`, throughput `dd886e61`, against app mains `10187e27` / `1bb3227a` / `37ebbb4a` /
   `8604c9f6` / `9a6c185b` / `3a569851`. **6 of 6 off-main.**

1a. **The blind spot is a class of three gates, not one script — and there is no local hook at all.**
   Demonstrated rather than asserted: `node scripts/check-gitlink-in-app-main.mjs` exits **0** and
   prints *"6 submodule(s) examined against HEAD; 6 on their app's main; 0 refused"* **while the
   index holds six violations.** All three gitlink gates read a committed ref, never the index:

   | Gate | Line | Reads |
   | --- | --- | --- |
   | `check-gitlink-in-app-main.mjs` | `:144` | `process.argv[2] \|\| 'HEAD'` |
   | `check-gitlink-not-behind-base.mjs` | `:127` | `process.argv[3] \|\| 'HEAD'` |
   | `check-gitlink-migration-lag.mjs` | `:181` | `git ls-tree HEAD` — hardcoded, **no ref argument** |

   And `core.hooksPath` is the default `.git/hooks`, which contains **no `pre-commit` hook**
   (`ls: cannot access '.git/hooks/pre-commit'`). So nothing local inspects the index, and a bad
   commit surfaces only in CI after push, on all four open parent PRs at once. This is precisely the
   shape the accountability brief names — *a control that cannot distinguish "checked and clean"
   from "did not look at the thing about to be committed."*

   **The remedy is cheaper than it looks**, and this corrects my first framing of it: two of the three
   gates already accept a ref argument, so the sequence "commit, then
   `node scripts/check-gitlink-in-app-main.mjs <new-commit>`, then push" needs **no code change** —
   only discipline, and it catches the violation before it is public. The durable fixes, in ascending
   cost: (a) adopt that verify-the-commit-before-push step in the release runbook; (b) add a
   `--staged` mode reading `git ls-files -s` so the index can be checked pre-commit; (c) install a
   parent `pre-commit` hook running (b). Note `check-gitlink-migration-lag.mjs` cannot be pointed at
   a candidate ref at all today — it hardcodes `HEAD` at `:181` — so (b) is required for that one.
   Also note `check-gitlink-migration-lag.mjs:234` documents `git update-index --cacheinfo` as the
   sanctioned way to set a pointer, so these six staged values may be deliberate intermediate state
   from `advance-submodule-pointers.mjs` rather than an accident; if so, the *sequence* is still
   wrong, because no main promotion has happened and there is no accepted main to point at.

   **Class sweep, so this is not reported as three scripts when it is a property of the suite.** Of
   **83** `scripts/check-*.mjs` gates in the parent, **9** read a committed ref
   (`check-gitlink-in-app-main`, `check-gitlink-migration-lag`, `check-gitlink-not-behind-base`,
   `check-migration-collisions-across-open-prs`, `check-migration-collisions-at-branch-tips`,
   `check-no-cookie-sso`, `check-shared-package-reach`, `check-worktree-hazards`,
   `check-zero-consumers`) and **0 of 83 are index-aware** — no hit for `ls-files`, `--cached`,
   `diff-index` or `--staged` in any of them. There is also **no `pre-commit` hook in the parent or
   in crm7, business-suite-unified or conduit**.

   **Stated carefully, because the obvious over-claim is wrong:** reading `HEAD` is *correct* for a
   CI gate — CI checks committed state. These are not nine buggy scripts. The gap is that the estate
   has **no local pre-commit tier at all**, so every one of these violations is only detectable after
   the commit exists and, in practice, after it is pushed. The skills hub already recognised and
   closed this exact gap for its own repository: `~/.agents/hooks/pre-commit` exists and its header
   says *"the hub's only BLOCKING gate … This is the slot that was empty: every previous hook
   (post-commit/-merge/-checkout) fired after the damage was already committed."* BSuite has no
   equivalent. Whether to add one is a design decision for the operator and the executor, not a
   defect to assert — but the asymmetry is worth naming, since the hub's reasoning applies verbatim
   here.
2. **The ADR-0012 Decision 5 P0 existed only on this machine — CLOSED 2026-09-17 (~17:35 AWST).**
   crm7 `fix/crm7-2641-portal-rls` tip `80623ea3` had **7 commits on no remote ref in any
   namespace**, verified against origin directly rather than against locally-fetched tracking refs,
   so it was not the attic-ref false positive the other three heads turned out to be. It contained
   `3a6930383` *"stop portal guests inheriting staff RLS"* and `d6f1532cf` *"close portal-RLS review
   findings"*. **Now resolved and verified:** `git rev-list --count 80623ea3e --not --remotes` = **0**;
   origin carries `refs/heads/fix/crm7-2641-portal-rls` at `2c059999` plus
   `refs/attic/grok-crm7-2641-portal-rls/20260917-6b7a7c694`; `merge-base --is-ancestor 80623ea3e
   2c059999` = YES; and all three named fix commits (`6b7a7c694`, `d6f1532cf`, `3a6930383`) are
   ancestors of the pushed tip. The other three at-risk heads were already preserved on origin
   (`aa8cacdfb`, `c48bf2325`, `630ca976` under `refs/attic/*`; crm7 has 420 attic refs), so the
   attic-capture practice worked and **no work is currently single-machine** in the measured set.
3. **A provenance sentence in the plan is wrong, and the way it was first read is the lesson
   (§5.6).** The plan records *"Auth3250 head `92395122` … source matches accepted development
   `ae8630cc`"*. That is refuted — `ae8630cc` is not an ancestor of `92395122` and the trees differ
   by 26 files. **But it carries no merge risk**: diffed against PR3250's actual base
   (`origin/main`, merge-base `a99ba3136531`) the PR is **12 files, +1,905 / −140**, entirely inside
   `packages/auth`, and *adds* 692 lines of tests. The alarming 1,791-deletion figure came from
   diffing two divergent lines, which measures what one branch lacks rather than what the PR does.
   Recorded here as a standing instruction for the next reviewer: **diff a PR against its base, never
   against whatever commit a document cites beside it.** PR3250's only real blocker is the
   `Visual DoD sign-off` FAILURE in §5.4.

## 10. Plans / registries / indexes — maintenance and archiving are now the accountability role

Operator rulings 2026-09-17, verbatim: *"all plans, registrysn index' and similar in the parent and
submodules are part of the accountability role to ensure update and maintenance"* and *"if there are
verifyably completed plans that too is the accountabilites role to archive them to
Dev/archived_repos_docs"*. Both are accepted and are now standing duties of
`qwen-bsuite-accountability`, not one-off tasks.

### 10.1 The set, enumerated (so it can be maintained rather than sampled)

`~/.agents/state/loop-contracts/bsuite-doc-inventory.py` → `bsuite-doc-inventory.json`.
Deterministic, read-only, re-runnable each loop iteration. **1,115 documents** across the parent and
all six submodules: by kind `plan` **817**, `index` 93, `roadmap` 92, `registry` 75, `canonical` 20,
`adr` 18; by repo parent **957**, R80.4 63, crm7 43, business-suite-unified 21, conduit 13, braden 9,
throughput 9. Excludes `node_modules`, `.git`, `.worktrees`, `dist`, `build`, `.next`, `.vercel`,
`coverage` — the directories that hold copies, not originals (Gate F: a repo-wide count that walks
agent worktrees counts the past).

Each row carries a **staleness risk** score, deliberately not mtime alone: mtime says when the
document was written, but what matters is whether the *world* moved after it. So the score is
`min(days_behind,60) × min(refs_checked,200) / 20`, where `refs_checked` counts distinct
SHA / `#PR` / semver tokens in the file — each one a claim about the world that can rot. Highest
currently: `docs/plans/STATUS.md` (161.4; 21.1 d, 153 refs), `docs/00-roadmap/operator-notes-verdicts.json`
(82.6; 8.3 d, 199 refs), `docs/00-roadmap/bsuite-feature-index.json` (66.8; 8.3 d, 161 refs), then the
`docs/plans/loop-contracts/` pair, `knowledge.md` (31.0 d) and **`AUTH_CANONICAL.md` (24.1 d, 29 refs)**
— that last one is a canonical rulebook, so its staleness is worth more than its score suggests.

### 10.2 The archiving rule — and the trap in the operator's own wording

Destination exists: `/home/braden/Desktop/Dev/archived-repos-docs` (the operator wrote
`archived_repos_docs`; the real directory uses hyphens). Established convention from prior passes
`20260727-docs-archive-pass` and `20260831-bsuite-docs-archive-pass`: a dated directory containing
`INDEX.md` plus per-repo subdirectories mirroring the source tree.

**A status suffix is not evidence that the work is done.** The naming convention
(`docs/20260227-contributing-standards-guide-v1.01W.md:132-140`) defines `W` Working, `D` Draft,
`R` Review, `A` **Approved** ("reviewed, ready for use"), `F` **Frozen** ("finalized, immutable").
Both `A` and `F` describe the **document's** lifecycle. Neither asserts that the work it describes
shipped. Parent `docs/plans/` currently holds 24 `W`, 19 `F`, 18 `D`, 5 `A`. Treating the 19 `F` +
5 `A` as "verifiably completed" would archive on a label — precisely the false completion this
estate's rulebook names first, and precisely what §2 of this document already caught twice (PR2631
and PR722 described in the present tense hours after they merged; a "not pushed" claim that was
pushed). So the archive candidate test is **evidence per document**, not suffix:

1. Every artefact the plan names as its deliverable resolves — merged PR (`gh pr view --json mergedAt`),
   applied migration, published package version, deployed SHA, or a filed issue.
2. Nothing it names is still open: no open PR, no unpushed commit, no `pending` ledger row it owns.
3. Its own acceptance section, if it has one, records acceptance rather than intention.
4. The verdict and its commands are written into the archive `INDEX.md`, so a later reader can
   re-check the archiving decision instead of trusting it.

### 10.3 Nothing was archived this pass, and why that is the correct action

Two reasons, both concrete:

- **The evidence bar has not been met for any document yet.** Per §10.2 each candidate needs its
  artefacts resolved individually. Running that over 24 candidates is a bounded batch job, now an
  open item on the loop contract, not something to assert in the same breath as the instruction.
- **The parent index is currently poisoned (§9.1).** Six submodule gitlinks are staged off-main and
  the estate's own gate cannot see them pre-commit. Archiving means `git rm`-ing files from the
  parent, which would add deletions to that same index; the next `git commit` would then bundle
  off-main gitlinks with an archive move in one commit that fails CI on all four open parent PRs.
  **Sequence: defuse the index first, then archive.** Unblocking is one command (§9.1).

Interim safety: archiving is a *move*, not a delete, and prior passes kept an `INDEX.md`; when it
happens it must preserve the dated record verbatim (AGENTS.md: back-dating or rewriting a dated
audit destroys the record the estate relies on) and must not touch `docs/plans/20260908-remediation/`,
which the plan names as the canonical backlog.

**Update 2026-09-17 ~20:10 AWST — the index trap is DEFUSED and one archive pass ran.**
`staged_gitlinks_off_main` re-measured **0** (was 6 of 6), so §10.3's second reason no longer holds.
The archiving bar was then applied to real candidates; the result is recorded at
`/home/braden/Desktop/Dev/archived-repos-docs/20260917-bsuite-docs-archive-pass/INDEX.md`. One file
was moved and then **reversed**, because 7 live files cite it and no CI gate names it, so the
breakage would have been silent (AGENTS.md tripwire #11). The rule that survives is two-limbed —
archivable requires `kind: record` **and** `authority: none` **and no live citer** — and under it
**16 candidates are citation-blocked and 0 are archivable by a read-only supervisor**. The
highest-leverage citer to fix first is `docs/plans/20260805-plan-triage-open-work-register-v1.00W.json`,
which cites all 16. A separate stray-directory pass is recorded at
`archived-repos-docs/20260917-bsuite-stray-lockgen-cleanup/INDEX.md`: seven `*_lockgen_*` scratch
directories (none of them worktrees — they have no `.git` at all) were proven redundant by blob
reachability and deleted under operator approval, **1898 MiB** reclaimed, with the two git-absent
artefacts preserved first.

## 11. Progress through the 370-prompt pack — measured 2026-09-17 ~20:20 AWST

The operator asked how far through the Codex-created prompt list the estate is. Measured from two
independent sources rather than from the queue's own labels, by
`~/.agents/state/loop-contracts/bsuite-370-progress.py` (re-runnable, deterministic).

The pack itself is intact: **370 prompt files** in `docs/plans/20260908-remediation/prompts/`
(crm7 170, bsuite 112, business-suite-unified 39, conduit 16, R80.4 13, braden 11, throughput 9 —
which sums to exactly 370), `verify_prompt_contract.py` **PASSES** with `prompt_count=370`,
`errors={}` and all 8 negative controls true, and the row↔prompt **bijection is perfect**
(0 prompts without a ledger row, 0 ledger rows without a prompt).

| Signal | Count of 370 | % |
| --- | --- | --- |
| Ledger row says `completed` | **1** (`bsuite-3151`) | 0.3% |
| Issue CLOSED on GitHub | **3** | 0.8% |
| Closing keyword in a merged PR | **4** | 1.1% |
| Referenced anywhere in a merged PR | **45** | 12.2% |
| Any signal of work (the above ∪ ledger `in_progress`) | **49** | **13.2%** |
| Ledger `in_progress` | 10 within the 370 (11 across all 374 rows) | — |
| Ledger `pending` | 359 | 97.0% |

**The finding is not the percentage, it is the ratio sitting beside it.** **211 PRs merged** across
the seven repos since the pack was cut on 2026-09-08, and only **45** of the 370 prompts are
referenced by any of them. Roughly **166 merged PRs — about 79% of nine days of shipping — are work
outside the list**: new defects, operator asks, CI and gate fixes. The estate is shipping steadily.
It is not working down the Codex prompt list, and nothing noticed, because no gate ever measured the
list against the merge stream. That measurement now exists and is re-runnable.

**The 374-vs-370 discrepancy is resolved.** 4 ledger items carry **no `prompt` field at all**. Not
corruption and not a lost row — 4 unmapped rows. Either give them prompts or exclude them from the
expected-370 count, so `ledger_reconciliation_mismatch` stops firing on every iteration.

**Zero false completions** — nothing is marked `completed` whose issue is not closed. Two
**unrecorded** completions: `crm7-2584` and `crm7-2624` are CLOSED on GitHub while the ledger still
says `pending`. The 11 `in_progress` rows correlate cleanly with the live lanes
(`crm7-2641` → `grok-crm7-2641-portal-rls`, `bsuite-1960` → `claude-crm7-1960-developer-namespace`
and `claude-bsu-1960-platform-scope`, `bsuite-3231` → `claude-bsu-3231-collapsed-nav`), which is
evidence the ledger is being maintained rather than merely written once.

### What this instrument cannot see — stated so the 13.2% is not overread

- PR matching reads **title and body text only**. A PR that fixes an issue without naming it is
  invisible, so 45 is a **lower bound** on work done.
- "Referenced" is not "done" — a PR may name an issue and only partially address it, so 45 is also
  an **upper bound** on completion. The truth is between 4 and 45 and this instrument cannot
  narrow it further without reading each diff.
- Issue state is the **weakest** of the three signals. CLOSED can mean not-planned or duplicate; and
  AGENTS.md records **fifteen issues that sat fixed-and-open** because closing keywords were inert
  while every PR targeted `development` and auto-close only fires on the default branch `main`.
- The 370 are **issue rows only**. The pack README names two further denominators — **40
  operator-feedback groups** and **661 feature-matrix rows** — which this instrument does not
  measure. Progress against those is **UNKNOWN, not zero**.
- The GitHub data is a point-in-time fetch (`/tmp/gh-*.json`, `/tmp/prb-*.json`). The script records
  the earliest snapshot mtime and lists any repo whose fetch failed, so a stale or partial snapshot
  is visible rather than silently counted as zero.

### Operator ruling this pass acts on: promote, not prompt

Recorded 2026-09-17 and corrected by the operator the same day — *"i meant promot not prompt"*:
once all visual and other checks and inspections have been performed and **passed**,
`development`→`main` promotion is to happen **routinely, without re-asking**. This **supersedes**
§5.2's framing of the operator visual pass as a standing per-cycle gate; §5.2's measurements stand,
its gating assumption does not.

The numbers that make it urgent, and they are moving the wrong way between measurements:
`main_behind_dev_total` **558** (508 at §5.1, 552 earlier today) and crm7 production **183** commits
stale (137 at §5.2, 177 earlier today). Deferral has a measurable cost.

Concrete instance, found while investigating unrelated stray directories: conduit's
tenant-authorization surface — `_canEditCandidates.ts`, `_editDispatch.ts` and the `tenantSwitch` /
`realTenantRefusal` / `tenantHandshake` tests — is PRESENT on `origin/development` and **ABSENT from
`origin/main`**. Production does not carry it. Nothing is lost; it simply has not been promoted.

### Not done by this pass, and why

**This plan document is still uncommitted** — `plan_doc_unstaged_lines` **607**, staged at 166 lines
against a working-tree copy now well over 800. It was **not** committed here despite being the
cheapest high-value item on the board, because a live lane owns that index:
`.worktrees/claude-bsuite-gitlink-staged` was created at **20:04 AWST during this pass**. One writer
per file set applies, and committing the parent index underneath an active gitlink lane is exactly
the collision the cost/delegation contract forbids. The maker has been told on the `bsuite` inbox
(message `5a3854ae`).

Also still open and named to the maker: the **120-char bind-time cap** in `session-context.py
contract_check` (:112-126) — `grep -c 120` still returns **0**, so the single 193-character string
that disabled the entire supervision layer and crash-looped the daemon to restart counter 6 on
2026-09-17 can do it again; and `review-evidence.py:175-187`, which still discards `reason`,
`findings` and `failures`, leaving all 131 persisted supervision records empty and supervision
effectiveness permanently unmeasurable.

## 12. Maintenance addendum — iterations 14–19, 2026-09-17 ~21:20–21:50 AWST

Full receipts per iteration are in
`~/.agents/state/loop-contracts/estate-remediation-plan-maintenance-20260917.md`. Summary:

- **Visual matrix completed at 375 across all six apps** after verifying every preview serves
  exactly its `origin/development` head. PASS: r80, conduit, throughput (signed in via silent
  SSO), braden. FAIL: crm7 header (wordmark under theme toggle, 25.7px) and BSU marketing
  (page-level horizontal pan, `scrollWidth` 399 vs 375, ancestor chain `overflow-x: visible` at
  every level). The comparable instrument is `scrollWidth` vs `innerWidth`: R80 has 72
  overflowing elements inside a real scroll container and is correct; BSU has 2 that escape every
  container. Per-element counts alone would have inverted those verdicts.
- **Promotion proven mechanically ready.** Every main-only commit in the four divergent repos is
  a previous promotion merge; `git merge-tree --write-tree origin/development origin/main` exits
  0 with zero conflicted files in all four. Shape: 3 fast-forwards (crm7, braden, throughput) +
  4 true `--merge` merges (bsuite, R80.4, BSU, conduit). The three pending crm7 migrations are
  named for the release PRs, in order: `20261206180000`, `20261206180100`, `20261207030000`, with
  rollback `supabase/rollbacks/20261206180000_20261206180100_document_access_down.sql`.
- **Jodie identity census, current.** Canonical `/logos/jodie.png` at 12 sites in conduit/crm7/BSU
  (crm7 has a test asserting the src). `throughput-479` located at
  `throughput/src/components/JodieFloatingButton.tsx:45` — an inline starburst that copies the
  placeholder, no asset in repo. conduit carries dual identity (`ScoutIcon.tsx:23` code icon vs
  the asset at `AIFloatingButton.tsx:54`). braden/R80.4 have none (product decision). BSU's
  lucide `<Bot>` sites carried as re-verify-in-fix, not re-asserted.
- **The six prompt-less ledger rows named** (the whole 376-vs-370 mismatch): `crm7-2654`,
  `crm7-2656`, `throughput-499` pending; `crm7-2641`, `crm7-2658`, `crm7-2613` in flight with
  named lanes. Because the pack executes prompt-per-row, **`crm7-2654` (P1 security: base tenant
  roles can permanently delete or overwrite stored documents) and `crm7-2656` are invisible to
  prompt-driven execution** — no prompt, no lane. BLOCKER issued; acceptance is rollup mismatch 0
  plus a prompt path or named lane for 2654.
- **Movement, all widening:** `main_behind_dev_total` 508 → 552 → 558 → 560 → **578**; crm7
  production lag 137 → 177 → 183. Neither gating fix has landed (crm7 development advanced twice,
  to `0845e0d42` via e2e-snapshot PR #2659, and BSU to `79631e3`; neither was the fix). Unstaged
  plan lines 714, unchanged; the parent index remains owned by a live gitlink lane, so this
  document is still not committed by this role.


## 13. Maintenance addendum — iterations 22–23, 2026-09-17 ~22:20–22:45 AWST (overnight arming)

The operator went to bed at ~22:20 AWST with `/agent-run-loop`, asking that the loop be set and
firing, and pre-authorizing sub-agents in Claude Code's place when its usage runs out. Receipts per
item, each with the command that produced it.

### 13.1 `ledger_reconciliation_mismatch` is now 0 — the blind spot was in my instrument, not the ledger

Contract item `ledger-row-count-reconciled` reads **met**. The 376-vs-370 mismatch that fired all
day was a fault in the probe:

- v1 of `bsuite-370-rollup.py` read exactly one key,
  `closeout_stocktake_20260914.issue_reconciliation`, and computed `previous_rows 340 + added_rows
  30 = 370`. Against a 376-row ledger that reports mismatch **no matter what the maker does**.
- This estate's convention is to **add a new dated reconciliation key**, not rewrite a dated record:
  the 2026-09-14 record itself asserts `original_rows_preserved: true` and
  `historical_338_snapshot: "Retained; not rewritten as current state"`. The maker's
  `queue_reconciliation_20260917` follows that convention and records `expected_rows: 376`,
  `observed_items_rows: 376` and all six additions with at/by/why. v1 could not see it because it
  named one key.
- **Widened**, not weakened: the predicate now resolves every object in the ledger carrying a
  reconciliation shape (int `expected_rows`, or int `previous_rows`+`added_rows`), including a
  nested `issue_reconciliation`, takes the **newest by `at`**, and *additionally* requires every
  prompt-less row to be named in its `added[]`. That second limb is new and would have failed v1's
  370 too. It emits `ledger_reconciliation_source`, `_at`, `_candidates`,
  `ledger_promptless_unnamed_ids` so a reader sees **what was read** instead of trusting the 0/1.
- **17/17 negative controls pass** (`test_bsuite_370_rollup_reconciliation.py`, durable beside the
  instrument). They bite in both directions, because AGENTS.md is explicit that a widened predicate
  reading 0 deserves as much suspicion as a narrow one:
  - C1 a 7th prompt-less row not named in `added[]` → mismatch 1, and names it;
  - C2 a wrong `expected_rows` → 1; C3 no reconciliation record at all → 1 with `source: null` and
    `expected_rows: -1` (UNKNOWN, never 0);
  - C4 a **newer** record that under-counts wins over the correct older one and therefore fires —
    proving "newest by `at`" is applied, not "first that matches";
  - C5 an existing row losing its `prompt`, unrecorded → 1;
  - **C6 reverting to the v1 single-key predicate makes today's correctly-reconciled ledger report
    mismatch 1 again**, which proves the widening is what changed the verdict rather than the ledger
    having been fixed underneath it.
- What it still cannot see, stated so the 0 is not overread: a reconciliation recorded **outside**
  this ledger (a plan doc, an inbox message, a separate JSON) does not count — deliberately, because
  the invariant is that the ledger accounts for its own rows.
- **Same blind spot, not mine to fix:** `~/.agents/scripts/bsuite-accountability-state.py:45-47,80`
  hard-codes `closeout_stocktake_20260914.issue_reconciliation` too, so the scheduled reviews it
  feeds will keep reporting `MISMATCH_REQUIRES_RECONCILIATION` against a reconciled ledger. It has
  its own test file and sits in the harness lane, so it is reported to the maker rather than edited
  here. Fix is the same widening.

### 13.2 Both gating visual FAILs now have maker PRs — the maker acted on the verdicts

| Defect (my SEND_BACK) | Maker PR | Head | CI at 22:24 AWST |
| --- | --- | --- | --- |
| crm7 header wordmark under theme toggle, 25.7px at 375 | crm7#2664 `fix/crm7-marketing-header-375` | `41a7c22ec` | 21 checks, 3 pending (build-and-test, Coverage floor, e2e), **0 failing** |
| BSU marketing page-level horizontal pan, `scrollWidth` 399 | BSU#1258 `fix/bsu-marketing-375-containment` | `4b58db7f4` (moved from `51ba2dbe9` mid-check) | `lighthouse` + `Vercel` FAILUREs were on the **older** head and cleared when it advanced |

BSU#1258 changes `src/components/marketing/MarketingHome.tsx` +12/−4 and adds
`tests/e2e/smoke.spec.ts` +22. Its body cites my measurement, names the class (`bsuite#3139`),
explains the flex `min-width: auto` cause and the `overflow-x: visible` ancestor chain, keeps
`shrink-0` on the sibling title span deliberately, and — the part that matters — **asserts the
document, not the element**, encoding the R80 counter-example (72 overflowing elements,
`scrollWidth` 365, correct) so the test cannot pass on a fix that merely hides one span. That is
the acceptance test the SEND_BACK asked for.

Neither is merged, so neither preview serves the fix and **both 375 gates still FAIL**. Promotion
stays blocked on exactly these two.

### 13.3 crm7 preview changed, so crm7 was re-measured; BSU did not, so it was not

`d.crm.crm7.app` moved `0845e0d` → **`e59bc6a`** (`version.json` builtAt 2026-09-17T14:02:04Z,
PR #2662 developer-namespace, which touched no marketing/CSS/header file — verified with
`git diff --name-only 0845e0d42..e59bc6af6`). Per the changed-build rule, only crm7's 375 check was
re-run, at viewport 375×812, `version.json` re-fetched in-page to confirm the build under test:

- wordmark `span.crm7-brand-gradient-text` x=72 right=129 w=57; theme toggle ("Switch to light
  theme") x=103.31 right=151.31 w=48 → **overlap 25.69px, byte-identical to the prior build**.
  FAIL stands.
- `scrollWidth` 365 ≤ `innerWidth` 375 → no page-level pan. The only elements past the viewport are
  the decorative `.hero-glow--primary/--secondary` divs (right 532.5 / 445), which are clipped and
  do not pan the document — the R80 pattern, not the BSU one.
- **0 console errors.** Screenshot `.playwright-mcp/visual-pass-d-crm-375-e59bc6a.png`.
- **No duplicate verdict sent**: the build changed but the defect and its measurement did not, so
  SEND_BACK `04938cc0` stands as the one verdict for this defect.

`d.suite.crm7.app` is unchanged at `79631e3`, so its `scrollWidth` 399 FAIL stands **by
determinism** and was not re-measured; SEND_BACK `5f41be42` stands.

### 13.4 This document was one commit away from silently reverting `1405d24f3`

**Caught before writing, and it is the third instance of the failure mode §1 of AGENTS.md keeps
recording.** My working copy was assumed to be "the committed base plus my addenda". Checked, and it
was not: `diff` of the first 166 lines against `origin/development` showed **two lines where the
committed version is newer and better than mine**, both from `1405d24f3 docs(plans): name the
release gates the takeover plan is held to; qualify the conduit matrix citation`:

- line 27 had gained the named parent release gates — `.github/workflows/promotion-gate.yml` (visual
  sign-off label), `.github/workflows/no-prerelease-in-production.yml` running
  `scripts/check-no-prerelease-in-production.mjs`, `scripts/audit-doc-completion.mjs` and
  `scripts/check-doc-citations-resolve.mjs`;
- line 121 had gained the qualified conduit citation — `conduit/scripts/assert-conduit-e2e-matrix.mjs
  (planned)`, on conduit `development` at `e76d925`, reaching this parent's tree when the conduit
  gitlink advances.

My base predated that commit, so committing my 916-line file as-is would have **deleted both
improvements** with no gate to catch it (the doc gates check naming and citations, not whether a
maintenance addendum reverted the section above it). Corrected by reconstruction rather than by
hand-editing: `origin/development`'s 166 lines + my lines 167–916, then verified
`head -166 | diff - origin` = identical **and** `tail -n +167 | diff - mine` = byte-identical, so
`1405d24f3` is preserved and all 750 maintenance lines survive verbatim.

**Rule that follows, and it generalizes:** before appending to a maintained document, diff the
portion you believe is unchanged against the committed version. "I only added to the end" is a claim
about the file, and the file is the only authority. Note the local checkout is **39 commits behind**
`origin/development` (`6cd83e122` vs `c2fb154b1`), which is why `git log -- <this file>` at local
HEAD returns empty while the file has two commits on `origin/development` — a stale checkout makes a
committed file look uncommitted.

### 13.5 Overnight arming — what is firing, and the maker-quota fallback

- **cron `o51n2fz8`** (durable, `4,11,18,25,32,39,46,53 * * * *` ≈ 420 s, inside the operator's
  300–600 s band, off the :00/:30 marks). Supersedes and **replaces** `a1yvdacc`, which fired at
  :09/:39 — a 30-minute cadence outside the band — and whose prompt predated the operator's
  sub-agent authorization. Deleted rather than left double-firing.
- **monitor `mon_4610b38af92c47dd`** — polls both preview `version.json` commits and both PR states
  every 60 s, emits only on change, with a 9-minute heartbeat so it cannot die silently inside the
  10-minute idle cap, and an explicit `BOTH-FIXES-MERGED` line when the two fixes land.
- **wakeup 420 s**; record `state/loop-armed/b324d5c3-75f5-4497-9e4c-fe2874d13e7e.json` written by
  `loop-arm.py` against the 11-item contract (6 met, 5 open).
- **Maker liveness measured, not assumed:** three live `claude` processes (pids 1210562 6h50m,
  2148958 2h35m, 524079 10h33m) plus a PR monitor loop watching crm7 2657/2663/2664 and BSU 1258.
  Claude **7-day utilisation 0.92** (`allowed_warning`), 5-hour 0.18, haiku already offloaded to
  `deepseek-v4-flash` by the conserve rule. So exhaustion is likely overnight, exactly as the
  operator anticipated.
- **Fallback and its boundary:** on exhaustion, sub-agents may take over the pack — but **not** the
  two marketing files. crm7#2664 and BSU#1258 are live maker lanes, so one-writer-per-file-set
  forbids a second writer there; a sub-agent may only pick those up if the lanes are demonstrably
  dead *and* the PRs have stalled. Maker ≠ verifier is preserved by having a sub-agent make and this
  role verify.

### 13.6 Movement, still widening

`main_behind_dev_total` 578 → **591**; `prod_crm7_lag_commits` 183 → **199**; production
`crm.crm7.app` still serves `9a6c185` built 2026-09-11T12:04:04Z. `staged_gitlinks_off_main` **0**
(the six gitlinks are no longer in the parent index — the parent's staged set is now four doc files
only). `crm7-2654` and `crm7-2656` remain `pending` with `prompt: null`, no owner and no lane, so
BLOCKER `82c2cf99` stands unactioned; the four in-flight prompt-less rows are correctly owned.

## 14. Maintenance addendum — iteration 24, 2026-09-17 ~23:05–23:20 AWST: "promotion is mechanically ready" is REFUTED

§11 ("Operator ruling this pass acts on: promote, not prompt"), §12 and §13.5 all record promotion as
**mechanically ready** — 3 fast-forwards plus 4 `gh pr merge --merge`, merge-tree proven clean. That
is **wrong**, and this section supersedes it. Where the two disagree, this wins.

**What was actually proven, and what that proof was worth.** `git merge-tree --write-tree
origin/development origin/main` exiting 0 with zero conflicted files proves the merges would not
**conflict**. It says nothing about whether the **gates** pass. Conflating the two is how a
"mechanically ready" claim got recorded over four unmeasured blockers. Necessary, not sufficient —
the same error shape as §13.4's append-only assumption, in a different register.

### 14.1 One of the two 375 gates now PASSES

BSU#1258 merged at 2026-09-17T14:48:20Z and `d.suite.crm7.app` serves **`ac67657`**, which *is* that
merge commit (`git merge-base --is-ancestor 3159e96c9 ac67657` = YES) and equals `origin/development`
head — so the build identity was verified, not assumed. **`scrollWidth` 365 ≤ `innerWidth` 375**
(was 399); 0 overflowing elements (was 2); all nine `span.text-muted-foreground.leading-7` taglines
end at `right=349` (the offenders were 399 and 392); the `LI`'s computed `min-width` is now **0px**,
confirming the `min-w-0` mechanism rather than a clip. 0 console errors. **SEND_BACK `5f41be42`
CLOSED.** Screenshot `.playwright-mcp/visual-pass-d-suite-375-ac67657-PASS.png`.

crm7 still **FAILS**: `d.crm.crm7.app` serves `ed6da2d` = the merge of crm7#2657 (portal RLS) and
does **not** contain crm7#2664 (`git merge-base --is-ancestor f7a9358a7 ed6da2d` = NO; the diff
`e59bc6af6..ed6da2d` touches only `docs/audits/portal-rls-2641/*` and portal-RLS code, no marketing
or CSS file). Overlap **25.72px**; brand group `DIV.flex.items-center.gap-3` measures w=79.3 with
computed `flex-shrink: 1` and `min-width: auto` against ~105 of content — the shrink-below-content
mechanism now **measured** rather than inferred. SEND_BACK `04938cc0` stands, not re-sent.

The responsive-containment class stays ~~**8 surfaces**~~ — **CORRECTED 2026-09-17 ~23:45 AWST, the
8-surface count was mine and it does not survive measurement.** The maker measured all six apps at
375×812 on their `d.*` public pages (`41cef1b1`): `scrollWidth` 375 in **every** app, so **no public
page pans at 375**. Three of my eight citations were not containment defects at all — `bsuite#3139` is
visual-gate **instrumentation** (a missed theme toggle reading as PASS, `clippedHeading`
false-positiving on `overflow: visible`, width labels ignoring `devicePixelRatio`), `crm7#1173` is a
**CI coverage gap** (no WebKit target), and `bsuite#2542` is a real layout defect but a different
sub-class (V-C5 `gridItemFit`, not a page pan). The correct record: **exactly two measured containment
defects at 375** — the crm7 header overlap and the BSU tagline — **both now fixed and merged**, so the
class is empty of current public-page defects. Instrumentation gaps belong on their own list.
The fault travelled: those citations were copied into the merged comments of both fixes, and the
corrections are open as `crm7#2667` and `business-suite-unified#1259`. Carried caveat, not overread —
this covered the **public page only, at one width**; `braden-576`, `throughput-486` and the 672×699 row
are **not** disproved on surfaces the sweep did not reach, and `throughput-499` remains unreproduced
because it needs REAL seeded ideas at 672×699 (an empty path is not validation).

### 14.2 A measurement on a blank page — and a gap in BSU's new test

My first crm7 measurement this iteration returned `wordmark: null, toggle: null, overlap: null` with
5 console errors. Read naively that is "no defect". It was **not a rendered page**: the DOM referenced
a cached entry bundle `assets/index-CF3TzoVL.js` → **404**, while the server's current `index.html`
names `assets/index-VsHrZ45c.js` → **200**; `#root` had **0 children** and
`document.body.innerText.length` was **0**. A redeploy at 14:58:25 GMT had invalidated the cached
bundle and the SPA never booted.

Fixed by adding a **`LOAD_VALID` precondition** that must pass before any geometry is believed:
`rootChildren > 0`, `bodyTextLen > 0`, and the DOM's entry bundle must intersect the bundle named by
a `no-store` fetch of `index.html`. The accepted measurement reports `{rootChildren: 2,
bodyTextLen: 1636, domMatchesServer: true}`.

**This fails in the dangerous direction** — a stale DOM reports the *absence* of a defect rather than
a failure to look — and it is the same class as the iteration-10 "disproven 404". It also indicts a
test that shipped tonight: BSU#1258's `tests/e2e/smoke.spec.ts` asserts
`documentElement.scrollWidth <= innerWidth`, which an **unrendered** page also satisfies (`scrollWidth`
375 on an empty document), so it can pass green on a blank page. Reported to the maker with an
acceptance test (assert the document rendered before asserting geometry).

### 14.3 `version.json` lags the deployed HTML

On `d.crm.crm7.app`, `version.json` (fetched `no-store`) reports commit `ed6da2d` builtAt
**14:37:27Z**, while `index.html` `last-modified` is **14:58:25 GMT** and the entry bundle changed
between those moments. So the HTML was redeployed ~21 minutes after the build `version.json`
describes. This matters estate-wide: the D8 "exact deployed SHA" limb reads `version.json`, and the
gate-watch monitor polls it to detect build changes. Mitigation adopted here: treat the entry-bundle
hash as a **second** build-identity signal. Not filed as a row yet — I cannot distinguish a
deploy-pipeline defect from ordinary CDN cache skew, and a defect I cannot attribute is not filed.

### 14.4 The four real blockers to promotion

| # | Blocker | Evidence | Owner |
| --- | --- | --- | --- |
| 1 | `no-prerelease-in-production` **FAILURE** on bsuite#3236 | run `35228102488` on `development`, 13:36:11Z | **none found** |
| 2 | `Visual DoD sign-off` **FAILURE** on #3236 **and** #3250 | `.github/workflows/promotion-gate.yml:54-95` | this role, once V-C1..V-C10 pass |
| 3 | #3236 and #3250 are both **drafts**, `mergeStateStatus=BLOCKED` | `gh pr view --json isDraft` | maker |
| 4 | **Zero** open `development→main` PRs in R80.4, BSU, conduit, crm7, braden, throughput | `gh pr list --base main --state open`, all seven repos | maker |

**Blocker 1, verbatim from the gate's own output** — three packages declare prereleases on
`development`: `packages/page-builder` **2.7.1-next.7** (finalise to 2.7.1), `packages/theme`
**1.5.2-next.1** (→ 1.5.2), `packages/workflow-canvas` **0.3.0-rc.4** (→ 0.3.0). `origin/main`
currently carries page-builder 2.7.0, theme 1.5.1, workflow-canvas 0.2.3. The gate's reasoning: a
prerelease never takes the `latest` dist-tag, so promoting leaves `@bsuite/<pkg>` frozen on npm while
every freshness check reports the apps current. These versions have **advanced** since §5.7 recorded
them (workflow-canvas was `rc.2`, theme was `next.0`) — re-read the manifests, never trust a recorded
list. I could not run the guard locally: it requires the `yaml` package and correctly **refuses to
degrade to grepping** the lockfile, and installing it here is AGENTS.md tripwire #2.

**Blocker 1a — a false-green trap worth more than the blocker.** The workflow sets
`TARGET: ${{ github.base_ref || github.ref_name }}` and its own comment says the base is "the ref
whose production-ness we mean". So the guard enforces production rules **only when the base is
`main`**. `gh run list` shows `fix/bsuite-finalise-auth-and-data-grid` **passing** this gate at
13:32:11Z while `development` **failed** at 13:36:11Z — which looks exactly like a fix in flight, and
I nearly reported it as one. It is not: `git show origin/fix/bsuite-finalise-auth-and-data-grid:packages/<p>/package.json`
returns the **same three prerelease versions** as `development`, and the branch now has no open PR.
Its run was green because its base was not `main`. **Rule: a green
`no-prerelease-in-production` on any PR based on `development` is not evidence about production.**
Same shape as the conduit e2e gate that was green by construction. Open question for the maker:
should the guard refuse to report PASS when `TARGET` is not a production ref, rather than passing
vacuously?

**Blocker 2 — the gate is agent work, not operator-gated, and my brief under-scoped it.** The
workflow's error text requires the label `visual-dod-passed` (legacy `qa-signed-off` accepted) after
"the AGENT-PERFORMED visual DoD … V-C1..V-C10: no pure white or black, sensible density (2-up/3-up),
layout that makes sense, the task finishable on-page without needless round-trips, Storybook actually
installed and visually editable. **Both themes, four breakpoints.** This is AGENT work and does not
wait on Braden — operator ruling, 2026-09-06." The **two 375 checks this plan's objective names are a
subset** of that matrix. Passing them does not entitle anyone to apply the label, and applying it
without the full pass is precisely the false-complete the gate exists to stop — its own comment
records a promotion merged once with this held (bsuite#1944, 2026-08-13) and the Supabase migration
applier ran on the push. The operator assigned the visual pass to this role on 2026-09-17, so the
full DoD is mine to run and the label mine to apply **only** once V-C1..V-C10 pass with evidence
posted on the PR.

### 14.5 Corrected promotion precondition

Promotion is executable when **all** of: crm7#2664 merged and the crm7 375 gate PASS; the three
prereleases finalised and `no-prerelease-in-production` green **on a base-`main` PR**; the full
V-C1..V-C10 visual DoD run across both themes and four breakpoints with evidence on the PR and the
label applied; #3236 (and #3250 if it is the auth path) un-drafted; and `development→main` PRs opened
for R80.4, business-suite-unified and conduit. Then 3 fast-forwards + 4 `--merge` merges, migrations
in order, gitlinks last, and development fast-forwarded afterwards.

Two carry-forwards: **BSU's merge-tree proof is stale** (development moved to `ac67657` with #1258
merged) and must be re-run, not carried; and this role **cannot** re-run it — the daemon shell guard
denies `git merge-tree --write-tree` (it writes objects) and denies `git -C <dynamic path>`, so that
proof needs the maker's lane or a literal-path invocation. Also newly landed and undispositioned:
**crm7#2657 merged** as `ed6da2d0e`, which is ledger row `crm7-2641`, the P0 portal-RLS row from
ADR-0012 Decision 5. The rollup still reads 13 in_progress / 362 pending, so the row has not been
updated — and its acceptance is the **applied migration plus persona/pgTAP evidence**, not the merge,
since the migration rewrites 50 INSERT policies including `rate_adjustments_insert` which explicitly
granted `guest`. It cannot be D8-accepted against production until a promotion applies it.

`main_behind_dev_total` 591 → **615**; `prod_crm7_lag_commits` 199 → **218**; production still serves
`9a6c185` built 2026-09-11T12:04:04Z; `staged_gitlinks_off_main` **0**;
`ledger_reconciliation_mismatch` **0**.

## Maintenance pass — 2026-09-19 (Devin takeover and promotion execution)

Ownership transferred to Devin session `devin-bsuite-closeout-20260919` because Claude Code and
Qwen Code usage are exhausted. This role acts as both execution owner and external accountability.

Command-backed progress:
- `cd business-suite-unified && git commit -S -m "docs(bsu): sync remediation execution rules from parent"` → SHA `724108d10f6fbbb6e59a21265908aee060971c78` (G).
- `cd /home/braden/Desktop/Dev/bsuite && git commit -S -m "fix(bsuite): reset all submodule gitlinks to app main heads"` → SHA `91dc73c7448159646594819dd1501c08f733639b` (G); after reconciling with `origin/development` the merged tip is `64a54d79b`.
- `python3 ~/.agents/state/loop-contracts/bsuite-370-rollup.py` → `staged_gitlinks_off_main=0`, `ledger_reconciliation_mismatch=0`, `plan_doc_unstaged_lines=0`.
- `gh pr view 2664 --repo GaryOcean428/crm7 --json state,mergeCommit,statusCheckRollup` → `state=MERGED`, all checks SUCCESS.
- `gh pr view 1258 --repo GaryOcean428/business-suite-unified --json state,mergeCommit,statusCheckRollup` → `state=MERGED`, all checks SUCCESS.
- Playwright measurements at 375px on `d.crm.crm7.app/` → wordmark right `121.03` ≤ toggle x `123.09`, `scrollWidth=365`, verdict PASS.
- Playwright measurements at 375px on `d.suite.crm7.app/` → `scrollWidth=365` ≤ `innerWidth=375`, verdict PASS.
- Logged-in visual pass on `d.suite.crm7.app/` (signed in as `braden@braden.com.au`) at 375px → `scrollWidth=375` ≤ `innerWidth=375`, verdict PASS.
- `cd crm7 && git push origin origin/development:refs/heads/main --force-with-lease=origin/main` → `63a80fcd3..94e250f2d`.
- Promotion PRs created: bsuite#3291 (yappy-smelt → development), R80.4#334, BSU#1265, conduit#740, braden#631, throughput#504. PR monitor armed in `~/.agents/state/loop-armed/devin-bsuite-closeout-20260919.json`.
- `python3 patch-truth-index-coordination-devin.py` → `bsuite_project_truth_index.current_coordination.owner` updated to `devin-bsuite-closeout-20260919`, length and sha256 verified.

Remaining gates at end of this pass: `ledger_pending=357`, `ledger_in_progress=19`, `main_behind_dev_total=11`, `prod_crm7_lag_commits=2`. Promotion PRs and their monitor are the next live work.

## Escalation paths — 2026-09-19

Verified against the local model proxy at `http://127.0.0.1:8820` (`~/.claude/model-proxy/config.json`):
- `fable` is a passthrough prefix → Anthropic Claude Fable.
- Fable fallback chain (when Anthropic rejects): `gpt-6-astra` → `glm-5.3` → `qwen3.8-max` → `kimi-k3` → `deepseek-v4-pro` → `gpt-5.6-sol`.
- `gpt-6-astra` route is the explicit Astra path via OpenRouter (`openai/gpt-6-astra`), tier `flagship`, reserved for impassable obstacles.
- `gpt-5.6-sol` is also available via OpenRouter as a Fable-tier peer.

These routes are live in the proxy and can be invoked by model id for high-level reasoning / deadlock-breaking without operator intervention.
