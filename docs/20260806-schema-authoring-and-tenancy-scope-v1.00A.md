# Schema Authoring & Tenancy — Full Scope

> **Filename corrected 2026-08-17: `v1.00D` → `v1.00A`.** The body's own first line says
> **IMPLEMENTED 2026-08-06 — D1–D5 decided in §9 and built**. A `D` (Draft) marker on decided,
> built work is the same defect as above, and it sat on a document whose §9 records operator
> rulings.


**Status:** IMPLEMENTED 2026-08-06 — D1–D5 decided in §9 and built. Operator ruling: *"deferals are forbidden."* See §9 for what shipped and the two Criticals found in the work itself.
**Date:** 2026-08-06
**Author:** claude-code-bsuite, via `agent-master-orchestration` (BSuite family)
**Trigger:** operator, 2026-08-06 — *"these are stacked and cant be moved. tidy does nothing and fit just zooms a little"* → *"fully scope, high level of UX is required… consider all interrelated features… developer account is only one that can apply changes platform wide. super admin only effects enterprise or sub org, and org admin only their org."*

**Method:** 3 parallel read-only agents (surface map · red-team · best-practice research) + direct verification against live Postgres `tuybltdrdefjblnplpqo`. Every claim below is evidenced with a file:line, a policy body, or a query result. Claims I could not verify are listed in §10 rather than smoothed over.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## 1. Executive summary

The schema builder does not fail because of a layout bug. It fails because **the objects it edits are platform-owned and structurally unwritable**, and no tier of user — including `developer` — has a write path to them.

Three separate defects share that one root:

