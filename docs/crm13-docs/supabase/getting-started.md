# Supabase Integration Guide

## Overview

This guide covers the integration of Supabase with our Next.js application, providing a robust backend solution for authentication, database, and real-time features.

## Prerequisites

- Node.js 20.11.1 or later
- Next.js 15.1.7
- TypeScript 5.7.3
- Supabase project (version 2.48.1 or later)

## Environment Setup

Create a `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Installation

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

## Project Configuration

### 1. Supabase Client Setup

Create a new file at `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
});
```

### 2. Type Generation

1. Install Supabase CLI:

```bash
npm install -g supabase-cli
```

1. Generate types:

```bash
supabase gen types typescript --project-id your-project-id > lib/database.types.ts
```

### 3. Middleware Setup

Create `middleware.ts` in the root directory:

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session if expired
  await supabase.auth.getSession();

  return res;
}
```

## Usage Examples

### 1. Data Fetching

```typescript
import { supabase } from '@/lib/supabase';

async function fetchEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

### 2. Real-time Subscriptions

```typescript
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function EmployeeList() {
  useEffect(() => {
    const subscription = supabase
      .channel('employees')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'employees' },
        (payload) => {
          console.log('Change received:', payload);
          // Handle the change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <div>Employee List</div>;
}
```

### 3. Error Handling

```typescript
import { PostgrestError } from '@supabase/supabase-js';

function handleSupabaseError(error: PostgrestError) {
  switch (error.code) {
    case '23505': // Unique violation
      return 'This record already exists.';
    case '23503': // Foreign key violation
      return 'Referenced record does not exist.';
    default:
      return `Database error: ${error.message}`;
  }
}
```

## Best Practices

1. **Type Safety**
   - Always use generated types
   - Implement strict error handling
   - Use TypeScript's strict mode

2. **Security**
   - Implement Row Level Security (RLS)
   - Never expose sensitive data in public queries
   - Use server-side functions for sensitive operations

3. **Performance**
   - Use selective columns in queries
   - Implement proper indexing
   - Use connection pooling in production

4. **Real-time**
   - Clean up subscriptions in useEffect
   - Use broadcast if possible
   - Implement retry logic for disconnections

## Common Issues and Solutions

1. **Authentication Issues**
   - Ensure middleware is properly configured
   - Check token expiration handling
   - Verify environment variables

2. **Type Generation Issues**
   - Run type generation after schema changes
   - Verify project ID and access token
   - Check for CLI updates

3. **Performance Issues**
   - Use pagination for large datasets
   - Implement proper caching
   - Monitor query performance

## Next Steps

1. Review [Authentication](./authentication.md) setup
2. Implement [Database Management](./database.md) strategies
3. Configure [Row Level Security](./row-level-security.md)
4. Set up [TypeScript Integration](./typescript.md)
