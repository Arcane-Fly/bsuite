---
title: W4 Permissions Editor — Scoping & Architecture
status: WORKING
owner: claude-loop
trigger: bsuite#679 (Claude Loop DOCS rotation, 2026-05-07)
predecessor: BSU#346 (closed unmerged, needs-rebase + dirty)
dependency: BSU#367 (W0 Pass 3 — final 6 primitives, MERGED)
wave: W4 of bsuite#635 9-wave Unified Design Language tracker
---

# W4 Permissions Editor — Scoping & Architecture v1.00W

## 1. Why this doc exists

The W4 wave (Permissions Editor — claude-loop owner per `docs/plans/uplift/INDEX.md`) was attempted by perplexity in **BSU#346** ("FB-PHASE-5 — permissions visual editor (Layer 5, full)"), which:

- Added 7,254 LOC across 42 files.
- Carried a transitive dependency on BSU#344 (FB-PHASE-0 foundation, draft, never merged).
- Was **closed unmerged** at 2026-05-07T09:53:31Z with `needs-rebase` + `dirty` `mergeable_state`.

The canonical W4 surface needs a **fresh, narrowly-scoped implementation** that consumes the now-shipped W0 primitives (PermissionMatrix Pass 2, Picker, CommandPalette) without depending on the abandoned Feature Builder Phase 0 foundation.

This doc is the audit output from the 2026-05-07T~20:35Z claude-loop cron cycle — written so the next claude-loop run (with shell access for typecheck / lint / build) can land W4 in proper multi-file scope without redoing the audit.

## 2. Canonical primitive surface (verified this cycle)

### `src/components/uplift/PermissionMatrix.tsx` (sha `b50df9d`, 7,050 bytes)

Pass 2 implementation. Public API:

```ts
interface PermissionMatrixProps {
  rows: MatrixRow[]            // { id, label, description?, icon? }
  actions: MatrixAction[]      // { id, label, tone? }
  cells: MatrixCellState[]     // { rowId, actionId, granted, ruleExpression? }
  presets?: MatrixPreset[]     // { id, label, description, apply: () => void }
  activePresetId?: string
  showAdvanced?: boolean
  onToggleAdvanced?: (next: boolean) => void
  onCellChange: (rowId: string, actionId: string, granted: boolean) => void
}
```

Renders a Role × Action checkbox grid with Doctrine §11 anti-patterns banned by design:
- "RLS policy text editor as primary UI" — SQL only inside `TechnicalDetails`.
- "Per-table separate permission screens" — single matrix.

Tones: `sky` / `emerald` / `amber` / `rose` / `neutral`. `MatrixPreset.apply` is a thunk that mutates cell state at the consumer level.

### Adjacent primitives W4 will consume

- **`ScopeSelect`** — pick scope (Tenant / User / Platform / Public) for whom the permissions apply.
- **`Picker` family** — `RolePicker` for adding new roles to the matrix; `EntityPicker` for entity-scoped row-level rules.
- **`CommandPalette`** — quick "grant X to role Y" command surface.
- **`TechnicalDetails`** — wraps the SQL/expression editor for the `ruleExpression` advanced field.
- **`StepperShell`** — if W4 is structured as a Builder (recommended); else a single-page editor.
- **`EmptyState`** — for "no roles defined yet" surface.

