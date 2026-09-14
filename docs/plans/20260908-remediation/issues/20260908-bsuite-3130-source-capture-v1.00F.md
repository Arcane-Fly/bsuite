---
kind: record
authority: none
owner: bsuite
---

# Triage refs/attic/route-inventory-drifted-20260906 — 46 commits of gate and register work, never merged, 2176 commits stale

https://github.com/GaryOcean428/bsuite/issues/3130

Snapshot updatedAt: 2026-09-06T17:19:10Z. Open at capture; re-read live.

## What

`fix/route-inventory-drifted-under-the-moved-pointers` holds **46 non-merge commits of real
work** from 3–4 September that never reached `development`. It existed only on this machine
until today; it is now preserved at **`refs/attic/route-inventory-drifted-20260906`**
(`3f4664a77`), so nothing is at risk. It needs a decision, not a deletion.

## Why it is not merge scar — I said it was, and that was wrong

An earlier reading called the diff "merge-scar artifacts against an ancient merge-base",
sampled at 3 of 47 files. Tested across all 47:

- **26 identical** to `development` — those genuinely are scar.
- **21 differ**, of which **6 are gitlinks** (R80.4, braden, business-suite-unified, crm7,
  throughput) and 15 are real files: `AGENTS.md`, four gate baselines,
  `operator-notes-verdicts.json`, `route-inventory.json`, the component registry and feature
  index, the branch-protection README, `explicit-grant-lint.sh`, and two loop/register docs.

The commits are not empty either. A sample of what they carry:

- `ee38bd00a` — branch-protection dumps carry grant-lint and the C10 class-token gate as
  required (dev 31, main 34)
- `cac2326b9` — update-banner floor banked 0 → 1, from the guard's AST count of JSX mounts
- `ab530686a` / `e7948e071` — the version-json served-baseline corrected so the doc states the
  remaining non-serving hosts rather than "no app has adopted yet"
- `8a0ce0936` — route inventory regenerated; exported-not-mounted bank lowered 1 → 0
- `e5797fc05` / `015ddd8e5` — gitlink bumps for the 18:00 promotion window
- several docs-index rows recording completed classes with assertion counts

## Why it cannot simply be merged

The merge-base is `21f06d73b` (**2026-09-03**), and `development` is **2176 commits ahead** of
it. The six gitlinks on the branch are therefore **stale and would revert submodules** — the
"pointer PR goes stale mid-rollout" failure this estate has hit before. And much of the
baseline/registry work has plausibly been redone independently on `development` in the
intervening 2176 commits.

So merging blind reverts pointers; deleting blind discards up to 46 commits of gate and
register work. Neither is acceptable, which is why this is an issue rather than an action.

## What this needs

1. **Per-file triage of the 15 non-gitlink differences.** For each: is `development`'s version
   newer (branch content superseded — drop it), or does the branch carry something
   `development` never received (cherry-pick it)? The baselines and registries are generated,
   so regenerating on `development` may settle several at once.
2. **Discard the six gitlink changes outright.** They point at 3 September commits; every
   parent `development` gitlink now equals its app's production SHA, verified 6 September.
3. **Cherry-pick what survives**, in its own PR, gated.
4. **Then delete the branch and the attic ref**, recording what was taken and what was dropped.

## Acceptance

- Every one of the 15 differing non-gitlink files has a stated disposition — superseded, or
  cherry-picked with its PR number.
- No gitlink from this branch reaches `development`.
- The attic ref is removed only after the above is written down, so "nothing was lost" is a
  record rather than a claim.

## The worktree

`/home/braden/Desktop/Dev/worktrees/bsuite-dod-dupkey` is removed as part of filing this — the
checkout was the orphan, the content is on the remote.
