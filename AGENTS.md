<!-- bsuite-remediation-rules:start -->
## Remediation execution rules (2026-09-09)

Read [.agents/rules/remediation-execution.md](.agents/rules/remediation-execution.md) before remediation work.
This current contract governs remediation execution where older workflow defaults conflict.
<!-- bsuite-remediation-rules:end -->

# BSuite — agent rulebook

Canonical instructions for every AI agent working in this repo (Claude Code, Copilot, Cursor,
Windsurf, Manus, Codex). These override default agent behaviour.

Six apps — business-suite-unified, crm7, conduit, braden, R80.4, throughput — over one shared
Supabase backend (`tuybltdrdefjblnplpqo`). Each is a submodule that deploys standalone from its own
repo, so **Vercel never sees this parent directory**.

Stack floor, all apps: React 19, TypeScript strict, TailwindCSS, Radix + shadcn + Lucide, Zustand,
React Hook Form + Zod, Supabase, Vitest. pnpm everywhere. conduit is Next.js 16 App Router; the rest
are Vite.

> **Reading a document that says R80.3.** R80.3 left the submodule set on **2026-08-06** (`5e000c35`,
> operator directive) to `~/Desktop/Dev/archived-repos-docs/R80.3`, and **R80.4** took its place.
> R80.4 is what serves `r8.crm7.app` today — verified live 2026-08-17: the deployed title is
> *GTO Charge Rate Calculator v9.2*, matching `R80.4/package.json@9.2.0`.
>
> **132 documents under `docs/` still say R80.3 — 49 of them at the top level.** Re-measure with
> `grep -rl 'R80\.3' docs/ | wc -l`, because this line has gone stale twice: the register filed 40,
> 2026-08-17 measured 117/42, and 2026-08-22 measures 132/49. It grows because new dated records
> correctly cite historical R80.3 work — that is the system behaving, not decaying. They have not been
> rewritten and will not be:
> almost all are dated audits, plans and RCAs that were *correct when written*, and back-dating them
> would destroy the record this estate relies on. Treat "R80.3" in any document dated before
> 2026-08-06 as historical. Anything an agent is expected to *act* on — the platform operations
> reference, the env/URL map, the shared-package table — has been corrected in place. If you find an
> **operational instruction** still naming R80.3, that one is a defect: fix it and say so.

## How you are expected to work

1. **No deferral.** Fix what you find, in the session you find it. "TODO: implement later", "needs a
   fresh session", "out of scope", "leaving for runtime testing" — all banned. If genuinely blocked
   by an external dependency, file an issue and keep going.
2. **Finish the whole ask.** Don't silently narrow scope. If you drop part of it, say so explicitly.
3. **Evidence, not assertion.** "Done" requires: the command you ran plus its output; a live check on
   the `d.*` domain for anything user-facing; the tracking issue and dashboard updated in the same
   session. Never mark your own work done on a code-trace alone.
4. **Latest wins.** On conflicting docs, take the newest, most complete, highest-quality option — and
   fix or delete the stale one rather than leaving both.
5. **Clean up behind you.** Remove superseded code when you supersede it. No dead or duplicate paths.
6. **Red-team before merge** on anything complex, and update docs in the same PR as the code.

## The one that costs the most: a claim nobody checked against the code

Almost everything that has to be fixed twice starts as **a claim made about the code that nobody
checked against the code**. The claim is cheap to check and the check is always the same — run it
and look — which is why skipping it feels free and is not.

It arrives in three disguises. Naming them is the point, because each one *looks* like a different
kind of mistake and they all fail for the same reason:

| The claim | What it asserts | How it goes wrong |
|---|---|---|
| A **predicate** | coverage — "these are all of them" | narrower than the code, so it returns a confident answer over an incomplete set |
| A **comment** | behaviour — "this handles X" | describes what the code should do, next to code that does not do it |
| A **fix** | the failure path — "this is now safe" | correct about the branch you changed, silent about the branch that runs when it fails |

All three below happened in a **single session** on crm7, three, three and four times
respectively, and every one was self-inflicted — introduced by the same person fixing the previous
one. They are recorded with counts because a rule with a real incident behind it survives and one
written as general advice gets skimmed.

### 1. A predicate is a claim about coverage

`grep useForm\(` against pages that write `useForm<CreateFoo>(` found **zero** and was reported as
a finding. So did `useState<` against `useState(`. So did `export function` against a repo full of
`export const foo = async () => {}`. Each returned a confident number over a set that excluded most
of its subject.

**Before quoting a sweep's number, name which syntactic forms it cannot see — then widen it and
re-run.** A widened predicate that finds nothing deserves the same suspicion as a narrow one: a
control that reads zero indicts the probe before the subject.

