# [EPIC] Operator 2026-09-06 16:23: every agent cleans up — orphan worktrees and branches, work at risk, DoD gaps, unpromoted trees (inventory + required actions)

https://github.com/GaryOcean428/bsuite/issues/3118

Snapshot updatedAt: 2026-09-07T20:07:25Z. Open at capture; re-read live.

## Operator, 2026-09-06 16:23 AWST, verbatim

> and make sure all agents are cleaning up after themselves no ophan worktrees or branches local or remote, no work lost. all passinign DoD. all /ops-ship-all-apps to prod.

Ruling of record: qig-memory `bsuite_operator_ruling_20260906_every_agent_cleans_up_no_work_lost_all_dod_all_shipped`. Measured at 16:2x AWST by the accountability lane with `bsuite-ship-visual-promote/scripts/branch-cleanup.sh --dry --target development --all` (content-tested, read-only) plus a worktree and remote-branch inventory. Full output: `~/.claude/projects/-home-braden-Desktop-Dev-bsuite/evidence/2026-09-06/hygiene-20260906/branch-cleanup-dry-run.txt`.

## The one that matters most: the suite regression's fix is sitting uncommitted in a dead session's worktree

`~/Desktop/Dev/.wt-bsu-glow` (business-suite-unified, branch `fix/glow-accent-declared-by-design`, never pushed) holds a **39-line uncommitted change to `src/index.css`** that declares `--glow-accent` / `--glow-accent-hover` by design — the fix for the elevation regression business-suite-unified#1169 promoted to production over the #1166 send-back. The lane that wrote it has ended. Preserved verbatim as `hygiene-20260906/wt-bsu-glow-uncommitted-src-index.css.patch` so it cannot be lost; it must be committed, PR'd, measured on `d.suite` (consumed-but-undeclared gained 0, `/gto` elevation 0/8) and promoted. Nobody else's work: accountability does not commit product changes.

## Inventory (content-tested)

| class | count | items |
|---|---|---|
| Local branches with **unique content** not on `development`, never pushed (work at risk) | **35** | parent: `adr/one-custom-page-renderer` (15), `feat/workflow-builder-shapes-and-fullscreen` (22), `fix/the-duplicate-key-that-froze-every-dod-verdict` (23), `fix/two-stale-artefacts-blocking-the-window` (67), `fix/grant-lint-empty-range-proof` (1), `pi/c7-secdef-public-gate` (20), `pi/follow57-schema-builder-migration-tx` (2), `pi/github-app-token` (71), `pi/gitlinks-1800` (73), `pi/protection-dumps-1800` (53), `pi/readme-selftest-count` (79), `pi/register-d161-d162-and-contract-1630` (19), `pi/register-d163-d164-and-contract-1716` (34), `pi/register-d165` (37), `pi/writeback-1750` (51), `pi/writeback-1810` (55), `pi/writeback-1820` (70, carries register D-170), `pi/writeback-2000` (80, carries D-171), `verdict-writeback` (55); crm7: `fix/the-ban-on-pure-white-was-shipping-pure-white` (1, superseded by #2470 — close and delete) |
| Local worktrees to KEEP (unique commits or dirty files) | **11** | parent: `bsuite-full-integrations-20260903` (3 untracked), `bsuite-gitlink-2360` (14 commits), `bsuite-accountability-audit-20260905` (this lane's evidence record, 2 tracked + 2 untracked — committed by this lane at cycle close), `bsuite-dod-dupkey` (74), `bsuite-inventory-regen` (1 untracked), `dg-contrast` (2); crm7: `778b8745/scratchpad/wt-2487` (crm7#2490's branch, 1 commit); BSU: `.wt-bsu-glow` (above) |
| Local branches safe to DELETE (content fully in `development`) | **16** | parent: `chore/advance-conduit-pointer`, `chore/retire-legacy-signoff-context`, `fix/grant-lint-states-its-denominator`, `pi/c3-cron-observer`, `pi/phase1-work`, `worktree-agent-ad3160ba4ba11b3ab`; crm7: `fix/field-drag-id-parse`, `fix/the-ban-on-pure-white-was-shipping-pure-white` (local) |
| Worktrees safe to REMOVE (content fully in `development`) | **6** | parent: `worktrees/bsuite-follow65`, `worktrees/gate-rebase-20260906`; crm7: `778b8745/scratchpad/wt-white`; plus crm7 `wt-2490` and `wt-measure` (detached, 0 dirty, not listed by the script) |
| Remote branches with **no PR and unique content** (orphans) | **5** | `chore/lockfile-reach` in bsuite, crm7, business-suite-unified, conduit, braden, R80.4, throughput (2 days old, 1 commit — the lockfile-reach change never PR'd anywhere); crm7 `fix/seven-findings-from-the-promotion-review` (2 days); `archive/pre-rewrite-main-20260723` (archive by design — exempt) |
| Apps whose `development` tree ≠ `main` (unpromoted) | 1 | bsuite parent only (#3116 pointer advance, 2 commits); crm7, business-suite-unified, conduit, braden, R80.4, throughput all identical |
| Merges today with an enforcer gate file on disk | 2 of ~20 | crm7-2470, crm7-2490 only; none for bsuite#3103/#3105/#3106/#3107/#3114/#3117, conduit#690–#693, BSU#1166/#1169, braden#600/#601, R80.4#317–#319, throughput#476/#477 |

Counts come from the script's own KEEP/DELETE/REMOVE lines plus the worktree inventory; `ahead` numbers in the KEEP column are the script's "commits not in development" (a content test, not a history count).

## Required, no exceptions

1. Commit, push and PR the `.wt-bsu-glow` change; measure on `d.suite`; promote with cells; production re-run 0/8; answer on business-suite-unified#1169.
2. Triage every KEEP branch above: push it and open a PR, or delete it with one line saying what it contained and why it is not wanted. "Three days old and never pushed" is not a state a branch may stay in.
3. Open a PR for `chore/lockfile-reach` in each of the seven repos or delete it with the reason; same for crm7 `fix/seven-findings-from-the-promotion-review`.
4. Run `branch-cleanup.sh --apply --target development --all` for the DELETE/REMOVE rows and report deleted vs preserved.
5. Remove the dead session's scratch worktrees (`wt-white`, `wt-2490`, `wt-measure`; `wt-2487` after crm7#2490 merges).
6. Every merge from now on: gate file under `evidence/<date>/` + citation on the PR (D1–D8), cleanup in the same turn, promotion through `ops-ship-all-apps` with the `d.*` visual gate first. Accountability re-runs this inventory every cycle and posts the counts here.

