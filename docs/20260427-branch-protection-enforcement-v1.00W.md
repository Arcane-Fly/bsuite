# Branch Protection Enforcement — All BSuite Repos

- **Document:** `20260427-branch-protection-enforcement-v1.00W.md`
- **Status:** Working (W) — applied 2026-04-27
- **Operator:** Claude (BSuite WS-J coordinator)
- **Reference RCA:** `docs/20260427-dev-main-fork-rca-v1.00W.md`

## Summary

Hardened branch protection on the `main` and `development` branches of all 7 BSuite
repos to close the dual-merge force-push gap identified by the dev/main fork RCA.
Prior config allowed force pushes, did not require PRs, and exempted admins —
which is the exact mechanism that produced 26 bypass PRs (10 parent + 16 crm7)
between 2026-04-14 and 2026-04-27.

## Applied protection profile

For each of the 14 protected refs (7 repos × `main`/`development`):

| Setting | Value | Rationale |
|--------|-------|-----------|
| `allow_force_pushes` | **`false`** | Stops the dual-merge overwrite. This is the load-bearing change. |
| `required_pull_request_reviews.required_approving_review_count` | `0` | Forces the PR path without blocking a solo operator. |
| `required_pull_request_reviews.dismiss_stale_reviews` | `false` | Reviews aren't required, so dismissal logic is moot. |
| `enforce_admins` | **`true`** | Without this, the rules above are advisory — admins (i.e. the operator) would silently bypass. |
| `required_linear_history` | `false` | Both squash-merge and merge-commit are fine for the BSuite workflow; we don't want to force-rebase. |
| `required_status_checks` | preserved per-repo | Existing WS-I PHASE-2 contexts retained, **not stripped**. |
| `restrictions` | `null` | No push allowlist — protections above are the gate. |
| `allow_deletions` | `false` | Branches can't be deleted via API. |
| `required_conversation_resolution` | `false` | Solo workflow; not load-bearing. |
| `lock_branch` | `false` | Active branches, not archives. |

## Per-repo before/after

All 14 refs had identical pre-state: force pushes allowed, no PR required, admins
exempt, single-context status check. Status check contexts vary per repo and were
preserved as-is.

| Repo | Branch | Before | After |
|------|--------|--------|-------|
| bsuite | main | force=true, prs=null, admins=false, ctx=`gitleaks` | force=**false**, prs=**required(0)**, admins=**true**, ctx=`gitleaks` |
| bsuite | development | force=true, prs=null, admins=false, ctx=`gitleaks` | force=**false**, prs=**required(0)**, admins=**true**, ctx=`gitleaks` |
| business-suite-unified | main | force=true, prs=null, admins=false, ctx=`build-and-test` | force=**false**, prs=**required(0)**, admins=**true**, ctx=`build-and-test` |
| business-suite-unified | development | force=true, prs=null, admins=false, ctx=`build-and-test` | force=**false**, prs=**required(0)**, admins=**true**, ctx=`build-and-test` |
| crm7 | main | force=true, prs=null, admins=false, ctx=`build-and-test` | force=**false**, prs=**required(0)**, admins=**true**, ctx=`build-and-test` |
| crm7 | development | force=true, prs=null, admins=false, ctx=`build-and-test` | force=**false**, prs=**required(0)**, admins=**true**, ctx=`build-and-test` |
| conduit | main | force=true, prs=null, admins=false, ctx=`build-and-test` | force=**false**, prs=**required(0)**, admins=**true**, ctx=`build-and-test` |
| conduit | development | force=true, prs=null, admins=false, ctx=`build-and-test` | force=**false**, prs=**required(0)**, admins=**true**, ctx=`build-and-test` |
| braden | main | force=true, prs=null, admins=false, ctx=`build-and-test` | force=**false**, prs=**required(0)**, admins=**true**, ctx=`build-and-test` |
| braden | development | force=true, prs=null, admins=false, ctx=`build-and-test` | force=**false**, prs=**required(0)**, admins=**true**, ctx=`build-and-test` |
| R80.3 | main | force=true, prs=null, admins=false, ctx=`quality` | force=**false**, prs=**required(0)**, admins=**true**, ctx=`quality` |
| R80.3 | development | force=true, prs=null, admins=false, ctx=`quality` | force=**false**, prs=**required(0)**, admins=**true**, ctx=`quality` |
| throughput | main | force=true, prs=null, admins=false, ctx=`Test Suite` | force=**false**, prs=**required(0)**, admins=**true**, ctx=`Test Suite` |
| throughput | development | force=true, prs=null, admins=false, ctx=`Test Suite` | force=**false**, prs=**required(0)**, admins=**true**, ctx=`Test Suite` |

