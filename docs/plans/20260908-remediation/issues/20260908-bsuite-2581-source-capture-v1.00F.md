---
kind: record
authority: none
owner: bsuite
---

# D-131 scoped: 5 of 6 apps have real perf gates, and every one measures the marketing page — never the authenticated UI

https://github.com/GaryOcean428/bsuite/issues/2581

Snapshot updatedAt: 2026-08-27T08:19:01Z. Open at capture; re-read live.

One of four **cross-cutting** operator asks `estate-align` reports. Filed here because the register has no status column to record an answer in.

> **D-131** — *"The UI across the apps is pretty slow. Investigate if their optimization, modularization or anything else… or let me know if its good and just needs a bigger machine."*

## Verdict: PARTLY satisfied. The question is not conclusively answered.

## Synthetic CI exists on 5 of 6 apps — and every one measures the wrong pages

| app | routes it audits | assertion |
|---|---|---|
| crm7 | **`/` only** — the unauthenticated SPA shell/login | error, min 0.75 |
| business-suite-unified | `/`, `/privacy`, `/terms`, `/docs`, `/embed/*`, `/login` | error, min 0.8 |
| braden | `/`, `/apprenticeships`, `/traineeships`, `/recruitment`, `/services/compliance` | **warn only**, min 0.7 |
| throughput | **`/pricing` only** | error, min 0.9 |
| conduit | `/pricing`, `/portal/careers`, talent-community, one job detail — **explicitly excludes** `/portal/employer` and `/auth/*` by design | error, min 0.8/0.9 |
| R80.4 | **none** — only eslint-parity, gitleaks, verify | — |

Every gate that exists **does** assert a real threshold and would fail the build. These are genuine gates, not numbers nobody reads.

**But every one measures the public/marketing/login surface.** Not one of the six touches an authenticated, data-heavy screen — which is exactly where the dashboards, grids and card-canvas layouts live, and the likeliest site of *"the UI is slow"*. conduit's own generator script documents why it skips the authenticated portal.

## Real-user monitoring is mounted everywhere — but the paid tier may be on one app

| app | `<SpeedInsights />` |
|---|---|
| crm7 | `src/main.tsx:162`, PROD-gated |
| business-suite-unified | `src/App.tsx:104`, PROD-gated |
| conduit | `src/app/layout.tsx:158`, unconditional (SSR) |
| braden | `src/App.tsx:42`, PROD-gated |
| throughput | `src/App.tsx:221`, PROD-gated |
| R80.4 | `src/main.tsx:333`, PROD-gated |

All six mount it. **But** `docs/20260815-vercel-platform-audit-and-res-regression-v1.00W.md:39` records, as of 2026-08-15: *"Speed Insights is purchased for crm7 only."* Whether that changed since is **UNKNOWN** — it is Vercel billing state, not visible from the repo.

## A substantial lab audit already exists and half-answers the question

`docs/20260815-vercel-platform-audit-and-res-regression-v1.00W.md` (**Status W — not finalised**) ran Lighthouse 13.4.1 against all six production URLs:

| app | mobile LH |
|---|---|
| conduit *(the one SSR app)* | **0.94** |
| business-suite-unified | 0.77 |
| R80.4 | 0.69 |
| crm7 | **0.66** |
| throughput | 0.61 |
| braden | **0.54** — image-bound, 10.1s mobile LCP |

It names a concrete root cause for crm7 — a `manualChunks`/`advancedChunks` misconfiguration pulling ~800 KB of `zod`/`slate`/`xlsx` into a chunk every route downloads, plus 108 sub-2KB `modulepreload` links — with file-level detail, and separates it from an alternative traffic-mix explanation it says needs the Speed Insights dashboard to settle, which **it did not have access to**.

## So: optimization, or a bigger machine?

**The evidence leans hard toward optimization**, and says so with named causes: bundle mis-chunking, missing prerender, unoptimized images. **Client-side bundle size and image weight are not solved by more server hardware.**

But the audit stops short of a final answer and lists open items it could not settle. **Nobody has since closed that loop.** There is no document that says, in the operator's own terms, *"yes/no it's slow, and here's why."*

## Was the fix applied to the class, or only to crm7?

crm7's fix appears to have landed — `crm7/vite.config.ts:421,531` carries comments referencing *"the manualChunks ordering fix"*. The audit says at `:301-306` that the same class **applies to all 5 Vite apps**.

**Whether BSU, braden, throughput and R80.4 received it was not verified** — that needs a fresh per-app bundle inspection. This is the "fix the class, not the page" question, unanswered.

## What closing this requires

1. **Add at least one authenticated route** to every app's Lighthouse config. Needs a seeded test session per app — none of the five current configs does this, and conduit's generator explicitly avoids it because auth routes 307-redirect.
2. **Look at the Speed Insights dashboard** per-metric, per-route, mobile vs desktop. The 2026-08-15 audit names this as the single short action that would settle most of its open questions, and it has apparently not been done.
3. **Verify whether the four remaining Vite apps got the same chunking/prerender/font-preload fix** crm7 got, or whether the class step never left crm7.
4. **Write the answer where the register can point to it**, in the operator's terms.

## Note on R80.4

Per the audit at `:113-116`, R80.4 *"never measures its own UI"* cleanly — an unauthenticated visitor immediately double-boots into BSU's login, so its numbers measure that redirect, not its own first paint. It also has no Lighthouse gate at all.
