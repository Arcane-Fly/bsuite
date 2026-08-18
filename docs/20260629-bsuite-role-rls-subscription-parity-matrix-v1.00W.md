# BSuite Role / RLS / Subscription Parity Matrix (WC-007, Batch D)

**Date:** 2026-06-29
**Status:** W
**Scope:** Single evidence matrix reconciling, for every BSuite role, the UI permission gate, the JWT/profile claim path, the Supabase RLS enforcement, and the subscription/feature gate. Companion to `20260629-bsuite-world-class-audit-tracker-v1.00W.md` (§WC-007) and `20260629-bsuite-world-class-feature-inventory-v1.00W.md` (§Role matrix).

**Method:** Code-and-schema inspection. Every cell cites a `file:line` anchor verified in the `development` working tree.

**Update 2026-06-29 (Batch D fixes landed):** all five gaps G1–G5 (WC-008…WC-012) are now **resolved in code** — see §3 Resolution notes per gap and §3.1 for the consolidated change set. Live browser/JWT decode evidence is collected in Batch E against the `d.*` development deploys.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## 1. Role model layers (verified)

BSuite has **three independent role layers**. A single user can carry a value in each. The audit confusion WC-007 was created to resolve comes from app code conflating layer 2's two columns.

| Layer | Storage | Allowed values (DB CHECK / enum) | Canonical accessor | Owner |
| --- | --- | --- | --- | --- |
| **L1 Platform** | `profiles.platform_role` + `profiles.is_super_admin` | `platform_role ∈ {developer, tester, platform_admin, user}`; `is_super_admin boolean` | `is_platform_admin(uid)` SQL helper | BSU |
| **L2a Tenant membership** | `user_tenants.role` | `{owner, admin, manager, staff, guest}` | `auth_tenant_id_with_role(text[])`, `check_user_portal_role(...)` | BSU |
| **L2b Portal view** | `user_tenants.portal_role` | `{owner, admin, manager, staff, field_officer, training_provider, host_contact, apprentice, worker, viewer}` | `check_user_portal_role(...)` | BSU |
| **L3 GTO operational** | `org_members.gto_role` | enum `{gto_admin, gto_staff, field_officer, host_supervisor, apprentice}` | `is_gto_staff()`, `is_gto_admin()`, `get_user_gto_role()`, `get_user_host_employer_id()`, `get_user_apprentice_id()` | CRM7 |

**Verified source anchors:**
- L1: `crm7/supabase/migrations/baseline/20260513_prod_baseline_schema_dump.sql:7102-7103` (`profiles.platform_role` CHECK = developer/tester/platform_admin/user), `:7098-7099` (`profiles.user_id GENERATED ALWAYS AS (id)`, `is_super_admin`). Helper: `crm7/supabase/migrations/20260422213000_phase3_gto_entities.sql:53-70` and re-annotated `bsuite/supabase/migrations/20260513150000_annotate_secdef_rls_helpers_phase21B.sql:400-418`.
- L2a/L2b: `…20260513_prod_baseline_schema_dump.sql:6252-6266` (`user_tenants` table + both CHECK constraints). Accessors: `:224-244` (`auth_tenant_id`, `auth_tenant_id_with_role`), `:483-497` (`check_user_portal_role` — `portal_role = ANY($) OR role IN ('owner','admin')`).
- L3: `crm7/supabase/migrations/20260423100000_ws8_org_members_gto_role_helpers.sql:37-52` (enum), `:59-90` (`org_members`), `:129-221` (helper fns), `:227-276` (RLS policies).
- Subscription: `…20260513_prod_baseline_schema_dump.sql:7986-8005` (`subscription_plans`, `module_access jsonb`), `:455-473` (`check_module_access`), `:1442-1456` (`get_user_tenant_context` returns `module_access`).

---

## 2. Parity matrix — role × layer × enforcement

Legend: ✅ aligned & verified (or gap now fixed — see §3 Resolution) · ⚠️ verified gap (see §3) · — not applicable.

