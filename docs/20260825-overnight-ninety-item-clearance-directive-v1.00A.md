# OVERNIGHT CLEARANCE DIRECTIVE — the 90 outstanding operator items

**Status:** A (Active) · **Issued:** 2026-08-25 · **Operator:** Braden
**Ledger:** `bsuite_docx_register_20260824` (base, D-1…D-103) + `bsuite_docx_register_20260825_delta`
(D-104…D-109, re-measurements, counts). Read BOTH. Neither is optional.

This is the brief the overnight session runs from. The paste-able prompt is §0; everything
after it is the detail that prompt refers to.

---

## §0 — THE PROMPT

> You own the entire BSuite estate this session. Every other lane and branch has been closed by the
> operator — there is no one else to hand anything to, and nothing is anyone else's. You are the
> **Operator Agent acting with Braden's authority**; lane leads act as PIs within their lane.
>
> **The goal: close the ~90 outstanding operator items in `bsuite_docx_register_20260824` +
> `bsuite_docx_register_20260825_delta`, merged to `development` and promoted to `main`.**
> Braden has been raising most of this list for weeks. It is the only thing that counts.
>
> **MEASURE BEFORE YOU BUILD. This is the most expensive failure in this estate and it has already
> been committed against THIS list.** A P0 was restated across three documents after a fourth had
> closed it, its evidence column reading *"carried from v2, unchanged"* — read
> `bsuite_correction_20260825_p0_1_was_already_fixed`. The phrase *"carried forward unchanged"* is a
> **trigger, not a provenance note**. A prior directive for this same night asserted RAMS was
> unbuilt on the strength of one table name, and asserted every repo tip was unsigned on the
> strength of a `%G?` letter it misread. Both were wrong. **For every item: verify against the live
> system first. If it is already done, close it with evidence and move on. Where a document and the
> live system disagree, the live system wins.**
>
> Run `/agent-run-master` first, then work landmarks L0→L9 in
> `docs/20260825-overnight-ninety-item-clearance-directive-v1.00A.md`. Do not skip a landmark and do
> not re-plan them. `/agent-skl-find` at L0 binds each item class to the skill that already exists.
> `/agent-mem-precedent-rule` + `/agent-mem-precedent-clerk` at L1 extract the standing rules as
> **principles** and apply them to cases they do not literally name; record new precedent as you go.
> `/agent-red-plan` once at L2. `/agent-run-subagents` + `/agent-cli-cc-subagents` to fan out at L4.
> `/agent-red-implement` per lane at L5. `/agent-mem-comms` (namespace `bsuite`) is the only
> coordination channel — claim ownership in the inbox before starting, and report continuously.
>
> **Landmark checkpoint after every skill and every MCP call: state what you invoked, what it
> returned, and what you concluded. A skill invoked without a recorded outcome did not happen.**
>
> One Operator-Agent rules from precedent rather than waking Braden. One PI per app. Workers
> implement in isolated worktrees and never merge. **Nothing is marked done by the lane that did it.**
>
> By morning Braden reads ONE ledger. Every item is `VERIFIED-DONE` (checked by another lane),
> `CLAIMED-DONE`, `IN-PROGRESS`, or `BLOCKED` with a named unblock. **Nothing at CLAIMED-DONE may be
> written as done. A short honest list beats a long false one — he has had weeks of the latter.**

---

## §0b — FOUR CLAIMS THAT ARE ALREADY REFUTED. DO NOT ACT ON THEM.

Measured 2026-08-25 against the live system. A prior directive for this night asserted each.

| Asserted | Measured |
|---|---|
| RAMS is unbuilt — `to_regclass('public.rams_funding_matrix')` is null, 111 days past a ratified ADR, funding hand-keyed | **FALSE.** Eight funding tables exist (`funding_claims` 45 cols, `funding_claim_items`, `funding_milestones`, `funding_programs`, `funding_offsets`, `funding_sources`, `engagement_funding_sources`, `incentive_claims`). The RAM/ADMS claim path landed **2026-08-06, crm7 PR #1436**: `admsAdapter.ts` 1006 lines, `claims/new.tsx` 1156, `submitFundingClaim.ts` 311, `ramAuthClient.ts` 165, plus `SubmitClaimDialog.tsx`, `govt-integrations.tsx`, `admsParticulars.ts`, `fundingClaimStore.ts`. **The task is to VERIFY it end to end and find what is genuinely missing — not to build it.** The tables are near-empty, which is expected with no live billing; empty is not unbuilt. |
| Commit signing is broken — `%G?` = `E` on every tip, R80.4 0 of 75, Vercel silently cancelling deploys, so treat no green check as evidence | **FALSE.** `E` = *signature cannot be verified locally*, not *unsigned*. The key on every `E` is `B5690EEEBB952194` — **GitHub's web-flow key**, signing GitHub-created merge commits, absent from the local keyring. **Zero `N` (genuinely unsigned) commits exist.** GitHub returns `githubCommitVerification: verified` on every deployment, and all 20 recent R80.4 deploys are `READY`. **Do NOT spend the night reconfiguring GPG, and do NOT enable required-signature branch protection — it would block every agent commit in the estate.** |
| 166 branches through production without disposal | **STALE.** 26 remote estate-wide (parent 4 + submodules 22). 32 stale *local* parent refs, harmless. The branch budget below still binds. |
| Three crm7 worktrees landmined with `MERGE_HEAD` | **STALE.** Zero extra worktrees exist in any repo. The never-commit-in-a-MERGE_HEAD-worktree rule still binds if one reappears. |

