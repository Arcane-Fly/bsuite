# Contributing to Conduit

Conduit is the recruitment Applicant Tracking System (ATS) within BSuite — managing candidates, jobs, talent pools, pipelines, and the hiring workflow.

> **Shared Standards:** All code quality, commit conventions, testing, documentation naming, and theme rules are defined in [`../docs/20260227-contributing-standards-guide-v1.00W.md`](../docs/20260227-contributing-standards-guide-v1.00W.md). Read that first — this file covers project-specific details only.

---

## Getting Started

### Prerequisites

- Node.js ≥24.0.0
- Yarn (`corepack enable`)
- Supabase CLI
- Git

### Installation

```bash
git clone <repo-url>
cd conduit
yarn install
cp .env.example .env.local
```

### Development

```bash
yarn dev          # Start Next.js dev server
yarn build        # Production build
yarn test         # Run tests
yarn lint         # Lint check
yarn typecheck    # TypeScript type checking
```

---

## Repository Structure

```
conduit/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   └── (dashboard)/  # Dashboard route group
│   │       ├── candidates/
│   │       ├── jobs/
│   │       ├── talent-pools/
│   │       └── pipeline/
│   ├── components/       # UI components
│   │   ├── common/       # Shared components
│   │   ├── candidates/   # Candidate-specific
│   │   ├── jobs/         # Job-specific
│   │   └── ui/           # Primitives (Radix-based)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities, Supabase client
│   ├── stores/           # Zustand state stores
│   └── types/            # TypeScript type definitions
├── docs/                 # Project documentation (see naming convention)
│   └── README.md         # Documentation index
├── public/               # Static assets
├── next.config.ts        # Next.js configuration
└── package.json
```

---

## Key Differences from Other BSuite Projects

Conduit uses **Next.js 16** with the App Router, unlike the other Vite-based projects:

- **Routing:** File-based routing via `src/app/`
- **Server Components:** Default server components; add `'use client'` only when needed
- **Data Fetching:** TanStack React Query for client-side, server actions for mutations
- **SSR:** Supabase SSR client (`@supabase/ssr`) for server-side auth
- **Testing:** Jest (Next.js default) rather than Vitest

---

## Theme

This project uses the **D2C Neon Electric theme**. See [`../docs/20260228-d2c-theme-specification-v1.00W.md`](../docs/20260228-d2c-theme-specification-v1.00W.md) for the complete specification.

- Tailwind config must extend with the neon electric color palette
- ThemeProvider wraps the app in the root layout
- All components must respect dark/light mode
- Use semantic status colors for pipeline stages and candidate statuses

---

## State Management

Conduit uses Zustand stores for client-side state:

- `stores/candidateStore.ts` — candidate data and filters
- `stores/jobStore.ts` — job listings and search
- `stores/talentPoolStore.ts` — talent pool management
- `stores/pipelineStore.ts` — recruitment pipeline state
- `stores/onboardingStore.ts` — onboarding workflow
- `stores/complianceStore.ts` — compliance tracking

When adding new state, create a dedicated store file. Keep stores focused — one domain per store.

---

## Protected Files

The following files require explicit approval before modification:

- `src/lib/supabase.ts` — Supabase client configuration
- `next.config.ts` — Next.js configuration
- `src/types/entities.ts` — Core entity type definitions

---

## Commit Scope

Use `conduit` as the commit scope:

```bash
feat(conduit): add candidate pipeline drag-and-drop
fix(conduit): resolve talent pool filter persistence
docs(conduit): add onboarding workflow architecture
```

---

## Roadmap

The unified BSuite roadmap lives at [`bsuite/docs/00-master-roadmap.md`](../docs/00-master-roadmap.md). It covers all projects including Conduit-specific milestones.

Key plans relevant to Conduit:

- [Email Capabilities Plan](../docs/plans/20260227-email-capabilities-plan-v1.00W.md) — shared email infrastructure used by `conduit_communications`
- [AI Assistant Plan](../docs/plans/20260227-ai-assistant-plugin-system-plan-v1.00W.md) — includes Conduit-specific AI tools and integration
