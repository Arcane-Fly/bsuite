# Operator UX / Feature Bug Register — 2026-07-28

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Source: operator notes doc (`bsuite notes (1).docx`, 26 screenshots), compiled over 2026-07-28.
Operator caveat: **the doc was appended to all day — some items may already be fixed. VERIFY each
before acting.** Nothing here is to be treated as an open defect until verified against current
`development` + live.

Status legend: `VERIFIED-OPEN` / `VERIFIED-FIXED` / `UNVERIFIED` / `NEEDS-PRODUCT-DECISION`.

## Already actioned by PI

| # | Item | Status |
|---|---|---|
| 18 | Licence grace seats: `Failed to load events: Could not find the table 'public.enterprise_licence_events' in the schema cache` | **VERIFIED-FIXED 2026-07-28.** Table existed (18 cols, 3 policies, grants OK); PostgREST schema cache was stale. Issued `NOTIFY pgrst, 'reload schema'`; REST now returns HTTP 200. |

## P0 — hard crash / wrong data

| # | Surface | Issue | Status |
|---|---|---|---|
| 2 | `/communications/compose` | **Application Error, React minified #185** (maximum update depth exceeded — infinite render loop). Page unusable. Screenshot shows error boundary + `error_1785123750080_67dtpa1xm`. | UNVERIFIED |
| 2b | `/communications/compose` | `functions/v1/fairwork-enhanced` → **503**. Note: `fairwork-enhanced` is the one edge fn still deployed from an operator LOCAL path, not CI (CF-7) — likely related. | UNVERIFIED |

## P1 — feature missing / flow broken

| # | Surface | Issue |
|---|---|---|
| 1 | `/communications` | Emails cannot be opened/read. |
| 1b | platform | **No way to connect SMTP / Google / Azure email.** Operator: "mentioned in excess of 20 times". Tenants must be able to connect their own SMTP/Azure/Google accounts and send from them. Cross-check the April finding that deployed OAuth email fns may read mismatched client-id env names. |
| 6 | `/dashboard` | Edit mode must allow adding elements/widgets/entities and editing the **live page in place**. Currently redirects to page-builder and only creates a NEW page. **Operator notes this regressed — the ability existed recently.** |
| 7 | `/portal` | Redirects to dashboard. No way to send clients / host employers / workers / apprentices their personal portal. |
| 8 | `/leads/create` | Cannot create a new company/client from here, only select existing. Breaks the flow. (Note: crm7 `5a81154a` "make create-company affordance impossible to miss" landed this window — verify whether this is now fixed.) |
| 13 | `/vet/qualifications/{id}/edit` | Cannot import units of competency. Should pull from TGA API like the qualification does. |
| 17 | `/placements/{id}?tab=documents` | Requires document upload capability. |
| 20 | `/portal/worker` | Should produce a shareable link for job ads → candidate application; or post to Seek and import applications. |
| 22 | `/pipeline/kanban` | Should pull from conduit (one-shot: conduit owns recruitment). |
| 23 | `/settings/module-visibility` | Says "2 hidden modules" but shows no modules to toggle — cannot enable them. |

## P1 — platform-wide (operator: repeatedly fixed per-page instead of platform-wide)

| # | Issue |
|---|---|
| 3 | Stat cards (Total Messages / Sent / Delivered / Failed) share ONE backing card — must be individually movable in edit mode. **Screenshot confirms.** |
| 3b | Cards **half cut off** when the page opens. **Screenshot confirms** (stat row clipped by its container). |
| 3c | **Operator's core complaint:** "these issues are persistent across the app and have been flagged many times. Typically the fixing agent fixes that page I've pointed to but I have always said it is a platform-wide consideration." → Treat as a **platform invariant + lint/contract**, not a page fix. |

## P2 — UX quality / clarity

