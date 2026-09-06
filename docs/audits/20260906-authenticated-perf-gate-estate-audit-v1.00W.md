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

Seven repositories, **166 workflow files** enumerated, six Lighthouse configurations, **five** of which actually run.
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
| bsuite (parent) | 109 | 0 | — | no app surface of its own; its one grep hit is `theme-conformance.yml`, whose only mention of Lighthouse is a comment about **excluding** `.lighthouseci` output from a scanner |
| business-suite-unified | 12 | 1 | yes | 7 prerendered public routes, incl. `/login` (the public form) |
| crm7 | 16 | 1 | yes | `http://localhost:4310/` — **signed-out root only** |
| conduit | 9 | 1 | generated at CI time | public job/marketing routes; `/auth/{login,register}` dropped as "pure redirectors" |
| braden | 8 | 1 | yes | 5 public marketing routes |
| R80.4 | 4 | **0** | yes | `http://localhost:4320/` — **config exists, nothing runs it** |
| throughput | 8 | 1 | yes | `/pricing` |
| **Total** | **166** | **5** | **5 committed + 1 generated** | **0 authenticated** |

**A note on the denominator, because it caught the estate's own recorded failure mode.**
The agent that first ran this sweep reported **162** workflow files; re-running it
reported **166**. The difference resolves exactly: `109+12+16+9+8+8 = 162` — the first
pass **omitted R80.4**, the very repo this audit singles out for having a gate that runs
nowhere. That is the recorded lesson *the app list is `.gitmodules`, not the five you
remember*, reproducing inside an audit whose subject was incomplete coverage. The count
in the table above is the re-run, enumerated per repo with the command stated; the
omission is recorded rather than quietly corrected, because a count that changed by four
without explanation is the kind of thing that gets re-litigated later.

Two separate defects fall out of this table:

1. **Five gates measure public surfaces.** Every one is a real gate that really runs
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
**The chronology is sharper than "nobody noticed".** That seeding landed in
`287420b45` on **2026-08-17**. The CLAUDE.md note concluding "audit `/` instead" landed
in `71628baec` on **2026-08-18** — the next day, in the very commit that added the
Lighthouse gate. The solution and the note declaring the problem impossible were
written within a day of each other, in the same repository.

(An earlier draft of this record said the mechanism had been "proven in CI for months".
That was false, and appears transposed from the other side of the source sentence, where
`crm7/tests/e2e/auth.setup.ts` says the *broken* version had been reporting green for
months.)

The reasoning that produced "audit `/` instead" stopped one step early, and the note
explaining the absence is what stopped anyone measuring it again.

## The recipe

crm7#2507 is the reference implementation. Four parts, in order of how easily each is
got wrong:

1. **Seed, do not drive.** A password grant into the app's own storage key. Reuse the
   E2E helper rather than re-deriving it.
2. **Name the aggregation statistic.** `aggregationMethod` defaults to `optimistic`,
   which for a `maxNumericValue` assertion is `Math.min` — the budget is checked against
   the *best* run, not the typical one. A threshold without its statistic is not a
   threshold. (`disableStorageReset` is **not** needed and was removed: lighthouse's
   default `clearStorageTypes` is
   `['file_systems','shader_cache','service_workers','cache_storage']` and
   `local_storage` is not among them, so a seeded session was never at risk. An earlier
   draft of this record called it load-bearing — a plausible mechanism attached to a real
   setting is still an invented one.)
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

This is not hypothetical, and it is not new. Two recorded instances — and they are
**different instances of one class**, so do not collapse them:

- **crm7#1157** ("WCAG e2e suite is vacuous"): the suite ran against an app with no
  Supabase configuration, so every route rendered the config-error page and axe scanned
  *that* — **99 violations**, every `relatedNode` a `data-testid="auth-config-error"`.
  Wrong screen, **loud** result.
- **The 2026-08-17 reproduction** in `crm7/tests/e2e/wcag-aa.spec.ts`: with a session
  whose role lacked `view_contacts`/`view_leads`, four audits passed with **zero
  violations** against PermissionGate's "Access Denied" card, because `useDocumentTitle`
  runs in `ProtectedRoute` before every branch and the real page, the spinner and the
  error card all report an identical `document.title`. Wrong screen, **quiet** result —
  the more dangerous of the two.

(An earlier draft of this record attributed the second instance's particulars to #1157.
Same class, different facts.)

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

