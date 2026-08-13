# @bsuite/nav-core — CHANGELOG

All notable changes to `@bsuite/nav-core` are recorded here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.8.0] — 2026-08-12 — Sidebar tokens rebuilt for Tailwind v4 and OKLCH

### Fixed

- **`tokens/d2c-sidebar.css` and `tokens/corporate-sidebar.css` could not be
  used by any of the consumers their own headers named.** Both shipped HSL
  channel triplets on the Tailwind v3 `hsl(var(--token))` contract; every app
  in the estate is Tailwind v4. Importing them added dead variables and put
  non-OKLCH values back into a suite whose rule is OKLCH-only. Measured
  importers before this release: **zero**. A lane that needed a sidebar read
  the header, tried it, and had to back it out.

  The root cause is worth stating plainly, because it recurs: **a custom
  property in `:root` registers no Tailwind v4 utility.** `bg-sidebar` comes
  from the `--color-*` namespace inside `@theme` and from nowhere else. Both
  files now ship two layers — the raw `--sidebar-*` vars for components that
  read them by hand, and an `@theme inline` bridge that actually generates
  `bg-sidebar`, `text-sidebar-foreground`, `border-sidebar-border`,
  `ring-sidebar-ring`, `bg-sidebar-accent` and the rest.

- **The HSL form was hiding a banned value from the colour audit.** The D2C
  file carried `--sidebar-primary-foreground: 210 17% 98%`, annotated as a
  repair of a pure white the scanner "could not see" — because the scanner
  reads oklch and hex, and a bare HSL triplet is invisible to it. The
  corporate file carried `0 0% 95%` and `0 0% 75%`, hueless greys off the
  corporate palette, for the same reason. OKLCH closes the blind spot.

### Changed

- **Every value is now a reference into `@bsuite/theme`'s role layer, not a
  private palette.** A private palette cannot be white-labelled —
  `BrandingProvider` rebinds `--role-*`, so a sidebar painted from its own
  values was the one surface a tenant's brand could never reach. Binding to
  roles also gives dark mode without a `.dark` block, and per-app identity
  for free: the D2C accent resolves `--app-accent`, so conduit's rail takes
  conduit green and throughput's takes pink from the same file.
- Contrast measured in-browser against the real tokens rather than asserted.
  D2C hover tint 20% (accent-foreground on tint 5.04:1 light / 6.36:1 dark);
  corporate hover tint 10% (4.81:1) with the active-item foreground moved to
  `--text-on-accent`, which measures 8.49:1 on gold where the previous
  `--braden-red-dark` measured 4.58:1.

### Migration

`^0.7.x` will not resolve `0.8.0` — a caret on a `0.x` version pins the
minor. Consumers must move their range to `^0.8.0` explicitly. No behavioural
change to any JS export; `useSidebarState`, `MobileSidebarDrawer`,
`AppSwitcher` and the rest are untouched.

Apps holding their own copy of the old HSL block should delete it and import
the token file instead — `business-suite-unified/src/index.css` carries the
old D2C file verbatim, which is why its `AppSidebar` currently renders with
no sidebar colours at all.

---

## [0.5.2] — 2026-05-05 — Toolchain refresh

### Changed

- Bumped dev toolchain to latest compatible: Vite 6 → 8, TypeScript 5.9 → 6.0, `@vitejs/plugin-react` 5 → 6. No public API changes.
- Lockfile regenerated against the new toolchain. All 56 tests passing on Node 24.

### Notes

- Part of the bsuite-wide toolchain refresh (2026-05-05). Companion bumps in `@bsuite/page-builder` 0.2.2, `@bsuite/schema-registry` 0.3.3, `@bsuite/schema-builder` 0.7.1, `@bsuite/data-export` 0.1.4, `@bsuite/charge-calc` 0.2.4.

---

## [0.5.1] — 2026-05-04 — React 19 attestation + explicit peerDependencies

### Added

- `peerDependencies.react` (`">=18 <21"`) and `peerDependencies.react-dom`
  (`">=18 <21"`). Previously, `react` and `react-dom` were only listed in
  `devDependencies`, which allowed consumer apps to accidentally install a
  duplicate copy of React. Declaring the peer range makes pnpm/npm hoist the
  consumer's React to satisfy `nav-core`, eliminating the duplicate-React bug
  class (e.g. `Invalid hook call`, two contexts not seeing each other).

### Changed

- Formal attestation that `@bsuite/nav-core` is tested against and compatible
  with React 19. No public API changes.

### Notes

- `devDependencies.react` and `devDependencies.react-dom` remain `^19.2.4`
  (unchanged).
- Satisfies AGENTS.md §Dependency Version Policy rule 2: shared packages must
  keep parity with the lowest consumer React version. All six consumer apps
  (braden, business-suite-unified, conduit, crm7, R80.3, throughput) are on
  React `^19.2.4` or `^19.2.5`.
- The `">=18 <21"` range matches the canonical liberal-peer-range policy used
  by `@bsuite/schema-registry` and `@bsuite/page-builder`.
- Accompanies `@bsuite/schema-registry` 0.3.2 and `@bsuite/page-builder` 0.2.1
  (both attestation-only bumps). Publish `nav-core` FIRST so downstream
  packages resolve against the new peer-dep contract.
- **Consumer action:** apps that do not already depend on `react` and
  `react-dom` will see new `UNMET PEER DEPENDENCY` warnings after upgrading.
  Add both to `dependencies` in your app `package.json`. All six current
  consumer apps already satisfy this.

---

## [0.5.0] — Pre-changelog (retrospective) — Initial published release

- First publish to npm as `@bsuite/nav-core`.
- Exports: `AppSwitcher`, `MobileSidebarDrawer`, `useSidebarState`,
  `useFilteredNav`, plus `./types` subpath, and CSS tokens at
  `./tokens/d2c-sidebar.css` and `./tokens/corporate-sidebar.css`.
