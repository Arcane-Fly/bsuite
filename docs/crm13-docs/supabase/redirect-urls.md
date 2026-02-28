# Supabase Redirect URLs

## Overview

Redirect URLs are a critical component of the authentication flow in Supabase Auth. They specify where users should be redirected after completing authentication processes such as:

- Passwordless sign-ins (magic links)
- OAuth authentication with third-party providers
- Email verification
- Password recovery

By default, users are redirected to the application's `SITE_URL`, but you can customize this behavior by configuring additional redirect URLs and specifying the desired destination in your authentication requests.

## Configuration Options

### Dashboard Configuration

To configure redirect URLs in the Supabase dashboard:

1. Navigate to the [URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration) page in your Supabase project
2. Set your primary `SITE_URL` (the default redirect destination)
3. Add any additional redirect URLs to the allow list

### CLI Configuration

For local development or self-hosted projects, you can configure redirect URLs in the Supabase configuration file:

```bash
# supabase/config.toml
[auth]
additional_redirect_urls = [
  "http://localhost:3000/**",
  "https://staging.example.com/**"
]
```

### Environment Variables

When using the Supabase client library, you can specify the redirect URL for each authentication request:

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: 'https://example.com/auth/callback',
  },
});
```

## Wildcard Patterns

Supabase supports wildcard patterns in redirect URLs, which is particularly useful for development environments and preview deployments.

### Supported Wildcards

| Wildcard | Description |
|----------|-------------|
| `*` | Matches any sequence of non-separator characters |
| `**` | Matches any sequence of characters (including separators) |
| `?` | Matches any single non-separator character |
| `c` | Matches character c (c != `*`, `**`, `?`, `\`, `[`, `{`, `}`) |
| `\c` | Matches character c |
| `[!{ character-range }]` | Matches any sequence of characters not in the `{ character-range }` |

> **Note:** The separator characters in a URL are defined as `.` and `/`.

### Wildcard Examples

| Redirect URL | Matches | Does Not Match |
|--------------|---------|----------------|
| `http://localhost:3000/*` | `http://localhost:3000/foo`<br>`http://localhost:3000/bar` | `http://localhost:3000/foo/bar`<br>`http://localhost:3000/foo/` |
| `http://localhost:3000/**` | `http://localhost:3000/foo`<br>`http://localhost:3000/bar`<br>`http://localhost:3000/foo/bar` | |
| `http://localhost:3000/?` | `http://localhost:3000/a` | `http://localhost:3000/foo` |
| `http://localhost:3000/[!a-z]` | `http://localhost:3000/1` | `http://localhost:3000/a` |

> **Best Practice:** While wildcards are useful for development and preview environments, it's recommended to use exact paths for production environments.

## Platform-Specific Configurations

### Vercel

For deployments with Vercel:

1. Set the `SITE_URL` to your official production URL
2. Add these additional redirect URLs:

   ```
   http://localhost:3000/**
   https://*-<team-or-account-slug>.vercel.app/**
   ```

3. Use environment variables to dynamically set the redirect URL:

```typescript
const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/';

  // Make sure to include `https://` when not localhost.
  url = url.startsWith('http') ? url : `https://${url}`;

  // Make sure to include a trailing `/`.
  url = url.endsWith('/') ? url : `${url}/`;

  return url;
};

const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: getURL(),
  },
});
```

### Netlify

For deployments with Netlify:

1. Set the `SITE_URL` to your official production URL
2. Add these additional redirect URLs:

   ```
   http://localhost:3000/**
   https://**--my_org.netlify.app/**
   ```

## Email Templates

When using custom redirect URLs, you may need to update your email templates to use the `{{ .RedirectTo }}` variable instead of `{{ .SiteURL }}`:

```html
<!-- Before -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
  Confirm your email
</a>

<!-- After -->
<a href="{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
  Confirm your email
</a>
```

## Mobile Deep Linking

For mobile applications, you can use deep linking URIs as redirect URLs:

```
com.example.app://login-callback/
```

This allows your mobile app to handle authentication callbacks directly.

## Error Handling

When authentication fails, users will still be redirected to the specified URL, but error details will be included as URL fragments. You can parse these fragments to display appropriate error messages:

```typescript
const params = new URLSearchParams(window.location.hash.slice(1));

if (params.get('error_code')?.startsWith('4')) {
  // Show error message for 4xx errors
  alert(params.get('error_description'));
}
```

## Security Considerations

### Best Practices

1. **Limit redirect URLs**: Only add URLs that you control to the allow list
2. **Use exact paths in production**: Avoid wildcards in production environments
3. **Validate tokens**: Always validate authentication tokens on the server side
4. **Implement CSRF protection**: Use state parameters in OAuth flows
5. **Set appropriate cookie options**: Use secure, httpOnly, and SameSite cookies

### Common Pitfalls

1. **Overly permissive wildcards**: Using `**` for all environments
2. **Missing protocol**: Forgetting to include `https://` in production URLs
3. **Inconsistent trailing slashes**: Mixing URLs with and without trailing slashes
4. **Hardcoded redirect URLs**: Not using environment variables for different environments

## Troubleshooting

### Common Issues

1. **Redirect not working**: Verify the URL is in the allow list and properly formatted
2. **"Invalid redirect URL" error**: Check for typos and ensure the URL matches exactly
3. **Session not persisting**: Verify cookie settings and cross-domain issues
4. **OAuth flow failing**: Check provider configuration and callback URLs

### Debugging Tips

1. Check the browser console for errors
2. Verify the redirect URL in the network request
3. Confirm the URL is in the Supabase allow list
4. Test with a simple, non-wildcard URL first
5. Ensure environment variables are properly set

## Related Documentation

- [Authentication](./authentication.md)
- [Row Level Security](./row-level-security.md)
- [TypeScript Integration](./typescript.md)