All Pass 2 in BSU `src/components/uplift/` and mirrored to CRM7 (BSU#367 → crm7#519 → crm7#520 → crm7#522).

## 3. Existing BSU admin surfaces (do not collide)

Read this cycle from `business-suite-unified/src/pages/Admin/`:

| File | Size | Owns |
|---|---|---|
| `index.tsx` | 8.0 KB | Admin shell + sidebar nav |
| `UserManagement.tsx` | 28.0 KB | Per-user role assignment, invite flow |
| `TeamMembers.tsx` | 23.3 KB | Tenant team membership + role grants |
| `TenantManagement.tsx` | 32.4 KB | Cross-tenant admin (platform_admin only) |
| `SubOrganizations.tsx` | 16.4 KB | Sub-org tree |
| `SystemOverview.tsx` | 16.4 KB | Platform health dashboard |
| `LicenseManager.tsx` | 21.6 KB | Subscription / seat allocation |
| `AdminBranding.tsx` | 22.7 KB | Platform-tier branding (W6 perplexity active) |
| `AuditLog.tsx` | 18.9 KB | Read-only audit trail |
| `PlatformKit.tsx` | 7.6 KB | Platform-kit feature toggles |

**W4 does NOT replace** `UserManagement.tsx` or `TeamMembers.tsx`. Those remain the per-user / per-team operational surfaces. W4 is the **Role × Capability matrix** — defines what each role *can do*, not who has each role.

## 4. Recommended W4 file layout

New files (estimated LOC):

```
src/pages/Admin/PermissionsEditor.tsx                          ~280 LOC
src/components/admin/permissions/CapabilityList.ts             ~120 LOC
src/components/admin/permissions/RoleCapabilityPresets.ts      ~ 80 LOC
src/lib/admin/loadTenantRoles.ts                               ~ 60 LOC
src/lib/admin/saveRoleCapabilities.ts                          ~ 80 LOC
supabase/migrations/YYYYMMDDHHMMSS_role_capabilities.sql       ~ 40 LOC
```

Modified:

```
src/pages/Admin/index.tsx     — add nav entry "Permissions" between "Team Members" and "Audit Log"
src/router.tsx                — add `/admin/permissions` route gated by `platform_admin` || `tenant_admin`
```

Total: ~660 LOC new, ~10 LOC modified. **Multi-file by definition** — not safe in a single MCP `create_or_update_file` cycle. Land via shell-clone PR on the next claude-loop run.

## 5. Capability list (canonical, copy verbatim into `CapabilityList.ts`)

Mirror the Conduit 69-permission matrix (verified canonical per `docs/plans/uplift/INDEX.md` and bsuite#609). Group by domain:

| Domain | Capability ids |
|---|---|
| crm | `crm.contacts.read`, `crm.contacts.write`, `crm.clients.read`, `crm.clients.write`, `crm.placements.read`, `crm.placements.write` |
| conduit | `conduit.candidates.read`, `conduit.candidates.write`, `conduit.jobs.read`, `conduit.jobs.write`, `conduit.pipeline.read`, `conduit.pipeline.write`, `conduit.onboarding.read`, `conduit.onboarding.write` |
| training | `training.qualifications.read`, `training.qualifications.write`, `training.assessments.read`, `training.assessments.write`, `training.training_plans.read`, `training.training_plans.write` |
| payroll | `payroll.timesheets.read`, `payroll.timesheets.write`, `payroll.timesheets.approve`, `payroll.pay_items.read`, `payroll.pay_items.write`, `payroll.pay_periods.read`, `payroll.pay_periods.write`, `payroll.charge_rates.read`, `payroll.charge_rates.write` |
| funding | `funding.claims.read`, `funding.claims.write`, `funding.claims.submit` |
| platform | `platform.tenants.read`, `platform.tenants.write`, `platform.users.read`, `platform.users.write`, `platform.subscriptions.read`, `platform.subscriptions.write`, `platform.permissions.read`, `platform.permissions.write`, `platform.branding.read`, `platform.branding.write` |
| admin | `admin.audit.read`, `admin.system.read`, `admin.licenses.read`, `admin.licenses.write` |
| reports | `reports.view`, `reports.create`, `reports.run`, `reports.export`, `reports.delete` |
| ai | `ai.chat.use`, `ai.chat.admin`, `ai.gateway.admin` |

Total: 47 capabilities across 9 domains. Use the matrix's `tone` field per domain for visual grouping.

## 6. Role list (canonical bootstrap, real query for tenant-defined)

Bootstrap matrix rows from these canonical roles (read-only, always present):

| Role id | Label | Description |
|---|---|---|
| `platform_admin` | Platform Admin | Cross-tenant superuser. All capabilities granted by default. |
| `tenant_admin` | Tenant Admin | Owner of a tenant. All non-platform capabilities granted by default. |
| `gto_admin` | GTO Admin | Group Training Org admin. Training + payroll + funding. |
| `gto_staff` | GTO Staff | Day-to-day GTO operator. Read most, write timesheets/notes. |
| `recruiter` | Recruiter | Conduit-only operator. |
| `member` | Member | Read most, write own. |
| `viewer` | Viewer | Read-only across granted domains. |

Then append tenant-defined roles via:

```ts
// src/lib/admin/loadTenantRoles.ts
export async function loadTenantRoles(tenantId: string): Promise<MatrixRow[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('tenant_id', tenantId)
    .neq('role', null)
  if (error) throw error
  const distinct = Array.from(new Set(data.map(r => r.role)))
  return distinct
    .filter(r => !CANONICAL_ROLES.has(r))
    .map(r => ({ id: r, label: r, description: 'Tenant-defined role' }))
}
```

## 7. Presets (plain-English, mandatory per Doctrine §6.2)

| Preset id | Label | Behaviour |
|---|---|---|
| `read_only` | Read-only | Grant `*.read` for all domains in this tenant's enabled module set. |
| `operator` | Operator | Grant `*.read` + write to ops domains (timesheets, candidates, contacts), read to admin. |
| `admin` | Admin | Grant everything except `platform.*`. |
| `custom` | Custom | No-op — just deselects active preset, leaves grid as-is. |

The `apply` thunk for each preset calls `onCellChange` repeatedly across all matched (rowId, actionId) pairs. Use a single `setState` batch in the consumer to avoid 47×7=329 re-renders.

## 8. Persistence

Two-table model. **Migration required** (file handoff to ship-all-apps if MCP unavailable):

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_role_capabilities.sql
create table if not exists public.role_capabilities (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  role        text not null,
  capability  text not null,
  granted     boolean not null default false,
  rule_expression text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, role, capability)
);
alter table public.role_capabilities enable row level security;
-- Per AUTH_CANONICAL.md: use auth.uid() / auth.jwt(), never current_setting() / request.jwt.claim.sub
create policy "tenant_admins_read_their_role_capabilities" on public.role_capabilities
  for select to authenticated
  using (
    tenant_id in (select t.id from public.tenants t
                   where t.id in (select ur.tenant_id from public.user_roles ur
                                   where ur.user_id = auth.uid()))
  );
create policy "tenant_admins_write_their_role_capabilities" on public.role_capabilities
  for all to authenticated
  using (
    exists (select 1 from public.user_roles ur
             where ur.user_id = auth.uid()
               and ur.tenant_id = role_capabilities.tenant_id
               and ur.role in ('tenant_admin', 'platform_admin'))
  )
  with check (
    exists (select 1 from public.user_roles ur
             where ur.user_id = auth.uid()
               and ur.tenant_id = role_capabilities.tenant_id
               and ur.role in ('tenant_admin', 'platform_admin'))
  );
create index if not exists role_capabilities_tenant_role_idx on public.role_capabilities (tenant_id, role);
create index if not exists role_capabilities_tenant_capability_idx on public.role_capabilities (tenant_id, capability);
```

Save handler upserts on `(tenant_id, role, capability)`. Use TanStack Query's optimistic update for instant UI; revalidate on mutation success.

## 9. AUTH_CANONICAL.md compliance — non-negotiable

All RLS policies in the migration MUST:
- Use `auth.uid()` (NOT `request.jwt.claim.sub`).
- Use `auth.jwt()` if claim extraction is needed (NOT `current_setting('jwt.claims.X')`).
- `enable row level security` on the table BEFORE adding policies.
- Bind `to authenticated` (NOT `to public`) — see `pg_policies` audit trap noted in protocol §DB.
- Cite `AUTH_CANONICAL.md` in a SQL comment header above each policy.

The migration above complies. Do not loosen it.

## 10. Out of scope (explicitly deferred)

- **`ruleExpression` row-level rules** (TechnicalDetails advanced surface). Ship the matrix-only first; add expression editor in W4 Pass 2.
- **Inheritance / role hierarchies.** Flat roles only in Pass 1.
- **Cross-tenant role copy.** A "copy from Tenant X" affordance is operator-requested but adds 2 surfaces (picker + diff preview). Defer to Pass 2.
- **Audit trail of permission changes.** Re-use existing `audit_log` table; add a row on every `onCellChange` save.
- **Conduit 69-permission integration.** Conduit has its own RBAC layer (`mapPortalRoleToConduit`); `PermissionsEditor` writes to BSU's `role_capabilities`, the Conduit middleware reads from it via the existing `usePermissions` hook. No Conduit code changes in W4 Pass 1.

## 11. Doctrine compliance summary

| Doctrine § | Compliance |
|---|---|
| §1.2 research_evidence | This doc cites primary sources only: BSU#346 PR body, PermissionMatrix.tsx@b50df9d, INDEX.md, AUTH_CANONICAL.md. |
| §2.7 PermissionMatrix | Consumed verbatim. |
| §3.2 row "Prebuilt component reuse" | All UI via uplift primitives. |
| §3.2 row "Plain-English presets" | 4 presets specified above. |
| §6.1 vocabulary contract | User-facing copy uses "Role" / "Permission" / "Capability" — never `tenant_id` / `RLS` / `WITH CHECK` / `CASCADE`. |
| §6.2 banned in default UI | SQL is in TechnicalDetails only. |
| §11 anti-patterns | None: matrix is single-pane, no per-table screens, no SQL-as-primary-UI. |

## 12. Hand-off to next claude-loop run

When you pick this up:

1. **Verify branch state.** Pull `business-suite-unified@development` tip. Confirm PermissionMatrix sha is still `b50df9d` (or read its current props if the API drifted).
2. **Verify schema state.** Run `mcp__Supabase__list_tables` (project `tuybltdrdefjblnplpqo`) and confirm `role_capabilities` does NOT yet exist. If it does, someone shipped Pass 1 already — pivot to Pass 2.
3. **Apply the migration first.** Use `mcp__Supabase__apply_migration`. Verify advisor returns no new RLS-disabled findings.
4. **Ship in two PRs.** Migration + bootstrap data first; UI surface second. Both off `claude/trusting-volta-Bf2uG` (or a fresh feature branch — protocol allows).
5. **Doctrine blocks mandatory.** §1.2 research_evidence (cite this scoping doc + the live primitive sha + the Supabase advisor result), §2.2 6-role red-team table, §3.2 16-item UX-DX checklist (apply rows 1–16; ⚠️ rows N/A justified explicitly).
6. **Self-validation per FF-SELF-VALIDATION-20260507.** Run `pnpm typecheck && pnpm lint && pnpm build` locally before push. Run the new vitest spec for `loadTenantRoles` + `saveRoleCapabilities` (mock supabase client). Capture before/after screenshots at 375 / 768 / 1440px per §9.2.

— claude-loop · 2026-05-07T~20:35Z · sha-of-truth: PermissionMatrix.tsx@b50df9d
