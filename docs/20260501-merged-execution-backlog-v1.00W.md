# BSuite — Merged Execution Backlog (v1.00W)

> **⚠️ SUPERSEDED (2025-02-27, cookie-SSO line items only):** Backlog items that reference cookie SSO (storage key `business_suite_auth`, `domain=.crm7.app`) are obsolete — cookie SSO has been **removed suite-wide**. Remaining cookie-SSO entries in this backlog are closed by removal, not implementation. Non-auth backlog items remain relevant. See [`AUTH_CANONICAL.md`](../AUTH_CANONICAL.md).

**Status:** Working (ratification pending user Phase 0 sign-off)
**Scope:** All remaining work across parent `bsuite` + 6 submodules + 4 shared packages, consolidated from every source listed below.
**Governance:** Atomic replace-and-remove (per Phase 0 governance) — no `@deprecated` markers shipped, no workaround allow-lists, and no dual-path interim states. Every item below is an atomic PR or coordinated PR-set. Older source plans are donor material only: useful intent is extracted into this backlog, while stale approaches are superseded by newer canonical plans.
**Supersedes (consolidation authority):** items below supersede their original source entries in the docs listed under §Sources. Conflicts resolved in favour of this doc.

---

## Sources merged

1. `docs/20260425-bsuite-finish-line-roadmap-v1.00W.md` — P0 / P1 / P2 tables
2. `docs/20260427-roadmaps-audits-plans-outstanding-work-ledger-v1.00W.md` — P0-P13 priority bands
3. `docs/20260227-bsuite-master-roadmap-v5.00W.md` — long-horizon roadmap items
4. Per-submodule OUTSTANDING files:
   - `crm7/docs/OUTSTANDING.md` + `crm7/docs/reference/OUTSTANDING.md`
   - `business-suite-unified/docs/OUTSTANDING-SYSTEM.md` + `-PLANS.md`
   - `R80.3/docs/OUTSTANDING.md`
   - `conduit/docs/OUTSTANDING.md`
   - `braden/docs/OUTSTANDING.md`
   - `throughput/docs/OUTSTANDING.md`
5. Phase 0 ADR consequences (ADR-0001 through ADR-0006)
6. Console-log-surfaced production bugs (2026-04-29 evidence): P1-12 / P1-12b / P1-12c
7. WS-E (One-Shot Propagation Completeness) workstream from consolidated plan

---

## Authority chain after Phase 0

```
Master roadmap (v5.00W) ─┐
Finish-line roadmap (v1.00W) ─┼─► MERGED EXECUTION BACKLOG (this doc) ─► Phase 1..6 execution
Outstanding-work ledger ─────┘      + ADRs 0001..0006 govern atomicity
Submodule OUTSTANDING files ─┘
```

After Phase 0, this backlog is the **single execution queue**. Source docs remain for historical context but are no longer consulted during execution; items are tracked in this doc via stable IDs.

---

## How to read this backlog

- Items are organised by **phase** (ship-bundle), not priority band. Every item has a stable ID (preserved from source where it existed; new IDs use the `BL-NNN` prefix).
- **Phase sequencing is strict** — later phases cannot start until earlier phases complete, with one exception: the P1.J (Payday Super, 1-July-2026 deadline) auto-interrupts if Phase 2 slips past 2026-06-01.
- **Operator-tier items** run in parallel as a checklist alongside engineering (default per Phase 0 operator decision).
- **Gated items** (`G-*`) are blocked on external parties and track-alongside; they don't block phase progression.
- **Each item** includes: stable ID, title, owner, phase, source doc, atomicity notes, deadline flag where relevant.

---

## Phase 0 — Documentation reconciliation (Days 1-3) — IN PROGRESS

Deliverables being produced in the Phase 0 session:

| ID | Item | Status | Source |
|---|---|---|---|
| Φ0-A | ADR-0001 Page-Builder Ownership | Written, pending ratification | Phase 0 |
| Φ0-B | ADR-0002 Schema-Builder Ownership | Written, pending ratification | Phase 0 |
| Φ0-C | ADR-0003 Consumer-Renderer Pattern | Written, pending ratification | Phase 0 |
| Φ0-D | ADR-0004 OAuth Allow-List Doctrine | Written, pending ratification | Phase 0 |
| Φ0-E | ADR-0005 RAMS Funding Authoring | Written, pending ratification | Phase 0 |
| Φ0-F | ADR-0006 Contact Propagation Doctrine | Written, pending ratification | Phase 0 |
| Φ0-G | This merged backlog (`20260501-merged-execution-backlog-v1.00W.md`) | Written, pending ratification | Phase 0 |
| Φ0-H | Deprecation audit (`20260501-deprecation-audit-v1.00W.md`) | Written | Phase 0 |
| Φ0-I | Cookie SSO audit (`20260501-cookie-sso-audit-v1.00W.md`) | Written | Phase 0 |
| Φ0-J | Client↔Host unification audit (`20260501-ws-e-client-host-unification-audit-v1.00W.md`) | Framework written, matrix fill in Phase 4 | Phase 0 / WS-E.1 prep |
| Φ0-K | One-shot field audit (`20260501-one-shot-field-audit-v1.00W.md`) | Framework written, matrix fill in Phase 4 | Phase 0 / WS-E.5 prep |
| Φ0-L | Docs reconciliation classification (`20260501-docs-reconciliation-classification-v1.00W.md`) | Framework + high-priority classifications written; deep-pass execution in Phase 1 | Phase 0 |
| Φ0-M | Phase 0 completion report | Written, hand-off for ratification | Phase 0 |

**Phase 0 exit criteria (hard gate):**

1. User ratifies all 6 ADRs.
2. User signs off on the RAMS seed-data gate (ADR-0005) — confirms who validates criteria columns and seeds the matrix.
3. User signs off on the operator-tier parallel-checklist default.
4. User signs off on the P1.J auto-interrupt deadline fence.

Nothing in Phase 1 onwards executes without these four sign-offs.

---

## Phase 1 — Auth bootstrap + branding 401 + cookie SSO verification (Days 3-7)

