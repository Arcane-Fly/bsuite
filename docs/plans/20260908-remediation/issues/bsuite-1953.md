# Edge functions are never typechecked — 13 of 27 crm7 functions have real type errors, and an undeclared identifier reached production

https://github.com/GaryOcean428/bsuite/issues/1953

Snapshot updatedAt: 2026-08-26T15:28:28Z. Open at capture; re-read live.

Nothing typechecks the 27 crm7 edge functions. That is how `getClaims(token)` — where `token` is declared nowhere in the module — shipped and threw a `ReferenceError` on every authenticated call to document generation (crm7#1672).

## Measured, 2026-08-13, deno 2.9.5

`deno check` run over every `supabase/functions/*/index.ts` at crm7 `development` (343694c6):

| | count |
|---|---|
| functions scanned | **27** |
| clean | **14** |
| real type errors | **13** (84 errors total) |
| environment failures | **0** |

The zero matters: an earlier run of this same scan reported "27 failing, 0 errors each", which was my harness breaking, not the code. I discarded it and re-ran with the environment failures separated from real diagnostics. These 13 are real.

```
  avetmiss-export/index.ts 3
  charge-rate-quote-dispatch/index.ts 4
  document-encryption/index.ts 4
  document-secure-upload/index.ts 2
  handover-to-employment/index.ts 1
  host-agreement-dispatch/index.ts 2
  lead-capture/index.ts 2
  report-delivery/index.ts 39
  tga-organisation-sync/index.ts 4
  tga-search/index.ts 7
  tga-sync/index.ts 4
  tga-units-sync/index.ts 3
  xero-invoice-submit/index.ts 9
```

## Why a bare `deno check` job cannot just be switched on

It would be red on day one for 13 pre-existing reasons, which trains everyone to ignore it — the same failure as bsuite#1908's permanently-red `Publish`.

## The design that does not have that problem

Gate **everything except an explicit known-failing list** of those 13 paths, at full strength. New functions and cleaned functions are covered from the moment they exist; the list must shrink and can never silently grow.

Do NOT implement this as "typecheck only the files this PR changed". That reads as enforced while silently passing whenever a PR touches nothing — and it would also mean the gate's coverage depends on the diff, so nobody can state what is actually covered.

The known-failing list must be **path-keyed with a freshness check**, or it rots exactly the way the secret-naming allowlist did (bsuite#1951: 4 of 52 entries were dead exemptions, and a rename silently dropped a fifth).

## Also applies to business-suite-unified

Not yet measured there. Its function count is comparable and it shares the `_shared/` idioms, so assume a similar backlog until counted.

## Prior art in this repo

A previous lane correctly rejected "add a Deno CI job" on the grounds that **zero `Deno.test` files exist**, so a test job would gate an empty population. That was right about `deno test` and does not apply to `deno check`: the population here is 27 files and 13 of them are already wrong.

