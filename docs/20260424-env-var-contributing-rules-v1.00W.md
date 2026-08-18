# BSuite — Environment Variable Contributing Rules

**Status:** W (Working — living document)
**Supersedes / amends:** [20260227-contributing-standards-guide-v1.01W.md](20260227-contributing-standards-guide-v1.01W.md) §Env
**Sources:** [20260424-env-var-audit-findings-v1.00A.md](20260424-env-var-audit-findings-v1.00A.md) + [20260424-env-var-audit-matrix-v1.00A.md](20260424-env-var-audit-matrix-v1.00A.md) + root [env.example](../env.example)
**Canonical Supabase project:** `tuybltdrdefjblnplpqo`

> **R80.3 → R80.4 corrected 2026-08-17.** Six rows below (the client-safe stack table, the orphan
> Fair Work variables note, the prefix-rules table, and the integration-map table) named `R80.3` as
> a current app. R80.3 left the submodule set on 2026-08-06 (`5e000c35`, operator directive) and
> R80.4 took its place. This is a living, forward-looking rules document per its own header, so the
> correction is applied in place.

These are **standing, forward-looking rules** for how env vars are named, scoped, and
protected across the BSuite monorepo. They are derived from the 2026-04-24 cross-repo env
audit that found one live auth outage (revoked HS256 anon JWT still referenced by dev
builds), three security bugs, and one deploy-time bomb. Every rule below exists to prevent
a specific real incident that occurred — not speculation.

---

## 1 — Canonical names (authoritative)

The Supabase key format migrated from JWT-based (`eyJ…`) to opaque publishable /
secret keys (`sb_publishable_…` / `sb_secret_…`) at the project level. Every app in the
monorepo authenticates against the same Supabase project, so these names are identical
across all six apps — only the framework prefix differs.

### 1.1 Client-safe (ships to browser) — choose by stack

| Stack | Env var | Example |
|---|---|---|
| Vite (BSU, CRM7, R80.4, braden, throughput) | `VITE_SUPABASE_URL` | `https://tuybltdrdefjblnplpqo.supabase.co` |
| Vite | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| Next.js (conduit) | `NEXT_PUBLIC_SUPABASE_URL` | same URL |
| Next.js | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |

### 1.2 Server-only (never ships to browser) — all apps

| Env var | Purpose | Scope |
|---|---|---|
| `SUPABASE_URL` | Same URL, server context (edge fns, API routes, CLI) | all apps |
| `SUPABASE_SECRET_KEY` | Replaces legacy `SERVICE_ROLE_KEY` | all apps |
| `SUPABASE_ACCESS_TOKEN` | Personal access token for `supabase` CLI | build-only |

---

## 2 — Forbidden names (delete on sight)

These names are **deprecated, renamed, or outright broken**. Adding any of them regresses
prior audit work. A CI check should eventually fail any PR that introduces any of these.

### 2.1 Obsolete anon/service-role names (legacy JWT era)

