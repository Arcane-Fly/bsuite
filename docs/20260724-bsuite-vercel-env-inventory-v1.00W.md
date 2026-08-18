# BSuite Vercel Environment Variables — Inventory

> **Naming:** `20260724-bsuite-vercel-env-inventory-v1.00W.md` · Status **W** · Captured via `vercel env ls production` across all 6 linked projects 2026-07-24. Names only (values are Encrypted, never exported).

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## Per-app matrix (production)

| Var | BSU | crm7 | conduit | R80.3 | braden | throughput |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| **Supabase (shared project)** |
| SUPABASE_URL | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SUPABASE_ANON_KEY | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SUPABASE_PUBLISHABLE_KEY | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SUPABASE_JWT_SECRET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SUPABASE_SECRET_KEY | ✅ | — | — | ✅ | — | — |
| VITE_SUPABASE_URL | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| VITE_SUPABASE_ANON_KEY | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| VITE_SUPABASE_PUBLISHABLE_KEY | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| VITE_PUBLIC_SUPABASE_URL | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| VITE_PUBLIC_SUPABASE_ANON_KEY | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| NEXT_PUBLIC_SUPABASE_URL | — | — | ✅ | — | — | — |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | — | — | ✅ | — | — | — |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | — | — | ✅ | — | — | — |
| **Postgres (direct)** |
| POSTGRES_URL / _NON_POOLING / _PRISMA_URL | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| POSTGRES_HOST / _USER / _PASSWORD / _DATABASE | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **App identity / URLs** |
| VITE_APP_URL | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| NEXT_PUBLIC_APP_URL / _APP_NAME | — | — | ✅ | — | — | — |
| **Cross-app OAuth (BS OAuth 2.1)** |
| VITE_BSU_URL | — | ✅ | — | ✅ | ✅ | ✅ |
| VITE_BSU_OAUTH_CLIENT_ID | — | ✅ | — | ✅ | ✅ | ✅ |
| NEXT_PUBLIC_BSU_URL / _OAUTH_CLIENT_ID | — | — | ✅ | — | — | — |
| **Stripe** |
| STRIPE_SECRET_KEY | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| STRIPE_PUBLISHABLE_KEY | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ~~VITE_STRIPE_PUBLISHABLE_KEY~~ | ❌ unused (see bsuite#607) | — | — | — | — | — |
| **AI / Jodie** |
| AI_GATEWAY_API_KEY | ✅ | ✅ | ✅ | ✅ | — | — |
| JODIE_AI_MODEL_SLUG | ✅ | ✅ | ✅ | ✅ | — | — |
| **Social OAuth (Supabase providers)** |
| GOOGLE_CLIENT_ID / _SECRET | ✅ | ✅ | — | ✅ | — | — |
| AZURE_CLIENT_ID / _SECRET | ✅ | ✅ | — | ✅ | — | — |
| SLACK_CLIENT_ID / _APP_ID | — | ✅ | — | — | — | — |
| **Fair Work API** |
| FAIRWORK_API_KEY | ✅ | ✅ | — | ✅ | — | — |
| FAIRWORK_API_KEY_SECONDARY | ✅ | ✅ | — | — | — | — |
| FAIRWORK_API_KEY_1 / _2 | — | — | — | ✅ | — | — |
| **Email / comms** |
| RESEND_API_KEY | ✅ | ✅ | — | — | — | — |
| EMAIL_HOST/PORT/USER/PASSWORD/FROM | — | — | — | — | ✅ | — |
| **Storage / KV** |
| KV_URL, KV_REST_API_URL/TOKEN, KV_REST_API_READ_ONLY_TOKEN | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| BLOB_READ_WRITE_TOKEN | ✅ | — | — | ✅ | ✅ | ✅ |
| SUPABASE_BUCKET_* (4 vars) | ✅ | — | — | ✅ | — | ✅ |
| **Misc / platform** |
| VITE_PLATFORM_KIT_ADMIN_ENABLED | ✅ | — | — | — | — | — |
| VITE_DEVELOPER_EMAILS | — | ✅ | — | — | — | — |
| VITE_R8_URL | — | ✅ | — | — | — | — |
| VITE_RAM_CREDENTIAL_ENVIRONMENT / VITE_RAM_CLIENT_ID | — | ✅ | — | — | — | — |
| VITE_ALLOWED_DOMAINS / CORS_ORIGINS | — | — | — | — | ✅ | — |
| VERCEL_API_KEY / _TOKEN / _PROJECT_ID / _DOMAIN / _PROJECT_PRODUCTION_URL | ✅(some) | — | — | ✅ | ✅ | ✅ |
| SUPABASE_MANAGEMENT_API_TOKEN | ✅ | — | — | — | — | — |
| SNYK_TOKEN | ✅ | ✅ | — | — | — | — |
| ENABLE_EXPERIMENTAL_COREPACK | ✅ | ✅ | ✅ | ✅ | ✅ | — |

## Notes / gaps surfaced

1. **`VITE_STRIPE_PUBLISHABLE_KEY` is NOT set anywhere and NOT used in code** — only referenced in BSU's Developer Portal env checklist (Platform.tsx). bsuite#607 closed as false positive.
2. **conduit uses `NEXT_PUBLIC_*`** (Next.js) where the Vite apps use `VITE_*` — intentional per-framework; the shared Supabase vars are present in both forms.
3. **Stripe publishable** exists as `STRIPE_PUBLISHABLE_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` everywhere — but no `VITE_STRIPE_PUBLISHABLE_KEY`; checkout uses the secret key server-side, so no runtime gap.
4. **`VITE_RAM_CLIENT_ID` + `VITE_RAM_CREDENTIAL_ENVIRONMENT` (crm7 only)** — RAMS/ADMS federal funding-claims channel credentials (per operator 2026-07-24: RAMS = claims, not the training-contract registrar).
5. **Email-ingestion env (for the STA/WAAMS training-contract status signal, conduit#338)** — not yet present. Microsoft's `AZURE_CLIENT_ID/SECRET` + Google's `GOOGLE_CLIENT_ID/SECRET` ARE set (Supabase social OAuth) — reusable for the mail-connect flow if it rides the same provider OAuth; SMTP path would need new `EMAIL_*` vars in the consuming app (braden already has an `EMAIL_*` set as a reference).

> Regenerate with: `for r in business-suite-unified crm7 conduit R80.3 braden throughput; do (cd $r && vercel env ls production); done`
