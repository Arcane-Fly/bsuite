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

## Notes

- The inlined JSON is large (~70 KB); the HTML lands around 95 KB total. Acceptable for a static page.
- The dashboard is read-only. Edits to plan state must happen in the source plan files; the next refresh picks them up.
- `.nojekyll` is required even though `docs/dashboard/` has no `_`-prefixed files today — it future-proofs against any partial path Jekyll might decide to strip.
