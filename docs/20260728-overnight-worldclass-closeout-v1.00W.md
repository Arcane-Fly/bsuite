# Overnight world-class close-out — master backlog + loop state

**Status:** W · **Silo:** bsuite · **Started:** 2026-07-28  
**Operator law:** Nothing identified is left unactioned. Identification without implementation is failure.  
**OAuth law:** `agents/supabase-auth-comprehensive` is non-negotiable for all auth work.  
**Budget law:** Turn/time limits do not apply — complete everything; use sub-goals of ~20 turns as needed.

## Tracking system (council + Fable)

### Single source of truth
| Artifact | Role |
|----------|------|
| **This file** | Master backlog + wave status + evidence links |
| `bsuite_overnight_closeout_state` (Memory API) | Live machine state: current wave, open PRs, blockers |
| `bsuite_session_latest_v2` | Session pointer for multi-agent handoff |
| Extreme ledger | `20260727-multiapp-agent-blindspot-investigation-ledger-v1.00W.md` |
| Extreme execution | `20260727-extreme-poor-agent-items-execution-v1.00W.md` |
| Schema pin plan | `20260727-schema-package-pin-plan-v1.00W.md` |
| OUTSTANDING + remaining-work roadmap | Living docs (not archive) |

### Item schema (every backlog row)
`ID | P0–P3 | Wave | Owner repo | Status | Evidence | Verifier | Downstream`

Statuses: `TODO → DOING → PR → MERGED → PROMOTED → VERIFIED`

### Verifier (maker ≠ checker)
1. vitest/tsc/lint on owning app  
2. PR CI green  
3. development → main promote when app tip ahead  
4. `refs/heads/development` still exists after promote  
5. Cross-app applicability note (SR-BS-APPLY-EVERYWHERE)  
6. OAuth items: skill verification checklist (JWKS, PKCE localStorage, grants CSV, no cookie SSO)

### Parallelism
**One mutation lane per repo.** Parallel OK across repos. Parent pointers after app merges.

## Priority tiers

| Tier | Criteria | Examples |
|------|----------|----------|
| **P0** | Security, money races, auth wrong, branch deletion, broken mainline | OAuth/JWKS/PKCE, funding RPC, cookie SSO, delete_branch_on_merge |
| **P1** | User-visible product debt with evidence contract | Unglue ledger, schema pins, e2e flakes |
| **P2** | Cross-app consistency / package / docs drift | BSU/R80/throughput pins, incomplete docs archive |
| **P3** | Polish / long epics | Feature epics (invites, Xero, page-builder north-star) — track + start, not abandon |

## Waves (ordered)

### Wave 0 — Unblock mainline (NOW)
- [ ] Merge crm7#1232 promote burn-6 when build green; FF development=main  
- [ ] Parent pointer PR for crm7 tip  
- [ ] Confirm delete_branch_on_merge=false on all app repos  

### Wave 1 — OAuth 2.1 perfection (P0)
Skill: supabase-auth-comprehensive  
- [ ] JWKS non-empty (not HS256 empty keys)  
- [ ] OAuth discovery endpoints  
- [ ] oauth_clients grant_types no spaces, CSV  
- [ ] PKCE localStorage + TTL (no sessionStorage for verifier)  
- [ ] Callback idempotent  
- [ ] cookieStorage / business_suite_auth absent in live clients  
- [ ] oauth-contract tests green all apps  
- [ ] Redirect URI allowlist d.* + prod documented  
- [ ] Fix every FAIL  

