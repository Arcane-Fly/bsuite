---
kind: record
authority: none
owner: cowork-coordinator
---

> **POINT-IN-TIME RECORD — 2026-08-24.** This is what one session's prompt-refinement
> pass produced and found, kept verbatim so the reasoning survives. It asserts nothing
> about the estate's current state and cites no gate, because it is not a claim to be
> checked — it is a transcript of a decision. Do not read a status from it; read the
> registers for that.

# Agent Compliance Enforcement — Refined Prompt

**Refined:** 2026-08-24 · **Tier:** Heavy (5 passes) · **Refiner:** cowork-coordinator
**Status:** REFINED AND EXECUTED — findings inline. Uncommitted; no PR opened (branch budget).

---

## 1. INTENT (unchanged from operator)

Every agent touching bsuite must (1) coordinate via `agent-mem-comms`, (2) promote via
`ops-ship-all-apps` / `bsuite-ship-visual-promote`, (3) mark work complete only when genuinely
complete. Enforced, detected, and durable beyond any session.

## 2. GOVERNING BLINDSPOT

**Instructing compliance is not achieving it; asking an agent whether it complied is worthless.**
Build observable signals computed from artefacts. Every check fails closed — a check that cannot
run is RED, never green.

## 3. DECOMPOSED WORKSTREAMS

| WS | Name | Output | Status |
|---|---|---|---|
| W1 | Discovery, not enumeration | agent inventory incl. unnamed | **DONE** |
| W2 | Skill visibility per agent | resolution matrix | **DONE — hole found and REPAIRED** |
| W3 | Evidence-derived scorecard | `bsuite_compliance_*` | **DONE with a scope correction** |
| W4 | Work tracking to VERIFIED-DONE | `bsuite_worktracker` | **DONE** |
| W5 | Drift detection, CI over habit | check specs | **SPECIFIED, not built** |
| W6 | Durability as precedent | precedent records | **DONE** |
| W7 | Remediate, not just report | repairs + directives | **DONE** |

## 4. EXECUTION FINDINGS

### W1 — Discovery

`claude agents --json` → **9 live sessions, 7 of them with cwd `/home/braden/Desktop/Dev/bsuite`**,
ages 6.3–12.2 h, all `kind=interactive`: `bsuite-57`, `bsuite-ea`, `bsuite-4c`, `bsuite-fc`,
`bsuite-35`, `bsuite-ab`, `bsuite-09`. Two more sit in `Documents/Work/RandD/202526` (out of scope).

**The operator named ~4 agents. Seven CLI sessions exist.** No session has a cwd inside R80.4,
so a distinct "R8 agent" is not currently running as its own process.

**Committer identities, all repos, 7 days:** exactly two —
`GaryOcean <81794144+GaryOcean428@users.noreply.github.com>` (883 commits) and
`GaryOcean428 <braden.lang77@gmail.com>` (459). **No agent trailers, no `Co-Authored-By`.**

> **BLOCKER FOR THE WHOLE DESIGN: agent identity is not recoverable from git.** Every lane
> commits as the operator. Per-agent compliance cannot be computed from commits, branches or
> PRs. This is not a gap in the measurement — it is a gap in the estate's instrumentation.

### W2 — Skill visibility (the precondition)

| Path | Entries | `bsuite-*` present |
|---|---:|---|
| `~/.claude/skills` (user, resolves from ANY cwd) | 179 → **199** | **0 → 20 (REPAIRED)** |
| `~/Desktop/Dev/bsuite/.claude/skills` (project) | 22 | 20 |
| `~/.agents/skills` (canonical) | 227 | 20 |

**Measured before repair:**
- All 20 `bsuite-*` skills existed in `~/.agents/skills` and were symlinked into the **project**
  path only.
- **Zero were in the user path.** So they resolved *only* for a session whose cwd is the bsuite
  repo root.
- **No worktree has `.claude/skills`** — checked all 25+. `.claude/` is **gitignored**
  (`.gitignore:49`), so a worktree can never inherit it.
- **No submodule has `.claude/skills`** — 0 in crm7, braden, BSU, conduit, throughput, R80.4,
  and the standalone R80.4 clone.

**REPAIRED:** 20 symlinks created in `~/.claude/skills`. Verified from a neutral cwd (`/tmp`) —
all six required skills now resolve, 20/20 dereference to a real `SKILL.md`, 0 broken.

### W3 — Compliance evidence

| Signal | Measured | Verdict |
|---|---|---|
| **Visual-gate artefact on merged PRs** | **2 of the last 12 merged bsuite PRs** carry any marker (`visual gate`, `d.*` host, screenshot, breakpoint). #2370 and #2361 only. | **FAIL — 83% of merges carry no gate evidence** |
| **GPG signing (`%G?` = `G`)** | bsuite 123 G / 239 E · crm7 38 G / 148 E · braden 7/33 · BSU 17/69 · conduit 8/51 · throughput 6/32 · **R80.4 0 G / 75 E** | **FAIL — `E` (cannot verify) is the majority everywhere; R80.4 has zero verifiable signatures** |
| **Branch hygiene, post-drain** | merged-not-cleaned: bsuite 0, crm7 1, braden 1, conduit 1, throughput 1, BSU 0, R80.4 0 | **PASS after the drain this turn** (was 89/15/6/6/5/11/0) |
| **Inbox participation** | 5 distinct `from` handles ever in the bsuite namespace: `datum`, `claude-code-r804`, `bsuite-lane`, `datum-automation-liveness`, `bsuite-estate-20260824` | **UNKNOWN per agent — handles do not map to the 7 sessions** |
| **Presence records** | no `bsuite_presence_*` records found | **FAIL — nobody registers presence** |

### W5 — Drift detection, specified

Prefer CI over supervisor observation. Three checks, each failing closed:

1. **`gate-artefact-required`** — a PR merging to `development` must carry a visual-gate report
   artefact or an explicit `visual-gate: N/A — <reason>` line. Absent → RED. *(Would have caught
   10 of the last 12 merges.)*
2. **`branch-drain`** — nightly: count branches ancestry-merged into `origin/development` and
   still present. `> 0` → RED, naming them. *(Would have caught 132.)*
3. **`closure-criteria`** — a closing comment must contain a criterion enumeration with a
   denominator. Absent → RED. *(Implements `closure_scope_enumerates_every_criterion`.)*

Each must have a planted-defect negative control before being trusted —
`a_guard_that_cannot_fail_is_not_a_guard`.

## 5. COUNTERS BAKED IN

- Discovery over enumeration — **7 sessions found where ~4 were named.**
- Evidence over self-report — **no agent was asked anything.**
- Fail closed — GPG `E` scored FAIL, not "unknown-so-pass"; unmeasurable agents score UNKNOWN.
- Verify behaviour not presence — the skills *existed* the whole time; the question was whether
  they *resolved*, and for worktree/submodule agents they did not.
- Silo discipline — `bsuite_` keys only.
- No process weight — one CI check beats three procedural steps.

## 6. OPERATOR ASSUMPTIONS THAT WERE WRONG

1. **"All 16 `bsuite-*` skills reached zero sessions."** There are **20**, not 16, and they
   resolved fine for the 7 sessions rooted at the repo. The real hole was **worktree and
   submodule agents**, which is where the mandated workflow actually puts them.
2. **"`own-package-freshness` is red on every parent PR so nothing can merge."** The only open
   bsuite PR (#2365) shows `SUCCESS`, and 18 branches merged today. The failure was disposal,
   not merging.
3. **"Verify per agent."** Not computable. All commits are the operator's identity; there is no
   lane marker anywhere in git. Scoring must be per repo/session until one exists.
