# Supabase + Prisma Integration

This guide documents how to properly connect Prisma with Supabase in our application, including best practices and troubleshooting steps.

## Quick Start

1. **Create a custom Prisma DB user in Supabase**
   - Using the SQL Editor in the Supabase Dashboard, create a dedicated Prisma user:

   ```sql
   -- Create custom user
   create user "prisma" with password 'your_secure_password' bypassrls createdb;

   -- Extend prisma's privileges to postgres (necessary to view changes in Dashboard)
   grant "prisma" to "postgres";

   -- Grant necessary permissions
   grant usage on schema public to prisma;
   grant create on schema public to prisma;
   grant all on all tables in schema public to prisma;
   grant all on all routines in schema public to prisma;
   grant all on all sequences in schema public to prisma;
   alter default privileges for role postgres in schema public grant all on tables to prisma;
   alter default privileges for role postgres in schema public grant all on routines to prisma;
   alter default privileges for role postgres in schema public grant all on sequences to prisma;
   ```

2. **Configure your DATABASE_URL in .env**

   ```env
   # Used for Prisma Migrations and within your application
   DATABASE_URL="postgres://prisma.[PROJECT-REF]:[PRISMA-PASSWORD]@[DB-REGION].pooler.supabase.com:5432/postgres"
   ```

3. **Generate Prisma client**

   ```bash
   pnpm install @prisma/client
   pnpx prisma generate
   ```

## Handling Prisma & Supabase Types

Our application uses both Prisma (for database schema management) and Supabase (for API & auth) to interact with the database. To maintain type safety:

1. The `src/types/database.types.ts` file contains the Supabase-specific types for interacting with the database via the Supabase client.
2. The Prisma schema in `prisma/schema.prisma` is used to auto-generate Prisma client types.
3. Type converters in `src/lib/auth/prisma-auth.ts` handle converting between the two type systems.

## Common Issues & Solutions

### Authentication Issues

If you encounter authentication errors with Prisma:

1. Check that your Prisma user exists in Supabase and has the correct permissions.
2. Verify your DATABASE_URL is correctly formatted with the proper project reference, password, and region.
3. Ensure you're using the Supabase pooler URL (ending with `:5432`).

### Type Safety Concerns

Our application provides strong type safety by:

1. Using Prisma's generated types within server-side code
2. Using Supabase's types for client-side interactions
3. Converting between types in boundary layers

We've added custom type augmentation in `src/types/supabase-extensions.d.ts` and `src/types/global.d.ts` to handle edge cases with Supabase's API responses.

### Error Handling

When working with Supabase responses, we recommend using the `safeDatabaseRequest` utility in `src/lib/supabase.ts` which provides consistent error handling.

## Deploying to Vercel

For Vercel deployments:

1. Set the `DATABASE_URL` environment variable in your Vercel project settings.
2. Ensure your Prisma user has the appropriate permissions.
3. Our `vercel.json` configuration includes settings to properly include Prisma files in the deployment.

## Local Development

For local development:

1. Copy `.env.example` to `.env` and fill in the required variables.
2. Run `pnpx prisma generate` to generate the Prisma client.
3. When making schema changes, use `pnpx prisma migrate dev` to apply them to your database.

## Additional Resources

- [Supabase Prisma Integration Guide](https://supabase.com/docs/guides/database/prisma)
- [Prisma Troubleshooting Docs](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting)
