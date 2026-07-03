# Blindspot Catalogue

Common failure patterns that LLM executors miss when acting on prompts.
Use this as a checklist during pass 3; don't treat it as exhaustive —
task-specific blindspots also need explicit self-query.

## Knowledge / recency blindspots

| Blindspot | Counter |
|-----------|---------|
| Training cutoff means "current" API is actually deprecated | Force Context7/Tavily query for any library version-sensitive call |
| Known library changed behaviour in a recent major (React 19, Next 16, Tailwind v4, Python 3.12+) | Cite the specific version; quote the change; don't assume older patterns |
| Confidence on obscure libraries equals confidence on popular ones | Require explicit citation for anything under ~10M monthly downloads |
| Command-line flags or subcommand shapes change across tool versions | Require `--help` inspection OR a citation before invoking non-trivial flags |

## Pattern-matching blindspots

| Blindspot | Counter |
|-----------|---------|
| Applying "typical" architecture when the repo has a custom one | Read repo-level AGENTS.md / CLAUDE.md / README before suggesting architecture |
| Assuming file layout conventions (src/, lib/, tests/) | Verify with `ls` or Glob before citing paths |
| Assuming test framework from stack (Jest for JS, pytest for Python) | Check package.json / pyproject.toml for the actual runner |
| Defaulting to regex for structured-format parsing | Use a real parser (PyYAML, libxml2, json.loads) — regex on YAML/JSON/HTML is a known trap |

## Verification blindspots

| Blindspot | Counter |
|-----------|---------|
| Claiming success without running the verification command | Invoke `verification-before-completion` skill; capture actual output |
| Treating "it compiled" as "it works" | Require end-to-end smoke test with observable result |
| Marking a todo complete when one of N sub-tasks failed | Todo state is binary; if any sub-task failed, leave it in_progress |
| Using "should work" or "expected to" in success claims | Replace with actual output pasted back; no hedging language in success claims |

## Destructive-action blindspots

| Blindspot | Counter |
|-----------|---------|
| `rm -rf` / `git reset --hard` / `git push --force` without confirm | Any destructive op requires user confirmation OR a durable prior authorization in CLAUDE.md |
| `--no-verify` / `--no-gpg-sign` to bypass hook failures | Fix the underlying issue; never skip hooks without explicit user ask |
| `git add -A` / `git add .` including secrets or artefacts | Stage specific files by name |
| `DROP TABLE` / destructive SQL without a backup + rollback plan | Dry-run first via EXPLAIN or a transaction; verify; then commit |

## Scope-creep blindspots

| Blindspot | Counter |
|-----------|---------|
| Bug fix that turns into refactor of surrounding code | One fix, one commit; surrounding cleanup is a separate task |
| Adding "helpful" features the user didn't ask for | Stick to the refined prompt; flag suggestions separately |
| Building abstractions for hypothetical future needs | Three similar lines is better than a premature abstraction |
| Adding fallbacks/retries for scenarios that can't happen | Trust internal guarantees; validate only at system boundaries |

## QIG-physics blindspots (QIG context only)

| Blindspot | Counter |
|-----------|---------|
| Using cosine similarity, dot product, Adam/AdamW, LayerNorm | Fisher-Rao metric only; cite exact forbidden-op list in qig-purity-validation |
| Assuming `scikit-learn` / `sentence-transformers` are available | Forbidden in QIG repos; check dependency-management skill |
| Treating "sign-flip" / "bridge" / "wormhole" as prompt tricks rather than physics experiments | Reference actual frozen experiment results (EXP-004b, EXP-042, EXP-037) |
| Confusing prompt-engineering correlates with lattice physics | Never conflate external prompt framings with actual experimental results |

## BSuite-brand blindspots (BSuite context only)

| Blindspot | Counter |
|-----------|---------|
| Using `text-white` on role fills | Use `text-text-on-primary` / `-accent` / `-error` / `-success` / `-warning` — per theme-update.md |
| Opacity-50/60/70 for disabled state | Use `text-text-disabled` token |
| Assuming D2C Neon Electric applies to braden.com.au | braden.com.au uses Braden Corporate brand (navy 250); all others D2C unless client-specified |
| Hard-coded RGB/hex colors | All colors via oklch tokens; ESLint + CI rule enforces |

## DRY One-Shot Architecture blindspots (BSuite + general SaaS)

| Blindspot | Counter |
|-----------|---------|
| Adding `POST /api/<entity>` in an app that READS that entity | Check `dry-one-shot-architecture`'s entity-ownership map first; writes belong to the owning app only |
| Free-text `client_name` / `apprentice_email` / `company_code` fields when FK exists | Use EntitySelector; CI rule `no-free-text-where-fk` flags this |
| Building a new form for an entity that another app already has | One owner = one form; reader apps link out or use the selector |
| Hydrating a Zustand store with fetched entity data | Stores hold UI state only; use TanStack Query for server state |
| `CREATE TABLE IF NOT EXISTS` for an entity another app owns | Shared Supabase project + RLS; no local mirrors |
| `workspace:*` / `file:../packages/*` in deployable `package.json` | Vercel clones without parent packages; use npm semver ranges |
| Frontend-only permission check | RLS is the real enforcement; UI role check is courtesy only |
| Treating BSuite DRY rules as universal | QIG has different rules (Fisher-Rao purity); silo applies — never cross-ref `dry-one-shot-architecture` from a QIG task |

## User-preference blindspots (always)

| Blindspot | Counter |
|-----------|---------|
| Using red/green color pairs | User is colourblind; use purple/blue/amber |
| Estimating completion time | User prefers phases, not time estimates |
| Sycophantic agreement with user claims | If user is wrong, say so with evidence; don't hedge |
| Treating prior assistant output as authoritative | Track provenance; "I was wrong" not "we previously thought" |

## Cross-agent tandem blindspots (if other agents are active)

| Blindspot | Counter |
|-----------|---------|
| Overwriting parent `main` changes by rebasing dev | Use tandem-dev-main-reconcile 3-move recipe; never rebase in this scenario |
| Assuming your branch is ahead of remote without `git fetch` | Fetch before any push-readiness check |
| Conflicting with Perplexity / other-agent submodule pointer bumps | Check `git ls-tree` divergence before assuming a clean merge |

## Usage

During pass 3 of prompt-enhancer, scan this file for patterns matching
the current task's stack and stakes. Don't list every blindspot — pick
the 1–3 most likely to hit and write a task-specific counter for each.

The counter MUST be an explicit instruction in the refined prompt — not
a general caveat. "Be careful with X" is not a counter; "Before doing
Y, run Z and paste the output" is.
