# @bsuite/theme-codemod

One-shot migration script. Replaces hardcoded Tailwind colour utilities with
semantic tokens from `@bsuite/theme v0.2.0`.

## Usage

```bash
# Dry run (no file changes — preview only)
node migrate.mjs --dry-run

# Migrate all D2C apps
node migrate.mjs

# Migrate one app only
node migrate.mjs --app=business-suite-unified

# Migrate a single file
node migrate.mjs --file=../business-suite-unified/src/pages/Dashboard.tsx
```

## After running

1. Review all `THEME-REVIEW` flagged lines — these require human judgement.
2. Review all `THEME-MANUAL` flagged lines — these are inline hex values that
   cannot be auto-replaced.
3. Run `pnpm build` in each app to confirm no broken imports.
4. Run Playwright WCAG suite per app.
5. Open one PR per app targeting `development`.

## Skip rules

- Files matching `/* BRADEN-EXEMPT */` comment are never touched.
- `braden/src/**` is skipped when running D2C mode.
- Claude's feature-branch files are in the skip list (see migrate.mjs SKIP_FILES).
