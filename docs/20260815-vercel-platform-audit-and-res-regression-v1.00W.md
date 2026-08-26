# Vercel platform audit + the crm7 Real Experience Score regression

> ## ⚠ ITEM IDENTIFIERS RENUMBERED — 2026-08-17: `V-n` → `VP-n`
>
> **This document's findings were originally numbered `V-1`…`V-8`. They are now `VP-1`…`VP-8`.**
> Renumbering is 1:1 and order-preserving — `V-3` here became `VP-3`, and so on for all eight.
>
> **Why.** `docs/20260814-estate-remaining-work-register-v2.00F.md` uses `V-1`…`V-11` for its
> *verification-integrity* items, and that register is the estate's canonical remaining-work
> index. Two live registers were sharing one identifier namespace: a bare "V-3" meant the dead
> production migration-history audit in one document and Enterprise-only WAF managed rulesets in
> this one, and an agent would resolve it to whichever register it had read last.
>
> **This document moved, not the register** — measured, not assumed. These identifiers had
> **zero citations anywhere outside this file** (swept across the parent repo, all six
> submodules and both Vercel agent skills, each with a positive control). The register's
> `V-1`…`V-11` had **22 citations in `20260817-estate-completion-ledger-v1.00W.md` alone**, which
> is the authoritative status document and which deliberately preserves the register's
> identifiers. Moving the cited set would have invalidated live references; moving this one cost
> nothing.
>
> **A distinct prefix rather than a renumber into `V-12`…`V-19`.** Continuing the register's
> integer series would have removed today's ambiguity while implying these are one series — a
> future reader meeting "V-15" would still have to guess which document defines it. `VP-` makes
> the two namespaces structurally disjoint, so no integer collision between them is possible
> again, and a bare "VP-3" identifies its own register.
>
> **If you hold an old citation:** any `V-n` sourced from *this* document maps to `VP-n`. Any
> `V-n` sourced from anywhere else is the register's verification-integrity item and is unchanged.

**Document:** `docs/20260815-vercel-platform-audit-and-res-regression-v1.00W.md`
**Date:** 2026-08-15 · **Version:** 1.00W · **Status:** W — Working
**Item identifiers:** `VP-1`…`VP-8` (renumbered from `V-1`…`V-8` on 2026-08-17 — see banner above)

**Scope.** Every Vercel URL the operator supplied (≈90, across Agent Stack, Core Platform,

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Security, Tools, Frameworks, SDKs, Build, Learn, Explore, Company, Legal and Social) plus the
docs behind each, read in full. Then the six-app estate measured against what those docs
prescribe. Then the crm7 Real Experience Score fall from 99 to 71 investigated against code,
deploy history, live SQL and CI.

**Measurement basis, stated up front because it bounds every claim below.** Lighthouse 13.4.1
+ Chrome 152 run locally against all six production URLs, mobile and desktop; crm7 mobile is
a median of three. Payload figures from fetching every subresource. **No field data.** The
PageSpeed Insights API returns HTTP 429 with `quota_limit_value: 0` from this estate's
egress, and the CrUX API returns 403 to unregistered callers. Speed Insights is purchased for
crm7 only. So the numbers here are lab numbers, and where the answer needs field data I say so
rather than substituting a lab number for it.

---

## 1. The RES question, answered directly

**Vercel did not change the scoring.** A changelog, docs-revision and blog sweep over
2026-06-01 → 2026-08-14 found no announced change to RES weighting, thresholds, percentile,
sampling, or the reference distribution. The two platform changes in the window are a
2026-07-13 cost-efficiency improvement (explicitly no scoring effect) and a 2026-07-17 CDN
optimisation for immutable assets that is **gated to Next.js 16.3+** and does not reach a Vite
SPA. Chrome's own CrUX release notes say "no significant updates" for July. A third-party blog
claiming a June INP methodology change contradicts the primary source and was discarded.

**So the cause is on our side. There are four candidates and they are not equally likely.**

**Candidate 1 — the traffic mix moved, and we moved it.** crm7's production changed exactly
twice in the window: a 52-commit promotion on 2026-08-13 and a 3-commit promotion on
2026-08-14. Before that, production was static. Inside those promotions:

- **45 previously-unreachable pages were wired into navigation** (crm7#1732). Those pages
  were reachable only by typing a URL; now they are reachable by clicking. Every one of them
  is an authenticated, data-heavy surface. RES is a P75 over *whatever people load*. Making
  heavy pages reachable moves the sample without any page getting slower.
- The D-84 Word-document editor and the D-79 report builder shipped — both large, both new
  destinations.

**Candidate 2 — the measured population shifted toward cold loads.** `vite-plugin-pwa` is
configured `registerType: 'autoUpdate'` with `skipWaiting: true` and `clientsClaim: true`.
Every new deployment takes over open tabs immediately and reloads them. **There were 20
deployments in 48 hours on 13–14 August.** Each forced reload is a fresh hard navigation and
therefore a new cold-load data point, and cold loads are the slow ones. This is the most
under-appreciated of the four, because it makes a *deployment cadence* look like a *code
regression*.

**Candidate 3 — a metric that was never scored became the low scorer.** RES retired FID and
replaced it with INP at the same 30% weight, and raised CLS from 15% to 25%. FID measured only
the first interaction; INP measures the worst one. crm7's lab TBT is 53 ms and lab CLS is 0,
which argues against this — but lab is not field, and INP is a field-only metric in practice.
**Check the per-metric panel before accepting any other explanation.**

**Candidate 4 — the card-unglue work.** Between 13 and 15 August, five crm7 surfaces were
converted from one packed `CanvasCard` into one card per item, and `@bsuite/page-builder` was
unlocked to 0.9.0. `react-grid-layout` measures the container and then positions items; going
from ~5 grid items to ~25 on a page multiplies both the measure cost and the shift surface.
This is the correct UX outcome and it is a plausible INP/CLS cost. It has not been measured on
a rendered page.

**What I could not settle and what would settle it.** The Speed Insights dashboard, filtered
to Production, split Mobile vs Desktop, viewed **per metric** rather than as RES. That is a
two-minute look and it eliminates three of the four candidates. Until then, anyone attributing
the fall to a single cause is guessing.

**One thing is certain regardless of which candidate wins:** crm7's first paint is slow in
absolute terms, and it was slow before the window. That is section 2.

---

## 2. What the measurements actually say

| App | Mobile LH | Desktop LH | FCP (mob) | LCP (mob) | JS decoded | Requests |
|---|---|---|---|---|---|---|
| conduit | **0.94** | 1.00 | 1,199 | 1,199 | 1,217 KB | 37 |
| BSU | 0.77 | 0.99 | 3,114 | 4,468 | 902 KB | 36 |
| R80.4 | 0.69 | 0.97 | 2,333 | 5,533 | 487 KB | 50 |
| **crm7** | **0.66** | 0.87 | **4,875** | **5,859** | **2,107 KB** | **129** |
| throughput | 0.61 | 0.89 | 6,585 | 6,747 | 917 KB | 63 |
| braden | 0.54 | 0.88 | 3,131 | **10,106** | 967 KB | 42 |

**conduit — the only SSR app — is the fastest by a distance.** It ships 69,708 B of rendered
HTML. Every other app ships `<div id="root"></div>` and paints nothing until JavaScript
resolves. That is the headline architectural finding, and it is worth stating plainly: the
five Vite SPAs are all paying the same tax, and crm7 pays it hardest because it has the most
JavaScript.

### crm7, specifically

crm7 is **not** slow for the reasons people usually assume. Server response is 50 ms. Total
Blocking Time is 53 ms. CLS is a perfect 0. 110 of 112 assets carry immutable 1-year cache
headers and the HTML warms to `x-vercel-cache: HIT`. The caching and the main thread are fine.

It is slow because **nothing is on screen until a 129-request, 2.36 MB JavaScript graph
resolves**, and two specific things make that graph worse than it needs to be:

1. **`react-core-<hash>.js` is 1,001,217 B decoded.** It is correctly minified — this is not a
   dev bundle. It is a `manualChunks` misconfiguration — **or, on Vite 8 / Rolldown, a `manualChunks` block
that is no longer read at all (corrected 2026-08-17; confirm which before fixing, because the
two need opposite fixes)**: the chunk contains **385 `zod`
   references, 103 `slate` references, plus `lodash`, `xlsx` and `ai-sdk` markers**. React 19 +
   react-dom is ~150–180 KB; throughput's equivalent chunk is 198 KB. Roughly 800 KB of a
   chunk that *every route downloads* is a rich-text editor and a validation library that most
   page loads never touch. The cause is visible in `vite.config.ts`: the "shared runtime
   foundations MUST be assigned before lazy-only buckets" block runs `id.includes('/react/')`
   before the `platejs` / `xlsx` buckets, and that substring matches nested paths inside other
   packages. The comment explains why the ordering exists; the ordering then over-matches.
2. **108 `modulepreload` links, 86 of them under 2 KB, totalling 42,773 B.** Individual Lucide
   icons — `check` at 129 B, `x` at 154 B, `storage-keys` at 53 B — held at the same priority
   as the megabyte chunk that actually gates first paint. Over-splitting costs connection
   slots, and this is the mechanism that turns 2.36 MB into 129 requests.

Two smaller ones, both cheap: `registerSW.js` sits in `<head>` with no `defer` and is
render-blocking; and **zero fonts are preloaded** while all ten `@font-face` declarations live
inside a 245,848 B render-blocking stylesheet, so custom text is three hops deep — HTML → CSS
→ parse → fetch. JetBrains Mono additionally ships in both `.woff2` and legacy `.woff`.

`index.html` also defines inline critical CSS for an `.app-shell` skeleton — and no markup uses
those classes. The skeleton is defined and never rendered. `package.json` has a `build` script
that prerenders `/`, but `vercel.json` overrides `buildCommand` to `build:noprerender`, so the
prerender step has never run on Vercel. That override dates from April and is not part of this
regression, but it is why the shell is empty.

### The other five

- **braden's problem is images, not JavaScript** — `apprenticeship-program.png` at 662 KB and
  `logo-gold.png` at 458 KB drive a 10.1 s mobile LCP, worth 5,050 ms by Lighthouse's own
  estimate. It is the corporate marketing site; it is the one where LCP is a commercial number.
- **`bsuite-mark.png` is served unoptimised at 198 KB to crm7, conduit *and* BSU.** One asset,
  three apps. BSU additionally ships `platform-light.png` at 726 KB.
- **R80.4 and throughput never measure their own UI.** Unauthenticated, both boot their full
  bundle, discover there is no session, then client-side redirect to `suite.crm7.app/login`
  which boots BSU's full bundle. Two SPA boots for a logged-out visitor. Their Lighthouse
  scores are measuring that, which means we have no clean measurement of either app's own
  first paint.

---

## 3. Estate-wide findings against Vercel's documented practice

### VP-1 — The five Vite SPAs get none of the platform's delivery features **as configured**

> **Corrected 2026-08-17 — read this before acting on the section.** As originally written,
> V-1 stated four things as platform limits that are configuration choices. The corrections
> are below and the surrounding text has been amended. The error mattered: a limit closes a
> question, a choice keeps it open, and this section was closing questions that were open.
>
> 1. **ISR and prerendering are available to Vite.** Vercel ships `vite-with-nitro` with both
>    SSR and ISR ([docs](https://vercel.com/docs/frameworks/full-stack/vite-with-nitro),
>    `last_updated: 2026-03-09`), and `vite-prerender-plugin` gives build-time prerendering
>    that preserves the SPA authoring model — no framework migration.
> 2. **Skew Protection is available to Vite.** Vite is missing from the *zero-config* list,
>    not from the feature. The documented manual path is to read
>    `VERCEL_SKEW_PROTECTION_ENABLED` and attach `VERCEL_DEPLOYMENT_ID` via the `dpl` query
>    param, an `x-deployment-id` header, or a `__vdpl` cookie
>    ([docs](https://vercel.com/docs/skew-protection), `2026-07-15`) — roughly five lines in
>    a fetch wrapper. Report it as **not wired**, never as *not possible*.
> 3. **Routing Middleware runs for any framework, including a static Vite SPA.** It is the
>    available fix for the logged-out double-boot in the class table below, which this
>    document had no proposed fix for.
> 4. **Vite 8 is Rolldown-by-default and object-form `rollupOptions.output.manualChunks` is
>    gone** ([vite.dev/guide/migration](https://vite.dev/guide/migration); Vite 8 released
>    2026-03-12). This one changes a *finding*, not just a constraint — see the note on the
>    `react-core` chunk in §2 and item 1 of §4.

What a client-rendered Vite SPA genuinely does not get, with no configuration change:
`next/image` optimisation, `next/font` preloading, streaming SSR, and the 2026-07-17 CDN
immutable-asset optimisation (Next.js 16.3+ with query-param skew protection only; Nitro
"coming soon"). ISR, prerendering and Skew Protection are **unconfigured, not unavailable**.

Vercel's Vite documentation, last updated 2026-07-01, now says verbatim: *"Deploying your app
in Multi-Page App mode is recommended for production builds"*, and steers Vite users to Nitro
for anything server-side. That is a direction-of-travel signal worth a decision, not an
instruction to follow this week.

**The immediate consequence is Skew Protection.** We deploy frequently — 20 times in 48 hours
on 13–14 August. Without skew protection, a tab open across a deployment requests chunk
filenames that no longer exist. The service worker's NetworkFirst-for-navigation rule was added
in May precisely because this was happening. **Corrected 2026-08-17:** that is a workaround for
a feature we have **not wired**, not one we cannot use. The manual path above is about five
lines, and it needs no Nitro migration — which moves this from "accept and document" to
"small, shippable, and currently unshipped".

### VP-2 — Rate limiting is per-region, and our docs do not say so

Vercel's WAF rate-limit counters are tracked **per region**. Traffic matching a key in several
regions can exceed the configured limit in aggregate. Any place we describe a rate limit as a
global quota is wrong. This applies to the newly-shipped `api/error-report.ts` limiter too —
which is per-isolate on Edge, a fact the implementer correctly stated rather than glossed.

### VP-3 — WAF Managed Rulesets are Enterprise-only

The security marketing page implies OWASP rulesets are broadly available; the docs limits
table gates them to Enterprise ("contact sales"). Pro gets 40 custom rules and 40 rate-limit
rules, no managed rulesets. **Do not design a security posture around OWASP CRS on this
account.** If we ever do move to Enterprise, `/auth/callback`, `/oauth/authorize`,
`/oauth/consent` and `/oauth/token` need a documented bypass rule *before* the ruleset is
enforced — PKCE codes and JWTs in query strings are exactly the shape generic SQLi/XSS
signatures false-positive on.

### VP-4 — BotID is not a one-liner for a Vite SPA

`checkBotId()` must run server-side. Five of six apps ship zero server code. Adding BotID means
adding a Vercel Function per protected route, plus `vercel.json` rewrites using per-project
UUID paths that Vercel issues, plus an explicit protected-route list kept in sync between
client and server. Basic mode is free; Deep Analysis is **$1 per 1,000 `checkBotId()` calls**
on Pro. Worth it for the public lead-capture and careers surfaces; not a blanket rollout.

### VP-5 — Deployment Protection would break `d.*` OAuth testing silently

If Vercel Authentication is ever enabled on a `d.*` domain, the BSU→consumer OAuth redirect is
a browser navigation and cannot carry a bypass header. It needs the query-param form
(`?x-vercel-protection-bypass=…&x-vercel-set-bypass-cookie=true`). This is currently
hypothetical — no project is confirmed to have it enabled — but it fails silently and looks
like an auth bug, so it belongs in the runbook before someone turns it on.

### VP-6 — Rolling Releases cannot auto-gate on Core Web Vitals

The dashboard shows a Speed Insights comparison between canary and current during a rollout;
every advance and abort is human-triggered. There is no threshold engine. The REST API
(`/rolling-release/approve-stage`, `/start`, `/complete`) exists, so an automated
"abort if RES drops" gate is **buildable** — it is not a feature to switch on. Given this
regression, it is worth building.

### VP-7 — Model IDs in our docs are stale in one direction and correct in another

Verified against the live gateway roster (`GET https://ai-gateway.vercel.sh/v1/models`, 327
models, no auth required). `xai/grok-4.3`, `anthropic/claude-opus-5` and `zai/glm-5.2` are all
real, current IDs. Note the provider prefix is **`zai/`, not `glm/`** — a bare `glm-5.2` would
fail. Meanwhile `AGENTS.md` still names `xai/grok-4.20-reasoning` as primary, which also
exists but is a different, older model.

Separately: **AI SDK v7 has changed the canonical streaming pattern.** `ai@7.x` replaces the
instance method `result.toUIMessageStreamResponse()` with composable top-level helpers —
`createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })`.
crm7 is on `ai ^6.0.199`, so the documented rule is correct *for the installed version*, but
the AI Implementation Standards say "always use `toUIMessageStreamResponse()`" without naming a
version, and that becomes wrong the moment anyone bumps to v7. The rule needs a version qualifier.

### VP-8 — Vercel publishes official skills; we hand-wrote ours

`skills.sh` hosts a `vercel-labs` publisher, and `npx plugins add vercel/vercel-plugin` bundles
28 official skills covering Next.js, AI SDK, Functions and Storage — with the stated benefit
that the agent reasons from *current* docs rather than its training cutoff. Our
`machine-vercel-react-best-practices` skill already marks itself SUPERSEDED by a
vendor-maintained equivalent. Consuming the vendor plugin for the framework-generic material,
and keeping our own skills for what is BSuite-specific, is the correct split.

---

## 4. What to do, in order

**This week — crm7 first paint. All four are small and independently shippable.**

1. **Fix the `react-core` chunk — but first confirm the config is executing.** Vite 8 is
   Rolldown-by-default and object-form `rollupOptions.output.manualChunks` is gone (corrected
   2026-08-17); the replacement is `build.rolldownOptions.output.advancedChunks`. If the block
   is being ignored, reordering guards inside it changes nothing and the real fix is to port
   it. If it *is* executing: move the `platejs` / `slate` / `zod` / `xlsx` guards above the
   `/react/` guard, or match on exact package boundaries rather than substrings. Verify by
   grepping the built chunk for `slate` and `zod` and finding zero. Expected: ~800 KB off the
   critical path. This is the single highest-leverage change in the estate.
2. **Stop preloading 86 sub-2 KB modules.** Either raise the `manualChunks` floor so tiny
   icon modules coalesce, or extend the existing `isLazyOnlyChunk` filter to drop
   sub-threshold deps from the HTML preload list. Expected: 129 requests → well under 50.
3. **`defer` on `registerSW.js`.** One attribute.
4. **Preload the two Geist faces that render above the fold; drop the legacy `.woff`
   JetBrains Mono weights.** Text stops being three hops deep.

**Then — settle the RES question properly.** Open Speed Insights, Production, per-metric,
mobile and desktop separately. If INP is the mover, the card-unglue work and the always-on
`setInterval` in `index.html` are the first two places to look. If FCP/LCP is the mover, the
four fixes above are the answer. If neither moved much and the score still fell, it is the
traffic mix and the deployment cadence, and the right response is to say so rather than
"optimise" something that is not broken.

**Then — the class, not the page (D-62).** Every finding above except braden's images applies
to more than one app:

| Fix | Applies to |
|---|---|
| `manualChunks` audited by chunk *contents*, not name | all 5 Vite apps |
| Empty `#root` / no prerendered shell | all 5 Vite apps |
| Font preload + drop legacy `.woff` | all 5 Vite apps |
| `bsuite-mark.png` served unoptimised at 198 KB | crm7, conduit, BSU |
| Logged-out double-SPA-boot — fixable with Routing Middleware, which is *not* Next.js-only (corrected 2026-08-17) | R80.4, throughput |
| Oversized PNGs | braden (662/458 KB), BSU (726 KB) |

**Requires a ruling before anyone builds it.**

- Do we get a **PSI/CrUX API key**? It is free and it gives field Core Web Vitals for all six
  apps without buying five more Speed Insights seats. Right now five of six apps have no
  real-user performance data at all, and this document is lab-only because of it.
- Do we adopt **Nitro** for the Vite apps? It is the documented path to Vercel Functions, SSR,
  ISR and the new CDN optimisation, and Vercel's own Vite docs now steer that way. It is also a
  real migration across five apps. **Corrected 2026-08-17:** Skew Protection is *not* on that
  list — it needs no Nitro, only the five-line manual wiring in VP-1, so do not let this ruling
  block it. Nor is prerendering, if `vite-prerender-plugin` is enough; the ruling is genuinely
  about SSR and Functions, and is smaller than it was written to be.
- Do we install the **official Vercel plugin** (`npx plugins add vercel/vercel-plugin`) for the
  framework-generic skills, and keep ours for BSuite specifics?

---

## 5. Skills changed

- **New: `~/.agents/skills/vercel-speed-insights/`** — the home for Speed Insights, RES and
  Core Web Vitals. `SKILL.md` plus `references/res-scoring-model.md` (the full weight table,
  the FID→INP substitution, the four-causes checklist) and
  `references/bsuite-perf-baseline.md` (this measurement set), plus a `verify.sh` that fails
  if a later edit drops any of the facts the skill exists to preserve.
- **Updated: `~/.agents/skills/vercel-ops/`** — corrected the project map (R80.3 → R80.4, with
  a note that the Vercel *slug* is still `r8` and should not be "fixed"), added the platform
  capability matrix with plan tiers, the per-region rate-limit caveat, the BotID and
  Deployment-Protection traps, and the legal items that need action. Added a cross-reference to
  the new skill so the split is discoverable from either side.

**Not changed, deliberately:** `machine-vercel-react-best-practices` already declares itself
superseded by a vendor-maintained skill. Editing a superseded skill is how two sources of truth
get created. If we want that material current, install the vendor plugin.

---

## 6. What no static pass can settle

1. **Everything in section 1 that needs the Speed Insights dashboard.** Per-metric, per-route,
   production, split by device. I have no read access to it.
2. **Field Core Web Vitals for any app.** PSI quota is zero from this egress and CrUX needs a
   key. All numbers here are lab.
3. **Whether the card-unglue work moved INP or CLS on a real page.** No browser was driven
   against an authenticated route.
4. **Whether any project has Deployment Protection enabled.** Not readable from here.
5. **Whether this team was among those notified after Vercel's April 2026 incident.** Vercel's
   trust centre states sensitive environment variables were not exposed; that is their account,
   not an independent one.
