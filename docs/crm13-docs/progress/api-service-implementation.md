> [IMPORTED FROM CRM13] -- Reference only, not canonical

# API Service Implementation for GTO Features

_Last Updated: 2025-03-06_

## Overview

This document describes the implementation of the API service layer for the GTO (Group Training Organization) features. The API services provide a clean interface for accessing the database models and implement business logic for managing GTO-related data.

## Service Implementation

We have created the following API services:

### 1. Competency Services (`src/api/competency.ts`)

**Implemented services:**
- `competencyUnitService`: Manages competency units linked to qualifications
- `competencyAssessmentService`: Manages apprentice assessment records for competencies

**Key operations:**
- Get competency units by qualification
- Get competency assessments by user (apprentice)
- Get competency assessments by training contract
- Create, update, delete and retrieve competency records

### 2. Workplace Services (`src/api/workplace.ts`)

**Implemented services:**
- `workplaceInspectionService`: Manages workplace health and safety inspections

**Key operations:**
- Get workplace inspections by customer (host employer)
- Get overdue follow-up inspections
- Create, update, delete and retrieve inspection records

### 3. Training Services (`src/api/training.ts`)

**Implemented services:**
- `supportContactService`: Manages apprentice support contacts and mentoring records
- `trainingPlanReviewService`: Manages training plan reviews and progress tracking

**Key operations:**
- Get support contacts by user (apprentice)
- Get training plan reviews by contract
- Get upcoming training plan reviews
- Create, update, delete and retrieve contact and review records

## Implementation Features

All service implementations follow consistent patterns:

1. **Typed Data Access**: All services use Prisma's typed database access for type safety
2. **Relation Handling**: Automatically includes related records in query results where appropriate
3. **Specialized Queries**: Each service includes domain-specific queries beyond basic CRUD operations
4. **Clean Interface**: Consistent method naming and parameter patterns for easy use

## Current Status

The API services are currently marked as placeholder files that will only work after:
1. Running the Prisma migration with `node scripts/apply-gto-schema.js`
2. Generating the TypeScript types with `npx prisma generate`

The TypeScript types show errors as expected, since the Prisma client hasn't been updated with the new models yet.

## Next Steps

1. **Apply Database Migration**: Execute the migration scripts to create the tables and relationships in the database
2. **Generate Types**: Run Prisma generate to create the TypeScript types
3. **API Endpoint Creation**: Implement the Next.js API routes that use these services
4. **UI Integration**: Connect the UI components to the API endpoints
5. **Testing**: Create comprehensive tests for the API services

## Documentation

To help other developers understand and use these services, we have created:

1. **README in src/api/gto directory**: Explains the available services and how to use them
2. **Documentation in each service file**: Clear JSDoc comments explaining the purpose and parameters of each method
3. **Implementation status updates**: Updated in the main GTO implementation status document

## Challenges and Solutions

**Type Compatibility**: The database design uses a mix of UUID and TEXT types for IDs, which required special handling:
- Used db.Uuid type annotation in Prisma schema where required
- Ensured foreign key types match their referenced tables

**Pending Types**: Since the Prisma types aren't generated yet:
- Created placeholder files with clear instructions for next steps
- Added comments explaining the expected behavior after migration
- Used generic TypeScript types where possible to minimize errors

## Conclusion

The API service layer for GTO features is now implemented and ready for the next phase of work. Once the database migration is applied and types are generated, these services will provide a robust foundation for building the GTO feature UI.
