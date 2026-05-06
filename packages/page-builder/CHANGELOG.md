# @bsuite/page-builder — CHANGELOG

All notable changes to `@bsuite/page-builder` are recorded here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## 0.2.5 — 2026-05-06

### Fixed

- **D2C theme on canvas-editor chrome.** Column-preset chips, Compact Layout / Reset to Default / Add-widget buttons no longer fall through to hardcoded gray hex (#2563eb / #f3f4f6 / #6b7280 / #e5e7eb) when consumer apps use shadcn-style `--primary`/`--muted`/`--border` tokens instead of the legacy `--accent-primary`/`--bg-tertiary`/`--text-secondary`/`--border-shell` names. Replaced inline `style={...}` with Tailwind classes that resolve via every BSuite consumer's `@theme inline` block. Closes bsuite operator UX issue (BSU walkthrough 2026-05-06).

### Notes

- 0.2.4 was published with no source change; 0.2.5 carries the actual fix.

---

## [0.2.2] — 2026-05-05 — Toolchain refresh

### Changed

- Bumped dev toolchain: Vite 6 → 8, TypeScript 5.9 → 6.0, `@vitejs/plugin-react` 5 → 6. No public API changes.
- Lockfile regenerated. All 17 tests passing on Node 24.

### Notes

- Part of the bsuite-wide toolchain refresh (2026-05-05). See `@bsuite/nav-core` 0.5.2.

---

## [0.2.1] — 2026-05-04 — React 19 attestation

### Changed

- Formal attestation that `@bsuite/page-builder` is tested against and
  compatible with React 19. No public API changes.

### Notes

- `peerDependencies.react` and `peerDependencies.react-dom` remain
  `">=18 <21"` (unchanged). The range already admitted React 19; this patch
  bump documents the attestation after all four page-builder consumer apps
  (business-suite-unified, conduit, crm7, R80.3) landed on React `^19.2.4`
  or `^19.2.5`.
- `devDependencies.react` and `devDependencies.react-dom` remain `^19.2.4`
  (unchanged).
- Satisfies AGENTS.md §Dependency Version Policy rule 2: shared packages must
  keep parity with the lowest consumer React version. All consumers are now on
  React 19.
- Accompanies `@bsuite/nav-core` 0.5.1 (adds missing React `peerDependencies`)
  and `@bsuite/schema-registry` 0.3.2 (same attestation bump).

---

## [0.2.0] — Pre-changelog (retrospective) — Initial public release

- First publish to npm as `@bsuite/page-builder`.
- Shared responsive page-builder grid and layout persistence primitives,
  with optional `@dnd-kit` integration (peer-dependency, optional).
- Exports: root entry for React components/hooks, plus
  `./styles.css` subpath for `react-grid-layout` token overrides.
