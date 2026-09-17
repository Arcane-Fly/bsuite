---
kind: record
authority: none
owner: bsuite
---

# [D-62][P1] The shared card-surface scanner is published, reachable and adopted by nobody — 4 of 5 apps' gates are blind to the root-cause class

https://github.com/GaryOcean428/bsuite/issues/2055

Snapshot updatedAt: 2026-08-24T03:50:25Z. Open at capture; re-read live.

## Why this is the D-62 mechanism, not another D-74 instance

D-62, operator, 2026-08-13: *"These issues are persistent across the app and have been flagged to be fixed across the full app many times. Typically the fixing agent fixes that page I've pointed to but I have always said it is a platform wide consideration."*

`[D-74]` (bsuite#1995) is closed and the named surfaces are fixed. **The mechanism that guarantees the complaint returns is untouched.** Each app hand-rolled its own card-contract test, each port dropped a different check, so each app's gate reports a clean ledger over a class it cannot see.

## Measurement — 2026-08-17

**The one shared implementation exists and ships.**

- `packages/page-builder/src/scanner/cardSurfaceScanner.ts` exports `scanCardSurfaces`, covering five idioms: `glued-widget`, `ungridded-multi-card`, `retired-primitive`, `autoheight-optout`, `clipped-card`.
- It is exported at the subpath `@bsuite/page-builder/scanner` (Node-only, deliberately not from the package root so it never reaches a browser bundle).
- **It is published.** Unpacked `page-builder-0.9.0.tgz` from the registry: `package/dist/scanner/index.js`, `cardSurfaceScanner.js` and both `.d.ts` files are present, and the published `exports` map carries the `./scanner` key.
- **All five apps pin `^0.9.0`** — crm7, business-suite-unified, conduit, throughput, braden. Nothing blocks resolution.

**Zero apps import it.**

```
grep -rn "page-builder/scanner" <all five app trees>   →  0 hits
```

Positive control on the same instrument: `grep -rn "@bsuite/page-builder"` over the same trees returns **83 hits**, so the probe finds package imports that exist. The zero is real.

**All five still hand-roll the test, and four are structurally blind to the root cause.**

| App | Local contract test | Lines | `findUngriddedMultiCard` |
|---|---|---:|---|
| crm7 | `src/__tests__/card-unglue-contract.test.ts` | 617 | present (declares its own copy) |
| business-suite-unified | same path | 362 | **absent** |
| conduit | same path | 286 | **absent** |
| throughput | same path | 265 | **absent** |
| braden | same path | 264 | **absent** |

`findUngriddedMultiCard` is the check crm7's own comment calls *"the actual root cause of the operator's platform-wide complaint"* — a page with two or more top-level cards that never reaches a grid primitive at all.

The scanner's own docstring already records what each port lost, and it agrees with the measurement above:

> - `findUngriddedMultiCard` … was ABSENT from BSU, throughput and braden, and present only in a narrowed form in conduit. In throughput and braden it was absent structurally: their glue scan is gated on the file containing `CanvasCard` at all, so a page with two cards and no grid primitive is invisible by construction.
> - conduit's header documents THREE card idioms and its regexes detect TWO. The third (`rounded-lg border p-4` section panels) has no detector, which is how five known-glued conduit pages pass as an empty ledger.
> - BSU's scan only walks files containing the literal string `PageGridLayout`, so every BSU page that never adopted the grid is structurally invisible to BSU's own gate.

## Why it matters in the operator's terms

A gate that cannot distinguish *"checked nothing"* from *"found nothing"* is not a gate — D-92, and this is a fifth instance of it. Four apps currently publish an empty card ledger that means "my scanner has no detector for this", not "this app is clean". The 2026-08-14 verification register put the unaudited surface count at **~91+**, and it is unaudited for exactly this reason.

## Reproduction

```bash
cd /path/to/bsuite
grep -rn "page-builder/scanner" crm7/src business-suite-unified/src conduit/src throughput/src braden/src
# → no output

grep -rn "@bsuite/page-builder" crm7/src business-suite-unified/src conduit/src throughput/src braden/src | wc -l
# → 83   (positive control: the grep does find package imports)

for a in crm7 business-suite-unified conduit throughput braden; do
  printf '%-24s ' "$a"
  grep -c "findUngriddedMultiCard" "$a/src/__tests__/card-unglue-contract.test.ts"
done
# → crm7 3, everything else 0

npm pack @bsuite/page-builder@0.9.0 && tar tzf bsuite-page-builder-0.9.0.tgz | grep scanner
# → dist/scanner/{index,cardSurfaceScanner}.{js,d.ts}
```

## Definition of done

1. Each of the five apps replaces its hand-rolled detection logic with `scanCardSurfaces` from `@bsuite/page-builder/scanner`. Scan roots, card vocabulary and the exclusion ledger stay per-app — those are operational truth about that app. Only the detection logic moves.
2. Each app's contract test **fails closed** when a scan root is missing or matches zero files, and prints the number of files scanned (the D-92 rule).
3. Report the finding count each app produces on first adoption. That number is the real size of the D-74 tail and it has never been measured outside crm7.
4. Delete the four divergent copies so there is nothing left to drift.

**Filing is not fixing.** Nothing in this issue changes any surface; it records why the class keeps coming back.

Related: bsuite#1995 (D-74, closed — the named surfaces), bsuite#1966 (D-92, the estate-wide gate sweep), conduit#460 (D-75/D-76, closed).
