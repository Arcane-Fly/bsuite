> [IMPORTED FROM CRM13] -- Reference only, not canonical

# CRM13 Project Cleanup Plan

## Overview

This document outlines the plan to clean up redundant files, consolidate documentation, and improve the overall structure of the CRM13 project. The goal is to reduce clutter, improve maintainability, and make the codebase more approachable for new developers.

## 1. Documentation Consolidation

### Navigation Documentation
- Create a unified `/docs/navigation-guide.md` document
- Consolidate content from:
  - `/docs/progress/navigation-improvements.md`
  - `/docs/progress/navigation-improvements-implementation.md`
  - `/docs/progress/navigation-routing-audit.md`
  - `/docs/progress/navigation-sidebar.md`
  - `/docs/progress/navigation-build-fixes.md`
  - `/docs/progress/navigation-implementation-status.md`
  - `/docs/progress/navigation-actionpanel-updates.md`
  - `/docs/progress/navigation-audit.md`
  - `/docs/progress/navigation-supabase-integration.md`

### Authentication Documentation
- Create a unified `/docs/auth-configuration-guide.md` document
- Consolidate content from:
  - `/docs/supabase/redirect-urls.md`
  - `/docs/guides/auth-redirect-configuration.md`
  - `/docs/guides/auth-redirect-configuration-guide.md`

### UI Builder Documentation
- Update `/docs/mermaid-ui-builder.md` as the primary document
- Merge content from:
  - `/docs/progress/mermaid-ui-builder.md`
  - `/docs/progress/puck-editor.md`
  - `/docs/progress/puck-editor-removal-plan.md`

### Backend Visualization
- Update `/docs/backend-visualization.md` as the primary document
- Merge content from:
  - `/docs/progress/backend-visualization.md`

### Requirements Documentation
- Create a unified `/docs/requirements-specification.md` document
- Consolidate content from:
  - `/docs/requirements/compliance.md`
  - `/docs/requirements/functional.md`
  - `/docs/requirements/integration.md`
  - `/docs/requirements/matrix.md`
  - `/docs/requirements/performance.md`
  - `/docs/requirements/security.md`
  - `/docs/requirements/technical.md`
  - `/docs/requirements/ui.md`

### Vercel Documentation
- Create a unified `/docs/vercel-deployment-guide.md` document
- Consolidate content from:
  - `/docs/vercel/getting-started.md`
  - `/docs/vercel/environment-setup.md`
  - `/docs/vercel/environment-variables.md`
  - `/docs/guides/vercel-environment-variables.md`
  - `/docs/vercel/build-optimizations.md`
  - `/docs/vercel/build-fix-summary.md`
  - `/docs/vercel/auth-deployment-fix.md`

## 2. Database Migration Cleanup

### Redundant RLS Fixes
- Keep only the most comprehensive fix: `20250313000000_fix_rls_policies.sql`
- Remove:
  - `20250226_fix_customers_rls.sql`
  - `20250226_fix_customers_rls_simplified.sql`
  - `20250226_fix_customers_rls_corrected.sql`
  - `20250226_fix_customers_rls_final.sql`
  - `20250226_fix_customers_rls_new.sql`
  - `20250226_fix_rls_final.sql`
  - `20250226_simple_rls_fix.sql`

### Notes Table Migrations
- Keep only `20250305_add_notes_table.sql` (more complete implementation)
- Remove:
  - `20250225201327_create_notes_table.sql`
  - `20250226_fix_notes_rls.sql`

### Payroll Tables
- Keep only `20250215093400_create_payroll_tables.sql`
- Remove:
  - `20250214093000_create_payroll_tables.sql`

### Bypass Functions
- Keep only `20250226_create_bypass_rls_function.sql`
- Remove:
  - `20250226_create_bypass_function.sql`

## 3. Prisma Schema Consolidation

Current Schema Files:
- `schema.subset.prisma`
- `schema_updates.prisma`
- `schema.backup.prisma`
- `schema.merged.prisma`
- `schema.fixed.prisma`
- `schema.clean.prisma`
- `schema.prisma`

Plan:
1. Keep only:
   - `schema.prisma` (primary schema)
   - `schema.clean.prisma` (simplified schema for development)
2. Remove all other schema files

## 4. Script Organization

Organize scripts into purpose-based directories:
- `/scripts/migrations/` - Database migration scripts
- `/scripts/fixes/` - One-time fix scripts
- `/scripts/utils/` - Utility scripts
- `/scripts/deployment/` - Deployment-related scripts

## 5. Implementation Approach

1. Create a new git branch: `cleanup`
2. Consolidate documentation files first
3. Organize scripts into folders
4. Remove redundant Prisma schema files
5. Create a comprehensive changelog of cleanup actions
6. Submit a PR with detailed documentation of changes

## 6. Testing Considerations

After cleanup:
- Ensure build still works correctly
- Verify database migrations still apply successfully
- Check that documentation links are updated
- Run test suite to confirm no functionality is broken

## Next Steps

1. Get approval for this plan
2. Create the cleanup branch
3. Begin with documentation consolidation
4. Submit PR with changes for review