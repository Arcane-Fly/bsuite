# SQL Migration for Site Editor

Execute the following SQL commands to set up the necessary tables for the site editor.

**Note:** Run the `fix_policy_conflicts.sql` migration first to handle existing policy conflicts:

## Step 1: Run the Policy Conflict Fix

\`\`\`bash
# Apply the fix migration in Supabase SQL Editor or via CLI
psql -h your-db-host -d your-db-name -f supabase/migrations/fix_policy_conflicts.sql
\`\`\`

## Step 2: Verify Tables and Policies

After running the migration, verify that all tables exist and policies are properly configured:

\`\`\`sql
-- Check if tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
AND tablename IN ('site_settings', 'page_layouts', 'custom_components', 'content_pages', 'content_blocks', 'admin_users', 'media');

-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- List all policies
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;
\`\`\`

## Troubleshooting

If you continue to see policy conflicts:

1. **Manual Policy Cleanup**: Drop all policies for a specific table:
   \`\`\`sql
   -- Example for admin_users table
   SELECT 'DROP POLICY IF EXISTS "' || policyname || '" ON ' || tablename || ';'
   FROM pg_policies 
   WHERE tablename = 'admin_users' AND schemaname = 'public';
   \`\`\`

2. **Check for Duplicate Policy Names**: Ensure policy names are unique across your database:
   \`\`\`sql
   SELECT policyname, COUNT(*) 
   FROM pg_policies 
   WHERE schemaname = 'public'
   GROUP BY policyname 
   HAVING COUNT(*) > 1;
   \`\`\`

3. **Reset All Policies**: If needed, disable and re-enable RLS:
   \`\`\`sql
   ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
   -- Drop all policies manually
   ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
   -- Recreate policies
   \`\`\`
