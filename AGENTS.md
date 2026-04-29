# BSuite — Agent & Developer Guide

## Project Overview

BSuite is a multi-project workspace of six web applications sharing Supabase, TypeScript/React, and unified standards.

### Projects

| Project | Role | Tech | PM | Deployment |
|---------|------|------|----|------------|
| **business-suite-unified** | Portal & entry point | React + Vite + Stripe | pnpm | Vercel |
| **crm7** | CRM with AI insights | React + Vite + AI SDK | pnpm | Vercel |
| **conduit** | Recruitment ATS | Next.js 16 App Router | pnpm | Vercel |
| **braden** | Corporate site (braden.com.au) | React + Vite | pnpm | Vercel/Railway |
| **R80.3** | Wage calculator | React + Vite | pnpm | Vercel |
| **throughput** | Idea management platform (Groq AI) | React + Vite | pnpm | Vercel |

### Common Stack

- **Frontend:** React 18/19, TypeScript (strict), TailwindCSS
- **UI:** Radix UI + Lucide icons
- **State:** Zustand
- **Forms:** React Hook Form + Zod
- **Database:** Supabase (Auth, DB, Storage, Edge Functions)
- **Testing:** Vitest (Vite projects), Jest (Next.js)

---

## Quick Start

```bash
cd <project-directory>

# Install (pnpm is standard across all projects)
pnpm install

# Development
pnpm dev        # Start dev server
pnpm build      # Production build
pnpm test       # Run tests
pnpm lint       # Lint check
pnpm typecheck  # Type checking
```

Environment variables: copy `.env.example` to `.env.local` and fill in Supabase credentials.

### pnpm Lockfile Generation

**CRITICAL**: Never run `pnpm install` from within the bsuite directory tree when updating a project's lockfile. The bsuite `pnpm-workspace.yaml` (scoped to `packages/*`) causes pnpm to embed workspace-relative paths (`..`) into the lockfile. Vercel clones only the individual project repo — `..` paths don't exist there, causing `ERR_PNPM_OUTDATED_LOCKFILE`.

Always regenerate lockfiles from an isolated directory **outside** the bsuite tree:

```bash
# Example for crm7 — same pattern for all projects
mkdir ~/crm7_lockgen
cp crm7/package.json ~/crm7_lockgen/
cd ~/crm7_lockgen && pnpm install
cp ~/crm7_lockgen/pnpm-lock.yaml crm7/pnpm-lock.yaml
rm -rf ~/crm7_lockgen
```

The correct lockfile has `.:` as the only importer. A broken workspace lockfile will have `..` or `../packages/*` as importers.

---

## Quality Standards

All standards are documented in `docs/20260227-contributing-standards-guide-v1.00W.md`. Key rules:

### Code

- TypeScript strict mode, no untyped `any`
- No-Regex-by-Default: only anchored literals ≤30 chars. Use parsers for structured data.
- ESLint + Prettier enforced
- DRY: barrel exports, centralized handlers, shared Zod schemas

### Commits

Conventional Commits: `type(scope): description`

```bash
feat(crm7): add AI-powered contact scoring
fix(conduit): resolve talent pool filter persistence
docs(r80): update Fair Work API reference
```

### Testing

- 70% minimum coverage for critical paths
- Co-located test files: `*.test.ts` / `*.spec.ts`
- Unit + component + integration tests

### Documentation

- Naming: `YYYYMMDD-name-type-vMAJOR.MINOR[STATUS].md`
- Status codes: W=Working, D=Draft, R=Review, A=Approved, F=Frozen
- Every `docs/` folder has a README.md index
- New features documented before merging

---

## Theme System

### D2C Neon Electric (business-suite-unified, crm7, conduit, R80.3)

Full spec in `docs/20260228-d2c-theme-specification-v1.00W.md`. Key colors:

| Color | Hex | Use |
|-------|-----|-----|
| Electric Blue | `#2563eb` | Primary actions |
| Electric Cyan | `#00cec9` | Accents, borders |
| Electric Green | `#22c55e` | Success |
| Electric Coral | `#ff4757` | Alerts, destructive |
| Electric Yellow | `#fdcb6e` | Warnings |

Dark mode: deep navy `#0a0e1a`. Light mode: off-white `#f2f2f2`.
Typography: Inter (body), JetBrains Mono (code).

### Corporate Branding (braden only)

| Color | Hex | Use |
|-------|-----|-----|
| Braden Red | `#ab233a` | Primary |
| Braden Dark Red | `#811a2c` | Secondary headers |
| Braden Gold | `#cbb26a` | Accent |
| Braden Navy | `#2c3e50` | Business elements |

Typography: Montserrat (headings), Inter (body).
See braden project docs for full brand guide.

---

## Architecture

### DRY One-Shot Pattern

Each entity has a single owning app for create/edit. See `docs/DRY-ONE-SHOT-ARCHITECTURE.md`.

### Database

- Supabase shared across all projects
- Schema changes via versioned migrations only
- Expand → Migrate → Contract pattern
- Row Level Security on all tables
- **Production migrations land via PR only** — **NEVER** run `supabase db push` from a local checkout against `tuybltdrdefjblnplpqo`. Migrations apply via (a) merged PR + CI/CD, OR (b) Supabase MCP `apply_migration` (audit-tracked). Direct local push creates git↔production history drift — see `20260428085641_repair_tenant_page_layouts_contract` for a documented case where local push happened pre-PR and required follow-up file preservation in PR #218 (drop migration). When using MCP `apply_migration`, the recorded version timestamp is auto-generated; align the recorded `name` with the file path (e.g., name=`20260502000000_drop_tenant_page_layouts`) so future `supabase db push` from a fresh checkout sees the migration as applied.
- **`client_id` RLS scoping**: BSuite apps are first-party trusted OAuth clients sharing a single Supabase project and user-base. Per-`client_id` DB isolation is **intentionally absent** — all authenticated users from any registered BS OAuth client get user-level access (`auth.uid() = user_id`). The `payment_methods` table has a named policy (`oauth_client_scoped_access`) documenting this decision. If per-client isolation is ever required, add a `client_id` column and a `USING ((auth.jwt() ->> 'client_id') = client_id)` guard. (See migration `20260415120000_rls_client_id_payment_methods.sql`.)