**Partly true, and the true half is a real finding:** `email_integrations` still carries plaintext
`access_token` and `refresh_token` beside `access_token_vault_id` / `refresh_token_vault_id`, and
the one live row is **dual-written** — the Expand-Migrate-Contract is stuck before the contract.
But `smtp_password` and `imap_password` are **already vault-only**; that limb of the claim is wrong.
Finish the contract on the two token columns; do not "fix" the two that are done.

**Confirmed and actionable:** PermissionsEditor has zero default logic · dnd-kit is 25 files across
5 apps · Michael Chen is duplicated across two tenants and absent from the one he belongs to ·
crm7 is a PWA whose service worker serves Supabase reads, so block it in Playwright or the gate is
fiction · **RULING 25.1 unblocks the reporting family** (see L3).

---

## §1 — WHY THIS EXISTS

103 items were extracted verbatim from `bsuite notes.docx` on 2026-08-24. Six more arrived on
2026-08-25. **Four have since been measured resolved. About 90 remain open.** Several carry the
operator's own count of how many times he has asked: *"in excess of 20 times"* (D-2 email),
*"insisted on many times"* (D-40/D-99/D-103 permissions), *"raised innumerable times"* (D-70
draggable cards), *"directed to fix many times"* (D-30/D-74/D-101 reporting).

**The single through-line, stated by the operator three times on three separate days:**

- D-70 — *"Usually one page gets fixed but not all even when all are a requirement of the task."*
- D-104 — *"This is specific example but this should be a button for all."*
- D-107 — *"Check all like concerns."*

Recorded as `precedent__bsuite__20260813__fix_the_class_not_the_page` and
`20260824__zero_consumer_is_not_done`. **An item is not closed by fixing the instance he named.**
Every lane is bound by this and every reviewer checks it first.

---

## §2 — ROLES

| Role | Count | Model tier | Mandate |
|---|---:|---|---|
| **Operator-Agent** | 1 | frontier | Acts as Braden. Rules on every fork from the precedent book via `agent-mem-precedent-rule`. Records new rulings the same turn via `agent-mem-precedent-clerk`. Owns the NIGHT-BLOCKERS batch (§6). Never implements. |
| **Lane PI** | 6 — one per app (`crm7`, `business-suite-unified`, `conduit`, `braden`, `throughput`, `R80.4`) + 1 for `packages/*` | standard/high | Owns its repo end to end: worktree, branch, PR, build, visual gate, merge. Decomposes assigned items into worker tasks. Reports lane state to the inbox at every landmark. |
| **Class PI** | 1 per cross-cutting class (§4) | high | Owns a class that spans apps — theme, dnd-kit, permissions, dates, back-affordance. Does NOT own a repo; hands per-repo work to Lane PIs and holds the completeness count. |
| **Worker** | as many as the class needs | standard, mechanical → low | Implements one scoped task in an isolated worktree. Never merges. Never marks anything done. |
| **Verifier** | ≥1 per item | high | A lane **other than the claimant**. The only role permitted to write `VERIFIED-DONE`. |

Cap ~2 concurrent frontier, wide fan-out below that. Always pass an explicit model on dispatch.

---

## §3 — LANDMARKS

Each landmark names the skill and MCP that must be exercised at it. A landmark reached without
its named skill having run is not reached.

### L0 — INVENTORY AND BIND *(skill: `agent-run-master`, `agent-skl-find`; MCP: qig-memory)*
- `agent-run-master` — detect project family, inventory skills + MCPs, form the teams above.
- `~/.agents/skills/agent-run-master/scripts/inventory.sh` — read the real inventory, not the
  context listing (it is budget-truncated and drops exactly the skills never used).
