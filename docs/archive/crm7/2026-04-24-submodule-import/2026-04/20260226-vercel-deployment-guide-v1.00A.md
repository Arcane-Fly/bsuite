# Vercel Deployment Configuration

This document outlines the environment variables required for proper deployment of CRM7 on Vercel.

## ✅ Deployment Status

**VERIFIED**: CRM7 is ready for Vercel deployment with full Supabase authentication integration.

- ✅ Supabase connection tested and working
- ✅ Authentication system verified
- ✅ Database schema accessible
- ✅ Production build successful
- ✅ Environment variables confirmed

## Required Environment Variables

For the application to function properly on Vercel, the following environment variables must be configured in your Vercel project settings:

### Supabase Configuration

```bash
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### Optional Configuration

```bash
VITE_DEBUG_MODE=false
VITE_R8_URL=
```

## How to Configure Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable:


- Name: `VITE_SUPABASE_URL`
- Value: `<your-supabase-url>`
  - Environment: All (Production, Preview, Development)

- Name: `VITE_SUPABASE_ANON_KEY`
- Value: `<your-supabase-anon-key>`
  - Environment: All (Production, Preview, Development)

4. Redeploy your application for the changes to take effect

## Vercel CLI Configuration

Alternatively, you can use the Vercel CLI to set environment variables:

```bash
vercel env add VITE_SUPABASE_URL
# Enter: <your-supabase-url>

