# Supabase Authentication Guide

## Overview

This guide covers the implementation of authentication in our Next.js application using Supabase Auth, including setup, configuration, and best practices.

## Features

- Email/Password authentication
- OAuth providers (Google, GitHub)
- Magic link authentication
- Session management
- Role-based access control
- Server-side auth helpers

## Setup

### 1. Auth Configuration

Configure authentication providers in your Supabase dashboard:

1. Go to Authentication > Providers
2. Enable desired providers (Email, OAuth, etc.)
3. Configure provider settings and credentials

### 2. Client-Side Setup

```typescript
// lib/auth/AuthProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Add other auth methods as needed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    signIn: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 3. Protected Routes

```typescript
// components/auth/ProtectedRoute.tsx
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/auth/AuthProvider';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? <>{children}</> : null;
}
```

## Implementation Examples

### 1. Sign In Form

```typescript
// components/auth/LoginForm.tsx
import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';

export function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit">Sign In</button>
    </form>
  );
}
```

### 2. OAuth Integration

```typescript
// components/auth/OAuthButtons.tsx
import { supabase } from '@/lib/supabase';
import { Provider } from '@supabase/supabase-js';

export function OAuthButtons() {
  const handleOAuthSignIn = async (provider: Provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) console.error('OAuth error:', error.message);
  };

  return (
    <div>
      <button onClick={() => handleOAuthSignIn('google')}>
        Sign in with Google
      </button>
      <button onClick={() => handleOAuthSignIn('github')}>
        Sign in with GitHub
      </button>
    </div>
  );
}
```

## Security Best Practices

### 1. Session Management

- Implement proper session refresh
- Handle token expiration
- Secure session storage

```typescript
// middleware.ts
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
```

### 2. Error Handling

```typescript
function handleAuthError(error: Error) {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Incorrect email or password';
    case 'Email not confirmed':
      return 'Please verify your email address';
    default:
      return 'An error occurred during authentication';
  }
}
```

### 3. Role-Based Access Control (RBAC)

```typescript
// types/auth.ts
export type UserRole = 'admin' | 'user' | 'guest';

// hooks/useAuthorization.ts
export function useAuthorization(requiredRole: UserRole) {
  const { user } = useAuth();
  const userRole = user?.user_metadata.role as UserRole;

  return {
    isAuthorized: userRole === requiredRole,
    role: userRole,
  };
}
```

## Common Issues and Solutions

### 1. Session Persistence

Problem: Session not persisting after page refresh
Solution: Ensure middleware is properly configured and session is being refreshed

### 2. OAuth Redirect Issues

Problem: OAuth redirect not working
Solution: Verify redirect URLs in Supabase dashboard and application configuration

### 3. Token Expiration

Problem: Session expires unexpectedly
Solution: Implement proper token refresh logic in middleware

## Testing

### 1. Mock Auth Provider

```typescript
// test/mocks/AuthProvider.tsx
export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: mockUser,
        loading: false,
        signIn: async () => {},
        signOut: async () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

### 2. Test Examples

```typescript
// __tests__/auth/LoginForm.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';

describe('LoginForm', () => {
  it('handles successful login', async () => {
    const { getByPlaceholderText, getByRole } = render(
      <MockAuthProvider>
        <LoginForm />
      </MockAuthProvider>
    );

    fireEvent.change(getByPlaceholderText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(getByPlaceholderText('Password'), {
      target: { value: 'password' },
    });
    fireEvent.click(getByRole('button'));

    await waitFor(() => {
      // Assert successful login
    });
  });
});
```

## Next Steps

1. Implement [Row Level Security](./row-level-security.md) for data access control
2. Set up [User Management](./user-management.md)
3. Configure [OAuth Providers](./oauth-configuration.md)
4. Review [Security Best Practices](./security.md)