| ID | Item | Owner | Atomic PR contents | Source |
|---|---|---|---|---|
| **P1-12** | **Auth safety-net single-retry lock-in + ordering repair** — `AuthContext.tsx` already reduced to single-retry 2026-04-28; repair bootstrap ordering so `profiles.tier` resolves inside the gated session lookup (no retry needed) + delete the remaining single-retry as a follow-on, + rewrite `AuthContext.test.tsx:793-796` to assert the non-retry ordering. | BSU | One PR: `AuthContext.tsx` rewrite + test rewrite + delete retry ref. No @deprecated on the safety-net flag. | Console log 2026-04-29; `AuthContext.tsx:494-515` |
| **P1-12b** | **Branding anon-path fallback** — `useBranding.ts` queries `platform_branding` directly for `force_override_tenant_ids`, which anon users don't have SELECT on (view `platform_branding_public` excludes that column). Fix: when no session exists, fall back to `platform_branding_public` and skip force-override logic. | BSU + CRM7 | One PR per consumer: `useBranding.ts` in BSU + CRM7 rewritten; test added for anon path returning public-view defaults. Delete any retry logic for 401 paths. | Console log 2026-04-29; `useBranding.ts:137-148` both apps |
| **P1-12c** | **Cookie SSO audit documentation** — all 5 apps already correctly wired (verified in Phase 0 discovery). Produce `20260501-cookie-sso-audit-v1.00W.md` as canonical reference; amend first-visit UX in BSU to show a loading indicator when `cookies exist: false` (prevents perceived 401 spam). | BSU | BSU only: add `AuthBootLoader` component + wire into root; delete any placeholder "no session" UI that suggested an error state. | Console log 2026-04-29 |
| **P1-14** | **BSU `user_tenants→profiles` FK embed 400** — client-side PostgREST embed `profiles:user_id(id,email,created_at)` returns 400 under RLS. Fix: add explicit FK constraint name to the embed hint, or rewrite to a two-step fetch using `in()`. Three BSU call sites: `business-suite-unified/src/pages/Admin.tsx`, `business-suite-unified/src/pages/Developer/Routing.tsx`, `business-suite-unified/src/stores/leadRoutingStore.ts`. Parallel R80.3 verification pass on `R80.3/src/lib/permissionsService.ts`, `R80.3/src/stores/authStore.ts`, `R80.3/src/services/unifiedSchemaService.ts` — these use `user_tenants` but do NOT do the profiles embed; audited for regressions, no fix expected. | BSU (primary) + R80.3 (verification) | One PR touching three BSU files + one test per site + R80.3 regression audit. Delete any workarounds that use service-role client from browser context. No `@deprecated` on old embed paths — removed in same PR. | Console log 2026-04-29 |
| **P1-15** | **BSU Developer portal route fix** — nested route `/developer/pages/website/schema/**` renders blank. Root cause: `Pages.tsx` retry loop crashing the route subtree (fixed atomically with ADR-0001 execution in Phase 2). Phase 1 interim: ensure route-level error boundary catches the crash so other tabs remain usable. | BSU | One PR: add `DeveloperRouteErrorBoundary` + wire into `App.tsx` for `/developer/*` subtree. | Console log 2026-04-29 |
| **P0-6** | **Parts A+B+C OAuth preview-redirect sign-off** — close all 5 unticked checkboxes: Part C (Supabase allowlist update), Parts B.1–B.4 (CRM7/R80.3/Braden/Throughput `return_origin` patches), end-to-end login on each preview URL. Verify every redirect URI in `AGENTS.md` §Automated Deployment Checks is live in Supabase + documented per ADR-0004. | Operator + BSU + Claude Code | Operator: confirm Supabase dashboard matches `AGENTS.md`. Engineer: `return_origin` patches per client app. | Finish-line roadmap P0-6; ADR-0004 |
| **P0-8** | **Conduit SSR hotfix** — cherry-pick commits `2f38cc3` + `5870990` onto `fix/conduit-ssr-prerender-guard` from `development`; merge. | Conduit / Claude Code | One PR: cherry-pick + merge. | Finish-line P0-8 |
| **P0-10** | **Supabase Vault RPC migration completeness** — create `email_integration_set_encrypted_token`; migrate plaintext `access_token`/`refresh_token`/`smtp_password`/`imap_password` in `email_integrations`; finish Vault-backed secrets for edge functions still reading `pg_settings`. | CRM7 edge fns / Claude Code | One PR per function migrating off `pg_settings`. | Finish-line roadmap P0-10 |
| **P0-11** | **OAuth state HMAC signing** — sign OAuth state with HMAC-SHA256 + verify on callback in `oauth-google-email` + `oauth-microsoft-email` edge functions. | CRM7 edge fns / Claude Code | One PR: signing + verification + Playwright CSRF-replay test. | Finish-line P0-11 |
| **P0-13** | **Remove wildcard redirect URIs from Supabase dashboard** — remove `*.vercel.app` + `*.vusercontent.net` wildcards; replace with explicit preview URLs. Coordinates with ADR-0004 — the `AGENTS.md` allow-list currently includes wildcards; revisit whether to keep or remove per ADR-0004 ratification. | Operator | Dashboard review + prune. | Finish-line P0-13 |
| ~~**P0-15**~~ | ~~**Master roadmap rollup** — bump `20260227-bsuite-master-roadmap-v5.00W.md` to v5.03W; strike `#26a/26e/26f/26g`; mark AUD-15/AUD-16 done; cite the merged execution backlog (this doc) as the active queue.~~ **DONE** — master roadmap header is `v5.03W`, 26a/26e/26f/26g are struck, AUD-15/AUD-16 are marked done, and the revision log records the Phase 0 ratification rollup. | Controller | ✅ Complete — retained here as provenance, not active Phase 1 work. | Finish-line roadmap P0-15; Phase 0 ratification output |

**Phase 1 exit criteria (testable):**

1. Playwright smoke test across BSU/CRM7/R80.3/throughput first-visit bootstrap records: `console.error` count == 0; `console.warn` related to `auth safety-net` count == 0; no 401 / 400 status codes in network tab during the bootstrap window.
2. `AuthContext` integration test asserts exactly one `checkSubscription` call completes per sign-in (no retry scheduling).
3. `useBranding` unit test confirms anon-path returns `platform_branding_public` row without 401.
4. `user_tenants → profiles` embed test asserts status 200 under authenticated RLS (BSU call sites).

**Completed P0 items (reference, not executed here — shipped before Phase 0):**

- ~~P0-1~~ through ~~P0-5~~ (secret rotation, VITE_STRIPE_SECRET_KEY removal, RAM_* vars, xero adapter fix) — shipped pre-finish-line.
- ~~P0-7~~ (auth-callback hardcoded fallback removal) — shipped W4-AUTH-v2.
- ~~P0-9~~ (Conduit next bump) — SHIPPED-PREEXISTING.
- ~~P0-12~~ (BSU AuthContext zero-fetch bug) — SHIPPED bsu@`86cfb70` (note: per Phase 0 discovery, P1-12 retained in Phase 1 for the *tier race*, which is a different bug than the onAuthStateChange deadlock P0-12 fixed).
- ~~P0-14~~ (`git rm crm7/APPLY_THIS_SQL.sql`) — already absent on tip; operator history scrub tracked under gated items.

