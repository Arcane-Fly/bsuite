# crm7 full-spectrum review — working register

**Date:** 2026-08-11 · **Status:** W (working) · **Source:** operator review, 2026-08-11
**Snapshot:** 1,891 src files (~477k LOC) · 443 pages · 362 lazy routes · 106 Zustand stores · 578 migrations · 2,271 RLS policies · 445 unit test files (34%) · 19 e2e specs · 10 CI workflows

This is the operator's full-spectrum review turned into a tracked register. It is **not**
a plan to do all of it — it is a prioritised statement of what is known, so nothing
here has to be rediscovered.

---

## How to read this

Each item carries a **state**: `FILED` (has an issue), `DONE`, `IN FLIGHT`, or `OPEN`
(recorded, not yet filed). Items marked **verified** were independently re-measured on
2026-08-11; the rest are the review's numbers, recorded as given.

Independent re-measurement matters here. My first pass at spot-checking used narrower
greps than the review and produced *lower* numbers for `window.confirm` (1 vs 11) and
API routes (8 vs 11). The review was right and my instrument was blunt — the same
failure mode that produced three false zeroes elsewhere in this program. **Where this
document and a quick grep disagree, re-measure before believing either.**

---

## Tier 1 — highest leverage (compliance-critical or systemic)

| # | Item | State | Note |
|---|---|---|---|
| 1.1 | [#1626](https://github.com/GaryOcean428/crm7/issues/1626) **Test coverage on the money/compliance engines** — AVETMISS ~12% (**verified: 2 test files / 17 source**), Xero adapter 0% (1,153 LOC), compliance lib ~20%, payroll and awards ~40% | FILED | The two areas where a silent defect becomes a **regulatory or accounting incident**. The repo's own standard is 70% for critical paths; these *are* the critical paths. |
| 1.2 | [#1628](https://github.com/GaryOcean428/crm7/issues/1628) **Table virtualization** — `EnhancedDataTable` (95 importers) renders every row; `@tanstack/react-virtual` is installed and used in **1** place (verified) | FILED | One fix in the shared table lifts the whole app. Apprentices, timesheets and contacts will all pass ~500 rows. |
| 1.3 | [#1627](https://github.com/GaryOcean428/crm7/issues/1627) **CI scripts that exist but never run** — dependency-audit, coverage threshold, bundle-size gate, stats artifact | FILED | Wire-ups, not build-outs. A script nobody invokes is documentation. |
| 1.4 | [#1625](https://github.com/GaryOcean428/crm7/issues/1625) **API auth / rate-limit inconsistency** — 3 of **11** routes (verified) verify JWTs, 2 rate-limit; `/api/error-report.ts` has **no auth** (log-flooding vector); `tga-*` edge functions unguarded; 1 of 36 edge functions uses Zod | FILED | AGENTS.md already mandates rate limiting on AI endpoints. Extend the standard to every mutating endpoint. |
| 1.5 | [#1629](https://github.com/GaryOcean428/crm7/issues/1629) **Error-boundary granularity** — 3 boundaries (verified) for 443 pages | FILED | One render error blanks a whole section. The route wrapper already has `retryImport`; a per-route boundary drops in there. |
| 1.6 | [#1629](https://github.com/GaryOcean428/crm7/issues/1629) **Silent `.catch(() => {})`** — ~23 per the review (my narrower pattern found 2; **trust the review**) | OPEN | Each is a debugging dead end. |

---

## Tier 2 — architecture & code health

| # | Item | State |
|---|---|---|
| 2.1 | [#1641](https://github.com/GaryOcean428/crm7/issues/1641) `App.tsx` at **4,019 lines** (verified — grown from the review's 3,859; this session added routes). Extract per-domain route manifests. **Unlocks 1.5 mechanically.** | FILED |
| 2.2 | God components: `people/[id].tsx` (2,399), `settings/integrations.tsx` (2,025), `worker.tsx` (1,816), `BrowseDataTab` (1,264), `ReportBuilder` (1,218) | OPEN — decompose when touched, not big-bang |
| 2.3 | Three coexisting data contexts, all live (#468 stalled) | Tracked at #468 |
| 2.4 | ~858 raw `fetch`+`useEffect` vs 879 TanStack Query. A stated Query-first convention + the `set-state-in-effect` allowlist as the migration backlog | OPEN |
| 2.5 | [#1642](https://github.com/GaryOcean428/crm7/issues/1642) Type-safety debt: 624 `any`, **256 `@ts-expect-error`**, 126 non-null assertions. Each expect-error is a suppressed real error | OPEN — ratchet new ones, as lint is already ratcheted |
| 2.6 | [#1642](https://github.com/GaryOcean428/crm7/issues/1642) Over-memoization: 1,303 `useMemo`/`useCallback` with React Compiler on | OPEN — low priority; stop adding, note in CONTRIBUTING |

---

## Tier 3 — accessibility (the biggest uncovered surface)

| # | Item | State |
|---|---|---|
| 3.1 | ~~`eslint-plugin-jsx-a11y` is not installed~~ — **shipped in PR #1633**: 23 rules at `error`, 10 ratcheted at 56 measured violations (#1634). `label-has-associated-control` excluded — it crashes on ESLint 10 and the plugin has no version that supports it (#1635) | **DONE** |
| 3.2 | [#1634](https://github.com/GaryOcean428/crm7/issues/1634) ~~8 images missing alt text including CRM7Logo~~ — **the claim did not hold.** Zero raw `<img>` without `alt`; the `alt-text` rule reports zero; `CRM7Logo` contains no `<img>` or `<svg>`. Real gap: **4 files with an `<svg>` carrying none of `aria-label`/`aria-hidden`/`role`** — `ProgressTracker`, `MarketingHome`, `OnboardingWizard`, `grid-pattern` | FILED |
| 3.3 | [#1635](https://github.com/GaryOcean428/crm7/issues/1635) Form-label association thin — 32 `<label>` against hundreds of forms. **Audit the shared field components first**; that fixes most pages | FILED |
| 3.4 | Dialog initial-focus unverified; **9 real `window.confirm()`** (the review's 11 includes 2 false positives — `TenantConfirmationGate` has a *prop* named `confirm`) | **IN FLIGHT** |
| 3.5 | `aria-sort` on `EnhancedDataTable` | **DONE** — #1583, merged and verified live |

---

## Tier 4 — UX & product quality

| # | Item | State |
|---|---|---|
| 4.1 | [#1624](https://github.com/GaryOcean428/crm7/issues/1624) **Timezone correctness across states.** Schema has timezone columns; there is no runtime timezone context. WA vs NSW/VIC/QLD differ by up to 3h and DST rules diverge. Timesheet start/stop, **award penalty windows (early-morning and night loadings)** and payroll cutoffs are all timezone-sensitive — a WA timesheet read in Sydney time can change which penalty rate applies | **FILED — treated as compliance, not polish** |
| 4.2 | [#1645](https://github.com/GaryOcean428/crm7/issues/1645) Empty states: 322 instances, no shared component | OPEN |
| 4.3 | [#1645](https://github.com/GaryOcean428/crm7/issues/1645) Mobile tables: no column-hiding or scroll strategy (complements #1270/#1271). Field officers are the most mobile-bound persona | OPEN |
| 4.4 | [#1645](https://github.com/GaryOcean428/crm7/issues/1645) `loading="lazy"` on images — trivial, unstarted | OPEN |
| 4.5 | [#1645](https://github.com/GaryOcean428/crm7/issues/1645) Command palette / global search across 443 pages — check whether one exists and covers **entities**, not just routes | OPEN |
| 4.6 | [#1645](https://github.com/GaryOcean428/crm7/issues/1645) Keyboard shortcuts + focus outlines for high-frequency bulk flows (timesheet approval, claim review) | OPEN |
| 4.7 | [#1645](https://github.com/GaryOcean428/crm7/issues/1645) Date-format preference (au/us) exists — verify it is applied at **every** render site. Spot-check reports and PDFs, which typically bypass hooks | OPEN |

---

## Tier 5 — ops, DB, DX

| # | Item | State |
|---|---|---|
| 5.1 | [#1644](https://github.com/GaryOcean428/crm7/issues/1644) localStorage sprawl: 352 refs across 79 files, including auth tokens and offline caches. One typed storage module also makes the forbidden-pattern auth rules **mechanically enforceable** | OPEN |
| 5.2 | [#1646](https://github.com/GaryOcean428/crm7/issues/1646) Edge functions log via raw `console.*` (142) with no structure. A shared `_shared/log.ts` with request-id correlation would make the pg_cron/tga incident class (#1617, #1377) diagnosable | OPEN |
| 5.3 | [#1643](https://github.com/GaryOcean428/crm7/issues/1643) **Audit-trail completeness** — enumerate compliance-critical mutations (claim approve, payroll export, rate change, document-sensitivity flip #1531, tenant switch) and assert each writes an audit row, ideally one pgTAP test per action | OPEN — compliance-adjacent, rank above the rest of Tier 5 |
| 5.4 | 578 migrations + 63 quarantined — squash-to-baseline cadence, reusing the 20260807 baseline mechanism | Tracked at #1506/#1525 |
| 5.5 | [#1646](https://github.com/GaryOcean428/crm7/issues/1646) RLS pattern drift across 2,271 policies — one normalisation sweep so grep audits stop producing false positives | OPEN |
| 5.6 | [#1646](https://github.com/GaryOcean428/crm7/issues/1646) `.env` drift: 18 vars referenced vs 21 documented — a tiny CI script keeps it aligned permanently | OPEN |
| 5.7 | [#1646](https://github.com/GaryOcean428/crm7/issues/1646) PDF triple-stack is legitimate (render / sign / view) — **document which is for what in CONTRIBUTING** so a fourth does not appear | OPEN |
| 5.8 | Bundle stats artifact — visualizer runs, output not archived. Upload `dist/stats.html` per-PR | Folded into 1.3 |

---

## Already tracked — do not duplicate

WebKit CI lane (#1173) · mobile view (#1270) · grid-cols responsive (#1271) · scroll
regression (#619) · DataContext retirement (#468) · pgTAP replay gates (#1400/#1506) ·
Xero UI wiring (#1320) · aria-sort (#1583, **done**) · e2e evidence capture (#467) ·
Node 22 sandbox lint (#1383) · the #1610–#1619 batch.

---

## Sequencing view

Not everything is equally cheap, and two items unlock others:

1. **3.1 jsx-a11y** and **1.3 CI wire-ups** are pure configuration. They convert whole
   classes of future defect into build failures for roughly a day's work between them.
   Do these first — everything else in Tier 3 becomes self-policing afterwards.
2. **2.1 App.tsx extraction** mechanically unlocks **1.5 per-route error boundaries**.
   Doing 1.5 without 2.1 means touching a 4,000-line file 362 times.
3. **4.1 timezone** is the one Tier 4 item that is really a Tier 1 item. A penalty rate
   is a legal obligation, and getting it wrong by an hour is a wage underpayment.
4. **1.1 test coverage** is the largest and least glamorous. AVETMISS and Xero are where
   a silent defect stops being a bug and becomes an incident with a regulator or an
   accountant.

---

## A caution about this register

The audit that preceded this one (2026-08-10) was accurate on its headline findings and
wrong in three places — it under-counted the unrouted-page cluster, mis-measured the
lint ignore list because it used the pre-widening rule, and reported `/portal/org-documents`
as an orphan when it was fully wired. Two of those I repeated without re-checking.

**Re-measure before acting on any line here.** A number in a document is a claim about
a moment, and this codebase moves several times a day.
