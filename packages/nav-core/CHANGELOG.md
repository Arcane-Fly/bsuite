# @bsuite/nav-core — CHANGELOG

All notable changes to `@bsuite/nav-core` are recorded here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