---

## Phase 2 — Canonical convergence + Payday Super deadline-critical path (Weeks 2-4)

| ID | Item | Owner | Atomic PR contents | Source / Deadline |
|---|---|---|---|---|
| **P1-4(b)** | **Execute ADR-0001 — CRM7 `custom_pages` canonical, BSU `tenant_page_layouts` removed** | BSU + CRM7 + packages/schema-registry | Coordinated PR set (see ADR-0001 consequences): (1) DB migration DROP TABLE with data-migration script; (2) BSU `Pages.tsx` + test + route + nav tab deletion; (3) realtime publication cleanup; (4) `@bsuite/schema-registry` 0.1.x → 0.2.0 bump replacing `TenantLayoutSlot` with `CustomPageRenderer` (per-app); (5) `ownership-map.json` comment update; (6) one-shot spec bump to v1.02A. | ADR-0001; P1-4 finish-line |
| **BL-001** | **Execute ADR-0002 — unify schema authoring under CRM7 Developer Portal** | BSU + CRM7 | Coordinated PR set: BSU `Schema.tsx` + test + route + nav tab deletion; CRM7 `schema-builder/fields/` sub-route added; ownership-map flip; one-shot spec row update. No @deprecated. | ADR-0002 |
| **P1-75** | **`tenant_field_definitions.entity_id` FK to `tenant_entities.id`** — lands in same PR set as ADR-0002 execution. | CRM7 | Add FK with data-cleanup script for orphaned rows. | Outstanding-work ledger P1-75 |
| **P1.J** | **R80.3 Payday Super regulatory ship** — DEADLINE 1-JULY-2026. Public holiday awareness, salary-sacrifice refinements, UI snapshot tests. **Atomic funding-derivation constraint (per governance):** P1.J ships without RAMS-matrix funding-derivation at all. Hand-entered or spec-hardcoded rules remain in place until WS-E.4 later atomically replaces them. The switch from hardcode → derived is an atomic PR in WS-E.4 Phase 4, not a dual-path transition. The RAMS seed gate (ADR-0005) blocks WS-E.4 but does NOT block P1.J. | R80.3 | Multi-PR, all atomic: (1) public holiday source + cache; (2) salary-sacrifice refinements; (3) snapshot tests. Every PR ships without @deprecated markers. No "TODO: swap to derived" comments in code — the hardcode is canonical until WS-E.4 atomically replaces. | R80.3 OUTSTANDING `20260418-payday-super-feature-v1.00W.md`; **1-JULY-2026** |
| **P1.B-1** | **R80.3 misplaced routes redirect to BSU** — organization, branding, tester-licenses admin surfaces in R80.3 currently author data BSU owns; redirect routes in R80.3 to the BSU equivalent; remove R80.3 authoring UI. | R80.3 + BSU | One PR: R80.3 redirects + delete authoring components; BSU receives the `return_path` param handler. | Finish-line P1.B |
| **P1.B-2** | **CRM7 misplaced routes redirect to BSU** — same pattern for CRM7-side organization admin that should live in BSU. | CRM7 + BSU | One PR: CRM7 redirects + delete authoring; BSU handler. | Finish-line P1.B |
| **BL-002** | **braden website lead capture: `clients.type='prospect'` discriminator** — per ADR-0006, new roles use discriminator values, not new tables. Add `'prospect'` as allowed value + UI filter. | braden + CRM7 | One PR: migration adds `'prospect'` to enum; braden lead form writes `clients` row with `type='prospect'`; CRM7 lead conversion UI shows prospects list. | ADR-0006; finish-line P1.A |

**Phase 2 exit criteria (testable):**

1. `\d+ tenant_page_layouts` in Supabase returns "relation does not exist".
2. `find business-suite-unified/src/pages/Developer/Pages.tsx` returns not-found.
3. `rg '.from\(.custom_pages.).*\.(insert|update|upsert)' -g '!crm7/**'` returns zero matches across all consumer apps (only CRM7 writes).
4. `rg tenant_page_layouts -g '**/*.{ts,tsx,sql}'` returns zero matches.
5. R80.3 Payday Super snapshot tests green; deadline fence 2026-06-01 not triggered OR triggered and Phase 2 prioritised P1.J ship.
6. R80.3 + CRM7 misplaced-route redirects to BSU working end-to-end; admin authoring UIs deleted from R80.3/CRM7.
7. braden `clients.type='prospect'` discriminator migration applied; lead form writes through.

**Deadline fence:** If Phase 2 slips past 2026-06-01, P1.J auto-promotes ahead of all later-phase work.

---

## Phase 3 — OAuth + env + realtime hardening (Weeks 4-6)

| ID | Item | Owner | Source |
|---|---|---|---|
| **P1.C-1** | `@bsuite/auth` package adoption across CRM7, R80.3, braden, throughput, conduit — delete app-local OAuth 2.1 PKCE code in the same PR as the import. No @deprecated on local code. | All 5 client apps | Finish-line P1.C |
| **P1.C-2** | OIDC nonce parameter added to OAuth 2.1 flow in `@bsuite/auth`. | packages/auth | Finish-line P1.C |
| **P1.D-1** | Supabase env-var standardisation — rename inconsistent `NEXT_PUBLIC_SUPABASE_*` / `VITE_SUPABASE_*` / `SUPABASE_*` to canonical names per `AGENTS.md` §Environment Variables. Atomic per app. | All apps | Finish-line P1.D |
| **P1.D-2** | CI security assertions — add guardrails that fail CI if secret-naming drift appears. | All apps | Finish-line P1.D |
| **P1.M-1** | Realtime blocks — ensure `custom_pages`, `tenant_branding`, `tenant_app_branding` all have realtime publication entries post-Phase 2 cleanup. | BSU | Finish-line P1.M |
| **P1-17** | Complete `@bsuite/auth` migration — deprecate local OAuth helpers after `P1.C-1` ships. Atomic deletion, no `@deprecated` marker window. | All 5 client apps | Outstanding ledger P1-17 |
| **P1.E-1** | React hooks remediation in BSU — stale-closure audit across `AuthContext`, `useBranding`, `useTenantId`. | BSU | Finish-line P1.E |
| **P1.E-2** | React hooks remediation in braden. | braden | Finish-line P1.E |
| **P1.E-3** | React hooks remediation in throughput. | throughput | Finish-line P1.E |

