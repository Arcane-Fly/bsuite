---
kind: record
authority: none
owner: bsuite
---

# [P2] Tighten CSP from permissive baseline to strict (follow-up to bsuite#477)

https://github.com/GaryOcean428/bsuite/issues/1139

Snapshot updatedAt: 2026-08-26T15:28:23Z. Open at capture; re-read live.

## Source

- Parent issue: bsuite#477 (P2-8 CSP permissive baseline) — closed 2026-05-19
- Per-app policy doc: each submodule's `docs/20260519-csp-policy-reference-v1.00W.md`

## Scope

bsuite#477 shipped a permissive Content-Security-Policy baseline across all 6 apps. This issue tracks the remaining work to harden each app from permissive → strict.

## Tightening backlog (applies to all 6 apps unless noted)

### 1. Remove `'unsafe-eval'` from `script-src` (post-build)

Vite dev HMR uses `eval()` for hot module replacement. Production builds do not need it. Add a CSP-via-middleware that conditionally drops `'unsafe-eval'` when `NODE_ENV=production`.

- Affected: BSU, CRM7, R80.3, conduit, throughput
- NOT affected: braden (corporate marketing site, no Vite HMR concern; already missing this directive)

### 2. Replace `'unsafe-inline'` in `script-src` with per-request nonce

Implement nonce-based CSP via Edge middleware that:

- Generates a unique nonce per request
- Injects `<script nonce="...">` on every inline script
- Sets the corresponding `script-src 'nonce-{value}'` in the CSP header

References:
- Next.js [Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy)
- For Vite SPAs: HTML transform plugin + Vercel Edge middleware

### 3. Narrow `connect-src` per app

Currently uses broad `*.crm7.app` cross-app wildcard. Per app:

- **BSU** (`suite.crm7.app`): only needs to fetch from `crm.crm7.app`, `r8.crm7.app`, `ideas.crm7.app`, `conduit.crm7.app`, `www.braden.com.au`
- **CRM7**: needs `suite.crm7.app` (OAuth server) + Supabase only
- **R80.3**: needs `suite.crm7.app` (OAuth server) + Supabase only
- **conduit**: needs `suite.crm7.app` (OAuth server) + Supabase only
- **throughput**: needs `suite.crm7.app` (OAuth server) + Supabase only
- **braden**: explicit `qig-memory-api.vercel.app` already listed; remove `https:` + `wss:` wildcards once every fetch site is audited

### 4. Replace `img-src https:` wildcard

Use explicit origins instead:

- `tuybltdrdefjblnplpqo.supabase.co` (Supabase storage — main bucket)
- `*.r2.cloudflarestorage.com` (if R2 is later wired)
- per-tenant logo bucket origins

### 5. Add `report-uri` / `report-to` for violation telemetry

Wire a Supabase edge function to receive CSP violation reports. Store in a `csp_violations` table with `(timestamp, app, route, directive, blocked_uri, source_file, line_number, column_number, sample)`.

Run `Content-Security-Policy-Report-Only` mode for one rotation alongside the enforcing header to detect false positives before tightening.

### 6. Switch BSU `/embed/*` routes to a separate strict CSP

BSU's `frame-ancestors` was deliberately omitted from the catchall to preserve `/embed/contact` and `/embed/lead-form`. Once strict CSP lands, audit which BSU routes genuinely need to be framable and lock down the rest with `frame-ancestors 'none'` on a non-wildcard route pattern.

### 7. CRM7 SQL playground

CRM7's `script-src` includes `https://*.supabase.co` because the in-browser SQL playground loads `sql-wasm.js` from Supabase Storage. Once `script-src` becomes nonce-based, audit whether the SQL playground can be hosted from a same-origin path instead.

### 8. throughput AI provider list

throughput currently allows `connect-src` to multiple direct AI providers (`api.groq.com`, `api.openai.com`, `api.anthropic.com`, `api.bing.microsoft.com`). Once throughput migrates to React 19 + AI Gateway server-side calls (per Phase 5.5), narrow client `connect-src` to `ai-gateway.vercel.sh` only.

### 9. braden v0.dev embed permission

`frame-ancestors` retains `https://*.v0.dev` + `https://*.vusercontent.net`. Drop these once the v0.dev preview cycle is closed.

## Acceptance criteria

- All 6 apps run `Content-Security-Policy` in enforcing mode (not Report-Only) with:
  - No `'unsafe-eval'`
  - Nonce-based `script-src` (no `'unsafe-inline'`)
  - Explicit `connect-src` hostnames
  - Explicit `img-src` origins
  - `report-uri` or `report-to` configured
- CSP violation telemetry surfaces < 5 false positives per app per week before the cutover.
- Tightening PRs reference each per-app `docs/20260519-csp-policy-reference-v1.00W.md`.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: §9.1 output-equivalence (capture pre-tightening request log, replay against tightened CSP, assert no new console violations)
- **Equivalence target**: Vercel preview deploy + Chrome DevTools console with zero CSP violations on auth login + main dashboard route
- **Cross red-team**: claude-code verifies evidence rows before flip-to-done
- **Skills to load**: `security-audit`, `vercel-firewall`, `chrome-devtools`, `qa-and-verification`, `verification-before-completion`
- **Self-report on divergence**: yes (mandatory; do not rationalise gaps)

## Owner

All / Cascade (per the merged-execution-backlog convention)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
