# ADR-0004 — OAuth Allow-List Doctrine

**Status:** Accepted (2026-05-01)
**Related:** `AGENTS.md` §Automated Deployment Checks; `docs/20260428-operator-handoff-v4.00W.md`; `docs/20260424-oauth-preview-redirect-runbook-v1.00W.md`

---

## Context

Two authoritative documents currently contain subtly different Supabase redirect-URI allow-lists:

- **`AGENTS.md`** §Automated Deployment Checks lists 10 entries including `https://*.vercel.app/**` and `https://*.vusercontent.net/auth/callback`.
- **`docs/20260428-operator-handoff-v4.00W.md`** references a "finalized production allow-list" in a slightly different form.

The Ship-All-Apps cron enforces whichever list is currently in place against the live Supabase project, so operator confusion about which doc is authoritative can cause cron alerts on either: (a) an entry being "missing" that the handoff doc says should be there but AGENTS.md doesn't list, or (b) an entry being "extra" that AGENTS.md expects but handoff-v4 has removed.

## Decision

**`AGENTS.md` §Automated Deployment Checks is the single source of truth for the Supabase redirect-URI allow-list.**

The canonical list, in authoritative order:

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

## Rationale

1. **`AGENTS.md` is referenced by every AI agent on every turn** (system prompt injection). It is the highest-frequency read document in the repo.
2. **Operator handoffs are time-bound snapshots** — v4 supersedes v3 supersedes v2 — whereas `AGENTS.md` is the living canonical reference.
3. **The Ship-All-Apps cron reads `AGENTS.md`**, not the handoff doc. Making `AGENTS.md` authoritative aligns doc with automation.
4. **Wildcards are load-bearing:** `https://*.vercel.app` (no path suffix) + `https://*.vercel.app/**` (with path) are both required for Vercel preview URL shapes. Removing either breaks preview-environment OAuth.
5. **`https://*.vusercontent.net/auth/callback`** covers Vercel's v0.dev preview domain — required for any agent-scaffolded preview work.

## Consequences

### Atomic replace-and-remove

1. **Operator handoffs stop listing the allow-list.** Handoff docs reference `AGENTS.md` by name instead. `20260428-operator-handoff-v4.00W.md` gets a supersession amendment (in-place edit) or is superseded by a v5 with the list removed; whichever is cleaner — decision in Phase 0 doc reconciliation.
2. **`docs/20260424-oauth-preview-redirect-runbook-v1.00W.md`** moves to `docs/archive/` once it has been either consolidated into `AGENTS.md` or superseded by a runbook that assumes the `AGENTS.md` list.
3. **Ship-All-Apps cron** has a single doc to parse for allow-list standing-audit. Cron test fixtures updated.
4. **Future allow-list additions:** land in `AGENTS.md` first; PR description notes the addition; cron rebuilds allow-list from the file on next run.
5. **No duplicated lists in docs.** Every doc that references the allow-list cites `AGENTS.md` §Automated Deployment Checks by reference; does not reproduce entries.

### Atomic removal disallows

- Keeping a "helpful copy" of the list in operator-handoff-v4 for convenience.
- Letting the Ship-All-Apps cron drift from the authoritative `AGENTS.md` state.
- Removing wildcard entries without an explicit migration note and cron-test update.

## Compliance Gate

Ratified on user sign-off. Execution in Phase 0 doc-reconciliation (any duplicate lists in docs being reconciled are collapsed to single source + citation).
