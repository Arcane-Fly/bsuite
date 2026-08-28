# Notes backlog — verification register

**Document:** `docs/20260814-notes-backlog-verification-register-v1.00F.md`
**Date:** 2026-08-14
**Status:** F — Frozen. Superseded; see the banner below.
**Method:** every verdict below is measured against source code, live GitHub issue state, or live
Supabase SQL. No verdict rests on a doc claim, a changelog line, or a PR title.
**Sources reviewed:** `bsuite notes.docx` (4 dated sections, 67 screenshots, ~90 defects),
`docs/20260813-operator-directive-notes-backlog-remediation-v1.00D.md` (D-59…D-92),
`docs/20260813-portals-redesign-brainstorm-v1.00D.md`, `docs/20260813-bsuite-world-class-brainstorm-v1.00D.md`,
`docs/20260810-plan-dashboard-retirement-v1.00F.md`, `docs/20260806-schema-authoring-and-tenancy-scope-v1.00A.md`,
`docs/20260802-d2c-theme-compliance-audit-v1.00A.md`, `docs/plans/20260803…20260811-*`,
the open claude.ai thread, and the seven live repositories.

---

> ## ⏹ FROZEN 2026-08-29 — SUPERSEDED, AND THE SUPERSESSION IS MEASURED
>
> This is a **point-in-time verification register dated 2026-08-14**. Its value is being an
> accurate snapshot of that date, so it does not get edited — later work writes a NEW register
> rather than revising this one. `F` states that immutability, not that the backlog it describes
> is finished (operator ruling, 2026-08-26).
>
> **Limb (a) — superseded.** Every one of the **17 distinct D-numbers** this register assesses
> (D-59…D-92) appears in `docs/20260825-operator-notes-register-d1-d103-v1.00W.md`, which spans
> **D-1…D-145** and is the register `AGENTS.md` names as the source of truth. Measured with
> `comm -23` over both files' D-number sets: **0 uncovered**. Read the newer register for current
> state; read this one only for what was true on 14 August.
>
> **Limb (b) — the gate it cites still passes.** `theme-conformance.yml`, run 2026-08-29:
>
> | check | |
> |---|---|
> | `check-theme-gate-app-lists.mjs` | PASS — 4 app lists each cover all 6 |
> | `audit-hittable-actions.mjs --self-test` | OK — 5 cases pass |
> | `check-colour-ban-reaches-converters.mjs` | PASS |
> | `check-content-contrast-tier.mjs` | 402 files, 0 violations |
> | `check-dimmed-text-tokens.sh` | OK |
> | `check-fill-token-as-text.sh` | ratchet holds at 176 |
>
> Baselines at freeze: C1 **0** · C2 **41** · near-pure **0**.
>
> **What this marker does NOT claim:** that every defect listed below is fixed. Several are open
> and tracked in the newer register. It claims the DOCUMENT is final.


## 0. The headline

**The 13 August directive's own coverage numbers are now wrong in your favour, and wrong against
you in one place.**

| The directive said (13 Aug) | Measured (14 Aug) |
|---|---|
| Notes defects **never filed at all: ~40** | **8** |
| R80.4 open issues, whole repo: **3** | **18** — §3 was filed in full as #37–#58 |
| §5 "the thirty": file these | **All 30 filed** — crm7 #1679–#1705, BSU #706–#712 |
| D-86…D-92 CI hardening | **All filed** — bsuite #1961, #1963, #1964, #1965, #1966 |
| §3 R8 regression cluster: unfiled, unfixed | **6 closed with §9 evidence; 13 of 21 items fixed in code** |

**Where it went the other way:** §4 — the platform-wide surface defects, the exact class you have
raised most often — is the **one section of the directive with essentially no issue coverage at
all**. Five of its six items (D-74, D-75, D-76, D-77, D-78) have **no issue in any repo**. The
sixth (D-79) is only partially covered. That is not a coincidence: §4 is the section where the
fix is a shared component rather than a page, so there is no obvious owner to file it against.

**And the three items you added on 14 August are unfiled**, which is expected — they are hours old.

---

## 1. Verdict summary

Across 72 assessed items:

