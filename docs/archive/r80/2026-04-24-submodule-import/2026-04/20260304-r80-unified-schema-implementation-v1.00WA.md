# Unified Schema Implementation Guide

## Overview

This document describes the implementation of the unified business suite schema for R80.3 and future integration with CRM7, Throughput, and Business Intelligence modules.

## What Was Implemented

### 1. Database Migration (`supabase/migrations/20251014000000_unified_business_suite_schema.sql`)

A comprehensive SQL migration that creates:

#### Core Multi-Tenancy Tables
- **tenants**: Organizations (GTOs, companies, business units)
- **user_tenants**: Links users to tenants with roles and subscriptions

#### Subscription & Licensing
- **subscription_plans**: Product tiers with feature flags
- **permissions**: Granular module permissions
- **roles_permissions**: RBAC mappings

#### Shared CRM Tables
- **contacts**: Universal contact management
- **clients**: Business customers/accounts

#### Unified Business Tables
- **award_rates**: Standardized pay rates (extends award_templates)
- **projects**: Links ideas, apprenticeships, and client work
- **project_members**: Project team members
- **financial_records**: Invoices, payments, charges across modules
- **bi_metrics**: Business intelligence fact table

#### Throughput Integration
- **ideas**: Idea capture from Throughput
- **business_plan_sections**: Business plan content
- **saved_research**: Research results

#### Security
- Row Level Security (RLS) policies on all tables
- Tenant-scoped data access
- Role-based permissions

#### Seed Data
- Three subscription plans (Free, Professional, Enterprise)
- Default permissions for all modules
- Role-to-permission mappings

### 2. TypeScript Types (`src/types/unified-schema.ts`)

Complete TypeScript type definitions for:
- All database tables
- Enums for status fields
- Utility types (UserContext, FeatureAccess, PermissionCheck)

### 3. Service Layer (`src/services/unifiedSchemaService.ts`)

Helper functions for:
- User context management
- Tenant switching
- Feature access checks
- Permission validation
- Tenant creation
- User invitations

### 4. Documentation (`docs/unified-schema.md`)

Comprehensive documentation covering:
- Architecture principles
- Table descriptions
- Security model
- Role hierarchy
- Usage examples
- Best practices

## Integration with Existing R80.3 Schema

### Backward Compatibility

The existing R80.3 tables remain unchanged. New columns are added non-destructively:

```sql
-- Added to apprentice_profiles (if not exists):
- tenant_id (uuid)
- contact_id (uuid)
- client_id (uuid)
```

These columns are **optional** to maintain backward compatibility. Existing apprentice profiles will continue to work without a tenant context.

### Migration Path for Existing Data

When ready to enable multi-tenancy:

1. **Create a default tenant** for existing users
2. **Assign users** to the default tenant with appropriate roles
3. **Link apprentice profiles** to the default tenant
4. **Create contacts** for apprentices (optional)
5. **Link clients** for host employers (optional)

## Usage Examples

### 1. Initialize User Context

```typescript
import { getUserContext } from './services/unifiedSchemaService';

const context = await getUserContext(userId);
if (context) {
  console.log('User belongs to', context.tenants.length, 'tenants');
  console.log('Current tenant:', context.current_tenant_id);
}
```

### 2. Check Feature Access

```typescript
import { checkFeatureAccess } from './services/unifiedSchemaService';

const access = await checkFeatureAccess(userId, tenantId, 'r80');
if (access.enabled) {
  // Allow R80.3 module access
  if (access.limit) {
    console.log('Max apprentices:', access.limit);
  }
} else {
  console.log(access.message); // Show upgrade prompt
}
```

### 3. Check Permissions

```typescript
import { checkPermission } from './services/unifiedSchemaService';

const canManage = await checkPermission(userId, tenantId, 'r80:manage');
if (canManage.allowed) {
  // Allow apprentice profile editing
}
```

### 4. Create a New Tenant

