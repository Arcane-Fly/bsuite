# Contributing to @bsuite/nav-core

## Release Process

### 1. Make changes

All source code is in `src/`. Tests are co-located (`*.test.ts`).

### 2. Verify

```bash
pnpm test          # all tests pass
pnpm typecheck     # no type errors
pnpm build         # dist/ builds cleanly
```

### 3. Bump version

Edit `package.json` version following semver:
- **patch** (`0.x.Y`): bug fixes, no API changes
- **minor** (`0.X.0`): new features, backward-compatible
- **major** (`X.0.0`): breaking API changes

### 4. Dry-run publish

```bash
npm publish --dry-run --access public
```

Review the output to confirm the correct files are included.

### 5. Commit and open PR

```bash
git add package.json
git commit -m "chore(nav-core): bump to vX.Y.Z"
```

Merge to `main` — the `publish-nav-core.yml` workflow publishes automatically.

### 6. Update consumers

After publish, bump `@bsuite/nav-core` in any consumer `package.json`, then regenerate their lockfiles outside the bsuite tree.

## Package contents

Only files listed in `package.json#files` are published: `dist/` and type declarations.
Never publish `src/`, `node_modules/`, or test files.
