---
kind: record
authority: none
owner: bsuite
---

# Void external code review (Qodo, 2026-08-20): all 8 findings target DeepMind's unrelated `bsuite` RL library — one prompt would delete packages/ and break all 6 apps

https://github.com/GaryOcean428/bsuite/issues/2201

Snapshot updatedAt: 2026-08-20T07:04:29Z. Open at capture; re-read live.

**Disposition: the review is void. Do not action any of its eight prompts. One of them is actively destructive.**

An external review agent (Qodo) produced eight "ready to be used by AI coding agents" prompts against this repo. Every file path it cites is absent from this machine, and the codebase it describes is **DeepMind's `bsuite` — Behaviour Suite for Reinforcement Learning** — a Python RL benchmark that shares only the name. It was matched by name collision and the findings were written as though measured.

Filing this instead of the eight issues it asked for, because injecting fabricated technical debt into a live tracker is the inverse of §10.3's *truthful counters* rule.

---

## The destructive one — read this first

> **PROMPT 6:** *"Remove `packages/*` from pnpm-workspace.yaml. Remove the empty packages directory."*

`packages/` is **not empty. It holds 17 shared packages** — `auth`, `charge-calc`, `data-export`, `data-grid`, `dates`, `design-tokens`, `dry-lint`, `eslint-config`, `schema-builder`, `schema-registry`, `page-builder`, `nav-core`, `ui`, and others. Seven are published to npm and consumed by all six apps.

An obedient agent executing PROMPT 6 deletes the shared-package tree and breaks every app's build. This is the single highest-risk item in the review and it is presented with the same confidence as the rest.

PROMPT 5 is the runner-up: it would stand up a Jest suite alongside the **1,683 existing Vitest tests**, on the stated grounds that "no test infrastructure [is] in place."

## Claim-by-claim, measured

| Review claim | Reality |
| --- | --- |
| `bsuite/bsuite/logging/csv_logging.py` lines 52–61 | **File does not exist.** `find /` → zero hits, machine-wide |
| `bsuite/bsuite/logging/sqlite_logging.py` lines 66–79 | **Does not exist** |
| `bsuite/setup.py` declares Python 3.6/3.7 | **No `setup.py` anywhere in the tree** |
| "`packages/` directory is empty" | **17 packages**, 7 published to npm |
| "placeholder test script that just exits with error" | Root `package.json` has `test:all`, `test:packages`, `lint:all` + 11 custom gates |
| "No test infrastructure in place" | **1,683 tests** across 6 apps + 7 packages (Vitest) |
| 22 TODOs in `baselines/`, `environments/`, `logging/` | **None of those directories exist** |
| "Research the actual bsuite design goals from the paper" | The *paper* is DeepMind's RL benchmark — conclusive tell |

Filenames cited (`csv_logging.py`, `sqlite_logging.py`, `boot_dqn.py`, `actor_critic.py`, `dqn.py`) are DeepMind bsuite's module layout verbatim.

## Adversarial verification (§6 red team)

Two independent lenses, one instructed to **refute** the fabrication finding:

**Skeptic lens — verdict: could not refute.**

- `.gitmodules` registers exactly 6 submodules (`crm7`, `braden`, `business-suite-unified`, `conduit`, `throughput`, `R80.4`). No `bsuite` submodule, no nested `bsuite/bsuite`, no matching symlink or worktree across 30+ worktrees.
- Machine-wide `find` for all five cited filenames → **zero hits**, including `/tmp`, `~/copilot-worktrees`, `.claude/worktrees`, and a full `/` sweep.
- `git log --all --diff-filter=A --name-only -- '*csv_logging.py'` → **empty**. No such file was ever added on any ref.
- `/home/braden/bsuite` is a second clone of *this same* monorepo, not a different project.
- The only genuine DeepMind-bsuite artifact on the machine is an **inert nixpkgs build recipe** (`pkgs/development/python-modules/bsuite/default.nix`, homepage `github.com/deepmind/bsuite`) with **no built output**. A recipe, never materialised — and it could only ever live under `/nix/store/<hash>-…`, never under a Dev path.

**Correctness lens — verdict: could not verify, and said so.** It ran in the cloud sandbox with no bridge to the workstation, found no `/home/braden` at all, and returned `CANNOT VERIFY` on all five claims rather than reporting zero counts as findings. Worth recording: **a probe with no access correctly refused to manufacture a clean result** — the exact failure mode that produced this review in the first place.

## What would have caught it

One check, before any finding is accepted from an external reviewer:

> **Every cited path must resolve. A review that cannot produce a file is not a review.**

Cheap, mechanical, and it would have voided all eight prompts at zero cost. Line numbers and code excerpts are the most trust-inducing thing a review can show and the easiest thing to invent — they should raise the evidentiary bar, not lower it.

## Actions

- [ ] **Do not action prompts 1–8.** No issues to be opened from them.
- [ ] **Add a path-resolution gate** to the external-review intake: cited paths must resolve before a finding is triaged. Owner: bsuite lane.
- [ ] Record in `AGENTS.md` alongside the existing "Separate Project Warning" (which already covers the `monkey-projects` confusion) that **`bsuite` collides with DeepMind's RL library**, so future agents and review tools are warned at the top of the file.
- [ ] No R8 involvement — this is process, not award/rate domain.

## Evidence

- [x] Output-equivalence (§9.1): N/A — no code change
- [x] Visual-equivalence (§9.2): N/A
- [x] Self-report: **One divergence.** Package count read as 17 by the red-team lens and 19 lines by my direct listing (the latter included `.`/`..`); the material claim — *not empty, contains the published shared packages* — is unaffected. Separately, my own first `ls -d packages/*/` returned `0` from the wrong working directory and I re-measured rather than report it; noting it because it is the same instrument error class this issue is about.
- [x] Tests run: `find` (machine-wide, all five filenames), `git log --all --diff-filter=A`, `git submodule status`, `ls packages/`, root `package.json` scripts dump
- [x] Live verify: repo at `Desktop/Dev/bsuite`; second clone at `~/bsuite` checked; nixpkgs recipe located and confirmed unbuilt
