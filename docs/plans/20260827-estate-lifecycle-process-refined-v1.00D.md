---
kind: plan
authority: engineering
owner: bsuite
evidence:
  - scripts/bsuite-notes-cycle.mjs
  - scripts/estate-align.mjs
---

# Refined prompt — the BSuite estate lifecycle (intake → archive)

**Tier: HEAVY** · 6 workstreams · destructive stakes (archive deletes from the codebase)
**Produced by `plan-prompt-enhancer`, 2026-08-27. Grounded in measurement, not assumption.**

## How this is checked

This plan is not self-attesting. The reconciliation step it describes is enforced
mechanically, and these are the artefacts that would fail if the loop skipped a step:

| artefact | what it proves |
|---|---|
| `.github/workflows/estate-alignment.yml` | runs the reconciler on every PR touching a register or `docs/00-roadmap/`, and nightly on `development` |
| `check-doc-naming.mjs` | every document this loop produces carries a declared family |
| `check-doc-classification.mjs` | every document declares kind, authority and evidence |
| `audit-doc-completion.mjs` | no document produced here can claim completion while citing nothing runnable |

The reconciler itself (`scripts/estate-align.mjs --strict`) resolves code anchors,
requires a well-formed `dod_status`, requires an APPROVE to carry evidence, and
requires every operator ask to map to a feature row.

## Intent

Braden captures defects progressively in a Google Doc, downloads it to `~/Downloads` as
`bsuite notes.docx`, `bsuite notes (2).docx` … and expects that saying *"bsuite notes"* triggers a
complete, repeatable cycle: capture it durably, work out what is genuinely new, reconcile that
against every place the estate tracks work, act on GitHub, and then keep the workspace clean —
consolidating duplicates and archiving only what is provably finished. He is not asking for a
document. He is asking for a **loop that cannot silently skip a step**.

## Decomposition

| # | Workstream | Depends on |
|---|---|---|
| W1 | **Durable capture** — `~/Downloads` is cleaned out regularly; the notes must survive it | — |
| W2 | **Delta detection** — newest export vs what is already registered | W1 |
| W3 | **Reconciliation** — register ↔ feature index ↔ journey gaps ↔ qig-memory ↔ GitHub issues (7 repos) | W2 |
| W4 | **Workspace hygiene** — gitignore, untracked clutter, duplicate registers | independent |
| W5 | **Lifecycle** — track · update · review · clean · consolidate | W3, W4 |
| W6 | **Archive** — move to `archived-repos-docs`, ONLY on DoD proof or genuine supersession | W5 |

## Measured facts the design must satisfy (not assumptions)

**Intake**
- `bsuite notes (6).docx` = the registered document **+ 10 paragraphs**, **0 removed**. Set
  difference on extracted paragraphs is the correct delta operator; re-deriving the whole
  register is not. Those 10 paragraphs held **36 untracked asks** → D-104…D-139.
- The `.docx` files are 24–37 MB each and there are **7 of them** in `~/Downloads` (≈200 MB).
  Committing the binaries is not viable; committing the **extracted text** is.
- 91 embedded images per export — operator screenshots, which are evidence for individual asks.

**Reconciliation targets**
- `docs/00-roadmap/bsuite-feature-index.json` — 659 features, **`dod_status: not-evaluated` on
  every one**, 0 APPROVEs.
- Operator-notes register — D-1…D-139, **no status column** (deliberately: status lives on the
  feature rows).
- `journey-gap-register.json` — 4 journey gaps, 3 config-without-editor, 1 bulk gap, 1 seam gap.
  These are asks with **no surface at all** and must never be forced into the feature index.
- **65 of 139 asks map to no index row.**
- qig-memory MCP, `bsuite_` prefix — session summaries, pending actions, frozen facts.
- 7 GitHub repos: bsuite, crm7, business-suite-unified, conduit, braden, throughput, R80.4.

**Workspace, measured**
- Parent: 1303 tracked files / 23.3 MB. PNGs are the largest class at **7.36 MB / 67 files** —
  but 56 of those are `docs/nav/screenshot-*.png` and they **are referenced** by three live docs,
  so they are evidence, not litter. *Do not delete them.*
- **61 untracked files**, including `output/xfer/live-docs.tgz` and `.agent-drive/xfer/live-docs.tgz`
  — **4.15 MB each and byte-identical**; likewise `bsuite-feature-docmap.json` (1.32 MB, identical).
- `.gitignore` covers **none** of `.vg-tmp/`, `*.tsv`, `*.tgz`, `audit-out-*`.
- **THE DUPLICATE THAT PROVES THE POINT:** `docs/00-roadmap/bsuite-feature-index.json` and
  `docs/20260826-bsuite-feature-index-v1.00W.json` hold the same 659 ids but **differ on 16 rows**,
  and the differing field is `compliance_risk` **severity** — `high` in one, `medium` in the other,
  for an unscoped-RLS-write finding on `whs_records`. Both written in the same millisecond, so
  mtime cannot adjudicate. **Two registers disagreeing about how dangerous a security hole is.**
  `dod-enforcement-prompt.md` exists twice, byte-identical.

**Archive**
- `/home/braden/Desktop/Dev/archived-repos-docs` — **6.6 GB, NOT a git repository.**
- Git history *does* retain deleted files (verified). So archiving is content-safe: the bytes
  survive in `git log` even after the working tree shrinks. The archive is for *retrieval
  convenience*, not preservation — that distinction changes what the archive must guarantee.

## Blindspots to counter (this model, this task)

1. **Building a document instead of a mechanism.** The estate already has ~6 documents partially
   answering "what is outstanding". A seventh is the failure mode, not the deliverable. *Counter:*
   every step must be a script or a CI check; prose only where judgment is genuinely required.
