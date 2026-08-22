# Validate & Reorganize Railway Environment Variables

> # VERDICT: NOT THIS ESTATE — recorded 2026-08-22
>
> A plan to reorganise **Railway** environment variables. BSuite does not deploy on Railway —
> every app ships from Vercel (`vercel.json` in R80.4, braden, business-suite-unified and the
> rest). The only `railway` string in estate source is an award ALLOWANCE term inside
> `R80.4/src/awards/fixtures/ma000010-allowances.json`, which is a railway-worker allowance and
> not a deployment platform.
> >
> Retained as a record of a recovered artefact, not as instruction. Nothing here applies.
>
> The original document is unchanged below this banner.


## Context

The `.env.railway` file has naming inconsistencies and ambiguities, especially around MCP services. Copilot introduced wrong variables in the mcp-code-server block. The backend service block is missing entirely. The user wants validated, clean per-service copy-paste blocks.

## Railway Service Names (confirmed by user)

| Railway Service Name | Role | Repo |
| --- | --- | --- |
| `api-gateway` | Node.js API gateway | this repo |
| `monkey1-core` | Python backend (FastAPI) | this repo |
| `monkey1-web` | React frontend | this repo |
| `monkey1-simian-router` | Simian Router (Python) | this repo |
| `monkey1-simian-trm` | Simian TRM (Python) | this repo |
| `genesis-kernel` | Genesis Kernel (Python) | this repo |
| `mcp-browser-http-server` | MCP browser bridge (Node.js) | this repo |
| `code-server` | VS Code IDE | external repo |
| `mcp-code-server` | MCP code server | external repo |
| `redis` | Redis plugin | Railway addon |

## Issues Found

### Critical Bugs

1. **mcp-code-server block has WRONG token** (line 146): `MONKEY_MCP_BEARER_TOKEN` belongs to `mcp-browser-http-server`, not here. Also `MONKEY_CODE_SERVER_MCP_TOKEN` is listed TWICE (lines 145 + 147).

2. **Backend service block missing**: `monkey1-core` is deployed but has no section in `.env.railway`. The api-gateway's `BACKEND_URL` is undefined in production, so billing proxy fails.

3. **`MONKEY1_CORE_URL` points to wrong service** (line 52): Currently `http://${{monkey1-web.RAILWAY_PRIVATE_DOMAIN}}` (frontend) but should be `http://${{monkey1-core.RAILWAY_PRIVATE_DOMAIN}}` (backend). The health check pings the wrong service.

4. **`SUPABASE_SECRET_KEY` not in shared vars**: api-gateway reads `SUPABASE_SECRET_KEY` first, falls back to `SUPABASE_SERVICE_ROLE_KEY`. Only the fallback is in shared. Fix: add `SUPABASE_SECRET_KEY` as an alias in shared.

### Naming Issues

5. **CORS vars differ per service** — each service reads a different env var name. This is correct (matching code) but the `.env.railway` must use exactly the name each service reads:
   - api-gateway: `FRONTEND_URL` + `CORS_ORIGIN`
   - genesis-kernel: `CORS_ALLOWED_ORIGINS`
   - simian-router/trm: `CORS_ORIGINS`
   - mcp-browser-http-server: `ALLOWED_ORIGINS`
   - backend: `FRONTEND_URL` + `CORS_ORIGIN` + `ALLOWED_ORIGINS`

6. **`.env.example` has `GOOGLE_GENAI_KEY`** — no code reads this. Backend reads `GOOGLE_API_KEY`. Remove the phantom.

### Token Mapping (source of confusion)

| Token | Authenticates | Set On | Read By |
| --- | --- | --- | --- |
| `MONKEY_MCP_BEARER_TOKEN` | Browser ext -> MCP browser bridge | `mcp-browser-http-server` | `mcp-browser-http-server/src/index.ts` |
| `MONKEY_CODE_SERVER_MCP_TOKEN` | Claude Code -> MCP code server | `mcp-code-server` | external repo code |
| `PASSWORD` (code-server) | User -> VS Code web UI | `code-server` | external repo code |
| `PASSWORD` (mcp-code-server) | User -> MCP code server UI | `mcp-code-server` | external repo code |