```typescript
import { createTenant } from './services/unifiedSchemaService';

const tenant = await createTenant(
  'My GTO Organization',
  'Training',
  currentUserId
);
if (tenant) {
  console.log('Created tenant:', tenant.id);
}
```

### 5. Record BI Metrics

```typescript
import { supabase } from './services/supabaseClient';

await supabase.from('bi_metrics').insert({
  tenant_id: tenantId,
  metric_name: 'apprentice_hours',
  value: totalHours,
  unit: 'hours',
  recorded_date: new Date().toISOString().split('T')[0],
  dimension1: `apprentice:${apprenticeId}`,
  dimension2: `year:${apprenticeYear}`,
  metadata: { client: clientName }
});
```

## Next Steps

### Phase 1: R80.3 Enhancement (Optional)
1. Add tenant selection UI
2. Enable multi-tenant support for existing users
3. Create default tenant for solo users

### Phase 2: CRM Integration
1. Import CRM tables structure
2. Link contacts to apprentices
3. Enable client management
4. Create invoices from charge calculations

### Phase 3: Throughput Integration
1. Connect ideas module
2. Enable business plan creation
3. Convert ideas to projects
4. Link projects to apprentices

### Phase 4: Business Intelligence
1. Build BI dashboard
2. Configure metric collection
3. Create cross-module reports
4. Enable data export

## Testing the Migration

### Apply the Migration

```bash
# Using Supabase CLI
supabase db reset  # Resets and applies all migrations
# OR
supabase migration up  # Applies new migrations only
```

### Verify Tables

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'tenants', 'user_tenants', 'subscription_plans',
    'contacts', 'clients', 'projects', 'financial_records',
    'bi_metrics', 'ideas'
  );

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'tenants';
```

### Test Seed Data

```sql
-- Check subscription plans
SELECT name, price FROM subscription_plans;

-- Check permissions
SELECT name, module FROM permissions ORDER BY module, name;

-- Check role mappings
SELECT rp.role, p.name as permission
FROM roles_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE rp.role = 'staff'
ORDER BY p.module, p.name;
```

## Rollback Plan

If issues arise, the migration can be rolled back:

```bash
# Drop all new tables
supabase migration new rollback_unified_schema
```

Add to rollback migration:
```sql
DROP TABLE IF EXISTS saved_research CASCADE;
DROP TABLE IF EXISTS business_plan_sections CASCADE;
DROP TABLE IF EXISTS ideas CASCADE;
DROP TABLE IF EXISTS bi_metrics CASCADE;
DROP TABLE IF EXISTS financial_records CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS award_rates CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS roles_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS user_tenants CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Remove columns from apprentice_profiles
ALTER TABLE apprentice_profiles 
  DROP COLUMN IF EXISTS tenant_id,
  DROP COLUMN IF EXISTS contact_id,
  DROP COLUMN IF EXISTS client_id;
```

## Security Considerations

1. **RLS Policies**: All tables have RLS enabled with tenant-scoped access
2. **User Isolation**: Users can only access data from their tenants
3. **Role-Based Access**: Different roles have different permissions
4. **Audit Trail**: All tables have created_at timestamps
5. **Soft Deletes**: Consider adding deleted_at for audit compliance

## Performance Considerations

1. **Indexes**: Key indexes added for foreign keys and common queries
2. **RLS Overhead**: Monitor query performance with RLS policies
3. **BI Metrics**: Partitioning recommended for large datasets
4. **Tenant Queries**: Always include tenant_id in WHERE clauses

## Support

For questions or issues:
1. Review the [unified-schema.md](./unified-schema.md) documentation
2. Check the migration file comments
3. Review the TypeScript types for field definitions
4. Contact the development team

## Changelog

### 2025-10-14
- Initial implementation of unified schema
- Created 15 new tables with RLS policies
- Added TypeScript types and service layer
- Documented architecture and usage