| Verdict | Count |
|---|---|
| **Fixed in code, verified** | 24 |
| **Fixed in code but issue never closed** | 1 (R80.4#37, the P0) |
| **Partial — fixed on one side, open on the other** | 9 |
| **Open — filed, untouched** | 27 |
| **Not filed anywhere** | 11 |
| **New defects found during this audit** | 8 |

---

## 2. P0 — what is actually still exposed right now

These are ordered by real severity. **Three are new findings, not in your notes or the directive.**

### 2.1 `report_templates_select` has no developer predicate — LIVE, real data

D-66 was applied to the **write** path only. The live policy is:

```
report_templates_select  USING (scope = 'platform')
```

No role predicate. `select scope, count(*) from report_templates` returns **23 platform-scope
templates**, readable by every authenticated user in every tenant, today. The insert/update/delete
policies were correctly hardened to `scope='platform' AND is_platform_developer()`. The read side
was left behind.

This is your own ruling being violated on live data by an RLS policy — not a UI.

### 2.2 `contacts` RLS has no host-employer limb — D-65 was fixed in the query only

The `/placements/:id/edit` supervisor selector was scoped client-side via
`useHostContactNarrowing(hostEmployerId)`. The file says so itself: *"It was a QUERY-SCOPE fault…
Nothing in the database was broken, so nothing in the database is changed by the fix."*

The live `contacts_select` policy is `tenant_id IN (auth_tenant_id()) OR has_parent_admin_access(...)
OR is_platform_developer()`. Any authenticated tenant user can still `GET /rest/v1/contacts?select=*`
and enumerate **every host's staff in their tenant**. This is precisely the case you named in D-65:
*"fixing the query over a permissive policy hides the symptom and leaves PostgREST and every future
consumer still able to read everything."* The symptom is fixed. The fault is not.

**Two sibling selectors carry the same class:** `HostSiteSelector` takes `employerId` as an
*optional* prop (omit it and every site in the tenant lists), and `HostAgreementSelector` has no
scoping prop at all and embeds `host_employer.business_name`. Currently 0 rows, so latent.

### 2.3 `canUsePlatformKit()` admits `is_super_admin` — 22 developer surfaces, latent

`platform_role ∈ {platform_admin, developer} OR is_super_admin === true`. But crm7's own
`reportScopeAccess.ts` records the estate's vocabulary: *"a super admin is an ENTERPRISE tenant
admin with sub-organisations — not a platform-level account."* Any enterprise account flagged
`is_super_admin` would open all 22 Developer Portal surfaces including secrets, storage and the
database console.

**Live blast radius today: nil.** Both `is_super_admin` holders are your two developer accounts.
It is a latent hole, not a live one — but it is one profile row away.

**One live anomaly:** `caris***`, whose home tenant is **FutureBuild Academy** (an enterprise
tenant), holds `platform_role = 'tester'`. `usePlatformRole` computes `isPrivileged = isDeveloper
|| isTester || isPlatformAdmin`. It carries no DB authority, so the exposure is UI-only — but an
enterprise-tenant user holding any `platform_role` contradicts D-66's letter.

### 2.4 Two latent cross-tenant tables

- `apprentice_handoff_tokens` — policy is `expires_at > now() AND redeemed_at IS NULL`, **no tenant
  predicate**, on a table holding `candidate_snapshot`, `conduit_tenant_id`, `host_tenant_id`.
  0 rows now; becomes a cross-tenant PII leak *and* a token-redemption path the moment the
  conduit→crm7 handoff ships.
- `apprentice_profiles` — `USING (auth.uid() IS NOT NULL)`, no tenant scoping, includes
  `base_pay_rate` and `cost_config`. 0 rows now.

### 2.5 D-64 (MAPD secrets) — **fixed, but the issue is still open**

R80.4#37 is **closed in code**. PR #48 (`a7de3427`, merged 2026-08-13) removed the subscription-key
field and the direct-fetch branch entirely; `mapdFetch` now throws without a proxy. The Fair Work
key vars (`FWC_API_KEY`, `FAIRWORK_API_KEY`, `FAIRWORK_API_KEY_SECONDARY`, `FWC_PROXY_TOKEN`) are
**not `VITE_`-prefixed**, so none is inlined into the client bundle. The token moved from `?token=`
to an `X-FWC-Proxy-Token` header and both proxies now *refuse* a `?token=`. Evidence: bundle greps
2→0, live G1–G5/A1–A5 probes.

**Three things remain:**
1. **#37 was never closed.** The PR body says `Closes #37`, which is inert because this estate
   merges to `development`, not the default branch. It needs closing by hand.
2. **Key rotation is still yours.** The code fix does not un-expose a key that was on screen.
3. Dev-only residual: `vite-fwc-proxy.js` injects `window.__FWC_DEV__ = {proxyUrl, proxyToken}` into
   page source — but the plugin is `apply: "serve"`, so it never runs in a production build.

---

## 3. §3 — the R8 regression cluster: mostly fixed

Contrary to the directive, this is the **best-executed** section. Verified against
`R80.4@development 3d99306f` and `main 44e4a383` (equivalent after PR #65).

| Item | Verdict | Evidence |
|---|---|---|
| Standard rate always $29.54 | **FIXED** | `29.54` has 0 hits repo-wide. Per-award resolution via `presetFor(award)` + `apprenticeLadder(award)`, `charge-calculator-v9-2.tsx:1291`. #38 closed, PR #59 |
| Wages/yr always 14.725/17.67/20.615/26.505 | **FIXED** | Those are MA000036's ladder. 19 per-award tables now ship in `src/awards/apprentice-ladder.generated.ts`. #39 closed |
| Allowances always Building & Construction | **FIXED** | `reloadCatalogueAllowances` clears MA000020 rows for other awards rather than reusing them. #40 closed |
| Allowance % always 100% | **PARTIAL** | Real clause percentages exist for 2 of 21 awards (MA000020 `[75,85,90,95]`, MA000036 `[100×4]`). The other 19 still flat-100 — but now labelled *"⚠ 100% is an UNVERIFIED DEFAULT, not read from {award}'s clause"*. #41 closed on the labelling |
| No MA000036 trade selector | **FIXED** | Two-option trade select with mutual exclusion, `:5310-5330`. #42 closed, PR #62 |
| Plumbing award shows B&C content | **FIXED** | #43 closed |
| No commercial construction sector | **FIXED in code**, #44 still open | `SECTORS` now has 5 entries incl. `commercial_construction` — cl.17.1 shifts + cl.22.1(a) $67.15, exactly your spec |
| Award selection doesn't sync between the two cards | **FIXED in code**, #47 open | ~~`src/lib/award-sync.ts`~~ (no file of this name exists anywhere in the estate — the row above says FIXED in code, but not at this path) `syncPanelAward`, unit-tested, wired both directions |
| Standard Rate / % / Source don't update on award change | **FIXED in code**, #49 open | `usePctWages` re-derives on award change, `:1364-1372` |
| Occupation & Qualification not settable | **FIXED in code**, #50 open | Dedicated "Award, Trade & Qualification" panel, `:5130` |
| No quote export | **FIXED in code**, #51 open | `doDownloadCsv` → `quoteToCsv`; JSON+CSV for participants / host_billing / accounts, `:6599-6627` |
| "Unsuspended"; wrong shift-loading copy | **FIXED in code**, #52 open | 0 hits for `Unsuspended`. Shift note rewritten `:5196-5215` |
| D-68 remove competency progression | **FIXED in code**, #53 open | Card removed with your ruling quoted at `:4670`; engine modules deleted, 0 files remain |
| D-69 funding milestones pre-populated | **FIXED in code**, #54 open | `DEFAULT_MILESTONES: Milestone[] = []` with your quote at `:165`; `placeholder="milestone name"` |
| D-70 allowance UX | **FIXED in code**, #55 open | Defaults-only initial load, add-from-award `<select>` with ALL-PURPOSE / Other groups, "+ Manual" escape hatch, ordinary-rate badge |
| D-71 one card for the calculation | **FIXED in code**, #56 open | Single-view app; one nav entry; training hours folded into Billing Model |
| D-73 product is "R8" | **FIXED and enforced**, #58 open | `eslint-rules/no-user-visible-r80.js`, `"error"`, **zero baselined violations** |
| "Yrs" overflowing a button | **FIXED** | `min-w-0` on the grid cell + `shrink-0 whitespace-nowrap` on the suffix, with the 15px measurement recorded |
| Pure white in R8 UI | **FIXED** | 0 hits for `#fff`, `lab(100`, `255,255,255`, `text-white`, `bg-white` |
| Only 3/4-yr apprenticeships; no worker types | **PARTIAL**, #45/#46 open | `apprentice \| trainee \| worker` selector exists; casual, daily-hire, FT/PT all present; trainee priced on NTW Sch D/E. **ABN/contractor: 0 hits anywhere** |
| Jodie AI missing on R8 | **STILL PRESENT** | The repo has **no AI surface at all** — `src/components/` is 5 layout files. Unimplemented, not regressed |

**Fourteen of these are fixed in code but their issues are still open.** Same inert-`Closes` trap as
#37. They should be closed with the evidence rows attached, which is also what makes D-59
("filing is not addressing") measurable in the other direction.

### New R8 defects found during this audit

1. **MA000017 allowances are entirely unreachable.** `src/awards/allowance-catalogue.ts:96` does a
   raw `r.sector === sector` compare with no alias resolution. MA000017's 26 rows are tagged
   `general`/`clothing`/`textile`/`felt_and_wadding`; the UI's `sector` state uses MA000020's
   vocabulary and defaults to `general_building`, and MA000017 has no sector selector. Result:
   `adapted:true` but **0 allowances loaded**, picker reads "0 available" with empty groups.
2. **Commercial construction drops sector-keyed rows from the add-from-award picker.** Same root
   cause — the initial load resolves the `commercial_construction → general_building` alias, the
   picker at `:6118` does not. So the industry allowance prices correctly but cannot be re-added
   once removed.
3. **Allowance catalogue coverage is 8 of 21 awards.** The 13 uncatalogued awards show an honest
   empty state rather than wrong data — a coverage gap, not a correctness defect.

---

## 4. §4 — the platform-wide surface class

**This is the section that matters most and the one with the least issue coverage.**

### 4.1 A correction that explains the repeat failures

**The card grid is not `@dnd-kit`. It is `react-grid-layout` v2**, wrapped by
`@bsuite/page-builder`. `@dnd-kit` in this estate is only kanban boards, sortable lists and
form-layout builders. **Any agent searching for `useSortable`/`SortableContext`/`DndContext` to
find these surfaces finds none of them** — which is a plausible mechanical reason every previous
fix only ever touched the one page named in the ticket.

### 4.2 D-74 — the common backing card

The reference implementation is `crm7/src/pages/Dashboard.tsx` (one widget key per panel) and the
generalised form is `crm7/src/components/platform/DraggableCardPage.tsx` + `CanvasCard.tsx`, whose
own docstring names the defect: *"Most CRM7 pages call PageGridLayout with `widgets={{ content:
<Card/><Card/>… }}`, which packs the entire form into ONE widget — the Canvas Editor then drags the
whole page as a single block."*

**Enumerated surface count:**

| Repo | Confirmed defective | Unaudited (no scanner coverage) |
|---|---|---|
| crm7 | 13 (of 45 ledgered; 32 justified) | 0 |
| business-suite-unified | 5 | ~87 page files |
| conduit | 5 | all `rounded-lg border p-4` pages |
| throughput | 3 | 4 |
| braden | ~10 | 0 |
| R80.4 | 0 (greenfield, no card surfaces) | 0 |
| **Total** | **≈36** | **≈91+** |

Your named surfaces are resolved or ledgered: `/communications` and `/funding-sources/new` are
**already fixed** (the communications file says so in a comment — *"the four stat tiles used to
share ONE backing card"*). `/people/:id` and `/financial/reports` fall in the 13.

**The 14 August item — the suite.crm7.app subscription tiles (CRM7 Professional, Conduit ATS) — is
BSU ledger entry `UnifiedDashboard.tsx#servicesPanel`**, whose stated reason is *"Dynamic
ServiceCard list … cannot be split into static widget keys without a dynamic-widget registration
mechanism."*

