# supabase/tests — pgTAP harness for bsuite parent repo

## Layout

```
supabase/tests/
├── README.md            ← this file
└── database/
    ├── 00_harness_helpers.sql          # shared role-simulation helpers
    └── 01_rls_initplan_platform_branding_test.sql  # Phase 2.2 — platform_branding
```

## Purpose

pgTAP suites exercise every shipped RLS policy through the same GUC + role-switch
dance PostgREST performs for a real anon / authenticated JWT.  
A policy written `TO public` by accident, or with a missing `(SELECT auth.uid())`
initplan wrapper, would be invisible to SQL-editor testing (which runs as
`service_role` and bypasses RLS).  These suites catch both classes of bug.

## How anon-context simulation works

pgTAP runs inside Postgres. We cannot open a PostgREST connection; we reproduce
PostgREST's side-effects via the helpers in `00_harness_helpers.sql`:

1. `test_rls.sign_in_as_authenticated(uuid)` — sets `request.jwt.claims` GUC and
   switches the session role to `authenticated`.
2. `test_rls.sign_in_as_anon()` — same but role = `anon`.
3. `test_rls.reset_role()` — restores `postgres` / service-role for fixture writes.

All assertions happen only after a `sign_in_as_*` call.

## Naming convention

| Prefix | Covers |
|--------|--------|
| `00_` | shared helpers (no tests) |
| `01_` … `99_` | one suite per table (alphabetical within a phase) |

## Running locally

```bash
# Requires: supabase CLI ≥ 1.200, Docker
supabase db start
pg_prove -r -v supabase/tests/database/
```

## CI

`.github/workflows/pgtap.yml` runs on every PR or push that touches
`supabase/migrations/**` or `supabase/tests/**`.

## Adding a new suite (Phase 2.2 sub-PRs)

1. Copy the nearest numbered file as a template.
2. Replace fixture UUIDs with `a<NN><pad>-…` where `<NN>` matches your file number.
3. Ensure every assertion block is preceded by a `sign_in_as_*` call.
4. Wrap everything in `BEGIN; … ROLLBACK;`.
5. Add the file path to the `## Layout` table above.
