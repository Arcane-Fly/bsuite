---
kind: record
authority: none
owner: bsuite
---

# [P2][EPIC] Sweep every CI gate for the &#34;checked nothing vs found nothing&#34; defect — assert inputs, fail closed

https://github.com/GaryOcean428/bsuite/issues/1966

Snapshot updatedAt: 2026-09-08T05:23:26Z. Open at capture; re-read live.

## The rule

**A CI gate that cannot distinguish "checked nothing" from "found nothing" is not a gate.**

Three instances surfaced in two files on 2026-08-13:

- **bsuite#1961** — migration rehearsal has no submodule-presence assertion. Without the PAT it checks out nothing, rehearses nothing, and reports green.
- **bsuite#1963** — theme baseline committed from the wrong tree, so the gate's threshold and its measurement disagree.
- **bsuite#1964** — migration rehearsal warns and continues when it cannot compute a submodule diff, so changed migrations are replayed and gated against nothing.

`theme-conformance.yml` already got this right and wrote down why: *"the scanner would report a LOW count for missing apps — a false pass, which is worse than a failure. Check explicitly rather than trusting the number."* The pattern exists in the estate; it is just not applied uniformly.

## Wider context

This is the same class as the six silent-failure findings in the 2026-08-13 stabilisation directive §1: 288 consecutive pg_cron failures with zero signal, 1,856 fatal errors over 80 days, five consecutive failed audit runs, pgTAP green against a partially-migrated database, gitleaks scanning only the tip commit while being the only required check, and publish failing on every promotion. Detection is good in this estate. Signal is absent.

## The sweep

For every workflow in `.github/workflows/` across all repos, establish:

1. **Does it assert its inputs are present** before reporting a verdict? Submodules checked out, files found, database reachable, credentials available.
2. **Does it fail closed** when it cannot complete a check, or does it warn and continue?
3. **Has its failure path ever been exercised?** A gate never seen to fail is not a gate. `supabase-migration-rehearsal.yml` has a positive-control step for exactly this reason — it is the model.
4. **Is its threshold measured from the same tree it gates?** The bsuite#1963 defect.

## Deliverable

A table: workflow, has-input-assertion, fails-closed, failure-path-exercised, threshold-source. Plus the count that currently fail each column, and issues filed for the ones that need work.

Do not fix them in this issue. Enumerate first, then propose an order — several may share one fix.

## Acceptance criteria

- [ ] Every workflow file across bsuite, crm7, conduit, business-suite-unified, R80.4, braden, throughput enumerated
- [ ] Table produced with the four columns
- [ ] Counts reported per column
- [ ] Follow-up issues filed for gates that fail any column
- [ ] The enumeration method stated, so the denominator is checkable

Ref: operator directive 2026-08-13 §9, D-92. Instances: bsuite#1961, bsuite#1963, bsuite#1964. Related class: crm7#1617, crm7#1603, crm7#1506, crm7#1639, bsuite#1898, bsuite#1908.

## September 8 operator remediation clarification

The September 1–8 session audit repeats three coverage failures: searching only one history store missed VS Code Copilot; filenames/token patterns omitted real routes/dialogs; successful shallow tests were called complete while real workflows failed. Extend this existing gate-class issue rather than adding another gate with no consumer.

- [ ] Every census records scope, timestamp, source count, syntactic/route exclusions and an independent positive control. A zero result must fail or explain coverage, never certify absence automatically.
- [ ] Bind evidence to current commit, deployed SHA, role/tenant, exact entry route and tested side effect; invalidate stale greens after HEAD changes.
- [ ] Inject a broken writer, disconnected caller, schema mismatch and authorization failure: each relevant required gate must fail. Also prove the valid path still works so 'disable everything' cannot pass.
- [ ] Parent owns child failures and runtime verification; distinguish unavailable validation from defect absence. Gate results must create an actionable next step on the owning issue.
- [ ] Verify mandatory checks are truly required by live branch/ruleset settings and correctly wired in actual consumers; preserve existing branch-protection and migration-verification issue ownership.

Visual-authoring programme: https://github.com/GaryOcean428/bsuite/issues/3204
