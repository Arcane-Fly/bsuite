> **ARCHIVED 2026-07-09** — point-in-time session report (deep-dive docs-vs-code audit). Moved from `throughput/MIGRATION_GUIDE.md` to the parent-repo archive per operator ruling. Historical record; do not update.

# Migration Guide - Production Readiness Updates

This document outlines the breaking changes and migration steps for the production-ready improvements to Throughput.

## Overview

We've implemented critical improvements in three key areas:
1. **Security**: Comprehensive RLS policies, API key migration to server-side
2. **Type Safety**: Zod schemas with runtime validation
3. **UX**: Reusable, accessible UI component library

---

## Breaking Changes

### 1. Database Schema Consolidation

**What Changed:**
- All previous migrations consolidated into a single, clean schema
- Added comprehensive Row Level Security (RLS) policies
- Added proper indexes and foreign key constraints

**Action Required:**
```bash
# Apply the new consolidated migration
supabase db reset  # WARNING: This will drop all data in development
supabase db push
```

**For Production:**
```bash
# Run the consolidated migration against production
supabase db push --db-url <production-db-url>
```

**Data Safety:**
- The new migration uses `CREATE TABLE IF NOT EXISTS`
- All RLS policies check existing policies before creating
- Safe to run on existing databases without data loss

---

### 2. API Key Migration to Server-Side

**What Changed:**
- Bing API key moved from client environment to Edge Function
- All API calls now go through secure server-side functions

**Action Required:**

#### Step 1: Set Up Environment Variables

**Local Development (.env.local):**
```bash
# Remove (no longer needed on client):
# VITE_BING_API_KEY=your-key-here

# These remain:
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Supabase Edge Functions:**
```bash
# Set secrets for edge functions
supabase secrets set BING_API_KEY=your-bing-api-key
supabase secrets set GROQ_API_KEY=your-groq-api-key
```

**Vercel/Production:**
```bash
# In Vercel dashboard or via CLI:
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Edge function secrets set via Supabase dashboard
```

#### Step 2: Update API Calls

**Old Code:**
```typescript
const response = await fetch(
  `https://api.bing.microsoft.com/v7.0/search?q=${query}`,
  {
    headers: {
      'Ocp-Apim-Subscription-Key': import.meta.env.VITE_BING_API_KEY,
    },
  }
);
```

**New Code:**
```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bing-search`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      count: 10,
      searchType: 'web',
    }),
  }
);
```

---

### 3. Type-Safe Data Access Layer

**What Changed:**
- All database queries now go through typed repositories
- Runtime validation using Zod schemas
- Automatic error handling and logging

**Action Required:**

**Old Code:**
```typescript
const { data, error } = await supabase
  .from('ideas')
  .select('*')
  .eq('user_id', user.id);

if (error) {
  // manual error handling
}
```

**New Code:**
```typescript
import { IdeaRepository } from '@/lib/db';

try {
  const ideas = await IdeaRepository.findAll(user.id);
  // data is fully typed and validated
} catch (error) {
  if (error instanceof DbError) {
    // structured error with code and details
    console.error(error.message, error.code, error.details);
  }
}
```

**Creating New Ideas:**
```typescript
import { IdeaRepository } from '@/lib/db';
import type { CreateIdeaInput } from '@/lib/schemas';

const newIdea: CreateIdeaInput = {
  title: 'My Idea',
  description: 'A great idea',
  category: 'technology',
  tags: ['innovation', 'tech'],
};

const idea = await IdeaRepository.create(newIdea, user.id);
// Returns fully validated Idea type
```

---

### 4. UI Component Library

**What Changed:**
- New standardized UI components in `/components/ui`
- Consistent styling, accessibility, and dark mode support
- Type-safe component APIs

**Action Required:**

**Old Code:**
```typescript
<div className="bg-white p-4 rounded-lg border">
  <h3 className="text-lg font-semibold">Title</h3>
  <p className="text-sm text-gray-600">Description</p>
</div>
```

**New Code:**
```typescript
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
</Card>
```

**Benefits:**
- Automatic dark mode support
- Consistent spacing and styling
- Built-in accessibility (ARIA labels, keyboard nav)
- Type-safe props with TypeScript

