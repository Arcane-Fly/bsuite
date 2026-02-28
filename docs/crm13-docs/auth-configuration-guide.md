# Authentication Configuration Guide for CRM13

## Table of Contents

1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [Redirect URL Configuration](#redirect-url-configuration)
4. [Implementation Steps](#implementation-steps)
5. [Code Examples](#code-examples)
6. [Environment Configuration](#environment-configuration)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Topics](#advanced-topics)

## Overview

The CRM13 application uses Supabase for authentication, providing secure user management with features like:

- Email/password authentication
- Magic link authentication
- OAuth providers (Google, GitHub, etc.)
- Row-level security integration
- Role-based access control
- JWT token management

This guide explains how to configure and implement authentication properly, with a focus on the critical redirect URL configuration.

## Authentication Flow

The standard authentication flow in CRM13 follows these steps:

1. User attempts to access a protected route or clicks "Sign In"
2. User is redirected to the login page
3. User enters credentials or selects a social provider
4. Supabase processes the authentication request
5. Upon success, Supabase redirects to the configured redirect URL
6. The application processes the authentication response
7. User is redirected to the originally requested page or default dashboard

### Authentication Components

Key components in the authentication system:

- `AuthProvider.tsx` - Context provider for authentication state
- `LoginForm.tsx` - Form component for email/password login
- `ProtectedRoute.tsx` - Route wrapper that enforces authentication
- `Callback.tsx` - Handles OAuth and magic link redirects
- `url-utils.ts` - Utility functions for managing redirect URLs

## Redirect URL Configuration

Proper redirect URL configuration is **critical** for a working authentication system. This determines where users are sent after authentication processes such as:

- Email verification
- Password reset
- OAuth provider login
- Magic link authentication

### Supabase Dashboard Configuration

Log into the Supabase dashboard and configure the following:

1. Set your project's primary URL under Authentication > URL Configuration > Site URL
   - This should be your production URL (e.g., `https://app.example.com`)

2. Add all required redirect URLs to the "Redirect URLs" list:

```
# Production URLs
https://app.example.com/**

# Development URLs
http://localhost:3000/**
http://localhost:5173/**  # Vite dev server

# Staging/Preview URLs (for Vercel)
https://*-<team-or-account-slug>.vercel.app/**
```

### Understanding URL Patterns

Supabase supports wildcard patterns in redirect URLs:

- `*` - Matches any sequence within a segment
  - Example: `https://app-*.example.com/auth/*` matches `https://app-prod.example.com/auth/callback`
  
- `**` - Matches across segments (including separators)
  - Example: `https://app.example.com/**` matches `https://app.example.com/auth/callback`

**Security Note**: Use the most specific patterns possible for maximum security.

## Implementation Steps

### 1. Create URL Utility Functions

Create utility functions to handle URL generation consistently:

```typescript
// src/lib/auth/url-utils.ts
export function getBaseUrl(): string {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? 
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? 
    'http://localhost:3000/';

  // Ensure proper protocol
  url = url.startsWith('http') ? url : `https://${url}`;

  // Ensure trailing slash
  url = url.endsWith('/') ? url : `${url}/`;

  return url;
}

export function getRedirectUrl(path = ''): string {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${baseUrl}${cleanPath}`;
}
```

### 2. Implement Auth Provider

Create an authentication provider that manages the user session:

```typescript
// src/lib/auth/AuthProvider.tsx (simplified)
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Session, User } from '@supabase/supabase-js';

const AuthContext = createContext<{
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}>({
  user: null,
  session: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

### 3. Create Authentication Components

Implement login, signup, and callback components:

```typescript
// src/components/auth/LoginForm.tsx (simplified)
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getRedirectUrl } from '../../lib/auth/url-utils';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getRedirectUrl('auth/callback'),
        },
      });
      
      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleEmailLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Sign In'}
        </button>
      </form>
      
      <div className="social-login">
        <button onClick={() => handleOAuthLogin('google')} disabled={loading}>
          Sign in with Google
        </button>
        <button onClick={() => handleOAuthLogin('github')} disabled={loading}>
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}
```

### 4. Create Callback Handler

Implement a callback page to handle the OAuth redirects:

```typescript
// src/pages/auth/Callback.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function Callback() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Extract hash parameters
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const errorDescription = hashParams.get('error_description');
    
    if (errorDescription) {
      setError(errorDescription);
      return;
    }

    // Process the auth callback
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setError(error.message);
      } else if (session) {
        // Successful authentication, redirect to desired location
        const redirectTo = localStorage.getItem('redirectTo') || '/dashboard';
        localStorage.removeItem('redirectTo'); // Clean up
        navigate(redirectTo);
      } else {
        // No session found
        navigate('/auth/login');
      }
    });
  }, [navigate]);

  if (error) {
    return (
      <div className="auth-callback-error">
        <h2>Authentication Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/auth/login')}>
          Return to login
        </button>
      </div>
    );
  }

  return (
    <div className="auth-callback-loading">
      <p>Completing authentication, please wait...</p>
      {/* Loading spinner */}
    </div>
  );
}
```

### 5. Implement Protected Routes

Create a protected route component that enforces authentication:

```typescript
// src/components/auth/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth/AuthProvider';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Save the current location for redirect after login
  if (!isLoading && !user) {
    localStorage.setItem('redirectTo', location.pathname);
    return <Navigate to="/auth/login" replace />;
  }

  // Show loading state while checking auth
  if (isLoading) {
    return <div>Loading authentication status...</div>;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}
