# BSuite Full Env Audit — 2026-04-24

Scope: 6 Vercel projects × 6 GitHub repos, every env var declared and/or referenced in code.

## Headline findings

### 1. You were right — no HS256 / JWT secret path exists

`SUPABASE_JWT_SECRET` is **referenced zero times** across all six repos. Your stack verifies tokens via JWKS (`getClaims()` → `/.well-known/jwks.json`), which is the correct pattern per the `supabase-auth-comprehensive` skill's Rule #1. The var is a pure orphan from the legacy key era and can be deleted from all six Vercel projects.

### 2. Three genuine security bugs found

**A. `VITE_STRIPE_SECRET_KEY` declared in `business-suite`.**
Any `VITE_*` variable gets inlined into the client bundle by Vite at build time. If this variable is ever populated and referenced in code, your Stripe live secret key ships to every user's browser. **Delete the var from Vercel immediately. Rotate the Stripe secret regardless** — it was exposed in this thread and potentially in past builds. It's not referenced in code today, but the name existing in Vercel invites future mistakes.

**B. `VITE_XERO_CLIENT_SECRET` is in runtime code.**
`crm7/src/lib/pipelines/xeroInvoiceAdapter.ts:62`:

```ts
clientSecret: import.meta.env.VITE_XERO_CLIENT_SECRET ?? process.env.XERO_CLIENT_SECRET ?? ''
```

This adapter is reachable from the Vite client path. If `VITE_XERO_CLIENT_SECRET` is ever set on the `crm7` Vercel project, the Xero secret ships to browsers. Today it's unset, so the code falls through to `''` and OAuth fails rather than leaks — but the bug is latent. **Fix by moving the Xero invoice adapter behind a Supabase Edge Function or Next.js API route**, read `XERO_CLIENT_SECRET` via `Deno.env.get()` / `process.env` only. Rotate the Xero secret after the fix lands since it was exposed in this thread.

**C. `VITESUPABASE_ANON_KEY` typo in `throughput` Vercel env.**
Missing underscore (`VITESUPABASE_` vs `VITE_SUPABASE_`). Silently does nothing at runtime. Delete.

### 3. RAM credentials are coded but never declared (deploy-time bomb)

The CRM7 repo has a complete RAM integration at `crm7/src/lib/integrations/ram/createRamClientFromEnv.ts` that reads 7 env vars:

```
RAM_PRIVATE_KEY_PKCS8_B64
RAM_LEAF_CERT_B64
RAM_CLIENT_ID
RAM_CREDENTIAL_ABN
RAM_CREDENTIAL_EXPIRES_AT
RAM_CREDENTIAL_ENVIRONMENT
RAM_TOKEN_ENDPOINTS
```

**None of these are declared on the CRM7 Vercel project.** Any path that calls `createRamClientFromEnv()` in production fails immediately with missing-env errors. You need to add all seven to the `crm7` project (and consider `business-suite` too if GTO/RTO functions rely on ATO M2M). The values you pasted can be reused — but rotate the private key since it was exposed.

### 4. Fairwork is wired up; configuration is sloppy

| Project | Fairwork status |
|---|---|
| r8 | Uses `FAIRWORK_API_KEY` in 4 edge functions: `auth-fairwork`, `get-fairwork-api-key`, `sync-award-rates`, `update-wage-rates`. Also declares `FAIRWORK_API_KEY_1`, `_2`, `_URL` that **no code references** — orphans. |
| business-suite | Uses `FAIRWORK_API_KEY` in 2 edge functions: `fairwork-enhanced`, `process-webhook-queue`. Declares `FAIRWORK_API_KEY_SECONDARY` that no code references. |
| crm7 | Declares `FAIRWORK_API_KEY` + `_SECONDARY` — **zero code references**. Dead config. |
| braden, conduit, throughput | No Fairwork anywhere. |

Recommendation: keep `FAIRWORK_API_KEY` on r8 + business-suite only. Delete every `_1`, `_2`, `_URL`, `_SECONDARY` variant until failover code exists that needs them. Delete all Fairwork vars from crm7.

### 5. Xero is fully wired — in crm7 only

Confirmed real runtime references across 4 files:

- `src/lib/ai/plugins/xero/xero-service.ts`
- `src/lib/payroll/xeroAdapter.ts`
- `src/lib/pipelines/xeroInvoiceAdapter.ts` (the bug above)
- `supabase/functions/xero-token-exchange/index.ts`

`XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_REDIRECT_URI` are both declared on `crm7` and used — good. `VITE_XERO_CLIENT_ID` is also used (in client-side OAuth start flow); that's fine as a public identifier. But `VITE_XERO_CLIENT_SECRET` must go (see bug B).

### 6. Structural duplicates still pervasive

From the earlier Supabase audit — nothing has changed: every Vite project still has 3 redundant `VITE_PUBLIC_SUPABASE_*` vars, every project has 7 orphan `POSTGRES_*` vars (likely build-only, verify CI scripts before deletion), and legacy `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` still hold new-format keys under old names.

## Full matrix

See `matrix_full.md` — 166 variables × 6 projects. Legend: **B**=declared+used, **D**=declared only (orphan), **U**=used only (missing), **—**=neither.

## Priority fix order

**Today:**

1. Rotate all secrets that appeared in the prior message (still unaddressed).
2. Delete `VITE_STRIPE_SECRET_KEY` from `business-suite` Vercel project.
3. Delete `VITESUPABASE_ANON_KEY` (typo) from `throughput`.
4. Add the 7 `RAM_*` vars to `crm7` Vercel project — or the first caller crashes.

**This week:**
5. Fix `xeroInvoiceAdapter.ts` to stop reading `VITE_XERO_CLIENT_SECRET`. Move to server-side.
6. Add `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` as canonical names across all 6 projects, wire fallback chains in code per `auth-setup` skill, redeploy, then delete legacy `ANON_KEY` / `SERVICE_ROLE_KEY` / `JWT_SECRET`.
7. Delete orphan Fairwork variants from `r8` and `crm7`.
8. Audit `package.json` scripts and CI workflows for `POSTGRES_*` usage; delete where unused.

**Cleanup:**
9. Delete all `VITE_PUBLIC_SUPABASE_*` duplicates from every project.
10. Delete all `VITE_*` vars from `conduit` (it's Next.js).
11. Either consolidate `VERCEL_TOKEN` / `VERCEL_API_KEY` or document why both exist.
12. Either consolidate `SUPABASE_ACCESS_TOKEN` / `SUPABASE_MANAGEMENT_API_TOKEN` similarly.

## Files

- `AUDIT_FINDINGS.md` — this file
- `.env.example` — unified template with per-project tags
- `matrix_full.md` — 166-var × 6-project matrix
- `all_declared.json` — raw declared vars per project
- `all_usage.json` — raw code references per project
- `env-dumps/*.txt` — raw `vercel env ls` per project
