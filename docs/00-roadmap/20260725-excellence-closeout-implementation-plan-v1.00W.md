# Excellence close-out — implementation plan

> ## ⚠ SUPERSEDED — 2026-08-17
>
> **Do not execute this plan.** Its target application, **R80.3**, left the submodule set on
> 2026-08-06 (`5e000c35`, operator directive) and was replaced by **R80.4** — a different codebase.
> Every R80.3 work item here is aimed at a repository this monorepo no longer builds or deploys.
>
> **Current authority:** [`../20260814-estate-remaining-work-register-v2.00F.md`](../20260814-estate-remaining-work-register-v2.00F.md).
>
> Retained as the record of what the 2026-07-25 excellence loop decided and shipped. If you need an
> item from here, re-measure it against R80.4 first — do not assume it carries over.


> Status **W** · 2026-07-25 · Red-team planning ×2 → implement via subagent-driven development  
> Silo: `bsuite` · Index: `bsuite_project_truth_index`  
> Objective lock: **Ship remaining shippable excellence gaps with binary verifiers; document operator-blocked items honestly; no Sydney cutover; no fake STA PROVEN promotion.**

## Situation report

| Fact | Evidence |
|------|----------|
| Parent HEAD | `4bee484c` on `development` == `main` after #1638/#1639 |
| crm7 HEAD | `10550ca6` — host capacity + leave/FO Jodie tools **promoted** |
| conduit HEAD | `ef47267` — STA parser enrich **promoted** |
| `@bsuite/ui@1.0.0` on npm | **lacks** `sanitizeCustomCss` in published `dist/` (source added, version not bumped → publish skipped) |
| LocalisedDateInput ISO | crm7 gold via `tryParseUserInput` ISO fallback; R80/conduit/BSU/braden/throughput have `tryParseIsoFallback` |
| Jodie leave + FO | Wired in `createToolRegistry` + `getAllToolNames` — parity matrix **stale** (still lists MISSING) |
| Funding tools | R80 `createFundingTools` exported; **not** in crm7 registry; R80 has no full chat registry consumer |
| KAP amounts | Prose in `fundingSchemes` description only — **no** structured `effectiveFrom`/`amount` timeline |
| STA PROVEN_STATES | `wa`,`nt` only — live samples required |
| Sydney #1322 | Runbook ready; cutover operator-gated |
| External research APIs | Tavily 401 this session — used in-repo research `docs/research/20260725-gto-compliance-ux-research-v1.00W.md` + npm publish workflow docs |

### Out of scope (explicit)

- Supabase Sydney production cutover  
- Promoting STA states without live emails  
- Full LocalisedDateInput calendar extract to package  
- Mass `auth_rls_initplan` rewrite (51 findings)  
- Payslip generation (needs payroll document model)  
- Developer Feature Builder via Jodie (`apply_feature_migration` chat)  

---

## Final task breakdown (post Round-1 recon + anticipated RT findings)

### T0 — Truth hygiene (docs) — parent repo
**Goal:** Align ledger, parity matrix, OUTSTANDING pointers with shipped reality.  
**Files:**  
- `docs/audits/20260725-jodie-parity-matrix-v1.00F.md`  
- `docs/20260725-excellence-program-master-ledger-v1.00W.md`  
- `docs/00-roadmap/*` (this plan + master roadmap)  
**AC:**
- [ ] Leave tools + FO case note + host capacity marked FULL in parity matrix  
- [ ] Ledger next-queue matches this plan  
- [ ] No claim that leave/FO are still missing  

