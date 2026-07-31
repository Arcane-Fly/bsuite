# FF-SELF-VALIDATION-20260507 — Self-Validation Loop Doctrine

**Frozen Fact ID:** `FF-SELF-VALIDATION-20260507`
**Status:** WORKING (`v1.00W`) — doctrine adopted 2026-05-07; rolling into all rule files this cycle
**Source article:** [Eivind Kjosbakken, "How to Make Claude Code Validate its own Work" (Towards Data Science, 2026-05-05)](https://towardsdatascience.com/how-to-make-claude-code-validate-its-own-work/)
**Applies to:** all AI agents (claude-code, perplexity-computer, codebuff, copilot, manus, cursor, windsurf) operating in any of the 7 BSuite repos.
**Operator directive:** Mobile, out-of-office, 2026-05-07 morning. "Implement the principles of this article into all rules-like files... and adopt in your current work. All issues and plans should include reminders of this along with the cross red-teaming expectation use of relevant skills..."

---

## TL;DR

You are not graded on first-try perfection. You are graded on the gap between your final claim and reality. Run the code. Open the page. Diff against the target. Iterate until equivalent. Self-report when you can't.

## The two loops (canonical)

| Loop | Trigger | What you do | What you ship |
|---|---|---|---|
| **§9.1 Output-Equivalence** | Refactor / extraction / migration where the *output should not change* | Capture baseline outputs → implement → re-run on same inputs → assert equivalence → iterate | Diff log + assertion test + final equivalence proof |
| **§9.2 Visual-Equivalence** | UI work driven by a screenshot, mockup, or live reference | Save target → implement → screenshot in real browser at 3+ breakpoints → compare → iterate | Side-by-side image pair in PR body + breakpoint coverage list |

Both loops compose with §17 cross-red-team and §19 forward-motion.

## Mandatory PR / Issue / Plan additions

### PR description block

```markdown
## Evidence

- [ ] Output-equivalence (§9.1) baseline + diff: <path or N/A>
- [ ] Visual-equivalence (§9.2) reference + after screenshots: <path or N/A>
- [ ] Self-report block: known divergences from spec or "none"
- [ ] Tests run: <command + result>
- [ ] Live verify: <URL + observation>
```

### Issue / Plan front-matter block

```markdown
## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: §9.1 output-equivalence | §9.2 visual-equivalence | both
- **Equivalence target**: <baseline output | reference screenshot | live-deploy URL>
- **Cross red-team**: <peer agent name> verifies evidence rows before flip-to-done
- **Skills to load**: <comma-separated list>
- **Self-report on divergence**: yes (mandatory; do not rationalise gaps)
```

## Composition with the existing rulebook

| Existing rule | What §9 adds |
|---|---|
| **§1 Zero-Defer** | Validation IS part of the task. "Tested locally" with no evidence = deferral. |
| **§6 Multi-Agent Orchestration** | Peer reviewer must verify evidence rows are real and reproducible before flipping queue items to `done`. |
| **§17 Mutual Reminder** | Every PR must carry the Evidence block. Without it, not §17-eligible for review. |
| **§18 offer / issue / share** | A `share` is now valid if it documents a validation pattern (e.g., a Playwright recipe used in a §9.2 loop). |
| **§19 Forward Motion** | Running someone else's PR through the validation loop and writing a verification comment IS forward motion. |
| **§20 Obvious-Fix Autonomy** | Ship the obvious fix, but the fix must still pass §9.1 or §9.2 before the queue item flips. |

## What changes today

1. **All 14 rule files** (AGENTS.md × 6, CLAUDE.md × 7, copilot-instructions.md × 1) get a new Section 9.
2. **Every existing open issue I authored** gets the FF-SELF-VALIDATION reminder block appended via comment.
3. **Every new spec PR / issue I file from now on** includes the reminder + skill list + cross-red-team line.
4. **My in-flight CLS PRs (#347, #505, #194, #191)** get the §9.2 evidence block retrofitted in their bodies.
5. **My in-flight comms spec (#610)** and admin spec (already merged #604) get the same retrofit treatment.

## Skill mapping (default skill-load list per validation type)

| Task type | Skills to load (minimum) |
|---|---|
| **UI / shadcn / Tailwind work** | `shadcn-ui`, `tailwind`, `playwright-skill`, `verification-before-completion` |
| **Form work (RHF + Zod)** | `forms-and-validation`, `qa-and-verification`, `verification-before-completion` |
| **Supabase migration / RLS** | `supabase`, `supabase-postgres-best-practices`, `supabase-auth-comprehensive`, `dependency-management` |
| **Refactor / extraction** | `qa-and-verification`, `verification-before-completion`, `code-quality-enforcement` |
| **Cross-app consistency change** | `bsuite-brand-system`, `cross-platform-sync`, `frontend-backend-mapping` |
| **Performance / regression-sensitive** | `performance-regression`, `qa-and-verification` |
| **CI / deployment** | `deployment-readiness`, `verification-before-completion`, `git-workflow` |
| **API / endpoint design** | `api-design-validation`, `frontend-backend-mapping`, `qa-and-verification` |

## Anti-patterns (banned phrasings)

- "Looks correct"
- "Should work"
- "Tests will be added later"
- "Visually matches" (without image pair)
- "Close enough"
- "Same idea as before"

If any of these appear in your PR body or comment without backing evidence, the PR is not §17-eligible.

## How this lands in tooling

- **Cron A (ship-loop)** routing matrix gains a "validation loop verified?" gate before §20 auto-merge of clean perplexity PRs.
- **Cron B (digest)** flags PRs lacking the Evidence block as `needs-evidence` and includes them in the daily heavy-work table.
- **Cron C (Supabase advisor)** does not change behaviourally; the §9.1 loop already applies to its DDL fixes (re-run advisor count after each fix; rollback on increase).
- **Cron D (failover)** treats a missing Evidence block as a hung-state signal in addition to the existing time-based heuristic.

## Cross-agent coordination

- claude-code-local: receives a status message in inbox v8 with link to this doctrine + the rule patches landing today.
- codebuff: same protocol, via codebuff inbox v3.
- copilot-swe-agent: receives the rule via copilot-instructions.md update; no additional inbox.

---

*Frozen Fact: `FF-SELF-VALIDATION-20260507`. Adopted 2026-05-07 by operator directive. Sourced from Kjosbakken 2026.*

---

## Scope, self-report and tooling (relocated from `AGENTS.md` §9, 2026-07-31)

**§9.1 applies to:** SQL refactors, function extractions, library migrations, prompt reworks, batching changes, edge-function splits, type-system migrations.

**§9.2 applies to:** shadcn component placement, layout changes, branding updates, FAB positioning, Tailwind v4 tweaks, responsive-grid adjustments. Capture at minimum mobile 375, tablet 768, desktop 1440.

**§9.3 Self-report (always).** When the loop cannot reach equivalence — visual diff persists, output drift exceeds tolerance, runtime constraint blocks a step, dependency missing — **stop, name the divergence, and ask for input** via the inbox or a tracker comment. Do **not** push, do **not** mark "done", do **not** rationalise the gap.

### Tooling

- Headless browser: Playwright (preferred — already in BSuite stack), Puppeteer (acceptable), or `pplx-tool screenshot_page`.
- Visual diff: human side-by-side is sufficient; structured diff via `pixelmatch` if a regression suite is set up.
- Output diff: `diff -u`, JSON canonicalisation, or a domain-specific equivalence helper (e.g. currency rounding to 2dp before compare).
- Runtime: every implementation PR must list the exact commands run + their output. CI is not a substitute for local validation when the change is visual or behavioural.

*Frozen Fact: `FF-SELF-VALIDATION-20260507`. Adopted 2026-05-07 by operator directive. Sourced from Kjosbakken 2026. Applies to all AI agents (claude-code, perplexity-computer, codebuff, copilot, manus, cursor, windsurf) operating in any BSuite or related repo.*
