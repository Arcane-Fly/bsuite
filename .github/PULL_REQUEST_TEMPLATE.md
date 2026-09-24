<!--
  BSuite pull-request template.

  Everything inside an HTML comment is invisible in the rendered PR and is
  ignored by the automation. Delete the guidance as you fill each section in,
  or leave it — it costs nothing.
-->

## What changed

<!-- One paragraph. What is different after this merges, in the operator's terms. -->

## Closing issues

<!--
  Use `Refs #123` for the GitHub implementation link and add the Linear outcome
  URL. A development merge is not full product acceptance.

  Why this section exists: GitHub only auto-closes an issue when a pull request
  merges into the repository's DEFAULT branch. Every repository in this estate
  defaults to `main`, and every pull request targets `development`. So until
  2026-08-17, every `Closes #N` ever written here did NOTHING, and fifteen
  issues sat fixed-and-open because their authors reasonably believed otherwise.

  `.github/workflows/development-merge-issue-closer.yml` parses a closing keyword
  on a `development` merge, but only closes an issue labelled `scope:implementation`
  with a trusted acceptance receipt for the exact issue, PR and merge SHA.
  See `docs/20260924-linear-work-tracking-v1.00W.md` for the receipt contract.
  Full product outcomes remain open until deployed and accepted by their owner.

  WHAT IT HONOURS — the same rule GitHub uses:
    Closes #123 · Fixes #123 · Resolves #123   (also closed/fixed/resolved,
    `Closes: #123`, `GH-123`, a full issue URL, and runs: `Fixes #3, #4 and #5`)
  The keyword must be immediately followed by the reference. "Closes the loop on
  #123" is prose, not a directive, here and on GitHub alike.

  WHAT IT DELIBERATELY IGNORES, so review chatter cannot close live work:
    - a keyword inside a blockquote  (> Closes #99)
    - a keyword in a checklist item  (- [ ] Closes #99)
    - a keyword in a code fence, an inline `code span`, or an HTML comment
    - a negated keyword              (this does not close #99)

  CROSS-REPOSITORY references (`GaryOcean428/crm7#123`) are REPORTED, never
  closed — a merge here is not authority to mutate another repository. Close
  those by hand and say so below.
-->

Refs #

Linear outcome:

## Evidence

<!--
  Required. "Done" is the command you ran plus its output — never a code-trace.
  Anything user-facing needs a live check on the `d.*` domain.
  See AGENTS.md and docs/20260507-ff-self-validation-doctrine-v1.00W.md.
-->

## Risk

<!--
  Delete the lines that do not apply.
  - Migration: version, whether it is above MIGRATION_FLOOR, rollback plan.
  - Shared package (@bsuite/*): which apps consume it, version bumped.
  - Auth / RLS: which rows change visibility, and for whom.
  - None — internal only.
-->

---

<!--
  Before you request review:
  - branch is off `development`, and this PR targets `development` (never `main`)
  - commits are GPG-signed — `git log --format='%h %G?' -1` prints `G`.
    Unsigned commits make Vercel silently cancel the deploy.
  - docs updated in THIS PR, not a follow-up
-->
