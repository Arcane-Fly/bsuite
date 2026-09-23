---
kind: record
authority: none
owner: bsuite
---

# [P1][ci] Nine concurrent E2E runs, none finishing — the V-1 fix turned a 25-second no-op gate into a saturating one

https://github.com/GaryOcean428/crm7/issues/1784

Snapshot updatedAt: 2026-08-27T01:36:03Z. Open at capture; re-read live.

## The observation

`crm7#1768` (*"the E2E credentials were set and no workflow read them"*) merged at **2026-08-17T04:23:57Z**. It is correct and it fixed a real, serious hole — a green gate over 111 skipped tests.

**Its immediate second-order effect has not been noticed, and it is now blocking every lane.**

Measured at **05:19:09Z**:

| Started | Branch | State |
|---|---|---|
| 04:43:52 | `fix/ad8-xero-sync-health` | in_progress |
| 04:44:59 | `fix/d80-module-visibility-hidden-modules` | in_progress |
| 04:45:48 | `lane/v2-v4-v5-v11-controls` | in_progress |
| 04:51:36 | `lane/v2-v4-v5-v11-controls` | in_progress |
| 04:52:46 | `fix/pf3-pf4b-provable-redundancies` | in_progress |
| 04:54:52 | `fix/pf3-pf4b-provable-redundancies` | in_progress |
| 04:57:29 | `chore/bsuite-ui-1.1.0` | in_progress |
| 04:57:52 | `fix/e2e-a11y-forms` | in_progress |
| 04:58:38 | `fix/po1-field-officer-landing-queries` | in_progress |

**Nine concurrent full-browser runs. Zero completed.** The oldest has been going 35 minutes. The only `completed` run in the window failed at `pnpm install --frozen-lockfile` on a dependency-bump branch — i.e. it never reached the tests.

## Why this is a change, not a coincidence

Before the fix, the suite finished in **24.8 seconds**:

```
[auth.setup] CRM7_E2E_EMAIL / CRM7_E2E_PASSWORD not set. Writing empty
             storage state — authenticated tests will skip themselves.
111 skipped
 15 passed (24.8s)
```

It was fast because it was not testing anything. Now it runs all **126** specs, in a real browser, and nine lanes are doing that simultaneously on a shared runner pool.

## Why it matters

A gate nobody can get through is failed differently from a gate that passes wrongly, but both stop work. `e2e` is the last pending check on multiple open PRs right now, so the practical effect is that **no PR in this repository can go green**. If it stays this way the predictable response is that someone marks `e2e` non-required, which quietly restores the exact posture `crm7#1768` just fixed.

**Nothing here argues for reverting `crm7#1768`.** The fix is right. What is missing is the capacity and sharding work that a suite which actually runs was always going to need, and which nobody had to think about while it was skipping.

## Reproduction

```bash
date -u +%H:%M:%SZ
gh run list -R GaryOcean428/crm7 --workflow="E2E Tests" --limit 10 \
  --json status,conclusion,createdAt,headBranch \
  --jq '.[]|"\(.status)\t\(.conclusion//"-")\t\(.createdAt[11:19])\t\(.headBranch)"'

# the "before" number, on any run created before 2026-08-17T04:23Z:
gh run view 31956277180 -R GaryOcean428/crm7 --log | grep -E "skipped|passed"
# → 111 skipped / 15 passed (24.8s)
```

## Suggested next steps, in order of cheapness

1. **Measure one full green run end to end.** Nobody currently knows how long the real suite takes, because it has never completed in CI. Everything below is guesswork until that number exists.
2. **Add `concurrency:` with `cancel-in-progress` on the E2E workflow**, keyed by PR. Two of the nine runs above are *superseded runs on the same branch* — `lane/v2-v4-v5-v11-controls` and `fix/pf3-pf4b-provable-redundancies` each hold two. That is free capacity.
3. **Shard** with Playwright's `--shard` across a matrix, once (1) gives a duration to divide.
4. **Consider a smoke subset as the required check** and the full suite on a schedule or on `main` — but only with an explicit assertion of how many specs the smoke subset executed, or this reintroduces the D-92 defect in a new costume.

## Do not fix this by making the gate optional

The whole point of `crm7#1768` and of the new *"Report how many specs actually executed"* step is that a suite must state what it ran. Marking `e2e` non-required, or reintroducing a skip-on-missing-credential path, restores a gate that cannot tell "checked nothing" from "found nothing" — bsuite#1966, operator directive D-92.

**Filing is not fixing.** Nothing in this issue changes the runner situation.
