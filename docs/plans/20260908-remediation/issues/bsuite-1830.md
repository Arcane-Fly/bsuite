# RULING 1.3 — re-validate the archive against code (2,097 BSuite docs; 4,293 are other silos)

https://github.com/GaryOcean428/bsuite/issues/1830

Snapshot updatedAt: 2026-08-31T02:49:19Z. Open at capture; re-read live.

Implements **operator RULING 1.3 (2026-08-08)**.

> *"The archive is not trusted and must be re-validated. A prior task was to validate against the code before archiving. That validation was not performed. Everything under `/home/braden/Desktop/Dev/archived-repos-docs` must be treated as possibly-live until checked. File this as a tracked task: for each archived document, confirm against the code whether it is superseded, unimplemented, or partially implemented, and record the verdict. Do not archive anything further without that check."*

## Measured scope — and it is not 6,390

`/home/braden/Desktop/Dev/archived-repos-docs` holds **6,390 markdown files / 6.6 GB**. Most of it is **not BSuite** and is not ours to verdict (cross-silo boundary).

**IN SCOPE — BSuite, 2,097 docs**

| Docs | Directory | Note |
|---:|---|---|
| 1,147 | `R80.3/` | the superseded calculator — biggest single chunk, ties directly to §2.1 |
| 428 | `20260725-bsuite-cleanup/` | |
| 365 | `business/` | |
| 131 | `archive-repo-docs/` | |
| 25 | `20260727-docs-archive-pass/` | |
| 1 | `2026-04-25-bsuite-finish-line/` | |

**OUT OF SCOPE — 4,293 docs, other silos.** `qig-archive` (1,884), `pantheon-projects` (719), `qig-consciousness-gary-formation-20260723` (398), `likeprojects` (284), `zero` (252), `vex` (202), `monkey2` (134), `qig-con2-archived-2025-12-26` (131), `Gary8-main` (123), `Monkey-One` (74), `glow` (43), `lemur` (37), `qig-tokenizer` (6), `qsearch` (3), `MCP` (2), `TAMS` (1). These belong to `qig_` / `vex_` / `pantheon_` / other silos. **Do not verdict them from a BSuite session** — flag to their owner instead.

## Verdict taxonomy (operator's own three, plus two the work needs)

Per doc, recorded, with file:line evidence from the code:

- **SUPERSEDED** — a later doc or shipped code replaces it. Name the successor.
- **UNIMPLEMENTED** — describes something that was never built. Still a live requirement unless separately killed.
- **PARTIALLY IMPLEMENTED** — some shipped, some not. **Enumerate which parts**, or the verdict is useless.
- **FOREIGN** — not BSuite. Route to the owning silo, do not verdict.
- **JUNK** — no requirement of any kind (third-party READMEs, tool output).

A verdict without file:line evidence against current code is not a verdict.

## Why this is not busywork — two proofs from today

1. **`docs/recovered/` is already contaminated.** A full read of those 33 files found **8 are foreign-project content** (FastMonkey / Monkey1 — Railway env vars, `fastmonkey.au` cookie domains, Monkey1 browser-extension auth research), **2 of which are byte-identical duplicates** of each other, and `README.md` is a **third-party OpenAI Realtime API demo readme**. That directory is currently cited as authoritative by RULING 1.2.

2. **The document-lifecycle implementation plan is an active trap.** `docs/recovered/20260304-crm7-document-lifecycle-implementation-plan-v1.00W.md` specifies **Adobe Acrobat Sign** in full (service code, webhook, `document_signatories`). Adobe Sign was **rejected the same day** (`20260304-document-esign-best-practice-research-v1.00W.md` §9) and replaced by self-hosted signing, shipped 2026-03-17. The implementation plan was never revised. **An agent told to "read the archive and build the spec" would build the rejected vendor.** That is exactly the failure mode RULING 1.3 exists to stop, and it is live right now.

## Order of work
1. `R80.3/` first — 1,147 docs, and §2.1 has just made every "R80.3 is the rate engine" claim in it wrong by definition.
2. `20260725-bsuite-cleanup/` + `20260727-docs-archive-pass/` — these are the passes whose validation was skipped.
3. `business/`, `archive-repo-docs/`, `2026-04-25-bsuite-finish-line/`.

## Standing constraint from the ruling
**Nothing further gets archived without this check.** Archiving is not a filing action; it is an assertion that the content is dead. That assertion now requires evidence.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)
- **Validation loop**: §9.1 output-equivalence
- **Equivalence target**: a verdict register (one row per doc: path, verdict, evidence file:line, successor if superseded), committed and reviewable
- **Cross red-team**: a peer re-checks a random 20 verdicts against code and reports the disagreement rate before flip-to-done
- **Skills to load**: `check-docs-vs-code`, `git-github-issue-closeout`, `check-codebase-comprehensive`
- **Self-report on divergence**: yes (mandatory; do not rationalise gaps)

Implements: RULING 1.3.