- `SUPABASE_ANON_KEY` — rename to `SUPABASE_PUBLISHABLE_KEY` then delete
- `SUPABASE_SERVICE_ROLE_KEY` — rename to `SUPABASE_SECRET_KEY` then delete
- `VITE_SUPABASE_ANON_KEY` — rename to `VITE_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — rename to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### 2.2 Redundant / wrong-prefix names

- `VITE_PUBLIC_SUPABASE_*` — any Vite var with *both* `VITE_` and `_PUBLIC_` prefixes is
  wrong. `VITE_` already makes a var public. Delete.
- `SUPABASE_JWT_SECRET` — HS256-era secret. Zero code references across all six repos
  today. Delete.
- `SUPABASE_PUBLISHABLE_KEY` (server-side on some apps) — duplicate of the `VITE_*` /
  `NEXT_PUBLIC_*` variant. Keep only the framework-prefixed one + the server `SECRET_KEY`.

### 2.3 Typos / one-off bugs

- `VITESUPABASE_ANON_KEY` — missing underscore between `VITE` and `SUPABASE`. Silently
  inert at runtime. Existed on throughput until 2026-04-24; cleaned. Do not reintroduce.

### 2.4 Actively dangerous — ships secrets to browser

- `VITE_STRIPE_SECRET_KEY` — any `VITE_*` variable is **inlined into the client bundle**
  at build time. A Stripe secret key under a `VITE_` name ships to every visitor. Exists
  on BSU's Vercel env (no code reference today); delete + rotate the Stripe secret key.
- `VITE_XERO_CLIENT_SECRET` — same failure mode. Referenced in
  [crm7/src/lib/pipelines/xeroInvoiceAdapter.ts:62](../crm7/src/lib/pipelines/xeroInvoiceAdapter.ts#L62).
  If ever populated, the Xero secret ships to browsers. Move the adapter behind a
  Supabase edge function or a server route; read the secret via `Deno.env.get()` /
  `process.env`; rotate the Xero secret after the code fix.

### 2.5 Orphan API variants with no code references

- `FAIRWORK_API_KEY_1`, `FAIRWORK_API_KEY_2`, `FAIRWORK_API_URL` — declared on R80.4;
  no code reads them. Delete. Keep only `FAIRWORK_API_KEY` on R80.4 and BSU (active
  Fair Work edge fn consumers).
- `FAIRWORK_API_KEY`, `FAIRWORK_API_KEY_SECONDARY` on CRM7 — CRM7 does not consume Fair
  Work directly. Delete both.

---

## 3 — Prefix rules (cross-framework)

1. **`VITE_*`** — client bundle inlined at build time. **Never put a secret behind
   `VITE_*`.** Client-safe only: URLs, publishable keys, feature flags, public IDs.
2. **`NEXT_PUBLIC_*`** — same contract, Next.js world. Never put a secret behind it.
3. **No prefix** — server-only. Edge functions (Deno), API routes (Node), CLI
   migrations. Never referenced from a file imported by a client component.
4. **A variable must not exist under both `VITE_*` and `NEXT_PUBLIC_*` prefixes in the
   same project.** Pick one based on the app's stack.

### 3.1 Framework assignments

| App | Stack | Public prefix |
|---|---|---|
| business-suite-unified (BSU) | Vite | `VITE_*` |
| crm7 | Vite | `VITE_*` |
| R80.4 | Vite | `VITE_*` |
| braden | Vite | `VITE_*` |
| throughput | Vite | `VITE_*` |
| conduit | Next.js 16 | `NEXT_PUBLIC_*` |

**Conduit must not declare any `VITE_*` vars.** Delete on sight.

---

## 4 — Rotation policy

### 4.1 Supabase keys

- Legacy HS256 JWT anon keys (format: `eyJhbGciOiJIUzI1NiIs…`) have been **disabled** on
  the canonical Supabase project. The app-accessible publishable key is
  `sb_publishable_cuPRBHTr3iBHMx2ZGky7mA_BLLsyBTv`. Verify via Supabase MCP
  `get_publishable_keys` — `disabled: false` rows are live.
- When Supabase rotates the publishable key, update **every environment (Development,
  Preview, Production) in every Vercel project + every GitHub Actions secret** in a
  single coordinated window. Do not update only Production — past agents have broken
  preview deploys by rotating one env at a time.

### 4.2 Third-party secrets (Stripe, Xero, Azure AD, Google, RAM, Fair Work)

Rotate immediately if any of the following has occurred:

1. Secret appeared in chat / paste buffer / screenshot (including our own sessions).
2. Secret was committed to git at any point, even in a reverted commit (gitleaks hit).
3. Secret was declared under a `VITE_*` / `NEXT_PUBLIC_*` prefix at any time in the past,
   even if no code read it — the build bundle may have captured it.
4. Anyone outside the BSuite ownership is known to have had access to the `.env` file.

### 4.3 Service-account keys

**Banned.** Google Cloud APIs use Workload Identity Federation exclusively (see
[CLAUDE.md](../CLAUDE.md) §Google Cloud Authentication). No SA JSON keys anywhere.

---

## 5 — Presence checklist per project

Before merging any change that adds an integration, verify the env vars are declared
on **both** the Vercel project **and** the repo's `.env.example`. Missing either side
creates the "deploy-time bomb" pattern that took out CRM7 RAM integration.

| Integration | Apps | Required vars |
|---|---|---|
| Supabase (public) | all 6 | `{VITE_,NEXT_PUBLIC_}SUPABASE_URL`, `{VITE_,NEXT_PUBLIC_}SUPABASE_PUBLISHABLE_KEY` |
| Supabase (server) | all 6 | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` |
| Supabase storage S3 | BSU, R80.4, throughput | `SUPABASE_BUCKET_*` × 4 |
| Stripe | BSU, CRM7 | `STRIPE_PUBLISHABLE_KEY` (client), `STRIPE_SECRET_KEY` (server) |
| Xero | CRM7 | `XERO_CLIENT_ID` (client OK), `XERO_CLIENT_SECRET` (server), `XERO_REDIRECT_URI` |
| Fair Work | R80.4, BSU | `FAIRWORK_API_KEY` (server, edge fn) |
| RAM (ATO M2M) | CRM7 | `RAM_CLIENT_ID`, `RAM_CREDENTIAL_ABN`, `RAM_CREDENTIAL_EXPIRES_AT`, `RAM_CREDENTIAL_ENVIRONMENT`, `RAM_PRIVATE_KEY_PKCS8_B64`, `RAM_LEAF_CERT_B64`, `RAM_TOKEN_ENDPOINTS` — **currently undeclared, deploy-time bomb** |
| Google OAuth | CRM7, BSU | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_API_KEY` |
| AI Gateway / Jodie | CRM7, conduit | `AI_GATEWAY_API_KEY`, `JODIE_AI_MODEL_SLUG` |
| Sentry | all 6 | `{VITE_,NEXT_PUBLIC_}SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (build-only) |