| Audit role (feature inventory) | L1/L2/L3 mapping | UI gate (file:line) | RLS / claim path (file:line) | Subscription gate | Parity |
| --- | --- | --- | --- | --- | --- |
| Platform super admin | L1 `is_super_admin=true` | crm7 `usePlatformRole` exposes `isSuperAdmin` `src/hooks/usePlatformRole.ts:206-208` | `is_platform_admin()` true via `is_super_admin` branch (dead `super_admin` token removed) `20260629120000_wc008_remove_dead_super_admin_branch.sql` | bypasses tenant plan | ✅ (G1/WC-008 fixed) |
| Platform admin / developer / tester | L1 `platform_role` | crm7 `isPrivileged = developer\|tester\|platform_admin` `usePlatformRole.ts:208-216`; conduit `isPrivileged = developer\|tester\|platform_admin` `conduit/src/hooks/usePlatformRole.ts` | `is_platform_admin()` = `is_super_admin OR platform_role ∈ {platform_admin,developer}` `…wc008….sql` | developer/tester/platform_admin bypass billing | ✅ (G1/G2 fixed) |
| Tenant/org admin | L2a `role ∈ {owner,admin}` | `check_user_portal_role` auto-passes owner/admin | `auth_tenant_id_with_role(['owner','admin'])` `baseline:236-244` | tenant `subscription_plan_id` | ✅ |
| GTO admin/staff | L3 `gto_role ∈ {gto_admin,gto_staff}` | crm7 ops surfaces via `useAIChat`/portal `roleMappingService.ts:20-30` | `is_gto_admin()` / `is_gto_staff()` `ws8…helpers.sql:129-221` | tenant plan `module_access` | ✅ |
| Field officer | L2b `portal_role='field_officer'` **and** L3 `gto_role='field_officer'` | crm7 `resolvePortalRoute` → `/portal/field-officer` `portal/index.tsx:43-45` | `is_gto_staff()` includes field_officer `ws8…helpers.sql` | plan `module_access` | ✅ |
| Host employer / supervisor | L2b `portal_role='host_contact'`; L3 `gto_role='host_supervisor'` | crm7 routes on `portalRole==='host_contact'` `portal/index.tsx:38`; mapping key `host_contact` `roleMappingService.ts` | `get_user_host_employer_id()` `ws8…helpers.sql` | plan `module_access` | ✅ (G3/WC-010 fixed) |
| Apprentice / worker | L2b `portal_role ∈ {apprentice,worker}`; L3 `gto_role='apprentice'` | crm7 `portalRole==='apprentice'\|\|'worker'` → `/portal/worker` `portal/index.tsx:28`; `worker`/`viewer` added to `PortalRole` union `roleMappingService.ts` | `get_user_apprentice_id()` `ws8…helpers.sql` | plan `module_access` | ✅ (G4/WC-011 fixed) |
| RTO / training provider | L2b `portal_role='training_provider'` | crm7 → `/portal/training-provider` `portal/index.tsx:33-35` | tenant-scoped RLS via `auth_tenant_id()` | plan `module_access` | ✅ |
| Finance / payroll | L2a `role` + plan modules | crm7 `PermissionGate` + R80.3 surfaces | `auth_tenant_id_with_role` + `check_module_access('billing')` | `module_access.billing` | ✅ (UI evidence → Batch E) |
| Candidate | Conduit ATS `candidate` | conduit `usePermissions` maps `apprentice\|worker→candidate` `conduit/roleMappingService.ts` | conduit reads `user_tenants.portal_role` `useTenantId.ts:19`, `getTenantContext.ts:33`, `middleware.ts:171` | n/a (public apply) | ✅ (G5/WC-012 fixed) |
| Executive | L2a `role` + aggregated reports | crm7/BSU report surfaces | `auth_tenant_id()` tenant-scoped | plan `module_access` | ✅ (UI evidence → Batch E) |
| External auditor | read-only scoped | not yet implemented | n/a | n/a | — (deferred, feature inventory §43) |

---

## 3. Verified parity gaps (corrective findings)

These are **new, code-verified findings** discovered while building the matrix. They are registered as WC-008…WC-011 in the audit tracker. None touch the already-committed entity-link helper work.