## Verification

Each branch was verified post-PUT via:

```bash
gh api repos/GaryOcean428/<repo>/branches/<branch>/protection \
  --jq '{allow_force_pushes: .allow_force_pushes.enabled,
         prs_required: (.required_pull_request_reviews != null),
         enforce_admins: .enforce_admins.enabled,
         linear: .required_linear_history.enabled,
         contexts: .required_status_checks.contexts}'
```

All 14 branches returned `allow_force_pushes: false`, `prs_required: true`,
`enforce_admins: true`, with the expected per-repo status check context preserved.

## Operator notes

### What now FAILS

Any local workflow that direct-pushes to `main` or `development` will be rejected
with a permission error from GitHub. This includes:

- **Codeium Cascade IDE auto-snapshot direct pushes** to either protected branch.
  This was the suspected vector in the dev/main fork RCA. The IDE config itself
  is **not** changed by this enforcement — the user must update Cascade settings
  to push to a feature branch and open a PR, or the agent will keep failing.
- Manual `git push origin main` from a local working copy.
- Force-pushes from any source (including `git push -f` after rebasing main onto
  itself, which previously worked silently).

### What still WORKS

- `gh pr merge --admin --squash` and `--merge` — admin-bypass is for the
  status-check requirement, not for the force-push or PR rules. The merge still
  goes through GitHub's PR merge button equivalent, producing one merge commit.
- Direct push to feature branches (e.g. `feat/foo`, `chore/bar`) — only `main`
  and `development` are protected.
- Deletion of feature branches via PR auto-delete or `gh pr merge --delete-branch`.

### Recovery if this breaks something

To temporarily relax (only with user authorization):

```bash
# Re-allow force push on a single ref:
gh api -X PATCH repos/GaryOcean428/<repo>/branches/<branch>/protection/allow_force_pushes \
  --raw-field enabled=true
```

To remove protection entirely (last-resort, requires re-application after):

```bash
gh api -X DELETE repos/GaryOcean428/<repo>/branches/<branch>/protection
```

The script used to apply these protections lives at `/tmp/branch-protection/apply.sh`
during the WS-J session — recreate from this doc if needed:

```bash
gh api -X PUT repos/GaryOcean428/<repo>/branches/<branch>/protection --input - <<'JSON'
{
  "required_status_checks": { "strict": false, "contexts": ["<context>"] },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": false,
  "lock_branch": false,
  "allow_fork_syncing": false,
  "block_creations": false
}
JSON
```

## Justification

Per `docs/20260427-dev-main-fork-rca-v1.00W.md`, the dual-merge mechanism worked
because:

1. GitHub's PR-merge button created merge commit `X` on `main`.
2. A locally-constructed `dev → main` merge commit `Y` was force-pushed to `main`,
   silently overwriting `X`.
3. `enforce_admins: false` meant the operator's pushes bypassed even the single
   required status check.

Setting `allow_force_pushes: false` blocks step 2 outright. Setting
`enforce_admins: true` ensures the operator can't bypass the rule. Requiring PRs
(even with 0 reviewers) ensures the merge commit is created by GitHub's merge
button, which produces a deterministic commit recorded against a PR — making
future RCA possible if anything slips through.

## Reconcile gate

WS-J reconcile work (parent `dev → main` promotion + sub-repo dev/main parity)
was gate-blocked on this enforcement landing. With all 14 refs hardened, the
reconcile sequence can now proceed without risk of the same skew recreating
mid-flight.
