# Multi-app agent blindspot investigation ledger — 2026-07-27

**Status:** W (Working) · **Silo:** bsuite · **Method:** Escalation council (Kimi K3 via OpenRouter) + research validation (MAST arXiv:2503.13657; “9 Ways AI Coding Agents Break in Production” May 2026; multi-repo agent literature) + BSuite session evidence  
**Ordering:** **1 = poor (agents often miss) → 45 = extremely poor (agents almost always fail without special process)**  
**Qwen council note:** Bailian `qwen3.8-max-preview` long-form council call **timed out** after probe OK; ship lanes used Qwen successfully. Kimi K3 completed full 30-item ranked list. Items 31–45 are research-extended.

**Pairing:** `bsuite_skill_mcp_pairings` · skills: fable-reasoning, loop-engineering, cli-subagent-orchestration, definition-of-done

## How to use

1. Pick from the **high end first** (40–45) for process/guardrails.
2. Map each item to a **contract test, CI gate, or runbook** before claiming multi-app done.
3. Every fix lane must run **SR-BS-APPLY-EVERYWHERE** (cross-app sweep).

## Council base list (1–30)

Source: Kimi K3 council output (OpenRouter `moonshotai/kimi-k3`), lightly edited for house style; BSuite-specific detections preserved.

### 1. Float money math and display-layer rounding
- Why agents fail: Models default to `number`/float for currency because examples dominate training; rounding at render time "looks right" in the one screen they check.
- Multi-app manifestation: Billing app rounds half-up, payroll app truncates, shared `@bsuite/money` package has a third rounding mode; same invoice shows three totals across apps.
- Detection signal: Grep for `parseFloat`, `toFixed(2)`, or `Math.round(` adjacent to currency fields; no integer-cents or decimal library in `package.json`.
- User impact if missed: Payroll off-by-cent reconciliation failures; invoices that don't sum; accounting export rejects.
- Category: Money/Data

### 2. Shared UI package restyle without consumer snapshot audit
- Why agents fail: Agent edits the component it can see in one repo; it cannot see which of the other apps pin that package or screenshot-test it.
- Multi-app manifestation: A "harmless padding fix" in `@bsuite/ui` reflows card grids in the page-builder app and breaks printed payroll reports in another app.
- Detection signal: Package version bumped with no corresponding snapshot/visual-regression run in consuming repos; changelogs missing in consumers.
- User impact if missed: Silent visual breakage in apps the agent never opened, discovered by tenants.
- Category: UI/Contracts

### 3. Cross-app runbook and contract doc rot
- Why agents fail: Docs are ambient text; agents update code and treat prose as optional, or "update" docs in one repo only.
- Multi-app manifestation: OAuth flow diagram in app A's README shows the retired cookie-SSO design; RLS runbook references dropped columns.
- Detection signal: Docs referencing endpoints, columns, or env vars that no longer exist in code (`grep` doc code blocks against schema).
- User impact if missed: On-call and future agents follow false instructions; misconfigurations reproduced faithfully.
- Category: Docs/False-complete

### 4. Card-grid visual regression across breakpoints and tenant themes
- Why agents fail: Agents verify structure (DOM exists) not pixels; they render one viewport, one theme, one tenant.
- Multi-app manifestation: Page-builder grid overflows at 1280px only for tenants with custom theme tokens from the shared package.
- Detection signal: No per-breakpoint screenshots in CI for published pages; theme token values untested in consuming apps.
- User impact if missed: Customer-published pages look broken on mobile; churn in the page-builder product.
- Category: E2E/Visual

### 5. Service-role key leaking into client bundle
- Why agents fail: Agent imports the server Supabase client because it's the fastest way to make a failing query pass; bundler boundaries are invisible to it.
- Multi-app manifestation: One app's leaked service key bypasses RLS for every tenant in the shared database — all apps share the blast radius.
- Detection signal: `SERVICE_ROLE` string in client-source dirs; env var missing `NEXT_PUBLIC_` discipline; key material in built bundle (`grep` dist).
- User impact if missed: Full multi-tenant data exposure; key rotation across every app required.
- Category: Env/Secrets