```

## Code Examples

### Sign In with Email

```typescript
const signInWithEmail = async (email: string, password: string) => {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    // Success - user will be updated in the auth context
  } catch (error) {
    console.error('Error signing in:', error);
    // Handle error in UI
  }
};
```

### Sign In with Magic Link

```typescript
const signInWithMagicLink = async (email: string) => {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        redirectTo: getRedirectUrl('auth/callback'),
      },
    });
    
    if (error) throw error;
    // Show "check your email" message
  } catch (error) {
    console.error('Error sending magic link:', error);
    // Handle error in UI
  }
};
```

### Sign In with OAuth

```typescript
const signInWithOAuth = async (provider: 'google' | 'github' | 'azure') => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getRedirectUrl('auth/callback'),
        scopes: 'email profile', // Optional scopes
      },
    });
    
    if (error) throw error;
    // Redirect will happen automatically
  } catch (error) {
    console.error('Error with OAuth sign in:', error);
    // Handle error in UI
  }
};
```

### Password Reset Flow

```typescript
// Step 1: Request password reset
const requestPasswordReset = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl('auth/reset-password'),
    });
    
    if (error) throw error;
    // Show "check your email" message
  } catch (error) {
    console.error('Error requesting password reset:', error);
    // Handle error in UI
  }
};

// Step 2: Reset password (after user clicks email link)
const resetPassword = async (newPassword: string) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) throw error;
    // Show success message and redirect to login
  } catch (error) {
    console.error('Error resetting password:', error);
    // Handle error in UI
  }
};
```

### Sign Out

```typescript
const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // Redirect to login page
  } catch (error) {
    console.error('Error signing out:', error);
    // Handle error in UI
  }
};
```

## Environment Configuration

### Environment Variables

Create a `.env` file with these variables:

```
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Application
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

For Vercel deployments, add these variables in the Vercel dashboard.

### Production vs. Development Configuration

Create environment-specific configurations:

```typescript
// src/lib/env.ts
export const env = {
  // Base URLs
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  
  // Supabase
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  
  // Environment detection
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  
  // Vercel-specific
  vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
  vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
};
```

## Security Best Practices

### Secure Redirect URLs

- Use HTTPS for all production URLs
- Avoid overly permissive wildcards (`**`) in production
- Periodically audit your redirect URL list
- Limit to domains you control

### CORS Configuration

Ensure proper CORS configuration for API endpoints:

```typescript
// server middleware example
app.use(cors({
  origin: [
    'https://app.example.com',
    /\.example\.com$/,
    process.env.NODE_ENV === 'development' && 'http://localhost:3000',
  ].filter(Boolean),
  credentials: true,
}));
```

### Cookie Security

Use secure cookies for session management:

```typescript
// Supabase client initialization with secure cookies
const supabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'supabase.auth.token',
      cookieOptions: {
        name: 'sb-auth-token',
        lifetime: 60 * 60 * 24 * 7, // 7 days
        domain: process.env.NODE_ENV === 'production' ? '.example.com' : 'localhost',
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  }
);
```

### Role-Based Security

Implement role-based access control:

