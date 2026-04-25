# Stripe Configuration for CRM7

## Platform Type
**CRM7 is a web-based application**, not a React Native/Expo mobile app. This means:
- ✅ No Android/iOS native builds
- ✅ No ProGuard/R8 minification (uses Terser for web)
- ✅ No native Stripe SDK dependencies
- ✅ Server-side Stripe API integration via Supabase Edge Functions

## Current Stripe Integration

### Architecture
CRM7 uses **server-side Stripe integration** through Supabase Edge Functions:

```
Web Client → Supabase Edge Function → Stripe API → Payment Processing
```

### Implementation Location
**File:** `supabase/functions/create-subscription/index.ts`

The Stripe integration handles:
- Subscription plan creation (Basic, Professional, Enterprise)
- Checkout session management
- Customer email association
- Metadata tracking

### Required Environment Variables

#### Production (Vercel)
Set these in Vercel Dashboard → Project Settings → Environment Variables:
```bash
STRIPE_SECRET_KEY=sk_live_... # Your Stripe secret key
```

#### Development (Supabase Local)
Set in `supabase/.env.local`:
```bash
STRIPE_SECRET_KEY=sk_test_... # Your Stripe test key
```

## Why Android/React Native Configurations Don't Apply

The problem statement mentions:
- ❌ R8 minification issues - **Not applicable** (web app uses Terser)
- ❌ ProGuard rules - **Not applicable** (no Android build)
- ❌ `@stripe/stripe-react-native` - **Not used** (web app)
- ❌ EAS Build configuration - **Not applicable** (no Expo setup)
- ❌ Android Gradle files - **Don't exist** (web-only)

### Web Build Optimization Instead

CRM7 uses Vite with Terser for production optimization:

**File:** `vite.config.ts`
```typescript
{
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 3,
        drop_console: true,
        drop_debugger: true,
        unsafe: false, // Conservative for compatibility
        unsafe_math: false,
        keep_infinity: true
      }
    }
  }
}
```

## Stripe API Implementation Details

### Subscription Plans
```typescript
const planConfig = {
  basic: {
    amount: 2900,      // $29.00 USD
    monthlyLimit: 25
  },
  professional: {
    amount: 7900,      // $79.00 USD
    monthlyLimit: 100
  },
  enterprise: {
    amount: 19900,     // $199.00 USD
    monthlyLimit: 500
  }
}
```

### Checkout Session Creation
The Edge Function creates a Stripe Checkout Session with:
- Payment method: Card only
- Mode: Subscription
- Customer email capture
- Success/cancel URL redirects
- Metadata for plan tracking

### Error Handling
```typescript
if (!stripeResponse.ok) {
  const errorText = await stripeResponse.text();
  console.error('Stripe API error:', errorText);
  throw new Error(`Stripe API error: ${stripeResponse.status}`);
}
```

## White Page Prevention

CRM7 has comprehensive white page prevention (see `WHITEPAGE_FIX_SUMMARY.md`):
- Chrome extension error suppression
- Promise rejection handling
- Startup phase monitoring
- Environment validation

These mechanisms ensure the app loads even if Stripe-related errors occur.

## Testing Stripe Integration

### Local Development
1. Get Stripe test keys from dashboard.stripe.com
2. Set `STRIPE_SECRET_KEY` in Supabase environment
3. Deploy Edge Function:
   ```bash
   npx supabase functions deploy create-subscription
   ```
4. Test with Stripe test card: `4242 4242 4242 4242`

### Production Deployment
1. Set live Stripe keys in Vercel environment variables
2. Verify Edge Function is deployed to Supabase production
3. Test checkout flow end-to-end
4. Monitor Stripe dashboard for webhook events

## Common Issues & Solutions

### Issue: Stripe API Error 401
**Cause:** Invalid or missing STRIPE_SECRET_KEY
**Solution:** Verify environment variable is set correctly in Vercel/Supabase

### Issue: CORS Errors
**Cause:** Missing CORS headers in Edge Function
**Solution:** Already configured in `create-subscription/index.ts`:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH'
};
```

### Issue: White Page After Payment
**Cause:** Redirect URL misconfigured
**Solution:** Verify success_url and cancel_url in checkout session creation

## Security Best Practices

✅ **Implemented:**
- Server-side API key handling (never exposed to client)
- HTTPS-only Stripe API communication
- Environment-based key management
- CORS configuration for web security

❌ **Not Required** (Mobile-only):
- ProGuard obfuscation
- Native code signing
- APK/AAB hardening
- Push provisioning security

## Future Mobile Support

If CRM7 is converted to a React Native app in the future, then:
- Install `@stripe/stripe-react-native`
- Configure Android ProGuard rules
- Set up iOS/Android native builds
- Implement platform-specific payment flows

Until then, the current web-based Stripe integration is appropriate and secure.

## References

- **Stripe Documentation:** https://stripe.com/docs/api
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Current Implementation:** `supabase/functions/create-subscription/index.ts`
- **White Page Prevention:** `WHITEPAGE_FIX_SUMMARY.md`
- **Vercel Deployment:** `docs/deployment/VERCEL_DEPLOYMENT.md`