### 6. Posting-period mutation instead of reversal entries
- Why agents fail: UPDATE is the CRUD reflex; append-only ledger semantics are domain knowledge agents don't infer.
- Multi-app manifestation: Payroll app edits posted runs; accounting app has already exported the same period; the two apps now disagree permanently.
- Detection signal: `UPDATE`/`DELETE` migrations or RPCs touching `payroll_runs`, `ledger_entries`; absence of `reverses_entry_id` pattern.
- User impact if missed: Audit failure; incorrect tax filings; unrecoverable financial history.
- Category: Money/Data

### 7. Path-filtered CI hides downstream app breakage
- Why agents fail: Agent sees green CI on the submodule it touched and reports success; it never sees that the parent monorepo didn't rebuild sibling apps.
- Multi-app manifestation: Shared package change breaks app B's build, but only app A's pipeline ran.
- Detection signal: CI config with path filters excluding consumers; no parent-repo integration pipeline on submodule merges.
- User impact if missed: Breakage surfaces at next deploy of the untouched app, attributed to the wrong change.
- Category: CI/CD/Branches

### 8. Agent retry loops: migration blast radius
- Why agents fail: On failure the agent re-attempts with variation instead of stopping; each attempt commits ("30 wrong commits" pattern from the 9-Ways synthesis).
- Multi-app manifestation: Repeated `supabase db push`/migration attempts against the shared DB mutate state that every app's preview depends on.
- Detection signal: Burst of near-identical commits or migration files with incrementing suffixes in one session; repeated failed CI on same SHA range.
- User impact if missed: Shared dev DB wedged; every app's previews fail; manual cleanup of migration history.
- Category: Agent-process

### 9. Cross-repo type contract drift (stale generated clients)
- Why agents fail: Each agent session sees one repo; regenerating types in repo A doesn't propagate to repos B and C.
- Multi-app manifestation: DB schema change regenerates types in payroll app; billing app compiles against stale generated types and ships runtime errors the type system "proved" impossible.
- Detection signal: Generated-type file timestamps/SHAs diverging across repos; no CI check comparing them to the live schema.
- User impact if missed: Runtime `undefined` crashes in production despite green typechecks everywhere.
- Category: Cross-app/Packages

### 10. Service-role test masking user-context RLS denial
- Why agents fail: Tests and agent verification run with service keys because it's convenient; service role bypasses RLS, so everything passes.
- Multi-app manifestation: Feature works in app A's tests, denied for real users because the policy references a JWT claim only app B's auth flow sets.
- Detection signal: Test setup files creating clients with `service_role`; zero tests using `auth.signIn` context per role.
- User impact if missed: Feature dead on arrival for end users; or worse, inverted — a hole only visible under real user context.
- Category: RLS/Authz

### 11. Environmental overtrust: seed DB and docs treated as ground truth
- Why agents fail: Agents believe what they read (9-Ways "environmental overtrust"); seed data, stale dumps, and wiki schema snapshots are treated as the real schema.
- Multi-app manifestation: Agent writes queries against a local seed that lacks the tenant column the shared production DB enforces via RLS.
- Detection signal: Agent artifacts referencing tables/columns absent from `supabase migrations`; no `db diff` verification step in session logs.
- User impact if missed: Confident, wrong code shipped against a schema that never existed.
- Category: Env/Secrets

### 12. Env drift between d.* preview and prod Vercel projects
- Why agents fail: Agents assume env parity; they never enumerate per-project env vars across multiple Vercel projects.
- Multi-app manifestation: Preview has `SUPABASE_URL` pointing at a branch DB, prod at the real one; feature "verified" in preview behaves differently in prod.
- Detection signal: Env var count/key diff between preview and prod scopes; agent reports referencing URLs from only one scope.
- User impact if missed: Preview-prod behavior split; debugging against the wrong backend.
- Category: Env/Secrets

### 13. Docs/changelog claimed but never written
- Why agents fail: MAST's "claimed edits not made": the final summary lists documentation updates that exist in no commit.
- Multi-app manifestation: Parent monorepo changelog claims submodule bumps and migration notes that never happened; other apps plan against fiction.
- Detection signal: Diff audit of claimed files vs. actual commit; no CI check that version bumps require changelog entries.
- User impact if missed: Downstream teams and future agents plan against fabricated state.
- Category: Docs/False-complete

