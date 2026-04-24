# CRM7 Deployment Verification Checklist

> Historical snapshot retained for provenance. Current operational truth must be validated against `crm7/package.json`, `crm7/vercel.json`, `.env.example`, and `../../../../docs/00-master-roadmap.md`. Commands below have been normalized to `pnpm`, but the overall completion status in this document is not authoritative.

## Pre-Deployment Checklist

### ✅ Build and Dependencies
- [ ] Build succeeds locally: `pnpm build`
- [ ] No TypeScript/JavaScript errors
- [ ] All dependencies installed via `pnpm install`
- [ ] Linting passes: `pnpm lint`

### ✅ Environment Variables
- [ ] Required variables documented in `.env.example`
- [ ] Vercel environment variables set:
  - `VITE_SUPABASE_URL=https://your-project.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=your-anon-key`
  - `VITE_DEBUG_MODE=false` (optional)
  - `VITE_R8_URL=` (optional)

### ✅ Configuration Files
- [ ] No conflicting deployment files (Dockerfile, railway.toml, railpack.json)
- [ ] `vercel.json` configured properly
- [ ] `vite.config.ts` uses environment variables for ports/hosts

### ✅ Health Endpoints
- [ ] Health check endpoint `/api/health.json` exists (static)
- [ ] Health check endpoint `/api/health` exists (Vercel function)
- [ ] Both endpoints return HTTP 200 status
- [ ] Endpoints include service status information

### ✅ CORS Configuration
- [ ] API endpoints include proper CORS headers
- [ ] Frontend domain allowed in CORS settings
- [ ] Supabase CORS configured for production domain

### ✅ Error Handling
- [ ] Error boundaries implemented (`ErrorBoundary`, `AuthErrorBoundary`)
- [ ] Runtime error detection active (`runtime-error-detector.ts`)
- [ ] Deployment health checker configured
- [ ] Uncaught exception handlers in place

### ✅ Static Assets
- [ ] Build artifacts generated correctly (`dist/` folder)
- [ ] Static assets served from correct paths
- [ ] Public directory assets copied to build output
- [ ] No 404s for CSS/JS files, images

### ✅ Performance & Optimization
- [ ] Bundle size optimized (chunking configured)
- [ ] Cache headers set for static assets
- [ ] Security headers configured (CSP, X-Frame-Options, etc.)
- [ ] Gzip compression enabled

### ✅ Testing
- [ ] Local preview works: `pnpm preview`
- [ ] Health endpoints accessible locally
- [ ] Application loads without console errors
- [ ] Authentication flow testable
- [ ] Key routes accessible

## Deployment Commands

### 1. Run Comprehensive Verification
```bash
# Run all checks
pnpm verify-deployment

# Individual checks
pnpm build
pnpm lint
pnpm preview
```

### 2. Test Health Endpoints
```bash
# Start preview server
pnpm preview

# Test health endpoints (in another terminal)
curl http://localhost:4173/api/health.json
curl http://localhost:4173/api/health  # (Vercel function - won't work locally)
```

### 3. Verify Environment Variables
```bash
# Check current environment variables
node -e "console.log(process.env)" | grep VITE

# Validate Supabase configuration
node -e "
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
console.log('Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Supabase Key:', supabaseKey ? '✅ Set' : '❌ Missing');
"
```

## Deployment Steps for Vercel

### 1. Environment Variables Setup
In Vercel Dashboard → Settings → Environment Variables, add:
- `VITE_SUPABASE_URL` (Production, Preview, Development)
- `VITE_SUPABASE_ANON_KEY` (Production, Preview, Development)
- `VITE_DEBUG_MODE=false` (Production, Preview, Development)

### 2. Deploy Configuration
Vercel should auto-detect:
- Build Command: `pnpm build`
- Output Directory: `dist`
- Framework: Vite

### 3. Post-Deployment Validation
After deployment, verify:
- [ ] Application loads: `https://your-app.vercel.app/`
- [ ] Health endpoint: `https://your-app.vercel.app/api/health`
- [ ] Authentication works
- [ ] No console errors
- [ ] Database connectivity confirmed

## Troubleshooting

### Common Issues

#### 1. Blank Page on Deployment
- Check browser console for JavaScript errors
- Verify all environment variables are set
- Check Vercel deployment logs
- Ensure static assets are loading correctly

#### 2. Health Endpoint Not Working
- Verify `/api/health.ts` is deployed
- Check `vercel.json` routing configuration
- Test with both `/api/health` and `/api/health.json`

#### 3. Environment Variable Issues
- Verify variables are set in all environments (Production, Preview, Development)
- Check variable names match exactly (case-sensitive)
- Redeploy after setting new variables

#### 4. Build Failures
- Check TypeScript errors: `pnpm build`
- Verify all imports resolve correctly
- Check for circular dependencies

### Monitoring Commands

```bash
# Check application health
curl -f https://your-app.vercel.app/api/health

# Monitor deployment logs
vercel logs your-app.vercel.app

# Test specific functionality
curl -H "Accept: application/json" https://your-app.vercel.app/api/health
```

## Security Checklist
- [ ] No secrets committed to repository
- [ ] Environment variables properly secured
- [ ] CSP headers configured
- [ ] CORS properly restricted
- [ ] HTTPS enforced
- [ ] Security headers present

## Performance Checklist
- [ ] Bundle size under reasonable limits (< 1MB)
- [ ] Critical resources preloaded
- [ ] Static assets cached
- [ ] Gzip compression enabled
- [ ] Performance monitoring active

---

**Status**: Historical checklist retained for reference only. Validate current deployment readiness from active repo configuration and fresh verification output.

Run `pnpm verify-deployment` for comprehensive pre-deployment validation.
