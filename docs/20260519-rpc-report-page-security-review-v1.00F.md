# `rpc_report_page` — Security Review & Implementation Specification

> ## ⚠ SUPERSEDED — 2026-08-17
>
> **The architecture this review secures was replaced.** It is marked `A` and its own header says
> *"Approved spec; not yet implemented in production"* — and it never was. The `report_catalog_*`
> family won instead: **14 functions live** in `public` on `tuybltdrdefjblnplpqo`, verified
> 2026-08-17, including `report_catalog_resolve_entity`, `report_catalog_build_filter`,
> `report_catalog_caller_may_access_field` and `report_catalog_verify_entity_scope`.
>
> An Approved document describing unbuilt work is how a superseded decision survives, so this banner
> is the correction rather than a status-letter change.
>
> **Do not implement this spec.** Its threat analysis is still worth reading — the field-level PII
> and tenant-scope concerns it raises are exactly what `report_catalog_caller_may_access_field` and
> `report_catalog_entity_tenant_scope` exist to answer — but verify any control against the live
> catalog, never against this document.

> **Status: Superseded.** This document describes a past state and will not be revised.
>
> **Marker corrected 2026-08-28: `v1.00A` → `v1.00F`.** The banner above is this document's own
> declaration that it is closed; `A` said the opposite. Under the operator ruling of
> 2026-08-26, **`F` means frozen** — a statement about this document's *mutability*, not a claim
> that the work it describes is current and not a ranking of authority against its successor.
> This supersedes the reasoning in the banner above, which kept `A` because it read `F` as a
> completion claim. The 2026-08-26 ruling settles that: `F` is mutability, so the fact that the
> spec *was approved* on 2026-05-19 is preserved by this note rather than by a letter that also
> reads as "ready for use" on a spec the banner says must not be implemented.


