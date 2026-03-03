> [IMPORTED FROM CRM13] -- Reference only, not canonical

# Vercel Monitoring and Analytics

## Overview

This guide covers Vercel's monitoring and analytics capabilities, including Web Vitals tracking, error monitoring, and performance analytics.

## Web Analytics

### 1. Setup

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

### 2. Custom Events

```typescript
// lib/analytics.ts
import { track } from '@vercel/analytics';

export function trackEvent(name: string, properties?: Record<string, any>) {
  track(name, properties);
}

// Usage
trackEvent('button_click', {
  buttonId: 'submit',
  page: 'checkout',
});
```

## Performance Monitoring

### 1. Web Vitals Tracking

```typescript
// lib/vitals.ts
import { onCLS, onFID, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  const body = {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    page: window.location.pathname,
  };

  if (process.env.NODE_ENV === 'production') {
    fetch('/api/vitals', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

export function reportWebVitals() {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
```

### 2. API Route for Vitals

```typescript
// app/api/vitals/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Log to Vercel Analytics
  console.log('Web Vitals:', {
    ...body,
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV,
    deploymentId: process.env.VERCEL_GIT_COMMIT_SHA,
  });

  return NextResponse.json({ received: true });
}
```

## Error Tracking

### 1. Global Error Handler

```typescript
// lib/error-tracking.ts
interface ErrorWithContext extends Error {
  context?: Record<string, any>;
}

export function captureError(error: ErrorWithContext) {
  if (process.env.VERCEL_ENV === 'production') {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context: error.context || {},
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL_ENV,
      deploymentId: process.env.VERCEL_GIT_COMMIT_SHA,
    };

    // Log to Vercel
    console.error('Application Error:', errorData);
  }
}
```

### 2. Error Boundary Component

```typescript
// components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { captureError } from '@/lib/error-tracking';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureError({
      ...error,
      context: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>;
    }

    return this.props.children;
  }
}
```

## Logging

### 1. Structured Logging

```typescript
// lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

export function log(
  level: LogLevel,
  message: string,
  context?: Record<string, any>
) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context: {
      ...context,
      environment: process.env.VERCEL_ENV,
      deploymentId: process.env.VERCEL_GIT_COMMIT_SHA,
    },
  };

  if (process.env.VERCEL_ENV === 'production') {
    console[level](JSON.stringify(entry));
  }
}
```

### 2. Request Logging Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { log } from '@/lib/logger';

export function middleware(request: NextRequest) {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  // Add request ID to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // Log request
  log('info', 'Incoming request', {
    requestId,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
  });

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Log response
  response.headers.set('x-request-id', requestId);

  const duration = Date.now() - start;
  log('info', 'Request completed', {
    requestId,
    duration,
    status: response.status,
  });

  return response;
}
```

## Dashboard Integration

### 1. Custom Metrics

```typescript
// lib/metrics.ts
export async function recordMetric(
  name: string,
  value: number,
  tags?: Record<string, string>
) {
  if (process.env.VERCEL_ENV === 'production') {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      tags: {
        ...tags,
        environment: process.env.VERCEL_ENV,
        deploymentId: process.env.VERCEL_GIT_COMMIT_SHA,
      },
    };

    await fetch('/api/metrics', {
      method: 'POST',
      body: JSON.stringify(metric),
    });
  }
}
```

### 2. Metrics API Route

```typescript
// app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const metric = await request.json();

  // Log metric to Vercel
  console.log('Custom Metric:', metric);

  return NextResponse.json({ received: true });
}
```

## Best Practices

1. **Performance Monitoring**
   - Track Core Web Vitals
   - Monitor API response times
   - Set up alerts for degradation

2. **Error Tracking**
   - Use Error Boundaries
   - Implement structured error logging
   - Set up error alerts

3. **Logging**
   - Use structured logging
   - Include relevant context
   - Implement log retention

4. **Analytics**
   - Track meaningful events
   - Monitor user behavior
   - Analyze performance metrics

## Common Issues and Solutions

1. **Missing Data**
   - Verify analytics setup
   - Check environment variables
   - Validate tracking implementation

2. **Performance Issues**
   - Monitor Web Vitals
   - Check API response times
   - Analyze server logs

3. **Error Tracking**
   - Implement proper error boundaries
   - Set up error notifications
   - Monitor error rates

## Next Steps

1. Set up [CI/CD](./ci-cd.md)
2. Configure [Security](./security.md)
3. Implement [Edge Functions](./edge-functions.md)
4. Review [Performance Optimization](./performance.md)
