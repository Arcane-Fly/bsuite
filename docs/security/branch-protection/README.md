---
kind: standard
authority: engineering
owner: bsuite-platform
evidence:
  - scripts/check-required-contexts-producible.mjs
  - .github/workflows/guard-self-reporting.yml
  - .github/required-contexts-baseline.json
---

# Branch protection dumps — the before-state of every protection write

Each `<branch>-<YYYYMMDD>.json` is the **verbatim** body of
`gh api repos/GaryOcean428/bsuite/branches/<branch>/protection`, taken **before** a write in
the PR that made the write. They exist for three reasons, each with an incident behind it.

## 1. The rollback has to be in history, not in scrollback

Branch protection is not in the repository. Its only record used to be whatever the person
who changed it happened to paste into a PR comment, and by the time anyone needed to undo a
change that person's terminal was gone. A dump committed in the same PR as the write means the
revert is `git show`-able a year later by someone who was not there.

## 2. Contexts are APPENDED with POST, never replaced with PUT

```sh
# CORRECT — appends, leaves the other contexts alone
gh api --method POST \
  repos/GaryOcean428/bsuite/branches/<branch>/protection/required_status_checks/contexts \
  -f 'contexts[]=<exact context string>'
```

`PUT` on the same endpoint **replaces the whole list**. Appending one context by `PUT` has
erased the other twenty-nine here before. Every write is followed by a re-read and a diff
against the dump: only the appended contexts may differ.

The strings are **exact**, including capitalisation, punctuation and the em dashes some of them
carry. A context is the JOB's `name:` — or the job ID when the job has no `name:`, which is why
`gates` and `no-prerelease-in-production` sit in the list under bare job IDs while everything
else is a sentence. A matrix job reports as `name (values)`, so its bare name is not a context
anyone can produce.

## 3. A required context nobody can produce blocks every merge, silently

GitHub does not start a workflow whose `paths:` the pull request's changeset misses, so the
context never reports and the PR waits forever on "Expected — waiting for status to be
reported" with every visible check green. A job-level `if:` that evaluates false reports
SKIPPED, and SKIPPED does not satisfy a required context either. A job renamed out from under
a context string still sitting in protection does the same thing.

`scripts/check-required-contexts-producible.mjs` reads **these files** — never the live API, so
it needs no token — and fails the build when any required context is unproducible,
path-filtered, `if:`-gated, or scoped to a branch it is not required on. It runs on every PR
inside the `LANE-WATCHER — every guard states what it examined` job, which is itself required
on both branches. Prove it can fail with `node scripts/check-required-contexts-producible.mjs
--self-test` (7 cases, one planted defect each).

## What these dumps do NOT tell you

- **Whether they still match live protection.** A protection write made outside a PR leaves
  the newest dump stale, and the gate above cannot see that: it compares workflows to the
  committed file, not to GitHub. Re-dump in the PR that writes protection. That is the whole
  convention.
- **Anything about rulesets.** `repos/GaryOcean428/bsuite/rulesets` is a second, independent
  layer — as of 2026-09-03 the `default` ruleset re-requires `build-and-test` and
  `DOM Layout Invariants` on the default branch on top of classic protection, and the
  `development` ruleset requires no status checks at all. Ruleset-level required checks are
  configured through a different API and are not in these files.
- **Whether a required gate is correct**, or can fail. That is each gate's own `--self-test`
  and the LANE-WATCHER entry that registers it.

## Re-dumping

```sh
d=$(date +%Y%m%d)
for b in development main; do
  gh api "repos/GaryOcean428/bsuite/branches/$b/protection" \
    > "docs/security/branch-protection/$b-$d.json"
done
node scripts/check-required-contexts-producible.mjs            # must be clean
node scripts/check-required-contexts-producible.mjs --update-baseline
```

The gate reads the **newest** file per branch by the date in the filename; older dumps stay
because they are the rollback for the write that superseded them.