### G1 / WC-008 (P2) — `super_admin` is a dead branch in `is_platform_admin()`
`is_platform_admin()` tests `platform_role IN ('platform_admin','developer','super_admin')` (`phase3_gto_entities.sql:62-63`), but the `profiles.platform_role` CHECK constraint forbids `'super_admin'` (`baseline:7103` allows only `developer/tester/platform_admin/user`). Super-admin status is carried by the separate `is_super_admin` boolean. The `'super_admin'` string in the IN-list can never match a stored value → dead/defensive code.
**Proposed fix:** drop `'super_admin'` from the IN-list (the `is_super_admin = true` branch already covers it) to remove the misleading dead branch. Behaviour-equivalent; safe.
**RESOLVED 2026-06-29 (WC-008):** migration `crm7/supabase/migrations/20260629120000_wc008_remove_dead_super_admin_branch.sql` does `CREATE OR REPLACE FUNCTION public.is_platform_admin(uuid)` with `platform_role IN ('platform_admin','developer')` (the `is_super_admin = true` branch retained). Applied baseline file untouched per the frozen-migration rule. Behaviour-equivalent: no stored row could ever have `platform_role='super_admin'`.

### G2 / WC-009 (P1) — UI privilege-bypass sets diverge across apps and from DB
Three different definitions of "privileged bypass":
- DB `is_platform_admin()` → `is_super_admin` OR `platform_role ∈ {platform_admin, developer}` (super_admin dead per G1).
- crm7 `usePlatformRole.isPrivileged` → `platform_role ∈ {developer, tester}` (**omits `platform_admin`**) `usePlatformRole.ts:206-208`.
- conduit `usePlatformRole.isPrivileged` → `platform_role ∈ {developer, tester, platform_admin}` `conduit/src/hooks/usePlatformRole.ts:14,54`.

Consequence: a `platform_admin` user gets a UI bypass in Conduit but **not** in CRM7; a `tester` gets a UI bypass in both apps but is **not** a DB platform admin (correct — tester is a billing bypass, not an admin grant). The divergence is undocumented and per-app.
**Proposed fix (needs operator sign-off — security-sensitive):** define one canonical `isPrivileged` predicate in a shared module and align both apps; decide explicitly whether `platform_admin` should bypass CRM7 tenant RBAC.
**RESOLVED 2026-06-29 (WC-009, operator-approved canonical = DB):** crm7 `usePlatformRole` now exposes `isPlatformAdmin` and sets `isPrivileged = isDeveloper || isTester || isPlatformAdmin` (`crm7/src/hooks/usePlatformRole.ts:208-216`), matching conduit (`conduit/src/hooks/usePlatformRole.ts` `BYPASS_ROLES`) and the DB `is_platform_admin()` admin set `{developer, platform_admin}` (plus `tester` as the UI/billing bypass). `PlatformRole` union gained `platform_admin` (`usePlatformRole.ts:15`). Both apps now agree: a `platform_admin` gets the same privileged-bypass treatment everywhere.

### G3 / WC-010 (P1) — host portal token mismatch: `host_employer` (TS) vs `host_contact` (DB)
DB `user_tenants.portal_role` CHECK allows `host_contact` (`baseline:6264`); it does **not** allow `host_employer`. But app code keys host routing/mapping on `host_employer`:
- crm7 `resolvePortalRoute`: `if (portalRole === 'host_employer')` `portal/index.tsx:38`.
- crm7 `roleMappingService.PortalRole` union + `DEFAULT_ROLE_MAPPING.host_employer` `roleMappingService.ts:13,26`; re-exported as the app-wide `PortalRole` via `tenantService.ts:1,4`.
- conduit `roleMappingService.host_employer → employer` `conduit/roleMappingService.ts:16,37`.

Since the DB can only ever store `host_contact`, a real host contact (`portal_role='host_contact'`) **never matches** the `host_employer` branch → falls through to the tenant-type switch / default `viewer`. Host contacts are mis-routed today. (The inline comment on `roleMappingService.ts:7-9` claiming the union "matches the DB CHECK on `user_tenants.role` exactly" is factually wrong on two counts: those values live on `portal_role` not `role`, and the DB uses `host_contact`.)
**Proposed fix (needs operator sign-off — decide canonical token):** pick one token suite-wide. Recommended: rename app token to `host_contact` to match the DB CHECK (changing the DB CHECK + edge-function writers + seed data is higher-blast-radius). Then correct the misleading comments.
**RESOLVED 2026-06-29 (WC-010, operator-approved canonical = `host_contact`):** suite-wide rename of the app token `host_employer` → `host_contact`. crm7: `PortalRole` union + `DEFAULT_ROLE_MAPPING` (`crm7/src/lib/roleMappingService.ts`), `resolvePortalRoute` (`portal/index.tsx:38`), role dropdown + form schema (`settings/user-management.tsx`), `settings/role-overrides.tsx`. conduit: `PortalRole` union + `host_contact → employer` mapping (`conduit/src/lib/roleMappingService.ts`), `TeamSection.tsx`. Misleading union comments corrected to state the values live on `portal_role` and use `host_contact`. A real `portal_role='host_contact'` now routes/maps correctly.

