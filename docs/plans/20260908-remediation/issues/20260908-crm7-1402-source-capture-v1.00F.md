---
kind: record
authority: none
owner: bsuite
---

# [perf][correctness] tga-sync and tga-units-sync re-download the entire corpus every run — SearchByModifiedDate paging and date bounds DO work, the 'inert' finding was a malformed envelope

https://github.com/GaryOcean428/crm7/issues/1402

Snapshot updatedAt: 2026-08-02T13:55:30Z. Open at capture; re-read live.

Found while re-reviewing #1398. **Pre-existing on `development`, zero diff lines in that PR** — filing separately so it is not lost.

## The recorded "fact" is wrong

`supabase/functions/_shared/tga-soap.ts:130-200` asserts that `TrainingComponentService.SearchByModifiedDate` ignores its paging parameters, and that `FromDate=2030` (a future date) still returns 5,240 rows so the operation "does not search by modified date".

Both claims are artefacts of a **malformed SOAP envelope**, the same defect #1398 was sent back for on `SearchByScope`.

## Measured, correctly-ordered

`TrainingComponentModifiedSearchRequest` **extends `AbstractPageRequest`** — so `PageNumber`/`PageSize` must precede the operation's own fields. And the real date fields are **`StartDate`/`EndDate`**: there is no `FromDate` element at all, which is exactly why it appeared inert. It was never a field.

| Probe | Result |
|---|---|
| `PageNumber=1, PageSize=5`, WSDL order | exactly **5** `<TrainingComponentSummary>` blocks; `<PageNumber>1</PageNumber><PageSize>5</PageSize>` echoed back; `Count=5240`; **3,960 bytes** |
| `<StartDate>` as a proper `DateTimeOffset` of `2030-01-01` | **`<Count>0</Count>`** |

3,960 bytes against the ~3 MB the current envelope pulls.

The echo is the tell: the malformed request comes back with `<PageNumber>0</PageNumber><PageSize>0</PageSize>` — the server never received them.

## What it costs today

`tga-sync` and `tga-units-sync` re-download the **entire corpus on every run**:

- qualifications: 5,240 records, ~3 MB
- units: 49,418 records, **29.5 MB**

…because the architecture was built on "paging is inert, so one call is the whole sweep". With `StartDate` working, an incremental sweep is possible and the nightly job stops being a full re-download.

This also removes the pressure behind #1398's `SOAP_TIMEOUT_MS` headroom and the units loader's whole payload-size design discussion.

## Why this is worth its own issue rather than a note

**The mechanism was found, written down, and then not swept for.** #1398 hit this exact bug on `SearchByScope`, was corrected, and the generalisable lesson was recorded in code comments and `supabase/migrations/CLAUDE.md` — while the sibling operation **one screen above in the same file** kept asserting the identical falsehood, and the two production loaders kept behaving accordingly.

Finding a defect class is not the same as sweeping for other instances of it. That is the actual lesson here.

## Scope

1. Fix the `SearchByModifiedDate` envelope element order (base-type fields first).
2. Delete the false claims from `tga-soap.ts` and anywhere they were propagated.
3. `supabase/functions/_shared/tga-soap.test.ts:78` asserts a `<ShowScope>true</ShowScope>` element that **does not exist in the WSDL** — a test currently pinning a known defect in place.
4. Only then consider incremental sweeps. Do not change loader behaviour and fix the envelope in one step; the completeness gate's meaning changes once a response can legitimately be a page rather than the whole corpus.

## Related

- #1398 — same defect on `SearchByScope`, fixed there
- The `buildOrganisationGetDetailsEnvelope` / `tga-search` defect (`ShowScope` is not a WSDL field) is a third instance, still unfixed and separately scoped