- `agent-skl-find` — for each item CLASS in §4, name the skill that already covers it. Do not
  install anything the hub already has.
- `memory_list({keysOnly:true, prefix:"bsuite_"})` then `memory_get` both register keys.
- `inbox_list` namespace `bsuite` — read everything unacked from the closed lanes.
- **Landmark artefact:** a class→skill→PI binding table posted to the inbox.

### L1 — PRINCIPLES *(skill: `agent-mem-precedent-rule`, `agent-mem-precedent-clerk`)*
- `memory_search(category:"precedent")` + `memory_get("precedent__index__bsuite")` and
  `precedent__index__constitutional`.
- **Extrapolate, do not transcribe.** Each precedent is an instance; write the PRINCIPLE it
  implies and the estate-wide test that proves it held. Example: *"zero consumers is not done"*
  → **every change ships with a count of call sites/routes/tenants touched vs the total that
  exist, and the two must match or the gap is named.**
- Read the OPEN section of the index — silence tells you to run the novel-situation protocol,
  not to assume coverage.
- **Landmark artefact:** `docs/20260825-overnight-binding-principles-v1.00A.md`, ≤20 numbered
  principles, each with its test. Every lane loads it before its first edit. Every new ruling
  made tonight is appended by the Operator-Agent **the same turn**, via the clerk.

### L2 — PLAN AND RED-TEAM *(skill: `agent-red-plan`)*
- Draft the execution plan: ~90 items → classes → lanes → the dependency order.
- `agent-red-plan` runs the structured multi-agent red-team on it and refines twice.
- The red-team's required questions: *Which items are BLOCKED on a decision only Braden can make?
  Which look like one page and are actually a class? Which two items are the same item? Which
  "resolved" measurements are greps that never opened the page?*
- **Landmark artefact:** the final plan doc in `docs/00-roadmap/`, plus the NIGHT-BLOCKERS list.

### L3 — NIGHT-BLOCKERS, ONE BATCH *(skill: `agent-mem-comms`)*
- The Operator-Agent rules on everything the precedent book reaches. What genuinely remains —
  irreversible, or a product choice with no precedent — goes to Braden as **one message, once,
  at the start of the night**, each as a lay brief: what it is in one plain sentence, what
  changes on yes vs no, one recommendation.
- **The reporting family is NO LONGER BLOCKED.** `bsuite_todos_20260825_operator` carries
  **PI RULING 25.1**: *a report is a read-only saved question over the semantic layer; the data
  explorer is an editable grid; a report may deep-link to the owning app's editor but never embeds
  one.* Build D-30/D-74/D-101/D-106 to that. Do not re-escalate it.
- Remaining candidates:
  D-31 (multi-repo architecture ADR), D-38 (funding claim shape), D-43 (the 12 frozen
  `bsuite Platform` placement rows), the 162 duplicated Braden Group documents.
- **Do not trickle these.** A second wake-up is a defect. Everything not in this batch is ruled
  by the Operator-Agent and recorded.

### L4 — FAN OUT *(skill: `agent-run-subagents`, `agent-cli-cc-subagents`)*
- One worktree per lane under `~/Desktop/Dev/worktrees/` — **never in `$HOME`**, never a second
  mutation on a shared tree.
- `agent-cli-cc-subagents` for the shared-working-tree hazards and model selection.
- `agent-run-subagents` per task: implementer → **spec reviewer** → **code-quality reviewer**,
  in that order, with the re-review loop. Never dispatch two implementers into one repo.
- External CLI workers (`grok-worker`, `qwen-worker`, `agy-worker`, `hermes-worker -z`) are
  available for bulk mechanical classes. Their output is untrusted — review the diff.
- **Landmark artefact:** every open item has a named owner and a worktree. Zero unowned.

### L5 — IMPLEMENT AND RED-TEAM *(skill: `agent-red-implement`; MCP: context7, supabase)*
- Per lane, against its approved plan: implement → red-team with specialist sub-agents →
  iterate twice → QA → update the roadmap.
- **Gate A before the first edit touching any library/framework/runtime:** context7 for the
  exact installed version, `research-best-practice`, then read the installed source. A version
  assumed is a version wrong.
- Supabase MCP for every schema claim. `list_tables` / `execute_sql` — never infer a column.
  **Migrations are AUTHORED from a lane and applied by `gh workflow run supabase-migrate.yml
  --ref main`.** A merge does not apply. File in git ≠ applied on live.
- Never `git add -A` or `git add .` — explicit pathspecs only. `.env.local` holds live
  credentials: it may be read, never committed, never printed.