```typescript
// src/components/auth/RoleProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth/AuthProvider';

export function RoleProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode,
  allowedRoles: string[]
}) {
  const { user, isLoading } = useAuth();
  
  // Get user role from metadata
  const userRole = user?.user_metadata?.role || 'user';
  
  // Check if loading
  if (isLoading) {
    return <div>Loading authentication status...</div>;
  }
  
  // Check if authenticated
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }
  
  // Check if role is allowed
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  // User is authenticated and authorized
  return <>{children}</>;
}
```

## Troubleshooting

### Common Issues

#### Invalid Redirect URL

**Symptom**: Error message "Invalid redirect URL" during authentication.

**Solution**:
1. Check that the URL exactly matches one of the allowed redirect URLs in Supabase.
2. Ensure URL uses the correct protocol (http/https).
3. Check for trailing slashes consistency.
4. Verify wildcard patterns are correct.

#### Session Not Persisting

**Symptom**: User is logged out when refreshing the page.

**Solution**:
1. Ensure cookies are being properly set.
2. Check cookie settings, particularly domain and SameSite policies.
3. Verify localStorage is available and not restricted.
4. Confirm that the auth state listener is properly set up.

#### OAuth Flow Not Completing

**Symptom**: OAuth starts but user is not redirected back to the application.

**Solution**:
1. Verify redirect URL is properly configured in Supabase.
2. Check the OAuth provider configuration in Supabase dashboard.
3. Look for CORS issues in browser console.
4. Ensure callback component handles the OAuth response correctly.

### Debugging Tools

#### Check Authentication State

```typescript
// Call this function to debug auth state
const debugAuthState = async () => {
  const session = await supabase.auth.getSession();
  console.log('Current session:', session);
  
  const user = await supabase.auth.getUser();
  console.log('Current user:', user);
};
```

#### Network Request Inspection

Monitor network requests in browser dev tools:
1. Look for requests to `/auth/v1/token` endpoints
2. Check for 401/403 status codes
3. Inspect request/response headers for cookie issues

#### Environment Variable Check

```typescript
// Log environment configuration
console.log('Auth environment:', {
  supabaseUrl: env.supabaseUrl,
  isDevelopment: env.isDevelopment,
  siteUrl: env.siteUrl,
  vercelUrl: env.vercelUrl,
  redirectUrl: getRedirectUrl('auth/callback'),
});
```

## Advanced Topics

### Custom Email Templates

Customize email templates in Supabase dashboard:
1. Go to Authentication > Email Templates
2. Edit templates for Confirmation, Magic Link, etc.
3. Use `{{ .RedirectTo }}` variable in templates

### Server-Side Authentication

For server components or API routes:

```typescript
// src/lib/auth/supabase-server.ts
import { createServerClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function createServerSupabase() {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set(name, value, options);
        },
        remove(name, options) {
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );
}
```

### JWT Validation

For backend services that need to validate Supabase JWT tokens:

```typescript
// server/middleware/auth.js
const { createRemoteJWKSet, jwtVerify } = require('jose');

const jwks = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/jwks`)
);

async function validateToken(token) {
  try {
    const { payload } = await jwtVerify(
      token,
      jwks,
      {
        issuer: `${process.env.SUPABASE_URL}/auth/v1`,
        audience: 'authenticated',
      }
    );
    
    return { valid: true, user: payload.sub, role: payload.role };
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false, error: error.message };
  }
}

module.exports = { validateToken };
```

### Multiple Auth Providers Configuration

Handle multiple auth providers and user profiles:

```typescript
async function linkAuthProvider(provider: string) {
  const { data, error } = await supabase.auth.linkIdentity({
    provider: provider as any,
    options: {
      redirectTo: getRedirectUrl('auth/callback?linking=true'),
    }
  });
  
  if (error) throw error;
  return data;
}

async function unlinkAuthProvider(provider: string) {
  // Implementation depends on Supabase API
  const { data, error } = await supabase.auth.api.unlinkIdentity(provider);
  
  if (error) throw error;
  return data;
}
```

## Revision History

| Version | Date       | Description               | Author              |
| ------- | ---------- | ------------------------- | ------------------- |
| 1.1.0   | 2024-05-20 | Added troubleshooting     | Integration Team    |
| 1.0.0   | 2024-02-25 | Initial auth documentation| System Architect    |