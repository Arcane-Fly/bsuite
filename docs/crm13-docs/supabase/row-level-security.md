> [IMPORTED FROM CRM13] -- Reference only, not canonical

# Row Level Security (RLS) in Supabase

## Overview

Row Level Security (RLS) is a critical security feature in Supabase that allows fine-grained control over which users can access which rows in your database tables.

## Core Concepts

### 1. Policy Structure

```sql
CREATE POLICY policy_name
ON table_name
FOR operation
TO role
USING ( condition )
WITH CHECK ( condition );
```

Components:

- `policy_name`: Descriptive name for the policy
- `table_name`: Table the policy applies to
- `operation`: SELECT, INSERT, UPDATE, DELETE, or ALL
- `role`: Database role (usually 'authenticated' or 'anon')
- `USING`: Condition for SELECT, UPDATE, DELETE
- `WITH CHECK`: Condition for INSERT, UPDATE

## Implementation

### 1. Enable RLS

```sql
-- Enable RLS on a table
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Disable RLS on a table (not recommended)
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
```

### 2. Basic Policies

```sql
-- Allow users to read their own data
CREATE POLICY "Users can view own data"
ON employees
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to update their own data
CREATE POLICY "Users can update own data"
ON employees
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow admins to read all data
CREATE POLICY "Admins can view all data"
ON employees
FOR SELECT
TO authenticated
USING (
    auth.jwt() ->> 'role' = 'admin'
);
```

### 3. Complex Policies

```sql
-- Department managers can view their department's employees
CREATE POLICY "Managers view department employees"
ON employees
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM departments
        WHERE departments.id = employees.department_id
        AND departments.manager_id = auth.uid()
    )
);

-- HR can view all active employees
CREATE POLICY "HR view active employees"
ON employees
FOR SELECT
USING (
    auth.jwt() ->> 'role' = 'hr'
    AND status = 'active'
);
```

## Role-Based Access Control

### 1. User Roles Table

```sql
CREATE TABLE user_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    role text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Policy for role assignment
CREATE POLICY "Only admins can manage roles"
ON user_roles
FOR ALL
USING (
    auth.jwt() ->> 'role' = 'admin'
);
```

### 2. Role-Based Policies

```sql
-- Function to check if user has role
CREATE OR REPLACE FUNCTION has_role(required_role text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_roles
        WHERE user_id = auth.uid()
        AND role = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy using role check
CREATE POLICY "Payroll access"
ON payroll_records
FOR SELECT
USING (
    has_role('payroll_manager')
    OR has_role('finance_admin')
);
```

## Hierarchical Access Control

### 1. Organization Structure

```sql
CREATE TABLE organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE org_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid REFERENCES organizations(id),
    user_id uuid REFERENCES auth.users(id),
    role text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(org_id, user_id)
);

-- Policy for organization access
CREATE POLICY "Org member access"
ON organizations
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM org_members
        WHERE org_members.org_id = organizations.id
        AND org_members.user_id = auth.uid()
    )
);
```

### 2. Department Access

```sql
-- Function to check department access
CREATE OR REPLACE FUNCTION can_access_department(dept_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM departments d
        JOIN org_members om ON d.org_id = om.org_id
        WHERE d.id = dept_id
        AND om.user_id = auth.uid()
        AND (
            om.role = 'admin'
            OR d.manager_id = auth.uid()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy using department access
CREATE POLICY "Department data access"
ON department_data
FOR SELECT
USING (
    can_access_department(department_id)
);
```

## Security Best Practices

### 1. Default Deny

```sql
-- Start with denying all access
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;

-- Then add specific policies
CREATE POLICY "Public read specific columns"
ON employees
FOR SELECT
USING (
    auth.role() = 'anon'
    AND EXISTS (
        SELECT 1
        FROM employees_public_view
        WHERE id = employees.id
    )
);
```

### 2. Security Definer Functions

```sql
-- Function to safely get employee details
CREATE OR REPLACE FUNCTION get_employee_details(employee_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    IF NOT has_role('hr') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT json_build_object(
        'id', e.id,
        'name', e.first_name || ' ' || e.last_name,
        'sensitive_data', e.sensitive_data
    )
    INTO result
    FROM employees e
    WHERE e.id = employee_id;

    RETURN result;
END;
$$;
```

### 3. Data Masking

```sql
-- View for masked data
CREATE VIEW employees_masked AS
SELECT
    id,
    first_name,
    last_name,
    CASE WHEN has_role('hr')
        THEN email
        ELSE regexp_replace(email, '^(.{2}).*(@.*)$', '\1***\2')
    END as email,
    department_id,
    status
FROM employees;

-- Policy for masked view
CREATE POLICY "Access masked employee data"
ON employees_masked
FOR SELECT
TO authenticated
USING (true);
```

## Testing RLS Policies

### 1. Test Setup

```sql
-- Function to test as different users
CREATE OR REPLACE FUNCTION test_as_user(user_id uuid)
RETURNS void AS $$
BEGIN
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub TO user_id::text;
END;
$$ LANGUAGE plpgsql;

-- Test script
DO $$
DECLARE
    test_user_id uuid;
BEGIN
    -- Create test user
    INSERT INTO auth.users (id, email)
    VALUES (gen_random_uuid(), 'test@example.com')
    RETURNING id INTO test_user_id;

    -- Test as user
    PERFORM test_as_user(test_user_id);

    -- Attempt operations
    -- Should fail due to RLS
    INSERT INTO employees (first_name, last_name)
    VALUES ('Test', 'User');
END;
$$;
```

### 2. Policy Verification

```sql
-- View effective policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'employees';

-- Test policy combinations
SELECT has_table_privilege('authenticated', 'employees', 'SELECT');
SELECT has_table_privilege('anon', 'employees', 'INSERT');
```

## Common Issues and Solutions

1. **Policy Conflicts**

   - Use `PERMISSIVE` vs `RESTRICTIVE` policies
   - Order policies appropriately
   - Test all combinations

2. **Performance Impact**

   - Index columns used in policy conditions
   - Use efficient policy conditions
   - Monitor query performance

3. **Maintenance**

   - Document all policies
   - Regular policy audits
   - Test policy changes thoroughly

## Next Steps

1. Implement [Data Validation](./data-validation.md)
2. Set up [Audit Logging](./audit-logging.md)
3. Configure [API Security](./api-security.md)
4. Review [Security Best Practices](./security.md)
