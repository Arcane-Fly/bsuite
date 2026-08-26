---
kind: plan
authority: engineering
owner: bsuite
evidence:
  - app-quality-checks.yml
  - build-and-test.yml
---

# R80.4 carry-over register — what the old standalone session left open

> **How the rows below are held true.** The award-correctness rows are bound by
> `app-quality-checks.yml`, which runs R80.4's award suites on every
> pull request; a regression in the apprentice ladder or the allowance amounts turns that
> gate red. The build rows are bound by `build-and-test.yml`. Rows that
> name no gate are *observations awaiting one* — they are not evidence that anything holds,
> and should not be read as such.

**Date:** 2026-08-10 · **Status:** 1.00W (working) · **Source:** the former
`Dev/R80.4` Claude Code session (84 MB transcript, 164 operator messages, 2026-08-02 → 2026-08-06),
reconciled against the `bsuite_` memory corpus and the live deployment.

R80.4 is now a submodule at `Dev/bsuite/R80.4`. R80.3 was archived out
(`5e000c35 chore(repo)!: archive R80.3 out of the submodules, add R80.4 in its place`).
R80.4 serves `https://r8.crm7.app` — the same domain R80.3 used, by your instruction
("straight replace r80.3 easier than updating dns").

Glossary for the codes used below: **MAPD** = the Fair Work Commission's Modern Award Pay Database
API. **PACT** = Fair Work's public Pay and Conditions Tool, the calculator we reconcile against.
**NTW** = National Training Wage. **SWS** = Supported Wage System (the reduced-capacity wage rules).
**SW** = service worker, a script a website installs into your browser that can serve pages offline.
**ANZSCO** = the ABS occupation code list. **D1–D18** = our internal definition-of-done benchmarks.

---

## 1. Your question: where is the occupation selector?

**It is there, and it works — but it is hidden behind an award selection, and when no award is
chosen it does not even hint that it exists.**

Path to it:

1. Sign in (the award search calls `/api/fwc`, which refuses anonymous requests).
2. **Fair Work MAPD** card → type the award → **press Enter**. Typing alone does nothing.
3. Click **Load**.
4. Middle column → **Employment & Hours** card → under the Sector buttons → **TRADE / OCCUPATION**.

27 trades, each labelled with its money — "Carpenter and/or joiner — tool $41.22/wk". Default is
*All others (no tool allowance)*.

**Why you could not find it.** The control renders only when the selected award is MA000020
(Building and Construction). On a fresh load no award is selected, and the code's fallback branch
returns nothing at all — so there is no label, no placeholder, no "pick an award first". It is
invisible rather than disabled. `charge-calculator-v9-2.tsx:4514`, gated on `selectedAward` which
starts empty at line 3380.

**FIXED 2026-08-26.** The `: null` fallback is gone. With no award chosen the control now renders *"Pick an award above first. The trade list is award-specific, so there is nothing to choose from until one is selected"*; with a non-MA000020/MA000036 award it names which award's list it would be. It is on a fresh visitor's default screen — `"trade"` is first in `DASH_DEFAULT_ORDER` and rendered unconditionally, with `selectedAward` initialised empty. Confirmed in the DEPLOYED bundle, not just the ref: the production asset contains the new copy once, as the terminal branch of the minified `selectedAward` chain, against a 4-hit positive control on the same file. **Caveat kept:** no browser render was measured — presence in a bundle is not visibility on screen.

**Second thing worth knowing:** the trade selector is deliberately MA000020-only. The trades, the
allowance bands and the clauses are that award's; offering a bricklayer's tool allowance against the
Retail award would be an invented entitlement wearing a clause reference. Pick any other award and
you get an explainer saying so.

### Two different "occupations" exist in BSuite — don't conflate them

| | R80.4 trade/occupation | crm7 OccupationSelector |
|---|---|---|
| What it is | MA000020 cl.21.1(a) tool-allowance trade | ANZSCO occupation, 1,023-row national register |
| What it does | Adds an **all-purpose** allowance inside the ordinary rate — so it is inside every penalty and overtime multiplier too | Identity and compliance only |
| Money impact | Carpenter $41.22/wk vs signwriter $9.89 ≈ $0.82/hr before any multiplier | None |
| Where | Employment & Hours card | People and training-contract pages |