### G4 / WC-011 (P2) — `worker` portal_role has no UI route
DB allows `portal_role='worker'` (`baseline:6264`) but crm7 `resolvePortalRoute` only branches on `apprentice` (`portal/index.tsx:28-30`); a `worker` falls through to the tenant-type switch. The app `PortalRole` union also omits `worker` and `viewer` (`roleMappingService.ts:11-13`), so `usePortalContext`'s `as PortalRole` cast (`usePortalContext.ts:55`) silently mistypes those DB values.
**Proposed fix:** add `worker`/`viewer` to the app `PortalRole` union and route `worker` to `/portal/worker` alongside `apprentice`.
**RESOLVED 2026-06-29 (WC-011):** `worker` and `viewer` added to the `PortalRole` union in both apps (`crm7/src/lib/roleMappingService.ts`, `conduit/src/lib/roleMappingService.ts`) — the full union now equals the DB `portal_role` CHECK set exactly. crm7 `resolvePortalRoute` routes `apprentice || worker` → `/portal/worker` (`portal/index.tsx:28`); `viewer`/`field_officer` added to the role dropdown + schema. conduit maps `worker → candidate`, `viewer → viewer`, `field_officer → viewer`. The `as PortalRole` casts no longer mistype DB values.

### G5 / WC-012 (P1) — Conduit RBAC reads `role`, not `portal_role`, so candidate/employer mappings are dead
conduit `useTenantId` selects `user_tenants.role` (`conduit/src/hooks/useTenantId.ts:18-22`) — constrained to `{owner,admin,manager,staff,guest}`. It feeds `mapPortalRoleToConduit`, whose `host_employer→employer`, `training_provider→viewer`, and `apprentice→candidate` branches (`conduit/roleMappingService.ts:37-39`) can therefore **never** trigger, because those values only exist on `portal_role`. CRM7 correctly reads `portal_role` (`usePortalContext.ts:36`). Net effect: in Conduit every member collapses to `conduit_admin`/`recruiter`/`viewer`; `employer` and `candidate` operational roles are unreachable via tenant membership.
**Proposed fix (needs operator sign-off — security-sensitive):** change Conduit `useTenantId` to read `portal_role` (matching CRM7), or document that Conduit candidate/employer access is intentionally driven by a different mechanism.
**RESOLVED 2026-06-29 (WC-012, operator-approved):** every Conduit tenant-context read switched from legacy `user_tenants.role` to canonical `portal_role`: `useTenantId.ts:19`, `getTenantContext.ts:44`, and — newly found during the fix — the live RBAC enforcement path `lib/supabase/middleware.ts:171` (the actual route gate). A **DB-layer** instance of the same divergence was also found and fixed during code review: the SECURITY DEFINER RPC `resolve_bs_oauth_subject_portal_role` — called by the middleware's primary OAuth gate — returned `ut.role` despite its name, so portal-only roles were unreachable through the live OAuth path; new migration `conduit/supabase/migrations/20260629130000_wc012_resolve_portal_role_canonical.sql` rewrites it to return `ut.portal_role` with a privilege-ranked multi-tenant tie-break. All least-privilege fallbacks are now valid `PortalRole` values: `middleware.ts`/`getTenantContext.ts` default to `'viewer'`, and `TeamSection.toBaseRole` defaults any non-base portal role to `'guest'` (the lowest base value) so the legacy `user_tenants.role` column can never over-grant relative to `portal_role`. The `host_contact→employer`, `training_provider→viewer`, `apprentice/worker→candidate` branches are now reachable. Conduit's `TeamSection` role assignment writes `portal_role` (plus a derived valid base `role`) so assignments actually affect permissions.

