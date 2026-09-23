---
kind: record
authority: none
owner: bsuite
---

# The visual DoD gate blocks promotions that provably render nothing, and cannot be satisfied without breaking its own rule

https://github.com/GaryOcean428/bsuite/issues/3138

Snapshot updatedAt: 2026-09-07T06:07:48Z. Open at capture; re-read live.

## The conflict

Two rules that are each correct collide on every pointer-style promotion, and bsuite#3119 sits
exactly on the seam:

1. **"Never apply `visual-dod-passed` over a FAIL."** Right, and it exists because a label
   applied without the inspection is a false-complete that is timestamped and attributable.
2. **A promotion that provably renders nothing cannot fix a production defect.**

On #3119, measured: **all six gitlinks already equal what is live in production**, five apps pin
`@bsuite/page-builder` `^2.6.1` with the lockfile resolving `2.6.1`, and both Vercel and CI
install `--frozen-lockfile`. So merging it changes **no rendered surface for any user**.

Yet there are open visual FAILs on the apps it promotes — BSU#1165, BSU#1179, throughput#483,
throughput#485, R80.4#320. Under rule 1 the promotion is blocked. Under rule 2 it has no power to
unblock itself: it cannot fix those defects, because it does not change what renders.

**The result is a permanent block that protects nothing.** Worse, it creates pressure to apply
the label anyway — which is precisely the false-complete rule 1 exists to prevent. A rule that
can only be satisfied by breaking it will get broken.

## Why "just fix the FAILs first" is not the answer

It is the right thing to do and it is being done — but it is a *different* work item with a
different owner and cadence. Coupling it to the promotion means the pointer promotion inherits
the entire estate's open visual backlog as a merge gate, which is not what the gate was designed
to catch. The gate exists so that **a promotion does not ship a new visual regression to
production**, and it is very good at that.

## Proposed standard

Gate the visual DoD on **"introduces no NEW fail"**, not "no fail exists anywhere":

- The agent still performs the inspection — V-1 is untouched, and nothing here weakens it.
- The evidence still goes on the PR, and UNKNOWN still blocks (V-3 untouched).
- A **pre-existing** FAIL does not block, provided it is **named with its issue number** and the
  promotion is shown not to change the surface it appears on.
- A **new** FAIL blocks absolutely, as now.

For a promotion that changes no rendered surface, "introduces no new fail" is provable directly —
gitlinks equal live commits, and the dependency resolution is frozen — which is a stronger and
more honest claim than a green matrix would be.

## What must NOT be weakened

- The label still records that **the agent ran the inspection**. Applying it without running the
  matrix stays a false-complete regardless of this change.
- **UNKNOWN still blocks.** Ruling V-3 is the reason the gate can tell "checked nothing" from
  "found nothing", and this proposal does not touch it.
- A promotion that **does** change rendered surfaces gets the full standard, unchanged.

## Acceptance

- The gate's own message states which standard it enforces, so nobody has to infer it.
- A promotion carrying a pre-existing FAIL can pass **only** with that FAIL named by issue number
  and evidence that the promotion does not touch its surface.
- A **positive control**: plant a genuinely new visual FAIL on a promotion and confirm it still
  blocks. A gate relaxed without a control is a gate nobody knows still bites.

## Evidence

Full measurements on bsuite#3119: the six-gitlink table, the lockfile/frozen-install proof, the
8-cell matrix, and the two probe defects found while running it.