### T1 — Publish `@bsuite/ui` with `sanitizeCustomCss` — parent  
**Goal:** Make canonical sanitizer reachable from registry; apps can pin later.  
**Why:** Source on development but version still `1.0.0` already on npm → OIDC publish no-ops.  
**Files:**  
- `packages/ui/package.json` → `1.0.1`  
- `packages/ui` rebuild `dist/` including `branding/sanitizeCustomCss.*`  
- Optional: BSU/crm7 re-export comment stays until pin  
**AC:**
- [ ] `npm view @bsuite/ui version` ≥ `1.0.1` after main publish  
- [ ] `node -e "import('@bsuite/ui').then(m=>console.log(typeof m.sanitizeCustomCss))"` → `function` (or package export path)  
- [ ] Unit test in package for forbidden tokens  
- [ ] Publish-before-consumer doctrine: no app pin bump until publish verified  

### T2 — Jodie enterprise-admin thin tools — crm7 only  
**Goal:** Close 3 MISSING enterprise-admin manual lines using **existing** BSU-owned surfaces via RPC/table access already available to authorized users — **no new SECDEF**, no `apply_feature_migration`.  
**Tools:**
1. `list_enterprise_sub_orgs` — query tenants where `parent_tenant_id = context.tenantId` (membership-gated by RLS)  
2. `create_enterprise_sub_org` — call existing pattern: `create_organization_with_owner` + set `parent_tenant_id` **only if** caller is enterprise admin / owner of parent (mirror `adminService.createSubOrganization` authz)  
3. `set_tenant_feature_flag` — upsert `tenant_features` for a child tenant in hierarchy (same gates as BSU Features page)  

**Files:**  
- `crm7/src/lib/ai/tools/enterprise-admin-tools.ts` (+ test)  
- `crm7/src/lib/ai/tools/index.ts` registry + `getAllToolNames`  
**AC:**
- [ ] Permission deny without enterprise/owner role  
- [ ] Cannot set features on unrelated tenant  
- [ ] Vitest covers happy + deny paths  
- [ ] No new migration unless authz helper missing (prefer client-side + RLS)  
- [ ] Advisor: if any new SECDEF required → allowlist same PR  

### T3 — Wire funding offset into R80 assistant path + document crm7 boundary — R80.3  
**Goal:** `createFundingTools` is callable from R80 AI surface if one exists; else add minimal registry hook used by existing assistant entry.  
**Files:**  
- `R80.3/src/lib/ai/*`  
- Grep first for chat/agent entry  
**AC:**
- [ ] `apply_funding_offset` reachable from product AI path OR explicit NOT_WIRED note in parity matrix with owning app  
- [ ] AI-licence gate remains  
- [ ] Tests green  

### T4 — KAP / scheme effective amounts — R80.3  
**Goal:** Structured timeline for federal KAP $5k→$4k on 2027-01-01 (and extensible).  
**Design (post-research):**  
```ts
interface FundingSchemeAmountWindow {
  effectiveFrom: string // ISO date inclusive
  effectiveTo?: string  // exclusive; omit = open
  maxAnnualAmount: number
  instalments?: { atMonths: number; amount: number }[]
}
// FundingScheme gains optional amountWindows: FundingSchemeAmountWindow[]
function resolveSchemeAmount(key: string, asOf: Date): number | null
```
**Files:**  
- `R80.3/src/lib/fundingSchemes.ts`  
- `R80.3/src/lib/fundingSchemes.test.ts`  
- Optional use in quote path if amount currently free-typed only  
**AC:**
- [ ] `resolveSchemeAmount('federal_kap_employer_incentive', 2026-06-01)` → 5000  
- [ ] same key `2027-01-01` → 4000  
- [ ] Custom keys without windows → null (caller uses free amount)  
- [ ] Description text remains non-authoritative disclaimer  

### T5 — Manuals how-to refresh (user docs only) — BSU  
**Goal:** Employee leave + FO case notes + host capacity how-tos match shipped Jodie tools; enterprise askJodie lines match T2 tool names.  
**Files:**  
- `business-suite-unified/src/lib/manuals/blocks/employee.ts`  
- `field-officer.ts` / shared blocks  
- `manuals/enterprise-admin.ts`  
**AC:**
- [ ] askJodie strings match tool capabilities  
- [ ] No changelog language (“we fixed”)  
- [ ] Manual integrity tests pass  

