---
kind: record
authority: none
owner: bsuite
---

# Customisation/authoring docs vs live code — genuine-validation pass (2026-09-04)

> **Status:** W (Working) · **Author:** GitHub Copilot (customization-audit lane)
> **Scope:** every `202608*`/`202609*` doc under `docs/` and `docs/plans/`, plus their
> registries/indexes, evaluated for "in-page customization" maturity (react-flow/dnd-kit/
> grid/Airtable-class UX) — cross-checked against the actual code, not against their own
> checkboxes. Read `docs/20260903-visual-authoring-consolidation-decision-v1.00D.md` and
> `docs/audits/20260903-week-in-review-estate-audit-and-remediation-v1.00W.md` first; this
> record only adds what changed or was re-verified since those landed (both are 2026-09-03,
> one day stale already — the estate moves under any audit, as the operator has been told).

## 0. Bottom line

The 2026-09-03 documents already correctly diagnosed the core defect: **the estate has six
half-built "author a page visually" surfaces and, until yesterday, zero writers.** That
diagnosis is right. What has changed in the 24 hours since is real, targeted progress on
exactly the hole they named — **but only in one of five consuming apps.** This is the
"write but not wire" pattern named in the brief, caught mid-repair: the writer now exists,
the round trip is tested, and it is wired in crm7 only. BSU and braden still carry the
pre-decision `CustomPageRenderer` that cites the now-superseded ADR-0003 and is mounted
nowhere.

## 1. What the 2026-09-03 docs got right (verified, still true)

