# Admin Access Fix - Migration Guide

This document outlines the fix for the RLS (Row Level Security) policy issues that were causing 403 Forbidden errors on admin operations.

## Problem Summary

The issue was a circular dependency in RLS policies:
- Admin users needed to query `admin_users` table to check if they're admin
- But RLS policies required admin status to read the `admin_users` table
- This created an impossible condition where admins couldn't verify their own admin status

## Solution Overview

The fix involves:
1. **SECURITY DEFINER functions** that bypass RLS policies for admin checks
2. **Improved RLS policies** that use these functions to break the circular dependency
3. **Enhanced Edge Function** authentication with proper admin verification
4. **Audit logging** for admin actions

## Migration Files

### Primary Migration
- **File**: `supabase/migrations/20250109_fix_admin_rls_policies.sql`
- **Purpose**: Fixes RLS policies and admin functions
- **Impact**: Resolves 403 errors and enables proper admin functionality

## How to Apply the Fix

### Step 1: Apply Migration
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy the contents of `supabase/migrations/20250109_fix_admin_rls_policies.sql`
4. Execute the SQL

### Step 2: Verify Fix
Run the test scripts to verify functionality:

\`\`\`bash
# Test current state (should pass basic function checks)
npm test src/tests/admin-access.test.ts

# Test full functionality after migration
node test-admin-post-migration.js
\`\`\`

### Step 3: Deploy Edge Function
The Edge Function has been updated with better authentication:

\`\`\`bash
# If using Supabase CLI
supabase functions deploy add-admin-user --no-verify-jwt
\`\`\`

## What Changed

### 1. Database Functions (with SECURITY DEFINER)
- `is_developer_admin()` - Checks if user is the developer admin
- `admin_bypass()` - Provides admin bypass capability  
- `has_admin_access()` - General admin access check
- `test_admin_access()` - Diagnostic function for testing

### 2. RLS Policies
- **admin_users_select_policy**: Allows admins to read admin_users table
- **admin_users_insert_policy**: Only developer admin can add new admins
- **admin_users_update_policy**: Admins can update records
- **admin_users_delete_policy**: Only developer admin can delete

### 3. Edge Function Updates
- Added proper admin verification before using service role key
- Added audit logging for admin actions
- Better error handling and security

### 4. Frontend Service Updates
- Uses RPC functions instead of direct table queries for admin checks
- Calls Edge Function with proper authentication headers
- Better error handling

### 5. Audit Logging
- New `admin_audit_log` table tracks admin actions
- Automatic logging of admin user additions
- Helps with security compliance

## Testing

### Before Migration
- RPC functions return `null` (authentication issues)
- `admin_users` table queries return 403 Forbidden
- Edge Functions may fail with authentication errors

### After Migration
- RPC functions return proper boolean values
- Admin users can query `admin_users` table
- Edge Functions work with admin authentication
- Audit logging captures admin actions

### Test Scripts
1. `npm test src/tests/admin-access.test.ts` - Unit tests
2. `node test-admin.js` - Pre-migration test
3. `node test-admin-post-migration.js` - Post-migration verification

## Security Considerations

### SECURITY DEFINER Functions
- Functions run with elevated privileges to bypass RLS
- Carefully designed to prevent privilege escalation
- Only check admin status, don't perform admin actions directly

### Service Role Key Usage
- Only used in Edge Functions, never exposed to client
- Proper authentication verification before service role operations
- Audit logging for all service role actions

### RLS Policy Design
- Policies use SECURITY DEFINER functions to break circular dependencies
- Developer admin has ultimate access (braden.lang77@gmail.com)
- Regular admins have appropriate limited access

## Troubleshooting

### Issue: RPC functions still return null
**Solution**: Ensure user is authenticated and migration is applied

### Issue: Still getting 403 on admin_users table
**Solution**: Verify RLS policies were created correctly and user has admin status

### Issue: Edge Function authentication fails
**Solution**: Check that request includes proper Authorization header with valid JWT

### Issue: Test function not found
**Solution**: Migration not applied - run the SQL migration in Supabase Dashboard

## Files Modified

1. `supabase/migrations/20250109_fix_admin_rls_policies.sql` - New migration
2. `supabase/functions/add-admin-user/index.ts` - Enhanced Edge Function
3. `src/services/adminUserService.ts` - Updated frontend service
4. `src/tests/admin-access.test.ts` - Updated tests
5. `test-admin-post-migration.js` - New comprehensive test

## Verification Checklist

- [ ] Migration applied successfully in Supabase Dashboard
- [ ] `is_developer_admin()` returns `true` for braden.lang77@gmail.com
- [ ] `admin_users` table query succeeds for admin users
- [ ] Edge Function `add-admin-user` works with authentication
- [ ] Audit logging table `admin_audit_log` exists and is accessible
- [ ] All tests pass: `npm test src/tests/admin-access.test.ts`
- [ ] Post-migration test passes: `node test-admin-post-migration.js`

## Next Steps

After successful migration:
1. Monitor admin functionality in production
2. Review audit logs regularly
3. Consider additional admin roles if needed (editor, viewer, etc.)
4. Test admin operations in production environment