**Phase 3 exit criteria (testable):**

1. `rg "@bsuite/auth" -g '**/package.json'` returns exactly 5 hits (one per client app: CRM7, R80.3, braden, throughput, conduit).
2. `rg "signInWithBusinessSuite|exchangeCodeForSession" -g '!**/node_modules/**' -g '!packages/auth/**'` returns zero app-local implementations (all go through the package).
3. `rg 'VITE_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_URL|SUPABASE_URL' --type yaml .github/` count matches the canonical set from `AGENTS.md` §Environment Variables.
4. Realtime publication `supabase_realtime` lists `custom_pages`, `tenant_branding`, `tenant_app_branding` (and NOT `tenant_page_layouts`, dropped in Phase 2).
5. React hooks ESLint rule (`react-hooks/exhaustive-deps`) passes clean in BSU, braden, throughput.

---

## Phase 4 — Entity FKs + EntitySelectors + WS-E one-shot completeness (Weeks 6-12)

Foundation (existing tracked items):

| ID | Item | Owner | Source |
|---|---|---|---|
| **P1.G-1** | Entity FK wiring for remaining free-text references (award rate, training plan, placement). | CRM7 | Finish-line P1.G |
| **P1.G-2** | FK-backed index additions for new FKs. | CRM7 | Finish-line P1.G; pattern from `20260422180000_phase2_fk_indexes.sql` |
| **P1.H-1a** | BSU Platform-Kit — Auth admin sub-panel (user list, role assignments, MFA status, session revocation) | BSU | BSU OUTSTANDING-PLANS |
| **P1.H-1b** | BSU Platform-Kit — Logs admin sub-panel (supabase edge fn logs, audit_events browsing, error surfacing) | BSU | BSU OUTSTANDING-PLANS |
| **P1.H-1c** | BSU Platform-Kit — Database admin sub-panel (table browser, read-only by default, query history) | BSU | BSU OUTSTANDING-PLANS |
| **P1.H-1d** | BSU Platform-Kit — Secrets admin sub-panel (Vault-backed; read-masked by default; edit via Vault RPC only) | BSU | BSU OUTSTANDING-PLANS |
| **P1.H-1e** | BSU Platform-Kit — Storage admin sub-panel (buckets browser, object list with signed-URL previews, bucket RLS display) | BSU | BSU OUTSTANDING-PLANS |
| **P1.H-1f** | BSU Platform-Kit — Dynamic Tables admin sub-panel (read-only view of `tenant_entities` + live data samples; authoring goes to CRM7 per ADR-0002) | BSU | BSU OUTSTANDING-PLANS |
| **P1.I-1** | EntityLinker component — generic junction-row authoring UI. | CRM7 | Finish-line P1.I |
| **P1.O-1** | WCAG 2.1 AA accessibility audit across all 6 apps. | All apps | Finish-line P1.O; BSU OUTSTANDING-PLANS |
| **P1-84** | **BLOCKED on operator** — push SQL migrations at commit `43fb250` to Supabase project. | Operator | Finish-line P1.Q |

WS-E One-Shot Propagation Completeness (Phase 4 main workstream):

| ID | Item | Owner | Source |
|---|---|---|---|
| **WS-E.1** | Client↔Host-Employer role unification audit + fill per ADR-0006. Matrix populated from framework doc `20260501-ws-e-client-host-unification-audit-v1.00W.md`. Atomic per-app PRs delete any app-local `host_employers` divergence. | All 6 apps | Addendum WS-E; ADR-0006 |
| **WS-E.2** | Qualification↔Host-Employer + Qualification↔Apprentice junction tables + reverse-lookup UI. `QualificationSelector` gains `hostEmployerId` + `apprenticeId` props. | CRM7 + readers | Addendum WS-E |
| **WS-E.3** | Training-Provider-driven qualification constraint — `training_provider_qualifications` junction + filter logic in `QualificationSelector` when `apprentice.training_provider_id` or `trainingProviderId` supplied. DB-level CHECK on `apprentice_qualifications`. | CRM7 | Addendum WS-E |
| **WS-E.4** | RAMS funding-matrix derivation + read-only propagation per ADR-0005. Requires RAMS seed data gate cleared. | CRM7 + all consumers | Addendum WS-E; ADR-0005 |
| **WS-E.5** | One-shot propagation audit — mechanical sweep of every form across 6 apps; matrix populated in `20260501-one-shot-field-audit-v1.00W.md`. Atomic PRs fix violations; CI lint extensions block new violations. | All 6 apps | Addendum WS-E |
| **WS-E.6** | Update one-shot spec to v1.02A with new §12 (Propagation Completeness) + fold WS-E patterns into §4 Auto-Population Rules. | Controller | Addendum WS-E |

Cross-cutting Phase 4 items:

| ID | Item | Owner | Source |
|---|---|---|---|
| **P1.F-1** | Storage bucket RLS audit + four-persona matrix verification. | BSU | Finish-line P1.F |
| **BL-003** | CRM7 evidence-capture E2E tests (Playwright) for critical compliance paths. | CRM7 | `crm7/docs/OUTSTANDING.md` |
| **BL-004** | CRM7 legacy `DataContext` retirement (Phase 2B-2C of UX oneshot plan). | CRM7 | `crm7/docs/OUTSTANDING.md` |
| **BL-005** | CRM7 Xero OAuth activation and integration. | CRM7 | `crm7/docs/OUTSTANDING.md` |
| **BL-006a** | braden QA config — fix failing tests | braden | `braden/docs/OUTSTANDING.md` §20260316-braden-qa-configuration |
| **BL-006b** | braden QA config — reduce test duplication | braden | `braden/docs/OUTSTANDING.md` |
| **BL-006c** | braden QA config — enable strict TS mode (tsconfig `strict: true`) atomically; fix all strict errors in same PR | braden | `braden/docs/OUTSTANDING.md` |
| **BL-006d** | braden environment-setup dev guide completion — unchecked TODOs in `20260316-braden-environment-setup-dev-guide-v1.00W.md` | braden | `braden/docs/OUTSTANDING.md` §20260316-braden-environment-setup |
| **BL-006e** | braden CSP security hardening — unchecked TODOs in `20260316-braden-csp-security-v1.00W.md` | braden | `braden/docs/OUTSTANDING.md` §20260316-braden-csp-security |
| **BL-006f** | braden UI/UX best-practices sweep — unchecked TODOs in `20260316-braden-ui-ux-best-practices-v1.00W.md` | braden | `braden/docs/OUTSTANDING.md` §20260316-braden-ui-ux |
| **BL-006g** | braden bot-protection hardening — unchecked TODOs in `20260316-braden-bot-protection-v1.00W.md` | braden | `braden/docs/OUTSTANDING.md` §20260316-braden-bot-protection |

