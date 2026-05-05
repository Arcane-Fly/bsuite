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

## [0.3.4] — 2026-05-05 — Tarball leak fix

### Fixed

- **Closes real consumer leak.** Prior `0.3.3` tarball shipped `dist/__tests__/setup.{js,d.ts}` into the published package. `setup.js` contained `import '@testing-library/jest-dom'`, meaning any consumer who wildcard-imported the package could have pulled jest-dom into a runtime bundle. `package.json` `exports` gates access to `./react`, `./react/editors`, `./server`, and `.` only — so exposure through normal deep-imports was not possible — but the files were present in the tarball and increased install footprint. Verified via `rg @bsuite/schema-registry.*__tests__` across the entire bsuite tree: zero cross-app imports of the leaked path. Tarball is now clean.
- Root cause: `tsconfig.build.json` `exclude` was `["**/*.test.tsx", "**/*.test.ts", "node_modules"]` which did NOT cover the non-test `setup.ts` file living inside `src/__tests__/`. Missing the `src/__tests__` directory-level exclude entirely.

### Changed

- Canonicalised `tsconfig.build.json` `exclude` to the 5-entry pattern matching `packages/auth/tsconfig.build.json`: `src/__tests__`, `src/**/*.test.ts`, `src/**/*.test.tsx`, `src/**/*.spec.ts`, `src/**/*.spec.tsx`. Documented in `docs/20260505-bsuite-dependency-refresh-ts6-migration-v1.00W.md` §2.1.

### Notes

- No public API changes. All 25 tests still pass. Consumers on `^0.3.0` or `^0.3.3` pick this up automatically via semver caret on next install.

---

## [0.3.3] — 2026-05-05 — Toolchain refresh

### Changed

- Bumped dev toolchain: Vite 6 → 8, TypeScript 5.9 → 6.0, `@vitejs/plugin-react` 5 → 6. No public API changes.
- Lockfile regenerated. All 25 tests passing on Node 24.

### Notes

- Part of the bsuite-wide toolchain refresh (2026-05-05).

---

## [0.3.2] — 2026-05-04 — React 19 attestation

### Changed

- Formal attestation that `@bsuite/schema-registry` is tested against and
  compatible with React 19. No public API changes.

### Notes

- `peerDependencies.react` remains `">=18 <21"` (unchanged). The range already
  admitted React 19; this patch bump documents the attestation after all six
  consumer apps (braden, business-suite-unified, conduit, crm7, R80.3,
  throughput) landed on React `^19.2.4` / `^19.2.5`.
- `devDependencies.react` and `devDependencies.react-dom` remain `^19.2.4`
  (unchanged) — the package has been tested against React 19 since `0.3.0`.
- Satisfies AGENTS.md §Dependency Version Policy rule 2: shared packages must
  keep parity with the lowest consumer React version. All consumers are now on
  React 19.
- Accompanies `@bsuite/nav-core` 0.5.1 (adds missing React `peerDependencies`)
  and `@bsuite/page-builder` 0.2.1 (same attestation bump). Release order:
  publish `nav-core` → `page-builder` → `schema-registry` so the peer-dep
  resolver can find the new `nav-core` version.

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
