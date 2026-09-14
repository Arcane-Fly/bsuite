---
kind: record
authority: none
owner: bsuite
---

# CI annotations on every run: 112 v4 action references emit Node 20 deprecation warnings, 2 workflows pass an unknown setup-node input, 3 sast ratchets sit under baseline

https://github.com/GaryOcean428/bsuite/issues/3133

Snapshot updatedAt: 2026-09-07T00:13:20Z. Open at capture; re-read live.

## What the operator saw

On bsuite#3132 (head `d0f0f0984`, merged 00:09Z) the Checks tab carries ~40 annotations that render as inline comment boxes. None concern the change; all are estate-wide and repeat on every run. Measured 2026-09-07T00:10Z from `GET /commits/d0f0f0984/check-runs` + each run's annotations:

| class | count on this head | what it says | where it comes from |
|---|---|---|---|
| Node 20 deprecation | 34 check runs, 1 warning each | "Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/setup-node@v4, actions/setup-python@v5, marocchino/sticky-pull-request-comment@…" | parent workflows still reference **56× `actions/checkout@v4`** and **56× `actions/setup-node@v4`** (vs 70× checkout@v5, 41× setup-node@v5, 2× setup-node@v6) — `grep -rhoE "uses:\s*actions/(checkout|setup-node|setup-python)@v[0-9]+" .github/workflows/` |
| unknown input | 2 warnings | "Unexpected input(s) 'package-manager-cache', valid inputs are […setup-node@v4 list]" | `.github/workflows/plan-currency.yml` and `.github/workflows/estate-invariants.yml` pass a v5/v6 input to `setup-node@v4` — the cache setting is silently ignored |
| sast ratchet slack | 3 notices | "One or more apps came in UNDER baseline. Re-run with --update so the ratchet keeps its grip; a baseline that silently absorbs improvements stops being evidence." | `sast (conduit)`, `sast (braden)`, `sast (business-suite-unified)` — their banked ceilings sit above the current count |
| positive control | 1 **failure**-level annotation, job still green | "20261231-ci-positive-control-v1.00W.md presents as a live plan, carries no currency marker…" | `plan-currency.yml:65` plants this probe on purpose so the gate is seen to bite — expected, not a defect |

## Why it matters

Forty identical boxes on every PR hide the one annotation that would matter. The `package-manager-cache` case is a real misconfiguration (a cache nobody gets). The sast notices mean three ratchets are not gripping.

## Plan

1. Mechanical bump `actions/checkout@v4 → v5` and `actions/setup-node@v4 → v5` across `.github/workflows/` (one PR, parent only; the app repos need the same sweep — count them before claiming the class); re-run one workflow and confirm the warning count drops to the two third-party actions.
2. In `plan-currency.yml` and `estate-invariants.yml`, either bump `setup-node` to the version that accepts `package-manager-cache` or drop the input.
3. Re-bank the three sast baselines with `--update` after a human reads the delta.

## Owner and evidence

Owner: `claude-code-bsuite-pi` (platform / CI config; not product code). Filed by the accountability lane (session 3409a521) after the operator asked for bot comments to be addressed on #3132 — the comments were these annotations. Evidence: accountability record §109; annotation dump reproducible with the API call above.
