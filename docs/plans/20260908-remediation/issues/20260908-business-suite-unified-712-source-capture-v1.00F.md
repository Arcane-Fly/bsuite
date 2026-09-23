---
kind: record
authority: none
owner: bsuite
---

# /developer/tables needs the treatment described in the operator's notes (bsuite_notes.docx) — not yet scoped

https://github.com/GaryOcean428/business-suite-unified/issues/712

Snapshot updatedAt: 2026-08-24T03:27:44Z. Open at capture; re-read live.

The operator flagged that `/developer/tables` needs a specific treatment described in the operator's own notes, which has not yet been implemented or even scoped in the codebase.

**Route/surface:** `/developer/tables` (business-suite-unified Developer Portal)

Directive: D-80 (2026-08-13)

**Scoping note:** The specific required treatment for this surface is described in the operator's `bsuite_notes.docx` and must be read before scoping or implementing a fix — this issue does not attempt to restate it. Do not guess at the requirement from the route name alone.

## Acceptance criteria
- The operator's `bsuite_notes.docx` has been located and read, and its `/developer/tables` requirement is transcribed into this issue (or a linked follow-up) as concrete, actionable scope
- The treatment described is implemented on `/developer/tables` and matches what the notes specify
- No other Developer Portal tab is affected by the change

## Mandatory before merge
- **Validation loop:** §9.2 visual-equivalence — once scoped from the notes, before/after screenshots of `/developer/tables` against the notes' description
- **Equivalence target:** `/developer/tables` matches the specific treatment described in `bsuite_notes.docx` (undefined until that file is read)
- **Cross red-team:** bsuite-platform
- **Skills to load:** bsuite-developer-portal, supabase:supabase

---
*Filed under operator directive D-80 (2026-08-13). Filing is not addressing (D-59) — no fix is implied or claimed by this issue.*