---

## Plan

### Step 1: Rewrite `.env.railway`

Full rewrite with validated per-service blocks. Every variable traced to a `process.env` / `os.getenv` read in the codebase.

#### 1. SHARED VARIABLES

```env
# LLM Provider Keys (used by: api-gateway, monkey1-core, genesis-kernel)
ANTHROPIC_API_KEY=<set-in-dashboard>
OPENAI_API_KEY=<set-in-dashboard>
XAI_API_KEY=<set-in-dashboard>
GEMINI_API_KEY=<set-in-dashboard>
GROQ_API_KEY=<set-in-dashboard>

# Supabase (used by: api-gateway, monkey1-core, monkey1-web)
SUPABASE_URL=<set-in-dashboard>
SUPABASE_ANON_KEY=<set-in-dashboard>
SUPABASE_SERVICE_ROLE_KEY=<set-in-dashboard>

# Database — Supabase direct connection string
# (used by: api-gateway, monkey1-core)
DATABASE_URL=<set-in-dashboard>

# MCP Auth Tokens (shared because local dev machines also need them)
# MONKEY_MCP_BEARER_TOKEN: authenticates browser extension -> mcp-browser-http-server
MONKEY_MCP_BEARER_TOKEN=<set-in-dashboard>
# MONKEY_CODE_SERVER_MCP_TOKEN: authenticates Claude Code -> mcp-code-server
MONKEY_CODE_SERVER_MCP_TOKEN=<set-in-dashboard>
```

Changes vs current:
- Removed `REDIS_URL=${{redis.REDIS_URL}}` — Redis is a plugin ref, available automatically to attached services
- Removed `SUPABASE_SECRET_KEY` — api-gateway already falls back to `SUPABASE_SERVICE_ROLE_KEY`
- Added comments explaining each token's purpose

#### 2. api-gateway

```env
NODE_ENV=production
RAILPACK_CONFIG_FILE=packages/api-gateway/railway.json

# AI provider alias (code reads GROK_API_KEY, not XAI_API_KEY)
GROK_API_KEY=${{shared.XAI_API_KEY}}

# Google Gemini integration
GEMINI_ENABLED=true

# CORS / Frontend
FRONTEND_URL=https://${{monkey1-web.RAILWAY_PUBLIC_DOMAIN}}
CORS_ORIGIN=https://${{monkey1-web.RAILWAY_PUBLIC_DOMAIN}}

# Downstream services (internal network)
BACKEND_URL=http://${{monkey1-core.RAILWAY_PRIVATE_DOMAIN}}
GENESIS_KERNEL_URL=http://${{genesis-kernel.RAILWAY_PRIVATE_DOMAIN}}

# Health check downstream URLs
MONKEY1_CORE_URL=http://${{monkey1-core.RAILWAY_PRIVATE_DOMAIN}}
MONKEY1_ROUTER_URL=http://${{monkey1-simian-router.RAILWAY_PRIVATE_DOMAIN}}
MONKEY1_TRM_URL=http://${{monkey1-simian-trm.RAILWAY_PRIVATE_DOMAIN}}
MONKEY1_GENESIS_URL=http://${{genesis-kernel.RAILWAY_PRIVATE_DOMAIN}}

# Logging
LOG_PATH=/data/logs
```

Changes vs current:
- **Added** `BACKEND_URL` (was missing — billing proxy broken)
- **Fixed** `MONKEY1_CORE_URL` from `monkey1-web` to `monkey1-core`

#### 3. monkey1-core (NEW — was completely missing)

