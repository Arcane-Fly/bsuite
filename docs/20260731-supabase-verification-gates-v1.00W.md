# Supabase Policy & Verification Gates

**Status:** Working · **Frozen Fact:** FF-SUPABASE-GATES-20260610 · **Relocated:** 2026-07-31

> **Relocated from `AGENTS.md` 2026-07-31** as part of the rulebook slim-down. This is the canonical detail; `AGENTS.md` keeps only the pointer.


Adopted 2026-06-10 by operator directive after the closure sprint surfaced two
recurring failure modes: trusting the Supabase dashboard's policy counters
(which do NOT attribute multi-bucket `bucket_id = ANY(ARRAY[...])` policies —
five fully-guarded buckets displayed "0 policies"), and treating package
publishes or local CI as completion for changes whose blast radius is wider.

### 12.1 Supabase Policy Gate (MANDATORY for any RLS / storage / grant claim)

1. **Never assert policy, grant, or bucket state from the dashboard UI, docs,
   or memory.** Verify live via Supabase MCP `execute_sql` against the
   catalogs — `pg_policies`, `information_schema.role_table_grants`,
   `pg_proc`/`pg_get_functiondef`, `storage.buckets` — or via the Supabase CLI
   (`supabase inspect db`, `supabase db dump --schema-only`) when MCP is
   unavailable. For storage specifically: query `pg_policies` with a LIKE on
   the bucket name; the per-bucket dashboard counter is unreliable.
2. **Every policy concern is fixed forward as a floor-gated migration**
   validated by the pgTAP baseline-replay — never by dashboard hand-edits or
   raw MCP DDL. Out-of-band edits create the MCP-era drift class that the
   crm7#758 reconciliation took a month to unwind.
3. **After any schema/policy change session, run MCP `get_advisors`**
   (security AND performance) and triage every finding — fix, file, or
   document why it stands — before declaring the session done.
4. Re-stamp batches must pre-apply the four environment-divergence guards
   (existence-guarded `ALTER POLICY`, `DROP POLICY IF EXISTS` before CREATE,
   `to_regclass()` on cross-table references, inline REVOKE/search_path pins
   for lint diff-only visibility). Canonical reference:
   `crm7/supabase/migrations/CLAUDE.md` § 2026-06-10 final ledger.

### 12.2 Consumer Package Gate (shared `@bsuite/*` changes)

A shared-package fix is **not done at publish**. Closure requires the full
chain: merge to main (publish is automatic) → bump the pinned version in
EVERY consumer per `docs/DEPENDENCY-BUMP-CHECKLIST.md` → each consumer's CI
green → live verification in at least one deployed consumer. Applies to
bsuite#1506 explicitly: the `@bsuite/schema-registry` nav fix closes only
after all six apps consume the new version AND a signed-in deployed-domain
session shows zero `tenant_navigation` 400s.

### 12.3 Live UX Gate (deployed-domain evidence)

Feature work touching user surfaces (the crm7#625 training calendar, the
crm7#1056–#1058 storage/portal phases, workstream tails) closes ONLY with
deployed evidence: a signed-in session on the `d.*` (or production) domain
through the real auth flow, screenshots of the new surface, a clean console,
and the expected network calls captured. Local CI green is necessary but
never sufficient. (This sharpens Gate B.2 with the d.*-domain requirement —
random Vercel preview URLs are NOT in the OAuth allowlist; `d.*` domains are.)

### 12.4 Definition of Done (composite checklist)

A change is done when ALL of the following hold — partial completion is
reported as in-progress, never as done:

- [ ] Code merged with CI green (incl. pgTAP baseline-replay for DB changes)
- [ ] DB changes applied AND recorded via the floor-gated dispatch (§12.1.2)
- [ ] §12.1.1 live catalog verification for any policy/grant claim
- [ ] §12.1.3 advisors run and triaged (schema/policy sessions)
- [ ] §12.2 full consumer chain (shared-package changes)
- [ ] §12.3 deployed-domain evidence (user-facing changes)
- [ ] Dashboard + STATUS.md updated in the same session; tracked issue closed
      with the evidence linked

---

## Database rules (relocated from `AGENTS.md` § Architecture, 2026-07-31)

- Supabase shared across all projects
- Schema changes via versioned migrations only
- Expand → Migrate → Contract pattern
- Row Level Security on all tables
- **Production migrations land via PR only** — **NEVER** run `supabase db push` from a local checkout against `tuybltdrdefjblnplpqo`. Migrations apply via (a) merged PR + CI/CD, OR (b) Supabase MCP `apply_migration` (audit-tracked). Direct local push creates git↔production history drift — see `20260428085641_repair_tenant_page_layouts_contract` for a documented case where local push happened pre-PR and required follow-up file preservation in PR #218 (drop migration). When using MCP `apply_migration`, the recorded version timestamp is auto-generated; align the recorded `name` with the file path (e.g., name=`20260502000000_drop_tenant_page_layouts`) so future `supabase db push` from a fresh checkout sees the migration as applied.
- **`client_id` RLS scoping**: BSuite apps are first-party trusted OAuth clients sharing a single Supabase project and user-base. Per-`client_id` DB isolation is **intentionally absent** — all authenticated users from any registered BS OAuth client get user-level access (`auth.uid() = user_id`). The `payment_methods` table has a named policy (`oauth_client_scoped_access`) documenting this decision. If per-client isolation is ever required, add a `client_id` column and a `USING ((auth.jwt() ->> 'client_id') = client_id)` guard. (See migration `20260415120000_rls_client_id_payment_methods.sql`.)