### 3.1 Consolidated change set (WC-008…WC-012)

| Gap | Files changed | Tests |
| --- | --- | --- |
| WC-008 | `crm7/supabase/migrations/20260629120000_wc008_remove_dead_super_admin_branch.sql` (new) | n/a (CREATE OR REPLACE, behaviour-equivalent) |
| WC-009 | `crm7/src/hooks/usePlatformRole.ts` | crm7 typecheck; existing platform-role tests |
| WC-010 | `crm7/src/lib/roleMappingService.ts`, `crm7/src/pages/portal/index.tsx`, `crm7/src/pages/settings/{user-management,role-overrides}.tsx`, `conduit/src/lib/roleMappingService.ts`, `conduit/src/components/settings/TeamSection.tsx` | crm7 `roleMappingService.test.ts` (13✓), conduit `roleMappingService.test.ts` |
| WC-011 | (same union files as WC-010) | as above + `worker`/`viewer` assertions |
| WC-012 | `conduit/src/hooks/useTenantId.ts`, `conduit/src/lib/getTenantContext.ts`, `conduit/src/lib/supabase/middleware.ts`, `conduit/src/components/settings/TeamSection.tsx`, `conduit/supabase/migrations/20260629130000_wc012_resolve_portal_role_canonical.sql` (new) | conduit `middleware.test.ts`, `usePermissions.test.ts`, `roleMappingService.test.ts` (903 suite-wide ✓) |

Verification: `crm7` typecheck ✅, full vitest 4314✓ (2 pre-existing flaky timeouts in `people/new.test.tsx`, pass in isolation, no RBAC imports). `conduit` typecheck ✅, full vitest 898✓ (5 pre-existing `documentSigner.test.ts` `crypto.subtle` failures — identical on base, Node 22 vs required 24 artifact). eslint clean on all touched files. `pnpm lint:supabase-client-init` 5/5.

---

## 4. Subscription / feature-gate fail-stale (WC-007 subscription leg)

| Aspect | Verified behaviour | Anchor |
| --- | --- | --- |
| Plan → module map | `subscription_plans.module_access jsonb`, per-tenant via `user_tenants.subscription_plan_id` | `baseline:6256, 7992` |
| Server gate | `check_module_access(user, tenant, module)` returns `COALESCE((module_access->module)::bool, false)` — **fails closed** when plan/module absent | `baseline:455-473` |
| Context hydrate | `get_user_tenant_context()` returns `module_access` for client cache | `baseline:1442-1456` |
| Fail-stale (client) | Live evidence (cache staleness on plan downgrade) deferred to Batch E | — |

`check_module_access` defaulting to `false` on a missing plan/module is the correct fail-closed posture. Client-side cache fail-stale behaviour (what the UI shows between a Stripe downgrade webhook and cache refresh) still needs a live trace — tracked under Batch E.

---

## 5. Evidence commands run

| Check | Result |
| --- | --- |
| `pnpm lint:supabase-client-init` | (see audit tracker Evidence log; re-run recorded there) |
| Code/schema inspection of L1–L3 + subscription anchors | Pass — every cell anchor above verified in working tree |
| Browser/JWT-decode role smoke | Batch E — Playwright login against `d.*` development deploys (see audit tracker §Batch E) |
| crm7 typecheck + vitest | ✅ typecheck clean; 4314 passed (pre-existing flaky `people/new.test.tsx` excluded) |
| conduit typecheck + vitest | ✅ typecheck clean; 898 passed (5 pre-existing `documentSigner` env failures) |
| eslint (all touched files) | ✅ clean |

## 6. Self-report (FF-SELF-VALIDATION-20260507 §9.3)

- This is a documentation/evidence deliverable; §9.1/§9.2 loops are N/A for the doc itself. The five code fixes carry their own output-equivalence reasoning (above) and test evidence.
- **All five divergences are now RESOLVED in code (operator-approved 2026-06-29).** G2/WC-009, G3/WC-010, G5/WC-012 were the security-sensitive RBAC changes; they were applied only after explicit operator approval of the canonical tokens (DB-aligned privilege set, `host_contact`, `portal_role`). G1/WC-008 and G4/WC-011 were low-risk.
- Live role-by-role browser/JWT evidence: Batch E (Playwright on `d.*` deploys) — see audit tracker.
