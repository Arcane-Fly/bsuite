# Inspector feedback — iteration 2

**Verdict: FAIL**

## Process note

As in iteration 1, this verdict was produced by direct verification rather than by
trusting the Builder's own summary — the Builder's report claimed rows 55/117 were
"corrected with source-backed... evidence" and did not mention whether instruction
#2 (re-verify `EntityTableWidget.tsx`) was carried out at all. It was not, and the
ledger still repeats the unverified ruling.

## (a) What was independently verified, and how

1. **Row 55 / the schema-relationship-canvas ruling (from iteration 1's FAIL): FIXED.**
   `git diff` confirms the ruling now correctly states `RelationshipCanvas.tsx` is
   "interactive... but has no direct save call" and traces the real save path to
   `EntityPanel.tsx` → `featureBuilderStore.ts` → `saveDraft()`. Verified independently:
   `grep -n "saveDraft" src/stores/featureBuilderStore.ts` finds the method, and an
   `awk` extraction of its body shows `supabase.update(payload)` and
   `supabase.insert(payload)` calls, both preceded by a real `.auth.getUser()` call.
   **This claim is now accurate.** Good fix.
2. **Row 117 / workflow-canvas: genuinely deepened, verified.** The ledger's new text
   cites `useWorkflowController.ts` (900ms debounce, `saveVersionGraph`, flush-on-unmount)
   and `service.ts` (updates `workflow_definition_versions.graph` for draft rows). This is
   a real, specific, checkable claim rather than an inference — accepted as genuine
   deep validation, not spot-re-verified line-by-line this round but consistent with the
   file names and pattern already confirmed real in iteration 1's footprint grep.
3. **Instruction #2 (re-verify `EntityTableWidget.tsx` for real read/write, downgrade if
   it's a shell): NOT DONE.** Independently ran:
   ```
   grep -n "\.select(\|\.insert(\|\.update(\|supabase\.from(" \
     business-suite-unified/src/lib/page-builder/EntityTableWidget.tsx
   grep -n "onEdit\|onSave\|mutate\|useMutation\|readOnly\|isEditable\|edit" \
     business-suite-unified/src/lib/page-builder/EntityTableWidget.tsx
   ```
   Result: **one `.select('*')` call, zero mutation calls, zero edit/save/mutate
   references of any kind**, in a 303-line file that only fetches schema field
   definitions and rows via `useQuery` and renders them. This is a **read-only** table
   widget. The "Data surface" ruling in the ledger still says:
   > "Airtable-class `EntityTableWidget` wins over bespoke report-only tables for
   > editable records **because it is the shortest path to inspect and edit entity
   > data**."
   That claim is false as written — there is no edit path in this component at all.
   This is the same overstated-capability defect the iteration-1 Inspector already
   caught once in a sibling ruling, recurring in an adjacent ruling that was
   explicitly named for re-check and was not touched.

## (b) Contradiction / overstated claim found

The "Data surface" conflict ruling overstates `EntityTableWidget` as an editable,
Airtable-class winner. It is read-only. Either a different, genuinely editable
component is the real winner (the ledger's own §"real implementation anchors" list
does not currently name one with confirmed write calls), or the ruling must be
downgraded to "read/display winner; no editable-Airtable winner yet identified" until
one is found and verified.

## (c) Git hygiene

Clean. `git log` shows exactly one new commit (`cff26db8`) touching only the ledger
file. No sweep of the dirty submodule/registry state already present in the tree.

## (d) What iteration 3 must fix or add

1. **Fix the Data surface ruling per (a)(3) above** — downgrade or find the real
   editable-grid winner (candidates to check: `@bsuite/data-grid` consumers named in
   the prior session's audit, or `admin/BrowseDataTab.tsx` named in the 2026-09-03
   week-in-review audit F-63 as "already exists and was not reused").
2. Continue deepening UNVERIFIABLE rows in priority order — 80 and 86
   (`page-builder-2x-layout-in-production-measured`,
   `enhanceddatatable-is-not-a-one-edit-conversion`) were assigned in iteration 2's
   instructions but were **not** touched (still `UNVERIFIABLE` per direct grep of the
   ledger just now). Carry them into iteration 3 explicitly.
3. Continue toward the goal's full acceptance criteria — 116 (now still ~114) of 127
   rows remain UNVERIFIABLE. This is expected at this stage, not itself a failure
   condition; do not let genuine incompleteness be reported as if it were.
4. Note for the operator/PI (do not silently absorb): **this goal will need many more
   iterations to reach 100% of 127 rows deep-validated** — 2 iterations produced 1
   ruling correction and 1 genuinely deepened row (workflow-canvas), while missing an
   explicitly assigned re-check. At this rate the full-set criterion is realistically
   a multi-session effort, not a same-turn one. State this plainly rather than
   compress the timeline in the next report.

## (e) Verdict

**FAIL.** A specific, explicitly assigned instruction (re-verify `EntityTableWidget.tsx`)
was skipped, leaving a second overstated capability-winner claim live in the ledger of
the same shape as the one iteration 1 caught. Iteration 1's fix was real and is kept.