**On `/` scoring 0.73 here and 0.95 earlier in this record:** same surface, 22 points
apart, and the difference is measurement conditions, not the page. The 0.95 was a quiet
desktop machine; the 0.73 is the median of `{0.88, 0.70, 0.73}` taken on a box
simultaneously running Docker Postgres and a TLS proxy for this exercise. Both are lab
numbers and neither is the field score. It is also why the public route's assertions
were left on `optimistic` — switching them to the median would have turned a
pre-existing, unrelated gate red at its 0.75 floor.

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

**The number was right and the statistic was wrong.** `aggregationMethod` was unset, so
LHCI defaulted to `optimistic` — for a `maxNumericValue` assertion that is `Math.min`
(`@lhci/utils` `src/assertions.js:139`, `:65-67`). The 4104 ms was the **best of
{6206, 4104, 5757}**; the **median was 5757 ms**, which fails the 4500 that was then
committed. A later run on the same branch failed at **4939.86 ms** — still a `Math.min`.

So the gate as first committed was green on its luckiest run and red on ordinary
variance, which reads as flakiness and gets a threshold **raised** rather than a page
fixed. It now names its statistic (`median` on `/contacts`, `numberOfRuns` 3 → 5), and
the budget is re-derived from that.

**This also retracts a claim.** An earlier draft said CI's 4104 ms "lands within noise of
the 4.04 s field P75". That resemblance was an artifact of the optimistic aggregation:
under the median the CI figure is ~5757 ms and the resemblance disappears. CI is a
slower environment than production, and the gate's job is regression detection **in its
own environment**, not agreement with field numbers. No CI job in this estate had ever
measured this route at all.

| Direction | Condition | Statistic | Result |
|---|---|---|---|
| **RED** | `/contacts` budget 4000 ms, in CI | optimistic (`Math.min`) | **fail** — `found: 4104.59` |
| **GREEN** | budget 4500 ms, in CI | optimistic (`Math.min`) | **pass** |
| **RED again, on variance** | same budget, later run | optimistic (`Math.min`) | **fail** — `found: 4939.86` — the reason the statistic had to change |
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
| 3 | **Lower the `/contacts` LCP budget, and understand that nothing lowers it for you.** The committed value is `maxNumericValue` with `aggregationMethod: median` over 5 runs — the statistic is part of the threshold and must be quoted with it. **This is NOT wired to `scripts/lib/ratchet.mjs`:** there is no baseline file, no scheduled workflow, and — the limb that matters — **no failure on an unbanked FALL**. crm7's test-typecheck ratchet fails when the number improves and is not re-banked; that is what forces it down. This has no such limb, so if `/contacts` improves to 3000 ms everything stays green and the slack silently absorbs a future 1500 ms regression. **The descent is MANUAL.** Whoever lands an LCP improvement lowers the number in the same PR; whoever reviews that PR checks they did. A comment stating an intention is not a control, and this row is the honest label rather than a claim to be a ratchet. Wiring it properly is its own task. | crm7 |
| 4 | Consider a CLS assertion on the authenticated route — 0.099 vs 0.000 is the largest gap the new gate exposed, but one measurement is not a threshold. | crm7 |
| 5 | Port the recipe to BSU, conduit, braden and throughput. Each needs its own content markers first. | per app |
| 6 | **Fix the authenticated LCP itself — crm7#2508.** crm7#2507 builds the instrument and pins a ceiling; it does not make `/contacts` faster. The number to bring down is the **~5.7 s median** (not the 4.1 s optimistic figure), and the ~2100 ms run-to-run spread has to come down first — a threshold on a signal that noisy mostly teaches people to raise it. | crm7 |
| 7 | **A like-for-like production run is still unavailable,** and the resemblance that once seemed to justify one is gone. CI measures a seeded branch database on a slower machine; under the median it reads ~5.7 s against a 4.04 s field P75. `assertNonProductionProject` correctly refuses to point a harness at production, and this should not be faked. | crm7 |
| 8 | **`/people`'s row bound is `createEntityStore`'s `.range()`, and nothing guards it — crm7#2509.** It sets `manualPagination`, so the guard shipped in crm7#2507 asserts the wrong mechanism for that route and would stay green through the regression. | crm7 |
| 9 | **Which element is the LCP element on an authenticated list page — crm7#2508.** Never observed. Answer it before optimising anything. | crm7 |

## Related, and deliberately not fixed here

**crm7#1628 is proposed for closure as measured, not implemented — it is still OPEN, and so is the PR that would close it.** Fed 1000 rows,
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
