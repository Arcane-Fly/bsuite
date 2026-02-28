# Supabase Database Management

## Overview

This guide covers database management in our Supabase project, including schema design, migrations, and best practices for data access.

## Database Structure

### Core Tables

```sql
-- Example schema for core tables
CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text UNIQUE NOT NULL,
    role text NOT NULL,
    department_id uuid REFERENCES public.departments(id),
    status text DEFAULT 'active'::text,
    metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    name text NOT NULL,
    code text UNIQUE NOT NULL,
    manager_id uuid REFERENCES public.employees(id)
);
```

### Triggers and Functions

```sql
-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

## Migrations

### 1. Migration Structure

Migrations are stored in `supabase/migrations/` with timestamp prefixes:

```bash
supabase/migrations/
├── 20250214_create_payroll_tables.sql
├── 20250214_update_gto_tables.sql
└── 20250214_add_course_tables.sql
```

### 2. Creating Migrations

```bash
# Generate a new migration
supabase migration new create_employees_table

# Apply migrations
supabase db push

# Reset database
supabase db reset
```

### 3. Migration Example

```sql
-- 20250214_create_payroll_tables.sql
BEGIN;

-- Create enum types
CREATE TYPE employment_status AS ENUM (
    'full_time',
    'part_time',
    'casual',
    'contract'
);

-- Create tables
CREATE TABLE payroll_periods (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text DEFAULT 'draft',
    locked boolean DEFAULT false,
    CONSTRAINT valid_dates CHECK (end_date > start_date)
);

-- Add indexes
CREATE INDEX idx_payroll_periods_dates ON payroll_periods (start_date, end_date);

-- Add RLS policies
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payroll managers can view all periods"
    ON payroll_periods
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM user_roles WHERE role = 'payroll_manager'
        )
    );

COMMIT;
```

## Data Access Patterns

### 1. Type-Safe Queries

```typescript
// types/database.ts
export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          first_name: string;
          last_name: string;
          email: string;
          role: string;
          department_id: string | null;
          status: string;
          metadata: Record<string, any>;
        };
        Insert: Omit<Tables['employees']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables['employees']['Insert']>;
      };
      // ... other tables
    };
  };
}

// queries/employees.ts
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Employee = Database['public']['Tables']['employees']['Row'];

export async function getEmployeesByDepartment(departmentId: string): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      id,
      first_name,
      last_name,
      email,
      role,
      departments (
        name,
        code
      )
    `)
    .eq('department_id', departmentId)
    .order('last_name');

  if (error) throw error;
  return data;
}
```

### 2. Batch Operations

```typescript
// utils/database.ts
export async function batchInsert<T extends Record<string, any>>(
  table: string,
  records: T[],
  batchSize = 1000
): Promise<void> {
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw error;
  }
}
```

### 3. Transactions

```typescript
// Example of a transaction using pg_advisory_xact_lock
const { error } = await supabase.rpc('transfer_funds', {
  from_account: 'A123',
  to_account: 'B456',
  amount: 100.00
});
```

## Performance Optimization

### 1. Indexing Strategy

```sql
-- B-tree index for exact matches and ranges
CREATE INDEX idx_employees_email ON employees (email);

-- GiST index for full-text search
CREATE INDEX idx_employees_search ON employees
USING gin(to_tsvector('english', first_name || ' ' || last_name));

-- Partial index for active employees
CREATE INDEX idx_active_employees ON employees (id)
WHERE status = 'active';
```

### 2. Query Optimization

```typescript
// Optimize large queries with pagination
async function listEmployeesWithPagination(
  page: number,
  pageSize: number
): Promise<Employee[]> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .range(start, end)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Use specific columns instead of *
async function getEmployeeBasicInfo(id: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}
```

### 3. Caching

```typescript
import { cache } from 'react';

export const getEmployeeWithCache = cache(async (id: string) => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
});
```

## Backup and Recovery

### 1. Automated Backups

Supabase provides automated backups:

- Daily backups retained for 7 days
- Weekly backups retained for 4 weeks
- Monthly backups retained for 6 months

### 2. Manual Backups

```bash
# Export database
supabase db dump -f backup.sql

# Restore database
supabase db restore backup.sql
```

## Monitoring and Maintenance

### 1. Performance Monitoring

```sql
-- Query to find slow queries
SELECT
    calls,
    total_time / calls as avg_time,
    query
FROM pg_stat_statements
ORDER BY avg_time DESC
LIMIT 10;
```

### 2. Database Maintenance

```sql
-- Analyze tables for query optimization
ANALYZE employees;

-- Vacuum to reclaim space and update statistics
VACUUM ANALYZE employees;
```

## Best Practices

1. **Schema Design**
   - Use UUIDs for primary keys
   - Include created_at/updated_at timestamps
   - Implement proper foreign key constraints
   - Use appropriate data types

2. **Security**
   - Always use RLS policies
   - Never expose sensitive data
   - Use parameterized queries
   - Implement proper access controls

3. **Performance**
   - Index frequently queried columns
   - Use appropriate index types
   - Implement pagination
   - Optimize query patterns

4. **Maintenance**
   - Regular VACUUM and ANALYZE
   - Monitor database size
   - Track query performance
   - Regular backups

## Next Steps

1. Review [Row Level Security](./row-level-security.md) setup
2. Implement [Data Validation](./data-validation.md)
3. Configure [Real-time Subscriptions](./realtime.md)
4. Set up [Database Monitoring](./monitoring.md)