**Phase 4 exit criteria (testable):**

1. `docs/20260501-one-shot-field-audit-v1.00W.md` matrix fully populated — every form field across 6 apps classified with disposition (canonical write / FK ref / derived / auxiliary). Matrix row count = audited-form count.
2. `docs/20260501-ws-e-client-host-unification-audit-v1.00W.md` matrix fully populated; `rg 'host_employers' --type sql -g '!**/node_modules/**' -g '!**/archive/**'` returns zero table-creation hits (discriminator-only per ADR-0006).
3. Junction tables `host_employer_qualifications`, `apprentice_qualifications`, `training_provider_qualifications` created with RLS policies live.
4. `dry-lint no-free-text-where-fk` lint rule passes clean across 6 apps.
5. RAMS matrix: if G-11 (seed-data gate) cleared — `SELECT count(*) FROM rams_funding_matrix` returns >0 and `rams_funding_for(...)` function deployed; if G-11 not cleared — WS-E.4 documented as gated in-progress, spec+schema landed, seed pending.
6. Every `P1.H-1a..f` BSU Platform-Kit sub-panel tested end-to-end.
7. Every BL-006a..g braden item shipped; braden CI green on strict TS mode.

---

## Phase 5 — WS-A GTO billing + CRM7 AI + braden visual editor + throughput + dep standardisation (Weeks 12-20)

| ID | Item | Owner | Source |
|---|---|---|---|
| **WS-A** | GTO billing / payroll / reporting 6-week workstream. Consumes `rams_funding_for(...)` as input per ADR-0005. | CRM7 | `docs/plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md` (status-bumped in Phase 0 if proven incomplete) |
| **BL-007** | CRM7 AI Phases 2-5 — remaining AI-powered strategic vision phases. | CRM7 | `crm7/docs/OUTSTANDING.md`; master roadmap |
| **BL-008** | braden visual drag-and-drop layout editor (Phase 2-3 of roadmap). | braden | `braden/docs/OUTSTANDING.md` |
| **BL-009** | throughput production-readiness — migrate npm → pnpm, rename uppercase docs to date-versioned format, bring in-line with suite conventions. | throughput | `throughput/docs/OUTSTANDING.md` |
| **BL-010** | Dep standardisation across suite — single version of React, Tailwind, Radix, AI SDK, Supabase client per `AGENTS.md`. Atomic per major version bump; breaking-API migrations done in same PR. | All apps | Master roadmap |
| **BL-011a** | BSU Supabase CRM-domain migration — apply stakeholder/people/contact schema migrations per OUTSTANDING-SYSTEM runbook (per-migration PR) | BSU + Operator | `business-suite-unified/docs/OUTSTANDING-SYSTEM.md` |
| **BL-011b** | BSU Supabase CRM-domain migration — post-apply verification (schema diff clean, RLS smoke test, Vercel build green) | BSU + Operator | `business-suite-unified/docs/OUTSTANDING-SYSTEM.md` |
| **BL-011c** | BSU Supabase CRM-domain migration — downstream CRM7 / conduit consumers updated atomically with each schema change (no dual-path reads) | CRM7 + conduit + BSU | `business-suite-unified/docs/OUTSTANDING-SYSTEM.md` |
| **BL-012** | CRM7 AI-content-labelling UI hardening — per `AGENTS.md` §AI Implementation Standards. | CRM7 | `AGENTS.md` |
| **R80-BL-001** | R80.3 training-fees UI validation bounds + per-apprentice overrides. | R80.3 | `R80.3/docs/OUTSTANDING.md` `20260304-r80-training-fees-feature-v1.00W.md` |

**Phase 5 exit criteria (testable):**

1. `rg '"react":' -g '**/package.json' -g '!**/node_modules/**'` shows identical version across 6 apps (BL-010).
2. WS-A GTO billing: Playwright E2E test shipping a full invoice from timesheet → pay_run → invoice → Xero passes; RAMS-derived funding-amount cell renders from `rams_funding_for(...)` (no hand-entry UI remains).
3. CRM7 AI Phases 2-5 features live per spec; `vercel-ai-sdk` compliance tests pass.
4. braden visual editor Phase 2 shipped; drag-drop reorder on a published page round-trips correctly.
5. throughput: `pnpm-lock.yaml` present, no `package-lock.json`; uppercase docs renamed to date-versioned format; `pnpm audit` clean.
6. BL-011a/b/c: `supabase db diff --linked` returns clean after CRM-domain migrations applied; CRM7 + conduit consumers updated.
7. All `BL-006*` braden items closed.

---

## Phase 6 — Cleanup, P2 items, and monitoring (Weeks 20-24)

### P2 band — enumerated (from finish-line roadmap §Next quarter)

