---
kind: standard
authority: operator
owner: bsuite
evidence:
  - AGENTS.md
  - scripts/close-merged-development-issues.mjs
  - scripts/issue-closure-eligibility.test.mjs
---

# BSuite work tracking — Linear authority and evidence boundaries

Status: Working, 24 September 2026. Migration is in progress under [BRA-46](https://linear.app/braden-pty-ltd/issue/BRA-46/centralize-bsuite-work-in-linear-and-retire-conflicting-tracking); this document does not certify import coverage, agent access or accepted completion.

The [BSuite — Delivery & Roadmap project](https://linear.app/braden-pty-ltd/project/bsuite-delivery-and-roadmap-806afbd51657) is the canonical human view of outcome scope, priority, accountable owner, next action, blockers and product lifecycle. Before acting on a row, reconcile its stable source IDs and acceptance criteria with the linked source. During migration, an absent Linear issue is an unresolved mapping, not permission to discard an existing obligation or create a duplicate. BRA-46 carries migration coverage and remaining gaps.

GitHub owns code, pull requests, CI and merge evidence. A `development` merge proves an implementation landed at a SHA; it does not prove deployment, a signed-in journey, production acceptance or Linear Done. Use `Refs #123` in ordinary PR bodies. The development-merge closer only closes a GitHub issue explicitly labelled `scope:implementation` after a repository collaborator posts an exact issue/PR/merge-SHA implementation receipt with an evidence link. A full product issue remains open for its acceptance owner. Do not enable Linear Issue Sync or automatic merge-to-Done while these boundaries are unproven. Historical GitHub closures remain dated evidence, not retroactive acceptance verdicts.

For a bounded implementation closure, the accepting reviewer posts this exact line in an issue comment after the merge, followed by an accessible evidence URL on its own line. The marker is a machine key; it is not an approval by itself. The reviewer must check the issue's stated scope and evidence before posting. The closer requires the `scope:implementation` label, exactly matching issue number, PR number and full merge SHA, plus GitHub `OWNER`, `MEMBER` or `COLLABORATOR` association from someone other than the PR author. Unlabelled, ambiguously labelled, stale or unreceipted issues remain open. Use a distinct product outcome issue for any remaining release or UX acceptance.

```text
<!-- bsuite-development-closure:v2 issue=123 pr=456 sha=0123456789abcdef0123456789abcdef01234567 scope=implementation -->
Evidence: https://github.com/Arcane-Fly/bsuite/pull/456
```

Version-controlled specifications, feature/component registries, source IDs and DoD inputs remain technical sources. Add Linear ID mappings to these registries as coverage is reconciled; do not turn them into a second human status queue. Dated plans, audits and notes retain provenance and may be cited without rewriting their historical verdicts. Existing local queue and checkpoint files retain dispatch ownership, leases, retry state, worktree and SHA identity. A Linear assignee never grants a write lease. Restore the active owner before changing a checkout or queue.

On meaningful scope, blocker, evidence or handover changes, update the linked Linear issue once with the next action and source/evidence links. The maker supplies implementation evidence; the independent verifier checks applicable DoD, UX, permission, persistence, reload and deployed SHA; the acceptance owner sets product Done only when the stated criteria pass. Missing evidence remains unverified. If Linear is unavailable, preserve the active checkpoint and record a bounded pending update for later reconciliation; do not claim that a remote write succeeded.

The alternative of copying every registry row, queue lease and historical comment into Linear was rejected because it would duplicate status writers, break existing consumers and bury the outcomes a person needs to find. The migration crosswalk, actual agent access, source coverage and closure receipts must be verified under BRA-46 before any source is retired.
