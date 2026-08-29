---
kind: plan
authority: engineering
owner: platform-lane
evidence:
  - packages/nav-core/src/speedInsightsRoute.ts
  - packages/nav-core/src/useSpeedInsightsRoute.ts
---

# Why the score is good and the app is slow

**Status:** DRAFT — one defect fixed, one measured and not yet acted on.
Measured 2026-08-29 against production.

> Operator, 2026-08-29: *"paths appear to be measured but not routes"* and
> *"the app itself feels slow even though it has a good score."*

Those are two findings, and the first explains why the second was invisible.

---

## 1. The report was measuring paths — FIXED

Five of six apps mount `<SpeedInsights />` from `@vercel/speed-insights/react`
with **no `route` prop**. The library's own type declares
`route?: string | null`; without it every datapoint falls back to
`window.location.pathname`.

So `/apprentices/9f1c…` and `/apprentices/3ab7…` are two rows. With a few
hundred apprentices, one page's Core Web Vitals split across hundreds of
buckets, each too small to reach the p75 Vercel scores on.

**That is why a slow app scores well.** The busy pages drop out of the report
for want of samples, and the score that survives is computed over the paths
that had enough — the static ones.

conduit is unaffected: `/next` reads the route pattern from the Next router.

The packages are already current — `@vercel/speed-insights@2.0.0`,
`@vercel/analytics@2.0.1`, both the latest published. **This was never a
version problem**, which is worth saying plainly because "upgrade the package"
is the first thing anyone would try.

Fixed by `speedInsightsRoute()` / `useSpeedInsightsRoute()` in
`@bsuite/nav-core` 1.2.0.

## 2. Both apps ship ~1.6 MB of JavaScript to a PUBLIC landing page

Measured on production, unauthenticated, `decodedBodySize`:

| | crm7 (`crm.crm7.app`) | BSU (`suite.crm7.app`) |
|---|---:|---:|
| requests | 196 | 74 |
| JS files | 177 | 39 |
| JS decoded | 1,621 KB | 1,669 KB |
| CSS decoded | 254 KB | — |
| `modulepreload` tags | 113 | 36 |
| DOMContentLoaded | 510 ms | **1,929 ms** |

**This is the shape that produces the operator's report.** LCP is fine because
the shell paints early. Meanwhile the network and main thread are saturated
by 1.6 MB across up to 177 files, and that cost lands on INP and on how the
app *feels* — not on the headline metric.

### What is actually in it, on a page that cannot use any of it

| chunk | size | when |
|---|---:|---|
| `supabase-*.js` | 207 KB | 32 ms — preload |
| `PageEditorLauncher-*.js` | 65 KB | 39 ms — preload |
| `radix-ui-*.js` | 185 KB | 72 ms |
| `react-core-*.js` | 177 KB | 93 ms |
| `index-*.css` | 249 KB | 105 ms |

`initiatorType: 'other'` on the first two means a **preload link pulled them**,
not code.

### Why the existing guard did not catch it

`crm7/vite.config.ts` already filters HTML preloads through
`isLazyOnlyChunk()`. It works — `sql-wasm` is in the list and correctly loads
late (266 ms, `initiatorType: 'script'`).

But the list is a **hand-maintained enumeration of 14 prefixes**. Anything not
named in it stays eagerly preloaded, so the guard protects exactly the chunks
someone remembered. That is the same shape as every other enumerating detector
in this estate: it sees the mechanisms its author knew.

`PageEditorLauncher` is not on the list — and it is not a mistake that it
isn't: `MainLayout.tsx` imports it **statically** and it wraps the whole shell,
so it is genuinely in the entry graph. The preload list is doing what it was
told. The question is whether the shell should carry a 65 KB editor on a
marketing page, and that is a design decision, not a config tweak.

## 3. Why this document stops here

The obvious next move — narrow the chunking, invert the allowlist, lazy-load
the editor — is a build-configuration change whose effect can only be judged
from a deployed build under real network conditions. Reading the config is not
evidence, and this estate's own rule is that runtime and performance changes
need a live measurement rather than a trace.

So the honest deliverable is the measurement above plus a named next step,
not a speculative change to how six apps are chunked.

**Next step, in order:**

1. Decide whether `PageEditorLauncher` belongs in the shell's static graph, or
   behind the authenticated boundary. It is 65 KB on every anonymous visit.
2. Invert `LAZY_CHUNK_PREFIXES` from an allowlist of what to exclude into a
   measurement of what the first paint actually executes. An enumeration will
   keep going stale.
3. BSU's 1,929 ms DOMContentLoaded is nearly 4× crm7's on a third of the
   requests. Fewer, larger chunks are not automatically better, and BSU is the
   clearer win.

Re-measure after each, on production, with the numbers in this table as the
before.
