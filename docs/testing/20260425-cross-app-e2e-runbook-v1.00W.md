# Cross-App Entity-Cell Linkage — E2E Runbook

**Date:** 2026-04-25
**Status:** W (Working — manual verification procedure for must-have #5)
**Owner:** Subagent W3-D (Universal Canvas Wave-3)
**Covers:** `docs/20260425-universal-canvas-master-execution-plan-v1.00F.md` §2 must-have #5

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## Purpose

Prove that an `EntityRefCell` widget authored in the BSU Design Studio against an R80.3 route renders a CRM7 entity row at the R80.3 URL, and that clicking it navigates to the CRM7 deep-link. This is the universal-canvas must-have #5 ("CROSS-APP ENTITY-CELL LINKAGE").

The automated coverage of this behaviour is split across two layers:

| Layer | Location | What it proves |
|-------|----------|----------------|
| Unit (vitest) | `packages/schema-registry/src/react/widgets/EntityRefCell.test.tsx` | Loading / missing / href-template / Zod validation within the same app scope |
| Cross-app unit (vitest) | `packages/schema-registry/src/react/widgets/EntityRefCell.cross-app.test.tsx` | Rendering a `foreign_app_scope='crm7'` cell inside `appScope='r80'`, default + custom href resolution, `onClick` / `onNavigate` hooks |
| E2E (Playwright, env-gated) | `crm7/tests/e2e/cross-app-entity-linkage.spec.ts` | Full round-trip with authored layout in the live DB |

This runbook describes the manual procedure the Playwright spec automates. Run it once per release candidate until the operator wires `CRM7_E2E_CROSS_APP_CONTACT_ID` into CI.

---

## Pre-requisites

- An authed CRM7 tenant account with at least one row in `contacts` (record its `id`).
- Access to the BSU Design Studio at `https://suite.crm7.app/design-studio` as a `platform_admin` or enterprise `owner`.
- Access to the R80.3 app at `https://r8.crm7.app` with the same tenant membership.
- Supabase SQL editor access to the shared project `tuybltdrdefjblnplpqo` for the teardown step.

Environment variables required for the automated Playwright spec (optional — if absent, the spec skips):

```
CRM7_E2E_EMAIL
CRM7_E2E_PASSWORD
CRM7_E2E_CROSS_APP_CONTACT_ID   # UUID of a contacts row
CRM7_E2E_CROSS_APP_R80_URL      # optional; R80.3 base (e.g. https://r8.crm7.app)
CRM7_E2E_CROSS_APP_R80_PATH     # optional; default /dashboard
```

---

## Procedure

### 1. Seed a CRM7 contact (skip if you already have one)

In the CRM7 app:

1. Sign in as a tenant member.
2. Navigate to `/contacts`.
3. Create a contact with a recognisable `full_name`, e.g. `E2E Test Contact 2026-04-25`.
4. Copy the row's `id` (UUID) from the URL bar on the detail page.

Alternative (via Supabase SQL, platform role):

```sql
INSERT INTO public.contacts (tenant_id, full_name)
VALUES (auth_tenant_id(), 'E2E Test Contact 2026-04-25')
RETURNING id;
```

### 2. Confirm the tenant_entities whitelist row exists

The EntityRefCell whitelist guard reads `tenant_entities` to confirm the target entity is authored under the foreign app scope or under `'all'`. Verify:

```sql
SELECT id, name, app_scope
FROM public.tenant_entities
WHERE name = 'contacts' AND app_scope IN ('crm7', 'all')
LIMIT 1;
```

If no row exists, the EntityRefCell will fall back to `UnknownWidget`. Add one via the Phase 5 seed or the schema-builder UI at `/settings/schema-builder`.

### 3. Author the R80.3 layout via BSU Design Studio

1. Open `https://suite.crm7.app/design-studio`.
2. Target: `app_scope = r80`, `route = /dashboard` (or any R80.3 route that already mounts `TenantLayoutSlot`).
3. From the palette, drag an **Entity Reference** widget onto the canvas.
4. In the inspector drawer:
   - `foreign_app_scope`: `crm7`
   - `entity`: `contacts`
   - `entity_id`: paste the UUID from step 1
   - `display_field`: `full_name`
   - `href_template` (optional): `https://crm.crm7.app/contacts/{id}` for cross-origin deep-link.
5. Click **Publish**. Confirm the `tenant_page_layouts` row is stored (status chip goes green within 2 seconds via realtime).

### 4. Verify on R80.3

1. Open `https://r8.crm7.app/dashboard` (or whichever route you authored).
2. Confirm the `EntityRefCell` link renders the contact's `full_name` as visible text.
3. Hover — the link's `href` should be the CRM7 deep-link pattern
   (`/crm7/contacts/<id>` default, or `https://crm.crm7.app/contacts/<id>` with the override).
4. Click — the browser should navigate to the CRM7 URL and land on the contact detail page.

### 5. Negative path: tenant isolation

Sign in as a member of a *different* tenant on a separate browser profile. The contact row is invisible via RLS; the EntityRefCell should render `UnknownWidget` fallback (text contains "unknown"). This proves cross-tenant read isolation is intact.

### 6. Teardown

Via BSU Design Studio:

1. Return to `/design-studio` and delete the authored layout (or set `is_published=false`).

Via SQL (platform role):

```sql
DELETE FROM public.tenant_page_layouts
WHERE tenant_id = auth_tenant_id()
  AND app_scope = 'r80'
  AND route_path = '/dashboard'
  AND layout_json @> '{"widgets":[{"type":"EntityRefCell"}]}'::jsonb;

-- If the contact was seed-only:
DELETE FROM public.contacts WHERE id = '<contact-uuid>';
```

---

## Pass criteria

All of the following must hold:

- [ ] EntityRefCell renders the correct `full_name` on R80.3.
- [ ] `href` attribute resolves to the authored template (or `/crm7/contacts/<id>` default).
- [ ] Click navigates to the CRM7 deep-link.
- [ ] Cross-tenant member sees `UnknownWidget` fallback (RLS denial).
- [ ] Teardown leaves zero cross-app test rows in `tenant_page_layouts`.

Record the pass/fail result in the PR description linking to this runbook.

---

## Coverage matrix

| Gate | Automated at | Manual at |
|------|--------------|-----------|
| Whitelist guard (`tenant_entities` lookup) | `EntityRefCell.cross-app.test.tsx` case "renders fallback when foreign entity is not in tenant_entities whitelist" | §Procedure step 5 |
| Display field renders | `EntityRefCell.cross-app.test.tsx` case "renders CRM7 contact display_field when mounted on R80.3 page" | §Procedure step 4.2 |
| Default href pattern | `EntityRefCell.cross-app.test.tsx` case "default href resolves to the CRM7 deep-link pattern" | §Procedure step 4.3 |
| `href_template` override | `EntityRefCell.cross-app.test.tsx` case "href_template override resolves {app}/{entity}/{id}" | §Procedure step 4.3 |
| `onNavigate` hook | `EntityRefCell.cross-app.test.tsx` case "click fires onNavigate" | — (app-wired only) |
| `onClick` hook | `EntityRefCell.cross-app.test.tsx` case "click fires onClick" | — (app-wired only) |
| Full round-trip (layout + RLS + browser click) | `crm7/tests/e2e/cross-app-entity-linkage.spec.ts` (env-gated) | §Procedure end-to-end |

---

## Change log

- **2026-04-25** — initial runbook authored as part of Wave-3 W3-D. Automated vitest coverage landed in `EntityRefCell.cross-app.test.tsx` (6 cases, all passing). Playwright spec landed env-gated at `crm7/tests/e2e/cross-app-entity-linkage.spec.ts` pending `CRM7_E2E_CROSS_APP_CONTACT_ID` wiring in CI.
