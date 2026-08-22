# Supabase OAuth 2.1 Server -- Comprehensive Research Document

> # VERDICT: REFERENCE — recorded 2026-08-22
>
> Research into building a Supabase OAuth 2.1 server. **The estate went and built one** —
> business-suite-unified is the authorization server and ships the `oauth-*` edge functions;
> all five other apps are clients. Read this as the reasoning that preceded that work, never
> as a description of it.
>
> The original document is unchanged below this banner.


## Table of Contents
1. [Overview & Architecture](#1-overview--architecture)
2. [Getting Started & Configuration](#2-getting-started--configuration)
3. [OAuth 2.1 Flows (PKCE)](#3-oauth-21-flows-pkce)
4. [MCP Authentication (Critical)](#4-mcp-authentication-critical)
5. [Token Security & RLS](#5-token-security--rls)
6. [FastMCP Integration](#6-fastmcp-integration)
7. [Relevance to Monkey1 Project](#7-relevance-to-monkey1-project)
8. [Limitations & Requirements](#8-limitations--requirements)

---

## 1. Overview & Architecture

### What It Is
Supabase Auth now functions as a **full OAuth 2.1 and OpenID Connect (OIDC) identity provider**. This is NOT social login -- it turns your Supabase project into an authorization server that third-party apps authenticate against, similar to "Sign in with Google" but for YOUR app.

**Status:** Beta (free during beta on all plans).

### Key Use Cases
1. **Developer platforms/marketplaces** -- Third-party devs build integrations with "Sign in with [Your App]"
2. **AI agents and automation** -- Authenticate AI agents, LLM tools, and MCP servers (this is us)
3. **Mobile/desktop apps** -- Issue OAuth tokens to first-party clients
4. **Enterprise SSO** -- Standards-compliant OIDC federation

### Supported Standards
- **OAuth 2.1** with mandatory PKCE
- **OpenID Connect** -- ID tokens with `openid` scope, UserInfo endpoint, OIDC discovery
- **Standard scopes:** `openid`, `email`, `profile`, `phone`
- **Dynamic Client Registration** -- MCP clients self-register automatically
- **JWKS endpoint** -- Public keys for third-party token validation

### High-Level Flow
```
1. App redirects user to Supabase authorization endpoint
2. Supabase Auth validates request, redirects to YOUR custom consent UI
3. User authenticates (any enabled auth method) and approves access
4. Supabase Auth issues authorization code
5. App exchanges code for access + refresh tokens (PKCE verified)
6. App uses access token for authenticated API requests
```

### Integration with Existing Auth
- Works with ALL enabled Supabase auth methods (email, phone, social, SSO)
- Compatible with Custom Access Token Hooks
- Existing RLS policies automatically apply to OAuth tokens
- Access tokens are standard Supabase JWTs with extra `client_id` claim

---

## 2. Getting Started & Configuration

### Prerequisites
- Supabase project with admin access
- Optional: Supabase CLI v2.54.11+ for local dev

### Enable OAuth 2.1 Server
1. Dashboard -> **Authentication** -> **OAuth Server** (sidebar)
2. Toggle enable

### Exposed Endpoints (once enabled)

| Endpoint | URL |
|----------|-----|
| Authorization | `https://<project-ref>.supabase.co/auth/v1/oauth/authorize` |
| Token | `https://<project-ref>.supabase.co/auth/v1/oauth/token` |
| JWKS | `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| OAuth Discovery | `https://<project-ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1` |
| OIDC Discovery | `https://<project-ref>.supabase.co/auth/v1/.well-known/openid-configuration` |
| UserInfo | `https://<project-ref>.supabase.co/auth/v1/oauth/userinfo` |

### JWT Signing Recommendation
**CRITICAL:** Migrate from default HS256 to asymmetric RS256 or ES256:
- Enables OAuth clients to validate tokens via JWKS endpoint (no shared secret)
- **Required** for OpenID Connect ID tokens -- HS256 will cause ID token generation to fail
- Better for distributed systems

### Configure Authorization Path
1. Dashboard -> **Authentication** -> **OAuth Server**
2. Set **Authorization Path** (e.g., `/oauth/consent`)
3. Full URL = Site URL + Authorization Path (e.g., `https://example.com/oauth/consent`)

### Build Authorization UI (Consent Page)
Your app must implement a consent page that:
1. Extracts `authorization_id` from URL query params
2. Authenticates the user (redirect to login if needed, preserving authorization_id)
3. Calls `supabase.auth.oauth.getAuthorizationDetails(authorization_id)` to get client info
4. Displays consent screen showing requesting app + requested scopes
5. On approve: `supabase.auth.oauth.approveAuthorization(authorization_id)` -> redirect to `data.redirect_to`
6. On deny: `supabase.auth.oauth.denyAuthorization(authorization_id)` -> redirect to `data.redirect_to`

#### Next.js Consent Page Example
```typescript
// app/oauth/consent/page.tsx
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: { authorization_id?: string }
}) {
  const authorizationId = (await searchParams).authorization_id
  if (!authorizationId) return <div>Error: Missing authorization_id</div>

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: async () => (await cookies()).getAll(), setAll: async (c) => { const cs = await cookies(); c.forEach(({name,value,options}) => cs.set(name,value,options)) } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/oauth/consent?authorization_id=${authorizationId}`)

  const { data: authDetails, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId)
  if (error || !authDetails) return <div>Error: {error?.message}</div>

  return (
    <div>
      <h1>Authorize {authDetails.client.name}</h1>
      <p><strong>Client:</strong> {authDetails.client.name}</p>
      <p><strong>Redirect URI:</strong> {authDetails.redirect_uri}</p>
      {authDetails.scope?.trim() && (
        <ul>{authDetails.scope.split(' ').map(s => <li key={s}>{s}</li>)}</ul>
      )}
      <form action="/api/oauth/decision" method="POST">
        <input type="hidden" name="authorization_id" value={authorizationId} />
        <button name="decision" value="approve">Approve</button>
        <button name="decision" value="deny">Deny</button>
      </form>
    </div>
  )
}
```

#### Decision Handler (API Route)
```typescript
// app/api/oauth/decision/route.ts
export async function POST(request: Request) {
  const formData = await request.formData()
  const decision = formData.get('decision')
  const authorizationId = formData.get('authorization_id') as string

  // Create supabase client...

  if (decision === 'approve') {
    const { data, error } = await supabase.auth.oauth.approveAuthorization(authorizationId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.redirect(data.redirect_to)
  } else {
    const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.redirect(data.redirect_to)
  }
}
```

### Register an OAuth Client

#### Via Dashboard
1. **Authentication** -> **OAuth Apps** (under Manage)
2. Click **Add a new client**
3. Enter:
   - **Client name**: Friendly identifier
   - **Redirect URIs**: Exact callback URLs (NO wildcards -- exact match required)
   - **Client type**: Public (mobile/SPA, no secret) or Confidential (server-side, has secret)
4. Click **Create**

#### You Receive
- **Client ID**: Unique identifier (UUID)
- **Client Secret** (confidential clients only): Secret key for authentication

#### Redirect URI Rules
- **Exact, complete URL matches required** (protocol + domain + path + port)
- NO wildcards, patterns, or partial URLs
- Use HTTPS in production
- Use separate OAuth clients per environment (dev/staging/prod)

### Optional: Custom Access Token Hook
Customize JWT claims per OAuth client:
- Set specific `audience` claim
- Add client-specific permissions
- Implement dynamic scopes
- Reference `client_id` to customize per-client

---

## 3. OAuth 2.1 Flows (PKCE)

### Supported Grant Types
1. **Authorization Code with PKCE** (`authorization_code`) -- initial tokens
2. **Refresh Token** (`refresh_token`) -- renew without re-auth

**NOT supported:** `client_credentials`, `password`

### Authorization Code Flow with PKCE (Full Steps)

#### Step 1: Generate PKCE Parameters
```javascript
function generateCodeVerifier() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64URLEncode(new Uint8Array(hash))
}

function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

const codeVerifier = generateCodeVerifier()  // 43-128 characters
sessionStorage.setItem('code_verifier', codeVerifier)
const codeChallenge = await generateCodeChallenge(codeVerifier)  // SHA-256 hash
```

#### Step 2: Authorization Request
```
https://<project-ref>.supabase.co/auth/v1/oauth/authorize?
  response_type=code
  &client_id=<client-id>
  &redirect_uri=<configured-redirect-uri>
  &state=<random-state>
  &code_challenge=<code-challenge>
  &code_challenge_method=S256
```

**Required params:** `response_type=code`, `client_id`, `redirect_uri`, `code_challenge`, `code_challenge_method=S256`
**Optional params:** `state` (CSRF protection -- highly recommended), `scope` (defaults to `email`), `nonce` (replay protection)

#### Step 3: User Authentication & Consent
Supabase Auth redirects to your authorization path with `authorization_id`. Your consent UI handles user approval/denial.

#### Step 4: Authorization Code Issued
On approval, redirect back:
```
https://client-app.com/callback?code=<authorization-code>&state=<state>
```
- Code valid for **10 minutes**, single-use, bound to PKCE verifier

On denial:
```
https://client-app.com/callback?error=access_denied&error_description=The+user+denied+the+authorization+request&state=<state>
```

#### Step 5: Token Exchange
```bash
# Public client
curl -X POST 'https://<project-ref>.supabase.co/auth/v1/oauth/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=authorization_code&code=<code>&client_id=<id>&redirect_uri=<uri>&code_verifier=<verifier>'

# Confidential client (adds client_secret)
curl -X POST 'https://<project-ref>.supabase.co/auth/v1/oauth/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=authorization_code&code=<code>&client_id=<id>&client_secret=<secret>&redirect_uri=<uri>&code_verifier=<verifier>'
```

```javascript
const response = await fetch(`https://<project-ref>.supabase.co/auth/v1/oauth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    client_id: '<client-id>',
    redirect_uri: '<redirect-uri>',
    code_verifier: sessionStorage.getItem('code_verifier'),
  }),
})
const tokens = await response.json()
```

#### Step 6: Token Response
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "MXff...",
  "scope": "openid email profile",
  "id_token": "eyJhbGc..."  // Only if openid scope requested
}
```

### Access Token Structure (JWT)
```json
{
  "aud": "authenticated",
  "exp": 1735819200,
  "iat": 1735815600,
  "iss": "https://<project-ref>.supabase.co/auth/v1",
  "sub": "user-uuid",
  "email": "user@example.com",
  "phone": "",
  "app_metadata": { "provider": "email", "providers": ["email"] },
  "user_metadata": {},
  "role": "authenticated",
  "aal": "aal1",
  "amr": [{ "method": "password", "timestamp": 1735815600 }],
  "session_id": "session-uuid",
  "client_id": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d"  // <-- OAuth-specific
}
```

### Available Scopes
| Scope | Controls |
|-------|----------|
| `openid` | Enables OIDC, includes ID token |
| `email` | Access to email + email_verified |
| `profile` | Name, picture, etc. |
| `phone` | Phone number + verified status |

**Default:** `email` when none specified.
**Note:** Scopes control ID token/UserInfo claims, NOT database access. Use RLS for database access control.
**Note:** Custom scopes are NOT currently supported.

### Refresh Token Flow
```bash
curl -X POST 'https://<project-ref>.supabase.co/auth/v1/oauth/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=refresh_token&refresh_token=<token>&client_id=<id>'
```

Refresh tokens may be **rotated** -- always update stored tokens when new ones are provided.

### OpenID Connect
- ID tokens included only when `openid` scope requested
- ID tokens valid for **1 hour**
- **Requires RS256 or ES256** (HS256 will fail)
- Standard OIDC claims: `sub`, `nonce`, `email`, `email_verified`, `phone_number`, `name`, `picture`

### Token Validation (Third-Party)
```javascript
import { createRemoteJWKSet, jwtVerify } from 'jose'

const JWKS = createRemoteJWKSet(
  new URL('https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json')
)

async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: 'https://<project-ref>.supabase.co/auth/v1',
    audience: 'authenticated',
  })
  return payload
}
```

**Always verify:** Signature, Issuer (`iss`), Audience (`aud` = `authenticated`), Expiration (`exp`), Client ID (`client_id`)

### Managing User Grants
```javascript
// View authorized apps
const { data: grants } = await supabase.auth.oauth.getUserGrants()

// Revoke an app's access (deletes all refresh tokens, user must re-authorize)
await supabase.auth.oauth.revokeGrant(clientId)
```

---

## 4. MCP Authentication (Critical)

### What This Enables
Supabase Auth's OAuth 2.1 server can authenticate MCP (Model Context Protocol) clients. Your Supabase project becomes the authorization server that AI agents authenticate against, using your existing user base.

### Key Benefits for MCP
- **Existing user base** -- No separate auth system for AI agents
- **Standards-compliant OAuth 2.1 + PKCE** -- What MCP clients expect
- **Automatic discovery** -- MCP clients auto-configure via `.well-known` endpoints
- **Dynamic client registration** -- MCP clients self-register automatically
- **RLS integration** -- Existing policies automatically apply
- **User approval** -- Users explicitly approve AI agent access
- **Token management** -- Automatic refresh token rotation

### MCP Authentication Flow (5 Steps)
```
1. DISCOVERY:   MCP client fetches OAuth config from /.well-known/oauth-authorization-server/auth/v1
2. REGISTRATION: (Optional) Client registers itself as OAuth client via dynamic registration
3. AUTHORIZATION: User redirected to consent UI, approves agent access
4. TOKEN EXCHANGE: Supabase issues access + refresh tokens
5. AUTHENTICATED ACCESS: MCP server makes requests to Supabase APIs on user's behalf
```

### Prerequisites
- OAuth 2.1 server enabled in Supabase project
- Authorization endpoint built (consent page)
- (Optional) Dynamic client registration enabled

### MCP Server Configuration
Point your MCP server to: `https://<project-ref>.supabase.co/auth/v1`

Discovery endpoint (auto-configured by MCP clients):
`https://<project-ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1`

### OAuth Client Setup for MCP -- Two Approaches

**Approach 1: Pre-register OAuth client**
- Manually register in Supabase Dashboard
- Use credentials in MCP server configuration
- Better security control

**Approach 2: Dynamic Client Registration**
- Enable in **Authentication** -> **OAuth Server** dashboard
- MCP clients self-register automatically
- **Security warning:** Any MCP client can register. Safeguards needed:
  - Require user approval
  - Monitor registered clients
  - Validate redirect URIs from trusted domains only

### Token Handling
MCP servers send Supabase-issued access tokens when making API requests on behalf of users. These are standard Supabase JWTs with `client_id` claim -- same validation as any OAuth client.

### Security Considerations
- **Always require explicit user approval** for MCP clients
- Display: agent capabilities, client name/description, requested scopes
- Provide denial option
- Enable later access revocation via `supabase.auth.oauth.revokeGrant()`

### Troubleshooting
| Problem | Solutions |
|---------|-----------|
| OAuth discovery failed | Verify OAuth 2.1 enabled; check `/.well-known` returns valid JSON; ensure project URL accessible |
| Dynamic registration 403/404 | Enable in settings; validate redirect URIs are complete URLs; check rate limiting |
| Token exchange `invalid_grant` | Code expired (10 min limit); code_verifier mismatch; redirect_uri mismatch; wrong client_id |
| RLS blocks MCP access | Check RLS includes `client_id`; verify user permissions; test with service role key |

---

## 5. Token Security & RLS

### Critical Concept
**OAuth scopes != database access control.** Scopes (`openid`, `email`, `profile`, `phone`) only control ID token/UserInfo data. Use **RLS policies** to control database table access per OAuth client.

### The `client_id` Claim
Every OAuth access token includes `client_id` (UUID of the OAuth client). This enables per-client RLS differentiation.

### Extracting Claims in RLS
```sql
-- Get client_id from token
(auth.jwt() ->> 'client_id')

-- Check if token is from an OAuth client (vs direct session)
(auth.jwt() ->> 'client_id') IS NOT NULL

-- Check specific client
(auth.jwt() ->> 'client_id') = 'mobile-app-client-id'
```

### RLS Policy Patterns

#### Pattern 1: Single Client Full Access
```sql
CREATE POLICY "Mobile app can access user data"
ON user_data FOR ALL
USING (
  auth.uid() = user_id AND
  (auth.jwt() ->> 'client_id') = 'mobile-app-client-id'
);
```

#### Pattern 2: Multiple Clients Read-Only
```sql
CREATE POLICY "Third-party apps can read profiles"
ON profiles FOR SELECT
USING (
  auth.uid() = user_id AND
  (auth.jwt() ->> 'client_id') IN (
    'analytics-client-id',
    'reporting-client-id',
    'dashboard-client-id'
  )
);
```

#### Pattern 3: Block OAuth from Sensitive Data
```sql
CREATE POLICY "OAuth clients cannot access payment info"
ON payment_methods FOR ALL
USING (
  auth.uid() = user_id AND
  (auth.jwt() ->> 'client_id') IS NULL  -- Only direct sessions
);
```

#### Pattern 4: Client-Specific Data Subsets
```sql
CREATE POLICY "Analytics reads summaries"
ON user_metrics FOR SELECT
USING (
  auth.uid() = user_id AND
  (auth.jwt() ->> 'client_id') = 'analytics-client-id'
);
```

#### Pattern 5: Direct Users vs OAuth Clients
```sql
-- Direct users: full access
CREATE POLICY "Direct users full access"
ON user_data FOR ALL
USING (auth.uid() = user_id AND (auth.jwt() ->> 'client_id') IS NULL);

-- OAuth clients: read only
CREATE POLICY "OAuth clients read only"
ON user_data FOR SELECT
USING (auth.uid() = user_id AND (auth.jwt() ->> 'client_id') IS NOT NULL);
```

#### Pattern 6: Restrictive Layering
```sql
CREATE POLICY "Restrict OAuth clients"
ON sensitive_data AS RESTRICTIVE FOR ALL TO authenticated
USING ((auth.jwt() ->> 'client_id') IS NULL);
```

### Multi-Platform Example
```sql
-- Web app: Full access
CREATE POLICY "Web app full access"
ON profiles FOR ALL
USING (
  auth.uid() = user_id AND
  ((auth.jwt() ->> 'client_id') = 'web-app-client-id' OR (auth.jwt() ->> 'client_id') IS NULL)
);

-- Mobile: Read-only
CREATE POLICY "Mobile reads profiles"
ON profiles FOR SELECT
USING (auth.uid() = user_id AND (auth.jwt() ->> 'client_id') = 'mobile-app-client-id');

-- Third-party: Public data only
CREATE POLICY "Integration reads public data"
ON profiles FOR SELECT
USING (auth.uid() = user_id AND (auth.jwt() ->> 'client_id') = 'integration-client-id' AND is_public = true);
```

### Testing Policies
```sql
SET request.jwt.claims = '{"sub":"test-user-uuid","role":"authenticated","client_id":"test-client-id"}';
SELECT * FROM user_data WHERE user_id = 'test-user-uuid';
RESET request.jwt.claims;
```

### Auditing Active Clients
```sql
SELECT oc.client_id, oc.name, oc.created_at, COUNT(DISTINCT s.user_id) as active_users
FROM auth.oauth_clients oc
LEFT JOIN auth.sessions s ON s.client_id = oc.client_id
WHERE s.created_at > NOW() - INTERVAL '30 days'
GROUP BY oc.client_id, oc.name, oc.created_at;
```

### Custom Access Token Hooks
Trigger for ALL token issuance (including OAuth). Use `client_id` or `authentication_method` to differentiate:
- Modify `aud` claim per client
- Add custom claims (`read_only: true`, `platform: mobile`)
- Inject metadata (agent names, retention limits)

### Security Best Practices
1. **Least Privilege** -- Minimum required permissions per client
2. **Separate Policies** -- Dedicated policies for OAuth clients
3. **Regular Audits** -- Monitor active clients and access patterns
4. **Use `AS RESTRICTIVE`** to layer additional constraints on top of permissive policies

---

## 6. FastMCP Integration

FastMCP provides a streamlined way to build MCP servers with built-in Supabase Auth.

### Server Setup (Python)
```python
from fastmcp import FastMCP
from fastmcp.server.auth.providers.supabase import SupabaseProvider

auth = SupabaseProvider(
    project_url="https://abc123.supabase.co",
    base_url="http://localhost:8000",
)

mcp = FastMCP("Supabase Protected Server", auth=auth)

@mcp.tool
def protected_tool(message: str) -> str:
    """This tool requires authentication."""
    return f"Authenticated user says: {message}"
```

### Run
```bash
fastmcp run server.py --transport http --port 8000
```

### Client
```python
async with Client("http://localhost:8000/mcp", auth="oauth") as client:
    result = await client.call_tool("protected_tool", {"message": "Hello!"})
```

### Production
```python
auth = SupabaseProvider(
    project_url=os.environ["SUPABASE_PROJECT_URL"],
    base_url=os.environ.get("BASE_URL", "https://your-server.com"),
)
```

---

## 7. Relevance to Monkey1 Project

### Current MCP Auth (Bearer Token)
Currently `mcp-browser-http-server` uses simple bearer token auth (`MCP_BROWSER_HTTP_SERVER_TOKEN`). This is a static shared secret.

### What Supabase OAuth 2.1 Enables
Each monkey-project could be registered as an OAuth client:
- **monkey1** -> client_id: `<uuid>`, type: confidential
- **monkey2** -> client_id: `<uuid>`, type: confidential
- etc.

### Benefits for Monkey1
1. **Per-user authentication** -- MCP requests are on behalf of specific users, not just "bearer token valid"
2. **RLS integration** -- Database access automatically scoped per user AND per client
3. **Token rotation** -- No more static bearer tokens
4. **Audit trail** -- Know which client accessed what data for whom
5. **User consent** -- Users approve which AI agents can access their data
6. **Standard protocol** -- MCP clients auto-discover auth config via `.well-known`

### Migration Path
1. Enable OAuth 2.1 Server on the Supabase project
2. Switch JWT signing from HS256 to RS256/ES256
3. Build consent page in the frontend
4. Register `mcp-browser-http-server` as a confidential OAuth client
5. Update MCP server to validate OAuth tokens instead of bearer tokens
6. Add RLS policies with `client_id` checks
7. Optionally enable dynamic client registration for future MCP clients

### For `mcp-browser-http-server` Specifically
- Replace bearer token auth with OAuth 2.1 token validation
- Use `jose` library to verify JWTs against Supabase JWKS endpoint
- Extract `client_id` + `user_id` from token for per-user-per-client authorization
- RLS policies in Supabase would automatically scope data access

### For the Browser Extension
- The extension would go through the OAuth flow to get tokens
- User approves the extension as an MCP client
- Tokens auto-refresh via the refresh token flow
- Existing token refresh mechanism (`background/token-refresh.ts`) could be adapted

---

## 8. Limitations & Requirements

### Limitations
1. **Custom scopes not supported** -- Only `openid`, `email`, `profile`, `phone`
2. **No `client_credentials` grant** -- Cannot do machine-to-machine without user involvement
3. **No `password` grant** -- Must use authorization code flow
4. **Redirect URIs must be exact** -- No wildcards or patterns
5. **Authorization code expires in 10 minutes** and is single-use
6. **Beta status** -- Feature is still in beta
7. **supabase-js NOT used for OAuth server flows** -- Custom implementation required for client-side code

### Requirements
1. **RS256/ES256 signing required** for OIDC ID tokens (HS256 will fail)
2. **Must build custom consent UI** -- Supabase does not provide a default
3. **Supabase CLI v2.54.11+** for local development
4. **Dynamic registration security** -- If enabled, any client can register; needs safeguards

### Key Technical Details
- Access tokens: Standard Supabase JWTs + `client_id` claim
- Token lifetime: 3600 seconds (1 hour) default
- ID token lifetime: 1 hour
- Refresh tokens: May be rotated (always update stored tokens)
- PKCE: SHA-256 only (`code_challenge_method=S256`)
- Code verifier: 43-128 characters
- Content type: `application/x-www-form-urlencoded` for token exchange (NOT JSON)

### API Surface (New `supabase.auth.oauth.*` methods)
- `supabase.auth.oauth.getAuthorizationDetails(authorization_id)` -- Get client info for consent
- `supabase.auth.oauth.approveAuthorization(authorization_id)` -- Approve access
- `supabase.auth.oauth.denyAuthorization(authorization_id)` -- Deny access
- `supabase.auth.oauth.getUserGrants()` -- List authorized apps
- `supabase.auth.oauth.revokeGrant(clientId)` -- Revoke app access
