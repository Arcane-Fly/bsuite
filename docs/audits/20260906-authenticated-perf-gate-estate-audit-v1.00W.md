---
kind: record
authority: none
owner: bsuite
evidence:
  - crm7/lighthouserc.json
  - crm7/scripts/lighthouse-auth.cjs (planned)
  - crm7/scripts/__tests__/lighthouse-auth-guard-parity.test.ts (planned)
  - crm7/.github/workflows/lighthouse-ci.yml
  - crm7/scripts/ci/resolve-supabase-branch.sh
  - crm7/tests/e2e/support/project-guard.ts
  - crm7/tests/e2e/auth.setup.ts
  - business-suite-unified/lighthouserc.json
  - braden/lighthouserc.json
  - throughput/lighthouserc.json
  - R80.4/lighthouserc.json
---

# Every Lighthouse gate in the estate measures a page the field score barely weights

**Date:** 2026-09-06 · **Status:** W (Working) · **Issue:** bsuite#2581 · **Reference implementation:** crm7#2507

## The finding

Seven repositories, **166 workflow files** enumerated, six Lighthouse configurations.
**Not one of them measured an authenticated screen.** Before crm7#2507, no config in
the estate carried an auth hook of any kind — no `puppeteerScript`, no
`extraHeaders`, no `disableStorageReset`.

That is not a small blind spot. crm7's Speed Insights for the last 7 days (Desktop,
Production) read **RES 85, LCP P75 4.04 s** against **FCP P75 1.53 s**. The largest
paint lands roughly **2.5 s after first paint** — a data-dependent element that only
exists once a session does. A local desktop Lighthouse on the signed-out root scores
**0.95**. Both numbers are correct. They describe different pages.

So `lighthouse = SUCCESS` on every crm7 PR was true and uninformative: the gate was
green by construction, on a surface the field score barely weights.

## The sweep

**Method.** `find <repo>/.github/workflows -maxdepth 1 -type f \( -name '*.yml' -o
-name '*.yaml' \)` per repo for the denominator; `grep -rlE "lighthouse|lhci"` over the
same directories for the gate count; each `lighthouserc.json` parsed and its
`collect.url` / `collect.staticDistDir` printed rather than summarised.

| Repo | Workflow files | LH workflows | `lighthouserc.json` | What it measures |
|---|---:|---:|---|---|
| bsuite (parent) | 109 | 1 | — | no app surface of its own |
| business-suite-unified | 12 | 1 | yes | 7 prerendered public routes, incl. `/login` (the public form) |
| crm7 | 16 | 1 | yes | `http://localhost:4310/` — **signed-out root only** |
| conduit | 9 | 1 | generated at CI time | public job/marketing routes; `/auth/{login,register}` dropped as "pure redirectors" |
| braden | 8 | 1 | yes | 5 public marketing routes |
| R80.4 | 4 | **0** | yes | `http://localhost:4320/` — **config exists, nothing runs it** |
| throughput | 8 | 1 | yes | `/pricing` |
| **Total** | **166** | **6** | **5 committed + 1 generated** | **0 authenticated** |

Two separate defects fall out of this table:

1. **Six gates measure public surfaces.** Every one is a real gate that really runs
   and really passes — and none can see the metric that is actually red.
2. **R80.4's gate does not run at all.** `R80.4/lighthouserc.json` is referenced by no
   workflow and no `package.json` script. It is a configuration file with no consumer:
   the appearance of a gate, with none of the function. Filed separately below.

## Why nobody had fixed it — and why the reason was half right

Signing in during CI is genuinely hard here, and the estate had already concluded it
was impossible. crm7's own `CLAUDE.md` says so:

> `/auth/login` cannot be audited by a live-navigation tool (Lighthouse, prerender,
> etc.) … Any tool that does a real browser navigation to `/auth/login` and expects a
> scorable page (Lighthouse CI included) will hit `ERRORED_DOCUMENT_REQUEST`; audit
> `/` instead.

That is **correct about navigation and wrong about the conclusion**. `/auth/login` is a
redirect shim to BSU's OAuth hub on another origin, which hands back to
`{origin}/auth/callback`; Supabase matches `redirect_uri` byte-exactly, and an
ephemeral CI origin cannot join that list. No flag or query parameter avoids it —
`--blocked-url-patterns` does not stop a main-frame navigation.

But *driving the login form* was never the only way in. `crm7/tests/e2e/auth.setup.ts`
had already solved this for the E2E suite: a **direct Supabase password grant seeded
into `localStorage`**, no third-party hop and no redirect-URI registration. The
mechanism was sitting in the same repository, proven in CI, for months. The reasoning
that produced "audit `/` instead" stopped one step early, and the note explaining the
absence is what stopped anyone measuring it again.

## The recipe

crm7#2507 is the reference implementation. Four parts, in order of how easily each is
got wrong:

1. **Seed, do not drive.** A password grant into the app's own storage key. Reuse the
   E2E helper rather than re-deriving it.