### Wave 2 — Money / data integrity residuals (P0)
- [x] fundingService → atomic approve/reject (#1226)  
- [ ] Confirm migration applied or queued for linked DB  
- [ ] Grep remaining non-atomic money paths  
- [ ] SECDEF allowlist for new funding RPCs if advisor fails  

### Wave 3 — Unglue to zero (P1)
- [ ] Burn-7…N until PENDING_UNGLUE_EXCLUSIONS only legit composites  
- [ ] Legit composites must have specific WHY (not generic Legacy)  
- [ ] BSU remaining 9 widgets burn  
- [ ] R80/throughput contract port if PageGrid/Canvas present  

### Wave 4 — Package pins (P1/P2)
- [x] crm7 schema-builder 1.0.1 + registry 1.0.0 (#1228)  
- [ ] BSU pin  
- [ ] conduit pin  
- [ ] R80 pin  
- [ ] throughput registry pin  
- Lockfiles outside monorepo tree only  

### Wave 5 — Types / routes / indexes / lints (P1)
- [ ] Per-app `tsc --noEmit` / lint on development  
- [ ] Fix failures; no deferred  
- [ ] Route inventory: public routes in both auth trees where catch-all exists  
- [ ] FK / index advisor residuals if CI fails  

### Wave 6 — Docs / OUTSTANDING / incomplete inventory (P2)
- [ ] Execute INCOMPLETE rows from docs deep-dive inventory by leverage  
- [ ] Update OUTSTANDING + remaining-work roadmap checkboxes with evidence  
- [ ] No stale “shipped” claims without code citation  

### Wave 7 — Cross-app SR-BS-APPLY-EVERYWHERE (P1)
- [ ] Transparent cards / expandable nav / edit-page pencil parity matrix  
- [ ] Legal privacy/terms on all apps that need Google OAuth  
- [ ] CORS allowlist class  
- [ ] useShallow / zustand selector class  

### Wave 8 — Nothing-missed proof (P0 gate)
- [ ] Full open-PR list empty (or deferred with operator-visible blocker only)  
- [ ] Ledger only legit  
- [ ] OAuth skill verification commands green  
- [ ] Memory keys updated  
- [ ] Master backlog all VERIFIED or explicit DEFER with reason + ticket  

## Live inventory snapshot (start of overnight)

| Surface | State |
|---------|--------|
| crm7 open | #1232 promote burn-6 (CI) |
| crm7 ledger | 72 on development; 81 on main until promote |
| conduit/BSU/R80/throughput | development=main tips |
| delete_branch_on_merge | false on crm7, conduit, throughput |
| Money RPC | #1226 merged development |
| Schema pin crm7 | #1228 merged |
| E2E smoke flake | #1230 merged |
| Investigation ledger | 45 items ranked |
| Claude Code | weekly limit until ~14:00 Perth |
| Qwen | 0.21.0 agentic OK; long Bailian completion timeout |

## Anti-miss protocol
1. Before claiming done: grep open PRs all 7 repos = empty  
2. Re-read extreme ledger 40–45 and this Wave list — every row VERIFIED  
3. Run OAuth verification block from skill  
4. Cross-app matrix table filled  
5. Silo `bsuite_overnight_closeout_state` matches this file  

## Sub-goal cadence
Each ~20-turn sub-goal: pick one wave slice → implement → PR → verify → update this file + silo → next.  
Never stop on “identified only.”

## Progress log (2026-07-27T17:59Z)

### Wave 0 — mainline
- [x] burn-6 promoted (#1232)
- [x] burn-7 merged development (#1235) after Fragment flatten fix
- [ ] promote #1237 development→main (CI)
- [x] delete_branch_on_merge=false on app repos

### Wave 1 — OAuth
- [x] JWKS ES256 non-empty (live)
- [x] OAuth discovery grants authorization_code+refresh_token
- [x] BS OAuth bridge detection localStorage (#1233)
- [x] conduit return_path localStorage (#384)
- [x] Xero PKCE localStorage+TTL PR #1236 (CI)
- [x] cookie SSO live clients clean (docs/comments only)
- [ ] Xero #1236 merge + promote

### Wave 3 — unglue
- ledger path: ~123 → 92 → 81 → 72 → 63 → **57** (burn-8 in flight)
- systemic fix: DraggableCardPage flattens Fragments (burn-7 CI root cause)

### Wave 4 — schema pins
- [x] crm7 / conduit / BSU / R80 / throughput on published 1.0.x (origin tips)
- [x] all apps promoted main=dev tips earlier this session

### Still open this session
- crm7#1236 Xero PKCE
- crm7#1237 promote burn-7
- burn-8 finish → PR → burns until ledger only legit
- BSU remaining widgets
- residual lint/type/route sweeps if CI flags
- nothing-missed final matrix

### Progress pulse (2026-07-27T18:45Z)
- burn-6..9 path: ledger ~123→**48** (burn-9 PR #1240; burn-10 running)
- #1235 Fragment flatten MERGED; #1236 Xero PKCE MERGED+on main; #1238 burn-8 MERGED; #1239 promote MERGED
- Schema pins all apps 1.0.x done earlier
- Open: #1240 burn-9 CI, burn-10, residual burns to legit-only