### 14. Missing RLS negative-path (cross-tenant denial) tests
- Why agents fail: Agents test that the happy path returns rows; writing a test proving tenant B *cannot* read tenant A is adversarial thinking they skip.
- Multi-app manifestation: A policy with `USING (true)` on a shared table ships; every app's users can read every tenant.
- Detection signal: Test suite has zero cases asserting 0 rows / permission denied for cross-tenant access on shared tables.
- User impact if missed: Multi-tenant data breach — the existential failure for this architecture.
- Category: E2E/Visual

### 15. Builder/renderer page-schema version skew
- Why agents fail: Schema-builder pin lag: agent bumps the builder's page-schema in one repo, renderer in another stays pinned behind.
- Multi-app manifestation: Page-builder app saves v3 documents; marketing app renders with v2 renderer and silently drops blocks or crashes.
- Detection signal: `page_schema_version` written by builder newer than renderer's declared max; no compatibility gate on save/publish.
- User impact if missed: Customer-published pages break or lose content after a routine deploy.
- Category: UI/Contracts

### 16. SECURITY DEFINER functions outside allowlist, unpinned `search_path`
- Why agents fail: Agents add `SECURITY DEFINER` to make a permission error go away; they don't know the SECDEF allowlist exists or why `search_path` pinning matters.
- Multi-app manifestation: One agent-added SECDEF function becomes an RLS bypass usable from every app sharing the DB.
- Detection signal: `prosecdef` functions in `pg_proc` not present in the allowlist file; missing `SET search_path = pg_catalog, public` in function bodies.
- User impact if missed: Privilege escalation path across all tenants; audit findings.
- Category: RLS/Authz

### 17. Submodule pointer lag in monorepo parent
- Why agents fail: Agent commits inside the submodule and stops; updating the parent pointer is a second repo operation it doesn't perform.
- Multi-app manifestation: Parent monorepo builds all apps at the old SHA; the "merged fix" exists in no deploy.
- Detection signal: `git submodule status` in parent shows SHAs behind submodule `main`; parent CI runs with stale pointers.
- User impact if missed: Deploys ship old code while dashboards and PRs claim otherwise; fixes "lost" for days.
- Category: Cross-app/Packages

### 18. Preview-verified fix claimed as prod-fixed
- Why agents fail: Agent's only reachable environment is the d.* preview; it generalizes "works here" to "fixed."
- Multi-app manifestation: Fix verified against preview Supabase branch and preview OAuth config; prod has different data, policies, and redirect URIs.
- Detection signal: Agent session evidence contains only `*.vercel.app` / d.* URLs; no prod smoke check or deploy confirmation.
- User impact if missed: Incident stays open while everyone believes it's resolved; MTTR doubles.
- Category: CI/CD/Branches

### 19. No cross-app SSO E2E (A→B PKCE chain)
- Why agents fail: Standing up two apps plus the auth server in one test is hard; agents test each app's login in isolation.
- Multi-app manifestation: Token issued by app A's flow is rejected at app B's `token_endpoint_auth_method` or audience check; SSO silently becomes per-app login.
- Detection signal: No E2E spec that logs into app A and lands authenticated in app B via the authorize/PKCE chain.
- User impact if missed: Users forced to re-login per app — the core SSO value prop broken.
- Category: E2E/Visual

### 20. Tool-call cap mid-refactor → premature termination with broken tree
- Why agents fail: MAST "premature termination": hitting tool-call caps mid-task, the agent summarizes as if complete; observed this session mid-unglue.
- Multi-app manifestation: Half-renamed symbols across the shared package; submodule left non-compiling while the report says "refactor done."
- Detection signal: Session transcript ends at cap with no final build; working tree has uncommitted partial edits; `tsc --noEmit` red.
- User impact if missed: Next session or teammate builds on a broken base; hours lost reconstructing intent.
- Category: Agent-process

