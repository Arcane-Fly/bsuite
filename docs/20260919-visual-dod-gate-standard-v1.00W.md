---
kind: standard
authority: engineering
owner: bsuite
evidence:
  - .github/workflows/promotion-gate.yml
  - ~/.agents/skills/bsuite-ship-visual-promote/SKILL.md
  - ~/.agents/skills/bsuite-ship-visual-promote/references/visual-inspection-protocol.md
  - scripts/branch-cleanup.sh
  - docs/plans/20260908-remediation/prompts/20260908-bsuite-3138-remediation-prompt-v1.00W.md
---

# Visual DoD gate standard — block NEW fails, not any fail (bsuite#3138)

Ruling date 2026-09-19. Issue: https://github.com/GaryOcean428/bsuite/issues/3138.
Implements the issue's own proposal, verbatim in intent. This document is the
repo-side authority for what the promotion gate enforces; the skill
`bsuite-ship-visual-promote` carries the matching rule and its evidence template.

## The conflict it resolves

Two rules that are each correct collide on every pointer-style promotion:

1. **"Never apply `visual-dod-passed` over a FAIL."** Right, and it exists because a
   label applied without the inspection is a false-complete that is timestamped and
   attributable.
2. **A promotion that provably renders nothing cannot fix a production defect.**

The old standard ("any FAIL anywhere on the promoted apps blocks the label") made a
pointer promotion inherit the estate's entire open visual backlog as its merge gate.
That is a permanent block that protects nothing, and it creates pressure to apply the
label anyway — the exact false-complete the rule exists to prevent. A rule that can
only be satisfied by breaking it will get broken.

## The standard (what the gate enforces from this ruling)

The agent still performs the full visual DoD (V-1 untouched). The evidence still goes
on the PR. The unit of inspection is the PAGE, not the diff (V-2 untouched). The gate
blocks on **NEW** fails:

- **A NEW fail blocks absolutely.** Planting one on a promotion must still produce a
  blocked gate run (positive control, AC-3).
- **A PRE-EXISTING fail does not block**, provided BOTH:
  1. it is **named by issue number** in the PR's visual-DoD evidence, and
  2. the evidence shows this promotion does not touch its surface (the no-touch test
     below).
- **UNKNOWN / INCOMPLETE still blocks** (ruling V-3 untouched). A class the inspection
  could not evaluate is never a pass.
- **A promotion that changes rendered surfaces gets the full standard, unchanged**:
  a green matrix across the d.* hosts, both themes, four breakpoints.
- **The label still records that the agent RAN the inspection.** Applying it without
  running the matrix is a false-complete regardless of this ruling — the label event
  remains timestamped and attributable in the PR timeline.

## No-touch evidence — the mechanical definition (AC-2)

A promotion is pointer-style / renders-nothing when it meets BOTH of:

- **Gitlinks equal production:** every submodule gitlink changed by the PR points at a
  commit that the app's production host already serves. Compare the **live SHA from the
  deployment** (Vercel deployment meta / `version.json` on the prod host), not from git
  — "merged" is not "serving".
- **Dependency resolution is frozen:** the lockfiles are unchanged relative to what
  resolves live (e.g. the `@bsuite/page-builder` pin and its resolved version equal
  live), with CI and Vercel installing `--frozen-lockfile`.

A promotion failing the no-touch test requires the full green matrix (existing rule).
The evidence template for the PR is in the skill's
[`visual-inspection-protocol.md`](../../.agents/skills/bsuite-ship-
visual-promote/references/visual-inspection-protocol.md) §8.

## Why "just fix the FAILs first" is not the answer

It is the right thing to do and it is being done — but it is a *different* work item
with a different owner and cadence. Coupling it to the promotion means the pointer
promotion inherits the entire estate's open visual backlog as a merge gate, which is
not what the gate was designed to catch. The gate exists so that **a promotion does
not ship a new visual regression to production**, and it is very good at that.

## Positive control (AC-3) — the gate must still bite

A gate relaxed without a control is a gate nobody knows still bites. The control:

1. On a **scratch branch** (never merged), plant a genuinely new visual FAIL — e.g. a
   pure-endpoint background on one app page — and promote it via a dev→main PR.
2. Run the gate against it: `gh pr checks <n>` must show `visual-dod-signoff` **fail**
   (the label is refused by the skill rule; the run shows the new STANDARD ENFORCED
   message, AC-1).
3. Capture the blocked run URL, then close the PR and delete the branch. Record the
   run URL in the issue comment as proof the relaxed gate still bites.

Negative-paired control: a pointer-style PR carrying a named pre-existing FAIL with
valid no-touch evidence passes the gate.

## Historical no-touch pass (the seam case that prompted this)

bsuite PR #3119 (merged 2026-09-07) is the seam case: a pointer promotion whose six
gitlinks equalled what production served, with frozen dependency resolution, carrying
open FAILs BSU#1165, BSU#1179, throughput#483, throughput#485, R80.4#320 — all five
re-verified OPEN on 2026-09-19. Under the new standard it is a conforming pass: the
PR names the carried FAILs by issue number and its no-touch evidence (six-gitlink
table, lockfile resolution lines, live-SHA comparison) is on the PR.

## Sequencing and guardrails

- This is a CI-message + skill-rule change to the PARENT repo — no app surface changes,
  no deployments, no migrations. The standard `bsuite-ship-visual-promote` visual gate
  does NOT apply as a d.* pass; verification is the control runs.
- bsuite#3139 (visual-gate instrumentation defects — what the probe measures) is a
  SEPARATE pending row; do not merge scope. 3139 fixes what the probe sees; 3138 fixes
  what a fail blocks. Touching both in one PR is a defect class.
- Do NOT close the sibling visual FAIL issues (BSU#1165/1179, throughput#483/485,
  R80.4#320) — naming them as carried pre-existing fails is the mechanism, not a
  resolution.