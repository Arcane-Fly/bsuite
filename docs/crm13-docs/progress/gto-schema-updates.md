# GTO Schema Implementation Progress

_Last Modified: 2025-03-06_

## Overview

This document tracks our progress in implementing the GTO (Group Training Organization) schema requirements for apprentice and employer management. We've established the core relationship between Qualification and TrainingContract models and are now enhancing the schema for comprehensive GTO compliance.

## Implementation Strategy

We're taking an incremental approach to building out the full GTO schema:

1. **Phase 1: Core Relationship Setup** ✅
   - Established relationship between Qualification and TrainingContract models
   - Created and validated test data to ensure proper bidirectional relationships
   - Documented in `docs/progress/schema-relation-validation.md`

2. **Phase 2: Field Enhancements** 🚧
   - Adding GTO-specific fields to existing models (User, Customer, TrainingContract, Qualification)
   - Adapting schema to use existing tables rather than creating new tables where possible
   - Maintaining compatibility with current database schema

3. **Phase 3: Supporting Tables** 🚧
   - Creating additional tables for competency tracking, workplace inspections, and support contacts
   - Establishing proper relationships between all models
   - Testing with sample data

## Challenges Encountered

### Database Type Compatibility

Our initial schema design assumed UUID types for IDs, but inspection of the actual database shows:
- User.id is TEXT, not UUID
- Customer.id is TEXT, not UUID
- Other tables also use TEXT IDs

We need to adjust our schema to match the existing database structure, ensuring type compatibility in foreign key relationships.

### Table Casing

The database uses a mix of PascalCase and lowercase_with_underscores for table names:
- `User` and `Customer` use PascalCase
- Other tables may use lowercase

We're adapting our schema to match the actual database structure.

## Next Steps

1. Revise the enhancement script to use TEXT types for IDs rather than UUID
2. Adjust foreign key constraints to match the existing database schema
3. Split our schema implementation into smaller, focused scripts
4. Implement the schema changes incrementally to minimize disruption

## GTO Requirements Implementation

### User Fields (Apprentice)
- Adding fields for visa status, qualifications, language proficiency
- Adding fields for disability information and support requirements
- Adding fields for funding eligibility and employment history

### Customer Fields (Host Employer)
- Adding fields for insurance details and expiry dates
- Adding fields for workplace safety policy compliance
- Adding fields for apprentice supervision capacity and ratings

### TrainingContract Enhancements
- Adding fields for contract identifiers and registration details
- Adding fields for training plan approvals and variations
- Adding fields for funding sources and payment schedules

### Supporting Tables
- CompetencyUnit and CompetencyAssessment for tracking training progress
- WorkplaceInspection for workplace health and safety compliance
- SupportContact for mentor/support officer contact tracking
- TrainingPlanReview for systematic training progress reviews
