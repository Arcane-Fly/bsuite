---
kind: record
authority: none
owner: bsuite
---

# Shared machine git identity — lane attribution and session discipline

**Status:** Frozen (F)

Recorded 2026-09-19 while implementing [bsuite#3199](https://github.com/GaryOcean428/bsuite/issues/3199)
— the incident of 2026-09-08 in which a Hermes desktop orchestrator session worked inside the
PRIMARY crm7/BSU checkouts and direct-pushed `b8d2e232a` to crm7 `origin/development` outside
PR #2533 while that branch's checks were red. The incident's enabling condition (crm7/BSU
`development` branch protection and rulesets allowed direct push) was closed the same day by
PR-gating both `development` rulesets — see
[`docs/security/branch-protection/rulesets/README.md`](./branch-protection/rulesets/README.md)
for the dumps and the positive-control proof.

## The hazard

The machine git identity `GaryOcean428` (committer `braden.lang77@gmail.com`) is shared by
every agent lane on this host: Hermes, Claude Code, Codex, agy, Grok, Qwen, and the operator's
own shell. Attribution of any commit, merge or push by committer name is therefore impossible:
**"by GaryOcean428" never identifies a lane.** Two mutators writing one checkout under one
identity is the measured 2026-09-04 failure class, and on 2026-09-08 it pushed red checks onto
a shared branch, merged BSU#1199 un-gated, opened PRs (BSU#1200–1203, crm7#2571) on unfinished
heads, and armed auto-merge on crm7#2533.

## The attribution rule

Attribution of a commit/merge/push must come from, in order:

1. **The reflog of the checkout that made it** (`git reflog <branch>` in the specific working
   tree — the 2026-09-08 evidence was recovered exactly this way: crm7 primary reflog showed
   `development@{09:02:44}: branch: Reset to origin/development` then the merge commit). The
   reflog is local to the checkout, so it names the tree, not the person.
2. **The coordination registry** — the qig-memory API's `bsuite_agent_registry` plus each
   agent's `<agent-id>_active_work` record (schema and endpoints in the Inter-Agent
   Coordination & Memory Silo Protocol). A lane that is mutating must be registered there with
   its `scope_claimed`; an unregistered mutator is an incident in itself.

Committer name/email is not evidence of which lane acted and must never be cited as such.

## Session discipline (residual of ask 1 — standing rule)

While a takeover or live-lane lock is held in `bsuite_agent_registry` (or a `bsuite_lease_*`
key claims a checkout/package), **other host sessions must not mutate the primary checkouts**.
Coordination goes through the registry + leases; a lane that discovers an un-registered mutator
**stops and surfaces** rather than racing it. Read-only observation and inbox messages are
always permitted. Do not kill processes to enforce this — the 2026-09-08 named cron
(`854ef8e194ea`) was already read-only by its own STATUS, and process management is not this
record's mechanism.

## Related

- Incident and asks: [bsuite#3199](https://github.com/GaryOcean428/bsuite/issues/3199) ·
  source capture: `docs/plans/20260908-remediation/issues/20260908-bsuite-3199-source-capture-v1.00F.md`
- The PR-gate fix + dumps: `docs/security/branch-protection/rulesets/README.md`
- Sibling (not absorbed): bsuite#3141 — default-ruleset bypass narrowing, prod-weaker-than-dev sweep