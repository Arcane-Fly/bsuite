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

### Active investigation

(W1.D NOISE_PATTERNS sibling sweep is next — additions land here)