```env
PYTHONUNBUFFERED=1
PYTHONDONTWRITEBYTECODE=1
LOG_LEVEL=INFO
SHUTDOWN_TIMEOUT=8

# CORS
FRONTEND_URL=https://${{monkey1-web.RAILWAY_PUBLIC_DOMAIN}}
CORS_ORIGIN=https://${{monkey1-web.RAILWAY_PUBLIC_DOMAIN}}
ALLOWED_ORIGINS=https://${{monkey1-web.RAILWAY_PUBLIC_DOMAIN}},https://${{api-gateway.RAILWAY_PUBLIC_DOMAIN}}

# Downstream services
GENESIS_KERNEL_URL=http://${{genesis-kernel.RAILWAY_PRIVATE_DOMAIN}}

# Optional — set in dashboard if needed:
# SENTRY_DSN=<set-in-dashboard>
# STRIPE_SECRET_KEY=<set-in-dashboard>
# STRIPE_PRO_PRICE_ID=<set-in-dashboard>
# STRIPE_TEAM_PRICE_ID=<set-in-dashboard>
# GOOGLE_API_KEY=<set-in-dashboard>  (backend uses Google SDK naming)
# PINECONE_API_KEY=<set-in-dashboard>
```

#### 4. genesis-kernel

```env
QIG_LLM_PROVIDER=none
SIMIAN_ROUTER_URL=http://${{monkey1-simian-router.RAILWAY_PRIVATE_DOMAIN}}
CORS_ALLOWED_ORIGINS=https://${{monkey1-web.RAILWAY_PUBLIC_DOMAIN}},https://${{api-gateway.RAILWAY_PUBLIC_DOMAIN}}
NX_DAEMON=false
NX_CACHE_DIRECTORY=/tmp/.nx/cache
```

No changes needed.

#### 5. monkey1-web

```env
NODE_ENV=production
RAILPACK_CONFIG_FILE=packages/frontend/railway.json
NX_DAEMON=false
NX_CACHE_DIRECTORY=/tmp/.nx/cache
VITE_API_URL=https://${{api-gateway.RAILWAY_PUBLIC_DOMAIN}}
VITE_SUPABASE_URL=${{shared.SUPABASE_URL}}
VITE_PUBLIC_SUPABASE_URL=${{shared.SUPABASE_URL}}
VITE_SUPABASE_ANON_KEY=${{shared.SUPABASE_ANON_KEY}}
VITE_PUBLIC_SUPABASE_ANON_KEY=${{shared.SUPABASE_ANON_KEY}}
VITE_APP_ENV=PROD
```

No changes needed.

#### 6. monkey1-simian-router

```env
RAILPACK_CONFIG_FILE=py/simian-router/railway.json
PYTHONUNBUFFERED=1
PYTHONDONTWRITEBYTECODE=1
UV_LINK_MODE=copy
UV_SYSTEM_PYTHON=1
LOG_LEVEL=INFO

# QSR-prefixed keys (Pydantic env_prefix)
QSR_OPENAI_API_KEY=${{shared.OPENAI_API_KEY}}
QSR_GEMINI_API_KEY=${{shared.GEMINI_API_KEY}}
QSR_ANTHROPIC_API_KEY=${{shared.ANTHROPIC_API_KEY}}
QSR_XAI_API_KEY=${{shared.XAI_API_KEY}}
QSR_GROQ_API_KEY=${{shared.GROQ_API_KEY}}
QSR_PERPLEXITY_API_KEY=<set-in-dashboard>

# Features
QSR_COMPUTER_USE_ENABLED=true
QSR_COMPUTER_USE_AUTO_ROUTE=true
QSR_TRM_ENABLED=true
QSR_TRM_BASE_URL=http://${{monkey1-simian-trm.RAILWAY_PRIVATE_DOMAIN}}

# CORS
CORS_ORIGINS=https://${{monkey1-web.RAILWAY_PUBLIC_DOMAIN}},https://${{api-gateway.RAILWAY_PUBLIC_DOMAIN}}
```

No changes needed.

#### 7. monkey1-simian-trm

