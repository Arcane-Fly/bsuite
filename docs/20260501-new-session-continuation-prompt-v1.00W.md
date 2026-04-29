# New-Session Continuation Prompt — BSuite Ship-All-Apps (post-Phase 0 ratification)

**Document**: `20260501-new-session-continuation-prompt-v1.00W.md`
**Status**: W (Working)
**Created**: 2026-05-01
**Purpose**: Fully-self-contained handoff so a fresh Codebuff session can resume the ship-all-apps workflow without needing the previous session's chat context.

---

## § 0 — PASTE-THIS-VERBATIM FIRST-MESSAGE BLOCK

When you start a fresh Codebuff session from `/home/braden/Desktop/Dev/bsuite`, send this as the **first message**:

---

> **Resume BSuite ship-all-apps workflow.** Context:
>
> 1. Read `docs/20260501-new-session-continuation-prompt-v1.00W.md` in full — that doc has everything you need including every failure mode and remediation.
> 2. Read `docs/20260501-phase-0-completion-report-v1.00W.md` for the ratification context.
> 3. Read `docs/20260501-merged-execution-backlog-v1.00W.md` for the authoritative work queue (~103 enumerated items + 16 gated).
> 4. Read `docs/adr/README.md` + the 6 ADRs (ADR-0001 through ADR-0006) — these are ratified governance.
>
> **Then immediately diagnose MCP loading**: list every tool available to you in this session, and report whether any `mcp_*` prefixed tools are present. If none, proceed using CLI fallbacks per § 2 of the continuation prompt — `gh`, `vercel`, `supabase`, `stripe` are all installed and authenticated.
>
> **Objective**: Ship all 6 BSuite apps (`business-suite-unified`, `crm7`, `conduit`, `braden`, `R80.3`, `throughput`) + parent repo to green-and-ready-to-merge state on their `development → main`/`master` PRs, **stopping short of the final merge** so the user can visually smoke-test Vercel preview deploys before merging themselves. The parent repo's previous docs PR #323 has already merged into `development` — that's done. The work in this session is the 6 app submodules + any new parent-level commits.
>
> **Governance constraints** (from ratified ADRs):
> - Zero deferred fixes. If you identify an issue, fix it in the same PR.
> - No `workspace:*` or `file:../packages/*` for `@bsuite/*` deps — always pinned npm versions (see AGENTS.md § Shared Packages).
> - Branch protection on `development` requires PR (cannot direct-push).
> - **Never** regenerate `pnpm-lock.yaml` from inside the bsuite tree (see AGENTS.md § pnpm Lockfile Generation — there's a specific isolated-dir procedure that is mandatory).
>
> **Ratified user decisions** (carry forward from Phase 0):
> - RAMS seed-data: user owns
> - Operator-tier: parallel checklist
> - P1.J deadline fence: auto-interrupt
> - All 6 ADRs accepted
> - All 3 optional refinements accepted
>
> Begin with § 1 (inventory dirty state across all 6 submodules + parent) before making any changes.

---

*(End of paste-verbatim block. The rest of this document is reference material the resuming agent will read when instructed above.)*

---

## § 1 — Current state snapshot (as of 2026-05-01 end of session)

### § 1.1 Parent repo (`/home/braden/Desktop/Dev/bsuite`)

- **Branch**: `development`
- **Latest commit**: `85fff47` — "docs(bsuite): Phase 0 ratification — 6 ADRs + merged backlog + 4 audits + completion report (P0-15 rollup) (#323)"
- **PR #323**: ✅ **MERGED** via squash-merge on 2026-04-29 (branch `docs/phase0-ratification-20260501` deleted)
- **Working tree**: Clean (last session verified with `git status`)
- **Phase 0 artefacts now on `development`**:
  - `docs/adr/ADR-0001-page-builder-ownership.md` → CRM7 `custom_pages` canonical; BSU `tenant_page_layouts` deleted atomically
  - `docs/adr/ADR-0002-schema-builder-ownership.md` → CRM7 owns schema-builder
  - `docs/adr/ADR-0003-consumer-renderer-pattern.md` → per-app components, no shared npm package
  - `docs/adr/ADR-0004-oauth-allowlist-doctrine.md` → AGENTS.md is SSoT for Supabase redirect-URI allow-list
  - `docs/adr/ADR-0005-rams-funding-authoring.md` → CRM7 Developer Portal owns `rams_funding_matrix`
  - `docs/adr/ADR-0006-contact-propagation-doctrine.md` → owning-app writes, consumers read
  - `docs/adr/README.md` → ADR index
  - `docs/20260501-merged-execution-backlog-v1.00W.md` → **sole authoritative execution queue**
  - `docs/20260501-cookie-sso-audit-v1.00W.md`
  - `docs/20260501-deprecation-audit-v1.00W.md`
  - `docs/20260501-docs-reconciliation-classification-v1.00W.md`
  - `docs/20260501-one-shot-field-audit-v1.00W.md`
  - `docs/20260501-phase-0-completion-report-v1.00W.md`
  - `docs/20260501-ws-e-client-host-unification-audit-v1.00W.md`
- **Master roadmap**: `docs/20260227-bsuite-master-roadmap-v5.00W.md` bumped from v5.02W → v5.03W (P0-15 rollup: 26a/26e/26f/26g struck; AUD-15/AUD-16 marked Done; active-execution-queue citation added)

### § 1.2 Submodule pointers (from parent `.gitmodules` — verify with `git submodule status`)

| Submodule | Path | Default branch | Package manager | Deployment | Key notes |
|---|---|---|---|---|---|
| `business-suite-unified` (BSU) | `business-suite-unified/` | `main` (verified 2026-05-01 via `gh repo view`) | pnpm | Vercel | Was on **unrelated feature branch** last session with in-progress dirty state |
| `crm7` | `crm7/` | `main` | pnpm | Vercel | Canonical AI SDK reference |
| `conduit` | `conduit/` | `main` | pnpm | Vercel | Only Next.js app; uses `@supabase/ssr` |
| `braden` | `braden/` | `main` | pnpm | Vercel/Railway | Corporate brand (different TLD, uses BS OAuth 2.1 not cookie SSO) |
| `R80.3` | `R80.3/` | `main` | pnpm | Vercel | Wage calculator; Fair Work API |
| `throughput` | `throughput/` | `main` | **npm** ⚠️ (NOT pnpm) | Vercel | Divergent from rest of suite — `package-lock.json` not `pnpm-lock.yaml` |
| `mobile` | `mobile/` | `main` | pnpm | Expo | Likely out-of-scope for this ship; verify before touching |

### § 1.3 Environment / auth state (confirmed this session)

| Tool | Status | Location |
|---|---|---|
| `gh` CLI | ✅ Authenticated (confirmed last session via `gh auth status`) | `/usr/bin/gh` or similar |
| `vercel` CLI | ✅ v50.32.3, authenticated as `garyocean428` | `/home/braden/.npm-global/bin/vercel` |
| `supabase` CLI | Presumed installed — verify with `which supabase` |
| `VERCEL_TOKEN` (env) | ❌ Not exported in shell | Value exists at `business-suite-unified/.env.local:32` |
| `SUPABASE_ACCESS_TOKEN` (env) | ✅ Exported (len=21) | — |
| `STRIPE_SECRET_KEY` (env) | ✅ Exported (len=17) | — |
| Codebuff | v1.0.644 at `~/.npm-global/bin/codebuff` |
| Node | v25.2.1, npx v11.7.0 |

### § 1.4 MCP config state

- **Config file**: `/home/braden/.agents/mcp.json` — rewritten 2026-05-01 for Codebuff 1.0.644 schema compliance
- **Backup**: `/home/braden/.agents/mcp.json.bak-20260429-095519`
- **Servers configured**: 15 (alphabetical) — `ag-mcp`, `context7`, `filesystem`, `google-developer-knowledge`, `memory`, `next-devtools`, `perplexity-ask`, `playwright`, `puppeteer`, `shadcn`, `stripe`, `supabase`, `tavily`, `twentyfirst-magic`, `vercel`
- **Vercel MCP**: `type: http` + `url: https://mcp.vercel.com` + `Authorization: Bearer <VERCEL_TOKEN>` header added using value from `business-suite-unified/.env.local`
- **Known issue**: 2 previous restarts (including full computer restart) did NOT result in MCP tools being exposed in the Codebuff session's tool schema. Root cause unknown — Codebuff 1.0.644 provides no MCP diagnostics. **Assume MCPs may still not load in the new session; verify first, then use CLI fallbacks if needed (§ 2).**

---

## § 2 — Defensive failure modes + remediation paths

### § 2.1 Failure mode: MCP tools still don't load in new session

**Symptom**: You run the first message and the assistant reports zero `mcp_*` tools in its schema.

**Remediation**: Proceed with CLI fallbacks. Every MCP capability has a CLI equivalent for the ship-all-apps workflow:

| Intended MCP | CLI fallback command | Capability |
|---|---|---|
| `mcp_vercel_list_deployments` | `vercel ls --token=$VERCEL_TOKEN` or `vercel ls` (uses stored auth) | List deployments |
| `mcp_vercel_inspect` | `vercel inspect <url>` | Deployment details |
| `mcp_vercel_logs` | `vercel logs <url>` | Tail deployment logs |
| `mcp_supabase_execute_sql` | `supabase db execute` or direct `psql` via conn string | Run SQL |
| `mcp_supabase_list_migrations` | `supabase migration list --project-ref tuybltdrdefjblnplpqo` | Migration state |
| `mcp_github_*` | `gh pr create/view/merge`, `gh api`, `gh run view` | Full GitHub API |
| `mcp_stripe_*` | `stripe` CLI or `curl` against Stripe REST API | Stripe ops (unlikely needed for ship) |
| `mcp_playwright_*` | `browser-use` Codebuff agent (Chrome already installed) | Smoke tests |

**Do not waste time retrying restarts**. If MCPs aren't in the schema after the first diagnostic, accept the fallback path and ship via CLIs — functionally equivalent.

### § 2.2 Failure mode: BSU submodule has dirty/unrelated work

**Symptom**: `cd business-suite-unified && git status` shows modified/untracked files, or `git branch --show-current` returns a feature branch name (not `main`), or `git diff --submodule=log` from parent shows unexpected pointer drift.

**Remediation**:
1. **DO NOT blindly commit or switch branches** — the in-progress work may be intentional (multiple agents coordinating)
2. `cd business-suite-unified && git status && git log --oneline -10 && git stash list`
3. Report findings to user with `ask_user` — options:
   - **Option A**: User finishes in-progress work manually, then we ship
   - **Option B**: User instructs us to stash/checkout-main and ship only from `main` head
   - **Option C**: Skip BSU this round, ship the other 5 apps
4. **Never** force-push, hard-reset, or discard BSU work without explicit user approval
5. BSU's default branch is `main` (verified 2026-05-01 via `gh repo view GaryOcean428/business-suite-unified`). Use `gh pr create --base main --head development` like every other submodule. Earlier draft of this doc claimed `master`; that was wrong — BSU has only `development` and `main` on `origin`.

### § 2.3 Failure mode: pnpm lockfile regen pollutes with workspace-relative paths

**Symptom**: Vercel deploy fails with `ERR_PNPM_OUTDATED_LOCKFILE` or similar, showing `..` or `../packages/*` as importers in the lockfile.

**Root cause**: Running `pnpm install` from inside the bsuite tree causes the parent `pnpm-workspace.yaml` to inject workspace-relative paths into the submodule's lockfile. Vercel clones only the individual submodule repo — `..` paths don't exist there.

**Remediation** (mandatory procedure — **do not skip**):

```bash
# For ANY submodule needing a lockfile regen (example: crm7)
mkdir ~/crm7_lockgen
cp crm7/package.json ~/crm7_lockgen/
cd ~/crm7_lockgen && pnpm install
cp ~/crm7_lockgen/pnpm-lock.yaml crm7/pnpm-lock.yaml
rm -rf ~/crm7_lockgen
# Verify: grep -c '^\.\.' crm7/pnpm-lock.yaml → should be 0 (only `.:` importer)
```

If you find yourself wanting to run `pnpm install` from inside any submodule directory, **stop and use the isolated-dir procedure above instead**. This is non-negotiable per AGENTS.md.

### § 2.4 Failure mode: Branch protection rejects push

**Symptom**: `git push origin development` returns `! [remote rejected] development -> development (protected branch hook declined)`.

**Remediation**: Expected behavior. Always go via PR:

```bash
git checkout -b <type>/<scope>-<short-desc>-$(date +%Y%m%d)
git push -u origin <branch-name>
gh pr create --base development --title '...' --body '...'
```

Then after merge, reset local `development` to match origin:

```bash
git checkout development && git reset --hard origin/development
```

**For BSU specifically**: default branch is `main` (verified 2026-05-01 via `gh repo view`). Use `--base main`. The earlier claim in this doc that BSU defaults to `master` was wrong.

**Verify each submodule's default branch** before opening PRs:
```bash
gh repo view GaryOcean428/<submodule-repo-name> --json defaultBranchRef -q .defaultBranchRef.name
```

### § 2.5 Failure mode: Throughput npm/pnpm divergence

**Symptom**: Running `pnpm install` in `throughput/` creates a `pnpm-lock.yaml` alongside the existing `package-lock.json`, or Vercel build fails because it expects one or the other.

**Remediation**:
1. Throughput ships with **npm** (`package-lock.json`), not pnpm — divergent from rest of suite
2. Use `npm install` and `npm run <script>` in `throughput/` — never pnpm
3. Don't let the isolated-dir lockfile procedure from § 2.3 be applied here — that's pnpm-specific
4. If Vercel build is failing, check `throughput/vercel.json` install command — should be `npm install`, not `pnpm install`
5. **Do not "fix" the divergence** this session — that's a separate consolidation workstream (tracked in master roadmap)

### § 2.6 Failure mode: Submodule pointer bump entangles unrelated work

**Symptom**: Committing at parent level with `git add <submodule>` picks up a pointer bump you didn't intend.

**Remediation**:
1. Before any parent-level commit, run `git diff --submodule=log` to see which pointers would move
2. Stage submodule pointer bumps **explicitly** — `git add business-suite-unified` only if you intend to bump BSU's parent-tracked SHA
3. If you see a pointer bump to a feature branch tip (not the submodule's default-branch head), **do not commit it** — that entangles unmerged work
4. Pattern: open PR inside the submodule → wait for merge → then bump parent pointer to post-merge SHA
5. **One exception**: `chore: align submodule refs to development heads` commits (see parent repo history) are an allowed batch-bump pattern, but only to default-branch HEADs

### § 2.7 Failure mode: Vercel preview build fails

**Symptom**: `vercel inspect <preview-url>` or GitHub PR check shows a build failure.

**Remediation sequence**:
1. `vercel logs <preview-url>` — read the actual error
2. Common errors:
   - **Lockfile mismatch** → § 2.3 isolated-dir regen
   - **Missing env var** → check `vercel env ls` for the project, compare to `.env.example`
   - **Node version** → verify `.node-version` in repo matches `engines.node` in `package.json` (both should be `24` per AGENTS.md)
   - **Typecheck / lint** → run `pnpm typecheck && pnpm lint` locally first; fix; push fix commit
3. Iterate: push fix → watch `gh pr checks <pr-number> --watch` → re-inspect Vercel preview
4. Do not mark PR ready-to-merge until **every** check is green AND Vercel preview renders correctly

### § 2.8 Failure mode: Visual smoke test reveals UI regression

**Symptom**: Preview deploy builds cleanly but the page looks broken (z-index wrong, sidebar overlaps, sticky banner covered, etc.).

**Remediation**:
1. This is **expected** territory — the 3-Prompt DOM Autopsy system in AGENTS.md § Frontend Layout & Z-Index Standards is mandatory reading before any layout fix
2. Run Prompt 1 (DOM Autopsy) before proposing any z-index change
3. Check the z-index reference table and bounded-shell pattern (AGENTS.md) for invariants
4. The user specifically wants to do visual smoke tests themselves — **do not declare ship-all-apps complete** until the user signals "smoke tests passed"

### § 2.9 Failure mode: OAuth-provider regression (suite-wide invariant)

**Symptom**: Someone adds a GitHub button to an auth form, or removes the Microsoft/Azure button.

**Remediation**:
- Per AGENTS.md § Mandatory OAuth Providers — **Google + Microsoft ONLY, in that order**
- GitHub is intentionally removed from the Supabase platform and all UIs — never re-add
- If you see a PR description or recent commit touching `AuthForm.tsx`, `LoginModal.tsx`, or `SignupModal.tsx`, verify the provider list is unchanged
- This is a blocking issue — file it as a review comment, do not merge

### § 2.10 Failure mode: Ratification decisions get re-litigated

**Symptom**: During implementation you find yourself tempted to "just in case" add a fallback that contradicts a ratified ADR.

**Remediation**:
- Ratified ADRs are immutable without a new ADR that explicitly supersedes them
- If you believe an ADR is wrong, **stop and file a new ADR proposal** via the user with `ask_user` — never quietly contradict
- Specifically: no `@deprecated` stubs left behind, no "TODO: swap later" comments, atomic replacement only (per ADR doctrine)

---

## § 3 — Ship-all-apps workflow (execution plan)

### § 3.1 Phase A — Inventory (no side effects)

For each of `parent repo`, `business-suite-unified`, `crm7`, `conduit`, `braden`, `R80.3`, `throughput`:

```bash
cd <path>
echo "=== $(pwd) ==="
git branch --show-current
git status --short
git log --oneline origin/<default-branch>..HEAD 2>/dev/null | head
git log --oneline HEAD..origin/<default-branch> 2>/dev/null | head
```

Report findings to user. Ask permission before acting on any dirty state.

### § 3.2 Phase B — Per-app ship cycle

For each app (skip if dirty state requires user input):

1. **Stage & commit** any intentional dirty changes with conventional-commit message
2. **Push** to `development` (or whatever the working branch is) — if blocked by branch protection, create a feature branch + PR per § 2.4
3. **Open PR** from `development → main` (or `master` for BSU) with body citing:
   - The merged execution backlog item(s) this PR addresses
   - Any ADR it implements
   - Verification steps taken (typecheck, test, lint results)
4. **Monitor CI**: `gh pr checks <pr-number> --watch` until all green
5. **Monitor Vercel preview**: `vercel ls | head -5` to find the preview URL → `vercel inspect <url>` or `browser-use` agent to visually verify
6. **Address bot comments**: if GitHub bot review comments appear (CodeRabbit, Coderabbit, Copilot, etc.), evaluate each per § 2.10 — fix real issues, explicitly reject performative ones
7. **Report ready-to-merge state** to user with PR URL + preview URL + "ready for your visual smoke test" — **STOP HERE**

### § 3.3 Phase C — Parent repo pointer bumps (only if submodules merged)

If any submodule PR gets merged during this session:

1. `cd <submodule> && git checkout <default-branch> && git pull`
2. `cd <parent> && git add <submodule>`
3. Commit: `chore(bsuite): bump <submodule> pointer to post-<brief> SHA`
4. PR from parent `development → development` via feature branch per § 2.4

**Do not** bump pointers to unmerged submodule branch tips.

### § 3.4 Phase D — Stop short of final merge

After all apps are in ready-to-merge state with green CI + working Vercel previews:

1. Produce a summary table for the user: per-app PR URL, preview URL, green-check status, any remaining bot comments
2. Write to memory API (per AGENTS.md § Persistent Memory Protocol):

```bash
curl -X PUT https://qig-memory-api.vercel.app/api/memory/bsuite_session_<YYYYMMDD>_ship_ready \
  -H 'Content-Type: application/json' \
  -d '{"category":"session_summary","content":"[ship-all-apps ready for user smoke test. PRs: ...]","updated":"<ISO>"}'
```

3. **Explicitly announce**: "All apps ready for your visual smoke test. I will not merge `development → main`/`master` until you confirm."
4. Suggest follow-ups for after user approval:
   - Merge all in sequence
   - Tag release
   - Update master roadmap with post-merge state

---

## § 4 — Reference: ADR summary (do not re-litigate)

| ADR | Decision | Implementation trigger |
|---|---|---|
| **0001** Page-builder | CRM7 `custom_pages` canonical; BSU `tenant_page_layouts` deleted atomically | Migration `supabase/migrations/20260502000000_drop_tenant_page_layouts.sql` |
| **0002** Schema-builder | CRM7 owns ERD + `tenant_field_definitions` unified under `schema-builder/` | Consumer apps read-only via Supabase |
| **0003** Consumer-renderer | Per-app components, no shared npm package | Each app implements its own renderer against the shared schema |
| **0004** OAuth allow-list | AGENTS.md is SSoT | Any redirect-URI change updates AGENTS.md first, Supabase allow-list second |
| **0005** RAMS funding | CRM7 Developer Portal owns `rams_funding_matrix` authoring | Consumer apps read-only |
| **0006** Contact propagation | Owning-app writes, consumers read | No local mirror tables; Supabase RLS enforces |

## § 5 — Reference: Merged execution backlog structure

`docs/20260501-merged-execution-backlog-v1.00W.md` contains:

- **P0-1 … P0-14** — status band (shipped Phase 0 items with commit citations)
- **P0-15** — this ratification rollup (P1.J dual-path removed; 26a/26e/26f/26g struck; AUD-15/AUD-16 Done)
- **P1-1 … P1-17** — Phase 1 code + docs items (implementation queue)
- **P1-12** BSU auth safety-net (already implemented per last-session code read; verify no regression)
- **P1-12b** useBranding anon-path fallback (BSU + CRM7)
- **P1-12c** Cookie SSO UX polish (BSU AuthBootLoader)
- **P1-14** BSU `user_tenants→profiles` FK embed 400 (primary), R80.3 verification pass — **path-corrected from earlier draft**
- **P1-15** BSU Developer portal route fix
- **P2-1 … P2-26** — Phase 2 fan-out
- **WS-B / WS-C / WS-D** — cross-workstream checkpoints
- **WS-E.1** client-host unification
- **WS-E.5** one-shot field audit

**All gated items** (16) are explicitly listed with their gating criterion — do not touch without user approval.

## § 6 — Reference: Per-app OAuth/domain/Vercel facts

| App | Domain | OAuth role | Client ID | Vercel project slug (likely) |
|---|---|---|---|---|
| BSU | `suite.crm7.app` | **OAuth server** + native auth | N/A (is the server) | `business-suite-unified` |
| CRM7 | `crm.crm7.app` | OAuth client + native auth | `30f76744-3e0b-40bf-abb8-8c587389802e` | `crm7` |
| Conduit | `conduit.crm7.app` | Supabase SSR native auth only | N/A | `conduit` |
| Braden | `www.braden.com.au` | OAuth client (different TLD, no cookie SSO) | `dcb7af18-254a-4946-b94d-5c606b01fc3f` | `braden` |
| R80.3 | `r8.crm7.app` | OAuth client + cookie SSO | `5d804d20-cd1b-4724-9107-86d2a9e51e09` | `r803` or `r80-3` |
| Throughput | `ideas.crm7.app` | OAuth client + cookie SSO | `35f0db49-ef62-4115-baba-7b961f034cc3` | `throughput` |

**Verify Vercel project names** with `vercel projects ls --token=$VERCEL_TOKEN` before assuming slugs.

---

## § 7 — Revision log

- **2026-05-01** (v1.00W): Initial creation. Defensive-paranoid handoff with 10 failure modes, full CLI fallback matrix, paste-verbatim first-message block, and complete per-app reference table.

---

## § 8 — Related documents

- `docs/20260501-phase-0-completion-report-v1.00W.md` — Phase 0 ratification context
- `docs/20260501-merged-execution-backlog-v1.00W.md` — sole authoritative execution queue
- `docs/adr/README.md` + ADR-0001 through ADR-0006
- `docs/20260227-bsuite-master-roadmap-v5.00W.md` (v5.03W) — active roadmap with P0-15 rollup
- `AGENTS.md` (project root) — suite-wide agent & developer guide
- `MEMORY_PROTOCOL.md` (project root) — persistent memory API usage
- `docs/20260425-bsuite-finish-line-roadmap-v1.00W.md` — prior finish-line roadmap (superseded but informative)
