# @bsuite/schema-registry — CHANGELOG

All notable changes to `@bsuite/schema-registry` are recorded here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.4.0] — PLANNED (after all consumer apps migrate)

### Removed (breaking)

- `TenantLayoutSlot` export removed physically. Target: once
  `git grep TenantLayoutSlot` across braden, conduit, R80.3, BSU, and CRM7
  returns zero matches (per
  `docs/20260501-handoff-p1-4b-consumer-renderer-migration-v1.00W.md` Phase 2).

---

## [0.3.1] — 2026-05-01 — Recovery release

### Changed

- `TenantLayoutSlot` is restored as an `@deprecated` **pure no-op shim**.
  Existing consumers (braden `src/pages/Contact.tsx`, conduit
  `(dashboard)/{page,candidates,pipeline}.tsx` + `LayoutSlotClient.tsx`, R80.3
  `src/App.tsx`) continue to build. The shim:

  - Does NOT query the dropped `tenant_page_layouts` table. The `useTenantPageLayout`
    hook is no longer called. Zero PostgREST traffic, zero `42P01` telemetry,
    zero Sentry noise. **This matches pre-existing production behaviour** since
    the 2026-04-29 table drop; no runtime regression.
  - Emits a one-time `console.warn` via `useEffect` (outside render phase) in
    non-production environments when first mounted, pointing to the P1-4(b)
    migration handoff.
  - Always renders `null`. Never throws. Props are accepted for API compatibility
    but intentionally unused (`_props`).

### Deprecated

- `TenantLayoutSlot` (class JSDoc `@deprecated`). Physical removal scheduled
  for `0.4.0` once all consumer apps ship their per-app `CustomPageRenderer`.

### Fixed

- Resolves premature breaking change in `0.3.0`. Version `0.3.0` is
  `npm deprecate`'d with the message:
  `"0.3.0 removed TenantLayoutSlot before consumer migration. Use 0.3.1 which restores it as a deprecated shim, or 0.4.0+ once you have migrated."`

### Notes for upgraders

- If you pinned `^0.2.x`, pnpm/npm will resolve to `0.3.1` as the latest
  non-deprecated release after next install. No code change required.
- If you were on `0.3.0` and hit build errors, bump to `0.3.1` — your existing
  `TenantLayoutSlot` imports will type-check again.

---

## [0.3.0] — 2026-04-29 — DEPRECATED (do not use)

### ⚠️ Premature breaking change

- `TenantLayoutSlot` removed atomically in a publish whose compiled `dist`
  diverged from the parent-repo source tree at commit time. Consumers pinned
  to `^0.2.x` were unaffected (caret range did not cross the major boundary),
  but any consumer who bumped to `^0.3.0` encountered
  `TS2305: Module '…/react' has no exported member 'TenantLayoutSlot'`.
- **Action required**: bump to `0.3.1` which restores the deprecated shim.
- `npm deprecate` tag set 2026-05-01.

---

## [0.2.2] — 2026-04-28

- Internal stability fixes; identical public API to `0.2.1`.

---

## [0.2.0] — 2026-03-15

- First stable release of the consumer-slot pattern.
- Exports: `TenantLayoutSlot`, `useTenantSchema`, `useTenantPageLayout`,
  `useTenantNavigation`, `createMinimalClient`.
- Widget schemas: `DataTablePropsSchema`, `StatGridPropsSchema`,
  `EntitySelectorPropsSchema`, `CardPropsSchema`, `FormRendererPropsSchema`,
  `EntityRefCellPropsSchema`, `SchemaFieldAdderPropsSchema`,
  `WidgetPropsSchema`, `LayoutJsonSchema`.

---

## References

- `docs/adr/ADR-0001-page-builder-ownership.md` — canonical ownership of
  `custom_pages` (CRM7) and deprecation of `tenant_page_layouts` (dropped).
- `docs/adr/ADR-0003-consumer-renderer-pattern.md` — per-app
  `CustomPageRenderer` replaces the shared `TenantLayoutSlot`.
- `docs/20260501-handoff-p1-4b-consumer-renderer-migration-v1.00W.md` —
  multi-repo migration plan.