2. **`settings.disableStorageReset: true`.** Lighthouse clears storage between runs by
   default. Without this the seeded session is wiped and the gate quietly audits the
   login redirect — looking authenticated while measuring nothing.
3. **Resolve a non-production database, before the build.** Vite bakes
   `VITE_SUPABASE_URL` in at build time, so the bundle and the auth hook must agree on
   the project. Call the same `crm7/scripts/ci/resolve-supabase-branch.sh` the E2E job uses, and the
   same `crm7/tests/e2e/support/project-guard.ts`, so the two cannot drift.
4. **Assert a content marker, never a title.** This is the part that decides whether
   the gate is real.

### The fourth part is the whole game

A fast signed-out page **scores well**. So does an Access-Denied card. So does a
spinner. Any failure to establish the session produces a *better* score, not a worse
one — which means a gate that skips silently goes green precisely when it stops
measuring the thing it exists to watch.

This is not hypothetical, and it is not new. crm7#1157 and the 2026-08-17
reproduction in `crm7/tests/e2e/wcag-aa.spec.ts` both recorded audits **passing with zero violations
against PermissionGate's "Access Denied" card**, because `useDocumentTitle` runs in
`ProtectedRoute` before every branch — the real page, the spinner and the error card
all report an identical `document.title`.

**It fired twice more while crm7#2507 was being built.** With Supabase misconfigured,
`/contacts` reported `document.title === "Contacts | CRM7"` while rendering a
Configuration Error card. And an invented `crm7-impersonation` payload shape parsed
cleanly while yielding no tenant override at all. Both times the marker check refused;
a title check would have scored both and reported green.

So: every authenticated route in a perf gate needs a `data-testid` that **only the real
page renders**, and the hook must **throw** when it is absent. `/contacts` and
`/leads` already carry one. `/deals`, `/reports`, `/clients`, `/people` and
`/apprentices` carry none — adding them is the prerequisite for widening this gate.

## What the new gate can already see

First authenticated lab run of a crm7 signed-in route (3 runs, desktop preset, local
database, build asset `index-BDVmcETz.js`). **Lab numbers, not field P75:**

| URL | perf | LCP | FCP | CLS |
|---|---:|---:|---:|---:|
| `/` (public) | 0.73 | 2479 ms | 2383 ms | 0.000 |
| `/contacts` (authenticated) | 0.72 | **2858 ms** | 2057 ms | **0.099** |

- The **LCP-after-FCP gap reproduces in the lab** — ~800 ms, the same signature as the
  field's 1.53 → 4.04 s.
- **CLS 0.099 against 0.000.** The signed-in list shifts layout as data arrives.
  Nothing in CI had ever measured this, on any app.

## Bite evidence

A perf gate added but never seen to fail is the same defect one level up. The strongest
evidence here is not a contrived bite — it is that **the first working run of the new
gate went red on the operator's actual problem**, at a threshold set before the number
was known.

```
[lh-auth] Project guard passed — fyenkvxpzznpfsgcgyup, not production.
[lh-auth] /contacts verified authenticated — [data-testid="contacts-page"] present.
  ✘  largest-contentful-paint failure for maxNumericValue assertion
        expected: <=4000
           found: 4104.58609378052
```

**LCP 4104 ms on an authenticated route in CI**, against the reported field P75 of
**4.04 s**. No CI job in this estate had ever measured that route.

| Direction | Condition | Result |
|---|---|---|
| **RED** | `/contacts` budget 4000 ms, in CI | **fail** — `found: 4104.59` |
| **GREEN** | budget 4500 ms (committed ratchet), in CI | **pass** — `All results processed!` |
| RED | budget 1500 ms, locally | exit 1 — `found: 2690.33` |
| RED | credentials absent | REFUSED, named |
| RED | pointed at production | REFUSED, named |
| RED | unparseable Supabase URL | REFUSED, named |
| RED | route without its content marker | REFUSED — fired twice, live |
| **CONTROL** | a public URL | **proceeded** — the refusals are not "refuse everything" |

The committed budget is a **ratchet just above today's measurement, not a target** — it
bites on further regression without blocking on the pre-existing one, and comes down as
the LCP is fixed. Same shape as crm7's existing lint and test-typecheck ratchets.

### Four CI failures on the way, each a real gap

Every one refused rather than quietly measuring the wrong page:

1. **exit 127** — the branch resolver needs the `supabase` CLI, which the Lighthouse job
   did not install.
2. **`Chrome installation not found`** (twice) — setting `puppeteerScript` sends LHCI
   down a Chrome-resolution branch that *throws* rather than falling back to the system
   install (`@lhci/cli src/utils.js:56`). `CHROME_PATH` is checked before that branch.
3. **`password grant failed: HTTP 400 (invalid_credentials)`** — a freshly provisioned
   branch has the fixture *tenants* from `crm7/supabase/seed.sql` but not the fixture *users*;
   `auth.users` is GoTrue's and a hand-inserted row cannot authenticate.