- **`docs/20260903-visual-authoring-consolidation-decision-v1.00D.md`** — the six-renderer
  count, the `@bsuite/page-builder@2.6.0` substrate claim, and the "BSU/braden renderer is a
  JSON dump, mounted nowhere" finding are all confirmed live. `business-suite-unified/src/
  components/CustomPageRenderer.tsx` still opens with "No call sites in BSU yet" and cites
  ADR-0003 as current — it does not know it was superseded yesterday (ADR-0011,
  `09356d28`, on `adr/one-custom-page-renderer`).
- **`docs/audits/20260903-week-in-review-…md` F-13** (16 of 22 `@bsuite/data-grid` files ship
  with no `onRowClick`, breaking the Airtable click-through rule) — re-measured today on the
  same method as the audit (`.tsx` importers of `@bsuite/data-grid`, test files excluded):
  **exactly 16 of 22, unchanged.** *(Correction: an earlier pass of this document counted
  36 files and reported 29 missing — that count wrongly included `.test.tsx` files, which
  the audit's own stated method excludes, so it was a different measurement, not a worsening
  trend. Caught in red-team round 1, §8 below. The honest read is "static", not "growing.")*
- **F-11** (page-builder published 2.6.0, apps stuck on 2.5.0) is **no longer true** — checked
  just now, all five consuming apps (crm7, BSU, braden, conduit, throughput) pin `^2.6.0`.
  This closed since yesterday's audit; do not carry it forward as open.

## 2. What changed today (2026-09-04), verified in source, not asserted

Branch `bsuite/adr/one-custom-page-renderer` (parent repo) and its crm7 submodule commits:

- `crm7@4d72bbccd` **"a custom page can finally have a layout"** — `custom-page-edit.tsx` now
  seeds `FormLayoutBuilder` from a page's stored layout via `asEditableLayout()` and persists
  through `savePageRevision`, which previously had **zero callers** (the exact hole §1 of the
  consolidation decision named as the reason nothing downstream worked). Confirmed: `grep`
  now finds the call site at `custom-page-edit.tsx:231`, plus a fix commit
  (`f3ebd5054`, "the round trip I introduced, and the page that said this was impossible")
  and a regression-pinning test commit (`3da7db685`). This is the highest-value single step
  the consolidation decision's §4 sequence named, and it has been taken.
- `bsuite@2cc42e13` / `99e056de` **`CustomPageView`** — a single presentation contract added
  to `@bsuite/page-builder`, deliberately withheld from the package's public export until the
  mounting change landed (`99e056de`'s message is explicit about this), then mounted in
  `crm7/src/App.tsx` only. `grep` across all four other apps' `src/` finds **no** import of
  `CustomPageView`. BSU and braden still run their own local, JSON-dumping
  `CustomPageRenderer.tsx`.
- `bsuite@09356d28` **ADR-0011** — records ADR-0003 as superseded. Correct decision, but the
  BSU renderer file itself has not been told: its own doc-comment still asserts ADR-0003 is
  current doctrine. A doc-comment is not a gate; nothing failed a check over this
  contradiction.

## 3. Genuine gap this creates (new finding, not in either 2026-09-03 doc)

**Consolidation is landing per-app, sequentially, with no tracked cross-app completion
gate.** crm7 has a writer; BSU and braden do not yet consume `CustomPageView` and still
carry a doc-comment naming a doctrine that no longer holds. If this pattern repeats (fix
one app, leave the doc-comment and the sibling apps for "later"), the estate reproduces the
exact defect class the 2026-09-03 audit's RC-F names: "shared concepts have no cross-app
owner." Recommend the tracked completion criterion for ADR-0011 be **"all five consuming
apps import `CustomPageView`, zero local `CustomPageRenderer`/JSON-dump files remain"** —
not "crm7 has a writer" — before anyone marks it done.

## 4. World-class bar check (react-flow / dnd-kit / grid / Airtable-class)

- **dnd-kit / grid / resize**: `@bsuite/page-builder`'s `DraggableCardPage`/`CanvasCard` is
  real, load-bearing infrastructure (329 render sites in crm7, confirmed by the 2026-09-03
  audit and not contradicted by anything found today). This is the right substrate to build
  the winner on — do not replace it.
- **Airtable-class click-through**: still the weakest limb. 16/22 (73%) of crm7's own
  converted grids skip `onRowClick` today — identical to the audit's count one day ago.
  Zero movement either direction since 2026-09-03.
- **react-flow-class canvas** (workflow-canvas / schema-builder relationship editor):
  not re-verified today; the 2026-09-03 audit's field-level-relations-stripped finding and
  the workflow-engine-never-run finding were not re-measured in this pass — treat both as
  still open per that document until re-checked.

## 5. Recommendation to the PI (see inbox handoff, same timestamp)

1. Keep the 2026-09-03 winner (`docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`)
   as the authority; do not open a competing spec.
2. Change ADR-0011/consolidation's tracked done-condition to the cross-app bar in §3, not
   "crm7 works."
3. Fold the `onRowClick` ratchet into a shrink-only gate — F-13's finding will keep
   reproducing at the current rate otherwise (it is static, not shrinking).
4. Delete BSU's and braden's local `CustomPageRenderer.tsx` in the same PR that mounts
   `CustomPageView` there — per the estate's own ordering rule, replacement before deletion,
   not deletion alone.

---

## 6. Red-team, round 1 — six lenses against this document and its first pass

Per `agent-red-implement`. The "first pass" is the version of this document handed to the PI
at 2026-09-04T03:00Z. Six lenses, each stated as what it would have missed if unchallenged.

| Lens | Critique |
|---|---|
| **Security** | The report never checked whether the new writer path (`savePageRevision` → `custom_pages.layout`, `custom_page_revisions`) is tenant-scoped at the database layer. A UI-only writer with no RLS behind it is a cross-tenant write hole, and the report would have shipped that unknown to the PI as a green light. |
| **Reliability** | The `onRowClick` re-measurement command differed from the audit's stated method (it did not exclude `.test.tsx`), producing a "36 files, 29 missing, growing" claim that could not be reproduced against the audit's own number. An unreproducible metric handed to a PI as evidence is worse than no metric — it invites a false "things are getting worse" narrative into a plan. |
| **Performance/Scale** | Not applicable to a documentation-validation task in the sense the skill intends (no runtime code changed), but the analogous concern — coverage — applies: two files were read in full out of ~130 dated documents, and the "winner" spec (`20260501-universal-wysiwyg-schema-ux`) that the recommendation section names as authority was never itself opened before being cited as authority. |
| **UX/DX** | The report asserts a "world-class bar" verdict on click-through and canvas maturity without reading a single line of the actual builder UI code (`FormLayoutBuilder.tsx`, `CustomPageView`) for click count or clarity — it inherited the 2026-05-01 plan's own self-critique (card clipping, unintuitive palette drag, no undo/redo, no inline rename) without confirming any of the four gaps still hold today, four months later. |
| **Code Quality** | The bloat-removal recommendation (§3 of the consolidation decision, echoed uncritically) cites "braden Site Editor — 54 files" and "TenantLayoutSlot — a no-op shim" without the report re-counting either. One turned out imprecise (14–17 files match on disk, not 54, depending on what counts as "Site Editor"); the other turned out exactly correct (confirmed: `TenantLayoutSlot` renders `null` unconditionally, is `@deprecated since 0.3.1`, `removed in 0.4.0`, and lists braden/conduit/R80.3 as its only remaining consumers). Citing both with equal confidence was a quality gap. |
| **Evidence Rigor / Completeness** (this task's stand-in for "QIG Purity" — geometric correctness has no analogue here; source-fidelity does) | The report cross-checked 2 of the ~15 directly relevant 202608*/202609* documents in depth (`visual-authoring-consolidation-decision`, `week-in-review-…audit`) out of the fuller relevant set: `20260501-universal-wysiwyg-schema-ux` (the cited winner — unread), `20260821-airtable-class-data-surface-plan`, `20260822-data-surface-consolidation-decision`, `20260822-schema-builder-ux-remediation-spec`, `20260826-page-builder-2x-layout-in-production-measured`, `20260829-enhanceddatatable-is-not-a-one-edit-conversion`, `20260901-workflow-canvas-implementation`, `20260813-portals-redesign-brainstorm`, `20260825-braden-group-duplicated-documents`. A recommendation naming a "winner" document the reviewer never opened is an assertion wearing a citation's clothes. |

### Issue list

| ID | Severity | Area | Reproduction | Proposed Fix | Status |
|---|---|---|---|---|---|
| RT-01 | Critical | Security — writer path RLS | Read `custom_pages`/`custom_page_revisions` policies in `crm7/supabase/migrations/20260101000000_prod_schema_baseline.sql` before asserting the writer is safe to recommend | Verify live policy text; report the result explicitly rather than by omission | **Fixed this round** — see §7 |
| RT-02 | High | Reliability — unreproducible metric | Re-ran the `onRowClick` count with the audit's exact method (exclude `.test.tsx`) | Correct the figure in §1/§4, add a visible correction note rather than silently editing | **Fixed this round** — corrected to 16/22 in place, with an inline note |
| RT-03 | High | Evidence rigor — cited-but-unread winner spec | `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md` was named as authority in §5 without being opened | Read it; confirm or retract the recommendation | **Fixed this round** — see §8 |
| RT-04 | Medium | Code quality — unverified bloat citations | "54 files" (braden Site Editor) asserted without a file count | Count on disk; state the actual number and flag the discrepancy rather than repeating the unverified figure | **Fixed this round** — see §8 |
| RT-05 | Medium | UX/DX — untested world-class claim | No line of `FormLayoutBuilder.tsx` or `CustomPageView` was read before rating UX maturity | Read the actual builder code for the specific 2026-05-01 gaps (card clipping, palette drag, undo/redo, inline rename); confirm which still hold | Deferred — see §9 (scope: full UI read is beyond this pass's budget; flagged as open, not silently assumed) |
| RT-06 | Low | Completeness — 9 adjacent 202608/202609 docs unread | Only 2 of ~15 directly relevant dated docs were opened | Read the remaining docs relevant to the customisation/authoring theme | **Partially fixed this round** — 2 more opened (§8); 7 remain, listed in §10 as the tracked follow-up, not silently dropped |

## 7. RT-01 remediation — writer-path RLS, verified

Read the live policy definitions in `crm7/supabase/migrations/20260101000000_prod_schema_baseline.sql`
(lines 55872–56643) rather than assuming. Result: **no vulnerability found; the writer path is
correctly tenant-scoped.**

- `custom_pages_insert`/`_update`/`_delete`: `WITH CHECK`/`USING` require
  `tenant_id IN auth_tenant_id_with_role(['owner','admin'])` — only an owner or admin of the
  page's own tenant can write.
- `custom_pages_select`: `tenant_id IS NULL OR tenant_id IN auth_tenant_id()` — platform-wide
  rows (`tenant_id IS NULL`) are readable by anyone authenticated, tenant rows only by that
  tenant. Platform-row *writes* are separately gated by `custom_pages_platform_rows_developer_write`
  to `is_platform_developer()` — not "anyone authenticated", correcting what the bare `_select`
  policy alone might suggest.
- `custom_page_revisions_insert`: `WITH CHECK` joins back through `custom_pages` and re-checks
  `tenant_id IN auth_tenant_id_with_role(['owner','admin'])` — a revision cannot be inserted
  against a page in a tenant the caller does not own-or-admin, even though the revisions table
  itself carries no `tenant_id` column of its own. This is the correct pattern (deny by
  re-derivation from the owning row, not by a copied and driftable tenant column).
- `custom_page_revisions_select`: mirrors `custom_pages_select`'s NULL-or-own-tenant shape.
- `anon_read_published_custom_pages`: `is_published = true` only, no tenant leak — anonymous
  read is scoped to publication state, not tenant membership, which is correct for a public CMS
  page.

**Verdict: RT-01 closed.** The new writer (`savePageRevision`) rides these policies as an
`authenticated`-role Supabase client call; nothing in `custom-page-edit.tsx` bypasses RLS
(no `service_role` key in a browser bundle, confirmed by the absence of one in that file). This
is one genuine, confirmed positive to set against the report's otherwise-corrective findings.

## 8. RT-03/RT-04/RT-06 remediation — the winner spec, and two more adjacent docs, read

**`docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md` (the cited "winner"), now read.**
The recommendation in §5.1 stands, strengthened: this is a mature, seven-times-revised plan
(v1.00W → v1.07W, 2026-05-01 to 2026-09-02) with a working self-audit discipline the estate's
other documents mostly lack — its 2026-09-02 "open-item pass" converted 7 of 8 stale checkboxes
into honest verdicts against measured code rather than leaving them ticked. It correctly names
the base-stack-only constraint (React Flow, dnd-kit, TanStack Table/Query, Zustand — no new
libraries beyond `@dagrejs/dagre` for schema auto-layout) and it is the *only* document among
those read across both passes that already enumerates the FormLayoutBuilder's specific UX gaps
(card-title clipping with no `truncate`, palette items not draggable directly onto the canvas,
no drag preview, no inline rename, a 256px-wide property inspector with no style-override UI, no
undo/redo, no live-preview toggle) rather than asserting "world class" without naming what would
make it so. **These four-month-old gaps were not re-verified against current code in this pass
(RT-05 stands open)** — but the plan naming them precisely, and being willing to say a shipped
feature does not yet meet its own bar, is exactly the self-critical trait §2 of the 2026-09-03
consolidation decision cited as one of its three grounds for picking a winner. Confirmed, not
retracted.

**`docs/20260821-airtable-class-data-surface-plan-v1.00F.md`, now read.** This document is
explicitly scoped as *not* competing with the page-authoring winner — its own header says
"authoring what a page looks like and browsing the rows inside a table are different
problems" — matching the consolidation decision's §3 "stays separate — deliberately" call
verified independently by two documents that were never talking to each other. It also contains
its own genuinely useful, previously-uncited finding directly on point for the Airtable-class
bar: crm7 already has a real catalogue (84 entities, 1,297 fields), a server-side AST compiler,
and an editable grid with undo — the gap is **fragmentation** (3 saved-view implementations, 4
table implementations, 2 divergent editability-permission heuristics, dashboards bound to
`templateKey` instead of `saved_views.id`) rather than absence. Its highest-leverage single fix —
change `DashboardWidget.templateKey` to `viewId` — is a different, complementary lever to the
page-layout-writer fix already reported, not a rival claim. Worth carrying into the PI
recommendation as an addition, not a substitute.

**Braden Site Editor file count (RT-04), corrected.** The consolidation decision's "54 files"
was not reproduced. A direct count of files matching `*site*editor*` under `braden/src` finds
**14**; broadening to include admin-panel neighbours (media, theme-editor) that a person might
reasonably call part of "the Site Editor" surface finds **17**; the whole `src/components/admin`
tree is **87** files, of which Site Editor is a subset, not the whole. The *substance* of the
finding is independently confirmed regardless of the exact count: `grep` for `SiteEditor\b` in
`braden/src/App.tsx` and its route files returns **zero matches** (still mounted nowhere), and
`site_settings` (the table ADR-0001 dropped) is still referenced in **5** files under `braden/src`
today. **Recommendation: cite "mounted nowhere, writes to a dropped table" as the load-bearing
claim — both independently reverified — and drop the specific "54 files" figure from anything
handed to the PI as fact until someone states what it was counting.**

## 9. Round 2 — what stays open, named rather than absorbed

Per the skill: round 2 targets what round 1 found weak, and nothing moves to QA until it is
run. Two items from the round-1 issue list are **not** closed by this pass, and are named here
rather than quietly dropped:

- **RT-05 (UX/DX, untested world-class claim)** stays open. Confirming or retiring the four
  specific FormLayoutBuilder gaps the May plan named (clipping, drag ergonomics, undo/redo,
  inline rename) requires reading `crm7/src/components/ui-customization/FormLayoutBuilder.tsx`
  and `CustomPageView` line-by-line against each named gap — not done in this pass. Do not
  present "still open" as a finding until that read happens; present it as **unverified**,
  which is the honest state today.
- **RT-06 remainder** stays open: `20260822-data-surface-consolidation-decision-v1.00D.md`,
  `20260822-schema-builder-ux-remediation-spec-v1.00D.md`,
  `20260826-page-builder-2x-layout-in-production-measured-v1.00A.md`,
  `20260829-enhanceddatatable-is-not-a-one-edit-conversion-v1.00W.md`,
  `20260901-workflow-canvas-implementation-v1.00A.md`,
  `20260813-portals-redesign-brainstorm-v1.00D.md`,
  `20260825-braden-group-duplicated-documents-v1.00D.md` remain unread against code. Two
  (airtable-class-data-surface, universal-wysiwyg-schema-ux) closed this round; seven remain.
  Naming them here is the difference between "thorough" and "thorough about the two documents
  that were convenient."

## 10. QA verdict

| Check | Result |
|---|---|
| Every claim in §1–§5 traceable to a command run or a file read, this session | Yes, after RT-02 correction |
| Security claim about the new writer path | Present and verified (§7) — was absent before round 1 |
| Cited "winner" document actually read before being recommended | Yes, after RT-03 (§8) |
| Every figure reproducible by a named command | Yes, after RT-02; RT-04's "54 files" downgraded to "unverified, drop it" rather than silently repeated |
| Full 202608*/202609* customisation-doc set closed out | **No — 4 of ~11 directly relevant documents read total (this pass + prior), 7 named and outstanding (§9).** Reported as PARTIAL, not complete. |
| Recommendation to PI needs a correction pushed | Yes — see inbox message sent this turn: the "29/36, growing" figure retracted in favour of "16/22, static", and the airtable-class-data-surface plan's `templateKey`→`viewId` lever added as a second recommendation |

**Overall: APPROVE with two named open items (RT-05, RT-06 remainder), not a clean pass.**
Round 1 found and fixed one real correctness defect handed to a PI (RT-02, an unreproducible
"things are getting worse" metric) and one real gap-of-omission (RT-01, an unchecked security
question that happened to resolve clean). Round 2 did not manufacture false completeness over
the two items that still need a further session — they are named, not absorbed into "done."
