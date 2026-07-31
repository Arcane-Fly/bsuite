# BSuite — agent rulebook

Canonical instructions for every AI agent working in this repo (Claude Code, Copilot, Cursor,
Windsurf, Manus, Codex). These override default agent behaviour.

Six apps — business-suite-unified, crm7, conduit, braden, R80.3, throughput — over one shared
Supabase backend (`tuybltdrdefjblnplpqo`). Each is a submodule that deploys standalone from its own
repo, so **Vercel never sees this parent directory**.

Stack floor, all apps: React 19, TypeScript strict, TailwindCSS, Radix + shadcn + Lucide, Zustand,
React Hook Form + Zod, Supabase, Vitest. pnpm everywhere. conduit is Next.js 16 App Router; the rest
are Vite.

## How you are expected to work

1. **No deferral.** Fix what you find, in the session you find it. "TODO: implement later", "needs a
   fresh session", "out of scope", "leaving for runtime testing" — all banned. If genuinely blocked
   by an external dependency, file an issue and keep going.
2. **Finish the whole ask.** Don't silently narrow scope. If you drop part of it, say so explicitly.
3. **Evidence, not assertion.** "Done" requires: the command you ran plus its output; a live check on
   the `d.*` domain for anything user-facing; the tracking issue and dashboard updated in the same
   session. Never mark your own work done on a code-trace alone.
4. **Latest wins.** On conflicting docs, take the newest, most complete, highest-quality option — and
   fix or delete the stale one rather than leaving both.
5. **Clean up behind you.** Remove superseded code when you supersede it. No dead or duplicate paths.
6. **Red-team before merge** on anything complex, and update docs in the same PR as the code.

## Tripwires — expensive or irreversible if wrong

1. **Never push to `main`.** Work on `development`; production lands by PR. Commits must be
   GPG-signed or Vercel silently cancels the deploy.
2. **Never `pnpm install` inside this tree to regenerate a submodule lockfile** — pnpm writes `../`
   importers and Vercel fails `ERR_PNPM_OUTDATED_LOCKFILE`. Copy out to `~/<app>_lockgen` first.
3. **Never `workspace:*` or `file:../packages/*`** for `@bsuite/*` deps — use the published npm
   version. `pnpm-workspace.yaml` in a submodule is local-development-only and fails on Vercel.
4. **Never add `cookieStorage`, `domain=.crm7.app`, or `storageKey: 'business_suite_auth'`** to a
   Supabase client. Cross-app SSO is BS OAuth 2.1 PKCE only, and every OAuth callback must bridge
   tokens via `supabase.auth.setSession()` or RLS reads 401 straight after handoff.
5. **Never create a GCP service-account JSON key** — Google access is WIF-only.
6. **Never assert Supabase policy/grant state from the dashboard UI or from migration files** — query
   the live catalog (`pg_policies`, `information_schema.role_table_grants`). The per-bucket storage
   policy counter does not attribute multi-bucket policies and reads "0" on fully guarded buckets.
7. **Never write memory under `qig_`, `vex_`, `pantheon_`** — separate projects. BSuite is `bsuite_`.
8. **Never ship mock data**, especially financial or account data. Wire live data or don't ship.
9. **Never downgrade a dependency or delete a feature** to make something pass. React 19 is the floor.
   Feature flags over deletions; ask before removing.
10. **Semantic error/destructive is Electric Purple `oklch(0.568 0.202 283.1)`, never red/coral** — on
    both brands, and not tenant-overridable through `BrandingProvider`. No `text-white`,
    `text-black`, raw hex, RGB or HSL in consumer UI.

## Where the detail lives

Read the destination before your first edit in that area. Do not re-derive from memory.

| Area | Canonical source |
|------|------------------|
| Auth, OAuth, SSO, client registry, `d.*` previews, redirect allowlist | [`AUTH_CANONICAL.md`](./AUTH_CANONICAL.md) |
| Code quality, commits, testing, docs naming | [`docs/20260227-contributing-standards-guide-v1.01W.md`](docs/20260227-contributing-standards-guide-v1.01W.md) |
| Entity ownership, DRY one-shot | [`docs/20260227-dry-one-shot-architecture-v1.02A.md`](docs/20260227-dry-one-shot-architecture-v1.02A.md) |
| Setup, lockfiles, shared packages, env vars, GCP WIF, cron checks, memory protocol | [`docs/20260731-platform-operations-reference-v1.00W.md`](docs/20260731-platform-operations-reference-v1.00W.md) |
| Self-validation loop (output/visual equivalence, PR Evidence block) | [`docs/20260507-ff-self-validation-doctrine-v1.00W.md`](docs/20260507-ff-self-validation-doctrine-v1.00W.md) |
| Supabase policy gates, consumer-package gate, definition of done | [`docs/20260731-supabase-verification-gates-v1.00W.md`](docs/20260731-supabase-verification-gates-v1.00W.md) |
| AI SDK standards, multi-file refactor tooling, reusable code patterns | [`docs/20260731-agent-engineering-patterns-v1.00W.md`](docs/20260731-agent-engineering-patterns-v1.00W.md) |
| Layout, z-index scale, DOM autopsy | [`docs/20260731-frontend-layout-zindex-standards-v1.00W.md`](docs/20260731-frontend-layout-zindex-standards-v1.00W.md) |
| Theme tokens, both brands | `packages/theme/README.md` + the `bsuite-brand-system` skill |
| Dashboard update protocol | [`docs/dashboard/README.md`](docs/dashboard/README.md) · live: <https://garyocean428.github.io/bsuite/dashboard/> |
| E2E testing status | [`docs/testing/README.md`](docs/testing/README.md) |
| Dependency bumps | [`docs/20260506-dependency-bump-checklist-v1.00A.md`](docs/20260506-dependency-bump-checklist-v1.00A.md) |
| Anything else | [`docs/README.md`](docs/README.md) → `docs/20260504-bsuite-documentation-hub-v1.00W.md` |
| Per-project rules and protected files | that project's `CONTRIBUTING.md` |
| Cross-session state | qig-memory MCP, `bsuite_` prefix |

Commits: `type(scope): description` — types `feat|fix|docs|style|refactor|test|chore|perf`, scopes
`bsu|crm7|conduit|braden|r80|throughput|shared|docs|deploy`.

throughput has no `CONTRIBUTING.md` yet; treat `src/lib/supabase.ts` and the Groq integration
(`gpt-oss-120b`) as protected until one exists.