### T6 — Advisor performance tracking — parent  
**Goal:** Do not mass-rewrite RLS; ensure #1542 tracks new initplan class; optional allowlist only for intentional accepted cases.  
**Files:**  
- Comment on bsuite#1542 or `docs/security/*` note  
- Optionally `mode:tracked` objects for highest-traffic tables only if CI starts failing on perf (today perf is non-blocking)  
**AC:**
- [ ] Security gate still fails only on unallowlisted SECDEF  
- [ ] No silent `SELECT auth.*` mass migration this sprint  

### T7 — Sydney readiness pointer — parent  
**AC:**  
- [ ] `docs/20260725-sydney-migration-readiness-v1.00W.md` linked from master roadmap  
- [ ] Zero cutover commands executed  

### T8 — STA samples backlog — conduit  
**AC:**  
- [ ] Issue or doc checklist for collecting VIC/NSW/QLD/SA/TAS/ACT sample emails  
- [ ] `PROVEN_STATES` unchanged without samples  

---

## Ordering (one mutation lane per repo)

```
parent:  T0 + T1 + T6 + T7   (docs + ui package)
crm7:    T2
R80.3:   T3 + T4
BSU:     T5
conduit: T8 (docs only)
```

Parallel across repos after T0 plan commit. **Publish T1 before any app pin.**

---

## Red-team Round 1 — consolidated issues (recon + live agents)

| ID | Sev | Task | Description | Proposed change | Status |
|----|-----|------|-------------|-----------------|--------|
| RT1-S1 | High | T2 | Enterprise tools could escalate via weak role checks | Mirror BSU adminService gates; tests for cross-tenant deny | OPEN → fix in impl |
| RT1-S2 | High | T1 | Dual sanitize drift if apps never pin package | Publish 1.0.1 + optional re-export thin shim later | OPEN |
| RT1-S3 | Med | T4 | Hardcoding wrong KAP amounts is compliance risk | Amounts from research doc + disclaimer; operator can correct | OPEN |
| RT1-R1 | High | T1 | Publish gate: version bump required | Bump 1.0.1, rebuild dist, merge main, verify npm | OPEN |
| RT1-R2 | Med | T2 | create_org + parent update two-step race | Document same as BSU; fail closed if UPDATE fails | OPEN |
| RT1-R3 | Low | T0 | Stale parity matrix causes false remaining work | Fix matrix first | OPEN |
| RT1-Q1 | Med | T3 | Wiring funding into crm7 violates ownership | Keep funding tool R80-owned; don't duplicate in crm7 | ADOPTED |
| RT1-Q2 | Low | T5 | Manuals must not promise tools before ship | Ship T2 before enterprise manual askJodie update | ADOPTED |
| RT1-P1 | Med | T6 | 51 initplan findings — rewrite is multi-week | Track only | ADOPTED |
| RT1-P2 | Low | T2 | N+1 if list_sub_orgs unbounded | Cap limit 100 + pagination note | OPEN |

### Round 1 research (Tavily down — local authority)

1. **npm Trusted Publisher** — `.github/workflows/publish-ui.yml` OIDC on main path `packages/ui/**`; idempotent skip if version exists → **must bump**.  
2. **KAP** — in-repo research + scheme description: 2026 $5k → 2027-01-01 $4k; GTO exception for large employers.  
3. **SECDEF** — allowlist exhaustive; new fns need rule (confirm_sta_email precedent 2026-07-25).  
4. **One-shot** — funding_offsets owner R80; enterprise org RPCs live in BSU service patterns.

---

## Red-team Round 2 — plan challenges

