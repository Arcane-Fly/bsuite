# Parent Submodule Pointer Reconcile — Operator Runbook

**Status:** W (Working)
**Audience:** Platform operator (Braden), not an agent
**Config:** [`.gitmodules`](../../.gitmodules) — six submodules (`crm7`, `R80.4`, `braden`, `business-suite-unified`, `conduit`, `throughput`), each tracking its own `development` branch per the `.gitmodules` `branch =` setting

## The mental model

The parent `bsuite` repo does not contain the six apps' source code directly. For each submodule path, the parent's git tree stores a **gitlink** — a single pointer to one exact commit SHA in that submodule's own repository. Nothing about the parent repo "follows" a submodule's `main` or `development` branch automatically. When you clone or check out the parent repo (including in CI, with `submodules: recursive`), every submodule directory is populated at **exactly** the SHA the parent's gitlink records for the ref you checked out — not the submodule's latest commit, not its branch tip, just that one SHA.

This is why "bump the parent pointer" is a distinct, required step any time a submodule's own repo gets new commits that the rest of the system (CI dispatch workflows, other apps reading shared package versions, the roadmap dashboard) needs to see. It is also why a migrate or deploy dispatch can report success while doing nothing — see the [Database Migration Dispatch guide](20260716-database-migration-dispatch-guide-v1.00W.md)'s "stale-pointer trap" section.

## Why submodules show as "modified" in `git status` (and why that's usually fine)

Run `git status` in the parent repo and it is common to see something like:

```
Changes not staged for commit:
	modified:   crm7 (new commits)
```

or

```
	modified:   crm7 (untracked content)
```

This means the **local working copy** of that submodule directory has commits, or uncommitted content, that the parent's recorded gitlink does not yet point to. It does **not** mean anything is broken or that work has been lost — it means a pointer bump is pending. This is expected and frequent in this workspace because submodule directories get worked in directly (by the operator, and by concurrent agent sessions operating in their own submodule scope) well before the corresponding parent-pointer-bump PR lands — it is routine for several submodules to show modified at once and for that set to shrink over time as each gets its own pointer-bump commit.

**What to check before assuming it's benign:** "new commits" means commits exist somewhere reachable from that submodule directory's current HEAD; "untracked content" can also mean genuinely uncommitted file changes sitting in the submodule's working tree. Run `git -C <submodule> status` and `git -C <submodule> log --oneline -5` to see what's actually there before bumping the pointer — you want to point at a commit that is pushed to the submodule's own remote, not an uncommitted local state.

**Superseded 2026-08-22.** This paragraph used to name the hourly dashboard-refresh cron (`refresh-dashboard-data.yml`) as a background process that touches submodule working trees. That workflow was removed when the plan-completion dashboard was retired on 2026-08-10 (see `docs/20260810-plan-dashboard-retirement-v1.00W.md`), so a reader following this runbook was looking for a job that no longer runs. Its conclusion survives its example, and is the part worth keeping: treat the "dirty submodule" state as a normal, load-bearing signal that a pointer bump is owed, **not** as evidence of a specific automated process forcing it. No scheduled workflow in the estate commits gitlink changes today.

## Bumping a pointer cleanly

The pattern used consistently across recent pointer-bump commits (e.g. `chore(bsu): pointer bump → is_team_admin platform bypass migration` and `chore(crm7): pointer bump → pay_periods RLS apply fix`) is a **one-line gitlink diff**:

```diff
-Subproject commit 84d451eb0c665216526b6cf93b599e0e5555e08d
+Subproject commit 7d5b23b26b8ac90699818e0369076d9805d656d1
```

To produce that cleanly:

```bash
# From the parent repo root, make sure the submodule directory is at the
# commit you actually want the parent to point to. If you've been working
# directly in the submodule directory and it's already on the right commit
# (pushed to its own remote), skip straight to staging it below.
cd <submodule>
git fetch origin
git checkout <target-branch-or-commit>   # e.g. origin/development, or a specific SHA
cd ..

# Stage just the gitlink change — this is a single-path `git add`, not a
# recursive add, so it only records the new SHA, not submodule file content.
git add <submodule>
git commit -m "chore(<scope>): pointer bump → <one-line description of what this brings in>"
git push
```

Confirm what actually changed before committing: `git diff --cached -- <submodule>` should show exactly one line changing (`Subproject commit <old> -> <new>`) — if it shows anything else, something is wrong with how the submodule directory is checked out.

To confirm what SHA the parent currently has recorded for a submodule (without checking it out): `git ls-tree main <submodule>`. To see the parent-repo commit history that touched a given submodule's pointer: `git log --oneline -- <submodule>`.

**A pointer bump only ever points at a commit that already exists on the submodule's own remote.** It never pushes submodule commits for you — if the target commit isn't pushed to the submodule's GitHub repo yet, dispatch workflows checking it out in CI will fail to find it (or, if using a PAT without access, fail auth) rather than picking up local-only work.

## Multiple submodules in one pointer bump

Several recent commits bump more than one submodule pointer together (e.g. `chore: bump crm7/bsu/conduit pointers — live bug-bash fixes`), each still as its own single-line gitlink diff for that path. This is fine — stage each submodule path individually (`git add crm7 business-suite-unified conduit`) and describe all of them in the commit message, one bullet per submodule, naming what each one brings in. This makes the commit self-documenting for whoever next has to correlate a pointer bump with the migration/deploy dispatch it unblocks.

## After bumping — what to do next

A pointer bump by itself changes nothing in the live product or database. It only makes the new commit visible to whatever reads the parent tree next:

- If the submodule change included a **migration**, dispatch `supabase-migrate.yml` for that submodule next (see the [Database Migration Dispatch guide](20260716-database-migration-dispatch-guide-v1.00W.md)).
- If it included an **edge function** change, dispatch `supabase-functions-deploy.yml` (see the [Edge Function Deploy guide](20260716-edge-function-deploy-guide-v1.00W.md)).
- If it's an app-only change with no DB/function component and the app deploys from its own repo on Vercel, the pointer bump in the parent repo doesn't gate the Vercel deploy at all — that already happened when the submodule's own `main` was pushed. The parent pointer bump in that case is purely so the parent repo (and the roadmap dashboard's `repos[].main_sha` field, refreshed by `docs/dashboard/refresh-data.py`) reflects reality.

## Failure modes

- **You bumped the pointer but the dispatch workflow still didn't pick up the change** → confirm the pointer bump commit actually landed on the parent's `main` (not just `development` or a feature branch) — `--ref main` on the dispatch commands means the workflow reads the gitlink from `main`.
- **`git add <submodule>` shows more than a one-line diff** → the submodule directory has uncommitted local changes or is checked out to a commit that doesn't match any pushed ref; resolve that inside the submodule directory first (commit and push, or discard) before staging the pointer.
- **The dashboard still shows an old `main_sha` for a submodule after a pointer bump** → the dashboard field is refreshed by the hourly cron or a manual `refresh-data.py` + `inline-data.sh` run (see root `CLAUDE.md` §10); a pointer bump alone doesn't push the dashboard update, the next refresh cycle does.

## Related

- [Database Migration Dispatch guide](20260716-database-migration-dispatch-guide-v1.00W.md)
- [Edge Function Deploy guide](20260716-edge-function-deploy-guide-v1.00W.md)
- Root `CLAUDE.md` §10 (Roadmap Dashboard Update Protocol)
