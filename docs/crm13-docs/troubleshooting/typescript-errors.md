# TypeScript Errors Troubleshooting

This document provides solutions for common TypeScript errors in the project.

## Database Type Issues

If you're seeing errors related to database types (e.g., unknown tables or columns), you can:

1. Run the type generation script:
   ```bash
   pnpm run update:types
   ```

2. If specific tables are missing from the types, you can manually add them to `src/interfaces/database.types.ts`.

## Prisma Browser Client

The Prisma client doesn't work directly in the browser. We use a custom implementation in `src/lib/prisma-browser.ts` that:

1. Creates a minimal client for browser environments
2. Proxies requests through API routes
3. Handles type compatibility with the full Prisma client

## Component Type Errors

For component type errors:

1. Make sure you're using the correct prop types
2. For framer-motion components, use the `style` prop instead of `className` for styling
3. Use TypeScript's non-null assertion operator (`!`) only when you're certain a value cannot be null

## Supabase Client Type Issues

When using the Supabase client:

1. Use proper type assertions for responses
2. Handle potential null values in responses
3. Use optional chaining and nullish coalescing for safer access to properties

## Environment Variable Type Issues

If you're seeing errors related to environment variables:

1. Make sure all required variables are defined in your `.env` file
2. Run the environment mapping script:
   ```bash
   pnpm run map:env
   ```

## General TypeScript Fixes

1. Run the TypeScript type checker:
   ```bash
   pnpm run typecheck
   ```

2. Fix ESLint issues:
   ```bash
   pnpm run lint:fix
   ```