| Field | Value |
| --- | --- |
| Document version | v1.00F (Frozen) — **approved 2026-05-19 and never implemented; superseded, see the banner above.** The letter was `A` until 2026-08-28 on the reasoning that it recorded the fact of approval. The operator's 2026-08-26 ruling replaced that: `F` states this document will not change again, which is true, while `A` also reads as *ready for use* on a spec that must not be built. The approval remains a fact and is recorded in this row; it is no longer carried by a letter that misstates the document's status. |
| Date | 2026-05-19 |
| Backlog ID | G-5 (`docs/20260501-merged-execution-backlog-v1.00W.md`) |
| Issue | [bsuite#494](https://github.com/GaryOcean428/bsuite/issues/494) |
| Source resolution | `crm7/docs/00-roadmap/20260424-bsuite-combined-foundations-and-gto-v1.00W.md` §IS-5, §IS-5b |
| Status | **SPEC ONLY — function does not exist in production** (verified 2026-05-19 via Supabase MCP) |
| Cross red-team | Pending — implementer must name verifier before merge |
| Validation loop | §9.1 output-equivalence (per-template baseline vs RPC) + role-matrix Playwright |

---

## 0. Audience & Purpose

This document is the **security specification** for the proposed generic SQL function

```sql
public.rpc_report_page(
  template_id uuid,
  page        int,
  page_size   int,
  filters     jsonb,
  sort        jsonb
) RETURNS jsonb
```

which powers the **AG Grid Enterprise server-side row model** for the 7 GTO mandatory report templates (and any tenant-cloned variants seeded from them per IS-7).

The implementer **must follow this spec verbatim** before the function ships to production. Deviations require a follow-up PR amending this document.

---

## 1. Threat Model

### 1.1 Actors (callers)

| Actor | Allowed? | Channel |
| --- | --- | --- |
| `authenticated` GoTrue session (any of the five GTO roles in `org_members.gto_role`) | **Yes** | PostgREST `POST /rest/v1/rpc/rpc_report_page` |
| `service_role` (cron, edge functions exporting reports) | **Yes** (explicit grant) | PostgREST + direct SQL |
| `anon` (unauthenticated) | **No — REVOKE EXECUTE FROM anon** | N/A |
| Cross-tenant authenticated user (no `org_members` row for `template_id`'s tenant) | **No — empty result, no error leak** | N/A |

The function is **never anonymous-callable** under any pathway. Mirroring the pattern from `is_gto_staff()` / `get_user_gto_role()` (`crm7/supabase/migrations/20260423100000_ws8_org_members_gto_role_helpers.sql` lines 211–221), `anon` is explicitly `REVOKE`d.

### 1.2 Asset surface

The function can return rows from **any table the implementer references inside the function body** — that is the whole point of a generic RPC. Sensitive surfaces include:

- `wage_calculation_snapshots` (pay rates, classifications, charge-out)
- `timesheets` (apprentice hours, host signoffs)
- `pay_runs`, `pay_run_lines` (gross pay, super, withholding)
- `compliance_events`, `disciplinary_records`, `pip_actions`
- `apprentices`, `placements`, `host_employer_engagements`
- AVETMISS-aligned demographic fields (indigenous status, disability) — see IS-2

### 1.3 What the function MUST NOT do

1. Return any row that the caller's RLS would deny on a direct `SELECT` against the underlying table.
2. Trust any caller-supplied value as a tenant boundary, role, or scope.
3. Execute caller-controlled SQL fragments via `EXECUTE`, `format()`, or string concatenation.
4. Bypass the rate-limit / row-cap guardrails defined in §7.
5. Emit error messages that disclose the underlying schema (column names, table names, role tiers) beyond the standard PostgREST 401/403/404.

### 1.4 Threat catalogue (numbered for traceability)

| ID | Threat | Mitigation section |
| --- | --- | --- |
| T-1 | Tenant boundary bypass via caller-supplied `tenant_id` in `filters` | §2 |
| T-2 | Role escalation via caller-supplied `gto_role` in `filters` | §2 |
| T-3 | SQL injection via `sort.column_name` interpolation | §4 |
| T-4 | SQL injection via dynamically built filter predicates | §3, §4 |
| T-5 | Search-path hijack (`SECURITY DEFINER` running attacker-shimmed `auth.uid()` etc.) | §5 |
| T-6 | Denial of service via uncapped `page_size` or unindexed sort | §6 |
| T-7 | Stealth data exfiltration (no audit) | §7 |
| T-8 | PII leakage to roles below threshold | §8 |
| T-9 | Privilege escalation by direct EXECUTE on the function from `anon` | §9 |
| T-10 | RLS-equivalence drift — RPC returns rows direct `SELECT` would not | §10 |

---

## 2. JWT-Derived Filter Injection (T-1, T-2)

### 2.1 Doctrine

> **The function derives every authorization scope from `auth.jwt()` — never from the `filters` JSONB.**

The five canonical scope values are:

| Scope | Source helper | Migration |
| --- | --- | --- |
| `tenant_id` | `(SELECT public.auth_tenant_id())` | `20260226000004_fix_rls_infinite_recursion.sql` |
| `gto_role` | `public.get_user_gto_role()` | `20260423100000_ws8_org_members_gto_role_helpers.sql` |
| `host_employer_id` (for `host_supervisor`) | `public.get_user_host_employer_id()` | same |
| `apprentice_id` (for `apprentice`) | `public.get_user_apprentice_id()` | same |
| `is_gto_admin` (scope widening flag) | `public.is_gto_admin()` | same |

All helpers are `SECURITY DEFINER STABLE` with `SET search_path = 'public', 'pg_temp'` and `REVOKE EXECUTE FROM anon`. They are the **only** source of truth for these values inside `rpc_report_page`.

### 2.2 Forbidden filter keys

The following keys are **reserved scope keys**. If the caller passes any of them in `filters`, the function **MUST abort with SQLSTATE `42501` (insufficient_privilege)** and write an audit event (`action='report.scope_injection_blocked'`).

```text
tenant_id, org_id, gto_role, role, user_id, host_employer_id, apprentice_id,
auth_uid, claims, jwt, app_metadata, user_metadata, scope, is_admin
```

### 2.3 Reference implementation pattern

```sql
CREATE OR REPLACE FUNCTION public.rpc_report_page(
  template_id uuid,
  page        int    DEFAULT 0,
  page_size   int    DEFAULT 50,
  filters     jsonb  DEFAULT '{}'::jsonb,
  sort        jsonb  DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE              -- read-only; no DML except the audit_events insert (see §7)
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_tenant_id        uuid := (SELECT public.auth_tenant_id());
  v_gto_role         public.gto_role := public.get_user_gto_role();
  v_host_employer_id uuid := public.get_user_host_employer_id();
  v_apprentice_id    uuid := public.get_user_apprentice_id();
  v_template         public.report_templates%ROWTYPE;
  v_forbidden_keys   text[] := ARRAY[
    'tenant_id','org_id','gto_role','role','user_id',
    'host_employer_id','apprentice_id','auth_uid','claims','jwt',
    'app_metadata','user_metadata','scope','is_admin'
  ];
  v_key              text;
BEGIN
  -- ─── 1. Hard-fail if caller is not authenticated ────────────────────
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'rpc_report_page: unauthenticated'
      USING ERRCODE = '42501';
  END IF;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'rpc_report_page: no tenant association'
      USING ERRCODE = '42501';
  END IF;

  -- ─── 2. Reject scope-injection attempts (T-1, T-2) ──────────────────
  FOREACH v_key IN ARRAY v_forbidden_keys LOOP
    IF filters ? v_key THEN
      PERFORM public.fn_audit_report_query(
        v_tenant_id, template_id, 'report.scope_injection_blocked',
        0, jsonb_build_object('rejected_key', v_key)
      );
      RAISE EXCEPTION 'rpc_report_page: forbidden filter key %', v_key
        USING ERRCODE = '42501';
    END IF;
  END LOOP;

  -- ─── 3. Resolve the template (RLS on report_templates already scopes
  --       this to system rows OR caller's tenant — see §10) ───────────
  SELECT * INTO v_template
    FROM public.report_templates
   WHERE id = template_id
   LIMIT 1;

  IF v_template.id IS NULL THEN
    RAISE EXCEPTION 'rpc_report_page: template not found or not visible'
      USING ERRCODE = '42501';   -- intentionally 42501, not 'not found',
                                 -- to avoid leaking existence of templates
                                 -- in other tenants.
  END IF;

  -- … (continued in §3, §4, §6, §7, §8)
END;
$$;
```

The takeaway: **every authorization variable comes from `v_*` locals derived inside the function**. The `filters` JSONB is for *content*, never for *scope*.

---

## 3. Allowed Filter Shape (T-4)

### 3.1 Whitelist, never blocklist

Each `report_templates` row owns the schema for what its callers may filter on. Two new columns:

```sql
-- Migration: 20260520000000_report_templates_filter_sort_whitelists.sql
ALTER TABLE public.report_templates
  ADD COLUMN IF NOT EXISTS allowed_filter_keys text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allowed_sort_columns text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pii_fields text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pii_min_role public.gto_role
    NOT NULL DEFAULT 'gto_admin',
  ADD COLUMN IF NOT EXISTS max_page_size int NOT NULL DEFAULT 1000
    CHECK (max_page_size BETWEEN 1 AND 5000),
  ADD COLUMN IF NOT EXISTS audit_mode text NOT NULL DEFAULT 'synchronous'
    CHECK (audit_mode IN ('synchronous', 'notify'));

COMMENT ON COLUMN public.report_templates.allowed_filter_keys IS
  'Whitelist of filter keys callers may pass in rpc_report_page(filters). Any key not in this array is rejected with SQLSTATE 42501.';

COMMENT ON COLUMN public.report_templates.allowed_sort_columns IS
  'Whitelist of column identifiers (UNQUALIFIED) callers may sort by. Used inside the function to validate sort[].column_name before interpolation.';

COMMENT ON COLUMN public.report_templates.pii_fields IS
  'Columns to NULL out in the response when caller gto_role rank < pii_min_role rank. See §8.';
```

The 7 GTO templates are seeded with their whitelists in the same migration. Adding a new filterable column **requires a template-row update PR** — there is no runtime mechanism to widen the surface.

### 3.2 Filter validation pattern

```sql
-- ─── 4. Validate every filter key is in the template's whitelist ────
SELECT array_agg(k) INTO v_unknown_keys
  FROM jsonb_object_keys(filters) k
 WHERE k <> ALL(v_template.allowed_filter_keys);

IF v_unknown_keys IS NOT NULL AND array_length(v_unknown_keys, 1) > 0 THEN
  RAISE EXCEPTION 'rpc_report_page: unknown filter keys %', v_unknown_keys
    USING ERRCODE = '42501';
END IF;
```

### 3.3 Filter *value* validation

Per-key value validators live alongside the template. The implementer **MUST** validate value shapes (`uuid`, `date`, `text` length cap, enum membership) before the value reaches a query predicate. Cast errors are caught and re-thrown as `42501`, never as a Postgres cast error, to avoid leaking column types.

The recommended pattern is one `CASE` expression per template inside the function body — verbose but explicit. The alternative (storing a JSONB schema in `report_templates.filter_schema` and using `jsonb_typeof` + cast probes) is also acceptable but adds runtime complexity. The MVP uses the explicit `CASE` approach.

---

## 4. SQL-Injection Vectors (T-3, T-4)

### 4.1 `filters` JSONB

The `filters` JSONB is **never concatenated into a SQL string**. All filter values reach the planner via parameterised predicates, e.g.:

```sql
WHERE
  ($1 IS NULL OR ws.placement_id = ($1)::uuid)
  AND ($2 IS NULL OR ws.period_start >= ($2)::date)
  -- where $1 = filters->>'placement_id', $2 = filters->>'period_start'
```

If the implementer uses `EXECUTE` for a dynamic FROM clause (e.g. switching between `wage_calculation_snapshots` and `timesheets` based on `v_template.id`), **the FROM clause MUST be a literal `format('%I', table_name)`** where `table_name` comes from a `CASE` over `v_template.id` — never from `filters`, `sort`, or `template_id` directly.

### 4.2 `sort` JSONB — the actual vector

The `sort` parameter is shaped as `jsonb[]`, e.g.

```json
[{"column_name": "period_start", "direction": "desc"}, {"column_name": "apprentice_name", "direction": "asc"}]
```

`column_name` is a SQL identifier and **must** be interpolated via `format('%I', ...)`. Mitigation:

```sql
-- ─── 5. Validate sort columns against the template whitelist ────────
WITH s AS (
  SELECT
    elem->>'column_name' AS col,
    lower(coalesce(elem->>'direction', 'asc')) AS dir
  FROM jsonb_array_elements(sort) elem
)
SELECT bool_and(s.col = ANY(v_template.allowed_sort_columns))
       AND bool_and(s.dir IN ('asc', 'desc'))
  INTO v_sort_ok
  FROM s;

IF NOT coalesce(v_sort_ok, true) THEN
  RAISE EXCEPTION 'rpc_report_page: unknown or invalid sort column/direction'
    USING ERRCODE = '42501';
END IF;

-- Build the ORDER BY clause from validated identifiers only
SELECT string_agg(format('%I %s', col, upper(dir)), ', ')
  INTO v_order_by
  FROM (
    SELECT elem->>'column_name' AS col,
           lower(coalesce(elem->>'direction', 'asc')) AS dir,
           ordinality
      FROM jsonb_array_elements(sort) WITH ORDINALITY elem(elem, ordinality)
  ) ordered
  ORDER BY ordinality;
```

Because `s.col` has already been compared against the `text[]` whitelist, `format('%I', col)` cannot smuggle a payload — the only strings that survive the gate are exact matches for known column names.

### 4.3 `direction`

Always lower-cased before comparison; always upper-cased before interpolation; always whitelisted to `asc | desc` (no `NULLS FIRST` / `NULLS LAST` in MVP — if required, add an explicit enum `('asc','desc','asc_nulls_last','desc_nulls_last')` and map to the corresponding clause).

---

## 5. Privilege Escalation & Search Path (T-5)

### 5.1 Function declaration boilerplate

Every function in the `rpc_report_page` call graph **MUST** carry:

```sql
LANGUAGE plpgsql            -- or sql; both are fine
STABLE                      -- never VOLATILE except the audit-write helper
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
```

The `SET search_path` clause is **non-negotiable** — without it, an attacker who creates a table/function in a schema earlier in their personal `search_path` could shim `auth.uid()`, `org_members`, or any helper.

### 5.2 Helper functions called inside `rpc_report_page`

The helpers in §2.1 already carry `SET search_path = 'public', 'pg_temp'` per migration `20260423100000_ws8_org_members_gto_role_helpers.sql` lines 132–134, 150–151, 167–168, 182–183, 198–199. **No new helper may be added without the same lock.**

### 5.3 Audit-write helper (`fn_audit_report_query`)

This is the **only** `VOLATILE` member of the call graph — it performs the INSERT into `audit_events`. It is `SECURITY DEFINER` with the same `search_path` lock, and is REVOKEd from `anon` + `authenticated` (callable only from inside `rpc_report_page` itself, which inherits its privileges).

### 5.4 Owner & grants

```sql
ALTER FUNCTION public.rpc_report_page(uuid, int, int, jsonb, jsonb)
  OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.rpc_report_page(uuid, int, int, jsonb, jsonb)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.rpc_report_page(uuid, int, int, jsonb, jsonb)
  TO authenticated, service_role;
```

`PUBLIC` is the implicit pseudo-role granted by Postgres on `CREATE FUNCTION` — the `REVOKE PUBLIC` is **mandatory** even though `anon` is also explicit. (`anon` is part of `PUBLIC` only by membership; revoking both is belt-and-braces.)

---

## 6. DoS & Cost Caps (T-6)

### 6.1 `page_size` cap

```sql
-- ─── 6. Cap page_size to the template's max, hard cap 1000 ──────────
v_page_size := least(coalesce(page_size, 50), v_template.max_page_size, 1000);
v_page      := greatest(coalesce(page, 0), 0);
v_offset    := v_page * v_page_size;

-- Reject pathological offsets (page * page_size > 1e6 = "seek elsewhere")
IF v_offset > 1000000 THEN
  RAISE EXCEPTION 'rpc_report_page: pagination offset too large (use keyset cursor instead)'
    USING ERRCODE = '54000';   -- program_limit_exceeded
END IF;
```

### 6.2 Indexed-sort requirement

The `report_templates.allowed_sort_columns` whitelist is **also** an index-coverage contract. The DBA review (Implementation checklist item #8) confirms each whitelisted column has a usable B-tree index on the underlying table — otherwise the OFFSET/LIMIT path degenerates into a seq-scan on tables with millions of rows (pay_run_lines, audit_events themselves).

### 6.3 Statement timeout

Inside the function:

```sql
SET LOCAL statement_timeout = '15s';   -- transactional; resets on RPC return
```

Caps individual call cost. Per-tenant rate limiting at the PostgREST/Edge layer is **out of scope** for this function but is tracked separately under §16 of the contributing standards.

### 6.4 Keyset pagination (future, not MVP)

The MVP uses `OFFSET/LIMIT`. The cap at §6.1 prevents pathological pages, but for the 7 GTO templates the row counts are bounded (per-tenant per-period), so OFFSET is acceptable. If a tenant has >1M rows in a template's result, a v1.1 spec adds keyset pagination via `cursor jsonb` parameter — out of scope here.

---

## 7. Audit Trail (T-7)

### 7.1 Schema extension

The current `audit_events` table (`20260228130200_create_audit_trail.sql`) has a CHECK constraint on `action`:

```sql
action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
```

This **must be relaxed** to accept the new `report.*` action namespace. New migration:

```sql
-- 20260520010000_audit_events_action_check_widen.sql
ALTER TABLE public.audit_events
  DROP CONSTRAINT IF EXISTS audit_events_action_check;

ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_action_check
  CHECK (
    action IN ('INSERT', 'UPDATE', 'DELETE')
    OR action LIKE 'report.%'
    OR action LIKE 'rpc.%'
  );
```

A small `metadata jsonb` column should be added if not already present, to hold per-call payload (row_count, filter digest, redaction count):

```sql
ALTER TABLE public.audit_events
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
```

### 7.2 Audit write helper

```sql
CREATE OR REPLACE FUNCTION public.fn_audit_report_query(
  p_tenant_id   uuid,
  p_template_id uuid,
  p_action      text,
  p_row_count   int,
  p_metadata    jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  INSERT INTO public.audit_events
    (tenant_id, user_id, entity_type, entity_id, action, metadata)
  VALUES
    (p_tenant_id,
     (SELECT auth.uid()),
     'report_template',
     p_template_id,
     p_action,
     p_metadata || jsonb_build_object('row_count', p_row_count));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_audit_report_query(uuid, uuid, text, int, jsonb)
  FROM PUBLIC, anon, authenticated;
-- Callable only from SECURITY DEFINER context (i.e. inside rpc_report_page).
```

### 7.3 Synchronous vs `pg_notify` mode

`report_templates.audit_mode` switches between:

- `'synchronous'` — every call writes a row to `audit_events`. Default for MVP. Cost: ~1ms per call.
- `'notify'` — emit `pg_notify('report_query', json)`; a consumer (edge function, async worker) batches writes. Use only for high-frequency / dashboard-style templates where synchronous insert is >5% of call time.

The implementer **MUST default new templates to `synchronous`** and document the cost trade-off before flipping any template to `'notify'`.

### 7.4 What MUST appear in every audit row

| Field | Required value |
| --- | --- |
| `action` | `'report.query'` (success) / `'report.scope_injection_blocked'` / `'report.unknown_filter_key'` / `'report.unknown_sort_column'` / `'report.pii_redacted'` |
| `tenant_id` | `v_tenant_id` (NEVER caller-supplied) |
| `user_id` | `(SELECT auth.uid())` |
| `entity_type` | `'report_template'` |
| `entity_id` | `template_id` |
| `metadata.row_count` | actual row count returned (post-pagination, post-redaction) |
| `metadata.filter_digest` | `md5(filters::text)` — let auditors group identical queries without storing PII filter values |
| `metadata.gto_role` | `v_gto_role` |
| `metadata.redacted_field_count` | `coalesce(array_length(v_template.pii_fields, 1), 0)` if redaction triggered, else 0 |

---

## 8. PII Redaction (T-8)

### 8.1 `gto_role` rank ordering

For redaction decisions, gto_role is ranked:

```text
gto_admin       = 5
gto_staff       = 4
field_officer   = 3
host_supervisor = 2
apprentice      = 1
```

A small helper inside the function (or as a separate `SECURITY DEFINER` helper):

```sql
CREATE OR REPLACE FUNCTION public.gto_role_rank(r public.gto_role)
RETURNS int
LANGUAGE sql
IMMUTABLE
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT CASE r
    WHEN 'gto_admin'       THEN 5
    WHEN 'gto_staff'       THEN 4
    WHEN 'field_officer'   THEN 3
    WHEN 'host_supervisor' THEN 2
    WHEN 'apprentice'      THEN 1
  END;
$$;
```

### 8.2 Redaction pattern

```sql
-- ─── 7. Build result set, then redact PII fields if rank too low ────
v_should_redact := public.gto_role_rank(v_gto_role)
                   < public.gto_role_rank(v_template.pii_min_role);

IF v_should_redact AND array_length(v_template.pii_fields, 1) > 0 THEN
  -- Rewrite the JSON rows with NULL for each pii_field
  SELECT jsonb_agg(
           (SELECT jsonb_object_agg(k, CASE WHEN k = ANY(v_template.pii_fields) THEN NULL ELSE v END)
            FROM jsonb_each(row_obj) AS r(k, v))
         )
    INTO v_rows_redacted
    FROM unnest(v_rows) row_obj;

  v_rows := v_rows_redacted;

  PERFORM public.fn_audit_report_query(
    v_tenant_id, template_id, 'report.pii_redacted',
    array_length(v_rows, 1),
    jsonb_build_object(
      'redacted_field_count', array_length(v_template.pii_fields, 1),
      'caller_role', v_gto_role,
      'min_role', v_template.pii_min_role
    )
  );
END IF;
```

### 8.3 Field-level vs row-level redaction

This spec defines **field-level** redaction (NULL out columns). Row-level redaction (e.g. apprentice sees only their own rows) is **already enforced** by the RLS on the underlying tables when the underlying SELECT respects the caller's effective auth — but since `rpc_report_page` is `SECURITY DEFINER`, RLS is **bypassed**. The function therefore **MUST re-implement the row-level scope itself** for every template, mirroring the RLS WHERE-clauses on the underlying tables (T-10, §10).

---

## 9. REVOKE Chain (T-9)

The full grant matrix:

```sql
-- Function itself
REVOKE EXECUTE ON FUNCTION public.rpc_report_page(uuid, int, int, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_report_page(uuid, int, int, jsonb, jsonb) TO authenticated, service_role;

-- Internal audit helper — callable only from SECURITY DEFINER context
REVOKE EXECUTE ON FUNCTION public.fn_audit_report_query(uuid, uuid, text, int, jsonb) FROM PUBLIC, anon, authenticated;

-- gto_role_rank — pure function, no auth dependency, safe to grant
GRANT EXECUTE ON FUNCTION public.gto_role_rank(public.gto_role) TO authenticated;

-- The five JWT helpers — already revoked/granted in the WS-8 migration; do not re-grant here.
```

A `pgTAP` smoke test (Implementation checklist item #9) asserts the grant matrix on every CI run.

---

## 10. RLS-Equivalence Drift (T-10)

### 10.1 The structural risk

`SECURITY DEFINER` bypasses RLS. If the policies on `wage_calculation_snapshots`, `timesheets`, etc. evolve (new tenant-scoping column, new role tier, new soft-delete flag), but `rpc_report_page`'s baked WHERE-clauses do not, the function leaks rows.

### 10.2 Required mitigations

1. **Per-template baked WHERE clauses live in code, not in a JSON column.** They are reviewed in code review by a security reviewer named on the PR.
2. **`pgTAP` parity tests** (Implementation checklist item #10): for each of the 7 templates and each of the 5 gto_role tiers, assert that `rpc_report_page(template_id, ...)` returns **the same row set** as a direct authenticated `SELECT` against the underlying table(s) using a real PostgREST request as the same role.
3. **CODEOWNERS gate**: `crm7/supabase/migrations/*rpc_report_page*.sql` requires review from the security reviewer named in CODEOWNERS.
4. **No template-conditional code paths inside the function may reference a table that does not appear in the corresponding template's `query_definition` JSON**. A simple lint can enforce this.

### 10.3 Worked example — wage_calculation_snapshots template

The RLS policy on `wage_calculation_snapshots` (per the table's own migration; verify against live state before implementing) scopes by tenant and gto_role:

```sql
-- Equivalent WHERE clause baked into rpc_report_page when template_id = wage_snapshots:
WHERE ws.tenant_id = v_tenant_id
  AND (
    v_gto_role IN ('gto_admin', 'gto_staff')
    OR (v_gto_role = 'field_officer'
        AND ws.placement_id IN (SELECT id FROM placements WHERE field_officer_id = (SELECT auth.uid())))
    OR (v_gto_role = 'host_supervisor'
        AND ws.host_employer_id = v_host_employer_id)
    OR (v_gto_role = 'apprentice'
        AND ws.apprentice_id = v_apprentice_id)
  )
```

This MUST be kept in sync with the table's actual RLS policies; the pgTAP parity test (§10.2.2) is the enforcement mechanism.

---

## 11. Three-Role Playwright Matrix

Beyond pgTAP, a Playwright suite (per the roadmap line 431 — "three-role Playwright matrix green for report access") exercises:

| Role fixture | Templates accessible | Templates 403 | PII visible? |
| --- | --- | --- | --- |
| `gto_admin_user` | all 7 | none | yes |
| `gto_staff_user` | all 7 | none | yes (unless `pii_min_role > gto_staff`) |
| `field_officer_user` | only those covering their placements | the rest | scoped |
| `host_supervisor_user` | only those covering their host_employer_id | the rest | NULLed for fields in `pii_fields` |
| `apprentice_user` | only own-data templates | the rest | NULLed |

The matrix runs in the regular Playwright CI lane; failures gate the merge.

---

## 12. Failure-Mode Catalogue (operator-facing)

| Error message (PostgREST) | Cause | Operator action |
| --- | --- | --- |
| `42501 — rpc_report_page: unauthenticated` | No `auth.uid()`; calling client missed Authorization header | Fix client; check `Authorization: Bearer <jwt>` |
| `42501 — rpc_report_page: no tenant association` | User has no `user_tenants` row (or status != 'active') | Add to org_members or activate user_tenants |
| `42501 — rpc_report_page: forbidden filter key X` | Caller attempted scope injection — **security alert** | Page security; the filter key is in the forbidden list |
| `42501 — rpc_report_page: unknown filter keys [...]` | Caller passed a filter key not in `report_templates.allowed_filter_keys` | Check the template's whitelist; if legitimate, file a PR to extend |
| `42501 — rpc_report_page: unknown or invalid sort column/direction` | Caller passed a sort column not in `allowed_sort_columns`, or direction outside `asc/desc` | Same as above |
| `42501 — rpc_report_page: template not found or not visible` | Template doesn't exist OR caller's tenant can't see it | Verify template_id; check tenant scoping |
| `54000 — pagination offset too large` | `page * page_size > 1,000,000` | Switch to keyset pagination once available |

All `42501` errors **also write an audit row** with the appropriate `action`. Operations should alert on `report.scope_injection_blocked` specifically.

---

## 13. Alternatives Considered (per IS-5b)

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **A. Generic `rpc_report_page` (this spec)** | One function; whitelists per template; uniform audit; AG Grid SSRM compatible. | Generic functions are powerful → security review heavyweight (this doc). | **Selected** for MVP. |
| **B. Per-template RPCs generated at F-3 code-gen time** | Smaller blast radius; each function reviewable in isolation. | 7 functions × every column/sort variation × every gto_role tier → ~50 functions; high maintenance load. | Rejected — IS-5b explicitly weighed this and selected A pending security review. |
| **C. Edge function reads with manual RLS-equivalent SQL** | Maximum flexibility; can call non-Postgres sources. | Loses Postgres planner optimisations; double network hop; loses RLS-as-a-safety-net entirely. | Rejected. |

If the implementer hits a structural problem with A (e.g. pgTAP parity tests cannot stay green), the fallback is B (per-template RPCs), generated via the F-3 code-gen pipeline.

---

## 14. Implementation Checklist

The implementer MUST tick every item below in the PR description before the function is granted to `authenticated`. Items marked **GO** are go/no-go gates; items marked **DOC** are documentation tasks.

1. **GO** — Migration `2026MMDD000000_report_templates_filter_sort_whitelists.sql` creates the four new columns on `report_templates` (`allowed_filter_keys`, `allowed_sort_columns`, `pii_fields`, `pii_min_role`, `max_page_size`, `audit_mode`) with appropriate NOT NULL defaults and CHECK constraints.
2. **GO** — Migration seeds the whitelists for the 7 mandatory GTO report templates (template-by-template, with the security reviewer signing off on each whitelist as fit-for-purpose).
3. **GO** — Migration `2026MMDD010000_audit_events_action_check_widen.sql` relaxes the `audit_events.action` CHECK constraint to accept `report.*` and `rpc.*` namespaces, and adds the `metadata jsonb` column if not present. (Verify `metadata` is not already on the table before adding.)
4. **GO** — Migration creates `public.fn_audit_report_query(...)` with `SECURITY DEFINER` + `SET search_path = 'public', 'pg_temp'`, REVOKEd from `PUBLIC, anon, authenticated`.
5. **GO** — Migration creates `public.gto_role_rank(public.gto_role)` IMMUTABLE, GRANTed to `authenticated`.
6. **GO** — Migration creates `public.rpc_report_page(uuid, int, int, jsonb, jsonb)` with all the safeguards documented in §2 through §10. The function body MUST be reviewed line-by-line by the security reviewer named in CODEOWNERS.
7. **GO** — Grant matrix matches §9 exactly. `pgTAP` test asserts the matrix.
8. **GO** — DBA review confirms every column in every template's `allowed_sort_columns` is covered by a usable B-tree index on the underlying table. Document index list in the PR description.
9. **GO** — `pgTAP` smoke tests pass: REVOKE assertions; scope-injection rejection; unknown-filter-key rejection; unknown-sort-column rejection; `page_size` cap; offset cap; audit-row presence per call (synchronous mode); PII redaction for sub-threshold roles.
10. **GO** — `pgTAP` RLS-parity tests pass: for each (template, gto_role) pair, the RPC returns exactly the same row set as an authenticated direct SELECT against the underlying tables for that role. Drift in either direction is a failure.
11. **GO** — Playwright three-role matrix passes (§11). Evidence: CI run URL + screenshot of the test report.
12. **DOC** — `crm7/CLAUDE.md` updated with a one-paragraph reference to this spec under "Per-Project Notes → crm7".
13. **DOC** — Roadmap dashboard updated per `bsuite/CLAUDE.md` §10: bump `summary.*` counter on completion, add `evidence_url` to the relevant section.
14. **DOC** — Operator runbook entry in `docs/runbooks/` describing how to (a) read the audit trail for a given tenant/template, (b) widen a whitelist when a legitimate need arises, (c) interpret each error in §12.
15. **GO** — Operator sign-off recorded in the PR (named reviewer comment "Approved for production deploy" — see §0 cross red-team line, which must be filled in before merge).

Items 1–11 must all be **GO** before the function executes in production. Items 12–14 may land in the same PR or a follow-up within 72h.

---

## 15. Cross-References

- Backlog: `docs/20260501-merged-execution-backlog-v1.00W.md` (Stable ID G-5)
- Source roadmap: `crm7/docs/00-roadmap/20260424-bsuite-combined-foundations-and-gto-v1.00W.md` (IS-5, IS-5b, line 411 task B-4.2, line 431, line 523, line 554)
- WS-8 GTO helpers: `crm7/supabase/migrations/20260423100000_ws8_org_members_gto_role_helpers.sql`
- Tenant helper: `crm7/supabase/migrations/20260226000004_fix_rls_infinite_recursion.sql`
- Existing audit table: `crm7/supabase/migrations/20260228130200_create_audit_trail.sql`
- Existing report templates: `crm7/supabase/migrations/20260423160000_ws5_report_system.sql`
- Self-validation rule (output-equivalence loop): `bsuite/CLAUDE.md` §9.1
- Auth canonical: `bsuite/AUTH_CANONICAL.md`

---

## 16. Open Questions (for the implementer to confirm before coding)

1. **MVP template list** — is the "7 mandatory GTO templates" list frozen, or does it depend on the GTO Standards 2017 cataloguing work (per `docs/dashboard/data/dashboard-data.json` `gto_compliance_catalogue`)? If frozen, link the canonical list in the PR description.
2. **`report_templates.query_definition`** — does the existing migration's `query_definition` JSONB already encode the SELECT/FROM shape, or is that being defined fresh by this implementation? If existing, the function bakes WHERE clauses; if fresh, the function bakes the entire query.
3. **AG Grid Enterprise license** — confirm the enterprise license covers production deployment before relying on the server-side row model. If not, fall back to the community row model (no infinite scrolling), which still uses this RPC but with simpler pagination semantics.
4. **`audit_events.metadata` column existence** — verify against live DB before issuing the migration in checklist #3. If already present, that migration becomes a no-op for the column add.
5. **`platform_admin` / `developer` bypass** — should `rpc_report_page` honour the `is_platform_admin()` bypass (cross-tenant visibility for support), or strictly enforce tenant scoping for everyone except `service_role`? Recommend **strict tenant scoping with an explicit support-only RPC** (`rpc_report_page_platform_admin`) if support needs cross-tenant reads — keeps the production blast radius small.

These five questions **must be resolved** in the PR description before the function is merged. Open questions persisting at merge time are a §1 Zero-Defer violation per BSuite CLAUDE.md.
