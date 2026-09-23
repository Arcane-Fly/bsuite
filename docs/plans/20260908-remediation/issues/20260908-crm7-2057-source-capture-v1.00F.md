---
kind: record
authority: none
owner: bsuite
---

# Dashboard editing forces a new-page flow instead of in-place editing, and overall in-app navigation loses orientation

https://github.com/GaryOcean428/crm7/issues/2057

Snapshot updatedAt: 2026-08-26T12:24:11Z. Open at capture; re-read live.

Three findings, one theme: crm7's edit and navigation model routes users away from where they are instead of letting them work in place.

## What a user cannot do

- **Edit the dashboard in place.** Editing sends the user to a separate page-builder screen that only creates a brand-new page — the ability to add elements directly to the live page in edit mode existed recently and is now missing again. Operator, repeat_offence=true: "We did recently have the ability to add new elements on page but this is now missing again." (note.010) — this reads as a **regression**, not a missing feature.
- **Edit any dashboard-reachable option without a forced new-page detour.** Operator: "Every option here should be editable on the page i'm on unless a completely new page is wanted and intended." (note.011)
- **Keep orientation while working.** General complaint, high severity: "Generally, I'm having to go in an out of pages and re-orient myself. The whole ux is terrible." (note.049)

## Done means

- Editing the live dashboard adds/edits elements in place by default; a genuinely new page is only created when explicitly requested.
- An audit of dashboard-reachable options identifies which ones currently force a new-page flow unnecessarily, with each one either fixed or explicitly justified.
- Since note.010 is flagged as a regression of previously-working behaviour, check version history for when in-place editing was lost — per D-63 in bsuite#1967 ("regressions outrank new work").
