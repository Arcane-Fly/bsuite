# Manual Steps to Apply GTO Schema

_Last Updated: 2025-03-06_

Since the automated application script is encountering issues, here are the manual steps to apply the GTO schema to your database:

## Prerequisites

1. Ensure you have a backup of your database before proceeding
2. Make sure you have created the clean schema file by running:
   ```bash
   node scripts/fix-schema-syntax.js
   ```

## Manual Application Steps

1. **Back up your original schema**:
   ```bash
   cp prisma/schema.prisma prisma/schema.original.prisma
   ```

2. **Copy the clean schema to your main schema file**:
   ```bash
   cp prisma/schema.clean.prisma prisma/schema.prisma
   ```

3. **Format the Prisma schema**:
   ```bash
   npx prisma format
   ```

4. **Create a migration**:
   ```bash
   npx prisma migrate dev --name add_gto_features
   ```

   This command will:
   - Analyze your schema changes
   - Create a migration file
   - Apply the migration to your development database

5. **Generate Prisma client with updated types**:
   ```bash
   npx prisma generate
   ```

## Troubleshooting

If you encounter errors during the migration:

1. **Check the database connection**:
   Make sure your database connection string in `.env` is correct.

2. **Database credentials issues**:
   Ensure your database user has permission to create tables and modify schemas.

3. **Syntax issues in schema**:
   If you encounter syntax errors despite using the clean schema:
   - Check the schema file manually for any remaining syntax issues
   - Particularly look for mismatched braces and schema annotations

4. **Restore from backup**:
   If you need to restore your original schema:
   ```bash
   cp prisma/schema.original.prisma prisma/schema.prisma
   ```

## After Migration

Once the migration is successful:

1. The API services in `src/api/competency.ts`, `src/api/workplace.ts`, and `src/api/training.ts` will begin working without TypeScript errors
2. You can start implementing the API endpoints that use these services
3. You can develop the UI components for the GTO features

## Database Structure

The migration will create the following new tables:

- CompetencyUnit
- CompetencyAssessment
- WorkplaceInspection
- SupportContact
- TrainingPlanReview

And add new fields to existing tables:

- User (Apprentice fields)
- Customer (Host Employer fields)
- TrainingContract
- Qualification
