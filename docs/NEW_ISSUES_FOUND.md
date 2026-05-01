# NEW_ISSUES_FOUND — append-only ledger

Pre-existing issues discovered mid-task during the Five-Wave Stabilization
Plan execution. Each entry has: file path, pattern (A–H per the plan's
root-cause categories), proposed wave, severity, status.

Pattern legend: A=schema-drift, B=CORS-allowlist, C=render-loop, D=error-suppression, E=shared-package adoption gap, F=shipped-but-not-wired, G=visual-edit parity, H=overflow/cutoff

Severity: BLOCKER / HIGH / MEDIUM / LOW

---

## 2026-05-01 — Wave 1 carryovers

### Logged for Wave 5 (systemic guards)

- **`braden/supabase/functions/*/index.ts`** — pattern B — severity LOW
  Four edge functions (add-admin-user, ensure-guest-storage-access,
  list-hero-images, send-confirmation) use wildcard `'Access-Control-Allow-Origin': '*'`.
  Permissive (does not block dev branches) but defeats the security model and
  bypasses rate-limit-by-origin. W5 will introduce shared CORS module + lint
  rule forbidding hardcoded wildcard ACAO.
  Status: TRACKED-W5

- **`throughput/supabase/functions/*/index.ts`** — pattern B — severity LOW
  Three edge functions (bing-search, generate-llm-response, groq-responses-api)
  use wildcard `'Access-Control-Allow-Origin': '*'`. Same pattern as braden.
  Status: TRACKED-W5

- **`R80.3/supabase/functions/*/index.ts`** — pattern E — severity MEDIUM
  Five copies of `ALLOWED_ORIGINS` + `getCorsHeaders` had drifted apart over
  time. W1 already extracted to `_shared/cors.ts`. W5 will add a lint rule
  preventing per-function CORS literals from re-emerging.
  Status: PARTIAL-FIX-W1, LINT-GUARD-W5

### Logged for Wave 4 (real Nav editor)

- **`business-suite-unified/src/pages/Developer/Nav.tsx`** — pattern A+F — severity MEDIUM
  Editor was authored against the original blob `nav_json,version` schema; live
  table is multi-row sections. W1 ships read-only graceful-degrade; W4 ships
  real per-section authoring UI to close the placeholder.
  Status: PLACEHOLDER-W1, REAL-FIX-W4

### Logged for Wave 4 (deeper investigation, billing scope)

- **`crm7/src/lib/invoicing/renderInvoicePdf.ts:481-490`** — pattern A — severity HIGH (when invoice PDF generation is exercised)
  Selects `host_employers!host_employer_id(business_name, address_line1, address_line2, suburb, state, postcode, abn)`. The actual `host_employers` schema has only `id, tenant_id, name, abn, contact_email, contact_phone, address, industry, status, ...` — **none** of business_name/address_line1/address_line2/suburb/state/postcode exist. Likely needs either: (a) host_employers migration to add structured-address fields, or (b) join switched to `employers` table. Investigation owned by W4 (touches billing/invoice generation; potentially needs schema migration).
  Status: TRACKED-W4

- **CRM7 entity type aliases referencing `host_employer.business_name`** — pattern A — severity MEDIUM
  `src/types/entities.ts` (~10 sites) + `src/types/billing.ts` + several store files declare `host_employer?: { id: string; business_name: string }`. The W1 `insuranceQueries.ts` fix uses PostgREST query alias (`business_name:name`) to preserve consumer shape. If these types are populated from joins to `host_employers` (not `employers`), the runtime data won't have `business_name` unless the alias is propagated. Sweep all consumers to confirm they query via the alias OR target `employers` table.
  Status: TRACKED-W4

### Logged for Wave 5 (process / tooling guard)