vercel env add VITE_SUPABASE_ANON_KEY
# Enter: <your-supabase-anon-key>
```

## Verification Tests Completed

✅ **Basic Supabase Connection**: Auth service accessible
✅ **Database Schema**: Core tables (profiles, awards) verified
✅ **Authentication Functions**: All auth methods available
✅ **Environment Configuration**: All required variables set
✅ **Edge Functions**: Subscription endpoints accessible
✅ **Build Process**: Production build successful
✅ **Application Loading**: Auth state management working

## Vercel Configuration Requirements

**IMPORTANT:** Always include `"version": 2` in your vercel.json file when using V2 syntax.

### ✅ Working Configuration Format

```json
{
  "version": 2,
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
   {
    "source": "/(.*)",
    "destination": "/index.html"
   }
  ],
  "headers": [
   // Security and caching headers...
  ]
  // ✅ NO functions block - Let Vercel auto-detect TypeScript API functions
  // ✅ NO explicit API rewrites - Vercel handles /api routes automatically
}
```

### ⚠️ DEPRECATED Configuration (Causes Runtime Error)

```json
{
  "functions": {
   "api/**/*.ts": {
    "runtime": "nodejs24.x"
   }
  }
}
```

### Configuration Validation

- ✅ **Preferred**: Remove functions block entirely - Vercel auto-detects .ts files and applies Node.js runtime
- ✅ Always include `"version": 2` for V2 syntax support
- ✅ Place TypeScript functions in `/api` directory for automatic detection
- ✅ Always validate configuration with `vercel --dry-run` before deployment
- ✅ Ensure all environment variables are set before deployment

## Troubleshooting

If you're still experiencing authentication issues after setting these variables:

1. Verify the environment variables are correctly set in Vercel
2. Trigger a new deployment to ensure the variables are loaded
3. Check the browser console for any Supabase connection errors
4. Ensure your Supabase project is active and the credentials are valid

### Common Deployment Issues

#### ✅ RESOLVED Function Runtime Error

**Error:** `Function Runtimes must have a valid version, for example 'now-php@1.0.0'`
**Root Cause:** Explicit functions block with `"nodejs24.x"` syntax incompatible with Vercel CLI 48.1.6+
**✅ SOLUTION IMPLEMENTED:** Remove entire functions block from vercel.json - Vercel auto-detects TypeScript functions in /api directory

**Working Resolution Steps:**

1. Remove the entire `"functions": { ... }` block from vercel.json
2. Ensure TypeScript API functions are placed in `/api` directory (e.g., `api/health.ts`)
3. Vercel automatically detects `.ts` files and applies default Node.js runtime

#### Configuration Schema Conflicts

**Error:** Vercel parsing V2 config with V1 rules
**Solution:** Add explicit version declaration to enable proper schema parsing

## Security Note

- Never commit these environment variables to your repository
- The `.env` file in this project is for local development only
- Always use Vercel's environment variable settings for deployment

### Issue Function Runtimes Validation Error - RESOLVED ✅

- **Symptom:** `Error: Function Runtimes must have a valid version, for example 'now-php@1.0.0'`
- **Cause:** Explicit functions block with `nodejs24.x` syntax incompatible with Vercel CLI 48.1.6+
- **Solution:** Remove functions block entirely, leverage Vercel's auto-detection capabilities

### ✅ Final Working Configuration

```json
{
  "version": 2,
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
   {
    "source": "/(.*)",
    "destination": "/index.html"
   }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Implementation Summary

- **Status:** ✅ RESOLVED
- **Approach:** Minimal configuration strategy
- **Result:** Vercel successfully auto-detects .ts files in /api directory
- **Runtime:** Default Node.js runtime applied automatically
- **Compatibility:** Works with Vercel CLI 48.1.6+ and current platform API

### Validation Checklist

- [x] TypeScript functions placed in `/api` directory
- [x] No explicit runtime configuration needed
- [x] Vercel auto-detects .ts files and applies Node.js runtime
- [x] Health check endpoint accessible at `/api/health`
- [x] Build passes successfully with `pnpm build`
- [x] No function runtime version errors in deployment logs

### Best Practices for Future Deployments

1. **Prefer auto-detection** over explicit runtime configuration
2. **Place TypeScript functions** in `/api` directory for automatic discovery
3. **Use minimal vercel.json** configuration to avoid parsing conflicts
4. **Test locally** with `vercel --dry-run` before deployment
5. **Monitor deployment logs** for any runtime-related warnings


# Vercel Deployment Master Cheat Sheet
## Common Pitfalls & Correct Solutions for React/Vite Applications

---

## 🔴 **ISSUE 1: Node.js Version Conflicts**


### **Common Error Pattern:**
```
Error: Found invalid Node.js Version: "20.x". Please set Node.js Version to 18.x
Build completed successfully but deployment fails with version validation error
```


### **Root Cause:**
Mismatch between Vercel project settings, package.json engines field, and supported Node.js versions

### **Correct Solution:**


#### **1. Update package.json with engines field:**
```json
{
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=10.0.0"
  }
}
```


#### **2. Vercel Project Settings:**
```bash
# Navigate to: https://vercel.com/dashboard → [Project] → Settings → Build & Deployment
# Set Node.js Version to: 22.x (current default) or 20.x
# Note: Node.js 24.x deprecated September 1, 2025
```


#### **3. Remove Hardcoded Runtime Versions:**
```json
// vercel.json - ✅ CORRECT
{
  "functions": {
    "api/health.ts": {}  // Let Vercel auto-select runtime
  }
}

// ❌ WRONG
{
  "functions": {
    "api/health.ts": {
      "runtime": "@vercel/node@3.0.7"  // Hardcoded version causes conflicts
    }
  }
}
```

---

## 🔴 **ISSUE 2: SIGILL Browser Crashes (Illegal Instruction)**


### **Common Error Pattern:**
```
Build successful but browser crashes with "Error code: SIGILL"
Illegal instruction errors in browser console
Hardware acceleration conflicts
```


### **Root Cause:**
Aggressive build optimizations generating CPU instructions incompatible with target browsers/hardware

### **Correct Solution:**


#### **1. Vite Build Configuration:**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: ['es2015', 'edge88', 'firefox78', 'chrome87', 'safari13'],
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 1,
        unsafe: false,
        unsafe_comps: false,
        unsafe_Function: false,
        unsafe_math: false
      }
    }
  },
  optimizeDeps: {
    exclude: ['@supabase/supabase-js'],
    esbuildOptions: {
      target: 'es2015'
    }
  }
});
```


#### **2. Security Headers in vercel.json:**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Permissions-Policy",
          "value": "accelerometer=(), autoplay=(), camera=(), webgl=(self)"
        },
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "unsafe-none"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        }
      ]
    }
  ]
}
```


