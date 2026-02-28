# Data Schema Improvements

## Overview

This document outlines the improvements to the database schema to address inconsistencies and missing tables in the CRM13 application.

## Database Structure Issues

The audit of our data structure revealed several issues:

1. **Multiple Customer Tables**: The database had three separate tables (`customers`, `clients`, and `Customer`) that were storing essentially the same type of data. This led to data fragmentation, inconsistent queries, and maintenance challenges.

2. **Missing Apprentices/Employees Table**: Despite having dedicated UI sections for apprentices and employees, there was no proper table structure to store this data. User information was scattered across the `auth.users` table and various metadata fields.

## Solutions Implemented

### 1. Unified Customer Table

We developed a script to merge the three separate customer-related tables into a single unified structure:

- Created a new `customers_unified` table that includes all fields from the original tables
- Implemented data migration from all source tables to the unified table
- Established proper indexes for optimized queries
- Set up triggers for automatically updating timestamps

```sql
CREATE TABLE IF NOT EXISTS customers_unified (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  -- Additional fields merged from all customer tables
  -- ...
);
```

### 2. Apprentices/Employees Table

Created a comprehensive `apprentices_employees` table that supports all user types in the system:

- Apprentices
- Employees (staff)
- Field Officers

The table includes:

```sql
CREATE TABLE IF NOT EXISTS apprentices_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  type VARCHAR(50) NOT NULL, -- 'apprentice', 'employee', 'field_officer'
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  -- Common fields
  -- ...
  -- Apprentice specific fields
  training_contract_id UUID,
  qualification_id UUID,
  host_employer_id UUID,
  apprenticeship_status VARCHAR(50),
  -- Employee specific fields
  employee_id VARCHAR(50),
  employment_type VARCHAR(50),
  -- Additional fields
  -- ...
);
```

### 3. Foreign Key Relationships

Established proper relationships between tables:

- Connected apprentices to host employers (`customers_unified`)
- Connected apprentices to training contracts
- Set up supervisor relationships within the employee structure

```sql
-- Host employer reference
ALTER TABLE apprentices_employees
ADD CONSTRAINT fk_apprentices_host_employer
FOREIGN KEY (host_employer_id)
REFERENCES customers_unified(id)
ON DELETE SET NULL;

-- Training contract reference
ALTER TABLE apprentices_employees
ADD CONSTRAINT fk_apprentices_training_contract
FOREIGN KEY (training_contract_id)
REFERENCES training_contract(id)
ON DELETE SET NULL;

-- Supervisor hierarchy
ALTER TABLE apprentices_employees
ADD CONSTRAINT fk_apprentices_supervisor
FOREIGN KEY (supervisor_id)
REFERENCES apprentices_employees(id)
ON DELETE SET NULL;
```

## Migration Script

The `scripts/merge-customer-tables.js` script handles the entire migration process:

1. Identifies all existing tables and their columns
2. Creates the unified structure with all unique columns
3. Migrates data from source tables to the unified table
4. Creates the apprentices/employees table with proper structure
5. Sets up all relationships and constraints

## Benefits

This schema overhaul provides several key benefits:

1. **Data Consistency**: All customer data now lives in a single table with a consistent structure
2. **Simplified Queries**: Applications can now query a single table for all customer-related data
3. **Proper Type Support**: The apprentices/employees table properly models the different types of users
4. **Relationship Integrity**: Foreign key constraints ensure data integrity across the system
5. **Improved Performance**: Proper indexes are in place for all common query patterns

## Next Steps

1. Update application code to use the new schema
2. Add validation to ensure new data is properly routed to the correct tables
3. Consider deprecating and eventually removing the original tables after confirming all data has been migrated successfully
4. Implement database views for backward compatibility with any external systems