| Challenge | Resolution |
|-----------|------------|
| Is T2 too large / wrong app? | Enterprise UI is BSU; Jodie chat is crm7. Tools in crm7 calling same RPCs as BSU is correct parity pattern (leave tools precedent). |
| Should T1 bump major? | Patch 1.0.1 — additive export only. |
| Skip T3 if no R80 chat? | AC allows NOT_WIRED documentation; still verify export + test. |
| Include payslip? | Deferred — no document model; log backlog. |
| Full dates extract? | Deferred — ISO already fixed; calendar deps. |

**Round 2 verdict:** Plan is implementable. Proceed.

---

## Remaining risks (accepted)

| Risk | Why accepted |
|------|----------------|
| KAP amounts change without notice | Disclaimer + structured windows easy to edit |
| Enterprise create two-step | Matches live BSU; full RPC parent param is separate backlog |
| Performance advisor noise | Non-blocking CI; #1542 |
| External research API down | Used frozen in-repo research |

---

## Definition of Done (program)

- All T0–T8 AC checked with command evidence  
- Per-repo: typecheck/tests green; PR → development → main `--merge`; FF development  
- DoD D1–D7 APPROVE with evidence pack  
- Silo keys updated  
- No operator-gated item silently executed  

## Verification commands (canonical)

```bash
# T1
cd packages/ui && pnpm build && pnpm test
npm view @bsuite/ui version

# T2
cd crm7 && npx vitest run src/lib/ai/tools/enterprise-admin-tools.test.ts
npx tsc --noEmit

# T4
cd R80.3 && npx vitest run src/lib/fundingSchemes.test.ts

# T5
cd business-suite-unified && npx vitest run src/lib/manuals
```


---

## Late RT batch absorption (`deleg_aaed0109`, arrived post-implement)

Full summaries: `~/.hermes/cache/delegation/subagent-summary-{0..3}-20260725_212040_*.txt`

| RT ID | Sev | Disposition vs shipped code |
|-------|-----|------------------------------|
| SEC-01 set_current_tenant Jodie | Critical | **AVOIDED** — never added; `rg set_current_tenant crm7/src/lib/ai` = empty |
| SEC-02 funding wire crm7 without manage_financial | Critical | **AVOIDED** — `createFundingTools` **not** in crm7 registry; R80-only |
| SEC-03 feature flag write / cross-tenant | High | **MITIGATED** — `set_tenant_feature_flag` requires hierarchy (self or direct child) + `canManageEnterprise`; not bulk-all-tenants |
| SEC-04 permission before RPC | High | **MITIGATED** — permission check before any fetch; 4 negative/happy tests |
| SEC-05 weak CSS denylist + dual copy | High | **PARTIAL** — package published 1.0.1 with export; apps keep local dual until pin train (R1). Stronger allowlist = follow-up |
| SEC-06 KAP amount enforce | High | **SHIPPED** — `amountWindows` + `resolveSchemeAmount`; tool still trusts caller amount until R80 tool binds resolver (follow-up) |
| R1 publish/pin race | Critical | **PARTIAL** — npm `1.0.1` has sanitize; apps still `^0.6.0` **by design** until lockfile regen train (dual local sanitize stays canonical runtime) |
| R4 funding double-apply unique | High | **DEFERRED** — unique(placement,scheme) + tool bind resolver = next money integrity sprint |
| R8 enterprise no API | High | **ADDRESSED** — tools use `/api/db` + `/api/rpc` paths already used by chat tools, not inventing service-role |
| P-01 initplan track debt | High | **ACCEPTED** this sprint — #1542; hot-path floor next |

### Follow-up backlog (from RT, not false-complete)

1. **Pin train:** bump `@bsuite/ui` to `^1.0.1` per app with isolated lockfile regen; then thin-reexport sanitize from package  
2. **fundingOffsetTool:** call `resolveSchemeAmount` + `manage_financial`-class gate before insert; unique constraint  
3. **CSS adversarial suite** beyond current denylist  
4. **Hot-path auth_rls_initplan** top-N tables only  
