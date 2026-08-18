# Estate completion plan — the brief for an implementing agent

**Document:** `docs/plans/20260817-estate-completion-plan-v1.00D.md`
**Date:** 2026-08-17 · **Version:** 1.00D · **Status:** D — Draft, pending operator ruling on §9
**Closes:** `docs/20260817-estate-remaining-work-register-v3.00W.md` (all sections)
**Research basis:** 46 findings against primary sources, 2026-08-17. Every non-obvious instruction
below carries its citation inline. Where research contradicted this estate's own documents, the
research wins and §1 records the correction.

---

## How to use this document

This is written to be handed to an implementing agent and executed without further design work.
Each phase states **what to do**, **the acceptance test that proves it worked**, and **what would
make it a failed PR**. Phases are ordered by dependency, not by preference — do not reorder.

**Three rules that govern every phase:**

1. **The acceptance test is the requirement.** A phase is not done when the code is written; it is
   done when its acceptance test passes and the evidence is in the PR. A negative requirement
   written as a comment survives until the next agent who sees an opportunity to be helpful.
2. **Fix the class, not the page (D-62).** Every PR carries a `## Class sweep` block with a stated
   surface count. If the fix has to be applied N times by hand, you have not found the class.
3. **Report per D-85.** Every item is *closed with evidence*, *open with an owner and a date*, or
   *not started with a reason*. A filed issue is never an addressed defect.

**Skills to load before starting:** `vercel-speed-insights`, `vercel-ops`,
`bsuite-fix-the-class-not-the-page`, `bsuite-rls-authz-red-team`, `bsuite-page-grid-layout`,
`bsuite-gto-portals`, `machine-vercel-react-best-practices`, `agent-mem-comms`, `plan-executing`,
`agent-definition-of-done`.

---

## 1. Corrections — four things this estate's own documents get wrong

Read these first. Each has cost someone a CI round or a wrong architectural decision, and two of
them are in documents I wrote.

