# BSuite Plan Dashboard

Static dashboard tracking plan-completion state across the BSuite parent monorepo and its 6 submodules (crm7, conduit, business-suite-unified, R80.3, braden, throughput).

## Live URL

After GitHub Pages is enabled (operator action — see below):

**https://garyocean428.github.io/bsuite/dashboard/**

## Architecture

A single self-contained `index.html` with the dashboard data inlined into a `<script id="dashboard-data" type="application/json">…</script>` block. The same JSON is also kept at `data/dashboard-data.json` so the refresh action can rewrite it independently of the HTML and re-inline it.

No build step. No external runtime dependencies (the page runs entirely from inlined JSON, CSS, and vanilla JS).

```
docs/dashboard/
├── index.html                   # self-contained dashboard (CSS + JS + inlined JSON)
├── data/
│   └── dashboard-data.json      # canonical data source (re-inlined into index.html on refresh)
├── refresh-data.py              # rebuilds dashboard-data.json from live repo state
├── inline-data.sh               # writes dashboard-data.json into index.html's <script id="dashboard-data">
├── .nojekyll                    # prevents GitHub Pages' Jekyll from stripping `_`-prefixed paths
└── README.md
```

## Data sources

`refresh-data.py` rebuilds the JSON from live state by reading:

- **Plan inventory** — every `docs/plans/**/*.md` across the parent + each submodule
- **Docs root sweep** — top-level `docs/*.md` per repo
- **Package versions** — `packages/auth/package.json`, `packages/dry-lint/package.json`, plus consumers' pinned versions
- **Branch alignment** — `git rev-parse origin/main` vs `origin/development` per submodule
- **Open PRs / issues** — `gh pr list` / `gh issue list` per repo (`bsuite` + 6 submodules)
- **Vercel deploy state** — GitHub Deployments API (`gh api repos/.../deployments`) for the production environment
- **Static configuration** — `AUTH_CANONICAL.md`, the universal rulebook, dry-lint rules

The current `dashboard-data.json` was built by hand for the 2026-05-06 audit; the script preserves that schema.

## Refresh cadence

- **Hourly** — scheduled via `.github/workflows/refresh-dashboard-data.yml` (cron `7 * * * *`, offset to avoid runner congestion at the top of the hour)
- **On push** to `main` or `development` when any of these change:
  - `docs/plans/**`
  - `docs/**.md`
  - `AUTH_CANONICAL.md`
  - `packages/auth/package.json`
  - `packages/dry-lint/package.json`
- **On demand** — `workflow_dispatch` from the Actions tab

The refresh job commits any actual diff back to the same branch with a `[skip ci]` marker so it doesn't loop. The deploy job (`deploy-dashboard.yml`) then ships the new `docs/dashboard/` artifact to Pages on the next push to `main`.

## How to regenerate locally

```bash
# 1. Rebuild the JSON
python3 docs/dashboard/refresh-data.py > docs/dashboard/data/dashboard-data.json

# 2. Inline it into the HTML
bash docs/dashboard/inline-data.sh

# 3. Open in a browser
xdg-open docs/dashboard/index.html   # or `open` on macOS
```

The page renders from `file://` — no server required.

## Operator action required to enable Pages

This PR ships the workflow but cannot enable GitHub Pages itself. Before the deploy job will succeed:

1. Go to **Settings → Pages** on the `GaryOcean428/bsuite` repo.
2. Under **Source**, select **GitHub Actions**.
3. Trigger the deploy workflow manually (Actions → "Deploy plan dashboard to GitHub Pages" → Run workflow) or merge any change under `docs/dashboard/**` to `main`.

Until that's done, the workflow run will fail at the `deploy-pages` step with `Get Pages site failed`. That's expected — flip the toggle and re-run.

## Update protocol (FF-DASHBOARD-20260508)

> Relocated verbatim from `AGENTS.md` §10 on 2026-07-31. This is now the canonical copy.

**Live URL**: https://garyocean428.github.io/bsuite/dashboard/
**Source of truth**: `docs/dashboard/data/dashboard-data.json` (in the **bsuite** parent repo) + every `docs/plans/**/*.md` across the parent and all 6 submodules (crm7, conduit, business-suite-unified, R80.3, braden, throughput).
**Refresh script**: `python3 docs/dashboard/refresh-data.py > docs/dashboard/data/dashboard-data.json`
**Inline script**: `bash docs/dashboard/inline-data.sh` (re-inlines JSON into `index.html` for self-contained rendering)

### 10.1. When you MUST update the dashboard

- After **filing or closing an issue** that affects scope (bump `summary.*` counter and add a row under the relevant section)
- After **merging a plan PR** under `docs/plans/**` (run `refresh-data.py` so `plans[]` re-syncs)
- After **landing a feature** previously claimed in the dashboard (move from `in_progress` → `done` with an `evidence_url`)
- After **publishing a new artefact** (XLSX/PDF/MD report) — add a new top-level key with `schema_version: "1.0"`
- **Before declaring a session complete** — verify the dashboard reflects current state. The Anti-Laziness rule (§1) applies: never claim "I'll update the dashboard later".

### 10.2. How to update (v1.1 — branch protection effective 2026-05-08)

> **BREAKING CHANGE 2026-05-08**: `bsuite/development` is branch-protected and requires a PR + passing `gitleaks` check. The previous "commit data-only directly to development" path is BLOCKED. **Every dashboard update — even data-only refreshes — must now go through a PR.**

