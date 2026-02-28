# Auth Redirect Configuration Guide for CRM13

This guide provides detailed instructions for setting up and maintaining redirect URL configurations for authentication in the CRM13 application. It covers both Supabase dashboard configuration and code implementation.

## Quick Configuration Steps

1. **Log in to Supabase Dashboard**
2. **Add the following URLs to the allowed redirect list:**

```
# Production URL
https://www.yourapp.com/**

# Vercel Preview URLs
https://*-crm13-yourorg.vercel.app/**

# Development URLs
http://localhost:3000/**
http://localhost:5173/**
```

3. **Use the URL utilities in `/src/lib/auth/url-utils.ts` for all auth redirects**

## Detailed Configuration

### Supabase Dashboard Configuration

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication → URL Configuration**
4. Set the **Site URL** to your primary production URL
5. Under **Redirect URLs**, add all required URLs:

| Environment | URL Pattern | Notes |
|-------------|-------------|-------|
| Production | `https://yourapp.com/**` | Main production URL |
| Staging | `https://staging.yourapp.com/**` | If applicable |
| Preview (Vercel) | `https://*-crm13-yourorg.vercel.app/**` | For PR previews |
| Development | `http://localhost:3000/**` | Local development |
| Development | `http://localhost:5173/**` | Vite dev server |

### Wildcard URL Patterns

Supabase supports wildcard patterns in redirect URLs:

| Pattern | Description | Example Match |
|---------|-------------|---------------|
| `*` | Matches any sequence within a segment | `example.com/page/*` matches `example.com/page/123` |
| `**` | Matches across segments | `example.com/**` matches `example.com/page/subpage` |

For security, make wildcard patterns as specific as possible:
- ✅ `https://*-crm13-yourorg.vercel.app/**`
- ❌ `https://**` (too broad)

## Code Implementation

### Using URL Utilities

We've created dedicated utility functions for handling authentication URLs securely. Always use these functions rather than constructing URLs manually:

```typescript
import { getRedirectUrl, getReturnUrl, createLoginUrl } from '@/lib/auth/url-utils';

// When initiating OAuth sign-in
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: getRedirectUrl('auth/callback'),
  },
});

// When redirecting after successful authentication
const returnUrl = getReturnUrl('/dashboard');
navigate(returnUrl);

// When creating a login link that returns to current page
const loginUrl = createLoginUrl(window.location.pathname);
```

### Authentication Flow Components

The most common authentication flows in our application:

1. **Email/Password Login**:
   - User enters credentials at `/login.html`
   - After successful authentication, redirected to specified return URL

2. **OAuth Login**:
   - User clicks OAuth provider button
   - Redirects to provider (Google, GitHub, etc.)
   - Provider redirects back to our callback URL
   - Callback page checks session and redirects to application

3. **Password Reset**:
   - User requests password reset
   - Receives email with reset link
   - Link redirects to reset password page
   - After reset, redirected to login

### Error Handling

When authentication fails, implement proper error handling:

```typescript
try {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  
  // Redirect on success
  navigate(getReturnUrl());
} catch (error) {
  // Display appropriate error message
  setErrorMessage(error.message);
}
```

## Mobile Deep Linking

For mobile applications, we can use deep linking:

```
com.example.crm13app://callback
```

Add this to the allowed redirect URLs in Supabase when needed.

## Security Best Practices

1. **Validate Return URLs**: Always validate that return URLs are allowed destinations
2. **Limit Redirect Scope**: Only add URLs you control to the allowed list
3. **Use HTTPS**: Always use HTTPS for production and staging environments
4. **Implement CSRF Protection**: Use state parameters in OAuth flows
5. **Secure Session Storage**: Use secure and httpOnly cookies

## Troubleshooting

### Common Issues

1. **"Invalid redirect URL" error**:
   - Check that the URL is in the Supabase allow list
   - Verify the URL format matches exactly (including protocol and case)
   - Check for typos in the URL

2. **Redirect loop**:
   - Check authentication condition logic
   - Ensure redirect targets are correct
   - Add appropriate debugging logs

3. **Session not persisting**:
   - Verify cookie settings
   - Check for cross-origin issues
   - Confirm Supabase client initialization

### Debugging

Add temporary logs to track the redirect flow:

```typescript
console.log('Redirect URL:', redirectUrl);
console.log('Auth state:', authState);
```

For persistent issues:
1. Check browser console for errors
2. Inspect network requests for authentication calls
3. Verify environment variables are correctly set
4. Test with minimal redirect URL first before using wildcards

## Related Documentation

- [Supabase Authentication Guide](../supabase/authentication.md)
- [Redirect URLs Reference](../supabase/redirect-urls.md)
- [URL Utilities](../../src/lib/auth/url-utils.ts)