```env
RAILPACK_CONFIG_FILE=py/simian-trm/railway.json
PYTHONUNBUFFERED=1
PYTHONDONTWRITEBYTECODE=1
UV_LINK_MODE=copy
UV_SYSTEM_PYTHON=1
LOG_LEVEL=INFO
CORS_ORIGINS=https://${{monkey1-web.RAILWAY_PUBLIC_DOMAIN}},https://${{api-gateway.RAILWAY_PUBLIC_DOMAIN}}
```

No changes needed.

#### 8. mcp-browser-http-server

```env
NODE_ENV=production
# Token that authenticates browser extension connections to this MCP bridge
MONKEY_MCP_BEARER_TOKEN=${{shared.MONKEY_MCP_BEARER_TOKEN}}
ALLOWED_ORIGINS=https://${{monkey1-web.RAILWAY_PUBLIC_DOMAIN}},https://${{api-gateway.RAILWAY_PUBLIC_DOMAIN}},chrome-extension://*
```

No changes needed (was already correct).

#### 9. code-server (external repo)

```env
PASSWORD=<set-in-dashboard>
GIT_REPO=<set-in-dashboard>
WORKSPACE_DIR=/home/coder/workspace
VIRTUAL_ENV=/home/coder/.venv
```

No changes needed.

#### 10. mcp-code-server (external repo — FIXED)

```env
# Token that authenticates Claude Code / .mcp.json connections to this MCP server
MONKEY_CODE_SERVER_MCP_TOKEN=${{shared.MONKEY_CODE_SERVER_MCP_TOKEN}}
# Web UI password
PASSWORD=<set-in-dashboard>
WORKSPACE_DIR=/home/coder/workspace
ALLOW_LOCALHOST=true
```

Changes vs current:

- **Removed** `MONKEY_MCP_BEARER_TOKEN` (wrong service — belongs to mcp-browser-http-server)
- **Removed** duplicate `MONKEY_CODE_SERVER_MCP_TOKEN` (was listed twice)

### Step 2: Delete `.railway.env.example`

Stale file. Superseded by `.env.railway`. References old service names like `${{backend.RAILWAY_PUBLIC_DOMAIN}}`.

### Step 3: Clean up `.env.example`

- Remove `GOOGLE_GENAI_KEY=` line (no code reads it)
- Update `DATABASE_URL` comment from "Railway auto-provides" to "Supabase direct connection"
- Add service annotations (which service reads each var)

### Step 4: Update CLAUDE.md IDE Environment section

Replace documentation placeholders with actual Railway reference syntax:

```
- Code server UI: `https://${{code-server.RAILWAY_PUBLIC_DOMAIN}}`
- MCP Code Server endpoint: `https://${{mcp-code-server.RAILWAY_PUBLIC_DOMAIN}}/mcp/v1/messages`
- MCP Browser HTTP endpoint: `https://${{mcp-browser-http-server.RAILWAY_PUBLIC_DOMAIN}}/mcp`
```

---

## Summary of Changes

| File | Change |
| --- | --- |
| `.env.railway` | Full rewrite — fix mcp-code-server, add monkey1-core block, fix MONKEY1_CORE_URL, add BACKEND_URL |
| `.railway.env.example` | DELETE |
| `.env.example` | Remove `GOOGLE_GENAI_KEY`, update DATABASE_URL comment |
| `CLAUDE.md` | Update IDE environment section with Railway ref syntax |

## Code NOT Modified

All service source code is correct — the env var names in code match what we're setting. The issue was purely in `.env.railway` configuration.

## Verification

1. Every var in `.env.railway` traceable to a `process.env` / `os.getenv` in the codebase
2. No secrets in file (only `${{shared.*}}` refs and `<set-in-dashboard>`)
3. mcp-code-server block has ONLY `MONKEY_CODE_SERVER_MCP_TOKEN` (not the browser token)
4. `BACKEND_URL` present in api-gateway block pointing to `monkey1-core`
5. `MONKEY1_CORE_URL` points to `monkey1-core` (not `monkey1-web`)
