# Ownership-Map Ratification Required (post-2026-04-25 finish-line review)

**Status:** W — Working (BLOCKING USER DECISION)
**Date:** 2026-04-27
**Trigger:** Critical review of 2026-04-25 finish-line session flagged `tenants` + `user_tenants` reclassification as buried-in-subnote rather than ratified at the doctrine level (frozen-decision #2).

This doc surfaces three doctrine-vs-reality drift items in `packages/dry-lint/src/ownership-map.json` and asks for an explicit decision per item before they're written into `bsuite_decisions` as frozen facts.

---

## Item 1 — `tenants` + `user_tenants` reclassified to `shared`

### What changed (WS-I PHASE-2 decision, 2026-04-25, no prior user sign-off)

**Before** (per `docs/20260227-dry-one-shot-architecture-v1.01A.md §1` + parent CLAUDE.md "Authentication & OAuth"):
- `tenants` — owned by **BSU**
- `user_tenants` — owned by **BSU** (BSU is the canonical tenant + team owner)

**After** (current `packages/dry-lint/src/ownership-map.json`):
- `tenants` — `{ "owner": "shared", "readers": [] }`
- `user_tenants` — `{ "owner": "shared", "readers": [] }`

### Justification offered by the WS-I-PHASE-2 agent

CRM7's `tenant-management` edge function (22 actions: `create-org`, `create-division`, `update-tenant`, `invite-member`, `set-sharing-policy`, `approve-membership`, `update-member-role`, `remove-member`, …) writes both tables. The argument: these operations are scoped to a CRM7 tenant admin operating on their own org hierarchy with RLS enforcement, not platform-level CRUD.

This dropped the violation count from 54 → 35 (19-violation drop).

### Why this is contested

1. **Schema-semantic mismatch.** The map's own `$schema` block says: `shared` = "co-ownership accepted (audit-trail / append-only sinks)". `tenants` + `user_tenants` are not audit-trail tables — they are CRUD tables for live organizational data. Other `shared` entries (`wage_calculation_snapshots`, `tenant_entities_revisions`) genuinely are append-only audit sinks. The reclassification re-uses the `shared` label for a different concept.

2. **Enforcement collapse.** `shared` in the current rule means "any app may write." The dry-lint rule schema has no per-app writer list (the user's review called this out as PHASE-3c work). So reclassifying to `shared` removes ALL rule-level enforcement on `tenants` + `user_tenants` — every app could write them and the rule would not flag it. The only remaining boundary is RLS + service-role discipline, both of which can be bypassed from a server-side `supabaseAdmin` client (which is exactly what the CRM7 edge fn uses).

3. **Audit history says BSU-only.** Frozen decision #2 + the V5–V10 cross-app write audit treated both tables as BSU-owned writes-only. The reclassification reverses that without ratifying the trade-off.

### Three options

| Option | Action | Trade-off |
|---|---|---|
| **A. Ratify as-is** | Keep `shared` on both tables. Update `packages/dry-lint/src/ownership-map.json` `$schema.$comment` to acknowledge `shared` covers BOTH audit-sinks AND admin-CRUD co-ownership. Update `docs/20260227-dry-one-shot-architecture-v1.01A.md §1` to reflect new ownership. Add `tenants_user_tenants_shared` to `bsuite_decisions`. | Pragmatic — accepts the reality that CRM7's tenant-management edge fn exists and isn't moving. **Cost:** rule provides zero protection against new code in any app writing these tables. RLS + edge-fn discipline is the only boundary. |
| **B. Revert + tighten** | Set `tenants` + `user_tenants` back to `owner: bsu`. Move CRM7's `tenant-management` edge fn writes through a BSU-exposed edge fn proxy (`bsu/admin-tenant-ops`) that CRM7 calls. CRM7's edge fn keeps its 22-action surface but routes mutations through BSU. | Strictest doctrine adherence. **Cost:** ~1-2 weeks of edge-fn work + cross-region latency added to CRM7 admin operations + violates "single canonical write surface" only by hop count, not by who has the keys. |
| **C. Extend the rule schema (PHASE-3c)** | Add per-app writer lists: `{ "owner": "shared", "writers": ["bsu", "crm7"], "readers": [] }`. The rule errors on writes from any app NOT in `writers`. Republish `@bsuite/dry-lint@0.2.0` with the new schema. Migrate `tenants` + `user_tenants` to `writers: ["bsu", "crm7"]`. | Real enforcement at the cost of one more rule iteration. **Aligns with the user's review point #1 PHASE-3c work item.** Best long-term answer. |

### Recommendation

**Option C** — defer until the next session as a focused workstream. In the interim, **revert to Option B's intent** (set both back to `owner: bsu`, but tolerate the CRM7 edge-fn writes via inline `eslint-disable-next-line` comments at the violation sites with a TODO referencing this doc). This preserves rule enforcement while we plan the schema extension.

---

## Item 2 — `team_invitations` and `teams` are NOT IN MAP

WS-G shipped admin RLS policies for `team_invitations` + `teams` (migration `20260426000000_team_members_admin_rls.sql`) but neither table is in `packages/dry-lint/src/ownership-map.json`. `team_members` IS in the map (`owner: bsu, readers: [crm7, r80, throughput]`) but its sibling tables aren't.

This means the dry-lint rule will silently ignore writes to `teams` and `team_invitations` from any app. If throughput or CRM7 (which both have legitimate read access to team membership) start writing these tables, the rule won't catch it.

### Recommendation

Add both tables to the map with `owner: bsu, readers: [crm7, r80, throughput]` (matching `team_members`). Republish `@bsuite/dry-lint@0.1.2` (patch — additive map entries). This is mechanically straightforward — no decision needed beyond "yes, do it."

---

## Item 3 — `shared` schema definition needs documenting

The current `$schema.$comment` says `shared = "co-ownership accepted (audit-trail / append-only sinks)"`. The actual usage in the map covers:

- True audit sinks: `wage_calculation_snapshots`, `tenant_entities_revisions`
- User-self-write pattern: `profiles`
- Multi-app capture flow: `leads`
- **Admin co-ownership (post-WS-I-PHASE-2):** `tenants`, `user_tenants`

These are four different reasons-to-share. The label is overloaded. Whatever you decide on Item 1, the map's `$comment` should distinguish these cases (or split into named labels: `audit_sink`, `self_write`, `multi_capture`, `admin_co_owned`).

### Recommendation

Once Item 1 is decided, update `$schema.$comment` to enumerate the legitimate `shared` reasons + cross-link to this ratification doc. Keep `shared` as the single label for v0.1.x; introduce `writers: [...]` schema extension in v0.2.0 (Item 1 Option C).

---

## Action requested from user

Please decide on Item 1 (A / B / C / something else). Items 2 + 3 are mechanical follow-ups regardless of the Item 1 decision.

Once decided, this doc moves to status `A` (Approved), the resolution is recorded in `bsuite_decisions`, and any required code/map changes follow as a focused PR.

---

**Author:** Claude Opus 4.7 (1M context) — coordinator of 2026-04-25 finish-line session, surfacing per critical-review feedback that Item 1 was buried rather than ratified.
