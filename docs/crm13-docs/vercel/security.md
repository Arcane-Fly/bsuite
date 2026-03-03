> [IMPORTED FROM CRM13] -- Reference only, not canonical

# Security Best Practices

## Overview

This guide covers security best practices for Vercel deployments, including headers configuration, authentication, and data protection.

## Security Headers

### 1. Basic Configuration

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
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
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

### 2. Content Security Policy

```typescript
// next.config.js
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel-analytics.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: *.vercel-storage.com;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  block-all-mixed-content;
  upgrade-insecure-requests;
`;

const securityHeaders = [
  // ... other headers
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
  },
];
```

## Authentication

### 1. JWT Configuration

```typescript
// lib/auth/jwt.ts
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET!
);

export async function sign(payload: any): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60; // 1 hour

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime(exp)
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .sign(secret);
}

export async function verify(token: string) {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
  });
  return payload;
}
```

### 2. Authentication Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verify } from '@/lib/auth/jwt';

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  // Public paths
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname === '/'
  ) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    await verify(token);
    return NextResponse.next();
  } catch (error) {
    request.cookies.delete('auth-token');
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

## Data Protection

### 1. Environment Variables

```typescript
// lib/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Authentication
  JWT_SECRET: z.string().min(32),

  // Database
  DATABASE_URL: z.string().url(),

  // API Keys
  SUPABASE_KEY: z.string().min(1),

  // Environment
  VERCEL_ENV: z.enum(['development', 'preview', 'production']),

  // Security
  ALLOWED_ORIGINS: z.string().transform(str => str.split(',')),
});

export const env = envSchema.parse(process.env);
```

### 2. Data Encryption

```typescript
// lib/security/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const algorithm = 'aes-256-gcm';
const keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export function encrypt(text: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, keyBuffer, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

export function decrypt(
  encrypted: string,
  iv: string,
  authTag: string
): string {
  const decipher = createDecipheriv(
    algorithm,
    keyBuffer,
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

## API Security

### 1. Rate Limiting

```typescript
// lib/security/rate-limit.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const WINDOW_SIZE = 60; // 1 minute
const MAX_REQUESTS = 60;

export async function rateLimit(
  request: NextRequest,
  identifier = request.ip
) {
  const key = `rate-limit:${identifier}`;
  const now = Date.now();
  const windowStart = now - (WINDOW_SIZE * 1000);

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, { score: now, member: now });
  pipeline.zcard(key);
  pipeline.expire(key, WINDOW_SIZE);

  const [,, count] = await pipeline.exec();

  if (count > MAX_REQUESTS) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  return null;
}
```

### 2. Input Validation

```typescript
// lib/validation/schemas.ts
import { z } from 'zod';

export const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
  name: z.string().min(2).max(50),
});

export const apiKeySchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.enum(['read', 'write', 'admin'])),
  expiresAt: z.date().optional(),
});

// Middleware for validation
export async function validateBody(
  request: Request,
  schema: z.ZodSchema
) {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors };
    }
    return { error: 'Invalid request body' };
  }
}
```

## CORS Configuration

### 1. Basic Setup

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { env } from '@/lib/config/env';

export function middleware(request: NextRequest) {
  // Check if request is from allowed origin
  const origin = request.headers.get('origin');

  if (
    origin &&
    !env.ALLOWED_ORIGINS.includes(origin) &&
    process.env.VERCEL_ENV === 'production'
  ) {
    return new NextResponse(null, {
      status: 403,
      statusText: 'Forbidden',
    });
  }

  const response = NextResponse.next();

  // Add CORS headers
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );

  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  return response;
}
```

## Best Practices

1. **Authentication**
   - Use secure session management
   - Implement proper password hashing
   - Enable MFA where possible

2. **Data Protection**
   - Encrypt sensitive data
   - Use proper key management
   - Implement backup strategies

3. **API Security**
   - Validate all inputs
   - Implement rate limiting
   - Use proper error handling

4. **Infrastructure**
   - Keep dependencies updated
   - Regular security audits
   - Monitor for vulnerabilities

## Common Issues and Solutions

1. **CORS Issues**
   - Verify allowed origins
   - Check header configuration
   - Test preflight requests

2. **Authentication Problems**
   - Check token expiration
   - Verify cookie settings
   - Monitor auth failures

3. **Rate Limiting**
   - Adjust limits as needed
   - Monitor abuse patterns
   - Implement proper fallbacks

## Next Steps

1. Set up [Monitoring](./monitoring.md)
2. Configure [CI/CD](./ci-cd.md)
3. Implement [Edge Functions](./edge-functions.md)
4. Review [Performance Optimization](./performance.md)
