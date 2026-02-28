# Edge Functions

## Overview

Edge Functions in Vercel allow you to execute code at the edge, closer to your users, providing faster response times and reduced latency. This guide covers implementation, use cases, and best practices.

## Features

- Global deployment across Vercel's edge network
- Automatic scaling
- Zero cold starts
- Built-in TypeScript support
- Streaming responses
- Middleware capabilities

## Implementation

### 1. Basic Edge Function

```typescript
// app/api/edge/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  return NextResponse.json({
    query,
    timestamp: Date.now(),
    region: process.env.VERCEL_REGION,
  });
}
```

### 2. Edge Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: '/api/:path*',
};

export function middleware(request: NextRequest) {
  // Get country from request
  const country = request.geo?.country || 'US';

  // Clone headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-country', country);

  // Return response with modified headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
```

## Use Cases

### 1. Geolocation-based Routing

```typescript
// app/api/location/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { geo } = request;

  const location = {
    country: geo?.country,
    region: geo?.region,
    city: geo?.city,
  };

  return NextResponse.json({
    location,
    timestamp: new Date().toISOString(),
  });
}
```

### 2. A/B Testing

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get cookie
  const testGroup = request.cookies.get('ab-test-group');

  // Assign group if not exists
  if (!testGroup) {
    const group = Math.random() < 0.5 ? 'a' : 'b';
    const response = NextResponse.next();
    response.cookies.set('ab-test-group', group);
    return response;
  }

  return NextResponse.next();
}
```

### 3. Rate Limiting

```typescript
// app/api/protected/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

// Simple in-memory rate limiting
const rateLimit = new Map<string, { count: number; timestamp: number }>();

export async function GET(request: NextRequest) {
  const ip = request.ip || 'anonymous';
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const max = 60; // max requests per window

  const current = rateLimit.get(ip) || { count: 0, timestamp: now };

  // Reset if window has passed
  if (now - current.timestamp > windowMs) {
    current.count = 0;
    current.timestamp = now;
  }

  // Increment count
  current.count++;
  rateLimit.set(ip, current);

  // Check limit
  if (current.count > max) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  return NextResponse.json({ status: 'ok' });
}
```

## Performance Optimization

### 1. Caching Strategies

```typescript
// app/api/cached/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const data = await fetchData();

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
    },
  });
}
```

### 2. Streaming Responses

```typescript
// app/api/stream/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 10; i++) {
        const chunk = encoder.encode(JSON.stringify({ count: i }) + '\n');
        controller.enqueue(chunk);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
    },
  });
}
```

## Security

### 1. Request Validation

```typescript
// lib/validation.ts
export function validateRequest(request: Request) {
  const token = request.headers.get('authorization')?.split(' ')[1];

  if (!token) {
    throw new Error('Missing authorization token');
  }

  // Validate token
  try {
    // Verify JWT or other token validation
    return true;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// app/api/secure/route.ts
import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/validation';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    validateRequest(request);
    return NextResponse.json({ status: 'authenticated' });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    );
  }
}
```

### 2. CORS Configuration

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
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

## Error Handling

### 1. Global Error Handler

```typescript
// app/api/[...catchAll]/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json(
    { error: 'Not Found' },
    { status: 404 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
```

### 2. Error Monitoring

```typescript
// lib/monitoring.ts
export async function logError(error: Error, request: Request) {
  if (process.env.VERCEL_ENV === 'production') {
    // Log to error tracking service
    console.error('Edge Function Error:', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      region: process.env.VERCEL_REGION,
    });
  }
}
```

## Best Practices

1. **Performance**
   - Use appropriate caching strategies
   - Implement streaming for large responses
   - Keep functions lightweight

2. **Security**
   - Validate all inputs
   - Implement proper authentication
   - Use secure headers

3. **Monitoring**
   - Log errors appropriately
   - Track performance metrics
   - Monitor edge function usage

4. **Development**
   - Use TypeScript for type safety
   - Test locally with edge runtime
   - Follow edge function limitations

## Common Issues and Solutions

1. **Cold Starts**
   - Edge Functions have zero cold starts
   - Use edge runtime for consistent performance

2. **Memory Limits**
   - Keep functions lightweight
   - Use streaming for large data
   - Implement pagination

3. **Timeout Issues**
   - Implement proper error handling
   - Use appropriate timeouts
   - Consider fallback options

## Next Steps

1. Implement [Monitoring](./monitoring.md)
2. Configure [Security](./security.md)
3. Set up [CI/CD](./ci-cd.md)
4. Review [Performance Optimization](./performance.md)
