# @bsuite/ui

Shared UI primitives for the BSuite apps (D2C Neon Electric + Corporate brands).

Ships as an npm package because Vercel deploys each BSuite app from its own
GitHub repo — the parent monorepo's `packages/` directory does NOT exist in
the Vercel build context. Consumers install from npm with a pinned semver.

## Components

### `DotPattern`

Full-viewport dot-pattern background. SVG `<pattern>` tiling — ~1 DOM node
(vs ~1,800 motion.circle nodes on a typical viewport).

```tsx
import { DotPattern } from '@bsuite/ui'

<div className="relative">
  <DotPattern
    width={28}
    height={28}
    cr={1.5}
    className="opacity-[0.35] [color:var(--accent-primary)]"
  />
  {/* page content */}
</div>
```

Colour control via Tailwind `text-*` utilities or inline `[color:var(...)]`
(dots use `fill="currentColor"`).

## Utils

### `cn(...classes)`

shadcn-style className merger — `clsx` + `tailwind-merge`. Available for
consumers that want to compose `@bsuite/ui` components with local overrides
without pulling shadcn again.

## Releases

1. Edit source under `src/`.
2. `pnpm -C packages/ui test` — all cases must pass.
3. `pnpm -C packages/ui build` — emits `dist/`.
4. Bump version in `package.json` (semver).
5. `npm publish --access public` from `packages/ui/`.
6. Update consumer `package.json` to the new version, regenerate lockfile
   **outside** the bsuite tree (see root `CLAUDE.md` rule 7), commit the
   lockfile + a consumer-side bump PR.

**NEVER** use `workspace:*` or `file:../packages/ui` for this package in a
consumer — Vercel builds can't resolve those.