The full 166-variable × 6-project matrix is in
[20260424-env-var-audit-matrix-v1.00A.md](20260424-env-var-audit-matrix-v1.00A.md). Run the
matrix before shipping a cross-app integration.

---

## 6 — Environment scoping in Vercel

### 6.1 Production

Prod env vars are **precious** — mutation breaks every logged-in user simultaneously.

- Never rotate a live prod key without a rollback path (keep the old value in a separate
  "previous" var until new is verified green).
- Never remove + re-add the prod entry as a single operation — the gap between `rm` and
  `add` is a real prod outage window. Use `vercel env add --force` which updates in place.
- Never touch prod keys in auto-mode.

### 6.2 Preview

Preview vars are **branch-scopable**. Every preview add in a non-interactive (agent) shell
requires a git branch as the third positional — omitting it fails with
`git_branch_required`.

- Default branch scope for internal preview deploys: **`development`**. Feature-branch
  previews fall through to the no-branch-scope "Preview" entry, which should exist for
  every app as a baseline.
- When rotating a var, update both the branch-scoped `Preview (development)` entry **and**
  the no-branch-scope `Preview` entry, or feature-branch previews silently run on the
  stale value.

### 6.3 Development

`vercel dev` / local `vercel env pull`-ed values. Update these alongside preview so
local developers don't hit 401s from stale revoked keys.

---

## 7 — CI / PR checks (enforce, don't remember)

These don't all exist yet; filing them here as the forward target. Anyone adding a new
env var should also add the matching CI assertion.

1. `grep -r '^VITE_[A-Z_]*SECRET' .env* vercel-env.json` → must return zero lines.
2. `grep -r '^VITE_.*JWT_SECRET' .env*` → zero lines.
3. `grep -r 'SUPABASE_JWT_SECRET' src/` → zero lines (superseded by JWKS).
4. Every `.env.example` must contain every var that appears in a `process.env.` /
   `import.meta.env.` reference in `src/`. Walk the diff and error on missing entries.
5. Before `pnpm build`, assert that every `.env.example` entry has a real value in
   Vercel for at least Development + Preview.
6. Post-build: `grep -rE '(sb_secret_|sk_live_|sk_test_|GOCSPX-)' dist/` → zero matches.
   A hit means a server secret leaked into the client bundle.

---

## 8 — When this document changes

Bump the filename version when a **rule** changes (not when adding informational content).
Version history:

- `v1.00W` (2026-04-24) — initial extraction from the 2026-04-24 env audit. Reflects the
  Supabase publishable-key migration, Xero / Stripe / RAM findings, and the 2026-04-24
  prod outage of dev builds caused by the revoked legacy anon JWT.

---

## 9 — Supersedes

This document supersedes all informal per-app `.env.example` comments that contradict the
naming convention in §1. Each sub-repo's `.env.example` should be brought into alignment
with the root [env.example](../env.example), which is authoritative.