4. **The real LCP.**

Failure 3 is the one worth pausing on: the guard cleared the **branch** project, never
production, and the hook then **refused** rather than auditing the signed-out shell.
Fail-closed working against a real misconfiguration, not a drill.

## Open items

| # | Item | Owner |
|---|---|---|
| 1 | **R80.4's `lighthouserc.json` is wired to nothing.** Add a workflow or delete the file — a config with no consumer reads as coverage that does not exist. | R80.4 |
| 2 | Add page-level `data-testid`s to `/deals`, `/reports`, `/clients`, `/people`, `/apprentices` so the crm7 gate can widen past `/contacts`. | crm7 |
| 3 | **Lower the `/contacts` LCP ratchet from its committed 4500 ms toward the 4000 ms target.** 4500 is what `crm7/lighthouserc.json` carries — deliberately just above today's 4104.59 ms so the gate is green on arrival and cannot be waved off as noise. 4000 ms is the target, and it is the value today's measurement FAILS, which is how the bite was demonstrated. **Trigger, so this is a ratchet and not a permanent exemption wearing a gate's name:** once 10 consecutive `development` runs have recorded a `/contacts` LCP, take the P75 of those runs, set the budget to it, and repeat. Whoever lands an LCP improvement lowers it in the same PR. If 10 runs show a spread wider than 500 ms, fix the variance before tightening — a ratchet on a noisy signal only teaches people to re-raise it. | crm7 |
| 4 | Consider a CLS assertion on the authenticated route — 0.099 vs 0.000 is the largest gap the new gate exposed, but one measurement is not a threshold. | crm7 |
| 5 | Port the recipe to BSU, conduit, braden and throughput. Each needs its own content markers first. | per app |
| 6 | **Fix the authenticated LCP itself.** crm7#2507 builds the instrument and pins a ceiling; it does not make `/contacts` faster. ~4.1 s in CI is the number to bring down, and the ratchet comes down with it. | crm7 |
| 7 | **A like-for-like production run is still unavailable.** CI's 4104 ms is a seeded branch database. It lands within noise of the 4.04 s field P75, which is suggestive rather than proof the same cause dominates both — and `assertNonProductionProject` correctly refuses to point a harness at production, so this should not be faked. | crm7 |

## Related, and deliberately not fixed here

**crm7#1628 is closed as measured, not implemented.** Fed 1000 rows,
`EnhancedDataTable` puts **25** in the DOM (`rowPaginationFeature` +
`createPaginatedRowModel()`; in TanStack Table v9 `getRowModel()` *is* the terminal page
slice, verbatim in the installed `table-core@9.2.4`). There are **33** non-test
importers, not 95.

**Where the 95 came from**, because a refuted number that is only *contradicted* gets
re-derived next month:

```
grep -rlE "<Table\b|<table\b" src/ --include=*.tsx \
  | grep -vE '(__tests__|\.test\.|\.spec\.)' | wc -l     ->  95
```

It is the count of non-test `.tsx` files containing table **markup**, and exactly
**three** of those also import `EnhancedDataTable` — because a page using the component
does not hand-write `<Table>`. The number was real and honestly obtained, then attached
to the wrong subject.

**Two corrections to this record's own first draft**, both found in review:

- "All 33 call sites use the 25-row default" was **false**. `crm7/src/pages/people/index.tsx:616`
  sets `manualPagination`, where v9 deliberately returns the *pre*-paginated model. That
  route is bounded by `createEntityStore`'s `.range(from, to)`
  (`crm7/src/stores/peopleStore.ts:15`, `defaultPageSize: 25`) — **a different mechanism
  from the one the new guard asserts, and one nothing guards.** Delete that `.range()`
  and `/people` renders everything it fetched while the guard stays green.
- The issue's named routes were right about the **top-level** routes and wrong about the
  families: `/reports/deliveries` and `/reports/schedules` *are* `EnhancedDataTable`
  routes. `/deals` and `/reports` themselves render `@bsuite/data-grid`'s `DataGrid`,
  which already virtualises both axes, and `/workflows` renders no table.

The "react-virtual imported in exactly one file" count that motivated the issue was
taken over `crm7/src` alone and missed the shared package in `node_modules` — the same
indirection hazard that makes a `.from()`-style grep miss the **96** files carrying a
`createEntityStore<` call (100 occurrences; `grep -rl 'createEntityStore<' crm7/src/`
minus tests). An earlier draft of this record said "97 stores", which was
`grep -rl createEntityStore crm7/src/stores/` *including tests* — a mention count in one
directory, not a store count.

**Still UNKNOWN, and to stay that way until measured:** which element is the LCP element
on an authenticated list page. Nobody has driven a browser against a deployed signed-in
instance and read it. The argument that the table is not that element rests on
architecture, not observation — and `/contacts` *is* an `EnhancedDataTable` page, so it
earned the argument rather than a dismissal. The gate this record is about is what will
settle it.

Detail and the guard test are in crm7#2507.
