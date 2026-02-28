# Performance Optimization

## Overview

This guide covers performance optimization techniques for Vercel deployments, including build optimization, caching strategies, and runtime performance.

## Build Optimization

### 1. Next.js Configuration

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,

  // Image Optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Bundle Analyzer
  webpack: (config, { isServer, dev }) => {
    if (!dev && !isServer) {
      Object.assign(config.resolve.alias, {
        'react/jsx-runtime': require.resolve('react/jsx-runtime'),
      });
    }
    return config;
  },
};

module.exports = nextConfig;
```

### 2. TypeScript Optimization

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Caching Strategies

### 1. API Route Caching

```typescript
// app/api/data/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const data = await fetchData();

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
      'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
    },
  });
}
```

### 2. Static Generation

```typescript
// app/blog/[slug]/page.tsx
import { Metadata } from 'next';

interface Post {
  title: string;
  content: string;
  author: string;
}

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const post = await getPost(params.slug);

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
    },
  };
}

export default async function BlogPost({ params }: Props) {
  const post = await getPost(params.slug);

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
      <footer>By {post.author}</footer>
    </article>
  );
}
```

## Runtime Performance

### 1. Component Optimization

```typescript
// components/DataGrid.tsx
import { memo, useMemo, useCallback } from 'react';

interface DataGridProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}

export function DataGrid<T>({
  data,
  columns,
  onRowClick,
}: DataGridProps<T>) {
  // Memoize column definitions
  const columnDefs = useMemo(() => columns, [columns]);

  // Memoize row click handler
  const handleRowClick = useCallback(
    (row: T) => {
      onRowClick?.(row);
    },
    [onRowClick]
  );

  // Memoize sorted data
  const sortedData = useMemo(
    () => [...data].sort((a, b) => /* sorting logic */),
    [data]
  );

  return (
    <div className="data-grid">
      {/* Grid implementation */}
    </div>
  );
}

// Memoize the entire component
export default memo(DataGrid);
```

### 2. Data Fetching

```typescript
// lib/api/fetcher.ts
import { cache } from 'react';

export const fetchWithCache = cache(async (url: string) => {
  const res = await fetch(url, {
    next: {
      revalidate: 3600, // Cache for 1 hour
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }

  return res.json();
});

// Usage in component
export async function ProductList() {
  const products = await fetchWithCache('/api/products');

  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>{product.name}</li>
      ))}
    </ul>
  );
}
```

## Image Optimization

### 1. Next.js Image Component

```typescript
// components/OptimizedImage.tsx
import Image from 'next/image';
import { useState, useCallback } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <div className={`image-container ${isLoading ? 'loading' : ''}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        onLoad={handleLoad}
        loading={priority ? 'eager' : 'lazy'}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
}
```

## Code Splitting

### 1. Dynamic Imports

```typescript
// app/dashboard/page.tsx
import dynamic from 'next/dynamic';

const DashboardChart = dynamic(
  () => import('@/components/DashboardChart'),
  {
    loading: () => <div>Loading chart...</div>,
    ssr: false,
  }
);

const DataGrid = dynamic(() => import('@/components/DataGrid'), {
  loading: () => <div>Loading grid...</div>,
});

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <DashboardChart />
      <DataGrid />
    </div>
  );
}
```

### 2. Route Groups

```typescript
// app/(marketing)/layout.tsx
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-layout">
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  );
}

// app/(dashboard)/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-layout">
      <DashboardNav />
      {children}
    </div>
  );
}
```

## Monitoring Performance

### 1. Web Vitals Tracking

```typescript
// lib/vitals.ts
import { onCLS, onFID, onLCP, onTTFB } from 'web-vitals';

const vitalsUrl = 'https://vitals.vercel-analytics.com/v1/vitals';

function getConnectionSpeed() {
  return 'connection' in navigator &&
    navigator['connection'] &&
    'effectiveType' in navigator['connection']
    ? (navigator['connection'] as any)['effectiveType']
    : '';
}

export function reportWebVitals(metric: any) {
  const body = {
    dsn: process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID,
    id: metric.id,
    page: window.location.pathname,
    href: window.location.href,
    event_name: metric.name,
    value: metric.value.toString(),
    speed: getConnectionSpeed(),
  };

  const blob = new Blob([JSON.stringify(body)], {
    type: 'application/json',
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(vitalsUrl, blob);
  } else {
    fetch(vitalsUrl, {
      body: JSON.stringify(body),
      method: 'POST',
      credentials: 'omit',
      keepalive: true,
    });
  }
}
```

## Best Practices

1. **Build Optimization**
   - Enable tree shaking
   - Optimize dependencies
   - Use proper bundling

2. **Caching**
   - Implement proper cache headers
   - Use static generation where possible
   - Optimize data fetching

3. **Runtime**
   - Optimize component rendering
   - Use proper code splitting
   - Implement lazy loading

4. **Monitoring**
   - Track Web Vitals
   - Monitor build times
   - Analyze bundle sizes

## Common Issues and Solutions

1. **Build Performance**
   - Large bundle sizes
   - Long build times
   - Dependency issues

2. **Runtime Performance**
   - Slow page loads
   - High memory usage
   - Poor mobile performance

3. **Caching Issues**
   - Stale content
   - Cache invalidation
   - CDN configuration

## Next Steps

1. Set up [Monitoring](./monitoring.md)
2. Configure [Security](./security.md)
3. Implement [Edge Functions](./edge-functions.md)
4. Review [CI/CD](./ci-cd.md)