Your 2026-07-29 ruling held that qualification, apprenticeship title and ANZSCO occupation are three
distinct identifiers that must not collapse. The R80.4 trade is a **fourth** axis on top of those.

---

## 2. Production defect found while checking — r8.crm7.app is blank for returning visitors

**Severity: P0. Anyone who used r8.crm7.app while R80.3 was live now gets a white screen, and it
will never fix itself.**

R80.3 installed a service worker in every visitor's browser. That script is still running and still
serving R80.3's cached page, which asks for R80.3's files — all 20 of which were deleted when R80.4
replaced it. Twenty 404s, empty page.

It cannot self-heal: the browser re-checks `/sw.js` to update it, R80.4 doesn't ship that file, so
the server answers with the app's HTML instead. A service worker delivered as HTML is rejected, the
update fails, and the old one stays. Forever.

- **Proof it is the service worker and not the deployment:** unregistering it in the browser made the
  same URL load R80.4 correctly — right title, full page, signed in as you. The deployment is healthy.
- **Your workaround right now:** open the site, F12 → Application → Service Workers → Unregister →
  reload. Or open it in a private window.
- **The real fix:** ship a self-destroying `public/sw.js` in R80.4 that clears the caches, unregisters
  itself and reloads the tab. Small, safe, and it repairs every affected browser automatically.
  **FIXED 2026-08-26, verified live.** `R80.4/public/sw.js` on `origin/main` is a kill switch: `skipWaiting()`, deletes every cache, `registration.unregister()`, then re-navigates open clients — each step separately try/caught so a cache failure cannot skip the unregister. The transport defect that made the old worker unkillable is closed too: `R80.4/vercel.json` excludes `sw.js` from the SPA rewrite and serves it `no-store` as `application/javascript`. Verified against the deployed origin, not just git — `curl -D- https://r8.crm7.app/sw.js` returns HTTP 200, `content-type: application/javascript`, byte-identical to the `origin/main` blob — and reproduced in a browser with a positive control: a synthetic stale worker registered against production reproduced the exact reported symptom (title present, `body.innerText.length === 0`), and on the next plain navigation with no user action came back `{registrations:0, caches:[], textLen:17004}`.

This also explains why "the existing r8 UI still looks the same" felt true on 06 Aug: for a returning
browser, the old app really was still being served.

---

## 3. Everything else the old session left open

### Correctness — award engine

