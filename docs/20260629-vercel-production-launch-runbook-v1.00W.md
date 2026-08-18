# Vercel Production Launch Runbook

**Date:** 2026-06-29  
**Status:** W  
**Scope:** BSuite Vercel apps on the Pro plan: `business-suite-unified`, `crm7`, `R80.3`, `conduit`, `throughput`, `braden`.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## Purpose

This runbook maps BSuite launch readiness to Vercel's production checklist. It is the operator checklist before promoting any BSuite app from `development` to `main` or moving production traffic.

## App/domain map

| App | Repo | Production URL | Development URL | Framework |
|---|---|---|---|---|
| BSU | `business-suite-unified` | `https://suite.crm7.app` | `https://d.suite.crm7.app` | Vite |
| CRM7 | `crm7` | `https://crm.crm7.app` | `https://d.crm.crm7.app` | Vite |
| R80.3 | `R80.3` | `https://r8.crm7.app` | `https://d.r8.crm7.app` | Vite |
| Conduit | `conduit` | `https://conduit.crm7.app` | `https://d.conduit.crm7.app` | Next.js |
| Throughput | `throughput` | `https://ideas.crm7.app` | `https://d.ideas.crm7.app` | Vite |
| Braden | `braden` | `https://www.braden.com.au` | `https://d.braden.com.au` | Vite |

## Incident response plan

### Severity levels

| Severity | Trigger | Response target | Examples |
|---|---|---:|---|
| SEV-1 | Production auth, billing, data access, or app-wide outage | 15 minutes | OAuth outage, blank app shell, database/RLS failure, payment failure |
| SEV-2 | Major workflow degraded with workaround | 1 hour | Reports broken, ATS pipeline unavailable for one tenant |
| SEV-3 | Non-critical bug, visual defect, docs issue | 1 business day | Copy issue, non-blocking console warning |

### Escalation paths

1. Primary responder: engineering operator on current release branch.
2. Product/user impact owner: Braden.
3. Platform owner: Vercel project/team admin.
4. Data/auth owner: Supabase project admin.
5. Payments owner: Stripe dashboard admin for BSU billing flows.

### Communication channels

- GitHub issue for each incident, labelled by affected app and severity.
- PR or commit SHA linked from the incident issue.
- Vercel deployment URL and alias state pasted into the issue.
- Supabase logs / Sentry event IDs attached when applicable.

### Rollback strategy

For Vercel-hosted apps:

1. Identify the last known-good deployment in Vercel.
2. Use Vercel Instant Rollback or alias reassignment to point the production domain back to the known-good deployment.
3. Confirm the alias target with `npx vercel inspect <production-domain> --scope braden-pty-ltd`.
4. Smoke-test the critical path using Playwright or a real browser.
5. Keep the incident issue open until root cause and regression tests are complete.

For database-backed incidents:

1. Prefer forward fixes for additive migrations.
2. Never destructively rollback production data without a backup and explicit operator approval.
3. If a migration caused the incident, document the applied migration ID, affected objects, and forward repair SQL.

## Stage, promote, and rollback procedure

### Stage

1. Merge to the app `development` branch.
2. Wait for GitHub checks to pass.
3. Verify Vercel preview deployment is `Ready`.
4. Point the `d.` alias to the latest preview if the automatic alias is stale.
5. Run desktop + mobile smoke on the `d.` URL.

### Promote

1. Confirm no P0/P1 blocker issues remain for the app.
2. Confirm app `development` is merged into `main` through a PR.
3. Confirm parent `bsuite` submodule pointer is updated.
4. Trigger or verify Vercel production deployment.
5. Smoke-test production URL.

### Rollback

1. Run `npx vercel inspect <domain> --scope braden-pty-ltd` to capture current deployment.
2. Select the known-good previous deployment from Vercel dashboard or CLI.
3. Reassign the production alias or use Instant Rollback.
4. Re-run auth, navigation, and app-specific critical path smoke.
5. Record rollback evidence in the incident issue.

