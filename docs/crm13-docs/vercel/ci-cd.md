# Continuous Integration and Deployment (CI/CD)

## Overview

This guide covers setting up and managing CI/CD pipelines with Vercel, including automated testing, deployment, and quality assurance.

## Git Integration

### 1. GitHub Integration

```yaml
# .github/workflows/vercel.yml
name: Vercel CI/CD
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.11.1'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: '10.4.0'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Run type check
        run: pnpm type-check

      - name: Run lint
        run: pnpm lint

      - name: Deploy to Vercel
        if: github.event_name == 'push'
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          npx vercel deploy --prod --token=$VERCEL_TOKEN
```

### 2. Branch Protection Rules

Configure GitHub branch protection:

1. Require status checks to pass
2. Require pull request reviews
3. Require up-to-date branches
4. Include administrators

## Automated Testing

### 1. Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
    include: ['**/*.test.{ts,tsx}'],
  },
});
```

### 2. Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

### 3. Component Testing

```typescript
// src/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

## Deployment Configuration

### 1. Vercel Configuration

```json
// vercel.json
{
  "version": 2,
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["syd1"],
  "git": {
    "deploymentEnabled": {
      "main": true,
      "development": false,
      "feature/*": true
    }
  },
  "github": {
    "enabled": true,
    "silent": true
  }
}
```

### 2. Environment Configuration

```typescript
// scripts/validate-env.ts
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']),
});

try {
  envSchema.parse(process.env);
  console.log('✅ Environment variables are valid');
  process.exit(0);
} catch (error) {
  console.error('❌ Invalid environment variables:', error);
  process.exit(1);
}
```

## Quality Assurance

### 1. Code Quality Checks

```typescript
// scripts/quality-checks.ts
import { execSync } from 'child_process';

const commands = [
  'pnpm type-check',
  'pnpm lint',
  'pnpm test',
  'pnpm build',
];

commands.forEach(command => {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed: ${command}`);
    process.exit(1);
  }
});
```

### 2. Pre-commit Hooks

```json
// .lintstagedrc
{
  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write",
    "vitest related --run"
  ],
  "*.{css,scss}": [
    "prettier --write"
  ]
}
```

## Deployment Strategies

### 1. Preview Deployments

```typescript
// lib/config/environment.ts
export const getEnvironmentConfig = () => {
  const environment = process.env.VERCEL_ENV;

  switch (environment) {
    case 'production':
      return {
        apiUrl: 'https://api.production.com',
        features: {
          beta: false,
        },
      };
    case 'preview':
      return {
        apiUrl: 'https://api.staging.com',
        features: {
          beta: true,
        },
      };
    default:
      return {
        apiUrl: 'http://localhost:3000',
        features: {
          beta: true,
        },
      };
  }
};
```

### 2. Rollback Strategy

```typescript
// scripts/rollback.ts
import { execSync } from 'child_process';

const rollback = async (deploymentId: string) => {
  try {
    // Verify deployment exists
    execSync(`vercel inspect ${deploymentId}`);

    // Perform rollback
    execSync(`vercel rollback ${deploymentId}`);

    console.log(`✅ Successfully rolled back to ${deploymentId}`);
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
};
```

## Monitoring Deployments

### 1. Deployment Notifications

```typescript
// lib/notifications.ts
interface DeploymentNotification {
  status: 'success' | 'failure';
  environment: string;
  url: string;
  commitHash: string;
}

export async function sendDeploymentNotification(
  notification: DeploymentNotification
) {
  if (process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify({
        text: `Deployment ${notification.status}: ${notification.url}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Deployment ${notification.status}*\nEnvironment: ${notification.environment}\nURL: ${notification.url}\nCommit: ${notification.commitHash}`,
            },
          },
        ],
      }),
    });
  }
}
```

### 2. Health Checks

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA,
    environment: process.env.VERCEL_ENV,
  };

  return NextResponse.json(health);
}
```

## Best Practices

1. **Version Control**
   - Use semantic versioning
   - Write meaningful commit messages
   - Keep branches up to date

2. **Testing**
   - Write comprehensive tests
   - Maintain high coverage
   - Use snapshot testing wisely

3. **Deployment**
   - Use preview deployments
   - Implement proper rollback
   - Monitor deployment health

4. **Security**
   - Secure environment variables
   - Implement access controls
   - Regular security audits

## Common Issues and Solutions

1. **Build Failures**
   - Check dependency versions
   - Verify environment variables
   - Review build logs

2. **Test Failures**
   - Check test environment
   - Review test coverage
   - Fix flaky tests

3. **Deployment Issues**
   - Verify configuration
   - Check resource limits
   - Monitor deployment logs

## Next Steps

1. Configure [Security](./security.md)
2. Set up [Monitoring](./monitoring.md)
3. Implement [Edge Functions](./edge-functions.md)
4. Review [Performance Optimization](./performance.md)
