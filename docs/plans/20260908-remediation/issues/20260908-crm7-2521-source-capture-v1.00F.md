---
kind: record
authority: none
owner: bsuite
---

# 23 useQuery call sites across 16 files run with no queryFn (was filed as 5)

https://github.com/GaryOcean428/crm7/issues/2521

Snapshot updatedAt: 2026-09-07T14:38:33Z. Open at capture; re-read live.

Four list pages ask TanStack Query for rows with **no `queryFn`**, against a `queryClient` that sets no default one. TanStack Query 5.101.4 fails such a query with:

```
No queryFn was passed as an option, and no default queryFn was found.
```

`src/lib/queryClient.ts` `defaultOptions.queries` carries only `refetchOnWindowFocus`, `retry` and `staleTime` — no `queryFn`. And no matching handler exists in the `api/` tree: `api/` contains only `ai`, `db`, `rpc`, `config.ts`, `error-report.ts`. So these pages can never render a row; each shows its empty state forever.

The fifth instance of this class, `/field-officers/case-notes`, is fixed in #2520 — where it mattered most, because the create page redirects to it on save, so the user would have seen "saved, and it's gone".

## The four remaining

| # | File | Call site | Query key | Route | Store available? |
|---|---|---|---|---|---|
| 1 | `src/pages/enrichment/programs/index.tsx` | `:30` | `/api/enrichment/programs` | `App.tsx:2790` | **none** |
| 2 | `src/pages/field-officers/competency/index.tsx` | `:77` | `/api/field-officers/competency-reviews` | `App.tsx:2869` | `competencyAssessmentStore` |
| 3 | `src/pages/field-officers/incidents/index.tsx` | `:96` | `/api/field-officers/incidents` | `App.tsx:2899` | `whsIncidentStore` |
| 4 | `src/pages/vet/training-packages/[id]/index.tsx` | `:88` | `/api/vet/qualifications` | `App.tsx:3527` | `qualificationStore` |

All four are reachable from registered routes. None is gated off by `enabled: false` — #4 is gated by `enabled: Boolean(trainingPackage?.code)`, which flips true as soon as the sibling query on the same page resolves, so it fires in normal use.

## Enumeration method, and a correction to the count

```
$ git grep -lnF "queryKey: ['/api/" -- src/pages
7 files
```

`-F` matters: a bare `[` is a character class. Without it `git grep` does not silently return 0 — it fatals with `Unmatched [, [^, [:, [., or [=` — so a missing `-F` is loud here rather than a false negative.

**The per-file `queryFn` count that follows it is the wrong instrument.** A file with two `useQuery` calls and one `queryFn` reads as "has a queryFn". Counting **call sites** instead:

| File | call sites | with `queryFn` | broken |
|---|---|---|---|
| `field-officers/case-notes/index.tsx` | 1 | 0 | 1 (fixed in #2520) |
| `enrichment/programs/index.tsx` | 1 | 0 | 1 |
| `field-officers/competency/index.tsx` | 1 | 0 | 1 |
| `field-officers/incidents/index.tsx` | 1 | 0 | 1 |
| `vet/training-packages/[id]/index.tsx` | 2 | 1 | **1** |
| `gto-compliance/standard-assessment.tsx` | 1 | 1 | 0 |
| `settings/integrations.tsx` | 4 | 4 | 0 |

So the class is **5 broken call sites across 5 files, not 4**. `vet/training-packages/[id]/index.tsx:88` was hidden by the file-level count.

## Why these are filed rather than bundled

They are not trivially the same fix. Each needs its own data source, one has no store at all, and three of the four pages will also need their local placeholder types replaced — the same shape that hid the case-notes defect, where the page declared its own `CaseNote` (`id: number`, `apprenticeName`, `hostName`) so nothing was ever typed against the table.

## Adjacent, not this class

`src/pages/settings/integrations.tsx:497` has `queryFn: async () => []` — a stub that always returns nothing. It has a `queryFn`, so it is not the "Missing queryFn" defect, but that list can never show a row either.

## Suggested fix shape

Follow #2520: point each list at the store that owns the table, drop the local placeholder type in favour of the store's, and add a case that fails against the current page and passes against the fix.