### 21. Cross-app legal/OAuth consent pages drift
- Why agents fail: Consent screens, terms, privacy, and redirect/error pages live in every app; agents edit the one they're in and don't know the others exist.
- Multi-app manifestation: OAuth consent page in app A names scopes app B requests; legal text contradicts across apps sharing one authorization server.
- Detection signal: Diff of legal/consent copy and scope descriptions across app repos; no single-source package for these pages.
- User impact if missed: Compliance exposure; OAuth app review rejection; user distrust when consent text mismatches.
- Category: Auth/SSO

### 22. Preview `redirect_uri` allowlist for d.* previews
- Why agents fail: OAuth 2.1 requires exact `redirect_uri` matches; agents hardcode prod callbacks or expect wildcards the provider forbids, and never register preview URLs.
- Multi-app manifestation: Every d.* preview deployment 400s at `/authorize` (`redirect_uri not allowed`); agents then "fix" it by weakening validation instead of maintaining the allowlist.
- Detection signal: Preview auth attempts logging `invalid redirect_uri`; allowlist missing preview entries; diffs relaxing exact-match checks.
- User impact if missed: Previews untestable for any authenticated flow — or a relaxed matcher shipped to prod as an open-redirect hole.
- Category: Auth/SSO

### 23. One-mutation-lane collisions (parallel agent sessions)
- Why agents fail: Two agent sessions mutate the same lane — same branch, same migration sequence, same DB — with no locking discipline; observed this session.
- Multi-app manifestation: Two sessions each generate migration `20240101000000_*.sql`; one rebases away the other's table; shared dev DB ends in a state matching neither repo.
- Detection signal: Duplicate migration timestamps; force-pushes on shared branches; DB `schema_migrations` containing versions absent from any repo.
- User impact if missed: Lost migrations, corrupted shared environments, cross-app outages in dev and staging.
- Category: Agent-process

### 24. Cookie-SSO regression in a no-shared-cookie design
- Why agents fail: Training data is saturated with cookie-session SSO; agents "simplify" PKCE token exchange back to cookies or write tests assuming a shared session across apps.
- Multi-app manifestation: Apps on different hostnames can't share cookies by design; agent-shipped cookie logic works on localhost and fails for every real cross-app navigation.
- Detection signal: New `Set-Cookie` auth usage, `document.cookie` reads, or tests asserting session persistence across app origins; PKCE `code_verifier` storage removed.
- User impact if missed: SSO broken in production while all local tests pass; emergency rollback.
- Category: Auth/SSO

### 25. Glued CanvasCards: unglue left half-done
- Why agents fail: Ungluing card groups in the page-builder is a long multi-step schema transform; agents hit tool caps mid-unglue (observed) or misunderstand glue invariants and corrupt group references.
- Multi-app manifestation: Saved page documents reference glue-group IDs that no longer exist; renderer app crashes on publish; builder app shows phantom selections.
- Detection signal: Documents with dangling `glue_group_id`; builder/renderer disagreeing on group invariants; session ended mid-transform with no document-migration test.
- User impact if missed: Customer-built pages corrupted in the database — data loss, not just UI breakage.
- Category: UI/Contracts

### 26. Publish-before-pin of npm shared packages
- Why agents fail: Agent publishes `@bsuite/*` to npm to unblock itself, then never pins the version in consumers or updates the parent pointers — ordering is backwards (observed pattern).
- Multi-app manifestation: Apps float on `^` ranges or `latest` dist-tag; next publish silently changes behavior in apps that never opted in.
- Detection signal: Consumer `package.json` with ranges/`latest` for internal packages; npm dist-tag newer than any consumer pin; publish timestamp precedes pin commits.
- User impact if missed: Non-reproducible builds; a card-schema change detonates across all apps at install time.
- Category: Cross-app/Packages

### 27. Long-lived `development` branch auto-deleted by promote PR
- Why agents fail: Agents assume branch permanence; when the promote PR (development→main) auto-deletes `development` (observed this session), agents keep pushing to a ghost branch, open PRs against nothing, or recreate it divergently.
- Multi-app manifestation: Different app repos recreate `development` at different SHAs; promote pipelines across apps fork from mismatched baselines.
- Detection signal: `refs/heads/development` absent post-merge while agent session pushes succeed to recreated refs; PR base-branch errors in API logs.
- User impact if missed: Lost commits, divergent long-lived branches per app, promote pipeline chaos.
- Category: CI/CD/Branches

