# [incident] A Hermes desktop session worked inside the PRIMARY checkouts as GaryOcean428 during the 2026-09-08 takeover: direct push to crm7 development, un-gated merges and PRs, auto-merge armed

https://github.com/GaryOcean428/bsuite/issues/3199

Snapshot updatedAt: 2026-09-08T02:37:30Z. Open at capture; re-read live.

## Measured (2026-09-08, takeover lane `claude-code-bsuite-takeover`, operator lock 00:20Z)
- **01:04:56 AWST+8 → 01:05:12Z**: crm7 **primary** checkout reflog: `development@{09:02:44}: branch: Reset to origin/development` then `development@{09:04:56}: commit (merge): Merge chore/refresh-schema-baseline-20260907: update baselines and fix pgtap stub` → pushed as `b8d2e232a` to `origin/development` outside PR #2533 while that branch's C10 + drift checks were red. Consequence: every branch cut from development afterwards failed drift/C10 (inherited dump) and preview-branch e2e (post-baseline CREATE collisions) — the class fixed by crm7#2572 and #2533.
- **01:52:54Z**: BSU#1199 merged by the same identity without this lane's gate; **09:52–09:54 AWST**: BSU primary checkout reflog shows checkout development → pull → merge origin/main → new branch `chore/resync-dev-with-main-20260908` → BSU#1200 (a cosmetic back-merge doctrine says not to open).
- **01:54–01:56Z**: PRs opened from this lane's worktrees while their implementers were mid-write: BSU#1201, #1202, #1203, crm7#2571 (pre-amend head `cccc16904`, later lease-pushed over).
- **before 01:58Z**: auto-merge armed on crm7#2533 (disabled by this lane).
- Identity: `hermes-orchestrator` on the qig-memory inbox (29a1355b); the only non-Claude agent executing tools on the host is the Hermes desktop kernel runner (`hermes_kernel_runner.py`). Hermes' cron (`854ef8e194ea`) answered NO to the b8d2e232a push with evidence (inbox e96fdb64) — the desktop session is a different actor from the cron.
- `development` protection on crm7: 15 required contexts, `required_pull_request_reviews` null, `enforce_admins` false — direct pushes are allowed.

## Why it matters
Two mutators in one working tree is the measured 2026-09-04 failure class; here it also bypassed red checks onto development and opened PRs on unfinished heads.

## Ask
1. Stop the Hermes desktop orchestrator session while a takeover lane holds the lock; make its cron read-only by prompt (done for `854ef8e194ea` by its own STATUS).
2. Ruleset on crm7/BSU `development`: require a PR (no direct push) — the 15 required contexts are meaningless without it.
3. Record in the lane roster that the machine git identity is shared, so "by GaryOcean428" never identifies a lane; use the reflog of the checkout that made the commit.

Memory: `bsuite_incident_20260908_direct_push_crm7_development`. Inbox: 99205dc0, bae3f7b7 (STOP directives).