- Every commit GPG-signed (`5200D84D2CE96AED`), verified **in the same command as the push**:
  `git log --format='%G?' -1` must print `G`.

### L6 — PROVE *(skill: `bsuite-ship-visual-promote`; MCP: playwright / chrome-devtools)*
- The per-item bar is §5. Nothing advances on a grep.
- Visual gate on the `d.*` preview: `scripts/visual-probe.js` per route × theme × width ×
  account. **You perform it** (Ruling V-1). The PAGE is the scope, not the diff (V-2).
  INCOMPLETE never clears the gate (V-3).
- Confirm the live SHA equals the SHA you pushed before inspecting, and unregister the service
  worker first — it will serve you the previous build and you will pass the old one.
- Two tenants minimum for anything role-gated, licence-gated or RLS-scoped. Identical counts
  across two tenants is a leak until proven otherwise.

### L7 — CROSS-CHECK *(skill: `agent-definition-of-done`)*
- D1–D7 per item. **APPROVE or a recorded waiver — no third state.**
- The verifier is a lane other than the claimant. A self-signed VERIFIED-DONE is void.
- Wiring gate: every artefact produced tonight is WIRED or REMOVED. Scaffolding that exists and
  is invoked by nothing reads as progress and is not.

### L8 — SHIP *(skill: `ops-ship-all-apps` → `bsuite-ship-visual-promote`)*
- Submodule PRs → `development` first, merged, **branch and worktree cleaned in the same turn**
  (`scripts/branch-cleanup.sh --apply`). Report the deleted/preserved split, not a count.
- Then `development` → `main` by PR, `gh pr merge --merge` — **never `--squash`** when the head
  is `development`, never `--delete-branch` on it.
- A promotion is SEVEN PRs plus the gitlink invariant: parent `main`'s gitlink must sit on the
  submodule's `main`. Promoting the parent alone deploys no app.
- Monitor production to READY. Rollback rather than push a fourth hotfix.

### L9 — MORNING BRIEF *(skill: `agent-mem-comms`, `agent-mem-precedent-clerk`)*
- Post to the inbox and write `bsuite_session_20260826` + `bsuite_sleep_packet_20260826`.
- Update `bsuite_docx_register_20260825_delta` in place with the new per-item status.
- Append every ruling made tonight to the precedent book.
- **The brief is written for Braden, not for an engineer** — he cannot read the memory MCP.
  Gloss every acronym on first use. Structure it exactly as: *what is now closed and proven
  (D-numbers, with the evidence) · what is in production · what moved but is not closed and
  precisely where it stops · what is still blocked on you and why · what I got wrong.*
- Leave `development` in sync with `main` on all seven repos.

---

## §4 — THE CLASSES

Work the classes, not the item numbers. Each has a Class PI holding a completeness count.

| Class | Items | The completeness test |
|---|---|---|
| **Email connect** | D-2, D-109 | Braden signs in to Google AND Microsoft from crm7, lands on `settings/email-accounts`, popup closed, sends a real email from his own account. Both providers. Not one. |
| **Permissions defaults** | D-40, D-99, D-103, D-102 | Defaults render checked; reset-to-defaults exists for org admin / developer / delegee; platform admin hidden from enterprise tenants; and the relationship between `crm7/settings/role-overrides` and `suite/admin/permissions` is documented and enforced in one place. |
| **Card independence (dnd-kit)** | D-4, D-29, D-36, D-70 | A count: cards on every page of every app that are individually draggable ÷ cards that exist. Currently 25 files across 5 apps. Anything below total is named as the remaining gap. |
| **Reporting / airtable** | D-30, D-74, D-101, D-106, D-75 | Gated on B-1 (L3). Once ruled: one surface, tenant-gated, spreadsheet-like, full-screen expandable, with the six duplicate surfaces retired — not a seventh added. |
| **Theme conformance** | D-27, D-32, D-71, D-73, D-93, D-100 | `visual-probe.js` PASS across every route × theme × width × account cell. No pure endpoints, gradients on headings and clipped to text, per-accent elevation. |
| **R8 calculator** | D-3, D-6, D-11…D-14, D-33, D-46…D-69, D-78…D-90, D-96 | Displayed values vary by selected award — proven in the live UI, not by the absence of a literal in source. Every calculation crosscut for hardcoding (D-87 is a standing instruction). |
| **Money path** | D-19, D-94, D-95, D-105, D-62 | Margin = profit per R8's method; rates pull from R8; no hardcoded funding; charge/pay wording unambiguous. **R80.4 owns rate calculation** — no second implementation. |
| **Back-affordance / navigation** | D-104, D-39, D-97 | Every "back to X" is a button, estate-wide, with the count. Dependees below what they depend on, as a general layout principle. |
| **Data integrity sweeps** | D-107, D-108, D-35 | RTO 22613's blank name AND every like concern. Signatory pickers scoped to the selected org. Duplicate contacts reassigned to their real tenant, not re-entered. |
| **Dates** | D-76 | The 14 files still carrying US formatting → zero, estate-wide. |
| **Regressions** | D-8, D-25, D-54, D-58 | *"This WAS working."* Find the commit that broke it before writing new code. |
| **Docs** | D-18 | Screenshots in the manuals — *"same for all docs"*. |

