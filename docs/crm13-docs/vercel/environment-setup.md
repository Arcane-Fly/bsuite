> [IMPORTED FROM CRM13] -- Reference only, not canonical

# Vercel Environment Variable Setup

This document explains the proper way to set up environment variables for the CRM13 application, ensuring no credentials are hardcoded in the codebase.

## Important Security Considerations

1. **NEVER hardcode credentials in source code**
   - Credentials should never be committed to the Git repository
   - Always use environment variables for sensitive data
   - This applies even to "public" credentials like Supabase anon keys

2. **Use the provided setup script**
   - We've created a script to properly set up all required environment variables

## Required Environment Variables

The following environment variables are required for the application to function properly:

| Variable | Description | Public? |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as VITE_SUPABASE_URL (for Next.js compatibility) | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as VITE_SUPABASE_ANON_KEY (for Next.js compatibility) | Yes |
| `POSTGRES_URL` | PostgreSQL connection string | No |
| `POSTGRES_PRISMA_URL` | PostgreSQL connection string for Prisma | No |
| `POSTGRES_URL_NON_POOLING` | PostgreSQL connection string without connection pooling | No |
| `POSTGRES_USER` | PostgreSQL username | No |
| `POSTGRES_PASSWORD` | PostgreSQL password | No |
| `POSTGRES_HOST` | PostgreSQL host | No |

> Note: Even though the Supabase anon key is intended for public use (it's used in the frontend), it should still be managed as an environment variable rather than hardcoded in the repository.

## Setting Up Environment Variables

### Using the Setup Script

We've created a script to help you set up all the required environment variables in Vercel:

```bash
./scripts/setup-vercel-env.sh
```

This script will:
1. Guide you through entering all required credentials
2. Set up the environment variables in Vercel for all environments (production, preview, development)
3. Optionally pull the environment variables to a local `.env.local` file
4. Optionally trigger a new deployment to apply the changes

### Manual Setup

If you prefer to set up the environment variables manually:

1. Log in to the [Vercel Dashboard](https://vercel.com)
2. Select the CRM13 project
3. Go to Settings > Environment Variables
4. Add each of the required environment variables
5. Make sure to add the variables to all environments (Production, Preview, Development)

## Local Development

For local development, you'll need to create a `.env.local` file in the project root with the required environment variables.

You can pull the environment variables from Vercel using:

```bash
vercel env pull .env.local
```

> IMPORTANT: `.env.local` is included in `.gitignore` and should never be committed to the repository.

## Runtime Environment Handling

CRM13 uses a specialized approach to handling environment variables at runtime:

1. **Environment API**: The application loads environment variables from `/api/environment.json`
2. **Fallback Mechanism**: If API fails, it uses values from `inject-env.js`
3. **Build-time Injection**: During Vercel deployment, our scripts populate these files with the correct values

### How It Works

1. The `map-vercel-env.js` script reads environment variables from Vercel
2. It generates `/public/api/environment.json` with the correct values
3. The client-side code in `inject-env.js` loads these values at runtime

> IMPORTANT: The repository contains placeholder values for these files. The actual credentials are inserted during the build process and are never committed to Git.

## Troubleshooting

If you encounter environment-related issues:

1. **Check the browser console** for any error messages related to missing environment variables
2. **Verify your environment variables** are correctly set in the Vercel dashboard
3. **Ensure your local `.env.local` file** has all required variables for local development
4. **Restart your development server** after making changes to environment variables
5. **Visit `/debug.html`** on your deployed site to check Supabase connection status

If authentication errors occur in production:
1. Check if your Supabase URL and anon key are correctly set in Vercel
2. Verify that these values match what's shown in your Supabase dashboard
3. Ensure that the application is correctly loading the environment variables (check browser network tab)
4. Verify that `/api/environment.json` contains the expected values (without revealing them in screenshots)

## Security Considerations

Always treat credentials as sensitive information, even "public" credentials like the Supabase anon key:

1. Never hardcode credentials in source code
2. Don't share screenshots or logs containing credentials
3. Rotate credentials if they've been accidentally exposed
4. Use environment variables for all sensitive data