- **NEVER paste credential values into committed docs (incident 2026-05-02)** — pattern F — severity HIGH (process / security)
  Discovered 2026-05-02 mid-debugging the npm publish flow: I (Claude) included a literal npm token value in `docs/NEW_ISSUES_FOUND.md` while explaining the EOTP failure — even though the doc context was "this token doesn't work for CI". The actual token bytes still leaked into the open PR (#420 head branch); user caught it before merge to main and rotated the token. The truncated `<rotated-token-prefix>` form was also too revealing.
  W5 fix: add `gitleaks` pre-commit hook (or pre-push) to bsuite + all 6 submodules so any accidental credential paste is blocked locally before reaching GitHub. Most repos already run gitleaks in CI, but that's too late — we want LOCAL block. Recipe: `pnpm dlx husky-init && echo 'gitleaks protect --staged --no-banner' > .husky/pre-commit`. Also ensure CLAUDE-class agents are explicitly told: when describing a credential in any doc/PR/commit, use `<REDACTED>` or `<token>` placeholder — never the actual prefix, even truncated, since registries fingerprint by prefix.
  Status: TRACKED-W5

- **`gh pr merge --auto` deletes the `development` branch on dev→main promote** — pattern F — severity HIGH (process)
  Discovered 2026-05-02 mid-W4: crm7 `development` branch was missing on the remote after the W1 promote PR #371 merged. `gh pr merge --squash --auto` defaults to deleting the branch unless `--delete-branch=false` is passed. For SHORT-LIVED feature branches this is correct; for the LONG-LIVED `development` branch it's destructive — the next dev work loses its base. Restored via `gh api -X POST repos/.../git/refs` from main's tip.
  W5 fix: shell helper `bsu_promote_dev_to_main()` in scripts/ that always passes `--delete-branch=false` for promotes from `development`. Optional: GitHub branch protection rule "do not allow deletion of `development` branch" via repo settings.
  Status: TRACKED-W5

### USER-ACTION REQUIRED (blocking publish)

- **`NPM_TOKEN` needs to be an "Automation" type token to bypass 2FA — blocks `@bsuite/page-builder@0.2.0` publish** — severity HIGH
  Discovered 2026-05-02: Codebuff merged `@bsuite/page-builder@0.2.0` (#412) and added the publish workflow. After lockfile-overrides fix (#417), three publish attempts failed:

  **Attempt 1** (run 25204531162, before lockfile fix): `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` — Fixed via #417.

  **Attempt 2** (run 25204766982, with old NPM_TOKEN secret from 2026-04-22):
  ```
  npm error 404 Not Found - PUT https://registry.npmjs.org/@bsuite%2fpage-builder
  npm error 404  could not be found or you do not have permission
  ```
  This was actually wrong-token symptom — the secret held a value that didn't have @bsuite scope.

  **Attempt 3** (run 25205067520, after refreshing NPM_TOKEN secret from the value referenced in `.env.local`):
  ```
  npm error code EOTP
  npm error This operation requires a one-time password.
  ```
  The full-access token works for auth but `npm publish` requires 2FA when the @bsuite scope (or the publishing user) has 2FA-on-publish enforcement. CI tokens need to be of "Automation" type to bypass 2FA.

  **Fix (user-side, ~2 min) — verified against current npm docs (Nov 2025):**
  As of Nov 2025 npm removed the legacy "Automation" token type. The only token type
  is now **Granular Access Token**, but it has a per-token "Bypass 2FA" capability
  flag that replaces what Automation tokens used to do. The pre-existing token in
  `.env.local` (referenced via `NPM_ACCESS_TOKEN`) is a Granular token but does
  NOT have Bypass 2FA enabled — that's why CI publish hits EOTP.

  1. Visit https://www.npmjs.com/settings/garyocean428/tokens/granular-access-tokens/new
  2. Configure:
     - Description: `bsuite-ci-publish`
     - Expiration: 1 year (or custom)
     - **Bypass 2FA** capability: **ENABLE** (this is the key flag)
     - Permissions → Packages and scopes: **Read and write**
     - Selected packages and scopes: `@bsuite` (organization scope)
     - Optionally lock to GitHub Actions IP range
  3. Copy token, then update GitHub secret:
     ```
     echo '<token>' | gh secret set NPM_TOKEN --repo GaryOcean428/bsuite
     ```
  4. Re-run workflow: `gh workflow run publish-page-builder.yml --repo GaryOcean428/bsuite`

  Note: this same secret unblocks the other broken CI publish workflows for
  charge-calc / nav-core / theme / eslint-config (each has its own pre-existing
  failures on earlier steps — TypeScript / install errors — but those are
  separate fixes once token auth is resolved).

  Once 0.2.0 publishes, consumer apps (BSU/CRM7/conduit/R80.3) need their `@bsuite/page-builder` dep bumped from `^0.1.0` → `^0.2.0` (caret on 0.x doesn't span minor).

### Active investigation

(W4 follow-on tracked for next session — Airtable parity (dnd column reorder, filter row, bulk import, field-template export, Sheets export via WIF, BigQuery FDW), PageComposer greenfield, real Nav editor multi-row authoring, W3 follow-on for conduit Next.js adapter + R80.3/throughput/braden admin page wiring, W5 systemic guards CI)