## Repository readiness status

| Checklist item | Current status | Evidence / action |
|---|---|---|
| Lockfiles committed | PASS | Each app has `pnpm-lock.yaml`. |
| Frozen installs | PASS after CRM7 fix | All app `vercel.json` files use `pnpm install --frozen-lockfile`. |
| CSP/security headers | PARTIAL | All apps have security headers; Conduit CSP is in `next.config.ts`; BSU embed routes intentionally allow framing. |
| Static asset caching | PASS | Vite assets and Next static/fonts have immutable cache headers. |
| HTML no-store/no-cache | PARTIAL | CRM7, R80.3, Braden set explicit HTML/root no-cache; BSU/Throughput rely on Vercel defaults except asset headers. |
| Function max duration/memory review | PARTIAL | CRM7 sets `maxDuration: 30`; other apps mostly static/Next defaults. Review any new functions before launch. |
| Function region near origin | PARTIAL | CRM7 uses `syd1`; Throughput uses `iad1`; Supabase origin appears shared. Confirm region choice per app traffic and data path before production launch. |
| Speed Insights | PASS | Installed/rendered in BSU, R80.3, Conduit, Throughput, Braden; verify CRM7 instrumentation separately during app audit. |
| Analytics | PARTIAL | Installed/rendered in BSU, R80.3, Conduit, Braden; Throughput has Speed Insights but no Vercel Analytics import observed. |
| Sentry/error tracking | PARTIAL | Present in BSU, R80.3, Throughput; Conduit has package but Sentry wrapper currently removed; Braden has logger TODO. |
| Rate limiting | PARTIAL | Supabase Edge shared limiter exists in BSU; Conduit AI route limiter exists; Throughput client-side limiter exists. Add Vercel WAF rate limiting for public surfaces. |

## Vercel Pro dashboard settings to verify

These are team/project settings and must be verified in the Vercel dashboard or Vercel MCP when available.

| Setting | Required action |
|---|---|
| Deployment Protection | Enable for preview deployments and any non-public admin surfaces. Confirm production protection policy is intentional. |
| Vercel WAF managed rulesets | Enable managed rulesets on every production app. |
| WAF custom rules | Add bad-bot user-agent rule, IP blocklist rules, and route-specific rate limits for auth/OAuth/contact/embed/API routes. |
| Log Drains | Enable persistent log drain to the chosen log sink for all apps. |
| Observability Plus | Enable for production apps on Pro. |
| Speed Insights | Confirm project-level Speed Insights is enabled and receiving data. |
| Spend Management | Configure spend alerts and hard/soft thresholds for the Vercel team. |
| Access roles | Review team membership and least-privilege roles before launch. |
| SAML SSO | Optional Pro add-on. Enable if the team has the add-on; otherwise track as accepted risk. |
| Preview Deployment Suffix | Enable custom preview suffix/domain policy for predictable branch URLs. |
| DNS | Confirm DNS is on Vercel or perform zero-downtime migration with lowered TTL, verification, and rollback plan. |

## Per-app critical smoke before production

| App | Smoke path |
|---|---|
| BSU | Login, dashboard, app launcher, billing page, OAuth consent page. |
| CRM7 | Login, dashboard, contacts, people/new, placements detail, reports. |
| R80.3 | Login/SSO, calculator launch, rate calculation, export. |
| Conduit | Login/SSO, candidates list/detail, jobs, public apply flow. |
| Throughput | Login/SSO, idea board, new idea, launch pad. |
| Braden | Public pages, contact form, corporate brand, no D2C favicon bleed. |

## Launch gate

Do not launch/promote until:

- All P0/P1 app issues have evidence-linked closure or explicit operator waiver.
- `development` deployment smoke passes on `d.` URLs.
- Production deployment smoke passes on production URLs.
- Vercel dashboard settings above are verified or tracked with owner/date.
- This runbook and the dashboard are updated with evidence links.
