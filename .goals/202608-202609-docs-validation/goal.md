# Goal: genuine-validation audit of every 202608*/202609* doc + registry, world-class customization bar

## Origin (operator's own words, verbatim)

> "/operator-intent-lock /ops-open-run /reason-fable This task requires thoroughness and
> judgement. go to the docs folder and the docs/plans/ folder find all 202608* and 202609*
> dated docs, the registries, indexes etc. and evaluate by genuine validation against the
> codebase. the most advanced version of anything is prefered in the event of conflicting
> specs. react flow, dnd kit, react grid, airtable, in page customization features. anythign
> that allows for customizaiton to be powerful, advanced, and highly intuitive within the
> least amount of clicks and would be considered world class production is the required
> standard. use the qig-memory mcp to introduce yourslef. catch up and refer your findings to
> the PI agent and also keep a local record for me to see."

## What (the goal)

Every `202608*`/`202609*`-dated document under `docs/` and `docs/plans/` (126 files measured
2026-09-04), plus the three registries/indexes the operator named — `docs/00-roadmap/
BSUITE-COMPONENT-REGISTRY.md`, `docs/00-roadmap/BSUITE-FEATURE-INDEX.md`,
`docs/00-roadmap/bsuite-component-registry.json` — gets a genuine-validation verdict: every
factual/completion claim it makes is checked against the live codebase (grep, read, or a
live command), never taken from the document's own checkboxes. Where two documents specify
conflicting approaches to the same capability (react-flow canvases, dnd-kit layouts, grid/
Airtable-class data surfaces, in-page customisation), the more advanced, more powerful, more
intuitive-in-fewest-clicks approach is named the winner and the loser is named for
consolidation or deletion — never left standing unaddressed.

## Acceptance criteria (measurable)

1. **Full-set index exists.** A single tracked file (`docs/00-roadmap/20260904-
   dated-doc-validation-ledger-v1.00W.md` or equivalent) lists all 126 dated docs by path,
   each with one of: `VALIDATED-CURRENT` (claims checked, hold), `VALIDATED-DRIFTED` (claims
   checked, code has since moved — state the drift), `SUPERSEDED` (a later doc/decision
   already replaced it — name which), `DUPLICATE-CLUSTER` (competes with N other docs on the
   same capability — name the winner per the "most advanced" rule), or `UNVERIFIABLE`
   (state exactly what would verify it). No row may be blank or "not yet reviewed" at
   completion.
2. **The three registries/indexes are opened and checked**, not just listed: do their
   counts/claims match a fresh run of `scripts/generate-component-registry.mjs --check` and
   the actual `grep`-measured state of the packages they describe? State drift with numbers,
   not adjectives.
3. **Customisation/world-class-bar claims are code-verified, not inherited.** For every
   claim that a builder/canvas/grid surface is "world class", "highest UX", or "fewest
   clicks", the actual component source is read and the specific gap (if any) named with a
   file:line, not asserted from a plan's own prose.
4. **Conflicts get a ruling, not a mention.** Every place two docs specify different designs
   for the same capability (page-authoring renderer, schema-relationship canvas, Airtable-
   class grid, dashboard/report view binding, permission model, branding hierarchy) gets one
   line: which wins, on what evidence, what the loser's document should say now (superseded
   pointer, not silent).
5. **PI handoff sent** summarizing the full ledger (not a subset), and **a local record**
   (this ledger doc) is left for the operator, matching what was delivered in the prior
   session's narrower pass (`docs/audits/20260904-customization-authoring-genuine-validation-
   v1.00W.md`) but covering the complete set, not ~4 of 126.
6. **No false completion.** A doc genuinely marked reviewed must show the command or file
   read that verified it. An Inspector finding a row with a verdict but no evidence trail is
   an automatic FAIL for that iteration.

## Scope boundaries

- **In scope:** reading and validating documents and registries against code; writing the
  ledger doc; writing to qig-memory and the PI inbox; consolidation *recommendations* (which
  spec wins, what should be deleted/merged).
- **Out of scope:** implementing any of the recommended code changes, deleting any file,
  running any migration, merging any PR. This is a validation/ruling pass, not an
  implementation pass — the PI and named owners take the recommendations from here.
- **Repos in scope:** the bsuite parent `docs/` and `docs/plans/` trees are the object of
  validation; cross-checks reach into crm7, business-suite-unified, conduit, braden, R80.4,
  throughput source as needed to verify a claim, but no submodule file is edited.
- **Git hygiene:** the working tree already carries unrelated uncommitted changes from other
  concurrent agent lanes (submodule pointers, registry regen). **Builder must never `git add
  -A`** — stage and commit only the specific ledger/goal files this task creates or edits.

## Discovered conventions (Phase 1)

- Commit convention: `type(scope): description` (Conventional Commits), scopes `bsu|crm7|
  conduit|braden|r80|throughput|shared|docs|deploy`. This goal's commits use scope `docs`.
- No `lint`/`test`/`preflight` target applies to a docs-only change; the closest quality gate
  is `node scripts/generate-component-registry.mjs --check` (relevant to acceptance #2) and
  the doc-gate scripts referenced in `docs/audits/20260903-week-in-review-…md` §4.5 (`Docs
  cite something checkable`, `Docs declare kind, authority and evidence`) — new/edited docs
  should carry `kind`/`authority`/`owner` front matter per that gate.
- Prior session already validated in depth (carry forward, do not re-litigate unless new
  evidence surfaces): `docs/20260903-visual-authoring-consolidation-decision-v1.00D.md`,
  `docs/audits/20260903-week-in-review-estate-audit-and-remediation-v1.00W.md`,
  `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`,
  `docs/20260821-airtable-class-data-surface-plan-v1.00F.md`. Findings and corrections are in
  `docs/audits/20260904-customization-authoring-genuine-validation-v1.00W.md` and qig-memory
  keys `bsuite_session_20260904_customization_audit` /
  `bsuite_session_20260904_customization_audit_redteam`.
- PI recipient for handoffs: `bsuite-pi` (qig-memory inbox, namespace `bsuite`). Prior
  handoff thread: `162db003-...` → `bed34e1c-...` (this agent's identity: `copilot-
  customization-audit`).

## Not yet reviewed (starting index — Builder iteration 1 must at minimum triage all of these

by name into the ledger, even where deep validation is deferred to a later iteration)

122 of 126 dated docs remain unvalidated at goal creation (4 covered in the prior session,
listed above). Builder's first job is `find docs docs/plans -iname "202608*" -o -iname
"202609*"` (plus the 3 named registries) to produce the authoritative list, then work through
it in priority order: (a) anything touching page-authoring/canvas/grid/customisation
(matches the operator's explicit bar), (b) registries/indexes, (c) everything else.

## Definition of done

Inspector confirms acceptance criteria 1–6 all hold, with the ledger doc as the artefact of
record, before status moves to `completed`.