---

## §5 — THE BAR PER ITEM

An item may be marked closed only when **all six** hold:

1. **The class, not the instance.** The count of surfaces changed equals the count that exist,
   or the residue is named explicitly with a reason.
2. **Proven in the running product**, by the agent, signed in, on the deployed SHA. A grep proves
   a literal is absent; it does not prove the page is right.
3. **The probe could actually see it.** A detector blind to a construct reports absence, not a
   gap. State what the check would have caught and what it structurally cannot.
4. **A control that could fail.** A test that asserts the constant locks in the bug. A green
   suite that never instantiated the thing under test is not evidence — that shipped three
   broken fixes in one day this week.
5. **Verified by another lane.** Self-signed is void.
6. **Merged to `development` and promoted to `main`,** with the production deploy READY.

Anything short of six is `PARTIAL` with the stopping point named — file, line, branch, next step.
**`PARTIAL` honestly reported is acceptable. A false `DONE` is not.**

---

## §6 — THE FAILURE MODE TO AVOID

This estate's signature failure, committed four times in a single session on 2026-08-24:
**a well-formed answer to a narrower question than the one asked out loud.** A case-sensitive
grep on lowercase SQL. One spelling of an RLS predicate. A path filter that excluded `api/**`.
A word matched in prose about the word.

Before reporting any measurement, state the question you actually asked and the question you were
asked, and confirm they are the same one. If a count is a grep count, call it a hypothesis and
name the probe that would measure it.

Related, and equally live: a salvage is a REPLAY not a restore (`git checkout <old-ref> -- <path>`
reproduces the old name and version and silently undoes every correction since); a truncated
report reads as a complete one to whatever parses it; `$?` through a pipe is the last stage's
status, not the command's.

---

## §7 — STANDING CONSTRAINTS

- Production is `main`. **Never direct-push.** Promote by PR.
- Commits GPG-signed, verified chained to the push. Unsigned = Vercel silently cancels the deploy
  and the ship looks successful while producing nothing.
- **Never** `git add -A` / `git add .`. `.gitignore` does not cover a plain `.env`.
- `.env.local` may be READ for credentials. Never committed. **Never printed.**
- Worktrees under `~/Desktop/Dev/worktrees/` only. Never `$HOME`. Never delete a directory you
  did not create. `Dev/R80.4` is Braden's own clone — leave it.
- No real PII in any report — shapes and counts only.
- One open PR per lane. No branch without an intended PR. Cleanup same turn as the merge.
- Never force-push.
- Migrations: author from a lane, apply by workflow dispatch on `--ref main`.
- Colour literals in prose trip the C1/C2 grep gates — describe, do not quote them.

---

## §8 — WHAT DATUM'S VERSION GOT RIGHT, AND KEPT HERE

A parallel directive was drafted for this same night. Four of its factual claims are refuted in
§0b; these five are better than what this document originally said, and are adopted:

1. **MEASURE BEFORE YOU BUILD as the headline instruction**, not a footnote. It is now §0.
2. **Order by how many times Braden has asked, not by technical convenience.** §4 is re-read in
   that order: D-2 email first, then permissions defaults, then dnd-kit, then reporting.
3. **RULING 25.1 unblocks the reporting family** — this document had it as blocked on B-1. It is not.
4. **The D-2 email diagnosis is specific and correct:** the Google consent screen returning to the
   wrong app with the popup still open is a `redirect_uri` / authorised-origin mismatch — start
   there. And the scope decision is real: `gmail.send` alone avoids Google's CASA assessment;
   inbound sync commits to it. **Record that decision before building, because it is irreversible
   in effort.** Insecure-but-working and secure-but-broken are both failures.
5. **A lane whose transcript stops growing is treated as dead and revived.** Sessions die on API
   529 overloads, not on decisions. Poll lane liveness; do not assume silence means work.

Its branch-budget and hard-honesty sections say the same thing as §5 and L9 here, in stronger
words, and those words are kept.
