# Autonoma E2E Testing Configuration

> Documentation snapshot of the Autonoma dashboard registration for the BSU app.
> Per `CLAUDE.md` § "Autonoma E2E Testing": **secrets are never committed to
> source** — `AUTONOMA_CLIENT_ID`, `AUTONOMA_SECRET_ID`, and per-version
> `x-vercel-protection-bypass` tokens live in Vercel env vars (Production +
> Preview) and the Autonoma dashboard. This file documents the *non-secret*
> identifiers only.

## Production (BSU)

Deployment Checks — auto-run on every push to a registered Version URL via the
Vercel ↔ Autonoma integration.

| Field | Value |
|-------|-------|
| Application ID | `cmouwgrq209t4013ps6ikkm10` |
| Version name | `production` |
| URL | <https://business-suite-9ylybbrfq-braden-pty-ltd.vercel.app> |
| Version ID | `cmouwgrq609t5013pev385f03` |
| Created | 2026-05-07 11:01:41 AM |
| Status | Default version |
| Cookies | none configured |
| `x-vercel-protection-bypass` | **stored in Autonoma dashboard — do NOT commit; rotate in Vercel → Project Settings → Deployment Protection** |
| Geolocation | none configured |

## Preview (BSU)

| Field | Value |
|-------|-------|
| Application ID | `cmouwgrq209t4013ps6ikkm10` |
| Version name | `preview` |
| URL | <https://business-suite-i8jidvlst-braden-pty-ltd.vercel.app> |
| Version ID | `cmouwgrq609t6013p0zcirl1c` |
| Created | 2026-05-07 11:01:41 AM |
| Status | Other version |

## Throughput

Pending operator-driven Application + Version registration in the Autonoma
dashboard. Env vars `AUTONOMA_CLIENT_ID` / `AUTONOMA_SECRET_ID` already
distributed via the Vercel integration on Production + Preview.

## Other apps

CRM7, R80.3, Braden, Conduit — `AUTONOMA_*` env vars distributed (2026-05-07);
Application + Version registration pending operator action via the Autonoma
dashboard.

---

**Operator action required if a previous revision of this file leaked a bypass
token to git history:** rotate the token in Vercel (Project → Settings →
Deployment Protection → "Generate new bypass token"), then re-provision the new
value in the Autonoma dashboard for each affected Application Version.
