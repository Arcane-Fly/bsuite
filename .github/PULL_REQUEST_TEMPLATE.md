<!--
  BSuite pull-request template.

  Everything inside an HTML comment is invisible in the rendered PR and is
  ignored by the automation. Delete the guidance as you fill each section in,
  or leave it — it costs nothing.
-->

## What changed

<!-- One paragraph. What is different after this merges, in the operator's terms. -->

## Tracking references

<!--
  Use `Refs #123` and the Linear issue link for ordinary implementation work.
  A development merge does not establish full product acceptance. The closer
  needs a single `scope:implementation` issue label and a separate exact trusted
  acceptance receipt before it can close a bounded implementation issue. See
  AGENTS.md for the receipt format. Cross-repository references are reported,
  not automatically closed.
-->

Refs #

Linear issue:

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
