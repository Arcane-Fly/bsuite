> [IMPORTED FROM CRM13] -- Reference only, not canonical

# Auth Redirect Configuration Guide

This guide provides practical instructions for configuring and implementing redirect URLs in our application's authentication flow using Supabase.

## Project-Specific Implementation

Our application uses Supabase for authentication with a custom `AuthProvider` component that manages the authentication state and provides authentication methods to the rest of the application.

### Current Implementation

The current implementation handles redirects in the `AuthProvider.tsx` component:

```typescript
// Helper to safely handle auth redirects
const handleRedirectSafely = useCallback((): void => {
  try {
    const currentUrl = new URL(window.location.href);
    const redirectUrl = currentUrl.searchParams.get('returnTo') ?? '/dashboard';
    const navigateResult = navigate(redirectUrl, { replace: true });
    if (navigateResult instanceof Promise) {
      navigateResult.catch((err: unknown) => {
        console.error('Navigation error:', err);
      });
    }
  } catch (err: unknown) {
    console.error('Error handling redirect:', err);
    const navigateResult = navigate('/dashboard', { replace: true });
    if (navigateResult instanceof Promise) {
      navigateResult.catch((err: unknown) => {
        console.error('Fallback navigation error:', err);
      });
    }
  }
}, [navigate]);
```

This function is called after successful authentication to redirect the user to the appropriate page.

## Configuring Redirect URLs

### Step 1: Update Supabase Configuration

First, ensure that all necessary redirect URLs are added to the Supabase allow list:

1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to Authentication → URL Configuration
4. Set the Site URL to your production URL
5. Add additional redirect URLs for development and staging environments

For our project, the following URLs should be configured:


```text
# Production
https://app.example.com/**

# Development
http://localhost:3000/**

# Staging/Preview (Vercel)
https://*-<team-or-account-slug>.vercel.app/**
```

### Step 2: Create a URL Utility Function

Add a utility function to dynamically determine the appropriate redirect URL based on the environment:

```typescript
// src/lib/url-utils.ts
export function getBaseUrl(): string {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Production URL
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Vercel preview URL
    'http://localhost:3000/'; // Local development fallback

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

### Step 3: Update Authentication Methods

Modify the authentication methods in `AuthProvider.tsx` to use the redirect URL utility:

```typescript
import { getRedirectUrl } from '../lib/url-utils';

// In the resetPassword function
const resetPassword = useCallback(async (
  email: string
): Promise<{ readonly error: AuthError | null }> => {
  try {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl('auth/reset-password'),
    });

    if (error) {
      const categorizedError = categorizeAuthError(error);
      setError(categorizedError);
      return { error: categorizedError };
    }

    return { error: null };
  } catch (err: unknown) {
    const categorizedError = categorizeAuthError(err);
    setError(categorizedError);
    return { error: categorizedError };
  } finally {
    setLoading(false);
  }
}, []);
```

### Step 4: Update OAuth Sign-In Components

If your application uses OAuth providers, update the sign-in components to use the redirect URL utility:

```typescript
// components/auth/OAuthButtons.tsx
import { getRedirectUrl } from '@/lib/url-utils';

export function OAuthButtons() {
  const handleOAuthSignIn = async (provider: Provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getRedirectUrl('auth/callback'),
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

## Handling Auth Callbacks

### Step 1: Create an Auth Callback Handler

Create a dedicated component or page to handle authentication callbacks:

```typescript
// pages/auth/callback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Process the auth callback
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Get the intended destination from URL params or use a default
        const params = new URLSearchParams(window.location.search);
        const redirectTo = params.get('redirectTo') || '/dashboard';
        navigate(redirectTo, { replace: true });
      }

      // Handle errors
      if (event === 'USER_UPDATED' && !session) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (hashParams.has('error_description')) {
          console.error('Auth error:', hashParams.get('error_description'));
          navigate('/auth/login', {
            replace: true,
            state: { error: hashParams.get('error_description') }
          });
        }
      }
    });

    // Clean up the listener
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="auth-callback-container">
      <div className="loading-indicator">
        <p>Completing authentication...</p>
        {/* Add a loading spinner here */}
      </div>
    </div>
  );
}
```

### Step 2: Update Email Templates

If you're using custom email templates in Supabase, update them to use the `{{ .RedirectTo }}` variable:

1. Go to the Supabase Dashboard → Authentication → Email Templates
2. Update the confirmation and password reset templates:

```html
<a href="{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
  Confirm your email
</a>
```

## Testing Redirect URLs

### Local Development Testing

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Test the authentication flow:
   - Sign up with a new account
   - Sign in with an existing account
   - Request a password reset
   - Sign in with OAuth providers

3. Verify that redirects work correctly after each authentication action

### Testing with Query Parameters

Test redirects with custom return URLs:

```url
=======
```
### Vercel Preview Testing

1. Deploy a preview branch to Vercel
2. Test the authentication flow in the preview environment
3. Verify that redirects work correctly with the preview URL

## Troubleshooting

### Common Issues

1. **"Invalid redirect URL" error**:
   - Ensure the URL is added to the Supabase allow list
   - Check for typos in the URL
   - Verify that the URL format matches exactly (including protocol and trailing slashes)

2. **Redirect not working after authentication**:
   - Check browser console for errors
   - Verify that the `handleRedirectSafely` function is being called
   - Ensure the navigation library is working correctly

3. **OAuth flow failing**:
   - Verify OAuth provider configuration in Supabase
   - Check that the redirect URL is correctly formatted and allowed
   - Look for CORS errors in the browser console

### Debugging Tips

1. Add temporary logging to track the redirect flow:

   ```typescript
   console.log('Redirect URL:', redirectUrl);
   ```

2. Use the browser's network tab to inspect authentication requests

3. Test with a simple, non-wildcard URL first

4. Verify environment variables are correctly set in all environments

## Related Documentation

- [Supabase Redirect URLs](../supabase/redirect-urls.md)
- [Authentication](../supabase/authentication.md)
- [Row Level Security](../supabase/row-level-security.md)