| Item | State |
|---|---|
| **D11 extended to schedules** breaks 20 of 21 awards | Needs your ruling. D1–D10 and D12–D18 pass 21/21. The 79 schedules it fails on are honestly marked partial, so this may be the gate being right rather than the engine being wrong. |
| **MA000009 Schedule B adult apprentices** — engine $16.20 vs published $23.56 | **45% understatement.** Highest-dollar open defect. **FIXED 2026-08-26 (R80.4#234), and it was THREE years, not one.** The awards library was always right; the shipped calculator never imported it — zero `ma000009*` references against a 4-hit `MA000009` control — and priced adult apprentices through a generic two-limb floor the MA000009 preset gave nothing to compare against. Measured: year 1 $16.20 vs $23.56 (-45%), year 2 $19.14 vs $25.74 (-34%), year 3 $23.56 vs $25.74 (-9%); year 4 was already correct. cl.19.5's floor limb CHANGES BY YEAR — 80% of standard in year 1, the Table 3 Introductory row from year 2 — which is why the obvious fix of adding a single `lowestClassRate` would have OVERSTATED year 1 by $2.18. `adultFloor` moved to `src/awards/adult-apprentice-floor.ts` because it lived in a `.tsx` that bare node cannot load, so no test could reach it, which is how a correct library and a green test coexisted with a wrong number on screen. |
| **NTW schooling table indexed without its wage level** | Up to $29/wk wrong; shared Schedule E defect. |
| **Supported Wage System** modelled in 0 of 21 awards | The $113/wk floor binds above the percentage. |
| **School-based** unmodelled in 19 of 20 awards | |
| MA000009 Sch I, MA000071 Sch H, MA000017 Sch F | Unimplemented. |
| Five verdict functions return a bare verdict | `ma000036DailyHireEligibility`, `ma000036ServiceAccrual`, `ma000029AlternativeArrangement`, `ma000029SchemeSubstitution`, `ma000089ExcessiveAccrual`. |
| Penalty card rates "slightly off the card" | Your 06 Aug report, never diagnosed. |

### UI — your own complaints, still open

- Cards cannot be dragged up into blank space; the default layout buries key cards below the very
  long Allowances card.
- **Employment & Hours should default to sitting next to the Fair Work MAPD card.** Still doesn't.
- Large screens: a lot of usable width the cards can't reach.
- "Apprentice % of Standard Rate" populates but "Wages (Per Apprenticeship Year)" does not — and it
  was never answered which card to use for a 3-year apprenticeship.
- Billing models: you asked for **named, saveable presets** instead of the fixed Standard / ALEX /
  52-week trio, so someone can build and name their own.

### Cross-app

- ~~**crm7 still hardcodes `payRate: 0`** at `src/pages/charge-rates/index.tsx:192`~~
  **BOTH HALVES NOW CLOSED, and the file:line in this row was dead.** The LIST page was fixed
  earlier: `resolvePayRate()` reads `placements.hourly_rate`, falling back to the snapshot's
  `hourly_wage`, and renders "Not set" rather than a number when neither is on file. The
  DETAIL page one click away was missed entirely until 2026-08-26 (crm7#2079) and was worse
  than this row describes: it typed `payRate` non-nullable, computed
  `totalCost / ANNUAL_BILLABLE_HOURS : 0`, and printed **`$0.00/hr` into the print/PDF export a
  client receives**. It also assigned that same value to `costPerHour`, so the page showed one
  number twice under two different labels — and the one called "Pay Rate" was the fully loaded
  cost, not a wage, so the two surfaces disagreed even when the data was complete.
  Now: `number | null` threaded all the way to the PDF component, "Not on file" at every render
  site, and — the part that matters more than the display — push-to-payroll and
  invoice-generation **refuse** rather than sending a fabricated wage downstream.
  **Not measured:** how many live quotes actually lack `source_provenance.inputs`, and no
  browser probe of the rendered PDF.
- crm7 was never given the deep-link contract into R80.4's panel.
- **Payroll records must come out of R8** — your 06 Aug directive: "anything that is valuable from a
  payroll standpoint does not belong in r8". Not yet actioned.
- **Job boards — Seek first**, then Indeed and LinkedIn. Flagged pressing on 29 Jul; belongs in
  conduit, which owns recruitment. Untouched.
- **AVETMISS behind a feature flag, defaulted off, as a paid RTO add-on.** Backend already deployed
  (table, security policy, export function); **the "unrouted" claim is FALSE — verified 2026-08-26.** `crm7/src/App.tsx` lazy-imports the page and registers `<ProtectedRoute path="/compliance/avetmiss" permission="view_compliance">`, identical at crm7 `origin/development`, `origin/main` AND at the crm7 SHA the parent's `origin/main` gitlink records — i.e. what production runs. The gate is real rather than a decorative prop: the route component renders an access-denied card when the capability is absent and redirects unauthenticated users first, and `view_compliance` is a real constant. It is reachable from a rendered entry point, linked from the Compliance Areas grid. What is genuinely absent is the FEATURE FLAG this row asked for — the page is permission-gated, not flag-gated, so it is not defaulted off as a paid add-on.

---

## 4. What I recommend, in order

1. **Ship the service-worker kill switch.** Until then, an unknown number of browsers see nothing at
   all, and any UI work you commission cannot be reviewed by you or anyone else on an affected machine.
2. **Make the trade selector announce itself** when no award is picked. One line, closes a
   three-time complaint.
3. **Rule on D11**, so the engine has a truthful pass state to build on.
4. **MA000009 Schedule B** — the 45% adult-apprentice understatement is the largest known money error.
5. Then the layout work (Employment & Hours beside Fair Work MAPD, drag into empty space, named presets).

Items 1 and 2 are small and I can do both immediately on your word.
