# BSuite Mobile

Companion mobile app for the BSuite platform, providing on-the-go access to GTO workflow features.

## Status

**Experimental / Early Development** -- scaffolded with core screens and mock data, not yet connected to production APIs. Last significant activity: March 2026.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 55 (`expo-router` for file-based routing) |
| Language | TypeScript (strict mode) |
| UI | React Native 0.83, NativeWind 4 (Tailwind CSS for RN) |
| State | Zustand 5 |
| Validation | Zod 4 |
| Backend | Supabase JS v2 (shared with web apps) |
| Icons | Lucide React Native |
| Animations | React Native Reanimated 4, Gesture Handler 2 |
| Navigation | Expo Router (file-based, tab + stack layouts) |

## Native Capabilities

Configured via `app.json` plugins:

- **Camera** -- document capture and WHS incident photos
- **Image Picker** -- attach documents and images
- **Push Notifications** -- task and alert delivery
- **Biometric Auth** -- `expo-local-authentication` (fingerprint/face)
- **Secure Storage** -- `expo-secure-store` for tokens

## Project Structure

```
mobile/
  app/
    _layout.tsx          # Root layout (auth gate + tab navigator)
    (auth)/              # Login and forgot-password screens
    (tabs)/              # Main tab screens
      index.tsx          # Dashboard
      apprentices.tsx    # Apprentice list
      timesheets.tsx     # Timesheet management
      whs.tsx            # WHS incidents
      more.tsx           # Settings and additional features
    apprentice/
      [id].tsx           # Apprentice detail (dynamic route)
  components/
    ApprenticeRow.tsx
    ErrorBoundary.tsx
    MetricCard.tsx
    TimesheetCard.tsx
    WHSIncidentCard.tsx
    ui/                  # Shared UI primitives
  lib/
    constants.ts         # App-wide constants
    mock-data.ts         # Seed/demo data (not connected to Supabase yet)
    supabase.ts          # Supabase client configuration
  stores/
    appStore.ts          # App-level state (theme, onboarding)
    authStore.ts         # Authentication state
  types/
    index.ts             # Shared TypeScript type definitions
```

## Running Locally

Prerequisites: Node 24, pnpm, Expo CLI (`npx expo`), and either iOS Simulator (macOS) or Android Emulator.

```bash
cd mobile
pnpm install

# Start Expo dev server (scan QR with Expo Go, or press i/a for simulator)
pnpm start

# Platform-specific
pnpm ios       # iOS Simulator
pnpm android   # Android Emulator
pnpm web       # Web browser (via react-native-web)
```

## Bundle Identifiers

| Platform | Identifier |
|----------|-----------|
| iOS | `au.com.bsuite.mobile` |
| Android | `au.com.bsuite.mobile` |

## Theme

Uses the D2C Neon Electric dark theme (`#0a0e1a` background, `#2563eb` primary) consistent with the web apps, applied via NativeWind/Tailwind.

## Relationship to Web Apps

This mobile app shares the same Supabase backend and authentication as the five BSuite web applications. It is intended to complement CRM7 and R80.3 for field-based GTO workflows (timesheet approval, WHS incident reporting, apprentice check-ins) but does not replicate the full web feature set.
