> [IMPORTED FROM CRM13] -- Reference only, not canonical

# Vercel Environment Variables

## Overview

Environment variables are key-value pairs configured outside your source code that allow your application to behave differently based on the environment it's running in. Vercel provides a robust system for managing environment variables across different deployment environments.

This guide covers how environment variables work in Vercel, how they're configured in our project, and best practices for using them effectively.

## Key Concepts

### Environment Types

Vercel supports different environment types, each serving a specific purpose:

| Environment | Description | Use Case |
|-------------|-------------|----------|
| **Production** | Applied to production deployments | Live application used by end users |
| **Preview** | Applied to preview deployments | Testing changes before merging to production |
| **Development** | Used for local development | Local testing and development |
| **Custom** | User-defined environments | Staging, QA, or other specialized environments |

### Variable Scope

Environment variables can be scoped at different levels:

- **Project-level**: Available only to a specific project
- **Team-level**: Available to all projects within a team

## Configuration

### Dashboard Configuration

To configure environment variables in the Vercel dashboard:

1. Navigate to your project in the [Vercel Dashboard](https://vercel.com/dashboard)
2. Go to **Settings** → **Environment Variables**
3. Add your variables, specifying which environments they apply to
4. Click **Save** to apply the changes

![Vercel Environment Variables UI](https://assets.vercel.com/image/upload/v1732720090/docs-assets/static/docs/concepts/projects/environment-variables/env-var-section-light.png)

### Branch-Specific Variables

For Preview environments, you can configure variables to apply to:

- All non-production branches
- Specific branches only

Branch-specific variables override general preview variables with the same name, allowing for targeted configuration without duplicating all variables.

## Local Development

For local development, environment variables are stored in a `.env.local` file in your project's root directory. This file should not be committed to version control.

You can use the Vercel CLI to pull environment variables from your Vercel project:

```bash
vercel env pull
```

This creates a `.env` file with the Development environment variables from your Vercel project.

If you're using `vercel dev` for local development, it automatically downloads the Development environment variables into memory.

## Project Implementation

Our project uses a custom approach to handle Vercel environment variables, particularly for Vercel deployments.

### Environment Variable Mapping

The `scripts/map-vercel-env.js` script maps Vercel environment variables to the format expected by our application:

```javascript
// Map Vercel environment variables to Prisma format
const mappings = [
  { from: 'CRM13__POSTGRES_PRISMA_URL', to: 'DATABASE_URL' },
  { from: 'CRM13__POSTGRES_URL_NON_POOLING', to: 'DIRECT_URL' },
  { from: 'CRM13__VITESUPABASE_URL', to: 'VITE_SUPABASE_URL' },
  { from: 'CRM13__VITESUPABASE_ANON_KEY', to: 'VITE_SUPABASE_ANON_KEY' },
];
```

This script is executed during the build process by `scripts/prepare-vercel.js` to ensure all environment variables are correctly set up before deployment.

### Client-Side Environment Variables

For client-side usage, the script also creates an `environment.json` file in the `public/api` directory:

```javascript
const environmentVars = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  REDIRECT_TO_LOGIN: true,
  DEPLOY_TIME: new Date().toISOString(),
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || ''
};
```

This file is then loaded by the application to access environment variables on the client side.

## Size Limitations

Vercel imposes size limits on environment variables:

- **Standard Limit**: 64 KB total for all environment variables combined per deployment
- **Edge Functions/Middleware**: Limited to 5 KB per environment variable

These limits apply to the following runtimes:

- Node.js
- Python
- Ruby
- Go
- PHP (Community Runtime)

## Security Considerations

### Best Practices

1. **Never commit sensitive values**: Keep all sensitive environment variables out of your codebase
2. **Use different values per environment**: Production secrets should differ from development ones
3. **Limit access**: Only team members who need access to secrets should have permission to view them
4. **Rotate secrets regularly**: Update sensitive values periodically
5. **Use namespacing**: Prefix variables to avoid conflicts (e.g., `AUTH_`, `DB_`, etc.)

### Client-Side Exposure

Be careful about which environment variables are exposed to the client side. Variables that start with `VITE_` in our project are automatically included in client-side bundles and are therefore visible to users.

Never expose sensitive information like API keys with full access permissions in client-side code.

## Integration Variables

Some integrations automatically add environment variables to your project. These variables are managed by the integration and may be updated when the integration configuration changes.

## Troubleshooting

### Common Issues

1. **Variables not available during build**: Ensure variables are configured for the correct environment
2. **Variables not updating**: Remember that changes only apply to new deployments
3. **Exceeding size limits**: Check the total size of all variables if you encounter errors
4. **Local development issues**: Verify that `.env.local` or `.env` file exists and contains the correct variables

### Debugging Tips

1. Use `console.log(process.env)` in server-side code to check available variables
2. For client-side, check that variables are properly prefixed with `VITE_`
3. Verify that the `map-vercel-env.js` script is running correctly during deployment
4. Check deployment logs for any environment-related errors

## Related Documentation

- [Vercel Deployment](./getting-started.md)
- [CI/CD](./ci-cd.md)
- [Security](./security.md)
