---
kind: record
authority: none
owner: bsuite
---

# Documentation pages have no screenshots — all 7 role manuals need visual walkthroughs

https://github.com/GaryOcean428/business-suite-unified/issues/711

Snapshot updatedAt: 2026-08-27T07:20:33Z. Open at capture; re-read live.

The operator observed that the documentation pages need screenshots — none currently have them. This applies across the board, not to a single page.

**Route/surface:** `/docs` and `/docs/:manualId` (business-suite-unified), rendered by `src/pages/Docs.tsx` from the manual content model in `src/lib/manuals`

Directive: D-80 (2026-08-13)

> D-62: "Fix the class, not the page."

This affects 7 surfaces: the manual registry (`business-suite-unified/src/lib/manuals/registry.ts`) defines exactly 7 role manuals, each rendered at its own `/docs/:manualId` route — developer, enterprise-admin, org-admin, field-officer, employee, host-client, and payroll-finance. The fix must address the class of defect (a documentation-rendering gap affecting screenshots across the whole manual system), not only a single manual or section.

## Acceptance criteria
- Every one of the 7 manuals has at least one relevant screenshot embedded per major section describing a UI flow (not just prose)
- Screenshots are current against the live UI at time of merge, not stale/pre-redesign captures
- A documented process exists (or is established) for keeping screenshots in sync as the UI changes, so this doesn't silently go stale again

## Mandatory before merge
- **Validation loop:** §9.2 visual-equivalence — each embedded screenshot must be compared against the live page it documents
- **Equivalence target:** every screenshot in every manual matches the current live UI it claims to depict
- **Cross red-team:** bsuite-user-advocate
- **Skills to load:** general-user-manual-program, test-playwright, bsuite-user-manuals-nav

---
*Filed under operator directive D-80 (2026-08-13). Filing is not addressing (D-59) — no fix is implied or claimed by this issue.*
