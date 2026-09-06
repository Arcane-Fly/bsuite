# @bsuite/nav-core — CHANGELOG

All notable changes to `@bsuite/nav-core` are recorded here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] — 2026-09-03 — Update notice and unsaved-work guard

Operator directive 2026-09-03 10:48: "note there are people using the app in
production i.e. actual clients so stage all work to development branch and
then ensure their is a platform notice and refresh to update prompt so they
dont lose work on rebuilds." PI rulings R1–R10 (two red-teams) bind the design.

### Added

- **`useAppUpdateAvailable()`** — compares the commit baked into the RUNNING
  bundle (`__BUILD_COMMIT__`) with the commit at `/version.json`. ANY
  difference is `versionChanged` (a rollback moves the commit backwards and is
  a change too — the word "new" appears nowhere). Polls on mount, every 10 min,
  and on `visibilitychange`; `cache: 'no-store'`. Asserts `content-type`
  starts with `application/json` BEFORE parsing; a mismatch logs ONE
  `console.error` per distinct fault, sets `updateCheckBroken`, and keeps
  polling. Dismissal keyed by the DETECTED commit in `sessionStorage`. Control
  `{ enabled, severity }`: `enabled: false` = kill switch (no banner, no
  polling); `severity: 'critical'` = not dismissible, re-shown every poll.
  Never reloads.
- **`<UpdateAvailableBanner/>`** — `role="status" aria-live="polite"`,
  `data-slot="update-available-banner"`, role tokens only
  (`bg-role-info/10`, `bg-role-warning/10`, `bg-destructive/10` — names
  `@bsuite/theme/preset-v4.css` generates; NOT the apps' private `bg-info/10`,
  which paints nothing in four of six apps). Normal and escalated copy. One
  Refresh button that calls `confirmLeave()` first; Dismiss hidden when
  critical. No transition (reduced-motion by having no motion). Inline
  currentColor SVGs, so no `lucide-react` runtime dependency is added.
- **`useUnsavedChanges()` / `useRegisterDirty(id, isDirty)`** — a
  module-level dirty registry (`useSyncExternalStore`) that arms exactly one
  `beforeunload` while anything is dirty and disarms it when all are clean;
  `confirmLeave()` prompts with `UNSAVED_CONFIRM_MESSAGE` only when dirty.
  Measured baseline: ONE `beforeunload` guard across six apps.
- **`@bsuite/nav-core/vite`** (new subpath export, Node-only, never
  re-exported from the browser entry): `versionJsonPlugin()` resolves the
  commit once per build (`VERCEL_GIT_COMMIT_SHA` → `GIT_COMMIT` →
  `git rev-parse HEAD`), `define`s `__BUILD_COMMIT__` and emits
  `dist/version.json` via `generateBundle` from the SAME resolution. With no
  commit it **throws** unless `allowUnknownCommit` (then defines nothing and
  emits nothing). Also `writeVersionJson(dir)`, `resolveBuildInfo()`,
  `resolveBuildCommit()`, `gitHeadCommit()` and the `BuildInfo` type, for
  conduit's route handler.
- `vite` as an OPTIONAL peer (`>=6`) for the subpath; `@types/node` as a dev
  dependency for it.
- README section "Update notice and unsaved-work guard": adoption snippet,
  the rewrite exclusion, the Cache-Control rule, the smoke check.

### Tests

193 (was 174): positive AND negative controls for detection (same / different /
prefix-of / rollback / sentinel), content-type-before-parse (body never read on
`text/html`), one-error-per-fault, polling continues and recovers, kill switch
on/off/mid-session, critical vs warning dismissibility, dismissal keyed by
detected commit and not carried to another, escalation clearing a dismissal,
banner copy with no "new", role-token-only class list, no raw colours / white /
black / inline style, Refresh confirm paths, the banner never reloading on its
own, packaging (index never imports `./vite`, no `node:` in browser modules),
and the plugin's precedence chain, refusal, and define/asset agreement.

### Not in this release (per R10 — each app's adoption PR)

Mounting the banner (11 mount points / 12 render sites), the `vercel.json`
rewrite exclusion and Cache-Control rule per app, removal of the four
unconsented reload sites, `useRegisterDirty` on the edit surfaces, the parent
smoke script and mount gate.

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
