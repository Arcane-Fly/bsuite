---
kind: record
authority: none
owner: bsuite
---

# [EPIC] Operator directive 2026-08-13 — notes backlog remediation (D-59 to D-92)

https://github.com/GaryOcean428/bsuite/issues/1967

Snapshot updatedAt: 2026-08-17T04:59:19Z. Open at capture; re-read live.

Tracking issue for the operator directive of 2026-08-13, derived from `bsuite_notes.docx` (four dated sections, ~90 observed defects) plus six workflow-review findings.

## Coverage verdict that prompted this

| | Count |
|---|---|
| crm7 issues **closed** since 9 August | 15 |
| crm7 issues **filed** in the same window | ~130 |
| Notes-document defects **closed** | ~8 |
| Notes-document defects **filed and still open** | ~14 |
| Notes-document defects **never filed at all** | **~40** |
| R80.4 open issues, total, in the entire repo | **3** |

**Filing is not addressing.** From here, "addressed" means closed with §9 evidence, and status reports must use the word that way (D-59).

**The unfiled forty are the worse half** (D-60). Verified absent from every repo's issue list: the platform-wide card/drag-drop defect, the entire R8 regression cluster, the portal-invitation gap, cross-host supervisor exposure, platform-scope leakage, TGA training-provider scope, funding-claim mechanics, and the ADMS/RAMS question.

## Standing constraints

- **D-61** — this directive supersedes the D-34 filing freeze for its own contents. Filing the §5 set is required work.
- **D-62** — **fix the class, not the page.** Operator: *"These issues are persistent across the app and have been flagged to be fixed across the full app many times. Typically the fixing agent fixes that page I've pointed to but I have always said it is a platform wide consideration."* A PR that fixes only the named URL is a failed PR. Every §4 fix must state how many surfaces it covers and how the rest were enumerated.
- **D-63** — **regressions outrank new work.** Anything marked *was working before* is a refactor or repo-move regression. Restore lost behaviour first.

## Filed so far

| Directive | Issue | Priority |
|---|---|---|
| D-64 — MAPD proxy credentials rendered in the UI | R80.4#37 | P0 |
| D-65 — cross-host supervisor exposure on placements | crm7#1675 | P0 |
| D-66 — platform scope visible to enterprise tenants (3 surfaces + sweep) | bsuite#1960 | P0 |
| D-86 — rehearsal has no submodule-presence assertion | bsuite#1961 | P1 |
| D-87 — theme baseline committed from the wrong tree | bsuite#1963 | P1 |
| D-88 — rehearsal fails open on undiffable pointers | bsuite#1964 | P1 |
| D-89/90/91 — three workflow hardening items | bsuite#1965 | P2 |
| D-92 — sweep every CI gate for the same defect | bsuite#1966 | P2 |

## Still to file

- **§3 — the R8 regression cluster** (D-67 through D-73). Largest block in the notes, almost entirely unfiled. R80.4 carries three open issues for a calculator whose core outputs are wrong: $29.54 regardless of award, fixed year-wages regardless of award, allowances always Building and Construction, allowance percentages all 100% when the API supplies real ones, MA000036 showing MA000020's trades and clauses. Most of these **worked before the move into submodules**.
- **§4 — platform-wide surface defects** (D-74 through D-79): shared backing cards defeating drag-and-drop, card resize regression, cards cut off on load, edit-in-place lost, theme violations across all apps, Airtable-style reporting still absent.
- **§5 — the thirty** (D-80): enumerated in the directive, grouped by owning app.
- **§6 — portals** (D-81, D-82): redesign, not repair. Brainstorm first, no code until the operator has read it.

## Blocked on the operator

- **D-83** — the 21 frozen placements. Ruled: proceed with the nine NULL-status rows (8 FutureBuild + 1 Braden Group) as `manual`, dry run first, output for review before commit. Do **not** touch the twelve `unresolved` rows in bsuite Platform. Do **not** drop the constraint.
- **D-84** — documents. Users must not have to know code; markdown is too much. `/documents/collaborative` goes per RULING 5.2. Needed instead: upload a Word document, edit it, insert merge fields. Deep read of existing specs before any code.

## Reporting

**D-85** — report per item: closed with evidence, open with an owner and a date, or not started with a reason. Do not report a filed issue as an addressed defect. If an item is already fixed and the operator missed it, say so and link the evidence.

Source document: `bsuite_notes.docx`. Directive: `20260813-operator-directive-notes-backlog-remediation-v1.00D.md`.