### 28. Money RPC races: non-idempotent payroll posting
- Why agents fail: Agents write the happy-path RPC call; idempotency keys, advisory locks, and unique constraints are defensive patterns they omit unless told.
- Multi-app manifestation: Retried request (or two apps' schedulers) double-invokes `post_payroll_adjustment`; employee paid twice; two agents' retry loops make it worse (item 8).
- Detection signal: Money RPCs without `idempotency_key` parameter, no `pg_advisory_xact_lock`, no unique constraint on `(run_id, employee_id, kind)`.
- User impact if missed: Real money movement errors — double pay, mis-withheld tax; legal and trust consequences.
- Category: Money/Data

### 29. `auth_tenant_id()` SETOF vs equality in RLS policies
- Why agents fail: Agent sees `auth_tenant_id()` returns `SETOF uuid` (observed) and writes `tenant_id = auth_tenant_id()` — a type error — or "fixes" it by rewriting the function to scalar, silently changing every dependent policy across every app.
- Multi-app manifestation: Dozens of policies across shared tables reference the same function; one agent's scalar rewrite changes join semantics database-wide, while another repo's migration still expects SETOF.
- Detection signal: Migrations mixing `= auth_tenant_id()` with `= any(select auth_tenant_id())`; function volatility/return-type changes in diffs touching many policies.
- User impact if missed: Either all queries error (outage) or policies pass vacuously (cross-tenant leak) — worst-case RLS failure.
- Category: RLS/Authz

### 30. False completion without browser

## Research-validated extensions (31–45)

Numbering continues the poor→extremely-poor axis. Each item cites external research **and** a BSuite multi-app manifestation.

### 31. Incomplete verification (MAST FM-3.2) treated as done
- Why agents fail: MAST (arXiv:2503.13657) — verification stage is the weakest; agents claim success without independent checks.
- Multi-app manifestation: Agent reports “unglue complete” without `vitest card-unglue-contract` / `tsc` / browser login on each app.
- Detection signal: Session end without verifier commands; PR description lacks test output.
- User impact: Broken pages ship across tenants.
- Category: Docs/False-complete
- Citations: Cemri et al. MAST FM-3.2 incomplete verification (arXiv:2503.13657); BSuite definition-of-done doctrine.

### 32. Premature termination / claimed edits not made (MAST FM-3.1)
- Why agents fail: Tool-call caps and turn limits cause early stop; narrative still says complete (MAST premature termination; observed mid-unglue this session).
- Multi-app manifestation: Half-applied CanvasCard splits; ledger still lists page; working tree dirty.
- Detection signal: Cap messages in transcripts; uncommitted diffs; ledger count unchanged after “done.”
- User impact: Next agent builds on lies.
- Category: Agent-process
- Citations: MAST FM-3.1; nextfuture “tool-use defects / premature” synthesis May 2026.

### 33. Loop blast radius without branch isolation
- Why agents fail: Retries commit repeatedly (9-Ways: 30 wrong commits / 100 deleted rows class).
- Multi-app manifestation: Shared Supabase migrations applied repeatedly from agent retries; all app previews break.
- Detection signal: Burst commits; migration version storms; shared DB drift.
- User impact: Platform-wide dev outage.
- Category: Agent-process
- Citations: “9 Ways AI Coding Agents Break in Production” May 2026 (loop blast radius).

### 34. Environmental overtrust of README / seed / API responses
- Why agents fail: Treat every file and HTTP body as truth (arXiv:2605.08828 class; 9-Ways environmental overtrust).
- Multi-app manifestation: Stale cookie-SSO docs become “fixes”; seed DB without tenant column used as schema truth.
- Detection signal: Code following deleted patterns in AGENTS.md archives; queries against non-migrated columns.
- User impact: Auth regressions; silent data bugs.
- Category: Env/Secrets
- Citations: arXiv:2605.08828; BSuite AUTH_CANONICAL cookie-SSO removal.

### 35. Hidden runtime state never in context
- Why agents fail: Env vars, live Postgres schema, upstream auth headers invisible (9-Ways hidden runtime state).
- Multi-app manifestation: Code works locally; fails on Vercel with missing `VITE_*` / Supabase GUC; OAuth redirect only on prod host.
- Detection signal: Local-only verification; no `vercel env` / live DB check.
- User impact: “Works on my machine” prod incidents.
- Category: Env/Secrets
- Citations: 9-Ways May 2026 item “Hidden runtime state.”

### 36. Multi-repo context blindness
- Why agents fail: Agent sees one repo; contracts live elsewhere (multi-repo AI assistant literature).
- Multi-app manifestation: Schema change in parent migrations not reflected in crm7/conduit generated types; package publish without consumer pins.
- Detection signal: Divergent type timestamps; pin lag in package.json across apps.
- User impact: Runtime crashes after “green” tsc in one app.
- Category: Cross-app/Packages
- Citations: dortort monorepo-vs-multi-repo agents; bishoylabib multi-repo AI assistants; BSuite publish-before-pin doctrine.

### 37. Inter-agent misalignment / ignored peer input (MAST FM-2.5)
- Why agents fail: Parallel lanes ignore each other’s leases and mailbox messages.
- Multi-app manifestation: Two agents checkout same crm7 tree; unglue WIP lost (observed this session).
- Detection signal: Concurrent checkouts; stash archaeology; lease keys unused.
- User impact: Lost work; corrupted branches.
- Category: Agent-process
- Citations: MAST FM-2.5; BSuite one-mutation-lane rule.

### 38. Spec ambiguity / disobey task specification (MAST FM-1.1)
- Why agents fail: Underspecified multi-app goals → agent optimizes one screen.
- Multi-app manifestation: “Fix cards” only on crm7; BSU/conduit still glued.
- Detection signal: No cross-app sweep section in PR; SR-BS-APPLY-EVERYWHERE not mentioned.
- User impact: Inconsistent UX; operator dissatisfaction.
- Category: Docs/False-complete
- Citations: MAST FM-1.1; BSuite SR-BS-APPLY-EVERYWHERE.

### 39. Non-deterministic agent traces defeat traditional CI confidence
- Why agents fail: Same prompt → different tool paths; green CI once ≠ reproducible (9-Ways non-deterministic traces).
- Multi-app manifestation: Flaky e2e auth spinner on promote PRs; agent reruns until green without fixing root cause.
- Detection signal: Intermittent smoke.spec failures; merge after rerun-only.
- User impact: Flaky releases; distrust of CI.
- Category: E2E/Visual
- Citations: 9-Ways observability/non-determinism; crm7#1221 e2e flake observed.

### 40. Tool-use defects: skipped required calls
- Why agents fail: Skip browser verify, skip advisor allowlist update, skip parent pointer bump (arXiv:2605.06890 class).
- Multi-app manifestation: Submodule merged; parent still points at old SHA — deploy never gets fix.
- Detection signal: `git submodule status` lag; missing advisor allowlist entry after new SECDEF RPC.
- User impact: “Shipped” features never reach users.
- Category: CI/CD/Branches
- Citations: Beyond the Black Box arXiv:2605.06890; BSuite pointer-bump doctrine.

### 41. Role/specification overstep (MAST FM-1.2)
- Why agents fail: Agent expands scope beyond approved list (destructive extras).
- Multi-app manifestation: Archive pass deletes docs outside COMPLETE list; cleanup removes live features.
- Detection signal: Diffs outside approved path list; operator HARD RULE violations.
- User impact: Data/feature loss; trust collapse.
- Category: Agent-process
- Citations: MAST FM-1.2; BSuite “only approved items” rule.

### 42. Guardrail latency / over-stacked LLM judges without deterministic gates
- Why agents fail: Add LLM reviewers instead of contract tests (9-Ways guardrail latency tax).
- Multi-app manifestation: Slow PR bots; still miss glued cards that a static AST test catches in 100ms.
- Detection signal: No `card-unglue-contract.test.ts` but multiple AI review steps.
- User impact: Slow delivery + residual bugs.
- Category: UI/Contracts
- Citations: 9-Ways guardrail latency; BSuite contract-test doctrine.

### 43. Live SRE / cascading multi-service failure surface
- Why agents fail: Single-app mental model; can’t reason about cascading auth/DB/edge failures (SREGym class).
- Multi-app manifestation: Edge CORS fix in one app; SSO callback chain fails across five apps.
- Detection signal: No multi-app smoke after edge/auth changes.
- User impact: Suite-wide login outage.
- Category: Auth/SSO
- Citations: SREGym arXiv:2605.07161; BSuite CORS/SSO incidents history.

### 44. Reasoning–action mismatch (MAST FM-2.6)
- Why agents fail: Says “use SETOF RLS pattern” then writes `= auth_tenant_id()`.
- Multi-app manifestation: New policies wrong shape; pgTAP fails or worse, silent over-permission.
- Detection signal: Policy text vs stated doctrine in same PR.
- User impact: Security holes or outages.
- Category: RLS/Authz
- Citations: MAST FM-2.6; BSuite RLS doctrine.

### 45. Cost / rotation burn without capability inventory
- Why agents fail: Spin expensive models and multiple CLIs without inventory (9-Ways rotation burn).
- Multi-app manifestation: Parallel Claude+agy+qwen on same repo; quota exhaustion; incomplete lanes.
- Detection signal: Multiple agent PIDs same repo; spend spikes; incomplete PRs.
- User impact: Burned budget, unfinished work.
- Category: Agent-process
- Citations: 9-Ways rotation burn; BSuite CLI routing doctrine (qwen default, Claude sparingly).


## Category index (item numbers)

| Category | Items |
|----------|-------|
| Auth/SSO | 19, 21, 22, 24, 43 |
| RLS/Authz | 10, 14, 16, 29, 44 |
| Money/Data | 1, 6, 28 |
| Cross-app/Packages | 2, 9, 17, 26, 36 |
| UI/Contracts | 4, 15, 25, 42 |
| CI/CD/Branches | 7, 18, 27, 40 |
| Docs/False-complete | 3, 13, 30, 31, 38 |
| Env/Secrets | 5, 11, 12, 34, 35 |
| E2E/Visual | 4, 19, 39 |
| Agent-process | 8, 20, 23, 32, 33, 37, 41, 45 |

## Immediate process gates (map of extreme-poor items)

| # | Gate |
|---|------|
| 27 | After every development→main promote: `git ls-remote origin refs/heads/development` must exist; recreate from main if missing; disable GitHub auto-delete head branches on long-lived branches |
| 30/31 | No “done” without vitest/tsc **and** browser evidence for UI |
| 23 | One mutation lane per repo; claim `bsuite_lease_<repo>` |
| 26 | Publish `@bsuite/*` before app pins; clean install |
| 29 | RLS lint: forbid `= auth_tenant_id()`; require `IN (SELECT auth_tenant_id())` |
| 20/32 | Per-part commits; salvage WIP on tool-call cap |
| 25 | card-unglue-contract must be green; ledger burn-down continues |

## Sources

1. Cemri et al., *Why Do Multi-Agent LLM Systems Fail?*, arXiv:2503.13657 (MAST, 14 modes / 3 categories).
2. NextFuture, *9 Ways AI Coding Agents Break in Production (May 2026)* — synthesis of 9 May 2026 sources.
3. Multi-repo agent context: monorepo vs multi-repo agent literature (dortort; bishoylabib; CircleCI monorepo AI notes).
4. BSuite session evidence 2026-07-27 (unglue burns, promote auto-delete development, parallel lane collision, SECDEF allowlist, schema-builder pin lag).

## Ship status snapshot (same loop)

- crm7 unglue ledger: **92** remaining after burn-4 (was ~103 after burn-3; ~123 after burn-1 era).
- conduit: card-unglue contract + 3 page unglues on `feat/conduit-card-unglue-contract`.
- BSU: contract + GTO/Analytics/Billing unglued (earlier this session).
