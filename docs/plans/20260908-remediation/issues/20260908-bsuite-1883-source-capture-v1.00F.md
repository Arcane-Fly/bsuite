---
kind: record
authority: none
owner: bsuite
---

# [P2][ci] No code-review bot is running on ANY pull request — Qodo is paused, Sourcery has no access

https://github.com/GaryOcean428/bsuite/issues/1883

Snapshot updatedAt: 2026-08-24T03:26:10Z. Open at capture; re-read live.

Checked across all seven PRs merged on 2026-08-10 (bsuite#1872/#1874, braden#375, crm7#1545/#1548/#1549, bsu#673).

**Not one of them was reviewed by a bot.**

| Bot | What it posted |
|---|---|
| `qodo-code-review` | *"Qodo reviews are paused for this user."* Needs a paid seat **and** the Git account linked in Qodo. |
| `sourcery-ai` | *"Your private repo does not have access to Sourcery."* |

What DOES run is project-owned and useful but is not code review: DOM Layout Invariants, the 9-signal drift scan, gitleaks, dry-lint, pgTAP, the SECURITY DEFINER guardrail.

**Why it matters:** every change merged today rested on its author testing its own work. That is exactly the arrangement this estate has repeatedly found insufficient.

**Operator action:** if Qodo is a paid subscription it is currently returning nothing — either link the Git account and restore the seat, or drop it and stop paying. Either is fine; the current state is the worst one.
