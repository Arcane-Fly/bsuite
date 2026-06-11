# Charge-Calc + MAPD/Fair Work Integration — New Thread Bootstrap

> **Filed 2026-05-14 by claude-code after MAPD scope-correction incident.**
> Purpose: hand off charge-calc value-with-source + MAPD/Fair Work integration
> work to a fresh thread without repeating the mistakes documented herein.
>
> **Status:** Working draft (v1.00W). Update when continuing the work.

---

## How to use this document

Paste the body of this file (or a curated subset) as the opening message to a
new Claude Code thread. The thread should:

1. **Apply `master-orchestration` first** (project family = BSuite; skill +
   MCP inventory; team formation if multi-stream).
2. **Read the existing docs cited under "MUST READ before any code edit"
   (§4) before touching anything.** No exceptions — Gate A is non-negotiable
   for this work because two prior rounds shipped wrong-target code by
   skipping it.
3. **Grep `.env.local` before filing any operator-action issue.**
4. **Auto-execute aligned-with-preferences decisions** — see §10. Only ask
   when options genuinely conflict with stated preferences.

---

## §1 — Frozen facts (do not re-derive these)

These are **load-bearing** — verify by reading the cited source if in doubt,
do not act against them:

| Fact | Source |
|---|---|
| `@bsuite/charge-calc` is the canonical, single-source calc engine for all charge-rate, payroll-rate, and on-cost calculations across BSuite. NO third engine is allowed. New rules go into `@bsuite/charge-calc` first, then exposed via the calc-bridge pattern. | `crm7/docs/adr/20260423-calc-engine-single-source.md` (ADR-001, Accepted 2026-04-23) |
| **"MAPD" in BSuite codebase context = FWC Modern Awards Pay Database** (Fair Work Commission, `https://api.fwc.gov.au/api/v1`). It is NOT the federal ADMS Apprenticeship Pay endpoint. | `R80.3/docs/20260304-r80-fairwork-api-reference-v1.00W.md`; `docs/archive/20260316-mapd-api-guide-v1.00WA.md` |
| MAPD is read-only public data — auth is **API key only** via `Ocp-Apim-Subscription-Key` header. No OAuth, no OIDC. | FWC official MAPD guide (archived in parent docs) |
| `FAIRWORK_API_KEY` + `FAIRWORK_API_KEY_SECONDARY` are already in `.env.local`. RAM M2M credentials (`RAM_CLIENT_ID`, `RAM_PRIVATE_KEY_PKCS8_B64`, `RAM_CREDENTIAL_ABN`, `RAM_CREDENTIAL_EXPIRES_AT`, `RAM_CREDENTIAL_ENVIRONMENT`) are also already in `.env.local`. | `.env.local` (operator-managed) |
| The 3-layer cache architecture is canonical: in-memory (24h TTL) → live FWC API (3-retry, 1s+2s backoff) → `award_rate_cache` Supabase table (populated by `sync-award-rates` edge function on cron) → empty `[]` final fallback. | `R80.3/docs/20260304-r80-fairwork-api-reference-v1.00W.md` § Cache & Fallback Architecture |
| `R80.3/src/services/fairworkApi.ts` is the canonical FWC client. App code NEVER writes to Layer 3 (`award_rate_cache`) directly — only the `sync-award-rates` edge function populates it. | Same doc, "When to write to which layer" table |
| Annual rollover happens ~1 July each year. The DB cache hold prevents the calculator from regressing if the live API still serves prior-year data on 2 July. | Same doc, "Operational checklist (annual rollover)" |
| **Data ownership boundary:** R80.3 owns FWC fetch (`fairworkApi.ts` + 5 edge functions). CRM7 owns `apprentice_rate_configs`. Both write to shared Supabase tables: `awards`, `award_classifications`, `award_rate_cache`. CRM7 reads via `award_rates`/`host_charge_rates` tables. | `crm7/docs/adr/20260423-calc-engine-single-source.md` § Data flow authority |
| `wage_calculation_snapshots` is **INSERT-only and immutable**. INSERT-only RLS + a trigger that rejects UPDATE/DELETE. Edits happen via compensating snapshots, not by mutation. | `crm7/supabase/migrations/20260423110000_ws2_wage_calculation_snapshots.sql` |
| The `source_provenance` JSONB column on `wage_calculation_snapshots` (added 2026-05-14, R80.3#248 Phase 3) carries `{schema_version: '1.0', captured_at, inputs: {<name>: {source, resolved_value, trace, from_cache, warning?, resolved_at}}}`. NULL for snapshots created before charge-calc 0.3.0. | `crm7/supabase/migrations/20260514100000_add_source_provenance_to_wage_snapshots.sql` |

---

## §2 — Architecture map (charge-calc value-with-source, post-2026-05-14)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ @bsuite/charge-calc@0.3.0 — canonical engine + value-with-source layer   │
├──────────────────────────────────────────────────────────────────────────┤
│  src/calculate.ts          — pure CalcConfig → CalcResult                │
│  src/sources.ts            — ValueSource discriminated union (7 kinds),  │
│                              ResolvedValue<T>, ValueResolver<T>,         │
│                              manualValue(), chainResolvers(), guards     │
│  src/resolvers/             ─┬─ training-days.ts — TrainingDaysResolver  │
│                              │  + TrainingDaysDataAccess interface       │
│                              │  (5 modes: placement / trade-avg /        │
│                              │   trade-year-avg / tenant-pref /          │
│                              │   host-agreed)                            │
│                              └─ wage.ts — WageResolver                   │
│                                 + WageDataAccess interface (live-api    │
│                                 [fair-work / EA / mapd] + manual /       │
│                                 tenant-pref / host-agreed)               │
│  src/awards/                ─── TGA-code → FWC-award mapping             │
│  src/types.ts               ─── CalcConfig / CalcResult                  │
└──────────────────────────────────────────────────────────────────────────┘
                  │                                       │
                  ▼                                       ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────────┐
│ R80.3 (calculator app)          │  │ CRM7 (CRM with charge-rates)        │
├─────────────────────────────────┤  ├─────────────────────────────────────┤
│ services/                       │  │ services/                           │
│  chargeCalcSourceAdapters.ts    │  │  chargeCalcSourceAdapters.ts        │
│   r80TrainingDaysDataAccess     │  │   crm7TrainingDaysDataAccess        │
│   r80WageDataAccess             │  │   crm7WageDataAccess                │
│   (wraps fairworkApi +          │  │   (reads shared awards/             │
│    enterpriseAgreementService + │  │    award_classifications +          │
│    supabase placements +        │  │    enterprise_agreements +          │
│    tenant_settings)             │  │    placements + tenant_settings)    │
│                                 │  │  chargeCalcSnapshotProvenance.ts    │
│  fairworkApi.ts                 │  │   buildSourceProvenance(),          │
│   3-layer cache + retry         │  │   toProvenanceInput()               │
│   exports fetchApprenticeRates, │  │                                     │
│   fetchAwards, fetchClassif…,   │  │ hooks/useChargeCalcResolvers.ts     │
│   syncFairWorkData, etc.        │  │ components/chargeCalc/              │
│                                 │  │  ProvenanceTrail.tsx                │
│  awardRulesEngine.ts            │  │  WageSnapshotProvenance.tsx         │
│   resolveNTWRate,               │  │  SourcePicker.tsx                   │
│   resolveJuniorRateFraction,    │  │                                     │
│   resolveAdultApprenticeFloor   │  │ pages/timesheets/[id]/index.tsx     │
│                                 │  │  (provenance trail wired below      │
│  components/                    │  │   TripleSignOff card)               │
│   R8Calculator.tsx              │  │                                     │
│    (wage input → SourcePicker)  │  │ pages/charge-rates/create/          │
│   chargeCalc/SourcePicker.tsx   │  │  RateInfoTab.tsx, ApprenticeHostTab │
│   AwardRateSelector.tsx         │  │   (NOT YET wired to SourcePicker —  │
│   FairWorkUpdateNotification    │  │    crm7#786 follow-up)              │
│                                 │  │                                     │
│  hooks/useChargeCalcResolvers   │  │ components/awards/AwardSelector.tsx │
│                                 │  │  (existing — full FWC picker)       │
│                                 │  │                                     │
│  supabase/functions/            │  │ supabase/functions/                 │
│   auth-fairwork                 │  │  mapd-sync (separate from R80.3)    │
│   get-fairwork-api-key          │  │                                     │
│   sync-award-rates              │  │                                     │
│   refresh-award-rates           │  │                                     │
│   update-wage-rates             │  │                                     │
└─────────────────────────────────┘  └─────────────────────────────────────┘
                  │                                       │
                  └───────────────────┬───────────────────┘
                                      ▼
                ┌─────────────────────────────────────────────┐
                │ Supabase project tuybltdrdefjblnplpqo       │
                ├─────────────────────────────────────────────┤
                │  awards                                     │
                │  award_classifications                      │
                │  award_rate_cache (Layer 3 of R80.3 cache)  │
                │  apprentice_rate_configs                    │
                │  enterprise_agreements                      │
                │  mapd_webhook_queue                         │
                │  wage_calculation_snapshots                 │
                │   ↳ source_provenance JSONB (NEW)           │
                │  host_charge_rates                          │
                │  mapd_rate_cache  (created by wrong PR —    │
                │   harmless empty table; can be DROP'd)      │
                │  tenant_settings.feature_flags.charge_calc  │
                │  placements                                 │
                │  people.training_day_pattern (JSONB)        │
                │  people.training_days_per_week              │
                └─────────────────────────────────────────────┘
```

### ValueSource discriminated union (7 kinds)

```typescript
type ValueSource =
  | { kind: 'manual'; value: number; note?: string }
  | { kind: 'tenant-preference'; preferenceKey: string }
  | { kind: 'live-api'; api: 'fair-work' | 'enterprise-agreement' | 'mapd' | 'custom';
      params: Record<string, unknown>; asOfDate?: string }
  | { kind: 'placement-derived'; placementId: string; field: string }
  | { kind: 'trade-average'; tradeCode: string; tenantId?: string; lookbackMonths?: number }
  | { kind: 'trade-year-average'; tradeCode: string; apprenticeYear: number;
      tenantId?: string; lookbackMonths?: number }
  | { kind: 'host-agreed'; placementId: string; field: string };
```

### ResolvedValue<T>

```typescript
interface ResolvedValue<T = number> {
  value: T;
  source: ValueSource;
  resolvedAt: Date;
  fromCache: boolean;
  trace: string;       // human-readable e.g. "fair-work(MA000020/EW Y3) → $29.50/hr"
  warning?: string;    // e.g. "rate is 130 days old"
}
```

---

## §3 — What's shipped vs what remains

### Shipped (reference these PRs for context)

| | What | PR |
|---|---|---|
| ✅ | `@bsuite/charge-calc@0.3.0` — value-with-source architecture, 681 tests | bsuite#997 |
| ✅ | R80.3 + CRM7 source adapters | R80.3#250 + crm7#783 |
| ✅ | `source_provenance` JSONB column on `wage_calculation_snapshots` + GIN index (migration applied to prod via Supabase MCP) | crm7#784 |
| ✅ | Provenance builder service (`buildSourceProvenance()`, `toProvenanceInput()`) | crm7#784 |
| ✅ | R80.3 calculator wage input → SourcePicker + `useChargeCalcResolvers` hook | R80.3#252 |
| ✅ | CRM7 `useChargeCalcResolvers` hook + `ProvenanceTrail` UI + `WageSnapshotProvenance` wrapper + wired into `pages/timesheets/[id]/index.tsx` next to `TripleSignOff` card | crm7#787 |
| ✅ | R80.3#248 epic CLOSED with full evidence | — |

### Remaining (in priority order)

| Priority | Item | Where | Notes |
|---|---|---|---|
| **P1** | Wire SourcePicker into CRM7 `pages/charge-rates/create/RateInfoTab.tsx` + `ApprenticeHostTab.tsx` | crm7#786 (issue filed) | RateInfoTab is god-component (~1100 lines); existing `<AwardSelector>` becomes the params editor for `live-api` source kind. Use `renderSourceParams` escape hatch on `<SourcePicker>`. |
| **P2** | TGA-code → FWC-award mapping in `WageDataAccess.fromMapd` (or remove the `mapd` kind entirely) | crm7+R80.3 adapters | Right now `fromMapd` returns null with docs saying "use `source.api='fair-work'` directly". The TGA mapping logic exists in `R80.3/src/services/awardRulesEngine.ts`. Decide: extract to `@bsuite/charge-calc/awards/` OR remove the `mapd` kind from the union (one less concept). |
| **P2** | Read-side query to surface provenance trail on the `pages/charge-rates/[id]/index.tsx` view (not just timesheet detail) | crm7 | The snapshot is keyed by `timesheet_id`, but the charge-rate view should also show "this rate was last calculated using {provenance}". Likely needs a new query against `host_charge_rates` joined with `wage_calculation_snapshots`. |
| **P3** | Drop the harmless empty `mapd_rate_cache` table | parent migration | Created by the wrong-scope PR. Empty. Can be DROP'd in a tiny cleanup migration if cleanliness matters. |
| **P3** | Annual review dry-run UI — show charge-rate diff against next year's draft rates | crm7 | FWC publishes draft rates ahead of 1 July; calculator should show "what will the charge rate be from 2026-07-01" without writing snapshots. |

---

## §4 — MUST READ before any code edit

These docs answer "how does this work today" and prevent the wrong-scope work that was redone three times in the prior session:

| Path | Why |
|---|---|
| `R80.3/docs/20260304-r80-fairwork-api-reference-v1.00W.md` | Cache architecture, retry semantics, per-function fallback ladder, annual-rollover checklist. **Cited by every charge-calc PR.** |
| `crm7/docs/adr/20260423-calc-engine-single-source.md` | ADR-001: `@bsuite/charge-calc` is the canonical engine. Data flow authority table. Calc-bridge pattern. |
| `docs/adr/ADR-0001-page-builder-ownership.md` through `ADR-0007` | Architectural boundaries (page-builder, schema-builder, OAuth allow-list, schema consolidation, RAMS funding, contact propagation, Stripe FDW). |
| `docs/archive/20260316-mapd-api-guide-v1.00WA.md` | Official FWC MAPD developer guide (archived in parent). Auth = API key only, REST + JSON, OAS3. |
| `docs/20260227-dry-one-shot-architecture-v1.01A.md` | Entity ownership map. RAMS funding under CRM7. funding_claims under CRM7. |
| `crm7/docs/plans/20260423-bsuite-gto-master-plan-v1.00W.md` | WS-2 (wage_calculation_snapshots), WS-A (GTO billing/payroll/reporting), WS-E (one-shot propagation). |
| `docs/20260506-integrations-parity-spec-v1.00W.md` | Vendor integration patterns + reusable webhook tables. References `mapd_webhook_queue` as the canonical retry-queue pattern. |
| `R80.3/src/services/fairworkApi.ts` | Implementation of the 3-layer cache + retry. Read source before adding any new fetch path. |
| `R80.3/src/tests/fairworkCacheFallback.test.ts` | Behaviour suite — exercises every path in the fallback ladder. |
| `packages/charge-calc/src/sources.ts` + `resolvers/*.ts` + `__tests__/sources.test.ts` | Value-with-source contract + 30 test cases. |

---

## §5 — Operational facts (env, secrets, edge functions)

### `.env.local` (operator-managed; grep BEFORE filing any infra issue)

Already configured:
- `FAIRWORK_API_KEY` (primary)
- `FAIRWORK_API_KEY_SECONDARY` (failover)
- `KEYSTORE_PATH` + `KEYSTORE_PASSWORD` (FWC API auth)
- `RAM_CLIENT_ID` (e.g. `ABRD:21662181740_crm7`)
- `RAM_PRIVATE_KEY_PKCS8_B64` (RAM M2M)
- `RAM_LEAF_CERT_B64` (RAM cert)
- `RAM_CREDENTIAL_ABN`
- `RAM_CREDENTIAL_EXPIRES_AT` (gate against issuing tokens past expiry)
- `RAM_CREDENTIAL_ENVIRONMENT` (`evte` or `production`)
- Plus Xero, Stripe, Supabase, Vercel, AI Gateway keys.

### Edge functions — canonical surface

**R80.3** (`R80.3/supabase/functions/`):
- `auth-fairwork` — proxies `https://api.fwc.gov.au/api/v1/*` with `Ocp-Apim-Subscription-Key`. JWT-gated.
- `get-fairwork-api-key` — fetches API key from env or `api_keys` table.
- `sync-award-rates` — populates Layer 3 (`award_rate_cache`).
- `refresh-award-rates` — refresh entrypoint.
- `update-wage-rates` — manual update.

**CRM7** (`crm7/supabase/functions/`):
- `mapd-sync` — separate from R80.3 (different consumer surface).
- `ram-token-exchange` — RAM M2M JWT-bearer token exchange (already wired for Xero, USI, etc.).
- `xero-token-exchange`, `xero-webhook`, `xero-invoice-submit` — Xero stack.
- `tga-search`, `tga-sync`, `tga-organisation-sync` — TGA stack.
- `classify-issue` — Jodie classifier.

### Supabase tables (key ones for this work)

- `awards` — FWC awards
- `award_classifications` — per-award classifications
- `award_rate_cache` — Layer 3 of R80.3's MAPD cache
- `apprentice_rate_configs` — CRM7-owned
- `enterprise_agreements` — tenant-saved EAs
- `mapd_webhook_queue` — webhook retry queue
- `wage_calculation_snapshots` — immutable audit (now with `source_provenance` JSONB)
- `host_charge_rates` — R80.3-written, CRM7-read
- `mapd_rate_cache` — created in error 2026-05-14, harmless empty
- `tenant_settings.feature_flags.charge_calc.<key>` — per-tenant preferences for charge-calc inputs
- `placements` — `training_days_per_week`, `trade_code`, `apprentice_year`, `agreed_wage`, `agreed_training_days`
- `people.training_day_pattern` (JSONB) + `people.training_days_per_week`

---

## §6 — Principles expected in your work

These are **non-negotiable**. They override default model behaviour.

### 6.1 — Anti-Laziness & Zero-Defer (`bsuite/CLAUDE.md` §1)

- **Banned**: "I'll do that next session"; "leaving this for another agent";
  "judgment call requires fresh context"; using pre-existing issues as an
  excuse to ignore a problem you noticed.
- **Required**: 100% completion in the current cycle; if genuinely blocked
  by an external dependency, file a formal repo issue and **return to it**
  before declaring the overarching task done.

### 6.2 — Master-orchestration first (`~/.claude/CLAUDE.md`)

Every turn starts by:
1. Detecting project family (BSuite here).
2. Inventorying skills + MCPs available.
3. Forming a team if multi-stream (TeamCreate + Agent dispatch).
4. Distributing skills + MCPs across plan steps — every step MUST cite
   which skill + which MCP it uses. "I'll use Context7" is not enough —
   say *why*.

### 6.3 — Five gates (~/.claude/CLAUDE.md)

| Gate | Fires when | What |
|---|---|---|
| **A** Pre-Edit Inventory | Library/framework/runtime question | Query `Context7` MCP for installed version; invoke `best-practice-research` skill explicitly; read installed source. |
| **B** Live-Test | UI/runtime/network change | (B.1) Playwright/chrome-devtools live-test with before/after evidence. (B.2) Deployed-UX test as a real user — wait for deploy READY, sign in, exercise the feature with the full project-requirements checklist (theme/style/UI/UX/cross-module/navigation/intuitive-but-powerful), verify upstream + downstream, capture proof. |
| **C** Named-Skill-Over-General-Purpose | Sub-task with a dedicated skill | Use `Skill` tool with the named skill; do NOT substitute `general-purpose` agent. |
| **D** Re-Inventory Per Edit Phase | Major task-class change OR new file/module | Re-run §6.2 inventory and cite it. |
| **E** No Retroactive "Honest Answer" | About to write "Honest answer: I didn't actually do X" | STOP. Run the missing gate now. The orchestration's job is to make gates impossible to skip in the first place. |

### 6.4 — Self-Validation Loop (`bsuite/CLAUDE.md` §9, FF-SELF-VALIDATION-20260507)

Every PR description MUST include:

```markdown
## Evidence
- [ ] Output-equivalence (§9.1) baseline + diff: <path or N/A>
- [ ] Visual-equivalence (§9.2) reference + after screenshots: <path or N/A>
- [ ] Self-report block: known divergences from spec or "none"
- [ ] Tests run: <command + result>
- [ ] Live verify: <URL + observation>
```

Banned: "Looks correct" without screenshot; "Should work" without running it;
"Tests will be added later" without an issue link; "Visually matches" without
a side-by-side image pair.

### 6.5 — Auto-execute when aligned (memory: `feedback_auto_execute_when_aligned.md`)

When a decision has a clear "best long-term" option that matches stated
preferences (DRY, cross-module consistency, highest UX, named-skill discipline,
design-system adherence, frozen-rule respect, anti-deferral, no `workspace:*`
deps, AI Gateway = `xai/grok-4.20-reasoning`, D2C Neon Electric oklch theme,
BS OAuth 2.1 PKCE + JWKS), **execute that option automatically. No A/B/C menu.
No "want me to..." question.**

Reserve option-presentation for cases where multiple options genuinely
conflict with stated preferences OR external dependency makes auto-choice
unsafe.

### 6.6 — Operator's stated general preferences (from CLAUDE.md + memory)

1. DRY one-shot architecture (entity ownership map, FK-backed selectors, no
   app-local mirror tables)
2. Cross-module consistency (if shadcn used in one app → all apps; oklch
   tokens for D2C; React 19 + Tailwind v4 across all apps)
3. Highest possible UX (theme + style + UI library + UX + nav discoverability
   + intuitive-but-powerful)
4. Named-skill discipline (use dedicated skills, not general-purpose; Context7
   for library docs; Playwright for live UI verification)
5. Frozen-migration rule (never edit applied migrations; corrections go in
   NEW migrations; verify via `supabase_migrations.schema_migrations`)
6. Anti-deferral (every task gets a concrete outcome this cycle)
7. No `workspace:*` / `file:../packages/*` deps in deployable `package.json`
   (Vercel breaks)
8. AI Gateway model = `xai/grok-4.20-reasoning` (don't downgrade)
9. D2C Neon Electric oklch theme for crm7/BSU/conduit/R80.3/throughput;
   Braden Red/Gold for braden
10. Auth: BS OAuth 2.1 PKCE + JWKS; never cookie SSO; never HS256

### 6.7 — Verify before claiming done (memory: `feedback_verify_operator_queue_before_citing.md`)

Cross-check every issue/PR cited as "pending operator action" via `gh issue view`
BEFORE listing — never cite from prior-session memory alone. Run the
verification commands in this thread.

### 6.8 — Grep `.env.local` first (memory: `feedback_grep_env_first.md`)

Before filing any "operator action required" issue for credentials/API
keys/third-party access:

```bash
grep -iE '<integration-name-and-aliases>' /home/braden/Desktop/Dev/bsuite/.env.local
```

Cross-reference with existing edge functions + service code. Only file an
operator-action issue if all three are absent. Names that look interchangeable
but aren't:

- **MAPD** = FWC Modern Awards Pay Database (NOT federal ADMS)
- **ADMS** = federal Apprenticeship Data Management System (different scope)
- **AASS** = Australian Apprenticeship Support Services (operates ADMS)
- **RAM** = Relationship Authorisation Manager (ATO M2M)
- **USI** = Unique Student Identifier registry (uses RAM)
- **TGA** = Training.gov.au (uses ABRD credentials)

### 6.9 — Don't re-build what exists (lesson from R80.3#248)

The R80.3#248 issue body claimed +2963 LOC of new infra was needed.
Audit found:

- `@bsuite/charge-calc@0.2.5` already had the canonical calc engine
- R80.3 already had 20+ services including Fair Work API + EA
- crm7 already had `training_day_pattern` migration

The **only** missing piece was the value-with-source layer. Always audit
existing code before scoping new code.

### 6.10 — npm publish auto on merge (memory: `feedback_npm_publish_auto_on_merge.md`)

`@bsuite/*` packages auto-publish to npm on merge to `main`. NEVER tell
the operator to run `npm publish` — the CI workflow handles it.

### 6.11 — No Codebuff lane preserve (memory: `feedback_no_codebuff_lane_preserve.md`)

Codebuff stopped 2026-05-13. Every Codebuff draft must be
**FINISH/CLOSE/CONVERT/REASSIGN** this cycle. Don't classify as "preserve
by intent". Already-closed Copilot PRs in tracking issues should be cited
when closing.

### 6.12 — Memory protocol (`bsuite/CLAUDE.md` §Persistent Memory)

- Read `bsuite_pending_actions` at session start
- Write `bsuite_session_YYYYMMDD` + `bsuite_sleep_packet_YYYYMMDD` before
  compaction/end
- Write IMMEDIATELY after commits / arch decisions / env changes
- Namespace: `bsuite_*`. NEVER write to `qig_*`, `vex_*`, `pantheon_*`.

### 6.13 — Dashboard protocol (`bsuite/CLAUDE.md` §10)

Every PR/issue change requires a dashboard update in the same session.
Live URL: https://garyocean428.github.io/bsuite/dashboard/. Source of truth:
`docs/dashboard/data/dashboard-data.json` + every plan under
`docs/plans/**/*.md`. Refresh script: `python3 docs/dashboard/refresh-data.py`.
Inline script: `bash docs/dashboard/inline-data.sh`. Branch-protection
requires PR — no direct push to development.

---

## §7 — Recommended workflow for continuing this work

1. **Apply `master-orchestration`** (project family BSuite, skill + MCP
   inventory, team formation if multi-stream).
2. **Read `bsuite_pending_actions` memory** to pick up where the prior
   thread left off:
   ```bash
   curl https://qig-memory-api.vercel.app/api/memory/bsuite_pending_actions
   ```
3. **Read this document end-to-end** before the first code edit.
4. **Read the docs cited in §4** — the prior session shipped wrong-target
   work twice by skipping this step.
5. **Decide which P1/P2/P3 to attack** (see §3 "Remaining"). Auto-execute
   per §6.5 — pick the option that matches stated preferences best;
   execute without asking.
6. **Use TodoWrite** for any task with 3+ steps.
7. **For UI work**: Gate B.2 deployed-UX test is mandatory. Wait for
   Vercel READY, sign in, exercise the full flow, capture screenshots.
8. **Every PR must include the §6.4 Evidence block.**
9. **Commit messages**: conventional commits (`feat`, `fix`, `chore`, etc.)
   with the right scope (`crm7`, `r80`, `shared`, etc.).
10. **Memory write** after each significant action — don't batch to end of
    session.

---

## §8 — Tools + skills to load (Gate C)

For this work specifically:

| Need | Skill / MCP / Agent |
|---|---|
| FWC MAPD API docs / response shape | Read `R80.3/docs/20260304-r80-fairwork-api-reference-v1.00W.md` (already canonical — don't re-research from FWC website) |
| Library docs (TanStack Query, Zod 4, Vercel AI SDK) | `Context7` MCP — query for installed version, read installed source |
| Schema/migration patterns | `supabase-postgres-best-practices` skill |
| React/TanStack Query patterns | `vercel-react-best-practices` skill |
| Plan writing (multi-step features) | `writing-plans` skill |
| Subagent-driven implementation | `subagent-driven-development` skill |
| Live UI verification | `Playwright` MCP (preferred — already in BSuite stack) OR `chrome-devtools-mcp` |
| Codebase exploration (3+ queries) | `Explore` agent (NOT `general-purpose`) |
| Best-practice research (current versions) | `best-practice-research` skill (NOT general-purpose agent) |
| Security review | `security-audit` skill |
| Code review | `feature-dev:code-reviewer` agent |

Available MCPs (verify in your session):
- `Context7` — current docs for any library
- `Supabase` — schema/migrations/advisors/logs
- `Vercel` — deployments/logs/projects
- `Playwright` / `chrome-devtools-mcp` — UI verification
- `GitHub` — PRs/issues/checks (also `gh` CLI as fallback)
- `microsoft-docs` — Azure/Entra
- `google-dev-knowledge` — Google APIs/OAuth
- `Stripe`, `BrowserBase`, `Make`, `Zapier` — vendor MCPs

---

## §9 — How to verify before claiming done

For each remaining task in §3:

### P1 — SourcePicker into RateInfoTab + ApprenticeHostTab

| Verification | Command/check |
|---|---|
| TypeScript compiles | `cd crm7 && pnpm typecheck` |
| Existing tests pass | `pnpm test --run` |
| New behavioural test for source flow | Add to `src/pages/charge-rates/create/__tests__/` |
| Visual diff before/after | Playwright screenshot at desktop + mobile, side-by-side with current page |
| Live verify on dev | Deploy to dev URL (`d.crm.crm7.app`), sign in, walk through create-charge-rate flow with each source kind |
| Provenance captured into form state | Inspect saved `chargeRateStore` → ensure `source_provenance` populated when snapshot saves |

### P2 — TGA-code → FWC-award mapping

| Verification | Command/check |
|---|---|
| Mapping function unit tests | `pnpm test --run packages/charge-calc/src/awards/` (extends existing tests for `mapd-mapper`/`mapd-client`) |
| Round-trip test | Given a TGA qualification code (e.g. `CER40120`), resolver returns a valid FWC award + classification + rate matching the existing `awardRulesEngine` resolution |
| Decision: extract to package OR remove `mapd` kind from `ValueSource` union | Either ships in a follow-up that updates types in @bsuite/charge-calc, bumps version, propagates to consumers |

### P3 — Provenance trail on charge-rate detail page

| Verification | Command/check |
|---|---|
| Read query joins `host_charge_rates` to latest `wage_calculation_snapshots` | Inspect SQL via Supabase MCP `execute_sql` against prod |
| Empty-state handled (snapshot never written for this charge rate) | Render path tested with `provenance=null` |
| RLS allows the read | Test as a non-platform-admin user; should still see provenance for own tenant |

---

## §10 — Anti-patterns from the prior session (don't repeat)

| What went wrong | What to do instead |
|---|---|
| Built a `mapd-apprentice-rate` edge function targeting a non-existent federal ADMS Azure APIM endpoint | Grep `.env.local` first; read existing `R80.3/src/services/fairworkApi.ts` and `R80.3/docs/20260304-r80-fairwork-api-reference-v1.00W.md` BEFORE assuming a new integration is needed |
| Filed bsuite#998 "operator must register with ADMS portal" when credentials were already in `.env.local` under "Fair Work Commission MAPD API" | Always grep `.env.local` for the integration name + plausible aliases before filing operator-action issues |
| Subagents stalled and produced no usable output | If an Explore agent stalls, do the research directly via `find`/`grep`/`Read`. Don't wait for it to recover. |
| Tried to wire SourcePicker into a 1100-line god-component (RateInfoTab) without scoping the integration first | Either scope a focused integration plan with red-team review (writing-plans + multi-agent-red-team-planning skills) OR file as P2 follow-up issue (which I did — crm7#786) |
| Pushed a change with unused-variable lint failure (handlePayRateChange after refactor) | Run `pnpm lint` locally before commit; husky pre-commit catches it but cleaner to catch sooner |
| Used `useRef` then mutated `.current` during render (React 19 lint error) | Use `useMemo` for derived constant values; refs are for transient values not needed during render |
| Confused MAPD (FWC) with ADMS (federal) and shipped wrong-target code 3 times | Glossary in §6.8 is authoritative — re-read whenever a 3-letter-acronym integration name appears |
| Filed an operator-decision blocker without spelling out the actual choices | Per "tell me what i'm deciding" feedback, BLOCKER issue bodies must enumerate the options A/B/C with bsuite-lead recommendation, not just point at the issue |

---

## §11 — Closing checklist for this work

When the work in §3 is genuinely done end-to-end, the new thread should:

1. ✅ All P1 + P2 + P3 items from §3 either shipped or moved to follow-up
   issues with concrete acceptance criteria
2. ✅ All shipped PRs include the §6.4 Evidence block
3. ✅ Memory updated:
   ```bash
   curl -X PUT https://qig-memory-api.vercel.app/api/memory/bsuite_pending_actions \
     -H "Content-Type: application/json" \
     -d '{...current state including this work\'s outcomes...}'
   ```
4. ✅ Dashboard updated — `summary` counters reflect issue closures, plans
   under `docs/plans/**` re-synced via `refresh-data.py`, JSON re-inlined
   via `inline-data.sh`, PR opened against `development` (branch-protected)
5. ✅ R80.3#248 close-out report (already filed) extended with any new
   sub-PRs from this thread
6. ✅ Operator gets a concise final report — what shipped, what's still
   open with reasons, what (if anything) needs operator action (with the
   `feedback_grep_env_first.md` rule applied first)

---

## §12 — Memory key references

Read at session start:
- `bsuite_pending_actions` — current ship state
- `bsuite_sleep_packet_YYYYMMDD` — most recent sleep packet
- `_user_profile` — operator profile (lawyer, GTO industry expert, WA-based)

Memory feedback rules to honour (full list in `MEMORY.md`):
- `feedback_auto_execute_when_aligned.md` (§6.5)
- `feedback_grep_env_first.md` (§6.8) — added 2026-05-14 from this session
- `feedback_no_codebuff_lane_preserve.md` (§6.11)
- `feedback_npm_publish_auto_on_merge.md` (§6.10)
- `feedback_verify_operator_queue_before_citing.md` (§6.7)
- `feedback_oauth_session_bridge.md`
- `feedback_squash_loses_parent_linkage.md`
- `feedback_blocker_framing_corrections.md`
- `feedback_minimal_diff_antipattern.md`

---

*Last updated: 2026-05-14. Maintained by claude-code (BSuite agent).
Update when continuing the work to keep it useful for the thread after this one.*
