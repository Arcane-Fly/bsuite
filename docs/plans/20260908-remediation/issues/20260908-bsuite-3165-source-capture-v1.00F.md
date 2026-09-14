---
kind: record
authority: none
owner: bsuite
---

# required_linear_history on main makes every --merge promotion unmergeable — which is why promotions keep needing --admin

https://github.com/GaryOcean428/bsuite/issues/3165

Snapshot updatedAt: 2026-09-07T12:19:59Z. Open at capture; re-read live.

## Every promotion to `main` is structurally unmergeable without `--admin`

`gh pr merge 3148 --merge` returns:

```
X Pull request GaryOcean428/bsuite#3148 is not mergeable: the base branch policy prohibits the merge.
```

**Not a failing check.** On #3148 every one of the **34 required contexts passes**, and
`required_approving_review_count` is **0**. The three red checks
(`version-collision-lint`, `Class C`, `redirect_uri`) are **not in the required list** — and the
`redirect_uri` job's own comment says *"NOT a PR-required check — network-dependent."*

## The cause

Classic branch protection is not the whole story. There is a **ruleset** (`14254675`) on `main`,
and it carries:

| rule | effect |
|---|---|
| **`required_linear_history`** | **merge commits are prohibited** |
| `required_status_checks` | `strict: true` — the branch must be up to date with base |
| `code_scanning` | CodeQL, `alerts_threshold: errors`, `security_alerts_threshold: high_or_higher` |

Classic protection reports `required_linear_history: {enabled: false}`, so reading that alone
gives the wrong answer. The ruleset is the binding one.

## The conflict, stated plainly

- **The estate rule** (`bsuite-ship-visual-promote`, and the operator's own instruction) is:
  promote with **`--merge`, never `--squash`**. `--squash` and rebase both rewrite SHAs, which is
  how a promotion loses its identity against the app mains it points at.
- **`required_linear_history` forbids exactly that** — a merge commit is the one thing it rejects.

**A promotion cannot satisfy both.** That is why bsuite#3119 was merged with `--admin`
(accountability lane, cycle 101, "verified no host changed").

## And the rule is not achieving linearity anyway

`main` already contains merge commits — `03ba2028d "Merge pull request #3119 from
GaryOcean428/development"` is one, landed *through* the bypass. So the rule is not producing a
linear history; it is producing **a habit of bypassing rules on production promotions**, which is
strictly worse than either outcome it was choosing between.

## What needs deciding — operator call, not mine

One of these, and it is a governance decision rather than an engineering one:

1. **Drop `required_linear_history` from the ruleset on `main`.** Promotions are merge commits by
   design here; the merge commit is what records that a promotion happened, and the estate's
   `merge_commit_debt_on_production` accounting already expects it.
2. **Change the estate rule to allow rebase-merge on promotions**, accepting that promotion SHAs
   are rewritten — which breaks "the gitlink equals the app main that was promoted" as a check.
3. **Keep both and accept `--admin` as the sanctioned path**, in which case it should be written
   down as the procedure rather than left looking like a bypass each time.

I have **not** used `--admin`, and will not without that decision. The accountability lane flags
admin merges, and it is right to.

## Also worth knowing

`strict: true` on the ruleset's status checks means the branch must be **up to date with base**
before merging. Combined with `main` being ahead by merge-commit debt after every promotion, a
promotion PR goes `BEHIND` immediately and `gh pr update-branch` then fails with
*"3 of 7 required status checks are expected"* — observed on business-suite-unified#1192 today.
So the update path is also blocked, independently.

Filed while gating bsuite#3148.