| # | Surface | Issue |
|---|---|---|
| 4 | `/payroll/award-rates` | No wages visible; Period column just says "percent"; no description visible. |
| 5 | `/settings/schema-builder` | Unusable. "Tidy" just stacks schema cards into a column. "Fit" does nothing. |
| 9 | `r8.crm7.app` | UI squeezes too much into a small card when the page has ample space. |
| 9b | r8 | Pay-rate "Standard" option unclear. Required hierarchy: **Adult / Junior / School-Based**; then **Completed year 12 / Has not completed year 12**; then **School-based year 11 / year 12**. |
| 9c | r8 | Industry Sector + **Funding Offsets** must be available *inside the calculation*, not a separate page. Reference implementation with better layout: `/home/braden/Downloads/charge-calculator-mapd.jsx` (demo — no bulk creation, hard-coded values, but the calculation is solid). |
| 10 | r8 | Training Hours likewise belongs in the calculation screen, not a separate page. |
| 11 | `/charge-rates/{id}/edit` | Where do "advanced configuration" values come from? Why can't they be edited? Should be pulled from the worker/apprentice's calculation in R8. Cannot confirm selection. |
| 12 | `/training/plans/create` | Progress should be **calculated** from units of competency completed vs remaining. |
| 14 | `/training/plans/{id}` | Units appear associated to the apprentice → apply cross-cutting + one-shot policy. |
| 15 | `suite.crm7.app/docs/enterprise-admin` | Docs should include screenshots. **Applies to all docs.** |
| 16 | `/placements/{id}/edit` | "Hourly rate" ambiguous — pay rate or charge rate? Should be pullable from R8 when linked. |
| 19 | `suite.crm7.app/branding` | Only saves after clicking "Show preview". |
| 21 | — | Client-update-to-host bug; leads → clients → host-employer one-shot compliance. |

## Cross-references to existing tracked work

- #3/#3b/#3c ↔ the card-unglue sweep (crm7 burns 1–12) and `bsuite#479`; `crm7#744` (grid resize snaps shut) and `crm7#619` (scroll regression) are the already-open sibling bugs. Filed residue: `crm7#1260`.
- #2b ↔ CF-7 (`fairwork-enhanced` deployed from operator local path, not CI).
- #9c/#10/#11/#16 ↔ R80.3 funding-offset wiring (`61c1286`) and `R80.3#367` (bulk path drops the offset).
- #12/#13/#14 ↔ `crm7#662` (surface units of competency, competency-based progression).

---

## Verified status — 2026-07-28 (PI pass, two subagent clusters)

**Headline: most of this register was already fixed before it was compiled.** The operator's own
caveat was correct. Every row below was traced against current `development`, not taken on report.

### Communications cluster — 5 of 6 already fixed

| # | Item | Status | Evidence |
|---|---|---|---|
| 2 | compose React #185 crash | **VERIFIED-FIXED** | `cfa85c88` — `selectActiveIntegrations` returned a fresh array each call; without `useShallow`, `useSyncExternalStore` saw a new snapshot every render → infinite loop. Screenshot's error-id decodes to 2026-07-27 11:42 AWST, ~4h **before** the 15:58 fix. |
| 2b | `fairwork-enhanced` 503 | **VERIFIED-FIXED** + red herring | Deployed source byte-identical to `216c267`; no consumer of the fn is even mounted in the compose tree, so the 503 was a stale cross-page log. |
| 8 | `/leads/create` company | **VERIFIED-FIXED** | `5a81154a` |
| 23 | module-visibility | **VERIFIED-FIXED** | `48384c43` / `3a128b79` |
| 4 | award-rates wages/period/description | **VERIFIED-FIXED** | `c4e18b25`, `0da1b7ef` |
| 1 | emails cannot be opened/read | **VERIFIED-OPEN** | Sent/SMS/Internal/All tabs have no row-click and no detail view. Only the separate Inbox tab (different data source) has a read pane. Needs a new component. |

### R8 / charge-rate / training cluster — 8 open, 1 fixed, 2 mixed

| # | Item | Status | Evidence / root cause |
|---|---|---|---|
| 13 | TGA units import | **VERIFIED-OPEN — worse than reported** | Two broken paths, not a missing UI: bulk sync is feature-flagged **off** (`TGA_SYNC_ENABLED=false`, pending schema sign-off), AND the single "Import Qualification" button is wired to `handleImport`, which imports an **RTO/training-provider by numeric code** — a real qualification code fails validation. Building a units-import UI on this ships a button that fails every time. |
| 11 | charge-rates advanced config | **VERIFIED-OPEN** | `AdvancedConfigSection.tsx` is a *read-only display* of hardcoded `@bsuite/charge-calc` package defaults as plain `<li>` text — never the linked apprentice's values. "Cannot confirm selection" traces to `const [, setSelectedAward] = useState(...)` — the picked value is discarded. |
| 9 | R8 cramped layout | **VERIFIED-OPEN** | Literal `max-w-5xl` at `R8Calculator.tsx:427`. One-line scope. |
| 9b | pay-rate hierarchy | **VERIFIED-OPEN — feature, not label** | School-Based apprentices (and the Year 11/12 sub-tier) **do not exist anywhere in the codebase**. "Standard" is overloaded with two unrelated meanings across two components. |
| 9c | Funding Offsets in-calculation | MIXED | Sub-part fixed; primary flow still open. |
| 10 | Training Hours in-calculation | MIXED | Sub-part fixed; primary flow still open. |
| 12 | training plan progress calculated | **VERIFIED-OPEN** | |
| 14 | units→apprentice one-shot | **VERIFIED-FIXED** | |
| 16 | placement hourly-rate ambiguity | **VERIFIED-OPEN** | Same cross-app ownership question as #11. |
| 17 | placement document upload | **VERIFIED-OPEN** | Infrastructure exists (`document-secure-upload`, `document-virus-scan`, `org_documents`) — missing UI wiring only. |