### Authentication & OAuth

Full details in `docs/AUTH-MAP.md`. Key facts every agent must know:

**Supabase Project:** `tuybltdrdefjblnplpqo`

**Two auth mechanisms coexist:**

| Mechanism | Purpose | Used By |
|-----------|---------|---------|
| **Supabase Native Auth** | Email/password + Google/Azure AD OAuth via GoTrue | All 6 apps |
| **BS OAuth 2.1 PKCE** | SSO across apps — BSU is the OAuth server, others are clients | CRM7, R80.3, Braden, Throughput (as clients) |

**Conduit** uses Supabase Native Auth only (via `@supabase/ssr`). It does **not** participate in BS OAuth.

#### OAuth Client Registry

| Client App | Client ID | Production Domain | Dev Preview Domain | Redirect URI |
|------------|-----------|-------------------|--------------------|--------------|
| **CRM7** | `30f76744-3e0b-40bf-abb8-8c587389802e` | `crm.crm7.app` | `d.crm.crm7.app` | `{origin}/auth/callback` |
| **R80.3** | `5d804d20-cd1b-4724-9107-86d2a9e51e09` | `r8.crm7.app` | `d.r8.crm7.app` | `{origin}/auth/callback` |
| **Braden** | `dcb7af18-254a-4946-b94d-5c606b01fc3f` | `www.braden.com.au` | `d.braden.com.au` | `{origin}/auth/callback` |
| **Throughput** | `35f0db49-ef62-4115-baba-7b961f034cc3` | `ideas.crm7.app` | `d.ideas.crm7.app` | `{origin}/auth/callback` |

**OAuth Server:** BSU (`suite.crm7.app` / `d.suite.crm7.app` for dev preview) — consent screen at `/oauth/consent`

#### Cross-Domain Session Sharing (Cookie SSO)

BSU, CRM7, R80.3, and Throughput share a Supabase session via `cookieStorage` with `domain=.crm7.app` and key `business_suite_auth`. This enables seamless SSO across all `.crm7.app` subdomains.

- **BSU** (`suite.crm7.app`): Sets the cookie — `src/lib/supabase.ts`
- **CRM7** (`crm.crm7.app`): Reads the cookie — `src/lib/supabase.ts`
- **R80.3** (`r8.crm7.app`): Reads the cookie — `src/services/supabaseClient.ts`
- **Throughput** (`ideas.crm7.app`): Reads the cookie — `src/lib/supabase.ts`
- **Braden** (`www.braden.com.au`): ❌ Different TLD — uses BS OAuth 2.1 for SSO instead
- **Conduit** (`conduit.crm7.app`): Server-managed cookies via `@supabase/ssr` (no cross-domain)

#### Preview Deployments (`d.*` aliases)

Each Vercel project has a custom **development-branch** domain assigned in addition to the auto-generated Vercel preview URL. This makes preview-deployment auth testing work end-to-end without per-PR Supabase allowlist updates.

| App | Production | Development branch preview |
|-----|-----------|----------------------------|
| BSU | `suite.crm7.app` | `d.suite.crm7.app` |
| CRM7 | `crm.crm7.app` | `d.crm.crm7.app` |
| R80.3 | `r8.crm7.app` | `d.r8.crm7.app` |
| Conduit | `conduit.crm7.app` | `d.conduit.crm7.app` |
| Throughput | `ideas.crm7.app` | `d.ideas.crm7.app` |
| Braden | `www.braden.com.au` | `d.braden.com.au` |

**Cookie SSO inherits automatically** for all `.crm7.app` subdomains — login on production CRM7 → any `d.<app>.crm7.app` is auto-authenticated via the shared `business_suite_auth` cookie. Braden's preview is on a different TLD (`.braden.com.au`) and uses BS OAuth 2.1 (same pattern as production).

**Supabase Auth URL Configuration** — registered redirect URIs for these previews (in addition to production URLs):

