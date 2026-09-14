---
kind: record
authority: none
owner: bsuite
---

# The component registry can scan an empty estate and report it as the answer

https://github.com/GaryOcean428/bsuite/issues/3100

Snapshot updatedAt: 2026-09-05T13:48:29Z. Open at capture; re-read live.

Reported by the copilot-customization-audit lane. Verified.

## The gap

`assert-app-trees-present.sh` exists precisely for this and explains itself well: an empty tree is indistinguishable from a clean one to a grep, so a run over uninitialised submodules reports a pass over zero coverage. Five workflows call it.

`estate-alignment.yml` does not, and it is the workflow that runs the component registry.

## Why that is the worst place to omit it

`readSrc` returns silently for a directory that does not exist, and `buildRegistry` has no preflight. It walks the six apps, and for each one an absent tree yields a component count of zero and no usage rows, with no error. The registry then records that the estate is built from nothing, and `--check` compares that against the committed file.

The registry is the denominator for other work: sibling counts, "fix the class not the page", and finding shared components nothing consumes. A registry that silently reads zero does not merely fail, it produces a confident wrong answer that other decisions are taken against. The audit lane reproduced it: with all six child trees uninitialised, six zero counts and 195 of 195 symbols reported unused. The populated control returned 449, 117, 98, 207, 91, 5.

Nothing in the existing tests covers a missing tree. The generator's own self-test passes 14 of 14 either way.

## Fix

Both entry points must refuse before they scan, not only the writing one. `--check` reporting a false clean is the same defect as a bad write, and is likelier to be believed because it looks like a passing gate.

Call the existing guard from `estate-alignment.yml` before the registry steps, and add a preflight inside `buildRegistry` so a local or standalone run refuses too. The workflow guard alone leaves anyone running it by hand unprotected, and a developer with uninitialised submodules is the ordinary case, not the exotic one.

## Acceptance

One missing tree refuses. All six missing refuses. All six present passes and returns the populated counts. Assert on the refusal, not merely on a non-zero exit, so a refusal for an unrelated reason cannot pass as this one.

## Not in scope

Zero counts are not deletion authority. Nothing here licenses removing a component because the registry reports no importer, and the fix should not imply it.
