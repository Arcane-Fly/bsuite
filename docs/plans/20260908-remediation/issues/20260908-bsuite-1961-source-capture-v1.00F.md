---
kind: record
authority: none
owner: bsuite
---

# [P1] Migration rehearsal has no submodule-presence assertion — without the PAT it rehearses nothing and reports green

https://github.com/GaryOcean428/bsuite/issues/1961

Snapshot updatedAt: 2026-08-24T03:26:17Z. Open at capture; re-read live.

## The defect

`supabase-migration-rehearsal.yml` checks out with `token: ${{ secrets.BSUITE_CROSS_REPO_PAT || secrets.GITHUB_TOKEN }}` and **has no assertion that the submodules actually arrived**.

`theme-conformance.yml` — same repo, same checkout pattern — does have one, and records why:

> Without the PAT the submodules are absent, and the scanner would report a LOW count for missing apps — a false pass, which is worse than a failure. Check explicitly rather than trusting the number.

The rehearsal workflow needs that assertion more, not less. If the PAT is absent, expired, or unavailable, checkout falls back to `GITHUB_TOKEN`, which is scoped to the current repository and **cannot clone the private submodules**. The rehearsal then replays the parent's 22 migrations, finds nothing wrong with the other 754 it never saw, and reports green.

**A migration-rehearsal gate that passes when it rehearsed nothing is the exact failure class the workflow was built to cure.**

Related: bsuite#1781 records that the PAT gap already causes two other workflows to never run.

## Do NOT "prefer GITHUB_TOKEN"

A review recommended defaulting to `GITHUB_TOKEN` to reduce credential blast radius. **That fix would break the workflow.** From `theme-conformance.yml`:

> Every app is a PRIVATE submodule, so the default GITHUB_TOKEN cannot clone them — it fails with a bare "Repository not found", which reads like a typo rather than a permissions problem.

The blast-radius concern is legitimate. The fix is not.

## Required actions

1. **Add the submodule-presence assertion**, copying the pattern from `theme-conformance.yml`. Fail loudly, naming the missing scopes and the PAT secret.
2. Keep `persist-credentials: false` — already correct.
3. Gate PAT usage behind `if: github.event.pull_request.head.repo.fork == false`.
4. **Reduce blast radius properly**: replace the PAT with a **GitHub App installation token** scoped to the six submodule repositories with `contents: read`. Short-lived and repo-scoped, which a PAT is not.
5. Item 4 is the durable answer for every workflow in the estate using this pattern. **Audit all of them** for the same missing assertion and report the count.

## Acceptance criteria

- [ ] A run with the PAT unavailable fails with a named error, not a green result
- [ ] A run with the PAT present checks out all six submodules and the assertion confirms it
- [ ] PAT replaced with an App installation token, or a written reason why not
- [ ] Count of other workflows using this checkout pattern, and how many lacked the assertion

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: §9.1 — demonstrate both outcomes
- **Equivalence target**: two runs, one with the secret available and one without; the second must be red
- **Cross red-team**: peer confirms the failure case actually fails. A gate never seen to fail is not a gate.
- **Skills to load**: `supabase`, `code-quality-enforcement`
- **Self-report on divergence**: yes

Ref: operator directive 2026-08-13 §9, D-86. Related: bsuite#1781, bsuite#1892.
