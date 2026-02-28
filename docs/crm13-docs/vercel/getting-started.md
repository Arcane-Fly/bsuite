# Vercel Deployment Guide

## Overview

This guide covers deploying our Next.js application to Vercel, including setup, configuration, and best practices for continuous deployment.

## Prerequisites

- Node.js 20.11.1 or later
- Next.js 15.1.7
- Git repository (GitHub, GitLab, or Bitbucket)
- Vercel account

## Initial Setup

### 1. Project Configuration

Ensure your project has the following files:

```json
// vercel.json
{
  "version": 2,
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["syd1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "production-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "production-key"
  }
}
```

### 2. Environment Variables

Required environment variables:

```bash
# Production environment
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=

# Preview environments (optional)
NEXT_PUBLIC_SUPABASE_URL=preview-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=preview-key
DATABASE_URL=preview-db-url
```

## Deployment Process

### 1. Initial Deployment

1. Connect your Git repository to Vercel:

   ```bash
   vercel link
   ```

2. Deploy your application:

   ```bash
   vercel deploy
   ```

### 2. Continuous Deployment

Vercel automatically deploys your application when you push to your repository:

- Push to `main` → Production deployment
- Create PR → Preview deployment
- Push to PR → Updated preview deployment

## Project Configuration

### 1. Build Settings

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['your-domain.com'],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
```

### 2. Performance Optimization

```typescript
// app/layout.tsx
export const metadata = {
  metadataBase: new URL('https://your-domain.com'),
};

// Enable streaming
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

## Environment Management

### 1. Environment Variables

Configure environment variables in Vercel dashboard:

1. Project Settings → Environment Variables
2. Add variables for:
   - Production
   - Preview
   - Development

### 2. Domain Configuration

1. Add custom domain:

   ```bash
   vercel domains add your-domain.com
   ```

2. Configure DNS:
   - Add CNAME record
   - Verify domain ownership
   - Enable HTTPS

## Monitoring and Analytics

### 1. Web Vitals Monitoring

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 2. Error Monitoring

```typescript
// lib/monitoring.ts
export function captureError(error: Error) {
  if (process.env.VERCEL_ENV === 'production') {
    console.error('Production Error:', error);
    // Send to error tracking service
  }
}
```

## Security Configuration

### 1. Headers Configuration

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 2. Edge Functions

```typescript
// app/api/edge/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
```

## Performance Optimization

### 1. Image Optimization

```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['your-domain.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};
```

### 2. Caching Strategy

```typescript
// app/api/data/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const data = await fetchData();

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
    },
  });
}
```

## Best Practices

1. **Deployment**
   - Use Git integration for automated deployments
   - Configure preview environments
   - Set up deployment protection

2. **Performance**
   - Enable Edge Functions where appropriate
   - Implement proper caching strategies
   - Use Image Optimization

3. **Security**
   - Configure security headers
   - Use environment variables
   - Enable DDoS protection

4. **Monitoring**
   - Set up error tracking
   - Monitor Web Vitals
   - Configure alerts

## Common Issues and Solutions

1. **Build Failures**
   - Check build logs
   - Verify dependencies
   - Check environment variables

2. **Performance Issues**
   - Enable Edge Network
   - Optimize images
   - Implement caching

3. **Domain Issues**
   - Verify DNS configuration
   - Check SSL certificates
   - Configure redirects

## Next Steps

1. Set up [Edge Functions](./edge-functions.md)
2. Configure [Monitoring](./monitoring.md)
3. Implement [CI/CD](./ci-cd.md)
4. Review [Security Best Practices](./security.md)
5. Apply [Build Optimizations](./build-optimizations.md) to eliminate warnings