2. **A status column nobody writes to.** Already an explicit estate rule, already breached once.
   *Counter:* status lives on the feature row, written by the gate, reconciled by `estate-align`.
3. **Deleting evidence as "clutter".** The 56 nav PNGs look like bloat and are cited by three
   documents. *Counter:* nothing is removed without a reference check first.
4. **Trusting mtime or filename recency to pick a winner between duplicates.** Just measured:
   identical to the millisecond, and the dated filename is *not* the newer content. *Counter:*
   adjudicate duplicates by **content diff + provenance**, never by name or timestamp.
5. **Archiving on "looks finished".** The operator's constraint is DoD proof or genuine
   supersession. *Counter:* the archive script must refuse without a `dod_status: approved`
   pointer or a named superseding artifact.
6. **Silent skipping.** A loop with six steps and no ledger will quietly do four. *Counter:* the
   run emits a receipt naming every step, with counts, including the ones that found nothing —
   "checked nothing" must be distinguishable from "found nothing".
7. **Cross-lane collision.** Several agents share this checkout and two submodules are on other
   lanes' branches right now. *Counter:* the cycle works in its own worktree and never switches a
   shared checkout's branch.

## Skills & MCPs to use

| Use | For |
|---|---|
| `agent-mem-comms` | qig-memory read/write (`bsuite_` prefix) + broadcasting the cycle's receipt to lanes |
| `agent-definition-of-done` | the archive precondition — `dod_status: approved` with evidence |
| `bsuite-fix-the-class-not-the-page` | mapping an ask to a *class* of surfaces, not the named URL |
| `general-iso27001-docs` | the `YYYYMMDD-name-vN.NNS.md` naming + status-marker discipline |
| `check-codebase-cleanup` / `check-dead-duplicate-code` | the clean + consolidate phases |
| `git-github-issues` / `git-github-issue-closeout` | issue create/update/close across 7 repos |
| `data-docx` | paragraph + image extraction from each export |
| `plan-brainstorming` → `plan-writing` | downstream of this refined prompt |
| GitHub MCP / `gh` | issue and PR operations |
| qig-memory MCP | `memory_list`/`memory_put` for tracking state and the inbox |

*No external best-practice research was fetched: this is process design over a measured private
estate, and Context7/Tavily have nothing authoritative to say about it. Saying so beats a
fabricated citation.*

## The refined prompt

> Build **one command** — `bsuite-notes-cycle` — that runs the estate's intake-to-archive loop and
> emits a receipt. It must be a script plus CI, not a document, and it must be safe to run
> concurrently with other agent lanes.
>
> **1 · CAPTURE (durable).** Take the newest `~/Downloads/bsuite notes*.docx`, extract paragraphs
> and images, and commit the **extracted text** (never the 24–37 MB binary) to a
> content-addressed intake store under `docs/intake/`, stamped with the export's mtime and a hash.
> `~/Downloads` is volatile; after this step the notes survive its cleaning. Images land in the
> archive root, referenced by hash, not committed.
>
> **2 · DELTA.** Set-difference the paragraph set against the previously captured export. Report
> `+N new, −M removed`. Removed paragraphs are a **finding** (the operator does not usually delete
> asks) and must be surfaced, never silently dropped. Register only the delta as new D-numbers.
>
> **3 · RECONCILE, five ways, each reporting a count including zero.** For every ask: map to
> feature-index rows by route/class; if none, either add the index row or record it as a journey
> gap — those are the only two legal outcomes, and "unmapped" is a hole to close, not a state to
> live in. Cross-check qig-memory `bsuite_` keys for tracking that exists nowhere else. Then
> GitHub across all 7 repos: open an issue for a new ask, update the one that exists, and close
> only where a `dod_status: approved` row proves it. **Filing is not fixing** — the receipt must
> say which of the three happened for each ask.
>
> **4 · HYGIENE.** Extend `.gitignore` to cover `.vg-tmp/`, `*.tsv`, `*.tgz`, `audit-out-*` and the
> `xfer` duplication. Before removing anything, run a reference check — the 56 `docs/nav` PNGs look
> like bloat and are cited by three live documents. Report bytes reclaimed and files kept-with-reason.
>
> **5 · CONSOLIDATE.** Detect registers answering the same question. Adjudicate by **content diff
> and provenance, never by filename or mtime** — the live example is two feature indexes with the
> same 659 ids differing on 16 rows, where the differing field is a security severity (`high` vs
> `medium`) and both files were written in the same millisecond. Merge to one, supersede the other
> **by name** in its header, and reconcile the disagreement explicitly rather than picking a side.
>
> **6 · ARCHIVE, gated.** Move to `/home/braden/Desktop/Dev/archived-repos-docs/<YYYYMMDD>-<reason>/`
> and delete from the codebase. **Refuse unless** the artifact's feature rows carry
> `dod_status: approved` with an evidence pointer, **or** a named superseding artifact is supplied
> and exists. The archive is not a git repo, so write a `MANIFEST.json` per batch recording origin
> path, the commit SHA the content was at, why it was archived, and the proof — because the bytes
> remain recoverable from `git log` regardless, but *why* is only recoverable if written down.
>
> **7 · RECEIPT.** One artifact per run: every phase, its count, what it changed, and what it
> deliberately did not. Broadcast it to the lanes via the qig-memory inbox. A phase that found
> nothing says so; a phase that could not run says that instead of passing.
>
> Work in a dedicated worktree. GPG-sign. `feature → development → main`. Never switch a shared
> checkout's branch. Report VERIFIED / CLAIMED / BLOCKED with measurements, never adjectives.