#### **3. CSP Headers in index.html:**
```html
<meta http-equiv="Permissions-Policy" content="
  accelerometer=(),
  autoplay=(),
  webgl=(self)
" />
```

---

## 🔴 **ISSUE 3: Build Cache & Memory Issues**


### **Common Error Pattern:**
```
Error: Command "npm run build" exited with SIGKILL
Build optimization failed: found page without a React Component
Out of memory during build process
```


### **Root Cause:**
Build process exceeding memory limits or corrupted cache

### **Correct Solution:**


#### **1. Memory Optimization in package.json:**
```json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=6144' vite build",
    "dev": "vite",
    "preview": "vite preview"
  }
}
```


#### **2. Vite Bundle Optimization:**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'vendor-data': ['@tanstack/react-query', '@supabase/supabase-js'],
          'vendor-utils': ['clsx', 'tailwind-merge', 'date-fns']
        }
      }
    },
    chunkSizeWarningLimit: 500,
    sourcemap: false  // Disable in production to save memory
  }
});
```


#### **3. Clear Build Cache:**
```bash
# Vercel CLI commands
vercel --force  # Force new build, ignore cache
vercel env pull  # Sync environment variables

# Local cleanup
rm -rf node_modules/.vite
rm -rf dist
pnpm install --frozen-lockfile
```

---

## 🔴 **ISSUE 4: Environment Variable & API Route Issues**


### **Common Error Pattern:**
```
API routes returning 404 in production
Environment variables undefined at runtime
CORS errors with external APIs
```


### **Root Cause:**
Incorrect environment variable configuration or API route setup

### **Correct Solution:**


#### **1. Environment Variable Naming:**
```bash
# ✅ CORRECT - Use VITE_ prefix for client-side variables
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# ❌ WRONG - No prefix means server-only
SUPABASE_URL=https://xxx.supabase.co  # Won't be available to client
```


#### **2. API Route Structure:**
```
Project Structure:
├── api/
│   └── health.ts        ✅ Correct location for Vercel Functions
├── pages/api/           ❌ Wrong - This is for Next.js
└── src/
    └── main.tsx
```


#### **3. Serverless Function Template:**
```typescript
// api/health.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}
```

---

## 🔴 **ISSUE 5: Framework Detection & Build Command Issues**


### **Common Error Pattern:**
```
Warning: No framework detected, using default settings
Build command failed: script not found
Custom build settings not applied
```


### **Root Cause:**
Vercel not detecting framework correctly or incorrect build configuration

### **Correct Solution:**


#### **1. Explicit Framework Declaration in vercel.json:**
```json
{
  "version": 2,
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "pnpm install --frozen-lockfile"
}
```


#### **2. Package.json Scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  }
}
```


#### **3. Root Directory Structure:**
```
✅ CORRECT Structure:
├── src/
├── public/
├── index.html          (at root for Vite)
├── vite.config.ts
├── package.json
└── vercel.json

❌ WRONG:
├── app/
│   └── index.html      (nested HTML causes detection issues)
```

---

## 🔴 **ISSUE 6: CSS/Tailwind Loading Issues**


### **Common Error Pattern:**
```
Styles not applying in production
Tailwind classes not working
Flash of unstyled content (FOUC)
CSS chunks not loading
```


### **Root Cause:**
CSS optimization conflicts or incorrect Tailwind configuration

### **Correct Solution:**


#### **1. Tailwind Config for Production:**
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Ensure CSS is properly generated for production
  safelist: [
    // Add critical classes that might be dynamically generated
  ]
}
```


#### **2. CSS Import Order:**
```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Critical theme styles */
:root {
  color-scheme: light;
}

.dark {
  color-scheme: dark;
}