| ID | Item | Owner | Source |
|---|---|---|---|
| **P2-1** | GTO billing / payroll / reporting — full scope (overlaps WS-A executed in Phase 5). Phase 6 item captures any residual scope not closed by WS-A. | CRM7 + R80.3 | Finish-line P2-1 / WS-A |
| **P2-2** | Schema / page-builder rebuild — full scope (overlaps WS-B executed across Phases 2 & 4). Phase 6 captures residuals. | CRM7 + BSU | Finish-line P2-2 / WS-B |
| **P2-3** | AVETMISS 8.0 NAT file codegen + State STA extracts | CRM7 | Finish-line P2-3; WS-A phase B-5 |
| **P2-4** | Report builder (7 pre-built templates + JSONB `report_templates` + scheduling) | CRM7 | Finish-line P2-4; WS-A phase B-4 |
| **P2-5** | Braden Phase 2 + Phase 3 (visual editing, advanced customisation, publishing workflow, permissions) — overlaps BL-008 Phase 5. | Braden | Finish-line P2-5 |
| **P2-6** | Storybook in `packages/ui` + primitive centralisation (Button, Dialog, EmptyState, ErrorBoundary, Logo) | Shared / All | Finish-line P2-6 |
| **P2-7** | Sentry rollout in 5 D2C apps + Conduit (`@sentry/nextjs`) | All / Cascade | Finish-line P2-7 |
| **P2-8** | CSP headers in all `vercel.json` (start permissive, tighten) | All / Cascade | Finish-line P2-8 |
| **P2-9** | Playwright E2E smoke per app (5 critical-path specs each) | All / Claude Code | Finish-line P2-9 |
| **P2-10** | PageGridLayout rollout completion — CRM7 batches A–H (41 pages), R80.3, Conduit, throughput, braden | All / Claude Code | Finish-line P2-10 |
| **P2-11** | Shared `<Logo />` component in `packages/ui` — 4-level resolution (sub-org → enterprise → platform → default) | Shared / Claude Code | Finish-line P2-11 |
| **P2-12** | Remaining hex → oklch sweep: CRM7/BSU `MarketingHome.tsx` ~62 each, Conduit `ConduitLanding.tsx` ~55, CRM7 AI message rgba | All / Claude Code | Finish-line P2-12 |
| **P2-13** | Sub-organisation hierarchy — `tenants.parent_tenant_id` + hierarchical branding resolution Tier 0 | BSU / Claude Code | Finish-line P2-13 |
| **P2-14** | Feature-flags admin UI — 37 JSONB flags in `tenant_settings.feature_flags` | CRM7 / Claude Code | Finish-line P2-14 |
| **P2-15** | Xero app registration + flip `feature_flags.xero_integration = true` | CRM7 / Operator | Finish-line P2-15 |
| **P2-16** | Email/Calendar integration UI — settings tab + inbox + tasks sync badge + `email_messages`/`tasks` migrations | CRM7 / Claude Code | Finish-line P2-16 |
| **P2-17** | Conduit candidate documents tab — wire `r7_documents` | Conduit / Claude Code | Finish-line P2-17 |
| **P2-18** | CRM7 Tier 3-4 page wiring (SP-3, in progress) — financial, compliance, WHS, comms, reports, payroll, billing, data mgmt | CRM7 / Claude Code | Finish-line P2-18 |
| **P2-19** | F-08 — BSU `/ideas/*` "Open in Throughput" deep-link affordance (keep light portfolio lens) | BSU / Claude Code | Finish-line P2-19 |
| **P2-20** | F-10 — CRM7 `/billing` → `/financial/invoicing` rename + redirect (namespace collision with BSU subscription billing) | CRM7 / Claude Code | Finish-line P2-20 |
| **P2-21** | Web Vitals monitoring — `web-vitals` library wired in 5 apps; CRM7 INP (currently 165–357 ms) resolved | All / Claude Code | Finish-line P2-21 |
| **P2-22** | PWA asset completion — BSU `apple-touch-icon.png`+pwa icons; R80.3 webmanifest+apple-touch-icon; Conduit full audit; braden webmanifest+icons; throughput all PWA | All / Claude Code | Finish-line P2-22 |
| **P2-23** | FOUC prevention — inline theme script in BSU, R80.3, Conduit `layout.tsx` (CRM7 already has it) | BSU, R80.3, Conduit / Claude Code | Finish-line P2-23 |
| **P2-24** | Font alignment — Conduit self-host Inter; BSU confirm `'Inter Variable'`; BSU+R80.3 add `@fontsource/jetbrains-mono` | 3 apps / Claude Code | Finish-line P2-24 |
| **P2-25** | DB maintenance — fix `auth_rls_initplan` in 5 RLS policies; drop 25+ unused indexes (especially `people` — 9 unused); add 4 missing FK indexes | DB / Cascade | Finish-line P2-25 |
| **P2-26** | Remaining apprentice-ownership audit: R80.3 must stop writing CRM7-owned `apprentices` (reader-only), persist calc state to R80-owned tables | R80.3 / Claude Code | Finish-line P2-26 |

### Phase 6 cleanup items

| ID | Item | Owner | Source |
|---|---|---|---|
| **BL-013** | Archive all Phase 0-5 completed plans/handoffs/signoffs per information-preservation rule (`/home/braden/Desktop/Dev/archived-repos-docs/` external or `docs/archive/` in-repo). | Controller | Phase 0 classification doc |
| **BL-014** | Final `docs/README.md` rewrite reflecting post-cleanup state + authority chain. | Controller | Phase 0 consolidation |
| **BL-015** | Canonical `OUTSTANDING.md` consolidation — remove per-submodule OUTSTANDING files, leaving only the merged backlog as the single execution queue. | Controller | Phase 0 consolidation |
| **BL-016** | CI lint rule set locked — `no-free-text-where-fk` extended, `no-new-deprecations` active, `no-duplicate-allowlists` active. | Controller | ADR-0004, ADR-0006 |
| **BL-017** | Zero-workaround/deprecation enforcement — CI fails on new workaround allow-lists, new `@deprecated` markers, and dual-path interim states. Empty allow-list files are not created; exceptions require removal or a separately ratified ADR with an owner and expiry. | Controller | User directive 2026-05-05; deprecation audit |
| **BL-018** | WS-D Production Ship Gate execution — all 6 submodules `development → main` merge + Playwright smoke vs production URLs + first non-Braden enterprise tenant onboarding end-to-end. | All / Cascade | Finish-line WS-D |

**Phase 6 exit criteria (testable):**

1. This doc bumped to status `.00A` (immutable-Accepted) with every `BL-*` / `P*-*` / `WS-*` row populated with a shipped commit SHA in a new "Shipped" column.
2. All per-submodule `OUTSTANDING*.md` files deleted; only the merged backlog remains as execution queue (BL-015 complete).
3. `docs/README.md` rewritten (BL-014).
4. `no-new-deprecations.sh` CI script active on every PR across 6 repos (BL-016).
5. Playwright production smoke tests green against all 6 production URLs (WS-D-2).
6. First non-Braden enterprise tenant onboarded successfully end-to-end (WS-D-3).

---

<!-- Added 2026-05-06: Codehouse parity & Platform 360 — see docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md -->

## Phase P-360 — Codehouse Parity & Platform 360 (parallel to Phases 4-6, added 2026-05-06)

**Plan:** [`docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md`](./plans/20260506-codehouse-parity-and-platform-360-v1.00W.md). Domain detail in `~/workspace/competitor/parity-matrix.md` (external — referenced by row, not restated). Permissions remain `AUTH_CANONICAL.md` + Supabase RLS + BSuite SSO. **No new RBAC/ABAC framework.**

