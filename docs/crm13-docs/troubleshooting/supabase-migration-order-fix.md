# Supabase Migration Order Fix

## Issue Description

When deploying Supabase migrations, an error occurred with the message:

```
ERROR: relation "organizations" does not exist (SQLSTATE 42P01)
```

This happened because of a dependency issue in the migration files:

1. The file `20250216062842_create_organizations_table.sql` created an RLS policy that referenced the `user_organizations` table, but this table was created in a later migration `20250224235514_create_core_tables.sql`.

2. Additionally, the `organizations` table was defined twice:
   - First in `20250216062842_create_organizations_table.sql` (with fewer columns)
   - Then again in `20250224235514_create_core_tables.sql` (with more columns)

## Fix Applied

The issue was fixed by:

1. Creating a new migration file `20250313000001_fix_migration_order.sql` that:
   - Drops the problematic policy that references the non-existent table
   - Creates the `user_organizations` table if it doesn't exist
   - Recreates the policy with the same logic once the table exists
   - Adds the necessary indexes and triggers

2. Updating the original migration file to remove the problematic policy and add a comment explaining the change.

## Preventing Similar Issues

To prevent similar issues in the future:

1. Always check for dependencies between tables and policies:
   - Make sure tables are created before any policies that reference them
   - Organize migrations to handle dependencies in the correct order

2. Use `IF EXISTS` and `IF NOT EXISTS` clauses to make migrations more robust

3. Avoid redefining the same tables in multiple migrations:
   - Use `ALTER TABLE` to modify existing tables
   - Use `CREATE TABLE IF NOT EXISTS` to prevent errors

4. Test migrations in a development environment before deploying to production

## Related Files

- `/supabase/migrations/20250216062842_create_organizations_table.sql`
- `/supabase/migrations/20250224235514_create_core_tables.sql`
- `/supabase/migrations/20250313000001_fix_migration_order.sql`