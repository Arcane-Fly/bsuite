> [IMPORTED FROM CRM13] -- Reference only, not canonical

# Vercel Deployment Fix

This document explains the recent fixes made to the Vercel deployment scripts to address ES module compatibility issues.

## Issues Overview

We encountered three Vercel deployment errors:

1. **Module System Conflict**
   The first issue was caused by a mismatch between the package.json `"type": "module"` configuration (which treats .js files as ES modules) and the use of CommonJS syntax in our deployment scripts.

   Error message:

   ```
   ReferenceError: require is not defined in ES module scope, you can use import instead
   This file is being treated as an ES module because it has a '.js' file extension and '/vercel/path0/package.json' contains "type": "module".
   ```

2. **TypeScript Compiler Not Found**
   After fixing the module system issue, we encountered a second error where the TypeScript compiler wasn't available during the build process.

   Error message:

   ```
   sh: line 1: tsc: command not found
   ```

3. **Dependency Resolution Failure**
   The build process failed with Rollup unable to resolve the "zod" dependency:

   Error message:

   ```
   [vite]: Rollup failed to resolve import "zod" from "/vercel/path0/src/components/MermaidUIBuilder/FormGenerator/FormGeneratorService.ts".
   This is most likely unintended because it can break your application at runtime.
   If you do want to externalize this module explicitly add it to
   `build.rollupOptions.external`
   ```

## Fixes Applied

### 1. ES Module Syntax Conversion

The following files were updated to use ES module syntax:

1. **scripts/map-vercel-env.js**

   - Changed `require()` statements to `import` statements
   - Added proper ES module file path resolution using `fileURLToPath`
   - Updated to use `console.warn()` instead of `console.log()` to comply with linting rules

2. **scripts/deploy-vercel.js**

   - Converted to ES module syntax
   - Added proper path handling for ES modules
   - Maintained all original functionality

3. **scripts/deploy-prisma-vercel.js**
   - Converted to ES module syntax
   - Updated console output methods to `console.warn()`
   - Kept functionality identical to the original

### 2. TypeScript Compiler Fix

- Updated the `vercel-build` script in package.json to explicitly use a specific version of TypeScript:

  ```json
  "vercel-build": "NODE_ENV=production pnpm install --no-frozen-lockfile && node scripts/map-vercel-env.js && npx prisma generate && npx tsc@5.7.3 --project tsconfig.node.json --skipLibCheck && vite build"
  ```

  This ensures the TypeScript compiler is available regardless of whether it's installed globally on the build environment.

### 3. Dependency Resolution Fix

1. **Enhanced Vite Configuration**

   - Updated `vite.config.ts` to properly handle external dependencies:

   ```typescript
   // Modified build configuration
   build: {
     rollupOptions: {
       external: [], // Remove 'zod' from external if it was listed there
       output: {
         manualChunks: {
           vendor: ['react', 'react-dom', 'react-router-dom'],
           // Include zod in a specific chunk to ensure proper resolution
           utils: ['zod', 'date-fns']
         }
       }
     }
   }
   ```

2. **Added Pre-build Dependency Check**

   - Created a script to verify all dependencies are properly installed before build:

   ```javascript
   // scripts/verify-dependencies.js
   import { existsSync } from 'fs';
   import { resolve } from 'path';
   import { fileURLToPath } from 'url';

   const __dirname = fileURLToPath(new URL('.', import.meta.url));

   const criticalDependencies = ['zod', '@supabase/supabase-js', 'react', 'react-dom'];

   for (const dep of criticalDependencies) {
     const depPath = resolve(__dirname, '../node_modules', dep);
     if (!existsSync(depPath)) {
       console.warn(`Critical dependency not found: ${dep}`);
       process.exit(1);
     }
   }
   ```

3. **Updated Package.json**
   - Ensured zod is explicitly listed in dependencies with the correct version:
   ```json
   "dependencies": {
     "zod": "^3.24.2"
   }
   ```
   - Explicitly added the dependency check to the build process:
   ```json
   "vercel-build": "node scripts/verify-dependencies.js && NODE_ENV=production pnpm install --no-frozen-lockfile && node scripts/map-vercel-env.js && npx prisma generate && npx tsc --project tsconfig.node.json --skipLibCheck && vite build"
   ```

## Usage Notes

- No changes are required in how these scripts are invoked - they can be run with the same commands as before
- The scripts now properly work with the ES module system defined in package.json
- All dependencies are verified before the build process starts
- All scripts maintain backward compatibility with existing workflows

## Alternatives Considered

Other potential solutions that weren't implemented:

1. Renaming the scripts to use `.cjs` extension to force CommonJS mode
2. Changing package.json to remove `"type": "module"` setting
3. Creating a separate build/deploy configuration
4. Using a custom Rollup configuration outside of Vite

These were not used because they would require more extensive changes to the project configuration.

## Future Improvements

To further improve build stability, consider:

1. Creating a more comprehensive dependency verification script
2. Implementing automated pre-commit checks for dependency resolution
3. Setting up continuous integration tests that simulate Vercel's build environment
4. Creating a minimal reproducible test case for the build process