**That reason is false, and crm7 already disproves it.** `crm7/src/pages/settings/module-visibility.tsx`
renders `MODULE_GROUPS.map(group => <CanvasCard cardKey={groupKey} w={6}>…)` — a runtime-variable
card count where each card is an independent grid item. `DraggableCardPage` builds the widgets dict
from its children at render time; a `.map()` producing N cards needs no registration mechanism.

**The unaudited column is the real finding.** Four of five apps ported crm7's contract test but
dropped its most important check — `findUngriddedMultiCard`, which catches pages that never reached
a grid primitive at all. crm7's own comment calls that class *"the actual root cause of the
operator's platform-wide complaint."*

### 4.3 D-75 / D-76 — resize, columns, cut-off

**All three are fixed in `bsuite/development` as of 2026-08-13 — one day before you re-reported
them — and the fix has not reached conduit.**

Three independent causes were found for the resize regression:

1. **Persisted `isResizable: false` poisoning.** 0.5.2 forced it on every autoHeight item and it
   leaked into the *saved* layout. Removing it in 0.6.0 was insufficient because RGL resolves an
   explicit persisted `false` over the grid default forever, and the 0.6.0 heal was scoped to
   autoHeight items only — leaving every other card permanently unresizable.
2. **Height snap-back** (crm7#744) — `stripAutoHeightRows` restored `h`/`minH` unconditionally,
   discarding a genuine SE-handle resize as thoroughly as a measurement echo.
3. **Every gesture silently reverted** (bsuite#1588) — edit mode used `preventCollision: true` with
   `compactType: null`; RGL's colliding-move branch does a full revert, and `onDragStop` only emits
   on change, so a reverted gesture emitted nothing and *nothing could ever save*. In a full-width
   stack — the dominant archetype on `/dashboard` and `/people/:id` — every target cell is
   occupied, so **every** gesture reverted.

**Columns slider (your "columns do not respect the slider"):** RGL echoes all breakpoints on every
gesture; persisting `md/sm/xs/xxs` made them look consumer-supplied, so `buildResponsiveLayouts`
stopped deriving them and the slider — which rescales `lg` only — could no longer reach the
breakpoint on screen. *"Below a 1200px container — most real desktop sessions once the sidebar is
subtracted — moving the slider changed nothing at all."*

**Cards half cut off:** `DEFAULT_ITEM_AUTO_HEIGHT` was in the wrong place. *"Sixteen of the
eighteen raw consumers across the suite never [set autoHeight], so their cards were fixed at
whatever seed `h` the author guessed and clipped everything past it behind `overflow-auto`. That is
not a per-page authoring mistake repeated sixteen times; it is a default in the wrong place."*
BSU's `PageGridPage` hardcodes `h: 24` with no autoHeight — a guaranteed clip on any longer page.

**Conduit is version-locked out:**

| App | `@bsuite/page-builder` | Gets the D-75/D-76 fix? |
|---|---|---|
| crm7, BSU, braden, throughput | `^0.8.0` | ✅ |
| **conduit** | **`^0.6.3`** | ❌ **No** |

A caret on `0.x` is minor-locked (`^0.6.3` := `>=0.6.3 <0.7.0`), so conduit cannot resolve 0.8.0.
It also misses `PACKAGE_LAYOUT_EPOCH = 1000`, the one-time reset that lets already-poisoned stored
layouts recover. **Resize, columns and cut-off are all still live in conduit today.**

Two secondary risks: `throughput/package.json` declares `@bsuite/page-builder ^0.8.0` but omits
`react-grid-layout` and `react-resizable`, which are non-optional peers. And the `AGENTS.md` in your
project instructions still says `@bsuite/page-builder ^0.2.0 (latest 0.2.2)` — four minors stale
against the real 0.8.0. That table will mislead the next agent.

### 4.4 D-78 / theme — mostly fixed at the token layer, broken in app-local overrides

**Two doctrine corrections first.**

1. **`--role-error`/`--role-destructive` is now RED, not purple.** Contract 0.7.0 (2026-08-02)
   overturned the purple rule: purple measured **ΔE 0.006 against primary blue under protanopia** —
   destructive and primary were the same swatch. `theme-conformance.yml` enforces red as a **hard
   zero (C4)**. **The AGENTS.md in the project instructions still says purple.** Any agent reading
   it will try to reintroduce a colour that CI blocks. That doc needs correcting.
2. **The primitives you asked for all exist.** `--gradient-heading` / `.text-gradient-accent`
   (AA-verified both modes, with a `forced-colors` fallback), `--glow-card` /
   `--card-glow-source` (which *is* `var(--app-accent, var(--role-accent))` — per-app and
   per-tenant), and `--shadow-ink-*`. The defect is **application coverage**, not absence.

**Nothing in the shared token layer still emits pure white or pure black.** `--light-bg-accent` was
corrected from `0.994` to `oklch(0.98 0.006 260)`. Dark text is capped at `oklch(0.94)`.
`text-white`/`bg-white`/`text-black`/`bg-black` have **zero occurrences in `src/` across all six
repos**.

**Every surviving violation is an app-local override that shadows the fixed token — 5 declarations
across 3 repos:**

| Repo | File | Token | Value |
|---|---|---|---|
| crm7 | `src/styles/theme.css` | `--bg-shell-elevated` | `oklch(0.994 0.002 260 / 0.96)` — **exactly your DevTools `lab(100 0 0 / 0.96)`**, reaching **84 consumer files** |
| crm7 | `src/styles/theme.css` | `--bg-shell-hero` | `oklch(0.994 0.003 247.9 / 0.9)` — near-white wash over the top of every StatCard |
| crm7 | `src/index.css` | `--color-document-surface` | `oklch(0.994 0.002 260)` |
| conduit | `src/app/globals.css` | `--bg-shell-hero` | `oklch(0.994 …)` |
| throughput | `src/index.css` | `--bg-shell-hero` | `oklch(0.994 …)` |

Three of these carry the comment *"pure white banned"* while declaring 0.6 lightness points off
pure white. `vars.css` documents this exact failure mode about its own history: *"0.6 points is
below any perceptual threshold, so the panel still READ as white even though it no longer WAS
white. A colour rule enforced by string match will keep accepting values like that."*

**Your "blurry border" diagnosis is confirmed exactly.** `StatCard.tsx` sets
`borderColor: var(--border-shell)` = `oklch(0.3 0.03 260 / 0.09)` — **9% alpha, effectively
invisible**. What you see as the border is the ring inside `--shadow-shell`: `0 0 0 1px
oklch(0.546 0.215 262.9 / 0.05)` — a 5%-alpha box-shadow composited under `backdrop-blur-sm`, which
is why it reads blurry rather than crisp.

**Gradient coverage:** `.text-gradient-accent` has **13 call sites estate-wide, and BSU has zero**.
BSU uses a *local* `.gradient-text` on 20 page titles — so BSU page headings do carry a gradient,
but the **app tiles do not**. "CRM7 Professional" / "Conduit ATS" originate as plain data in
`src/lib/pricing.ts` and `SubscriptionUpgrade.tsx`, rendered with no gradient class. Your 14 August
item (b) confirmed.

**Nav underline:** `.bsuite-gradient-underline-span` exists in exactly 3 files, **all crm7** —
`TenantSwitcher.tsx` (the instance you pointed at), `CRM7Navigation.tsx` (nav **does** reuse it),
and `index.css`. It is **not in `@bsuite/theme`**, so it is absent from and unimplementable in the
other five apps without promoting the class.

**Conduit has converged, not diverged.** Recent work deleted a 242-token private palette copy, ~35
redeclared tokens, a green `--color-primary` fork and the local `.conduit-gradient`. Identity now
arrives via `[data-app="conduit"]` from the shared theme. Its only remaining divergence is the one
`--bg-shell-hero` token shared with crm7 and throughput. Next.js is not causing drift.

**The CI gate is green while five near-white surfaces ship.** `theme-conformance.yml` baseline is
**7**, measured at **pinned gitlink SHAs** (not branch tips — the workflow got this wrong once and
documents it: the same change measured 7→8 at tips and 10→11 at pins). It now demands **equality**,
not a ceiling — above is regression, below is un-banked improvement, both fail. But the C1 scanner
is a string matcher: **`oklch(0.994 …)` is not pure white by string match**, so none of the five
violations above is visible to it. 4 of the surviving 7 are mask stops in the source-of-truth HTML
documents, where the channel is opacity rather than paint — so the residual is largely non-defect.

**Developer portal buttons (your 14 August item c) — confirmed.** 48 component files under
`src/pages/Developer/`; 30 import shadcn `Button`; **37 contain raw `<button>`; all 30 that import
`Button` also use raw `<button>` — mixed usage is universal. 7 files are raw-only:**
`TenantSettings.tsx`, `Logs.tsx`, `Notices.tsx`, `Embed.tsx`, `Database/index.tsx`,
`Database/panels/FunctionsPanel.tsx`, `access-control/Users.tsx`.

Nuance for the fix: "unstyled" is not off-palette. `TenantSettings.tsx` uses *correct role tokens*
(`bg-primary/90 text-primary-foreground`). What it lacks is the `Button` contract — no
`focus-visible` ring, no size scale, no variant system, inconsistent radius (`rounded` vs the
portal's `rounded-xl`), `disabled:opacity-50` hand-rolled per site. That inconsistency is what reads
as unthemed.

### 4.5 D-77 / D-79

- **D-77 (edit-in-place)** — not filed. Prior instances bsuite#545 and bsuite#1588 are closed;
  crm7#1281 is open but covers undo/redo only.
- **D-79 (Airtable-style reporting)** — crm7#1568 covers the *second hardcoded builder* defect. **No
  issue states the Airtable/nocodb target**, and none states the D-66 scope gating that must go with
  it. Adjacent: crm7#477, bsuite#1882, crm7#1712.

---

## 5. §5 — the thirty: all filed, none closed

crm7 #1679–#1705 and BSU #706–#712, with four duplicates closed `not_planned` (crm7 #1689, #1695,
#1699, #1704). **Three have moved since filing:**

| Item | Filed | Actual state |
|---|---|---|
| §5-2 `/portal` redirects to dashboard, no invitations | crm7#1680 | **FIXED** — `portal/index.tsx` skips the redirect for `owner`/`admin`/`manager` and renders `<SharePortalCard />`; redemption route `portal/accept-invite/[token].tsx` exists. The `/dashboard` redirect now applies only to `gto`/`labour_hire`/`combined` tenant types |
| §5-22 `enterprise_licence_events` missing | BSU#706 | **NOT REPRODUCIBLE** — table exists in `public`, RLS on, 3 policies, migration `20260728120000` present, and the FK the embedded join names (`enterprise_licence_events_tenant_id_fkey`) exists verbatim. This was PostgREST schema-cache staleness |
| §5-24 `/branding` only saves after Show preview | BSU#708 | **FIXED** — `disabled={saving}` (was `saving \|\| settingsLoading \|\| brandingLoading`), regression-locked by a test that *fails on revert* |

**§5-5 `/settings/module-visibility` — exact root cause isolated.** `LAUNCH_FLAGS` has 38 keys;
`MODULE_GROUPS` renders 35. The three missing are `xero_integration`, `jodie_ai`, `rto_extension` —
and `jodie_ai` + `rto_extension` are the **only two `false` defaults**. The stat is
`Object.keys(LAUNCH_FLAGS).length - countEnabled(...)` = 38 − 36 = **2**, while `hiddenLabels`
filters `MODULE_GROUPS` only and returns **empty**. That is an exact arithmetic match to "says 2
hidden modules, shows nothing selectable". One-line class of fix.

**§5-26 app-switch loses session — partial.** The launchers are correct: `AppSwitcher.tsx` and
`AppLauncherTile.tsx` both build `/auth/login?return_path=…`, and crm7's login page auto-fires
`signInWithBusinessSuite()` on mount. **But `attemptSilentAuth()` is invoked in application code in
conduit only.** In crm7, R80.4, braden and throughput it exists solely as a re-export plus tests. So
a bare-URL visit to any of those four renders logged-out — which is what you see when you land on an
app's marketing page.

---

## 6. §6 — portals

`docs/20260813-portals-redesign-brainstorm-v1.00D.md` exists, is 63KB, and is correctly gated:
*"No code has been written and none will be until you have [ruled]."* It asks you three questions
before anything is built:

1. **Is a field officer staff, or an external portal user?** Recommendation: staff. Retire the
   walled portal, keep the page as their work-day home *inside* the main app, enforce the caseload
   in the database rather than by which page they landed on. This gates everything else — it decides
   whether we design four external portals or three.
2. **How much of the money may a host see?** Invoice + hours; or that plus charge rate per hour; or
   that plus the full build-up (wage, on-costs, overhead, margin). Commercial decision, not
   technical, and the biggest single driver of how much work the host portal is.
3. **May a host request a worker directly, or must it go through us?** Flagged 5 August, still
   undecided.

Three more it wants within the month: whether the portal is the system of record for payslips or
merely displays them; whether WHS questions are asked at timesheet submission/approval the way
AnyTime does (a process change for hosts, not a feature); and whether bank/TFN/superannuation
capture is in scope this quarter — named as the highest-risk item on your list.

**This is the correct shape and it is waiting on you.**

---

## 7. Not filed anywhere — file these

| # | Item | Owner | Note |
|---|---|---|---|
| 1 | **D-74** cards share a common backing card | bsuite (package) + per-app | ~36 confirmed + ~91 unaudited surfaces. File once, against the package |
| 2 | **D-75** card resize regression + columns slider | bsuite | Fixed in 0.8.0; **file the conduit version-lock** as the live half |
| 3 | **D-76** cards render half cut off | bsuite | Same — fixed in 0.8.0, live in conduit |
| 4 | **D-77** edit-in-place on the current page | crm7 | crm7#1281 covers undo/redo only |
| 5 | **D-78** theme: gradient headers, accent glow, nav gradient, the five `0.994` tokens | bsuite + crm7/conduit/throughput | Existing issues are lint-rule scope only |
| 6 | **14/08 (a)** suite.crm7.app subscription tiles on a common backing card | BSU | Same class as #1; the "cannot be split" ledger reason is false |
| 7 | **14/08 (b)** card heading text should use the D2C gradient | BSU | `.text-gradient-accent` exists; tiles never wired |
| 8 | **14/08 (c)** unstyled buttons across all 15 `/developer/*` pages | BSU | 7 raw-only files + 30 mixed |
| 9 | **NEW** `report_templates_select` RLS has no developer predicate | crm7/supabase | **P0, live, 23 rows** |
| 10 | **NEW** `contacts` RLS has no host-employer limb | crm7/supabase | **P0** — D-65 fixed the query, not the fault |
| 11 | **NEW** `canUsePlatformKit()` admits `is_super_admin` | BSU | Latent; 22 surfaces |

Plus, as sub-issues or comments: MA000017 allowances unreachable; commercial-construction picker
alias; `apprentice_handoff_tokens` / `apprentice_profiles` missing tenant predicates;
`HostSiteSelector` optional `employerId`; `HostAgreementSelector` unscoped; `role_capabilities` has
no default seed (5 of 7 tenants render an all-false matrix, and a save from that state writes
`granted: false` across the whole snapshot); theme audit blind to `oklch(0.99x)`.

---

## 8. Close these — fixed, evidence exists, issue still open

R80.4 **#37** (P0 — do this first, then rotate the key), **#44, #47, #49, #50, #51, #52, #53, #54,
#55, #56, #58**. crm7 **#1680**. BSU **#706** (not reproducible), **#708**.

Every one has the same cause: `Closes #N` in a PR merged to `development` is inert because the
default branch is `main`. **That is itself a filable defect** — it is why D-59 ("filing is not
addressing") reads worse than the estate actually performed.

---

## 9. The minimal fixes — five changes, not fifty

Ordered by blast radius per unit of edit.

1. **Bump conduit `@bsuite/page-builder` `^0.6.3` → `^0.8.0`.** One line. Resolves D-75, D-76 and
   the stored-layout reset for the one app still carrying them live.
2. **Promote `DraggableCardPage` + `CanvasCard` into `@bsuite/page-builder` and export them.**
   (Already tracked as crm7#412; the file's own docstring proposes it.) The component exists in
   three copied forms — crm7, braden, throughput, the latter two byte-identical — and is **absent
   from BSU and conduit**, which is exactly why BSU's ledger claims its four glued widgets are
   unfixable. Shipping it to BSU dissolves all four BSU entries including your subscription tiles.
3. **Delete `business-suite-unified/src/components/platform/PageGridPage.tsx`** and its route
   wrapper. crm7 and braden have both already retired this exact file and guard it with a regression
   test; BSU is the last holder of the single-grid-item primitive that crm7's own test calls *"the
   literal cause of 'all top level cards attached to the same backing card'."*
4. **Retype the five `0.994` literals to `var(--role-bg-panel)`** (5 lines, 3 repos), **and add a
   lightness-threshold rule to the audit script** so `oklch(0.99x)` on a surface token counts as C1.
   Without the second half the first regresses silently — the file's own history says a value like
   that will be re-typed. Note this *raises* the measured count, so re-bank the baseline in the same
   PR (the gate demands equality).
5. **Replace the four divergent contract tests with one scanner shipped from `@bsuite/page-builder`.**
   Today each app hand-rolled its own and each dropped something — BSU, conduit, braden and
   throughput all lack `findUngriddedMultiCard`; conduit's scanner documents three card idioms in
   its header and detects two, which is how its five known-glued pages pass as an empty ledger.
   **This is the change that makes "we fixed the page you named" structurally impossible to repeat.**

Then: raise `--border-shell` alpha and drop the `0 0 0 1px` ring out of `--shadow-shell` (two token
edits, fixes the blurry border everywhere); promote `.bsuite-gradient-underline-span` into the theme
package (one moved rule, makes the nav-gradient request answerable in the other five apps); apply
`.text-gradient-accent` to the BSU app tiles (one component); codemod the 7 raw-only Developer files
to shadcn `Button` and add a `no-raw-button` ESLint rule scoped to the portal path.

---

## 10. Documentation corrections required

Three docs actively mislead the next agent:

1. **`AGENTS.md` says `--role-destructive` is purple.** Contract 0.7.0 made it red on 2026-08-02 and
   `theme-conformance.yml` enforces red as a hard zero. Any agent following AGENTS.md will burn a CI
   round reintroducing a colour that measures ΔE 0.006 from primary under protanopia.
2. **`AGENTS.md` says `@bsuite/page-builder ^0.2.0 (latest 0.2.2)`.** The real version is **0.8.0** —
   four minors stale, and the version table is what an agent consults before a bump.
3. **`docs/OUTSTANDING.md` calls itself "single source of truth"** while its own header repoints
   twice to other documents. `docs/20260810-plan-dashboard-retirement-v1.00F.md` retired the last
   thing that claimed that title, for exactly this reason — *"It was doctrine … It had not been true
   since May."* OUTSTANDING.md is the same shape and should either be regenerated or demoted.
