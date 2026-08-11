# crm7 deep-audit remediation — decision record

**Date:** 2026-08-10, updated 2026-08-11 · **Status:** W (working) · **Lane:** claude-code
**Merged:** [crm7#1592](https://github.com/GaryOcean428/crm7/pull/1592) · [bsuite#1888](https://github.com/GaryOcean428/bsuite/pull/1888) · [braden#376](https://github.com/GaryOcean428/braden/pull/376) · [throughput#271](https://github.com/GaryOcean428/throughput/pull/271)
**Closed:** crm7 #1578, #1579, #1581, #1582, #1583, #1584 — all six, verified live
**Filed:** crm7 #1595, #1597, #1598 · bsuite #1889

This is the decision half of the work. The code is in the PRs; what follows is
what was decided, what the audit got wrong, and what is still open — the things
a diff cannot tell you.

---

## 0. Operator ruling, 2026-08-11 — Google Docs IS intended

**crm7#1595 asked the one question the code could not answer**, and Braden has
answered it: the Google Docs document-generation integration **is** the intended
product direction.

So the fix is **expand, not retire**. The `generate-document` edge function stays;
the missing columns get an `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migration
(never `CREATE TABLE IF NOT EXISTS` — that guard is the entire cause); and the
templates UI stripped in #1592 is restored, now backed by columns that exist.

Consequences that follow and should not be re-litigated:

- Design authority is `docs/recovered/20260317-document-esigning-architecture-v1.00A.md`
  (status **A**, Approved). Templates carry `{{VARIABLE_NAME}}` tokens; the edge
  function does a Drive copy → `batchUpdate` replaceAllText → PDF export → Storage.
- **Adobe is removed.** `adobe_agreement_id` / `adobe_agreement_status` are legacy
  and must not be reintroduced.
- Google auth is **WIF only**; static service-account keys stay banned.
- That architecture doc's illustrative DDL uses column names
  (`unsigned_file_path`, `signer_name`, …) that do **not** match the live table.
  **Live schema + the edge function's actual insert are authoritative for names;
  the doc is authoritative for the design.** Anyone reading the doc alone will
  build the wrong columns.

Until that migration applies, document generation remains non-functional in
production — it returns 422 for every template and always has.

---

## 1. The six issues, and what each actually turned out to be

| # | As filed | As found |
|---|---|---|
| **1578** P1 | 6 compliance pages linked but unrouted | Correct, and **under-counted**: two `/create` deep-links were also live with no page component behind them |
| **1579** P2 | 23 of 24 ignore entries stale; palette regex misses chromatic hues | Correct, and **understated**: **all 24** were stale, and the same regex hole existed in **six copies** of the rule including the source of truth |
| **1581** P2 | "Log Interaction" fires a success toast doing nothing | Exactly as described |
| **1582** P3 | 3 files bypassed `set-state-in-effect` via the namespace form | **1 of 3** was a real violation; the premise held for one file, not three |
| **1583** P2 | `EnhancedDataTable` lacks `aria-sort` | Exactly as described |
| **1584** P3 | 3 orphan pages need a ruling | Correct; two were finished features missing only a router line |

The audit was accurate on the two headline bugs and honest about its own limits.
Where it was wrong, it was **conservative** — it under-claimed rather than
over-claimed, which is the right direction for an audit to err.

---

## 2. Rulings made

### 2.1 The six compliance pages get routed, not delinked

They are 292–550 line pages with live Supabase reads, one with its own test
suite. Not shells. Issue #1578 offered "route them, or remove the links where a
page isn't ready" — nothing here was unready.

**`/create` deep-links.** `field-officer.tsx` and `host-employer.tsx` navigate
straight to `/compliance/whs-audits/create` and
`/compliance/lln-assessments/create`. No create page component exists for
either, so adding index routes alone would have left five portal quick-actions
still landing on the 404 — a fix that looks complete and isn't. Both pages
already own a create dialog, so those paths render the same page with the dialog
opened, and `host-employer`'s `?host_employer_id=` is threaded into the audit
form rather than silently dropped.

**Permission: `view_compliance`, matching the index route.** Not because
read-only users should create compliance records — they should not — but
because the in-page "New" button these deep-links stand in for is itself
ungated. A stricter gate on the deep-link would have denied a path the UI
already offers one click later. The underlying gap is **crm7#1597**, filed
rather than silently changed, because changing an authorisation model inside a
routing fix is how permissions drift.

### 2.2 All 24 colour exemptions retired, not 21

The issue proposed keeping three. Measured under the **widened** rule
(the audit's "23 stale" was measured under the old one, so it did not carry):
all 24 lint clean. Three of them are PDF renderers the rule already self-exempts
at runtime, so they never needed a list entry at all.

Positive-controlled by injecting `#ff0000` into `tagColors.ts` and confirming
the rule fired — "clean" here means measured, not silently skipped.

**No file goes back on that list.** The escape hatch is now `theme-audit-ok` /
`REACT-PDF-EXEMPT` / `BRADEN-EXEMPT`, line-local, where the justification sits
next to the code. A 24-entry list that outlived its rationale by months is what
happens when the reason lives somewhere else.

### 2.3 Orphan pages: one deleted, two routed

- **`not-found.tsx` — DELETED.** Not a feature. 21 lines of scaffold whose copy
  reads *"Did you forget to add the page to the router?"* — developer text
  shown to a customer. The inline 404 that supersedes it is strictly better:
  user-facing wording, a Return-to-Dashboard recovery link, focus ring,
  aria-label. Routing this one would have replaced a good 404 with a worse one.
  Zero user-facing capability removed, which is why this did not need the
  feature-protection escalation the other two would have.
- **`leads/scoring.tsx` — ROUTED** at `/leads/scoring`. 326 lines, reads the
  real lead store. Registered **above** `/leads/:id`, or the param route
  swallows "scoring".
- **`compliance/avetmiss` — ROUTED** at `/compliance/avetmiss`. 398 lines, reads
  `avetmiss_exports`, calls the `avetmiss-export` edge function. **AVETMISS
  annual NAT-file lodgement is a statutory GTO obligation** and the capability
  was sitting unreachable. Its own docstring named the route it never had.

Deleting was the exception, not the pattern. Two of three were finished features
that lacked a line in the router.

### 2.4 The table-convergence question the audit escalated

The audit asked for a ruling on `uplift/DataTable` (17 importers, more capable)
vs `EnhancedDataTable` (95 importers, canonical) and recommended porting
features into Enhanced rather than migrating 95 call sites.

**Ruled: adopt that recommendation.** #1583's `aria-sort` port is the first
increment and it is done. `uplift`'s CSV/PDF export and inline editing are the
remaining two. Migrating 95 call sites to a 17-importer component to gain three
features is the wrong trade.

The audit's other two escalations dissolve on the evidence and need no ruling:
`@bsuite/data-grid` vs TanStack do not overlap (5 vs 40 importers, disjoint use
— data-grid serves only the schema browser), and `@bsuite/ui` vs local `ui/` do
not compete (4 non-overlapping imports). Both were confirmed; forcing either
consolidation would be churn.

---

## 3. Three defects the audit did not find

Found while fixing the six, not by looking for them.

### 3.1 `document_templates` crashed the page it backed — and the modal

`src/types/documents.ts` declared `DocumentTemplate` by hand with six columns
production does not have. `templates/index.tsx` dereferenced
`.merge_variables.length`, so the page **white-screened for any tenant with one
active template**. `GenerateDocumentModal` did the same on `.signing_config` and
is reached from several entity-detail pages, so the blast radius was wider than
the page that looked orphaned.

**Cause:** `20260304000001_document_lifecycle.sql` declares
`CREATE TABLE IF NOT EXISTS document_templates (...)` with the Google-Docs
shape, but the table already existed from `20260228140000_create_communications.sql`.
The guard made the whole statement a **silent no-op**. The migration is recorded
as applied and added nothing.

This is the sharpest instance yet of a lesson already on the books: *a recorded
migration is not an applied one.* `schema_migrations` proves the ledger was
written. It cannot distinguish a statement that ran from one that was skipped.

### 3.2 The same drift in `document_records` — filed as crm7#1595, P1

Identical cause, second table. Consequence: `generate-document` gates on
`if (!template.google_doc_id)` and returns 422 for **every** template, so
**document generation is non-functional in production today** — failing
gracefully enough that nothing surfaced it. `/documents/hub` renders
"Invalid Date".

Not fixed here, because the fix depends on a product decision nobody has made:
is the Google-Docs integration intended (write the expand migration) or not
(retire the function)? Inventing a migration to match a broken type would be
guessing at product direction from a bug.

**Recommended sweep:** grep every `CREATE TABLE IF NOT EXISTS` in
`supabase/migrations/` against the prod baseline. Two tables have now been found
where the guard swallowed a whole column set. There is no reason to think they
are the only two, and the class is invisible to the ledger.

### 3.3 The #1098 guard covered half the problem

`nav-route-coverage.test.ts` was left behind by #1098 to stop exactly the bug
#1578 describes. It walks `navigation.ts` hrefs **and only those**. A link can
exist two ways in this app, and the second way — `navigate()` / `setLocation()` /
`<Link href>` in component code — was unguarded. That is precisely how six pages
acquired live links and no routes while CI stayed green for months.

**A guard that covers one of two paths reads exactly like a guard that covers
both.** `inpage-link-route-coverage.test.ts` now covers the other path. It
immediately found a seventh unrouted link the audit missed
(`/documents/templates/new`, a primary CTA pointing at a page component that
never existed).

---

## 4. Verification stance

Every guard added here was **negative-controlled** — watched failing on the
defect it exists to catch — because a guard never seen failing is not a guard,
and this remediation was itself triggered by one.

| Guard | Proof it has teeth |
|---|---|
| Colour-rule test suite | Fails against the old rule (`Should have 1 error but had 0`) |
| Route-coverage guard | Fails when `/compliance/guardian-consents` is removed |
| KanbanBoard drop test | Fails when the `try/catch` is removed; success-path control catches an over-eager toast |
| Rule parity check | Reports all five copies drifted before sync, exit 1 |
| Ignore-list removal | `#ff0000` injected into `tagColors.ts` and confirmed caught |
| Route extraction | Pinned at both ends, so an extractor bug cannot make the scan silently green |

The `theme-audit-ok` hatch **leaked during development** — a trailing annotation
was licensing the following line — and its own test caught it. That is the
process working.

**Suite:** 476 files, 6231 passed, 0 failed. `typecheck` exit 0.
`lint` `PASS: 0 errors = baseline 0`.

### What was NOT verified — stated, not buried

1. **No browser pass.** #1578's acceptance criterion asks for a screenshot pair
   per route; none was produced, as no preview deployment was available. The
   routes are proven *registered*; **routed is not rendered**. The `/create`
   deep-links and the `?host_employer_id=` prefill are new behaviour and need a
   preview pass before merge.
2. **No live database query.** The `document_templates` finding rests on the
   prod baseline dump and the generated types, which agree with each other.
3. **The rule fix reached crm7 only.** `business-suite-unified` and `braden` are
   on other lanes' branches; `conduit` and `throughput` are in **detached HEAD**,
   where a push reports up-to-date while pushing nothing. Measured safe
   (0 violations each) and filed as bsuite#1889. Until they land, the parity
   check correctly reports drift.

---

## 5. Open items

Status as at 2026-08-11.

| Ref | Item | State | Priority |
|---|---|---|---|
| crm7#1595 | Google-Docs columns; document generation non-functional | **Ruled** (§0) — expand migration `20260813090000` + pgTAP `74` in flight | **P1** |
| crm7#1597 | LLN/WHS create dialogs ungated for `view_compliance` | In flight | P2 |
| crm7#1598 | Register blind spots; does the namespace bug reach `refs`/`purity`? | In flight | P3 |
| bsuite#1889 | Colour rule to the other four apps | braden + throughput **done**; conduit (5) + BSU (27) in flight | P3 |
| — | Production promotion `development` → `main` | **Not started** — see below | P1 |
| — | `uplift` export + inline-edit port into `EnhancedDataTable` (§2.4) | Open | P3 |
| — | ~~`/portal/org-documents` routed but absent from nav~~ | **Closed — not a defect** (below) | — |
| — | Person-field ownership residuals (emergency contact, guardian, school-based) — needs the AVETMISS wave plan; would duplicate crm7#714 | Open | P4 |

### `/portal/org-documents` — the audit was wrong, and so was I for repeating it

The audit reported this route as "routed and absent from `navigation.ts` —
confirmed 2/3+", and I carried it forward as a suspected orphan. Checked
2026-08-11: it is **fully wired**.

- `src/config/navigation.ts:290` and `:452` — "Manuals & Policies"
- `src/pages/portal/worker-portal.tsx:953` — `navigate('/portal/org-documents')`
- `src/App.tsx:3662` — the route

`navigation.ts:288` even carries a comment explaining the permission model for
this exact link. Nothing to do. Recorded because a suspicion repeated without
re-checking is how a phantom item survives three documents — the item cost more
to carry than to verify.

### The promotion needs its own release, not a session-end push

crm7 `development` is **82 commits and 14 unapplied migrations** ahead of `main`.
That set is not this lane's work alone — it includes other lanes' migrations, at
least one of which is **destructive** (`20260812190000_drop_legacy_contracts_table.sql`).

Promoting is therefore a deliberate release with its own pre-flight, not a tidy-up
at the end of a working session: the migration applier runs on `main`, and a
destructive migration written by another lane should be reviewed by someone who
has read it. Two standing rules apply — a recorded migration is not an applied
one (assert the objects, not `schema_migrations`), and merged is not shipped
(compare the live commit SHA against the merged SHA before testing anything).

---

## 6. Lessons worth keeping

1. **A gate that covers one of two paths reads like a gate that covers both.**
   #1098's fix was correct and its guard was real; it simply guarded the wrong
   half. #1578 is what that costs.
2. **Re-measure a stale finding under the new instrument.** The audit's "23 of
   24 stale" was measured under the old rule and did not survive the widening —
   the answer changed to 24 of 24.
3. **`CREATE TABLE IF NOT EXISTS` turns a migration into a no-op the ledger
   still records as applied.** Two tables and one non-functional feature so far.
4. **A hand-written type mirroring a database table will drift, and typecheck
   will help it.** Both crashes here were `undefined.length` on fields the
   compiler happily believed in. `DocumentTemplate` is now derived from the
   generated row type.
5. **An escape hatch belongs next to the code.** The 24-entry ignore list was
   correct on the day it was written and wrong for every day after, because
   nothing made anyone revisit it.
