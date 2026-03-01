# Microfrontend Setup Guide

## Overview

This document provides step-by-step instructions for setting up the microfrontend architecture across all Business Suite repositories.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│  www.crm7.app (Business Suite Shell - This Repository)     │
│  - Authentication landing page                              │
│  - Navigation hub to all microfrontends                     │
│  - Shared authentication token management                   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
      ┌───────────┐   ┌───────────┐   ┌───────────┐
      │   CRM7    │   │    R8     │   │Throughput │
      │  /crm/*   │   │  /r8/*    │   │/throughput│
      └───────────┘   └───────────┘   └───────────┘
```

## ✅ Completed - Business Suite Unified (This Repository)

The following configuration has been completed in this repository:

### Files Created/Updated:
1. **vercel.json** - Main routing and configuration
2. **microfrontends.json** - Metadata about all microfrontends
3. **.env.example** - Auth0 and microfrontend URL variables
4. **VERCEL_DEPLOYMENT.md** - Comprehensive deployment documentation
5. **docs/microfrontend-configs/** - Example configurations for other repos

### Vercel Environment Variables to Set:

In the Vercel dashboard for this project (www.crm7.app), add:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_AUTH0_DOMAIN=dev-rkchrceel6xwqe2g.us.auth0.com
VITE_AUTH0_CLIENT_ID=NbYdCmm5CFj18zFYciYCi9b2AT7qAhOm
VITE_AUTH0_AUDIENCE=your-api-identifier
VITE_CRM7_URL=https://www.crm7.app
VITE_R8_URL=https://r8-c.vercel.app
VITE_THROUGHPUT_URL=https://throughflow.vercel.app
```

## 📋 TODO - CRM7 Repository

**Repository**: https://github.com/GaryOcean428/crm7.git  
**Current Domain**: https://www.crm7.app  
**Shell Route**: `/crm/*`

### Steps:

1. **Copy vercel.json configuration**:
   ```bash
   # In the crm7 repository root
   cp /path/to/business-suite-unified/docs/microfrontend-configs/crm7-vercel.json ./vercel.json
   ```

2. **Add/Update Environment Variables in Vercel**:
   ```env
   VITE_AUTH0_DOMAIN=dev-rkchrceel6xwqe2g.us.auth0.com
   VITE_AUTH0_CLIENT_ID=NbYdCmm5CFj18zFYciYCi9b2AT7qAhOm
   VITE_AUTH0_AUDIENCE=your-api-identifier
   VITE_BASE_PATH=/crm
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```

3. **Commit and Deploy**:
   ```bash
   git add vercel.json
   git commit -m "feat: Add microfrontend configuration for Vercel"
   git push origin main
   ```

## 📋 TODO - R8 Repository

**Repository**: https://github.com/GaryOcean428/R80.3.git  
**Current Domain**: https://r8-c.vercel.app  
**Shell Route**: `/r8/*`

### Steps:

1. **Copy vercel.json configuration**:
   ```bash
   # In the R80.3 repository root
   cp /path/to/business-suite-unified/docs/microfrontend-configs/r8-vercel.json ./vercel.json
   ```

2. **Add/Update Environment Variables in Vercel**:
   ```env
   VITE_AUTH0_DOMAIN=dev-rkchrceel6xwqe2g.us.auth0.com
   VITE_AUTH0_CLIENT_ID=NbYdCmm5CFj18zFYciYCi9b2AT7qAhOm
   VITE_AUTH0_AUDIENCE=your-api-identifier
   VITE_BASE_PATH=/r8
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```

3. **Commit and Deploy**:
   ```bash
   git add vercel.json
   git commit -m "feat: Add microfrontend configuration for Vercel"
   git push origin main
   ```

## 📋 TODO - Throughput Repository

**Repository**: https://github.com/GaryOcean428/throughput.git  
**Current Domain**: https://throughflow.vercel.app  
**Shell Route**: `/throughput/*`

### Steps:

1. **Copy vercel.json configuration**:
   ```bash
   # In the throughput repository root
   cp /path/to/business-suite-unified/docs/microfrontend-configs/throughput-vercel.json ./vercel.json
   ```

2. **Add/Update Environment Variables in Vercel**:
   ```env
   VITE_AUTH0_DOMAIN=dev-rkchrceel6xwqe2g.us.auth0.com
   VITE_AUTH0_CLIENT_ID=NbYdCmm5CFj18zFYciYCi9b2AT7qAhOm
   VITE_AUTH0_AUDIENCE=your-api-identifier
   VITE_BASE_PATH=/throughput
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```

3. **Commit and Deploy**:
   ```bash
   git add vercel.json
   git commit -m "feat: Add microfrontend configuration for Vercel"
   git push origin main
   ```

## 📋 TODO - Auth0 Configuration

Update your Auth0 application settings at:  
https://manage.auth0.com/dashboard/us/dev-rkchrceel6xwqe2g/applications/NbYdCmm5CFj18zFYciYCi9b2AT7qAhOm/login-experience

### Add These URLs:

**Allowed Callback URLs**:
```
https://www.crm7.app/callback,
https://crm7.vercel.app/callback,
https://r8-c.vercel.app/callback,
https://throughflow.vercel.app/callback
```

**Allowed Logout URLs**:
```
https://www.crm7.app,
https://crm7.vercel.app,
https://r8-c.vercel.app,
https://throughflow.vercel.app
```

**Allowed Web Origins**:
```
https://www.crm7.app,
https://crm7.vercel.app,
https://r8-c.vercel.app,
https://throughflow.vercel.app
```

## Testing the Setup

After all configurations are deployed:

### 1. Test Authentication Flow
1. Visit https://www.crm7.app
2. Sign in with Auth0
3. Verify you land on the Business Suite dashboard
4. Check browser localStorage for `suite_shared_token`

### 2. Test Microfrontend Navigation
1. From the dashboard, navigate to `/crm`
2. Verify the CRM7 application loads
3. Verify authentication is maintained
4. Test navigation back to the dashboard

### 3. Repeat for All Microfrontends
- Test `/r8` route → R8 application
- Test `/throughput` route → Throughput application

### 4. Test Cross-Origin Communication
1. Open browser DevTools Console
2. Navigate to each microfrontend
3. Check for CORS errors (should be none)
4. Verify API requests include authentication headers

## Troubleshooting

### Common Issues

#### CORS Errors
- Verify `Access-Control-Allow-Origin` headers in each microfrontend's `vercel.json`
- Ensure the origin matches exactly: `https://www.crm7.app`

#### Authentication Not Working
- Check Auth0 callback URLs include all domains
- Verify localStorage contains `suite_shared_token`
- Check token expiration timestamp

#### Routes Not Found (404)
- Verify Vercel rewrites are configured correctly
- Check that microfrontend URLs are accessible directly
- Ensure base paths match in environment variables

#### Build Failures
- Verify all environment variables are set in Vercel
- Check that dependencies are installed correctly
- Review build logs in Vercel dashboard

## Support & Resources

- **Main Documentation**: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- **Configuration Examples**: [docs/microfrontend-configs/](./docs/microfrontend-configs/)
- **Metadata**: [microfrontends.json](./microfrontends.json)
- **Vercel Config**: [vercel.json](./vercel.json)

## Next Steps

1. ✅ Deploy business-suite-unified with new configuration
2. ⬜ Add vercel.json to crm7 repository
3. ⬜ Add vercel.json to R80.3 repository  
4. ⬜ Add vercel.json to throughput repository
5. ⬜ Update Auth0 callback URLs
6. ⬜ Test complete authentication flow
7. ⬜ Test navigation between all microfrontends
8. ⬜ Verify CORS and security headers
9. ⬜ Monitor for any errors in production

---

**Note**: This setup uses Vercel's proxy/rewrite feature to route traffic from the shell application to independent microfrontends. Each microfrontend remains independently deployable while being accessible through the unified shell at www.crm7.app.
