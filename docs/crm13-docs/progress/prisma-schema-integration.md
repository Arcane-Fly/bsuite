# Prisma Schema Integration for GTO Features

_Last Updated: 2025-03-06_

## Overview

This document outlines the process of integrating the GTO (Group Training Organization) feature schema into the main Prisma schema. The integration process involves merging the schema updates, fixing any syntax issues, and applying the changes to the database.

## Integration Process

### 1. Schema Merging

We created a schema merging script that intelligently combines the main schema with our GTO model updates. The script:

- Preserves existing models and their relationships
- Adds GTO-specific fields to existing models (User, Customer, TrainingContract, Qualification)
- Adds new models for GTO features (CompetencyUnit, CompetencyAssessment, etc.)
- Ensures proper schema annotations and model relationships

The merge script is available at `scripts/merge-prisma-schemas.js` and can be run with:

```bash
node scripts/merge-prisma-schemas.js
```

This produces a merged schema at `prisma/schema.merged.prisma` and creates a backup of the original schema at `prisma/schema.backup.prisma`.

### 2. Schema Fixing

The merging process occasionally produces syntax duplications, particularly with schema annotations. We created a fix script to resolve these issues:

- Removes duplicate schema annotations
- Fixes closing brace issues
- Ensures proper syntax structure for Prisma processing

The fix script is available at `scripts/fix-merged-schema.js` and can be run with:

```bash
node scripts/fix-merged-schema.js
```

This produces a fixed schema at `prisma/schema.fixed.prisma`.

### 3. Schema Application

To apply the fixed schema to the database, we created an application script that:

- Copies the fixed schema to the main schema.prisma file
- Formats the schema using Prisma's formatter
- Runs a Prisma migration to update the database
- Generates an updated Prisma client

The application script is available at `scripts/apply-gto-schema.js` and can be run with:

```bash
node scripts/apply-gto-schema.js
```

This will guide you through the migration process.

## Key Changes to Schema

### New Fields for Existing Models

1. **User** (Apprentice) Fields:
   - Visa status and expiry tracking
   - Blue card information
   - Qualifications and language proficiency
   - Support requirements and disability tracking
   - Funding eligibility

2. **Customer** (Host Employer) Fields:
   - Insurance tracking (work cover, liability)
   - Workplace health and safety details
   - Supervision capacity and qualifications
   - Workplace induction information

3. **TrainingContract** Fields:
   - Contract identifiers and nominations
   - Training plan approval tracking
   - Funding source details
   - Payment schedules and variations

4. **Qualification** Fields:
   - Qualification levels and delivery modes
   - Unit requirements (core/elective counts)
   - Regulatory and licensing requirements

### New Models

1. **CompetencyUnit**
   - Tracks individual competency units linked to qualifications
   - Stores unit codes, names, and types (core/elective)
   - Linked to qualification with proper UUID handling

2. **CompetencyAssessment**
   - Tracks apprentice progress through competencies
   - Records assessment dates, results, and feedback
   - Links apprentices, units, and training contracts

3. **WorkplaceInspection**
   - Tracks workplace health and safety inspections
   - Records findings, recommendations, and follow-ups
   - Links to host employers

4. **SupportContact**
   - Tracks mentor/support officer contacts
   - Records contact types, discussion topics, and actions
   - Manages follow-up requirements

5. **TrainingPlanReview**
   - Tracks systematic reviews of training progress
   - Records attendance and performance ratings
   - Manages review schedules and feedback

## Next Steps

After applying the schema changes:

1. Generate TypeScript types from the Prisma schema
2. Implement the API layer for the new models
3. Develop UI components for the GTO features
4. Test the end-to-end functionality

## Rollback Procedure

If you encounter issues during the migration, you can restore from the backup:

```bash
cp prisma/schema.backup.prisma prisma/schema.prisma
npx prisma format
```

This will restore the original schema before the GTO enhancements.