| ID | Item | Owner | Source-doc |
|---|---|---|---|
| **P360-A1** | New top-level plan in `docs/plans/` (this PR) | Cascade | Plan §2 WS-A1 |
| **P360-A2** | Append parity workstream to this merged-execution-backlog (this row block) | Cascade | Plan §2 WS-A2 |
| **P360-A3** | Update each submodule's `OUTSTANDING.md` + `docs/plans/STATUS.md` (separate one-line PRs per submodule) | Cascade | Plan §2 WS-A3 |
| **P360-A4** | New "Codehouse Parity & Platform 360" section in master roadmap (this PR) | Cascade | Plan §2 WS-A4 |
| **P360-B** | File 12 grouped GitHub issues for the 35 parity gaps (one per domain) — labels: `filed-by-perplexity`, `research-driven`, `parity-codehouse`, `p1`/`p2`, `area:*` | Issue-filer subagent | Plan §2 WS-B |
| **P360-C** | Dashboard schema additive extension (`parity_status`, `feature_360_status`, `portal_coverage` keys); update `refresh-data.py`; render in `index.html` | Dashboard subagent (post PR #535) | Plan §2 WS-C |
| **P360-D-1..9** | 9 portal sub-plans — BSU admin, CRM7 internal, Conduit recruiter/candidate/employer/careers, BSU tenant admin, R80.3 calculator, Braden marketing (this PR) | Cascade | Plan §5 |
| **P360-E** | `/dev/feature-builder` full-stack route in BSU — entity panel + page panel + AI panel + "Export feature bundle as PR" edge fn | BSU / Claude Code | Plan §6 + spec doc |
| **P360-F1** | Fix the 17 doc-drift items from `bsuite-inventory.md` | Cascade | Plan §2 WS-F1 |
| **P360-F2** | Update 6 README "Features" sections to surface BSuite over-deliveries (BOOT, AI, schema-builder, offline PWA, sub-org tenancy) | Cascade | Plan §2 WS-F2 |
| **P360-F3** | Update `bsuite/knowledge.md` + `AGENTS.md` if anything changes during P360 execution | Cascade | Plan §2 WS-F3 |
| **P360-Domain-A..U** | Per-domain parity rows (21 domains) — owning issue numbers TBD until WS-B fires | per matrix row | Plan §8 |

**Phase P-360 exit criteria:**

1. All 12 plan files (1 index + 1 inputs + 9 portals + 1 spec) exist and are linked from master roadmap, this backlog, plans STATUS, plans README, OUTSTANDING.
2. WS-B 12 grouped issues filed and cross-linked back into plan §8.
3. Dashboard schema extension (P360-C) co-merged or follow-up to PR #535.
4. WS-E `/dev/feature-builder` shipped with role-gated route + 13 acceptance criteria from spec doc.
5. WS-F doc-drift sweep complete (17 items).
6. Index plan flips W→A only after operator approval AND red-team review of all 9 portal sub-plans.

---

## Architectural workstreams (cross-reference, merged into phase tables above)

These workstreams from the finish-line roadmap map to items already enumerated in Phases 2-6. Listed here so the authority chain is complete and no finish-line reference is dropped.

| WS | Finish-line title | Merged backlog location |
|---|---|---|
| **WS-A** | GTO billing / payroll / reporting (Q2) — 11 checkpoints WS-A-1..WS-A-11 | Phase 5 `WS-A` row (with P2-1, P2-3, P2-4 residuals in Phase 6) |
| **WS-B** | Schema / Page Builder rebuild (Q2, overlaps WS-A) — 5 checkpoints WS-B-1..WS-B-5. WS-B-1 hot-fixes map to P1-73..P1-78 (executed inline as part of Phase 2 ADR-0001/ADR-0002 PR sets). WS-B-2..WS-B-5 split across Phase 4 (WS-C schema FKs) + Phase 5 (P2-2 residual). | Phase 2 P1-4(b) + BL-001 + Phase 4 + Phase 6 P2-2 |
| **WS-C** | Entity linkage + DRY one-shot closure (Q2) — 5 checkpoints WS-C-1..WS-C-5. Phase 5 (schema registry) landed; Phase 6 docs outstanding; Phase 3 GTO-domain entities pending. | Phase 4 WS-E.*(which is a superset), Phase 4 P1.G-*, Phase 4 WS-E.6 (one-shot spec bump) for WS-C-5 |
| **WS-D** | Production ship gate (Phase 15) — 3 checkpoints WS-D-1..WS-D-3. | Phase 6 BL-018 |

---

## Gated / external items (track-alongside, don't block phase progression)

| ID | Item | Blocking party | Source |
|---|---|---|---|
| **G-1** | TypeScript 5→6 migration (sequence: throughput → braden → conduit → R80.3 → CRM7 → BSU + shared pkg bump+republish). | TS 6.0.0 GA + typescript-eslint@^8.x TS6-compat + throughput preview-trial | Finish-line G-1; `docs/20260422-typescript-6-migration-evaluation-v1.00W.md` |
| **G-2** | ADMS / AASS integration (2026 Incentive System — Priority Hiring Incentive, KAP, DAAWS). | ATO RAM M2M + AASS API availability + contract terms | Finish-line G-2; `CLAUDE.md` §Active Projects (ADMS) |
| **G-3** | CRM7 domain tables via unified migration (inspections, workflows, reports). | BSU-G5 resolution — decision on unified vs per-app migration path | Finish-line G-3 |
| **G-4** | AVETMISS NCVER validator access. | NCVER test credentials + sandbox | Finish-line G-4 |
| **G-5** | `rpc_report_page` generic RPC security review before go-live. | Security audit | Finish-line G-5 |
| **G-6** | Xero Payroll AU — direct STP path vs passthrough. | ADR decision | Finish-line G-6 |
| **G-7** | Deploy-Vercel-green gate on `development` branches for all 5 apps. | Production-plan Phase 6 blockers resolved (Conduit SSR fix = P0-8) | Finish-line G-7 |
| **G-8** | Supabase platform bug bsuite#106 — NULL `client_secret_hash` on public OAuth clients (Conduit, Throughput). | Supabase platform team | AGENTS.md §Known Platform Issues |
| **G-9** | `20260427-branch-protection-enforcement-v1.00W.md` gates on GitHub org admin. | Org admin | `docs/20260427-branch-protection-enforcement-v1.00W.md` |
| **G-10** | `P1-84` SQL migration push (commit `43fb250`). | Operator | Finish-line P1.Q — O-1 |
| **G-11** | RAMS seed data validation. | Domain expert (proposed default: user) | ADR-0005 |
| **G-12** | Payday Super regulatory finalisation — waiting on ATO guidance variations. | ATO | R80.3 OUTSTANDING |
| **G-13** | Submodule deprecated-branch cleanup on GitHub. | Org admin | `docs/20260428-orphan-branch-cleanup-handoff-v1.00W.md` |
| **G-14** | Supabase OAuth dashboard allowlist (O-2, per finish-line remaining-work top 5). | Operator | Finish-line O-2; P0-6 + P0-13 |
| ~~**G-15**~~ | ~~Throughput peer-dep unblock.~~ **DONE** — Throughput `package.json` and `pnpm-lock.yaml` now resolve `@bsuite/nav-core@0.5.1` and `@bsuite/schema-registry@0.3.2`; isolated install, typecheck, and production build pass. | Throughput / Claude Code | Finish-line O-4 |
| ~~**G-16**~~ | ~~BSU `/admin/team-members` route creation for the throughput W4-TP deep-link.~~ **DONE** — BSU has `/admin/team-members` wired in `src/components/AppContent.tsx`, implemented by `src/pages/Admin/TeamMembers.tsx` and `src/lib/teamMembersService.ts`; BSU typecheck passes. | BSU / Claude Code | Finish-line O-5 |

---

## Cross-cutting non-phase items (continuous, every PR)

- **No-deprecations-permitted governance** — every PR across all phases ships atomic replace-and-remove per the earlier governance addendum. No `@deprecated` markers introduced; existing markers (if any) removed when the file is touched.
- **Memory protocol writes** — every commit writes to `bsuite_session_<date>` per `MEMORY_PROTOCOL.md`.
- **RLS standing audit** — Ship-All-Apps cron verifies the five `{authenticated}` policies per `AGENTS.md` §Automated Deployment Checks.
- **OAuth allow-list** — single source of truth is `AGENTS.md` per ADR-0004; any addition lands there first.
- **Red-team gate before merge** — security-audit + performance-regression + schema-consistency + downstream-impact reviews run on Phase 2+ atomic PR sets (per consolidated plan).

---

## Item counts (enumerated)

| Phase | Items enumerated above | Duration estimate |
|---|---|---|
| Phase 0 | 13 deliverables | 1-3 days (in progress) |
| Phase 1 | 12 items (P1-12, P1-12b, P1-12c, P1-14, P1-15, P0-6, P0-8, P0-10, P0-11, P0-13, P0-15, plus Phase-1-deep-pass docs classification task) | 4-5 days |
| Phase 2 | 6 items (incl. multi-PR P1.J, ADR-0001 + ADR-0002 execution) | 2-3 weeks |
| Phase 3 | 9 items (P1.C-1/2, P1.D-1/2, P1.M-1, P1-17, P1.E-1/2/3) | 2 weeks |
| Phase 4 | 22 items (P1.G-1/2, P1.H-1, P1.I-1, P1.O-1, P1-84, P1.F-1, WS-E.1–6, BL-003–6, R80-BL-001 equivalents enumerated under WS-E + cross-cutting rows) | 6 weeks |
| Phase 5 | 9 items (WS-A, BL-007–012, R80-BL-001) | 8 weeks |
| Phase 6 | 32 items (P2-1..P2-26 + BL-013..BL-018) | 4 weeks |
| Gated | 16 items (G-1..G-16, tracked alongside) | variable |
| **Total enumerated** | **~103 high-level scope items** (many fan out into sub-PRs) | **~16-24 weeks** |

Actual per-PR count will be higher — WS-E.1 alone spawns 6 per-app audit+fill PRs, WS-A alone spans 11 checkpoints × ~2 PRs each, etc. Expect **250-350 actual atomic PRs** across the program.

---

## What this backlog unblocks

Ratification of this backlog + ADRs 0001-0006 unblocks:

- Phase 1 kickoff (auth + branding + cookie SSO verification + P0-6/8/10/11/13/15) — 4-5 days of work
- Phase 2 canonical convergence — the big architectural cleanup (ADR-0001 + ADR-0002 execution), 2-3 weeks
- The entire 16-24 week program execution covering ~103 enumerated items + 16 gated track-alongside items

Pre-ratification open items needing user decision:

1. **Operator-tier handling** — default: parallel checklist. Override = serial pause per operator item.
2. **P1.J deadline fence** — default: auto-interrupt. Override = strict phase order.
3. **RAMS seed-data gate** — Phase 0 parallel or Phase 4 blocker? Default: Phase 0 parallel (validate criteria during Phase 1-3, seed during Phase 4 start). Default proposed seeding owner: user (validates criteria columns). Override = name named operator.
4. **6 ADRs ratification.**

---

## Revision log

- 2026-05-01 v1.00W — initial merge (this doc). Supersedes consolidation role of finish-line roadmap, outstanding-work ledger, and per-submodule OUTSTANDING files. Source docs remain for historical reference; execution queue moves here.
- 2026-05-01 v1.00W (post-ratification path-correction) — P1-14 row retitled from R80.3 to BSU (primary owner) with explicit file paths `business-suite-unified/src/pages/Admin.tsx`, `business-suite-unified/src/pages/Developer/Routing.tsx`, `business-suite-unified/src/stores/leadRoutingStore.ts` replacing earlier loose references. R80.3 repositioned as verification-pass (no profiles-embed in its `user_tenants` call sites: `permissionsService.ts`, `authStore.ts`, `unifiedSchemaService.ts`). Phase 1 exit criteria #4 scoped to BSU call sites. Verified via file-picker + authoritative code-search pass 2026-05-01.
- 2026-05-04 v1.00W (doc-unification sweep, non-execution) — companion documentation landed: `docs/20260504-bsuite-documentation-hub-v1.00W.md` (cross-submodule index) + `docs/20260504-bsuite-tech-stack-alignment-v1.00W.md` (canonical tech-stack baseline) + 6× `{submodule}/docs/PARENT-DOCS.md` cross-link files + `throughput/docs/README.md` (created from scratch). Archive move: `docs/plans/20260428-codex-phase-2-shared-packages-plan-v1.00W.md` → `docs/archive/2026-05-04-doc-unification/` (all 5 workstreams WS-2A–WS-2E complete with PR evidence, verified 2026-05-04). No backlog items were executed or struck through — this entry records the doc-unification sweep for traceability per the new per-PR audit rule in `docs/20260504-bsuite-documentation-hub-v1.00W.md` §7.1. New tech-stack gaps TS-24 (dry-lint version drift / SHARED-11), TS-25 (re-verification script / SHARED-10), and TS-26 (PARENT-DOCS shared-section CI check / SHARED-12) added to the alignment doc §5/§5.1.
