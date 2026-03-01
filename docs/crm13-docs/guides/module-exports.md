> [IMPORTED FROM CRM13] -- Reference only, not canonical

# Understanding Module Export Errors in TypeScript/React

## Default Exports: A Quick Overview

A default export is a special type of module export that allows a module to designate one value as its primary export. Each module can have only one default export, which is imported without curly braces.

```typescript
// Default export
export default function MyComponent() { ... }

// Importing a default export
import MyComponent from './MyComponent';
```

## Common Causes of Export Errors

### 1. Mismatched Export/Import Syntax

#### Incorrect Usage:

```typescript
// Component.tsx
export function Component() {
  return <div>Hello</div>;
}

// App.tsx - This will fail
import Component from './Component'; // ❌ Error: No default export
```

#### Correct Usage:

```typescript
// Component.tsx - Option 1: Use default export
export default function Component() {
  return <div>Hello</div>;
}

// Component.tsx - Option 2: Use named export
export function Component() {
  return <div>Hello</div>;
}

// App.tsx - Matching imports
import Component from './Component';     // For default export
import { Component } from './Component'; // For named export
```

### 2. Missing Exports

#### Common Mistake:

```typescript
// Layout.tsx
function Layout() {
  return <div>Layout</div>;
}
// ❌ No export statement
```

#### Fixed Version:

```typescript
// Layout.tsx
export default function Layout() {
  return <div>Layout</div>;
}
```

### 3. TypeScript Configuration Issues

The error can occur due to incorrect TypeScript configuration:

```json
{
  "compilerOptions": {
    "esModuleInterop": true, // Enable clean imports
    "allowSyntheticDefaultImports": true,
    "moduleResolution": "bundler", // Use modern module resolution
    "module": "ESNext" // Use ES modules
  }
}
```

## Troubleshooting Steps

1. **Verify Export Type**

   ```typescript
   // Check if module has default export
   import * as module from './module';
   console.log(module.default); // undefined means no default export
   ```

2. **IDE Inspection**

   - Use "Go to Definition" (F12 in VSCode)
   - Check import quick fixes (Ctrl+. in VSCode)
   - Verify module resolution paths

3. **Build Tool Verification**

   ```bash
   # For TypeScript
   tsc --noEmit # Check compilation

   # For Vite
   vite build --debug # Check build issues
   ```

## Best Practices

### 1. Component Export Patterns

```typescript
// Single Component - Use default export
// UserProfile.tsx
export default function UserProfile() {
  return <div>Profile</div>;
}

// Multiple Components - Use named exports
// components/index.ts
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';
```

### 2. Module Organization

```typescript
// features/auth/index.ts
export { default as LoginForm } from './LoginForm';
export { default as RegisterForm } from './RegisterForm';
export * from './types';
export * from './hooks';
```

### 3. Consistent Export Patterns

```typescript
// Prefer named exports for utilities
export function formatDate(date: Date): string { ... }
export function parseDate(str: string): Date { ... }

// Use default exports for main components
export default function Calendar() { ... }
```

## ESLint Configuration

Add these rules to prevent export-related issues:

```json
{
  "rules": {
    "import/no-default-export": "warn", // Discourage default exports
    "import/prefer-default-export": "off", // Don't force default exports
    "import/no-unresolved": "error", // Ensure imports exist
    "import/named": "error" // Verify named imports
  }
}
```

## Common Patterns in React Applications

### 1. Page Components

```typescript
// pages/Dashboard.tsx
export default function Dashboard() {
  return <div>Dashboard</div>;
}

// routes/index.tsx
import { lazy } from 'react';
const Dashboard = lazy(() => import('../pages/Dashboard'));
```

### 2. Layout Components

```typescript
// layouts/MainLayout.tsx
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <nav>...</nav>
      <main>{children}</main>
    </div>
  );
}
```

### 3. Feature Modules

```typescript
// features/users/index.ts
export * from './types';
export * from './api';
export { default as UserList } from './UserList';
export { default as UserDetail } from './UserDetail';
```

## Module Resolution Tips

### 1. Path Aliases

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@components/*": ["components/*"],
      "@features/*": ["features/*"]
    }
  }
}

// Usage
import { Button } from '@components/common';
```

### 2. Barrel Exports

```typescript
// components/index.ts
export { default as Button } from './Button';
export { default as Card } from './Card';
export * from './types';

// Usage
import { Button, Card } from '@components';
```

## Common Gotchas

1. **Re-exporting Default Exports**

   ```typescript
   // ❌ Wrong
   export { default } from './Component';

   // ✅ Correct
   export { default as Component } from './Component';
   ```

2. **Mixed Export Types**

   ```typescript
   // Avoid mixing default and named exports
   export const helper = () => { ... };
   export default function Main() { ... }

   // Prefer consistent named exports
   export const helper = () => { ... };
   export const Main = () => { ... };
   ```

3. **Dynamic Imports**

   ```typescript
   // ❌ Wrong
   const Component = await import('./Component');

   // ✅ Correct
   const { default: Component } = await import('./Component');
   ```

## Tools for Prevention

1. **TypeScript Compiler Options**

   ```json
   {
     "compilerOptions": {
       "isolatedModules": true,
       "esModuleInterop": true,
       "moduleResolution": "bundler"
     }
   }
   ```

2. **ESLint Rules**

   ```json
   {
     "rules": {
       "import/default": "error",
       "import/no-unresolved": "error",
       "import/no-cycle": "error"
     }
   }
   ```

3. **VS Code Settings**
   ```json
   {
     "typescript.preferences.importModuleSpecifier": "non-relative",
     "typescript.preferences.quoteStyle": "single",
     "editor.codeActionsOnSave": {
       "source.organizeImports": true
     }
   }
   ```

## Conclusion

Understanding module exports is crucial for React/TypeScript development. Follow these guidelines to prevent export-related errors:

1. Be consistent with export patterns
2. Use appropriate TypeScript and ESLint configurations
3. Leverage IDE features for early error detection
4. Maintain clear module organization
5. Document export patterns in your team's style guide
