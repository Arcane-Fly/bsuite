# BSuite Dependency Refresh & TS 6 Migration Notes

**Date:** 2026-05-05 | **Version:** 1.00W | **Status:** Working | **Type:** migration

**Purpose:** Capture the four breaking-behaviour fixes surfaced by the TypeScript 5.9 → 6.0 bump during the 2026-05-05 bsuite-wide dependency refresh, so the next TS major bump (7.x) has a known-good remediation playbook.

---

## 1. Scope of the 2026-05-05 refresh

All 13 `package.json` files (6 apps + 7 shared packages) were bumped to their latest mutually-compatible versions via `pnpm dlx npm-check-updates -u`, with each lockfile regenerated via the isolated-directory pattern documented in the parent `AGENTS.md` so every lockfile retains the `.:` importer (zero `../` paths — Vercel-compatible). Major upgrades in this single refresh:

- TypeScript 5.9 → 6.0 (all 13 packages) — the focus of this migration doc
- Sentry 9 → 10 (`@sentry/react`, `@sentry/nextjs`, `@sentry/vite-plugin`)
- Vite 6 → 8 + `@vitejs/plugin-react` 5 → 6 (shared packages)
- ESLint 9 → 10 (throughput-only)
- App-specific clusters: `@platejs` 52 → 53 (crm7); React Router 6 → 7 + Stripe 14 → 22 + OpenAI 4 → 6 (throughput) — full list in [`../AGENTS.md` § Recent Changes (2026-05-05)](../AGENTS.md#recent-changes-2026-05-05)

Verification: 1683+ tests pass post-refresh; all 6 apps + 7 shared packages pass `pnpm typecheck`, `pnpm test`, and `pnpm build`. All 7 shared packages were patch-bumped and republished to npm (auth `0.1.1`, charge-calc `0.2.4`, nav-core `0.5.2`, page-builder `0.2.2`, schema-builder `0.7.1`, schema-registry `0.3.3`, data-export `0.1.4`) — dev-toolchain-only changes, no public API changes. Consumer specifier bumps (apps → new shared-package versions) were intentionally deferred to a follow-up PR; existing caret ranges already accept the new patch versions per npm semver.

---

## 2. TS 6 breaking-behaviour fixes

### 2.1 Fix 1 — `rootDir` requirement on package build tsconfigs

- **File:** `packages/auth/tsconfig.build.json`
- **Symptom:** TS6059 — `File '...' is not under 'rootDir'` when `tsc -b` ran with co-located test files included in the program.
- **Root cause:** TS 6 is stricter about implicit `rootDir` inference when test files sit alongside source. TS 5.x silently widened `rootDir` to the lowest common ancestor of all input files; TS 6 now requires the build entry point to declare `rootDir` explicitly.
- **Fix:** Added `"rootDir": "./src"` to `compilerOptions` plus an explicit `exclude` list in `tsconfig.build.json` so the build emits only library code:

  ```jsonc
  {
    "extends": "./tsconfig.json",
    "compilerOptions": {
      "noEmit": false,
      "declaration": true,
      "declarationDir": "dist",
      "outDir": "dist",
      "rootDir": "./src",
      "sourceMap": true
    },
    "include": ["src"],
    "exclude": [
      "src/__tests__",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.spec.ts",
      "src/**/*.spec.tsx"
    ]
  }
  ```

  The base `tsconfig.json` (no `rootDir`, includes everything) continues to drive `pnpm typecheck` and Vitest, so test files still type-check against the same compiler options.
- **Pattern for next major bump:** every shared package with co-located tests should ship a separate `tsconfig.build.json` with explicit `rootDir` + test-file `exclude`, while the base `tsconfig.json` extends or mirrors the build config and adds tests back via `include`. Audit `packages/*/tsconfig.build.json` for any package missing this split.

### 2.2 Fix 2 — CSS ambient module declaration for side-effect imports

- **File:** `packages/page-builder/src/globals.d.ts` (NEW)
- **Symptom:** TS2882 — raised on side-effect imports of third-party CSS files (e.g. `import 'react-grid-layout/css/styles.css'`) when no ambient module declaration covers `*.css`.
- **Root cause:** TS 6 tightened ambient-module inference. TS 5.x silently allowed unknown extension imports under `moduleResolution: 'bundler'`; TS 6 now requires an explicit `declare module '*.css'` (or per-extension declaration) when CSS is imported for its side effects only. Vite-based apps already get this from `vite/client` types — Node-bundled shared packages do not.
- **Fix:** New file `packages/page-builder/src/globals.d.ts`:

  ```ts
  declare module '*.css';
  ```

  This is the minimum viable shim for side-effect CSS imports. CSS Modules (`*.module.css`), where the import returns a class-name map, need a richer shape:

  ```ts
  declare module '*.module.css' {
    const classes: Record<string, string>;
    export default classes;
  }
  ```

- **Pattern for next major bump:** any shared package or app that side-effect-imports `.css` / `.scss` / `.less` should ship a `globals.d.ts` (or `vite-env.d.ts` for Vite apps) with the appropriate ambient-module declarations. Vite-based apps inherit this from `vite/client`; Node-bundled shared packages MUST add their own.

### 2.3 Fix 3 — Mock signatures under stricter Web API generics + `globalThis` over `global`

- **File:** `packages/auth/src/__tests__/oauth-client.test.ts`
- **Symptom:** TS errors on `vi.spyOn(crypto, 'getRandomValues').mockImplementation(...)` because TS 6 enforces the stricter Web Crypto generic `<T extends ArrayBufferView | null>(array: T): T` more aggressively, and a loose `(buf: Uint8Array) => buf` stub no longer satisfies the mocked target's signature.
- **Root cause:** TS 6 surfaces tighter Web API generics (TypedArrays, Streams, Crypto) and is stricter about how mock implementations widen against their target. Additionally, TS 6 makes Node-only globals like `global` less reliably in scope from browser-targeted (`jsdom`) test files — `globalThis` is the standards-compliant universal replacement.
- **Fix:** Cast the mock implementation to the precise target signature, and prefer `vi.stubGlobal` / `globalThis` over direct `global.X` assignment:

  ```ts
  vi.spyOn(crypto, 'getRandomValues').mockImplementation(((buf: ArrayBufferView) => {
    if (buf instanceof Uint8Array) fillDeterministicRandom(buf)
    return buf
  }) as Crypto['getRandomValues'])

  // For globals: prefer vi.stubGlobal (auto-restored via vi.unstubAllGlobals())
  vi.stubGlobal('localStorage', localMock)
  vi.stubGlobal('fetch', fetchMock)
  ```

  Where direct global assignment is unavoidable, use `globalThis.X` over `global.X` — `globalThis` works in Node, browsers, jsdom, Deno, and Bun without depending on `@types/node` lib-globals being merged into the test program.
- **Pattern for next major bump:**
  - Cast mock implementations to the *target's* exact type (`as Crypto['getRandomValues']`, `as typeof fetch`, etc.) so TS 6+ narrowing doesn't reject loosely-typed stubs.
  - Prefer `vi.stubGlobal(name, value)` over direct `global.X = value` — it's auto-restored by `vi.unstubAllGlobals()` and avoids the `global` vs `globalThis` ambient-type problem entirely.
  - Audit `\bglobal\.` references in test files:

    ```bash
    rg '\bglobal\.' --type ts -g '!node_modules' -g '*.test.ts' -g '*.spec.ts'
    ```

---

## 3. Bonus pattern: `baseUrl` deprecation under `moduleResolution: 'bundler'`

- **Symptom:** TS5101 — `Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0.` emitted when `baseUrl: '.'` is set under `moduleResolution: 'bundler'`.
- **Root cause:** The modern bundler resolver derives `baseUrl` from `paths` automatically; explicit `baseUrl` is redundant and slated for removal in TS 7.
- **Fix:** Removed redundant `baseUrl: '.'` from 5 tsconfig files across crm7, braden, and R80.3 (BSU, conduit, throughput were already correct).
- **Pattern for next major bump:** audit every `tsconfig*.json` for explicit `baseUrl` lines; remove unless strictly required by a non-bundler resolver. One-shot audit:

  ```bash
  rg '"baseUrl"' --type json -g 'tsconfig*.json' -g '!node_modules'
  ```

---

## 4. Verification matrix

All 13 packages post-refresh:

| Package | typecheck | test | build |
|---------|-----------|------|-------|
| business-suite-unified | ✅ | ✅ | ✅ |
| crm7 | ✅ | ✅ | ✅ |
| conduit | ✅ | ✅ | ✅ |
| braden | ✅ | ✅ | ✅ |
| R80.3 | ✅ | ✅ | ✅ |
| throughput | ✅ | ✅ | ✅ |
| `@bsuite/auth` | ✅ | ✅ | ✅ |
| `@bsuite/charge-calc` | ✅ | ✅ | ✅ |
| `@bsuite/nav-core` | ✅ | ✅ | ✅ |
| `@bsuite/page-builder` | ✅ | ✅ | ✅ |
| `@bsuite/schema-builder` | ✅ | ✅ | ✅ |
| `@bsuite/schema-registry` | ✅ | ✅ | ✅ |
| `@bsuite/data-export` | ✅ | ✅ | ✅ |

*Verified 2026-05-05 via `pnpm typecheck && pnpm test --run && pnpm build` per package; aggregate test count 1683+.*

---

## 5. Playbook for next TS major bump

1. Bump TS in every package via `ncu -u` (root + 13 packages).
2. Regenerate every lockfile via the isolated-directory pattern documented in the parent `AGENTS.md` (Vercel-compatible `.:` importer — zero `../` paths).
3. Run `pnpm typecheck` in every package; categorise errors by TS error code.
4. Apply the four patterns from this doc:
   - **TS6059** — add `rootDir` + test-file `exclude` to shared-package `tsconfig.build.json`
   - **TS2882** — add CSS ambient declarations (`declare module '*.css';`) to `globals.d.ts` for any package that side-effect-imports CSS
   - **Crypto / Web API generic tightening** — cast mock implementations to the target signature (e.g. `as Crypto['getRandomValues']`); prefer `vi.stubGlobal` and `globalThis` over `global.X`
   - **TS5101** — drop `baseUrl` from any `tsconfig*.json` using `moduleResolution: "bundler"`
5. Re-run `pnpm test` and `pnpm build` everywhere; expect zero regressions if the four patterns are applied.
6. Patch-bump shared packages with a CHANGELOG entry of the form `TS X compat — no public API changes`.
7. Defer consumer specifier bumps to a follow-up PR after CI republishes to npm — caret ranges already accept new patch versions per npm semver.

---

## 6. Cross-references

- [`../AGENTS.md` § Recent Changes (2026-05-05)](../AGENTS.md#recent-changes-2026-05-05) — full upgrade list and shared-package patch-bump record.
- [`../AGENTS.md` § Shared Packages (npm)](../AGENTS.md#shared-packages-npm) — lockfile-generation rules + npm publishing rules.
- Per-package CHANGELOGs:
  - [`../packages/auth/CHANGELOG.md`](../packages/auth/CHANGELOG.md)
  - [`../packages/charge-calc/CHANGELOG.md`](../packages/charge-calc/CHANGELOG.md)
  - [`../packages/nav-core/CHANGELOG.md`](../packages/nav-core/CHANGELOG.md)
  - [`../packages/page-builder/CHANGELOG.md`](../packages/page-builder/CHANGELOG.md)
  - [`../packages/schema-builder/CHANGELOG.md`](../packages/schema-builder/CHANGELOG.md)
  - [`../packages/schema-registry/CHANGELOG.md`](../packages/schema-registry/CHANGELOG.md)
  - [`../packages/data-export/CHANGELOG.md`](../packages/data-export/CHANGELOG.md)
- [`./20260227-contributing-standards-guide-v1.01W.md`](./20260227-contributing-standards-guide-v1.01W.md) — this document complies with §4 (Document Naming Convention, type=`migration`, status=`W`).

---

## 7. Status & maintenance

Status: **W (Working)** until the next TS major bump validates this playbook end-to-end. On successful application during the TS 7.x bump, promote to **A (Approved)** and append a "Validated against TS 7.x on YYYY-MM-DD" note. If a fifth pattern emerges during that bump, add it as §2.4 before promotion.
