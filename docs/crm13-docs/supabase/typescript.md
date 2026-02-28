# TypeScript Integration with Supabase

## Overview

This guide covers TypeScript integration with Supabase, including type generation, type-safe queries, and best practices for maintaining type safety throughout your application.

## Type Generation

### 1. Setup

First, install the Supabase CLI:

```bash
npm install -g supabase-cli
```

Generate types from your Supabase database:

```bash
supabase gen types typescript --project-id your-project-id > lib/database.types.ts
```

### 2. Generated Types Structure

```typescript
// lib/database.types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
          metadata: Json;
        };
        Insert: Omit<Tables['employees']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables['employees']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            referencedRelation: "departments"
            referencedColumns: ["id"]
          }
        ]
      };
      departments: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          code: string;
          manager_id: string | null;
        };
        Insert: Omit<Tables['departments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Tables['departments']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "departments_manager_id_fkey"
            columns: ["manager_id"]
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      };
    };
    Views: {
      employees_with_departments: {
        Row: {
          employee_id: string;
          employee_name: string;
          department_name: string;
          manager_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["employee_id"]
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      };
    };
    Functions: {
      get_employee_details: {
        Args: {
          employee_id: string;
        };
        Returns: {
          id: string;
          name: string;
          department: string;
          role: string;
        }[];
      };
    };
    Enums: {
      employment_status: 'full_time' | 'part_time' | 'casual' | 'contract';
    };
  };
}
```

## Type-Safe Client Setup

### 1. Supabase Client

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Type-safe table types
export type Tables = Database['public']['Tables'];
export type Employees = Tables['employees']['Row'];
export type Departments = Tables['departments']['Row'];
```

### 2. Type-Safe Hooks

```typescript
// hooks/useTypedSupabase.ts
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import type { Database } from '@/lib/database.types';

export const useTypedSupabase = () => {
  return useSupabaseClient<Database>();
};
```

## Type-Safe Queries

### 1. Basic Queries

```typescript
// queries/employees.ts
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/client';

export async function getEmployee(id: string) {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      id,
      first_name,
      last_name,
      email,
      departments (
        id,
        name,
        code
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Type-safe insert
export async function createEmployee(
  employee: Tables['employees']['Insert']
) {
  const { data, error } = await supabase
    .from('employees')
    .insert(employee)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Type-safe update
export async function updateEmployee(
  id: string,
  updates: Tables['employees']['Update']
) {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 2. Complex Queries

```typescript
// queries/departments.ts
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';

type DepartmentWithEmployees = Database['public']['Tables']['departments']['Row'] & {
  employees: Database['public']['Tables']['employees']['Row'][];
  manager: Database['public']['Tables']['employees']['Row'] | null;
};

export async function getDepartmentWithEmployees(
  id: string
): Promise<DepartmentWithEmployees> {
  const { data, error } = await supabase
    .from('departments')
    .select(`
      *,
      employees (*),
      manager:employees!departments_manager_id_fkey (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}
```

## Type-Safe Components

### 1. Form Components

```typescript
// components/EmployeeForm.tsx
import { Tables } from '@/lib/supabase/client';

type EmployeeFormProps = {
  initialData?: Tables['employees']['Row'];
  onSubmit: (data: Tables['employees']['Insert']) => Promise<void>;
};

export function EmployeeForm({ initialData, onSubmit }: EmployeeFormProps) {
  const [formData, setFormData] = useState<Tables['employees']['Insert']>({
    first_name: initialData?.first_name ?? '',
    last_name: initialData?.last_name ?? '',
    email: initialData?.email ?? '',
    role: initialData?.role ?? 'employee',
    department_id: initialData?.department_id ?? null,
  });

  // Form implementation...
}
```

### 2. Data Display Components

```typescript
// components/EmployeeList.tsx
import { Tables } from '@/lib/supabase/client';

type EmployeeListProps = {
  employees: Tables['employees']['Row'][];
  onEdit: (employee: Tables['employees']['Row']) => void;
};

export function EmployeeList({ employees, onEdit }: EmployeeListProps) {
  return (
    <div>
      {employees.map((employee) => (
        <div key={employee.id}>
          <span>{employee.first_name} {employee.last_name}</span>
          <button onClick={() => onEdit(employee)}>Edit</button>
        </div>
      ))}
    </div>
  );
}
```

## Real-time Subscriptions

```typescript
// hooks/useEmployeeSubscription.ts
import { useEffect, useState } from 'react';
import { useTypedSupabase } from './useTypedSupabase';
import type { Tables } from '@/lib/supabase/client';

export function useEmployeeSubscription(employeeId: string) {
  const supabase = useTypedSupabase();
  const [employee, setEmployee] = useState<Tables['employees']['Row'] | null>(null);

  useEffect(() => {
    const subscription = supabase
      .channel('employee-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees',
          filter: `id=eq.${employeeId}`,
        },
        (payload) => {
          setEmployee(payload.new as Tables['employees']['Row']);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [employeeId, supabase]);

  return employee;
}
```

## Error Handling

```typescript
// types/errors.ts
import { PostgrestError } from '@supabase/supabase-js';

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }

  static fromPostgrestError(error: PostgrestError): DatabaseError {
    return new DatabaseError(
      error.message,
      error.code,
      error.details
    );
  }
}

// utils/error-handling.ts
export function handleDatabaseError(error: PostgrestError) {
  switch (error.code) {
    case '23505': // unique_violation
      return new DatabaseError(
        'A record with this value already exists.',
        error.code,
        error.details
      );
    case '23503': // foreign_key_violation
      return new DatabaseError(
        'Referenced record does not exist.',
        error.code,
        error.details
      );
    default:
      return DatabaseError.fromPostgrestError(error);
  }
}
```

## Best Practices

1. **Type Generation**
   - Regenerate types after schema changes
   - Keep generated types in version control
   - Use strict TypeScript configuration

2. **Type Safety**
   - Use type-safe client everywhere
   - Leverage generated types for forms
   - Implement proper error types

3. **Code Organization**
   - Centralize database types
   - Create type-safe hooks
   - Use barrel exports

4. **Performance**
   - Type-check during build
   - Optimize type imports
   - Use type-only imports

## Next Steps

1. Set up [Database Migrations](./database.md)
2. Configure [Authentication](./authentication.md)
3. Implement [Row Level Security](./row-level-security.md)
4. Review [Performance Optimization](./performance.md)
