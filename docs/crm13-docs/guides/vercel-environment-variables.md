> [IMPORTED FROM CRM13] -- Reference only, not canonical

# Vercel Environment Variables Implementation Guide

This guide provides practical instructions for implementing and using Vercel environment variables in our application. It covers configuration, access patterns, and best practices specific to our project architecture.

## Project-Specific Implementation

Our application uses a custom approach to handle Vercel environment variables, particularly for deployments and local development.

### Current Implementation

The project includes several scripts that handle environment variables:

1. `scripts/map-vercel-env.js`: Maps Vercel-specific environment variables to standard names
2. `scripts/prepare-vercel.js`: Prepares the project for Vercel deployment, including environment setup
3. Environment variable access in application code

## Setting Up Environment Variables

### Step 1: Configure Variables in Vercel Dashboard

First, configure your environment variables in the Vercel dashboard:

1. Navigate to your project in the [Vercel Dashboard](https://vercel.com/dashboard)
2. Go to **Settings** → **Environment Variables**
3. Add variables with the appropriate naming convention:
   - Use `CRM13__` prefix for variables that need to be mapped
   - Use standard names for variables that don't need mapping
4. Select the environments where each variable should be available (Production, Preview, Development)
5. For Preview environments, you can optionally specify branch-specific variables

Example variables to configure:

```env
CRM13__POSTGRES_PRISMA_URL=postgresql://user:password@host:port/database
CRM13__POSTGRES_URL_NON_POOLING=postgresql://user:password@host:port/database
CRM13__VITESUPABASE_URL=https://your-project.supabase.co
CRM13__VITESUPABASE_ANON_KEY=your-anon-key
```

### Step 2: Set Up Local Development Environment

For local development, create a `.env.local` file in your project root:

```bash
# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/database"
DIRECT_URL="postgresql://user:password@localhost:5432/database"

# Supabase configuration
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"

# Other application variables
NODE_ENV="development"
```

Alternatively, use the Vercel CLI to pull environment variables:

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Log in to Vercel
vercel login

# Pull environment variables
vercel env pull
```

## Accessing Environment Variables

### Server-Side Access

In server-side code, access environment variables using `process.env`:

```typescript
// src/api/example.ts
export async function handler(req: Request): Promise<Response> {
  // Access database connection string
  const databaseUrl = process.env.DATABASE_URL;

  // Access other environment variables
  const nodeEnv = process.env.NODE_ENV;

  // Use the variables
  console.log(`Running in ${nodeEnv} mode with database: ${databaseUrl}`);

  // ...rest of the handler
}
```

### Client-Side Access

For client-side code, only variables prefixed with `VITE_` are accessible:

```typescript
// src/components/ExampleComponent.tsx
import { useEffect, useState } from 'react';

export function ExampleComponent() {
  const [config, setConfig] = useState<{ apiUrl: string }>();

  useEffect(() => {
    // Access client-side environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    setConfig({
      apiUrl: supabaseUrl
    });

    // Never log sensitive values in production
    if (import.meta.env.DEV) {
      console.log('Development mode - Supabase URL:', supabaseUrl);
    }
  }, []);

  return (
    <div>
      <h1>Environment Configuration</h1>
      {config && <p>API URL: {config.apiUrl}</p>}
    </div>
  );
}
```

### Dynamic Environment Configuration

Our project also supports loading environment variables dynamically from the `public/api/environment.json` file:

```typescript
// src/lib/environment.ts
interface EnvironmentConfig {
  NODE_ENV: string;
  REDIRECT_TO_LOGIN: boolean;
  DEPLOY_TIME: string;
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

export async function loadEnvironment(): Promise<EnvironmentConfig> {
  try {
    const response = await fetch('/api/environment.json');
    if (!response.ok) {
      throw new Error(`Failed to load environment: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading environment:', error);
    // Return default values
    return {
      NODE_ENV: 'production',
      REDIRECT_TO_LOGIN: true,
      DEPLOY_TIME: new Date().toISOString(),
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: ''
    };
  }
}
```

## Adding New Environment Variables

### Step 1: Add to Vercel Dashboard

Add the new variable to your Vercel project dashboard.

### Step 2: Update Mapping Script (if needed)

If your variable uses a custom prefix that needs to be mapped, update the `scripts/map-vercel-env.js` file:

```javascript
// Add to the mappings array
const mappings = [
  // Existing mappings...
  { from: 'CRM13__NEW_VARIABLE', to: 'NEW_VARIABLE' },
];
```

### Step 3: Update Client-Side Environment (if needed)

If the variable needs to be available on the client side, update the environment.json creation in `scripts/map-vercel-env.js`:

```javascript
const environmentVars = {
  // Existing variables...
  NEW_CLIENT_VARIABLE: process.env.VITE_NEW_CLIENT_VARIABLE || '',
};

// Add mapping if needed
if (process.env.CRM13__VITE_NEW_CLIENT_VARIABLE) {
  environmentVars.VITE_NEW_CLIENT_VARIABLE = process.env.CRM13__VITE_NEW_CLIENT_VARIABLE;
}
```

### Step 4: Update TypeScript Types (if needed)

If you're using TypeScript and need type safety for your environment variables, update any relevant type definitions:

```typescript
// src/types/environment.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    DATABASE_URL: string;
    DIRECT_URL: string;
    // Add your new variable
    NEW_VARIABLE: string;
  }
}

// For client-side variables
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // Add your new client-side variable
  readonly VITE_NEW_CLIENT_VARIABLE: string;
}
```

## Testing Environment Variables

### Local Testing

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Verify that your environment variables are correctly loaded:
   - Check server-side logs for variables used in server code
   - Use browser developer tools to check client-side variables

### Vercel Preview Testing

1. Push your changes to a non-production branch
2. Vercel will automatically create a preview deployment
3. Verify that your environment variables are correctly applied in the preview environment

## Troubleshooting

### Common Issues

1. **Variables not available during build**:
   - Check that variables are configured for the correct environment in Vercel
   - Verify that the mapping script is correctly processing the variables

2. **Client-side variables not accessible**:
   - Ensure client-side variables are prefixed with `VITE_`
   - Check that the variables are included in the `environment.json` file

3. **Mapping script errors**:
   - Check the deployment logs for any errors in the `map-vercel-env.js` script
   - Verify that the variable names and prefixes are correct

### Debugging Tips

1. Add temporary logging to the mapping script:

   ```javascript
   console.log('Environment variables:', Object.keys(process.env));
   ```

2. Check the generated `.env` file during deployment:

   ```javascript
   console.log('Generated .env file:', envContent);
   ```

3. Verify the contents of the `environment.json` file:

   ```bash
   cat public/api/environment.json
   ```

## Security Best Practices

1. **Never commit sensitive values**: Keep all `.env` files out of version control
2. **Use different values per environment**: Production secrets should differ from development ones
3. **Limit access**: Only team members who need access to secrets should have permission to view them
4. **Rotate secrets regularly**: Update sensitive values periodically
5. **Validate environment variables**: Check that required variables exist before using them

## Related Documentation

- [Vercel Environment Variables](../vercel/environment-variables.md)
- [Vercel Deployment](../vercel/getting-started.md)
- [Security Best Practices](../vercel/security.md)
