---
kind: record
authority: none
owner: bsuite
---

# /contacts authenticated LCP is ~5.7s median in CI, and the signal has a ~2100ms spread

https://github.com/GaryOcean428/crm7/issues/2508

Snapshot updatedAt: 2026-09-06T16:17:50Z. Open at capture; re-read live.

The authenticated Lighthouse gate added in #2507 measures `/contacts` in CI. **It does not make it faster.** This issue is the fix.

## What is measured

CI, provisioned Supabase branch, desktop preset, 5 runs, `aggregationMethod: median`.

Observed `/contacts` LCP across runs on one commit: **{6206, 4104, 5757}** — median **5757 ms**, spread **~2100 ms**.

Two things follow, and the second is the more urgent:

1. **The page is slow.** FCP lands well before LCP, so the largest paint is waiting on data.
2. **The signal is noisy.** A ~2100 ms spread makes any threshold nearly meaningless, and a gate that flips on variance gets its threshold raised rather than the page fixed. **Reducing the variance comes before tightening the budget.**

## Correction to an earlier claim

#2507's first write-up said CI's 4104 ms landed "within noise of" the 4.04 s field P75. That was an artifact of LHCI's **default `optimistic` aggregation**, which for a `maxNumericValue` assertion is `Math.min` — 4104 was the *best* of three runs, not the typical one. Under the median the CI number is ~5757 ms and the resemblance to the field P75 disappears. CI is a slower environment than production; the gate's job is regression detection **in its own environment**, not agreement with field numbers.

## Not yet known

**Which element is the LCP element on `/contacts` has never been observed.** Nobody has driven a browser against a deployed signed-in instance and read it. The reasoning in #1628 that the table is not that element rests on architecture, not measurement — and `/contacts` *is* an `EnhancedDataTable` page. **Start here**; everything else is speculation until it is answered.

## Acceptance criteria

- The LCP element on `/contacts` is **identified by observation** on a deployed authenticated instance, and named in this issue.
- Run-to-run spread on the CI gate is brought under **500 ms**, or the cause of the variance is identified and recorded.
- Median `/contacts` LCP is reduced, and `crm7/lighthouserc.json`'s `maxNumericValue` is lowered in the **same PR** as the improvement.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: §9.2 visual-equivalence (the LCP element must be observed, not inferred)
- **Equivalence target**: a deployed-instance trace naming the LCP element, plus before/after medians from the CI gate
- **Cross red-team**: whoever did not write the fix verifies the element identification independently
- **Skills to load**: `vercel-speed-insights`, `chrome-devtools-mcp:debug-optimize-lcp`, `test-playwright`
- **Self-report on divergence**: yes — if the LCP element cannot be observed, say so rather than inferring it

Instrument: #2507. Table analysis that ruled out row count (but not the LCP element): #1628.