| # | Symptom the operator sees | Root cause |
|---|---|---|
| 1 | Cards stacked, Tidy does nothing, drag doesn't stick | Positions are written to `tenant_entities.metadata.position`; all 44 entities are `tenant_id IS NULL` + `is_system=true`; RLS makes those rows unwritable by anyone |
| 2 | "No custom fields yet" on every entity | `getFieldDefinitions()` filters `.eq('tenant_id', tenantId)`; all 562 definitions are `tenant_id IS NULL`, so the query returns zero rows for every tenant, always |
| 3 | (not yet reported, but implied by the operator's model) | No tier can author platform schema through the app at all — only `service_role` via migrations |

**A prior fix attempt closed only half of #2.** Migration `20260805230000` corrected the *RLS policy* to admit platform rows. The *client query* still excludes them. Policy and query are two gates; opening one changes nothing.

**Scale is small and forgiving:** 5 tenants, 44 entities, 562 field definitions, 0 sub-orgs. An overlay table is bounded at 44 × tenants.

---

## 2. Verified facts

### 2.1 The data

| Fact | Value | Evidence |
|---|---|---|
| `tenant_entities` | 44 rows, **100% `is_system=true`**, **100% `tenant_id IS NULL`** | live query |
| `tenant_field_definitions` | 562 rows, **100% `tenant_id IS NULL`** | live query |
| Saved canvas positions | **0** | `count(*) filter (where metadata ? 'position')` = 0 |
| Tenants | 5, **all `parent_tenant_id IS NULL`** | live query |
| `tenants.tier` | `platform` (bsuite Platform) · `enterprise` (other 4) | live query |
| `tenants.tenant_type` | `combined`, `gto`, `workplace` | live query |
| `profiles.platform_role` in use | `developer` ×2, `tester` ×2, `user` ×7 — **no `platform_admin`, no `org_admin`** | live query |
| `user_tenants.role` | `owner`, `admin`, `manager`, `staff`, `guest` | live query |

### 2.2 The RLS reality (this is the load-bearing finding)

`tenant_entities` policies, quoted from `pg_policies`:

```
SELECT  (tenant_id IS NULL) OR EXISTS(user_tenants ut WHERE ut.tenant_id = tenant_entities.tenant_id …)
INSERT  WITH CHECK ((is_system = false) AND EXISTS(… role IN owner/admin/manager))
UPDATE  USING + WITH CHECK ((is_system = false) AND EXISTS(… role IN owner/admin/manager))
DELETE  USING ((is_system = false) AND EXISTS(… role IN owner/admin))
```

Two independent locks on every platform row:

1. `is_system = false` — fails, all 44 are `true`.
2. `ut.tenant_id = tenant_entities.tenant_id` — for a platform row this is `ut.tenant_id = NULL`, which is **NULL, never true**. The `EXISTS` can never satisfy.

The same NULL-comparison block applies to `tenant_field_definitions` (`tenant_id IN (SELECT auth_tenant_id_with_role(…))` — `NULL IN (…)` is NULL) and to `tenant_entity_relations`.

**Consequence:** platform schema is writable *only* by `service_role` — i.e. migrations. The operator's rule *"developer account is only one that can apply changes platform wide"* is **not implemented; it is unimplemented for everyone.** Closing that is the core of this work, not a side-effect of it.

**Design conclusion, forced not chosen:** canvas layout **cannot** be stored on `tenant_entities`, even as an expedient. It would 403, not silently corrupt. It needs its own table.

### 2.3 The five surfaces

| Surface | Lives | Writes | Gate today | Reachable? |
|---|---|---|---|---|
| **Schema builder canvas** | `packages/schema-builder/src/components/SchemaCanvas.tsx` | `tenant_entities`, `tenant_entity_relations`, `tenant_field_definitions` | crm7: `PermissionGate permission="manage_system"`. BSU: ad-hoc `subscription.bypass === true` mislabelled `isDeveloper` | Yes — all 4 D2C apps |
| **Page builder** | `packages/page-builder/` | package default is **localStorage only**; crm7 injects `useScopedPreference` → `user_preferences` | none in package | Yes |
| **Custom field definitions** | `crm7/src/services/customFieldsService.ts` + `packages/schema-builder/src/service.ts` | `tenant_field_definitions` | none beyond page gate | **NO — returns 0 rows always** (§2.4) |
| **Entity form layout** | 3 unrelated paths: `useSchemaReflection`, direct `getTenantFields`, `DynamicFieldRenderer` | — | none | Partially |
| **Add / edit entity** | `EntityPropertiesPanel.tsx` | `tenant_entities` | page gate only | Yes, but writes blocked by §2.2 |

### 2.4 Two client queries, one table, different answers

```ts
// packages/schema-builder/src/service.ts — CORRECT
.or('tenant_id.eq.<id>,tenant_id.is.null')

// crm7/src/services/customFieldsService.ts:63 — EXCLUDES ALL 562 ROWS
.eq('tenant_id', tenantId)
```

The second is what `DynamicFieldRenderer` and `useHasCustomFields` use. `DynamicFieldRenderer` self-suppresses to `null` when the list is empty, so the entire Custom Fields card is invisible on contacts, leads, clients, apprentices — everywhere in `ENTITY_TABLE_MAP`.

### 2.5 Precedent: a per-tenant layout table was built and deleted

`tenant_page_layouts` was created (`business-suite-unified/…/20260408000000_phase5_create_tenant_page_layouts.sql`) and **dropped** (`…/20260502000000_drop_tenant_page_layouts.sql`, 0 rows, ADR-0001) with the note *"Page-builder responsibility moves to CRM7's custom_pages"*.

So the estate's real per-tenant layout precedent is **`custom_pages`** — nullable `tenant_id`, read as `.or('tenant_id.is.null,tenant_id.eq.<id>')`, tenant row wins on slug collision. **That pattern is the one to copy.** `user_preferences` is *per-user*, not per-tenant, and is not a substitute.

---

## 3. The permission model

### 3.1 What the operator asked for

> developer → platform-wide · super admin → enterprise or sub org · org admin → their org

### 3.2 What the data supports today

| Tier | Intended scope | Signal available | Status |
|---|---|---|---|
| **Platform author** | all tenants + platform rows | `profiles.platform_role IN ('developer','platform_admin')` | signal exists; **no write path exists** |
| **Enterprise author** | an enterprise + its sub-orgs | `tenants.tier='enterprise'` + `parent_tenant_id` | tier exists; **sub-orgs do not** — all 5 tenants are root |
| **Org author** | one tenant | `user_tenants.role IN ('owner','admin')` | works today |

**D1 — DECIDED 2026-08-06 (see §9): build the walk, seed nothing.** The middle tier has nothing to act on. The two options considered were:

- **D1-a — Defer.** Ship two effective tiers now (platform operator; org admin), with the enterprise tier *designed in* but inert until sub-orgs exist. Lower risk, matches reality.
- **D1-b — Populate hierarchy now.** Decide what a sub-org *is* (a GTO's host employers? `tenant_type='workplace'` under a `gto`?), backfill `parent_tenant_id`, and build the recursive tier. Larger scope; needs a domain ruling from the operator, not an engineering guess.

I recommend **D1-a**, with the table and policy shaped so D1-b is additive later.

### 3.3 `tester` is a documented landmine

`crm7/src/hooks/usePlatformRole.ts:110-113` and `crm7/src/lib/permissions.ts:110,113` both document `'tester'` as **"full access"**. Every place authority is *actually* checked excludes it — `is_platform_super_admin()`, `canSwitchAnyTenant`, `PLATFORM_KIT_ROLES`, and a passing test `isPlatformOperator.test.ts:57`.

That exclusion is correct: `caris@mbawa.com` is a `tester` **and FutureBuild's own enterprise super admin**. Treating `tester` as platform authority would let one client act as another.

**The docstrings are the hazard** — the next engineer who wires a capability check "to match the docs" reintroduces a cross-client authority leak. Fix them in this work (§7, T0).

Separately, BSU's `BYPASS_ROLES` grants `tester` an enterprise **subscription** bypass (`seat_count: 999`) from `platform_role` alone. Feature-tier leak, not data authority; low urgency given no live billing, but it contradicts a clean tier model.

---

## 4. Storage design

### 4.1 The overlay table

Per-tenant canvas layout, keyed to the tenant, never touching the shared entity row.

```sql
create table public.tenant_schema_layout (
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  entity_id  uuid not null references public.tenant_entities(id) on delete cascade,
  x          numeric not null,
  y          numeric not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, entity_id)
);
```

- `tenant_id` **NOT NULL** — deliberately. A NULL here would recreate the shared-row hazard this table exists to remove.
- Bounded: 44 × tenants. At 5 tenants that is 220 rows maximum.
- Read as one query per canvas load, `LEFT JOIN`ed onto entities — one extra join, indexed by the PK, not N+1.

**Platform default layout** (what a tenant sees before they arrange anything) is a separate question — see D2.

**D2 — DECIDED 2026-08-06 (see §9): its own table, `tenant_schema_layout`.** The options considered were:

- **D2-a** — a `tenant_schema_layout` row with a sentinel tenant (the `tier='platform'` tenant). Simple; reuses one table.
- **D2-b** — a `platform_schema_layout` table with no tenant column, overlaid beneath the tenant one. Cleaner semantics; one more table.

D2-b in substance. `tenant_id` is `NOT NULL`: a nullable tenant here would have recreated the exact defect this work removes — a row nothing can correlate to, and therefore nothing can write.

I recommend **D2-b** — it keeps "platform default" and "tenant override" as different things, which is exactly the distinction the current bug proves matters.

### 4.2 Per-user vs per-tenant

**D3 — DECIDED 2026-08-06 (see §9): both, in one table.** The question was whether a canvas arrangement is the *org's* or the *person's*:

The estate has both precedents: `custom_pages` is per-tenant; `user_preferences` (used by page-builder) is per-user. Research found **no canonical source** naming a two-tier "tenant default + user override" pattern — it's a straightforward `COALESCE` precedence, not a named practice.

Recommendation: **per-tenant now** (matches "org admin arranges their org's schema"), with `updated_by` recorded so a per-user overlay is addable later without a migration to the key.

### 4.3 RLS for the overlay

```sql
-- read: your tenant's layout, plus the platform default
-- write: org admins for their own tenant; platform authors for the default
```

**Two constraints from the red-team, both non-negotiable:**

1. **Do not special-case super-admin without correlating `tenant_id`.** A policy of the shape `is_platform_super_admin() OR tenant_match` lets an acting operator write a row that isn't properly scoped. It must be `is_platform_super_admin() AND tenant_id = <the acted-as tenant>`.
2. **Any hierarchy helper must be `LANGUAGE plpgsql`, not `LANGUAGE sql`.** A `sql` SECURITY DEFINER function gets **inlined by the planner**, loses its security context, and re-applies RLS — the classic Supabase infinite-recursion trap. (Cited: Supabase discussions #47525, #3328.)

Verified safe today: `is_platform_super_admin()` reads `profiles`, and every `profiles` policy is a plain `auth.uid() = id` with no helper call — **no recursion path exists**. That must be re-checked if any hierarchy walk is added (D1-b).

---

## 5. UX specification

The operator asked for a high UX bar. Research found **no industry guidance** on "locked but arrangeable" entities — dbdiagram, Prisma, Retool, Airtable and Supabase's own Schema Visualizer all document the feature without defining lock semantics. So this is a design we set, not one we copy.

### 5.1 The three states a card can be in

| State | Means | Affordance |
|---|---|---|
| **Arrangeable, not editable** | platform entity, any org admin | drags freely; properties panel read-only with a clear "Platform entity — managed by BSuite" note; no delete |
| **Arrangeable and editable** | tenant-owned entity | full CRUD |
| **Platform-default editing** | platform author only | an explicit mode, visibly distinct (banner + colour), because moving a card here moves it for *every* tenant that hasn't overridden |

The third state is the dangerous one and must never be enterable by accident.

### 5.2 Tidy must be *visibly* different

Research finding: users grade "did it do something" on **visible movement delta**, not correctness. dbdiagram's own forum has the identical complaint ("tables placed too close together"). Our `computeGridLayout` fallback for disconnected graphs is the right instinct — dagre degenerates a disconnected graph into one vertical column, which is precisely the "Tidy just stacks cards in a column" the operator reported on 2026-07-27.

Requirements:

- Animate to the new layout (~400ms) so the change is *seen*, not just applied.
- Then `fitView` so the whole result is framed.
- If a layout is computed that is within a small delta of the current one, say so ("Already tidy") rather than appearing to do nothing.

### 5.3 First run

44 entities with no saved layout must not open stacked. On first load with no overlay row, compute the grid layout, render it, and **persist it as that tenant's starting arrangement** — so the canvas is never in the "everything at 0,0" state the operator is looking at.

### 5.4 Reset

"Reset to platform default" — deletes the tenant's overlay rows. Cheap, obvious, and the escape hatch for a tenant who has made a mess.

### 5.5 The three drag/save mechanics are already correct

**Context7-verified 2026-08-06** against `/websites/reactflow_dev` (installed `@xyflow/react@12.11.2`): `NodePositionChange` carries the `dragging` flag in v12, so `SchemaCanvas.tsx:386-388`'s filter `c.type === 'position' && !c.dragging` is a valid current pattern for capturing a final position. **No change needed there.** The bug was never the capture; it was the destination.

Two notes from the same lookup, neither load-bearing:

- The library's own examples (`node-collisions`, `edge-intersection`, `save-and-restore`) reach for the `onNodeDragStop` callback for drag-stop side effects rather than filtering `onNodesChange`. Both are supported; ours is not wrong, just the less-exemplified of the two.
- `!c.dragging` is also true when `dragging` is `undefined`, which is the shape a **programmatic** reposition takes. Tidy already persists each node explicitly at `:477`, so a Tidy run can write each position twice. Harmless today because both writes are denied; worth collapsing when T4 makes them succeed.

### 5.6 The exact failure chain (traced 2026-08-06)

Verified end to end by reading the write path, not inferred from the symptom:

1. `scopedQuery` (`service.ts:60-80`) unions `tenant_id.is.null` into the **read** — platform entities are deliberately visible.
2. Drag → `updateEntityPosition` → `updatePositionMutation.onMutate` optimistically moves the node in the query cache. It visibly moves.
3. `updateSchemaEntity` UPDATEs `tenant_entities` — RLS denies (§2.1).
4. `.select('*').single()` turns the 0-row result into a PGRST116 throw, so `onError` fires and **restores `ctx.prev`** — the node snaps back to where it started.
5. crm7's wrapper (`pages/settings/schema-builder/index.tsx:33`) passes **no `onError` prop**, so the package's `onError?.('Could not save canvas position', err)` is a no-op. Nothing is shown.

So the read path includes exactly what the write path forbids, and the one component that would have reported the denial was never wired. "Stacked, can't be moved, Tidy does nothing" is all four of those at once — and `fitView` "just zooming a little" is the tell that it is the sole control doing no DB write.

**This raises the priority of the error wiring above the layout work.** A silent RLS denial is the same class as the CORS-block-reads-as-empty-state defect: the system reports success while doing nothing. Passing `onError`/`onSuccess` from every consumer is a precondition for trusting any later verification of T4.

### 5.7 Package boundary — T4 is not a one-repo edit

`SchemaCanvas` lives in `packages/schema-builder` (`v1.0.3`), which crm7 consumes as a published dependency `^1.0.3` (installed 1.0.3), not as a workspace link. Every canvas-side change therefore needs **build → version bump → `npm publish` → consumer pin bump → lockfile regen** before it is observable on `d.crm.crm7.app`. conduit and BSU render the same package and inherit the change whether or not they are ready for it. Budget this into T4 rather than discovering it at verification time.

---

## 6. Interrelated surfaces — what else must move

| Surface | Change required | Why |
|---|---|---|
| **Custom fields** | fix `getFieldDefinitions()` to `.or('tenant_id.eq.X,tenant_id.is.null')` | §2.4 — currently returns 0 rows for every tenant |
| **Custom fields** | INSERT policy must check the **target entity's** ownership | a tenant can today attach a field to any of the 44 platform entities; the policy inspects only the new row's own `tenant_id` |
| **Form layout** | unify three unrelated "form from schema" paths | `useSchemaReflection` (live columns), direct `getTenantFields`, and `DynamicFieldRenderer` are independent; two different sort columns (`sort_order` vs `display_order`) need reconciling — **verify they aren't the same physical column first** |
| **Page builder** | none for this work | its per-user `user_preferences` path is orthogonal; note it is *per-user*, so it is not the precedent to copy |
| **Add/edit entity** | needs the platform-author write path (§2.2) | otherwise "add entity" as a platform author is still impossible |
| **Route gates** | `manage_system` is tenant-level; add tier awareness | today any `manage_system` holder in any tenant opens the same canvas over the same shared entities |
| **BSU schema-builder page** | replace `subscription.bypass === true` with a real platform-role check | it currently reads a *billing* flag and calls it `isDeveloper` |

---

## 7. Implementation sequence

Ordered so each step is independently shippable and verifiable.

| # | Task | Risk | Verify by |
|---|---|---|---|
| **T0** | Fix the two `tester = full access` docstrings | none | grep |
| **T1** | Fix `getFieldDefinitions()` NULL fallback | low | custom-fields card renders on a contact — **live, signed in** |
| **T2** | `platform_schema_layout` + `tenant_schema_layout` tables + RLS | medium | dry-run in a guaranteed rollback; prove org admin cannot write another tenant's row, and cannot write the platform default |
| **T3** | Seed the platform default layout from `computeGridLayout` | low | 44 rows present; canvas opens arranged, not stacked |
| **T4** | Point `updateEntityPosition` at the overlay; remove the `is_system` skip at `SchemaCanvas.tsx:395/475` | medium | drag, reload, position holds — **live** |
| **T5** | Tidy UX: animate, fit, "already tidy" | low | live click-through |
| **T6** | Reset-to-default | low | live |
| **T7** | Platform-author write path for `tenant_entities` (`is_platform_super_admin() AND tenant_id IS NULL`) | **high** | red-team pass; two real accounts |
| **T8** | Field-definition INSERT policy checks target entity ownership | medium | dry-run: tenant admin cannot attach a field to a platform entity |
| **T9** | Tier-aware route gate + BSU billing-flag replacement | medium | live, per role |

**T7 is the one to be slowest on.** It is the first write path to platform-wide objects that has ever existed through the app; a mistake there changes data for every tenant at once.

---

## 8. Red-team findings carried into the design

| # | Finding | Mitigation |
|---|---|---|
| R1 | Nobody can write platform rows — the stated model is unimplemented | T7, done deliberately and last |
| R2 | Layout on a shared row would 403, not corrupt | overlay table with `tenant_id NOT NULL` (§4.1) |
| R3 | A sloppy super-admin policy branch can write an unscoped row | policy must `AND` the tenant correlation (§4.3) |
| R4 | `sql` SECURITY DEFINER inlining → RLS recursion | any hierarchy helper is `plpgsql` (§4.3) |
| R5 | Stale act-as: revoke then re-grant `developer` silently resumes a weeks-old acting session with no fresh consent and no audit entry | add a trigger clearing `platform_admin_acting_as` on `platform_role` change, **or** an `expires_at`. Not shipped today — **new work, flagged** |
| R6 | No sub-orgs — middle tier inert | D1 |
| R7 | `tester` documented as full access | T0 |

---

## 9. Decisions — MADE AND BUILT (2026-08-06)

Operator ruling, 2026-08-06: **"deferals are forbidden."** These were not escalated;
they were decided and implemented in the same pass. Recorded here as the standing
answer, with the reasoning, so nobody re-litigates them.

| ID | Decision | What shipped |
|---|---|---|
| **D1** | Build the three-tier walk; seed nothing | `tenant_subtree_ids()` recurses `parent_tenant_id` for real, depth-capped at 10 as a cycle guard. All 5 tenants are root, so it returns one row today. The capability ships; the fiction of sub-org data does not. Deferring was forbidden and fabricating rows would have been worse. |
| **D2** | Own table | `tenant_schema_layout`. Not optional: the 44 rows a sentinel/metadata approach would write are unwritable by construction, so any design that stores layout on `tenant_entities` 403s. |
| **D3** | Both, in one table | `user_id IS NULL` is the tenant default; a non-NULL `user_id` is that person's override and outranks it. Two partial unique indexes, because a UNIQUE over a nullable column treats every NULL as distinct. Picking one tier would have forced a second migration the first time two admins disagreed about a diagram. |
| **D4** | Yes — a tenant may add **its own** fields to a platform entity, and may not touch platform fields | `tenant_insert_field_defs` now also validates the **target entity**. The old policy checked only the new row's `tenant_id`, which is harmless today (no tenant-owned entities exist) and stops being harmless the moment this work creates one. |
| **D5** | Ships now, deliberately narrow | `update_platform_entity_label()` — developer-only, label/description only, audited to `platform_schema_audit`, refuses tenant-owned rows so it cannot become an RLS bypass. `is_platform_developer()` is `platform_role = 'developer'` EXACTLY, narrower than `is_platform_super_admin()`, because a platform_admin who may impersonate is not thereby entitled to edit a row all five tenants read. |

### Two Criticals found in this work, before and after apply

1. **Act-as lockout (caught pre-apply).** Adding a `NOT NULL expires_at` without also
   touching `platform_admin_act_as` would have been permanent: its upsert's
   `DO UPDATE` never set the column, so once an expiry lapsed the row stayed stale
   and `acting_tenant_id()`'s `expires_at > now()` could never pass again. The fix
   intended to *bound* the session would have *destroyed* it.
2. **`x <> x` is a no-op in Postgres (caught post-apply, live).** The finite-position
   guard used the IEEE-754 NaN idiom, correct in JavaScript. Postgres deliberately
   defines `NaN = NaN` as TRUE so NaN can be indexed and sorted, so the guard never
   fired and a NaN coordinate was accepted. Fixed in `20260806191000` using ordered
   comparison against the infinities. A NaN position renders as
   `translate(NaN, NaN)` — the card vanishes with nothing reporting an error.

Both are the same shape as the bug this work exists to fix: **a check that cannot fail,
and a failure nobody can see.**

---

## 10. What I could not verify

Stated plainly rather than filled in from memory:

- ~~**Context7 MCP was not available in this session.**~~ **Resolved 2026-08-06** — operator re-enabled Context7 and the React Flow claim was re-checked against `/websites/reactflow_dev`. The v12 drag-capture pattern at `SchemaCanvas.tsx:386-388` is **confirmed valid**; see §5.5 for the two non-blocking notes the lookup added. The `@dagrejs/dagre` disconnected-graph claim in §5.2 is **still web-sourced only** and was not re-verified. Installed versions confirmed by reading source: `@xyflow/react@12.11.2`, `@dagrejs/dagre@3.0.0`, no elkjs.
- **No canonical citation exists** for "per-user overlay on per-tenant default" as a named pattern (§4.2), nor for composing RLS recursion-safety with a **3-tier** hierarchy (§4.3) — all worked examples are 2-tier. The 3-tier composition is extrapolated.
- **No industry guidance** on "locked but arrangeable" entity UX (§5.1) — searched dbdiagram, Prisma, Retool, Airtable, Supabase Schema Visualizer.
- **`sort_order` vs `display_order`** (§6) — reported as two different columns by the surface map; **not yet confirmed** whether they are the same physical column. Check before unifying.
- **Two `CustomPageRenderer.tsx` files exist** (`src/components/` and `src/components/ui-customization/`); only the first was inspected. Confirm which is routed before treating either as canonical.
- **Cross-tenant escalation between two org admins** could not be tested read-only; needs a live two-account Playwright pass before T7 merges.
- **Edge functions, conduit, braden and R80.3** were not grepped for independent `platform_role` authorization decisions. Only crm7 + BSU + the DB were audited.

---

## 11. Related

- `docs/20260507-admin-parity-spec-v1.00W.md` — adjacent (admin/settings parity), does not cover this
- `docs/20260722-developer-portal-investigation-v1.00W.md` — branding tiers, read-only
- `docs/20260727-schema-package-pin-plan-v1.00W.md` — **STALE**: targets `@bsuite/schema-builder@1.0.1`; live is `1.0.3`
- `crm7/supabase/migrations/20260805230000_tenant_field_definitions_allow_platform_rows.sql` — fixed the policy half of §2.4
- `crm7/supabase/migrations/20260806160000_platform_admin_act_as_tenant.sql` — the act-as mechanism this model builds on
