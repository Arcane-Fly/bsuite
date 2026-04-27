# CRM7 Platform Clarification

> **Important:** CRM7 is a **web application**, not a mobile app.

## Quick Reference

| Question | Answer |
|----------|--------|
| Is CRM7 a React Native app? | ❌ No |
| Does CRM7 have Android builds? | ❌ No |
| Does CRM7 use native mobile SDKs? | ❌ No |
| Is CRM7 a web application? | ✅ Yes |
| Does CRM7 work on mobile browsers? | ✅ Yes (responsive design) |

## Platform Architecture

### What CRM7 Is
```
Web Application Stack:
├── Frontend: React 18 + Vite
├── Styling: Tailwind CSS
├── Backend: Supabase (PostgreSQL + Edge Functions)
├── Deployment: Vercel (web hosting)
└── Build Tool: Vite with Terser minification
```

**Access Method:** Web browser (desktop or mobile)
**URL:** https://crm7.vercel.app/

### What CRM7 Is Not
```
❌ React Native app
❌ Expo managed app
❌ Android native app (APK/AAB)
❌ iOS native app (IPA)
❌ Electron desktop app
```

## Common Misconceptions

### "I see Android/iOS build errors"
**Reality:** CRM7 doesn't have Android/iOS builds. If you're seeing such errors, they're from a different project.

### "Stripe push provisioning is failing"
**Reality:** CRM7 uses server-side Stripe API integration. Push provisioning is an Android-specific feature that doesn't apply to web apps.

### "R8/ProGuard minification is broken"
**Reality:** CRM7 uses Terser for web minification. R8/ProGuard are Android tools that aren't relevant to web apps.

### "Need to configure EAS Build"
**Reality:** EAS Build is for Expo apps. CRM7 uses Vercel for web deployment.

## Mobile Support

### Current Implementation
**Responsive Web Design:**
- ✅ Works on mobile browsers (Safari, Chrome)
- ✅ Responsive layouts for all screen sizes
- ✅ Touch-friendly UI components
- ✅ Mobile-optimized performance

**Not Native Mobile:**
- ❌ No app store distribution
- ❌ No native device features (camera, GPS, push notifications)
- ❌ No offline functionality
- ❌ No native performance optimizations

### Future Mobile App
If native mobile apps are desired in the future:
1. Create new React Native project
2. Migrate UI components
3. Set up Android/iOS builds
4. Configure native SDKs
5. Submit to app stores

**See:** `docs/troubleshooting/ANDROID_BUILD_NOT_APPLICABLE.md` for migration guide

## Build & Deployment

### Current (Web)
```bash
# Build command
pnpm build

# Output
dist/
├── index.html
├── assets/*.js
└── assets/*.css

# Deployment
Vercel automatically builds and deploys
```

### Not Supported (Mobile)
```bash
# These commands won't work:
❌ eas build --platform android
❌ expo build:android
❌ cd android && ./gradlew assembleRelease
❌ xcodebuild -workspace ios/CRM7.xcworkspace
```

## Stripe Integration

### Current Implementation
**Server-Side API Integration:**
```
User → Web Browser → Supabase Edge Function → Stripe API
```

**Location:** `supabase/functions/create-subscription/index.ts`

**Method:** Direct Stripe Checkout API calls

**Security:** API keys stored server-side (Supabase environment)

### Not Used
❌ `@stripe/stripe-react-native` - Mobile SDK
❌ Native payment flows
❌ Push provisioning
❌ Tap-to-pay features

## Error Resolution

### If You See "Android Build Failed"
**Action:** Verify you're looking at the correct repository. CRM7 doesn't have Android builds.

### If You See "Stripe SDK Errors"
**Action:** Check Supabase Edge Function logs, not mobile SDK documentation.

### If You See "ProGuard/R8 Errors"
**Action:** These are Android tools. For CRM7, check Vite/Terser configuration instead.

### If You See "White Page"
**Action:** See `WHITEPAGE_FIX_SUMMARY.md` for web-specific solutions (Chrome extensions, bundle loading).

## Documentation Index

### Web Application Docs (Relevant to CRM7)
- ✅ `docs/deployment/VERCEL_DEPLOYMENT.md` - Web deployment
- ✅ `docs/deployment/STRIPE_CONFIGURATION.md` - Stripe setup
- ✅ `docs/troubleshooting/WEB_BUILD_OPTIMIZATION.md` - Build config
- ✅ `WHITEPAGE_FIX_SUMMARY.md` - Error prevention

### Mobile App Docs (Not Relevant to CRM7)
- ❌ Android build configuration
- ❌ iOS build configuration
- ❌ React Native setup
- ❌ Expo/EAS configuration
- ❌ ProGuard/R8 rules

## Technology Stack

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI
- **Routing:** Wouter (web routing)
- **State:** React Query

### Backend
- **Database:** Supabase (PostgreSQL)
- **API:** Supabase Edge Functions (Deno)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage

### Deployment
- **Hosting:** Vercel (web platform)
- **Edge Functions:** Supabase (serverless)
- **CDN:** Vercel Edge Network

### Not Used
- ❌ React Native
- ❌ Expo
- ❌ Android SDK
- ❌ iOS SDK
- ❌ Native modules

## Testing & Development

### Web Development
```bash
# Development server
pnpm dev
# → Opens web browser at localhost:3001

# Production build
pnpm build
# → Generates dist/ folder with web assets

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### Mobile Development (Not Supported)
```bash
# These won't work:
❌ expo start
❌ react-native run-android
❌ react-native run-ios
```

## Summary

**CRM7 Platform:**
- ✅ Web application (React + Vite)
- ✅ Accessible via web browsers
- ✅ Responsive for mobile browsers
- ✅ Deployed to Vercel
- ✅ Uses Supabase for backend

**CRM7 is NOT:**
- ❌ React Native app
- ❌ Android/iOS native app
- ❌ Expo managed app
- ❌ Requires Android Studio or Xcode

**For Android/iOS-specific issues:**
- They don't apply to CRM7
- See `docs/troubleshooting/ANDROID_BUILD_NOT_APPLICABLE.md`
- Consider if you're looking at the wrong repository

**For CRM7 web issues:**
- See web-specific documentation
- Check Vite/Vercel configuration
- Review Supabase Edge Functions

---

**Last Updated:** January 2025  
**Platform Type:** Web Application  
**Framework:** React + Vite  
**Deployment:** Vercel