- `d.suite.crm7.app/auth/callback` + `d.suite.crm7.app/oauth/consent` (BSU is consent surface)
- `d.crm.crm7.app/auth/callback` + `d.crm.crm7.app/oauth/consent`
- `d.r8.crm7.app/auth/callback` + `d.r8.crm7.app/oauth/consent`
- `d.ideas.crm7.app/auth/callback` + `d.ideas.crm7.app/oauth/consent`
- `d.conduit.crm7.app/auth/callback` (no `/oauth/consent` — conduit doesn't host consent)
- `d.braden.com.au/auth/callback` (no `/oauth/consent` — braden uses BS OAuth, different TLD)

**ADR-0004 doctrine**: this AGENTS.md is the SSoT for the Supabase redirect-URI allowlist. Any new preview alias requires (1) adding the URL to the table above, (2) adding `/auth/callback` (and `/oauth/consent` if a consent surface) to Supabase Auth URL Configuration, (3) PR documenting both additions.

**Feature-branch previews** (auto-generated `<app>-git-<branch>-…vercel.app`) are **NOT** in the allowlist. Authenticated testing of a feature branch requires either: (a) merging to `development` first to test via the `d.*` alias, OR (b) a one-off PR adding the specific feature-branch URL to Supabase Auth URL Configuration. Do not let the allowlist balloon — prefer (a).

#### Cookie Hardening (Applied)

- **Chunked storage**: Values >3 500 bytes split across `key.0`, `key.1`, … cookies
- **`Secure` flag**: Only on HTTPS (disabled for localhost dev)
- **`max-age`**: 30 days (aligned with Supabase refresh token lifetime)
- **`SameSite=Lax`**: Standard cross-site protection

#### BS OAuth PKCE Flow (Summary)

1. Client generates PKCE `code_verifier` + `code_challenge`, stores `state` in `sessionStorage`
2. Redirect to Supabase `/auth/v1/oauth/authorize` with client ID + challenge
3. Supabase redirects to BSU `/oauth/consent` — user approves/denies
4. Auth code returned to client's `/auth/callback`
5. Client exchanges code + verifier at `/auth/v1/oauth/token`
6. Client verifies JWT via JWKS (`jose` library, RS256/ES256)
7. Tokens stored in localStorage: `bs_access_token`, `bs_refresh_token`, `bs_user`, `bs_id_token`

#### Key Auth Files Per Project

| Project | Supabase Client | OAuth Client | Auth Context/Store | Callback |
|---------|----------------|--------------|-------------------|----------|
| **BSU** | `src/lib/supabase.ts` | N/A (is the server) | `src/contexts/AuthContext.tsx` | `src/pages/auth/AuthCallback.tsx` |
| **CRM7** | `src/lib/supabase.ts` | `src/lib/business-suite-oauth.ts` | `src/contexts/AuthContext.tsx` | `src/pages/auth/callback.tsx` (dual) |
| **R80.3** | `src/services/supabaseClient.ts` | `src/lib/business-suite-oauth.ts` | `src/stores/authStore.ts` | `src/pages/AuthCallback.tsx` |
| **Braden** | `src/integrations/supabase/client.ts` | `src/lib/business-suite-oauth.ts` | `src/hooks/useAdminAuth.ts` | `src/pages/auth/AuthCallback.tsx` |
| **Throughput** | `src/lib/supabase.ts` | `src/lib/business-suite-oauth.ts` | `src/lib/auth/AuthProvider.tsx` | `src/pages/auth/AuthCallback.tsx` |
| **Conduit** | `src/lib/supabase/{client,server,middleware}.ts` | N/A | `src/middleware.ts` | `src/app/auth/callback/route.ts` |

#### Critical Auth Rules

1. **All `.crm7.app` Supabase clients MUST use `cookieStorage`** with `domain=.crm7.app` and `storageKey: 'business_suite_auth'` — this enables cookie SSO
2. **All Supabase clients MUST use `flowType: 'pkce'`** — implicit flow is deprecated
3. **Never duplicate the OAuth consent screen** — BSU is the only OAuth server. It was previously copied to Braden by mistake and deleted
4. **CRM7 callback is dual-purpose** — checks `sessionStorage.getItem('bs_oauth_state')` to distinguish BS OAuth from native Supabase PKCE
5. **BS OAuth tokens are NOT Supabase sessions** — they are separate token sets in localStorage. The two auth systems run in parallel.
6. **`startBSTokenRefresh()` is wired** in all 3 client apps — checks every 60s, refreshes 5min before expiry, clears tokens on failure
7. **Two OAuth providers are MANDATORY across the entire suite** — see section below. Never add a third provider (e.g. GitHub) without explicit owner instruction.

#### Mandatory OAuth Providers (TWO — Suite-Wide)

> **This is a hard constraint enforced across all apps. Regression is a critical bug.**

Every auth entry point in the BSuite (BSU `AuthForm.tsx`, CRM7 `LoginModal.tsx` + `SignupModal.tsx`, and any future app's login UI) **must** expose exactly the following two providers — no more, no less:

| Provider | Supabase ID | Status | Purpose |
|----------|------------|--------|----------|
| **Google** | `google` | ✅ Enabled | Corporate Google Workspace accounts |
| **Microsoft** | `azure` | ✅ Enabled | Corporate Azure AD / Microsoft 365 — **critical for B2B SSO across the suite**. Users and orgs sign in with their M365 identity; downstream integrations (email sending from corporate Azure mailboxes, Entra ID group sync, M365 calendar access) depend on this provider existing at every auth surface. Removing it breaks corporate org onboarding. |
| **GitHub** | `github` | ❌ Disabled | **Intentionally removed** — not appropriate for B2B use case. Disabled in Supabase. Button removed from all auth modals. **Never re-add without explicit owner instruction.** |

**Rules:**

- Both providers must be present in **both** Register and Sign In modals/forms — identical lists, always in sync
- The order is: Google → Microsoft
- If you modify any auth modal, verify the other modals in the same PR still show only these two providers
- LLMs often drop Microsoft (treating it as redundant with Google) or re-add GitHub (treating it as harmless). Both are wrong. Google + Microsoft only.
- Add a sync comment in every file that defines a provider list: `// IMPORTANT: Keep in sync with [other files] — exactly two providers (Google/Microsoft) are mandatory. GitHub is intentionally absent.`
- For OAuth 2.1 / OIDC / PKCE compliance: Microsoft uses the `azure` provider ID (Azure AD OIDC endpoint, full PKCE support). Never use implicit flow.
- The Supabase GitHub provider is disabled at the platform level — even if a button were added to the UI, it would fail. Do not attempt to re-enable it.

**Affected files (current):**

- `business-suite-unified`: `src/components/AuthForm.tsx`
- `crm7`: `src/components/LoginModal.tsx`, `src/components/SignupModal.tsx`
- Any new app added to the suite must follow this pattern from day one

---

## Google Cloud Authentication

**CRITICAL**: All Google API access MUST use Workload Identity Federation (WIF). Static service account keys are **BANNED**.

- **GCP Project:** `claritycrm-hpofn` (project number `111744121676`)
- **Service Account:** `firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com` (key-less — WIF only)
- **WIF Pool:** `supabase-edge-functions` (global, Supabase OIDC as IdP)
- **WIF Provider:** `supabase-auth` (trusts issuer `https://tuybltdrdefjblnplpqo.supabase.co/auth/v1`)
- **Auth flow:** Supabase JWT → Google STS token exchange → SA impersonation → short-lived access token
- **NEVER create or store service account JSON keys** — use WIF for all Google API access
- **Reference impl:** `crm7/supabase/functions/generate-document/index.ts`
- **Supabase secrets (non-sensitive metadata):** `GCP_PROJECT_NUMBER`, `GCP_WIF_POOL_ID`, `GCP_WIF_PROVIDER_ID`, `GCP_SA_EMAIL`

---

## Feature Protection

- Feature flags over hard deletions
- No downgrading feature status without human approval
- When unsure about a feature, **ask** — don't remove
- Protected files per project are listed in each `CONTRIBUTING.md`

---

## AI Implementation Standards

**Applies to all projects using Vercel AI SDK (`ai`, `@ai-sdk/react`).**

These rules exist because an agent shipped broken AI code that silently disabled all tool calls. Every rule here prevents a real bug.

### SDK Usage (prevents API hallucination)

1. **Always use `DefaultChatTransport`** — never `TextStreamChatTransport` (strips tool calls, usage info, finish reasons)
2. **Always use `toUIMessageStreamResponse()`** — never `toTextStreamResponse()` or `toDataStreamResponse()` (strips structured data)
3. **Always convert messages** — call `convertToModelMessages(messages)` before passing `UIMessage[]` to `streamText()`
4. **`UIMessage` content is in `parts[]`** — never access `.content` directly. Filter for `part.type === 'text'` and read `.text`
5. **When porting between projects**, verify every import path and type against the target project's installed SDK version — do not assume API surfaces match
6. **When in doubt, check the reference implementation** — CRM7's `useAIChat.ts` and `api/ai/chat.ts` are the canonical working examples

### Production Hardening (ships with the feature)

7. **`export const maxDuration = 30`** on all Vercel edge AI routes — default 10s is too short for streaming
8. **Rate limiting is mandatory** on all AI endpoints — wire `AI_CONFIG.rateLimits` into the route, return 429 with `Retry-After`
9. **Config must be wired** — if you define config (rate limits, quotas, feature flags), it must be consumed. Dead config is a bug.

### Verification Checklist (before marking AI work complete)

10. **TypeScript compiles** — run `pnpm typecheck` on the project
11. **Tool calls work** — verify transport + response method support tools
12. **Rate limiting returns 429** — verify the limiter is imported and called
13. **JSDoc matches code** — if docs say one method, code must use that same method

---

## Frontend Layout & Z-Index Standards

Applies to **all 5 apps** (BSU, CRM7, Conduit, Braden, R80.3). These rules exist because AI agents routinely reach for z-index hacks and magic pixel offsets when the real fix is a structural DOM/flexbox change. The three-prompt system below is the mandatory protocol.

### The 3-Prompt DOM Autopsy System

**Use this system before touching any layout, z-index, positioning, or sticky/fixed element across all 5 apps.** Running Prompt 1 first prevents the "CSS hack trap" — where an agent throws `z-index: 9999` or `position: absolute !important` at a symptom instead of fixing the root cause.

---

#### Prompt 1 — DOM Autopsy (always run first)

```
ROLE: You are a Staff Frontend Engineer and UI Architect. You are allergic to
hacky CSS patches, random z-index escalations, and !important overrides.
You fix root structural issues, not visual symptoms.

CONTEXT:
- Tech Stack: [React/Next.js | Tailwind CSS v4 | TypeScript]
- Current Issue: [describe the layout problem — e.g. "sidebar overlaps main content"]
- Relevant Components: [e.g. DashboardShell.tsx, AppSidebar.tsx, Header.tsx]
- State Management: [useState / Context / Zustand — whichever applies]

TASK — STRUCTURAL & LAYOUT TRACE:
1. Trace the Component Hierarchy starting from the common parent of the
   misbehaving elements. Map the exact DOM tree.
2. At each structural level, answer:
   - Positioning context? (Mixing fixed/absolute with static flow without
     compensating margins/padding?)
   - Where does State live? (Is sidebar-open state local when it should be lifted?)
   - Missing Flexbox or Grid orchestrator? (Siblings sizing themselves without
     a parent flex/grid managing remaining space?)
   - Stacking Context? (Missing backgrounds, z-index conflicts causing bleed-through?)
   - overflow trap? (sticky inside overflow:hidden is suppressed — check all ancestors)
3. Produce a NUMBERED LIST of structural breakpoints. For each:
   - Component / File and line number
   - Root Cause (e.g. "Main wrapper lacks flex-grow" or "overflow:hidden on
     ancestor suppresses sticky positioning")
   - Exact structural fix required (state lifting, flexbox wrapper, removing
     overflow:hidden, CSS transition change)

CONSTRAINTS:
- Do NOT suggest z-index hacks unless a proper stacking context is established
- Do NOT suggest absolute positioning to fix a flow layout problem
- Prioritise Flexbox/Grid structural fixes over manual margin/width math
- sticky requires a scrolling ancestor — verify no overflow:hidden between
  the sticky element and the scroll container
```

---

#### Prompt 2 — Responsive Sweep (feed Prompt 1 output as context)

```
ROLE: You are a Frontend QA Architect who specialises in finding edge-case bugs
that AI code generation leaves behind. You look for responsiveness breakdowns,
state desyncs, and accessibility traps.

CONTEXT: [Paste the breakpoint list from Prompt 1]

TASK — SCAN FOR HIDDEN FRONTEND FAILURES:
For each proposed fix, report CLEAN or list the exact risk found.

CATEGORY 1: RESPONSIVE & VIEWPORT BREAKAGE
- Does the fix break mobile screens? (flex row squishing to 0px on iPhone?)
- Missing media queries to convert sidebar to off-canvas drawer on small screens?
- Overflowing text/tables inside flex container? (missing min-w-0 or overflow-hidden
  on flex children)

CATEGORY 2: STATE DESYNC & PROP DRILLING
- If isExpanded state is lifted to Layout, does it cause unnecessary full-app re-renders?
- Animating composite properties (width/margin) that trigger heavy reflows?
  If so, is it optimised, or should we use a different approach?

CATEGORY 3: ACCESSIBILITY (A11y) & INTERACTION TRAPS
- If sidebar overlaps on mobile, does it trap focus?
- If a backdrop is added, does clicking it dismiss the sidebar?
- Transparent elements with pointer-events that block clicks on underlying content?
- Duplicate ARIA landmarks? (role=main on <main>, role=complementary on <aside>)
- sticky elements that scroll away on mobile — user loses nav access?

CATEGORY 4: TAILWIND / CSS CLASHES
- Conflicting utility classes on same element? (absolute + flex-1 together)
- Dynamic classes constructed unsafely? (string concatenation Tailwind compiler misses)
- overflow:hidden ancestors suppressing sticky positioning?
- min-h-screen vs h-screen — does the root container need to be bounded?

FORMAT: For each category, list findings with File, Risk, and Remediation.
Then provide a COMBINED, safe, production-ready code plan.
```

---

#### Prompt 3 — Visual Proof (after the agent provides code)

```
ROLE: You are a UI/UX Release Engineer. You do not trust code until it is
tested across multiple viewports and interaction states.

CONTEXT: [Paste the combined fix list from Prompts 1 and 2]

TASK — BUILD THE UI VERIFICATION PLAN:

1. THE FIX SUMMARY: The exact code change (file, before/after).

2. DESKTOP VERIFICATION (≥1024px):
   - Action: Toggle sidebar / trigger the fixed element.
   - Expected: Main content smoothly reflows. No text bleeds under sidebar.

3. MOBILE VERIFICATION (375px):
   - Action: Open app on 375px viewport.
   - Expected: Sidebar behaviour (off-canvas overlay? backdrop? main stays put?)
   - Expected: Sticky banner and nav remain accessible when scrolling.

4. INTERACTION & EDGE CASES:
   - Action: Put a wide data-table or long unbroken text in main. Toggle sidebar.
   - Expected: Layout does not break. Table scrolls horizontally within container.
   - Action: Dismiss banner/notice. Content reflows smoothly.
   - Action: Open mobile sidebar. Background is dimmed (backdrop covers header).

FINALLY — "WHAT I COULDN'T CHECK":
List CSS/layout assumptions (e.g. "assumed box-sizing: border-box globally",
"assumed #root has height: 100vh", "assumed no overflow:hidden between sticky
element and scroll container").

FORMAT: Checklist. Each item must be testable by a human in a browser.
```

---

### Z-Index Reference Table (Suite-Wide)

Use this as the canonical starting point when adding new layered elements. Do not exceed `z-[100]` without a compelling reason.

| z-index | Element | Apps | Notes |
|---------|---------|------|-------|
| `z-[1000]` | HealBanner | braden | Fixed diagnostic banner — highest priority |
| `z-[100]` | Toast notifications (Sonner) | all | Above everything except HealBanner |
| `z-[60]` | SystemNoticeBanner | all | Sticky — must be in same flex column as header |
| `z-50` | Mobile sidebar panel | conduit, BSU, crm7 | Fixed slide-out |
| `z-50` | AI sheet / panel | conduit, crm7 | Fixed right-side panel |
| `z-50` | Navigation bar | braden | Sticky |
| `z-[45]` | Mobile sidebar backdrop | BSU | Fixed overlay — must be above header |
| `z-40` | Header / App header | BSU, conduit | Sticky |
| `z-40` | PageEditorLauncher | BSU, conduit | Fixed FAB |
| `z-40` | Mobile overlay (conduit) | conduit | Fixed inset-0 dialog |
| `z-30` | Dropdown menus inside header | all | Absolute popover |
| `z-20` | Admin sidebar rail | braden | Absolute |
| `z-20` | Hero text overlay | braden | Relative |
| `z-10` | Sidebar collapse button | BSU | Absolute |
| `z-0` | Main content | all | Default flow |

**Invariants:**

- SystemNoticeBanner (`z-[60]`) **must** be in the same flex column as the header — never a sibling of the router root (it cannot coordinate stacking across different scroll containers)
- Sticky positioning **requires** no `overflow: hidden` or `overflow: clip` on ANY ancestor between the sticky element and the scroll container — always audit the ancestor chain
- `h-screen overflow-hidden` on the app shell root + `overflow-y-auto` on `<main>` only — this is the correct bounded app shell pattern. **Never** use `min-h-screen`, `min-h-svh`, or any `min-h-*` on the root — these make the shell unbounded and break independent panel scrolling.
- Mobile sidebar backdrop must have higher z-index than the app header so the header is visually dimmed when sidebar is open
- `role="main"` is redundant on `<main>` — never add it. `<main>` is implicitly `role=main`.
- **Never hardcode `calc(100vh-<px>)`** for layout heights — use flex remainder (`flex-1 min-h-0`) so the layout adapts when banners or notice bars are shown/hidden without changing height
- **`overflow-hidden` on widget/card inner divs** suppresses `position: sticky` inside them — document this with a code comment whenever `overflow-hidden` is used for corner clipping; do not add sticky descendants inside such containers
- **Non-standard z-index utilities** (`z-200`, `z-150`, etc.) are not generated by Tailwind v4 unless safelisted — always use explicit arbitrary values (`z-[200]`, `z-[150]`) so the utility class is guaranteed to be emitted
- **Mobile bottom nav z-index** must be lower than any sidebar backdrop/overlay so that when the sidebar opens, the overlay fully covers the bottom nav — bottom nav: `z-[45]`, overlay: `z-[46]` minimum

**Per-app bounded-shell reference (2026-04-16 audit):**

| App | Root class (target) | Inner scroll | Status |
|-----|---------------------|--------------|--------|
| conduit | `h-screen overflow-hidden` on `DashboardShell` root | `<main> overflow-y-auto` | ✅ Correct (after #56 fix) |
| business-suite-unified | `h-screen overflow-hidden` on `MainApp` root | `<main> overflow-y-auto` | ⚠️ Fix pending (#74) |
| crm7 | `h-svh overflow-hidden` on `SidebarProvider` | `flex-1 overflow-auto min-h-0` inner div | ⚠️ Fix pending (#201) |
| R80.3 | `h-screen overflow-hidden flex-col` on App root | `<main> overflow-auto` | ⚠️ Fix pending (#52) |
| braden | `flex flex-col min-h-screen` → `h-screen` target | Scroll on body (SPA) | ⚠️ Fix pending (#96) |

---

## Project-Specific Notes

### conduit (Next.js)

- App Router with server components by default
- `'use client'` only when client interactivity is needed
- TanStack React Query for client data, server actions for mutations
- `@supabase/ssr` for server-side auth
- AI routes must use `DefaultChatTransport` + `toUIMessageStreamResponse()` + rate limiting (see AI Implementation Standards)

### crm7 (AI Features)

- `@ai-sdk/react` for AI capabilities
- Never commit API keys
- AI-generated content must be labeled in UI
- Rate limiting on AI endpoints
- CRM7 is the canonical reference for AI SDK patterns — other projects port from here
- **AI Gateway models** — default: `xai/grok-4.20-reasoning`, fallback: `anthropic/claude-sonnet-4.6`, complex: `anthropic/claude-opus-4.6`
- Config: `src/lib/ai/config.ts`, Router: `src/lib/ai/model-router.ts`
- **Primary model is `xai/grok-4.20-reasoning`** (supersedes `grok-4.1-fast-reasoning` per 2026-04-24 Vercel AI Gateway roster update). 2M context, 2M max output, $2/M input + $6/M output. Do not downgrade without explicit user approval.

### R80.3 (Compliance)

- Wage calculations are legally compliance-critical
- Extra test coverage on calculation logic
- Fair Work API responses must be cached
- PDF exports must be print-friendly and data-accurate

### braden (Security)

- CSP headers configured and enforced
- Bot protection active
- Do not weaken security headers without approval

---

## Environment Variables

All projects use `.env.example` → `.env.local` pattern. Key conventions:

| Project | Prefix | Auth |
|---------|--------|------|
| **business-suite-unified** | `VITE_` | Supabase Auth |
| **crm7** | `VITE_` | Supabase Auth |
| **conduit** | `NEXT_PUBLIC_` | Supabase SSR Auth |
| **braden** | `VITE_` | Supabase Auth |
| **R80.3** | `VITE_` | Supabase Auth |
| **throughput** | `VITE_` | Supabase Auth + BS OAuth 2.1 |

- Never commit `.env` / `.env.local` files
- All client-side vars: `VITE_` (Vite) or `NEXT_PUBLIC_` (Next.js)
- Server-only vars (API keys): no prefix, access via `process.env`

---

## Package Manager

**pnpm** is the standard package manager for all 5 projects. Lock file: `pnpm-lock.yaml`.

```bash
corepack enable && corepack prepare pnpm@10.30.3 --activate
pnpm install
```

---

## Shared Packages (npm)

**CRITICAL — DO NOT REVERT**: The following `@bsuite/*` packages are published to npm under the `@bsuite` org. Each submodule project deploys independently on Vercel from its own GitHub repo. Vercel clones **only** that repo — the parent monorepo's `packages/` directory does NOT exist in the Vercel build context.

### Published Packages

| Package | npm | Consumers | Source |
|---------|-----|-----------|--------|
| `@bsuite/charge-calc` | `^0.1.0` | CRM7, R80.3 | `packages/charge-calc/` |
| `@bsuite/nav-core` | `^0.1.0` | braden | `packages/nav-core/` |

### Rules (all agents MUST follow)

1. **NEVER use `workspace:*`** for `@bsuite/*` dependencies in consumer projects. Always use the npm version (e.g., `"^0.1.0"`).
2. **NEVER use `file:../packages/*`** — this also fails on Vercel since the parent directory doesn't exist.
3. **When modifying a shared package** (e.g., `packages/charge-calc/`):
   - Build locally: `pnpm build` in the package directory
   - Bump version in `package.json` (follow semver)
   - Publish: `cd packages/charge-calc && npm publish --access public`
   - Update consumers: change version in CRM7/R80.3/braden `package.json`
   - Run `pnpm install` in each consumer to update lockfile
4. **`pnpm-workspace.yaml`** in submodule repos (e.g., `crm7/pnpm-workspace.yaml`) references `'../packages/*'` for **local development only**. This does NOT work on Vercel.
5. **Version pinning**: `packageManager: "pnpm@10.30.3"` and `.node-version: 24` — do not change without coordinating across all projects.
6. **Vercel install command**: All projects use `corepack enable && pnpm install` (defined in each project's `vercel.json`).

---

## Branch Strategy

- **Working branch**: `development` (all projects)
- **Default branch**: `main` (most projects), `master` (business-suite-unified)
- Solo dev workflow: single `development` branch per project
- Merge to main/master when ready for production

---

## Zero-Defer Policy

**MANDATORY for all agents (Windsurf, Claude Code, Copilot, Cursor):**

- **Never defer fixes.** If you identify an issue, fix it now in the same session.
- **No "TODO: implement later"** for known problems. Stub implementations are acceptable only for features not yet designed.
- **No "beyond scope" excuses.** If the scope needs expanding to ship correct code, expand it.
- **Rate limiting, error handling, validation, tests** — these are not optional extras. They ship with the feature.
- If a fix genuinely requires user input (e.g., which API key to use, design decision), ask immediately — don't defer.

---

## Multi-Agent Orchestration

When multiple AI agents work simultaneously:

1. **Scope isolation** — each agent works on one project or one clearly defined task
2. **No overlapping files** — agents must not edit the same files concurrently
3. **Build verification** — every agent must verify build passes before committing
4. **Conventional commits** — all agents follow `type(scope): description`
5. **Protected files** — listed in each project's `CONTRIBUTING.md`

---

## Automated Deployment Checks (Ship-All-Apps Cron)

The Ship-All-Apps cron runs every 6 hours (`25 */6 * * *`) and enforces the following checks beyond basic deploy health. Any agent modifying auth, RLS, or shared infra must be aware of what the cron validates.

### RLS Policy Standing Audit

On every run, the cron queries Supabase project `tuybltdrdefjblnplpqo` to verify these five policies remain `{authenticated}` — never `{public}`:

| Table | Policy | CMD |
|-------|--------|-----|
| `tenants` | Tenant owners can update their tenant | UPDATE |
| `tenants` | Users can view their own tenants | SELECT |
| `user_tenants` | Admins can invite users to their tenants | INSERT |
| `user_tenants` | Admins can update user roles in their tenants | UPDATE |
| `user_tenants` | Users can view tenant memberships | SELECT |

If any policy regresses to `{public}`, the cron re-applies the fix and files a GitHub issue on crm7 with label `security`. Migration reference: `20260413062306_fix_rls_public_to_authenticated_tenant_policies`.

### Supabase URI Allow-List (Do Not Prune)

The following redirect URIs must always be present in the Supabase allow-list. Removing any will break OAuth callbacks for that app:

```
https://r8.crm7.app/auth/callback
https://www.braden.com.au/auth/callback
https://suite.crm7.app/auth/callback
http://localhost:*/**
https://*.vercel.app
https://*.vercel.app/**
https://crm.crm7.app/auth/callback
https://*.vusercontent.net/auth/callback
https://ideas.crm7.app/auth/callback
https://conduit.crm7.app/auth/callback
```

### Auth Routing Architecture (Expected Behaviour — Not Bugs)

- **Conduit** (`conduit.crm7.app`) sign-in redirects to `suite.crm7.app/login?return_to=conduit&return_path=…` — BSU handles auth, conduit handles the post-auth redirect. Intentional.
- **R80.3** (`r8.crm7.app`) similarly delegates to BSU. Cookie SSO (`business_suite_auth` on `domain=.crm7.app`) handles session sharing.
- **Braden** (`www.braden.com.au`) is a different TLD — uses BS OAuth 2.1 PKCE instead of cookie SSO.
- **Conduit** uses `@supabase/ssr` server-managed cookies and does **not** participate in cross-domain cookie SSO. Isolated by design.

### Separate Project Warning

`monkey-projects` org has its own GitHub OAuth app ("Monkey") deployed on Railway/Vercel. It is entirely separate from BSuite. Never apply BSuite auth, RLS, or provider changes to that org.

### Known Platform Issues (Do Not Action)

- **bsuite#106** — NULL `client_secret_hash` on public OAuth clients (Conduit, Throughput). Supabase platform bug. Dashboard-only; app auth flows are unaffected. No support ticket. No workaround.

---

## Recent Changes (2026-04-14)

- **All projects — White-label Three-Tier Hierarchy**: New `useBranding()` hook in crm7 + BSU resolves `tenant_app_branding` → `tenant_branding` → `platform_branding` → hardcoded D2C defaults. Supabase schema (`platform_branding` single-row, `tenant_branding` v2 with light/dark logo URLs, `tenant_app_branding` per-app per-tenant) + RLS initplan-optimised policies. Force-override via `platform_branding.force_override_tenant_ids` for super-admin lock-to-platform. Slot-aware Logo component (`header`/`sidebar`/`auth`/`favicon`). See master roadmap §WL and bsuite#148 / crm7#193 / BSU#60.
- **Conduit — Candidate Portal**: `/portal/candidate` replaced with full authenticated surface (applications, interviews, offers, documents). New `r7_candidate_id_for_auth_user()` security-definer RLS helper + 6 co-existing `FOR SELECT` policies. conduit#46 + #49.
- **Conduit — Public Careers Page**: `/portal/careers` replaced with working job board, JSON-LD `JobPosting` structured data, `r7_jobs.apply_url` + `apply_email` columns. conduit#48.
- **CRM7 — Per-stage Deal Rotting**: Converged with HubSpot/Pipedrive/Salesforce 2026 "stage rotting" feature. New `opportunities.stage_entered_at` column + trigger; pipeline-velocity.ts now uses precise time-in-stage. crm7#191.
- **All Supabase Edge Functions — SEC-EDGE-005 Constant-Time Compares**: BSU centralized `timingSafeEqual` + `isServiceRoleCall` in `_shared/cors.ts`; migrated `verifyInternalAuth`, `send-notification`, `email-dispatcher`, `oauth-google-email`, `oauth-microsoft-email`, `process-webhook-queue`. crm7 migrated `timesheet-reminders` + `compliance-scanner`. Fixed duplicate `checkRateLimit` shadow in `store-ram-credential` + `xero-token-exchange`. BSU#63/#64/#66 + crm7#188/#190.
- **BSU Edge Function Hardening**: `stripe-portal` IDOR closed (customerId now resolved from authenticated user's tenant, client-supplied value accepted only as hint), `lead-capture` wildcard CORS → shared allowlist, `generate-document` added missing rate limiter, `calendar-integration` migrated to shared CORS + shared rate limiter. BSU#58 + #64.
- **Conduit — Perf**: cache()-wrapped `getCurrentUser()` + `getTenantContext()` helpers; branding waterfall (5 queries → 3 parallel). conduit#41.
- **CRM7 Nav + Branding fix**: SidebarProvider as flex-row root fixes main content reflow; CRM7Logo always visible in header; `branding.tsx` now upserts to `tenant_branding` (not disconnected `tenant_settings`). crm7#185.
- **RLS {public} → {authenticated}**: All 5 tenants/user_tenants policies migrated. Applied migration `20260413062306_fix_rls_public_to_authenticated_tenant_policies`.
- **Node 24 alignment**: crm7 `.node-version` 22→24 matching `engines.node: "24"`. crm7#186.
- **BSU OAuth Mandate**: Two-provider canonical spec (Google + Microsoft/Azure only, GitHub intentionally removed) documented in §Mandatory OAuth Providers above.
- **Automated Deployment Checks (Ship-All-Apps cron)**: RLS policy standing audit documented; Supabase URI allow-list locked in.
- **Tier-3 EntitySelectors (crm7)**: AwardRateSelector, PlacementSelector, HostSiteSelector, FieldOfficerSelector, TrainingProviderSelector. crm7#192.
- **R80.3 Wage Source CSV UI**: Download Template + Import CSV File picker in Settings → Award Rates surfaces existing service functions. R80.3#51.
- **R80.3 Fair Work API Reference v1.01W**: Documented actual 3-layer cache & fallback ladder, retry semantics, per-function fallback paths. R80.3#49.
- **R80.3 Test coverage**: `fairworkCacheFallback.test.ts` adds 17 behaviour tests on in-memory → DB fallback ladder. R80.3#48.
- **Type tightening sweep (3 projects)**: crm7 (EntitySelector generic), BSU (mcpDebugger globals, AuthContext row types), R80.3 (debounce never-arg generic, FinancialYearRow inline interfaces). crm7#194 + BSU#57 + R80.3#46.
- **WCAG 2.1 AA A11Y sweep (3 projects)**: BSU Branding/AdminBranding/Notices (BSU#62), Conduit ComposeDialog → Radix Dialog primitive + APG tablist (conduit#40), R80.3 LoginModal dialog role + focus trap + skip-to-main (R80.3#45/#47).

## Recent Changes (2025-02-27)

- **Conduit**: Replaced all native `confirm()` with `ConfirmDialog` component + `useConfirmDialog` hook
- **Conduit**: Added `Breadcrumbs` component to dashboard layout
- **CRM7**: Replaced 260+ raw `console.*` calls with centralized `logger` utility
- **All projects**: Fixed Tailwind v4 deprecation (`flex-shrink-0` → `shrink-0`)
- **BSU**: Removed stale Auth0 references from `.env.example`
- **braden**: Fixed CONTRIBUTING.md (was referencing yarn, now correctly pnpm)

---

## Persistent Memory Protocol

This project uses the QIG Memory API for cross-session continuity.

**At session start — run these before any work:**

```bash
curl -s https://qig-memory-api.vercel.app/api/memory/bsuite_session_latest | jq -r '.content'
curl -s https://qig-memory-api.vercel.app/api/memory/bsuite_pending_actions | jq -r '.content'
curl -s https://qig-memory-api.vercel.app/api/memory/bsuite_decisions | jq -r '.content'
```

**Write immediately after every commit, decision, or error fix — do NOT wait for session end:**

```bash
curl -X PUT https://qig-memory-api.vercel.app/api/memory/bsuite_session_latest \
  -H "Content-Type: application/json" \
  -d '{"category":"session_summary","content":"[summary]","updated":"[ISO timestamp]"}'
```

Key naming: all bsuite keys prefixed `bsuite_`. Session keys: `bsuite_session_YYYYMMDD[a-z]`. Update `bsuite_session_latest` pointer after every write.

See `MEMORY_PROTOCOL.md` at project root for full protocol.