*Where the evidence lives, since this entry's whole thesis is that claims must be checkable.* The
`export function` instance is in crm7 `726e0ccd` — the fix widened the predicate and its own commit
message names the fault. The `useForm(` and `useState<` instances are **not** reconstructable from
a diff: they were scratch investigation greps, reported in-session and recorded in the run log,
never committed. That is a weaker footing than the comment and failure-path examples below, each of
which is in a named commit, and it is said here rather than left for a reader to discover by
failing to find them.

### 2. A comment is a claim about behaviour

An untested assertion sitting next to the code it describes. `Promise.all` shared one catch, so a
failure in the harmless half clamped an authority level — two lines from a comment saying that half
was harmless. A `toContain` assertion sat under a comment claiming an ordering it never checked,
and would have passed with the two operations reversed.

The audience for a wrong comment includes its author: one of these misled the person who wrote it
when they returned to the file an hour later.

**Where the property matters, assert it in a test. Where it does not, do not assert it in prose
either.**

### 3. A fix is a claim about the failure path

Reordering two writes never removes a failure mode; it moves it onto the branch nobody was
reasoning about. An RPC moved ahead of an insert and left a live security scope when the insert
failed. A cache clear moved ahead of a confirmation, so declining left the app half-switched. A
reload that fixed a stale scope reloaded into the same stale scope, forever, because nothing
deleted the row it was reacting to.

**Reason about the branch that runs when it fails, and bite in both directions** — reverting the
fix proves it is load-bearing, and over-applying it proves it is not merely disabling the thing it
guards. The second direction *is* the failing branch, which is why one-directional bites kept
passing over defects.

---

## Tripwires — expensive or irreversible if wrong

1. **Never push to `main`.** Work on `development`; production lands by PR. Commits must be
   GPG-signed or Vercel silently cancels the deploy.
2. **Never `pnpm install` inside this tree to regenerate a submodule lockfile** — pnpm writes `../`
   importers and Vercel fails `ERR_PNPM_OUTDATED_LOCKFILE`. Copy out to `~/<app>_lockgen` first.
3. **Never `workspace:*` or `file:../packages/*`** for `@bsuite/*` deps — use the published npm
   version. `pnpm-workspace.yaml` in a submodule is local-development-only and fails on Vercel.
4. **Never add `cookieStorage`, a `domain=.crm7.app` cookie, or an auth `storageKey` set to the
   legacy `business_suite_auth` value** to a Supabase client. Cross-app SSO is BS OAuth 2.1 PKCE
   only, and every OAuth callback must bridge tokens via `supabase.auth.setSession()` or RLS reads
   401 straight after handoff.
5. **Never create a GCP service-account JSON key** — Google access is WIF-only.
6. **Never assert Supabase policy/grant state from the dashboard UI or from migration files** — query
   the live catalog (`pg_policies`, `information_schema.role_table_grants`). The per-bucket storage
   policy counter does not attribute multi-bucket policies and reads "0" on fully guarded buckets.
7. **Never write memory under `qig_`, `vex_`, `pantheon_`** — separate projects. BSuite is `bsuite_`.
8. **Never ship mock data**, especially financial or account data. Wire live data or don't ship.
9. **Never downgrade a dependency or delete a feature** to make something pass. React 19 is the floor.
   Feature flags over deletions; ask before removing.
10. **Never bind a component to a palette colour, and never use a pure endpoint.** Bind to
    `--role-*` / the shadcn bridge — white-labelling mutates roles, so a palette-bound component
    silently ignores tenant branding. No `text-white`, `text-black`, raw hex, RGB or HSL in
    consumer UI, and no `oklch(1 0 0)` / `oklch(0 0 0)` in any role including shadows and alpha
    forms. Semantic error/destructive is **red** `oklch(0.580 0.230 25)`, not tenant-overridable.
    The rule is *separation*, not a fixed hue: error must be maximally separated from **primary**
    under deuteranopia and protanopia. D2C's primary is blue → error is red. Braden Corporate's
    primary *is* red, so it must solve its own error hue against the same rule. Purple and indigo
    are quarantined from semantics — purple measured ΔE 0.006 against primary blue under
    protanopia, i.e. the destructive and primary-action colours were the same swatch. Contract:
    [`packages/theme/docs/d2c-theme-source-of-truth.html`](packages/theme/docs/d2c-theme-source-of-truth.html).

11. **Never triage an external review until its cited paths resolve.** Run
    `node scripts/check-review-citations.mjs <review-file>` first. On 2026-08-20 an external
    reviewer produced eight ready-to-run agent prompts citing files that exist nowhere on the
    machine — it had matched **DeepMind's `bsuite`**, an unrelated Python reinforcement-learning
    benchmark that shares only the name, and written the findings as though measured, with line
    numbers and quoted code. One prompt instructed deleting `packages/*`, which holds 17 shared
    packages consumed by all six apps. Line numbers are the cheapest thing to invent and the most
    convincing thing to read: treat them as claims, not credentials. A passing check means the
    review is worth reading, never that it is right. Incident: bsuite#2201.