| Type of change | Action |
|---|---|
| Plan added/edited/removed | Edit the `.md` under `docs/plans/`; run `refresh-data.py` to regenerate `plans[]` |
| Counter change (e.g. issues closed) | Edit `summary.*` directly in `dashboard-data.json` |
| Auto-generated section (`plans`, branch alignment, package versions) | Run `refresh-data.py` — do NOT hand-edit |
| Manual section (`parity_status`, `feature_360_status`, `gto_compliance_catalogue`, `dashboard_update_protocol`) | Edit JSON directly; bump that section's `schema_version` if shape changes |
| New top-level section | Add render code to `docs/dashboard/index.html` AND document the new key in `dashboard_update_protocol.what_to_update` |

After any edit (PR-based workflow — required):

```bash
# 0. Always start from a fresh fast-forward of origin/development
git fetch origin development
git checkout development
git pull --ff-only origin development

# 1. Branch off — even for data-only refreshes
git checkout -b chore/dashboard-<reason>-YYYYMMDD

# 2. (if auto sections changed) refresh
python3 docs/dashboard/refresh-data.py > docs/dashboard/data/dashboard-data.json

# 3. inline JSON into HTML
bash docs/dashboard/inline-data.sh

# 4. verify locally
xdg-open docs/dashboard/index.html   # or `open` on macOS

# 5. commit
git add docs/dashboard/data/dashboard-data.json docs/dashboard/index.html
git commit -m "chore(dashboard): <what changed and why>"

# 6. push + open PR
git push -u origin chore/dashboard-<reason>-YYYYMMDD
gh pr create --base development --title "chore(dashboard): <reason>" --body "<scope>"

# 7. Wait for gitleaks + other checks (typically <2 min)
# 8. Self-merge once green
gh pr merge --admin --squash --delete-branch
```

**No `[skip ci]` shortcut anymore** — gitleaks must run. Bundle dashboard updates with the PR that motivates them when feasible; otherwise file a dedicated `chore(dashboard): <reason>` PR.

For automated 2h sweep refreshes: branch `chore/dashboard-2h-sweep-<TIMESTAMP>`, open PR, self-merge when CI green.

### 10.3. Rules for AI agents (non-negotiable)

1. **No deferral** — update the dashboard in the **same PR/session** as the change that motivated it. "I'll update later" is banned per §1.
2. **Evidence required** — every status change needs a URL (PR / commit / issue) in an `evidence_url` field. No orphan claims.
3. **Schema versioning** — when extending a section, bump its `schema_version` (`1.0` → `1.1` for additive, `2.0` for breaking shape changes).
4. **Truthful counters** — if you cannot verify a count from primary state (issues / PRs / files), use `null` and explain in a `note` field. Never invent counts.
5. **No orphan keys** — every top-level JSON key must be rendered by `index.html` OR documented in `dashboard_update_protocol.what_to_update` as `"data-only, machine-consumable"`.
6. **Don't edit auto sections by hand** — `plans[]` and per-repo branch-alignment fields are regenerated; manual edits will be overwritten.
7. **Don't edit `index.html` directly to change data** — edit the JSON and re-inline. Direct HTML edits are reserved for rendering logic changes.

### 10.4. Common mistakes (banned)

- ❌ **Trying to push directly to `development`** (branch-protected since 2026-05-08T10:56Z, requires PR + gitleaks)
- ❌ Forgetting to fast-forward fetch before branching (multi-agent context — `origin/development` advances every few minutes)
- ❌ Forgetting to run `inline-data.sh` after editing the JSON (Pages stays stale)
- ❌ Editing `index.html` directly to add data (will be overwritten on next inline)
- ❌ Updating counters without filing the underlying issue (claims without evidence)
- ❌ Hand-editing the `plans[]` array (it's auto-generated; edit source `.md` files instead)
- ❌ Filing a dashboard PR before gitleaks check completes (don't `--admin` merge until checks are green)

### 10.5. Verification checklist (before opening PR)

- [ ] Branched off latest `origin/development` (`git pull --ff-only` first)
- [ ] JSON parses cleanly (`python3 -c "import json; json.load(open('docs/dashboard/data/dashboard-data.json'))"`)
- [ ] `index.html` opened in browser — affected section renders without console errors
- [ ] Counter math matches reality (cross-checked against `gh issue list` / `gh pr list`)
- [ ] Every new claim has an `evidence_url`
- [ ] If shape changed, the section's `schema_version` is bumped
- [ ] Commit message follows `chore(dashboard): <reason>` convention
- [ ] PR opened against `development` (NOT default branch)
- [ ] Wait for `gitleaks` + other CI checks to pass before self-merging

### 10.6. What's tracked

The dashboard surfaces (live as of 2026-05-08):

- `summary` — top-line counters
- `repos` — 7-repo status (parent + 6 submodules)
- `plans[]` — every `docs/plans/**/*.md` file across all repos (auto-generated)
- `operator_blockers` — items only the human operator can resolve
- `production_state` — Vercel + auth canonical status
- `gap_report.categories` — OAuth-freeze gap analysis
- `parity_status` — Codehouse parity matrix coverage
- `feature_360_status` — 9-portal coverage doctrine
- `visual_feature_builder` — phase-by-phase status
- `portal_coverage` — per-portal RLS / theme / shadcn checks
- `apprentice_placements_status` — placement queue
- `doc_drift_status` — documentation drift PRs
- **`gto_compliance_catalogue`** (added 2026-05-08) — 50-report coverage, 8 active gaps tracked as `crm7#527`–`#534`
- **`dashboard_update_protocol`** (added 2026-05-08) — this protocol, machine-readable

When you add a new top-level section, append it to this list in §10.6 of every agent doc.

---

---

## Notes

- The inlined JSON is large (~70 KB); the HTML lands around 95 KB total. Acceptable for a static page.
- The dashboard is read-only. Edits to plan state must happen in the source plan files; the next refresh picks them up.
- `.nojekyll` is required even though `docs/dashboard/` has no `_`-prefixed files today — it future-proofs against any partial path Jekyll might decide to strip.