### Closed this pass
- `R80.3#367` (bulk path fundingOffset) and `R80.3#368` (three inert surfaces) — both fixed in `2bebb31` (signed, `origin/development` HEAD) and closed. Selectors now carry visible `(not yet active)` tags rather than silently doing nothing.

### PRODUCT DECISIONS — operator call required, agents must not invent these
1. **How should crm7 read R80.3's apprentice calculation live?** (#11 and #16 are the same cross-app ownership question.)
2. **Which TGA backend path gets fixed/enabled first** — the flagged-off bulk sync, or the mis-wired single import? (#13)
3. **Is School-Based apprentice modelling (incl. Year 11/12 sub-tier) a scoped feature project?** (#9b) — this is domain modelling, not a label change.

---

## Implementation outcomes — 2026-07-28 (verifier-gated loop, all merged)

Every task: implemented → reviewed by a **separate** verifier agent (maker ≠ checker) → merged signed
to `development`. Zero Critical and zero Important findings across all five reviews.

| Task | Items | Merged | Outcome |
|---|---|---|---|
| 1 | #9, #9b | R80.3 `0e87d2e` | #9 already fixed (`7cb5359`), not re-touched. #9b: **three** "Standard" collisions found, not two. Operator's literal wording/order used. School-Based deferred per ruling. |
| 2 | #9c, #10 | R80.3 `0dc78a3` | #9c funding offsets now in the Set Pay Rate step. **Preview/real-calc disagreement is structurally gone** — one state variable, one `calculateChargeRate` call site. #10 verified already in-calculation. |
| 3 | #12, #13 | crm7 `d182164e` | #13 Path B **live-verified against the real TGA sandbox** (CPC30220 → 60 units). Path A blocked, filed `crm7#1266`. #12 now derived; also fixed `edit.tsx` reading a non-existent `progress` column. |
| 4 | #16, #17 | crm7 `92c0c9ca` | #16 `hourly_rate` is the **pay** rate — labels made truthful. #17 corrected `c09e62fc`, which had wired uploads to a legacy table with no list. |
| 5 | #5, #19 | BSU `1ea084b` | #5 already fixed in `@bsuite/schema-builder@1.0.1`, pinned on `main` — no crm7 change needed. #19 **re-diagnosed**: never coupled to Preview. |

### Root causes worth remembering

- **#13 could never have worked.** `tga-search`'s `import` called `OrganisationService.GetDetails` (RTO)
  behind a digits-only regex, so alphanumeric qualification codes 400'd before reaching TGA. The
  pre-existing `TGAImportResult` interface never matched what the handler returned — frontend and
  backend never agreed.
- **#19 was not a Preview coupling.** Save's `disabled` was gated on `settingsLoading || brandingLoading`;
  the Preview link was coincidental timing. Removing the guard naively would have upserted
  `DEFAULT_BRAND` over real rows — the guard added prevents exactly that.
- **#17's earlier "fix" was wired to a dead system** — uploads went to legacy `document_records` with no
  list, so they appeared to succeed and never showed.

### Bugs found while fixing other things (all filed)

- `crm7#1265` **[P0, wrong money]** charge-rate calc uses VIC payroll tax (4.85%) for every tenant; WA is
  5.5% → GTO under-charges the host by ~$321/apprentice/yr.
- `bsuite#1684` **[architecture]** one-shot drift — Charge Calculations are R8-owned by doctrine but
  authored in crm7. Root cause of both `crm7#1265` and #11.
- `crm7#1266` TGA bulk sync blocked twice over (flag off **and** `runSync()` Stage-2 upsert unimplemented).
- `R80.3#371` apprentice details modal explains funding from the legacy `fundingConfig.sources`, not the
  W3 offset actually applied.

### OPERATOR RULINGS — 2026-07-28 (all three now SETTLED)

1. **§12.3 live checks — APPROVED.** `crm.crm7.app/settings/schema-builder` Tidy/Fit reframe and
   `suite.crm7.app/branding` Save-without-Preview accepted on code + test evidence.
2. **`bsuite#1684` / OQ1 — RULED.** crm7 `ChargeRateSnapshot` is interim-canonical for persisted
   charge-rate records, **sourced from R80.3** (R8 owns Award Rates / Charge Calculations / Funding
   Offsets per one-shot doctrine §1). R8's unwired rate tables are **deprecated, not deleted** — no
   DROP migration (Feature Protection). Relayed to hermes as binding.
3. **Invoice wording — REJECTED, and it opened a wider defect class.** The label had been changed to
   `"Standard (39-Week)"` for symmetry with `"ALEX 48-Week"` / `"52-Week"`. Operator: *"dont hard code
   figures 39 weeks i still calculable. its standard becasue its common but there is nothing that can
   be set since there are several variables based on the cercumstance and the award."*

   He is right, and the code already said so. `packages/charge-calc/src/types.ts:85` annotates
   `Standard: 39` as `// fallback only`. The real derivation is `billing.ts:39-43`:
   `52 − annualLeaveWeeks − publicHolidayWeeks − sickLeaveWeeks − trainingWeeks` — where public
   holidays are state-dependent and `trainingWeeks` varies by **award** *and* by **apprentice year**
   (`calculate.ts:140-141`). **ALEX48 (48) and W52 (52) genuinely are fixed** (`billing.ts:24-27`
   hard-returns them), so those two labels are correct and stay.

   **Standing rule:** no fixed week count may be asserted for the Standard model anywhere. Hedged
   forms ("~39", "typically 39 weeks") are equally prohibited — invoices are legal artifacts.

### NEW — defects found by the sweep that ruling triggered

The monorepo-wide sweep for asserted 39-week figures found the label was the *smallest* instance.

- **`crm7#1275` [P0, wrong money] — CONFIRMED AND FIXED (`a84e7ad7`, signed).**
  `resolveBillableWeeks()` billed a **flat 39 weeks** for every Standard line. A **local**
  `BILLING_MODEL_WEEKS` (chargeToBilling.ts:43, **lowercase** keys) shadowed the canonical
  capitalised map, and `billingModel` was typed bare `string` (:493, :731, :763, :801) so the
  compiler could not see the divergence. Because `CrmChargeRateInput.billingModel` is typed
  `'standard'|'alex48'|'w52'` (`crmCalcBridge.ts:56`) and reaches the pipeline unconverted, the
  lowercase lookup **always hit** — the derive branch beneath it was **dead code**.

  **Direction: over-billing the host.** Representative WA Year-1 apprentice (11 gazetted PH days,
  8 training weeks, $50/hr × 38 hrs/wk): 39 weeks → $74,100/yr vs derived 36 → $68,400/yr =
  **$5,700/yr over-charged on one worker**. ALEX48/W52 were unaffected (genuinely fixed).

  Fix imports the canonical map, normalises to canonical casing **once at the boundary**
  (`toCanonicalBillingModel()`), derives Standard/Custom, and makes the constant reachable only
  when both derivations fail — with a **visible warning**, since the silent fallback *was* the bug.
  Mutation-tested: reverted → RED (`expected 39 to be 36`), restored → GREEN; 4912 pass, tsc +
  eslint clean. PI independently verified the casing claim, signature, map removal and logic.

  **Operator decision required:** hosts billed under Standard since this pipeline shipped were
  over-charged. Quantifying exposure and deciding remediation is a commercial call.
- **`crm7/src/components/placements/ChargeRateCard.tsx:36`** — `label: 'Standard (39 weeks)'` on a
  dropdown users select from. Its own help text already says the truth
  (`'Apprentice — leave-adjusted billable weeks'`); the label contradicts it.
- **`crm7/src/hooks/usePlacementChargeCalc.ts:44`** — docstring asserts `defaults to 'Standard' (39 weeks)`.
- **conduit offers — FIXED and merged (`c96bc41`, signed, 1082/1082 pass). The most serious of the
  four**, because it reached a legally executed document.
  - `_view.tsx` persisted `billable_weeks = 39` onto **every Standard offer record**. Now `null`
    unless an operator enters a figure; ALEX48/W52 keep their fixed counts. Justified: the offer
    dialog collects none of the derivation inputs (no leave days, PH days, sick days, training
    weeks, daysPerWeek), so deriving here would reproduce 39 in disguise — explicitly ruled out.
    Column is nullable with `CHECK (billable_weeks IS NULL OR BETWEEN 1 AND 52)`, so `null` is safe.
  - `entities.ts:482` label `'Standard (39 weeks)'` → `'Standard (Leave-Adjusted)'`, printed on the
    **e-signed offer PDF** (`offerDocuments.ts:265`, `:308`). "Billable weeks" line now renders
    `Not specified` rather than `39 weeks`.
  - **Found unbriefed:** the create/edit dialog rendered *"Implies 39 billable weeks"* for Standard
    **before any save** — a third instance, visible at data-entry time. Gated to ALEX48/W52.
  - **Found unbriefed:** migration `20260618150000`'s `COMMENT ON COLUMN` asserted "Standard => 39
    billable weeks" **in the live DB catalog**. Corrected by additive comment-only migration
    `20260728200500` (timestamp verified unique across all 6 submodules + parent).
  - Mutation-tested: reverted → RED (`expected 39 to be null`), restored → GREEN.

  Note: `20260728120000_enterprise_licence_events.sql` exists in **three** places (crm7, BSU,
  parent). Checked because cross-submodule version collisions silently skip — all three are
  **byte-identical** (`df6cc7e9…`), so this is deliberate sharing, not divergence. Not a defect.
- **`R80.3/src/services/invoicingService.ts` — FIXED and merged (`62b584f`, signed, 975/975 pass).**
  The docstring at `:179-193` had asserted *"`BILLING_MODEL_WEEKS` fixes `Standard` at 39 billable
  weeks/year"* — the false premise the bad label rested on. Corrected alongside the label, since
  fixing the return value while leaving the comment would re-teach the error to the next reader.

  Label is now `Standard, Training Not Billed` — non-numeric, and the one differentiator that is
  **verifiable in the same file**: `includesTraining()` (`:175-177`) returns true only for
  ALEX48/W52. Rendering the *computed* weeks was considered and rejected: the call sites (`:617`,
  `:636`, `:833`, `:853`) build **weekly** lines (`… ${weekStart} to ${weekEnd}`), so an *annual*
  count never belonged there in any form — not even a correct one. (Comma, not nested parens: the
  line template already wraps the label, and nothing parses the description field — verified.)

- **`crm7#1274` — FIXED and merged (`01dd00fb`, signed, 214/214).** `usePlacementChargeCalc.ts`
  hardcoded `Standard: 39` **and `Custom: 39`** into `BILLING_MODEL_TO_WEEKS`, feeding
  `cfg.billableWeeks`. `Custom: 39` was the worse of the two — Custom means operator-defined, and the
  canonical map has `Custom: null` precisely because no constant applies. `:48`'s docstring had
  *already* been corrected to say weeks are derived, so the comment described behaviour the code did
  not implement — the inverse of the R80.3 defect, same file class.

  Standard now derives via `calculateBillableWeeks()`; Custom honours a new `customWeeks` and
  surfaces a **visible warning** on fallback, so the substitution is never silent. Mutation-tested
  (revert → 4/13 RED incl. `expected 39 to be 17`; restore → 13/13 GREEN).

  **Limitation named, not papered over:** no caller varies the leave inputs today, so Standard still
  resolves to 39 — now from the config's own values, tracking them if they change, rather than a
  divergent literal. Real per-apprentice derivation needs `placements/create.tsx` to thread
  state-specific public holidays and award/year-specific training weeks into override fields,
  mirroring what `chargeToBilling.ts` already does for batch invoicing. Follow-on work.

### Where this family now stands

All four merged, pushed, GitHub-signature-verified. **One item is NOT delivered:** conduit migration
`20260728200500` (the DB column comment) requires conduit `development` → `main` plus a parent
pointer bump before the applier picks it up. Comment-only, so low risk — but merged ≠ shipped.

**Open, and an operator call, not an engineering one:** hosts billed under the Standard model since
the crm7 batch pipeline shipped were over-charged. Quantifying exposure and deciding remediation
needs Braden.

**`crm7#1276`** tracks the remaining `Custom` gaps (no UI field for the week count; batch pipeline
still cannot carry `Custom` at all) — a product question about whether GTO operators need a
per-placement custom billing basis.

This is the same failure class as `crm7#1265` (VIC payroll tax rendered for every tenant): a
representative value presented as the record's own.

### Still open from the register (not yet implemented)
#1 comms read view, #6 dashboard edit-in-place, #7/#20 portal delivery, #21 client→host one-shot,
#22 pipeline from conduit, #15 docs screenshots, #3/#3b/#3c platform card invariant (hermes A6),
#11 advanced config (hermes A9).
