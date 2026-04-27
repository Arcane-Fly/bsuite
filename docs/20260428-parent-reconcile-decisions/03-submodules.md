# Domain 3 — Submodule Pointers reconcile

**Status:** F (Frozen)
**Date:** 2026-04-28
**Workstream:** WS-ε (parent monorepo dev↔main reconcile)

## Files (6 submodule entries in tree)

`R80.3`, `braden`, `business-suite-unified`, `conduit`, `crm7`, `throughput`.

## Decision rule

After Domains 1+2+4+5 settle, bump pointers to each submodule's current `origin/main` HEAD. Conduit and CRM7 just advanced via WS-α (PR #122) and WS-δ (PR #319) — those new mains MUST be picked up here.

## Per-submodule decisions

| Submodule | Dev pointer (was) | Decision | New pointer | Source |
|---|---|---|---|---|
| **R80.3** | `9cf3408` | Keep | `9cf3408` | Already at `origin/main` HEAD. No change. |
| **braden** | `a3be923` | Keep | `a3be923` | Already at `origin/main` HEAD. No change. |
| **business-suite-unified** | `23a4627` | Keep | `23a4627` | Already at `origin/main` HEAD. No change. |
| **conduit** | `8c253ba` | **BUMP** | `ce6dd903` | WS-α PR #122 — "release(conduit): BSU OAuth 2.1 client + gitleaks allowlist (WS-α)" |
| **crm7** | `c363071` | **BUMP** | `4f6ba154` | WS-δ PR #319 — "release: 2026-04-28 CRM7 dev→main (post-WS-δ reconcile)" |
| **throughput** | `bc1f120` | Keep | `bc1f120` | Already at `origin/main` HEAD. No change. |

## Action

```bash
git update-index --cacheinfo 160000,ce6dd9034bee6fbf639895611b809fd93c51ad6d,conduit
git update-index --cacheinfo 160000,4f6ba1540359ead867606ab03c07f1e503b0dad9,crm7
```

(Used `update-index` rather than `git submodule update` because the submodule worktrees are not initialized in the agent worktree — only the parent worktree at `/home/braden/Desktop/Dev/bsuite/` has them initialized. The cacheinfo update writes the same gitlink entry into the parent's tree.)

## Verification

- `git ls-files --stage conduit crm7` → both 160000 mode entries match the chosen new pointers.
- Submodule pointer is just a tree gitlink — no physical checkout needed for the parent commit to be valid.
- `git submodule status` will show `+` markers when the parent worktree's local clones don't match — this is expected and resolved when the parent worktree syncs after merge to main.

## Note on origin/main parent pointers

The parent monorepo's `origin/main` has OLDER pointers for all six submodules (e.g., crm7=`8e6dd65`, conduit=`b2cf881`). Those reflect an older PR #268 merge state that pre-dates the WS-α/β/γ/δ session. The integration branch (= dev base) already had newer pointers for R80.3/braden/BSU/throughput, and we've now caught conduit + crm7 up to their freshest `origin/main` HEADs. After this reconcile PR merges into `development` and then to parent `main`, parent main will adopt all 6 fresh pointers in one shot.