**1. Vite *can* have prerendering and ISR on Vercel. The "no ISR/PPR for Vite" claim is false.**
Vercel documents `vite-with-nitro` with both SSR and ISR
([vercel.com/docs/frameworks/full-stack/vite-with-nitro](https://vercel.com/docs/frameworks/full-stack/vite-with-nitro),
`last_updated: 2026-03-09`). Separately, build-time prerendering that **preserves the SPA authoring
model** is available through `vite-prerender-plugin` (Preact core team). The estate has been
treating "pure SPA" as a fixed constraint; it is a choice, and Vercel's own Vite page says verbatim
*"Deploying your app in Multi-Page App mode is recommended for production builds."*

**2. Skew Protection *is* achievable on Vite.** The zero-config framework list excludes Vite, but
Vercel documents the manual path — read `VERCEL_SKEW_PROTECTION_ENABLED` and attach
`VERCEL_DEPLOYMENT_ID` via the `dpl` query param, `x-deployment-id` header, or a `__vdpl` cookie
([vercel.com/docs/skew-protection](https://vercel.com/docs/skew-protection), `2026-07-15`).
Roughly five lines. **Correct this in `vercel-ops` and in
`20260815-vercel-platform-audit-and-res-regression-v1.00W.md` — I wrote the wrong version in both.**

**3. Vite 8 is Rolldown-by-default and `rollupOptions.output.manualChunks` in object form is gone**
([vite.dev/guide/migration](https://vite.dev/guide/migration); Vite 8 released 2026-03-12). Every
app in this estate configures chunking through `rollupOptions.output.manualChunks`. **Before
touching chunk boundaries, verify whether that config is even executing** — if it is silently
ignored, crm7's 1 MB `react-core` chunk is not a mis-ordered guard, it is Rolldown's default
behaviour, and the fix is different. The replacement is `build.rolldownOptions.output.advancedChunks`
with `groups`, which matches on `test` regex plus `minSize`/`maxSize`.

**4. Vercel Routing Middleware works with any framework, including a static Vite SPA**
([vercel.com/docs/routing-middleware](https://vercel.com/docs/routing-middleware), `2026-08-03`).
This is the fix for the 1.82 MB logged-out double-boot, and nothing in the estate uses it outside
conduit.

---

## 2. The four standing contracts

These are cross-cutting. Every phase inherits them; a PR that violates one is rejected regardless of
what else it achieves.

### C-1 — The server decides permissions. The UI renders that decision.

Never let a client-side list determine what is writable. Postgres column privileges are the
mechanism ([Supabase column-level security](https://supabase.com/docs/guides/database/postgres/column-level-security)).
**Note the trap:** a column-level `REVOKE` does **not** subtract from a table-level `GRANT` — the
PostgreSQL docs say so explicitly and give the worked example
([postgresql.org/docs/current/sql-grant.html](https://www.postgresql.org/docs/current/sql-grant.html)).
You must revoke at table level and re-grant the permitted column list.

Writability reaches the client as a server-computed fact (`has_column_privilege()`), and **unknown
writability means read-only**. Fail safe, always.

### C-2 — Default state is "I don't know". Asserting success requires evidence.

OpenTelemetry's span-status rule is the citable form of this: `Unset` is the default, and `Ok`
requires validation "by an Application developer or Operator" — instrumentation "SHOULD NOT set the
status code to `Ok`" ([OTel trace API spec](https://opentelemetry.io/docs/specs/otel/trace/api/)).
Grafana's alerting model is the operational form: `NoData` and `Error` are first-class states, and
mapping No-Data to Normal is documented as the footgun
([Grafana missing-data guide](https://grafana.com/docs/grafana/latest/alerting/guides/missing-data/)).

In code: `status` has no default, and the success branch is unreachable except from a measured
observation.

### C-3 — Money is integer minor units, rounded once, at the boundary.

Floats are banned in any calculation path. Rounding happens at the emitted line item, never on an
intermediate. Fowler names the failure: *"it's easy to lose pennies… because of rounding errors"*
([Money pattern](https://martinfowler.com/eaaCatalog/money.html)). The property to test is the one
Hypothesis names canonically — *"ensure financial transactions balance or money isn't lost"*
([Hypothesis tutorial](https://hypothesis.readthedocs.io/en/latest/tutorial/introduction.html)).

### C-4 — A compliance-critical number is authoritative, indicative, or refused. Never silently stale.

Three modes, not two:

- **AUTHORITATIVE** — live-verified, or a snapshot whose `operativeFrom`/`operativeTo` provably
  brackets the calculation date and post-dates the last Annual Wage Review. May produce payments
  and invoices.
- **INDICATIVE** — stale relative to the last known award variation. Quoting and estimation only,
  with a visible staleness banner, the snapshot version, and the FWC's own caveat that the data
  *"must be read in conjunction with the provisions in the modern award"*
  ([FWC developer terms](https://developer.fwc.gov.au/important-information)). **Structurally
  blocked from any path producing a payment or invoice.**
- **REFUSE** — no rate resolvable for the date. Hard error. No default, no last-known-good.

"Use the most recent rate we have" is the shortcut that produces systematic underpayment across a
whole tenant. It is banned.

---

## Phase 0 — Stop the bleeding (this week)

Five items. Each is small, each is independently shippable, and three of them are live exposure.

### 0.1 — `tenant_encryption_keys` is one mistake from anon-readable key material

`revoke all on public.tenant_encryption_keys from anon, authenticated`, relocate to a schema absent
from `PGRST_DB_SCHEMAS`, and add `alter table … force row level security` — the last because table
**owners bypass RLS** unless forced
([PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)).

**Acceptance:** `has_table_privilege('anon', …)` false for all four commands, same for
`authenticated`; an unauthenticated *and* an authenticated PostgREST request both return a
schema-cache miss (`PGRST205`), not 401 and not `[]`; `relforcerowsecurity` is true.

### 0.2 — The `profiles` privilege-escalation hole is on INSERT; the guard is on UPDATE

The trigger fires on UPDATE. The grant is on INSERT. The guard does not cover the hole.

Revoke `INSERT` **at table level**, re-grant the explicit permitted column list, add an RLS
`WITH CHECK` forbidding non-platform roles from setting `is_super_admin`/`platform_role` (a `GRANT`
cannot express a value constraint; a policy can), and extend the trigger to
`BEFORE INSERT OR UPDATE`.

**Acceptance:** pgTAP `throws_ok('insert into profiles(…, is_super_admin) values (…, true)', '42501')`
as both `anon` and `authenticated`; an insert omitting the column succeeds; the existing UPDATE-path
test still passes.

### 0.3 — Rotate the Fair Work API key, then determine whether production is affected

`scripts/api-availability.mjs MA000020` returns 401 on all five MAPD endpoints with a well-formed
key present, and R80.4's own definition-of-done gate is red across all 21 awards. **Before assuming
the key is dead, distinguish local from production:** call
`https://r8.crm7.app/api/fwc?path=%2Fawards%2FMA000020%2Fpay-rates` with a valid bearer token. A 200
means only the local `.env` is stale; a 502 (the proxy's documented remap of an upstream 401) means
production is dead too. Those are different incidents.

**Acceptance:** all five endpoints return 200 locally; `pnpm run dod` no longer reports unbaselined
D13 failures; the production probe result is recorded either way.

### 0.4 — BSU's billing page presents a fabricated bill

`src/lib/pricing.ts:20-46` is a hardcoded price table in the client bundle, multiplied by a real
seat count, and `APP_LINE_ITEMS` bills every tenant for all four apps regardless of entitlement.

**This is not only a UX defect.** Australian Consumer Law s29(1)(i) prohibits false or misleading
representations "with respect to the price of goods or services" in trade or commerce, and liability
does not require intent. Get it confirmed by counsel — but sequence it first on that basis.

Interim (same day): render `status="not_configured"` with a link to the Stripe customer portal
rather than a computed figure. Permanent (Phase 4): read live Stripe line items.

**Acceptance:** the page renders no `$` figure that did not come from Stripe; a tenant entitled to
one app is never shown a line for another.

### 0.5 — Redeploy `platform-kit-proxy`

BSU#726 narrowed the client gate and merged. Until deploy, the server is wider than the client.

**Acceptance:** the deployed function rejects a caller holding only `is_super_admin` without
`platform_role`.

---

## Phase 1 — Honest states (the class fix, 11 sites → 1 component)

Do this before anything that adds new surfaces, so new work is built on it.

### 1.1 — Build `<DataState>` in `@bsuite/ui`

Ten states, not three. Carbon's taxonomy is the floor and it is not sufficient — it collapses
no-permission, not-configured, not-monitored and stale into one bucket, and that conflation is
exactly what produced BSU's green badges
([Carbon empty states](https://carbondesignsystem.com/patterns/empty-states-pattern/)).

```ts
type Measured<T> =
  | { measured: true;  value: T; asOf: string; source: string }
  | { measured: false; reason: Exclude<DataStatus, 'ready'> }

type DataStatus =
  | 'loading' | 'ready' | 'empty' | 'empty_filtered' | 'forbidden'
  | 'error' | 'partial' | 'stale' | 'not_configured' | 'not_monitored'
```

`status` is **required with no default**. Values reach the UI only wrapped in `Measured<T>`. A
success token is reachable only from `status === 'ready'` with `measured === true`.

**ARIA, from the spec not from habit:** `role="status"` for empty / not-configured / not-monitored /
stale (implicit `aria-live="polite"`); `role="alert"` for error and forbidden;
`aria-busy="true"` on the container during loading — ARIA 1.2 §5.2.6 makes this a **MUST** for a
widget missing owned elements — cleared on **every** terminal state including error. The live-region
container must exist in the DOM *before* the message populates, because APG states that screen
readers do not announce alerts present before page load completes
([APG alert pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alert/)).

**Latency:** render nothing for the first 300 ms, then a module-scoped indicator; full-page skeletons
only at route level; a determinate bar past 10 s. Derived from NN/g's limits — 0.1 s instantaneous,
1.0 s flow, 10 s attention
([NN/g response times](https://www.nngroup.com/articles/response-times-3-important-limits/)).
**Do not skeleton a state that may resolve to `not_monitored`** — a skeleton promises a number.

**Acceptance:** ten-state render test asserting the success-token set is empty for nine of them;
`aria-busy` is `"false"` after every terminal transition; a frozen vs mutated clock produces an
identical `asOf`; omitting `status` is a compile error.

### 1.2 — Replace all eleven sites

BSU `Billing`, `Government`, `GTO` (the `: 95` default, not just the catch), `Developer/Platform`
(×2), `Admin` OAuth registry, `Developer/RateLimits`; crm7 `/financial/budget`,
`field-officers/site-visits`, `Developer/Platform`. The in-repo model to generalise is BSU's own
`Admin/SystemOverview.tsx:42-88`.

Special case — **`Government.tsx`'s Sync button is `await new Promise(r => setTimeout(r, 1500))`**.
There is no network call in the file. Either wire it or remove it; a button that simulates work is
worse than no button.

### 1.3 — Make it stick, in four layers

1. **ESLint `no-restricted-syntax`** with esquery selectors, scoped to `src/pages/**` and
   `src/components/**`, excluding tests and fixtures. Catch: status literals matching
   `/^(connected|active|deployed|healthy|ok|online)$/i`; numeric `??` fallbacks; `Date.now()` in a
   `lastSync`/`lastChecked`/`updatedAt` property; `await new Promise(… setTimeout …)`; any import of
   `initialData`. Note the documented limit — this rule is **syntax-level only**, no type awareness
   ([ESLint docs](https://eslint.org/docs/latest/rules/no-restricted-syntax)).
2. **A typed rule `bsuite/no-fabricated-status`** using `@typescript-eslint` type services, for what
   layer 1 structurally cannot see: a value whose declared type is a status/score/price union must
   trace to a call expression, not a literal or an imported const.
3. **Two tests per data surface.** (a) MSW with `onUnhandledRequest: 'error'` and zero handlers —
   if the page renders a value, it never asked the network. That is the `Government.tsx` bug caught
   mechanically. (b) Render with rejecting query / empty result / forbidden, and assert no success
   token in any of the three.
4. **A registry + CI gate** — a new page without a registry entry fails CI.

**TanStack Query house rule:** `placeholderData` is permitted only when the consumer reads
`isPlaceholderData` and renders visibly provisional; `initialData` is banned in data surfaces,
because it writes to cache and is thereafter indistinguishable from fetched data
([TanStack placeholder data](https://tanstack.com/query/latest/docs/framework/react/guides/placeholder-query-data)).

### 1.4 — Wire the observability, and do not page on user states

Emit `data_surface_state_total{surface,state,tenant}` on every terminal state including `ready`.
Alert only on `error` rate above baseline and on `not_monitored` persisting past an SLO window.
`not_configured` and `empty` are **user states, never telemetry events** — otherwise replacing
eleven fake-green surfaces with eleven honest red ones generates a page storm from expected states.
Google SRE's rule applies: *"If a page merely merits a robotic response, it shouldn't be a page."*
([SRE book](https://sre.google/sre-book/monitoring-distributed-systems/))

Wire React 19's root handlers — `onCaughtError`, `onUncaughtError`, `onRecoverableError`
([createRoot](https://react.dev/reference/react-dom/client/createRoot)) — so a widget-local,
gracefully-degraded failure still reaches Sentry rather than being visually absorbed. One boundary
per data surface, `resetKeys` on the query key.

---

## Phase 2 — First paint (the 0.54–0.77 → target 0.90+ work)

### 2.1 — Verify the chunk config is executing at all

Before changing a single boundary: confirm whether `rollupOptions.output.manualChunks` still runs
under Vite 8's Rolldown default. If it does not, every chunking conclusion in the audit needs
re-deriving.

Then migrate to `build.rolldownOptions.output.advancedChunks.groups` with explicit `test` regexes
that match package boundaries — `/node_modules[\\/]react[\\/]/` anchored, not
`id.includes('/react/')`, which matches any nested `node_modules/react` path inside another package.

**Set `minSize`.** Rolldown over-splits by default without it — a known Vite 8 regression
([vitejs/vite#22007](https://github.com/vitejs/vite/issues/22007)). Use 20 KB on the catch-all
group, dedicated groups for anything over 160 KB, and budget **≤25 requests before first paint**
([web.dev granular chunking](https://web.dev/articles/granular-chunking-nextjs)).

**Acceptance:** grep the built `react-core` chunk for `slate` and `zod` — zero hits. HTML subresource
count under 50 for crm7, and no chunk under `minSize` carries a preload hint. Every route that
previously rendered still renders — a chunking change that lazy-loads something eagerly needed shows
up as a blank route, not a build error.

### 2.2 — Get content into the HTML

Adopt `vite-prerender-plugin` for the four SPAs that need no per-request server logic — it preserves
the SPA authoring model and costs one `prerender()` export per app. Reserve Vite+Nitro for any app
that genuinely needs per-request rendering.

**Reject** Vike (achievable more cheaply), TanStack Start (v1 RC, not stable, and its SPA mode
prerenders only a shell), and `@vitejs/plugin-rsc` (stability unverified — do not let anyone cite
"RSC in Vite is ready" without checking the npm page first).

**braden is the priority and its cause is not the images.** In order: `vercel.json` runs
`build:noprerender` so every marketing route is an empty root; then `Index.tsx:76-88` withholds the
entire tree — including the LCP `<img>` — behind `supabase.auth.getUser()` plus a role check, so an
anonymous visitor pays an auth round-trip to learn they are anonymous and the preload scanner never
sees the hero. Only then do the bytes matter.

**Acceptance:** measure **LCP subparts** (web-vitals attribution build), not just the score
([web.dev optimize LCP](https://web.dev/articles/optimize-lcp)) — TTFB, resource load delay,
resource load duration, element render delay. A client-rendered SPA's signature is a dominant
element-render-delay; that is the number that must fall.

### 2.3 — Kill the 1.82 MB logged-out double-boot

Vercel Routing Middleware makes the session decision at the edge, before either app boots. Add
`proxy.ts` (~40 lines) plus a `vercel.json` entry per app, and split the login route out of the main
vendor graph. Bundle Skew Protection into the same change — five lines, and it retires the
service-worker NetworkFirst workaround that exists only because the estate believed Vite could not
have it.

**Acceptance:** an unauthenticated request to `ideas.crm7.app` receives a redirect before any app
JS loads; total JS to render a login form is under 150 KB.

### 2.4 — Fonts and images

Preload only the one or two faces used above the fold, WOFF2, `font-display: swap`, and add
`size-adjust`/`ascent-override` fallback `@font-face` blocks in `@bsuite/theme` so all six apps
inherit CLS-free font swap ([Chrome font fallbacks](https://developer.chrome.com/blog/font-fallbacks)).
Drop legacy `.woff` duplicates. Never base64 a font.

Images: Vercel's optimisation endpoint works for non-Next apps via `/_vercel/image` plus a
`vercel.json` `images` block ([Vercel image optimization](https://vercel.com/docs/image-optimization)).
Build one shared `<Img>` in `@bsuite/ui` that generates `srcset` from the configured `sizes` array —
**a `w` value not in the list is an error**, so the wrapper must generate rather than accept. Add
`fetchpriority="high"` to the LCP image only, once the shell is prerendered.

braden specifics: 662 KB hero and a 458 KB logo rendered at 40 px, both `loading="eager"`, neither
carrying `Cache-Control` (`vercel.json` sets headers for `/assets/*` only, not `/images/*`), plus a
369 KB `placeholder-project.png` with zero references and a 458 KB byte-identical duplicate that is
never painted.

### 2.5 — INP

Wrap panels owning `setInterval`/subscriptions in React 19's `<Activity mode="hidden">`, which
**destroys Effects** rather than merely hiding the subtree
([React Activity](https://react.dev/reference/react/Activity)) — that is the fix for the always-on
5-second memory-monitor timer in crm7's `index.html`. Use `useTransition` for list filtering, tab
switches and route transitions; `useDeferredValue` for search inputs. Use `scheduler.yield()` for
non-React batch loops, never inside a React render path
([web.dev long tasks](https://web.dev/articles/optimize-long-tasks)).

**Reject `<ViewTransition>` for now** — it is Canary/Experimental, not in stable React 19.2, and
adopting it means moving apps off the stable channel, which conflicts with the dependency policy.

**On grid libraries as a CLS/INP source: do not act on research, measure.** No primary source
establishes it. Profile with React DevTools Performance Tracks and Chrome's Layout Shift overlay on
the actual dashboards before attributing anything to `react-grid-layout`.

---

## Phase 3 — The Airtable-class grid (`@bsuite/data-grid` v2)

The operator's tie-break made this the estate's flagship surface. crm7 has the winning generation;
conduit, BSU and throughput have nothing. Build to a defined bar, then adopt.

### 3.1 — Library decision

**TanStack Table v9** as the headless core. It shipped stable **2026-08-04** — thirteen days before
this plan — with a first-party `cellSelectionFeature` (rectangular ranges, drag selection), up to
**86% less retained JS heap** and 34–79% lower processing time than v8, MIT
([v9 announcement](https://tanstack.com/blog/announcing-tanstack-table-v9)). Range-selection state
was the hardest primitive to build correctly and it is now free.

**Reject AG Grid for the shared package.** Every capability in the Airtable bar — range select, fill
handle, clipboard, undo/redo — is Enterprise-only at **from $999 USD per developer per year**
([AG Grid pricing](https://www.ag-grid.com/license-pricing/)). Community would be a *downgrade* on
what crm7 already has. Keep it as the escape hatch if the build overruns.

**Reject Glide Data Grid.** Last release **v6.0.3, February 2024**, and its maintainers state
verbatim *"none of the primary developers are accessibility users so there are likely flaws"*
([repo](https://github.com/glideapps/glide-data-grid)). A canvas grid has no DOM for assistive tech
and this estate enforces WCAG 2.1 AA.

**Adapt AG Grid's *documentation* as the behavioural spec** — its fill-handle page is the best
written specification of fill semantics available, and it is free to read: single cell copies, Alt
increments numerics, multi-cell numeric sources extrapolate linearly, strings repeat cyclically,
range reduction clears, double-click auto-fills perpendicular, per-column `suppressFillHandle`
([AG Grid fill handle](https://www.ag-grid.com/react-data-grid/cell-selection-fill-handle/)).

### 3.2 — The architecture that makes C-1 structural

**Request-based writes only.** The grid never mutates its own row data; every edit, fill and paste
emits an edit-request the host applies — AG Grid's `readOnlyEdit` + `cellEditRequest` pattern, minus
the library. There is no internal-mutation mode to regress into.

**Acceptance:** grep the package for direct row mutation — zero hits. A host that ignores all edit
requests produces a grid where no cell ever changes, including after fill-drag and paste.

### 3.3 — The capability bar, in tiers

**Tier 0 (nothing below is safe without these):** request-based writes; server-supplied `is_writable`
per field derived from `has_column_privilege()`, unknown → read-only; two-mode keyboard model with
roving tabindex — exactly one grid element in the page tab sequence, Enter/F2 in, Escape out
([APG grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)).

**Tier 1 (the editing contract):** cell types + validators with `aria-invalid` and a live-region
message; per-cell optimistic update — `useOptimistic` for the transient in-cell affordance, TanStack
Query's cache approach as the source of truth, and **`cancelQueries` in `onMutate` is the step
everyone omits** and the reason an optimistic edit flickers back mid-flight
([TanStack optimistic updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates));
**multi-cell operations batch into one mutation** — a 200-cell fill is one request with one snapshot
and one rollback, not 200; range selection; the fill handle per §3.1's spec; multi-cell paste
parsing **`text/html` first with TSV fallback**, because naive `split('\n').split('\t')` corrupts
any cell containing a tab or newline — a real risk across 1,297 catalogue fields; bounded undo/redo
cleared on any structural change; **conflict detection with a row version rejected server-side**, so
two sessions editing one cell produce a conflict rather than a silent overwrite.

**Tier 2 (gates release):** full APG ARIA including `aria-rowcount`/`aria-colcount` reflecting the
**total** with `aria-rowindex` on every rendered cell — APG requires these *because* of dynamic
loading — plus a persisted **non-virtualised accessibility mode**. AG Grid's own accessibility page
tells you to disable virtualisation for screen readers; the most-invested commercial vendor declines
to claim a WCAG conformance level. Do not choose one — ship virtualisation on by default with
correct indices, and make the full-DOM mode an explicit user preference.

**Tier 3 (silent regressions):** never unmount the row holding the active editor or the selection
anchor; raise `overscan` (≥5) while editing — the default is **1**, so a focused cell can unmount
the instant it scrolls out, destroying the editor and the node roving tabindex depends on; set
`useCachedMeasurements` for grids inside tabs, because a hidden list makes ResizeObserver fire at
size 0 and **reset every measurement**
([TanStack Virtual](https://tanstack.com/virtual/latest/docs/api/virtualizer)).

**Acceptance per item** is in the research annexe; the load-bearing ones: source `[1,2]` filled down
4 → `[1,2,3,4]`; `['a','b']` → `['a','b','a','b']`; `[1,2]` with Alt → `[1,2,1,2]`; a 3×3 paste from
Google Sheets containing an embedded newline yields **9 cells, not 11**; revoking `UPDATE(col)` in
Postgres with no client change renders that column read-only with `aria-readonly="true"`.

### 3.4 — Adopt across the estate

conduit, BSU and throughput. BSU already owns the governance half — `ReportCatalogPanel` is the only
surface in six apps that promotes an entity into the catalogue the grid trusts — and that
relationship is documented nowhere.

---

## Phase 4 — Data correctness

### 4.1 — RLS, in this order (order matters; each gates the next)

1. Phase 0.1 and 0.2 (already done).
2. **Classify the remaining eight zero-policy tables.** Internal → revoke + relocate. Data-API-facing
   → policies.
3. **Build the two-tenant + anon pgTAP harness** using `basejump-supabase_test_helpers`. **Seed
   cross-tenant rows** — a read-denial test against an empty table passes vacuously. Write denials
   raise `42501` and are directly assertable with `throws_ok`; read denials return zero rows and need
   a known-populated fixture
   ([Supabase pgTAP extended](https://supabase.com/docs/guides/local-development/testing/pgtap-extended)).
   Scope to the ~40 tenant-identifying and financial tables first.
4. **Wrap the 70 initplan violations** in `(select auth.uid())`. Supabase's own benchmark:
   **179 ms → 9 ms**, and **11,000 ms → 7 ms** where the policy calls a security-definer helper
   ([Supabase RLS performance](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)).
   This is a §9.1 output-equivalence change — capture row sets per table per principal before, diff
   after, **the diff must be empty**.
5. **Add `TO authenticated`** to every policy defaulting to `public` — 170 ms → <0.1 ms for anon
   requests, which short-circuit at the role check.
6. **Consolidate the 68 multiple-permissive findings — but only within an identical
   `(cmd, roles, permissive/restrictive)` cell.** A naive merge is how a restrictive tenant guard
   becomes permissive: OR-ing a RESTRICTIVE policy into a permissive one converts an `AND` gate into
   an `OR` gate and **opens** access, and folding a `FOR ALL` policy into a `FOR SELECT` one silently
   drops write enforcement. **Acceptance: the allow/deny matrix from step 3 is byte-identical before
   and after. Any cell flipping deny→allow blocks the change.**
7. **Index the columns policies filter on** — a plain btree gives ~99.94%, "over 100x on large
   tables".
8. **Re-measure the 983 unused indexes only after 4–7**, because initplan wrapping and consolidation
   change plans and can convert an "unused" index into a used one. Require `idx_scan = 0` after a
   `pg_stat_reset()` and a full business cycle including a pay run and a month end.

### 4.2 — Close the migration-application gap

Ten surfaces error at runtime because a migration in the repo was never applied. Two gates:

- **A required CI check** running `supabase migration list --linked` that fails on any LOCAL-without-
  REMOTE row, plus `supabase db diff --linked` asserting an empty diff. The second catches drift the
  history table cannot see — a change applied out-of-band that the history table happily calls
  "applied" ([supabase migration list](https://supabase.com/docs/reference/cli/supabase-migration-list)).
- **An external freshness check.** `prod-migration-history-audit` has been red for three weeks and a
  failing workflow is indistinguishable from a passing one to anyone not looking. Assert from
  outside the workflow that it *succeeded* within 24 h.

**Do not use `migration repair` to fix the ten broken surfaces** — it marks a version applied without
running the SQL, converting a loud failure into a silent one.

Then apply the outstanding migrations and verify each surface renders.

---

## Phase 5 — The calculation engine

This is the largest single piece and it gates the host money view (D-94).

### 5.1 — Bitemporal rate store

Two axes, not one: **actual time** (when the rate applied) and **record time** (when we learned it).
A GTO recomputing a past charge rate for a dispute must reproduce the figure *as it was known when
the invoice was raised* ([Fowler, time narrative](https://martinfowler.com/eaaDev/timeNarrative.html)).
Single-axis `effective_from` cannot answer that.

Model validity as `daterange` with `EXCLUDE USING GIST (award_id WITH =, classification_id WITH =,
validity WITH &&)` plus `btree_gist`, so overlapping periods are impossible by construction rather
than by a test someone remembers to write
([PostgreSQL range types](https://www.postgresql.org/docs/current/rangetypes.html)). **Expect the
backfill to fail first — treat those failures as findings.**

Mirror MAPD's own shape: `operativeFrom`/`operativeTo` stored verbatim, alongside our `recorded_at`.
Note the trap the FWC documents — *"if the rate of pay has not changed from year to year… the
operative date will reflect the date from when it was last adjusted"*, so you cannot infer a change
from a date bump ([MAPD guide](https://www.fwc.gov.au/documents/awards/pay-database/modern-awards-pay-database-guide.pdf)).

**The 2026 Annual Wage Review is not a uniform multiplier.** 4.75% to the NMW and all award minimums,
NMW to **$1,004.90/week / $26.44/hour**, operative **1 July 2026** — *plus* a non-uniform structural
adjustment where C13 gets an extra one-third of the C13→C12 gap and C14 tracks C13, as stage one of
a three-stage C13 phase-out. **GTO apprentice rates key off exactly those C-bands.** An engine that
applies a flat 4.75% will be wrong for the classifications apprentices sit in. Load the new snapshot
as data; never scale last year's.

### 5.2 — Rules as versioned decision tables, not code branches

Fowler's warning about rules engines is that implicit control flow becomes unmaintainable, and that
"business people will maintain the rules" rarely works out — his recommendation is a *limited* engine
for a narrow context ([RulesEngine](https://martinfowler.com/bliki/RulesEngine.html)). An award
interpreter is exactly that narrow context.

Build an in-house decision-table evaluator: rules as versioned, effective-dated Postgres rows,
explicit hit policy, **no chaining**, unmatched input **raises** rather than defaulting. Borrow DMN's
decision-table structure and hit-policy vocabulary as a documentation convention; do not adopt a DMN
product.

**What fails at audit is neither the engine nor the code — it is a rule whose applicability you
cannot demonstrate, because it was an `if` branch in a deploy nobody can date.**

### 5.3 — Provenance is statutory, and the regulator has already specified the schema

Fair Work Regulations reg 3.33 requires records of the rate, gross and net, plus details of any
"incentive-based payment, bonus, loading, penalty rate, monetary allowance or separately identifiable
entitlement"; reg 3.34 requires overtime hours **and** the overtime rate
([Fair Work Regulations 2009](https://www.legislation.gov.au/F2009L02356/latest/text)). STP Phase 2
independently requires gross to be disaggregated into Gross / Paid leave / Allowances / Overtime /
Bonuses and commissions / Directors' fees / Lump sum W / Salary sacrifice
([ATO disaggregation of gross](https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/single-touch-payroll/in-detail/single-touch-payroll-phase-2-employer-reporting-guidelines/reporting-the-amounts-you-have-paid/disaggregation-of-gross)).

Two regimes independently forbid a single gross figure. Every emitted line carries
`{rate, rate_source, operative_from, operative_to, snapshot_version, rule_id, hours, computed_at}`,
all `NOT NULL`.

**Acceptance:** components sum to gross to the cent; every component maps to exactly one STP2 code;
a recompute driven **only** from a stored line's provenance reproduces that line's amount exactly.

### 5.4 — Wire the engine (W-2), then close the awards

The engine is unreachable: 112 of 179 modules, and the repo's own gate prints *"21 awards are
MODELLED and one is REACHABLE"*. Wiring it is the prerequisite for `resolvePenalties` (20 of 21
awards currently price with an empty penalty table — the estate's largest under-payment exposure),
for the provenance ladder, and for the 37 rate-scope partials.

Merge `718cebd` to R80.4 `main` first — MA000017 offers 0 of its 26 allowances including an
all-purpose one, and it is already fixed on `development`.

### 5.5 — Test it like money

`fast-check` for properties, plus a golden corpus of real historical pay periods with committed
expected outputs. The invariants: **conservation** (components sum exactly; allocation distributes
the remainder without creating or destroying cents); **monotonicity** (a higher base never yields a
lower gross); **round once at the boundary** (assert no intermediate is pre-rounded); **oracle**
(new engine matches the old on the same inputs — §9.1 output-equivalence, and precisely the use
Hypothesis names as "implementation comparison"); **idempotence** (recomputing a period twice is
byte-identical). ≥10,000 runs with a persisted counterexample corpus.

### 5.6 — Legal posture on MAPD data

The FWC licenses MAPD under CC-BY with a **no-redistribution clause plus an indemnity**, and reserves
the right to terminate access **without notice**
([FWC terms of use](https://developer.fwc.gov.au/terms-of-use)). A GTO SaaS quoting charge rates to
host employers *is* passing MAPD-derived data to third parties. So: attribute FWC + CC-BY on every
surface displaying derived rates, carry the "read in conjunction with the modern award" caveat into
quote documents, expose **derived** rates only — never a raw dump or a proxy endpoint. Get legal
review. And because termination-without-notice plus an unpublished rate limit make unavailability a
normal operating state, C-4's three modes are not defensive engineering, they are the operating model.

---

## Phase 6 — The unreachable-code decision

~200 files across five repos. Each is **wire it** or **delete it**; there is no third state, and
leaving them is what makes every audit cost this much. R80.4's engine is the exception — that is
Phase 5.4, a genuine project.

Everything else is a one-line decision per item: braden's ~60-file Site Editor tree (superseded by
`@bsuite/page-builder` — delete), throughput's entire `components/navigation/` tree (the code says
*"none of which are mounted"* — wire or delete), BSU's 13 dead `uplift/` exports including a complete
Cmd+K palette (wire — two BSU docs record it as not existing), crm7's `adobe-sign-webhook` (delete —
it contradicts crm7#1476), the dead DDL.

**Acceptance:** a CI check that fails on a new export with zero non-test, non-barrel importers.

---

## Phase 7 — Documentation repair

71 documents. Five are urgent because they actively mislead: the four cookie-SSO assertions (they
point at the estate's loudest forbidden pattern); BSU's four "canonical page-builder surface" claims
plus the plan instruction to delete the three files that are the *surviving* generation; crm7's
`xero-node` ADR contradicted by shipped code (supersede with a new ADR — do not edit the old one);
the "table does not exist, every operation errors" phrasing that invites deleting a table whose DDL
is in the repo; throughput's five empty component templates.

Then: regenerate or delete every `STACK-AUDIT` / `CONSISTENCY-REPORT` / `FEATURE-SURFACE` /
`PARENT-DOCS` mirror — they are the most-read and least-accurate files in the estate. Then fix the
index integrity in all seven repos.

**And record what shipped.** conduit's Cache Components architecture, BSU's uplift system and
database console, crm7's `dashboards.definition` — none of it is written down anywhere.

---

## 8. Gates

| Gate | Condition |
|---|---|
| **G0** | Phase 0 complete. No live exposure remains open. |
| **G1** | `<DataState>` shipped, all 11 sites replaced, all four enforcement layers green. **No new data surface may be built before this gate.** |
| **G2** | crm7 mobile Lighthouse ≥ 0.85 with LCP subparts recorded; braden ≥ 0.80; the logged-out double-boot is under 150 KB. |
| **G3** | `@bsuite/data-grid` v2 passes Tier 0–2 acceptance, adopted in ≥1 sibling app. |
| **G4** | pgTAP allow/deny matrix green across the ~40 priority tables; initplan violations 0; migration drift gated in CI with an external freshness check. |
| **G5** | Golden corpus + property suite green; every emitted line carries full provenance; C-4's three modes enforced structurally. |
| **G6** | Zero exports with no importer, estate-wide, enforced in CI. |
| **G7** | Zero documents asserting a superseded architecture. |

Every PR carries the `## Evidence` block (FF-SELF-VALIDATION-20260507) and a `## Class sweep` block
with a stated surface count.

---

## 9. Requires an operator ruling before the phase starts

1. **Do the 20 unbuilt parity gaps survive D-93–D-98?** Three of those specs predate the portal
   rulings. Blocks any parity work.
2. **ADR-0007 (Stripe FDW) — applied or retired?**
3. **Is `award_rates` meant to be populated in the database, or is R80.4's static corpus the
   record?** Blocks Phase 5.1's storage decision.
4. **A PSI/CrUX API key** — free, gives field Core Web Vitals for all six apps. Blocks G2's field
   verification.
5. **Nitro for the Vite apps** — beyond the four that only need build-time prerendering. Five-app
   migration; Phase 2.2 assumes *no* for now.
6. **AG Grid Enterprise as a fallback** if Phase 3's build overruns — from $999/dev/yr, and the two
   AG Grid pages contradict each other on whether licences are perpetual. Confirm with sales before
   modelling cost.

---

## 10. What this plan does not settle

No browser was driven against an authenticated route in any app, so every visual and runtime claim
in the register remains lab-and-static. The MAPD API's technical surface — auth header, rate limits,
quotas, versioning, and whether it exposes an as-at date parameter — could not be read; the developer
portal is a JS-rendered shell behind a login. Fair Work's **retention** period sits in the Act
(s535/s557C), not the regulations retrieved, so verify before writing "seven years" into any policy.
TanStack Table v9 is thirteen days old with no community track record for v9 + editing +
virtualisation together, and its `cellSelectionFeature` API surface could not be read — check the
source before committing Tier 1 items 7 and 15. And no primary source establishes a fail-closed rule
for payroll calculators specifically; C-4 is constructed from the Fair Work record-keeping
obligations plus the FWC's own caveat, and is a defensible position rather than a cited rule.
