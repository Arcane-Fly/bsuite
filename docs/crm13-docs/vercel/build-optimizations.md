> [IMPORTED FROM CRM13] -- Reference only, not canonical

# Vercel Build Optimizations

This document outlines optimizations made to the build process to eliminate warnings and ensure clean deployments on Vercel.

## Issues Addressed

### 1. Supabase CLI Binary Warning

**Problem:**

```bash
WARN Failed to create bin at /vercel/path0/node_modules/.bin/supabase. ENOENT: no such file or directory, open '/vercel/path0/node_modules/supabase/bin/supabase'
```

This warning occurred because the Supabase CLI package was included as a development dependency, but the binary executable was missing or not properly configured during Vercel deployment.

**Solution:**

1. Moved the Supabase CLI from `devDependencies` to `optionalDependencies` in package.json
2. Added a `postinstall` script to handle missing binaries gracefully:

   ```javascript
   "postinstall": "node -e \"try { console.log('Checking for Supabase CLI...'); require('supabase'); } catch (e) { console.log('Supabase CLI not available, skipping setup'); }\""
   ```

### 2. Node Module Externalization Warnings

**Problem:**

```bash
Module "node:fs" has been externalized for browser compatibility...
Module "node:path" has been externalized for browser compatibility...
Module "node:stream" has been externalized for browser compatibility...
```

These warnings occurred because Vite detected Node.js built-in modules in dependencies (specifically in `@react-router/node`) that aren't compatible with browsers.

**Solution:**
Added a custom `onwarn` handler in the Rollup configuration within `vite.config.ts` to suppress these specific warnings:

```javascript
onwarn(warning, warn) {
  // Suppress specific warnings
  if (
    warning.code === 'UNRESOLVED_IMPORT' &&
    /node:(fs|path|stream)/.test(warning.message)
  ) {
    return;
  }
  // Use default for any other warnings
  warn(warning);
}
```

### 3. Empty Chunk Warning

**Problem:**

```bash
Generated an empty chunk: "utils".
```

This warning occurred because there was a manual chunk for 'utils' that included 'date-fns', but the build process was not including any code from this chunk.

**Solution:**

1. Added a warning suppression for empty chunks in the `onwarn` handler
2. Commented out the empty 'utils' chunk from the `manualChunks` configuration

## Additional Improvements

1. Added `rollup` as a development dependency to provide proper TypeScript type definitions
2. Ensured the `vercel-build` script explicitly excludes optional dependencies

## Benefits

These optimizations provide several benefits:

1. **Clean Build Output**: No warnings or errors during the build process
2. **Improved Developer Experience**: Clear, informative console output
3. **Better Deployment Reliability**: Reduced risk of deployment failures due to missing dependencies
4. **Faster Builds**: Elimination of unnecessary dependencies and better chunk optimization

## Implementation Details

The changes were implemented in:

1. `package.json`: Dependency management and script configuration
2. `vite.config.ts`: Build configuration and warning suppression

These changes ensure that the build process is clean, efficient, and reliable for both local development and Vercel deployments.
