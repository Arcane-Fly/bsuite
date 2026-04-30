# Phase 3 Vercel Deploy Verification — Handoff to Claude Code

**Author:** Buffy (Codebuff, anthropic/claude-opus-4.7)
**Recipient:** Claude Code (has Vercel MCP access)
**Created:** 2026-04-30 (UTC)
**Status:** `v1.00W` (Working — promote to `v1.00A` Approved on green signoff)
**Scope:** Runtime verification of 6 Vercel-deployed BSuite apps after the Phase 3 A+B+C schema-builder rollout

---

## 1. Context & What Shipped

Phase 3 A+B+C of the `@bsuite/schema-builder` rollout completed **2026-04-30** under an explicit operator **Zero-Defer mandate** ("no deferrals permitted. I forbid them."). **25 PRs** merged across 6 consumer repos plus the parent `bsuite` monorepo.

Canonical source of truth for scope delivered, design deviations, and lessons learned:
👉 `docs/20260504-schema-builder-phase-3-signoff-v1.00W.md`

### Merged PRs

#### Parent bsuite (11)

| PR | One-liner |
|---|---|
| [#361](https://github.com/GaryOcean428/bsuite/pull/361) | package + migrations (Phase 3 A+B core) |
| [#362](https://github.com/GaryOcean428/bsuite/pull/362) | submodule bumps + original signoff doc |
| [#363](https://github.com/GaryOcean428/bsuite/pull/363) | docs-archive-sweep submodule pointers + Phase 3 lockfile |
| [#364](https://github.com/GaryOcean428/bsuite/pull/364) | crm7 pointer post-Workstream-C merge |
| [#365](https://github.com/GaryOcean428/bsuite/pull/365) | parent dev→main promotion (first) |
| [#366](https://github.com/GaryOcean428/bsuite/pull/366) | signoff doc: close Workstream C deferral per Zero-Defer mandate |
| [#367](https://github.com/GaryOcean428/bsuite/pull/367) | BSU migration parity + dry-lint exemption for `schema_mutations_audit` |
| [#368](https://github.com/GaryOcean428/bsuite/pull/368) | crm7 pointer for spec tightening (#354) |
| [#369](https://github.com/GaryOcean428/bsuite/pull/369) | parent dev→main promotion (second) |
| [#370](https://github.com/GaryOcean428/bsuite/pull/370) | parent dev→main promotion (final alignment) |
| [#371](https://github.com/GaryOcean428/bsuite/pull/371) | post-promotion back-merge main→dev (sync divergence) |

Note: `bsuite#350` was closed without merging (obsolete tracker PR superseded by the in-house Phase 3 rollout).

#### crm7 (6)

| PR | One-liner |
|---|---|
| [#350](https://github.com/GaryOcean428/crm7/pull/350) | bump `@bsuite/schema-builder` to `^0.7.0` |
| [#351](https://github.com/GaryOcean428/crm7/pull/351) | docs-archive-sweep (markdown hygiene only) |
| [#352](https://github.com/GaryOcean428/crm7/pull/352) | **Workstream C — seeded E2E fixture tenant** (migration + seed script + Playwright fixtures) |
| [#353](https://github.com/GaryOcean428/crm7/pull/353) | dev→main promotion |
| [#354](https://github.com/GaryOcean428/crm7/pull/354) | spec tightening — strict assertion on `widget_name` fixture field |
| [#355](https://github.com/GaryOcean428/crm7/pull/355) | dev→main promotion (carries #354) |

#### R80.3 (3)

| PR | One-liner |
|---|---|
| [#136](https://github.com/GaryOcean428/R80.3/pull/136) | bump `@bsuite/charge-calc` to `^0.2.3` |
| [#137](https://github.com/GaryOcean428/R80.3/pull/137) | docs-archive-sweep |
| [#138](https://github.com/GaryOcean428/R80.3/pull/138) | dev→main promotion |

#### conduit (3)

| PR | One-liner |
|---|---|
| [#152](https://github.com/GaryOcean428/conduit/pull/152) | schema-builder consumer bump (where applicable) |
| [#153](https://github.com/GaryOcean428/conduit/pull/153) | docs-archive-sweep |
| [#154](https://github.com/GaryOcean428/conduit/pull/154) | dev→main promotion |

#### business-suite-unified (3)

| PR | One-liner |
|---|---|
| [#243](https://github.com/GaryOcean428/business-suite-unified/pull/243) | schema-builder consumer alignment |
| [#244](https://github.com/GaryOcean428/business-suite-unified/pull/244) | docs-archive-sweep |
| [#245](https://github.com/GaryOcean428/business-suite-unified/pull/245) | **BSU migration parity — mirror Phase 3 `schema_mutations_audit` as canonical** |

#### braden (1)

| PR | One-liner |
|---|---|
| [#171](https://github.com/GaryOcean428/braden/pull/171) | docs-archive-sweep (2026-04-30 wave) |

#### throughput (1)

| PR | One-liner |
|---|---|
| [#67](https://github.com/GaryOcean428/throughput/pull/67) | docs-archive-sweep (2026-04-30 wave) |

---

## 2. Current Git State (2026-04-30, post-merge)

Default-branch HEAD SHAs captured at handoff time. All 6 submodule pointers in parent `bsuite` are aligned with these HEADs.

| Repo | Branch | HEAD (short) | Last commit subject |
|---|---|---|---|
| bsuite (parent) | `development` | `43a45cc` | post-back-merge; `main` and `development` aligned |
| crm7 | `main` | `a359d690` | Merge PR #355 from development |
| R80.3 | `main` | `ca0227b9` | Merge PR #138 from development |
| conduit | `main` | `794f6a98` | Merge PR #154 from development |
| business-suite-unified | `main` | `da4318e` | `chore(bsu): mirror Phase 3 schema-builder migrations as canonical (#245)` |
| braden | `main` | `73ca3b88` | `chore(braden): archive shipped docs (2026-04-30 wave) (#171)` |
| throughput | `main` | `45fb1178` | `chore(throughput): archive shipped docs (2026-04-30 wave) (#67)` |

---

## 3. Vercel Deploy Snapshot at Handoff

Captured via `vercel ls <project> --scope braden-pty-ltd` at ~2026-04-30T14:45Z.

| Vercel project | Production domain | Latest Production deploy URL | Age at handoff | Status |
|---|---|---|---|---|
| `business-suite` | `suite.crm7.app` | *(see `vercel ls business-suite`; most recent Production row)* | 27m | ● Ready |
| `crm7` | `crm.crm7.app` | *(see `vercel ls crm7`; most recent Production row)* | 20m | ● Ready |
| `r8` | `r8.crm7.app` | *(see `vercel ls r8`; most recent Production row)* | 56m | ● Ready |
| `conduit` | `conduit.crm7.app` | `https://conduit-lbisxsgnw-braden-pty-ltd.vercel.app` | 57m | ● Ready |
| `braden` | `www.braden.com.au` | `https://braden-ov1cmd6uv-braden-pty-ltd.vercel.app` | 1h | ● Ready |
| `throughput` | `ideas.crm7.app` | `https://throughput-8ej3u26jp-braden-pty-ltd.vercel.app` | 1h | ● Ready |

**Git-level:** all Production deploys are `READY`.

**What we do NOT yet know — your job to verify:**

- Does the commit SHA of each Production deploy actually match the current `main` HEAD from §2? (Vercel auto-deploys on merge but can silently skip if a build fails, auto-deploy is paused, or a later deploy supersedes an intermediate one.)
- Are runtime logs clean post-deploy? (No 5xx responses, no unhandled exceptions, no missing env vars, no CSP violations from new code paths.)
- Does build output have warnings we should triage? (New package versions, new Supabase migration files, new schema-builder UI routes, new test fixtures.)

---

## 4. Your Task (Claude Code)

Use your **Vercel MCP tools** (preferred) or **Vercel CLI** as fallback to verify each of the 6 projects against the checklist below.

**Environment:**
- Vercel CLI installed at `~/.npm-global/bin/vercel` (v50.32.3)
- Authenticated as `garyocean428`
- Active team scope: `braden-pty-ltd`

### 4.1 Per-project verification checklist

Run for **`business-suite`**, **`crm7`**, **`r8`**, **`conduit`**, **`braden`**, **`throughput`**.

1. **Commit SHA match.** Latest Production deployment's `meta.githubCommitSha` (or the equivalent MCP field) **must match** the `main` HEAD in the table in §2. If it does not, the deploy is stale — find out why (paused project, failed build, auto-deploy disabled, superseded by a rollback).
2. **Build logs clean.** No `ERROR`, no `FAIL`, no `EADDRINUSE`, no `EACCES`. Warnings are allowed, but flag anything mentioning `schema-builder`, `charge-calc`, `migrations`, `supabase`, `pnpm-lock`, or `Peer dependency`.
3. **Runtime logs (last 30 min post-deploy).** No 5xx responses. No `TypeError`, `ReferenceError`, `SyntaxError`. No `Cannot find module`. No `Invalid client credentials`, `JWT expired`, or `RLS policy violation`.
4. **Runtime env vars sanity.**
   - For **crm7 only**: confirm `CRM7_E2E_PASSWORD` is **NOT** set in Production. It is an E2E-only fixture credential — if present in Production, that is an exposure bug.
   - For **all**: confirm `SUPABASE_URL` points at `tuybltdrdefjblnplpqo`.
5. **Live domain smoke test.** `curl -I https://<domain>` returns 200 (or 307 for auth-gated apps). Follow any redirect chain.

### 4.2 Project-specific concerns

- **crm7** — Workstream C added migration `crm7/supabase/migrations/20260507000000_e2e_fixture_tenant.sql`. Vercel deploys do **not** run Supabase migrations (the Supabase CLI does). Verify:
  - The migration file is present in the build output / deployed commit.
  - The migration is **NOT** applied in Production Supabase (`tuybltdrdefjblnplpqo`). Check migration history: the fixture tenant must stay out of Production. The migration is idempotent and safe, but Production should not carry `is_e2e_fixture=true` rows.
- **business-suite-unified** — PR #245 mirrored the `schema_mutations_audit` migration as canonical in BSU. Same note: Vercel doesn't apply migrations. Check the file is present at `business-suite-unified/supabase/migrations/20260503*` on the deployed commit.
- **conduit** — Next.js 16 (App Router). Check Edge runtime routes for any Phase 3-related `/api` paths. Verify `maxDuration` is set on any new AI routes if touched.
- **braden** — CSP is strict. If any Phase 3 PR accidentally introduced a new external script source, the CSP header would block it at runtime. Inspect the browser-visible deploy for console CSP violations.
- **throughput** — CSP connects to Groq/OpenAI/Anthropic. Phase 3 did not touch these, but confirm the docs-archive-sweep PR (#67) did not accidentally remove a runtime file. Also: throughput uses `npm` not `pnpm` — verify the install step matches.
- **R80.3** — `vercel.json` specifies `pnpm install --frozen-lockfile`. If the lockfile drift from the `@bsuite/charge-calc@0.2.3` upgrade was handled incorrectly, install would fail with `ERR_PNPM_OUTDATED_LOCKFILE`. Confirm install step succeeded in the build log.

### 4.3 Vercel CLI cheat-sheet

Use the Vercel MCP equivalents where available. Falling back to CLI:

```bash
# List recent deploys for a project
vercel ls <project-name> --scope braden-pty-ltd

# Inspect a specific deploy (gets commit SHA, build duration, state, env)
vercel inspect <deployment-url> --scope braden-pty-ltd

# Tail runtime logs for a deploy
vercel logs <deployment-url> --scope braden-pty-ltd

# Build logs (non-follow)
vercel logs <deployment-url> --scope braden-pty-ltd --follow=false

# Production env vars (run inside project dir or with --cwd)
vercel env ls production --scope braden-pty-ltd
```

**Project → Vercel CLI name mapping:**

| Repo | Vercel project name |
|---|---|
| `business-suite-unified` | `business-suite` |
| `crm7` | `crm7` |
| `R80.3` | `r8` |
| `conduit` | `conduit` |
| `braden` | `braden` |
| `throughput` | `throughput` |

**CLI quirks:** `--limit` is **not** a supported flag on Vercel CLI 50.x. Truncate output with `| head -N` instead.

---

## 5. Red-flag criteria (escalate immediately)

Stop and report back without attempting remediation if any of the following is true:

- Any Production deploy is in `ERROR` state since the Phase 3 PRs started merging (2026-04-30 ~14:00 UTC onward).
- Any Production deploy's commit SHA is **older** than the `main` HEAD listed in §2.
- Any runtime log contains `schema_mutations_audit`, `tenant_field_definitions`, or `tenant_entities` at `ERROR` level.
- Any runtime log contains `e2e-fixture` or `is_e2e_fixture` in **Production** (these strings must only appear during E2E runs).
- New CSP violations appear in browser console on braden or throughput production surfaces since the docs-archive-sweep PRs merged.
- Any missing env var at runtime (`process.env.X is undefined` patterns, or `X is not defined` referencing an expected env key).
- Supabase Production has migration `20260507000000_e2e_fixture_tenant` applied. It **must not be**.

---

## 6. Success criteria (green signoff)

All 6 projects pass every item:

- [ ] Latest Production deploy is in `READY` state.
- [ ] `meta.githubCommitSha` matches the `main` HEAD from §2.
- [ ] Build logs clean (no `ERROR`, no `FAIL`).
- [ ] Runtime logs for the last 30 min post-deploy show no 5xx and no unhandled exceptions.
- [ ] Live domain returns 200 or 307 on `curl -I`.
- [ ] (crm7 + BSU only) Supabase Production migration history does **NOT** contain `20260507000000_e2e_fixture_tenant`.

### On green

1. Update **this document in place**.
2. Change the status suffix in the filename from `v1.00W` → `v1.00A` (Approved) — rename the file via `git mv`.
3. Add a new `## 7. Verification Report (YYYY-MM-DD HH:MM UTC)` section with evidence: deployment URLs, SHA match confirmations, log excerpts, curl output.
4. Open a PR against parent `bsuite` `development` branch titled:
   `docs(phase3): Vercel deploy verification green`
5. Admin-merge, then promote through `dev→main` per the standard flow (branch protection is active — use `gh pr merge --admin` and keep submodule pointers aligned).

### On red

1. Do **NOT** update the status suffix.
2. Open a tracking issue in the affected repo(s) with labels `deploy` + `phase-3`.
3. Post the specifics back (deploy URL, log excerpts, suspected cause).
4. Do **NOT** attempt a rollback, env-var change, or Supabase migration reversal without explicit operator (braden) approval.

---

## 7. Supporting refs

- **Signoff doc:** `docs/20260504-schema-builder-phase-3-signoff-v1.00W.md`
- **Session memory:** `bsuite_session_20260430b` at `https://qig-memory-api.vercel.app/api/memory/bsuite_session_20260430b`
- **Zero-Defer mandate:** operator statement 2026-04-30 — *"no deferrals permitted. I forbid them."*
- **Vercel team:** `braden-pty-ltd` (team ID). CLI flag: `--scope braden-pty-ltd`.
- **Supabase project:** `tuybltdrdefjblnplpqo`
- **OAuth domain map:** see §Authentication & OAuth in `AGENTS.md` at project root.

---

**End of handoff. Good hunting, Claude Code.**