## Where the detail lives

Read the destination before your first edit in that area. Do not re-derive from memory.

| Area | Canonical source |
|------|------------------|
| Auth, OAuth, SSO, client registry, `d.*` previews, redirect allowlist | [`AUTH_CANONICAL.md`](./AUTH_CANONICAL.md) |
| Code quality, commits, testing, docs naming | [`docs/20260227-contributing-standards-guide-v1.01W.md`](docs/20260227-contributing-standards-guide-v1.01W.md) |
| Entity ownership, DRY one-shot | [`docs/20260227-dry-one-shot-architecture-v1.04A.md`](docs/20260227-dry-one-shot-architecture-v1.04A.md) |
| Setup, lockfiles, shared packages, env vars, **domain/favicon conventions**, GCP WIF, cron checks, memory protocol | [`docs/20260731-platform-operations-reference-v1.00W.md`](docs/20260731-platform-operations-reference-v1.00W.md) |
| Self-validation loop (output/visual equivalence, PR Evidence block) | [`docs/20260507-ff-self-validation-doctrine-v1.00W.md`](docs/20260507-ff-self-validation-doctrine-v1.00W.md) |
| Supabase policy gates, consumer-package gate, definition of done | [`docs/20260731-supabase-verification-gates-v1.00W.md`](docs/20260731-supabase-verification-gates-v1.00W.md) |
| Trying a migration **before** you ship it (`pnpm supabase:rehearse`) | [`docs/runbooks/20260813-local-migration-rehearsal-guide-v1.00W.md`](docs/runbooks/20260813-local-migration-rehearsal-guide-v1.00W.md) |
| AI SDK standards, multi-file refactor tooling, reusable code patterns | [`docs/20260731-agent-engineering-patterns-v1.00W.md`](docs/20260731-agent-engineering-patterns-v1.00W.md) |
| Layout, z-index scale, DOM autopsy | [`docs/20260731-frontend-layout-zindex-standards-v1.00W.md`](docs/20260731-frontend-layout-zindex-standards-v1.00W.md) |
| Design judgment — priorities, the known answers, why a rule exists | [`DESIGN.md`](./DESIGN.md) — layer 1; values live in `packages/theme`, enforcement in `scripts/theme-gates.sh` |
| Theme tokens, both brands | `packages/theme/README.md` + the `bsuite-brand-system` skill |
| Status: what is open, shipped, applied | Ask the live source — `gh issue list`, `gh pr list`, `schema_migrations`. The plan dashboard was **retired 2026-08-10**: [`docs/20260810-plan-dashboard-retirement-v1.00F.md`](docs/20260810-plan-dashboard-retirement-v1.00F.md) |
| E2E testing status | [`docs/testing/README.md`](docs/testing/README.md) |
| Dependency bumps | [`docs/20260506-dependency-bump-checklist-v1.00A.md`](docs/20260506-dependency-bump-checklist-v1.00A.md) |
| Anything else | [`docs/README.md`](docs/README.md) → `docs/20260504-bsuite-documentation-hub-v1.00W.md` |
| Per-project rules and protected files | that project's `CONTRIBUTING.md` |
| Cross-session state | qig-memory MCP, `bsuite_` prefix |

Commits: `type(scope): description` — types `feat|fix|docs|style|refactor|test|chore|perf`, scopes
`bsu|crm7|conduit|braden|r80|throughput|shared|docs|deploy`.

**Write `Closes #123` in the PR body and leave it alone — it works now, and closing by hand is no
longer the workaround.** It did not work before 2026-08-17: GitHub auto-closes only on a merge to a
repository's DEFAULT branch, all seven repos here default to `main`, and every PR targets
`development`, so every closing keyword ever written in this estate was inert. Fifteen issues sat
fixed-and-open because of it. `.github/workflows/development-merge-issue-closer.yml` now honours the
keyword on a `development` merge — it comments on the issue naming the merge SHA, then closes it —
and sweeps all seven repos hourly, so submodule PRs are covered too. It ignores a keyword that
appears in a blockquote, a checklist item, a code fence, an inline code span, an HTML comment, or
after a negation, so quoting a review comment cannot close live work. Cross-repo references
(`GaryOcean428/crm7#123`) are reported, never closed — close those by hand. If any of this changes,
`scripts/parse-closing-keywords.mjs --self-test` is the contract, and it is a registered guard.

throughput's AI stack is the Jodie setup (migrated off Groq `gpt-oss-120b` 2026-08-05): same-origin
`/api/llm/*` Vercel routes over the Vercel AI Gateway — `xai/grok-4.3` primary, `zai/glm-5.2`
fallback; roster owned by `crm7/src/lib/ai/config.ts`. No provider keys in the browser; app AI
never routes around the gateway.