/* Custom styles after Tailwind */
```


#### **3. Vite CSS Configuration:**
```typescript
// vite.config.ts
export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer]
    }
  },
  build: {
    cssCodeSplit: false  // Bundle all CSS together to prevent loading issues
  }
});
```

---

## 🔴 **ISSUE 7: Dependency Optimization Conflicts**


### **Common Error Pattern:**
```
Pre-bundling dependencies failed
Module not found after successful build
Dynamic import failures
```


### **Root Cause:**
Vite dependency pre-bundling conflicts with certain packages

### **Correct Solution:**


#### **1. Exclude Problematic Dependencies:**
```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: [
      '@supabase/supabase-js',
      // Add other packages that cause pre-bundling issues
    ],
    include: [
      // Force include dependencies that should be pre-bundled
      'react',
      'react-dom'
    ]
  }
});
```


#### **2. Handle Dynamic Imports Safely:**
```typescript
// ✅ CORRECT
const LazyComponent = lazy(() =>
  import('./Component').catch(() => ({
    default: () => <div>Loading failed</div>
  }))
);

// ❌ WRONG
const LazyComponent = lazy(() => import('./Component'));
```

---

## 📋 **Pre-Deployment Validation Checklist**

```bash
# 1. Verify Node.js version compatibility
node --version  # Should match engines field in package.json
grep -A 3 '"engines"' package.json

# 2. Test build locally
pnpm build && pnpm preview
# Verify no SIGILL errors in browser console

# 3. Validate vercel.json syntax
cat vercel.json | jq '.' > /dev/null && echo "✅ Valid JSON"

# 4. Check environment variables
grep -r "VITE_" src/ | grep -v node_modules
# Ensure all client-side env vars have VITE_ prefix

# 5. Verify API routes
ls -la api/ && echo "✅ API routes in correct location"

# 6. Test CSS loading
grep -n "@tailwind" src/index.css
# Ensure proper Tailwind directive order

# 7. Bundle size analysis
pnpm build && du -sh dist/
# Check for oversized chunks

# 8. Framework detection test
vercel build --debug
# Verify Vite framework detection

# 9. Security headers validation
curl -I https://yourapp.vercel.app | grep -E "(Permissions-Policy|Cross-Origin)"
```

---

## 🚀 **Quick Fix Commands**

```bash
# Force rebuild without cache
vercel --force

# Debug build process
vercel build --debug

# Check deployment logs
vercel logs --follow

# Test function locally
vercel dev

# Sync environment variables
vercel env pull .env.local

# Check project configuration
vercel project ls

# Reset to clean state
rm -rf .vercel node_modules dist
pnpm install
vercel link
```

---

## 🔧 **Emergency SIGILL Fix**

```typescript
// Quick vite.config.ts patch for SIGILL issues
export default defineConfig({
  build: {
    target: 'es2015',  // Broadest compatibility
    minify: false      // Disable aggressive optimization
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2015'
    }
  }
});
```

---

## 📝 **Add to Your Coding Assistant Rules**

```markdown
## Vercel Deployment Standards

1. **Always specify Node.js engines** in package.json matching Vercel project settings
2. **Use VITE_ prefix** for all client-side environment variables
3. **Place API routes in /api directory** not /pages/api (that's Next.js)
4. **Configure build target for broad compatibility** to prevent SIGILL errors
5. **Use framework: "vite"** in vercel.json for explicit framework detection
6. **Add security headers** for Permissions-Policy and CORS to prevent browser conflicts
7. **Exclude problematic dependencies** from Vite optimization (@supabase/supabase-js)
8. **Set cssCodeSplit: false** to prevent CSS loading issues
9. **Test locally with vercel dev** before deploying
10. **Monitor build logs** for framework detection and optimization warnings
11. **Use pnpm install --frozen-lockfile** for consistent dependency resolution
12. **Set proper outputDirectory: "dist"** for Vite applications
```

---

## 🚨 **Critical Vercel vs Next.js Differences**

| Feature | Vercel (Vite/React) | Next.js |
|---------|-------------------|---------|
| API Routes | `/api/` | `/pages/api/` |
| Static Files | `/public/` | `/public/` |
| Build Output | `/dist/` | `/.next/` |
| Env Vars | `VITE_*` prefix | `NEXT_PUBLIC_*` prefix |
| Config File | `vercel.json` | `next.config.js` |
| Framework Detection | Manual in vercel.json | Automatic |


This cheat sheet is based on real deployment issues encountered with modern React/Vite applications on Vercel. Keep it handy during deployments to avoid common pitfalls.