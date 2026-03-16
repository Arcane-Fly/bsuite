# Vercel Deployment Configuration - Microfrontend Architecture

## Overview

Business Suite Unified uses a microfrontend architecture where the main application acts as a shell/host that routes to multiple independent applications:

- **business-suite-unified**: Shell application (landing page after authentication)
- **crm7**: Enterprise workforce management (https://www.crm7.app)
- **r8**: Analytics and reporting (https://r8-c.vercel.app)
- **throughput**: Performance optimization (https://throughflow.vercel.app)

## Architecture

```
www.crm7.app (Business Suite Shell)
├── / (Landing page & navigation hub)
├── /crm/* → https://www.crm7.app (CRM7 Microfrontend)
├── /r8/* → https://r8-c.vercel.app (R8 Microfrontend)
└── /throughput/* → https://throughflow.vercel.app (Throughput Microfrontend)
```

## Required Environment Variables

For Vercel deployment, set these environment variables in your Vercel dashboard:

### Required - Supabase
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Required - Auth0
- `VITE_AUTH0_DOMAIN` - Auth0 domain (e.g., `dev-rkchrceel6xwqe2g.us.auth0.com`)
- `VITE_AUTH0_CLIENT_ID` - Auth0 client ID (e.g., `NbYdCmm5CFj18zFYciYCi9b2AT7qAhOm`)
- `VITE_AUTH0_AUDIENCE` - Auth0 API identifier/audience

### Optional - Microfrontend URLs
- `VITE_APP_DOMAIN` - Custom domain (defaults to Vercel URL)
- `VITE_CRM7_URL` - CRM7 URL (defaults to `https://www.crm7.app`)
- `VITE_R8_URL` - R8 URL (defaults to `https://r8-c.vercel.app`)
- `VITE_THROUGHPUT_URL` - Throughput URL (defaults to `https://throughflow.vercel.app`)

### Optional - Stripe
- `VITE_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key

## Deployment Steps

### 1. Business Suite (Shell Application)

1. Connect this repository to Vercel
2. Set the domain: `www.crm7.app`
3. Configure environment variables in Vercel dashboard:
   ```
   VITE_AUTH0_DOMAIN=dev-rkchrceel6xwqe2g.us.auth0.com
   VITE_AUTH0_CLIENT_ID=NbYdCmm5CFj18zFYciYCi9b2AT7qAhOm
   VITE_AUTH0_AUDIENCE=your-api-identifier
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   VITE_CRM7_URL=https://www.crm7.app
   VITE_R8_URL=https://r8-c.vercel.app
   VITE_THROUGHPUT_URL=https://throughflow.vercel.app
   ```
4. Deploy - the `vercel.json` configuration will handle routing

### 2. CRM7 Microfrontend

Add/update `vercel.json` in the CRM7 repository:
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "framework": "vite",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "https://www.crm7.app" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE,OPTIONS" },
        { "key": "Access-Control-Allow-Credentials", "value": "true" }
      ]
    }
  ],
  "env": {
    "VITE_AUTH0_DOMAIN": "@auth0_domain",
    "VITE_AUTH0_CLIENT_ID": "@auth0_client_id",
    "VITE_BASE_PATH": "/crm"
  }
}
```

### 3. R8 Microfrontend

Add/update `vercel.json` in the R80.3 repository (same as CRM7, with `VITE_BASE_PATH="/r8"`).

### 4. Throughput Microfrontend

Add/update `vercel.json` in the throughput repository (same as CRM7, with `VITE_BASE_PATH="/throughput"`).

## Auth0 Configuration

Update your Auth0 application at:
https://manage.auth0.com/dashboard/us/dev-rkchrceel6xwqe2g/applications/NbYdCmm5CFj18zFYciYCi9b2AT7qAhOm/login-experience

### Allowed Callback URLs
```
https://www.crm7.app/callback,
https://crm7.vercel.app/callback,
https://r8-c.vercel.app/callback,
https://throughflow.vercel.app/callback
```

### Allowed Logout URLs
```
https://www.crm7.app,
https://crm7.vercel.app,
https://r8-c.vercel.app,
https://throughflow.vercel.app
```

### Allowed Web Origins
```
https://www.crm7.app,
https://crm7.vercel.app,
https://r8-c.vercel.app,
https://throughflow.vercel.app
```

## Configuration Files

### vercel.json
Main configuration for Vercel deployment with microfrontend routing rules. See the root `vercel.json` for the complete configuration.

### microfrontends.json
Metadata file documenting all microfrontend applications, their paths, and upstream URLs.

## Authentication Flow

1. User visits `https://www.crm7.app`
2. Auth0 authentication is performed
3. User lands on the Business Suite dashboard
4. User can navigate to microfrontends via links:
   - `/crm` → CRM7 application
   - `/r8` → R8 analytics
   - `/throughput` → Throughput optimizer
5. Shared authentication token is stored in localStorage for cross-app access

## Troubleshooting

### Build Failures
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Verify Auth0 environment variables are configured
- Check that npm is used as the package manager (not pnpm)

### Loading Screen Hangs
- Verify Supabase credentials are correct
- Check network connectivity to Supabase
- Look for console errors in browser dev tools
- Verify Auth0 configuration matches environment variables

### Microfrontend Routing Issues
- Ensure all microfrontend URLs are accessible
- Check CORS headers are configured in each microfrontend
- Verify Auth0 callback URLs include all domains
- Check browser console for CORS or authentication errors

### Authentication Issues
- Verify Auth0 domain and client ID are correct
- Ensure callback URLs are properly configured in Auth0
- Check that shared token is being stored in localStorage
- Verify token expiration and refresh logic

### Environment Variables
The app will auto-detect Vercel environments and use appropriate fallbacks. If environment variables are not set, the app will attempt to use defaults from the configuration files.