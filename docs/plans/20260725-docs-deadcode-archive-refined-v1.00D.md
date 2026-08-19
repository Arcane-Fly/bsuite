# BSuite docs-audit + dead-code + archive cleanup — refined prompt

> **Tier:** Heavy (multi-repo docs audit, dead code, destructive archive move)  
> **Silo:** BSuite only — no QIG  
> **Date:** 2026-07-25

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## Intent

(1) Run Headroom learn on bsuite to surface recurring agent failure patterns.  
(2) Deep-dive each submodule’s docs vs codebase: mark IMPLEMENTED / SUBSTANTIVE-MATCH / GAP / STALE-DOC.  
(3) Dead/duplicate code audit: remove only **genuinely** dead/duplicated code; if “dead” is actually unfinished feature, implement from docs.  
(4) Move archive doc bloat to `/home/braden/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup`.  
(5) Use **qwen CLI** with **`qwen3.8-max-preview`** for higher-complexity analysis; mid-tier for mechanical greps.

## Decomposition

| WS | Scope | Model tier | Parallel? |
|----|-------|------------|-----------|
| H | Headroom learn (+ apply useful learnings to bsuite notes if high-signal) | headroom CLI | solo first |
| D1–D6 | Per-repo docs↔code validation (crm7, conduit, BSU, R80.3, braden, throughput) | qwen3.8-max-preview | parallel |
| C | Dead/duplicate code inventory (all apps + packages) | qwen3.8-max-preview | after D or parallel read-only |
| A | Move `docs/archive` trees out of monorepo to cleanup path; leave pointer READMEs | direct Hermes | can parallel with D |
| I | Implement high-priority GAPs from D that are small; close stale docs | per-repo mutation lanes | after D |
| R | Consolidate ledger + promote | Hermes | end |

## Constraints

- STRICTLY BSuite — no QIG.
- **Substantive match = DONE** — alternate implementation that delivers the same user-visible / API contract counts as implemented; do not reimplement for style.
- **Dead code:** must have zero importers (grep + package entrypoints + dynamic strings). If uncertain → GAP + implement, not delete.
- **Archive move:** only `docs/archive/**` and `docs/plans/archive/**` (and known archive-* folders under docs). **Never** move live `docs/*.md`, migrations, or src. Leave `docs/archive/README.md` pointer to external path. Present list before bulk delete from git.
- Branch doctrine: feature from development, `--no-ff` merge, promote `--merge` no squash.
- Artifacts only under bsuite except the **explicit** archive destination above.
- Public manuals = how-tos, not changelogs.
- One mutation lane per repo.

## Blindspots to counter

- **Blindspot:** Treating “not at documented path” as unimplemented. **Counter:** Search symbols/user journeys; mark SUBSTANTIVE-MATCH with evidence.
- **Blindspot:** Deleting “unused” exports still used via dynamic import. **Counter:** ripgrep string name + package exports + route tables.
- **Blindspot:** Archiving live plans. **Counter:** Only paths containing `/archive/`.
- **Blindspot:** Re-opening closed 2026-07-24 work. **Counter:** Read world-class reference + catalogue §8–9 first.
- **Blindspot:** Claude weekly limit. **Counter:** Prefer qwen3.8-max-preview / glm; direct Hermes for mechanical.

## Skills & tools

- subagent-orchestration, prompt-enhancer, verification-before-completion
- qwen CLI: `qwen -m qwen3.8-max-preview -p '...'`
- headroom: `env -u PYTHONPATH headroom learn --project …`
- gh, git, rg

## The refined prompt (executor)

```
STRICTLY BSuite. Work through WS H → D (parallel) → C → A → I (scoped) → R.

1) HEADROOM: env -u PYTHONPATH headroom learn on bsuite; if LLM backend fails, retry --model glm-5.2 or qwen. Summarize failure patterns; write short note to docs/20260725-headroom-learn-notes-v1.00W.md if any signal.

2) DOCS↔CODE AUDIT (6 parallel read-only agents, one per app). For each repo:
   - Sample docs/ and docs/plans/ (non-archive) for features/requirements
   - Grep/code-search implementation
   - Verdict per item: IMPLEMENTED | SUBSTANTIVE-MATCH (how) | GAP | STALE-DOC
   - Output table to docs/audits/20260725-<app>-docs-code-audit-v1.00W.md inside bsuite parent
   - Do NOT mutate app code in audit lanes

3) DEAD/DUPLICATE CODE (1–2 read-only then mutation):
   - Find duplicates (LocalisedDateInput-class, schemaBuilder shims already OK)
   - Find zero-reference files/exports
   - GENUINELY dead → delete with tests green
   - Not dead but incomplete vs docs → implement minimal path
   - Report false-dead candidates without deleting

4) ARCHIVE CLEANUP:
   mkdir -p /home/braden/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup
   For each docs/archive and docs/plans/archive under parent + submodules:
     rsync -a → cleanup path preserving repo prefix
     Replace with README pointer in git
     Commit per repo: "docs: relocate archive tree to archived-repos-docs/20260725-bsuite-cleanup"
   Do not touch non-archive docs.

5) IMPLEMENT: From audit GAPs, only P0/P1 small items (instrument debt #1175/#1158/#1159 class, clear missing wiring). Large features stay ledger-only.

6) FINISH: parent pointer bumps, PR promote doctrine, update recurring-bugs catalogue, silo key bsuite_docs_deadcode_archive_2026-07-25.
```