---

## Migration Checklist

### Phase 1: Database (Required)
- [ ] Backup production database
- [ ] Apply consolidated migration to staging
- [ ] Test RLS policies with test users
- [ ] Verify all queries work with RLS enabled
- [ ] Apply to production

### Phase 2: API Keys (Required)
- [ ] Set Supabase secrets for edge functions
- [ ] Deploy edge functions (bing-search, groq-responses-api)
- [ ] Update all API calls to use edge functions
- [ ] Remove client-side API keys from .env files
- [ ] Verify all API functionality works

### Phase 3: Type Safety (Recommended)
- [ ] Replace direct Supabase queries with Repository classes
- [ ] Add Zod validation to form inputs
- [ ] Handle DbError types in error boundaries
- [ ] Test validation error messages in UI

### Phase 4: UI Components (Recommended)
- [ ] Replace custom alerts with Alert component
- [ ] Replace custom buttons with Button component
- [ ] Replace custom forms with Input/Textarea components
- [ ] Update cards to use Card components
- [ ] Test accessibility (keyboard nav, screen readers)

---

## New Features

### 1. Validated Forms

```typescript
import { Input, Button, Alert } from '@/components/ui';
import { CreateIdeaSchema } from '@/lib/schemas';
import { IdeaRepository } from '@/lib/db';

const [errors, setErrors] = useState<Record<string, string>>({});

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();

  const formData = {
    title,
    description,
    category,
    tags,
  };

  // Client-side validation
  const validation = CreateIdeaSchema.safeParse(formData);
  if (!validation.success) {
    setErrors(formatValidationErrors(validation.error));
    return;
  }

  try {
    const idea = await IdeaRepository.create(validation.data, user.id);
    // Success!
  } catch (error) {
    if (error instanceof DbError) {
      // Handle database errors
    }
  }
};

return (
  <form onSubmit={handleSubmit}>
    <Input
      label="Title"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      error={errors.title}
      required
    />

    <Button type="submit" loading={loading}>
      Create Idea
    </Button>
  </form>
);
```

### 2. Type-Safe Queries

```typescript
// All queries return typed, validated data
const ideas: Idea[] = await IdeaRepository.findAll(user.id);
const idea: Idea | null = await IdeaRepository.findById(ideaId, user.id);
const research: SavedResearch[] = await ResearchRepository.findByIdeaId(ideaId, user.id);
```

### 3. Secure API Calls

```typescript
// All external APIs called through edge functions
const searchResults = await fetch(
  `${supabaseUrl}/functions/v1/bing-search`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, count: 10 }),
  }
);
```

---

## Testing

### Test RLS Policies

```sql
-- Test as different users
SELECT set_config('request.jwt.claim.sub', 'user-1-uuid', true);
SELECT * FROM ideas; -- Should only see user-1's ideas

SELECT set_config('request.jwt.claim.sub', 'user-2-uuid', true);
SELECT * FROM ideas; -- Should only see user-2's ideas
```

### Test Edge Functions Locally

```bash
# Start edge functions locally
supabase functions serve

# Test bing-search
curl -X POST http://localhost:54321/functions/v1/bing-search \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "count": 5}'
```

### Test Components

```bash
# Run component tests
pnpm test

# Test accessibility
pnpm run test:a11y
```

---

## Rollback Plan

If you need to rollback:

### Database
```bash
# Restore from backup
pg_restore -d your_database backup_file.sql
```

### Edge Functions
```bash
# Delete deployed functions
supabase functions delete bing-search
supabase functions delete groq-responses-api
```

### Code
```bash
# Revert to previous commit
git revert HEAD
git push
```

---

## Support

For issues or questions:
1. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Review error logs in Supabase dashboard
3. Test with the provided examples above

---

## Summary

These changes make Throughput:
- ✅ **Secure**: RLS policies prevent unauthorized data access
- ✅ **Type-Safe**: Runtime validation prevents invalid data
- ✅ **Maintainable**: Consistent UI components and data layer
- ✅ **Production-Ready**: Proper error handling and logging
- ✅ **Accessible**: WCAG AA compliant UI components

The migration should take 2-4 hours for a complete implementation.
